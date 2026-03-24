/**
 * Shared utilities for form webhook handlers.
 */

// Map normalised label keys → standard field names used throughout the app
const FIELD_ALIASES: Record<string, string> = {
  // Name
  full_name: 'name', your_name: 'name', contact_name: 'name',
  first_name: 'name', first: 'name', fullname: 'name', yourname: 'name',
  // Email
  email_address: 'email', your_email: 'email', 'e-mail': 'email',
  email_id: 'email', emailaddress: 'email',
  // Phone
  phone_number: 'phone', mobile: 'phone', mobile_number: 'phone',
  tel: 'phone', telephone: 'phone', cell: 'phone', cell_phone: 'phone',
  contact_number: 'phone', phonenumber: 'phone',
  // Company
  company_name: 'company', organisation: 'company', organization: 'company',
  business: 'company', business_name: 'company', firm: 'company',
  companyname: 'company',
  // City
  town: 'city', suburb: 'city',
  // Message
  comment: 'message', comments: 'message', enquiry: 'message',
  query: 'message', your_message: 'message', how_can_we_help: 'message',
  how_can_we_help_you: 'message', description: 'message',
  details: 'message', notes: 'message', tell_us_more: 'message',
  additional_info: 'message', subject: 'message',
}

/**
 * Normalise raw webhook field keys:
 *  1. lowercase + trim + spaces→underscores
 *  2. apply common label aliases (e.g. "Email Address" → "email")
 */
export function normalizeFields(raw: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {}

  for (const [k, v] of Object.entries(raw)) {
    const nk = k.toLowerCase().trim().replace(/[\s\-]+/g, '_')
    result[nk] = v
  }

  for (const [alias, standard] of Object.entries(FIELD_ALIASES)) {
    if (result[alias] !== undefined && result[standard] === undefined) {
      result[standard] = result[alias]
    }
  }

  return result
}

/**
 * Fire-and-forget: trigger AI analysis for a form after a new submission
 * is inserted. Does not block the webhook response.
 */
export function triggerFormAnalysis(workspaceId: string, formId: string): void {
  const API_BASE    = process.env.API_BASE_URL
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!API_BASE || !SERVICE_KEY) return

  fetch(`${API_BASE}/forms/analyze`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'x-service-key': SERVICE_KEY },
    body:    JSON.stringify({ workspace_id: workspaceId, form_id: formId }),
  }).catch(() => { /* non-fatal — analysis can be triggered manually */ })
}
