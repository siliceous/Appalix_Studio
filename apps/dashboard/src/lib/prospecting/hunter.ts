export interface HunterResult {
  emails: string[]
  firstName: string | null
  lastName:  string | null
}

/**
 * Finds email addresses for a domain via Hunter.io Domain Search API.
 * Returns up to 5 emails sorted by confidence score descending.
 */
export async function enrichEmailsFromHunter(domain: string): Promise<HunterResult | null> {
  const apiKey = process.env.HUNTER_API_KEY
  if (!apiKey) return null

  try {
    const params = new URLSearchParams({
      domain,
      api_key: apiKey,
      limit:   '5',
    })

    const res = await fetch(`https://api.hunter.io/v2/domain-search?${params}`, {
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) return null

    const data = await res.json() as {
      data?: {
        emails?: Array<{
          value:      string
          confidence: number
          first_name: string | null
          last_name:  string | null
          position:   string | null
        }>
      }
    }

    const emails = data.data?.emails ?? []
    if (emails.length === 0) return null

    // Sort by confidence descending
    const sorted = [...emails].sort((a, b) => b.confidence - a.confidence)

    // Prefer decision-maker emails (owner, director, manager) if present
    const dmTitles = /owner|founder|director|ceo|manager|principal|partner/i
    const dmEmail  = sorted.find(e => e.position && dmTitles.test(e.position))
    const top      = dmEmail ?? sorted[0]

    return {
      emails:    sorted.map(e => e.value),
      firstName: top.first_name ?? null,
      lastName:  top.last_name  ?? null,
    }
  } catch {
    return null
  }
}
