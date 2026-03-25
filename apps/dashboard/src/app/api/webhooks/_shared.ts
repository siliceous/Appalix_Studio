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
 *  1. lowercase + trim + spaces/hyphens/dots→underscores
 *  2. apply common label aliases (e.g. "Email Address" → "email")
 *  3. value-based fallback: detect email/phone by format when keys are numeric IDs
 */
export function normalizeFields(raw: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {}

  for (const [k, v] of Object.entries(raw)) {
    const nk = k.toLowerCase().trim().replace(/[\s\-\.]+/g, '_')
    result[nk] = v
  }

  for (const [alias, standard] of Object.entries(FIELD_ALIASES)) {
    if (result[alias] !== undefined && result[standard] === undefined) {
      result[standard] = result[alias]
    }
  }

  // Value-based detection: when GF sends numeric field IDs (e.g. "1", "1_3"),
  // detect standard fields from value format so they're stored under known keys.
  const META_KEYS = new Set(['form_title', 'form_name', 'id', 'form_id', 'ip', 'date_created', 'source_url', 'currency', 'payment_status'])

  const vals = Object.entries(result)
    .filter(([k]) => !META_KEYS.has(k))
    .map(([, v]) => v.trim())
    .filter(Boolean)

  if (!result['email']) {
    const emailVal = vals.find(v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v))
    if (emailVal) result['email'] = emailVal
  }
  if (!result['phone']) {
    const phoneVal = vals.find(v => /^[\+\d][\d\s\-\(\)\.]{5,18}$/.test(v))
    if (phoneVal) result['phone'] = phoneVal
  }
  if (!result['name']) {
    const usedVals = new Set([result['email'], result['phone']].filter(Boolean))
    const nameVal = vals.find(v => {
      if (usedVals.has(v)) return false
      if (v.length < 3 || v.length > 60) return false
      if (/[@\/\d]/.test(v)) return false
      const words = v.split(/\s+/)
      return words.length >= 2 && words.length <= 5 && words.every(w => /^[A-Za-zÀ-ÿ\-'\.]{2,}$/.test(w))
    })
    if (nameVal) result['name'] = nameVal
  }
  if (!result['company']) {
    const usedVals = new Set([result['email'], result['phone'], result['name']].filter(Boolean))
    const companyVal = vals.find(v => {
      if (usedVals.has(v)) return false
      if (v.length < 2 || v.length > 80) return false
      if (/[@]/.test(v)) return false
      // Not a long message (messages tend to be sentences)
      return !v.includes('  ') && v.split(/\s+/).length <= 6
    })
    if (companyVal) result['company'] = companyVal
  }

  return result
}

/**
 * Insert a form submission with two layers:
 *  - raw_payload : exact data as received from the source
 *  - fields      : normalized Appalix fields (name, email, phone, …)
 *
 * Finds-or-creates the sage_form record by name.
 * Returns { formId } on success, { error } on failure.
 */
export async function insertFormSubmission(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  a: any,
  workspaceId: string,
  rawPayload: Record<string, string>,
  normalizedFields: Record<string, string>,
  source: string,
  formTitle: string | null,
): Promise<{ error: string } | { formId: string }> {
  const formName = formTitle ?? `${source.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} Submissions`

  let { data: form } = await a
    .from('sage_forms')
    .select('id')
    .eq('workspace_id', workspaceId)
    .ilike('name', formName)
    .maybeSingle()

  if (!form) {
    const { data: owner } = await a
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', workspaceId)
      .eq('role', 'owner')
      .limit(1)
      .maybeSingle()

    const { data: newForm, error: formErr } = await a
      .from('sage_forms')
      .insert({ workspace_id: workspaceId, name: formName, is_active: true, created_by: owner?.user_id ?? null })
      .select('id')
      .single()
    if (formErr) return { error: `sage_forms insert failed: ${formErr.message}` }
    form = newForm
  }

  if (!form?.id) return { error: 'no form id after insert' }

  const { error: subErr } = await a.from('sage_form_submissions').insert({
    workspace_id:    workspaceId,
    form_id:         form.id,
    source_platform: source,
    raw_payload:     rawPayload,
    fields:          normalizedFields,
  })
  if (subErr) return { error: `sage_form_submissions insert failed: ${subErr.message}` }

  return { formId: form.id }
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
