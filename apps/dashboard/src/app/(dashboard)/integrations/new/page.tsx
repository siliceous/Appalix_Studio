import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { createIntegration } from '@/app/actions/integration'
import { PlatformSelector } from './platform-selector'
import { SubmitButton } from '@/components/ui/submit-button'
import type { Metadata } from 'next'
import type { Platform } from '@/lib/types'

export const metadata: Metadata = { title: 'Add integration' }

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
    .from('workspace_members').select('workspace_id').eq('user_id', user.id).order('created_at', { ascending: true }).limit(1).single()
  const membership = membershipRaw as { workspace_id: string } | null
  if (!membership) redirect('/login')

  const { data: rawBots } = await supabase
    .from('bots')
    .select('id, name')
    .eq('workspace_id', membership.workspace_id)
    .order('created_at', { ascending: false })
  const bots = (rawBots ?? []) as { id: string; name: string }[]

  const validPlatforms = ['web_widget','custom_api','slack','wordpress','facebook_messenger','whatsapp','google_chat','telegram']
  const selected = (validPlatforms.includes(qp ?? '') ? qp : 'web_widget') as Platform

  return (
    <div className="max-w-2xl mx-auto">
      <Header title="Add integration" description="Connect your bot to a messaging platform" />

      <form action={createIntegration} className="space-y-6">
        {/* Platform selector */}
        <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-5">
          <label className="block text-sm font-semibold text-gray-900 mb-3">Platform</label>
          <PlatformSelector defaultPlatform={selected} />
        </div>

        {/* Common fields */}
        <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-5 space-y-4">
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
        <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-5">
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
                API Key <span className="text-gray-400 font-normal">(WordPress — leave blank to auto-generate)</span>
              </label>
              <input type="text" name="api_key" placeholder="Auto-generated if left blank" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Page access token <span className="text-gray-400 font-normal">(Facebook)</span>
              </label>
              <input type="text" name="page_access_token" placeholder="EAAxx..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Bot token <span className="text-gray-400 font-normal">(Telegram — from @BotFather)</span>
              </label>
              <input type="text" name="telegram_bot_token" placeholder="7412345678:AAF..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Webhook secret <span className="text-gray-400 font-normal">(Telegram — leave blank to auto-generate)</span>
              </label>
              <input type="text" name="telegram_webhook_secret" placeholder="Auto-generated if left blank" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <SubmitButton
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Create integration
          </SubmitButton>
          <a href="/integrations" className="px-5 py-2.5 text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Cancel
          </a>
        </div>
      </form>
    </div>
  )
}
