import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { ScrollReveal } from '@/components/marketing/animate'

export const metadata: Metadata = {
  title: 'Integrations — Slack, WhatsApp, HubSpot, Salesforce & More | Appalix',
  description:
    'Deploy your AI sales agent across messaging channels, route leads to HubSpot, Salesforce, Zoho, or Intercom, and train it from Google Drive, Notion, Dropbox, and more.',
  keywords: [
    'WhatsApp AI chatbot',
    'Slack AI agent',
    'HubSpot AI integration',
    'Salesforce chatbot CRM',
    'Notion AI knowledge base',
    'Google Drive AI training',
    'multi-channel AI agent',
  ],
}

const CHANNELS = [
  {
    logo: '/integrations/slack.png',
    name: 'Slack',
    category: 'Team messaging',
    desc: 'Deploy your AI agent inside Slack workspaces. Answer questions, capture requests, and support team members directly in channels or DMs.',
    plan: null,
  },
  {
    logo: '/integrations/google-chat.png',
    name: 'Google Chat',
    category: 'Team messaging',
    desc: 'Connect your agent to Google Workspace. Respond to customer and team queries in Google Chat spaces and direct messages.',
    plan: null,
  },
  {
    logo: '/integrations/messenger.jpg',
    name: 'Facebook Messenger',
    category: 'Social messaging',
    desc: 'Handle customer enquiries directly on your Facebook Page. Your AI agent responds instantly — any time of day.',
    plan: null,
  },
  {
    logo: '/integrations/whatsapp.jpg',
    name: 'WhatsApp',
    category: 'Mobile messaging',
    desc: 'Reach customers on the world\'s most popular messaging app. Automate support, sales, and lead capture over WhatsApp Business.',
    plan: null,
  },
  {
    logo: '/integrations/wordpress.jpg',
    name: 'WordPress',
    category: 'Website',
    desc: 'Install the Appalix plugin with one click. Your AI agent appears as a chat widget on any WordPress site — no coding required.',
    plan: null,
  },
  {
    emoji: '🌐',
    name: 'Web Widget',
    category: 'Website',
    desc: 'Embed a fully branded chat widget on any website with a single line of JavaScript. Works with React, Vue, plain HTML — everything.',
    plan: null,
  },
  {
    emoji: '⚡',
    name: 'Custom API',
    category: 'Developer',
    desc: 'Use the Appalix REST API to build custom integrations, trigger agent runs from your backend, and retrieve conversation data programmatically.',
    plan: null,
  },
]

const CRMS = [
  {
    emoji: '🔗',
    name: 'Zapier',
    category: 'Automation',
    desc: 'Route captured leads to 6,000+ apps via a Zapier Catch Hook — HubSpot, Salesforce, Google Sheets, Pipedrive, Monday.com, and more. No code required.',
    plan: 'Core+',
    guide: '/resources/connect-zapier',
  },
  {
    emoji: '🟠',
    name: 'HubSpot',
    category: 'CRM',
    desc: 'Create contacts directly in HubSpot CRM the moment a visitor shares their email or phone number. Uses a HubSpot Private App token — no Zapier needed.',
    plan: 'Pro+',
    guide: '/resources/connect-hubspot',
  },
  {
    emoji: '💬',
    name: 'Intercom',
    category: 'CRM',
    desc: 'Automatically create Intercom leads when a visitor shares contact details. Leads appear in your inbox instantly, ready for follow-up.',
    plan: 'Pro+',
    guide: '/resources/connect-intercom',
  },
  {
    emoji: '🔵',
    name: 'Zoho CRM',
    category: 'CRM',
    desc: 'Push leads directly into Zoho CRM using an OAuth access token. Contacts are created under Leads with email, phone, and source set automatically.',
    plan: 'Pro+',
    guide: '/resources/connect-zoho-crm',
  },
  {
    emoji: '☁️',
    name: 'Salesforce',
    category: 'CRM',
    desc: 'Create Lead records in Salesforce automatically via the REST API. Requires an OAuth access token and your Salesforce instance URL.',
    plan: 'Pro+',
    guide: '/resources/connect-salesforce',
  },
]

const SOURCES = [
  {
    emoji: '📂',
    name: 'Google Drive',
    category: 'Cloud storage',
    desc: 'Connect a Google Drive folder or file. Appalix extracts content from Docs, Sheets, and Slides and indexes it for your bot automatically.',
    plan: 'Pro+',
  },
  {
    emoji: '📦',
    name: 'Dropbox',
    category: 'Cloud storage',
    desc: 'Link a Dropbox file or folder. Appalix downloads and indexes supported documents, keeping your bot\'s knowledge base up to date.',
    plan: 'Pro+',
  },
  {
    emoji: '☁️',
    name: 'OneDrive',
    category: 'Cloud storage',
    desc: 'Sync files directly from Microsoft OneDrive using your Microsoft access token. Perfect for teams already working inside Microsoft 365.',
    plan: 'Pro+',
  },
  {
    emoji: '🏢',
    name: 'SharePoint',
    category: 'Enterprise',
    desc: 'Pull training content from SharePoint document libraries. Ideal for enterprises with internal wikis and policy documents on SharePoint.',
    plan: 'Pro+',
  },
  {
    emoji: '📖',
    name: 'Notion',
    category: 'Productivity',
    desc: 'Connect a Notion page or database using an integration token. Your bot learns from your Notion workspace content automatically.',
    plan: 'Pro+',
  },
  {
    emoji: '📗',
    name: 'GitBook',
    category: 'Documentation',
    desc: 'Ingest your GitBook documentation space directly. Keep your bot perfectly aligned with your product docs as they evolve.',
    plan: 'Pro+',
  },
]

const PLAN_BADGE: Record<string, string> = {
  'Core+':  'bg-brand-600/10 text-brand-400 border-brand-600/20',
  'Pro+':   'bg-[#61c2ad]/10 text-[#61c2ad] border-[#61c2ad]/20',
}

export default function IntegrationsPage() {
  return (
    <div className="pt-24">
      {/* Hero */}
      <section className="relative py-20 px-6 text-center overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-600/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative max-w-3xl mx-auto">
          <ScrollReveal>
            <p className="text-xs text-brand-400 uppercase tracking-widest font-semibold mb-3">Integrations</p>
            <h1 className="text-4xl sm:text-5xl font-bold mb-5">One platform, endless connections</h1>
            <p className="text-gray-400 text-lg leading-relaxed">
              Deploy your AI agent on any channel, route leads to your CRM, and train it from your existing content — all from one dashboard.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.15}>
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              <Link href="/features" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
                View all features →
              </Link>
              <span className="text-gray-700">·</span>
              <Link href="/pricing" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
                See pricing →
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Chat & Messaging Channels */}
      <section className="py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal>
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Chat &amp; messaging channels</h2>
              <p className="text-xs text-gray-600 mt-1">Deploy your bot on the platforms your customers already use</p>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {CHANNELS.map((item, i) => (
              <ScrollReveal key={item.name} delay={i * 0.07}>
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-brand-600/30 transition-colors h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden ${'logo' in item && item.logo ? 'bg-white p-1' : 'bg-white/10'}`}>
                        {'logo' in item && item.logo ? (
                          <Image src={item.logo} alt={item.name} width={32} height={32} className="object-contain w-8 h-8" />
                        ) : (
                          <span className="text-xl">{'emoji' in item ? item.emoji : ''}</span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{item.name}</h3>
                        <span className="text-xs text-gray-500">{item.category}</span>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#61c2ad]/10 text-[#61c2ad] border border-[#61c2ad]/20 font-medium">
                      Available
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
                  <Link
                    href="/login"
                    className="inline-block mt-4 text-xs text-brand-400 hover:text-brand-300 font-medium transition-colors"
                  >
                    Connect →
                  </Link>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CRM Integrations */}
      <section className="py-12 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal>
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest">CRM &amp; lead capture</h2>
              <p className="text-xs text-gray-600 mt-1">Automatically push captured leads to your CRM the moment a visitor shares their email or phone number</p>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {CRMS.map((item, i) => (
              <ScrollReveal key={item.name} delay={i * 0.07}>
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-brand-600/30 transition-colors h-full flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                        <span className="text-xl">{item.emoji}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{item.name}</h3>
                        <span className="text-xs text-gray-500">{item.category}</span>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PLAN_BADGE[item.plan]}`}>
                      {item.plan}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed flex-1">{item.desc}</p>
                  <div className="flex items-center gap-4 mt-4">
                    <Link
                      href="/login"
                      className="text-xs text-brand-400 hover:text-brand-300 font-medium transition-colors"
                    >
                      Connect →
                    </Link>
                    {item.guide && (
                      <Link
                        href={item.guide}
                        className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        Setup guide →
                      </Link>
                    )}
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Knowledge Source Connectors */}
      <section className="py-12 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal>
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Knowledge source connectors</h2>
              <p className="text-xs text-gray-600 mt-1">Train your bot directly from cloud storage, documentation tools, and productivity apps</p>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SOURCES.map((item, i) => (
              <ScrollReveal key={item.name} delay={i * 0.07}>
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-[#61c2ad]/20 transition-colors h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                        <span className="text-xl">{item.emoji}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{item.name}</h3>
                        <span className="text-xs text-gray-500">{item.category}</span>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PLAN_BADGE[item.plan]}`}>
                      {item.plan}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
                  <Link
                    href="/login"
                    className="inline-block mt-4 text-xs text-[#61c2ad] hover:text-[#4aaa96] font-medium transition-colors"
                  >
                    Add source →
                  </Link>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Custom integration CTA */}
      <section className="py-20 px-6 border-t border-white/5">
        <ScrollReveal>
          <div className="max-w-3xl mx-auto text-center">
            <div className="text-3xl mb-4">🛠️</div>
            <h2 className="text-2xl font-bold mb-3">Need a custom integration?</h2>
            <p className="text-gray-400 mb-8 text-sm leading-relaxed">
              Enterprise customers get dedicated engineering support and custom connector builds. Talk to us about your use case.
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#1a8c76] hover:bg-[#14705d] text-white font-medium rounded-xl transition-colors text-sm"
            >
              View Enterprise plan
            </Link>
          </div>
        </ScrollReveal>
      </section>
    </div>
  )
}
