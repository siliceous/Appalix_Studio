import { createSign } from 'crypto'
import { supabase } from '../../lib/supabase.js'
import { embedBatch, chunkText } from './embeddings.js'
import { recordUsage } from '../../lib/usage.js'

/**
 * Accepts either a short-lived OAuth access token (ya29.…) or a full
 * Service Account JSON key. If JSON is detected, a signed JWT is exchanged
 * for a fresh access token via Google's token endpoint.
 */
async function resolveGoogleAccessToken(credentialOrToken: string): Promise<string> {
  const trimmed = credentialOrToken.trim()
  if (!trimmed.startsWith('{')) return trimmed // already an access token

  let sa: { client_email: string; private_key: string }
  try {
    sa = JSON.parse(trimmed)
  } catch {
    throw new Error('Google Drive: provided credential looks like JSON but could not be parsed.')
  }
  if (!sa.client_email || !sa.private_key) {
    throw new Error('Google Drive: service account JSON must contain client_email and private_key.')
  }

  const now = Math.floor(Date.now() / 1000)
  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss:   sa.client_email,
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    aud:   'https://oauth2.googleapis.com/token',
    exp:   now + 3600,
    iat:   now,
  })).toString('base64url')

  const signer = createSign('RSA-SHA256')
  signer.update(`${header}.${payload}`)
  const sig = signer.sign(sa.private_key, 'base64url')
  const jwt = `${header}.${payload}.${sig}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion:  jwt,
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Google Drive: service account token exchange failed (${res.status}): ${body}`)
  }
  const { access_token } = await res.json() as { access_token: string }
  return access_token
}

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

    // Sanitize: remove null bytes and other characters PostgreSQL rejects
    const sanitized = rawText
      .replace(/\u0000/g, '')           // null bytes
      .replace(/\\u0000/g, '')          // literal \u0000 escape sequences
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // other non-printable control chars (keep \t \n \r)

    // Split into chunks
    const textChunks = chunkText(sanitized, 1500, 200)

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

      function htmlToText(html: string): string {
        return html
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
          .replace(/<head\b[^<]*(?:(?!<\/head>)<[^<]*)*<\/head>/gi, ' ')
          .replace(/<!--[\s\S]*?-->/g, ' ')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/\s+/g, ' ')
          .trim()
      }

      // 1. Try plain fetch (fast, works for server-rendered pages)
      try {
        const res = await fetch(source.url, {
          headers: {
            'User-Agent':      'Mozilla/5.0 (compatible; AppalixBot/1.0; +https://appalix.ai)',
            'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
          },
          signal: AbortSignal.timeout(30_000),
          redirect: 'follow',
        })
        if (res.ok) {
          const text = htmlToText(await res.text())
          if (text) return text
        }
      } catch {
        // fall through to Jina Reader
      }

      // 2. Fallback: Jina Reader (handles JS-rendered / bot-blocking pages)
      try {
        const jinaRes = await fetch(`https://r.jina.ai/${source.url}`, {
          headers: { 'Accept': 'text/plain' },
          signal: AbortSignal.timeout(60_000),
        })
        if (jinaRes.ok) {
          const jinaText = (await jinaRes.text()).trim()
          if (jinaText) return jinaText
          throw new Error(`Jina returned empty content for ${source.url}`)
        }
        throw new Error(`Jina Reader returned HTTP ${jinaRes.status} for ${source.url}`)
      } catch (jinaErr) {
        const jinaMsg = jinaErr instanceof Error ? jinaErr.message : String(jinaErr)
        throw new Error(`No readable text found at ${source.url}. ${jinaMsg}`)
      }
    }

    case 'sitemap': {
      if (!source.url) throw new Error('Sitemap source has no URL')
      const res   = await fetch(source.url, { signal: AbortSignal.timeout(30_000) })
      const xml   = await res.text()
      const urls  = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).slice(0, 50)
      const FETCH_HEADERS = {
        'User-Agent': 'Mozilla/5.0 (compatible; AppalixBot/1.0; +https://appalix.ai)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
      const pages = await Promise.allSettled(urls.map(async (url) => {
        const r = await fetch(url, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(15_000), redirect: 'follow' })
        const h = await r.text()
        const t = h
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
          .replace(/<head\b[^<]*(?:(?!<\/head>)<[^<]*)*<\/head>/gi, ' ')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
        return `## ${url}\n\n${t}`
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

    // ----------------------------------------------------------------
    // Notion — Internal Integration Token + page URL
    // ----------------------------------------------------------------
    case 'notion': {
      const token = (source.metadata as Record<string, string> | null)?.notion_token
      if (!token) throw new Error('Notion source missing notion_token in metadata')
      if (!source.url) throw new Error('Notion source has no URL')

      // Extract page ID from URL (last segment, strip dashes)
      const pageId = source.url.split('/').pop()?.split('?')[0]?.replace(/-/g, '') ?? ''
      if (!pageId) throw new Error('Could not extract Notion page ID from URL')

      const blocksRes = await fetch(
        `https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`,
        {
          headers: {
            'Authorization':    `Bearer ${token}`,
            'Notion-Version':   '2022-06-28',
            'Content-Type':     'application/json',
          },
          signal: AbortSignal.timeout(30_000),
        },
      )
      if (!blocksRes.ok) throw new Error(`Notion API error: ${blocksRes.status}`)
      const blocksJson = await blocksRes.json() as {
        results: Array<{ type: string; [key: string]: unknown }>
      }

      const lines: string[] = []
      for (const block of blocksJson.results) {
        const richTexts =
          (block[block.type] as { rich_text?: Array<{ plain_text: string }> } | undefined)
            ?.rich_text ?? []
        const text = richTexts.map((rt) => rt.plain_text).join('')
        if (text) lines.push(text)
      }
      return lines.join('\n')
    }

    // ----------------------------------------------------------------
    // GitBook — Personal API Token + space URL
    // ----------------------------------------------------------------
    case 'gitbook': {
      const token = (source.metadata as Record<string, string> | null)?.gitbook_token
      if (!token) throw new Error('GitBook source missing gitbook_token in metadata')
      if (!source.url) throw new Error('GitBook source has no URL')

      // Extract space ID from URL: https://app.gitbook.com/o/{org}/s/{spaceId}
      const spaceMatch = source.url.match(/\/s\/([^/?#]+)/)
      const spaceId = spaceMatch?.[1]
      if (!spaceId) throw new Error('Could not extract GitBook space ID from URL')

      const pagesRes = await fetch(
        `https://api.gitbook.com/v1/spaces/${spaceId}/content`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: AbortSignal.timeout(30_000),
        },
      )
      if (!pagesRes.ok) throw new Error(`GitBook API error: ${pagesRes.status}`)
      const pagesJson = await pagesRes.json() as {
        pages?: Array<{ title?: string; document?: { nodes?: Array<{ nodes?: Array<{ leaves?: Array<{ text?: string }> }> }> } }>
      }

      const texts: string[] = []
      for (const page of pagesJson.pages ?? []) {
        if (page.title) texts.push(`# ${page.title}`)
        for (const node of page.document?.nodes ?? []) {
          for (const child of node.nodes ?? []) {
            const text = child.leaves?.map((l) => l.text ?? '').join('') ?? ''
            if (text.trim()) texts.push(text)
          }
        }
      }
      return texts.join('\n\n')
    }

    // ----------------------------------------------------------------
    // Google Drive — access token + file/folder URL
    // ----------------------------------------------------------------
    case 'google_drive': {
      const credential = (source.metadata as Record<string, string> | null)?.google_access_token
      if (!credential) throw new Error('Google Drive source missing google_access_token in metadata')
      if (!source.url) throw new Error('Google Drive source has no URL')
      const token = await resolveGoogleAccessToken(credential)

      // Extract file ID from URL
      const fileMatch = source.url.match(/\/d\/([^/?#]+)/) ?? source.url.match(/id=([^&]+)/)
      const fileId = fileMatch?.[1]
      if (!fileId) throw new Error('Could not extract Google Drive file ID from URL')

      // Export as plain text (works for Docs, Sheets, Slides)
      const exportRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: AbortSignal.timeout(30_000),
        },
      )
      if (!exportRes.ok) {
        // Fallback: try downloading directly (for plain text files)
        const dlRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
          {
            headers: { 'Authorization': `Bearer ${token}` },
            signal: AbortSignal.timeout(30_000),
          },
        )
        if (!dlRes.ok) {
          const status = dlRes.status
          let reason = ''
          try { reason = ((await dlRes.json() as { error?: { errors?: { reason?: string }[] } }).error?.errors?.[0]?.reason ?? '') } catch { /* ignore */ }
          if (status === 401) throw new Error('Google Drive: 401 Unauthorized — token expired or invalid. Generate a fresh token and update this source.')
          if (status === 403) {
            if (reason === 'accessNotConfigured') {
              throw new Error('Google Drive: 403 accessNotConfigured — the Google Drive API is not enabled for your Google Cloud project. Go to console.cloud.google.com → APIs & Services → Library → search "Google Drive API" → Enable it, then re-sync.')
            }
            if (reason === 'forbidden' || reason === 'insufficientPermissions') {
              throw new Error('Google Drive: 403 Forbidden — the credential does not have access to this file. If using a Service Account, make sure you shared the file with the service account email (Viewer access). If using an OAuth token, make sure it belongs to the file owner\'s account.')
            }
            throw new Error(`Google Drive: 403 Forbidden (${reason || 'no permission'}) — check that the Google Drive API is enabled in your Cloud project and the file is shared with your credential.`)
          }
          if (status === 404) throw new Error('Google Drive: 404 Not Found — the file was not found or is not accessible by this credential. If using a Service Account, open the file in Google Drive, click Share, and add the service account email (e.g. name@project.iam.gserviceaccount.com) as a Viewer.')
          throw new Error(`Google Drive API error: ${status}`)
        }
        return await dlRes.text()
      }
      return await exportRes.text()
    }

    // ----------------------------------------------------------------
    // Dropbox — long-lived access token + file path or shared URL
    // ----------------------------------------------------------------
    case 'dropbox': {
      const token = (source.metadata as Record<string, string> | null)?.dropbox_token
      if (!token) throw new Error('Dropbox source missing dropbox_token in metadata')
      if (!source.url) throw new Error('Dropbox source has no URL')

      // source.url should be a Dropbox file path like /Documents/file.txt
      // or a shared link https://www.dropbox.com/s/...
      const isSharedLink = source.url.startsWith('https://')

      if (isSharedLink) {
        const dlRes = await fetch('https://content.dropboxapi.com/2/sharing/get_shared_link_file', {
          method:  'POST',
          headers: {
            'Authorization':   `Bearer ${token}`,
            'Dropbox-API-Arg': JSON.stringify({ url: source.url }),
            'Content-Type':    'text/plain',
          },
          signal: AbortSignal.timeout(30_000),
        })
        if (!dlRes.ok) throw new Error(`Dropbox API error: ${dlRes.status}`)
        return await dlRes.text()
      } else {
        const dlRes = await fetch('https://content.dropboxapi.com/2/files/download', {
          method:  'POST',
          headers: {
            'Authorization':   `Bearer ${token}`,
            'Dropbox-API-Arg': JSON.stringify({ path: source.url }),
          },
          signal: AbortSignal.timeout(30_000),
        })
        if (!dlRes.ok) throw new Error(`Dropbox API error: ${dlRes.status}`)
        return await dlRes.text()
      }
    }

    // ----------------------------------------------------------------
    // OneDrive — Microsoft Graph access token + file URL
    // ----------------------------------------------------------------
    case 'onedrive': {
      const token = (source.metadata as Record<string, string> | null)?.ms_access_token
      if (!token) throw new Error('OneDrive source missing ms_access_token in metadata')
      if (!source.url) throw new Error('OneDrive source has no URL')

      // Extract item ID from URL or use the URL as a share URL
      const itemMatch = source.url.match(/items\/([^/?#]+)/)
      const itemId = itemMatch?.[1]

      const endpoint = itemId
        ? `https://graph.microsoft.com/v1.0/me/drive/items/${itemId}/content`
        : `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURIComponent(source.url)}:/content`

      const dlRes = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: AbortSignal.timeout(30_000),
      })
      if (!dlRes.ok) throw new Error(`OneDrive API error: ${dlRes.status}`)
      return await dlRes.text()
    }

    // ----------------------------------------------------------------
    // SharePoint — Microsoft Graph access token + site/file URL
    // ----------------------------------------------------------------
    case 'sharepoint': {
      const token  = (source.metadata as Record<string, string> | null)?.ms_access_token
      const siteId = (source.metadata as Record<string, string> | null)?.sharepoint_site_id
      if (!token) throw new Error('SharePoint source missing ms_access_token in metadata')
      if (!source.url) throw new Error('SharePoint source has no URL')

      const itemMatch = source.url.match(/items\/([^/?#]+)/)
      const itemId = itemMatch?.[1]

      if (!itemId || !siteId) throw new Error('SharePoint source requires sharepoint_site_id and item ID in URL')

      const dlRes = await fetch(
        `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${itemId}/content`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: AbortSignal.timeout(30_000),
        },
      )
      if (!dlRes.ok) throw new Error(`SharePoint API error: ${dlRes.status}`)
      return await dlRes.text()
    }

    default:
      throw new Error(`Unsupported source type for ingestion: ${source.type}`)
  }
}
