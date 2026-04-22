import { createClient } from '@/lib/supabase/server'
import { NextResponse }  from 'next/server'

const TELNYX_API = 'https://api.telnyx.com/v2'

function telnyxHeaders() {
  const key = process.env.TELNYX_API_KEY
  if (!key) throw new Error('TELNYX_API_KEY not configured')
  return { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const res  = await fetch(`${TELNYX_API}/messaging_profiles?page[size]=25`, {
      headers: telnyxHeaders(),
    })
    const data = await res.json() as {
      data?: Array<{ id: string; name: string; enabled: boolean }>
      errors?: Array<{ detail: string }>
    }

    if (!res.ok) {
      const msg = data.errors?.[0]?.detail ?? `Telnyx error ${res.status}`
      return NextResponse.json({ error: msg }, { status: 502 })
    }

    return NextResponse.json({ profiles: data.data ?? [] })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
