import Link from 'next/link'
import { MarketingNavbar } from '@/components/marketing/navbar'
import { MarketingFooter } from '@/components/marketing/footer'

const PLATFORMS = [
  { name: 'Slack',               emoji: '💬' },
  { name: 'Google Chat',         emoji: '💙' },
  { name: 'Facebook Messenger',  emoji: '📘' },
  { name: 'WhatsApp',            emoji: '📱' },
  { name: 'WordPress',           emoji: '🌐' },
  { name: 'Web Widget',          emoji: '🔌' },
  { name: 'Custom API',          emoji: '⚡' },
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

const STEPS = [
  { step: '01', title: 'Train',   desc: 'Connect your website, upload documents, or paste content. Your agent is ready in minutes.' },
  { step: '02', title: 'Deploy',  desc: 'Embed on your site or connect to Slack, WhatsApp, Facebook Messenger and more.' },
  { step: '03', title: 'Convert', desc: 'Engage every visitor 24/7, capture leads, and hand off hot prospects to your sales team.' },
]

const CHAT_MESSAGES = [
  { role: 'user',      text: 'What plans do you offer?' },
  { role: 'assistant', text: 'We have 5 plans starting at $29/mo. The most popular is Pro at $79/mo, which includes unlimited integrations and priority support. Want me to walk you through the differences?' },
  { role: 'user',      text: 'Yes please, and can I try it free?' },
  { role: 'assistant', text: 'Absolutely! Every plan comes with a 7-day free trial — no credit card required. Shall I set up your account now?' },
]

export default function HomePage() {
  return (
    <div className="bg-[#050505] min-h-screen text-white">
      <MarketingNavbar />

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="relative pt-36 pb-24 px-6 overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-brand-600/20 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-600/40 bg-brand-600/10 text-brand-400 text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
              AI Sales Agent — Always On
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-tight mb-6">
              Turn visitors into{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-600">
                customers
              </span>
              , automatically
            </h1>
            <p className="text-lg text-gray-400 leading-relaxed max-w-2xl mx-auto mb-8">
              Deploy AI agents trained on your content across your website, Slack, WhatsApp, and 4 more platforms. Answer questions, capture leads, and close deals — 24 hours a day.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/login"
                className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-colors text-sm"
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
          </div>

          {/* Chat mockup */}
          <div className="max-w-md mx-auto bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/5">
              <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
              <span className="text-xs text-gray-400 font-medium">Appalix AI Agent · Online</span>
            </div>
            <div className="p-4 space-y-3">
              {CHAT_MESSAGES.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-brand-600 text-white rounded-br-sm'
                      : 'bg-white/10 text-gray-200 rounded-bl-sm'
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2 mt-4">
                <input
                  type="text"
                  placeholder="Ask anything…"
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 placeholder-gray-600 outline-none"
                  readOnly
                />
                <button className="p-2 bg-brand-600 rounded-lg">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Social proof ───────────────────────────────────────────── */}
      <section className="py-10 border-y border-white/5">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="text-xs text-gray-600 uppercase tracking-widest font-medium mb-6">
            Powering customer conversations for 500+ teams
          </p>
          <div className="flex flex-wrap items-center justify-center gap-10">
            {['Acme Corp', 'GrowthCo', 'Nexus Labs', 'Skyline Inc', 'Orbit AI'].map((name) => (
              <span key={name} className="text-sm font-semibold text-gray-700">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs text-brand-400 uppercase tracking-widest font-semibold mb-3">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-bold">Up and running in minutes</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((s) => (
              <div key={s.step} className="relative p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-brand-600/40 transition-colors group">
                <span className="text-5xl font-black text-white/5 group-hover:text-brand-600/20 transition-colors absolute top-4 right-5 select-none">
                  {s.step}
                </span>
                <div className="w-8 h-8 rounded-lg bg-brand-600/20 border border-brand-600/30 flex items-center justify-center mb-4">
                  <span className="text-brand-400 text-xs font-bold">{s.step}</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs text-brand-400 uppercase tracking-widest font-semibold mb-3">Features</p>
            <h2 className="text-3xl sm:text-4xl font-bold">Everything you need to sell smarter</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-brand-600/30 transition-colors">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
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
          <div className="text-center mb-16">
            <p className="text-xs text-brand-400 uppercase tracking-widest font-semibold mb-3">Integrations</p>
            <h2 className="text-3xl sm:text-4xl font-bold">One agent, every platform</h2>
            <p className="text-gray-400 mt-4 max-w-xl mx-auto text-sm">Connect your AI agent to the channels your customers already use.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {PLATFORMS.map((p) => (
              <div key={p.name} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-brand-600/30 transition-colors">
                <span className="text-lg">{p.emoji}</span>
                <span className="text-sm text-gray-300 font-medium">{p.name}</span>
              </div>
            ))}
          </div>
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
          <p className="text-xs text-brand-400 uppercase tracking-widest font-semibold mb-3">Pricing</p>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Simple, transparent pricing</h2>
          <p className="text-gray-400 mb-8 text-sm">Plans from $29/mo. 7-day free trial on all plans. No credit card required.</p>
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
          <Link href="/pricing" className="inline-flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300 transition-colors">
            Compare plans →
          </Link>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="absolute inset-0 bg-brand-600/10 rounded-3xl blur-3xl" />
          <div className="relative p-12 rounded-3xl border border-brand-600/20 bg-white/[0.02]">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to put your sales on autopilot?</h2>
            <p className="text-gray-400 mb-8 text-sm max-w-xl mx-auto">
              Join 500+ teams using Appalix to convert more visitors, capture more leads, and support customers around the clock.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-colors"
            >
              Start your free trial
            </Link>
            <p className="text-xs text-gray-600 mt-4">7-day free trial · No credit card required · Cancel anytime</p>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
