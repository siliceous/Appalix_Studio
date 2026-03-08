'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Check, X, ExternalLink, Loader2, ChevronDown, ChevronUp, BookOpen } from 'lucide-react'
import { saveSageIntegration, disconnectSageIntegration } from '@/app/actions/sage'
import type { SageIntegrationProvider } from '@/lib/types'

interface IntegrationCard {
  provider:    SageIntegrationProvider
  name:        string
  description: string
  logo:        string
  category:    'automation' | 'email' | 'tickets' | 'payments' | 'email_marketing'
  fields:      Array<{ name: string; label: string; type: string; placeholder: string; hint?: string }>
  docsUrl?:    string
  tutorialUrl?: string
}

const INTEGRATIONS: IntegrationCard[] = [
  {
    provider:    'stripe',
    name:        'Stripe',
    description: 'Create and send invoices directly from deals. Stripe handles payment collection, receipts, and status tracking.',
    logo:        '💳',
    category:    'payments',
    fields: [
      { name: 'secret_key', label: 'Secret Key', type: 'password', placeholder: 'sk_live_…', hint: 'Found in Stripe Dashboard → Developers → API keys' },
    ],
    docsUrl:     'https://dashboard.stripe.com/apikeys',
    tutorialUrl: '/resources/connect-sage-stripe',
  },
  {
    provider:    'zapier',
    name:        'Zapier',
    description: 'Send Sage events (lead captured, deal created, stage changed) to 6,000+ apps via Zapier webhooks.',
    logo:        '⚡',
    category:    'automation',
    fields: [
      { name: 'webhook_url', label: 'Webhook URL', type: 'url', placeholder: 'https://hooks.zapier.com/…', hint: 'Create a "Catch Hook" trigger in Zapier and paste the URL here' },
    ],
    docsUrl:     'https://zapier.com/apps/webhook',
    tutorialUrl: '/resources/connect-sage-zapier',
  },
  {
    provider:    'gmail',
    name:        'Gmail',
    description: 'Send emails from contact and deal records using your Gmail account. Emails are logged to the activity timeline.',
    logo:        '📧',
    category:    'email',
    fields: [
      { name: 'from_email',    label: 'From Email',    type: 'email',    placeholder: 'you@gmail.com' },
      { name: 'app_password',  label: 'App Password',  type: 'password', placeholder: 'xxxx xxxx xxxx xxxx', hint: 'Create an App Password in your Google Account → Security → 2-Step Verification → App Passwords' },
    ],
    docsUrl:     'https://myaccount.google.com/apppasswords',
    tutorialUrl: '/resources/connect-sage-gmail',
  },
  {
    provider:    'microsoft',
    name:        'Microsoft / Outlook',
    description: 'Send emails from contact and deal records using your Microsoft Outlook or Office 365 account.',
    logo:        '📬',
    category:    'email',
    fields: [
      { name: 'from_email', label: 'Email Address', type: 'email',    placeholder: 'you@outlook.com' },
      { name: 'password',   label: 'App Password',  type: 'password', placeholder: 'App-specific password', hint: 'Create an App Password in your Microsoft Account → Security → Advanced security options' },
    ],
    docsUrl:     'https://account.microsoft.com/security',
    tutorialUrl: '/resources/connect-sage-microsoft',
  },
  {
    provider:    'freshdesk',
    name:        'Freshdesk',
    description: 'Create Freshdesk tickets directly from Sage and sync ticket status back to the activity timeline. Free tier available.',
    logo:        '🎫',
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
    logo:        '🛟',
    category:    'tickets',
    fields: [
      { name: 'subdomain', label: 'Subdomain', type: 'text',     placeholder: 'yourcompany (from yourcompany.zendesk.com)' },
      { name: 'email',     label: 'Email',     type: 'email',    placeholder: 'agent@yourcompany.com' },
      { name: 'api_token', label: 'API Token', type: 'password', placeholder: 'Your Zendesk API token', hint: 'Found in Zendesk Admin → Channels → API → API token' },
    ],
    docsUrl:     'https://support.zendesk.com/hc/en-us/articles/4408889192858',
    tutorialUrl: '/resources/connect-sage-zendesk',
  },
  // ── Email Marketing ───────────────────────────────────────────────────────
  {
    provider:    'mailchimp',
    name:        'Mailchimp',
    description: 'Sync contacts to Mailchimp audiences automatically and pull lead form data into your Forms section for AI analysis.',
    logo:        '🐒',
    category:    'email_marketing',
    fields: [
      { name: 'api_key',  label: 'API Key',        type: 'password', placeholder: 'Your Mailchimp API key', hint: 'Found in Mailchimp → Account → Extras → API Keys' },
      { name: 'server',   label: 'Server Prefix',   type: 'text',     placeholder: 'us1 (from https://us1.api.mailchimp.com)', hint: 'The subdomain in your Mailchimp API endpoint URL' },
      { name: 'list_id',  label: 'Audience ID',     type: 'text',     placeholder: 'Your audience/list ID', hint: 'Found in Audience → Settings → Audience name and defaults' },
    ],
    docsUrl: 'https://mailchimp.com/developer/marketing/guides/quick-start/',
  },
  {
    provider:    'activecampaign',
    name:        'ActiveCampaign',
    description: 'Push contacts to ActiveCampaign lists and trigger automations. Pull existing contacts into Forms for AI lead analysis.',
    logo:        '⚡',
    category:    'email_marketing',
    fields: [
      { name: 'api_url', label: 'API URL',  type: 'url',      placeholder: 'https://youraccountname.api-us1.com', hint: 'Found in ActiveCampaign → Settings → Developer' },
      { name: 'api_key', label: 'API Key',  type: 'password', placeholder: 'Your ActiveCampaign API key' },
    ],
    docsUrl: 'https://developers.activecampaign.com/reference/overview',
  },
  {
    provider:    'convertkit',
    name:        'Kit (ConvertKit)',
    description: 'Add contacts as Kit subscribers and apply tags. Ideal for creators and course-based businesses.',
    logo:        '✉️',
    category:    'email_marketing',
    fields: [
      { name: 'api_key',    label: 'API Key',    type: 'password', placeholder: 'Your Kit API key', hint: 'Found in Kit → Settings → Advanced → API' },
      { name: 'api_secret', label: 'API Secret', type: 'password', placeholder: 'Your Kit API secret' },
    ],
    docsUrl: 'https://developers.kit.com/v4',
  },
  {
    provider:    'klaviyo',
    name:        'Klaviyo',
    description: 'Sync contacts to Klaviyo lists and trigger flows. Great for e-commerce and lifecycle email marketing.',
    logo:        '📊',
    category:    'email_marketing',
    fields: [
      { name: 'api_key', label: 'Private API Key', type: 'password', placeholder: 'pk_…', hint: 'Found in Klaviyo → Settings → API Keys → Create Private API Key' },
      { name: 'list_id', label: 'List ID',         type: 'text',     placeholder: 'Your Klaviyo list ID', hint: 'Found in Lists & Segments → your list → Settings' },
    ],
    docsUrl: 'https://developers.klaviyo.com/en/reference/api-overview',
  },
  {
    provider:    'constantcontact',
    name:        'Constant Contact',
    description: 'Add new contacts to Constant Contact lists and keep them in sync as contact details are updated.',
    logo:        '📬',
    category:    'email_marketing',
    fields: [
      { name: 'api_key',      label: 'API Key',      type: 'password', placeholder: 'Your Constant Contact API key' },
      { name: 'access_token', label: 'Access Token', type: 'password', placeholder: 'OAuth access token', hint: 'Generate via Constant Contact developer portal' },
      { name: 'list_id',      label: 'List ID',      type: 'text',     placeholder: 'Contact list ID to sync to' },
    ],
    docsUrl: 'https://developer.constantcontact.com/api_reference/',
  },
]

const CATEGORY_LABELS: Record<string, string> = {
  payments:        'Payments',
  automation:      'Automation',
  email:           'Email',
  tickets:         'Tickets',
  email_marketing: 'Email Marketing',
}

interface IntegrationsClientProps {
  connected:  Set<string>
  standalone?: boolean  // false when embedded inside another page
}

export function IntegrationsClient({ connected: initialConnected, standalone = true }: IntegrationsClientProps) {
  const [connected,   setConnected]  = useState<Set<string>>(initialConnected)
  const [expanded,    setExpanded]   = useState<string | null>(null)
  const [pending,     startTransition] = useTransition()
  const [saving,      setSaving]     = useState<string | null>(null)
  const [formValues,  setFormValues] = useState<Record<string, Record<string, string>>>({})

  function toggleExpand(provider: SageIntegrationProvider) {
    setExpanded(prev => prev === provider ? null : provider)
  }

  function handleFieldChange(provider: SageIntegrationProvider, field: string, value: string) {
    setFormValues(prev => ({
      ...prev,
      [provider]: { ...(prev[provider] ?? {}), [field]: value },
    }))
  }

  function handleConnect(provider: SageIntegrationProvider) {
    const config = formValues[provider] ?? {}
    setSaving(provider)
    startTransition(async () => {
      await saveSageIntegration(provider, config)
      setConnected(prev => new Set([...prev, provider]))
      setExpanded(null)
      setSaving(null)
    })
  }

  function handleDisconnect(provider: SageIntegrationProvider) {
    if (!confirm(`Disconnect ${provider}? You can reconnect at any time.`)) return
    setSaving(provider)
    startTransition(async () => {
      await disconnectSageIntegration(provider)
      setConnected(prev => {
        const next = new Set(prev)
        next.delete(provider)
        return next
      })
      setSaving(null)
    })
  }

  const categories = ['payments', 'automation', 'email', 'tickets', 'email_marketing'] as const

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
        const cards = INTEGRATIONS.filter(i => i.category === category)
        return (
          <div key={category} className="mb-8">
            <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 px-1">
              {CATEGORY_LABELS[category]}
            </h2>

            <div className="space-y-3">
              {cards.map(integration => {
                const isConnected = connected.has(integration.provider)
                const isExpanded  = expanded === integration.provider
                const isSaving    = saving === integration.provider
                const values      = formValues[integration.provider] ?? {}
                const allFilled   = integration.fields.every(f => (values[f.name] ?? '').trim().length > 0)

                return (
                  <div
                    key={integration.provider}
                    className={`bg-white dark:bg-[#232323] rounded-xl border transition-all ${
                      isConnected
                        ? 'border-brand-200 dark:border-[#61c2ad]/30'
                        : 'dark:border-white/8'
                    }`}
                  >
                    {/* Card header */}
                    <div className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${isConnected ? 'hover:bg-gray-50 dark:hover:bg-white/[0.03]' : ''}`}>
                      <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/5 border dark:border-white/8 flex items-center justify-center text-xl shrink-0">
                        {integration.logo}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{integration.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[#61c2ad]/12 text-[#3a9e8a] dark:text-[#61c2ad] border border-[#61c2ad]/25">
                            Sage
                          </span>
                          {isConnected && (
                            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-brand-50 dark:bg-[#61c2ad]/10 text-brand-700 dark:text-[#61c2ad] font-medium">
                              <Check className="w-2.5 h-2.5" /> Connected
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed line-clamp-2">
                          {integration.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {integration.tutorialUrl && (
                          <Link
                            href={integration.tutorialUrl}
                            target="_blank"
                            className="flex items-center gap-1 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-gray-400 hover:text-brand-600 dark:hover:text-[#61c2ad]"
                            title="Setup guide"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-medium hidden sm:inline">Setup guide</span>
                          </Link>
                        )}
                        {integration.docsUrl && (
                          <a
                            href={integration.docsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                            title="Documentation"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                          </a>
                        )}

                        {isConnected ? (
                          <button
                            onClick={() => handleDisconnect(integration.provider)}
                            disabled={isSaving}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-60"
                          >
                            {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                            Disconnect
                          </button>
                        ) : (
                          <button
                            onClick={() => toggleExpand(integration.provider)}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium transition-colors"
                          >
                            Connect
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Config form — shown when expanding a non-connected integration */}
                    {isExpanded && !isConnected && (
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
                              className="w-full px-3 py-2 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-[#232323] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#61c2ad]"
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

      <div className="mt-2 p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20">
        <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
          <strong>Security note:</strong> API keys are stored encrypted in your workspace database.
          Use restricted keys with minimum required permissions wherever possible.
        </p>
      </div>
    </div>
  )
}
