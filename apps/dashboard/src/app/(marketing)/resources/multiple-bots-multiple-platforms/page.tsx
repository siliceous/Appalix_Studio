import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Multiple Bots on Multiple Platforms — One Agent, Every Channel | Appalix Resources',
  description:
    'Learn how to deploy a single Appalix AI agent across your website, Slack, WhatsApp, Telegram, Facebook Messenger, and more — each with its own settings, branding, and CRM integration.',
  keywords: [
    'AI agent multiple platforms',
    'deploy chatbot multiple sites',
    'multi-channel AI agent',
    'WhatsApp and Slack chatbot',
    'chatbot for multiple websites',
    'omnichannel AI agent',
  ],
}

export default function MultipleBotsPage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <div className="max-w-3xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-10">
          <Link href="/resources" className="hover:text-brand-400 transition-colors">Resources</Link>
          <span>/</span>
          <span className="text-gray-400">Multiple Bots on Multiple Platforms</span>
        </div>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-400 border border-brand-600/20 font-medium">Guide</span>
            <span className="text-xs text-gray-500">6 min read · Mar 5, 2026</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            Multiple Bots on Multiple Platforms
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Train one AI agent on your product knowledge and deploy it everywhere your customers are — website, Slack, WhatsApp, Telegram, and more — each channel with its own identity, settings, and automations.
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 mb-10" />

        {/* Article body */}
        <div className="prose prose-invert prose-brand max-w-none space-y-10 text-gray-300">

          {/* Overview */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">One brain, unlimited deployments</h2>
            <p>
              Most businesses talk to customers across many touchpoints: a marketing website, a support portal, a Slack community, WhatsApp, Facebook Messenger. Traditionally, that meant building and maintaining a separate bot for every channel. Appalix takes a different approach.
            </p>
            <p className="mt-4">
              You train <strong className="text-white">one AI agent</strong> — your bot&apos;s knowledge base, personality, and instructions — and then create as many <strong className="text-white">integrations</strong> as you need. Each integration is a deployment of the same agent brain onto a specific platform, with its own independent configuration.
            </p>
            <div className="mt-6 p-5 rounded-xl bg-white/5 border border-white/10">
              <p className="text-sm font-semibold text-white mb-2">Think of it like this:</p>
              <p className="text-sm text-gray-400">
                The <span className="text-white">bot</span> is your AI&apos;s knowledge and personality. An <span className="text-white">integration</span> is a deployment of that bot onto a platform. One bot → many integrations → many channels.
              </p>
            </div>
          </section>

          {/* What you can deploy */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Platforms you can deploy to</h2>
            <p>
              From a single Appalix bot you can create integrations across any combination of these channels:
            </p>
            <ul className="space-y-3 mt-4">
              {[
                { logo: '/integrations/slack.png',       label: 'Slack',              desc: 'Deploy the agent inside your Slack workspace for internal Q&A, employee support, or customer-facing Slack communities.' },
                { logo: '/integrations/google-chat.png', label: 'Google Chat',        desc: 'Connect your agent to Google Workspace and respond to customer and team queries in Google Chat spaces and DMs.' },
                { logo: '/integrations/messenger.jpg',   label: 'Facebook Messenger', desc: 'Link a Facebook Page to handle Messenger conversations automatically, 24/7.' },
                { logo: '/integrations/whatsapp.jpg',    label: 'WhatsApp',           desc: 'Connect a WhatsApp Business number and let customers chat with your AI agent directly from their phone.' },
                { emoji: '🌐',                           label: 'WordPress',          desc: 'Install the Appalix WordPress plugin and your agent appears as a chat widget on every page of your site, no code required.' },
                { emoji: '🌐',                           label: 'Web Widget',         desc: 'Embed a fully branded chat widget on any website with a single line of JavaScript — works with React, Vue, plain HTML, everything.' },
                { emoji: '⚡',                           label: 'Custom API',         desc: 'POST messages to the Appalix API from any backend system or custom application and get AI-generated replies in return.' },
              ].map((p) => (
                <li key={p.label} className="flex gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-lg overflow-hidden ${'logo' in p && p.logo ? 'bg-white p-1' : 'bg-white/10'}`}>
                    {'logo' in p && p.logo ? (
                      <Image src={p.logo as string} alt={p.label} width={28} height={28} className="object-contain w-6 h-6" />
                    ) : (
                      <span className="text-xl">{'emoji' in p ? p.emoji : ''}</span>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{p.label}</p>
                    <p className="text-sm text-gray-400 mt-0.5">{p.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Per-integration settings */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Every integration is fully independent</h2>
            <p>
              Even though all integrations share the same trained bot, each one is configured independently. This means you can tailor the experience for every context without touching your core AI training.
            </p>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: '👋', title: 'Custom welcome message', desc: 'Greet website visitors differently from your Slack team or WhatsApp customers.' },
                { icon: '🎨', title: 'Widget branding', desc: 'Set the widget colour, position, and display name per site — match every brand perfectly.' },
                { icon: '🌐', title: 'Allowed origins', desc: 'Restrict which domains can load your web widget, preventing unauthorised embedding.' },
                { icon: '🔗', title: 'CRM webhook', desc: 'Each integration can POST lead data to a different endpoint — route website leads to HubSpot, Slack leads to Salesforce.' },
                { icon: '🤝', title: 'Human handoff routing', desc: 'Send handoff alerts to different team members or channels depending on which platform the conversation started on.' },
                { icon: '🔑', title: 'API key & IP allowlist', desc: 'Custom API integrations get their own API key and optional IP allowlist for maximum security.' },
              ].map((item) => (
                <div key={item.title} className="flex gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-xl shrink-0">{item.icon}</span>
                  <div>
                    <p className="font-semibold text-white text-sm mb-1">{item.title}</p>
                    <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Use cases */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Real-world use cases</h2>

            <div className="space-y-5">
              <div className="p-5 rounded-xl border border-white/10 bg-white/5">
                <p className="font-semibold text-white mb-2">🛒 E-commerce brand with a blog and a store</p>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Deploy one web widget integration on the marketing blog (welcome message: &quot;Ask about any product&quot;) and a separate integration on the checkout / store pages (welcome message: &quot;Need help with your order?&quot;). Both draw from the same product knowledge base but greet shoppers appropriately for where they are.
                </p>
              </div>

              <div className="p-5 rounded-xl border border-white/10 bg-white/5">
                <p className="font-semibold text-white mb-2">💼 B2B SaaS with a Slack community</p>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Add a Slack integration for internal employee support (HR questions, IT help-desk) and a separate web widget integration on the public docs site for customer support. The same trained agent handles both — only the channel and escalation routing differ.
                </p>
              </div>

              <div className="p-5 rounded-xl border border-white/10 bg-white/5">
                <p className="font-semibold text-white mb-2">🌍 Agency managing multiple client sites</p>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Train one bot per client, then create a web widget integration for each of their sites. Each client gets their own welcome message, brand colours, CRM webhook, and allowed-origins restriction. You manage everything from a single Appalix workspace.
                </p>
              </div>

              <div className="p-5 rounded-xl border border-white/10 bg-white/5">
                <p className="font-semibold text-white mb-2">📱 Mobile-first brand on WhatsApp & Google Chat</p>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Create a WhatsApp integration for your main customer support number and a Google Chat integration for your internal team workspace. Leads from WhatsApp go to Salesforce; Google Chat conversations fire a Slack alert to your team manager. One bot, two channels, two workflows.
                </p>
              </div>
            </div>
          </section>

          {/* How to set up */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">How to set it up — step by step</h2>
            <ol className="space-y-5 mt-4">
              {[
                {
                  step: '1',
                  title: 'Train your bot',
                  desc: 'Go to your Appalix dashboard → Bots → Create Bot. Add your knowledge sources: website URL, PDF documents, Q&A pairs, or plain text. Once training is complete your bot is ready to deploy.',
                },
                {
                  step: '2',
                  title: 'Create your first integration',
                  desc: 'Navigate to Integrations → Add Integration. Choose your platform (Web Widget, Slack, WhatsApp, Telegram, etc.) and select the bot you just trained.',
                },
                {
                  step: '3',
                  title: 'Configure the integration',
                  desc: 'Set the welcome message, widget branding (for web), allowed origins, CRM webhook URL, and human handoff channel. These settings are unique to this integration and won\'t affect any other deployments.',
                },
                {
                  step: '4',
                  title: 'Get your embed code or credentials',
                  desc: 'For web widgets, copy the JavaScript snippet and paste it into your site\'s <head> tag. For Slack, authorise via OAuth. For WhatsApp and Telegram, paste your bot token or phone number ID.',
                },
                {
                  step: '5',
                  title: 'Repeat for every platform',
                  desc: 'Go back to Integrations → Add Integration and create a new one for the next channel. Your bot is already trained — just configure the platform-specific settings and you\'re live.',
                },
              ].map((item) => (
                <li key={item.step} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-brand-600/20 border border-brand-600/30 text-brand-400 font-bold text-sm flex items-center justify-center shrink-0 mt-0.5">
                    {item.step}
                  </div>
                  <div>
                    <p className="font-semibold text-white mb-1">{item.title}</p>
                    <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Pro tips */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Pro tips</h2>
            <ul className="space-y-3">
              {[
                'Keep your knowledge base centralised. Update training once — every integration benefits instantly.',
                'Use descriptive integration names (e.g. "Website — Pricing Page", "WhatsApp — Support") so your Conversations dashboard is easy to navigate.',
                'Set different CRM webhooks per integration to segment leads by source automatically in your CRM.',
                'Use the IP allowlist on Custom API integrations to lock down server-to-server calls to known IP addresses.',
                'Monitor the Conversations tab for each integration separately to spot which channel drives the most engagement.',
              ].map((tip, i) => (
                <li key={i} className="flex gap-3">
                  <svg className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-sm text-gray-300 leading-relaxed">{tip}</p>
                </li>
              ))}
            </ul>
          </section>

          {/* Summary */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Summary</h2>
            <p>
              Appalix is built for omnichannel from day one. Train your AI agent once on everything your business knows, then deploy it across every platform your customers use — with per-channel welcome messages, branding, CRM routing, and human handoff settings. There is no limit to the number of integrations you can create, and every integration is live the moment you save it.
            </p>
            <p className="mt-4">
              Whether you run one website or fifty, serve customers on WhatsApp in three countries, or manage a Slack community alongside a Telegram channel — one Appalix bot has you covered everywhere.
            </p>
          </section>

        </div>

        {/* Divider */}
        <div className="border-t border-white/10 my-12" />

        {/* CTA */}
        <div className="text-center">
          <p className="text-gray-400 mb-5 text-sm">Ready to deploy your AI agent everywhere?</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/login"
              className="px-6 py-2.5 bg-[#1a8c76] hover:bg-[#14705d] text-white text-sm font-medium rounded-xl transition-colors"
            >
              Start your free trial →
            </Link>
            <Link
              href="/platforms"
              className="px-6 py-2.5 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white text-sm font-medium rounded-xl transition-colors"
            >
              View all integrations
            </Link>
          </div>
        </div>

        {/* Back link */}
        <div className="mt-12 text-center">
          <Link href="/resources" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            ← Back to Resources
          </Link>
        </div>

      </div>
    </div>
  )
}
