import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { ScrollReveal } from '@/components/marketing/animate'

export const metadata: Metadata = {
  title: 'Integrations — Slack, WhatsApp, Facebook Messenger & More | Appalix',
  description:
    'Deploy your AI sales agent on Slack, WhatsApp, Facebook Messenger, Google Chat, WordPress, and your website. One agent, every channel your customers use.',
  keywords: [
    'WhatsApp AI chatbot',
    'Slack AI agent',
    'Facebook Messenger chatbot',
    'WordPress AI chat widget',
    'multi-channel AI agent',
  ],
}

const INTEGRATIONS = [
  {
    logo: '/integrations/slack.png',
    name: 'Slack',
    category: 'Team messaging',
    desc: 'Deploy your AI agent inside Slack workspaces. Answer questions, capture requests, and support team members directly in channels or DMs.',
    status: 'Available',
  },
  {
    logo: '/integrations/google-chat.png',
    name: 'Google Chat',
    category: 'Team messaging',
    desc: 'Connect your agent to Google Workspace. Respond to customer and team queries in Google Chat spaces and direct messages.',
    status: 'Available',
  },
  {
    logo: '/integrations/messenger.jpg',
    name: 'Facebook Messenger',
    category: 'Social messaging',
    desc: 'Handle customer enquiries directly on your Facebook Page. Your AI agent responds instantly — any time of day.',
    status: 'Available',
  },
  {
    logo: '/integrations/whatsapp.jpg',
    name: 'WhatsApp',
    category: 'Mobile messaging',
    desc: 'Reach customers on the world\'s most popular messaging app. Automate support, sales, and lead capture over WhatsApp Business.',
    status: 'Available',
  },
  {
    emoji: '🌐',
    name: 'WordPress',
    category: 'Website',
    desc: 'Install the Appalix plugin with one click. Your AI agent appears as a chat widget on any WordPress site — no coding required.',
    status: 'Available',
  },
  {
    emoji: '🌐',
    name: 'Web Widget',
    category: 'Website',
    desc: 'Embed a fully branded chat widget on any website with a single line of JavaScript. Works with React, Vue, plain HTML — everything.',
    status: 'Available',
  },
  {
    emoji: '⚡',
    name: 'Custom API',
    category: 'Developer',
    desc: 'Use the Appalix REST API to build custom integrations, trigger agent runs from your backend, and retrieve conversation data programmatically.',
    status: 'Available',
  },
  {
    emoji: '🔗',
    name: 'Zapier',
    category: 'Automation',
    desc: 'Connect Appalix to 5,000+ apps via Zapier. Trigger workflows when a lead is captured, a conversation closes, or an agent run completes.',
    status: 'Coming soon',
  },
  {
    emoji: '📧',
    name: 'Email / Intercom',
    category: 'Support',
    desc: 'Route unresolved conversations to your email support queue or Intercom inbox — with full conversation history attached.',
    status: 'Coming soon',
  },
]

export default function IntegrationsPage() {
  const available  = INTEGRATIONS.filter((i) => i.status === 'Available')
  const comingSoon = INTEGRATIONS.filter((i) => i.status === 'Coming soon')

  return (
    <div className="pt-24">
      {/* Hero */}
      <section className="relative py-20 px-6 text-center overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-600/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative max-w-3xl mx-auto">
          <ScrollReveal>
            <p className="text-xs text-brand-400 uppercase tracking-widest font-semibold mb-3">Integrations</p>
            <h1 className="text-4xl sm:text-5xl font-bold mb-5">One agent, every channel</h1>
            <p className="text-gray-400 text-lg leading-relaxed">
              Deploy your AI sales agent on the platforms your customers already use — no switching, no friction.
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

      {/* Available integrations */}
      <section className="py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-6">Available now</h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {available.map((integration, i) => (
              <ScrollReveal key={integration.name} delay={i * 0.07}>
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-brand-600/30 transition-colors h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden ${'logo' in integration && integration.logo ? 'bg-white p-1' : 'bg-white/10'}`}>
                        {'logo' in integration && integration.logo ? (
                          <Image src={integration.logo} alt={integration.name} width={32} height={32} className="object-contain w-8 h-8" />
                        ) : (
                          <span className="text-xl">{'emoji' in integration ? integration.emoji : ''}</span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{integration.name}</h3>
                        <span className="text-xs text-gray-500">{integration.category}</span>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#61c2ad]/10 text-[#61c2ad] border border-[#61c2ad]/20 font-medium">
                      {integration.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed">{integration.desc}</p>
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

      {/* Coming soon */}
      <section className="py-12 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-6">Coming soon</h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {comingSoon.map((integration, i) => (
              <ScrollReveal key={integration.name} delay={i * 0.07}>
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 opacity-70 h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden ${'logo' in integration && integration.logo ? 'bg-white p-1' : 'bg-white/5'}`}>
                        {'logo' in integration && integration.logo ? (
                          <Image src={integration.logo} alt={integration.name} width={32} height={32} className="object-contain w-8 h-8" />
                        ) : (
                          <span className="text-xl">{'emoji' in integration ? integration.emoji : ''}</span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{integration.name}</h3>
                        <span className="text-xs text-gray-600">{integration.category}</span>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-500 border border-white/10 font-medium">
                      {integration.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed">{integration.desc}</p>
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
