import Stripe from 'stripe'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Never statically render — webhook handlers are always dynamic
export const dynamic = 'force-dynamic'

// Lazy-initialised so Next.js build doesn't crash when env vars are absent
function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!)
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

/**
 * Stripe webhook handler.
 *
 * Relevant events:
 *   checkout.session.completed      → provision new workspace; attach overage meter item
 *   customer.subscription.updated   → update plan / status / billing_period_start
 *   customer.subscription.deleted   → cancel / restrict workspace
 *   invoice.payment_failed          → mark past_due
 *   invoice.upcoming                → report conversation overage usage to Stripe
 *
 * Overage billing:
 *   Price: STRIPE_PRICE_OVERAGE_CONV — usage-based price linked to meter
 *          "llm_conversation_overage" at $0.01/unit ($10 per 1,000 messages).
 *   Logic: at invoice.upcoming we count messages created since billing_period_start,
 *          subtract the plan's monthly_message_limit, and report any positive overage
 *          via stripe.billing.meterEvents.create (idempotent via invoice ID key).
 */
export async function POST(request: NextRequest) {
  const stripe    = getStripe()
  const body      = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('[stripe webhook] signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(sub)
        break
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(sub)
        break
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(invoice)
        break
      }
      case 'invoice.upcoming': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoiceUpcoming(invoice)
        break
      }
      default:
        break
    }
  } catch (err) {
    console.error(`[stripe webhook] handler error for ${event.type}:`, err)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

// ---------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const stripe   = getStripe()
  const supabase = getSupabase()
  const metadata   = session.metadata ?? {}
  const email      = session.customer_details?.email ?? metadata.email
  const workspaceName = metadata.workspace_name ?? email?.split('@')[0] ?? 'My Workspace'
  const plan       = (metadata.plan ?? 'individual') as Plan
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
  const subscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : session.subscription?.id

  if (!email) {
    console.error('[stripe] checkout.session.completed — no email in session')
    return
  }

  // Resolve billing period start from Stripe subscription
  let billingPeriodStart: string | null = null
  if (subscriptionId) {
    const sub = await stripe.subscriptions.retrieve(subscriptionId)
    billingPeriodStart = new Date(sub.current_period_start * 1000).toISOString()
  }

  // Attach conversation overage metered item to the subscription
  let overageItemId: string | null = null
  if (subscriptionId && process.env.STRIPE_PRICE_OVERAGE_CONV) {
    try {
      const item = await stripe.subscriptionItems.create({
        subscription: subscriptionId,
        price:        process.env.STRIPE_PRICE_OVERAGE_CONV,
        quantity:     undefined, // metered — no quantity on creation
      })
      overageItemId = item.id
    } catch (err) {
      // Non-fatal — overage just won't be tracked for this sub until fixed
      console.error('[stripe] Failed to attach overage meter item:', err)
    }
  }

  // If this is an upgrade for an existing workspace, update it instead of creating a new one
  if (metadata.workspace_id) {
    await supabase
      .from('workspaces')
      .update({
        plan,
        subscription_status:    'active',
        stripe_customer_id:     customerId ?? null,
        stripe_subscription_id: subscriptionId ?? null,
        billing_email:          email,
        billing_period_start:   billingPeriodStart,
        ...(overageItemId ? { overage_item_id: overageItemId } : {}),
        ...PLAN_LIMITS[plan],
      })
      .eq('id', metadata.workspace_id)
    console.log(`[stripe] Workspace ${metadata.workspace_id} upgraded to ${plan}`)
    return
  }

  // 1. Get or create Supabase auth user
  const { data: existingUser } = await supabase.auth.admin.listUsers()
  const authUser = existingUser.users.find((u: { email?: string }) => u.email === email)

  let userId: string
  if (authUser) {
    userId = authUser.id
  } else {
    const { data: newUser, error } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
    })
    if (error || !newUser.user) throw new Error(`Failed to create user: ${error?.message}`)
    userId = newUser.user.id
  }

  // 2. Create workspace
  const slug = workspaceName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 60)
  const { data: workspace, error: wsError } = await supabase
    .from('workspaces')
    .insert({
      name:                   workspaceName,
      slug:                   `${slug}-${Date.now().toString(36)}`,
      plan,
      subscription_status:    'active',
      stripe_customer_id:     customerId ?? null,
      stripe_subscription_id: subscriptionId ?? null,
      billing_email:          email,
      billing_period_start:   billingPeriodStart,
      overage_item_id:        overageItemId,
      ...PLAN_LIMITS[plan],
    })
    .select('id')
    .single()

  if (wsError) throw new Error(`Failed to create workspace: ${wsError.message}`)

  // 3. Add user as owner
  await supabase.from('workspace_members').insert({
    workspace_id: workspace.id,
    user_id:      userId,
    role:         'owner',
    accepted_at:  new Date().toISOString(),
  })

  // 4. Send magic-link login email
  await supabase.auth.admin.generateLink({
    type:  'magiclink',
    email,
    options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard` },
  })

  console.log(`[stripe] Workspace provisioned: ${workspace.id} for ${email}`)
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  const supabase = getSupabase()
  const plan   = getPlanFromPrice(sub.items.data[0]?.price)
  const status = stripeStatusToInternal(sub.status)

  // Update billing_period_start whenever the subscription renews
  const billingPeriodStart = new Date(sub.current_period_start * 1000).toISOString()

  await supabase
    .from('workspaces')
    .update({
      plan,
      subscription_status:  status,
      stripe_subscription_id: sub.id,
      billing_period_start: billingPeriodStart,
      ...PLAN_LIMITS[plan],
    })
    .eq('stripe_subscription_id', sub.id)
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const supabase = getSupabase()
  await supabase
    .from('workspaces')
    .update({ subscription_status: 'cancelled' })
    .eq('stripe_subscription_id', sub.id)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const supabase = getSupabase()
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
  if (!customerId) return

  await supabase
    .from('workspaces')
    .update({ subscription_status: 'past_due' })
    .eq('stripe_customer_id', customerId)
}

/**
 * invoice.upcoming — fires ~3 days before invoice finalisation.
 * Count messages created since billing_period_start,
 * subtract the plan limit, report any positive overage to Stripe
 * via the Billing Meters API (event_name: llm_conversation_overage).
 * Idempotency key = invoice ID so duplicate webhook deliveries are safe.
 */
async function handleInvoiceUpcoming(invoice: Stripe.Invoice) {
  const stripe   = getStripe()
  const supabase = getSupabase()

  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
  if (!customerId) return

  // Load workspace
  const { data: ws } = await supabase
    .from('workspaces')
    .select('id, monthly_message_limit, billing_period_start')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()

  if (!ws || !ws.billing_period_start) return

  // Count messages created in this billing period
  const { count } = await supabase
    .from('conversations')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', ws.id)
    .gte('created_at', ws.billing_period_start)

  const total   = count ?? 0
  const limit   = ws.monthly_message_limit ?? 0
  const overage = Math.max(0, total - limit)

  if (overage === 0) return

  // Report overage via Billing Meters API — idempotent per invoice
  await stripe.billing.meterEvents.create(
    {
      event_name: 'llm_conversation_overage',
      payload: {
        stripe_customer_id: customerId,
        value:              String(overage),
      },
    },
    { idempotencyKey: `overage-${invoice.id}` },
  )

  console.log(`[stripe] Overage reported: workspace=${ws.id} total=${total} limit=${limit} overage=${overage}`)
}

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

type Plan = 'individual' | 'pro' | 'team' | 'enterprise'

const PLAN_LIMITS: Record<Plan, {
  monthly_message_limit: number
  monthly_agent_run_limit: number
  seat_limit: number | null
  bot_limit: number | null
  extra_seat_limit: number | null
  extra_bot_limit: number | null
}> = {
  //                                                                              seats  bots  extra seats  extra bots
  individual: { monthly_message_limit:  5_000, monthly_agent_run_limit:     0, seat_limit:   1, bot_limit:  1, extra_seat_limit:    2, extra_bot_limit: null },
  pro:        { monthly_message_limit: 15_000, monthly_agent_run_limit:   150, seat_limit:   3, bot_limit:  3, extra_seat_limit:    6, extra_bot_limit: null },
  team:       { monthly_message_limit: 50_000, monthly_agent_run_limit:   500, seat_limit:  10, bot_limit: 10, extra_seat_limit: null, extra_bot_limit: null },
  enterprise: { monthly_message_limit: 999_999, monthly_agent_run_limit: 9_999, seat_limit: null, bot_limit: null, extra_seat_limit: null, extra_bot_limit: null },
}

function getPlanFromPrice(price?: Stripe.Price): Plan {
  if (!price) return 'individual'
  const nickname = (price.nickname ?? '').toLowerCase()
  if (nickname.includes('enterprise')) return 'enterprise'
  if (nickname.includes('team'))       return 'team'
  if (nickname.includes('pro'))        return 'pro'
  return 'individual'
}

function stripeStatusToInternal(status: Stripe.Subscription.Status) {
  const map: Record<string, string> = {
    active:             'active',
    trialing:           'trialing',
    past_due:           'past_due',
    canceled:           'cancelled',
    unpaid:             'past_due',
    paused:             'paused',
    incomplete:         'inactive',
    incomplete_expired: 'inactive',
  }
  return (map[status] ?? 'inactive') as 'active' | 'inactive' | 'trialing' | 'past_due' | 'cancelled' | 'paused'
}
