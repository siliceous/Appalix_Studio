/**
 * websiteStrategyService
 *
 * Phase 2 — AI Website Builder: Step 1 of 2
 *
 * Takes a user's goal + brand snapshot and produces a structured
 * WebsiteStrategy before any page content is generated.
 *
 * Rule: strategy ALWAYS precedes generation.
 * The generator (websiteGeneratorService) must never be called
 * without a strategy returned from this service.
 */

import { callClaude } from '../ai/claude.js'
import type { BrandSnapshot } from './brandSnapshotService.js'

// ── Types ─────────────────────────────────────────────────────────────────────

export type WebsiteGoal =
  | 'lead_generation'
  | 'booking'
  | 'local_seo'
  | 'campaign'
  | 'offer'

export type MvpSectionType =
  | 'hero'
  | 'features'
  | 'testimonial'
  | 'cta_band'
  | 'footer'

export interface WebsiteStrategy {
  pageType:     string               // e.g. "landing_page", "service_page"
  sections:     MvpSectionType[]     // ordered section types for this page
  tone:         string               // derived from brand voice or goal
  ctaType:      string               // e.g. "book_call", "submit_form", "download"
  seoKeywords?: string[]             // 3–5 primary keywords
  rationale?:   string               // AI's brief reasoning (useful for debugging)
}

export interface BuildStrategyInput {
  goal:             WebsiteGoal
  snapshot:         BrandSnapshot
  businessContext?: string           // optional free-text: "we're a local plumber in Bristol"
}

// ── Section rules per goal (MVP: fixed block set) ────────────────────────────
// These are the default section orderings suggested to the AI.
// The AI may adjust based on context but must stay within MVP block types.

const GOAL_SECTION_DEFAULTS: Record<WebsiteGoal, MvpSectionType[]> = {
  lead_generation: ['hero', 'features', 'testimonial', 'cta_band', 'footer'],
  booking:         ['hero', 'features', 'cta_band', 'footer'],
  local_seo:       ['hero', 'features', 'testimonial', 'cta_band', 'footer'],
  campaign:        ['hero', 'cta_band', 'features', 'footer'],
  offer:           ['hero', 'cta_band', 'testimonial', 'footer'],
}

const CTA_TYPE_BY_GOAL: Record<WebsiteGoal, string> = {
  lead_generation: 'submit_form',
  booking:         'book_call',
  local_seo:       'call_now',
  campaign:        'claim_offer',
  offer:           'get_offer',
}

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildStrategyPrompt(input: BuildStrategyInput): string {
  const { goal, snapshot, businessContext } = input
  const defaultSections = GOAL_SECTION_DEFAULTS[goal].join(', ')

  return `You are a conversion-focused website strategist.

Your job is to produce a page strategy for a single landing page.
Think first, then output. Do not generate page content — only structure.

## Brand Profile
Company: ${snapshot.companyName ?? 'Not set'}
Tagline: ${snapshot.tagline ?? 'Not set'}
Tone: ${snapshot.voice.tone ?? 'professional'}
Style: ${snapshot.voice.style ?? 'modern'}
CTA Style: ${snapshot.voice.ctaStyle ?? 'consultative'}
Voice Notes: ${snapshot.voice.notes ?? 'None'}

## Goal
${goal}

## Business Context
${businessContext ?? 'Not provided'}

## Constraints
- Page must use only these section types: hero, features, testimonial, cta_band, footer
- Default section order for this goal: ${defaultSections}
- You may reorder or omit sections (except hero and footer) based on the goal
- Keep it focused — 3 to 5 sections maximum

## Output Format
Respond with a single JSON object. No markdown. No explanation outside the JSON.

{
  "pageType": "string — e.g. landing_page, service_page, offer_page",
  "sections": ["hero", "features", ...],
  "tone": "string — the specific tone to use for copy",
  "ctaType": "string — the primary CTA action",
  "seoKeywords": ["keyword1", "keyword2", "keyword3"],
  "rationale": "1–2 sentences explaining the strategy choices"
}`
}

// ── Service ───────────────────────────────────────────────────────────────────

const MVP_SECTION_TYPES = new Set<string>([
  'hero', 'features', 'testimonial', 'cta_band', 'footer',
])

function parseStrategyResponse(raw: string, goal: WebsiteGoal): WebsiteStrategy {
  let parsed: Record<string, unknown>

  try {
    parsed = JSON.parse(raw.trim())
  } catch {
    console.error('[websiteStrategyService] Failed to parse AI response:', raw)
    // Fallback to safe defaults rather than crashing
    return {
      pageType: 'landing_page',
      sections: GOAL_SECTION_DEFAULTS[goal],
      tone:     'professional',
      ctaType:  CTA_TYPE_BY_GOAL[goal],
    }
  }

  // Validate and filter sections to MVP-only types
  const rawSections = Array.isArray(parsed.sections) ? parsed.sections : []
  const sections = rawSections.filter(
    (s): s is MvpSectionType => typeof s === 'string' && MVP_SECTION_TYPES.has(s)
  )

  // Ensure hero + footer always present
  if (!sections.includes('hero'))   sections.unshift('hero')
  if (!sections.includes('footer')) sections.push('footer')

  return {
    pageType:     typeof parsed.pageType === 'string' ? parsed.pageType : 'landing_page',
    sections,
    tone:         typeof parsed.tone === 'string' ? parsed.tone : 'professional',
    ctaType:      typeof parsed.ctaType === 'string' ? parsed.ctaType : CTA_TYPE_BY_GOAL[goal],
    seoKeywords:  Array.isArray(parsed.seoKeywords)
                    ? (parsed.seoKeywords as unknown[]).filter((k): k is string => typeof k === 'string')
                    : undefined,
    rationale:    typeof parsed.rationale === 'string' ? parsed.rationale : undefined,
  }
}

export async function buildStrategy(input: BuildStrategyInput): Promise<WebsiteStrategy> {
  const prompt = buildStrategyPrompt(input)

  const result = await callClaude({
    model:       'claude-haiku-4-5-20251001',  // strategy is fast, cheap
    systemPrompt: 'You are a conversion-focused website strategist. Output only valid JSON.',
    messages:    [{ role: 'user', content: prompt }],
    maxTokens:   512,
    temperature: 0.3,  // low temp — strategy should be consistent, not creative
  })

  return parseStrategyResponse(result.content, input.goal)
}
