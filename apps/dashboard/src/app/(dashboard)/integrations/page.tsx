import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Plug, Plus } from 'lucide-react'
import { PLATFORM_META, formatDate } from '@/lib/utils'
import { IntegrationActions } from './integration-actions'
import type { Metadata } from 'next'
import type { Platform, Integration } from '@/lib/types'

type IntegrationRow = Integration & { bots?: { name: string } | null }

export const metadata: Metadata = { title: 'Integrations' }

const CRM_PROVIDERS: { emoji: string; name: string; desc: string; guide: string }[] = [
  { emoji: '🔗', name: 'Zapier',     desc: 'Route leads to HubSpot, Salesforce, Google Sheets, and 6,000+ apps via a Catch Hook.',        guide: '/resources/connect-zapier' },
  { emoji: '🟠', name: 'HubSpot',    desc: 'Push captured leads directly into HubSpot contacts using a Private App token.',                 guide: '/resources/connect-hubspot' },
  { emoji: '💬', name: 'Intercom',   desc: 'Create Intercom leads instantly when a visitor shares contact details in chat.',                guide: '/resources/connect-intercom' },
  { emoji: '🔵', name: 'Zoho CRM',   desc: 'Automatically add leads to Zoho CRM using an OAuth access token.',                             guide: '/resources/connect-zoho-crm' },
  { emoji: '☁️', name: 'Salesforce', desc: 'Create Salesforce Lead records via the REST API the moment a lead is captured.',               guide: '/resources/connect-salesforce' },
]

// All supported platforms shown in the "add" grid
const AVAILABLE_PLATFORMS: { platform: Platform; desc: string; guide: string }[] = [
  { platform: 'slack',              desc: 'Respond to messages in Slack channels and DMs',         guide: '/resources/connect-slack' },
  { platform: 'google_chat',        desc: 'Answer questions in Google Chat spaces',                 guide: '/resources/connect-google-chat' },
  { platform: 'facebook_messenger', desc: 'Handle Messenger conversations on your Facebook page',  guide: '/resources/connect-facebook-messenger' },
  { platform: 'whatsapp',           desc: 'Chat with customers on WhatsApp Business',              guide: '/resources/connect-whatsapp' },
  { platform: 'wordpress',          desc: 'Embed a widget on any WordPress site',                  guide: '/resources/add-wordpress-chatbot' },
  { platform: 'web_widget',         desc: 'Add a chat widget to any website via script tag',       guide: '/resources/embed-web-widget' },
  { platform: 'custom_api',         desc: 'Connect via REST API — build any custom integration',   guide: '/resources/custom-api-integration' },
]

export default async function IntegrationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user.id).limit(1).single()
  const membership = membershipRaw as { workspace_id: string } | null
  if (!membership) redirect('/login')

  const { data: rawIntegrations } = await supabase
    .from('integrations')
    .select('*, bots(name)')
    .eq('workspace_id', membership.workspace_id)
    .order('created_at', { ascending: false })
  const integrations = (rawIntegrations ?? []) as IntegrationRow[]

  const connectedPlatforms = new Set(integrations?.map((i) => i.platform))

  return (
    <div>
      <Header
        title="Integrations"
        description="Connect your bots to messaging platforms"
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
          <div className="bg-white rounded-xl border divide-y">
            {integrations.map((int) => (
              <div key={int.id} className="flex items-center gap-4 px-5 py-4">
                <div className={`px-2.5 py-1 rounded-lg text-xs font-medium ${PLATFORM_META[int.platform]?.color}`}>
                  {PLATFORM_META[int.platform]?.label}
                </div>
                <div className="flex-1">
                  <a href={`/integrations/${int.id}`} className="text-sm font-medium text-gray-900 hover:text-brand-700 transition-colors">{int.name}</a>
                  <p className="text-xs text-gray-400">
                    Bot: {int.bots?.name ?? '—'} · Added {formatDate(int.created_at)}
                  </p>
                  {int.last_error && (
                    <p className="text-xs text-red-500 mt-0.5">{int.last_error}</p>
                  )}
                </div>
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
                className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-4 flex flex-col gap-2"
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 px-2 py-1 rounded-md text-xs font-medium shrink-0 ${PLATFORM_META[platform]?.color}`}>
                    {PLATFORM_META[platform]?.label}
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed flex-1">{desc}</p>
                  {connected && (
                    <span className="text-xs text-green-600 font-medium shrink-0">Connected</span>
                  )}
                </div>
                <div className="flex items-center gap-4 pt-1">
                  <a
                    href={`/integrations/new?platform=${platform}`}
                    className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors"
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

      {/* CRM & lead capture */}
      <section>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">CRM &amp; lead capture</h2>
        <p className="text-xs text-gray-400 mb-3">Configure lead routing on any integration's settings page. Select a provider below to view the setup guide.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {CRM_PROVIDERS.map((crm) => (
            <div key={crm.name} className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center text-base shrink-0">
                {crm.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{crm.name}</p>
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
