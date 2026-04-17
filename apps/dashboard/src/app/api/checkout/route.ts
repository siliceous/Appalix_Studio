import Stripe from 'stripe'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Set these in Vercel env vars once you create the prices in your Stripe dashboard.
// Price nickname must contain the plan name (e.g. "Individual Monthly", "Pro Monthly", "Team Monthly")
// so the webhook's getPlanFromPrice() can identify the plan.
// Each plan has a monthly and annual price ID.
const PRICE_IDS: Record<string, string | undefined> = {
  individual_monthly: process.env.STRIPE_PRICE_INDIVIDUAL_MONTHLY?.trim(),
  individual_annual:  process.env.STRIPE_PRICE_INDIVIDUAL_ANNUAL?.trim(),
  pro_monthly:        process.env.STRIPE_PRICE_PRO_MONTHLY?.trim(),
  pro_annual:         process.env.STRIPE_PRICE_PRO_ANNUAL?.trim(),
  edge_monthly:       process.env.STRIPE_PRICE_EDGE_MONTHLY?.trim(),
  edge_annual:        process.env.STRIPE_PRICE_EDGE_ANNUAL?.trim(),
  team_monthly:       process.env.STRIPE_PRICE_TEAM_MONTHLY?.trim(),
  team_annual:        process.env.STRIPE_PRICE_TEAM_ANNUAL?.trim(),
  // Extra seat add-on
  extra_seat_monthly: process.env.STRIPE_PRICE_EXTRA_SEAT_MONTHLY?.trim(),
  extra_seat_annual:  process.env.STRIPE_PRICE_EXTRA_SEAT_ANNUAL?.trim(),
  // Extra bot add-on
  extra_bot_monthly:     process.env.STRIPE_PRICE_EXTRA_BOT_MONTHLY?.trim(),
  extra_bot_annual:      process.env.STRIPE_PRICE_EXTRA_BOT_ANNUAL?.trim(),
  // Extra storage add-on — sold in 10 GB blocks, billed monthly or annually
  extra_storage_monthly: process.env.STRIPE_PRICE_EXTRA_STORAGE_MONTHLY?.trim(),
  extra_storage_annual:  process.env.STRIPE_PRICE_EXTRA_STORAGE_ANNUAL?.trim(),
  // NOTE: conversation overage (STRIPE_PRICE_OVERAGE_CONV) is a metered price
  // attached server-side after checkout in the webhook — not selectable here.
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { plan, billing } = await request.json() as { plan?: string; billing?: 'monthly' | 'annual' }

  const priceKey = `${plan}_${billing ?? 'monthly'}`
  if (!plan || !Object.keys(PRICE_IDS).includes(priceKey)) {
    return NextResponse.json({ error: 'Invalid plan or billing period' }, { status: 400 })
  }

  const priceId = PRICE_IDS[priceKey]
  if (!priceId) {
    return NextResponse.json({
      error: `Stripe price not configured for ${priceKey}. Add STRIPE_PRICE_${priceKey.toUpperCase()} to your environment variables.`,
    }, { status: 400 })
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe not configured.' }, { status: 500 })
  }

  // Load workspace
  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id, workspaces(stripe_customer_id, stripe_subscription_id, plan)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  type MemberRow = {
    workspace_id: string
    workspaces: { stripe_customer_id: string | null; stripe_subscription_id: string | null; plan: string }
  }
  const membership = membershipRaw as MemberRow | null
  if (!membership) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

  const { stripe_customer_id, stripe_subscription_id } = membership.workspaces
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  try {
    // Existing active subscription → send to Stripe Portal to change plan
    if (stripe_subscription_id && stripe_customer_id) {
      const portal = await stripe.billingPortal.sessions.create({
        customer:   stripe_customer_id,
        return_url: `${appUrl}/settings`,
      })
      return NextResponse.json({ url: portal.url })
    }

    // No subscription yet → new checkout session with 14-day free trial
    const session = await stripe.checkout.sessions.create({
      mode:                 'subscription',
      payment_method_types: ['card'],
      customer:             stripe_customer_id ?? undefined,
      customer_email:       stripe_customer_id ? undefined : user.email,
      line_items:           [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
      },
      payment_method_collection: 'if_required',
      metadata: {
        plan,
        billing:      billing ?? 'monthly',
        workspace_id: membership.workspace_id,
        user_id:      user.id,
      },
      success_url: `${appUrl}/settings?upgraded=1`,
      cancel_url:  `${appUrl}/settings/upgrade`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stripe error'
    console.error('[checkout] Stripe error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
