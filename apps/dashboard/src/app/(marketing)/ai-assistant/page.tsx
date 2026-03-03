import Link from 'next/link'
import type { Metadata } from 'next'
import { FadeUp, ScrollReveal } from '@/components/marketing/animate'

export const metadata: Metadata = {
  title: 'Appalix Sage — Internal AI Assistant for Your Team | Appalix',
  description:
    'Appalix Sage is your team\'s internal AI assistant. Search your knowledge base, draft proposals and reports, and share content with colleagues — all inside your Appalix dashboard. Available on Pro and above.',
  keywords: [
    'internal AI assistant',
    'team AI assistant',
    'AI knowledge base search',
    'AI document drafting',
    'internal chatbot for teams',
    'Appalix Sage',
  ],
}

const FEATURES = [
  {
    icon: '🔍',
    tag:  'Knowledge',
    title: 'Instant knowledge retrieval',
    desc:  'Ask anything about your business and Sage searches your entire knowledge base using semantic AI — surfacing exact answers, not a list of documents to scroll through.',
  },
  {
    icon: '📄',
    tag:  'Drafting',
    title: 'Full document generation',
    desc:  'Proposals, reports, job descriptions, investor updates, SOPs — describe what you need and Sage produces a complete, ready-to-use document in seconds.',
  },
  {
    icon: '📊',
    tag:  'Insights',
    title: 'Summaries and analysis',
    desc:  'Paste a meeting transcript, a brief, or a long thread. Sage extracts the key points, action items, and decisions — formatted however you need them.',
  },
  {
    icon: '📧',
    tag:  'Sharing',
    title: 'Colleague sharing built in',
    desc:  'Send a generated document to any colleague by email directly from the chat. Or copy a hosted link to share in Slack, Teams, or anywhere else.',
  },
]

const ROLES = [
  {
    emoji: '📣',
    role: 'Marketing',
    tasks: [
      'Draft campaign briefs and blog outlines',
      'Write landing page copy from product docs',
      'Generate email sequences and social posts',
      'Summarise competitor positioning from your knowledge base',
    ],
  },
  {
    emoji: '💼',
    role: 'Sales',
    tasks: [
      'Generate tailored proposals for new accounts',
      'Prepare pitch decks and client presentations',
      'Pull relevant case studies from your knowledge base',
      'Draft follow-up emails after calls',
    ],
  },
  {
    emoji: '🛠',
    role: 'Operations',
    tasks: [
      'Search SOPs and policies without hunting through drives',
      'Generate process documentation and onboarding guides',
      'Create compliance checklists from internal policies',
      'Draft team briefings and handover notes',
    ],
  },
  {
    emoji: '👩‍💼',
    role: 'Management',
    tasks: [
      'Produce board reports and investor updates',
      'Get instant summaries before meetings',
      'Generate strategic recommendations from internal data',
      'Draft internal announcements and team memos',
    ],
  },
]

const STEPS = [
  {
    step: '01',
    title: 'Upgrade to Pro',
    desc: 'Sage is included with every Pro, Scale, and Enterprise plan. If you\'re on Starter, upgrade in Settings in under two minutes.',
  },
  {
    step: '02',
    title: 'Open Sage in your sidebar',
    desc: 'A Sage link appears in your dashboard sidebar the moment you upgrade. Click it — the chat interface loads instantly, no setup required.',
  },
  {
    step: '03',
    title: 'Ask anything',
    desc: 'Your knowledge base is already connected. Type a question, request a document, or pick a starter prompt. Sage responds in seconds using your actual company content.',
  },
]

const CHAT_DEMO = [
  {
    role: 'user',
    content: 'Draft a proposal for Henderson & Co — a 200-person logistics firm looking to automate their customer support.',
  },
  {
    role: 'ai',
    content: 'Here\'s a tailored proposal for Henderson & Co:\n\n**Proposal: AI-Powered Customer Support Automation**\n\n**Executive Summary**\nAppalix will deploy a trained AI agent across Henderson & Co\'s support channels, reducing first-response time from hours to seconds and cutting support costs by an estimated 40%.\n\n**Problem Statement**\nAt 200 employees, Henderson & Co handles a growing volume of customer queries across email and phone — many repetitive, all requiring manual triage…\n\n*[Full proposal generated — 4 sections, ready to send]*',
  },
  {
    role: 'user',
    content: 'Email this to sarah@henderson.com with subject "Appalix Proposal"',
  },
  {
    role: 'ai',
    content: '✓ Sent to sarah@henderson.com\n\nSubject: Appalix Proposal\nDelivered via your configured Resend account. You\'ll receive a delivery confirmation at your from-address.',
  },
]

export default function SagePage() {
  return (
    <div className="bg-[#1c1c1c] min-h-screen text-white">

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative pt-36 pb-24 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-brand-600/20 rounded-full blur-[140px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          <FadeUp delay={0}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-600/40 bg-brand-600/10 text-brand-400 text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
              Pro feature · Included at no extra charge
            </div>
          </FadeUp>

          <FadeUp delay={0.1}>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-snug mb-6">
              AI built for your team,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-600">
                not just your customers
              </span>
            </h1>
          </FadeUp>

          <FadeUp delay={0.2}>
            <p className="text-base sm:text-xl text-gray-400 leading-relaxed max-w-2xl mx-auto mb-10">
              Appalix Sage is your internal AI assistant. It searches your knowledge base, drafts documents, and shares content with your colleagues — all inside the Appalix dashboard.
            </p>
          </FadeUp>

          <FadeUp delay={0.3}>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/login"
                className="px-7 py-3.5 bg-[#1a8c76] hover:bg-[#14705d] text-white font-medium rounded-xl transition-colors text-sm"
              >
                Start a 7 Day Free Trial
              </Link>
              <Link
                href="/pricing"
                className="px-7 py-3.5 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white font-medium rounded-xl transition-colors text-sm"
              >
                View Pro plan →
              </Link>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── Live chat demo ────────────────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">

          {/* Left — copy */}
          <ScrollReveal className="space-y-6">
            <p className="text-xs text-brand-400 uppercase tracking-widest font-semibold">See it in action</p>
            <h2 className="text-3xl sm:text-4xl font-bold leading-snug">
              From first message to finished proposal in seconds
            </h2>
            <p className="text-gray-400 leading-relaxed">
              Ask Sage for a proposal, a report, a policy summary, or anything else your team needs. It searches your knowledge base, drafts the full document, and can email it to a colleague — all in one conversation.
            </p>
            <ul className="space-y-4">
              {[
                { icon: '✦', text: 'Answers are drawn from your actual knowledge base — not the generic internet' },
                { icon: '✦', text: 'Documents are complete and ready to use, not bullet-point skeletons' },
                { icon: '✦', text: 'Email any output to a colleague directly from the chat' },
                { icon: '✦', text: 'Conversation stays private — only authenticated team members have access' },
              ].map((item) => (
                <li key={item.text} className="flex gap-3 items-start">
                  <span className="text-brand-400 text-xs mt-1 shrink-0 font-bold">{item.icon}</span>
                  <p className="text-sm text-gray-300 leading-relaxed">{item.text}</p>
                </li>
              ))}
            </ul>
          </ScrollReveal>

          {/* Right — mock chat */}
          <ScrollReveal delay={0.15}>
            <div className="rounded-2xl bg-[#2a2a2a] border border-white/10 overflow-hidden shadow-2xl">
              {/* Window chrome */}
              <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/10 bg-[#232323]">
                <div className="w-7 h-7 rounded-lg bg-brand-600/20 border border-brand-600/30 flex items-center justify-center">
                  <span className="text-brand-400 text-xs font-bold">✦</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Appalix Sage</p>
                  <p className="text-[10px] text-gray-500">Your internal AI assistant</p>
                </div>
              </div>

              {/* Messages */}
              <div className="px-5 py-5 space-y-5 max-h-[440px] overflow-y-auto">
                {CHAT_DEMO.map((msg, i) => (
                  <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold ${
                      msg.role === 'user' ? 'bg-white/10 text-gray-300' : 'bg-brand-600/20 text-brand-400'
                    }`}>
                      {msg.role === 'user' ? 'You' : '✦'}
                    </div>
                    <div className={`max-w-[82%] px-4 py-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-white/8 text-gray-300 rounded-tr-sm'
                        : 'bg-brand-600/10 border border-brand-600/20 text-gray-200 rounded-tl-sm'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>

              {/* Input bar */}
              <div className="px-5 py-4 border-t border-white/10">
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
                  <span className="flex-1 text-xs text-gray-600">Ask Sage anything…</span>
                  <div className="w-6 h-6 rounded-lg bg-brand-600/30 flex items-center justify-center">
                    <svg className="w-3 h-3 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Feature pillars ───────────────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal className="text-center mb-14">
            <p className="text-xs text-brand-400 uppercase tracking-widest font-semibold mb-3">Capabilities</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Everything your team needs in one place</h2>
            <p className="text-gray-400 max-w-xl mx-auto text-sm leading-relaxed">
              Sage combines knowledge retrieval, document generation, and team sharing into a single AI-powered conversation.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f, i) => (
              <ScrollReveal key={f.title} delay={i * 0.08}>
                <div className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-brand-600/30 hover:bg-white/[0.07] transition-all h-full flex flex-col">
                  <div className="w-11 h-11 rounded-xl bg-brand-600/10 border border-brand-600/20 flex items-center justify-center text-2xl mb-5 group-hover:bg-brand-600/15 transition-colors">
                    {f.icon}
                  </div>
                  <span className="text-xs text-brand-400 font-semibold uppercase tracking-widest mb-2">{f.tag}</span>
                  <h3 className="font-semibold text-white mb-3 leading-snug">{f.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed flex-1">{f.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Roles ─────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal className="text-center mb-14">
            <p className="text-xs text-brand-400 uppercase tracking-widest font-semibold mb-3">For every role</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Your whole team, moving faster</h2>
            <p className="text-gray-400 max-w-xl mx-auto text-sm leading-relaxed">
              Sage doesn&apos;t just help one department. Every team member benefits from having an AI that knows your business inside-out.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {ROLES.map((r, i) => (
              <ScrollReveal key={r.role} delay={i * 0.07}>
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-brand-600/20 transition-colors h-full">
                  <div className="flex items-center gap-3 mb-5">
                    <span className="text-2xl">{r.emoji}</span>
                    <h3 className="font-semibold text-white">{r.role}</h3>
                  </div>
                  <ul className="space-y-3">
                    {r.tasks.map((task) => (
                      <li key={task} className="flex gap-2.5 items-start">
                        <svg className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <p className="text-xs text-gray-400 leading-relaxed">{task}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <ScrollReveal className="text-center mb-14">
            <p className="text-xs text-brand-400 uppercase tracking-widest font-semibold mb-3">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Up and running in under 5 minutes</h2>
            <p className="text-gray-400 max-w-xl mx-auto text-sm leading-relaxed">
              There is nothing to install, configure, or integrate. Sage is built directly into your Appalix dashboard and uses your existing knowledge base.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {STEPS.map((s, i) => (
              <ScrollReveal key={s.step} delay={i * 0.1}>
                <div className="relative p-6 rounded-2xl bg-white/5 border border-white/10">
                  {i < STEPS.length - 1 && (
                    <div className="hidden sm:block absolute top-10 -right-3 w-6 h-px bg-brand-600/30 z-10" />
                  )}
                  <p className="text-4xl font-bold text-brand-600/30 mb-4 leading-none">{s.step}</p>
                  <h3 className="font-semibold text-white mb-2">{s.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{s.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Knowledge base callout ────────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">

          <ScrollReveal>
            {/* Visual: knowledge base flow */}
            <div className="rounded-2xl bg-[#2a2a2a] border border-white/10 p-6 space-y-3">
              <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-4">Your knowledge base</p>
              {[
                { icon: '🌐', label: 'Website pages',        count: '47 pages synced' },
                { icon: '📄', label: 'Product documentation', count: '12 PDFs trained' },
                { icon: '❓', label: 'FAQs and Q&A pairs',   count: '134 entries' },
                { icon: '📋', label: 'SOPs and policies',     count: '8 documents' },
              ].map((src) => (
                <div key={src.label} className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <span className="text-base">{src.icon}</span>
                    <p className="text-sm text-gray-300">{src.label}</p>
                  </div>
                  <span className="text-xs text-brand-400">{src.count}</span>
                </div>
              ))}
              <div className="pt-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
                <p className="text-xs text-brand-400">All sources available to Sage instantly</p>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.1} className="space-y-6">
            <p className="text-xs text-brand-400 uppercase tracking-widest font-semibold">Zero extra setup</p>
            <h2 className="text-3xl sm:text-4xl font-bold leading-snug">
              Your knowledge base is already Sage&apos;s memory
            </h2>
            <p className="text-gray-400 leading-relaxed">
              The same content that powers your customer chatbot is immediately available to Sage. Every document, URL, FAQ, and training file you&apos;ve already uploaded is part of Sage&apos;s context — with no duplication, no re-uploading, and no extra configuration.
            </p>
            <p className="text-gray-400 leading-relaxed">
              When your team asks Sage a question, it uses <span className="text-white font-medium">semantic search</span> to find the most relevant passages from your knowledge base and grounds its answer in your actual company content.
            </p>
            <Link
              href="/resources/multiple-bots-multiple-platforms"
              className="inline-flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300 transition-colors"
            >
              Learn how the knowledge base works →
            </Link>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Security strip ────────────────────────────────────────────── */}
      <section className="py-14 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal>
            <div className="rounded-2xl bg-white/[0.03] border border-white/10 px-8 py-8 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
              {[
                { icon: '🔐', title: 'Team-only access', desc: 'Only authenticated workspace members can use Sage. It is never exposed publicly.' },
                { icon: '🛡', title: 'Session-only by default', desc: 'Conversations are held in browser memory — no conversation data is stored in your database.' },
                { icon: '✓', title: 'Plan-gated server-side', desc: 'The plan check is enforced on the API — not just the UI. Starter accounts cannot call Sage regardless of how they navigate.' },
              ].map((item) => (
                <div key={item.title}>
                  <span className="text-2xl block mb-3">{item.icon}</span>
                  <h4 className="font-semibold text-white text-sm mb-2">{item.title}</h4>
                  <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Pro plan callout ──────────────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <ScrollReveal>
            <div className="relative rounded-2xl overflow-hidden border border-brand-600/30 bg-gradient-to-br from-brand-600/10 to-transparent p-10 text-center">
              <div className="absolute inset-0 bg-brand-600/5 pointer-events-none" />
              <div className="relative">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-brand-600/20 text-brand-300 border border-brand-600/30 mb-5">
                  Included in Pro · Scale · Enterprise
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold mb-4">Sage is part of every Pro plan</h2>
                <p className="text-gray-400 text-sm leading-relaxed max-w-lg mx-auto mb-8">
                  There is no separate subscription or add-on. Appalix Sage is included with every Pro, Scale, and Enterprise workspace at no extra charge — alongside unlimited AI automation tools, advanced analytics, and custom branding.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    href="/login"
                    className="px-7 py-3 bg-[#1a8c76] hover:bg-[#14705d] text-white font-medium rounded-xl transition-colors text-sm"
                  >
                    Start a 7 Day Free Trial
                  </Link>
                  <Link
                    href="/pricing"
                    className="px-7 py-3 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white font-medium rounded-xl transition-colors text-sm"
                  >
                    Compare all plans →
                  </Link>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-white/5 text-center">
        <ScrollReveal>
          <p className="text-xs text-brand-400 uppercase tracking-widest font-semibold mb-4">Ready to get started?</p>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Your customers already have AI.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-600">
              Now your team does too.
            </span>
          </h2>
          <p className="text-gray-400 mb-10 text-sm max-w-md mx-auto">
            7-day free trial on every plan. No credit card required. Sage is live in your dashboard from day one.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/login"
              className="px-8 py-3.5 bg-[#1a8c76] hover:bg-[#14705d] text-white font-medium rounded-xl transition-colors"
            >
              Start a 7 Day Free Trial
            </Link>
            <Link
              href="/resources/meet-appalix-sage"
              className="px-8 py-3.5 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white font-medium rounded-xl transition-colors text-sm"
            >
              Read the full guide →
            </Link>
          </div>
        </ScrollReveal>
      </section>

    </div>
  )
}
