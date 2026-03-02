import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { IntegrationsClient } from './integrations-client'
import type { Metadata } from 'next'
import type { WorkspaceMember, SageIntegration } from '@/lib/types'

export const metadata: Metadata = { title: 'Integrations · Sage' }

export default async function SageIntegrationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  const membership  = membershipRaw as Pick<WorkspaceMember, 'workspace_id'> | null
  if (!membership) redirect('/login')

  const { data: integrationsRaw } = await supabase
    .from('sage_integrations')
    .select('provider, status, config, updated_at')
    .eq('workspace_id', membership.workspace_id)

  const connected = new Map<string, SageIntegration>()
  for (const row of (integrationsRaw ?? []) as SageIntegration[]) {
    if (row.status === 'connected') connected.set(row.provider, row)
  }

  return <IntegrationsClient connected={connected} />
}
