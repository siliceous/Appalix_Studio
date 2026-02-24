/**
 * Lead capture — extracts contact info from user messages and POSTs to a CRM webhook.
 *
 * Compatible with HubSpot, Salesforce, Zapier, Make.com, and any HTTP endpoint.
 */

const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g
const PHONE_RE = /(?:\+?\d[\d\s\-().]{5,}\d)/g

export interface LeadData {
  email?: string
  phone?: string
}

/**
 * Scan text for the first email and phone number found.
 */
export function extractLeadData(text: string): LeadData {
  const emails = text.match(EMAIL_RE)
  const phones = text.match(PHONE_RE)
  return {
    email: emails?.[0],
    phone: phones?.[0]?.replace(/\s+/g, ' ').trim(),
  }
}

export interface LeadWebhookPayload {
  event:          'lead_captured'
  conversationId: string
  integrationId:  string
  workspaceId:    string
  email?:         string
  phone?:         string
  message:        string
  timestamp:      string
}

/**
 * POST lead data to the configured CRM webhook URL (fire and forget).
 */
export async function postLeadToWebhook(
  webhookUrl: string,
  payload:    LeadWebhookPayload,
): Promise<void> {
  try {
    const res = await fetch(webhookUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
      signal:  AbortSignal.timeout(10_000),
    })
    console.log(`[lead-capture] CRM webhook responded ${res.status} for conversation=${payload.conversationId}`)
  } catch (err) {
    console.error(`[lead-capture] CRM webhook failed: ${err instanceof Error ? err.message : String(err)}`)
  }
}
