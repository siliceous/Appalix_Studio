import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { PLATFORM_META } from '@/lib/utils'
import { updateIntegration } from '@/app/actions/integration'
import { HandoffConfig } from '../handoff-config'
import { CrmConfig } from '../crm-config'
import type { Metadata } from 'next'
import type { Integration } from '@/lib/types'

export const metadata: Metadata = { title: 'Edit integration' }

export default async function EditIntegrationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()
  const membership = membershipRaw as { workspace_id: string } | null
  if (!membership) redirect('/login')

  const { data: intRaw } = await supabase
    .from('integrations')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', membership.workspace_id)
    .single()
  const integration = intRaw as Integration | null
  if (!integration) notFound()

  const { data: rawBots } = await supabase
    .from('bots')
    .select('id, name')
    .eq('workspace_id', membership.workspace_id)
    .order('created_at', { ascending: false })
  const bots = (rawBots ?? []) as { id: string; name: string }[]

  const cfg = (integration.config ?? {}) as Record<string, unknown>
  const welcomeMessage = (cfg.welcome_message as string | undefined) ?? ''
  const allowedOrigins = Array.isArray(cfg.allowed_origins)
    ? (cfg.allowed_origins as string[]).join(', ')
    : '*'
  const crmProvider      = (cfg.crm_provider       as string | undefined) ?? 'none'
  const crmWebhookUrl    = (cfg.crm_webhook_url    as string | undefined) ?? ''
  const crmHubspotToken  = (cfg.crm_hubspot_token  as string | undefined) ?? ''
  const crmIntercomToken = (cfg.crm_intercom_token as string | undefined) ?? ''
  const crmZohoToken              = (cfg.crm_zoho_token              as string | undefined) ?? ''
  const crmSalesforceToken        = (cfg.crm_salesforce_token        as string | undefined) ?? ''
  const crmSalesforceInstanceUrl  = (cfg.crm_salesforce_instance_url as string | undefined) ?? ''

  const isWebWidget = integration.platform === 'web_widget' || integration.platform === 'wordpress'

  return (
    <div className="max-w-2xl">
      <Header
        title="Edit integration"
        description={`${PLATFORM_META[integration.platform]?.label ?? integration.platform} — ${integration.name}`}
      />

      <form action={updateIntegration.bind(null, id)} className="space-y-6">
        {/* Basic info */}
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Integration name</label>
            <input
              type="text"
              name="name"
              defaultValue={integration.name}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Connected bot</label>
            <select
              name="bot_id"
              defaultValue={integration.bot_id ?? ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              <option value="">— no bot selected —</option>
              {bots.map((bot) => (
                <option key={bot.id} value={bot.id}>{bot.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Widget customisation */}
        {isWebWidget && (
          <div className="bg-white rounded-xl border p-5 space-y-4">
            <p className="text-sm font-semibold text-gray-900">Widget settings</p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Welcome message
              </label>
              <input
                type="text"
                name="welcome_message"
                defaultValue={welcomeMessage}
                placeholder="Hi there! How can I help you today?"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                The first message visitors see when the chat widget opens.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Allowed origins
              </label>
              <input
                type="text"
                name="allowed_origins"
                defaultValue={allowedOrigins}
                placeholder="* or https://yourdomain.com, https://other.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Comma-separated list of allowed origins, or{' '}
                <code className="font-mono bg-gray-100 px-1 rounded">*</code> for all.
              </p>
            </div>
          </div>
        )}

        {/* CRM integration */}
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">CRM integration</p>
            <p className="text-xs text-gray-500 mt-0.5">
              When a visitor shares an email or phone number, we send the lead to your CRM automatically.
            </p>
          </div>
          <CrmConfig
            provider={crmProvider}
            webhookUrl={crmWebhookUrl}
            hubspotToken={crmHubspotToken}
            intercomToken={crmIntercomToken}
            zohoToken={crmZohoToken}
            salesforceToken={crmSalesforceToken}
            salesforceInstanceUrl={crmSalesforceInstanceUrl}
          />
        </div>

        {/* Human handoff */}
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">Human handoff</p>
            <p className="text-xs text-gray-500 mt-0.5">
              When a visitor asks to speak to a human, the bot acknowledges gracefully and
              notifies your team via the channel below.
            </p>
          </div>
          <HandoffConfig
            channel={           (cfg.handoff_channel          as string) ?? ''}
            webhookUrl={        (cfg.handoff_webhook_url       as string) ?? ''}
            telegramToken={     (cfg.handoff_telegram_token    as string) ?? ''}
            telegramChatId={    (cfg.handoff_telegram_chat_id  as string) ?? ''}
            twilioSid={         (cfg.handoff_twilio_sid        as string) ?? ''}
            twilioToken={       (cfg.handoff_twilio_token      as string) ?? ''}
            twilioFrom={        (cfg.handoff_twilio_from       as string) ?? ''}
            twilioTo={          (cfg.handoff_twilio_to         as string) ?? ''}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Save changes
          </button>
          <a href="/integrations" className="px-5 py-2.5 text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Cancel
          </a>
        </div>
      </form>
    </div>
  )
}
