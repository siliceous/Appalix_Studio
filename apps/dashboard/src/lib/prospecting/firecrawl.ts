export interface CrawlResult {
  markdown: string
  title:    string | null
}

// Contact page candidates — tried sequentially, stop at first hit
const CONTACT_PATHS = ['/contact', '/contact-us', '/contact_us', '/get-in-touch', '/reach-us', '/find-us']

/** Scrape a single URL; returns null on any error or near-empty content. */
async function scrapeSingle(url: string): Promise<{ markdown: string; title: string | null } | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) throw new Error('FIRECRAWL_API_KEY is not configured')

  try {
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        url,
        formats:         ['markdown'],
        onlyMainContent: true,
        timeout:         12000,
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) return null

    const data = await res.json() as {
      success: boolean
      data?: { markdown?: string; metadata?: { title?: string } }
    }

    if (!data.success || !data.data?.markdown) return null

    const markdown = data.data.markdown.trim()
    if (markdown.length < 80) return null  // skip redirected 404s

    return {
      markdown,
      title: data.data.metadata?.title ?? null,
    }
  } catch {
    return null
  }
}

/**
 * Crawl a domain: homepage + first working contact page (sequential probe).
 * ~3 Firecrawl credits per domain max.
 * GMB enrichment is handled separately via Brave search in the pipeline.
 */
export async function crawlDeep(domain: string): Promise<CrawlResult | null> {
  const base = domain.startsWith('http') ? domain : `https://${domain}`

  // 1. Homepage + all contact candidates in parallel (homepage always needed;
  //    contact candidates are cheap to fire together — we pick the first hit)
  const [homepageResult, ...contactResults] = await Promise.all([
    scrapeSingle(base),
    ...CONTACT_PATHS.map(p => scrapeSingle(`${base}${p}`)),
  ])

  const contactResult = contactResults.find(r => r !== null) ?? null

  const sections: string[] = []
  let   title: string | null = null

  if (homepageResult) {
    title = homepageResult.title
    sections.push(`## Homepage\n\n${homepageResult.markdown.slice(0, 7000)}`)
  }

  if (contactResult) {
    sections.push(`## Contact\n\n${contactResult.markdown.slice(0, 5000)}`)
  }

  if (sections.length === 0) return null

  return {
    markdown: sections.join('\n\n---\n\n'),
    title,
  }
}

/**
 * Crawl multiple domains with limited concurrency.
 */
export async function crawlBatch(
  domains:     string[],
  concurrency = 4,
): Promise<Map<string, CrawlResult | null>> {
  const results = new Map<string, CrawlResult | null>()
  const queue   = [...domains]

  async function worker() {
    while (queue.length > 0) {
      const domain = queue.shift()!
      results.set(domain, await crawlDeep(domain))
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, domains.length) }, worker))
  return results
}
