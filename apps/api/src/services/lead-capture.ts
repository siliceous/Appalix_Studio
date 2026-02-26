/**
 * Lead capture — extracts contact info from user messages and routes
 * to the configured CRM provider (HubSpot, Intercom, Zoho, Zapier/webhook).
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

// ---------------------------------------------------------------------------
// Generic webhook (Zapier, Make.com, any HTTP endpoint)
// ---------------------------------------------------------------------------

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
    console.log(`[lead-capture] webhook responded ${res.status} for conversation=${payload.conversationId}`)
  } catch (err) {
    console.error(`[lead-capture] webhook failed: ${err instanceof Error ? err.message : String(err)}`)
  }
}

// ---------------------------------------------------------------------------
// HubSpot — Private App Token → Contacts API
// ---------------------------------------------------------------------------

async function postLeadToHubspot(token: string, lead: LeadData, payload: LeadWebhookPayload): Promise<void> {
  try {
    const properties: Record<string, string> = {
      lifecyclestage: 'lead',
      hs_lead_source: 'Appalix Chat',
    }
    if (lead.email) properties.email = lead.email
    if (lead.phone) properties.phone = lead.phone

    const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body:   JSON.stringify({ properties }),
      signal: AbortSignal.timeout(10_000),
    })
    console.log(`[lead-capture] HubSpot responded ${res.status} for conversation=${payload.conversationId}`)
  } catch (err) {
    console.error(`[lead-capture] HubSpot failed: ${err instanceof Error ? err.message : String(err)}`)
  }
}

// ---------------------------------------------------------------------------
// Intercom — Access Token → Contacts API
// ---------------------------------------------------------------------------

async function postLeadToIntercom(token: string, lead: LeadData, payload: LeadWebhookPayload): Promise<void> {
  try {
    const body: Record<string, string> = { role: 'lead' }
    if (lead.email) body.email = lead.email
    if (lead.phone) body.phone = lead.phone

    const res = await fetch('https://api.intercom.io/contacts', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept':        'application/json',
        'Intercom-Version': '2.11',
      },
      body:   JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    })
    console.log(`[lead-capture] Intercom responded ${res.status} for conversation=${payload.conversationId}`)
  } catch (err) {
    console.error(`[lead-capture] Intercom failed: ${err instanceof Error ? err.message : String(err)}`)
  }
}

// ---------------------------------------------------------------------------
// Zoho CRM — Access Token → Leads API
// ---------------------------------------------------------------------------

async function postLeadToZoho(token: string, lead: LeadData, payload: LeadWebhookPayload): Promise<void> {
  try {
    const record: Record<string, string> = { Lead_Source: 'Appalix Chat' }
    if (lead.email) record.Email = lead.email
    if (lead.phone) record.Phone = lead.phone
    // Zoho requires Last_Name
    if (!record.Last_Name) record.Last_Name = lead.email?.split('@')[0] ?? 'Unknown'

    const res = await fetch('https://www.zohoapis.com/crm/v2/Leads', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Zoho-oauthtoken ${token}`,
      },
      body:   JSON.stringify({ data: [record] }),
      signal: AbortSignal.timeout(10_000),
    })
    console.log(`[lead-capture] Zoho responded ${res.status} for conversation=${payload.conversationId}`)
  } catch (err) {
    console.error(`[lead-capture] Zoho failed: ${err instanceof Error ? err.message : String(err)}`)
  }
}

// ---------------------------------------------------------------------------
// Salesforce — Access Token + Instance URL → Leads API
// ---------------------------------------------------------------------------

async function postLeadToSalesforce(token: string, instanceUrl: string, lead: LeadData, payload: LeadWebhookPayload): Promise<void> {
  try {
    const record: Record<string, string> = { LeadSource: 'Web' }
    if (lead.email) record.Email = lead.email
    if (lead.phone) record.Phone = lead.phone
    // Salesforce requires LastName
    record.LastName = lead.email?.split('@')[0] ?? 'Unknown'

    const base = instanceUrl.replace(/\/$/, '')
    const res = await fetch(`${base}/services/data/v59.0/sobjects/Lead/`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body:   JSON.stringify(record),
      signal: AbortSignal.timeout(10_000),
    })
    console.log(`[lead-capture] Salesforce responded ${res.status} for conversation=${payload.conversationId}`)
  } catch (err) {
    console.error(`[lead-capture] Salesforce failed: ${err instanceof Error ? err.message : String(err)}`)
  }
}

// ---------------------------------------------------------------------------
// Dispatcher — routes to the correct provider based on integration config
// ---------------------------------------------------------------------------

export async function routeLeadToProvider(
  config:  Record<string, unknown>,
  lead:    LeadData,
  payload: LeadWebhookPayload,
): Promise<void> {
  const provider = (config.crm_provider as string | undefined) ?? 'webhook'

  switch (provider) {
    case 'hubspot': {
      const token = config.crm_hubspot_token as string | undefined
      if (token) await postLeadToHubspot(token, lead, payload)
      break
    }
    case 'intercom': {
      const token = config.crm_intercom_token as string | undefined
      if (token) await postLeadToIntercom(token, lead, payload)
      break
    }
    case 'zoho': {
      const token = config.crm_zoho_token as string | undefined
      if (token) await postLeadToZoho(token, lead, payload)
      break
    }
    case 'salesforce': {
      const token       = config.crm_salesforce_token        as string | undefined
      const instanceUrl = config.crm_salesforce_instance_url as string | undefined
      if (token && instanceUrl) await postLeadToSalesforce(token, instanceUrl, lead, payload)
      break
    }
    case 'zapier':
    case 'webhook':
    default: {
      const url = config.crm_webhook_url as string | undefined
      if (url) await postLeadToWebhook(url, payload)
      break
    }
  }
}
