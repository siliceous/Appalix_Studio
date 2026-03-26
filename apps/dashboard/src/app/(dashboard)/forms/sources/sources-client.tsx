'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Copy, ChevronDown, ChevronUp, ExternalLink, BookOpen, Loader2, Unplug, AlertCircle, RefreshCw } from 'lucide-react'
import { saveLeadSource, deleteLeadSource, syncFromEmailPlatform, toggleMailchimpSync } from '@/app/actions/leads'
import type { LeadAdSource, LeadAdPlatform, SageIntegration } from '@/lib/types'

// ---------------------------------------------------------------------------
// Platform definitions
// ---------------------------------------------------------------------------

interface PlatformDef {
  platform:    LeadAdPlatform
  name:        string
  description: string
  color:       string
  comingSoon?: boolean
  fields: {
    name:        string
    label:       string
    type:        'text' | 'password'
    placeholder: string
    hint:        string
  }[]
  tutorialUrl: string
}

const PLATFORMS: PlatformDef[] = [
  {
    platform:    'google_ads',
    name:        'Google Ads',
    description: 'Automatically capture leads submitted through Google Ads Lead Form Extensions.',
    color:       'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400',
    fields: [
      {
        name:        'webhook_key',
        label:       'Webhook Key',
        type:        'text',
        placeholder: 'my-google-webhook-key',
        hint:        'The key you set in Google Ads → Lead Forms → Webhook → Key',
      },
    ],
    tutorialUrl: '/resources/connect-google-ads-leads',
  },
  {
    platform:    'meta',
    name:        'Meta (Facebook & Instagram)',
    description: 'Receive leads from Facebook and Instagram Lead Ad forms in real time.',
    color:       'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400',
    fields: [
      {
        name:        'verify_token',
        label:       'Verify Token',
        type:        'text',
        placeholder: 'my_secret_verify_token',
        hint:        'A token you create and enter in Meta App → Webhooks → Callback URL',
      },
      {
        name:        'app_secret',
        label:       'App Secret',
        type:        'password',
        placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        hint:        'Found in Meta App → Settings → Basic → App Secret',
      },
      {
        name:        'page_access_token',
        label:       'Page Access Token',
        type:        'password',
        placeholder: 'EAAxxxx…',
        hint:        'Long-lived Page Access Token from your Facebook Page',
      },
    ],
    tutorialUrl: '/resources/connect-meta-leads',
  },
  {
    platform:    'linkedin',
    name:        'LinkedIn Lead Gen Forms',
    description: 'Capture leads from LinkedIn Lead Gen Forms and Sponsored Content campaigns directly into your pipeline.',
    color:       'bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/20 text-sky-700 dark:text-sky-400',
    comingSoon:  true,
    fields:      [],
    tutorialUrl: '/resources/connect-linkedin-leads',
  },
  {
    platform:    'tiktok',
    name:        'TikTok Lead Ads',
    description: 'Receive leads from TikTok Instant Forms campaigns in real time. Integrates with TikTok for Business.',
    color:       'bg-gray-50 dark:bg-gray-500/10 border-gray-200 dark:border-gray-500/20 text-gray-700 dark:text-gray-400',
    comingSoon:  true,
    fields:      [],
    tutorialUrl: '/resources/connect-tiktok-leads',
  },
  {
    platform:    'microsoft_ads',
    name:        'Microsoft Ads',
    description: 'Import leads from Microsoft Advertising Lead Extensions on Bing and the Microsoft Audience Network.',
    color:       'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-400',
    comingSoon:  true,
    fields:      [],
    tutorialUrl: '/resources/connect-microsoft-ads-leads',
  },
  {
    platform:    'calendly',
    name:        'Calendly',
    description: 'Automatically capture booking details as leads when prospects schedule a meeting via Calendly.',
    color:       'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400',
    comingSoon:  true,
    fields:      [],
    tutorialUrl: '/resources/connect-calendly',
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="8" fill="white" stroke="#E5E7EB"/>
      <path d="M29.6 20.227c0-.709-.063-1.39-.182-2.045H20v3.868h5.382a4.6 4.6 0 01-1.996 3.018v2.51h3.232C28.655 25.945 29.6 23.27 29.6 20.227z" fill="#4285F4"/>
      <path d="M20 30c2.7 0 4.964-.896 6.618-2.422l-3.232-2.51c-.895.6-2.04.955-3.386.955-2.605 0-4.81-1.76-5.595-4.126H11.064v2.59A9.996 9.996 0 0020 30z" fill="#34A853"/>
      <path d="M14.405 21.897A6.01 6.01 0 0114.09 20c0-.657.113-1.296.315-1.897v-2.59H11.064A9.996 9.996 0 0010 20c0 1.614.386 3.14 1.064 4.487l3.341-2.59z" fill="#FBBC05"/>
      <path d="M20 13.977c1.468 0 2.786.504 3.822 1.496l2.868-2.868C24.959 10.992 22.696 10 20 10a9.996 9.996 0 00-8.936 5.513l3.341 2.59C15.191 15.737 17.395 13.977 20 13.977z" fill="#EA4335"/>
    </svg>
  )
}

const PLATFORM_LOGO_IMAGES: Partial<Record<LeadAdPlatform, string>> = {
  meta:          '/integrations/meta.png',
  linkedin:      '/integrations/linkedin.png',
  tiktok:        '/integrations/tiktok.png',
  microsoft_ads: '/integrations/microsoft.png',
  calendly:      '/integrations/calendly.png',
}

function PlatformLogo({ platform, size = 40 }: { platform: LeadAdPlatform; size?: number }) {
  const sz = `w-${size/4} h-${size/4}`
  if (platform === 'google_ads') return <GoogleLogo className={sz} />
  const imgSrc = PLATFORM_LOGO_IMAGES[platform]
  if (imgSrc) {
    return (
      <div className={`w-${size/4} h-${size/4} rounded-lg bg-white dark:bg-white/8 border border-gray-100 dark:border-white/8 flex items-center justify-center overflow-hidden p-1 shrink-0`}>
        <img
          src={imgSrc}
          alt={platform}
          className="w-full h-full object-contain"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      </div>
    )
  }
  return null
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="ml-2 p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-white/8 transition-colors shrink-0"
      title="Copy"
    >
      {copied
        ? <Check className="w-3.5 h-3.5 text-emerald-500" />
        : <Copy  className="w-3.5 h-3.5 text-gray-400" />
      }
    </button>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

type EmailIntegration = Pick<SageIntegration, 'id' | 'provider' | 'status' | 'updated_at' | 'sync_enabled' | 'last_synced_at' | 'last_sync_count'>

interface SourcesClientProps {
  sources:              LeadAdSource[]
  workspaceId:          string
  baseUrl:              string
  emailIntegrations:    EmailIntegration[]
  leadCounts?:          Record<string, number>
  platformLayout?:      'stack' | 'grid-2'   // default: stack
  emailLayout?:         'stack' | 'grid-2'   // default: grid-2
  showEmailProviders?:  string[]              // if set, only show these email providers
  hideEmailHeading?:    boolean               // hide the "Email Marketing Platforms" heading
}

// ---------------------------------------------------------------------------
// Email platform section (all 5 providers)
// ---------------------------------------------------------------------------

interface EmailPlatformDef {
  provider:    string
  name:        string
  emoji:       string
  canSync:     boolean  // supports Forms pull-sync today (Mailchimp + AC only)
  tutorialUrl: string
}

const EMAIL_PLATFORMS: EmailPlatformDef[] = [
  { provider: 'mailchimp',       name: 'Mailchimp',        emoji: '/integrations/mailchimp.png',       canSync: true,  tutorialUrl: '/resources/connect-mailchimp' },
  { provider: 'activecampaign',  name: 'ActiveCampaign',   emoji: '/integrations/activecampaign.png',  canSync: true,  tutorialUrl: '/resources/connect-activecampaign' },
  { provider: 'convertkit',      name: 'Kit (ConvertKit)',  emoji: '/integrations/kit.png',             canSync: true,  tutorialUrl: '/resources/connect-convertkit' },
  { provider: 'klaviyo',         name: 'Klaviyo',           emoji: '/integrations/Klaviyo.png',         canSync: true,  tutorialUrl: '/resources/connect-klaviyo' },
  { provider: 'constantcontact', name: 'Constant Contact',  emoji: '/integrations/constantcontact.png', canSync: false, tutorialUrl: '/resources/connect-constantcontact' },
]

function openOAuthPopup(path: string, onClose: () => void) {
  const w = 600, h = 700
  const left = Math.round(window.screenX + (window.outerWidth - w) / 2)
  const top  = Math.round(window.screenY + (window.outerHeight - h) / 2)
  const popup = window.open(path, 'oauth-popup', `width=${w},height=${h},left=${left},top=${top},toolbar=0,menubar=0,location=0`)
  if (!popup) return
  const timer = setInterval(() => {
    if (popup.closed) { clearInterval(timer); onClose() }
  }, 500)
}

function EmailPlatformCard({
  def,
  integration,
}: {
  def:         EmailPlatformDef
  integration: EmailIntegration | undefined
}) {
  const router      = useRouter()
  const isConnected = !!integration
  const [syncing,     setSyncing]     = useState(false)
  const [toggling,    setToggling]    = useState(false)
  const [syncEnabled, setSyncEnabled] = useState(integration?.sync_enabled ?? false)
  const [result,      setResult]      = useState<{ synced: number; skipped: number } | null>(null)
  const [syncErr,     setSyncErr]     = useState<string | null>(null)
  const [, startTransition]           = useTransition()

  function handleSync() {
    setSyncing(true)
    setResult(null)
    setSyncErr(null)
    startTransition(async () => {
      try {
        const res = await syncFromEmailPlatform(def.provider as 'mailchimp' | 'activecampaign' | 'klaviyo' | 'convertkit')
        setResult(res)
      } catch (e) {
        setSyncErr(e instanceof Error ? e.message : 'Sync failed')
      } finally {
        setSyncing(false)
      }
    })
  }

  function handleToggleSync() {
    const next = !syncEnabled
    setSyncEnabled(next)
    setToggling(true)
    startTransition(async () => {
      try {
        await toggleMailchimpSync(next)
      } catch {
        setSyncEnabled(!next) // revert on error
      } finally {
        setToggling(false)
      }
    })
  }

  const isMailchimp = def.provider === 'mailchimp'

  return (
    <div className="bg-white dark:bg-[#232323] rounded-xl border border-gray-200 dark:border-white/8 overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-5 py-4">
        <div className="w-8 h-8 rounded-lg bg-white dark:bg-white/8 border border-gray-100 dark:border-white/8 flex items-center justify-center shrink-0 overflow-hidden p-1">
          <img src={def.emoji} alt={def.name} className="w-full h-full object-contain" />
        </div>

        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex-1">{def.name}</p>

        {isConnected && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
            Connected
          </span>
        )}

        {/* Two-way sync toggle — Mailchimp only */}
        {isConnected && isMailchimp && (
          <button
            onClick={handleToggleSync}
            disabled={toggling}
            title={syncEnabled ? 'Turn off auto-sync' : 'Turn on auto-sync'}
            className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border transition-colors ${
              syncEnabled
                ? 'border-brand-200 dark:border-[#15A4AE]/30 bg-brand-50 dark:bg-[#15A4AE]/10'
                : 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/5'
            } ${toggling ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-brand-300 dark:hover:border-[#15A4AE]/40'}`}
          >
            <span className={`text-[11px] font-medium ${syncEnabled ? 'text-brand-600 dark:text-[#15A4AE]' : 'text-gray-400 dark:text-gray-500'}`}>
              Auto Sync
            </span>
            <span className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
              syncEnabled ? 'bg-brand-600' : 'bg-gray-200 dark:bg-white/15'
            }`}>
              <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
                syncEnabled ? 'translate-x-[14px]' : 'translate-x-[2px]'
              }`} />
            </span>
          </button>
        )}

        <Link
          href={def.tutorialUrl}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8 transition-colors"
          title="Setup guide"
        >
          <BookOpen className="w-3.5 h-3.5 text-gray-400" />
        </Link>

        {isConnected ? (
          def.canSync ? (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 dark:disabled:bg-white/10 text-white disabled:text-gray-400 rounded-lg transition-colors"
            >
              {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              {syncing ? 'Syncing…' : 'Sync Now'}
            </button>
          ) : (
            <Link
              href="/sage/integrations"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Manage
            </Link>
          )
        ) : def.provider === 'mailchimp' ? (
          <button
            onClick={() => openOAuthPopup('/api/oauth/mailchimp', () => router.refresh())}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors"
          >
            Connect
          </button>
        ) : (
          <button
            onClick={() => {
              const el = document.getElementById('sage-email-marketing')
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors"
          >
            Connect in Sage ↓
          </button>
        )}
      </div>

      {/* Sync status line — Mailchimp only */}
      {isConnected && isMailchimp && (
        <div className="border-t border-gray-100 dark:border-white/6 px-5 py-2.5 text-xs text-gray-500 dark:text-gray-400">
          {syncEnabled
            ? 'Auto sync ON · Mailchimp and Appalix update every 5 mins'
            : 'Sync OFF · Changes made on Appalix will not affect Mailchimp'
          }
        </div>
      )}

      {(result || syncErr) && (
        <div className={`border-t px-5 py-3 text-xs ${syncErr ? 'border-red-100 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400' : 'border-gray-100 dark:border-white/6 bg-gray-50 dark:bg-white/2 text-gray-500 dark:text-gray-400'}`}>
          {syncErr
            ? syncErr
            : `✓ ${result!.synced} new contact${result!.synced !== 1 ? 's' : ''} imported · ${result!.skipped} duplicate${result!.skipped !== 1 ? 's' : ''} skipped`
          }
        </div>
      )}
    </div>
  )
}

export function SourcesClient({ sources: initialSources, workspaceId, baseUrl, emailIntegrations, platformLayout = 'stack', emailLayout = 'grid-2', showEmailProviders, hideEmailHeading = false }: SourcesClientProps) {
  const [sources, setSources]   = useState<LeadAdSource[]>(initialSources)
  const [expanded, setExpanded] = useState<LeadAdPlatform | null>(null)
  const [formValues, setFormValues] = useState<Record<string, Record<string, string>>>({})
  const [saving, setSaving]       = useState<LeadAdPlatform | null>(null)
  const [disconnecting, setDisc]  = useState<string | null>(null)
  const [error, setError]         = useState<string | null>(null)
  const [, startTransition]       = useTransition()

  function getConnected(platform: LeadAdPlatform) {
    return sources.find(s => s.platform === platform && s.status === 'active') ?? null
  }

  function handleFieldChange(platform: LeadAdPlatform, field: string, value: string) {
    setFormValues(prev => ({
      ...prev,
      [platform]: { ...(prev[platform] ?? {}), [field]: value },
    }))
  }

  function handleConnect(platform: LeadAdPlatform, name: string) {
    setError(null)
    const fields = formValues[platform] ?? {}
    const platformDef = PLATFORMS.find(p => p.platform === platform)!
    // Validate all fields filled
    const missing = platformDef.fields.find(f => !fields[f.name]?.trim())
    if (missing) {
      setError(`Please fill in all fields (${missing.label} is required).`)
      return
    }

    setSaving(platform)
    startTransition(async () => {
      try {
        const fd = new FormData()
        fd.set('platform', platform)
        fd.set('name', name)
        for (const [k, v] of Object.entries(fields)) fd.set(k, v)

        const saved = await saveLeadSource(fd)
        setSources(prev => {
          const without = prev.filter(s => s.platform !== platform)
          return [...without, saved]
        })
        setExpanded(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to save. Please try again.')
      } finally {
        setSaving(null)
      }
    })
  }

  function handleDisconnect(source: LeadAdSource) {
    setDisc(source.id)
    startTransition(async () => {
      await deleteLeadSource(source.id)
      setSources(prev => prev.filter(s => s.id !== source.id))
      setDisc(null)
    })
  }

  const inputCls   = 'w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#15A4AE]'
  const labelCls   = 'block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'

  const visibleEmailPlatforms = showEmailProviders
    ? EMAIL_PLATFORMS.filter(p => showEmailProviders.includes(p.provider))
    : EMAIL_PLATFORMS

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className={platformLayout === 'grid-2' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'flex flex-col gap-4'}>
      {PLATFORMS.map((def) => {
        const connected  = getConnected(def.platform)
        const isExpanded = expanded === def.platform
        const fields     = formValues[def.platform] ?? {}
        const webhookUrl = `${baseUrl}/api/webhooks/${def.platform === 'meta' ? 'meta-leads' : 'google-leads'}/${workspaceId}`

        return (
          <div
            key={def.platform}
            className="bg-white dark:bg-[#232323] rounded-xl border border-gray-200 dark:border-white/8 overflow-hidden"
          >
            {/* Card header */}
            <div className="flex items-center gap-4 p-5">
              <PlatformLogo platform={def.platform} size={40} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{def.name}</p>
                  {connected && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                      Connected
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{def.description}</p>
                {connected && (
                  <p className="text-[10px] text-gray-400 mt-1">
                    {connected.leads_count} lead{connected.leads_count !== 1 ? 's' : ''} received
                    {connected.last_lead_at && ` · Last: ${new Date(connected.last_lead_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={def.tutorialUrl}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8 transition-colors"
                  title="Setup guide"
                >
                  <BookOpen className="w-3.5 h-3.5 text-gray-400" />
                </Link>

                {def.comingSoon ? (
                  <span className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-white/8 text-gray-400 dark:text-gray-500 rounded-lg cursor-not-allowed">
                    Coming Soon
                  </span>
                ) : connected ? (
                  <button
                    onClick={() => handleDisconnect(connected)}
                    disabled={disconnecting === connected.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {disconnecting === connected.id
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Unplug  className="w-3 h-3" />
                    }
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => setExpanded(isExpanded ? null : def.platform)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {isExpanded ? 'Cancel' : 'Connect'}
                  </button>
                )}
              </div>
            </div>

            {/* Expanded form */}
            {isExpanded && !connected && !def.comingSoon && (
              <div className="border-t border-gray-100 dark:border-white/6 px-5 py-4 space-y-4 bg-gray-50 dark:bg-white/2">
                {/* Webhook URL */}
                <div>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Your Webhook URL
                  </p>
                  <div className="flex items-center gap-0 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden">
                    <p className="flex-1 px-3 py-2 text-xs font-mono text-gray-600 dark:text-gray-300 truncate">
                      {webhookUrl}
                    </p>
                    <CopyButton text={webhookUrl} />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Paste this URL into your {def.name} settings</p>
                </div>

                {/* Tutorial link */}
                <Link
                  href={def.tutorialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5 shrink-0" />
                  Step-by-step setup guide →
                </Link>

                {/* Fields */}
                {def.fields.map(field => (
                  <div key={field.name}>
                    <label className={labelCls}>{field.label}</label>
                    <input
                      type={field.type}
                      value={fields[field.name] ?? ''}
                      onChange={e => handleFieldChange(def.platform, field.name, e.target.value)}
                      placeholder={field.placeholder}
                      autoComplete="off"
                      className={inputCls}
                    />
                    <p className="text-[10px] text-gray-400 mt-1">{field.hint}</p>
                  </div>
                ))}

                <button
                  onClick={() => handleConnect(def.platform, def.name)}
                  disabled={saving === def.platform}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-medium bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 dark:disabled:bg-white/10 text-white disabled:text-gray-400 rounded-lg transition-colors"
                >
                  {saving === def.platform && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {saving === def.platform ? 'Saving…' : 'Save & Connect'}
                </button>
              </div>
            )}

            {/* Re-configure when connected */}
            {connected && isExpanded && (
              <div className="border-t border-gray-100 dark:border-white/6 px-5 py-4 space-y-4 bg-gray-50 dark:bg-white/2">
                <div>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Webhook URL</p>
                  <div className="flex items-center rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden">
                    <p className="flex-1 px-3 py-2 text-xs font-mono text-gray-600 dark:text-gray-300 truncate">{webhookUrl}</p>
                    <CopyButton text={webhookUrl} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Link
                    href={def.tutorialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5 shrink-0" />
                    Setup guide →
                  </Link>
                  <button
                    onClick={() => setExpanded(null)}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      </div>

      {/* Email marketing platforms */}
      <div className="col-span-full mt-2">
        {!hideEmailHeading && (
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">
            Email Marketing Platforms
          </p>
        )}
        <div className={emailLayout === 'grid-2' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'flex flex-col gap-4'}>
          {visibleEmailPlatforms.map(def => (
            <EmailPlatformCard
              key={def.provider}
              def={def}
              integration={emailIntegrations.find(i => i.provider === def.provider)}
            />
          ))}
        </div>
        {!hideEmailHeading && (
          <p className="text-[10px] text-gray-400 mt-3">
            Connect via <Link href="/sage/integrations" className="text-brand-400 hover:text-brand-300 transition-colors">Sage → Integrations</Link>.
            Mailchimp and ActiveCampaign support on-demand contact import into Sage Contacts.
          </p>
        )}
      </div>
    </div>
  )
}
