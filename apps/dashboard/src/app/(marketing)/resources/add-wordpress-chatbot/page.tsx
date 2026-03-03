import Link from 'next/link'
import type { Metadata } from 'next'
import { ArticleSeo } from '@/components/marketing/article-seo'

export const metadata: Metadata = {
  title: 'Add an AI Chatbot to WordPress with Appalix — Plugin Setup Guide',
  description:
    'Install the Appalix plugin, enter your API endpoint and key in Settings → Appalix Chat, and your AI bot is live on every WordPress page in minutes. Step-by-step guide.',
  keywords: [
    'WordPress AI chatbot',
    'Appalix WordPress plugin',
    'add chatbot to WordPress',
    'WordPress live chat AI',
    'WordPress bot integration',
    'WordPress AI plugin setup',
    'chatbot WordPress site',
    'AI customer support WordPress',
  ],
  alternates: { canonical: 'https://appalix.ai/resources/add-wordpress-chatbot' },
  openGraph: {
    title: 'Add an AI Chatbot to WordPress with Appalix — Plugin Setup Guide',
    description: 'Install the Appalix plugin and your AI bot is live on every WordPress page in minutes. Step-by-step guide.',
    url: 'https://appalix.ai/resources/add-wordpress-chatbot',
    type: 'article',
    siteName: 'Appalix',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Add an AI Chatbot to WordPress with Appalix — Plugin Setup Guide',
    description: 'Install the Appalix plugin and your AI bot is live on every WordPress page in minutes. Step-by-step guide.',
  },
}

export default function AddWordPressChatbotPage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <ArticleSeo
        type="HowTo"
        title="How to Add an AI Chatbot to WordPress with Appalix"
        description="Install the Appalix plugin, enter your API endpoint and key in Settings → Appalix Chat, and your AI bot is live on every WordPress page in minutes."
        slug="add-wordpress-chatbot"
        datePublished="2026-02-27"
        steps={[
          { name: 'Create a WordPress integration in Appalix', text: 'In Appalix, go to Integrations → New → WordPress, name your integration, select your bot, and save to get your API endpoint and API key.' },
          { name: 'Install the Appalix plugin on WordPress', text: 'In your WordPress admin, go to Plugins → Add New, search for Appalix Chat, install and activate the plugin.' },
          { name: 'Configure the plugin', text: 'Go to Settings → Appalix Chat, paste your API endpoint and API key from Appalix, adjust the widget position and colours, and save.' },
          { name: 'Test the chatbot', text: 'Visit any page on your WordPress site, open the chat widget, send a message, and verify the AI bot responds correctly.' },
        ]}
      />
      <div className="max-w-3xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-10">
          <Link href="/resources" className="hover:text-brand-400 transition-colors">Resources</Link>
          <span>/</span>
          <span className="text-gray-400">Add an AI Chatbot to WordPress</span>
        </div>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-400 border border-brand-600/20 font-medium">Tutorial</span>
            <span className="text-xs text-gray-500">8 min read · All plans</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            How to Add an AI Chatbot to WordPress with Appalix
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            The Appalix WordPress integration connects your WordPress site to your AI bot in under 10 minutes. Visitors chat directly on your site — the plugin handles the widget UI while Appalix processes every message through your trained bot, captures leads, and logs every conversation in your dashboard.
          </p>
        </div>

        <div className="border-t border-white/10 mb-10" />

        <div className="prose prose-invert prose-brand max-w-none space-y-10 text-gray-300">

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What you&apos;ll need</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>An <strong className="text-white">Appalix account</strong> on any plan</li>
              <li>A <strong className="text-white">WordPress site</strong> (self-hosted or WordPress.com Business+) with admin access</li>
              <li>A configured <strong className="text-white">bot</strong> in Appalix (at least name and system prompt set)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">How it works</h2>
            <p>
              The Appalix WordPress plugin renders a chat bubble on every page of your site. When a visitor sends a message, the plugin POSTs it to your Appalix API endpoint. Appalix processes the message through your bot — applying your system prompt, RAG knowledge base, and memory — then returns the reply, which the plugin displays instantly in the chat bubble.
            </p>
            <p className="mt-3">
              All conversations, lead captures, and handoff triggers work exactly as they do on other platforms — you see everything in the Appalix <strong className="text-white">Conversations</strong> tab.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 1 — Create a WordPress integration in Appalix</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Log in to your <strong className="text-white">Appalix dashboard</strong> and go to <strong className="text-white">Integrations</strong>.</li>
              <li>Click <strong className="text-white">Add integration</strong> and select <strong className="text-white">WordPress</strong>.</li>
              <li>Give the integration a name (e.g. <em>My WordPress Site</em>), choose the bot to connect, and enter your site URL.</li>
              <li>Create a strong, random API key — this is the shared secret between your WordPress site and Appalix. Save it somewhere secure.</li>
              <li>Click <strong className="text-white">Create integration</strong>. You&apos;ll be redirected to the integration list.</li>
              <li>Click the integration name (or the eye icon) to open the <strong className="text-white">Setup guide</strong> — copy the <strong className="text-white">API Endpoint URL</strong> and <strong className="text-white">API Key</strong> shown there.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 2 — Install the Appalix Chat plugin</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>
                Download the plugin zip from your integration setup page (the orange <strong className="text-white">Download appalix-chat.zip</strong> button), or directly from{' '}
                <Link href="/downloads/appalix-chat.zip" className="text-brand-400 hover:text-brand-300 underline underline-offset-2">
                  appalix.ai/downloads/appalix-chat.zip
                </Link>.
              </li>
              <li>In WordPress admin, go to <strong className="text-white">Plugins → Add New → Upload Plugin</strong>.</li>
              <li>Choose the <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">appalix-chat.zip</code> file and click <strong className="text-white">Install Now</strong>.</li>
              <li>Click <strong className="text-white">Activate Plugin</strong> once installation completes.</li>
            </ol>
            <p className="mt-4 text-sm text-gray-400">
              Already have the old <em>Claude AI Chat</em> plugin? Deactivate and delete it first — the Appalix plugin replaces it entirely.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 3 — Configure the plugin</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>In WordPress admin, go to <strong className="text-white">Settings → Appalix Chat</strong>.</li>
              <li>
                Paste the <strong className="text-white">API Endpoint</strong> copied from your Appalix integration setup page:
                <pre className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-brand-300 overflow-x-auto mt-3">
                  {`https://api.appalix.ai/webhooks/wordpress/{your-integration-id}`}
                </pre>
              </li>
              <li>Paste the <strong className="text-white">API Key</strong> shown on the same setup page.</li>
              <li>Click <strong className="text-white">Save Settings</strong>.</li>
            </ol>
            <p className="mt-4 text-sm text-gray-400">
              Once saved, the settings page shows a green <em>"Widget is active"</em> status and links directly to your Appalix Conversations tab.
            </p>
            <p className="mt-2 text-sm text-gray-400">
              <strong className="text-gray-300">Welcome message</strong> — configure this inside the bot&apos;s settings in your Appalix dashboard, not in the WordPress plugin. It applies across all platforms the bot is connected to.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 4 — Test it</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Visit your WordPress site in a new browser tab. You should see the Appalix chat bubble in the bottom-right corner.</li>
              <li>Click it and send a test message — the bot should reply within a few seconds.</li>
              <li>Back in Appalix, open <strong className="text-white">Conversations</strong> — your test message should appear there with the platform tagged as <em>WordPress</em>.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Tips &amp; best practices</h2>
            <ul className="list-disc pl-5 space-y-3">
              <li>
                <strong className="text-white">Train your bot on your site content</strong> — go to <strong className="text-white">Knowledge Base</strong> in Appalix, add your site URL as a source, and enable RAG on your bot. The bot will answer questions using your actual page content.
              </li>
              <li>
                <strong className="text-white">Enable lead capture</strong> — in your integration settings, add a CRM provider (HubSpot, Zoho, Zapier, etc.) to automatically push email/phone leads from chat into your CRM.
              </li>
              <li>
                <strong className="text-white">Set up human handoff</strong> — configure a Slack or email notification so your team is alerted when a visitor explicitly asks for a human agent.
              </li>
              <li>
                <strong className="text-white">Security</strong> — your API key is stored as a WordPress option (never exposed in the browser). The plugin identifies your integration by loading the Appalix <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">widget.js</code> with your integration ID. All message processing and authentication happen server-side on Appalix&apos;s API.
              </li>
            </ul>
          </section>

          <section className="rounded-2xl bg-brand-600/10 border border-brand-600/20 p-6 text-center mt-12">
            <p className="text-2xl mb-3">🔌</p>
            <h3 className="text-lg font-semibold text-white mb-2">Ready to add a chatbot to your WordPress site?</h3>
            <p className="text-sm text-gray-400 mb-5">
              Create a WordPress integration in your dashboard, install the plugin, and your bot will be live in minutes.
            </p>
            <Link
              href="/integrations/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Go to Integrations →
            </Link>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-white/10 flex items-center justify-between flex-wrap gap-4">
          <Link href="/resources" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            ← Back to Resources
          </Link>
          <Link href="/platforms" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            View all platforms →
          </Link>
        </div>

      </div>
    </div>
  )
}
