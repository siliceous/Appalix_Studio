'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createIntegration } from '@/app/actions/integration'
import { PLATFORM_META } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { ChevronLeft, ExternalLink } from 'lucide-react'
import type { Platform } from '@/lib/types'

const PLATFORMS: { platform: Platform; desc: string; guide: string }[] = [
  { platform: 'web_widget',         desc: 'Embed a chat widget on any website',       guide: '/resources/embed-web-widget' },
  { platform: 'wordpress',          desc: 'Embed on a WordPress site via plugin',      guide: '/resources/add-wordpress-chatbot' },
  { platform: 'slack',              desc: 'Respond to messages in Slack channels',     guide: '/resources/connect-slack' },
  { platform: 'facebook_messenger', desc: 'Handle Messenger conversations',            guide: '/resources/connect-facebook-messenger' },
  { platform: 'whatsapp',           desc: 'Chat on WhatsApp Business',                 guide: '/resources/connect-whatsapp' },
  { platform: 'google_chat',        desc: 'Answer questions in Google Chat spaces',    guide: '/resources/connect-google-chat' },
  { platform: 'telegram',           desc: 'Chat with users on Telegram',               guide: '/resources/connect-telegram' },
  { platform: 'custom_api',         desc: 'Connect via REST API with an API key',      guide: '/resources/custom-api-integration' },
]

interface FieldConfig {
  name: string
  label: string
  placeholder: string
  type?: string
  hint?: string
  optional?: boolean
}

const PLATFORM_FIELDS: Partial<Record<Platform, FieldConfig[]>> = {
  web_widget: [
    { name: 'allowed_origins', label: 'Allowed origins', placeholder: '* or https://yourdomain.com', hint: 'Use * to allow all origins (fine for local dev). In production enter your domain.' },
  ],
  slack: [
    { name: 'bot_token',      label: 'Bot token',      placeholder: 'xoxb-...', hint: 'Slack app → OAuth & Permissions.' },
    { name: 'signing_secret', label: 'Signing secret', placeholder: 'abc123...', hint: 'Slack app → Basic Information.' },
  ],
  wordpress: [
    { name: 'site_url', label: 'WordPress site URL', placeholder: 'https://yoursite.com', type: 'url', hint: 'Root URL of your WordPress site.' },
    { name: 'api_key',  label: 'API key', placeholder: 'Auto-generated if left blank', optional: true, hint: 'Leave blank to auto-generate. Paste into the plugin settings.' },
  ],
  facebook_messenger: [
    { name: 'page_access_token', label: 'Page access token', placeholder: 'EAAxx...', hint: 'Meta for Developers → your app → Messenger → Settings.' },
    { name: 'verify_token',      label: 'Verify token',      placeholder: 'any secret string', hint: 'A string you choose — enter the same value in the Meta webhook setup.' },
    { name: 'app_secret',        label: 'App secret',        placeholder: 'abc123...', hint: 'Meta for Developers → your app → Basic Settings.' },
  ],
  whatsapp: [
    { name: 'access_token',    label: 'Access token',    placeholder: 'EAAxx...', hint: 'Meta for Developers → WhatsApp → API Setup.' },
    { name: 'phone_number_id', label: 'Phone number ID', placeholder: '1234567890', hint: 'Meta for Developers → WhatsApp → API Setup.' },
    { name: 'verify_token',    label: 'Verify token',    placeholder: 'any secret string', optional: true, hint: 'A string you choose for webhook verification.' },
  ],
  google_chat: [
    { name: 'service_account_json', label: 'Service account key (JSON)', placeholder: '{"type":"service_account",...}', hint: 'Paste the full JSON from your Google Cloud service account.' },
    { name: 'space_name',           label: 'Space name (optional)',       placeholder: 'spaces/XXXXXX', optional: true, hint: 'Restrict the bot to a specific Chat space.' },
  ],
  telegram: [
    { name: 'telegram_bot_token',       label: 'Bot token',      placeholder: '7412345678:AAF...', hint: 'Get from @BotFather on Telegram.' },
    { name: 'telegram_webhook_secret',  label: 'Webhook secret', placeholder: 'Auto-generated if left blank', optional: true, hint: 'Leave blank to auto-generate.' },
  ],
  custom_api: [],
}

export function NewIntegrationForm({
  bots,
  defaultPlatform,
}: {
  bots: { id: string; name: string }[]
  defaultPlatform: Platform
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [platform, setPlatform] = useState<Platform>(defaultPlatform)
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})

  const platformFields = PLATFORM_FIELDS[platform] ?? []
  const guideUrl = PLATFORMS.find(p => p.platform === platform)?.guide

  function setField(name: string, value: string) {
    setFieldValues(prev => ({ ...prev, [name]: value }))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const raw = new FormData(e.currentTarget)
    // Ensure platform from state (not the radio group name we used for UI)
    raw.set('platform', platform)
    // Inject field values managed by state (platform-specific fields)
    for (const [k, v] of Object.entries(fieldValues)) {
      raw.set(k, v)
    }
    startTransition(() => createIntegration(raw))
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mb-4 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Back
        </button>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Add integration</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Connect your bot to a channel or platform.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Platform picker */}
        <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-5">
          <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Choose platform</label>
          <div className="grid grid-cols-2 gap-2">
            {PLATFORMS.map(({ platform: p, desc }) => (
              <label
                key={p}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  platform === p
                    ? 'bg-brand-50 border-brand-400 dark:bg-brand-900/40 dark:border-brand-400/60'
                    : 'border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5',
                )}
              >
                <input
                  type="radio"
                  checked={platform === p}
                  onChange={() => { setPlatform(p); setFieldValues({}) }}
                  className="mt-0.5 accent-brand-600"
                />
                <div>
                  <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-1 ${PLATFORM_META[p]?.color}`}>
                    {PLATFORM_META[p]?.label}
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Name + bot */}
        <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Integration name</label>
            <input
              required
              name="name"
              placeholder="e.g. Website Chat, Support Slack"
              className="w-full px-3 py-2 border dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bot</label>
            {bots.length === 0 ? (
              <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  No bots yet. <a href="/bots/new" className="underline font-medium">Create a bot first →</a>
                </p>
              </div>
            ) : (
              <select
                name="bot_id"
                className="w-full px-3 py-2 border dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-[#2a2a2a]"
              >
                <option value="">— select a bot —</option>
                {bots.map(bot => (
                  <option key={bot.id} value={bot.id}>{bot.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Platform-specific credential fields */}
        {platformFields.length > 0 && (
          <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Credentials</p>
              {guideUrl && (
                <a href={guideUrl} className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium">
                  Where do I find these? <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            {platformFields.map(field => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {field.label}
                  {field.optional && <span className="ml-1 text-xs font-normal text-gray-400">(optional)</span>}
                </label>
                <input
                  type={field.type ?? 'text'}
                  value={fieldValues[field.name] ?? ''}
                  onChange={e => setField(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 border dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono dark:bg-transparent"
                />
                {field.hint && <p className="text-xs text-gray-400 mt-1">{field.hint}</p>}
              </div>
            ))}
          </div>
        )}

        {platform === 'custom_api' && (
          <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-5">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Custom API</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              An API key will be auto-generated after you create this integration.{' '}
              {guideUrl && <a href={guideUrl} className="text-brand-600 hover:underline">View API docs →</a>}
            </p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending || bots.length === 0}
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isPending ? 'Creating…' : 'Create integration'}
          </button>
          <button type="button" onClick={() => router.back()} className="px-5 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
