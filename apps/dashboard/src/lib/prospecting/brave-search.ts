export interface BraveResult {
  title:       string
  url:         string
  description: string
  domain:      string
}

function extractDomain(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export async function searchBrave(query: string, count = 20): Promise<BraveResult[]> {
  const apiKey = process.env.BRAVE_API_KEY
  if (!apiKey) throw new Error('BRAVE_API_KEY is not configured')

  const params = new URLSearchParams({
    q:          query,
    count:      String(Math.min(count, 20)),  // Brave max per page is 20
    safesearch: 'moderate',
    result_filter: 'web',
  })

  const res = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
    headers: {
      'Accept':               'application/json',
      'Accept-Encoding':      'gzip',
      'X-Subscription-Token': apiKey,
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Brave API error ${res.status}: ${text}`)
  }

  const data = await res.json() as {
    web?: {
      results?: Array<{
        title:       string
        url:         string
        description: string
        meta_url?:   { hostname?: string }
      }>
    }
  }

  const results = data.web?.results ?? []

  return results.map(r => ({
    title:       r.title ?? '',
    url:         r.url   ?? '',
    description: r.description ?? '',
    domain:      r.meta_url?.hostname?.replace(/^www\./, '') ?? extractDomain(r.url ?? ''),
  })).filter(r => r.domain && r.url)
}
