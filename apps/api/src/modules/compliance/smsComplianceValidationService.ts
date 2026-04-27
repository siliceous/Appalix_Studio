// Validates sms_compliance_profiles and sms_10dlc_campaigns before submission.
// Returns structured errors so the UI can show field-level feedback.

const VAGUE_PHRASES = [
  'users opt in',
  'customers opt in',
  'we message leads',
  'leads who signed up',
  'opt in somehow',
  'general opt-in',
  'they agreed',
  'they signed up',
  'opt in via website',
  'opted in before',
]

function isValidUrl(val: string): boolean {
  try { new URL(val); return true } catch { return false }
}

function isValidEmail(val: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)
}

// ── Profile validation ────────────────────────────────────────────────────────

export function validateProfile(profile: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const f = (key: string) => profile[key] as string | undefined | null

  // Business identity
  if (!f('legal_business_name')?.trim()) errors.push('Legal business name is required.')
  if (!f('business_type')) errors.push('Business type is required.')
  if (f('business_type') !== 'sole_proprietor' && !f('business_registration_number')?.trim()) {
    errors.push('Business registration number (EIN for US) is required.')
  }

  // Address
  if (!f('business_address_line1')?.trim()) errors.push('Business address is required.')
  if (!f('business_city')?.trim())          errors.push('City is required.')
  if (!f('business_state_region')?.trim())  errors.push('State / region is required.')
  if (!f('business_postcode')?.trim())      errors.push('Postcode is required.')
  if (!f('business_country')?.trim())       errors.push('Business country is required.')

  // Overseas extras
  if (profile['is_overseas_business']) {
    if (!f('tax_id_country')) errors.push('Tax ID country is required for overseas businesses.')
  }

  // Online presence
  const website = f('website_url')?.trim()
  if (!website) {
    errors.push('Website URL is required.')
  } else if (!isValidUrl(website)) {
    errors.push('Website URL must be a valid URL (e.g. https://yoursite.com).')
  }

  const privacyUrl = f('privacy_policy_url')?.trim()
  if (!privacyUrl) {
    errors.push('Privacy Policy URL is required. Carriers verify this page exists and contains opt-in language.')
  } else if (!isValidUrl(privacyUrl)) {
    errors.push('Privacy Policy URL must be a valid URL.')
  }

  const termsUrl = f('terms_url')?.trim()
  if (!termsUrl) {
    errors.push('Terms & Conditions URL is required.')
  } else if (!isValidUrl(termsUrl)) {
    errors.push('Terms & Conditions URL must be a valid URL.')
  }

  // Contacts
  const email = f('business_contact_email')?.trim()
  if (!email) {
    errors.push('Business contact email is required.')
  } else if (!isValidEmail(email)) {
    errors.push('Business contact email must be a valid email address.')
  }
  if (!f('business_contact_phone')?.trim()) errors.push('Business contact phone is required.')
  if (!f('business_contact_name')?.trim())  errors.push('Business contact name is required.')

  // Support
  const hasSupportEmail = f('support_email')?.trim()
  const hasSupportPhone = f('support_phone')?.trim()
  if (!hasSupportEmail && !hasSupportPhone) {
    errors.push('At least one support contact (email or phone) is required.')
  }

  return { valid: errors.length === 0, errors }
}

// ── Campaign validation ───────────────────────────────────────────────────────

export function validateCampaign(campaign: Record<string, unknown>): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []
  const f = (key: string) => campaign[key] as string | undefined | null

  if (!f('campaign_name')?.trim()) errors.push('Campaign name is required.')
  if (!f('use_case'))              errors.push('Use case is required.')

  // Description — minimum 100 chars, must be specific
  const desc = f('campaign_description')?.trim() ?? ''
  if (!desc) {
    errors.push('Campaign description is required.')
  } else if (desc.length < 100) {
    errors.push(`Campaign description is too short (${desc.length} chars). Carriers require at least 100 characters with specific details about your messaging.`)
  }

  // Message flow — minimum 100 chars, no vague phrases
  const flow = f('message_flow')?.trim() ?? ''
  if (!flow) {
    errors.push('Message flow is required. Explain exactly how customers opt in to receive your messages.')
  } else if (flow.length < 100) {
    errors.push(`Message flow description is too short (${flow.length} chars). Provide specific details about your opt-in process.`)
  } else {
    const lowerFlow = flow.toLowerCase()
    const vagueFound = VAGUE_PHRASES.filter(p => lowerFlow.includes(p))
    if (vagueFound.length > 0) {
      errors.push(`Message flow contains vague language that carriers reject: "${vagueFound[0]}". Describe the exact opt-in mechanism, URL, and consent wording.`)
    }
  }

  // Sample messages — must contain STOP instruction
  const sample1 = f('sample_message_1')?.trim() ?? ''
  const sample2 = f('sample_message_2')?.trim() ?? ''

  if (!sample1) {
    errors.push('Sample message 1 is required.')
  } else {
    if (sample1.length < 20) errors.push('Sample message 1 is too short.')
    if (!sample1.toUpperCase().includes('STOP')) {
      errors.push('Sample message 1 must include opt-out instructions (e.g. "Reply STOP to unsubscribe").')
    }
  }

  if (!sample2) {
    errors.push('Sample message 2 is required.')
  } else {
    if (sample2.length < 20) errors.push('Sample message 2 is too short.')
    if (!sample2.toUpperCase().includes('STOP')) {
      errors.push('Sample message 2 must include opt-out instructions (e.g. "Reply STOP to unsubscribe").')
    }
  }

  // Required keyword response messages
  if (!f('opt_out_message')?.trim()) errors.push('Opt-out confirmation message is required (sent when someone replies STOP).')
  if (!f('help_message')?.trim())    errors.push('HELP response message is required (sent when someone replies HELP).')
  if (!f('opt_in_message')?.trim())  errors.push('Opt-in confirmation message is required (sent when someone subscribes).')

  // Consent warnings for marketing / lead follow-up
  const useCase = f('use_case') ?? ''
  if (['marketing', 'lead_followup'].includes(useCase)) {
    const hasConsentEvidence = f('opt_in_url')?.trim() || campaign['consent_screenshot']
    if (!hasConsentEvidence) {
      warnings.push('Marketing and lead follow-up campaigns require evidence of how customers opt in. Upload a screenshot or provide your opt-in URL.')
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

// ── Completion score ──────────────────────────────────────────────────────────

export function getCompletionScore(
  profile: Record<string, unknown>,
  campaigns: Record<string, unknown>[],
): number {
  let score = 0
  const f = (key: string) => !!(profile[key] as string | undefined | null)?.trim()

  // Core identity (40 pts)
  if (f('legal_business_name'))          score += 8
  if (f('business_type'))                score += 8
  if (f('business_registration_number')) score += 8
  if (f('business_contact_email'))       score += 8
  if (f('business_contact_phone'))       score += 8

  // Address (20 pts)
  if (f('business_address_line1')) score += 5
  if (f('business_city'))          score += 5
  if (f('business_state_region'))  score += 5
  if (f('business_postcode'))      score += 5

  // Online presence (20 pts)
  if (f('website_url'))         score += 5
  if (f('privacy_policy_url'))  score += 7
  if (f('terms_url'))           score += 4
  if (f('support_email') || f('support_phone')) score += 4

  // Campaigns (20 pts)
  if (campaigns.length > 0) {
    score += 10
    const firstCampaign = campaigns[0]
    const cf = (key: string) => !!(firstCampaign[key] as string | undefined | null)?.trim()
    if (cf('campaign_description') && ((firstCampaign['campaign_description'] as string).length >= 100)) score += 5
    if (cf('sample_message_1') && cf('sample_message_2')) score += 5
  }

  return Math.min(100, score)
}
