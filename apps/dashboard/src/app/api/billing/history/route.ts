// Unified billing history — Stripe invoices + wallet transactions + current plan.
import Stripe          from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { NextResponse }  from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!)
}
function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const PLAN_LABELS: Record<string, string> = {
  starter:    'Starter',
  individual: 'Individual',
  pro:        'Pro',
  edge:       'Edge',
  team:       'Team',
  enterprise: 'Enterprise',
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: memberRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (!memberRaw) return NextResponse.json({ error: 'No workspace' }, { status: 403 })
  const workspaceId = (memberRaw as { workspace_id: string }).workspace_id

  const admin = getAdmin()

  // Fetch workspace billing info
  const { data: wsRaw } = await admin
    .from('workspaces' as never)
    .select('plan, subscription_status, stripe_customer_id, stripe_subscription_id, trial_ends_at, billing_email, currency, seat_limit, bot_limit, billing_period_start')
    .eq('id', workspaceId)
    .single() as {
      data: {
        plan:                    string
        subscription_status:     string
        stripe_customer_id:      string | null
        stripe_subscription_id:  string | null
        trial_ends_at:           string | null
        billing_email:           string | null
        currency:                string
        seat_limit:              number
        bot_limit:               number
        billing_period_start:    string | null
      } | null
    }

  // Wallet transactions
  const { data: walletTxRaw } = await admin
    .from('wallet_transactions' as never)
    .select('id, type, amount, currency, description, reference_type, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(50) as {
      data: Array<{
        id:             string
        type:           string
        amount:         number
        currency:       string
        description:    string | null
        reference_type: string | null
        created_at:     string
      }> | null
    }

  // Stripe invoices (if customer exists)
  let stripeInvoices: Array<{
    id:          string
    number:      string | null
    description: string
    amount:      number
    currency:    string
    status:      string | null
    created_at:  string
    invoice_url: string | null
    period_end:  string | null
  }> = []

  let stripeSubscription: {
    current_period_end:   number | null
    current_period_start: number | null
    cancel_at_period_end: boolean
    interval:             string | null
  } | null = null

  if (wsRaw?.stripe_customer_id && process.env.STRIPE_SECRET_KEY) {
    const stripe = getStripe()

    const [invoiceList, sub] = await Promise.allSettled([
      stripe.invoices.list({ customer: wsRaw.stripe_customer_id, limit: 24, expand: ['data.subscription'] }),
      wsRaw.stripe_subscription_id
        ? stripe.subscriptions.retrieve(wsRaw.stripe_subscription_id)
        : Promise.resolve(null),
    ])

    if (invoiceList.status === 'fulfilled') {
      stripeInvoices = invoiceList.value.data
        .filter(inv => inv.status !== 'void' && (inv.amount_paid > 0 || inv.status === 'draft'))
        .map(inv => ({
          id:          inv.id,
          number:      inv.number,
          description: inv.lines.data[0]?.description ?? inv.description ?? 'Subscription',
          amount:      inv.amount_paid / 100,
          currency:    inv.currency.toUpperCase(),
          status:      inv.status,
          created_at:  new Date(inv.created * 1000).toISOString(),
          invoice_url: inv.hosted_invoice_url ?? null,
          period_end:  inv.period_end ? new Date(inv.period_end * 1000).toISOString() : null,
        }))
    }

    if (sub.status === 'fulfilled' && sub.value) {
      const s = sub.value
      stripeSubscription = {
        current_period_end:   s.current_period_end ?? null,
        current_period_start: s.current_period_start ?? null,
        cancel_at_period_end: s.cancel_at_period_end,
        interval:             s.items.data[0]?.plan?.interval ?? null,
      }
    }
  }

  // Wallet balance
  const { data: walletRaw } = await admin
    .from('wallet_accounts' as never)
    .select('balance, currency')
    .eq('workspace_id', workspaceId)
    .maybeSingle() as { data: { balance: string; currency: string } | null }

  return NextResponse.json({
    plan: {
      name:                 PLAN_LABELS[wsRaw?.plan ?? ''] ?? wsRaw?.plan ?? 'Starter',
      slug:                 wsRaw?.plan ?? 'starter',
      status:               wsRaw?.subscription_status ?? 'inactive',
      trial_ends_at:        wsRaw?.trial_ends_at ?? null,
      billing_email:        wsRaw?.billing_email ?? null,
      seat_limit:           wsRaw?.seat_limit ?? 1,
      bot_limit:            wsRaw?.bot_limit ?? 1,
      billing_period_start: wsRaw?.billing_period_start ?? null,
      subscription:         stripeSubscription,
    },
    wallet: {
      balance:  Number(walletRaw?.balance ?? 0),
      currency: walletRaw?.currency ?? wsRaw?.currency ?? 'AUD',
    },
    stripe_invoices:    stripeInvoices,
    wallet_transactions: (walletTxRaw ?? []).map(tx => ({
      ...tx,
      amount: Number(tx.amount),
    })),
  })
}
