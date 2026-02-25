import Stripe from 'stripe'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Set these in Vercel env vars once you create the prices in your Stripe dashboard.
// Price nickname must contain the plan name (e.g. "Core Monthly", "Pro Monthly", "Scale Monthly")
// so the webhook's getPlanFromPrice() can identify the plan.
const PRICE_IDS: Record<string, string | undefined> = {
  core:  process.env.STRIPE_PRICE_CORE,
  pro:   process.env.STRIPE_PRICE_PRO,
  scale: process.env.STRIPE_PRICE_SCALE,
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { plan } = await request.json() as { plan?: string }

  if (!plan || !Object.keys(PRICE_IDS).includes(plan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  const priceId = PRICE_IDS[plan]
  if (!priceId) {
    return NextResponse.json({
      error: `Stripe price not configured for ${plan}. Add STRIPE_PRICE_${plan.toUpperCase()} to your environment variables.`,
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
    .limit(1)
    .single()

  type MemberRow = {
    workspace_id: string
    workspaces: { stripe_customer_id: string | null; stripe_subscription_id: string | null; plan: string }
  }
  const membership = membershipRaw as MemberRow | null
  if (!membership) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

  const { stripe_customer_id, stripe_subscription_id } = membership.workspaces
  const stripe  = new Stripe(process.env.STRIPE_SECRET_KEY)
  const appUrl  = process.env.NEXT_PUBLIC_APP_URL!

  // Existing active subscription → send to Stripe Portal to change plan
  if (stripe_subscription_id && stripe_customer_id) {
    const portal = await stripe.billingPortal.sessions.create({
      customer:   stripe_customer_id,
      return_url: `${appUrl}/settings`,
    })
    return NextResponse.json({ url: portal.url })
  }

  // No subscription yet → new checkout session
  const session = await stripe.checkout.sessions.create({
    mode:                 'subscription',
    payment_method_types: ['card'],
    customer:             stripe_customer_id ?? undefined,
    customer_email:       stripe_customer_id ? undefined : user.email,
    line_items:           [{ price: priceId, quantity: 1 }],
    metadata: {
      plan,
      workspace_id: membership.workspace_id,
      user_id:      user.id,
    },
    success_url: `${appUrl}/settings?upgraded=1`,
    cancel_url:  `${appUrl}/settings/upgrade`,
  })

  return NextResponse.json({ url: session.url })
}
