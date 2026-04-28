// ─────────────────────────────────────────────────────────────────────────────
// walletService — Appalix Wallet operations.
//
// All balance mutations go through atomic Postgres RPCs (wallet_credit /
// wallet_deduct) so balance and transaction are always consistent even
// under concurrent requests.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../../lib/supabase.js'

export interface WalletBalance {
  balance:  number
  currency: string
}

export interface WalletTransaction {
  id:             string
  type:           string
  amount:         number
  balance_before: number
  balance_after:  number
  currency:       string
  description:    string | null
  reference_id:   string | null
  reference_type: string | null
  created_at:     string
}

// ── Read ──────────────────────────────────────────────────────────────────────

export async function getWalletBalance(workspaceId: string): Promise<WalletBalance> {
  const { data } = await supabase
    .from('wallet_accounts' as never)
    .select('balance, currency')
    .eq('workspace_id', workspaceId)
    .maybeSingle() as { data: { balance: string; currency: string } | null }

  return {
    balance:  Number(data?.balance ?? 0),
    currency: data?.currency ?? 'AUD',
  }
}

export async function hasSufficientBalance(
  workspaceId: string,
  amount: number,
): Promise<boolean> {
  const { balance } = await getWalletBalance(workspaceId)
  return balance >= amount
}

export async function getRecentTransactions(
  workspaceId: string,
  limit = 50,
): Promise<WalletTransaction[]> {
  const { data } = await supabase
    .from('wallet_transactions' as never)
    .select('id, type, amount, balance_before, balance_after, currency, description, reference_id, reference_type, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit) as { data: WalletTransaction[] | null }

  return data ?? []
}

// ── Credit (add funds) ────────────────────────────────────────────────────────

export async function walletCredit(params: {
  workspaceId:   string
  amount:        number
  type:          'topup' | 'refund' | 'admin_adjustment' | 'auto_recharge'
  description:   string
  referenceId?:  string
  referenceType?: string
  createdBy?:    string
}): Promise<number> {
  const { data, error } = await supabase
    .rpc('wallet_credit' as never, {
      p_workspace_id:   params.workspaceId,
      p_amount:         params.amount,
      p_type:           params.type,
      p_description:    params.description,
      p_reference_id:   params.referenceId   ?? null,
      p_reference_type: params.referenceType ?? null,
      p_created_by:     params.createdBy     ?? null,
    }) as { data: number | null; error: { message: string } | null }

  if (error) throw new Error(`[walletService] credit failed: ${error.message}`)
  return data ?? 0
}

// ── Deduct (usage charge) ─────────────────────────────────────────────────────
// Returns new balance, or null if balance was insufficient (and allowNegative=false).

export async function walletDeduct(params: {
  workspaceId:    string
  amount:         number
  type:           'usage_deduction'
  description:    string
  referenceId?:   string
  referenceType?: string
  allowNegative?: boolean
}): Promise<number | null> {
  const { data, error } = await supabase
    .rpc('wallet_deduct' as never, {
      p_workspace_id:   params.workspaceId,
      p_amount:         params.amount,
      p_type:           params.type,
      p_description:    params.description,
      p_reference_id:   params.referenceId   ?? null,
      p_reference_type: params.referenceType ?? null,
      p_allow_negative: params.allowNegative ?? false,
    }) as { data: number | null; error: { message: string; code?: string } | null }

  if (error) {
    if (error.message?.includes('insufficient_wallet_balance')) return null
    console.error('[walletService] deduct error:', error.message)
    throw new Error(`[walletService] deduct failed: ${error.message}`)
  }

  const newBalance = data ?? 0

  // Fire auto-recharge check async — don't block the caller
  void checkAndFireAutoRecharge(params.workspaceId, newBalance).catch(err =>
    console.error('[walletService] auto-recharge check failed:', err)
  )

  return newBalance
}

async function checkAndFireAutoRecharge(workspaceId: string, newBalance: number): Promise<void> {
  // Quick DB check — only proceed if auto_recharge is enabled and threshold crossed
  const { data: walletRaw } = await supabase
    .from('wallet_accounts' as never)
    .select('auto_recharge_enabled, auto_recharge_threshold, stripe_payment_method_id')
    .eq('workspace_id', workspaceId)
    .maybeSingle() as {
      data: {
        auto_recharge_enabled:   boolean
        auto_recharge_threshold: string
        stripe_payment_method_id: string | null
      } | null
    }

  if (!walletRaw?.auto_recharge_enabled)      return
  if (!walletRaw.stripe_payment_method_id)     return
  if (newBalance >= Number(walletRaw.auto_recharge_threshold)) return

  const dashboardUrl = process.env.DASHBOARD_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const secret       = process.env.INTERNAL_API_SECRET ?? ''

  await fetch(`${dashboardUrl}/api/wallet/trigger-auto-recharge`, {
    method:  'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-internal-secret': secret,
    },
    body: JSON.stringify({ workspaceId }),
  })
}
