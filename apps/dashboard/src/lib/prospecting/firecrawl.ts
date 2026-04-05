export interface CrawlResult {
  markdown: string
  title:    string | null
}

// Contact page candidates
const CONTACT_PATHS = ['/contact', '/contact-us', '/contact_us', '/get-in-touch', '/reach-us', '/find-us']

// About/team page candidates — crawled for owner/contact name
const ABOUT_PATHS = ['/about', '/about-us', '/about_us', '/our-team', '/team', '/meet-the-team', '/who-we-are']

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
        onlyMainContent: false,  // include headers/footers where phone & email typically live
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
 * Crawl a domain: homepage + first working contact page + first working about/team page.
 * Up to 3 credits per domain (homepage + 1 contact + 1 about — all 404s return null for free).
 */
export async function crawlDeep(domain: string): Promise<CrawlResult | null> {
  const base = domain.startsWith('http') ? domain : `https://${domain}`

  // Fire homepage + all contact + all about candidates in parallel
  const [homepageResult, ...secondaryResults] = await Promise.all([
    scrapeSingle(base),
    ...CONTACT_PATHS.map(p => scrapeSingle(`${base}${p}`)),
    ...ABOUT_PATHS.map(p => scrapeSingle(`${base}${p}`)),
  ])

  const contactResult = secondaryResults.slice(0, CONTACT_PATHS.length).find(r => r !== null) ?? null
  const aboutResult   = secondaryResults.slice(CONTACT_PATHS.length).find(r => r !== null) ?? null

  const sections: string[] = []
  let   title: string | null = null

  if (homepageResult) {
    title = homepageResult.title
    sections.push(`## Homepage\n\n${homepageResult.markdown.slice(0, 6000)}`)
  }

  if (aboutResult) {
    sections.push(`## About / Team\n\n${aboutResult.markdown.slice(0, 4000)}`)
  }

  if (contactResult) {
    sections.push(`## Contact\n\n${contactResult.markdown.slice(0, 4000)}`)
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
