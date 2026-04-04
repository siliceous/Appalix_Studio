import type { ExtractedCompany } from './extract'

export interface ScoreBreakdown {
  industry_score: number   // 0–50
  location_score: number   // 0–30
  service_score:  number   // 0–20 (only if industry matched)
}

export interface ScoreResult {
  score:     number
  tier:      'hot' | 'warm' | 'cold' | 'discarded'
  breakdown: ScoreBreakdown
}

interface IcpForScoring {
  industry:            string
  target_keywords:     string[]
  locations:           string[]
  services_of_interest: string[]
}

function normalize(s: string) { return s.toLowerCase().trim() }

function textContains(haystack: string, needle: string): boolean {
  return normalize(haystack).includes(normalize(needle))
}

/**
 * Deterministic scoring — no ML, no ambiguity.
 *
 * Industry/Keyword Match  0–50
 * Location Match          0–30
 * Service Fit             0–20  (only if industry score > 0)
 * ─────────────────────────────
 * Total                   0–100
 *
 * Thresholds:
 *   ≥ 70  → hot  (auto-push to pipeline)
 *   50–69 → warm (show in results, manual add)
 *   < 50  → cold / discard
 */
export function scoreProspect(
  extracted:    ExtractedCompany,
  icp:          IcpForScoring,
  searchTitle:  string,
  searchSnippet: string,
): ScoreResult {
  const searchText = `${searchTitle} ${searchSnippet}`.toLowerCase()
  const contentText = `${extracted.company_name ?? ''} ${extracted.description ?? ''} ${extracted.services.join(' ')}`.toLowerCase()
  const allText = `${searchText} ${contentText}`

  // ── 1. Industry / Keyword match (0–50) ────────────────────────────────────
  let industryScore = 0
  const industryMatch = textContains(allText, icp.industry)
  if (industryMatch) {
    industryScore = 50
  } else {
    // Check target keywords — take first match
    const keywordHit = icp.target_keywords.some(kw => textContains(allText, kw))
    industryScore = keywordHit ? 30 : 0
  }

  // ── 2. Location match (0–30) ──────────────────────────────────────────────
  let locationScore = 0
  const locText = `${extracted.location_text ?? ''} ${searchText}`.toLowerCase()
  for (const loc of icp.locations) {
    if (textContains(locText, loc)) {
      locationScore = 30
      break
    }
    // Partial: first word of multi-word location (e.g. "New" from "New South Wales")
    const parts = loc.split(' ')
    if (parts.length > 1 && parts.some(p => p.length > 3 && textContains(locText, p))) {
      locationScore = Math.max(locationScore, 15)
    }
  }

  // ── 3. Service fit (0–20) — only if industry matched ─────────────────────
  let serviceScore = 0
  if (industryScore > 0 && icp.services_of_interest.length > 0) {
    const matches = icp.services_of_interest.filter(svc =>
      textContains(contentText, svc) || extracted.services.some(es => textContains(es, svc))
    )
    if (matches.length >= 2)      serviceScore = 20
    else if (matches.length === 1) serviceScore = 10
  }

  const score = industryScore + locationScore + serviceScore

  const tier: ScoreResult['tier'] =
    score >= 70 ? 'hot'  :
    score >= 50 ? 'warm' :
    score >= 30 ? 'cold' :
    'discarded'

  return {
    score,
    tier,
    breakdown: {
      industry_score: industryScore,
      location_score: locationScore,
      service_score:  serviceScore,
    },
  }
}
