import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface ExtractedCompany {
  company_name:  string | null
  contact_name:  string | null   // owner / principal / contact person name
  description:   string | null
  services:      string[]
  pricing_hint:  string | null   // any pricing, packages, or rate mentions
  city:          string | null
  state:         string | null
  country:       string | null
  emails:        string[]
  phones:        string[]
}

/**
 * Extracts structured company data from deep-crawled multi-page markdown.
 * Accepts optional extra context (e.g. GMB/directory search snippets).
 */
export async function extractCompanyData(
  domain:         string,
  markdown:       string,
  title:          string | null,
  extraContext?:  string,
): Promise<ExtractedCompany> {
  const contextBlock = extraContext
    ? `\n\nAdditional context from web search (may contain GMB / directory data):\n${extraContext.slice(0, 2000)}`
    : ''

  const prompt = `You are extracting structured business information for a sales prospecting tool.

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
- contact_name: look for owner names, "Meet the team", bios, "About [Name]", signatures, director mentions. Null if not found.
- description: neutral, factual — what they do, who they serve, where they operate
- services: specific offerings only (max 10), not generic words like "quality" or "professional"
- pricing_hint: extract any mention of prices, packages, rates, "starting from", plan tiers. Summarise briefly. Null if truly nothing.
- emails: only real addresses on the page — never example.com or placeholder addresses
- phones: include all phone numbers found across all pages
- If a field has no data, use null or []`

  try {
    const msg = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 900,
      messages:   [{ role: 'user', content: prompt }],
    })

    const raw    = (msg.content[0] as { type: string; text: string }).text.trim()
    const parsed = JSON.parse(raw) as ExtractedCompany

    return {
      company_name: parsed.company_name ?? null,
      contact_name: parsed.contact_name ?? null,
      description:  parsed.description  ?? null,
      services:     Array.isArray(parsed.services) ? parsed.services.slice(0, 10) : [],
      pricing_hint: parsed.pricing_hint ?? null,
      city:         parsed.city    ?? null,
      state:        parsed.state   ?? null,
      country:      parsed.country ?? null,
      emails:       Array.isArray(parsed.emails) ? parsed.emails.filter(e => e && !e.includes('example')) : [],
      phones:       Array.isArray(parsed.phones) ? parsed.phones : [],
    }
  } catch {
    return {
      company_name: title ?? domain,
      contact_name: null,
      description:  null,
      services:     [],
      pricing_hint: null,
      city:         null,
      state:        null,
      country:      null,
      emails:       [],
      phones:       [],
    }
  }
}
