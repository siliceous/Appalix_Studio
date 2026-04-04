export interface CrawlResult {
  markdown: string
  title:    string | null
}

/**
 * Crawls the homepage of a domain using Firecrawl.
 * Returns null on error (caller should handle gracefully).
 */
export async function crawlHomepage(domain: string): Promise<CrawlResult | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) throw new Error('FIRECRAWL_API_KEY is not configured')

  const url = domain.startsWith('http') ? domain : `https://${domain}`

  try {
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: true,
        timeout: 15000,
      }),
      signal: AbortSignal.timeout(20000),
    })

    if (!res.ok) return null

    const data = await res.json() as {
      success: boolean
      data?: {
        markdown?: string
        metadata?: { title?: string }
      }
    }

    if (!data.success || !data.data?.markdown) return null

    return {
      markdown: data.data.markdown.slice(0, 8000),  // cap to keep Claude costs predictable
      title:    data.data.metadata?.title ?? null,
    }
  } catch {
    return null
  }
}

/**
 * Crawl multiple domains with limited concurrency.
 */
export async function crawlBatch(
  domains: string[],
  concurrency = 4,
): Promise<Map<string, CrawlResult | null>> {
  const results = new Map<string, CrawlResult | null>()
  const queue   = [...domains]

  async function worker() {
    while (queue.length > 0) {
      const domain = queue.shift()!
      results.set(domain, await crawlHomepage(domain))
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, domains.length) }, worker))
  return results
}
