import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { PLATFORM_META } from '@/lib/utils'
import { CheckCircle2, Pencil, Download } from 'lucide-react'
import type { Metadata } from 'next'
import type { Integration } from '@/lib/types'
import { CopyField } from './copy-field'

export const metadata: Metadata = { title: 'Integration setup' }

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.appalix.ai'

export default async function IntegrationSetupPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user.id).limit(1).single()
  const membership = membershipRaw as { workspace_id: string } | null
  if (!membership) redirect('/login')

  const { data: intRaw } = await supabase
    .from('integrations')
    .select('*, bots(name)')
    .eq('id', id)
    .eq('workspace_id', membership.workspace_id)
    .single()
  if (!intRaw) notFound()

  const integration = intRaw as Integration & { bots?: { name: string } | null }
  const cfg = integration.config as Record<string, unknown>
  const meta = PLATFORM_META[integration.platform]

  return (
    <div className="max-w-2xl">
      <Header
        title={integration.name}
        description="Setup guide and credentials for this integration"
        action={
          <a
            href={`/integrations/${id}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 dark:bg-white/5 dark:border-white/10 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Edit
          </a>
        }
      />

      {/* Status card */}
      <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-5 mb-5 flex items-center gap-4">
        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${meta?.color}`}>
          {meta?.label}
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{integration.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">Bot: {integration.bots?.name ?? '—'}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
          integration.status === 'active'
            ? 'bg-green-100 text-green-700'
            : 'bg-gray-100 text-gray-500'
        }`}>
          <CheckCircle2 className="w-3 h-3" />
          {integration.status}
        </span>
      </div>

      {/* Platform-specific setup */}
      {integration.platform === 'wordpress' && (
        <WordPressSetup integrationId={id} cfg={cfg} apiUrl={API_URL} />
      )}
      {integration.platform === 'web_widget' && (
        <WebWidgetSetup integrationId={id} apiUrl={API_URL} />
      )}
      {integration.platform === 'custom_api' && (
        <CustomApiSetup integrationId={id} cfg={cfg} apiUrl={API_URL} />
      )}
      {integration.platform === 'slack' && (
        <SlackSetup integrationId={id} cfg={cfg} apiUrl={API_URL} />
      )}
      {integration.platform === 'facebook_messenger' && (
        <FacebookSetup integrationId={id} cfg={cfg} apiUrl={API_URL} />
      )}
      {integration.platform === 'whatsapp' && (
        <WhatsAppSetup integrationId={id} cfg={cfg} apiUrl={API_URL} />
      )}
      {integration.platform === 'google_chat' && (
        <GoogleChatSetup integrationId={id} cfg={cfg} apiUrl={API_URL} />
      )}
    </div>
  )
}

// ─── WordPress ──────────────────────────────────────────────────────────────

function WordPressSetup({
  integrationId,
  cfg,
  apiUrl,
}: {
  integrationId: string
  cfg: Record<string, unknown>
  apiUrl: string
}) {
  const endpoint = `${apiUrl}/webhooks/wordpress/${integrationId}`
  const apiKey   = (cfg.api_key as string) ?? '(not set)'

  return (
    <div className="space-y-5">
      <SetupSection title="Step 1 — Install the Appalix plugin">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Download and install the Appalix Chat plugin on your WordPress site. It replaces the
          Claude AI Chat plugin and routes all chat traffic through your Appalix workspace.
        </p>
        <a
          href="https://appalix.ai/downloads/appalix-chat.zip"
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          Download appalix-chat.zip
        </a>
        <p className="text-xs text-gray-400 mt-3">
          WordPress Admin → Plugins → Add New → Upload Plugin → choose the zip → Install Now → Activate
        </p>
      </SetupSection>

      <SetupSection title="Step 2 — Configure the plugin">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          In WordPress, go to <strong>Settings → Appalix Chat</strong> and enter these two values:
        </p>
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">API Endpoint</p>
            <CopyField value={endpoint} />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">API Key</p>
            <CopyField value={apiKey} secret />
          </div>
        </div>
      </SetupSection>

      <SetupSection title="Step 3 — Verify">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Save the plugin settings. Open your WordPress site and start a chat — messages will be
          processed by your bot and conversations will appear in the Appalix dashboard under{' '}
          <strong>Conversations</strong>.
        </p>
      </SetupSection>
    </div>
  )
}

// ─── Web Widget ──────────────────────────────────────────────────────────────

function WebWidgetSetup({
  integrationId,
  apiUrl,
}: {
  integrationId: string
  apiUrl: string
}) {
  const snippet = `<script>
  window.AppalixConfig = { integrationId: '${integrationId}' };
</script>
<script src="${apiUrl}/widget.js" async></script>`

  return (
    <div className="space-y-5">
      <SetupSection title="Embed the chat widget">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Paste this snippet before the closing <code className="text-xs bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded">&lt;/body&gt;</code> tag
          of every page you want the chat widget to appear on.
        </p>
        <CopyField value={snippet} multiline />
      </SetupSection>

      <SetupSection title="WordPress / CMS sites">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Use a plugin like <strong>Header Footer Code Manager</strong> or <strong>Insert Headers and Footers</strong>{' '}
          to inject the snippet into your site footer without editing theme files.
        </p>
      </SetupSection>
    </div>
  )
}

// ─── Custom API ───────────────────────────────────────────────────────────────

function CustomApiSetup({
  integrationId,
  cfg,
  apiUrl,
}: {
  integrationId: string
  cfg: Record<string, unknown>
  apiUrl: string
}) {
  const endpoint = `${apiUrl}/chat/custom/${integrationId}`
  const apiKey   = (cfg.api_key as string) ?? '(not set)'

  const curlExample = `curl -X POST '${endpoint}' \\
  -H 'Content-Type: application/json' \\
  -H 'x-api-key: ${apiKey}' \\
  -d '{"message": "Hello!", "user_id": "user-123"}'`

  return (
    <div className="space-y-5">
      <SetupSection title="Endpoint">
        <CopyField value={endpoint} />
      </SetupSection>
      <SetupSection title="API Key">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Send this key in the <code className="text-xs bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded">x-api-key</code> header with every request.
        </p>
        <CopyField value={apiKey} secret />
      </SetupSection>
      <SetupSection title="Example request">
        <CopyField value={curlExample} multiline />
        <p className="text-xs text-gray-400 mt-2">
          Response: <code className="text-xs bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded">{'{"reply":"...","conversation_id":"..."}'}</code>
        </p>
      </SetupSection>
    </div>
  )
}

// ─── Slack ────────────────────────────────────────────────────────────────────

function SlackSetup({
  integrationId,
  apiUrl,
}: {
  integrationId: string
  cfg: Record<string, unknown>
  apiUrl: string
}) {
  const webhookUrl = `${apiUrl}/webhooks/slack/${integrationId}`

  return (
    <div className="space-y-5">
      <SetupSection title="Slack app configuration">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          In your Slack app settings (<a href="https://api.slack.com/apps" target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">api.slack.com/apps</a>),
          set the Event Subscriptions Request URL to:
        </p>
        <CopyField value={webhookUrl} />
        <p className="text-xs text-gray-400 mt-3">
          Subscribe to the <strong>message.channels</strong> and <strong>message.im</strong> bot events,
          then reinstall the app to your workspace.
        </p>
      </SetupSection>
    </div>
  )
}

// ─── Facebook Messenger ───────────────────────────────────────────────────────

function FacebookSetup({
  integrationId,
  apiUrl,
}: {
  integrationId: string
  cfg: Record<string, unknown>
  apiUrl: string
}) {
  const webhookUrl = `${apiUrl}/webhooks/facebook/${integrationId}`

  return (
    <div className="space-y-5">
      <SetupSection title="Meta / Facebook app configuration">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          In your{' '}
          <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
            Meta developer app
          </a>
          , go to Webhooks → Add Callback URL and enter:
        </p>
        <CopyField value={webhookUrl} />
        <p className="text-xs text-gray-400 mt-3">
          Subscribe to the <strong>messages</strong> and <strong>messaging_postbacks</strong> fields.
        </p>
      </SetupSection>
    </div>
  )
}

// ─── WhatsApp ─────────────────────────────────────────────────────────────────

function WhatsAppSetup({
  integrationId,
  apiUrl,
}: {
  integrationId: string
  cfg: Record<string, unknown>
  apiUrl: string
}) {
  const webhookUrl = `${apiUrl}/webhooks/whatsapp/${integrationId}`

  return (
    <div className="space-y-5">
      <SetupSection title="WhatsApp Business webhook">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          In your{' '}
          <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
            Meta developer app
          </a>
          , set the WhatsApp webhook URL to:
        </p>
        <CopyField value={webhookUrl} />
        <p className="text-xs text-gray-400 mt-3">
          Subscribe to the <strong>messages</strong> field and verify using the token saved in your integration config.
        </p>
      </SetupSection>
    </div>
  )
}

// ─── Google Chat ─────────────────────────────────────────────────────────────

function GoogleChatSetup({
  integrationId,
  apiUrl,
}: {
  integrationId: string
  cfg: Record<string, unknown>
  apiUrl: string
}) {
  const endpointUrl = `${apiUrl}/webhooks/google-chat/${integrationId}`

  return (
    <div className="space-y-5">
      <SetupSection title="Google Chat app configuration">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          In{' '}
          <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
            Google Cloud Console
          </a>
          , configure your Chat app to use HTTP endpoint and enter:
        </p>
        <CopyField value={endpointUrl} />
        <p className="text-xs text-gray-400 mt-3">
          Set the app&apos;s Connection settings to <strong>HTTP endpoint URL</strong> and paste the URL above.
        </p>
      </SetupSection>
    </div>
  )
}

// ─── Shared UI ───────────────────────────────────────────────────────────────

function SetupSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-5">
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">{title}</p>
      {children}
    </div>
  )
}
