function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

export interface LocalBusiness {
  id:           string
  name:         string
  phone:        string | null
  email:        string | null
  website:      string | null
  domain:       string | null
  address:      string | null
  city:         string | null
  state:        string | null
  postcode:     string | null
  country:      string | null
  categories:   string[]
  rating:       number | null
  review_count: number | null
  description:  string | null
  snippet:      string | null   // original search snippet for context
}

/**
 * Search Brave Local (map pack / GMB-style) for real businesses.
 * Step 1: web search with result_filter=locations → get POI IDs
 * Step 2: fetch full POI details (name, phone, address, website, rating)
 */
export async function searchLocalBusinesses(
  query:    string,
  count = 20,
): Promise<LocalBusiness[]> {
  const apiKey = process.env.BRAVE_API_KEY
  if (!apiKey) throw new Error('BRAVE_API_KEY is not configured')

  const headers = {
    'Accept':               'application/json',
    'Accept-Encoding':      'gzip',
    'X-Subscription-Token': apiKey,
  }

  // ── Step 1: Get location IDs ──────────────────────────────────────────────
  const params = new URLSearchParams({
    q:             query,
    count:         String(Math.min(count, 20)),
    result_filter: 'locations',
  })

  const searchRes = await fetch(
    `https://api.search.brave.com/res/v1/web/search?${params}`,
    { headers, signal: AbortSignal.timeout(15000) },
  )

  if (!searchRes.ok) {
    const text = await searchRes.text()
    throw new Error(`Brave local search error ${searchRes.status}: ${text}`)
  }

  const searchData = await searchRes.json() as {
    locations?: {
      results?: Array<{ id: string; title?: string; description?: string }>
    }
  }

  const locationResults = searchData.locations?.results ?? []
  console.log(`[brave-local] query="${query}" → ${locationResults.length} location IDs returned`)
  if (locationResults.length === 0) return []

  const ids = locationResults.map(r => r.id).join(',')

  // ── Step 2: Fetch full POI details ────────────────────────────────────────
  const [poisRes, descriptionsRes] = await Promise.all([
    fetch(`https://api.search.brave.com/res/v1/local/pois?ids=${encodeURIComponent(ids)}`, { headers, signal: AbortSignal.timeout(15000) }),
    fetch(`https://api.search.brave.com/res/v1/local/descriptions?ids=${encodeURIComponent(ids)}`, { headers, signal: AbortSignal.timeout(15000) }),
  ])

  const poisData = poisRes.ok ? await poisRes.json() as {
    results?: Array<{
      id:           string
      name?:        string
      phone?:       string
      url?:         string
      address?: {
        streetAddress?:    string
        addressLocality?:  string
        addressRegion?:    string
        postalCode?:       string
        addressCountry?:   string
      }
      rating?: { ratingValue?: number; ratingCount?: number }
      categories?: string[]
    }>
  } : { results: [] }

  const descriptionsData = descriptionsRes.ok ? await descriptionsRes.json() as {
    results?: Array<{ id: string; description?: string }>
  } : { results: [] }

  const descMap = new Map(
    (descriptionsData.results ?? []).map(d => [d.id, d.description ?? null])
  )

  const pois = poisData.results ?? []

  return pois.map(poi => {
    const website = poi.url ?? null
    const domain  = website ? extractDomain(website) : null
    const addr    = poi.address

    return {
      id:           poi.id,
      name:         poi.name ?? '',
      phone:        poi.phone ?? null,
      email:        null,
      website,
      domain,
      address:      addr?.streetAddress ?? null,
      city:         addr?.addressLocality ?? null,
      state:        addr?.addressRegion ?? null,
      postcode:     addr?.postalCode ?? null,
      country:      addr?.addressCountry ?? null,
      categories:   poi.categories ?? [],
      rating:       poi.rating?.ratingValue ?? null,
      review_count: poi.rating?.ratingCount ?? null,
      description:  descMap.get(poi.id) ?? null,
      snippet:      null,
    }
  }).filter(b => b.name)
}
