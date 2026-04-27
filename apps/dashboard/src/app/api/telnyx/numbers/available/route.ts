// Internal route — searches available numbers via the carrier API.
import { createClient } from '@/lib/supabase/server'
import { NextResponse }  from 'next/server'

const TELNYX_API = 'https://api.telnyx.com/v2'

function telnyxHeaders() {
  const key = process.env.TELNYX_API_KEY
  if (!key) throw new Error('TELNYX_API_KEY not configured')
  return { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
}

// Telnyx filter[phone_number_type] values
const NUMBER_TYPE_MAP: Record<string, string> = {
  local:     'local',
  toll_free: 'toll_free',
  mobile:    'mobile',
}

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url        = new URL(req.url)
  const country    = (url.searchParams.get('country') ?? 'AU').toUpperCase()
  const areaCode   = url.searchParams.get('area_code') ?? ''
  const numberType = url.searchParams.get('number_type') ?? 'local'
  const limit      = url.searchParams.get('limit') ?? '20'

  const params = new URLSearchParams({
    'filter[country_code]': country,
    'filter[limit]':        limit,
  })
  const telnyxType = NUMBER_TYPE_MAP[numberType]
  if (telnyxType) params.set('filter[phone_number_type]', telnyxType)
  if (areaCode)   params.set('filter[national_destination_code]', areaCode)

  try {
    const res  = await fetch(`${TELNYX_API}/available_phone_numbers?${params}`, {
      headers: telnyxHeaders(),
    })
    const data = await res.json() as {
      data?: Array<{
        phone_number:        string
        region_information?: Array<{ region_name: string; region_type: string }>
        cost_information?:   { monthly_cost: string; upfront_cost?: string; currency: string }
        features?:           Array<{ name: string }>
      }>
      errors?: Array<{ title: string; detail: string }>
    }

    if (!res.ok) {
      const msg = data.errors?.[0]?.detail ?? `Carrier error ${res.status}`
      return NextResponse.json({ error: msg }, { status: 502 })
    }

    // Apply Appalix margin (50%) on top of carrier cost before surfacing to customers
    const MARGIN = 1.5

    const numbers = (data.data ?? []).map(n => {
      const region = n.region_information?.find(
        r => r.region_type === 'city_name' || r.region_type === 'rate_center',
      )
      const featureNames = (n.features ?? []).map(f => f.name.toLowerCase())
      const rawMonthly  = parseFloat(n.cost_information?.monthly_cost  ?? '0')
      const rawUpfront  = parseFloat(n.cost_information?.upfront_cost  ?? '0')
      return {
        phone_number:  n.phone_number,
        region:        region?.region_name ?? null,
        monthly_cost:  (rawMonthly * MARGIN).toFixed(2),
        upfront_cost:  (rawUpfront * MARGIN).toFixed(2),
        currency:      n.cost_information?.currency ?? 'USD',
        capabilities: {
          sms:   featureNames.includes('sms'),
          voice: featureNames.includes('voice'),
          mms:   featureNames.includes('mms'),
          fax:   featureNames.includes('fax'),
        },
        // legacy compat fields
        cost_information:   n.cost_information,
        region_information: n.region_information,
      }
    })

    return NextResponse.json({ numbers })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
