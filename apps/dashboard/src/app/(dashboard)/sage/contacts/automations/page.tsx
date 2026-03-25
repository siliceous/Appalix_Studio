import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AutomationsClient } from './automations-client'
import type { WorkspaceMember } from '@/lib/types'

export default async function ContactAutomationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  const membership = membershipRaw as Pick<WorkspaceMember, 'workspace_id'> | null
  if (!membership) redirect('/login')

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: integrationsRaw } = await (admin as any)
    .from('sage_integrations')
    .select('provider, status, sync_enabled')
    .eq('workspace_id', membership.workspace_id)

  type IntRow = { provider: string; status: string; sync_enabled: boolean }
  const rows = (integrationsRaw ?? []) as IntRow[]

  const connected = new Set<string>(
    rows.filter(r => r.status === 'connected').map(r => r.provider)
  )

  const syncEnabledByProvider: Record<string, boolean> = {}
  for (const r of rows.filter(r => r.status === 'connected')) {
    syncEnabledByProvider[r.provider] = r.sync_enabled ?? false
  }

  return <AutomationsClient initialConnected={connected} syncEnabledByProvider={syncEnabledByProvider} />
}
