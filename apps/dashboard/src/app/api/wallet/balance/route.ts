import { createClient }    from '@/lib/supabase/server'
import { NextResponse }     from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: memberRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id, workspaces(currency, country)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (!memberRaw) return NextResponse.json({ error: 'No workspace' }, { status: 403 })

  type MemberRow = {
    workspace_id: string
    workspaces: { currency: string | null; country: string | null }
  }
  const member            = memberRaw as unknown as MemberRow
  const workspaceId       = member.workspace_id
  const workspaceCurrency = member.workspaces.currency ?? 'AUD'
  const workspaceCountry  = member.workspaces.country  ?? 'AU'

  const admin = getAdmin()

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const now = new Date().toISOString()

  const [walletRes, txRes, usageRes, rateCardRes] = await Promise.all([
    admin
      .from('wallet_accounts' as never)
      .select('balance, currency, auto_recharge_enabled, auto_recharge_threshold, auto_recharge_amount, low_balance_threshold, stripe_payment_method_id')
      .eq('workspace_id', workspaceId)
      .maybeSingle(),
    admin
      .from('wallet_transactions' as never)
      .select('id, type, amount, balance_before, balance_after, currency, description, reference_id, reference_type, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(20),
    admin
      .from('usage_events' as never)
      .select('usage_type, sell_total, quantity')
      .eq('workspace_id', workspaceId)
      .gte('occurred_at', thirtyDaysAgo),
    // Workspace-specific rate card (falls back to global below)
    admin
      .from('billing_rate_cards' as never)
      .select('rates, currency')
      .eq('workspace_id', workspaceId)
      .lte('effective_from', now)
      .or('effective_to.is.null,effective_to.gt.' + now)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  type WalletRow = {
    balance: string
    currency: string
    auto_recharge_enabled: boolean
    auto_recharge_threshold: string
    auto_recharge_amount: string
    low_balance_threshold: string
    stripe_payment_method_id: string | null
  }

  const wallet = walletRes.data as WalletRow | null

  // Rate card: workspace-specific or global fallback
  type RateCardRow = { rates: Record<string, { unit_price: number }>; currency: string }
  let rateCard = rateCardRes.data as RateCardRow | null
  if (!rateCard?.rates) {
    const { data: globalCard } = await admin
      .from('billing_rate_cards' as never)
      .select('rates, currency')
      .is('workspace_id', null)
      .lte('effective_from', now)
      .or('effective_to.is.null,effective_to.gt.' + now)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle()
    rateCard = globalCard as RateCardRow | null
  }

  // Aggregate usage by type for the last 30 days
  type UsageRow = { usage_type: string; sell_total: string; quantity: number }
  const usageRows = (usageRes.data ?? []) as UsageRow[]
  const usageSummary: Record<string, { total: number; quantity: number }> = {}
  for (const row of usageRows) {
    const key = row.usage_type
    if (!usageSummary[key]) usageSummary[key] = { total: 0, quantity: 0 }
    usageSummary[key].total    += Number(row.sell_total)
    usageSummary[key].quantity += Number(row.quantity)
  }

  return NextResponse.json({
    balance:                  Number(wallet?.balance ?? 0),
    currency:                 wallet?.currency ?? workspaceCurrency,
    country:                  workspaceCountry,
    auto_recharge_enabled:    wallet?.auto_recharge_enabled ?? false,
    auto_recharge_threshold:  Number(wallet?.auto_recharge_threshold ?? 10),
    auto_recharge_amount:     Number(wallet?.auto_recharge_amount ?? 50),
    low_balance_threshold:    Number(wallet?.low_balance_threshold ?? 5),
    stripe_payment_method_id: wallet?.stripe_payment_method_id ?? null,
    transactions:             txRes.data ?? [],
    usage_summary:            usageSummary,
    rate_card:                rateCard?.rates   ?? {},
    rate_currency:            rateCard?.currency ?? 'AUD',
  })
}
