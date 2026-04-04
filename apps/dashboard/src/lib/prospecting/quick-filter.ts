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

/**
 * Batch-filters all search results in a single Claude call.
 * Uses Haiku (cheap + fast) since this is a classification task.
 * Returns only relevant results.
 */
export async function batchQuickFilter(
  results: BraveResult[],
  icp: IcpForFilter,
): Promise<FilteredResult[]> {
  if (results.length === 0) return []

  const items = results.map((r, i) => `[${i}] Title: "${r.title}" | Domain: ${r.domain} | Snippet: "${r.description}"`)

  const segmentHint =
    icp.market_segment === 'b2b' ? 'Prefer businesses that sell to other businesses (wholesalers, B2B services, trade suppliers). Exclude businesses that only sell direct to consumers.' :
    icp.market_segment === 'b2c' ? 'Prefer businesses that sell directly to consumers (retail, local services, consumer-facing). Exclude pure B2B/wholesale-only businesses.' :
    'Accept both B2B and B2C businesses.'

  const prompt = `You are a lead qualification filter. Evaluate each company snippet and decide if it matches the target profile.

Target profile:
- Industry: ${icp.industry}
- Market segment: ${icp.market_segment ?? 'both'} — ${segmentHint}
- Target keywords: ${icp.target_keywords.join(', ') || 'none'}
- Exclude keywords: ${icp.exclude_keywords.join(', ') || 'none'}

Rules:
- Mark as relevant if it looks like a real business matching the industry/keywords and market segment
- Mark as NOT relevant if: it's a directory, aggregator, news site, job board, education provider, or matches any exclude keyword
- business_type should be a short description (e.g. "dental clinic", "marketing agency")

Results to evaluate:
${items.join('\n')}

Respond ONLY with a JSON array (no markdown), one object per result, in order:
[{"index":0,"is_relevant":true,"business_type":"dental clinic","confidence":0.9},...]`

  const msg = await anthropic.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 1000,
    messages:   [{ role: 'user', content: prompt }],
  })

  const raw = (msg.content[0] as { type: string; text: string }).text.trim()

  let parsed: Array<{ index: number; is_relevant: boolean; business_type: string; confidence: number }>
  try {
    parsed = JSON.parse(raw)
  } catch {
    // If Claude returns something unexpected, be conservative and pass everything through
    return results.map(r => ({ ...r, is_relevant: true, business_type: icp.industry, confidence: 0.5 }))
  }

  return results.map((r, i) => {
    const judgment = parsed.find(p => p.index === i)
    return {
      ...r,
      is_relevant:   judgment?.is_relevant   ?? true,
      business_type: judgment?.business_type ?? icp.industry,
      confidence:    judgment?.confidence    ?? 0.5,
    }
  }).filter(r => r.is_relevant)
}
