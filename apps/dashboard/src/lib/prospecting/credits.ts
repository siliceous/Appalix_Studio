import { createAdminClient } from '@/lib/supabase/server'

export interface CreditBalance {
  monthly:  number
  addon:    number
  total:    number
  cap:      number
}

/**
 * Atomically deducts 1 credit from the workspace.
 * Draws from monthly first, then oldest add-on pack.
 * Returns false if no credits remain.
 */
export async function deductProspectCredit(
  workspaceId: string,
  prospectId:  string,
  jobId:       string,
): Promise<boolean> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('deduct_prospect_credit', {
    p_workspace_id: workspaceId,
    p_prospect_id:  prospectId,
    p_job_id:       jobId,
  })
  if (error) {
    console.error('[credits] deduct_prospect_credit error:', error)
    return false
  }
  return data === true
}

/**
 * Returns the current credit balance for a workspace.
 */
export async function getProspectCreditBalance(workspaceId: string): Promise<CreditBalance> {
  const admin = createAdminClient()
  const [wsResult, packResult] = await Promise.all([
    admin
      .from('workspaces')
      .select('prospect_credits_monthly, prospect_credits_monthly_cap')
      .eq('id', workspaceId)
      .single(),
    admin
      .from('workspace_prospect_credit_packs')
      .select('credits_remaining')
      .eq('workspace_id', workspaceId)
      .gt('credits_remaining', 0),
  ])

  const monthly = wsResult.data?.prospect_credits_monthly ?? 0
  const cap     = wsResult.data?.prospect_credits_monthly_cap ?? 0
  const addon   = (packResult.data ?? []).reduce((s, r) => s + r.credits_remaining, 0)

  return { monthly, addon, total: monthly + addon, cap }
}
