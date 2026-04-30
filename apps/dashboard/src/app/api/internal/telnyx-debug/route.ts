// Temporary debug route — shows the exact Telnyx 10DLC brand payload and raw response.
// Admin-only. Remove once Telnyx support confirms the issue is resolved.
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse }                    from 'next/server'

const TELNYX = 'https://api.telnyx.com/v2'

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

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: memberRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  const member = memberRaw as { workspace_id: string; role: string } | null
  if (!member || !['admin', 'owner'].includes(member.role)) {
    return NextResponse.json({ error: 'Admin required' }, { status: 403 })
  }

  const url         = new URL(req.url)
  const dryRun      = url.searchParams.get('dry') !== 'false'
  const emailOverride = url.searchParams.get('email') ?? null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  const { data: profile } = await admin
    .from('sms_compliance_profiles')
    .select('*')
    .eq('workspace_id', member.workspace_id)
    .eq('country_code', 'US')
    .eq('compliance_type', 'A2P_10DLC')
    .maybeSingle()

  if (!profile) {
    return NextResponse.json({ error: 'No US A2P compliance profile found for this workspace' }, { status: 404 })
  }

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
    phone:                profile.business_contact_phone,
    street:               profile.business_address_line1,
    city:                 profile.business_city,
    state:                profile.business_state_region,
    postal_code:          profile.business_postcode,
    country:      toIsoAlpha2(profile.business_country),
    email:        emailOverride ?? profile.business_contact_email,
    website:              profile.website_url,
    vertical: VERTICAL[profile.industry] ?? 'PROFESSIONAL',
    ...(profile.is_overseas_business
      ? {}
      : {
          alt_business_id:      profile.business_registration_number ?? undefined,
          alt_business_id_type: profile.business_registration_number ? 'NONE' : undefined,
        }),
  }

  const endpoint = `${TELNYX}/10dlc/brands`

  if (dryRun) {
    // Return the request we WOULD send without actually sending it
    return NextResponse.json({
      note: 'Dry run — no request sent. Add ?dry=false to actually call Telnyx.',
      request: {
        method:   'POST',
        endpoint,
        headers: {
          Authorization:  'Bearer sk_**** (redacted)',
          'Content-Type': 'application/json',
          Accept:         'application/json',
        },
        body: payload,
      },
    })
  }

  // Live run — POST to Telnyx and return the raw response
  const key = process.env.TELNYX_API_KEY
  if (!key) return NextResponse.json({ error: 'TELNYX_API_KEY not set' }, { status: 500 })

  const resp = await fetch(endpoint, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${key}`,
      'Content-Type': 'application/json',
      Accept:         'application/json',
    },
    body: JSON.stringify(payload),
  })

  const body = await resp.json()

  return NextResponse.json({
    request: {
      method:   'POST',
      endpoint,
      headers: {
        Authorization:  'Bearer sk_**** (redacted)',
        'Content-Type': 'application/json',
        Accept:         'application/json',
      },
      body: payload,
    },
    response: {
      status:     resp.status,
      statusText: resp.statusText,
      body,
    },
  })
}
