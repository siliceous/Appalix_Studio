// Internal — called by the API service (walletService.ts) after a deduction
// drops a workspace balance below its auto-recharge threshold.
// Auth: x-internal-secret header.
import Stripe       from 'stripe'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(req: Request) {
  const secret = process.env.INTERNAL_API_SECRET
  if (secret && req.headers.get('x-internal-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { workspaceId } = await req.json() as { workspaceId?: string }
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  const admin = getAdmin()

  // Load wallet settings
  const { data: walletRaw } = await admin
    .from('wallet_accounts' as never)
    .select('id, balance, auto_recharge_enabled, auto_recharge_threshold, auto_recharge_amount, stripe_payment_method_id')
    .eq('workspace_id', workspaceId)
    .maybeSingle() as {
      data: {
        id:                      string
        balance:                 string
        auto_recharge_enabled:   boolean
        auto_recharge_threshold: string
        auto_recharge_amount:    string
        stripe_payment_method_id: string | null
      } | null
    }

  if (!walletRaw?.auto_recharge_enabled)       return NextResponse.json({ ok: true, skipped: 'disabled' })
  if (!walletRaw.stripe_payment_method_id)      return NextResponse.json({ ok: true, skipped: 'no_payment_method' })

  const balance   = Number(walletRaw.balance)
  const threshold = Number(walletRaw.auto_recharge_threshold)
  if (balance >= threshold) return NextResponse.json({ ok: true, skipped: 'balance_sufficient' })

  // Debounce: skip if another auto_recharge transaction was recorded in the last 10 minutes
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  const { data: recentCharge } = await admin
    .from('wallet_transactions' as never)
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('type', 'auto_recharge')
    .gte('created_at', tenMinAgo)
    .limit(1)
    .maybeSingle() as { data: { id: string } | null }

  if (recentCharge) return NextResponse.json({ ok: true, skipped: 'debounced' })

  // Load workspace for Stripe customer ID and currency
  const { data: wsRaw } = await admin
    .from('workspaces' as never)
    .select('stripe_customer_id, currency')
    .eq('id', workspaceId)
    .single() as { data: { stripe_customer_id: string | null; currency: string | null } | null }

  if (!wsRaw?.stripe_customer_id) return NextResponse.json({ ok: true, skipped: 'no_stripe_customer' })

  const amount       = Number(walletRaw.auto_recharge_amount)
  const currency     = (wsRaw.currency ?? 'AUD').toLowerCase()
  const amountCents  = Math.round(amount * 100)

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  let pi: Stripe.PaymentIntent
  try {
    pi = await stripe.paymentIntents.create({
      amount:         amountCents,
      currency,
      customer:       wsRaw.stripe_customer_id,
      payment_method: walletRaw.stripe_payment_method_id,
      off_session:    true,
      confirm:        true,
      description:    `Appalix wallet auto-recharge — ${currency.toUpperCase()} ${amount.toFixed(2)}`,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[auto-recharge] Stripe charge failed:', msg)
    return NextResponse.json({ ok: false, error: msg }, { status: 402 })
  }

  if (pi.status !== 'succeeded') {
    return NextResponse.json({ ok: false, error: `Payment status: ${pi.status}` }, { status: 402 })
  }

  // Credit wallet
  const { error: creditErr } = await admin.rpc('wallet_credit' as never, {
    p_workspace_id:   workspaceId,
    p_amount:         amount,
    p_type:           'auto_recharge',
    p_description:    `Auto-recharge — ${currency.toUpperCase()} ${amount.toFixed(2)}`,
    p_reference_id:   pi.id,
    p_reference_type: 'stripe_payment_intent',
    p_created_by:     null,
  })

  if (creditErr) {
    console.error('[auto-recharge] wallet_credit failed:', (creditErr as { message: string }).message)
    return NextResponse.json({ ok: false, error: 'Charged but failed to credit wallet — contact support' }, { status: 500 })
  }

  console.log(`[auto-recharge] +${currency.toUpperCase()} ${amount.toFixed(2)} → workspace ${workspaceId}`)
  return NextResponse.json({ ok: true, recharged: amount, currency: currency.toUpperCase() })
}
