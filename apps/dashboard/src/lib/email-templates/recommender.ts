/**
 * Deterministic rules-based email template recommender.
 * No Claude call — scores each preset against the brand profile snapshot.
 * Returns presets sorted by descending score, plus the recommended variation index.
 */

import { TEMPLATE_PRESETS, type TemplatePreset, type TemplateStyle } from './presets'
import { recommendVariationIndex, type CampaignIntent } from './variations'

export interface BrandSignal {
  brand_tone:       string | null
  brand_style:      string | null
  cta_style:        string | null
  has_logo:         boolean
  has_colors:       boolean
  campaign_intent?: CampaignIntent
}

export interface ScoredPreset {
  preset:  TemplatePreset
  score:   number
  reason:  string
}

export interface Recommendation {
  rankedStyles:       ScoredPreset[]
  topStyle:           TemplateStyle
  recommendedVariation: 1 | 2 | 3 | 4
}

const TONE_TO_STYLE_AFFINITY: Record<string, TemplateStyle[]> = {
  professional:   ['minimalist', 'announcement'],
  premium:        ['minimalist', 'announcement'],
  direct:         ['minimalist', 'offer'],
  authoritative:  ['announcement', 'minimalist'],
  friendly:       ['promotional', 'newsletter'],
  playful:        ['promotional', 'offer'],
  conversational: ['newsletter', 'promotional'],
}

const STYLE_TO_TEMPLATE_AFFINITY: Record<string, TemplateStyle[]> = {
  minimal:       ['minimalist'],
  corporate:     ['announcement', 'minimalist'],
  bold:          ['promotional', 'announcement'],
  modern:        ['minimalist', 'promotional'],
  storytelling:  ['newsletter', 'announcement'],
  'data-driven': ['newsletter', 'minimalist'],
}

const CTA_TO_TEMPLATE_AFFINITY: Record<string, TemplateStyle[]> = {
  soft:         ['newsletter', 'minimalist'],
  consultative: ['minimalist', 'announcement'],
  assertive:    ['offer', 'promotional'],
}

// Campaign intent adjusts template style scoring
const INTENT_TO_STYLE_BOOST: Record<CampaignIntent, TemplateStyle[]> = {
  product_launch: ['promotional', 'announcement'],
  promotion:      ['offer', 'promotional'],
  newsletter:     ['newsletter', 'minimalist'],
  announcement:   ['announcement', 'promotional'],
  other:          ['minimalist', 'basic'],
}

export function recommendTemplates(signal: BrandSignal): Recommendation {
  const scores  = new Map<TemplateStyle, number>()
  const reasons = new Map<TemplateStyle, string[]>()

  function add(style: TemplateStyle, pts: number, reason: string) {
    scores.set(style, (scores.get(style) ?? 0) + pts)
    const r = reasons.get(style) ?? []
    r.push(reason)
    reasons.set(style, r)
  }

  // Tone affinity
  if (signal.brand_tone) {
    const matches = TONE_TO_STYLE_AFFINITY[signal.brand_tone] ?? []
    matches.forEach((s, i) => add(s, 3 - i, `${signal.brand_tone} tone`))
  }

  // Brand style affinity
  if (signal.brand_style) {
    const matches = STYLE_TO_TEMPLATE_AFFINITY[signal.brand_style] ?? []
    matches.forEach((s, i) => add(s, 2 - i, `${signal.brand_style} style`))
  }

  // CTA style
  if (signal.cta_style) {
    const matches = CTA_TO_TEMPLATE_AFFINITY[signal.cta_style] ?? []
    matches.forEach(s => add(s, 1, `${signal.cta_style} CTA`))
  }

  // Campaign intent boost (highest weight — user explicitly stated intent)
  if (signal.campaign_intent) {
    const matches = INTENT_TO_STYLE_BOOST[signal.campaign_intent] ?? []
    matches.forEach((s, i) => add(s, 4 - i, `${signal.campaign_intent} intent`))
  }

  // Logo availability boosts visual-heavy styles
  if (signal.has_logo) {
    add('promotional',  1, 'logo available')
    add('announcement', 1, 'logo available')
  }

  // No brand data → safe default
  const hasAnySignal = signal.brand_tone || signal.brand_style || signal.cta_style || signal.campaign_intent
  if (!hasAnySignal) {
    add('minimalist', 5, 'safe default — no brand data')
  }

  const rankedStyles = TEMPLATE_PRESETS.map(preset => ({
    preset,
    score:  scores.get(preset.id) ?? 0,
    reason: (reasons.get(preset.id) ?? []).join(', ') || 'general use',
  })).sort((a, b) => b.score - a.score)

  const topStyle           = rankedStyles[0]?.preset.id ?? 'minimalist'
  const recommendedVariation = recommendVariationIndex(signal.campaign_intent ?? 'other')

  return { rankedStyles, topStyle, recommendedVariation }
}
