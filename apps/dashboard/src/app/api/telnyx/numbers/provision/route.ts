import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse }                    from 'next/server'

const TELNYX_API = 'https://api.telnyx.com/v2'

function telnyxHeaders() {
  const key = process.env.TELNYX_API_KEY
  if (!key) throw new Error('TELNYX_API_KEY not configured')
  return { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
}

interface ProvisionBody {
  phoneNumber:        string   // E.164
  country:            string   // AU, US, GB
  messagingProfileId?: string
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Require workspace admin
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: membershipRaw } = await (supabase as any)
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  const membership = membershipRaw as { workspace_id: string; role: string } | null

  if (!membership) return NextResponse.json({ error: 'No workspace' }, { status: 403 })
  if (membership.role !== 'admin' && membership.role !== 'owner') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const body: ProvisionBody = await req.json()
  const { phoneNumber, country, messagingProfileId } = body

  if (!phoneNumber || !country) {
    return NextResponse.json({ error: 'phoneNumber and country are required' }, { status: 400 })
  }

  // Step 1 — order the number from Telnyx
  const orderPayload: Record<string, unknown> = {
    phone_numbers: [{ phone_number: phoneNumber }],
  }
  if (messagingProfileId) orderPayload.messaging_profile_id = messagingProfileId

  const orderRes  = await fetch(`${TELNYX_API}/number_orders`, {
    method:  'POST',
    headers: telnyxHeaders(),
    body:    JSON.stringify(orderPayload),
  })
  const orderData = await orderRes.json() as {
    data?: {
      id: string
      status: string
      phone_numbers: Array<{ id: string; phone_number: string; status: string }>
    }
    errors?: Array<{ title: string; detail: string }>
  }

  if (!orderRes.ok || !orderData.data?.id) {
    const msg = orderData.errors?.[0]?.detail ?? `Telnyx order error ${orderRes.status}`
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  const numberEntry = orderData.data.phone_numbers[0]
  if (!numberEntry) {
    return NextResponse.json({ error: 'No phone number in order response' }, { status: 502 })
  }

  // Step 2 — save to workspace_phone_numbers
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: saved, error: dbErr } = await (admin as any)
    .from('workspace_phone_numbers')
    .insert({
      workspace_id:        membership.workspace_id,
      provider:            'telnyx',
      provider_number_id:  numberEntry.id,
      e164:                phoneNumber,
      country_code:        country,
      messaging_profile_id: messagingProfileId ?? null,
      purchased_at:        new Date().toISOString(),
      capabilities:        { sms: true, voice: false, mms: false },
    })
    .select('id')
    .single() as { data: { id: string } | null; error: { message: string } | null }

  if (dbErr) {
    console.error('[provision] db insert:', dbErr.message)
    return NextResponse.json({ error: 'Number purchased but failed to save — contact support' }, { status: 500 })
  }

  return NextResponse.json({
    ok:             true,
    id:             saved!.id,
    phoneNumber,
    telnyxOrderId:  orderData.data.id,
  })
}
