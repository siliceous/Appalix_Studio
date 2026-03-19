import type { Metadata } from 'next'
import Link from 'next/link'
import { FadeUp, ScrollReveal } from '@/components/marketing/animate'
import { BookDemoButton } from '@/components/marketing/book-demo-modal'

export const metadata: Metadata = {
  title: 'Appalix eCommerce — AI Order Support for Shopify, WooCommerce & More',
  description:
    'Connect your store and let an AI bot answer order status, shipping tracking, and customer queries 24/7. Works with Shopify, WooCommerce, and Magento.',
  alternates: { canonical: 'https://appalix.ai/ecommerce' },
}

const PLATFORMS = [
  { name: 'Shopify',     emoji: '🛍️', desc: 'Connect via Admin API access token. No app store required.' },
  { name: 'WooCommerce', emoji: '🟣', desc: 'Plug in your WooCommerce REST API key and secret.' },
  { name: 'Magento',     emoji: '🟠', desc: 'Connect via Magento REST API for full order access.' },
  { name: 'Any store',   emoji: '⚡', desc: 'Custom API integration for any eCommerce platform.' },
]

const WHAT_IT_ANSWERS = [
  { q: '"Where is my order?"',                   a: 'Looks up order status, fulfillment, and estimated delivery in real time.' },
  { q: '"Has my package shipped?"',              a: 'Returns carrier, tracking number, and live tracking URL.' },
  { q: '"What did I order last month?"',         a: 'Lists all recent orders for the customer\'s email.' },
  { q: '"Can I return my item?"',                a: 'Explains your return policy from your knowledge base.' },
  { q: '"My order arrived damaged."',            a: 'Creates a support ticket automatically for your team to action.' },
  { q: '"Do you ship to Australia?"',            a: 'Answers from your knowledge base — shipping zones, costs, timelines.' },
]

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Connect your store',
    desc: 'Add a Shopify integration in Appalix. Enter your store domain and Admin API access token. Done in under 2 minutes.',
  },
  {
    step: '02',
    title: 'Enable tools on your bot',
    desc: 'Toggle "Enable tools" on your bot. Appalix gives it live access to your store — orders, fulfillments, customers.',
  },
  {
    step: '03',
    title: 'Deploy the widget on your store',
    desc: 'Paste one script tag into your theme footer. The chat widget appears on every page of your store, ready to help.',
  },
  {
    step: '04',
    title: 'Customers get instant answers',
    desc: 'Shopper asks "where\'s my order?" — the bot looks it up live and replies in seconds. No human needed.',
  },
]

const FEATURES = [
  {
    icon: '📦',
    title: 'Live order lookup',
    desc: 'The bot queries your store API in real time. Order status, items, total, and shipping address — all pulled live, never stale.',
  },
  {
    icon: '🚚',
    title: 'Shipping & tracking',
    desc: 'Returns carrier name, tracking number, and a direct link to the tracking page. Customers stop emailing — they just ask.',
  },
  {
    icon: '🧾',
    title: 'Order history',
    desc: 'Customer provides their email — the bot lists all recent orders with status. Full purchase history, instantly.',
  },
  {
    icon: '🎫',
    title: 'Auto support tickets',
    desc: 'Damaged item? Wrong size? The bot creates a support ticket automatically and assigns it to your team.',
  },
  {
    icon: '📚',
    title: 'Policy & FAQ answers',
    desc: 'Train the bot on your returns policy, shipping zones, and FAQs. It answers from your knowledge base before escalating.',
  },
  {
    icon: '🌙',
    title: '24/7 — no staff needed',
    desc: 'Every order query handled instantly, round the clock. Your support team wakes up to resolved tickets, not a queue.',
  },
]

export default function EcommercePage() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="relative pt-36 pb-24 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-[#15A4AE]/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="relative max-w-4xl mx-auto text-center">
          <FadeUp delay={0}>
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-brand-600/40 bg-brand-600/10 text-white font-medium mb-8 text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse shrink-0" />
              eCommerce AI Support
            </div>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.2] mb-6 text-white">
              Your store never sleeps.<br />
              <span className="text-[#15A4AE]">Neither does your support.</span>
            </h1>
          </FadeUp>
          <FadeUp delay={0.2}>
            <p className="text-xl text-gray-400 leading-relaxed max-w-2xl mx-auto mb-10">
              Connect Appalix to your Shopify, WooCommerce, or Magento store. Your AI bot answers order status, shipping tracking, and customer queries instantly — 24/7, without a support team.
            </p>
          </FadeUp>
          <FadeUp delay={0.3}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login" className="px-10 py-3.5 bg-[#1a8c76] hover:bg-[#14705d] text-white text-lg font-medium rounded-xl transition-colors">
                Connect your store free
              </Link>
              <BookDemoButton label="See it live →" className="px-10 py-3.5 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white text-lg font-medium rounded-xl transition-colors" />
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── Supported platforms ── */}
      <section className="py-16 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <ScrollReveal className="text-center mb-10">
            <p className="text-sm text-[#15A4AE] uppercase tracking-widest font-semibold mb-3">Works with</p>
            <h2 className="text-3xl font-bold">Your platform. Your data.</h2>
          </ScrollReveal>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {PLATFORMS.map((p) => (
              <ScrollReveal key={p.name}>
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/8 text-center hover:border-[#15A4AE]/30 transition-colors">
                  <span className="text-3xl block mb-3">{p.emoji}</span>
                  <p className="text-sm font-semibold text-white mb-1">{p.name}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{p.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── What it answers ── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <ScrollReveal className="text-center mb-12">
            <p className="text-sm text-[#15A4AE] uppercase tracking-widest font-semibold mb-3">Real questions. Real answers.</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">What customers ask — and what the bot does</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">Every answer comes from live store data, not a script.</p>
          </ScrollReveal>
          <div className="space-y-3">
            {WHAT_IT_ANSWERS.map((item, i) => (
              <ScrollReveal key={i} delay={i * 0.05}>
                <div className="flex gap-4 p-5 rounded-2xl bg-white/[0.03] border border-white/8 hover:border-[#15A4AE]/20 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white mb-1.5">{item.q}</p>
                    <p className="text-sm text-gray-400 leading-relaxed">{item.a}</p>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-[#15A4AE]/15 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[#15A4AE] text-xs font-bold">✓</span>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal className="text-center mb-14">
            <p className="text-sm text-[#15A4AE] uppercase tracking-widest font-semibold mb-3">Setup in minutes</p>
            <h2 className="text-3xl sm:text-4xl font-bold">Live on your store in 4 steps</h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {HOW_IT_WORKS.map((s, i) => (
              <ScrollReveal key={s.step} delay={i * 0.08}>
                <div className="relative p-6 rounded-2xl bg-white/[0.03] border border-white/8 hover:border-[#15A4AE]/30 transition-colors h-full">
                  <span className="text-4xl font-black text-white/10 absolute top-4 right-5 select-none">{s.step}</span>
                  <div className="w-8 h-8 rounded-lg bg-[#15A4AE]/15 border border-[#15A4AE]/30 flex items-center justify-center mb-4">
                    <span className="text-[#15A4AE] text-xs font-bold">{s.step}</span>
                  </div>
                  <h3 className="text-base font-semibold text-white mb-2">{s.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{s.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal className="text-center mb-14">
            <p className="text-sm text-[#15A4AE] uppercase tracking-widest font-semibold mb-3">What&apos;s included</p>
            <h2 className="text-3xl sm:text-4xl font-bold">Everything your store support needs</h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <ScrollReveal key={f.title} delay={i * 0.06}>
                <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/8 hover:border-[#15A4AE]/25 transition-colors h-full">
                  <span className="text-3xl block mb-4">{f.icon}</span>
                  <h3 className="text-base font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Shopify setup snippet ── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <ScrollReveal className="text-center mb-10">
            <p className="text-sm text-[#15A4AE] uppercase tracking-widest font-semibold mb-3">Shopify quickstart</p>
            <h2 className="text-3xl font-bold mb-4">Connect Shopify in 2 minutes</h2>
            <p className="text-gray-400">No app store install. Just an API token from your Shopify admin.</p>
          </ScrollReveal>
          <ScrollReveal>
            <div className="rounded-2xl border border-white/10 overflow-hidden">
              <div className="bg-[#111] px-5 py-3 border-b border-white/8 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                <span className="text-xs text-gray-500 ml-2">Shopify Admin → Apps → Develop apps</span>
              </div>
              <div className="p-6 space-y-4 bg-[#161616]">
                {[
                  { num: '1', text: 'Go to Shopify Admin → Apps → Develop apps → Create an app' },
                  { num: '2', text: 'Under "Configuration", enable: read_orders, read_customers, read_fulfillments' },
                  { num: '3', text: 'Click "Install app" → copy the Admin API access token' },
                  { num: '4', text: 'In Appalix → Integrations → Add → Shopify → paste your store domain and token' },
                ].map((step) => (
                  <div key={step.num} className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#15A4AE]/20 text-[#15A4AE] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{step.num}</span>
                    <p className="text-sm text-gray-300 leading-relaxed">{step.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6 border-t border-white/5">
        <ScrollReveal>
          <div className="relative max-w-3xl mx-auto text-center">
            <div className="absolute inset-0 bg-[#15A4AE]/8 rounded-3xl blur-3xl" />
            <div className="relative p-12 rounded-3xl border border-[#15A4AE]/20 bg-white/[0.02]">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Stop answering order emails manually</h2>
              <p className="text-gray-400 mb-8 max-w-xl mx-auto">
                Connect your store today. Your bot handles order queries from the first message — so your team focuses on growth, not support queues.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#1a8c76] hover:bg-[#14705d] text-white font-medium rounded-xl transition-colors"
              >
                Connect your store — it&apos;s free
              </Link>
              <p className="text-xs text-gray-500 mt-4">7-day free trial · No credit card required</p>
            </div>
          </div>
        </ScrollReveal>
      </section>
    </>
  )
}
