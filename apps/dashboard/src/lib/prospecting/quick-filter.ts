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
 * Filters search results using only the hard blocklist.
 * LLM pre-filtering removed — the scoring step already ranks relevance.
 * Keeping the LLM filter was causing too many real businesses to be dropped,
 * especially for local/suburb searches where Brave returns mixed results.
 */
export async function batchQuickFilter(
  results: BraveResult[],
  _icp: IcpForFilter,
): Promise<FilteredResult[]> {
  return results
    .filter(r => !isBlocked(r.domain))
    .map(r => ({ ...r, is_relevant: true, business_type: '', confidence: 0.5 }))
}
