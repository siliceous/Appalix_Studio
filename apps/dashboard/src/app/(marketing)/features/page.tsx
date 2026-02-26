import Link from 'next/link'
import type { Metadata } from 'next'
import { ScrollReveal } from '@/components/marketing/animate'

export const metadata: Metadata = {
  title: 'Features — AI Agent Training, Lead Capture & Analytics | Appalix',
  description:
    'Multi-source training, 7-platform deployment, automated lead capture, human handoff, and advanced analytics. Deploy AI sales agents at scale.',
  keywords: [
    'AI chatbot features',
    'lead capture chatbot',
    'multi-platform AI agent',
    'human handoff chatbot',
    'AI agent analytics',
  ],
}

const FEATURES = [
  {
    icon: '🧠',
    title: 'Multi-source content training',
    desc: 'Train your agent on website URLs, sitemaps, PDFs, DOCX, CSV, TXT, and raw text. Sync daily, weekly, or on demand — your agent always stays up to date.',
    tag: 'Knowledge',
  },
  {
    icon: '🌐',
    title: 'Multi-platform deployment',
    desc: 'One agent, seven channels. Deploy to your website, Slack, Google Chat, WhatsApp, Facebook Messenger, WordPress, or any custom API endpoint.',
    tag: 'Deployment',
  },
  {
    icon: '🎯',
    title: 'Automated lead capture',
    desc: 'Collect visitor names, email addresses, and phone numbers mid-conversation. Leads are stored in your dashboard and can be exported or sent to your CRM.',
    tag: 'Sales',
  },
  {
    icon: '🤝',
    title: 'Human handoff',
    desc: 'When a conversation needs a human touch, Appalix seamlessly escalates to your support team — with full conversation context passed along.',
    tag: 'Support',
  },
  {
    icon: '📊',
    title: 'Analytics & reporting',
    desc: 'Track conversations, sentiment scores, response times, token usage, and cost. Daily email summaries keep you informed without logging in.',
    tag: 'Insights',
  },
  {
    icon: '🌍',
    title: 'Multilingual support',
    desc: 'Your agent automatically detects and responds in the visitor\'s language across 95+ languages — no extra configuration needed.',
    tag: 'Global',
  },
  {
    icon: '🎨',
    title: 'Custom branding',
    desc: 'Match your brand colours, fonts, avatar, and name. The web widget looks like a native part of your site, not a third-party tool.',
    tag: 'Branding',
  },
  {
    icon: '⚡',
    title: 'API & webhook access',
    desc: 'Full REST API access on Pro and above. Send messages, retrieve conversations, and trigger agent runs from any external system.',
    tag: 'Developer',
  },
]

const COMPARISON = [
  { feature: 'Number of bots',          starter: '1',          core: '3',          pro: '10',          scale: 'Unlimited' },
  { feature: 'Conversations / month',   starter: '500',        core: '1,500',      pro: '5,000',       scale: '25,000' },
  { feature: 'Integrations',            starter: '2',          core: '5',          pro: 'All',         scale: 'All' },
  { feature: 'Lead capture',            starter: '✓',          core: '✓',          pro: '✓',           scale: '✓' },
  { feature: 'Human handoff',           starter: '—',          core: '✓',          pro: '✓',           scale: '✓' },
  { feature: 'Analytics dashboard',     starter: 'Basic',      core: 'Basic',      pro: 'Advanced',    scale: 'Advanced' },
  { feature: 'Multilingual',            starter: '✓',          core: '✓',          pro: '✓',           scale: '✓' },
  { feature: 'Custom branding',         starter: '—',          core: '—',          pro: '✓',           scale: '✓' },
  { feature: 'API access',              starter: '—',          core: '—',          pro: '✓',           scale: '✓' },
  { feature: 'White-label',             starter: '—',          core: '—',          pro: '—',           scale: '✓' },
]

export default function FeaturesPage() {
  return (
    <div className="pt-24">
      {/* Hero */}
      <section className="relative py-20 px-6 text-center overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-600/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative max-w-3xl mx-auto">
          <ScrollReveal>
            <p className="text-xs text-brand-400 uppercase tracking-widest font-semibold mb-3">Features</p>
            <h1 className="text-4xl sm:text-5xl font-bold mb-5">Built to convert, built to scale</h1>
            <p className="text-gray-400 text-lg leading-relaxed">
              Everything you need to deploy, manage, and optimise AI sales agents across every channel your customers use.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.15}>
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              <Link href="/platforms" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
                View integrations →
              </Link>
              <span className="text-gray-700">·</span>
              <Link href="/pricing" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
                See pricing →
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Feature grid */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((f, i) => (
            <ScrollReveal key={f.title} delay={i * 0.06}>
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-brand-600/30 transition-colors flex flex-col h-full">
                <div className="text-3xl mb-4">{f.icon}</div>
                <span className="text-xs text-brand-400 font-semibold uppercase tracking-widest mb-2">{f.tag}</span>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed flex-1">{f.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* Comparison table */}
      <section className="py-16 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal>
            <h2 className="text-2xl font-bold text-center mb-10">Feature comparison</h2>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 pr-6 text-gray-500 font-medium">Feature</th>
                    {['Starter', 'Core', 'Pro', 'Scale'].map((p) => (
                      <th key={p} className={`py-3 px-4 text-center font-semibold ${p === 'Pro' ? 'text-brand-400' : 'text-gray-300'}`}>
                        {p}
                        {p === 'Pro' && <span className="ml-1 text-xs bg-brand-600 text-white px-1.5 py-0.5 rounded-full align-middle">Popular</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((row, i) => (
                    <tr key={row.feature} className={`border-b border-white/5 ${i % 2 === 0 ? '' : 'bg-white/[0.02]'}`}>
                      <td className="py-3 pr-6 text-gray-400">{row.feature}</td>
                      <td className="py-3 px-4 text-center text-gray-400">{row.starter}</td>
                      <td className="py-3 px-4 text-center text-gray-400">{row.core}</td>
                      <td className="py-3 px-4 text-center text-brand-300 font-medium">{row.pro}</td>
                      <td className="py-3 px-4 text-center text-gray-400">{row.scale}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 border-t border-white/5 text-center">
        <ScrollReveal>
          <h2 className="text-2xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-gray-400 mb-8 text-sm">7-day free trial on every plan. No credit card required.</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#1a8c76] hover:bg-[#14705d] text-white font-medium rounded-xl transition-colors"
          >
            Start a 7 Day Free Trial
          </Link>
        </ScrollReveal>
      </section>
    </div>
  )
}
