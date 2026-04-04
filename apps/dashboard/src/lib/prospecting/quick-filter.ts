import Anthropic from '@anthropic-ai/sdk'
import type { BraveResult } from './brave-search'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface FilteredResult extends BraveResult {
  is_relevant:    boolean
  business_type:  string
  confidence:     number
}

interface IcpForFilter {
  industry:         string
  market_segment?:  'b2b' | 'b2c' | 'both'
  target_keywords:  string[]
  exclude_keywords: string[]
}

// Hard-block domains that are never real business prospects
const BLOCKLIST_PATTERNS = [
  // Governments & public services
  /\.gov(\.|$)/, /\.gov\.\w+/, /\.edu(\.|$)/, /\.edu\.\w+/,
  // Directories, aggregators, maps
  /yellowpages/, /whitepages/, /yelp\.com/, /truelocal/, /hotfrog/,
  /whereis\.com/, /google\.com/, /maps\.google/, /bing\.com/,
  /tripadvisor/, /zomato/, /ubereats/, /doordash/,
  // Reference / encyclopedias
  /wikipedia\.org/, /wikidata/, /wikimedia/,
  // Social / job boards
  /linkedin\.com/, /facebook\.com/, /instagram\.com/, /twitter\.com/,
  /seek\.com/, /indeed\.com/, /glassdoor\.com/,
  // News / media
  /news\.com\.au/, /smh\.com\.au/, /theaustralian\.com/, /abc\.net\.au/,
  /herald\.com/, /dailymail/, /theguardian/,
  // Classifieds / marketplaces
  /gumtree\.com/, /ebay\.com/, /amazon\.com/, /etsy\.com/, /realestate\.com/,
  // Document / file hosts
  /scribd\.com/, /slideshare\.net/, /issuu\.com/, /docplayer/,
  // Post / logistics
  /auspost\.com\.au/, /australiapost/, /royalmail/,
  // General info / suburb pages
  /microburbs\.com/, /suburb/, /postcode/, /cancersearch/, /healthdirect/,
]

function isBlocked(domain: string): boolean {
  return BLOCKLIST_PATTERNS.some(p => p.test(domain))
}

/**
 * Batch-filters search results:
 * 1. Hard-block known non-business domains instantly (no LLM cost)
 * 2. Pass remainder to Claude Haiku for ICP matching
 */
export async function batchQuickFilter(
  results: BraveResult[],
  icp: IcpForFilter,
): Promise<FilteredResult[]> {
  if (results.length === 0) return []

  // ── 1. Hard blocklist (free) ──────────────────────────────────────────────
  const candidates = results.filter(r => !isBlocked(r.domain))
  if (candidates.length === 0) return []

  // ── 2. LLM filter ─────────────────────────────────────────────────────────
  const items = candidates.map((r, i) =>
    `[${i}] Domain: ${r.domain} | Title: "${r.title}" | Snippet: "${r.description.slice(0, 200)}"`
  )

  const segmentHint =
    icp.market_segment === 'b2b' ? 'Only businesses that sell to other businesses. Exclude consumer-facing services.' :
    icp.market_segment === 'b2c' ? 'Only businesses that sell directly to consumers. Exclude pure B2B/wholesale.' :
    'Accept B2B and B2C businesses.'

  const prompt = `You are a B2B lead qualification filter. Decide if each result is a real business matching the target profile.

Target:
- Industry: ${icp.industry}
- Segment: ${segmentHint}
- Must-have keywords: ${icp.target_keywords.join(', ') || 'any'}
- Exclude if contains: ${icp.exclude_keywords.join(', ') || 'none'}

Hard rules — mark NOT relevant if:
- It is a directory, listing site, aggregator, or marketplace (even if relevant industry)
- It is a government, council, or public institution website
- It is a map, suburb info, postcode, or demographic data site
- It is a news article, blog post, or media site
- It is a review/ratings platform
- It is a job board or recruitment site
- It is a social media profile
- The domain clearly sells products unrelated to the target industry

Mark RELEVANT only if it appears to be a real private business operating in the target industry.

Results:
${items.join('\n')}

Respond ONLY with a JSON array, one entry per result, in order:
[{"index":0,"is_relevant":true,"business_type":"dental clinic","confidence":0.9},...]`

  try {
    const msg = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      messages:   [{ role: 'user', content: prompt }],
    })

    const raw = (msg.content[0] as { type: string; text: string }).text.trim()
    const parsed = JSON.parse(raw) as Array<{
      index: number; is_relevant: boolean; business_type: string; confidence: number
    }>

    return candidates.map((r, i) => {
      const j = parsed.find(p => p.index === i)
      return {
        ...r,
        is_relevant:   j?.is_relevant   ?? false,   // fail-safe: exclude if uncertain
        business_type: j?.business_type ?? icp.industry,
        confidence:    j?.confidence    ?? 0,
      }
    }).filter(r => r.is_relevant)

  } catch {
    // On parse error, pass blocklist survivors through so the pipeline isn't empty
    return candidates.map(r => ({ ...r, is_relevant: true, business_type: icp.industry, confidence: 0.5 }))
  }
}
