/**
 * seoService
 *
 * Phase 2 — AI Website Builder: SEO Engine
 *
 * Generates title, meta description, h1, keywords, and schema.org JSON-LD
 * from a WebsiteStrategy + BrandSnapshot.
 *
 * Schema.org types generated (MVP):
 *   - Organization (always)
 *   - LocalBusiness (if contact/location data present)
 *   - FAQ (if strategy includes a faq section — not in MVP block set, reserved)
 *   - BreadcrumbList (always, single-item for landing pages)
 *
 * Output is stored as seo_json in brand_pages.
 */

import { callClaude } from '../ai/claude.js'
import type { BrandSnapshot } from './brandSnapshotService.js'
import type { WebsiteStrategy } from './websiteStrategyService.js'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SeoData {
  title:           string      // <title> tag — 50–60 chars
  metaDescription: string      // <meta description> — 150–160 chars
  h1:              string      // page's primary heading (may differ from hero heading)
  keywords:        string[]    // 3–5 primary keywords
  schema:          object[]    // array of schema.org JSON-LD objects
}

// ── Schema.org builders (deterministic — no AI) ───────────────────────────────

function buildOrganizationSchema(snapshot: BrandSnapshot): object {
  return {
    '@context': 'https://schema.org',
    '@type':    'Organization',
    name:       snapshot.companyName ?? undefined,
    url:        snapshot.websiteUrl  ?? undefined,
    logo:       snapshot.assets.primaryLogoUrl ?? undefined,
    ...(snapshot.identity.socialLinks && Object.keys(snapshot.identity.socialLinks).length > 0
      ? { sameAs: Object.values(snapshot.identity.socialLinks) }
      : {}),
  }
}

function buildLocalBusinessSchema(snapshot: BrandSnapshot): object | null {
  const contact = snapshot.identity.contactDetails
  if (!contact || Object.keys(contact).length === 0) return null

  return {
    '@context':   'https://schema.org',
    '@type':      'LocalBusiness',
    name:         snapshot.companyName ?? undefined,
    url:          snapshot.websiteUrl  ?? undefined,
    telephone:    contact.phone        ?? undefined,
    email:        contact.email        ?? undefined,
    address:      contact.address      ?? undefined,
  }
}

function buildBreadcrumbSchema(
  snapshot: BrandSnapshot,
  pageTitle: string
): object {
  return {
    '@context':        'https://schema.org',
    '@type':           'BreadcrumbList',
    itemListElement: [
      {
        '@type':   'ListItem',
        position:  1,
        name:      snapshot.companyName ?? 'Home',
        item:      snapshot.websiteUrl  ?? '/',
      },
      {
        '@type':   'ListItem',
        position:  2,
        name:      pageTitle,
        item:      snapshot.websiteUrl ? `${snapshot.websiteUrl}/page` : '/page',
      },
    ],
  }
}

// ── AI prompt for title / meta / h1 / keywords ───────────────────────────────

function buildSeoPrompt(
  strategy: WebsiteStrategy,
  snapshot: BrandSnapshot
): string {
  return `You are an SEO specialist writing metadata for a landing page.

## Brand
Company: ${snapshot.companyName ?? 'the company'}
Tagline: ${snapshot.tagline ?? ''}
Website: ${snapshot.websiteUrl ?? ''}
Tone: ${snapshot.voice.tone ?? 'professional'}

## Page Strategy
Goal: ${strategy.pageType}
CTA: ${strategy.ctaType}
Suggested Keywords: ${strategy.seoKeywords?.join(', ') ?? 'none'}

## Rules
- Title: 50–60 characters, include primary keyword, include company name if it fits
- Meta description: 150–160 characters, action-oriented, include a CTA hint
- H1: compelling, different from title, keyword-rich, matches page tone
- Keywords: exactly 5 — mix of head terms and long-tail
- Do not stuff keywords — write for humans first

## Output Format
Respond with a single JSON object. No markdown.

{
  "title": "string",
  "metaDescription": "string",
  "h1": "string",
  "keywords": ["kw1", "kw2", "kw3", "kw4", "kw5"]
}`
}

// ── Parser ────────────────────────────────────────────────────────────────────

function parseSeoResponse(raw: string, fallbackTitle: string): Pick<SeoData, 'title' | 'metaDescription' | 'h1' | 'keywords'> {
  try {
    const trimmed = raw.trim().replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '')
    const parsed = JSON.parse(trimmed) as Record<string, unknown>

    return {
      title:           typeof parsed.title           === 'string' ? parsed.title           : fallbackTitle,
      metaDescription: typeof parsed.metaDescription === 'string' ? parsed.metaDescription : '',
      h1:              typeof parsed.h1              === 'string' ? parsed.h1              : fallbackTitle,
      keywords:        Array.isArray(parsed.keywords)
                         ? (parsed.keywords as unknown[]).filter((k): k is string => typeof k === 'string')
                         : [],
    }
  } catch (e) {
    console.error('[seoService] Failed to parse AI response:', raw, e)
    return {
      title:           fallbackTitle,
      metaDescription: '',
      h1:              fallbackTitle,
      keywords:        [],
    }
  }
}

// ── Service ───────────────────────────────────────────────────────────────────

export async function generateSeo(
  strategy: WebsiteStrategy,
  snapshot: BrandSnapshot
): Promise<SeoData> {
  const fallbackTitle = `${snapshot.companyName ?? 'Welcome'} — ${strategy.pageType.replace('_', ' ')}`

  const result = await callClaude({
    model:        'claude-haiku-4-5-20251001',  // SEO meta is fast/cheap
    systemPrompt: 'You are an SEO specialist. Output only valid JSON.',
    messages:     [{ role: 'user', content: buildSeoPrompt(strategy, snapshot) }],
    maxTokens:    512,
    temperature:  0.2,  // SEO should be consistent
  })

  const aiFields = parseSeoResponse(result.content, fallbackTitle)

  // Build schema.org objects deterministically from brand data
  const schemaObjects: object[] = [
    buildOrganizationSchema(snapshot),
    buildBreadcrumbSchema(snapshot, aiFields.title),
  ]

  const localBusiness = buildLocalBusinessSchema(snapshot)
  if (localBusiness) schemaObjects.push(localBusiness)

  return {
    ...aiFields,
    schema: schemaObjects,
  }
}
