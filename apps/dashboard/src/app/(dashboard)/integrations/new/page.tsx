import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { PLATFORM_META } from '@/lib/utils'
import { createIntegration } from '@/app/actions/integration'
import type { Metadata } from 'next'
import type { Platform } from '@/lib/types'

export const metadata: Metadata = { title: 'Add integration' }

const PLATFORMS: { platform: Platform; desc: string }[] = [
  { platform: 'web_widget',         desc: 'Embed a chat widget on any website' },
  { platform: 'custom_api',        desc: 'Connect via REST API with an API key' },
  { platform: 'slack',             desc: 'Respond to messages in Slack' },
  { platform: 'wordpress',         desc: 'Embed on a WordPress site' },
  { platform: 'facebook_messenger',desc: 'Handle Messenger conversations' },
  { platform: 'whatsapp',          desc: 'Chat on WhatsApp Business' },
  { platform: 'google_chat',       desc: 'Answer questions in Google Chat' },
]

export default async function NewIntegrationPage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string }>
}) {
  const { platform: qp } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user.id).limit(1).single()
  const membership = membershipRaw as { workspace_id: string } | null
  if (!membership) redirect('/login')

  const { data: rawBots } = await supabase
    .from('bots')
    .select('id, name')
    .eq('workspace_id', membership.workspace_id)
    .order('created_at', { ascending: false })
  const bots = (rawBots ?? []) as { id: string; name: string }[]

  const selected = (PLATFORMS.find((p) => p.platform === qp)?.platform ?? 'web_widget') as Platform

  return (
    <div className="max-w-2xl">
      <Header title="Add integration" description="Connect your bot to a messaging platform" />

      <form action={createIntegration} className="space-y-6">
        {/* Platform selector */}
        <div className="bg-white rounded-xl border p-5">
          <label className="block text-sm font-semibold text-gray-900 mb-3">Platform</label>
          <div className="grid grid-cols-2 gap-2">
            {PLATFORMS.map(({ platform, desc }) => (
              <label
                key={platform}
                className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 hover:bg-gray-50 transition-colors"
              >
                <input
                  type="radio"
                  name="platform"
                  value={platform}
                  defaultChecked={platform === selected}
                  className="mt-0.5 accent-brand-600"
                />
                <div>
                  <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-1 ${PLATFORM_META[platform]?.color}`}>
                    {PLATFORM_META[platform]?.label}
                  </span>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Common fields */}
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Integration name</label>
            <input
              type="text"
              name="name"
              placeholder="e.g. Website Chat Widget"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Connect to bot</label>
            <select
              name="bot_id"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              <option value="">— no bot selected —</option>
              {bots?.map((bot) => (
                <option key={bot.id} value={bot.id}>{bot.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Web widget config */}
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm font-semibold text-gray-900 mb-3">Platform config</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Allowed origins <span className="text-gray-400 font-normal">(web widget)</span>
            </label>
            <input
              type="text"
              name="allowed_origins"
              defaultValue="*"
              placeholder="* or https://yourdomain.com, https://other.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Use <code className="font-mono bg-gray-100 px-1 rounded">*</code> to allow all origins (local dev only).
              For other platforms, credentials are stored securely.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Bot token <span className="text-gray-400 font-normal">(Slack)</span>
              </label>
              <input type="text" name="bot_token" placeholder="xoxb-..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Signing secret <span className="text-gray-400 font-normal">(Slack)</span>
              </label>
              <input type="text" name="signing_secret" placeholder="abc123..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Site URL <span className="text-gray-400 font-normal">(WordPress)</span>
              </label>
              <input type="url" name="site_url" placeholder="https://yoursite.com" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Page access token <span className="text-gray-400 font-normal">(Facebook)</span>
              </label>
              <input type="text" name="page_access_token" placeholder="EAAxx..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Create integration
          </button>
          <a href="/integrations" className="px-5 py-2.5 text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Cancel
          </a>
        </div>
      </form>
    </div>
  )
}
