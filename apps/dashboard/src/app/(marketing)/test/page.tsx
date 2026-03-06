import Link from 'next/link'
import type { Metadata } from 'next'
import { FadeUp, ScrollReveal } from '@/components/marketing/animate'
import { LeadFlowDiagram, QualificationLoop } from '@/components/marketing/lead-flow-diagram'

export const metadata: Metadata = {
  title: 'Appalix — AI Lead Capture & Pipeline Management from Every Channel',
  description:
    'Capture leads from forms, email, and chatbots automatically. AI qualifies, scores, and routes every lead into your pipeline. One platform. Every source.',
  keywords: [
    'AI lead capture software',
    'lead management platform',
    'multi-channel lead capture',
    'AI CRM for small business',
    'automated lead qualification',
    'lead pipeline management',
    'chatbot lead generation',
    'Google Ads lead capture',
    'Meta lead ads integration',
    'AI sales pipeline tool',
  ],
  robots: { index: false, follow: false },
}

const SOURCES = [
  {
    icon: '📋',
    tag: 'Forms',
    title: 'Web forms & lead ads',
    desc: 'Connect Google Ads Lead Forms and Meta Lead Ads directly. Embed your own form on any page. Every submission arrives scored and ready to act on.',
  },
  {
    icon: '📧',
    tag: 'Email',
    title: 'Gmail & Outlook inbox',
    desc: 'Your email inbox is a lead source. Appalix reads incoming enquiries, extracts contact details, and logs them as leads automatically — no manual copy-paste.',
  },
  {
    icon: '💬',
    tag: 'Chatbots',
    title: 'AI chatbot conversations',
    desc: 'Deploy chatbots on your website, WhatsApp, Facebook Messenger, and Slack. Leads captured mid-conversation feed straight into your pipeline.',
  },
  {
    icon: '📊',
    tag: 'AI Scoring',
    title: 'Automatic qualification',
    desc: 'Appalix AI reads every lead in context — conversation transcript, form answers, email content — and scores, tags, and suggests a next action.',
  },
  {
    icon: '🔁',
    tag: 'Integrations',
    title: 'CRM & automation sync',
    desc: 'Push qualified leads to HubSpot, Salesforce, Zoho, Mailchimp, Klaviyo, and 6,000+ apps via Zapier — the moment they are captured.',
  },
  {
    icon: '📌',
    tag: 'Pipeline',
    title: 'Pipeline management',
    desc: 'Move deals through custom stages, assign to team members, and track every touchpoint. Your pipeline updates itself as leads progress.',
  },
]

const STEPS = [
  {
    step: '01',
    title: 'Connect your sources',
    desc: 'Link your web forms, Gmail or Outlook inbox, AI chatbots, Google Ads lead forms, and Meta Lead Ads. Takes minutes.',
  },
  {
    step: '02',
    title: 'AI qualifies every lead',
    desc: 'Appalix reads each lead in context — conversation transcript, form answers, or email content — scores it, tags it, and suggests a next action.',
  },
  {
    step: '03',
    title: 'Pipeline moves itself',
    desc: 'Qualified leads drop into your pipeline automatically. Your team gets notified. Nothing sits in a queue. Nothing falls through the gaps.',
  },
]

const PROBLEMS = [
  {
    icon: '📋',
    title: 'Forms submitted, nobody follows up',
    desc: 'Lead comes in at 11pm, sits unread until Monday. By then they have moved on.',
  },
  {
    icon: '📧',
    title: 'Enquiries buried in a shared inbox',
    desc: 'Everyone assumes someone else picked it up. Nobody did.',
  },
  {
    icon: '💬',
    title: 'Chatbot conversations never reach your CRM',
    desc: 'Your bot captures a hot lead. It lives in a chat log no one checks.',
  },
]

const INTEGRATIONS = [
  'Google Ads', 'Meta Ads', 'Gmail', 'Outlook',
  'Mailchimp', 'ActiveCampaign', 'Klaviyo', 'Zapier',
  'HubSpot', 'Salesforce', 'Stripe', 'Freshdesk', 'Zendesk',
]

const FAQS = [
  {
    q: 'What sources does Appalix capture leads from?',
    a: 'Web forms you embed, Google Ads Lead Forms, Meta Lead Ads, Gmail, Outlook, and chatbot conversations across your website, WhatsApp, Facebook Messenger, and Slack — all from one dashboard.',
  },
  {
    q: 'Does AI really qualify leads automatically?',
    a: 'Yes. Appalix reads the full context of each lead — the form answers, conversation transcript, or email text — and scores it based on intent signals, completeness, and fit. You can review and override at any time.',
  },
  {
    q: 'Do I need to replace my existing CRM?',
    a: 'No. Appalix pushes qualified leads directly into HubSpot, Salesforce, Zoho, and other CRMs. You can use Appalix as your pipeline layer or simply as a capture and qualification layer feeding your existing tools.',
  },
  {
    q: 'How long does it take to set up?',
    a: 'Most teams are live within 15 minutes. Connect your email, link your first form or chatbot, and leads start flowing in. No code required for most sources.',
  },
]

export default function TestLandingPage() {
  return (
    <div className="pt-24">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative py-20 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-[#61c2ad]/15 rounded-full blur-[140px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          <FadeUp delay={0}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#61c2ad]/40 bg-[#61c2ad]/10 text-[#61c2ad] text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#61c2ad] animate-pulse" />
              Every lead. Every channel. Automated.
            </div>
          </FadeUp>

          <FadeUp delay={0.1}>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
              Every lead, captured<br />
              and acted on —{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#61c2ad] to-[#3d9585]">
                automatically
              </span>
            </h1>
          </FadeUp>

          <FadeUp delay={0.2}>
            <p className="text-base sm:text-xl text-gray-400 leading-relaxed max-w-2xl mx-auto mb-4">
              Appalix connects every source your leads come from — web forms, email inboxes,
              chatbot conversations, Google Ads, and Meta Lead Ads — then uses AI to qualify,
              score, and move them through your pipeline automatically.
            </p>
          </FadeUp>

          <FadeUp delay={0.25}>
            <ul className="flex flex-col sm:flex-row gap-2 justify-center text-sm text-gray-400 mb-8">
              {['No credit card required', 'All sources included', 'Live in under 15 minutes'].map(item => (
                <li key={item} className="flex items-center gap-1.5 sm:px-3">
                  <svg className="w-4 h-4 text-[#61c2ad] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </FadeUp>

          <FadeUp delay={0.3}>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/login"
                className="px-8 py-3.5 bg-[#1a8c76] hover:bg-[#14705d] text-white font-medium rounded-xl transition-colors"
              >
                Start a 7 Day Free Trial
              </Link>
              <Link
                href="/features"
                className="px-8 py-3.5 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white font-medium rounded-xl transition-colors"
              >
                See all features →
              </Link>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── Problem strip ────────────────────────────────────────────── */}
      <section className="py-16 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal className="text-center mb-12">
            <p className="text-xs text-[#61c2ad] uppercase tracking-widest font-semibold mb-3">Why leads go cold</p>
            <h2 className="text-2xl sm:text-3xl font-bold">
              Your leads are scattered. Your pipeline is manual.<br className="hidden sm:block" />
              Things fall through the gaps.
            </h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {PROBLEMS.map((p, i) => (
              <ScrollReveal key={p.title} delay={i * 0.1}>
                <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
                  <span className="text-3xl block mb-4">{p.icon}</span>
                  <h3 className="font-semibold text-white mb-2 leading-snug">{p.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{p.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Flow diagram ─────────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal className="text-center mb-14">
            <p className="text-xs text-[#61c2ad] uppercase tracking-widest font-semibold mb-3">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              One platform captures, qualifies,<br className="hidden sm:block" /> and routes every lead
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto text-sm leading-relaxed">
              No manual tagging. No missed follow-ups. No leads lost in inboxes.
            </p>
          </ScrollReveal>

          {/* Animated flow diagram */}
          <ScrollReveal delay={0.1}>
            <LeadFlowDiagram />
          </ScrollReveal>

          {/* 3-step cards below */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8">
            {STEPS.map((s, i) => (
              <ScrollReveal key={s.step} delay={i * 0.12}>
                <div className="relative p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-[#61c2ad]/30 transition-colors group h-full">
                  {i < STEPS.length - 1 && (
                    <div className="hidden sm:block absolute top-10 -right-3 w-6 h-px bg-[#61c2ad]/30 z-10" />
                  )}
                  <p className="text-4xl font-black text-white/10 group-hover:text-[#61c2ad]/20 transition-colors mb-4 leading-none select-none">{s.step}</p>
                  <h3 className="font-semibold text-white mb-2">{s.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{s.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sources grid ─────────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal className="text-center mb-14">
            <p className="text-xs text-[#61c2ad] uppercase tracking-widest font-semibold mb-3">Every source, one inbox</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Stop checking five places for leads</h2>
            <p className="text-gray-400 max-w-xl mx-auto text-sm leading-relaxed">
              Whether a lead came from a paid ad, a chatbot conversation, or a cold email reply — Appalix sees it, scores it, and acts on it.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SOURCES.map((s, i) => (
              <ScrollReveal key={s.title} delay={i * 0.07}>
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-[#61c2ad]/30 hover:bg-white/[0.07] transition-all h-full flex flex-col group">
                  <div className="w-11 h-11 rounded-xl bg-[#61c2ad]/10 border border-[#61c2ad]/20 flex items-center justify-center text-2xl mb-5 group-hover:bg-[#61c2ad]/15 transition-colors shrink-0">
                    {s.icon}
                  </div>
                  <span className="text-xs text-[#61c2ad] font-semibold uppercase tracking-widest mb-2">{s.tag}</span>
                  <h3 className="font-semibold text-white mb-2 leading-snug">{s.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed flex-1">{s.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Qualification loop ───────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal className="text-center mb-14">
            <p className="text-xs text-[#61c2ad] uppercase tracking-widest font-semibold mb-3">AI qualification process</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">How every lead gets scored and acted on</h2>
            <p className="text-gray-400 max-w-xl mx-auto text-sm leading-relaxed">
              The moment a lead arrives from any channel, Appalix AI runs it through a continuous qualification loop — so your team only deals with leads that are ready.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <QualificationLoop />
          </ScrollReveal>
        </div>
      </section>

      {/* ── Sage callout ─────────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">

          {/* Left — mock lead inbox */}
          <ScrollReveal>
            <div className="rounded-2xl bg-[#232323] border border-white/10 overflow-hidden shadow-2xl">
              <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/10 bg-[#1e1e1e]">
                <div className="w-7 h-7 rounded-lg bg-[#61c2ad]/20 border border-[#61c2ad]/30 flex items-center justify-center">
                  <span className="text-[#61c2ad] text-xs font-bold">✦</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Appalix Sage</p>
                  <p className="text-[10px] text-gray-500">3 new leads since yesterday</p>
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#61c2ad] animate-pulse" />
                  <span className="text-[10px] text-[#61c2ad]">Live</span>
                </div>
              </div>

              <div className="p-4 space-y-3">
                {[
                  { source: 'Meta Lead Ad', name: 'Sarah Chen', score: 92, tag: 'High intent', color: 'text-green-400', dot: 'bg-green-400' },
                  { source: 'Gmail inbox', name: 'James Okafor', score: 74, tag: 'Qualified', color: 'text-[#61c2ad]', dot: 'bg-[#61c2ad]' },
                  { source: 'Website chatbot', name: 'Priya Mehta', score: 61, tag: 'Follow up', color: 'text-yellow-400', dot: 'bg-yellow-400' },
                ].map(lead => (
                  <div key={lead.name} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:border-white/10 transition-colors">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${lead.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{lead.name}</p>
                      <p className="text-[11px] text-gray-500">{lead.source}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-xs font-semibold ${lead.color}`}>{lead.score}%</p>
                      <p className="text-[10px] text-gray-500">{lead.tag}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-4 pb-4">
                <div className="flex gap-2.5 items-start bg-[#61c2ad]/[0.08] border border-[#61c2ad]/20 rounded-xl p-3">
                  <span className="text-[#61c2ad] text-xs font-bold shrink-0 mt-0.5">✦</span>
                  <p className="text-xs text-[#61c2ad] leading-relaxed">
                    <span className="font-semibold">Sage:</span> Sarah Chen submitted your Meta Lead Ad 8 minutes ago — high intent score. I&apos;ve drafted a follow-up email. Want me to send it?
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Right — copy */}
          <ScrollReveal delay={0.15} className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#61c2ad]/30 bg-[#61c2ad]/[0.08] text-[#61c2ad] text-[11px] font-semibold uppercase tracking-widest">
              <span className="text-[10px]">✦</span> Meet Sage
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold leading-snug">
              Your AI that never misses a lead — and always knows what to do next
            </h2>
            <p className="text-gray-400 leading-relaxed">
              Sage is Appalix&apos;s built-in AI assistant. It reads your emails, scores your form leads,
              tracks your pipeline, and tells your team exactly what to do next — all from inside your dashboard.
            </p>
            <ul className="space-y-3">
              {[
                'Summarises new leads the moment they come in',
                'Drafts follow-up emails with one click',
                'Flags leads that have gone cold',
                'Answers questions about any contact or deal instantly',
                'Manages contacts, tickets, and deals from a single chat',
              ].map(item => (
                <li key={item} className="flex gap-3 items-start">
                  <svg className="w-4 h-4 text-[#61c2ad] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-gray-300">{item}</span>
                </li>
              ))}
            </ul>
            <Link href="/ai-assistant" className="inline-flex items-center gap-2 text-sm text-[#61c2ad] hover:text-[#4eada0] transition-colors font-medium">
              Explore Sage AI →
            </Link>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────────────────────── */}
      <section className="py-14 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal>
            <div className="rounded-2xl bg-white/[0.03] border border-white/10 px-8 py-8 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
              {[
                { value: '500+', label: 'teams using Appalix' },
                { value: '3×',   label: 'faster lead response' },
                { value: '40%',  label: 'fewer leads lost' },
                { value: '95+',  label: 'languages supported' },
              ].map(stat => (
                <div key={stat.label}>
                  <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Integrations ─────────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <ScrollReveal>
            <p className="text-xs text-[#61c2ad] uppercase tracking-widest font-semibold mb-3">Integrations</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Connects with the tools your leads already come from</h2>
            <p className="text-gray-400 mb-10 text-sm max-w-lg mx-auto">
              Native connections to every major ad platform, email provider, CRM, and automation tool.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <div className="flex flex-wrap justify-center gap-2.5 mb-8">
              {INTEGRATIONS.map(name => (
                <span key={name} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-[#61c2ad]/30 text-sm text-gray-300 font-medium transition-colors">
                  {name}
                </span>
              ))}
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.15}>
            <Link href="/platforms" className="text-sm text-[#61c2ad] hover:text-[#4eada0] transition-colors">
              View all integrations →
            </Link>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Pricing teaser ───────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <ScrollReveal>
            <p className="text-xs text-[#61c2ad] uppercase tracking-widest font-semibold mb-3">Pricing</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Simple pricing that scales with your lead volume</h2>
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
              ].map(p => (
                <Link
                  key={p.name}
                  href="/pricing"
                  className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                    p.popular
                      ? 'bg-[#61c2ad]/20 border-[#61c2ad]/50 text-[#61c2ad] hover:bg-[#61c2ad]/30'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:border-white/20 hover:text-gray-200'
                  }`}
                >
                  {p.name} <span className={p.popular ? 'text-white font-bold' : 'text-gray-300'}>{p.price}</span>
                  {p.popular && <span className="ml-2 text-xs bg-[#1a8c76] text-white px-1.5 py-0.5 rounded-full">Popular</span>}
                </Link>
              ))}
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.15}>
            <Link href="/pricing" className="text-sm text-[#61c2ad] hover:text-[#4eada0] transition-colors">
              Compare all plans →
            </Link>
          </ScrollReveal>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <ScrollReveal className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold">Frequently asked questions</h2>
          </ScrollReveal>
          <div className="space-y-5">
            {FAQS.map((faq, i) => (
              <ScrollReveal key={faq.q} delay={i * 0.07}>
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/15 transition-colors">
                  <h3 className="font-semibold text-white mb-2">{faq.q}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{faq.a}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-white/5">
        <ScrollReveal>
          <div className="relative max-w-4xl mx-auto text-center">
            <div className="absolute inset-0 bg-[#61c2ad]/[0.05] rounded-3xl blur-3xl pointer-events-none" />
            <div className="relative p-12 rounded-3xl border border-[#61c2ad]/20 bg-white/[0.02]">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Every lead deserves a fast follow-up.<br className="hidden sm:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#61c2ad] to-[#3d9585]">
                  Let AI handle it.
                </span>
              </h2>
              <p className="text-gray-400 mb-8 text-sm max-w-xl mx-auto">
                Join 500+ teams using Appalix to capture, qualify, and convert leads from every channel — automatically.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/login"
                  className="px-8 py-3.5 bg-[#1a8c76] hover:bg-[#14705d] text-white font-medium rounded-xl transition-colors"
                >
                  Start a 7 Day Free Trial
                </Link>
                <Link
                  href="/features"
                  className="px-8 py-3.5 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white font-medium rounded-xl transition-colors"
                >
                  See all features →
                </Link>
              </div>
              <p className="text-xs text-gray-500 mt-5">7-day free trial · No credit card required · Cancel anytime</p>
            </div>
          </div>
        </ScrollReveal>
      </section>

    </div>
  )
}
