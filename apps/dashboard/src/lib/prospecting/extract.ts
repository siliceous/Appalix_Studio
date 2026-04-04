import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface ExtractedCompany {
  company_name:  string | null
  description:   string | null
  services:      string[]
  city:          string | null
  state:         string | null
  country:       string | null
  emails:        string[]
  phones:        string[]
}

/**
 * Extracts structured company data from crawled homepage markdown.
 * Location is split into city / state / country for field-level filtering.
 * Returns a safe fallback if extraction fails.
 */
export async function extractCompanyData(
  domain:   string,
  markdown: string,
  title:    string | null,
): Promise<ExtractedCompany> {
  const prompt = `Extract structured information from this company's homepage.

Domain: ${domain}
Page title: ${title ?? 'unknown'}

Page content (markdown):
${markdown.slice(0, 6000)}

Respond ONLY with JSON (no markdown fences):
{
  "company_name": "...",
  "description": "1-2 sentence business description",
  "services": ["service1", "service2"],
  "city": "Sydney",
  "state": "NSW",
  "country": "Australia",
  "emails": ["email@example.com"],
  "phones": ["+61 2 1234 5678"]
}

Rules:
- company_name: official business name, not tagline
- description: what the business actually does, written neutrally
- services: list of specific services/products offered (max 8)
- city: primary city/suburb of the business, or null if not found
- state: state, province, or region, or null if not applicable
- country: full country name (e.g. "Australia", "United States"), or null if not found
- emails: only real business emails found on the page (not example.com)
- phones: only real phone numbers found on the page
- If a field has no data, use null or empty array`

  try {
    const msg = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages:   [{ role: 'user', content: prompt }],
    })

    const raw = (msg.content[0] as { type: string; text: string }).text.trim()
    const parsed = JSON.parse(raw) as ExtractedCompany

    return {
      company_name: parsed.company_name ?? null,
      description:  parsed.description  ?? null,
      services:     Array.isArray(parsed.services) ? parsed.services.slice(0, 8) : [],
      city:         parsed.city    ?? null,
      state:        parsed.state   ?? null,
      country:      parsed.country ?? null,
      emails:       Array.isArray(parsed.emails) ? parsed.emails : [],
      phones:       Array.isArray(parsed.phones) ? parsed.phones : [],
    }
  } catch {
    return {
      company_name: title ?? domain,
      description:  null,
      services:     [],
      city:         null,
      state:        null,
      country:      null,
      emails:       [],
      phones:       [],
    }
  }
}
