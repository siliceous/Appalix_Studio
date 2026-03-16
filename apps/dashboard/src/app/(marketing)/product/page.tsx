'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FadeUp, ScrollReveal } from '@/components/marketing/animate'

/* ─── Sidebar structure (mirrors real app) ─────────────────────────────── */
const SIDEBAR_GROUPS = [
  {
    label: null,
    items: [
      { label: 'Overview',      icon: '⊞', active: true,  sub: false, color: '' },
      { label: 'Emails',        icon: '✉', active: false, sub: true,  color: 'text-blue-500' },
      { label: 'Conversations', icon: '💬', active: false, sub: true,  color: 'text-purple-500' },
      { label: 'Forms',         icon: '📋', active: false, sub: true,  color: 'text-green-500' },
      { label: 'Tickets',       icon: '🎫', active: false, sub: true,  color: 'text-amber-500' },
    ],
  },
  {
    label: 'Agent',
    items: [
      { label: 'Bots',           icon: '🤖', active: false, sub: false, color: '' },
      { label: 'Integrations',   icon: '🔗', active: false, sub: false, color: '' },
      { label: 'Knowledge Base', icon: '📚', active: false, sub: false, color: '' },
    ],
  },
  {
    label: 'Sage',
    items: [
      { label: 'Pipelines', icon: '⧉', active: false, sub: false, color: '' },
      { label: 'Projects',  icon: '📁', active: false, sub: false, color: '' },
      { label: 'Contacts',  icon: '👥', active: false, sub: false, color: '' },
      { label: 'ROI',       icon: '📈', active: false, sub: false, color: '' },
    ],
  },
  {
    label: 'Other',
    items: [
      { label: 'Analytics',    icon: '📊', active: false, sub: false, color: '' },
      { label: 'My Activity',  icon: '🕐', active: false, sub: false, color: '' },
    ],
  },
]

/* ─── Activity feed items ──────────────────────────────────────────────── */
const FEED = [
  { kind: 'email',  icon: '✉', iconBg: 'bg-blue-100',   iconColor: 'text-blue-700',   priority: 'high',   title: 'RE: Pricing enquiry — Henderson & Co',   sub: 'Wants to upgrade to Pro, 3 licences',      time: '2m' },
  { kind: 'bot',    icon: '💬', iconBg: 'bg-purple-100', iconColor: 'text-purple-700', priority: 'high',   title: 'High-intent visitor — /pricing page',    sub: 'Website Bot · 8 msgs',                      time: '5m' },
  { kind: 'form',   icon: '📋', iconBg: 'bg-green-100',  iconColor: 'text-green-700',  priority: 'medium', title: 'Sarah Mitchell — Demo request',          sub: 'sarah@acmecorp.com · +1 555 0142',           time: '11m' },
  { kind: 'ticket', icon: '🎫', iconBg: 'bg-amber-100',  iconColor: 'text-amber-700',  priority: 'medium', title: 'Widget not loading on mobile Safari',    sub: 'James Owens',                               time: '23m' },
  { kind: 'email',  icon: '✉', iconBg: 'bg-blue-100',   iconColor: 'text-blue-700',   priority: 'medium', title: 'Follow-up: WhatsApp integration help',   sub: 'Priya Sharma — priya@logisticsco.com',       time: '1h' },
  { kind: 'bot',    icon: '💬', iconBg: 'bg-purple-100', iconColor: 'text-purple-700', priority: 'low',    title: 'General enquiry — support hours',        sub: 'WhatsApp Agent · 3 msgs',                   time: '2h' },
  { kind: 'form',   icon: '📋', iconBg: 'bg-green-100',  iconColor: 'text-green-700',  priority: 'low',    title: 'Luca Bianchi — Contact us',              sub: 'luca@bianchi.it · +39 02 1234567',           time: '3h' },
]

/* ─── Tasks ────────────────────────────────────────────────────────────── */
const PENDING_TASKS = [
  { title: 'Send proposal to Henderson & Co',  sub: 'Enterprise deal',       due: 'Mar 14 · overdue', overdue: true },
  { title: 'Follow up with Acme Corp',         sub: 'Scale plan trial',       due: 'Mar 15 · overdue', overdue: true },
]
const UPCOMING_TASKS = [
  { title: 'Demo call — Mitchell & Partners',  sub: 'Pro plan demo',          due: 'Mar 18', overdue: false },
  { title: 'Quarterly review deck',            sub: 'Internal',               due: 'Mar 22', overdue: false },
]

/* ─── Priority dot ─────────────────────────────────────────────────────── */
function PriorityDot({ p }: { p: string }) {
  const cls = p === 'high' ? 'bg-green-500' : p === 'medium' ? 'bg-yellow-400' : 'bg-gray-300'
  const pulse = p === 'high'
  if (pulse) return (
    <span className="relative flex h-2 w-2 shrink-0 mt-[5px]">
      <span className={`animate-ping absolute inset-0 rounded-full ${cls} opacity-60`} />
      <span className={`relative rounded-full h-2 w-2 ${cls}`} />
    </span>
  )
  return <span className={`w-2 h-2 rounded-full shrink-0 mt-[5px] ${cls}`} />
}

/* ─── Mini SVG donut ───────────────────────────────────────────────────── */
function MiniDonut({ high, medium, low, total, color }: { high: number; medium: number; low: number; total: number; color: string }) {
  const r = 22, cx = 28, cy = 28, stroke = 8
  const circ = 2 * Math.PI * r
  const pHigh   = total ? (high   / total) * circ : 0
  const pMedium = total ? (medium / total) * circ : 0
  const pLow    = total ? (low    / total) * circ : 0
  const offH = 0
  const offM = circ - pHigh
  const offL = circ - pHigh - pMedium
  const trackColor = '#e5e7eb'
  const COLORS: Record<string, { h: string; m: string; l: string }> = {
    blue:   { h: '#22c55e', m: '#eab308', l: '#d1d5db' },
    purple: { h: '#22c55e', m: '#eab308', l: '#d1d5db' },
    green:  { h: '#22c55e', m: '#eab308', l: '#d1d5db' },
    amber:  { h: '#22c55e', m: '#eab308', l: '#d1d5db' },
  }
  const c = COLORS[color] ?? COLORS.blue
  return (
    <svg width={56} height={56} className="block">
      {/* Track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
      {total > 0 && <>
        {/* Low */}
        {pLow > 0 && <circle cx={cx} cy={cy} r={r} fill="none" stroke={c.l} strokeWidth={stroke} strokeDasharray={`${pLow} ${circ - pLow}`} strokeDashoffset={offL} transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="butt" />}
        {/* Medium */}
        {pMedium > 0 && <circle cx={cx} cy={cy} r={r} fill="none" stroke={c.m} strokeWidth={stroke} strokeDasharray={`${pMedium} ${circ - pMedium}`} strokeDashoffset={offM} transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="butt" />}
        {/* High */}
        {pHigh > 0 && <circle cx={cx} cy={cy} r={r} fill="none" stroke={c.h} strokeWidth={stroke} strokeDasharray={`${pHigh} ${circ - pHigh}`} strokeDashoffset={offH} transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="butt" />}
      </>}
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fontSize="11" fontWeight="700" fill="#111827">{total}</text>
    </svg>
  )
}

/* ─── Dashboard Preview (accurate light-mode mockup) ───────────────────── */
function DashboardPreview({ onClick }: { onClick: () => void }) {
  return (
    <div className="group relative cursor-pointer" onClick={onClick} role="button" aria-label="Open demo">
      {/* Hover glow */}
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-brand-600/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* Window shell */}
      <div className="relative rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-2xl">

        {/* macOS chrome */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-100 border-b border-gray-200">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
          </div>
          <div className="flex items-center gap-1.5 px-3 py-0.5 rounded bg-white border border-gray-200">
            <span className="text-[9px] text-gray-400">app.appalix.ai/dashboard</span>
          </div>
          <div className="w-14" />
        </div>

        {/* App layout */}
        <div className="flex" style={{ height: 520 }}>

          {/* ── Sidebar ─────────────────────────────────────────────── */}
          <div className="w-40 shrink-0 bg-white border-r border-gray-100 flex flex-col py-2">
            {/* Logo */}
            <div className="px-3 py-2 mb-2 border-b border-gray-100">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-5 h-5 rounded bg-[#15A4AE]/15 flex items-center justify-center">
                  <span className="text-[#15A4AE] text-[8px] font-bold">A</span>
                </div>
                <span className="text-[10px] font-bold text-gray-900">Appalix</span>
              </div>
              <div className="flex items-center gap-1 text-[8px] text-gray-400">
                <span>My Workspace</span><span>▾</span>
              </div>
            </div>

            {SIDEBAR_GROUPS.map((g, gi) => (
              <div key={gi} className="mb-1">
                {g.label && (
                  <p className="px-3 pt-2 pb-0.5 text-[7px] font-semibold uppercase tracking-widest text-gray-400">{g.label}</p>
                )}
                {g.items.map((item) => (
                  <div
                    key={item.label}
                    className={`flex items-center gap-1.5 px-3 py-1 text-[9px] transition-colors ${
                      item.active
                        ? 'bg-[#15A4AE]/10 text-[#15A4AE] font-semibold'
                        : 'text-gray-500'
                    } ${item.sub ? 'pl-6' : ''}`}
                  >
                    <span className={`text-[9px] ${item.color || (item.active ? 'text-[#15A4AE]' : 'text-gray-400')}`}>{item.icon}</span>
                    {item.label}
                  </div>
                ))}
              </div>
            ))}

            {/* Bottom user */}
            <div className="mt-auto px-3 py-2 border-t border-gray-100 flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-[#15A4AE]/20 flex items-center justify-center text-[7px] text-[#15A4AE] font-bold">J</div>
              <div>
                <p className="text-[8px] text-gray-800 font-medium leading-none">James</p>
                <p className="text-[7px] text-gray-400 mt-0.5">Pro Plan</p>
              </div>
            </div>
          </div>

          {/* ── Main content ────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto bg-gray-50 p-3 flex flex-col gap-3">

            {/* Page header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-gray-900">Good morning, James 👋</p>
                <p className="text-[8px] text-gray-400">Mon, 16 Mar 2026 · Last 30 days</p>
              </div>
              <div className="px-2 py-1 rounded-lg bg-[#15A4AE] text-[8px] text-white font-semibold">+ New Bot</div>
            </div>

            {/* Connect inbox banner */}
            <div className="flex items-center gap-2 px-3 py-2 bg-[#15A4AE] rounded-xl">
              <span className="text-white text-[10px]">✉</span>
              <div className="flex-1">
                <p className="text-[9px] font-bold text-white leading-none">Connect &amp; sync your inbox</p>
                <p className="text-[7px] text-white/80">Link Gmail or Outlook so Sage can prioritise your emails.</p>
              </div>
              <span className="text-[8px] font-bold text-white shrink-0">Get started →</span>
            </div>

            {/* 4 Donut cards */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[7px] font-semibold uppercase tracking-widest text-gray-400">Overview</p>
                <span className="text-[7px] text-gray-400">Collapse ▾</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Emails',     sub: 'high & medium unread', color: 'blue',   iconCls: 'text-blue-500',   high: 4, medium: 7, low: 3, total: 14 },
                  { label: 'Bot Chats',  sub: 'high & medium active', color: 'purple', iconCls: 'text-purple-500', high: 2, medium: 5, low: 6, total: 13 },
                  { label: 'Forms',      sub: 'all submissions',      color: 'green',  iconCls: 'text-green-500',  high: 3, medium: 4, low: 2, total: 9  },
                  { label: 'Tickets',    sub: 'all tickets',          color: 'amber',  iconCls: 'text-amber-500',  high: 1, medium: 3, low: 4, total: 8  },
                ].map((c) => (
                  <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-2.5 flex flex-col items-center shadow-sm">
                    <div className="w-full flex items-center justify-between mb-1.5">
                      <div>
                        <p className={`text-[8px] font-semibold ${c.iconCls}`}>{c.label}</p>
                        <p className="text-[6.5px] text-gray-400 leading-snug">{c.sub}</p>
                      </div>
                      <span className={`text-[10px] ${c.iconCls}`}>
                        {c.color === 'blue' ? '✉' : c.color === 'purple' ? '💬' : c.color === 'green' ? '📋' : '🎫'}
                      </span>
                    </div>
                    <MiniDonut high={c.high} medium={c.medium} low={c.low} total={c.total} color={c.color} />
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap justify-center">
                      {[{ label: `${c.high} high`, dot: 'bg-green-400' }, { label: `${c.medium} med`, dot: 'bg-yellow-400' }, { label: `${c.low} low`, dot: 'bg-gray-300' }].map((s) => (
                        <span key={s.label} className="flex items-center gap-0.5 text-[6px] text-gray-400">
                          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                          {s.label}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2:1 split — Activity Feed + Tasks */}
            <div className="grid grid-cols-3 gap-2 flex-1 min-h-0">

              {/* Activity Feed (2/3) */}
              <div className="col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[9px] font-semibold text-gray-900">Activity Feed</p>
                    <div className="flex items-center gap-0.5 bg-gray-100 rounded px-0.5 py-0.5">
                      <div className="w-4 h-3 rounded-sm bg-white flex items-center justify-center"><span className="text-[6px] text-gray-700">≡</span></div>
                      <div className="w-4 h-3 rounded-sm flex items-center justify-center"><span className="text-[6px] text-gray-400">⊞</span></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[8px]">
                    <span className="flex items-center gap-0.5 text-blue-500">✉ 14</span>
                    <span className="flex items-center gap-0.5 text-purple-500">💬 13</span>
                    <span className="flex items-center gap-0.5 text-green-500">📋 9</span>
                    <span className="flex items-center gap-0.5 text-amber-500">🎫 8</span>
                  </div>
                </div>
                <div className="divide-y divide-gray-50 overflow-y-auto">
                  {FEED.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 px-3 py-2 hover:bg-gray-50 transition-colors">
                      <PriorityDot p={item.priority} />
                      <div className={`w-5 h-5 rounded shrink-0 flex items-center justify-center ${item.iconBg}`}>
                        <span className={`text-[8px] ${item.iconColor}`}>{item.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[8px] font-semibold text-gray-900 truncate leading-snug">{item.title}</p>
                        <p className="text-[7px] text-gray-400 truncate">{item.sub}</p>
                      </div>
                      <span className="text-[7px] text-gray-400 shrink-0">{item.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tasks (1/3) */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-gray-400">☑</span>
                    <p className="text-[9px] font-semibold text-gray-900">Tasks</p>
                  </div>
                  <span className="text-[7px] font-bold px-1 py-0.5 rounded-full bg-gray-100 text-gray-500">{PENDING_TASKS.length + UPCOMING_TASKS.length}</span>
                </div>

                {/* Pending */}
                <div className="px-3 py-1 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-[7px] font-semibold uppercase tracking-wide text-gray-400">Pending</span>
                  <span className="text-[7px] font-bold px-1 py-0.5 rounded-full bg-red-50 text-red-500">{PENDING_TASKS.length}</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {PENDING_TASKS.map((t, i) => (
                    <div key={i} className="flex items-start gap-2 px-3 py-2">
                      <div className="w-3.5 h-3.5 mt-0.5 rounded border-2 border-gray-300 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[8px] font-medium text-gray-900 truncate leading-snug">{t.title}</p>
                        <p className="text-[7px] text-gray-400">{t.sub}</p>
                        <p className="text-[7px] text-red-500 font-medium mt-0.5">{t.due}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Upcoming */}
                <div className="px-3 py-1 bg-gray-50 border-y border-gray-100 flex items-center justify-between">
                  <span className="text-[7px] font-semibold uppercase tracking-wide text-gray-400">Upcoming</span>
                  <span className="text-[7px] font-bold px-1 py-0.5 rounded-full bg-gray-100 text-gray-500">{UPCOMING_TASKS.length}</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {UPCOMING_TASKS.map((t, i) => (
                    <div key={i} className="flex items-start gap-2 px-3 py-2">
                      <div className="w-3.5 h-3.5 mt-0.5 rounded border-2 border-gray-200 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[8px] font-medium text-gray-900 truncate leading-snug">{t.title}</p>
                        <p className="text-[7px] text-gray-400">{t.sub}</p>
                        <p className="text-[7px] text-gray-400 mt-0.5">📅 {t.due}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Click overlay */}
      <div className="absolute inset-0 flex items-center justify-center rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
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

/* ─── Demo Modal ────────────────────────────────────────────────────────── */
function DemoModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-lg bg-[#222] border border-white/10 rounded-2xl p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors flex items-center justify-center text-sm">✕</button>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-600/40 bg-brand-600/10 text-brand-400 text-xs font-medium mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
          Live demo · No credit card needed
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">See Appalix in action</h2>
        <p className="text-sm text-gray-400 leading-relaxed mb-7">
          Get a personalised walkthrough of the dashboard, bot builder, and integrations — or start your free trial right now and explore it yourself.
        </p>
        <div className="flex flex-col gap-3">
          <Link href="/login" onClick={onClose} className="w-full py-3.5 bg-[#1a8c76] hover:bg-[#14705d] text-white font-medium rounded-xl transition-colors text-sm text-center">
            Start a 7-day free trial — free
          </Link>
          <Link href="/contact" onClick={onClose} className="w-full py-3.5 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white font-medium rounded-xl transition-colors text-sm text-center">
            Book a live demo →
          </Link>
        </div>
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

/* ─── Feature cards ─────────────────────────────────────────────────────── */
const FEATURES = [
  { icon: '📊', tag: 'Analytics', title: 'Live performance at a glance', desc: 'Emails, bot chats, forms, and tickets tracked in real time with AI priority scoring on every item.' },
  { icon: '🤖', tag: 'Bot Management', title: 'All your bots, one workspace', desc: 'Create, train, and deploy multiple bots. Each bot gets its own knowledge base, branding, and analytics.' },
  { icon: '🎯', tag: 'Lead Capture', title: 'Every lead, automatically logged', desc: 'Names, emails, and phone numbers collected mid-conversation and routed straight to your CRM.' },
  { icon: '🔗', tag: 'Integrations', title: 'Connect your entire stack', desc: 'HubSpot, Salesforce, Zapier, Slack, WhatsApp, and 50+ more — all configured from one place.' },
]

const STEPS = [
  { step: '01', title: 'Create your workspace', desc: 'Sign up and your dashboard is ready instantly. No configuration required.' },
  { step: '02', title: 'Build and train your bot', desc: 'Upload URLs, PDFs, and documents. Your bot is trained and ready to deploy in minutes.' },
  { step: '03', title: 'Watch the leads roll in', desc: 'Deploy to any channel. Every conversation, lead, and resolution appears in real time.' },
]

/* ─── Page ──────────────────────────────────────────────────────────────── */
export default function ProductPage() {
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
              The Appalix dashboard gives you real-time visibility across all your emails, bots, forms, and tickets — with AI that scores and surfaces what matters before you have to ask.
            </p>
          </FadeUp>
          <FadeUp delay={0.3}>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/login" className="px-7 py-3.5 bg-[#1a8c76] hover:bg-[#14705d] text-white font-medium rounded-xl transition-colors text-sm">
                Start a 7 Day Free Trial
              </Link>
              <button onClick={() => setModalOpen(true)} className="px-7 py-3.5 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white font-medium rounded-xl transition-colors text-sm">
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
            <p className="text-center text-xs text-gray-600 mt-4">Click to see a live demo → real data, real bots, real results</p>
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
                  <div className="w-11 h-11 rounded-xl bg-brand-600/10 border border-brand-600/20 flex items-center justify-center text-2xl mb-5 group-hover:bg-brand-600/15 transition-colors">{f.icon}</div>
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
                { value: '95+',    label: 'Languages supported',  sub: 'Auto-detected' },
                { value: '<5s',    label: 'Average response time', sub: 'Across all bots' },
                { value: '68%',    label: 'Fewer support tickets', sub: 'Typical reduction' },
                { value: '6,000+', label: 'Apps via Zapier',       sub: 'One-click connect' },
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
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {STEPS.map((s, i) => (
              <ScrollReveal key={s.step} delay={i * 0.1}>
                <div className="relative p-6 rounded-2xl bg-white/5 border border-white/10">
                  {i < STEPS.length - 1 && <div className="hidden sm:block absolute top-10 -right-3 w-6 h-px bg-brand-600/30 z-10" />}
                  <p className="text-4xl font-bold text-brand-600/30 mb-4 leading-none">{s.step}</p>
                  <h3 className="font-semibold text-white mb-2">{s.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{s.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 2-col CTA ─────────────────────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          <ScrollReveal delay={0.1} className="space-y-6">
            <p className="text-xs text-brand-400 uppercase tracking-widest font-semibold">Your control panel</p>
            <h2 className="text-3xl sm:text-4xl font-bold leading-snug">One dashboard.<br />Every channel, bot, and lead.</h2>
            <p className="text-gray-400 leading-relaxed">
              Whether you&apos;re running one bot or twenty, the Appalix dashboard gives you a single source of truth. Real-time metrics, AI priority scoring, and one-click access to every conversation.
            </p>
            <ul className="space-y-4">
              {[
                'Daily AI summaries delivered to your inbox every morning',
                'Priority scoring on every email, chat, form, and ticket',
                'Lead routing to your CRM with zero manual entry',
                'Tasks panel — pending and upcoming, always visible',
              ].map((t) => (
                <li key={t} className="flex gap-3 items-start">
                  <span className="text-brand-400 text-xs mt-1 shrink-0 font-bold">✦</span>
                  <p className="text-sm text-gray-300 leading-relaxed">{t}</p>
                </li>
              ))}
            </ul>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/login" className="px-7 py-3.5 bg-[#1a8c76] hover:bg-[#14705d] text-white font-medium rounded-xl transition-colors text-sm text-center">
                Start a 7 Day Free Trial
              </Link>
              <button onClick={() => setModalOpen(true)} className="px-7 py-3.5 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white font-medium rounded-xl transition-colors text-sm">
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
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-600">is one click away.</span>
          </h2>
          <p className="text-gray-400 mb-10 text-sm max-w-md mx-auto">7-day free trial on every plan. No credit card required.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/login" className="px-8 py-3.5 bg-[#1a8c76] hover:bg-[#14705d] text-white font-medium rounded-xl transition-colors">
              Start a 7 Day Free Trial
            </Link>
            <button onClick={() => setModalOpen(true)} className="px-8 py-3.5 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white font-medium rounded-xl transition-colors text-sm">
              See the dashboard live →
            </button>
          </div>
        </ScrollReveal>
      </section>

      {modalOpen && <DemoModal onClose={() => setModalOpen(false)} />}
    </div>
  )
}
