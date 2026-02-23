import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Plug, Plus, CheckCircle, XCircle, AlertCircle, Pencil } from 'lucide-react'
import { PLATFORM_META, formatDate } from '@/lib/utils'
import type { Metadata } from 'next'
import type { Platform, Integration } from '@/lib/types'

type IntegrationRow = Integration & { bots?: { name: string } | null }

export const metadata: Metadata = { title: 'Integrations' }

const STATUS_ICON = {
  active:   <CheckCircle className="w-4 h-4 text-green-500" />,
  inactive: <XCircle    className="w-4 h-4 text-gray-400" />,
  error:    <AlertCircle className="w-4 h-4 text-red-500" />,
}

// All supported platforms shown in the "add" grid
const AVAILABLE_PLATFORMS: { platform: Platform; desc: string }[] = [
  { platform: 'slack',              desc: 'Respond to messages in Slack channels and DMs' },
  { platform: 'google_chat',        desc: 'Answer questions in Google Chat spaces' },
  { platform: 'facebook_messenger', desc: 'Handle Messenger conversations on your Facebook page' },
  { platform: 'whatsapp',           desc: 'Chat with customers on WhatsApp Business' },
  { platform: 'wordpress',          desc: 'Embed a widget on any WordPress site' },
  { platform: 'web_widget',         desc: 'Add a chat widget to any website via script tag' },
  { platform: 'custom_api',         desc: 'Connect via REST API — build any custom integration' },
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
                  <p className="text-sm font-medium text-gray-900">{int.name}</p>
                  <p className="text-xs text-gray-400">
                    Bot: {int.bots?.name ?? '—'} · Added {formatDate(int.created_at)}
                  </p>
                  {int.last_error && (
                    <p className="text-xs text-red-500 mt-0.5">{int.last_error}</p>
                  )}
                </div>
                {STATUS_ICON[int.status]}
                <a
                  href={`/integrations/${int.id}/edit`}
                  className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Available platforms */}
      <section>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Available platforms
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {AVAILABLE_PLATFORMS.map(({ platform, desc }) => {
            const connected = connectedPlatforms.has(platform)
            return (
              <a
                key={platform}
                href={`/integrations/new?platform=${platform}`}
                className="bg-white rounded-xl border p-4 hover:shadow-sm transition-shadow group flex items-start gap-3"
              >
                <div className={`mt-0.5 px-2 py-1 rounded-md text-xs font-medium ${PLATFORM_META[platform]?.color}`}>
                  {PLATFORM_META[platform]?.label}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                </div>
                {connected ? (
                  <span className="text-xs text-green-600 font-medium shrink-0">Connected</span>
                ) : (
                  <Plug className="w-4 h-4 text-gray-300 group-hover:text-brand-500 shrink-0 transition-colors" />
                )}
              </a>
            )
          })}
        </div>
      </section>
    </div>
  )
}
