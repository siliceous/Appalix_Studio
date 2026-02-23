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
 * Handles: url, sitemap, text, file (PDF + images via Claude vision).
 */
async function fetchSourceContent(source: {
  type: string
  url?: string | null
  file_path?: string | null
  name: string
  metadata?: Record<string, unknown> | null
}): Promise<string> {
  switch (source.type) {
    case 'text': {
      // Content stored in metadata.raw_text at creation time
      const raw = (source.metadata as Record<string, string> | null)?.raw_text
      if (!raw) throw new Error('Text source has no content in metadata.raw_text')
      return raw
    }

    case 'url': {
      if (!source.url) throw new Error('URL source has no URL')
      const res = await fetch(source.url, {
        headers: { 'User-Agent': 'Appalix-Ingestion/1.0' },
        signal: AbortSignal.timeout(30_000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${source.url}`)
      const html = await res.text()
      return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    }

    case 'sitemap': {
      if (!source.url) throw new Error('Sitemap source has no URL')
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

    case 'file': {
      if (!source.file_path) throw new Error('File source has no file_path')
      const mimeType = (source.metadata as Record<string, string> | null)?.mime_type ?? ''

      // Download from Supabase Storage
      const { data: blob, error: dlErr } = await supabase.storage
        .from('sources')
        .download(source.file_path)
      if (dlErr || !blob) throw new Error(`Storage download failed: ${dlErr?.message ?? 'unknown'}`)

      const arrayBuffer = await blob.arrayBuffer()
      const base64      = Buffer.from(arrayBuffer).toString('base64')

      const isPdf   = mimeType === 'application/pdf'
      const isImage = mimeType.startsWith('image/')
      if (!isPdf && !isImage) throw new Error(`Unsupported file MIME type: ${mimeType}`)

      // Use Claude to extract text — document API for PDFs, vision for images
      const { anthropic } = await import('../ai/claude.js')

      type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

      // Cast as `never` because DocumentBlockParam is absent from SDK ^0.32 types
      // but is supported by the API at runtime.
      const fileBlock = (isPdf
        ? {
            type:   'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          }
        : {
            type:   'image',
            source: { type: 'base64', media_type: mimeType as ImageMediaType, data: base64 },
          }) as never

      const extraction = await anthropic.messages.create({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages: [{
          role:    'user',
          content: [
            fileBlock,
            {
              type: 'text' as const,
              text: isPdf
                ? 'Extract all text content from this PDF. Return the full raw text preserving headings and structure. Do not summarize.'
                : 'Transcribe all visible text in this image. Also briefly describe any diagrams, charts, or non-text visuals.',
            },
          ],
        }],
      })

      const textBlock = extraction.content.find(
        (b): b is { type: 'text'; text: string } => b.type === 'text',
      )
      return textBlock?.text ?? ''
    }

    default:
      throw new Error(`Unsupported source type for ingestion: ${source.type}`)
  }
}
