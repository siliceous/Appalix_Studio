import { supabase } from '../../lib/supabase.js'
import { embedBatch, chunkText } from './embeddings.js'
import { recordUsage } from '../../lib/usage.js'

/**
 * Ingest a document source into the vector store.
 *
 * Flow:
 *  1. Fetch content (URL / text / file)
 *  2. Split into overlapping chunks
 *  3. Batch-embed chunks via OpenAI
 *  4. Upsert into chunks table
 *  5. Update source.status = 'ready'
 */
export async function ingestSource(sourceId: string): Promise<void> {
  // Load source record
  const { data: source, error: srcError } = await supabase
    .from('sources')
    .select('*')
    .eq('id', sourceId)
    .single()

  if (srcError || !source) {
    throw new Error(`Source not found: ${sourceId}`)
  }

  // Mark as processing
  await supabase.from('sources').update({ status: 'processing' }).eq('id', sourceId)

  try {
    // Fetch raw content based on type
    const rawText = await fetchSourceContent(source)
    if (!rawText.trim()) throw new Error('Source content is empty')

    // Split into chunks
    const textChunks = chunkText(rawText, 1500, 200)

    // Delete old chunks for this source (re-ingestion)
    await supabase.from('chunks').delete().eq('source_id', sourceId)

    // Batch-embed (OpenAI limit: 2048 inputs per call — batch in groups of 100)
    const BATCH_SIZE = 100
    let insertedCount = 0

    for (let i = 0; i < textChunks.length; i += BATCH_SIZE) {
      const batch      = textChunks.slice(i, i + BATCH_SIZE)
      const embeddings = await embedBatch(batch)

      const rows = batch.map((content, j) => ({
        source_id:    sourceId,
        workspace_id: source.workspace_id,
        content,
        embedding:    embeddings[j] as never,
        chunk_index:  i + j,
        token_count:  Math.ceil(content.length / 4),
        metadata:     { source_type: source.type, source_name: source.name },
      }))

      const { error: insertError } = await supabase.from('chunks').insert(rows)
      if (insertError) throw new Error(`Failed to insert chunks: ${insertError.message}`)

      insertedCount += rows.length

      // Record embedding usage
      const totalChars = batch.reduce((s, t) => s + t.length, 0)
      await recordUsage({
        workspaceId:  source.workspace_id,
        eventType:    'embedding',
        model:        'text-embedding-3-small',
        tokensInput:  Math.ceil(totalChars / 4),
        metadata:     { source_id: sourceId },
      })
    }

    // Mark ready
    await supabase.from('sources').update({
      status:         'ready',
      chunk_count:    insertedCount,
      last_synced_at: new Date().toISOString(),
      error_message:  null,
    }).eq('id', sourceId)

    console.log(`[ingestion] source ${sourceId} ready — ${insertedCount} chunks`)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await supabase.from('sources').update({
      status:        'failed',
      error_message: message,
    }).eq('id', sourceId)
    throw err
  }
}

/**
 * Fetch raw text content from a source.
 * Currently handles: url, text types.
 * Extend with pdf/docx parsers as needed.
 */
async function fetchSourceContent(source: {
  type: string; url?: string | null; file_path?: string | null; name: string
}): Promise<string> {
  switch (source.type) {
    case 'text': {
      // For 'text' type the content was passed during creation and stored elsewhere;
      // here we just return the name as a stub. In production store content in Supabase Storage.
      return source.name
    }

    case 'url': {
      if (!source.url) throw new Error('URL source has no URL')
      const res = await fetch(source.url, {
        headers: { 'User-Agent': 'SaaS-Platform-Ingestion/1.0' },
        signal: AbortSignal.timeout(30_000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${source.url}`)
      const html = await res.text()
      // Strip HTML tags for a basic text extraction
      return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    }

    case 'sitemap': {
      if (!source.url) throw new Error('Sitemap source has no URL')
      // Fetch sitemap.xml and extract URLs, then fetch each page
      const res   = await fetch(source.url, { signal: AbortSignal.timeout(30_000) })
      const xml   = await res.text()
      const urls  = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).slice(0, 50)
      const pages = await Promise.allSettled(urls.map(async (url) => {
        const r = await fetch(url, { signal: AbortSignal.timeout(15_000) })
        const h = await r.text()
        return `## ${url}\n\n${h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}`
      }))
      return pages
        .filter((p): p is PromiseFulfilledResult<string> => p.status === 'fulfilled')
        .map((p) => p.value)
        .join('\n\n---\n\n')
    }

    default:
      throw new Error(`Unsupported source type for ingestion: ${source.type}`)
  }
}
