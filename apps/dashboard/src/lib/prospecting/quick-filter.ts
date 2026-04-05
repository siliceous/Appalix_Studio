import type { BraveResult } from './brave-search'

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

  // Generic directories & aggregators
  /yellowpages/, /whitepages/, /truelocal/, /hotfrog/, /localsearch\.com/,
  /yelp\.com/, /tripadvisor/, /zomato/, /ubereats/, /doordash/,

  // Australian trade / home services directories
  /oneflare\.com/, /hipages\.com/, /airtasker\.com/, /serviceseeking\.com/,
  /tradesman\.com/, /servicecentral\.com/, /quotify\.com/,
  /wheree\.com/, /localbusinessguide/, /startlocal\.com/, /cylex\.com/,

  // Solar / energy specific directories
  /solarquotes\.com/, /solardirectory\.com/, /enfsolar\.com/,
  /solarchoice\.net/, /cleanenergyreviews\.com/, /solarcalculator/,
  /yourenergyanswers\.com/, /energymatters\.com/, /solarmarket\.com/,

  // Maps & location
  /whereis\.com/, /google\.com/, /maps\.google/, /bing\.com/,
  /microburbs\.com/, /nearmap\.com/,

  // Reference / encyclopedias
  /wikipedia\.org/, /wikidata/, /wikimedia/,

  // Social / job boards
  /linkedin\.com/, /facebook\.com/, /instagram\.com/, /twitter\.com/, /x\.com/,
  /seek\.com/, /indeed\.com/, /glassdoor\.com/, /jora\.com/,

  // News / media
  /news\.com\.au/, /smh\.com\.au/, /theaustralian\.com/, /abc\.net\.au/,
  /herald\.com/, /dailymail/, /theguardian/, /nine\.com\.au/,

  // Classifieds / marketplaces
  /gumtree\.com/, /ebay\.com/, /amazon\.com/, /etsy\.com/,
  /realestate\.com/, /domain\.com\.au/,

  // Document / file hosts
  /scribd\.com/, /slideshare\.net/, /issuu\.com/, /docplayer/,

  // Post / logistics
  /auspost\.com\.au/, /royalmail/,

  // Health / government info portals
  /cancersearch/, /healthdirect/, /myhealth/, /ndisfinder/,
  /service\.nsw/, /nsw\.gov/, /vic\.gov/, /qld\.gov/,

  // Comparison / review sites
  /canstar/, /finder\.com/, /comparethemarket/, /iselect/,
  /productreview\.com/, /trustpilot/, /reviews\.com/,
  /cleanenergyreviews/, /choice\.com\.au/,

  // General community / forums
  /reddit\.com/, /quora\.com/, /whirlpool\.net/,

  // B2B data / lead databases (not real business websites)
  /zoominfo\.com/, /dnb\.com/, /crunchbase\.com/, /apollo\.io/,
  /lusha\.com/, /clearbit\.com/, /hunter\.io/,

  // Australian general directories
  /dlook\.com/, /brownbook\.net/, /australianbusiness\.com\.au/,
  /bloo\.com\.au/, /localbd\.com/, /aussieweb\.com\.au/,

  // Industry bodies / associations / advocacy (not installers)
  /gbca\.org/, /cleanenergycouncil/, /energynetworks\.com/, /aemo\.com\.au/,
  /accc\.gov/, /aemc\.gov/, /arena\.gov/, /cefc\.com\.au/,

  // Trade media / industry news (not businesses)
  /ecogeneration\.com/, /renewnews\.com/, /pv-magazine/, /solarpowerworldonline/,
  /businessgreen\.com/, /reneweconomy\.com/, /theenergist\.com\.au/,
  /solarbuildermag\.com/, /solarindustrymag\.com/,

  // Venue / venue-authority / hospitality chains (not installers)
  /olympicpark/, /sydneyolympicpark/, /novotel/, /mercure\.com/,
  /accor\.com/, /hilton\.com/, /marriott\.com/, /ihg\.com/,
  /hyatt\.com/, /wyndham\.com/, /bestwestern\.com/,

  // Software / SaaS tools / calculators (not installers)
  /profilesolar\.com/, /pvwatts/, /solaredge\.com\/blog/,
  /globalsolaratlas/, /solargis\.com/,
]

export function isBlockedDomain(domain: string): boolean {
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
    .filter(r => !isBlockedDomain(r.domain))
    .map(r => ({ ...r, is_relevant: true, business_type: '', confidence: 0.5 }))
}
