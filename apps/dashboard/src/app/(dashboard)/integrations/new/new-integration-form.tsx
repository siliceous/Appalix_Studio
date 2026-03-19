'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createIntegration } from '@/app/actions/integration'
import { PLATFORM_META } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { ChevronLeft, ExternalLink } from 'lucide-react'
import type { Platform } from '@/lib/types'
import { MetaEmbeddedSignup } from './meta-embedded-signup'

const PLATFORMS: { platform: Platform; desc: string; guide: string }[] = [
  { platform: 'web_widget',         desc: 'Embed a chat widget on any website',       guide: '/resources/embed-web-widget' },
  { platform: 'wordpress',          desc: 'Embed on a WordPress site via plugin',      guide: '/resources/add-wordpress-chatbot' },
  { platform: 'slack',              desc: 'Respond to messages in Slack channels',     guide: '/resources/connect-slack' },
  { platform: 'facebook_messenger', desc: 'Handle Messenger conversations',            guide: '/resources/connect-facebook-messenger' },
  { platform: 'whatsapp',           desc: 'Chat on WhatsApp Business',                 guide: '/resources/connect-whatsapp' },
  { platform: 'google_chat',        desc: 'Answer questions in Google Chat spaces',    guide: '/resources/connect-google-chat' },
  { platform: 'telegram',           desc: 'Chat with users on Telegram',               guide: '/resources/connect-telegram' },
  { platform: 'shopify',            desc: 'Connect a Shopify store for order & shipping support', guide: '/resources/connect-shopify' },
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
  shopify: [
    { name: 'shop_domain',   label: 'Shop domain',   placeholder: 'yourstore.myshopify.com', hint: 'Your Shopify store domain (no https://).' },
    { name: 'access_token',  label: 'Admin API access token', placeholder: 'shpat_...', hint: 'Shopify Admin → Apps → Develop apps → your app → Admin API access token.' },
  ],
  custom_api: [],
}

// Platforms that use OAuth instead of manual credential entry
const OAUTH_PLATFORMS: Partial<Record<Platform, { label: string; logo: React.ReactNode; oauthPath: string; color: string }>> = {
  slack: {
    label:     'Connect with Slack',
    oauthPath: '/api/oauth/slack',
    color:     '#4A154B',
    logo: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
      </svg>
    ),
  },
  facebook_messenger: {
    label:     'Connect with Facebook',
    oauthPath: '/api/oauth/facebook',
    color:     '#1877F2',
    logo: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  whatsapp: {
    label:     'Connect with WhatsApp',
    oauthPath: '/api/oauth/whatsapp',
    color:     '#25D366',
    logo: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
      </svg>
    ),
  },
}

export function NewIntegrationForm({
  bots,
  defaultPlatform,
  metaAppId,
}: {
  bots: { id: string; name: string }[]
  defaultPlatform: Platform
  metaAppId?: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [platform, setPlatform] = useState<Platform>(defaultPlatform)
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [integrationName, setIntegrationName] = useState('')
  const [selectedBotId, setSelectedBotId] = useState(bots[0]?.id ?? '')

  const oauthConfig = OAUTH_PLATFORMS[platform]

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
              value={integrationName}
              onChange={e => setIntegrationName(e.target.value)}
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
                value={selectedBotId}
                onChange={e => setSelectedBotId(e.target.value)}
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

        {/* OAuth platforms: show one-click connect instead of credential form */}
        {(platform === 'facebook_messenger' || platform === 'whatsapp') && metaAppId ? (
          <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-5">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Authorise access</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Click the button below to log in with Meta and connect your {platform === 'facebook_messenger' ? 'Facebook Page' : 'WhatsApp Business account'} — no tokens to copy.
            </p>
            {integrationName && bots.length > 0 ? (
              <MetaEmbeddedSignup
                platform={platform}
                name={integrationName}
                botId={selectedBotId}
                appId={metaAppId}
              />
            ) : (
              <p className="text-xs text-amber-500">
                {bots.length === 0 ? 'Create a bot first.' : 'Enter an integration name above to continue.'}
              </p>
            )}
          </div>
        ) : oauthConfig ? (
          <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-5">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Authorise access</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Click the button below. You&apos;ll be taken to {PLATFORM_META[platform]?.label} to approve access — no tokens to copy.
            </p>
            <a
              href={
                bots.length > 0 && integrationName
                  ? `${oauthConfig.oauthPath}?name=${encodeURIComponent(integrationName)}&bot_id=${encodeURIComponent(selectedBotId)}`
                  : '#'
              }
              onClick={e => { if (!integrationName || bots.length === 0) e.preventDefault() }}
              style={integrationName && bots.length > 0 ? { backgroundColor: oauthConfig.color } : undefined}
              className={cn(
                'inline-flex items-center gap-2.5 px-5 py-2.5 rounded-lg text-sm font-semibold transition-opacity',
                integrationName && bots.length > 0
                  ? 'text-white hover:opacity-90'
                  : 'bg-gray-200 dark:bg-white/10 text-gray-400 cursor-not-allowed',
              )}
            >
              {oauthConfig.logo}
              {oauthConfig.label}
            </a>
            {(!integrationName || bots.length === 0) && (
              <p className="text-xs text-amber-500 mt-2">
                {bots.length === 0 ? 'Create a bot first.' : 'Enter an integration name above to continue.'}
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Manual credential fields */}
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
          </>
        )}
      </form>
    </div>
  )
}
