'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FadeUp, ScrollReveal } from '@/components/marketing/animate'

/* ─── Demo data ─────────────────────────────────────────────────────────── */

const STATS = [
  { label: 'Total Conversations',  value: '2,847',  delta: '+18%',  icon: '💬', positive: true },
  { label: 'Leads Captured',       value: '312',    delta: '+24%',  icon: '🎯', positive: true },
  { label: 'Tickets Auto-Resolved',value: '1,429',  delta: '+31%',  icon: '✅', positive: true },
  { label: 'Avg. Sentiment',       value: '92%',    delta: '+4pts', icon: '😊', positive: true },
]

const CONVERSATIONS = [
  { name: 'Sarah Mitchell',  channel: 'WhatsApp',  status: 'Lead captured',   time: '2m ago',   sentiment: 94 },
  { name: 'James Owens',     channel: 'Web Widget',status: 'Resolved',        time: '11m ago',  sentiment: 88 },
  { name: 'Priya Sharma',    channel: 'Messenger', status: 'Handed off',      time: '23m ago',  sentiment: 71 },
  { name: 'Luca Bianchi',    channel: 'Telegram',  status: 'Resolved',        time: '1h ago',   sentiment: 96 },
  { name: 'Amy Chen',        channel: 'Slack',     status: 'Lead captured',   time: '2h ago',   sentiment: 89 },
]

const BOTS = [
  { name: 'Website Bot',    convos: 1204, leads: 143, health: 98 },
  { name: 'Support Bot',    convos: 891,  leads: 67,  health: 95 },
  { name: 'WhatsApp Agent', convos: 752,  leads: 102, health: 99 },
]

const NAV_ITEMS = [
  { icon: '▪', label: 'Overview',      active: true  },
  { icon: '▪', label: 'Bots',          active: false },
  { icon: '▪', label: 'Conversations', active: false },
  { icon: '▪', label: 'Analytics',     active: false },
  { icon: '✦', label: 'Sage',          active: false, pro: true },
  { icon: '▪', label: 'Integrations',  active: false },
  { icon: '▪', label: 'Settings',      active: false },
]

const FEATURES = [
  {
    icon: '📊',
    tag: 'Analytics',
    title: 'Live performance at a glance',
    desc: 'Every conversation, lead, and resolution tracked in real time. Spot trends before they become problems with daily AI-generated summaries.',
  },
  {
    icon: '🤖',
    tag: 'Bot Management',
    title: 'All your bots, one workspace',
    desc: 'Create, train, and deploy multiple bots from a single dashboard. Each bot gets its own knowledge base, branding, and analytics.',
  },
  {
    icon: '🎯',
    tag: 'Lead Capture',
    title: 'Every lead, automatically logged',
    desc: 'Names, emails, and phone numbers collected mid-conversation and routed straight to your CRM — zero manual entry required.',
  },
  {
    icon: '🔗',
    tag: 'Integrations',
    title: 'Connect your entire stack',
    desc: 'HubSpot, Salesforce, Zapier, Slack, WhatsApp, and 50+ more. All configured and monitored from the same dashboard.',
  },
]

const STEPS = [
  { step: '01', title: 'Create your workspace', desc: 'Sign up and your dashboard is ready instantly. No configuration required — your workspace is live from the first login.' },
  { step: '02', title: 'Build and train your bot', desc: 'Upload URLs, PDFs, and documents. Your bot is trained and ready to deploy in minutes, not weeks.' },
  { step: '03', title: 'Watch the leads roll in', desc: 'Deploy to any channel. Every conversation, lead, and resolution appears in your dashboard in real time.' },
]

/* ─── Status badge colour ───────────────────────────────────────────────── */
function statusColor(status: string) {
  if (status === 'Lead captured')  return 'bg-[#15A4AE]/15 text-[#61c2ad]'
  if (status === 'Resolved')       return 'bg-green-500/10 text-green-400'
  if (status === 'Handed off')     return 'bg-amber-500/10 text-amber-400'
  return 'bg-white/5 text-gray-400'
}

/* ─── Mini bar chart ────────────────────────────────────────────────────── */
const CHART_BARS = [42, 58, 51, 67, 73, 61, 88, 79, 92, 85, 76, 94, 88, 100]

/* ─── Demo Modal ────────────────────────────────────────────────────────── */
function DemoModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-[#222] border border-white/10 rounded-2xl p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors flex items-center justify-center text-sm"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-600/40 bg-brand-600/10 text-brand-400 text-xs font-medium mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
          Live demo · No credit card needed
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">See Appalix in action</h2>
        <p className="text-sm text-gray-400 leading-relaxed mb-7">
          Get a personalised walkthrough of the dashboard, bot builder, and integrations — or start your free trial right now and explore it yourself.
        </p>

        {/* CTAs */}
        <div className="flex flex-col gap-3">
          <Link
            href="/login"
            onClick={onClose}
            className="w-full py-3.5 bg-[#1a8c76] hover:bg-[#14705d] text-white font-medium rounded-xl transition-colors text-sm text-center"
          >
            Start a 7-day free trial — free
          </Link>
          <Link
            href="/contact"
            onClick={onClose}
            className="w-full py-3.5 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white font-medium rounded-xl transition-colors text-sm text-center"
          >
            Book a live demo →
          </Link>
        </div>

        {/* Trust strip */}
        <div className="mt-6 pt-5 border-t border-white/5 flex items-center justify-center gap-5">
          {['No credit card', 'Cancel anytime', '7-day free trial'].map((t) => (
            <span key={t} className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <svg className="w-3 h-3 text-brand-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Dashboard Preview (UI mockup) ────────────────────────────────────── */
function DashboardPreview({ onClick }: { onClick: () => void }) {
  return (
    <div
      className="group relative cursor-pointer"
      onClick={onClick}
      role="button"
      aria-label="Open demo"
    >
      {/* Glow */}
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-brand-600/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* Shell */}
      <div className="relative rounded-2xl border border-white/10 bg-[#1a1a1a] overflow-hidden shadow-2xl">

        {/* Window chrome */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#151515] border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-white/[0.04] border border-white/[0.06]">
            <span className="text-[10px] text-gray-500">app.appalix.ai</span>
          </div>
          <div className="w-14" />
        </div>

        {/* App body */}
        <div className="flex h-[480px] sm:h-[540px]">

          {/* Sidebar */}
          <div className="w-44 shrink-0 bg-[#161616] border-r border-white/[0.06] flex flex-col">
            {/* Logo */}
            <div className="px-4 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-brand-600/20 border border-brand-600/30 flex items-center justify-center">
                  <span className="text-brand-400 text-[9px] font-bold">A</span>
                </div>
                <span className="text-xs font-semibold text-white">Appalix</span>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-white/10 text-[7px] text-gray-400 flex items-center justify-center">▾</div>
                <span className="text-[9px] text-gray-500">My Workspace</span>
              </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-2 py-3 space-y-0.5">
              {NAV_ITEMS.map((item) => (
                <div
                  key={item.label}
                  className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-[10px] transition-colors ${
                    item.active
                      ? 'bg-brand-600/15 text-brand-400'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className={item.label === 'Sage' ? 'text-brand-400' : ''}>{item.icon}</span>
                    {item.label}
                  </span>
                  {item.pro && (
                    <span className="px-1 py-0.5 rounded text-[7px] font-bold bg-brand-600/20 text-brand-400 border border-brand-600/20">
                      PRO
                    </span>
                  )}
                </div>
              ))}
            </nav>

            {/* Bottom user */}
            <div className="px-3 py-3 border-t border-white/[0.06] flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-brand-600/30 flex items-center justify-center text-[8px] text-brand-400 font-bold">J</div>
              <div>
                <p className="text-[9px] text-white font-medium leading-none">James</p>
                <p className="text-[8px] text-gray-500 mt-0.5">Pro Plan</p>
              </div>
            </div>
          </div>

          {/* Main area */}
          <div className="flex-1 overflow-hidden flex flex-col">

            {/* Top bar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] bg-[#1a1a1a]">
              <div>
                <p className="text-xs font-semibold text-white">Overview</p>
                <p className="text-[9px] text-gray-500">Last 30 days</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[9px] text-gray-400">Mar 2026</div>
                <div className="px-2.5 py-1 rounded-lg bg-[#1a8c76]/20 border border-[#1a8c76]/30 text-[9px] text-brand-400">+ New Bot</div>
              </div>
            </div>

            {/* Scroll area */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

              {/* Stat cards */}
              <div className="grid grid-cols-4 gap-2.5">
                {STATS.map((s) => (
                  <div key={s.label} className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm">{s.icon}</span>
                      <span className="text-[8px] text-green-400 font-medium">{s.delta}</span>
                    </div>
                    <p className="text-sm font-bold text-white leading-none">{s.value}</p>
                    <p className="text-[8px] text-gray-500 mt-1 leading-snug">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Chart + Bots row */}
              <div className="grid grid-cols-5 gap-2.5">

                {/* Chart */}
                <div className="col-span-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[9px] font-semibold text-gray-300">Conversations</p>
                    <span className="text-[8px] text-brand-400">Last 14 days</span>
                  </div>
                  <div className="flex items-end gap-1 h-14">
                    {CHART_BARS.map((h, i) => (
                      <div key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: i === CHART_BARS.length - 1 ? '#15A4AE' : 'rgba(21,164,174,0.25)' }} />
                    ))}
                  </div>
                </div>

                {/* Bot health */}
                <div className="col-span-2 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                  <p className="text-[9px] font-semibold text-gray-300 mb-2.5">Bot Health</p>
                  <div className="space-y-2">
                    {BOTS.map((b) => (
                      <div key={b.name}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[8px] text-gray-400 truncate">{b.name}</span>
                          <span className="text-[8px] text-green-400 font-medium">{b.health}%</span>
                        </div>
                        <div className="w-full h-1 rounded-full bg-white/[0.06]">
                          <div className="h-full rounded-full bg-brand-600" style={{ width: `${b.health}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Conversations table */}
              <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.04]">
                  <p className="text-[9px] font-semibold text-gray-300">Recent Conversations</p>
                  <span className="text-[8px] text-brand-400">View all →</span>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {CONVERSATIONS.map((c) => (
                    <div key={c.name} className="flex items-center gap-3 px-3 py-2">
                      <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[8px] text-gray-400 font-bold shrink-0">
                        {c.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] text-white font-medium truncate">{c.name}</p>
                        <p className="text-[8px] text-gray-500">{c.channel}</p>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded-md text-[7px] font-medium ${statusColor(c.status)}`}>
                        {c.status}
                      </span>
                      <div className="text-right shrink-0">
                        <p className="text-[8px] text-green-400 font-medium">{c.sentiment}%</p>
                        <p className="text-[7px] text-gray-600">{c.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Click overlay hint */}
      <div className="absolute inset-0 flex items-center justify-center rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
        <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium shadow-lg">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          See it live
        </div>
      </div>
    </div>
  )
}

/* ─── Page ──────────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="bg-[#1c1c1c] min-h-screen text-white">

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative pt-36 pb-20 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-brand-600/15 rounded-full blur-[140px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          <FadeUp delay={0}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-600/40 bg-brand-600/10 text-brand-400 text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
              Your command centre for AI-powered growth
            </div>
          </FadeUp>

          <FadeUp delay={0.1}>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-snug mb-6">
              Every bot, lead, and<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-600">
                conversation in one place
              </span>
            </h1>
          </FadeUp>

          <FadeUp delay={0.2}>
            <p className="text-base sm:text-xl text-gray-400 leading-relaxed max-w-2xl mx-auto mb-10">
              The Appalix dashboard gives you real-time visibility across all your bots, channels, and leads — with AI analytics that surface what matters before you have to ask.
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
              <button
                onClick={() => setModalOpen(true)}
                className="px-7 py-3.5 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white font-medium rounded-xl transition-colors text-sm"
              >
                See the dashboard →
              </button>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── Dashboard preview ─────────────────────────────────────────── */}
      <section className="pb-24 px-6">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal>
            <DashboardPreview onClick={() => setModalOpen(true)} />
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <p className="text-center text-xs text-gray-600 mt-4">
              Click to see a live demo → real data, real bots, real results
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal className="text-center mb-14">
            <p className="text-xs text-brand-400 uppercase tracking-widest font-semibold mb-3">Dashboard</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Built for clarity, not complexity</h2>
            <p className="text-gray-400 max-w-xl mx-auto text-sm leading-relaxed">
              Every metric you care about, one click away. No spreadsheets, no manual reports — just signal.
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

      {/* ── Stats callout ─────────────────────────────────────────────── */}
      <section className="py-14 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal>
            <div className="rounded-2xl bg-white/[0.03] border border-white/10 px-8 py-10 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
              {[
                { value: '95+',   label: 'Languages supported',       sub: 'Auto-detected' },
                { value: '<5s',   label: 'Average response time',      sub: 'Across all bots' },
                { value: '68%',   label: 'Fewer support tickets',      sub: 'Typical reduction' },
                { value: '6,000+',label: 'Apps via Zapier',            sub: 'One-click connect' },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-brand-400 to-brand-600 mb-1">{s.value}</p>
                  <p className="text-sm font-semibold text-white mb-1">{s.label}</p>
                  <p className="text-xs text-gray-500">{s.sub}</p>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <ScrollReveal className="text-center mb-14">
            <p className="text-xs text-brand-400 uppercase tracking-widest font-semibold mb-3">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Live in minutes, not months</h2>
            <p className="text-gray-400 max-w-xl mx-auto text-sm leading-relaxed">
              No developer required. No complex setup. Your dashboard is fully operational within the first session.
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

      {/* ── Dashboard preview CTA ─────────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">

          <ScrollReveal delay={0.1} className="space-y-6">
            <p className="text-xs text-brand-400 uppercase tracking-widest font-semibold">Your control panel</p>
            <h2 className="text-3xl sm:text-4xl font-bold leading-snug">
              One dashboard.<br />Every channel, bot, and lead.
            </h2>
            <p className="text-gray-400 leading-relaxed">
              Whether you're running one bot or twenty, the Appalix dashboard gives you a single source of truth. Real-time metrics, AI-generated summaries, and one-click access to every conversation — all without leaving your browser.
            </p>
            <ul className="space-y-4">
              {[
                { text: 'Daily AI summaries delivered to your inbox every morning' },
                { text: 'Sentiment scores on every conversation, automatically' },
                { text: 'Lead routing to your CRM with zero manual entry' },
                { text: 'Bot health, token usage, and cost per conversation tracked' },
              ].map((item) => (
                <li key={item.text} className="flex gap-3 items-start">
                  <span className="text-brand-400 text-xs mt-1 shrink-0 font-bold">✦</span>
                  <p className="text-sm text-gray-300 leading-relaxed">{item.text}</p>
                </li>
              ))}
            </ul>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/login"
                className="px-7 py-3.5 bg-[#1a8c76] hover:bg-[#14705d] text-white font-medium rounded-xl transition-colors text-sm text-center"
              >
                Start a 7 Day Free Trial
              </Link>
              <button
                onClick={() => setModalOpen(true)}
                className="px-7 py-3.5 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white font-medium rounded-xl transition-colors text-sm"
              >
                Book a demo →
              </button>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <DashboardPreview onClick={() => setModalOpen(true)} />
          </ScrollReveal>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-white/5 text-center">
        <ScrollReveal>
          <p className="text-xs text-brand-400 uppercase tracking-widest font-semibold mb-4">Ready to get started?</p>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Your AI-powered command centre<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-600">
              is one click away.
            </span>
          </h2>
          <p className="text-gray-400 mb-10 text-sm max-w-md mx-auto">
            7-day free trial on every plan. No credit card required. Your dashboard is live from the moment you sign up.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/login"
              className="px-8 py-3.5 bg-[#1a8c76] hover:bg-[#14705d] text-white font-medium rounded-xl transition-colors"
            >
              Start a 7 Day Free Trial
            </Link>
            <button
              onClick={() => setModalOpen(true)}
              className="px-8 py-3.5 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white font-medium rounded-xl transition-colors text-sm"
            >
              See the dashboard live →
            </button>
          </div>
        </ScrollReveal>
      </section>

      {/* ── Modal ─────────────────────────────────────────────────────── */}
      {modalOpen && <DemoModal onClose={() => setModalOpen(false)} />}

    </div>
  )
}
