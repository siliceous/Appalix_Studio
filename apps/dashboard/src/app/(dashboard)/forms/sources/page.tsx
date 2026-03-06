import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { Header } from '@/components/layout/header'
import { SourcesClient } from './sources-client'
import type { WorkspaceMember, LeadAdSource, SageIntegration } from '@/lib/types'

const EMAIL_PROVIDERS = ['mailchimp', 'activecampaign', 'convertkit', 'klaviyo', 'constantcontact'] as const
const SYNC_PROVIDERS  = ['mailchimp', 'activecampaign'] as const

export default async function SourcesPage() {
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
  const workspaceId = membership.workspace_id

  const [
    { data: sourcesRaw },
    { data: emailIntegrationsRaw },
    { data: leadCountsRaw },
  ] = await Promise.all([
    supabase
      .from('lead_ad_sources')
      .select('*')
      .eq('workspace_id', workspaceId),
    supabase
      .from('sage_integrations')
      .select('id, provider, status, updated_at')
      .eq('workspace_id', workspaceId)
      .eq('status', 'connected')
      .in('provider', EMAIL_PROVIDERS),
    supabase
      .from('leads')
      .select('source_platform')
      .eq('workspace_id', workspaceId)
      .in('source_platform', SYNC_PROVIDERS),
  ])

  const sources           = (sourcesRaw ?? []) as LeadAdSource[]
  const emailIntegrations = (emailIntegrationsRaw ?? []) as Pick<SageIntegration, 'id' | 'provider' | 'status' | 'updated_at'>[]

  // Count leads per email platform
  const leadCounts: Record<string, number> = {}
  for (const row of leadCountsRaw ?? []) {
    const p = (row as { source_platform: string }).source_platform
    leadCounts[p] = (leadCounts[p] ?? 0) + 1
  }

  const headersList = await headers()
  const host  = headersList.get('host') ?? 'appalix.ai'
  const proto = host.startsWith('localhost') ? 'http' : 'https'
  const baseUrl = `${proto}://${host}`

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Header
        title="Sources"
        description="Connect ad platforms to receive leads automatically"
      />

      <SourcesClient
        sources={sources}
        workspaceId={workspaceId}
        baseUrl={baseUrl}
        emailIntegrations={emailIntegrations}
        leadCounts={leadCounts}
      />
    </div>
  )
}
