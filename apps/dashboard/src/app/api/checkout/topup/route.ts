import Stripe from 'stripe'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const TOPUP_PRICE_IDS: Record<string, string | undefined> = {
  '2k': process.env.STRIPE_PRICE_TOPUP_2K,
  '5k': process.env.STRIPE_PRICE_TOPUP_5K,
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { pack } = await request.json() as { pack?: string }

  if (!pack || !Object.keys(TOPUP_PRICE_IDS).includes(pack)) {
    return NextResponse.json({ error: 'Invalid pack' }, { status: 400 })
  }

  const priceId = TOPUP_PRICE_IDS[pack]
  if (!priceId) {
    return NextResponse.json({
      error: `Stripe price not configured for ${pack} pack. Add STRIPE_PRICE_TOPUP_${pack.toUpperCase()} to your environment variables.`,
    }, { status: 400 })
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe not configured.' }, { status: 500 })
  }

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id, workspaces(stripe_customer_id, plan)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  type MemberRow = {
    workspace_id: string
    workspaces: { stripe_customer_id: string | null; plan: string }
  }
  const membership = membershipRaw as MemberRow | null
  if (!membership) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

  const { stripe_customer_id } = membership.workspaces

  if (membership.workspaces.plan === 'starter') {
    return NextResponse.json({ error: 'Top-ups are available on paid plans only.' }, { status: 403 })
  }

  const stripe  = new Stripe(process.env.STRIPE_SECRET_KEY)
  const appUrl  = process.env.NEXT_PUBLIC_APP_URL!

  const session = await stripe.checkout.sessions.create({
    mode:                 'payment',
    payment_method_types: ['card'],
    customer:             stripe_customer_id ?? undefined,
    customer_email:       stripe_customer_id ? undefined : user.email,
    line_items:           [{ price: priceId, quantity: 1 }],
    metadata: {
      topup_pack:   pack,
      workspace_id: membership.workspace_id,
      user_id:      user.id,
    },
    success_url: `${appUrl}/settings?topup=1`,
    cancel_url:  `${appUrl}/pricing`,
  })

  return NextResponse.json({ url: session.url })
}
