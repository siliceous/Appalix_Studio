/**
 * formStrategyService
 *
 * Phase 3 — AI Form Builder: Step 1 of 2
 *
 * Takes a user's goal + brand snapshot and produces a structured
 * FormStrategy before any form content is generated.
 *
 * Rule: strategy ALWAYS precedes generation.
 * formGeneratorService must never be called without a strategy from here.
 *
 * Friction levels:
 *   low    — 1–2 fields (name + email). Maximises conversion.
 *   medium — 3–4 fields. Balances conversion and lead quality.
 *   high   — 5+ fields. Prioritises lead qualification over volume.
 */

import { callClaude } from '../ai/claude.js'
import type { BrandSnapshot } from './brandSnapshotService.js'

// ── Types ─────────────────────────────────────────────────────────────────────

export type FormGoal =
  | 'lead_capture'
  | 'booking'
  | 'enquiry'
  | 'download'

export type FrictionLevel = 'low' | 'medium' | 'high'

export interface FormStrategy {
  fields:        string[]        // ordered field names to include
  ctaText:       string          // button label
  frictionLevel: FrictionLevel
  headline?:     string          // suggested form headline
  subheadline?:  string          // supporting copy under headline
  rationale?:    string          // AI brief reasoning (useful for debugging)
}

export interface BuildFormStrategyInput {
  goal:             FormGoal
  snapshot:         BrandSnapshot
  businessContext?: string        // optional: "we book HVAC service calls"
}

// ── Goal defaults ─────────────────────────────────────────────────────────────

const GOAL_FIELD_DEFAULTS: Record<FormGoal, string[]> = {
  lead_capture: ['name', 'email'],
  booking:      ['name', 'email', 'phone', 'preferred_date'],
  enquiry:      ['name', 'email', 'message'],
  download:     ['name', 'email'],
}

const GOAL_FRICTION: Record<FormGoal, FrictionLevel> = {
  lead_capture: 'low',
  booking:      'medium',
  enquiry:      'medium',
  download:     'low',
}

const GOAL_CTA: Record<FormGoal, string> = {
  lead_capture: 'Get Started',
  booking:      'Book Now',
  enquiry:      'Send Message',
  download:     'Download Now',
}

// ── Prompt ────────────────────────────────────────────────────────────────────

function buildPrompt(input: BuildFormStrategyInput): string {
  const { goal, snapshot, businessContext } = input
  const defaults = GOAL_FIELD_DEFAULTS[goal].join(', ')

  return `You are a conversion rate optimisation specialist designing a form strategy.

## Brand
Company: ${snapshot.companyName ?? 'the company'}
Tone: ${snapshot.voice.tone ?? 'professional'}
CTA Style: ${snapshot.voice.ctaStyle ?? 'consultative'}
Voice Notes: ${snapshot.voice.notes ?? 'None'}

## Form Goal
${goal}

## Business Context
${businessContext ?? 'Not provided'}

## Default fields for this goal
${defaults}

## Rules
- Choose friction level: low (1-2 fields), medium (3-4 fields), high (5+ fields)
- For lead_capture and download: prefer low friction unless context suggests otherwise
- Field names must be from this allowed set:
  name, first_name, last_name, email, phone, company, message,
  preferred_date, preferred_time, postcode, budget, how_did_you_hear
- CTA text must match the brand's cta_style (${snapshot.voice.ctaStyle ?? 'consultative'})
- Headline: short, benefit-led, max 10 words
- Subheadline: one sentence that reduces friction or adds trust

## Output Format
Single JSON object. No markdown. No explanation outside the JSON.

{
  "fields": ["field_name", ...],
  "ctaText": "string",
  "frictionLevel": "low" | "medium" | "high",
  "headline": "string",
  "subheadline": "string",
  "rationale": "1 sentence"
}`
}

// ── Parser ────────────────────────────────────────────────────────────────────

const ALLOWED_FIELDS = new Set([
  'name', 'first_name', 'last_name', 'email', 'phone', 'company', 'message',
  'preferred_date', 'preferred_time', 'postcode', 'budget', 'how_did_you_hear',
])

function parseStrategyResponse(raw: string, goal: FormGoal): FormStrategy {
  try {
    const trimmed = raw.trim().replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '')
    const parsed  = JSON.parse(trimmed) as Record<string, unknown>

    const rawFields = Array.isArray(parsed.fields) ? parsed.fields : []
    const fields = (rawFields as unknown[])
      .filter((f): f is string => typeof f === 'string' && ALLOWED_FIELDS.has(f))

    // Ensure email always present — it's the dedup key for lead creation
    if (!fields.includes('email')) fields.splice(1, 0, 'email')

    const frictionLevel: FrictionLevel =
      parsed.frictionLevel === 'low' || parsed.frictionLevel === 'medium' || parsed.frictionLevel === 'high'
        ? parsed.frictionLevel
        : GOAL_FRICTION[goal]

    return {
      fields,
      ctaText:       typeof parsed.ctaText     === 'string' ? parsed.ctaText     : GOAL_CTA[goal],
      frictionLevel,
      headline:      typeof parsed.headline    === 'string' ? parsed.headline    : undefined,
      subheadline:   typeof parsed.subheadline === 'string' ? parsed.subheadline : undefined,
      rationale:     typeof parsed.rationale   === 'string' ? parsed.rationale   : undefined,
    }
  } catch (e) {
    console.error('[formStrategyService] Failed to parse AI response:', raw, e)
    return {
      fields:        GOAL_FIELD_DEFAULTS[goal],
      ctaText:       GOAL_CTA[goal],
      frictionLevel: GOAL_FRICTION[goal],
    }
  }
}

// ── Service ───────────────────────────────────────────────────────────────────

export async function buildFormStrategy(input: BuildFormStrategyInput): Promise<FormStrategy> {
  const result = await callClaude({
    model:        'claude-haiku-4-5-20251001',
    systemPrompt: 'You are a conversion rate optimisation specialist. Output only valid JSON.',
    messages:     [{ role: 'user', content: buildPrompt(input) }],
    maxTokens:    512,
    temperature:  0.3,
  })

  return parseStrategyResponse(result.content, input.goal)
}
