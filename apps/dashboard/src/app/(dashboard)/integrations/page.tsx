import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { Header } from '@/components/layout/header'
import { Plug, Plus } from 'lucide-react'
import { PLATFORM_META, formatDate } from '@/lib/utils'
import { IntegrationActions } from './integration-actions'
import { IntegrationsClient } from '@/app/(dashboard)/sage/integrations/integrations-client'
import { SourcesClient } from '@/app/(dashboard)/forms/sources/sources-client'
import type { Metadata } from 'next'
import type { Platform, Integration, LeadAdSource, SageIntegration } from '@/lib/types'

type IntegrationRow = Integration & { bots?: { name: string } | null }

export const metadata: Metadata = { title: 'Integrations' }

const CRM_PROVIDERS: { emoji: string; name: string; desc: string; guide: string }[] = [
  { emoji: '🔗', name: 'Zapier',     desc: 'Route leads to HubSpot, Salesforce, Google Sheets, and 6,000+ apps via a Catch Hook.',        guide: '/resources/connect-zapier' },
  { emoji: '🟠', name: 'HubSpot',    desc: 'Push captured leads directly into HubSpot contacts using a Private App token.',                 guide: '/resources/connect-hubspot' },
  { emoji: '💬', name: 'Intercom',   desc: 'Create Intercom leads instantly when a visitor shares contact details in chat.',                guide: '/resources/connect-intercom' },
  { emoji: '🔵', name: 'Zoho CRM',   desc: 'Automatically add leads to Zoho CRM using an OAuth access token.',                             guide: '/resources/connect-zoho-crm' },
  { emoji: '☁️', name: 'Salesforce',  desc: 'Create Salesforce Lead records via the REST API the moment a lead is captured.',               guide: '/resources/connect-salesforce' },
  { emoji: '📋', name: 'Monday.com', desc: 'Create Monday.com board items automatically when your bot captures a lead.',                    guide: '/resources/connect-monday' },
]

// Action label shown on each platform card / connected row
const PLATFORM_ACTION: Partial<Record<Platform, string>> = {
  wordpress:          'Download ZIP plugin',
  web_widget:         'Get embed code',
  slack:              'Connect Slack',
  google_chat:        'Connect Google Chat',
  facebook_messenger: 'Connect Facebook',
  whatsapp:           'Connect WhatsApp',
  custom_api:         'View API docs',
}

// All supported platforms shown in the "add" grid
const AVAILABLE_PLATFORMS: { platform: Platform; desc: string; guide: string }[] = [
  { platform: 'slack',              desc: 'Respond to messages in Slack channels and DMs',         guide: '/resources/connect-slack' },
  { platform: 'google_chat',        desc: 'Answer questions in Google Chat spaces',                 guide: '/resources/connect-google-chat' },
  { platform: 'facebook_messenger', desc: 'Handle Messenger conversations on your Facebook page',  guide: '/resources/connect-facebook-messenger' },
  { platform: 'whatsapp',           desc: 'Chat with customers on WhatsApp Business',              guide: '/resources/connect-whatsapp' },
  { platform: 'wordpress',          desc: 'Embed a widget on any WordPress site',                  guide: '/resources/add-wordpress-chatbot' },
  { platform: 'web_widget',         desc: 'Add a chat widget to any website via script tag',       guide: '/resources/embed-web-widget' },
  { platform: 'telegram',           desc: 'Deploy your bot on Telegram — DMs and group chats',     guide: '/resources/connect-telegram' },
  { platform: 'shopify',            desc: 'Connect to Woo, Shopify or Magento & let bot answer order, shipping & customer queries', guide: '/resources/connect-shopify' },
  { platform: 'custom_api',         desc: 'Connect via REST API — build any custom integration',   guide: '/resources/custom-api-integration' },
]

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ provider?: string; onboarding?: string; hint?: string; connected?: string; error?: string }>
}) {
  const { provider: initialProvider, onboarding, hint, connected, error } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members').select('workspace_id, role').eq('user_id', user.id).order('created_at', { ascending: true }).limit(1).single()
  const membership = membershipRaw as { workspace_id: string; role: string } | null
  if (!membership) redirect('/login')

  const EMAIL_PROVIDERS = ['mailchimp', 'activecampaign', 'convertkit', 'klaviyo', 'constantcontact'] as const

  const admin = createAdminClient()
  const [{ data: rawIntegrations }, { data: sageIntegrationsRaw }, { data: sourcesRaw }, { data: emailIntegrationsRaw }, { data: allConnectedEmailsRaw }, { data: profilesRaw }, { data: membersRaw }, { data: formIntegConfigsRaw }, { data: allConnectedRaw }] = await Promise.all([
    supabase.from('integrations').select('*, bots(name)').eq('workspace_id', membership.workspace_id).order('created_at', { ascending: false }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('sage_integrations').select('provider, status').eq('workspace_id', membership.workspace_id).eq('user_id', user.id),
    supabase.from('lead_ad_sources').select('*').eq('workspace_id', membership.workspace_id),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('sage_integrations').select('id, provider, status, updated_at, sync_enabled, last_synced_at, last_sync_count').eq('workspace_id', membership.workspace_id).eq('status', 'connected').in('provider', EMAIL_PROVIDERS),
    // All connected email integrations for this workspace (gmail + microsoft) — to show per-provider info
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('sage_integrations').select('provider, user_id, config').eq('workspace_id', membership.workspace_id).eq('status', 'connected').in('provider', ['gmail', 'microsoft']),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('user_profiles').select('user_id, first_name, last_name'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('workspace_members').select('user_id, role').eq('workspace_id', membership.workspace_id),
    // Form plugin configs — to build webhook URLs with secrets for GF/WPForms/Fluent Forms
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('sage_integrations').select('provider, config').eq('workspace_id', membership.workspace_id).eq('status', 'connected').in('provider', ['gravity_forms', 'google_forms', 'fluent_forms']),
    // All connected sage integrations — for connector name/role display
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('sage_integrations').select('provider, user_id').eq('workspace_id', membership.workspace_id).eq('status', 'connected'),
  ])
  const integrations      = (rawIntegrations ?? []) as IntegrationRow[]
  const adSources         = (sourcesRaw ?? []) as LeadAdSource[]
  const emailIntegrations = (emailIntegrationsRaw ?? []) as Pick<SageIntegration, 'id' | 'provider' | 'status' | 'updated_at' | 'sync_enabled' | 'last_synced_at' | 'last_sync_count'>[]

  const headersList = await headers()
  const host        = headersList.get('host') ?? 'appalix.ai'
  const proto       = host.startsWith('localhost') ? 'http' : 'https'
  const baseUrl     = `${proto}://${host}`

  // Build webhook URLs with secrets for GF / WPForms / Fluent Forms
  const SLUG_MAP: Record<string, string> = { gravity_forms: 'gravity-forms', fluent_forms: 'fluent-forms' }
  type FormCfgRow = { provider: string; config: Record<string, string> }
  const formWebhookUrls: Record<string, string> = {}
  for (const row of (formIntegConfigsRaw ?? []) as FormCfgRow[]) {
    const secret = row.config?.webhook_secret ?? ''
    const slug   = SLUG_MAP[row.provider] ?? row.provider
    const base   = `${baseUrl}/api/webhooks/${slug}/${membership.workspace_id}`
    formWebhookUrls[row.provider] = secret ? `${base}?secret=${encodeURIComponent(secret)}` : base
  }

  const connectedPlatforms = new Set(integrations?.map((i) => i.platform))

  const sageConnected = new Set<string>(
    (sageIntegrationsRaw ?? [])
      .filter((r: { provider: string; status: string }) => r.status === 'connected')
      .map((r: { provider: string; status: string }) => r.provider)
  )

  // Build per-provider email info map (provider → { email, userName, role })
  type ProfileRow = { user_id: string; first_name: string; last_name: string | null }
  type MemberRow  = { user_id: string; role: string }
  type EmailRow   = { provider: string; user_id: string; config: Record<string, string> }
  type ConnRow    = { provider: string; user_id: string }
  const profileMap = new Map(((profilesRaw ?? []) as ProfileRow[]).map(p => [p.user_id, p]))
  const memberMap  = new Map(((membersRaw  ?? []) as MemberRow[]).map(m => [m.user_id, m]))
  const connectedEmailInfoByProvider: Record<string, { email: string; userName: string; role: string }> = {}
  for (const row of (allConnectedEmailsRaw ?? []) as EmailRow[]) {
    const p    = profileMap.get(row.user_id)
    const m    = memberMap.get(row.user_id)
    const name = p ? [p.first_name, p.last_name].filter(Boolean).join(' ') : ''
    connectedEmailInfoByProvider[row.provider] = {
      email:    row.config.from_email ?? '',
      userName: name,
      role:     m?.role ?? '',
    }
  }

  // Build sync_enabled map for email marketing providers
  const syncEnabledByProvider: Record<string, boolean> = {}
  for (const row of emailIntegrations) {
    syncEnabledByProvider[row.provider] = row.sync_enabled ?? false
  }

  // Build connector info for all providers (name + role shown on every connected card)
  const connectedProviderInfo: Record<string, { userName: string; role: string }> = {}
  for (const row of (allConnectedRaw ?? []) as ConnRow[]) {
    const p    = profileMap.get(row.user_id)
    const m    = memberMap.get(row.user_id)
    const name = p ? [p.first_name, p.last_name].filter(Boolean).join(' ') : ''
    connectedProviderInfo[row.provider] = { userName: name, role: m?.role ?? '' }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Header
        title="Integrations"
        description="Connect your bot to a channel — Slack, WhatsApp, your website, and more"
        action={
          <a
            href="/integrations/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add integration
          </a>
        }
      />

      {/* Connected integrations */}
      {integrations && integrations.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Connected</h2>
          <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border border-[#15A4AE]/30 divide-y divide-[#15A4AE]/20">
            {integrations.map((int) => (
              <div key={int.id} className="flex items-center gap-4 px-5 py-4">
                <div className={`px-2.5 py-1 rounded-lg text-xs font-medium ${PLATFORM_META[int.platform]?.color}`}>
                  {PLATFORM_META[int.platform]?.label}
                </div>
                <div className="flex-1">
                  <a href={`/integrations/${int.id}`} className="text-sm font-medium text-gray-900 hover:text-brand-700 transition-colors">{int.name}</a>
                  <p className="text-xs text-gray-400">
                    Bot:{' '}
                    {int.bots?.name
                      ? <span>{int.bots.name}</span>
                      : <span className="text-amber-500 font-medium">No bot attached</span>
                    }
                    {' '}· Added {formatDate(int.created_at)}
                  </p>
                  {int.last_error && (
                    <p className="text-xs text-red-500 mt-0.5">{int.last_error}</p>
                  )}
                </div>
                <a
                  href={`/integrations/${int.id}`}
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors shrink-0"
                >
                  {PLATFORM_ACTION[int.platform] ?? 'Setup guide'} →
                </a>
                <IntegrationActions id={int.id} status={int.status} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Available platforms */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Available platforms
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {AVAILABLE_PLATFORMS.map(({ platform, desc, guide }) => {
            const connected = connectedPlatforms.has(platform)
            return (
              <div
                key={platform}
                className="bg-white dark:bg-[#2a2a2a] rounded-xl border border-[#15A4AE]/30 p-4 flex flex-col gap-2"
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 px-2 py-1 rounded-md text-xs font-medium shrink-0 ${PLATFORM_META[platform]?.color}`}>
                    {PLATFORM_META[platform]?.label}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border border-purple-200 dark:border-purple-500/25">Bot</span>
                      {connected && <span className="text-xs text-green-600 font-medium">Connected</span>}
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <a
                    href={`/integrations/new?platform=${platform}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors"
                  >
                    <Plug className="w-3 h-3" />
                    Connect
                  </a>
                  <a href={guide} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                    Setup guide →
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* OAuth connection feedback */}
      {connected === '1' && initialProvider && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-[#15A4AE]/10 border border-[#15A4AE]/30 text-sm text-[#2a7d6e] dark:text-[#15A4AE]">
          <span className="text-lg">✅</span>
          <span><strong className="capitalize">{initialProvider}</strong> connected successfully. You can now use it from Sage.</span>
        </div>
      )}
      {error && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-sm text-red-700 dark:text-red-400">
          <span className="text-lg">⚠️</span>
          <span>Connection failed: {decodeURIComponent(error)}. Please try again.</span>
        </div>
      )}

      {/* Email — Gmail + Microsoft, full width */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Email</h2>
        <IntegrationsClient
          connected={sageConnected}
          standalone={false}
          providers={['gmail', 'microsoft']}
          initialExpanded={initialProvider}
          onboarding={onboarding === '1'}
          loginHint={hint}
          connectedEmailInfoByProvider={connectedEmailInfoByProvider}
          connectedProviderInfo={connectedProviderInfo}
        />
      </section>

      {/* Payments — Stripe, full width */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Payments</h2>
        <IntegrationsClient
          connected={sageConnected}
          standalone={false}
          providers={['stripe']}
          connectedProviderInfo={connectedProviderInfo}
        />
      </section>

      {/* Form Lead Sources — Google Ads + Meta, Mailchimp + Klaviyo, GF/WPForms/Typeform */}
      <section id="sage-email-marketing" className="mb-8">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Form Lead Sources</h2>
        <SourcesClient
          sources={adSources}
          workspaceId={membership.workspace_id}
          baseUrl={baseUrl}
          emailIntegrations={emailIntegrations}
          platformLayout="stack"
          emailLayout="stack"
          showEmailProviders={['mailchimp']}
          hideEmailHeading
        />
        <div className="mt-4">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 px-1">Email Marketing — API Connections</p>
          <IntegrationsClient
            connected={sageConnected}
            standalone={false}
            providers={['klaviyo', 'activecampaign']}
            connectedProviderInfo={connectedProviderInfo}
            syncEnabledByProvider={syncEnabledByProvider}
          />
        </div>
        <div className="mt-4">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 px-1">Form Plugins</p>
          <IntegrationsClient
            connected={sageConnected}
            standalone={false}
            providers={['gravity_forms', 'google_forms', 'typeform', 'fluent_forms']}
            workspaceId={membership.workspace_id}
            formWebhookUrls={formWebhookUrls}
            connectedProviderInfo={connectedProviderInfo}
          />
        </div>
      </section>

      {/* Tickets — Freshdesk + Zendesk side by side */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Tickets</h2>
        <IntegrationsClient
          connected={sageConnected}
          standalone={false}
          providers={['freshdesk', 'zendesk']}
          columns={2}
          connectedProviderInfo={connectedProviderInfo}
        />
      </section>

      {/* Automation — Zapier + Make side by side */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Automation</h2>
        <IntegrationsClient
          connected={sageConnected}
          standalone={false}
          providers={['zapier', 'make']}
          columns={2}
          connectedProviderInfo={connectedProviderInfo}
        />
      </section>

      {/* CRM & Lead Capture */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">CRM &amp; Lead Capture</h2>
        <p className="text-xs text-gray-400 mb-3">Configure lead routing on any integration's settings page. Select a provider below to view the setup guide.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {CRM_PROVIDERS.map((crm) => (
            <div key={crm.name} className="bg-white dark:bg-[#2a2a2a] rounded-xl border border-[#15A4AE]/30 p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center text-base shrink-0">
                {crm.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{crm.name}</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border border-purple-200 dark:border-purple-500/25">Bot</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed mt-0.5">{crm.desc}</p>
                <a href={crm.guide} className="text-xs text-brand-600 hover:text-brand-700 font-medium mt-1.5 inline-block">
                  Setup guide →
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
