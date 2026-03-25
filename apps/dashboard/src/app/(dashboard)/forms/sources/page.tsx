import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { Header } from '@/components/layout/header'
import { SourcesClient } from './sources-client'
import { IntegrationsClient } from '@/app/(dashboard)/sage/integrations/integrations-client'
import type { WorkspaceMember, LeadAdSource, SageIntegration } from '@/lib/types'

const EMAIL_PROVIDERS = ['mailchimp', 'activecampaign', 'convertkit', 'klaviyo', 'constantcontact'] as const
const SYNC_PROVIDERS  = ['mailchimp', 'activecampaign', 'klaviyo', 'convertkit'] as const
const FORM_PROVIDERS  = ['gravity_forms', 'google_forms', 'typeform', 'fluent_forms'] as const

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

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = admin as any

  const [
    { data: sourcesRaw },
    { data: emailIntegrationsRaw },
    { data: leadCountsRaw },
    { data: formIntegrationsRaw },
  ] = await Promise.all([
    supabase
      .from('lead_ad_sources')
      .select('*')
      .eq('workspace_id', workspaceId),
    supabase
      .from('sage_integrations')
      .select('id, provider, status, updated_at, sync_enabled, last_synced_at, last_sync_count')
      .eq('workspace_id', workspaceId)
      .eq('status', 'connected')
      .in('provider', EMAIL_PROVIDERS),
    supabase
      .from('leads')
      .select('source_platform')
      .eq('workspace_id', workspaceId)
      .in('source_platform', SYNC_PROVIDERS),
    a
      .from('sage_integrations')
      .select('provider, status, config')
      .eq('workspace_id', workspaceId)
      .eq('status', 'connected')
      .in('provider', FORM_PROVIDERS),
  ])

  const sources           = (sourcesRaw ?? []) as LeadAdSource[]
  const emailIntegrations = (emailIntegrationsRaw ?? []) as Pick<SageIntegration, 'id' | 'provider' | 'status' | 'updated_at' | 'sync_enabled' | 'last_synced_at' | 'last_sync_count'>[]

  type FormRow = { provider: string; status: string; config: Record<string, string> }
  const formRows      = (formIntegrationsRaw ?? []) as FormRow[]
  const formConnected = new Set<string>(formRows.filter(r => r.status === 'connected').map(r => r.provider))

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

  // Build webhook URLs with secrets for GF / WPForms
  const formWebhookUrls: Record<string, string> = {}
  const SLUG_MAP: Record<string, string> = { gravity_forms: 'gravity-forms', fluent_forms: 'fluent-forms' }
  for (const row of formRows) {
    if (row.provider === 'gravity_forms' || row.provider === 'google_forms' || row.provider === 'fluent_forms') {
      const secret = row.config?.webhook_secret ?? ''
      const slug   = SLUG_MAP[row.provider] ?? row.provider
      const base   = `${baseUrl}/api/webhooks/${slug}/${workspaceId}`
      formWebhookUrls[row.provider] = secret ? `${base}?secret=${encodeURIComponent(secret)}` : base
    }
  }

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
        emailLayout="stack"
      />

      <div className="mt-8">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">
          Form Plugins
        </p>
        <IntegrationsClient
          connected={formConnected}
          standalone={false}
          providers={['gravity_forms', 'google_forms', 'typeform', 'fluent_forms']}
          workspaceId={workspaceId}
          formWebhookUrls={formWebhookUrls}
        />
      </div>
    </div>
  )
}
