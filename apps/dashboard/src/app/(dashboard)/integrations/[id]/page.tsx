import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { PLATFORM_META } from '@/lib/utils'
import { CheckCircle2, Pencil, Download } from 'lucide-react'
import type { Metadata } from 'next'
import type { Integration } from '@/lib/types'
import { CopyField } from './copy-field'
import { ConnectedBanner } from './connected-banner'
import { SlackChannelPicker } from './slack-channel-picker'
import { FacebookPageSwitcher } from './facebook-page-switcher'

export const metadata: Metadata = { title: 'Integration setup' }

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.appalix.ai'

export default async function IntegrationSetupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ connected?: string }>
}) {
  const { id } = await params
  const { connected } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user.id).order('created_at', { ascending: true }).limit(1).single()
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
    <div className="max-w-2xl mx-auto">
      {connected && <ConnectedBanner platform={PLATFORM_META[integration.platform]?.label ?? connected} />}
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
      {integration.platform === 'telegram' && (
        <TelegramSetup integrationId={id} cfg={cfg} apiUrl={API_URL} />
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
  const apiKey   = (cfg.api_key as string) || '(not set)'

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
  const apiKey   = (cfg.api_key as string) || '(not set)'

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
      <SetupSection title="Active channels">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Choose which channels and DMs your bot responds in. Leave all unchecked to respond everywhere.
        </p>
        <SlackChannelPicker integrationId={integrationId} />
      </SetupSection>
    </div>
  )
}

// ─── Facebook Messenger ───────────────────────────────────────────────────────

function FacebookSetup({
  integrationId,
  cfg,
}: {
  integrationId: string
  cfg: Record<string, unknown>
  apiUrl: string
}) {
  const pageName = (cfg.page_name as string) || ''
  const pageId   = (cfg.page_id   as string) || ''
  const appId    = process.env.META_APP_ID ?? ''

  return (
    <div className="space-y-5">
      <SetupSection title="Connected Facebook Page">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {pageName || 'Facebook Page'}
            </p>
            {pageId && <p className="text-xs text-gray-400 mt-0.5">Page ID: {pageId}</p>}
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
          Your bot is live. Any message sent to this Facebook Page via Messenger will receive
          an automatic reply from your bot.
        </p>
        <FacebookPageSwitcher
          integrationId={integrationId}
          appId={appId}
          currentPageName={pageName}
          currentPageId={pageId}
        />
      </SetupSection>
      <SetupSection title="Testing">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Open Messenger and send a message to your Facebook Page. Your bot will reply within
          a few seconds. Make sure the Page has Messaging turned on in{' '}
          <strong>Page Settings → Messaging</strong>.
        </p>
      </SetupSection>
    </div>
  )
}

// ─── WhatsApp ─────────────────────────────────────────────────────────────────

function WhatsAppSetup({
  integrationId,
  cfg,
  apiUrl,
}: {
  integrationId: string
  cfg: Record<string, unknown>
  apiUrl: string
}) {
  const webhookUrl  = `${apiUrl}/webhooks/whatsapp/${integrationId}`
  const verifyToken = (cfg.verify_token as string) || '(not set)'

  return (
    <div className="space-y-5">
      <SetupSection title="Step 1 — Register your webhook in Meta">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          In your{' '}
          <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
            Meta developer app
          </a>
          , go to <strong>WhatsApp → Configuration → Webhooks</strong> and click <strong>Edit</strong>.
          Enter the values below:
        </p>
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Callback URL</p>
            <CopyField value={webhookUrl} />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Verify Token</p>
            <CopyField value={verifyToken} secret />
          </div>
        </div>
      </SetupSection>
      <SetupSection title="Step 2 — Subscribe to messages">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          After verification, click <strong>Manage</strong> next to the webhook and subscribe to the{' '}
          <strong>messages</strong> field. Your bot will now auto-reply to every incoming WhatsApp message.
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

// ─── Telegram ────────────────────────────────────────────────────────────────

function TelegramSetup({
  integrationId,
  cfg,
  apiUrl,
}: {
  integrationId: string
  cfg: Record<string, unknown>
  apiUrl: string
}) {
  const webhookUrl = `${apiUrl}/webhooks/telegram/${integrationId}`
  const botToken   = (cfg.bot_token as string) || '(not set)'

  return (
    <div className="space-y-5">
      <SetupSection title="Step 1 — Get your bot token from BotFather">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Open Telegram and message{' '}
          <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-brand-600 hover:underline font-medium">
            @BotFather
          </a>
          . Send <code className="text-xs bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded">/newbot</code>, follow the prompts,
          and paste the token into the integration form. Your token is stored and ready.
        </p>
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Bot token (stored)</p>
          <CopyField value={botToken} secret />
        </div>
      </SetupSection>

      <SetupSection title="Step 2 — Webhook registered automatically">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Appalix registered the webhook with Telegram automatically when you created this integration.
          No manual setup needed.
        </p>
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Webhook URL</p>
          <CopyField value={webhookUrl} />
        </div>
      </SetupSection>

      <SetupSection title="Step 3 — Test it">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Open Telegram, search for your bot by its username, and send any message.
          Your bot will reply within seconds. Group chats also work — add the bot to any group
          and it will respond to every message in the conversation.
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
