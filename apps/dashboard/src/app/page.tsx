import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { MarketingNavbar } from '@/components/marketing/navbar'
import { MarketingFooter } from '@/components/marketing/footer'
import { FadeUp, ScrollReveal } from '@/components/marketing/animate'
import { LiveChatWidget } from '@/components/marketing/live-chat-widget'
import { createAdminClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Appalix — AI Sales Agent | Convert Visitors to Clients 24/7',
  description:
    'Deploy AI agents trained on your website content. Answer questions, capture leads, and close deals 24/7 across 7+ platforms. Try free for 7 days — no card required.',
  keywords: [
    'AI sales agent',
    'chatbot for website',
    'AI chatbot SaaS',
    'lead capture chatbot',
    'ChatGPT for your website',
  ],
}

const PLATFORMS = [
  { name: 'Slack',               logo: '/integrations/slack.png' },
  { name: 'Google Chat',         logo: '/integrations/google-chat.png' },
  { name: 'Facebook Messenger',  logo: '/integrations/messenger.jpg' },
  { name: 'WhatsApp',            logo: '/integrations/whatsapp.jpg' },
  { name: 'WordPress',           emoji: '🌐' },
  { name: 'Web Widget',          emoji: '🌐' },
  { name: 'Custom API',          emoji: '⚡' },
]

const STEPS = [
  { step: '01', title: 'Train',   desc: 'Connect your website, upload documents, or paste content. Your agent is ready in minutes.' },
  { step: '02', title: 'Deploy',  desc: 'Embed on your site or connect to Slack, WhatsApp, Facebook Messenger and more.' },
  { step: '03', title: 'Convert', desc: 'Engage every visitor 24/7, capture leads, and hand off hot prospects to your sales team.' },
]

const FEATURES = [
  {
    icon: '🧠',
    title: 'Trained on your content',
    desc: 'Upload URLs, PDFs, docs, or paste text. Your agent learns your product inside-out in minutes.',
  },
  {
    icon: '🌐',
    title: 'Deploy everywhere',
    desc: 'One agent, seven platforms. Slack, WhatsApp, your website, and more — all from one dashboard.',
  },
  {
    icon: '🎯',
    title: 'Capture leads 24/7',
    desc: 'Collect names, emails, and phone numbers automatically during every conversation.',
  },
  {
    icon: '📊',
    title: 'Analytics & insights',
    desc: 'Track conversations, sentiment, response times, and token usage with detailed reporting.',
  },
]



export default async function HomePage() {
  const admin = createAdminClient()
  const { data: integrationRow } = await admin
    .from('integrations')
    .select('id')
    .eq('platform', 'web_widget')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  const widgetIntegrationId = integrationRow?.id as string | undefined
  return (
    <div className="bg-[#111111] min-h-screen text-white">
      <MarketingNavbar />

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="relative pt-36 pb-24 px-6 overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-brand-600/20 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <FadeUp delay={0}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-600/40 bg-brand-600/10 text-brand-400 text-xs font-medium mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
                Limitless AI. Delivered.
              </div>
            </FadeUp>

            <FadeUp delay={0.1}>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-snug mb-6">
                Let AI turn visitors into<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-600">
                  long term paying clients
                </span><br />
                while you focus on your<br />
                core competencies
              </h1>
            </FadeUp>

            <FadeUp delay={0.2}>
              <p className="text-base sm:text-xl lg:text-2xl text-white leading-relaxed max-w-3xl mx-auto mb-4">
                Deploy AI agents trained on your website and business content across every customer touchpoint. Answer questions, capture leads, and convert visitors into customers 24/7.
              </p>
            </FadeUp>

            <FadeUp delay={0.25}>
              <ul className="flex flex-col sm:flex-row gap-2 justify-center text-sm text-gray-300 mb-8">
                <li className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-brand-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Personalized onboarding help
                </li>
                <li className="flex items-center gap-1.5 sm:ml-4">
                  <svg className="w-4 h-4 text-brand-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Friendly pricing as you scale
                </li>
              </ul>
            </FadeUp>

            <FadeUp delay={0.3}>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/login"
                  className="px-6 py-3 bg-[#3873BB] hover:bg-[#1a4073] text-white font-medium rounded-xl transition-colors text-sm"
                >
                  Start free — no card required
                </Link>
                <Link
                  href="/features"
                  className="px-6 py-3 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white font-medium rounded-xl transition-colors text-sm"
                >
                  See all features →
                </Link>
              </div>
            </FadeUp>
          </div>

        </div>
      </section>

      {/* ── Live demo ──────────────────────────────────────────────── */}
      <section className="pt-12 pb-24 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-14 items-center">

          {/* Left — 2/3 */}
          <ScrollReveal className="lg:col-span-2 space-y-8">
            <div>
              <p className="text-xs text-brand-400 uppercase tracking-widest font-semibold mb-3">Live demo</p>
              <h2 className="text-3xl sm:text-4xl font-bold leading-snug mb-4">
                Your AI Agent: Trained, Deployed &amp; Converting.
              </h2>
              <p className="text-gray-400 text-base leading-relaxed">
                Ask anything about Appalix. This is a real agent running live on our own platform — the same one you can deploy on your website in minutes.
              </p>
            </div>
            <ul className="space-y-4">
              {[
                { icon: '🧠', title: 'Knows your product inside-out', desc: 'Trained on your docs, URLs, PDFs, and FAQs. Always accurate, never makes things up.' },
                { icon: '🎯', title: 'Captures leads automatically', desc: 'Collects name, email, and phone during natural conversation — no forms needed.' },
                { icon: '🤝', title: 'Hands off to humans seamlessly', desc: 'Detects when a visitor wants a real person and alerts your team instantly on Slack, WhatsApp, or Discord.' },
                { icon: '⚡', title: 'Live in under 10 minutes', desc: 'Paste a URL, train, embed one line of code. Your agent is live before the coffee gets cold.' },
              ].map((item) => (
                <li key={item.title} className="flex gap-4">
                  <span className="text-2xl mt-0.5 shrink-0">{item.icon}</span>
                  <div>
                    <p className="font-semibold text-white text-sm mb-0.5">{item.title}</p>
                    <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex gap-3">
              <Link href="/login" className="px-5 py-2.5 bg-[#3873BB] hover:bg-[#1a4073] text-white text-sm font-medium rounded-xl transition-colors">
                Build your agent free →
              </Link>
            </div>
          </ScrollReveal>

          {/* Right — 1/3 */}
          <ScrollReveal delay={0.15} className="lg:col-span-1">
            {widgetIntegrationId && (
              <LiveChatWidget integrationId={widgetIntegrationId} />
            )}
          </ScrollReveal>

        </div>
      </section>

      {/* ── Social proof ───────────────────────────────────────────── */}
      <section className="py-10 border-y border-white/5">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-widest font-medium mb-6">
            Powering customer conversations for 500+ teams
          </p>
          <div className="flex flex-wrap items-center justify-center gap-10">
            {['Acme Corp', 'GrowthCo', 'Nexus Labs', 'Skyline Inc', 'Orbit AI'].map((name) => (
              <span key={name} className="text-sm font-semibold text-gray-400">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-16">
              <p className="text-xs text-brand-400 uppercase tracking-widest font-semibold mb-3">How it works</p>
              <h2 className="text-3xl sm:text-4xl font-bold">Up and running in minutes</h2>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((s, i) => (
              <ScrollReveal key={s.step} delay={i * 0.1}>
                <div className="relative p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-brand-600/40 transition-colors group h-full">
                  <span className="text-5xl font-black text-white/20 group-hover:text-brand-600/40 transition-colors absolute top-4 right-5 select-none">
                    {s.step}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-brand-600/20 border border-brand-600/30 flex items-center justify-center mb-4">
                    <span className="text-brand-400 text-xs font-bold">{s.step}</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{s.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-16">
              <p className="text-xs text-brand-400 uppercase tracking-widest font-semibold mb-3">Features</p>
              <h2 className="text-3xl sm:text-4xl font-bold">Everything you need to sell smarter</h2>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f, i) => (
              <ScrollReveal key={f.title} delay={i * 0.08}>
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-brand-600/30 transition-colors h-full">
                  <div className="text-3xl mb-4">{f.icon}</div>
                  <h3 className="font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/features" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
              See all features →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Integrations ───────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-16">
              <p className="text-xs text-brand-400 uppercase tracking-widest font-semibold mb-3">Integrations</p>
              <h2 className="text-3xl sm:text-4xl font-bold">One agent, every platform</h2>
              <p className="text-gray-400 mt-4 max-w-xl mx-auto text-sm">Connect your AI agent to the channels your customers already use.</p>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <div className="flex flex-wrap justify-center gap-3">
              {PLATFORMS.map((p) => (
                <div key={p.name} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-brand-600/30 transition-colors">
                  <div className="w-5 h-5 flex items-center justify-center shrink-0">
                    {'logo' in p && p.logo ? (
                      <div className="w-5 h-5 rounded bg-white p-0.5 flex items-center justify-center">
                        <Image src={p.logo as string} alt={p.name} width={16} height={16} className="object-contain w-4 h-4" />
                      </div>
                    ) : (
                      <span className="text-lg">{'emoji' in p ? p.emoji : ''}</span>
                    )}
                  </div>
                  <span className="text-sm text-gray-300 font-medium">{p.name}</span>
                </div>
              ))}
            </div>
          </ScrollReveal>
          <div className="text-center mt-8">
            <Link href="/platforms" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
              View all integrations →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Pricing teaser ─────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <ScrollReveal>
            <p className="text-xs text-brand-400 uppercase tracking-widest font-semibold mb-3">Pricing</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-gray-400 mb-8 text-sm">Plans from $29/mo. 7-day free trial on all plans. No credit card required.</p>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              {[
                { name: 'Starter', price: '$29' },
                { name: 'Core',    price: '$39' },
                { name: 'Pro',     price: '$79',  popular: true },
                { name: 'Scale',   price: '$249' },
                { name: 'Enterprise', price: 'Custom' },
              ].map((p) => (
                <div
                  key={p.name}
                  className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                    p.popular
                      ? 'bg-brand-600/20 border-brand-600/50 text-brand-300'
                      : 'bg-white/5 border-white/10 text-gray-400'
                  }`}
                >
                  {p.name} <span className={p.popular ? 'text-white' : 'text-gray-300'}>{p.price}</span>
                  {p.popular && <span className="ml-2 text-xs bg-brand-600 text-white px-1.5 py-0.5 rounded-full">Popular</span>}
                </div>
              ))}
            </div>
          </ScrollReveal>
          <Link href="/pricing" className="inline-flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300 transition-colors">
            Compare plans →
          </Link>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-white/5">
        <ScrollReveal>
          <div className="relative max-w-4xl mx-auto text-center">
            <div className="absolute inset-0 bg-brand-600/10 rounded-3xl blur-3xl" />
            <div className="relative p-12 rounded-3xl border border-brand-600/20 bg-white/[0.02]">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to put your sales on autopilot?</h2>
              <p className="text-gray-400 mb-8 text-sm max-w-xl mx-auto">
                Join 500+ teams using Appalix to convert more visitors, capture more leads, and support customers around the clock.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#3873BB] hover:bg-[#1a4073] text-white font-medium rounded-xl transition-colors"
              >
                Start your free trial
              </Link>
              <p className="text-xs text-gray-400 mt-4">7-day free trial · No credit card required · Cancel anytime</p>
            </div>
          </div>
        </ScrollReveal>
      </section>

      <MarketingFooter />
    </div>
  )
}
