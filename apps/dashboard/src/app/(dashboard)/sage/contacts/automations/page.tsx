import { createClient } from '@/lib/supabase/server'
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
    .limit(1)
    .single()

  const membership = membershipRaw as Pick<WorkspaceMember, 'workspace_id'> | null
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

  return <AutomationsClient initialConnected={connected} />
}
