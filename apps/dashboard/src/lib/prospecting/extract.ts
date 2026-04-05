import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Decision-maker schema ─────────────────────────────────────────────────────

export interface DetectedPerson {
  full_name:        string
  title:            string | null
  company:          string | null   // Sprint 2: linked from company_name
  context_block:    string          // verbatim surrounding text from the page
  source_url:       string | null   // Sprint 2: per-page URL tracking
  source_snippet:   string          // first ~200 chars of context_block
  confidence_score: number          // 0–1
}

// ── Company extraction schema ─────────────────────────────────────────────────

export interface ExtractedCompany {
  company_name:     string | null
  contact_name:     string | null   // backward compat — highest-confidence DM name
  description:      string | null
  services:         string[]
  pricing_hint:     string | null
  city:             string | null
  state:            string | null
  country:          string | null
  emails:           string[]
  phones:           string[]
  decision_makers:  DetectedPerson[]
}

// ── Pass 1: Decision-maker detection ─────────────────────────────────────────

// Title → base confidence score
const TITLE_SCORES: [RegExp, number][] = [
  [/\b(ceo|chief\s+executive)\b/i,                0.95],
  [/\b(founder|co[‐\-]?founder)\b/i,              0.95],
  [/\b(owner|proprietor|business\s+owner)\b/i,    0.93],
  [/\b(managing\s+director|md)\b/i,               0.90],
  [/\b(director)\b/i,                             0.85],
  [/\b(principal)\b/i,                            0.85],
  [/\b(partner)\b/i,                              0.82],
  [/\b(general\s+manager|gm)\b/i,                 0.80],
  [/\b(president)\b/i,                            0.80],
  [/\b(vice[\s\-]president|vp)\b/i,               0.75],
  [/\b(head\s+of|chief\s+\w+\s+officer|c[a-z]o)\b/i, 0.75],
  [/\b(operations\s+manager|sales\s+manager)\b/i, 0.70],
  [/\b(manager)\b/i,                              0.65],
  [/\b(team\s+leader|lead\s+\w+)\b/i,             0.58],
]

function titleConfidence(title: string | null): number {
  if (!title) return 0.30
  for (const [pattern, score] of TITLE_SCORES) {
    if (pattern.test(title)) return score
  }
  return 0.42  // has a title, but not a known decision-maker pattern
}

function sectionBonus(contextBlock: string): number {
  if (/##\s*(about|team|leadership|our\s+team|meet|staff|who\s+we\s+are|people)/i.test(contextBlock)) return 0.08
  if (/##\s*(contact|get\s+in\s+touch|reach)/i.test(contextBlock)) return 0.04
  return 0
}

function contextDepthBonus(contextBlock: string): number {
  if (contextBlock.length > 350) return 0.07   // detailed bio
  if (contextBlock.length > 150) return 0.03
  return 0
}

function scoreCandidate(
  title:        string | null,
  contextBlock: string,
  totalFound:   number,
): number {
  const base  = titleConfidence(title)
  const bonus =
    sectionBonus(contextBlock) +
    contextDepthBonus(contextBlock) +
    (totalFound === 1 ? 0.04 : 0)   // sole named person → likely prominent
  return Math.min(1.0, parseFloat((base + bonus).toFixed(2)))
}

async function detectDecisionMakers(
  markdown:      string,
  domain:        string,
  extraContext?: string,
): Promise<DetectedPerson[]> {
  const contextSuffix = extraContext
    ? `\n\nAdditional context:\n${extraContext.slice(0, 800)}`
    : ''

  const prompt = `You are scanning a business website to identify decision-makers and key named contacts.

Domain: ${domain}

Website content (Homepage, About/Team, Contact sections merged):
${markdown.slice(0, 16000)}${contextSuffix}

Task: Find every individual who is clearly named (first + last name) AND is associated with a role, title, or position at this business.

Include: Founders, Owners, Directors, CEOs, Principals, Partners, Managers, and named staff members.
Exclude: anonymous "our team" references, customer testimonials, case-study subjects unrelated to the business, and names with no stated role.

For each person found, return:
- full_name: their full name exactly as written
- title: their job title or role exactly as written (null if not stated)
- context_block: the VERBATIM surrounding paragraph or section (up to 500 characters) where this person is mentioned — include neighbouring text for context

Respond ONLY with a valid JSON array. Return [] if no named individuals with roles are found:
[
  {
    "full_name": "Jane Smith",
    "title": "Managing Director",
    "context_block": "Jane Smith, Managing Director, has led the company since 2010..."
  }
]`

  try {
    const msg = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages:   [{ role: 'user', content: prompt }],
    })

    const raw = (msg.content[0] as { type: string; text: string }).text.trim()

    // Strip markdown fences if Haiku wraps it anyway
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    const list    = JSON.parse(cleaned) as unknown

    if (!Array.isArray(list)) return []

    const candidates: DetectedPerson[] = list
      .filter((p): p is Record<string, unknown> =>
        typeof p === 'object' && p !== null &&
        typeof p.full_name === 'string' && p.full_name.trim().length > 2,
      )
      .map(p => {
        const block = typeof p.context_block === 'string'
          ? p.context_block.slice(0, 600).trim()
          : String(p.full_name)
        return {
          full_name:        (p.full_name as string).trim(),
          title:            typeof p.title === 'string' ? p.title.trim() || null : null,
          company:          null,         // Sprint 2
          context_block:    block,
          source_url:       null,         // Sprint 2
          source_snippet:   block.slice(0, 200).trim(),
          confidence_score: 0,            // computed below
        }
      })

    const total = candidates.length
    return candidates.map(c => ({
      ...c,
      confidence_score: scoreCandidate(c.title, c.context_block, total),
    }))

  } catch {
    return []
  }
}

// ── Main extraction ───────────────────────────────────────────────────────────

/**
 * Extracts structured company data + detects decision-makers.
 * Runs two focused LLM calls in parallel to avoid added latency.
 */
export async function extractCompanyData(
  domain:        string,
  markdown:      string,
  title:         string | null,
  extraContext?: string,
): Promise<ExtractedCompany> {
  const contextBlock = extraContext
    ? `\n\nAdditional context from web search (may contain GMB / directory data):\n${extraContext.slice(0, 2000)}`
    : ''

  const mainPrompt = `You are extracting structured business information for a sales prospecting tool.

Domain: ${domain}
Page title: ${title ?? 'unknown'}

Website content (multiple pages merged — Homepage, About, Services, Contact, Pricing):
${markdown.slice(0, 18000)}${contextBlock}

Respond ONLY with valid JSON (no markdown fences, no commentary):
{
  "company_name": "Official business name",
  "contact_name": "Owner / principal / contact person full name, or null",
  "description": "2-3 sentence description of what the business does and who it serves",
  "services": ["specific service 1", "specific service 2"],
  "pricing_hint": "Any pricing info found — packages, rates, starting from prices, or null if nothing found",
  "city": "Primary city or suburb, or null",
  "state": "State / province / region, or null",
  "country": "Full country name (e.g. Australia), or null",
  "emails": ["real@email.com"],
  "phones": ["+61 2 1234 5678"]
}

Extraction rules:
- company_name: official registered or trading name, not a tagline
- contact_name: IMPORTANT — search everywhere for a human name: bios, "Meet [Name]", "About [Name]", "Hi I'm [Name]", owner/founder/director/principal mentions, signatures, testimonials from staff, team sections. Return the most senior person's full name. Null only if no name appears anywhere.
- description: neutral, factual — what they do, who they serve, where they operate
- services: specific offerings only (max 10), not generic words like "quality" or "professional"
- pricing_hint: extract any mention of prices, packages, rates, "starting from", plan tiers. Summarise briefly. Null if truly nothing.
- emails: IMPORTANT — extract EVERY real email address found anywhere in the content. Include info@, contact@, hello@, support@, and personal addresses. Never example.com or placeholder addresses.
- phones: IMPORTANT — extract EVERY phone number found anywhere. Include mobile, landline, 1300/1800 numbers. If the Additional context block contains a "GMB phone:" line, that number MUST be included.
- If a field has no data, use null or []`

  try {
    // Run main extraction + decision-maker detection in parallel
    const [mainMsg, decisionMakers] = await Promise.all([
      anthropic.messages.create({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 1200,
        messages:   [{ role: 'user', content: mainPrompt }],
      }),
      detectDecisionMakers(markdown, domain, extraContext),
    ])

    const raw    = (mainMsg.content[0] as { type: string; text: string }).text.trim()
    const parsed = JSON.parse(raw) as ExtractedCompany

    const emails = Array.isArray(parsed.emails)
      ? parsed.emails.filter(e => e && typeof e === 'string' && e.includes('@') && !e.includes('example'))
      : []
    const phones = Array.isArray(parsed.phones)
      ? parsed.phones.filter(p => p && typeof p === 'string')
      : []

    // Always run regex sweep — merge with LLM output to catch anything missed
    const searchText = `${markdown.slice(0, 6000)} ${extraContext ?? ''}`

    const emailRegex = /([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/g
    for (const e of (searchText.match(emailRegex) ?? [])) {
      if (!e.includes('example') && !e.includes('sentry') && !e.includes('@2x') && !emails.includes(e)) {
        emails.push(e)
      }
    }

    // Broad phone regex — AU formats + generic international
    const phoneRegex = /(?:\+?61[-\s]?)?(?:1[38]\d{2}[\s-]?\d{3}[\s-]?\d{3}|\(?0\d\)?[\s-]?\d{4}[\s-]?\d{4}|\+\d{1,3}[\s-]?\d[\s\d\-]{6,14}\d)/g
    for (const p of (searchText.match(phoneRegex) ?? [])) {
      const clean = p.trim()
      if (!phones.includes(clean)) phones.push(clean)
    }

    // contact_name: prefer highest-confidence decision maker (if one exists), fall back to LLM result
    const topDM = decisionMakers.sort((a, b) => b.confidence_score - a.confidence_score)[0]
    const contactName = topDM?.confidence_score >= 0.7
      ? topDM.full_name
      : (parsed.contact_name ?? topDM?.full_name ?? null)

    return {
      company_name:    parsed.company_name ?? null,
      contact_name:    contactName,
      description:     parsed.description  ?? null,
      services:        Array.isArray(parsed.services) ? parsed.services.slice(0, 10) : [],
      pricing_hint:    parsed.pricing_hint ?? null,
      city:            parsed.city    ?? null,
      state:           parsed.state   ?? null,
      country:         parsed.country ?? null,
      emails:          [...new Set(emails)],
      phones:          [...new Set(phones)],
      decision_makers: decisionMakers,
    }

  } catch {
    // LLM failed — still run regex sweep + person detection on raw content
    const searchText = `${markdown.slice(0, 6000)} ${extraContext ?? ''}`
    const emails: string[] = []
    const phones: string[] = []

    for (const e of (searchText.match(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/g) ?? [])) {
      if (!e.includes('example') && !e.includes('sentry') && !e.includes('@2x')) emails.push(e)
    }
    for (const p of (searchText.match(/(?:\+?61[-\s]?)?(?:1[38]\d{2}[\s-]?\d{3}[\s-]?\d{3}|\(?0\d\)?[\s-]?\d{4}[\s-]?\d{4}|\+\d{1,3}[\s-]?\d[\s\d\-]{6,14}\d)/g) ?? [])) {
      phones.push(p.trim())
    }

    // Still attempt person detection — it has its own try/catch
    const decisionMakers = await detectDecisionMakers(markdown, domain, extraContext)

    return {
      company_name:    title ?? domain,
      contact_name:    decisionMakers[0]?.full_name ?? null,
      description:     null,
      services:        [],
      pricing_hint:    null,
      city:            null,
      state:           null,
      country:         null,
      emails:          [...new Set(emails)],
      phones:          [...new Set(phones)],
      decision_makers: decisionMakers,
    }
  }
}
