/**
 * websiteGeneratorService
 *
 * Phase 2 — AI Website Builder: Step 2 of 2
 *
 * Consumes a WebsiteStrategy + BrandSnapshot and generates structured
 * page blocks. Each block is a self-contained content unit.
 *
 * Rules:
 *   - Never called without a strategy (call websiteStrategyService first)
 *   - Never reads raw brand tables — only consumes BrandSnapshot
 *   - Output is brand_snapshot + blocks; stored together in brand_pages
 *   - MVP block types: hero | features | testimonial | cta_band | footer
 */

import { callClaude } from '../ai/claude.js'
import type { BrandSnapshot } from './brandSnapshotService.js'
import type { WebsiteStrategy, MvpSectionType } from './websiteStrategyService.js'

// ── Block content types (MVP) ─────────────────────────────────────────────────

export interface HeroBlock {
  type: 'hero'
  content: {
    heading:       string
    subheading:    string
    ctaLabel:      string
    ctaUrl:        string              // placeholder '#' until user configures
    backgroundImageUrl?: string        // from brand assets if available
  }
}

export interface FeaturesBlock {
  type: 'features'
  content: {
    heading: string
    items: Array<{
      icon?:        string             // emoji or icon name
      title:        string
      description:  string
    }>
  }
}

export interface TestimonialBlock {
  type: 'testimonial'
  content: {
    quote:            string
    authorName:       string
    authorTitle?:     string
    authorAvatarUrl?: string
  }
}

export interface CtaBandBlock {
  type: 'cta_band'
  content: {
    heading:    string
    subheading: string
    ctaLabel:   string
    ctaUrl:     string
  }
}

export interface FooterBlock {
  type: 'footer'
  content: {
    companyName:    string
    footerText:     string
    logoUrl?:       string
    socialLinks?:   Record<string, string>
    contactDetails?: Record<string, string>
  }
}

export type PageBlock =
  | HeroBlock
  | FeaturesBlock
  | TestimonialBlock
  | CtaBandBlock
  | FooterBlock

// Tracking bootstrap — embedded at generation time into every page/form output.
// The client script reads this to know what it is tracking.
export interface TrackerBootstrap {
  workspaceId: string
  entityType:  'brand_page' | 'brand_form'
  entityId:    string
}

export interface PageLayout {
  blocks:   PageBlock[]
  tracking: TrackerBootstrap
}

// ── Prompt builders per block type ───────────────────────────────────────────

function brandContext(snapshot: BrandSnapshot): string {
  return `Company: ${snapshot.companyName ?? 'the company'}
Tagline: ${snapshot.tagline ?? ''}
Tone: ${snapshot.voice.tone ?? 'professional'}
Style: ${snapshot.voice.style ?? 'modern'}
CTA Style: ${snapshot.voice.ctaStyle ?? 'consultative'}
Voice Notes: ${snapshot.voice.notes ?? 'None'}
Primary Color: ${snapshot.colors.primary ?? 'not set'}`
}

function buildGeneratorPrompt(
  strategy: WebsiteStrategy,
  snapshot: BrandSnapshot
): string {
  return `You are a conversion copywriter generating page content for a website landing page.

## Brand
${brandContext(snapshot)}

## Strategy
Page Type: ${strategy.pageType}
Goal Tone: ${strategy.tone}
CTA Type: ${strategy.ctaType}
SEO Keywords: ${strategy.seoKeywords?.join(', ') ?? 'none'}

## Sections to generate (in order)
${strategy.sections.join(', ')}

## Rules
- Write in the brand's tone and style
- Every heading should be compelling and action-oriented
- CTAs should match the ctaType (${strategy.ctaType})
- Features block: generate exactly 3 items
- Testimonial block: write a realistic-sounding placeholder testimonial
- Footer block: use brand identity fields provided below
- Do not invent company-specific facts unless given in Voice Notes or business context

## Footer Data
Company Name: ${snapshot.companyName ?? 'Your Company'}
Footer Text: ${snapshot.identity.footerText ?? `© ${new Date().getFullYear()} ${snapshot.companyName ?? 'Your Company'}. All rights reserved.`}

## Output Format
Respond with a JSON array of block objects. No markdown. No explanation outside the JSON.
Each block must have: { "type": "<block_type>", "content": { ... } }

Block schemas:
- hero:        { heading, subheading, ctaLabel, ctaUrl: "#" }
- features:    { heading, items: [ { icon, title, description } ] }  — exactly 3 items
- testimonial: { quote, authorName, authorTitle }
- cta_band:    { heading, subheading, ctaLabel, ctaUrl: "#" }
- footer:      { companyName, footerText, socialLinks: {}, contactDetails: {} }

Output the array only.`
}

// ── Block builders for non-AI blocks ─────────────────────────────────────────

function buildFooterFromSnapshot(snapshot: BrandSnapshot): FooterBlock {
  return {
    type: 'footer',
    content: {
      companyName:     snapshot.companyName ?? 'Your Company',
      footerText:      snapshot.identity.footerText
                         ?? `© ${new Date().getFullYear()} ${snapshot.companyName ?? 'Your Company'}. All rights reserved.`,
      logoUrl:         snapshot.assets.primaryLogoUrl,
      socialLinks:     snapshot.identity.socialLinks,
      contactDetails:  snapshot.identity.contactDetails,
    },
  }
}

// ── Parser ────────────────────────────────────────────────────────────────────

const VALID_BLOCK_TYPES = new Set<string>([
  'hero', 'features', 'testimonial', 'cta_band', 'footer',
])

function parseBlocksResponse(
  raw: string,
  strategy: WebsiteStrategy,
  snapshot: BrandSnapshot
): PageBlock[] {
  let parsed: unknown[]

  try {
    const trimmed = raw.trim()
    // Strip markdown code fences if AI added them despite instructions
    const json = trimmed.startsWith('```')
      ? trimmed.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '')
      : trimmed
    parsed = JSON.parse(json)
    if (!Array.isArray(parsed)) throw new Error('Not an array')
  } catch (e) {
    console.error('[websiteGeneratorService] Failed to parse AI response:', raw, e)
    parsed = []
  }

  // Filter to valid block types only
  const blocks = parsed.filter(
    (b): b is PageBlock =>
      typeof b === 'object' &&
      b !== null &&
      'type' in b &&
      VALID_BLOCK_TYPES.has((b as { type: string }).type)
  )

  // Ensure footer is always the last block and pulled from brand data
  const withoutFooter = blocks.filter((b): b is Exclude<PageBlock, FooterBlock> => b.type !== 'footer')

  // Only include sections from the strategy
  const strategySet = new Set<MvpSectionType>(strategy.sections)
  const filtered: PageBlock[] = withoutFooter.filter(b => strategySet.has(b.type as MvpSectionType))

  // Always append footer from brand snapshot (not AI-generated)
  if (strategySet.has('footer')) {
    filtered.push(buildFooterFromSnapshot(snapshot))
  }

  return filtered
}

// ── Service ───────────────────────────────────────────────────────────────────

export async function generatePage(
  strategy: WebsiteStrategy,
  snapshot: BrandSnapshot,
  workspaceId: string,
  entityId: string
): Promise<PageLayout> {
  const prompt = buildGeneratorPrompt(strategy, snapshot)

  const result = await callClaude({
    model:        'claude-sonnet-4-6',  // generator needs quality copy
    systemPrompt: 'You are a conversion copywriter. Output only valid JSON arrays.',
    messages:     [{ role: 'user', content: prompt }],
    maxTokens:    2048,
    temperature:  0.6,
  })

  const blocks = parseBlocksResponse(result.content, strategy, snapshot)

  return {
    blocks,
    tracking: { workspaceId, entityType: 'brand_page', entityId },
  }
}
