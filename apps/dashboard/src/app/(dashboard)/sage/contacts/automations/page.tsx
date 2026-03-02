'use client'

import { useState, useTransition } from 'react'
import { Check, X, ExternalLink, Loader2, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react'
import { saveSageIntegration, disconnectSageIntegration } from '@/app/actions/sage'
import Link from 'next/link'
import type { SageIntegrationProvider } from '@/lib/types'

interface AutomationCard {
  provider:    SageIntegrationProvider
  name:        string
  description: string
  logo:        string
  fields:      Array<{ name: string; label: string; type: string; placeholder: string; hint?: string }>
  docsUrl?:    string
}

const AUTOMATIONS: AutomationCard[] = [
  {
    provider:    'mailchimp',
    name:        'Mailchimp',
    description: 'Sync contacts to Mailchimp audiences automatically. New contacts are added as subscribers and tags are mapped to Mailchimp tags.',
    logo:        '🐒',
    fields: [
      { name: 'api_key',    label: 'API Key',     type: 'password', placeholder: 'Your Mailchimp API key', hint: 'Found in Mailchimp → Account → Extras → API Keys' },
      { name: 'server',     label: 'Server Prefix', type: 'text',   placeholder: 'us1 (from https://us1.api.mailchimp.com)', hint: 'The subdomain in your Mailchimp API endpoint URL' },
      { name: 'list_id',   label: 'Audience ID',  type: 'text',   placeholder: 'Your audience/list ID', hint: 'Found in Audience → Settings → Audience name and defaults' },
    ],
    docsUrl: 'https://mailchimp.com/developer/marketing/guides/quick-start/',
  },
  {
    provider:    'activecampaign',
    name:        'ActiveCampaign',
    description: 'Push contacts to ActiveCampaign lists and trigger automations when deals are created or stage changes happen.',
    logo:        '⚡',
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
    fields: [
      { name: 'api_key',      label: 'API Key',       type: 'password', placeholder: 'Your Constant Contact API key' },
      { name: 'access_token', label: 'Access Token',  type: 'password', placeholder: 'OAuth access token', hint: 'Generate via Constant Contact developer portal' },
      { name: 'list_id',      label: 'List ID',       type: 'text',     placeholder: 'Contact list ID to sync to' },
    ],
    docsUrl: 'https://developer.constantcontact.com/api_reference/',
  },
]

export default function ContactAutomationsPage() {
  const [connected,   setConnected]  = useState<Set<string>>(new Set())
  const [expanded,    setExpanded]   = useState<string | null>(null)
  const [saving,      setSaving]     = useState<string | null>(null)
  const [formValues,  setFormValues] = useState<Record<string, Record<string, string>>>({})
  const [pending,     startTransition] = useTransition()

  function toggleExpand(provider: SageIntegrationProvider) {
    setExpanded(prev => prev === provider ? null : provider)
  }

  function handleFieldChange(provider: SageIntegrationProvider, field: string, value: string) {
    setFormValues(prev => ({ ...prev, [provider]: { ...(prev[provider] ?? {}), [field]: value } }))
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
      setConnected(prev => { const next = new Set(prev); next.delete(provider); return next })
      setSaving(null)
    })
  }

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/sage/contacts" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Contact Automations</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Connect your contact list to email marketing platforms.
          </p>
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {AUTOMATIONS.map(card => {
          const isConnected = connected.has(card.provider)
          const isExpanded  = expanded === card.provider
          const isSaving    = saving === card.provider
          const values      = formValues[card.provider] ?? {}
          const allFilled   = card.fields.every(f => (values[f.name] ?? '').trim().length > 0)

          return (
            <div
              key={card.provider}
              className={`bg-white dark:bg-[#232323] rounded-xl border transition-all ${
                isConnected ? 'border-brand-200 dark:border-[#61c2ad]/30' : 'dark:border-white/8'
              }`}
            >
              {/* Card header */}
              <div className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/5 border dark:border-white/8 flex items-center justify-center text-xl shrink-0">
                  {card.logo}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{card.name}</span>
                    {isConnected && (
                      <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-brand-50 dark:bg-[#61c2ad]/10 text-brand-700 dark:text-[#61c2ad] font-medium">
                        <Check className="w-2.5 h-2.5" /> Connected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed line-clamp-2">{card.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {card.docsUrl && (
                    <a href={card.docsUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors" title="Documentation">
                      <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                    </a>
                  )}
                  {isConnected ? (
                    <button
                      onClick={() => handleDisconnect(card.provider)}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-60"
                    >
                      {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                      Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={() => toggleExpand(card.provider)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium transition-colors"
                    >
                      Connect
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Config form */}
              {isExpanded && !isConnected && (
                <div className="border-t dark:border-white/8 px-4 py-4 space-y-3 bg-gray-50 dark:bg-white/3 rounded-b-xl">
                  {card.fields.map(field => (
                    <div key={field.name}>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{field.label}</label>
                      <input
                        type={field.type}
                        value={values[field.name] ?? ''}
                        onChange={e => handleFieldChange(card.provider, field.name, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full px-3 py-2 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-[#232323] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#61c2ad]"
                      />
                      {field.hint && <p className="text-[11px] text-gray-400 mt-1">{field.hint}</p>}
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setExpanded(null)} className="flex-1 px-3 py-2 text-xs border dark:border-white/10 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-[#232323] transition-colors">
                      Cancel
                    </button>
                    <button
                      onClick={() => handleConnect(card.provider)}
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

      <div className="mt-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20">
        <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
          <strong>Note:</strong> Syncing happens when contacts are created or updated. API keys are stored encrypted. Use restricted API keys where possible.
        </p>
      </div>
    </div>
  )
}
