import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { IntegrationsClient } from './integrations-client'
import type { Metadata } from 'next'
import type { WorkspaceMember } from '@/lib/types'

export const metadata: Metadata = { title: 'Integrations · Sage' }

export default async function SageIntegrationsPage() {
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

  const membership  = membershipRaw as Pick<WorkspaceMember, 'workspace_id'> | null
  if (!membership) redirect('/login')

  const { data: integrationsRaw } = await supabase
    .from('sage_integrations')
    .select('provider, status')
    .eq('workspace_id', membership.workspace_id)

  const connected = new Set<string>(
    (integrationsRaw ?? [])
      .filter((r: { provider: string; status: string }) => r.status === 'connected')
      .map((r: { provider: string; status: string }) => r.provider)
  )

  return <IntegrationsClient connected={connected} />
}
