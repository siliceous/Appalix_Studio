'use client'

import { useState } from 'react'

/* ─── Tooltip ───────────────────────────────────────────────────────────── */
function Tip({ label, children, dir = 'top', clickable = false }: {
  label: string
  children: React.ReactNode
  dir?: 'top' | 'bottom' | 'right'
  clickable?: boolean
}) {
  const [show, setShow] = useState(false)

  const wrapPos = dir === 'bottom'
    ? 'top-full left-1/2 -translate-x-1/2 mt-[9px]'
    : dir === 'right'
    ? 'left-full top-1/2 -translate-y-1/2 ml-[9px]'
    : 'bottom-full left-1/2 -translate-x-1/2 mb-[9px]'

  const arrowEl = dir === 'bottom'
    ? <span className="absolute -top-[5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border-l border-t border-gray-200 rotate-45" />
    : dir === 'right'
    ? <span className="absolute -left-[5px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white border-l border-b border-gray-200 rotate-45" />
    : <span className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border-r border-b border-gray-200 rotate-45" />

  return (
    <div
      className="relative"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className={`pointer-events-none absolute ${wrapPos} z-40 w-max max-w-[200px]`}>
          <div className="relative px-3 py-2 rounded-lg bg-white text-gray-900 text-[11px] font-medium leading-snug shadow-lg border border-gray-200">
            {arrowEl}
            {clickable && <span className="text-[#15A4AE] font-bold mr-1">●</span>}{label}
          </div>
        </div>
      )}
      {clickable && show && (
        <span className="pointer-events-none absolute -inset-0.5 rounded-lg border border-[#15A4AE]/50" />
      )}
    </div>
  )
}

/* ─── Sidebar structure ─────────────────────────────────────────────────── */
const SIDEBAR_GROUPS = [
  {
    label: null,
    items: [
      { label: 'Overview',      icon: '⊞', active: true,  sub: false, color: '',                tip: 'Your command centre — real-time overview of all activity' },
      { label: 'Emails',        icon: '✉', active: false, sub: true,  color: 'text-blue-500',   tip: 'Manage all email threads with AI-drafted replies' },
      { label: 'Conversations', icon: '💬', active: false, sub: true,  color: 'text-purple-500', tip: 'Live bot chats from every channel in one inbox' },
      { label: 'Forms',         icon: '📋', active: false, sub: true,  color: 'text-green-500',  tip: 'All form submissions, enriched and routed automatically' },
      { label: 'Tickets',       icon: '🎫', active: false, sub: true,  color: 'text-amber-500',  tip: 'Support tickets auto-created and prioritised by AI' },
    ],
  },
  {
    label: 'Agent',
    items: [
      { label: 'Bots',           icon: '🤖', active: false, sub: false, color: '', tip: 'Build and deploy AI bots for web, WhatsApp, Telegram, and more' },
      { label: 'Integrations',   icon: '🔗', active: false, sub: false, color: '', tip: 'Connect HubSpot, Slack, Salesforce, WhatsApp, and 50+ tools' },
      { label: 'Knowledge Base', icon: '📚', active: false, sub: false, color: '', tip: 'Train your bot with URLs, PDFs, and documents — ready in minutes' },
    ],
  },
  {
    label: 'Sage',
    items: [
      { label: 'Pipelines', icon: '⧉', active: false, sub: false, color: '', tip: 'Visual sales pipelines — deals created automatically by Sage Auto' },
      { label: 'Projects',  icon: '📁', active: false, sub: false, color: '', tip: 'Manage projects linked to your deals and contacts' },
      { label: 'Contacts',  icon: '👥', active: false, sub: false, color: '', tip: 'Every lead and customer captured from any channel' },
      { label: 'ROI',       icon: '📈', active: false, sub: false, color: '', tip: 'Track revenue generated from AI-assisted conversations' },
    ],
  },
  {
    label: 'Other',
    items: [
      { label: 'Analytics',   icon: '📊', active: false, sub: false, color: '', tip: 'Deep performance analytics for emails, bots, forms, and tickets' },
      { label: 'My Activity', icon: '🕐', active: false, sub: false, color: '', tip: 'Your personal activity log and action history' },
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
  { title: 'Send proposal to Henderson & Co', sub: 'Enterprise deal',  due: 'Mar 14 · overdue' },
  { title: 'Follow up with Acme Corp',        sub: 'Scale plan trial', due: 'Mar 15 · overdue' },
]
const UPCOMING_TASKS = [
  { title: 'Demo call — Mitchell & Partners', sub: 'Pro plan demo', due: 'Mar 18' },
  { title: 'Quarterly review deck',           sub: 'Internal',      due: 'Mar 22' },
]

/* ─── View-as / date data ───────────────────────────────────────────────── */
const VIEW_AS_MANAGERS  = ['Sarah K.', 'Tom Reid']
const VIEW_AS_EMPLOYEES = ['Amy Chen', 'Priya Sharma', 'Luca Bianchi', 'James Wu', 'Oliver Park']
const DATE_OPTIONS      = ['Today', 'Yesterday', 'Last 7 days', 'Last 30 days']

/* ─── Grid-mode tablet data ─────────────────────────────────────────────── */
const GRID_TABLETS = [
  {
    key: 'email', label: 'Emails', icon: '✉', accentCls: 'text-blue-600',
    borderCls: 'border-blue-200', bgCls: 'bg-blue-50',
    rows: [
      { p: 'high',   title: 'RE: Pricing enquiry — Henderson & Co', sub: 'Wants to upgrade to Pro' },
      { p: 'high',   title: 'Intro: partnership opportunity',        sub: 'partner@growthhq.com' },
      { p: 'medium', title: 'Follow-up: WhatsApp integration help', sub: 'Priya Sharma' },
      { p: 'medium', title: 'Q: Can I white-label the widget?',      sub: 'mark@brandco.com' },
    ],
  },
  {
    key: 'bot', label: 'Bot Chats', icon: '💬', accentCls: 'text-purple-600',
    borderCls: 'border-purple-200', bgCls: 'bg-purple-50',
    rows: [
      { p: 'high',   title: 'High-intent visitor — /pricing page',  sub: 'Website Bot · 8 msgs' },
      { p: 'high',   title: 'Demo request via chat widget',          sub: 'Website Bot · 12 msgs' },
      { p: 'medium', title: 'General enquiry — support hours',       sub: 'WhatsApp Agent · 3 msgs' },
      { p: 'low',    title: 'FAQ: How does billing work?',           sub: 'Website Bot · 2 msgs' },
    ],
  },
  {
    key: 'form', label: 'Forms', icon: '📋', accentCls: 'text-green-600',
    borderCls: 'border-green-200', bgCls: 'bg-green-50',
    rows: [
      { p: 'medium', title: 'Sarah Mitchell — Demo request', sub: 'sarah@acmecorp.com' },
      { p: 'medium', title: 'Carlos Rivera — Contact us',    sub: 'carlos@fintech.io' },
      { p: 'low',    title: 'Luca Bianchi — Contact us',     sub: 'luca@bianchi.it' },
    ],
  },
  {
    key: 'ticket', label: 'Tickets', icon: '🎫', accentCls: 'text-amber-600',
    borderCls: 'border-amber-200', bgCls: 'bg-amber-50',
    rows: [
      { p: 'medium', title: 'Widget not loading on mobile Safari', sub: 'James Owens' },
      { p: 'medium', title: 'Telegram bot not responding',         sub: 'Aiko Tanaka' },
      { p: 'low',    title: 'Export to CSV not working',           sub: 'Peter Voss' },
    ],
  },
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
  const r = 28, cx = 36, cy = 36, stroke = 10
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
    <svg width={72} height={72} className="block">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
      {total > 0 && <>
        {pLow    > 0 && <circle cx={cx} cy={cy} r={r} fill="none" stroke={c.l} strokeWidth={stroke} strokeDasharray={`${pLow}    ${circ - pLow}`}    strokeDashoffset={offL} transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="butt" />}
        {pMedium > 0 && <circle cx={cx} cy={cy} r={r} fill="none" stroke={c.m} strokeWidth={stroke} strokeDasharray={`${pMedium} ${circ - pMedium}`} strokeDashoffset={offM} transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="butt" />}
        {pHigh   > 0 && <circle cx={cx} cy={cy} r={r} fill="none" stroke={c.h} strokeWidth={stroke} strokeDasharray={`${pHigh}   ${circ - pHigh}`}   strokeDashoffset={offH} transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="butt" />}
      </>}
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fontSize="13" fontWeight="700" fill="#111827">{total}</text>
    </svg>
  )
}

/* ─── Dashboard Preview ─────────────────────────────────────────────────── */
export function DashboardPreview({ onClick }: { onClick?: () => void }) {
  const [feedView,     setFeedView]     = useState<'list' | 'grid'>('list')
  const [activeType,   setActiveType]   = useState<string | null>(null)
  const [showViewAs,   setShowViewAs]   = useState(false)
  const [viewAsName,   setViewAsName]   = useState<string | null>(null)
  const [showDate,     setShowDate]     = useState(false)
  const [selectedDate, setSelectedDate] = useState('Last 7 days')

  function stop(e: React.MouseEvent) { e.stopPropagation() }

  function handleTypeClick(e: React.MouseEvent, key: string) {
    stop(e)
    setFeedView('grid')
    setActiveType(prev => prev === key ? null : key)
  }

  function handleListGrid(e: React.MouseEvent, v: 'list' | 'grid') {
    stop(e)
    setFeedView(v)
    if (v === 'list') setActiveType(null)
  }

  return (
    <div className="group relative" role="button" aria-label="Open demo">
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-brand-600/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* Window shell */}
      <div className="relative rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-2xl">

        {/* macOS chrome */}
        <div className="flex items-center justify-between px-5 py-3 bg-gray-100 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex items-center gap-2 px-4 py-1 rounded-md bg-white border border-gray-200">
            <span className="text-xs text-gray-400">app.appalix.ai/dashboard</span>
          </div>
          <div className="w-16" />
        </div>

        {/* App layout */}
        <div className="flex" style={{ height: 700 }}>

          {/* Sidebar */}
          <div className="w-52 shrink-0 bg-white border-r border-gray-100 flex flex-col py-2">
            <div className="px-4 py-3 mb-2 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-md bg-[#15A4AE]/15 flex items-center justify-center">
                  <span className="text-[#15A4AE] text-[10px] font-bold">A</span>
                </div>
                <span className="text-xs font-bold text-gray-900">Appalix</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-gray-400">
                <span>My Workspace</span><span>▾</span>
              </div>
            </div>

            {SIDEBAR_GROUPS.map((g, gi) => (
              <div key={gi} className="mb-1">
                {g.label && (
                  <p className="px-4 pt-2 pb-1 text-[9px] font-semibold uppercase tracking-widest text-gray-400">{g.label}</p>
                )}
                {g.items.map((item) => (
                  <Tip key={item.label} label={item.tip} dir="right">
                    <div
                      className={`flex items-center gap-2 px-4 py-1.5 text-[11px] transition-colors cursor-default ${
                        item.active
                          ? 'bg-[#15A4AE]/10 text-[#15A4AE] font-semibold'
                          : 'text-gray-600'
                      } ${item.sub ? 'pl-8' : ''}`}
                    >
                      <span className={`text-[11px] ${item.color || (item.active ? 'text-[#15A4AE]' : 'text-gray-400')}`}>{item.icon}</span>
                      {item.label}
                    </div>
                  </Tip>
                ))}
              </div>
            ))}

            <div className="mt-auto px-4 py-3 border-t border-gray-100 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#15A4AE]/20 flex items-center justify-center text-[9px] text-[#15A4AE] font-bold">J</div>
              <div>
                <p className="text-[10px] text-gray-800 font-medium leading-none">James</p>
                <p className="text-[9px] text-gray-400 mt-0.5">Pro Plan</p>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 overflow-y-auto bg-gray-50 p-4 flex flex-col gap-4">

            {/* Page header */}
            <div className="flex items-center justify-between gap-3 flex-wrap" onClick={stop}>
              <div>
                <p className="text-sm font-bold text-gray-900">
                  {viewAsName ? `Viewing as ${viewAsName}` : 'Good morning, James 👋'}
                </p>
                <p className="text-[10px] text-gray-600 mt-0.5">Here&apos;s what needs your attention today</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Tip label="Create a new contact — AI pre-fills details from the conversation" dir="bottom" clickable>
                  <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#2a7d6e] text-[10px] text-white font-medium cursor-default">+ Add Contact</div>
                </Tip>
                <Tip label="Open your sales pipelines — deals created automatically by Sage Auto" dir="bottom" clickable>
                  <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 text-[10px] text-white font-medium cursor-default">⧉ Pipelines</div>
                </Tip>

                {/* View as dropdown */}
                <div className="relative">
                  <Tip label="View the dashboard as any team member — managers see full team activity" dir="bottom" clickable>
                    <button
                      onClick={(e) => { stop(e); setShowViewAs(v => !v); setShowDate(false) }}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[10px] font-medium transition-colors ${showViewAs || viewAsName ? 'border-[#15A4AE]/50 bg-[#15A4AE]/5 text-[#15A4AE]' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'}`}
                    >
                      {viewAsName ? `👤 ${viewAsName}` : 'View as…'} <span className="text-gray-400">▾</span>
                    </button>
                  </Tip>
                  {showViewAs && (
                    <div className="absolute right-0 top-full mt-1 z-20 w-44 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                      <p className="px-3 pt-2 pb-1 text-[8px] font-semibold uppercase tracking-widest text-gray-400">Managers</p>
                      {VIEW_AS_MANAGERS.map(n => (
                        <button key={n} onClick={(e) => { stop(e); setViewAsName(n); setShowViewAs(false) }}
                          className={`w-full text-left px-3 py-1.5 text-[10px] flex items-center gap-2 hover:bg-gray-50 transition-colors ${viewAsName === n ? 'text-[#15A4AE] font-semibold' : 'text-gray-700'}`}>
                          <span className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center text-[7px] text-blue-600 font-bold shrink-0">{n[0]}</span>
                          {n} <span className="ml-auto text-[8px] text-gray-400">Manager</span>
                        </button>
                      ))}
                      <p className="px-3 pt-2 pb-1 text-[8px] font-semibold uppercase tracking-widest text-gray-400 border-t border-gray-100 mt-1">Employees</p>
                      {VIEW_AS_EMPLOYEES.map(n => (
                        <button key={n} onClick={(e) => { stop(e); setViewAsName(n); setShowViewAs(false) }}
                          className={`w-full text-left px-3 py-1.5 text-[10px] flex items-center gap-2 hover:bg-gray-50 transition-colors ${viewAsName === n ? 'text-[#15A4AE] font-semibold' : 'text-gray-700'}`}>
                          <span className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center text-[7px] text-gray-500 font-bold shrink-0">{n[0]}</span>
                          {n} <span className="ml-auto text-[8px] text-gray-400">Employee</span>
                        </button>
                      ))}
                      {viewAsName && (
                        <button onClick={(e) => { stop(e); setViewAsName(null); setShowViewAs(false) }}
                          className="w-full text-left px-3 py-2 text-[10px] text-gray-400 hover:text-gray-600 border-t border-gray-100 hover:bg-gray-50 transition-colors">
                          ← Back to my view
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Date dropdown */}
                <div className="relative">
                  <Tip label="Filter all activity by time period" dir="bottom" clickable>
                    <button
                      onClick={(e) => { stop(e); setShowDate(v => !v); setShowViewAs(false) }}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[10px] font-medium transition-colors ${showDate ? 'border-[#15A4AE]/50 bg-[#15A4AE]/5 text-[#15A4AE]' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}
                    >
                      {selectedDate} <span className="text-gray-400">▾</span>
                    </button>
                  </Tip>
                  {showDate && (
                    <div className="absolute right-0 top-full mt-1 z-20 w-36 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                      {DATE_OPTIONS.map(d => (
                        <button key={d} onClick={(e) => { stop(e); setSelectedDate(d); setShowDate(false) }}
                          className={`w-full text-left px-3 py-1.5 text-[10px] hover:bg-gray-50 transition-colors ${selectedDate === d ? 'text-[#15A4AE] font-semibold bg-[#15A4AE]/5' : 'text-gray-700'}`}>
                          {selectedDate === d && '✓ '}{d}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="w-px h-5 bg-gray-200" />
                <Tip label="AI automatically creates contacts and deals from incoming emails, bots, and forms" dir="bottom">
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white cursor-default">
                    <span className="text-[#15A4AE] text-[10px]">⚡</span>
                    <span className="text-[10px] font-medium text-gray-700">Sage Auto</span>
                    <div className="relative w-7 h-3.5 rounded-full bg-[#15A4AE] shrink-0">
                      <div className="absolute right-0.5 top-0.5 w-2.5 h-2.5 rounded-full bg-white shadow-sm" />
                    </div>
                    <span className="text-[9px] font-bold text-[#15A4AE]">ON</span>
                  </div>
                </Tip>
              </div>
            </div>

            {/* 4 Donut cards */}
            <div onClick={stop}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-400">Overview</p>
                <span className="text-[9px] text-gray-400">Collapse ▾</span>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Emails',    sub: 'high & medium unread', color: 'blue',   iconCls: 'text-blue-500',   high: 4, medium: 7, low: 3, total: 14, tip: 'Unread emails scored by AI — green = urgent reply needed, yellow = follow up soon' },
                  { label: 'Bot Chats', sub: 'high & medium active', color: 'purple', iconCls: 'text-purple-500', high: 2, medium: 5, low: 6, total: 13, tip: 'Active bot conversations across all channels — high priority means a hot lead is waiting' },
                  { label: 'Forms',     sub: 'all submissions',      color: 'green',  iconCls: 'text-green-500',  high: 3, medium: 4, low: 2, total: 9,  tip: 'Form submissions from demo requests, contact forms, and lead captures — AI pre-qualifies each' },
                  { label: 'Tickets',   sub: 'all tickets',          color: 'amber',  iconCls: 'text-amber-500',  high: 1, medium: 3, low: 4, total: 8,  tip: 'Open support tickets with AI-suggested replies — resolve faster without lifting a finger' },
                ].map((c) => (
                  <Tip key={c.label} label={c.tip} dir="bottom">
                    <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-col items-center shadow-sm">
                      <div className="w-full flex items-center justify-between mb-2">
                        <div>
                          <p className={`text-[11px] font-semibold ${c.iconCls}`}>{c.label}</p>
                          <p className="text-[9px] text-gray-600 leading-snug">{c.sub}</p>
                        </div>
                        <span className={`text-sm ${c.iconCls}`}>
                          {c.color === 'blue' ? '✉' : c.color === 'purple' ? '💬' : c.color === 'green' ? '📋' : '🎫'}
                        </span>
                      </div>
                      <MiniDonut high={c.high} medium={c.medium} low={c.low} total={c.total} color={c.color} />
                      <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
                        {[{ label: `${c.high} high`, dot: 'bg-green-400' }, { label: `${c.medium} med`, dot: 'bg-yellow-400' }, { label: `${c.low} low`, dot: 'bg-gray-300' }].map((s) => (
                          <span key={s.label} className="flex items-center gap-1 text-[9px] text-gray-500">
                            <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                            {s.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </Tip>
                ))}
              </div>
            </div>

            {/* 2:1 split — Activity Feed + Tasks */}
            <div className="grid grid-cols-3 gap-3 flex-1 min-h-0">

              {/* Activity Feed (2/3) */}
              <div className="col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden" onClick={stop}>
                <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tip label="All activity in one feed — emails, chats, forms, and tickets" dir="bottom">
                      <p className="text-xs font-semibold text-gray-900 cursor-default">Activity Feed</p>
                    </Tip>
                    <div className="flex items-center gap-0.5 bg-gray-100 rounded p-0.5">
                      <Tip label="List view — chronological feed of all activity" dir="bottom" clickable>
                        <button onClick={(e) => handleListGrid(e, 'list')}
                          className={`w-5 h-4 rounded flex items-center justify-center transition-colors ${feedView === 'list' ? 'bg-white shadow-sm text-gray-700' : 'text-gray-400 hover:text-gray-600'}`}>
                          <span className="text-[8px]">≡</span>
                        </button>
                      </Tip>
                      <Tip label="Grid view — items grouped by channel type" dir="bottom" clickable>
                        <button onClick={(e) => handleListGrid(e, 'grid')}
                          className={`w-5 h-4 rounded flex items-center justify-center transition-colors ${feedView === 'grid' ? 'bg-white shadow-sm text-gray-700' : 'text-gray-400 hover:text-gray-600'}`}>
                          <span className="text-[8px]">⊞</span>
                        </button>
                      </Tip>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[10px]">
                    {[
                      { key: 'email',  icon: '✉',  count: 14, cls: 'text-blue-500',   tip: 'Click to view emails only in grid mode' },
                      { key: 'bot',    icon: '💬', count: 13, cls: 'text-purple-500', tip: 'Click to view bot chats only in grid mode' },
                      { key: 'form',   icon: '📋', count: 9,  cls: 'text-green-500',  tip: 'Click to view form submissions only in grid mode' },
                      { key: 'ticket', icon: '🎫', count: 8,  cls: 'text-amber-500',  tip: 'Click to view tickets only in grid mode' },
                    ].map(t => (
                      <Tip key={t.key} label={t.tip} dir="bottom" clickable>
                        <button onClick={(e) => handleTypeClick(e, t.key)}
                          className={`flex items-center gap-1 ${t.cls} hover:opacity-80 transition-opacity ${activeType === t.key ? 'font-bold underline' : ''}`}>
                          {t.icon} {t.count}
                        </button>
                      </Tip>
                    ))}
                  </div>
                </div>

                {/* LIST VIEW */}
                {feedView === 'list' && (
                  <div className="divide-y divide-gray-50 overflow-y-auto">
                    {FEED.map((item, i) => (
                      <Tip key={i} label="Click to open — AI summary, suggested reply, and one-click actions" dir="top" clickable>
                        <div className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors cursor-default">
                          <PriorityDot p={item.priority} />
                          <div className={`w-6 h-6 rounded-md shrink-0 flex items-center justify-center ${item.iconBg}`}>
                            <span className={`text-[11px] ${item.iconColor}`}>{item.icon}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-semibold text-gray-900 truncate leading-snug">{item.title}</p>
                            <p className="text-[9px] text-gray-600 truncate mt-0.5">{item.sub}</p>
                          </div>
                          <span className="text-[9px] text-gray-500 shrink-0">{item.time}</span>
                        </div>
                      </Tip>
                    ))}
                  </div>
                )}

                {/* GRID VIEW — 4 collapsible tablets */}
                {feedView === 'grid' && (
                  <div className="flex flex-col gap-2 p-3 overflow-y-auto">
                    {GRID_TABLETS.map(tablet => {
                      const isActive    = activeType === tablet.key
                      const isCollapsed = activeType !== null && !isActive
                      return (
                        <div key={tablet.key} className={`rounded-xl border overflow-hidden transition-all duration-200 ${isActive ? tablet.borderCls : 'border-gray-100'}`}>
                          <button
                            onClick={(e) => { stop(e); setActiveType(prev => prev === tablet.key ? null : tablet.key) }}
                            className={`w-full px-3 py-2 flex items-center justify-between ${isActive ? tablet.bgCls : 'bg-gray-50 hover:bg-gray-100'} transition-colors`}
                          >
                            <div className={`flex items-center gap-2 text-[10px] font-semibold ${tablet.accentCls}`}>
                              <span>{tablet.icon}</span>{tablet.label}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${tablet.bgCls} ${tablet.accentCls}`}>{tablet.rows.length}</span>
                              <span className={`text-[9px] ${tablet.accentCls} transition-transform duration-200 ${isActive ? 'rotate-180 inline-block' : ''}`}>▾</span>
                            </div>
                          </button>
                          <div className={`overflow-hidden transition-all duration-200 divide-y divide-gray-50 ${isCollapsed ? 'max-h-0' : isActive ? 'max-h-72' : 'max-h-24'}`}>
                            {tablet.rows.map((row, ri) => (
                              <div key={ri} className="flex items-start gap-2.5 px-3 py-2 hover:bg-gray-50 transition-colors">
                                <PriorityDot p={row.p} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] font-semibold text-gray-900 truncate">{row.title}</p>
                                  <p className="text-[9px] text-gray-600 truncate mt-0.5">{row.sub}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Tasks (1/3) */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden" onClick={stop}>
                <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
                  <Tip label="Tasks linked to your deals and contacts — overdue items are highlighted in red" dir="top">
                    <div className="flex items-center gap-1.5 cursor-default">
                      <span className="text-xs text-gray-400">☑</span>
                      <p className="text-xs font-semibold text-gray-900">Tasks</p>
                    </div>
                  </Tip>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{PENDING_TASKS.length + UPCOMING_TASKS.length}</span>
                </div>

                <div className="px-4 py-1.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <Tip label="Overdue tasks that need immediate attention" dir="top">
                    <span className="text-[9px] font-semibold uppercase tracking-wide text-gray-400 cursor-default">Pending</span>
                  </Tip>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-500">{PENDING_TASKS.length}</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {PENDING_TASKS.map((t, i) => (
                    <Tip key={i} label="Click to mark complete, reassign, or view the linked deal" dir="top" clickable>
                      <div className="flex items-start gap-2.5 px-4 py-3 hover:bg-gray-50 transition-colors cursor-default">
                        <div className="w-4 h-4 mt-0.5 rounded border-2 border-gray-300 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-medium text-gray-900 truncate leading-snug">{t.title}</p>
                          <p className="text-[9px] text-gray-600 mt-0.5">{t.sub}</p>
                          <p className="text-[9px] text-red-500 font-medium mt-0.5">{t.due}</p>
                        </div>
                      </div>
                    </Tip>
                  ))}
                </div>

                <div className="px-4 py-1.5 bg-gray-50 border-y border-gray-100 flex items-center justify-between">
                  <Tip label="Scheduled tasks and follow-ups coming up this week" dir="top">
                    <span className="text-[9px] font-semibold uppercase tracking-wide text-gray-400 cursor-default">Upcoming</span>
                  </Tip>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{UPCOMING_TASKS.length}</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {UPCOMING_TASKS.map((t, i) => (
                    <Tip key={i} label="Click to view details, add notes, or reschedule" dir="top" clickable>
                      <div className="flex items-start gap-2.5 px-4 py-3 hover:bg-gray-50 transition-colors cursor-default">
                        <div className="w-4 h-4 mt-0.5 rounded border-2 border-gray-200 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-medium text-gray-900 truncate leading-snug">{t.title}</p>
                          <p className="text-[9px] text-gray-600 mt-0.5">{t.sub}</p>
                          <p className="text-[9px] text-gray-500 mt-0.5">📅 {t.due}</p>
                        </div>
                      </div>
                    </Tip>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* "See it live" button */}
      {onClick && (
        <button
          onClick={onClick}
          className="absolute bottom-5 right-5 flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          See it live
        </button>
      )}
    </div>
  )
}
