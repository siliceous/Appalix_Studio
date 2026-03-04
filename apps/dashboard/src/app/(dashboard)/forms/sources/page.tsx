import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { Header } from '@/components/layout/header'
import { SourcesClient } from './sources-client'
import type { WorkspaceMember, LeadAdSource } from '@/lib/types'

export default async function SourcesPage() {
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
  const workspaceId = membership.workspace_id

  const { data: sourcesRaw } = await supabase
    .from('lead_ad_sources')
    .select('*')
    .eq('workspace_id', workspaceId)

  const sources = (sourcesRaw ?? []) as LeadAdSource[]

  const headersList = await headers()
  const host  = headersList.get('host') ?? 'appalix.ai'
  const proto = host.startsWith('localhost') ? 'http' : 'https'
  const baseUrl = `${proto}://${host}`

  return (
    <div className="p-8">
      <Header
        title="Sources"
        description="Connect ad platforms to receive leads automatically"
      />

      <SourcesClient
        sources={sources}
        workspaceId={workspaceId}
        baseUrl={baseUrl}
      />
    </div>
  )
}
