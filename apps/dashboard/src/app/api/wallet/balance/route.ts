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

  const [walletRes, txRes] = await Promise.all([
    admin
      .from('wallet_accounts' as never)
      .select('balance, currency, auto_recharge_enabled, auto_recharge_threshold, auto_recharge_amount, low_balance_threshold')
      .eq('workspace_id', workspaceId)
      .maybeSingle(),
    admin
      .from('wallet_transactions' as never)
      .select('id, type, amount, balance_before, balance_after, currency, description, reference_id, reference_type, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  type WalletRow = {
    balance: string
    currency: string
    auto_recharge_enabled: boolean
    auto_recharge_threshold: string
    auto_recharge_amount: string
    low_balance_threshold: string
  }

  const wallet = walletRes.data as WalletRow | null

  return NextResponse.json({
    balance:                  Number(wallet?.balance ?? 0),
    currency:                 wallet?.currency ?? workspaceCurrency,
    country:                  workspaceCountry,
    auto_recharge_enabled:    wallet?.auto_recharge_enabled ?? false,
    auto_recharge_threshold:  Number(wallet?.auto_recharge_threshold ?? 10),
    auto_recharge_amount:     Number(wallet?.auto_recharge_amount ?? 50),
    low_balance_threshold:    Number(wallet?.low_balance_threshold ?? 5),
    transactions:             txRes.data ?? [],
  })
}
