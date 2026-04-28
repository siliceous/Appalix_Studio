import Stripe         from 'stripe'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!)
}

// Preset top-up amounts in cents — same tiers for all currencies
const VALID_AMOUNTS_CENTS = [1000, 2000, 5000, 10000, 20000, 50000]

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: memberRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id, workspaces(stripe_customer_id, billing_email, currency)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (!memberRaw) return NextResponse.json({ error: 'No workspace' }, { status: 403 })

  type MemberRow = {
    workspace_id: string
    workspaces: {
      stripe_customer_id: string | null
      billing_email:      string | null
      currency:           string | null
    }
  }
  const member      = memberRaw as unknown as MemberRow
  const workspaceId = member.workspace_id
  const currency    = (member.workspaces.currency ?? 'AUD').toUpperCase()
  const stripeCurrency = currency.toLowerCase()  // Stripe requires lowercase

  const body = await req.json() as { amountCents?: number }
  const amountCents = body.amountCents ?? 5000

  if (!VALID_AMOUNTS_CENTS.includes(amountCents) && (amountCents < 1000 || amountCents > 500000)) {
    return NextResponse.json({ error: 'Invalid top-up amount' }, { status: 400 })
  }

  const stripe = getStripe()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const amountDisplay = (amountCents / 100).toFixed(2)

  const session = await stripe.checkout.sessions.create({
    mode:                 'payment',
    payment_method_types: ['card'],
    customer:             member.workspaces.stripe_customer_id ?? undefined,
    customer_email:       member.workspaces.stripe_customer_id ? undefined : (user.email ?? undefined),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency:     stripeCurrency,
          unit_amount:  amountCents,
          product_data: {
            name:        'Appalix Communications Credit',
            description: `Add ${currency} ${amountDisplay} to your Appalix wallet`,
          },
        },
      },
    ],
    payment_intent_data: {
      setup_future_usage: 'off_session',  // saves card for auto-recharge
    },
    metadata: {
      type:         'wallet_topup',
      workspace_id: workspaceId,
      amount_cents: String(amountCents),
      currency,
      user_id:      user.id,
    },
    success_url: `${appUrl}/settings/wallet?topup=success&amount=${amountCents}`,
    cancel_url:  `${appUrl}/settings/wallet?topup=cancelled`,
  })

  return NextResponse.json({ url: session.url, currency })
}
