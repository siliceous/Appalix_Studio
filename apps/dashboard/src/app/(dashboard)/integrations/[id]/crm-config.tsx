'use client'

import { useState } from 'react'

type CrmProvider = 'none' | 'webhook' | 'zapier' | 'hubspot' | 'intercom' | 'zoho' | 'salesforce' | 'monday'

const PROVIDERS: {
  value:  CrmProvider
  label:  string
  logo:   string
  desc:   string
}[] = [
  {
    value: 'none',
    label: 'None',
    logo:  '—',
    desc:  'Lead capture disabled.',
  },
  {
    value: 'zapier',
    label: 'Zapier',
    logo:  '⚡',
    desc:  'Send leads to any app via a Zapier Catch Hook. Connect HubSpot, Salesforce, Sheets, and 6,000+ apps.',
  },
  {
    value: 'hubspot',
    label: 'HubSpot',
    logo:  '🟠',
    desc:  'Create contacts directly in HubSpot CRM using a Private App token.',
  },
  {
    value: 'intercom',
    label: 'Intercom',
    logo:  '💬',
    desc:  'Create leads in Intercom using your Access Token.',
  },
  {
    value: 'zoho',
    label: 'Zoho CRM',
    logo:  '🔵',
    desc:  'Create leads in Zoho CRM using an OAuth access token.',
  },
  {
    value: 'salesforce',
    label: 'Salesforce',
    logo:  '☁️',
    desc:  'Create leads directly in Salesforce CRM using an OAuth access token and your instance URL.',
  },
  {
    value: 'monday',
    label: 'Monday.com',
    logo:  '📋',
    desc:  'Create items in a Monday.com board the moment a visitor shares contact details in chat.',
  },
  {
    value: 'webhook',
    label: 'Generic webhook',
    logo:  '🔗',
    desc:  'POST lead data to any HTTP endpoint — Make.com, or your own server.',
  },
]

interface Props {
  provider:      string
  webhookUrl:    string
  hubspotToken:  string
  intercomToken:          string
  zohoToken:              string
  salesforceToken:        string
  salesforceInstanceUrl:  string
  mondayToken:    string
  mondayBoardId:  string
}

export function CrmConfig(props: Props) {
  const [provider, setProvider] = useState<CrmProvider>(
    (props.provider || 'none') as CrmProvider,
  )

  const info = PROVIDERS.find((p) => p.value === provider)!

  const inputCls     = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'
  const monoInputCls = `${inputCls} font-mono`

  return (
    <div className="space-y-4">
      {/* Provider selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">CRM provider</label>
        <select
          name="crm_provider"
          value={provider}
          onChange={(e) => setProvider(e.target.value as CrmProvider)}
          className={`${inputCls} bg-white`}
        >
          {PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.logo} {p.label}
            </option>
          ))}
        </select>
        {provider !== 'none' && (
          <p className="text-xs text-gray-400 mt-1">{info.desc}</p>
        )}
      </div>

      {/* Zapier */}
      {provider === 'zapier' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Zapier webhook URL</label>
          <input
            type="url"
            name="crm_webhook_url"
            defaultValue={props.webhookUrl}
            placeholder="https://hooks.zapier.com/hooks/catch/…"
            className={inputCls}
          />
          <p className="text-xs text-gray-400 mt-1">
            In Zapier: <span className="font-medium">Create Zap → Trigger: Webhooks by Zapier → Catch Hook</span>. Copy the URL here.
          </p>
        </div>
      )}

      {/* HubSpot */}
      {provider === 'hubspot' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Access token</label>
          <input
            type="password"
            name="crm_hubspot_token"
            defaultValue={props.hubspotToken}
            placeholder="pat-na1-••••••••-••••-••••-••••-••••••••••••"
            className={monoInputCls}
          />
          <p className="text-xs text-gray-400 mt-1">
            In HubSpot: <span className="font-medium">Settings → Integrations → Private Apps → Create a private app</span>.
            Copy the <span className="font-medium">Access token</span> from the app page.
            Requires <span className="font-mono bg-gray-100 px-1 rounded">crm.objects.contacts.write</span> scope.
          </p>
        </div>
      )}

      {/* Intercom */}
      {provider === 'intercom' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Access token</label>
          <input
            type="password"
            name="crm_intercom_token"
            defaultValue={props.intercomToken}
            placeholder="dG9rOj…"
            className={monoInputCls}
          />
          <p className="text-xs text-gray-400 mt-1">
            In Intercom: <span className="font-medium">Settings → Developer Hub → Your App → Authentication</span>. Copy the access token.
          </p>
        </div>
      )}

      {/* Zoho CRM */}
      {provider === 'zoho' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">OAuth access token</label>
          <input
            type="password"
            name="crm_zoho_token"
            defaultValue={props.zohoToken}
            placeholder="1000.…"
            className={monoInputCls}
          />
          <p className="text-xs text-gray-400 mt-1">
            In Zoho: <span className="font-medium">Developer Console → Self Client → Generate token</span> with scope{' '}
            <span className="font-mono bg-gray-100 px-1 rounded">ZohoCRM.modules.leads.CREATE</span>.
          </p>
        </div>
      )}

      {/* Salesforce */}
      {provider === 'salesforce' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">OAuth access token</label>
            <input
              type="password"
              name="crm_salesforce_token"
              defaultValue={props.salesforceToken}
              placeholder="00D…"
              className={monoInputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Instance URL</label>
            <input
              type="url"
              name="crm_salesforce_instance_url"
              defaultValue={props.salesforceInstanceUrl}
              placeholder="https://yourorg.my.salesforce.com"
              className={inputCls}
            />
            <p className="text-xs text-gray-400 mt-1">
              In Salesforce: <span className="font-medium">Setup → My Domain</span> or use the{' '}
              <span className="font-mono bg-gray-100 px-1 rounded">instance_url</span> from your OAuth token response.
              Requires <span className="font-mono bg-gray-100 px-1 rounded">api</span> scope.
            </p>
          </div>
        </>
      )}

      {/* Monday.com */}
      {provider === 'monday' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">API token</label>
            <input
              type="password"
              name="crm_monday_token"
              defaultValue={props.mondayToken}
              placeholder="eyJhbGciOiJIUzI1NiJ9.…"
              className={monoInputCls}
            />
            <p className="text-xs text-gray-400 mt-1">
              In Monday.com: click your avatar → <span className="font-medium">Administration → API</span> → generate a <span className="font-medium">Personal API Token</span>.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Board ID</label>
            <input
              type="text"
              name="crm_monday_board_id"
              defaultValue={props.mondayBoardId}
              placeholder="1234567890"
              className={monoInputCls}
            />
            <p className="text-xs text-gray-400 mt-1">
              Open your board in Monday.com — the board ID is the number in the URL:{' '}
              <span className="font-mono bg-gray-100 px-1 rounded">monday.com/boards/<strong>1234567890</strong></span>.
              New leads appear as items in that board.
            </p>
          </div>
        </>
      )}

      {/* Generic webhook */}
      {provider === 'webhook' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Webhook URL</label>
          <input
            type="url"
            name="crm_webhook_url"
            defaultValue={props.webhookUrl}
            placeholder="https://your-endpoint.com/leads"
            className={inputCls}
          />
          <p className="text-xs text-gray-400 mt-1">
            Receives a JSON body with{' '}
            <span className="font-mono bg-gray-100 px-1 rounded">email</span>,{' '}
            <span className="font-mono bg-gray-100 px-1 rounded">phone</span>, and{' '}
            <span className="font-mono bg-gray-100 px-1 rounded">conversationId</span>.
          </p>
        </div>
      )}
    </div>
  )
}
