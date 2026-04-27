// Internal route — purchases a phone number via the carrier API.
// "telnyx" in the path is intentional (internal API); never surfaced to customers.
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse }                    from 'next/server'

const TELNYX_API         = 'https://api.telnyx.com/v2'
const MIN_WALLET_BALANCE = 1.00   // wallet must have at least this before buying a number
const FALLBACK_RATE      = 5.00   // used if no rate card row exists yet

function telnyxHeaders() {
  const key = process.env.TELNYX_API_KEY
  if (!key) throw new Error('TELNYX_API_KEY not configured')
  return { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
}

interface ProvisionBody {
  phoneNumber:         string   // E.164
  country:             string   // AU, US, GB …
  messagingProfileId?: string
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: membershipRaw } = await supabase
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

  const admin = createAdminClient()
  const now   = new Date()

  // ── Look up the rate card price for phone_number_month ─────────────────────
  // This is the same rate used for renewals — purchase and renewal are always
  // identical so customers see a consistent monthly cost.
  const { data: rateRaw } = await admin
    .from('billing_rate_cards' as never)
    .select('rates')
    .is('workspace_id', null)
    .lte('effective_from', now.toISOString())
    .order('effective_from', { ascending: false })
    .limit(1)
    .maybeSingle() as { data: { rates: Record<string, { unit_price: number }> } | null }

  const chargeAmount = rateRaw?.rates?.phone_number_month?.unit_price ?? FALLBACK_RATE

  // ── Wallet balance check ───────────────────────────────────────────────────
  const { data: walletRaw } = await admin
    .from('wallet_accounts' as never)
    .select('balance, currency')
    .eq('workspace_id', membership.workspace_id)
    .maybeSingle() as { data: { balance: string; currency: string } | null }

  const walletBalance  = Number(walletRaw?.balance ?? 0)
  const walletCurrency = walletRaw?.currency ?? 'AUD'

  if (walletBalance < MIN_WALLET_BALANCE) {
    return NextResponse.json({
      error: `Insufficient wallet balance (${walletCurrency} ${walletBalance.toFixed(2)}). Add at least ${walletCurrency} ${MIN_WALLET_BALANCE.toFixed(2)} to your Appalix wallet before purchasing a number.`,
      code:  'insufficient_balance',
    }, { status: 402 })
  }

  // ── US A2P compliance check ───────────────────────────────────────────────
  let complianceWarning: string | undefined
  if (country.toUpperCase() === 'US') {
    const { data: complianceRaw } = await admin
      .from('sms_compliance_profiles' as never)
      .select('status')
      .eq('workspace_id', membership.workspace_id)
      .eq('country_code', 'US')
      .eq('compliance_type', 'A2P_10DLC')
      .maybeSingle() as { data: { status: string } | null }
    if (complianceRaw?.status !== 'approved') {
      complianceWarning = complianceRaw?.status
        ? `US A2P verification is ${complianceRaw.status.replace(/_/g, ' ')} — SMS delivery may be blocked until approved.`
        : 'US A2P 10DLC verification is required. Complete it at Settings → Compliance → US SMS Verification.'
    }
  }

  // ── Purchase via carrier ───────────────────────────────────────────────────
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
      phone_numbers: Array<{ id: string; phone_number: string }>
    }
    errors?: Array<{ title: string; detail: string }>
  }

  if (!orderRes.ok || !orderData.data?.id) {
    const msg = orderData.errors?.[0]?.detail ?? `Carrier error ${orderRes.status}`
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  const numberEntry = orderData.data.phone_numbers[0]
  if (!numberEntry) {
    return NextResponse.json({ error: 'No phone number in order response' }, { status: 502 })
  }

  // ── Save to DB ────────────────────────────────────────────────────────────
  const billingNextAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const { data: saved, error: dbErr } = await admin
    .from('workspace_phone_numbers' as never)
    .insert({
      workspace_id:         membership.workspace_id,
      provider:             'telnyx',
      provider_number_id:   numberEntry.id,
      e164:                 phoneNumber,
      country_code:         country,
      messaging_profile_id: messagingProfileId ?? null,
      purchased_at:         now.toISOString(),
      billing_next_at:      billingNextAt.toISOString(),
      capabilities:         { sms: true, voice: false, mms: false },
    })
    .select('id')
    .single() as { data: { id: string } | null; error: { message: string } | null }

  if (dbErr || !saved) {
    console.error('[provision] db insert:', dbErr?.message)
    return NextResponse.json({ error: 'Number purchased but failed to save — contact support' }, { status: 500 })
  }

  // ── Record first-month charge: usage_event + wallet deduction ─────────────
  // Same rate as monthly renewals — customers always pay the rate card price.
  void Promise.all([
    admin.from('usage_events' as never).insert({
      workspace_id:        membership.workspace_id,
      source_table:        'workspace_phone_numbers',
      source_id:           saved.id,
      provider:            'telnyx',
      usage_type:          'phone_number_month',
      quantity:            1,
      unit:                'number_month',
      occurred_at:         now.toISOString(),
      sell_unit_price:     chargeAmount,
      sell_total:          chargeAmount,
      currency:            walletCurrency,
      rating_status:       'rated',
      meta:                { e164: phoneNumber, month: 1 },
    }),
    admin.rpc('wallet_deduct' as never, {
      p_workspace_id:   membership.workspace_id,
      p_amount:         chargeAmount,
      p_type:           'usage_deduction',
      p_description:    `Phone number — ${phoneNumber} (month 1)`,
      p_reference_id:   saved.id,
      p_reference_type: 'workspace_phone_number',
      p_allow_negative: false,
    }),
  ]).then(([, { error }]: [unknown, { error: { message: string } | null }]) => {
    if (error) console.warn('[provision] wallet deduct skipped:', (error as { message: string }).message)
  }).catch(err => console.error('[provision] billing failed:', err))

  return NextResponse.json({
    ok:               true,
    id:               saved.id,
    phoneNumber,
    monthlyRate:      chargeAmount,
    currency:         walletCurrency,
    complianceWarning,
  })
}
