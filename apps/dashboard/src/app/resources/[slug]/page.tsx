import { notFound } from 'next/navigation'
import { ChevronLeft, ExternalLink } from 'lucide-react'
import type { Metadata } from 'next'

interface Step {
  title: string
  body:  string
  code?: string
}

interface Guide {
  title:    string
  emoji:    string
  intro:    string
  steps:    Step[]
  tip?:     string
  docsUrl?: string
  docsLabel?: string
}

const GUIDES: Record<string, Guide> = {
  'embed-web-widget': {
    title: 'Embed the web widget',
    emoji: '🌐',
    intro: 'Add a chat widget to any website in under 2 minutes — just paste one script tag.',
    steps: [
      { title: 'Create an integration', body: 'Go to Integrations → Add integration, choose Web Widget, give it a name and pick your bot, then click Create integration.' },
      { title: 'Copy the embed code', body: 'On the integration detail page you\'ll see a script snippet. Copy the entire block.' },
      { title: 'Paste before </body>', body: 'Open your website\'s HTML (or CMS theme editor) and paste the snippet just before the closing </body> tag.', code: `<script
  src="https://app.appalix.com/widget.js"
  data-integration-id="YOUR_INTEGRATION_ID"
  async
></script>` },
      { title: 'Save and reload', body: 'Save the file, reload your site, and the chat bubble should appear in the bottom-right corner.' },
    ],
    tip: 'To customise colours and position, go to the integration settings and update the widget config.',
  },

  'add-wordpress-chatbot': {
    title: 'Add the WordPress chatbot plugin',
    emoji: '🔷',
    intro: 'Install the Appalix plugin on your WordPress site — no coding required.',
    steps: [
      { title: 'Create a WordPress integration', body: 'Go to Integrations → Add integration, choose WordPress, enter your site URL, and click Create integration. An API key is auto-generated.' },
      { title: 'Download the ZIP plugin', body: 'On the integration detail page, click Download ZIP plugin. Save the file to your computer.' },
      { title: 'Upload to WordPress', body: 'In your WordPress admin, go to Plugins → Add New → Upload Plugin. Choose the ZIP file and click Install Now, then Activate.' },
      { title: 'Enter the API key', body: 'Go to Settings → Appalix in your WordPress admin. Paste the API key from the integration detail page and save.' },
      { title: 'Done', body: 'The chat widget will now appear on your WordPress site. Visit the front-end to confirm.' },
    ],
    tip: 'If the widget does not appear, check that the plugin is activated and the API key is saved correctly.',
  },

  'connect-slack': {
    title: 'Connect Slack',
    emoji: '💬',
    intro: 'Let your bot respond to messages in Slack channels and DMs.',
    steps: [
      { title: 'Create a Slack App', body: 'Go to api.slack.com/apps → Create New App → From scratch. Give it a name and pick your workspace.' },
      { title: 'Enable Socket Mode or Events API', body: 'Under Features → Event Subscriptions, turn it on. Set the Request URL to your Appalix webhook: https://app.appalix.com/api/webhooks/slack/{integration_id}' },
      { title: 'Subscribe to bot events', body: 'Add these bot events: message.channels, message.im, app_mention.' },
      { title: 'Install to workspace', body: 'Under Settings → Install App, click Install to Workspace and authorise.' },
      { title: 'Copy credentials', body: 'Copy the Bot token (xoxb-...) from OAuth & Permissions, and the Signing secret from Basic Information.' },
      { title: 'Create the integration in Appalix', body: 'Go to Integrations → Add integration → Slack. Paste the bot token and signing secret, name it, pick your bot, and click Create integration.' },
    ],
    tip: 'Add the bot to a channel with /invite @YourBotName before expecting it to respond.',
    docsUrl: 'https://api.slack.com/apps',
    docsLabel: 'Slack API dashboard',
  },

  'connect-facebook-messenger': {
    title: 'Connect Facebook Messenger',
    emoji: '💙',
    intro: 'Handle Messenger conversations from your Facebook Page automatically.',
    steps: [
      { title: 'Create a Meta App', body: 'Go to developers.facebook.com → My Apps → Create App. Choose Business type.' },
      { title: 'Add Messenger product', body: 'In the app dashboard, click Add Product → Messenger → Set up.' },
      { title: 'Generate a Page access token', body: 'Under Access Tokens, select your Facebook Page and generate a token.' },
      { title: 'Set up the webhook', body: 'Under Webhooks, click Add Callback URL. Enter: https://app.appalix.com/api/webhooks/facebook/{integration_id} and set a Verify Token (any string you choose).' },
      { title: 'Subscribe to message events', body: 'Subscribe to: messages, messaging_postbacks.' },
      { title: 'Create the integration in Appalix', body: 'Go to Integrations → Add integration → Facebook Messenger. Paste the page access token, verify token, and app secret. Click Create integration.' },
    ],
    docsUrl: 'https://developers.facebook.com/apps',
    docsLabel: 'Meta for Developers',
  },

  'connect-whatsapp': {
    title: 'Connect WhatsApp Business',
    emoji: '📱',
    intro: 'Chat with customers on WhatsApp Business via the Meta Cloud API.',
    steps: [
      { title: 'Create a Meta App with WhatsApp', body: 'Go to developers.facebook.com → My Apps → Create App → Business. Add the WhatsApp product.' },
      { title: 'Get your Phone Number ID and Access Token', body: 'In the Meta App dashboard → WhatsApp → API Setup, copy the Phone Number ID and the temporary access token (or generate a permanent one via a System User).' },
      { title: 'Configure the webhook', body: 'Under WhatsApp → Configuration, set the Webhook URL to: https://app.appalix.com/api/webhooks/whatsapp/{integration_id}. Subscribe to the messages field.' },
      { title: 'Create the integration in Appalix', body: 'Go to Integrations → Add integration → WhatsApp. Paste the access token, phone number ID, and verify token, then click Create integration.' },
    ],
    tip: 'WhatsApp requires a verified Meta Business Account before going live. During testing, add test numbers in the Meta dashboard.',
    docsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started',
    docsLabel: 'WhatsApp Cloud API docs',
  },

  'connect-google-chat': {
    title: 'Connect Google Chat',
    emoji: '💬',
    intro: 'Answer questions in Google Chat spaces using a service account.',
    steps: [
      { title: 'Create a Google Cloud project', body: 'Go to console.cloud.google.com → New Project. Enable the Google Chat API.' },
      { title: 'Create a service account', body: 'In IAM & Admin → Service Accounts, create a new service account and download the JSON key.' },
      { title: 'Configure the Chat app', body: 'In Google Chat API → Configuration, set the App URL to: https://app.appalix.com/api/webhooks/google-chat/{integration_id}. Set the bot name and description.' },
      { title: 'Create the integration in Appalix', body: 'Go to Integrations → Add integration → Google Chat. Paste the service account JSON, name the integration, pick your bot, and click Create integration.' },
      { title: 'Add the bot to a space', body: 'In Google Chat, open a space → Add people & bots → search for your bot name → Add.' },
    ],
    docsUrl: 'https://developers.google.com/chat/api/guides/message',
    docsLabel: 'Google Chat API docs',
  },

  'connect-telegram': {
    title: 'Connect Telegram',
    emoji: '✈️',
    intro: 'Deploy your bot on Telegram in under 5 minutes using @BotFather.',
    steps: [
      { title: 'Create a Telegram bot', body: 'Open Telegram and message @BotFather. Send /newbot, choose a name and username. BotFather gives you a bot token (e.g. 7412345678:AAF...).' },
      { title: 'Create the integration in Appalix', body: 'Go to Integrations → Add integration → Telegram. Paste the bot token, name the integration, pick your bot, and click Create integration.' },
      { title: 'Webhook is auto-configured', body: 'Appalix automatically registers the webhook with Telegram. No extra steps needed — just message your bot on Telegram.' },
    ],
    tip: 'Use @BotFather to set a profile photo and description for your bot so it looks professional.',
  },

  'custom-api-integration': {
    title: 'Custom API integration',
    emoji: '⚙️',
    intro: 'Connect any app or platform to Appalix via the REST API.',
    steps: [
      { title: 'Create a Custom API integration', body: 'Go to Integrations → Add integration → Custom API. Name it and pick your bot. An API key is auto-generated.' },
      { title: 'Send messages to the API', body: 'POST to the chat endpoint with your API key in the header:', code: `POST https://app.appalix.com/api/v1/chat
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "session_id": "user-123",
  "message": "Hello, I need help with my order"
}` },
      { title: 'Handle the response', body: 'The API returns a JSON object with the bot\'s reply:', code: `{
  "reply": "Hi! I'd be happy to help with your order. Could you share your order number?",
  "session_id": "user-123"
}` },
    ],
    tip: 'Use a unique session_id per user so the bot maintains conversation memory across messages.',
    docsUrl: '/resources/custom-api-integration',
    docsLabel: 'API reference',
  },

  'connect-zapier': {
    title: 'Connect Zapier',
    emoji: '🔗',
    intro: 'Route captured leads to HubSpot, Google Sheets, Slack, and 6,000+ apps via a Zapier Catch Hook.',
    steps: [
      { title: 'Create a Zap', body: 'Log in to Zapier and click Create Zap. Choose Webhooks by Zapier as the trigger and select Catch Hook.' },
      { title: 'Copy the webhook URL', body: 'Zapier provides a unique URL like https://hooks.zapier.com/hooks/catch/XXXXX/YYYYY. Copy it.' },
      { title: 'Add the webhook to your integration', body: 'In Appalix, go to Integrations → your integration → CRM settings. Select Zapier and paste the webhook URL.' },
      { title: 'Set up your action', body: 'Back in Zapier, choose your action app (HubSpot, Sheets, etc.) and map the lead fields (name, email, phone) to the destination.' },
      { title: 'Test and publish', body: 'Send a test lead through your bot, then click Test Trigger in Zapier to confirm it received the data. Publish the Zap.' },
    ],
    docsUrl: 'https://zapier.com/apps/webhook/integrations',
    docsLabel: 'Zapier Webhooks docs',
  },

  'connect-hubspot': {
    title: 'Connect HubSpot',
    emoji: '🟠',
    intro: 'Push captured leads directly into HubSpot contacts using a Private App token.',
    steps: [
      { title: 'Create a HubSpot Private App', body: 'In HubSpot, go to Settings → Integrations → Private Apps → Create a private app. Give it a name and set scopes: crm.objects.contacts.write.' },
      { title: 'Copy the access token', body: 'After creating the app, copy the access token from the Auth tab.' },
      { title: 'Add the token to Appalix', body: 'Go to Integrations → your integration → CRM settings. Select HubSpot and paste the access token.' },
      { title: 'Test it', body: 'Trigger a lead capture via your bot and verify the contact appears in HubSpot CRM.' },
    ],
    docsUrl: 'https://developers.hubspot.com/docs/api/private-apps',
    docsLabel: 'HubSpot Private Apps docs',
  },

  'connect-intercom': {
    title: 'Connect Intercom',
    emoji: '💬',
    intro: 'Create Intercom leads instantly when a visitor shares their contact details.',
    steps: [
      { title: 'Get your Intercom Access Token', body: 'In Intercom, go to Settings → Integrations → Developer Hub → New App. Under Authentication, create an access token with contacts:write scope.' },
      { title: 'Add the token to Appalix', body: 'Go to Integrations → your integration → CRM settings. Select Intercom and paste the access token.' },
      { title: 'Test the connection', body: 'Trigger a lead capture via your bot and check Intercom → Contacts for the new entry.' },
    ],
    docsUrl: 'https://developers.intercom.com/building-apps/docs/authentication',
    docsLabel: 'Intercom API docs',
  },

  'connect-zoho-crm': {
    title: 'Connect Zoho CRM',
    emoji: '🔵',
    intro: 'Automatically add leads to Zoho CRM using an OAuth access token.',
    steps: [
      { title: 'Create a Zoho Client', body: 'Go to api-console.zoho.com → Add Client → Server-based Applications. Set the redirect URI to https://app.appalix.com/oauth/zoho/callback.' },
      { title: 'Authorise and get an access token', body: 'Use the OAuth flow to generate an access token with ZohoCRM.modules.leads.CREATE scope.' },
      { title: 'Add the token to Appalix', body: 'Go to Integrations → your integration → CRM settings. Select Zoho CRM and paste the access token.' },
    ],
    docsUrl: 'https://www.zoho.com/crm/developer/docs/api/v3/',
    docsLabel: 'Zoho CRM API docs',
  },

  'connect-salesforce': {
    title: 'Connect Salesforce',
    emoji: '☁️',
    intro: 'Create Salesforce Lead records via the REST API the moment a lead is captured.',
    steps: [
      { title: 'Create a Connected App', body: 'In Salesforce Setup → App Manager → New Connected App. Enable OAuth and add the scope: Manage user data via APIs (api).' },
      { title: 'Get credentials', body: 'Copy the Consumer Key and Consumer Secret from the Connected App.' },
      { title: 'Generate an access token', body: 'Use the OAuth 2.0 Username-Password flow or JWT Bearer flow to obtain an access token.' },
      { title: 'Add the token to Appalix', body: 'Go to Integrations → your integration → CRM settings. Select Salesforce and paste the access token and instance URL.' },
    ],
    docsUrl: 'https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/',
    docsLabel: 'Salesforce REST API docs',
  },

  'connect-monday': {
    title: 'Connect Monday.com',
    emoji: '📋',
    intro: 'Create Monday.com board items automatically when your bot captures a lead.',
    steps: [
      { title: 'Get your Monday API token', body: 'In Monday.com, click your avatar → Admin → API. Copy your personal API token.' },
      { title: 'Find your board ID', body: 'Open the board you want leads added to. The board ID is in the URL: monday.com/boards/BOARD_ID.' },
      { title: 'Add credentials to Appalix', body: 'Go to Integrations → your integration → CRM settings. Select Monday.com, paste the API token and board ID.' },
    ],
    docsUrl: 'https://developer.monday.com/api-reference/docs',
    docsLabel: 'Monday.com API docs',
  },
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const guide = GUIDES[slug]
  if (!guide) return { title: 'Guide not found' }
  return { title: `${guide.title} — Appalix` }
}

export default async function ResourcePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const guide = GUIDES[slug]
  if (!guide) notFound()

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Back */}
        <a
          href="/integrations"
          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-8 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Back to Integrations
        </a>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">{guide.emoji}</span>
            <h1 className="text-2xl font-bold text-gray-900">{guide.title}</h1>
          </div>
          <p className="text-gray-500">{guide.intro}</p>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {guide.steps.map((step, i) => (
            <div key={i} className="bg-white rounded-xl border p-5">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 mb-1">{step.title}</p>
                  <p className="text-sm text-gray-500 leading-relaxed">{step.body}</p>
                  {step.code && (
                    <pre className="mt-3 bg-gray-900 text-gray-100 text-xs rounded-lg p-4 overflow-x-auto leading-relaxed">
                      <code>{step.code}</code>
                    </pre>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tip */}
        {guide.tip && (
          <div className="mt-6 flex gap-3 p-4 bg-brand-50 border border-brand-100 rounded-xl">
            <span className="text-brand-600 font-bold text-sm shrink-0">Tip</span>
            <p className="text-sm text-brand-800">{guide.tip}</p>
          </div>
        )}

        {/* External docs link */}
        {guide.docsUrl && (
          <div className="mt-6 text-center">
            <a
              href={guide.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium"
            >
              {guide.docsLabel ?? 'Official documentation'}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Go to integrations */}
        <div className="mt-10 pt-8 border-t text-center">
          <a
            href="/integrations/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Add this integration →
          </a>
        </div>

      </div>
    </div>
  )
}
