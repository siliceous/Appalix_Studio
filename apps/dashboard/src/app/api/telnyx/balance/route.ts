import { createClient } from '@/lib/supabase/server'
import { NextResponse }  from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.TELNYX_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'TELNYX_API_KEY not configured' }, { status: 500 })

  try {
    const res  = await fetch('https://api.telnyx.com/v2/balance', {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache:   'no-store',
    })
    const data = await res.json() as {
      data?: { balance: string; currency: string; available_credit: string }
      errors?: Array<{ detail: string }>
    }

    if (!res.ok) {
      const msg = data.errors?.[0]?.detail ?? `Telnyx error ${res.status}`
      return NextResponse.json({ error: msg }, { status: 502 })
    }

    return NextResponse.json({
      balance:          data.data?.balance          ?? '0',
      available_credit: data.data?.available_credit ?? '0',
      currency:         data.data?.currency         ?? 'USD',
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
