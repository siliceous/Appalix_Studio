export interface CrawlResult {
  markdown: string
  title:    string | null
}

// Candidate sub-paths to try for each category (tried in order, first hit wins per category)
const ABOUT_PATHS   = ['/about', '/about-us', '/about_us', '/our-story', '/who-we-are', '/our-team', '/team']
const SERVICE_PATHS = ['/services', '/our-services', '/what-we-do', '/solutions', '/offerings', '/work']
const CONTACT_PATHS = ['/contact', '/contact-us', '/contact_us', '/get-in-touch', '/reach-us', '/find-us']
const PRICING_PATHS = ['/pricing', '/plans', '/rates', '/packages', '/fees', '/cost', '/tariff']

/** Scrape a single URL; returns null on any error or empty content. */
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
    if (markdown.length < 80) return null  // skip near-empty pages (redirected 404s etc.)

    return {
      markdown,
      title: data.data.metadata?.title ?? null,
    }
  } catch {
    return null
  }
}

/**
 * Deep-crawl a domain: homepage + contact + about + services + pricing pages.
 * All paths are tried concurrently.  Per-page cap: 5 000 chars.  Total cap: 22 000 chars.
 */
export async function crawlDeep(domain: string): Promise<CrawlResult | null> {
  const base = domain.startsWith('http') ? domain : `https://${domain}`

  // Build flat list of URLs to try
  const candidates: { label: string; url: string }[] = [
    { label: 'Homepage',  url: base },
    ...CONTACT_PATHS.map(p => ({ label: 'Contact',  url: `${base}${p}` })),
    ...ABOUT_PATHS.map(p   => ({ label: 'About',    url: `${base}${p}` })),
    ...SERVICE_PATHS.map(p => ({ label: 'Services', url: `${base}${p}` })),
    ...PRICING_PATHS.map(p => ({ label: 'Pricing',  url: `${base}${p}` })),
  ]

  const scraped = await Promise.all(
    candidates.map(async c => ({ ...c, result: await scrapeSingle(c.url) }))
  )

  // Deduplicate by label — keep first successful result per category
  const seen    = new Set<string>()
  const sections: string[] = []
  let   title: string | null = null

  for (const { label, url, result } of scraped) {
    if (!result) continue
    if (label !== 'Homepage' && seen.has(label)) continue  // one section per category
    seen.add(label)

    if (!title) title = result.title
    const pageLabel = label === 'Homepage' ? `## ${label} (${url})` : `## ${label}`
    sections.push(`${pageLabel}\n\n${result.markdown.slice(0, 5000)}`)
  }

  if (sections.length === 0) return null

  return {
    markdown: sections.join('\n\n---\n\n').slice(0, 22000),
    title,
  }
}

/**
 * Deep-crawl multiple domains with limited concurrency.
 */
export async function crawlBatch(
  domains:     string[],
  concurrency = 3,   // reduced from 4 — each deep-crawl fires many parallel sub-requests
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
