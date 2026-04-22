import { createClient } from '@/lib/supabase/server'
import { NextResponse }  from 'next/server'

const TELNYX_API = 'https://api.telnyx.com/v2'

function telnyxHeaders() {
  const key = process.env.TELNYX_API_KEY
  if (!key) throw new Error('TELNYX_API_KEY not configured')
  return { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
}

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url        = new URL(req.url)
  const country    = (url.searchParams.get('country') ?? 'AU').toUpperCase()
  const areaCode   = url.searchParams.get('area_code') ?? ''
  const limit      = url.searchParams.get('limit') ?? '20'

  const params = new URLSearchParams({
    'filter[country_code]':        country,
    'filter[features][]':          'sms',
    'filter[limit]':               limit,
  })
  if (areaCode) params.set('filter[national_destination_code]', areaCode)

  try {
    const res  = await fetch(`${TELNYX_API}/available_phone_numbers?${params}`, {
      headers: telnyxHeaders(),
    })
    const data = await res.json() as {
      data?: Array<{
        phone_number: string
        region_information?: Array<{ region_name: string; region_type: string }>
        cost_information?: { monthly_cost: string; currency: string }
        features?: Array<{ name: string }>
      }>
      errors?: Array<{ title: string; detail: string }>
    }

    if (!res.ok) {
      const msg = data.errors?.[0]?.detail ?? `Telnyx error ${res.status}`
      return NextResponse.json({ error: msg }, { status: 502 })
    }

    return NextResponse.json({ numbers: data.data ?? [] })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
