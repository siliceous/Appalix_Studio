import React from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { FadeUp, ScrollReveal } from '@/components/marketing/animate'
import { LeadFlowDiagram, QualificationLoop } from '@/components/marketing/lead-flow-diagram'
import { PricingCards } from '@/components/marketing/pricing-cards'

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
  alternates: { canonical: 'https://appalix.ai/test' },
}

const SOURCES = [
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
    icon: '📋',
    tag: 'Forms',
    title: 'Web forms & lead ads',
    desc: 'Connect Google Ads Lead Forms and Meta Lead Ads directly. Embed your own form on any page. Every submission arrives scored and ready to act on.',
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
    title: 'Chatbot leads never reach your CRM',
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
      <section className="relative py-6 lg:py-10 px-8 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-[#15A4AE]/15 rounded-full blur-[140px] pointer-events-none" />

        {/* Floating icons */}
        <style>{`
          @keyframes floatA {
            0%, 100% { transform: translateY(0px); }
            50%       { transform: translateY(-18px); }
          }
          @keyframes floatB {
            0%, 100% { transform: translateY(0px); }
            50%       { transform: translateY(-10px); }
          }
          @keyframes floatC {
            0%, 100% { transform: translateY(0px); }
            50%       { transform: translateY(-22px); }
          }
          @keyframes floatD {
            0%, 100% { transform: translateY(0px); }
            50%       { transform: translateY(-14px); }
          }
        `}</style>
        {([
          {
            content: (s: string) => (
              <svg viewBox="0 0 64 50" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: `calc(${s} * 0.45)`, height: `calc(${s} * 0.35)` }}>
                {/* Antenna */}
                <line x1="32" y1="2" x2="32" y2="10" stroke="#A855F7" strokeWidth="3" strokeLinecap="round"/>
                <circle cx="32" cy="2" r="3" fill="#A855F7"/>
                {/* Head */}
                <rect x="10" y="10" width="44" height="36" rx="4" fill="#E9D5FF"/>
                {/* Arms — same level as eyes */}
                <rect x="0" y="20" width="12" height="10" rx="2" fill="#D8B4FE"/>
                <rect x="52" y="20" width="12" height="10" rx="2" fill="#D8B4FE"/>
                {/* LED Eyes — square robotic */}
                <rect x="16" y="20" width="12" height="10" rx="2" fill="#581C87"/>
                <rect x="36" y="20" width="12" height="10" rx="2" fill="#581C87"/>
                {/* Eye glow centres */}
                <rect x="19" y="23" width="6" height="4" rx="1" fill="#E879F9"/>
                <rect x="39" y="23" width="6" height="4" rx="1" fill="#E879F9"/>
                {/* Mouth — segmented dashes, centred on head (head x=10–54, centre=32) */}
                <rect x="22" y="36" width="5" height="3" rx="1" fill="#7E22CE" opacity="0.7"/>
                <rect x="29" y="36" width="5" height="3" rx="1" fill="#7E22CE" opacity="0.7"/>
                <rect x="36" y="36" width="5" height="3" rx="1" fill="#7E22CE" opacity="0.7"/>
              </svg>
            ),
            top: '8%', left: '4%', delay: '0s', size: '195px', tilt: -15, anim: 'floatA 3.5s',
          },
          {
            content: (s: string) => (
              <svg viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: `calc(${s} * 0.45)`, height: `calc(${s} * 0.45 * 0.75)` }}>
                <rect x="1.5" y="1.5" width="61" height="45" rx="5" fill="white" stroke="#4285F4" strokeWidth="3"/>
                <path d="M2 6L32 30L62 6" stroke="#EA4335" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            ),
            top: '12%', right: '5%', delay: '1.2s', size: '180px', tilt: 15, anim: 'floatB 5.5s',
          },
          {
            content: (s: string) => (
              <svg viewBox="0 0 56 68" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: `calc(${s} * 0.42)`, height: `calc(${s} * 0.51)` }}>
                {/* Card */}
                <rect x="1.5" y="1.5" width="53" height="65" rx="6" fill="#DCFCE7" stroke="#16A34A" strokeWidth="2"/>
                {/* Top bar */}
                <rect x="1.5" y="1.5" width="53" height="12" rx="6" fill="#BBF7D0"/>
                <circle cx="10" cy="7.5" r="2" fill="#16A34A" opacity="0.7"/>
                <circle cx="17" cy="7.5" r="2" fill="#16A34A" opacity="0.5"/>
                <circle cx="24" cy="7.5" r="2" fill="#16A34A" opacity="0.3"/>
                {/* Label 1 */}
                <rect x="8" y="20" width="16" height="3" rx="1.5" fill="#15803D" opacity="0.5"/>
                {/* Input 1 */}
                <rect x="8" y="26" width="40" height="7" rx="3" fill="white" stroke="#BBF7D0" strokeWidth="1"/>
                {/* Label 2 */}
                <rect x="8" y="37" width="20" height="3" rx="1.5" fill="#15803D" opacity="0.5"/>
                {/* Input 2 */}
                <rect x="8" y="43" width="40" height="7" rx="3" fill="white" stroke="#BBF7D0" strokeWidth="1"/>
                {/* Submit button */}
                <rect x="8" y="55" width="40" height="8" rx="3" fill="#16A34A"/>
                <rect x="17" y="57.5" width="22" height="3" rx="1.5" fill="white" opacity="0.9"/>
              </svg>
            ),
            top: '32%', right: '16%', delay: '0.4s', size: '165px', tilt: 15, anim: 'floatC 4.2s',
          },
          {
            content: (s: string) => (
              <svg viewBox="0 0 80 36" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: `calc(${s} * 0.75)`, height: `calc(${s} * 0.34)` }}>
                <rect x="1.5" y="1.5" width="77" height="33" rx="4" fill="#FEF3C7" stroke="#D97706" strokeWidth="2"/>
                <circle cx="14" cy="18" r="6" fill="#FDE68A" opacity="0.8"/>
                <line x1="14" y1="1.5" x2="14" y2="34.5" stroke="#D97706" strokeWidth="2" strokeDasharray="4 3" opacity="0.5"/>
                <circle cx="66" cy="18" r="6" fill="#FDE68A" opacity="0.8"/>
                <line x1="66" y1="1.5" x2="66" y2="34.5" stroke="#D97706" strokeWidth="2" strokeDasharray="4 3" opacity="0.5"/>
                <rect x="22" y="13" width="36" height="10" rx="3" fill="#FDE68A" opacity="0.6"/>
                <text x="40" y="22" textAnchor="middle" fill="#92400E" fontSize="7" fontWeight="700" fontFamily="sans-serif">Tickets</text>
              </svg>
            ),
            top: '32%', left: '16%', delay: '2.0s', size: '165px', tilt: -15, anim: 'floatD 6s',
          },
        ] as Array<{ content: string | ((s: string) => React.ReactNode); top: string; left?: string; right?: string; delay: string; size: string; tilt: number; anim: string }>).map(({ content, top, left, right, delay, size, tilt, anim }, i) => (
          <div
            key={i}
            className="absolute pointer-events-none select-none hidden lg:block"
            style={{ top, left, right, transform: `rotate(${tilt}deg)` }}
          >
            <div
              className="flex items-center justify-center rounded-2xl"
              style={{
                width: size, height: size,
                fontSize: `calc(${size} * 0.5)`,
                animation: `${anim} ease-in-out ${delay} infinite`,
              }}
            >
              {typeof content === 'function' ? content(size) : content}
            </div>
          </div>
        ))}

        <div className="relative max-w-6xl mx-auto text-center">
          <FadeUp delay={0}>
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-[#15A4AE]/40 bg-[#15A4AE]/10 text-white font-medium mb-10" style={{ fontSize: '14px' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#15A4AE] animate-pulse" />
              STOP STITCHING TOOLS . ONE APP — DOES ALL
              <span className="w-1.5 h-1.5 rounded-full bg-[#15A4AE] animate-pulse" />
            </div>
          </FadeUp>

          <FadeUp delay={0.1}>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.25] mb-4 text-white max-w-4xl mx-auto">
              Chatbots · AI email analyzer · lead forms · support tickets · CRM.<br className="hidden sm:block" /> One platform. All built in.
            </h1>
            <h2
              className="text-2xl sm:text-3xl font-semibold text-white mb-8 inline-flex items-center gap-2 justify-center flex-wrap"
              style={{
                textShadow: '0 0 20px #15A4AE, 0 0 50px #15A4AE80',
                WebkitTextStroke: '0.5px #15A4AE',
              }}
            >
              <span className="text-yellow-300" style={{ textShadow: 'none', WebkitTextStroke: '0' }}>⚡</span>
              Introducing Appalix Sage.
              <span className="text-gray-300" style={{ textShadow: 'none', WebkitTextStroke: '0' }}>🔗</span>
            </h2>
          </FadeUp>

          <FadeUp delay={0.2}>
            <div className="flex flex-wrap justify-center gap-2 max-w-4xl mx-auto mb-6">
              {[
                'powers multiple intelligent bots',
                'analyses emails with AI',
                'extracts key data from every form submission',
                'integrates with marketing tools like Mailchimp and more',
                'integrates with Google Ads & Facebook',
                'creates tickets automatically when needed',
              ].map(point => (
                <span key={point} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#15A4AE]/30 bg-[#15A4AE]/8 text-gray-300 capitalize text-base">
                  <span className="w-2 h-2 rounded-full bg-[#15A4AE] shrink-0" />
                  {point}
                </span>
              ))}
            </div>
            <h2 className="text-xl sm:text-2xl text-gray-300 leading-relaxed max-w-3xl mx-auto mb-4">
              Each enquiry is instantly transformed into an opportunity. Prioritised as{' '}
              <span className="text-[#15A4AE] font-semibold">High</span>,{' '}
              <span className="text-yellow-400 font-semibold">Medium</span>, &amp;{' '}
              <span className="text-blue-300 font-semibold">Low</span>. Organised seamlessly in a built-in CRM suite. <span className="whitespace-nowrap">All within seconds — 24/7.</span>
            </h2>
          </FadeUp>

          <FadeUp delay={0.3}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
              <Link
                href="/login"
                className="px-10 py-3.5 bg-[#1a8c76] hover:bg-[#14705d] text-white text-lg font-medium rounded-xl transition-colors"
              >
                Start a 7 Day Free Trial
              </Link>
              <Link
                href="/features"
                className="px-10 py-3.5 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white text-lg font-medium rounded-xl transition-colors"
              >
                See all features →
              </Link>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── Problem strip ────────────────────────────────────────────── */}
      <section className="py-20 px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal className="text-center mb-14">
            <p className="text-sm text-[#15A4AE] uppercase tracking-widest font-semibold mb-4">Why leads go cold</p>
            <h2 className="text-4xl sm:text-5xl font-bold leading-[1.5] max-w-4xl mx-auto">
              Your leads are scattered,<br />
              pipeline manual.<br />
              Things fall through the gaps.
            </h2>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-14">
            {PROBLEMS.map((p, i) => (
              <ScrollReveal key={p.title} delay={i * 0.1}>
                <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/10">
                  <span className="text-4xl block mb-5">{p.icon}</span>
                  <h3 className="text-xl font-semibold text-white mb-3 leading-snug whitespace-nowrap">{p.title}</h3>
                  <p className="text-lg text-gray-400 leading-relaxed">{p.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* Pain points card */}
          <ScrollReveal className="text-center mt-24 mb-6">
            <p className="text-sm text-[#15A4AE] uppercase tracking-widest font-semibold mb-4">The hidden tax</p>
            <h2 className="text-4xl sm:text-5xl font-bold leading-[1.5] max-w-4xl mx-auto mb-5">The real cost of stitching tools together</h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-xl leading-relaxed">
              A bot that can't answer real questions. An inbox nobody checks. A CRM your team stopped updating. Sound familiar?
            </p>
          </ScrollReveal>
          <ScrollReveal>
            <div className="rounded-2xl border border-[#15A4AE]/20 bg-white/[0.03] p-8 mb-14 shadow-2xl shadow-[#15A4AE]/10 ring-1 ring-[#15A4AE]/10">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { icon: '💸', title: 'You\'re paying for 6–8 apps', desc: 'A chatbot tool. A CRM. An email platform. A ticketing system. A form builder. An analytics tool. Each with its own monthly bill — and none of them talk to each other properly.' },
                  { icon: '🔌', title: 'Integrations break silently', desc: 'That Zapier zap that syncs your form submissions to your CRM? It failed 3 days ago. You won\'t know until a lead chases you — or doesn\'t.' },
                  { icon: '🕳️', title: 'Data falls through the cracks', desc: 'A lead fills your form. Your chatbot talks to someone else. Your inbox gets a third enquiry. Three sources, zero single view. Your team is guessing.' },
                  { icon: '⏱️', title: 'Setup takes weeks, not minutes', desc: 'Every new tool means onboarding, configuration, training, and a new login. Your team spends more time managing tools than talking to customers.' },
                  { icon: '😤', title: 'Context is always missing', desc: 'Your support team can\'t see the sales conversation. Your sales team can\'t see the support tickets. Every handoff means someone starts from scratch.' },
                  { icon: '📉', title: 'Slow response kills deals', desc: 'Studies show responding within 5 minutes increases conversion by 9×. With scattered tools and manual processes, most businesses respond in hours — or not at all.' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <span className="text-2xl shrink-0 mt-0.5">{item.icon}</span>
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-1">{item.title}</h4>
                      <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* Every source, one Dashboard */}
          <ScrollReveal className="text-center mb-10 mt-24">
            <p className="text-sm text-[#15A4AE] uppercase tracking-widest font-semibold mb-4">Every source, one Dashboard</p>
            <h2 className="text-4xl sm:text-5xl font-bold leading-[1.5] max-w-4xl mx-auto mb-5">Stop checking everywhere for leads</h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-xl leading-relaxed">
              Whether a lead came from a paid ad, a chatbot conversation, or a cold email reply — Appalix sees it, scores it, and acts on it.
            </p>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SOURCES.map((s, i) => (
              <ScrollReveal key={s.title} delay={i * 0.07}>
                <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-[#15A4AE]/30 hover:bg-white/[0.07] transition-all h-full flex flex-col group">
                  <div className="w-14 h-14 rounded-xl bg-[#15A4AE]/10 border border-[#15A4AE]/20 flex items-center justify-center text-3xl mb-5 group-hover:bg-[#15A4AE]/15 transition-colors shrink-0">
                    {s.icon}
                  </div>
                  <span className="text-sm text-[#15A4AE] font-semibold uppercase tracking-widest mb-2">{s.tag}</span>
                  <h3 className="text-xl font-semibold text-white mb-3 leading-snug">{s.title}</h3>
                  <p className="text-lg text-gray-400 leading-relaxed flex-1">{s.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* Comparison heading */}
          <ScrollReveal className="text-center mt-24 mb-10">
            <p className="text-sm text-[#15A4AE] uppercase tracking-widest font-semibold mb-4">Side by side</p>
            <h2 className="text-4xl sm:text-5xl font-bold leading-[1.5] max-w-4xl mx-auto mb-5">
              Compare the Power Of Appalix Sage<br className="hidden sm:block" /> with Traditional tools.
            </h2>
          </ScrollReveal>

          {/* Comparison table */}
          <ScrollReveal className="mb-14 overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-lg border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-6 px-6 bg-white/[0.02] w-1/3">
                    <span className="text-2xl font-bold text-white">Features</span>
                  </th>
                  <th className="py-6 px-6 text-center w-1/3 bg-red-950/30">
                    <span className="flex flex-col items-center gap-1">
                      <span className="text-xl font-bold text-gray-200">Traditional Tools</span>
                      <span className="text-gray-500 font-normal" style={{ fontSize: '14px' }}>Multiple apps, more cost</span>
                    </span>
                  </th>
                  <th className="py-6 px-6 text-center w-1/3 bg-[#15A4AE]/10">
                    <span className="flex flex-col items-center gap-1">
                      <span className="text-xl font-bold text-[#15A4AE]">Appalix Sage</span>
                      <span className="text-[#15A4AE]/60 font-normal" style={{ fontSize: '14px' }}>All in one platform</span>
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Chatbot',             'Rule-based bot with scripted replies — can\'t handle real questions, never updates your CRM', 'AI chatbot trained on your content — captures leads, answers questions & syncs to CRM instantly'],
                  ['Lead capture',        'Manual forms + separate chatbot tools',     'AI captures from email, forms & bots automatically'],
                  ['CRM entry',           'Copy-paste by your team',                   'Every enquiry auto-logged as an opportunity in seconds'],
                  ['Email management',    'Separate inbox tool or plugin',             'Built-in AI email analysis & response suggestions'],
                  ['Ticketing / support', 'Another tool (Zendesk, Freshdesk…)',        'Unified inbox — leads and support in one place'],
                  ['Follow-up',           'Manual reminders, things fall through',     'Automated follow-up sequences triggered instantly'],
                  ['Cost',                'Multiple subscriptions, 5–8 tools',         'One platform, one price'],
                  ['Setup time',          'Weeks of integration work',                 'Live in under 15 minutes'],
                  ['Availability',        'Business hours only',                       '24 / 7 AI, never sleeps'],
                ].map(([feature, before, after]) => (
                  <tr key={feature} className="border-b border-white/5 last:border-0">
                    <td className="py-4 px-6 text-white font-semibold bg-white/[0.02]">{feature}</td>
                    <td className="py-4 px-6 text-center text-gray-200 bg-red-950/10">{before}</td>
                    <td className="py-4 px-6 text-center text-white bg-[#15A4AE]/[0.06]">{after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollReveal>
        </div>
      </section>


      {/* ── Flow diagram ─────────────────────────────────────────────── */}
      <section className="py-24 px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal className="text-center mb-14">
            <p className="text-sm text-[#15A4AE] uppercase tracking-widest font-semibold mb-4">How it works</p>
            <h2 className="text-4xl sm:text-5xl font-bold leading-[1.5] max-w-4xl mx-auto mb-5">
              One platform captures, qualifies, and routes every lead
            </h2>
            <p className="text-xl sm:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed mb-4">
              Every enquiry — whether it arrives via email, a website form, a chatbot conversation, Google Ads, or a Facebook campaign — is automatically captured, analysed, and transformed into a qualified opportunity inside your CRM within seconds.
            </p>
            <p className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
              No manual tagging. No missed follow-ups. No leads lost in inboxes. Just a clean, organised pipeline that works for you 24/7 — even while you sleep.
            </p>
          </ScrollReveal>

          {/* Animated flow diagram */}
          <ScrollReveal delay={0.1}>
            <LeadFlowDiagram />
          </ScrollReveal>

          {/* 3-step cards below */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-10">
            {STEPS.map((s, i) => (
              <ScrollReveal key={s.step} delay={i * 0.12}>
                <div className="relative p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-[#15A4AE]/30 transition-colors group h-full">
                  {i < STEPS.length - 1 && (
                    <div className="hidden sm:block absolute top-10 -right-3 w-6 h-px bg-[#15A4AE]/30 z-10" />
                  )}
                  <p className="text-5xl font-black text-white/10 group-hover:text-[#15A4AE]/20 transition-colors mb-5 leading-none select-none">{s.step}</p>
                  <h3 className="text-xl font-semibold text-white mb-3">{s.title}</h3>
                  <p className="text-lg text-gray-400 leading-relaxed">{s.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Qualification loop ───────────────────────────────────────── */}
      <section className="py-24 px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal className="text-center mb-14">
            <p className="text-sm text-[#15A4AE] uppercase tracking-widest font-semibold mb-4">AI qualification process</p>
            <h2 className="text-4xl sm:text-5xl font-bold leading-[1.5] max-w-4xl mx-auto mb-5">How every lead gets scored and acted on</h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-xl leading-relaxed">
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
                <div className="w-7 h-7 rounded-lg bg-[#15A4AE]/20 border border-[#15A4AE]/30 flex items-center justify-center">
                  <span className="text-[#15A4AE] text-xs font-bold">✦</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Appalix Sage</p>
                  <p className="text-[10px] text-gray-500">3 new leads since yesterday</p>
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#15A4AE] animate-pulse" />
                  <span className="text-[10px] text-[#15A4AE]">Live</span>
                </div>
              </div>

              <div className="p-4 space-y-3">
                {[
                  { source: 'Meta Lead Ad', name: 'Sarah Chen', score: 92, tag: 'High intent', color: 'text-green-400', dot: 'bg-green-400' },
                  { source: 'Gmail inbox', name: 'James Okafor', score: 74, tag: 'Qualified', color: 'text-[#15A4AE]', dot: 'bg-[#15A4AE]' },
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
                <div className="flex gap-2.5 items-start bg-[#15A4AE]/[0.08] border border-[#15A4AE]/20 rounded-xl p-3">
                  <span className="text-[#15A4AE] text-xs font-bold shrink-0 mt-0.5">✦</span>
                  <p className="text-xs text-[#15A4AE] leading-relaxed">
                    <span className="font-semibold">Sage:</span> Sarah Chen submitted your Meta Lead Ad 8 minutes ago — high intent score. I&apos;ve drafted a follow-up email. Want me to send it?
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Right — copy */}
          <ScrollReveal delay={0.15} className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#15A4AE]/30 bg-[#15A4AE]/[0.08] text-[#15A4AE] text-[11px] font-semibold uppercase tracking-widest">
              <span className="text-[10px]">✦</span> Meet Sage
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold leading-[1.5] max-w-4xl mb-5">
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
                  <svg className="w-4 h-4 text-[#15A4AE] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-gray-300">{item}</span>
                </li>
              ))}
            </ul>
            <Link href="/ai-assistant" className="inline-flex items-center gap-2 text-sm text-[#15A4AE] hover:text-[#4eada0] transition-colors font-medium">
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
            <p className="text-xs text-[#15A4AE] uppercase tracking-widest font-semibold mb-3">Integrations</p>
            <h2 className="text-4xl sm:text-5xl font-bold leading-[1.5] max-w-4xl mx-auto mb-5">Connects with the tools your leads already come from</h2>
            <p className="text-gray-400 mb-10 text-sm max-w-lg mx-auto">
              Native connections to every major ad platform, email provider, CRM, and automation tool.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <div className="flex flex-wrap justify-center gap-2.5 mb-8">
              {INTEGRATIONS.map(name => (
                <span key={name} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-[#15A4AE]/30 text-sm text-gray-300 font-medium transition-colors">
                  {name}
                </span>
              ))}
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.15}>
            <Link href="/platforms" className="text-sm text-[#15A4AE] hover:text-[#4eada0] transition-colors">
              View all integrations →
            </Link>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Pricing teaser ───────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal className="text-center mb-4">
            <p className="text-sm text-[#15A4AE] uppercase tracking-widest font-semibold mb-3">Pricing</p>
            <h2 className="text-4xl sm:text-5xl font-bold leading-[1.5] max-w-4xl mx-auto mb-5">Simple pricing that scales with your lead volume</h2>
            <p className="text-gray-400 mb-2 text-base">7-day free trial on all plans. No credit card required.</p>
          </ScrollReveal>
          <PricingCards />
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <ScrollReveal className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-bold leading-[1.5] max-w-4xl mx-auto mb-5">Frequently asked questions</h2>
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
            <div className="absolute inset-0 bg-[#15A4AE]/[0.05] rounded-3xl blur-3xl pointer-events-none" />
            <div className="relative p-12 rounded-3xl border border-[#15A4AE]/20 bg-white/[0.02]">
              <h2 className="text-4xl sm:text-5xl font-bold leading-[1.5] max-w-4xl mx-auto mb-5">
                Every lead deserves a fast follow-up.<br className="hidden sm:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#15A4AE] to-[#3d9585]">
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
