import Stripe from 'stripe'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Pack definitions — credits and price env var suffix
const PACKS: Record<string, { credits: number; envKey: string } | undefined> = {
  starter: { credits: 100,  envKey: 'STRIPE_PRICE_PROSPECT_CREDITS_STARTER' },
  growth:  { credits: 500,  envKey: 'STRIPE_PRICE_PROSPECT_CREDITS_GROWTH'  },
  agency:  { credits: 1000, envKey: 'STRIPE_PRICE_PROSPECT_CREDITS_AGENCY'  },
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { pack } = await request.json() as { pack?: string }

  const packDef = pack ? PACKS[pack] : undefined
  if (!pack || !packDef) {
    return NextResponse.json({ error: 'Invalid pack. Choose: starter, growth, or agency.' }, { status: 400 })
  }

  const priceId = process.env[packDef.envKey]
  if (!priceId) {
    return NextResponse.json({
      error: `Stripe price not configured. Add ${packDef.envKey} to your environment variables.`,
    }, { status: 400 })
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe not configured.' }, { status: 500 })
  }

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id, workspaces(stripe_customer_id)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  type MemberRow = {
    workspace_id: string
    workspaces: { stripe_customer_id: string | null }
  }
  const membership = membershipRaw as MemberRow | null
  if (!membership) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  const session = await stripe.checkout.sessions.create({
    mode:                 'payment',
    payment_method_types: ['card'],
    customer:             membership.workspaces.stripe_customer_id ?? undefined,
    customer_email:       membership.workspaces.stripe_customer_id ? undefined : user.email,
    line_items:           [{ price: priceId, quantity: 1 }],
    metadata: {
      prospect_credits_pack: pack,
      prospect_credits:      String(packDef.credits),
      workspace_id:          membership.workspace_id,
      user_id:               user.id,
    },
    success_url: `${appUrl}/sage/prospects?credits=1`,
    cancel_url:  `${appUrl}/sage/prospects`,
  })

  return NextResponse.json({ url: session.url })
}
