'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const TELNYX = 'https://api.telnyx.com/v2'

function headers() {
  const key = process.env.TELNYX_API_KEY
  if (!key) throw new Error('TELNYX_API_KEY not configured')
  return {
    Authorization:  `Bearer ${key}`,
    'Content-Type': 'application/json',
    Accept:         'application/json',
  }
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data } = await supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  const m = data as { workspace_id: string; role: string } | null
  if (!m) redirect('/login')
  if (!['admin', 'owner'].includes(m.role)) throw new Error('Admin role required')
  return { userId: user.id, workspaceId: m.workspace_id }
}

// ── Mapping tables ────────────────────────────────────────────────────────────

// Maps country names (as stored in the profile form) → ISO 3166-1 alpha-2 codes
// TCR / Telnyx rejects full country names.
const COUNTRY_ISO: Record<string, string> = {
  'Afghanistan': 'AF', 'Albania': 'AL', 'Algeria': 'DZ', 'Argentina': 'AR',
  'Australia': 'AU', 'Austria': 'AT', 'Bangladesh': 'BD', 'Belgium': 'BE',
  'Brazil': 'BR', 'Canada': 'CA', 'Chile': 'CL', 'China': 'CN',
  'Colombia': 'CO', 'Czech Republic': 'CZ', 'Denmark': 'DK', 'Egypt': 'EG',
  'Finland': 'FI', 'France': 'FR', 'Germany': 'DE', 'Greece': 'GR',
  'Hong Kong': 'HK', 'Hungary': 'HU', 'India': 'IN', 'Indonesia': 'ID',
  'Ireland': 'IE', 'Israel': 'IL', 'Italy': 'IT', 'Japan': 'JP',
  'Malaysia': 'MY', 'Mexico': 'MX', 'Netherlands': 'NL', 'New Zealand': 'NZ',
  'Nigeria': 'NG', 'Norway': 'NO', 'Pakistan': 'PK', 'Philippines': 'PH',
  'Poland': 'PL', 'Portugal': 'PT', 'Romania': 'RO', 'Russia': 'RU',
  'Saudi Arabia': 'SA', 'Singapore': 'SG', 'South Africa': 'ZA',
  'South Korea': 'KR', 'Spain': 'ES', 'Sweden': 'SE', 'Switzerland': 'CH',
  'Taiwan': 'TW', 'Thailand': 'TH', 'Turkey': 'TR', 'Ukraine': 'UA',
  'United Arab Emirates': 'AE', 'United Kingdom': 'GB',
  'United States': 'US', 'USA': 'US', 'Vietnam': 'VN',
}

function toIsoAlpha2(country: string | null | undefined): string {
  if (!country) return 'US'
  // Already a 2-letter code
  if (/^[A-Z]{2}$/.test(country.trim())) return country.trim()
  return COUNTRY_ISO[country.trim()] ?? country.trim().slice(0, 2).toUpperCase()
}

const ENTITY_TYPE: Record<string, string> = {
  private_company: 'PRIVATE_PROFIT',
  public_company:  'PUBLIC_PROFIT',
  nonprofit:       'NON_PROFIT',
  government:      'GOVERNMENT',
  sole_proprietor: 'SOLE_PROPRIETOR',
}

const VERTICAL: Record<string, string> = {
  'Healthcare':                  'HEALTHCARE',
  'Financial Services':          'FINANCIAL',
  'Real Estate':                 'REAL_ESTATE',
  'Education':                   'EDUCATION',
  'Technology':                  'TECHNOLOGY',
  'Hospitality & Travel':        'HOSPITALITY',
  'Insurance':                   'INSURANCE',
  'Legal Services':              'LEGAL',
  'Non-profit':                  'NGO',
  'Retail & E-commerce':         'RETAIL',
  'Transportation & Logistics':  'TRANSPORTATION',
  'Energy & Utilities':          'ENERGY',
  'Entertainment':               'ENTERTAINMENT',
  'Telecommunications':          'COMMUNICATION',
  'Automotive':                  'PROFESSIONAL',
  'Other':                       'PROFESSIONAL',
}

const USE_CASE_CODE: Record<string, string> = {
  customer_care:             'CUSTOMER_CARE',
  account_notifications:     'ACCOUNT_NOTIFICATION',
  appointment_reminders:     'APPOINTMENT_REMINDER',
  delivery_notifications:    'DELIVERY_NOTIFICATION',
  two_factor_authentication: '2FA',
  lead_followup:             'LEAD_GEN',
  marketing:                 'MARKETING',
  mixed:                     'MIXED',
}

// ── Brand submission ──────────────────────────────────────────────────────────

export async function submitBrandToTelnyx(
  profileId: string,
): Promise<{ success: boolean; telnyxBrandId?: string; error?: string }> {
  await requireAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  const { data: profile } = await admin
    .from('sms_compliance_profiles')
    .select('*')
    .eq('id', profileId)
    .single()

  if (!profile) return { success: false, error: 'Profile not found' }

  // Ensure brand record exists
  let { data: brand } = await admin
    .from('sms_10dlc_brands')
    .select('*')
    .eq('compliance_profile_id', profileId)
    .maybeSingle()

  if (!brand) {
    const { data: newBrand } = await admin
      .from('sms_10dlc_brands')
      .insert({
        workspace_id:          profile.workspace_id,
        compliance_profile_id: profileId,
        provider:              'telnyx',
        brand_status:          'not_submitted',
      })
      .select('*')
      .single()
    brand = newBrand
  }

  if (!brand) return { success: false, error: 'Failed to create brand record' }

  // Idempotent — already submitted
  if (brand.provider_brand_id) return { success: true, telnyxBrandId: brand.provider_brand_id }

  const nameParts = (profile.business_contact_name ?? '').trim().split(/\s+/)
  const firstName = nameParts[0] ?? 'Contact'
  const lastName  = nameParts.slice(1).join(' ') || firstName

  const payload = {
    entity_type:  ENTITY_TYPE[profile.business_type] ?? 'PRIVATE_PROFIT',
    first_name:   firstName,
    last_name:    lastName,
    display_name: profile.trading_name || profile.legal_business_name,
    company_name: profile.legal_business_name,
    ...(!profile.is_overseas_business && profile.business_registration_number
      ? { ein: profile.business_registration_number }
      : {}),
    phone:        profile.business_contact_phone,
    street:       profile.business_address_line1,
    city:         profile.business_city,
    state:        profile.business_state_region,
    postal_code:  profile.business_postcode,
    country:      toIsoAlpha2(profile.business_country),
    email:        profile.business_contact_email,
    website:      profile.website_url,
    vertical:     VERTICAL[profile.industry] ?? 'PROFESSIONAL',
    // TCR only recognises EIN (US), DUNS, GIIN, LEI — omit alt_business_id for overseas
    // entities whose registration number (e.g. ABN) doesn't map to those types.
    ...(profile.is_overseas_business
      ? {}
      : {
          alt_business_id:      profile.business_registration_number ?? undefined,
          alt_business_id_type: profile.business_registration_number ? 'NONE' : undefined,
        }),
  }

  const resp = await fetch(`${TELNYX}/10dlc/brands`, {
    method: 'POST', headers: headers(), body: JSON.stringify(payload),
  })
  const body = await resp.json()

  if (!resp.ok) {
    const err = body.errors?.[0]?.detail ?? body.message ?? `Telnyx error ${resp.status}`
    await admin.from('sms_10dlc_brands').update({
      brand_status:        'rejected',
      rejection_reason:    err,
      provider_raw_status: body,
      updated_at:          new Date().toISOString(),
    }).eq('id', brand.id)
    await admin.from('sms_compliance_profiles').update({
      status:           'rejected',
      rejection_reason: err,
      updated_at:       new Date().toISOString(),
    }).eq('id', profileId)
    return { success: false, error: err }
  }

  const telnyxBrandId = body.data?.brand_id ?? body.data?.id
  await admin.from('sms_10dlc_brands').update({
    provider_brand_id:   telnyxBrandId,
    brand_status:        'submitted',
    provider_raw_status: body.data,
    submitted_at:        new Date().toISOString(),
    updated_at:          new Date().toISOString(),
  }).eq('id', brand.id)
  await admin.from('sms_compliance_profiles').update({
    status:     'submitted',
    updated_at: new Date().toISOString(),
  }).eq('id', profileId)

  return { success: true, telnyxBrandId }
}

// ── Campaign submission ───────────────────────────────────────────────────────

export async function submitCampaignToTelnyx(
  campaignId: string,
): Promise<{ success: boolean; telnyxCampaignId?: string; error?: string }> {
  await requireAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  const { data: campaign } = await admin
    .from('sms_10dlc_campaigns')
    .select('*')
    .eq('id', campaignId)
    .single()

  if (!campaign) return { success: false, error: 'Campaign not found' }
  if (campaign.provider_campaign_id) return { success: true, telnyxCampaignId: campaign.provider_campaign_id }

  const { data: brand } = await admin
    .from('sms_10dlc_brands')
    .select('provider_brand_id, brand_status')
    .eq('compliance_profile_id', campaign.compliance_profile_id)
    .maybeSingle()

  if (!brand?.provider_brand_id) {
    return { success: false, error: 'Brand must be submitted to Telnyx before submitting the campaign.' }
  }

  const payload = {
    brand_id:          brand.provider_brand_id,
    usecase:           USE_CASE_CODE[campaign.use_case] ?? 'MIXED',
    description:       campaign.campaign_description,
    embedded_link:     campaign.has_embedded_links,
    embedded_phone:    campaign.has_embedded_phone_numbers,
    age_gated:         campaign.age_gated_content,
    direct_lending:    campaign.direct_lending_or_financial_content,
    subscriber_optin:  true,
    subscriber_optout: true,
    subscriber_help:   true,
    sample1:           campaign.sample_message_1,
    sample2:           campaign.sample_message_2,
    ...(campaign.sample_message_3 ? { sample3: campaign.sample_message_3 } : {}),
    message_flow:      campaign.message_flow,
    help_message:      campaign.help_message,
    optin_keywords:    (campaign.opt_in_keywords  ?? ['YES', 'START']).join(','),
    optout_keywords:   (campaign.opt_out_keywords ?? ['STOP', 'UNSUBSCRIBE']).join(','),
    help_keywords:     (campaign.help_keywords    ?? ['HELP']).join(','),
    optin_message:     campaign.opt_in_message,
    optout_message:    campaign.opt_out_message,
    affiliate_marketing: false,
    number_pool:         false,
  }

  const resp = await fetch(`${TELNYX}/10dlc/campaigns`, {
    method: 'POST', headers: headers(), body: JSON.stringify(payload),
  })
  const body = await resp.json()

  if (!resp.ok) {
    const err = body.errors?.[0]?.detail ?? body.message ?? `Telnyx error ${resp.status}`
    await admin.from('sms_10dlc_campaigns').update({
      campaign_status:     'rejected',
      rejection_reason:    err,
      provider_raw_status: body,
      updated_at:          new Date().toISOString(),
    }).eq('id', campaignId)
    return { success: false, error: err }
  }

  const telnyxCampaignId = body.data?.campaign_id ?? body.data?.id
  await admin.from('sms_10dlc_campaigns').update({
    provider_campaign_id: telnyxCampaignId,
    campaign_status:      'submitted',
    provider_raw_status:  body.data,
    submitted_at:         new Date().toISOString(),
    updated_at:           new Date().toISOString(),
  }).eq('id', campaignId)

  return { success: true, telnyxCampaignId }
}

// ── Number → Campaign assignment ──────────────────────────────────────────────

export async function assignNumberToCampaign(
  phoneNumberId: string,
  campaignId:    string,
): Promise<{ success: boolean; error?: string }> {
  const { workspaceId } = await requireAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  const { data: numRow } = await admin
    .from('workspace_phone_numbers')
    .select('e164')
    .eq('id', phoneNumberId)
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  if (!numRow) return { success: false, error: 'Phone number not found in workspace' }

  const { data: campaign } = await admin
    .from('sms_10dlc_campaigns')
    .select('provider_campaign_id')
    .eq('id', campaignId)
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  if (!campaign?.provider_campaign_id) {
    return { success: false, error: 'Campaign not yet registered with Telnyx' }
  }

  const resp = await fetch(
    `${TELNYX}/10dlc/campaigns/${campaign.provider_campaign_id}/phone_numbers`,
    { method: 'POST', headers: headers(), body: JSON.stringify({ phone_number: numRow.e164 }) },
  )
  const body = await resp.json()

  const { data: existing } = await admin
    .from('sms_number_campaign_assignments')
    .select('id')
    .eq('phone_number_id', phoneNumberId)
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  const row = {
    workspace_id:           workspaceId,
    phone_number_id:        phoneNumberId,
    campaign_id:            campaignId,
    provider:               'telnyx',
    provider_assignment_id: resp.ok ? (body.data?.id ?? null) : null,
    status:                 resp.ok ? 'active' : 'failed',
    error_message:          resp.ok ? null : (body.errors?.[0]?.detail ?? `Telnyx ${resp.status}`),
    updated_at:             new Date().toISOString(),
  }

  if (existing) {
    await admin.from('sms_number_campaign_assignments').update(row).eq('id', existing.id)
  } else {
    await admin.from('sms_number_campaign_assignments').insert(row)
  }

  if (!resp.ok) return { success: false, error: body.errors?.[0]?.detail ?? `Telnyx error ${resp.status}` }
  return { success: true }
}

export async function removeNumberFromCampaign(
  phoneNumberId: string,
): Promise<{ success: boolean; error?: string }> {
  const { workspaceId } = await requireAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  const { data: assignment } = await admin
    .from('sms_number_campaign_assignments')
    .select('id, campaign_id, workspace_phone_numbers!phone_number_id(e164), sms_10dlc_campaigns!campaign_id(provider_campaign_id)')
    .eq('phone_number_id', phoneNumberId)
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')
    .maybeSingle()

  if (!assignment) return { success: false, error: 'No active assignment found' }

  const campaignTelnyxId = (assignment.sms_10dlc_campaigns as Record<string, string> | null)?.provider_campaign_id
  const e164             = (assignment.workspace_phone_numbers as Record<string, string> | null)?.e164

  if (campaignTelnyxId && e164) {
    await fetch(
      `${TELNYX}/10dlc/campaigns/${campaignTelnyxId}/phone_numbers/${encodeURIComponent(e164)}`,
      { method: 'DELETE', headers: headers() },
    )
  }

  await admin.from('sms_number_campaign_assignments').update({
    status:     'removed',
    updated_at: new Date().toISOString(),
  }).eq('id', assignment.id)

  return { success: true }
}
