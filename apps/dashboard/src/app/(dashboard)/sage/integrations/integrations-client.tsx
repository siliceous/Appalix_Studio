'use client'

import { useState, useTransition, useRef } from 'react'
import Link from 'next/link'
import { Check, ExternalLink, Loader2, ChevronDown, ChevronUp, BookOpen, FileSignature, Bold, Italic, Underline, ImagePlus, CheckCircle2, RefreshCw } from 'lucide-react'
import { saveSageIntegration, disconnectSageIntegration, connectFormIntegration, disconnectFormIntegration, sendTestFormWebhook } from '@/app/actions/sage'
import { syncFromEmailPlatform, toggleEmailPlatformSync } from '@/app/actions/leads'
import { saveEmailSignature, getEmailSignature } from '@/app/actions/sage-emails'
import type { SageIntegrationProvider } from '@/lib/types'

interface IntegrationCard {
  provider:     SageIntegrationProvider
  name:         string
  description:  string
  logo:         string
  category:     'automation' | 'email' | 'tickets' | 'payments' | 'email_marketing' | 'forms' | 'lead_ads'
  fields:       Array<{ name: string; label: string; type: string; placeholder: string; hint?: string; optional?: boolean }>
  docsUrl?:      string
  tutorialUrl?:  string
  oauthPath?:    string   // e.g. '/api/oauth/google' — if set, OAuth button replaces text fields
  webhookPath?:  string   // e.g. '/api/webhooks/typeform' — shown after connecting
  canSync?:      boolean  // shows Sync Now button when connected
  comingSoon?:   boolean  // shows Coming Soon badge, disables connect
}

const INTEGRATIONS: IntegrationCard[] = [
  {
    provider:    'stripe',
    name:        'Stripe',
    description: 'Create and send invoices directly from deals. Stripe handles payment collection, receipts, and status tracking.',
    logo:        '__stripe__',
    category:    'payments',
    fields:      [],
    oauthPath:   '/api/oauth/stripe',
    tutorialUrl: '/resources/connect-sage-stripe',
  },
  {
    provider:    'zapier',
    name:        'Zapier',
    description: 'Send Sage events (lead captured, deal created, stage changed) to 6,000+ apps via Zapier webhooks.',
    logo:        '/integrations/zapier.png',
    category:    'automation',
    fields: [
      { name: 'webhook_url', label: 'Webhook URL', type: 'url', placeholder: 'https://hooks.zapier.com/…', hint: 'Create a "Catch Hook" trigger in Zapier and paste the URL here' },
    ],
    docsUrl:     'https://zapier.com/apps/webhook',
    tutorialUrl: '/resources/connect-sage-zapier',
  },
  {
    provider:    'make',
    name:        'Make (Integromat)',
    description: 'Trigger Make scenarios when Sage events fire — leads captured, deals updated, tickets created, and more.',
    logo:        '/integrations/make.png',
    category:    'automation',
    fields: [
      { name: 'webhook_url', label: 'Webhook URL', type: 'url', placeholder: 'https://hook.eu1.make.com/…', hint: 'Create a "Custom webhook" module in Make and paste the URL here' },
    ],
    docsUrl:     'https://www.make.com/en/help/tools/webhooks',
    tutorialUrl: '/resources/connect-sage-make',
  },
  {
    provider:    'gmail',
    name:        'Gmail',
    description: 'Connect your Gmail account via Google Sign-In. Emails are synced automatically and sent from your address.',
    logo:        '/integrations/gmail.png',
    category:    'email',
    fields:      [],
    oauthPath:   '/api/oauth/google',
    tutorialUrl: '/resources/connect-sage-gmail',
  },
  {
    provider:    'microsoft',
    name:        'Microsoft / Outlook',
    description: 'Connect your Outlook or Office 365 account via Microsoft Sign-In. Emails are synced automatically.',
    logo:        '/integrations/outlook.png',
    category:    'email',
    fields:      [],
    oauthPath:   '/api/oauth/microsoft',
    tutorialUrl: '/resources/connect-sage-microsoft',
  },
  {
    provider:    'freshdesk',
    name:        'Freshdesk',
    description: 'Create Freshdesk tickets directly from Sage and sync ticket status back to the activity timeline. Free tier available.',
    logo:        '/integrations/freshdesk.png',
    category:    'tickets',
    fields: [
      { name: 'domain',  label: 'Domain',  type: 'text',     placeholder: 'yourcompany.freshdesk.com' },
      { name: 'api_key', label: 'API Key', type: 'password', placeholder: 'Your Freshdesk API key', hint: 'Found in Freshdesk → Profile Settings → Your API Key' },
    ],
    docsUrl:     'https://support.freshdesk.com/support/solutions/articles/215517',
    tutorialUrl: '/resources/connect-sage-freshdesk',
  },
  {
    provider:    'zendesk',
    name:        'Zendesk',
    description: 'Create Zendesk tickets from Sage records and sync status updates to the activity timeline.',
    logo:        '/integrations/zendesk.png',
    category:    'tickets',
    fields: [
      { name: 'subdomain', label: 'Subdomain', type: 'text',     placeholder: 'yourcompany (from yourcompany.zendesk.com)' },
      { name: 'email',     label: 'Email',     type: 'email',    placeholder: 'agent@yourcompany.com' },
      { name: 'api_token', label: 'API Token', type: 'password', placeholder: 'Your Zendesk API token', hint: 'Found in Zendesk Admin → Channels → API → API token' },
    ],
    docsUrl:     'https://support.zendesk.com/hc/en-us/articles/4408889192858',
    tutorialUrl: '/resources/connect-sage-zendesk',
  },
  // ── Forms ─────────────────────────────────────────────────────────────────
  {
    provider:    'gravity_forms',
    name:        'Gravity Forms',
    description: 'Receive form submissions from Gravity Forms on your WordPress site. Add the Webhooks Add-On and point it at your Sage webhook URL.',
    logo:        '/integrations/gravity-forms.png',
    category:    'forms',
    fields: [
      { name: 'webhook_secret', label: 'Webhook Secret', type: 'password', placeholder: 'Optional — leave blank to skip verification', hint: 'If set, your webhook URL will include ?secret=… automatically. Leave blank if you just want the plain URL.', optional: true },
    ],
    docsUrl:      'https://docs.gravityforms.com/webhooks/',
    webhookPath:  '/api/webhooks/gravity-forms',
  },
  {
    provider:    'google_forms',
    name:        'Google Forms',
    description: 'Receive Google Form submissions instantly via a one-time Apps Script setup. No paid add-ons required.',
    logo:        '/integrations/google-forms.png',
    category:    'forms',
    fields: [
      { name: 'webhook_secret', label: 'Webhook Secret', type: 'password', placeholder: 'Optional — leave blank to skip verification', hint: 'If set, your webhook URL will include ?secret=… automatically. Leave blank if you just want the plain URL.', optional: true },
    ],
    docsUrl:      'https://developers.google.com/apps-script/guides/triggers/events#form-submit',
    webhookPath:  '/api/webhooks/google-forms',
  },
  {
    provider:    'typeform',
    name:        'Typeform',
    description: 'Stream Typeform responses into your Forms section in real time. Sage connects via Typeform webhooks using your personal access token.',
    logo:        '__typeform__',
    category:    'forms',
    fields: [
      { name: 'access_token', label: 'Personal Access Token', type: 'password', placeholder: 'tfp_…', hint: 'Found in Typeform → Account → Personal tokens → Create a new token' },
      { name: 'form_id',      label: 'Form URL',    type: 'text',     placeholder: 'https://form.typeform.com/to/…', hint: 'Copy the full URL from your browser when viewing the form' },
    ],
    docsUrl:      'https://www.typeform.com/developers/webhooks/',
    webhookPath:  '/api/webhooks/typeform',
  },
  {
    provider:    'fluent_forms',
    name:        'Fluent Forms',
    description: 'Push Fluent Forms submissions directly into Sage for AI analysis and lead management. Uses the Fluent Forms Webhook feed.',
    logo:        '/integrations/fluent-forms.png',
    category:    'forms',
    fields: [
      { name: 'webhook_secret', label: 'Webhook Secret', type: 'password', placeholder: 'Optional — leave blank to skip verification', hint: 'If set, your webhook URL will include ?secret=… automatically. Leave blank if you just want the plain URL.', optional: true },
    ],
    docsUrl:     'https://fluentforms.com/docs/webhooks/',
    webhookPath: '/api/webhooks/fluent-forms',
  },
  {
    provider:    'clickfunnels',
    name:        'ClickFunnels',
    description: 'Capture opt-in and purchase leads from ClickFunnels funnels.',
    logo:        '/integrations/clickfunnels.png',
    category:    'forms',
    fields:      [
      { name: 'webhook_secret', label: 'Webhook Secret', type: 'password' as const, placeholder: 'Optional — paste after creating the endpoint in CF', hint: 'After creating the endpoint in ClickFunnels you can copy the secret shown there and paste it here to enable signature verification.', optional: true },
    ],
    docsUrl:     'https://help.clickfunnels.com/hc/en-us/articles/360015067852',
    webhookPath: '/api/webhooks/clickfunnels',
  },
  {
    provider:    'webflow',
    name:        'Webflow',
    description: 'Receive form submissions from any Webflow site in real time. Configure the webhook in Webflow → Site Settings → Apps & Integrations.',
    logo:        '/integrations/webflow.png',
    category:    'forms',
    fields:      [],
    docsUrl:     'https://developers.webflow.com/data/docs/webhooks',
    webhookPath: '/api/webhooks/webflow',
  },
  {
    provider:    'wordpress_forms',
    name:        'WordPress Forms',
    description: 'Works with Contact Form 7, Elementor Forms, WPForms, Gravity Forms, Ninja Forms, and Formidable Forms. Install the Appalix plugin — no webhook config needed.',
    logo:        '/integrations/wordpress.png',
    category:    'forms',
    fields:      [],
    docsUrl:     'https://appalix.ai/resources/connect-wordpress-forms',
    webhookPath: '/api/webhooks/wordpress-forms',
  },
  // ── Email Marketing ───────────────────────────────────────────────────────
  {
    provider:    'mailchimp',
    name:        'Mailchimp',
    description: 'Sync contacts to Mailchimp audiences automatically and pull lead form data into your Forms section for AI analysis.',
    logo:        '/integrations/mailchimp.png',
    category:    'email_marketing',
    fields:      [],
    oauthPath:   '/api/oauth/mailchimp',
    docsUrl:     'https://mailchimp.com/developer/marketing/guides/quick-start/',
    tutorialUrl: '/resources/connect-sage-mailchimp',
  },
  {
    provider:    'activecampaign',
    name:        'ActiveCampaign',
    description: 'Push contacts to ActiveCampaign lists and trigger automations. Pull existing contacts into Forms for AI lead analysis.',
    logo:        '/integrations/activecampaign.png',
    category:    'email_marketing',
    fields: [
      { name: 'api_url', label: 'API URL',  type: 'url',      placeholder: 'https://youraccountname.api-us1.com', hint: 'Found in ActiveCampaign → Settings → Developer' },
      { name: 'api_key', label: 'API Key',  type: 'password', placeholder: 'Your ActiveCampaign API key' },
    ],
    docsUrl:     'https://developers.activecampaign.com/reference/overview',
    tutorialUrl: '/resources/connect-activecampaign',
    canSync:     true,
  },
  {
    provider:    'convertkit',
    name:        'Kit (ConvertKit)',
    description: 'Add contacts as Kit subscribers and apply tags. Ideal for creators and course-based businesses.',
    logo:        '/integrations/kit.png',
    category:    'email_marketing',
    fields: [
      { name: 'api_key', label: 'API Key (v4)', type: 'password', placeholder: 'Your Kit v4 API key', hint: 'You must CREATE a new key: Kit → Settings → Developer → "Add new key". Copy it immediately — shown once only. Do NOT use the existing API Key or Secret shown on that page (those are v3 only).' },
    ],
    docsUrl:     'https://developers.kit.com/v4',
    tutorialUrl: '/resources/connect-convertkit',
    canSync:     true,
  },
  {
    provider:    'klaviyo',
    name:        'Klaviyo',
    description: 'Sync contacts to Klaviyo lists and trigger flows. Great for e-commerce and lifecycle email marketing.',
    logo:        '/integrations/Klaviyo.png',
    category:    'email_marketing',
    fields: [
      { name: 'api_key', label: 'Private API Key', type: 'password', placeholder: 'pk_…', hint: 'Klaviyo → Settings → API Keys → Create Private API Key → set Lists & Profiles to Full Access' },
      { name: 'list_id', label: 'List ID',         type: 'text',     placeholder: 'Your Klaviyo list ID', hint: 'Open your list in Klaviyo — the List ID is in the URL: klaviyo.com/list/YOUR_ID/members' },
    ],
    docsUrl:  'https://developers.klaviyo.com/en/reference/api-overview',
    canSync:  true,
  },
  {
    provider:    'constantcontact',
    name:        'Constant Contact',
    description: 'Add new contacts to Constant Contact lists and keep them in sync as contact details are updated.',
    logo:        '/integrations/constantcontact.png',
    category:    'email_marketing',
    fields:      [],
    oauthPath:   '/api/oauth/constantcontact',
    docsUrl: 'https://developer.constantcontact.com/api_reference/',
  },
  // ── Lead Ads ──────────────────────────────────────────────────────────────
  {
    provider:    'linkedin',
    name:        'LinkedIn Lead Gen Forms',
    description: 'Capture leads from LinkedIn Lead Gen Forms and Sponsored Content campaigns directly into your pipeline.',
    logo:        '/integrations/linkedin.png',
    category:    'lead_ads',
    fields:      [],
    comingSoon:  true,
    tutorialUrl: '/resources/connect-linkedin-leads',
  },
  {
    provider:    'tiktok',
    name:        'TikTok Lead Ads',
    description: 'Receive leads from TikTok Instant Forms campaigns in real time via TikTok for Business.',
    logo:        '/integrations/tiktok.png',
    category:    'lead_ads',
    fields:      [],
    comingSoon:  true,
    tutorialUrl: '/resources/connect-tiktok-leads',
  },
  {
    provider:    'microsoft_ads',
    name:        'Microsoft Ads',
    description: 'Import leads from Microsoft Advertising Lead Extensions on Bing and the Microsoft Audience Network.',
    logo:        '/integrations/microsoft.png',
    category:    'lead_ads',
    fields:      [],
    comingSoon:  true,
    tutorialUrl: '/resources/connect-microsoft-ads-leads',
  },
  {
    provider:    'calendly',
    name:        'Calendly',
    description: 'Automatically capture booking details as leads when prospects schedule a meeting via Calendly.',
    logo:        '/integrations/calendly.png',
    category:    'lead_ads',
    fields:      [],
    comingSoon:  true,
    tutorialUrl: '/resources/connect-calendly',
  },
]

const CATEGORY_LABELS: Record<string, string> = {
  payments:        'Payments',
  automation:      'Automation',
  email:           'Email',
  tickets:         'Tickets',
  email_marketing: 'Email Marketing',
  forms:           'Forms',
  lead_ads:        'Lead Ads',
}

interface ConnectedEmailInfo {
  email:    string
  userName: string
  role:     string
}

const ROLE_LABELS: Record<string, string> = {
  owner:    'Owner',
  admin:    'Admin',
  manager:  'Manager',
  employee: 'Employee',
  viewer:   'Viewer',
}

const ROLE_COLORS: Record<string, string> = {
  owner:    'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border-purple-200 dark:border-purple-500/25',
  admin:    'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-500/25',
  manager:  'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/25',
  employee: 'bg-gray-100 text-gray-600 dark:bg-white/8 dark:text-gray-400 border-gray-200 dark:border-white/10',
  viewer:   'bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-500 border-gray-200 dark:border-white/10',
}

interface IntegrationsClientProps {
  connected:                    Set<string>
  standalone?:                  boolean
  initialExpanded?:             string
  onboarding?:                  boolean
  loginHint?:                   string
  providers?:                   SageIntegrationProvider[]
  columns?:                     1 | 2
  connectedEmailInfoByProvider?: Record<string, ConnectedEmailInfo> | null
  connectedProviderInfo?:        Record<string, { userName: string; role: string }>
  workspaceId?:                 string
  formWebhookUrls?:             Record<string, string>  // pre-built URLs with secrets for GF/WPForms
  syncEnabledByProvider?:       Record<string, boolean>
}

export function IntegrationsClient({ connected: initialConnected, standalone = true, initialExpanded, onboarding, loginHint, providers, columns, connectedEmailInfoByProvider, connectedProviderInfo, workspaceId, formWebhookUrls, syncEnabledByProvider }: IntegrationsClientProps) {
  const [connected,         setConnected]        = useState<Set<string>>(initialConnected)
  const [expanded,          setExpanded]         = useState<string | null>(initialExpanded ?? null)
  const [pending,           startTransition]     = useTransition()
  const [saving,            setSaving]           = useState<string | null>(null)
  const [formValues,        setFormValues]       = useState<Record<string, Record<string, string>>>({})
  const [sigExpanded,       setSigExpanded]      = useState<string | null>(null)
  const [sigSaving,         setSigSaving]        = useState(false)
  const [sigSaved,          setSigSaved]         = useState(false)
  const [connectResult,     setConnectResult]    = useState<Record<string, { webhookUrl?: string; formsRegistered?: number; error?: string }>>({})
  const [testResult,        setTestResult]       = useState<Record<string, { ok?: boolean; error?: string; loading?: boolean }>>({})
  const [webhookPanelOpen,  setWebhookPanelOpen] = useState<Record<string, boolean>>({})
  const [copiedProvider,    setCopiedProvider]   = useState<string | null>(null)
  const [syncingProvider,   setSyncingProvider]  = useState<string | null>(null)
  const [syncResult,        setSyncResult]       = useState<Record<string, { synced: number; skipped: number; error?: string } | null>>({})
  const [autoSyncEnabled,   setAutoSyncEnabled]  = useState<Record<string, boolean>>(syncEnabledByProvider ?? {})
  const [togglingSync,      setTogglingSync]     = useState<string | null>(null)
  const [inlineSecret,      setInlineSecret]     = useState<Record<string, string>>({})
  const [inlineSecretSaved, setInlineSecretSaved] = useState<string | null>(null)
  const sigRef              = useRef<HTMLDivElement>(null)
  const sigImgRef           = useRef<HTMLInputElement>(null)

  function toggleExpand(provider: SageIntegrationProvider) {
    setExpanded(prev => prev === provider ? null : provider)
  }

  function handleFieldChange(provider: SageIntegrationProvider, field: string, value: string) {
    setFormValues(prev => ({
      ...prev,
      [provider]: { ...(prev[provider] ?? {}), [field]: value },
    }))
  }

  const FORM_PROVIDERS = new Set(['gravity_forms', 'google_forms', 'typeform', 'fluent_forms', 'clickfunnels', 'webflow', 'wordpress_forms'])

  function handleConnect(provider: SageIntegrationProvider) {
    const config = formValues[provider] ?? {}
    setSaving(provider)
    startTransition(async () => {
      if (FORM_PROVIDERS.has(provider)) {
        const result = await connectFormIntegration(provider as 'gravity_forms' | 'google_forms' | 'typeform' | 'fluent_forms' | 'clickfunnels' | 'webflow' | 'wordpress_forms', config)
        setConnectResult(prev => ({ ...prev, [provider]: result }))
        setWebhookPanelOpen(prev => ({ ...prev, [provider]: true }))
      } else {
        await saveSageIntegration(provider, config)
      }
      setConnected(prev => new Set([...prev, provider]))
      setExpanded(null)
      setSaving(null)
      if (onboarding) {
        window.location.href = '/dashboard'
      }
    })
  }

  function handleDisconnect(provider: SageIntegrationProvider) {
    if (!confirm(`Disconnect ${provider}? You can reconnect at any time.`)) return
    setSaving(provider)
    startTransition(async () => {
      if (FORM_PROVIDERS.has(provider)) {
        await disconnectFormIntegration(provider as 'gravity_forms' | 'google_forms' | 'typeform' | 'fluent_forms' | 'clickfunnels' | 'webflow' | 'wordpress_forms')
      } else {
        await disconnectSageIntegration(provider)
      }
      setConnected(prev => {
        const next = new Set(prev)
        next.delete(provider)
        return next
      })
      setConnectResult(prev => { const n = { ...prev }; delete n[provider]; return n })
      setSaving(null)
    })
  }

  function handleToggleAutoSync(provider: SageIntegrationProvider) {
    const next = !autoSyncEnabled[provider]
    setAutoSyncEnabled(prev => ({ ...prev, [provider]: next }))
    setTogglingSync(provider)
    startTransition(async () => {
      try {
        await toggleEmailPlatformSync(provider as 'mailchimp' | 'activecampaign' | 'klaviyo', next)
      } catch {
        setAutoSyncEnabled(prev => ({ ...prev, [provider]: !next }))
      } finally {
        setTogglingSync(null)
      }
    })
  }

  function handleSync(provider: SageIntegrationProvider) {
    setSyncingProvider(provider)
    setSyncResult(prev => ({ ...prev, [provider]: null }))
    startTransition(async () => {
      const result = await syncFromEmailPlatform(provider as 'mailchimp' | 'activecampaign' | 'klaviyo')
      setSyncResult(prev => ({ ...prev, [provider]: result }))
      setSyncingProvider(null)
    })
  }

  function handleTest(provider: SageIntegrationProvider) {
    setTestResult(prev => ({ ...prev, [provider]: { loading: true } }))
    startTransition(async () => {
      const result = await sendTestFormWebhook(provider as 'gravity_forms' | 'google_forms' | 'typeform' | 'fluent_forms' | 'clickfunnels' | 'webflow' | 'wordpress_forms')
      setTestResult(prev => ({ ...prev, [provider]: { ok: result.ok, error: result.error } }))
    })
  }

  async function handleOpenSignature(provider: string) {
    if (sigExpanded === provider) { setSigExpanded(null); return }
    setSigExpanded(provider)
    const { html } = await getEmailSignature()
    if (html && sigRef.current && !sigRef.current.innerHTML.trim()) {
      sigRef.current.innerHTML = html
    }
  }

  async function handleSaveSignature() {
    if (!sigRef.current) return
    setSigSaving(true); setSigSaved(false)
    const html = sigRef.current.innerHTML
    await saveEmailSignature(html)
    setSigSaving(false); setSigSaved(true)
    setTimeout(() => setSigSaved(false), 3000)
  }

  function handleSigImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !sigRef.current) return
    const reader = new FileReader()
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string
      sigRef.current!.focus()
      document.execCommand('insertHTML', false, `<img src="${dataUrl}" style="max-width:200px;height:auto;" alt="signature-image" />`)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const categories = ['payments', 'automation', 'email', 'tickets', 'email_marketing', 'forms', 'lead_ads'] as const

  return (
    <div className={standalone ? 'p-8 max-w-3xl mx-auto' : ''}>
      {standalone && (
        <div className="mb-8">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Integrations</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Connect external services to power payments, email, automation, and ticketing from Sage.
          </p>
        </div>
      )}

      {categories.map(category => {
        let cards = INTEGRATIONS.filter(i => i.category === category)
        if (providers?.length) cards = cards.filter(i => providers.includes(i.provider))
        if (cards.length === 0) return null
        return (
          <div key={category} className={providers ? '' : 'mb-8'}>
            {!providers && (
              <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 px-1">
                {CATEGORY_LABELS[category]}
              </h2>
            )}

            <div className={columns === 2 ? 'grid grid-cols-1 md:grid-cols-2 gap-3' : 'space-y-3'}>
              {cards.map(integration => {
                const isConnected    = connected.has(integration.provider)
                const isExpanded     = expanded === integration.provider
                const isSaving       = saving === integration.provider
                const values         = formValues[integration.provider] ?? {}
                const requiredFields  = integration.fields.filter(f => !f.optional && f.name !== 'publishable_key')
                const allFilled      = requiredFields.every(f => (values[f.name] ?? '').trim().length > 0)
                const emailProviders = ['gmail', 'microsoft']
                const otherEmailConnected =
                  integration.category === 'email' &&
                  !isConnected &&
                  emailProviders.some(p => p !== integration.provider && connected.has(p))

                return (
                  <div
                    key={integration.provider}
                    className={`bg-white dark:bg-[#232323] rounded-xl border transition-all ${
                      isConnected
                        ? 'border-brand-200 dark:border-[#15A4AE]/30'
                        : 'dark:border-white/8'
                    }`}
                  >
                    {/* Card header */}
                    <div className={`flex items-center gap-5 px-5 py-4 rounded-xl transition-colors ${isConnected ? 'hover:bg-gray-50 dark:hover:bg-white/[0.03]' : ''}`}>
                      <div className="w-16 h-16 rounded-2xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 shadow-sm shrink-0 overflow-hidden flex items-center justify-center p-2.5">
                        {integration.logo === '__stripe__' ? (
                          <svg viewBox="0 0 40 40" className="w-full h-full">
                            <rect width="40" height="40" rx="8" fill="#635BFF"/>
                            <path d="M18.5 15.5c0-1.1.9-1.5 2.4-1.5 2.1 0 4.8.7 6.9 1.8v-6.5C25.6 8.5 23 8 20.3 8c-5.3 0-8.8 2.8-8.8 7.4 0 7.2 9.9 6 9.9 9.1 0 1.3-1.1 1.7-2.7 1.7-2.3 0-5.3-.9-7.6-2.2V30c2.6 1.1 5.2 1.6 7.6 1.6 5.5 0 9.2-2.7 9.2-7.4-.1-7.8-9.4-6.4-9.4-8.7z" fill="white"/>
                          </svg>
                        ) : integration.logo === '__monday__' ? (
                          <svg viewBox="0 0 40 40" className="w-full h-full">
                            <rect width="40" height="40" rx="8" fill="white" stroke="#E5E7EB"/>
                            <ellipse cx="12" cy="24" rx="4" ry="4" fill="#FF3D57"/>
                            <ellipse cx="20" cy="24" rx="4" ry="4" fill="#FFCB00"/>
                            <ellipse cx="28" cy="24" rx="4" ry="4" fill="#00CA72"/>
                          </svg>
                        ) : integration.logo === '__typeform__' ? (
                          <svg viewBox="0 0 40 40" className="w-full h-full">
                            <rect width="40" height="40" rx="8" fill="#0A0A0A"/>
                            <text x="50%" y="58%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="16" fontWeight="700" fontFamily="serif">T</text>
                          </svg>
                        ) : integration.logo.startsWith('/') ? (
                          <img src={integration.logo} alt={integration.name} className="w-full h-full object-contain" />
                        ) : (
                          integration.logo
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{integration.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[#15A4AE]/12 text-[#3a9e8a] dark:text-[#15A4AE] border border-[#15A4AE]/25">
                            Sage
                          </span>
                          {isConnected && (
                            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-brand-50 dark:bg-[#15A4AE]/10 text-brand-700 dark:text-[#15A4AE] font-medium">
                              <Check className="w-2.5 h-2.5" /> Connected
                            </span>
                          )}
                        </div>
                        {(() => {
                          const emailInfo = (integration.provider === 'gmail' || integration.provider === 'microsoft')
                            ? connectedEmailInfoByProvider?.[integration.provider]
                            : undefined
                          const providerInfo = isConnected ? connectedProviderInfo?.[integration.provider] : undefined

                          if (emailInfo) return (
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-xs text-gray-700 dark:text-gray-200 font-medium">{emailInfo.email}</span>
                              {emailInfo.userName && <span className="text-[11px] text-gray-400">· {emailInfo.userName}</span>}
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${ROLE_COLORS[emailInfo.role] ?? ROLE_COLORS.viewer}`}>
                                {ROLE_LABELS[emailInfo.role] ?? emailInfo.role}
                              </span>
                            </div>
                          )
                          if (providerInfo?.userName) return (
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-[11px] text-gray-500 dark:text-gray-400">Connected by</span>
                              <span className="text-xs text-gray-700 dark:text-gray-200 font-medium">{providerInfo.userName}</span>
                              {providerInfo.role && (
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${ROLE_COLORS[providerInfo.role] ?? ROLE_COLORS.viewer}`}>
                                  {ROLE_LABELS[providerInfo.role] ?? providerInfo.role}
                                </span>
                              )}
                              {integration.webhookPath && workspaceId && (
                                <button
                                  onClick={() => setWebhookPanelOpen(prev => ({ ...prev, [integration.provider]: !prev[integration.provider] }))}
                                  className="text-[11px] text-brand-600 dark:text-[#15A4AE] hover:underline ml-1"
                                >
                                  {webhookPanelOpen[integration.provider] ? 'Hide URL' : 'Show webhook URL'}
                                </button>
                              )}
                            </div>
                          )
                          return (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed line-clamp-2">
                              {integration.description}
                            </p>
                          )
                        })()}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {integration.tutorialUrl && (
                          <Link
                            href={integration.tutorialUrl}
                            target="_blank"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-[#15A4AE] text-xs font-medium"
                            title="Setup guide"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Guide</span>
                          </Link>
                        )}
                        {integration.docsUrl && (
                          <a
                            href={integration.docsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-gray-500 dark:text-gray-400 text-xs font-medium"
                            title="Documentation"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Docs</span>
                          </a>
                        )}

                        {integration.comingSoon ? (
                          <span className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-white/8 text-gray-400 dark:text-gray-500 rounded-lg cursor-not-allowed">
                            Coming Soon
                          </span>
                        ) : isConnected ? (
                          <>
                          {integration.canSync && (() => {
                            const syncOn = autoSyncEnabled[integration.provider] ?? false
                            const isToggling = togglingSync === integration.provider
                            return (
                              <>
                                <button
                                  onClick={() => handleToggleAutoSync(integration.provider)}
                                  disabled={isToggling}
                                  title={syncOn ? 'Turn off auto-sync' : 'Turn on auto-sync'}
                                  className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border transition-colors ${
                                    syncOn
                                      ? 'border-brand-200 dark:border-[#15A4AE]/30 bg-brand-50 dark:bg-[#15A4AE]/10'
                                      : 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/5'
                                  } ${isToggling ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                >
                                  <span className={`text-[11px] font-medium ${syncOn ? 'text-brand-600 dark:text-[#15A4AE]' : 'text-gray-400 dark:text-gray-500'}`}>
                                    Auto Sync
                                  </span>
                                  <span className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${syncOn ? 'bg-brand-600' : 'bg-gray-200 dark:bg-white/15'}`}>
                                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${syncOn ? 'translate-x-[14px]' : 'translate-x-[2px]'}`} />
                                  </span>
                                </button>
                                <button
                                  onClick={() => handleSync(integration.provider)}
                                  disabled={syncingProvider === integration.provider || pending}
                                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 dark:disabled:bg-white/10 text-white disabled:text-gray-400 transition-colors disabled:opacity-60"
                                >
                                  {syncingProvider === integration.provider
                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                    : <RefreshCw className="w-3 h-3" />}
                                  Sync Now
                                </button>
                              </>
                            )
                          })()}
                          <button
                            onClick={() => handleDisconnect(integration.provider)}
                            disabled={isSaving}
                            className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-lg border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-60"
                          >
                            {isSaving && <Loader2 className="w-3 h-3 animate-spin" />}
                            Disconnect
                          </button>
                          </>
                        ) : integration.oauthPath ? (
                          /* OAuth providers — single-click sign-in */
                          otherEmailConnected ? (
                            <span
                              title="Disconnect your existing email account first — only one email integration is supported at a time."
                              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-gray-400 dark:text-gray-500 cursor-not-allowed select-none"
                            >
                              Not available
                            </span>
                          ) : (
                            <a
                              href={`${integration.oauthPath}?${onboarding ? 'state=onboarding' : 'state=default'}${loginHint ? `&hint=${encodeURIComponent(loginHint)}` : ''}`}
                              className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold shadow-sm transition-colors"
                            >
                              Connect
                            </a>
                          )
                        ) : integration.fields.length === 0 ? (
                          /* Zero-field providers — connect immediately, no form needed */
                          <button
                            onClick={() => handleConnect(integration.provider)}
                            disabled={isSaving}
                            className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold shadow-sm transition-colors disabled:opacity-60"
                          >
                            {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                            {isSaving ? 'Connecting…' : 'Connect'}
                          </button>
                        ) : (
                          <button
                            onClick={() => toggleExpand(integration.provider)}
                            className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold shadow-sm transition-colors"
                          >
                            Connect
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Auto Sync disclaimer */}
                    {isConnected && integration.canSync && (
                      <div className="border-t dark:border-white/8 px-4 py-2 text-[11px] text-gray-400 dark:text-gray-500">
                        {autoSyncEnabled[integration.provider]
                          ? `Auto sync ON · New and updated Sage contacts are pushed to ${integration.name} automatically`
                          : `Auto sync OFF · Sage contacts will not be pushed to ${integration.name} automatically · use Sync Now to pull contacts in`}
                      </div>
                    )}

                    {/* Sync result banner */}
                    {syncResult[integration.provider] && (
                      <div className={`border-t dark:border-white/8 px-4 py-2.5 rounded-b-xl text-xs flex items-center gap-2 ${
                        syncResult[integration.provider]?.error
                          ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                          : 'bg-brand-50 dark:bg-[#15A4AE]/10 text-brand-700 dark:text-[#15A4AE]'
                      }`}>
                        {syncResult[integration.provider]?.error
                          ? `Error: ${syncResult[integration.provider]?.error}`
                          : `Synced ${syncResult[integration.provider]?.synced} contacts · ${syncResult[integration.provider]?.skipped} skipped`}
                      </div>
                    )}

                    {/* Signature editor — email providers only, when connected */}
                    {isConnected && (integration.provider === 'gmail' || integration.provider === 'microsoft') && (
                      <>
                        <div className="border-t dark:border-white/8 px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileSignature className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Email Signature</span>
                            <span className="text-[10px] text-gray-400">(auto-appended to replies)</span>
                          </div>
                          <button
                            onClick={() => handleOpenSignature(integration.provider)}
                            className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg border dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                          >
                            {sigExpanded === integration.provider ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            {sigExpanded === integration.provider ? 'Close' : 'Edit'}
                          </button>
                        </div>

                        {sigExpanded === integration.provider && (
                          <div className="border-t dark:border-white/8 px-4 pb-4 bg-gray-50 dark:bg-white/3 rounded-b-xl space-y-3">
                            {/* Mini toolbar */}
                            <div className="flex items-center gap-1 pt-3 pb-1 border-b dark:border-white/8">
                              {([
                                { cmd: 'bold',      Icon: Bold,      title: 'Bold' },
                                { cmd: 'italic',    Icon: Italic,    title: 'Italic' },
                                { cmd: 'underline', Icon: Underline, title: 'Underline' },
                              ] as const).map(({ cmd, Icon, title }) => (
                                <button key={cmd} title={title}
                                  onMouseDown={ev => { ev.preventDefault(); sigRef.current?.focus(); document.execCommand(cmd) }}
                                  className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors">
                                  <Icon className="w-3.5 h-3.5" />
                                </button>
                              ))}
                              <div className="w-px h-4 bg-gray-200 dark:bg-white/10 mx-0.5" />
                              <button title="Insert logo / image"
                                onMouseDown={ev => { ev.preventDefault(); sigImgRef.current?.click() }}
                                className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors">
                                <ImagePlus className="w-3.5 h-3.5" />
                              </button>
                              <input ref={sigImgRef} type="file" accept="image/*" className="hidden" onChange={handleSigImageUpload} />
                            </div>

                            {/* Editable area */}
                            <div
                              ref={sigRef}
                              contentEditable
                              suppressContentEditableWarning
                              data-placeholder="Type your signature here… e.g. Name, title, phone, website"
                              className="min-h-[100px] px-3 py-2.5 rounded-lg border dark:border-white/10 bg-white dark:bg-[#232323] text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#15A4AE] empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400"
                            />

                            <div className="flex items-center justify-between">
                              <p className="text-[11px] text-gray-400">Images are embedded directly. For best email compatibility, use a publicly hosted logo URL.</p>
                              <button
                                onClick={handleSaveSignature}
                                disabled={sigSaving}
                                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium transition-colors disabled:opacity-60"
                              >
                                {sigSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : sigSaved ? <CheckCircle2 className="w-3 h-3" /> : null}
                                {sigSaving ? 'Saving…' : sigSaved ? 'Saved!' : 'Save Signature'}
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Post-connect panel — forms integrations only, hidden by default */}
                    {isConnected && integration.webhookPath && workspaceId && webhookPanelOpen[integration.provider] && (() => {
                      const result          = connectResult[integration.provider]
                      const hookUrl         = result?.webhookUrl
                        ?? formWebhookUrls?.[integration.provider]
                        ?? `${typeof window !== 'undefined' ? window.location.origin : ''}${integration.webhookPath}/${workspaceId}`
                      const isTypeform        = integration.provider === 'typeform'
                      const isGoogleForms     = integration.provider === 'google_forms'
                      const isWordPressForms  = integration.provider === 'wordpress_forms'
                      const isWebflow         = integration.provider === 'webflow'
                      const isClickFunnels    = integration.provider === 'clickfunnels'

                      const appsScript = `function sendToAppalix(e) {
  var form = FormApp.getActiveForm();
  var fields = {};
  e.response.getItemResponses().forEach(function(r) {
    fields[r.getItem().getTitle()] = String(r.getResponse());
  });
  UrlFetchApp.fetch('${hookUrl}', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ form_title: form.getTitle(), responses: fields }),
    muteHttpExceptions: true
  });
}`

                      return (
                        <div className="border-t dark:border-white/8 rounded-b-xl overflow-hidden">

                          {/* WordPress Forms: plugin-based one-click setup */}
                          {isWordPressForms && (
                            <div className="px-4 py-4 bg-gray-50 dark:bg-white/3 space-y-4">
                              <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">3 steps — no webhook config needed</p>
                              <ol className="space-y-3">
                                <li className="flex gap-3 items-start">
                                  <span className="shrink-0 w-5 h-5 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">1</span>
                                  <div>
                                    <p className="text-xs text-gray-700 dark:text-gray-200 font-medium mb-1">Download and install the Appalix Forms plugin</p>
                                    <a
                                      href="/downloads/appalix-forms.zip"
                                      download
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-600 hover:bg-brand-700 text-white transition-colors"
                                    >
                                      Download appalix-forms.zip
                                    </a>
                                    <p className="text-[11px] text-gray-400 mt-1.5">WordPress Admin → Plugins → Add New → Upload Plugin → choose the zip → Install → Activate</p>
                                  </div>
                                </li>
                                <li className="flex gap-3 items-start">
                                  <span className="shrink-0 w-5 h-5 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">2</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-gray-700 dark:text-gray-200 font-medium mb-1.5">Go to Settings → Appalix Forms and paste your connection key</p>
                                    <div className="flex items-center gap-2">
                                      <code className="flex-1 px-3 py-2 text-xs rounded-lg bg-white dark:bg-[#232323] border dark:border-white/10 text-gray-700 dark:text-gray-300 font-mono truncate select-all">
                                        {workspaceId}
                                      </code>
                                      <button
                                        onClick={() => { navigator.clipboard.writeText(workspaceId ?? ''); setCopiedProvider(integration.provider + '_key'); setTimeout(() => setCopiedProvider(null), 2000) }}
                                        className="shrink-0 px-2.5 py-2 text-xs rounded-lg border dark:border-white/10 bg-white dark:bg-[#232323] text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors"
                                      >
                                        {copiedProvider === integration.provider + '_key' ? 'Copied!' : 'Copy'}
                                      </button>
                                    </div>
                                    <p className="text-[11px] text-gray-400 mt-1">This is your workspace connection key. The plugin uses it to send to the right account.</p>
                                  </div>
                                </li>
                                <li className="flex gap-3 items-start">
                                  <span className="shrink-0 w-5 h-5 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">3</span>
                                  <div>
                                    <p className="text-xs text-gray-700 dark:text-gray-200 font-medium">Done — no further configuration needed</p>
                                    <p className="text-[11px] text-gray-400 mt-0.5">
                                      Works automatically with Contact Form 7, Elementor Forms, WPForms, Gravity Forms, Ninja Forms, and Formidable Forms.
                                    </p>
                                  </div>
                                </li>
                              </ol>
                            </div>
                          )}

                          {/* Webflow: URL + optional inline signing secret */}
                          {isWebflow && (
                            <div className="px-4 py-4 bg-gray-50 dark:bg-white/3 space-y-3">
                              <div>
                                <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1.5">Your webhook URL</p>
                                <p className="text-[11px] text-gray-400 mb-2">In Webflow, go to <strong>Site Settings → Apps & Integrations → Webhooks</strong> → Add Webhook. In the Trigger dropdown select <strong>Form submission</strong>, paste this URL, then copy the signing secret Webflow displays and save it below.</p>
                                <div className="flex items-center gap-2">
                                  <code className="flex-1 px-3 py-2 text-xs rounded-lg bg-white dark:bg-[#232323] border dark:border-white/10 text-gray-700 dark:text-gray-300 font-mono truncate select-all">
                                    {hookUrl}
                                  </code>
                                  <button
                                    onClick={() => { navigator.clipboard.writeText(hookUrl); setCopiedProvider(integration.provider); setTimeout(() => setCopiedProvider(null), 2000) }}
                                    className="shrink-0 px-2.5 py-2 text-xs rounded-lg border dark:border-white/10 bg-white dark:bg-[#232323] text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors"
                                  >
                                    {copiedProvider === integration.provider ? 'Copied!' : 'Copy'}
                                  </button>
                                </div>
                              </div>
                              <div className="border-t dark:border-white/8 pt-3">
                                <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">Signing secret <span className="text-gray-400 font-normal">(optional)</span></p>
                                <p className="text-[11px] text-gray-400 mb-2">After adding the webhook in Webflow, they'll show you a signing secret. Paste it here to enable HMAC-SHA256 verification.</p>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="password"
                                    value={inlineSecret[integration.provider] ?? ''}
                                    onChange={e => setInlineSecret(prev => ({ ...prev, [integration.provider]: e.target.value }))}
                                    placeholder="Paste Webflow signing secret…"
                                    className="flex-1 px-3 py-2 text-xs border dark:border-white/10 rounded-lg bg-white dark:bg-[#232323] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                  />
                                  <button
                                    disabled={!inlineSecret[integration.provider]?.trim() || pending}
                                    onClick={() => {
                                      const secret = inlineSecret[integration.provider]?.trim()
                                      if (!secret) return
                                      startTransition(async () => {
                                        await saveSageIntegration(integration.provider, { webflow_signing_secret: secret })
                                        setInlineSecretSaved(integration.provider)
                                        setTimeout(() => setInlineSecretSaved(null), 3000)
                                      })
                                    }}
                                    className="shrink-0 px-3 py-2 text-xs font-medium rounded-lg bg-brand-600 hover:bg-brand-700 text-white transition-colors disabled:opacity-40"
                                  >
                                    {inlineSecretSaved === integration.provider ? 'Saved!' : 'Save'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* ClickFunnels: manual setup guide */}
                          {isClickFunnels && (
                            <div className="px-4 py-4 bg-gray-50 dark:bg-white/3 space-y-3">
                              <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">Set up in 3 steps</p>
                              <ol className="space-y-2.5">
                                {[
                                  { n: '1', text: 'In ClickFunnels go to Settings → Webhooks → New Endpoint' },
                                  { n: '2', text: 'Paste the URL below as the Endpoint URL, then select the events: contact.created, contact.identified, form_submission.created, order.created, subscription.created, appointments/appointment.created' },
                                  { n: '3', text: 'Save the endpoint. Optionally copy the secret shown and paste it into the Webhook Secret field on the Connect card.' },
                                ].map(step => (
                                  <li key={step.n} className="flex gap-2.5">
                                    <span className="shrink-0 w-5 h-5 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center">{step.n}</span>
                                    <span className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{step.text}</span>
                                  </li>
                                ))}
                              </ol>
                              <div>
                                <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1.5">Webhook URL</p>
                                <div className="flex items-center gap-2">
                                  <code className="flex-1 px-3 py-2 text-xs rounded-lg bg-white dark:bg-[#232323] border dark:border-white/10 text-gray-700 dark:text-gray-300 font-mono truncate select-all">
                                    {hookUrl}
                                  </code>
                                  <button
                                    onClick={() => { navigator.clipboard.writeText(hookUrl); setCopiedProvider(integration.provider); setTimeout(() => setCopiedProvider(null), 2000) }}
                                    className="shrink-0 px-2.5 py-2 text-xs rounded-lg border dark:border-white/10 bg-white dark:bg-[#232323] text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors"
                                  >
                                    {copiedProvider === integration.provider ? 'Copied!' : 'Copy'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Typeform: registration result banner */}
                          {isTypeform && result && (
                            <div className={`px-4 py-2.5 flex items-center gap-2 text-xs ${result.error ? 'bg-amber-50 dark:bg-amber-500/8 text-amber-700 dark:text-amber-400' : 'bg-emerald-50 dark:bg-emerald-500/8 text-emerald-700 dark:text-emerald-400'}`}>
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              {result.error
                                ? result.error
                                : result.formsRegistered === 0
                                  ? 'Connected. No Typeform forms found — create a form in Typeform and reconnect.'
                                  : `Webhook auto-registered on ${result.formsRegistered} form${result.formsRegistered !== 1 ? 's' : ''}.`}
                            </div>
                          )}

                          {/* Google Forms: step-by-step Apps Script guide */}
                          {isGoogleForms && (
                            <div className="px-4 py-4 bg-gray-50 dark:bg-white/3 space-y-3">
                              <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">Set up in 3 steps</p>
                              <ol className="space-y-2.5">
                                {[
                                  { n: '1', text: 'Open your Google Form → click the 3-dot menu (⋮) → select Extensions → Apps Script' },
                                  { n: '2', text: 'Delete any existing code, paste the script below, then click Save (💾)' },
                                  { n: '3', text: 'Click Triggers (⏰) → Add Trigger → choose sendToAppalix → Event type: On form submit → Save' },
                                ].map(step => (
                                  <li key={step.n} className="flex gap-2.5">
                                    <span className="shrink-0 w-5 h-5 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center">{step.n}</span>
                                    <span className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{step.text}</span>
                                  </li>
                                ))}
                              </ol>
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Apps Script (webhook URL pre-filled)</p>
                                  <button
                                    onClick={() => { navigator.clipboard.writeText(appsScript); setCopiedProvider(integration.provider + '_script'); setTimeout(() => setCopiedProvider(null), 2000) }}
                                    className="text-[11px] px-2 py-0.5 rounded border dark:border-white/10 bg-white dark:bg-[#232323] text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors"
                                  >
                                    {copiedProvider === integration.provider + '_script' ? 'Copied!' : 'Copy script'}
                                  </button>
                                </div>
                                <pre className="text-[10px] font-mono bg-white dark:bg-[#1a1a1a] border dark:border-white/10 rounded-lg px-3 py-2.5 text-gray-600 dark:text-gray-400 overflow-x-auto whitespace-pre leading-relaxed">
                                  {appsScript}
                                </pre>
                              </div>
                            </div>
                          )}

                          {/* Webhook URL row — shown for all except Google Forms, WordPress Forms, Webflow, and ClickFunnels (have their own panels) */}
                          {!isGoogleForms && !isWordPressForms && !isWebflow && !isClickFunnels && (!isTypeform || !result || result.error) && (
                            <div className="px-4 py-3 bg-gray-50 dark:bg-white/3">
                              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                                {isTypeform ? 'Or register the webhook manually in Typeform' : 'Paste this URL into your form plugin'}
                              </p>
                              <div className="flex items-center gap-2">
                                <code className="flex-1 px-3 py-2 text-xs rounded-lg bg-white dark:bg-[#232323] border dark:border-white/10 text-gray-700 dark:text-gray-300 font-mono truncate select-all">
                                  {hookUrl}
                                </code>
                                <button
                                  onClick={() => { navigator.clipboard.writeText(hookUrl); setCopiedProvider(integration.provider); setTimeout(() => setCopiedProvider(null), 2000) }}
                                  className="shrink-0 px-2.5 py-2 text-xs rounded-lg border dark:border-white/10 bg-white dark:bg-[#232323] text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors"
                                >
                                  {copiedProvider === integration.provider ? 'Copied!' : 'Copy'}
                                </button>
                              </div>
                            </div>
                          )}
                          {/* Typeform success: just show URL as reference */}
                          {isTypeform && result && !result.error && (
                            <div className="px-4 py-3 bg-gray-50 dark:bg-white/3">
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Webhook URL (for reference)</p>
                              <div className="flex items-center gap-2">
                                <code className="flex-1 px-3 py-2 text-xs rounded-lg bg-white dark:bg-[#232323] border dark:border-white/10 text-gray-600 dark:text-gray-400 font-mono truncate select-all">
                                  {hookUrl}
                                </code>
                                <button
                                  onClick={() => { navigator.clipboard.writeText(hookUrl); setCopiedProvider(integration.provider); setTimeout(() => setCopiedProvider(null), 2000) }}
                                  className="shrink-0 px-2.5 py-2 text-xs rounded-lg border dark:border-white/10 bg-white dark:bg-[#232323] text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors"
                                >
                                  {copiedProvider === integration.provider ? 'Copied!' : 'Copy'}
                                </button>
                              </div>
                            </div>
                          )}
                          {/* Test submission row — hidden for WordPress Forms and Webflow */}
                          {!isWordPressForms && !isWebflow && (() => {
                            const tr = testResult[integration.provider]
                            return (
                              <div className="px-4 py-3 border-t dark:border-white/8 flex items-center justify-between gap-3 bg-gray-50 dark:bg-white/3">
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {tr?.ok && <span className="text-emerald-600 dark:text-emerald-400 font-medium">Test sent — check your Forms tab.</span>}
                                  {tr?.error && <span className="text-red-600 dark:text-red-400">{tr.error}</span>}
                                  {!tr?.ok && !tr?.error && <span>Send a sample submission to verify the connection end-to-end.</span>}
                                </div>
                                <button
                                  onClick={() => handleTest(integration.provider)}
                                  disabled={tr?.loading || pending}
                                  className="shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border dark:border-white/10 bg-white dark:bg-[#232323] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors disabled:opacity-60"
                                >
                                  {tr?.loading && <Loader2 className="w-3 h-3 animate-spin" />}
                                  {tr?.loading ? 'Sending…' : 'Send test submission'}
                                </button>
                              </div>
                            )
                          })()}
                        </div>
                      )
                    })()}

                    {/* Config form — shown when expanding a non-connected, non-OAuth integration */}
                    {isExpanded && !isConnected && !integration.oauthPath && (
                      <div className="border-t dark:border-white/8 px-4 py-4 space-y-3 bg-gray-50 dark:bg-white/3 rounded-b-xl">
                        {integration.fields.map(field => (
                          <div key={field.name}>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              {field.label}
                            </label>
                            <input
                              type={field.type}
                              value={values[field.name] ?? ''}
                              onChange={e => handleFieldChange(integration.provider, field.name, e.target.value)}
                              placeholder={field.placeholder}
                              className="w-full px-3 py-2 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-[#232323] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#15A4AE]"
                            />
                            {field.hint && (
                              <p className="text-[11px] text-gray-400 mt-1">{field.hint}</p>
                            )}
                          </div>
                        ))}

                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => setExpanded(null)}
                            className="flex-1 px-3 py-2 text-xs border dark:border-white/10 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-[#232323] transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleConnect(integration.provider)}
                            disabled={!allFilled || isSaving || pending}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                          >
                            {isSaving && <Loader2 className="w-3 h-3 animate-spin" />}
                            {isSaving ? 'Saving…' : 'Save & Connect'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {!providers && (
        <div className="mt-2 p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20">
          <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
            <strong>Security note:</strong> API keys are stored encrypted in your workspace database.
            Use restricted keys with minimum required permissions wherever possible.
          </p>
        </div>
      )}
    </div>
  )
}
