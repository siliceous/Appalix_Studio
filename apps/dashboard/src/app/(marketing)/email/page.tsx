'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FadeUp, ScrollReveal } from '@/components/marketing/animate'

/* ─── Tooltip ───────────────────────────────────────────────────────────── */
function Tip({ label, children, dir = 'top', clickable = false }: {
  label: string; children: React.ReactNode; dir?: 'top' | 'bottom' | 'right'; clickable?: boolean
}) {
  const [show, setShow] = useState(false)
  const wrapPos = dir === 'bottom' ? 'top-full left-1/2 -translate-x-1/2 mt-[9px]'
    : dir === 'right' ? 'left-full top-1/2 -translate-y-1/2 ml-[9px]'
    : 'bottom-full left-1/2 -translate-x-1/2 mb-[9px]'
  const arrowEl = dir === 'bottom'
    ? <span className="absolute -top-[5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border-l border-t border-gray-200 rotate-45" />
    : dir === 'right'
    ? <span className="absolute -left-[5px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white border-l border-b border-gray-200 rotate-45" />
    : <span className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border-r border-b border-gray-200 rotate-45" />
  return (
    <div className="relative" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className={`pointer-events-none absolute ${wrapPos} z-40 w-max max-w-[200px]`}>
          <div className="relative px-3 py-2 rounded-lg bg-white text-gray-900 text-[11px] font-medium leading-snug shadow-lg border border-gray-200">
            {arrowEl}
            {clickable && <span className="text-[#15A4AE] font-bold mr-1">●</span>}{label}
          </div>
        </div>
      )}
      {clickable && show && <span className="pointer-events-none absolute -inset-0.5 rounded-lg border border-[#15A4AE]/50" />}
    </div>
  )
}

/* ─── Priority dot ──────────────────────────────────────────────────────── */
function PriorityDot({ p }: { p: string }) {
  const cls = p === 'high' ? 'bg-green-500' : p === 'medium' ? 'bg-yellow-400' : 'bg-gray-300'
  if (p === 'high') return (
    <span className="relative flex h-2 w-2 shrink-0 mt-[4px]">
      <span className={`animate-ping absolute inset-0 rounded-full ${cls} opacity-60`} />
      <span className={`relative rounded-full h-2 w-2 ${cls}`} />
    </span>
  )
  return <span className={`w-2 h-2 rounded-full shrink-0 mt-[4px] ${cls}`} />
}

/* ─── Email data ────────────────────────────────────────────────────────── */
const EMAILS = [
  { id: 1, from: 'David Henderson', company: 'Henderson & Co',  subject: 'RE: Pricing enquiry',             preview: 'Thanks for the quick reply — we want to upgrade to the Pro plan with 3 licences…', time: '2m',  priority: 'high',   unread: true,  tag: 'Deal' },
  { id: 2, from: 'Priya Sharma',    company: 'Logistics Co',    subject: 'WhatsApp integration help',        preview: 'Hi, we\'re trying to set up the WhatsApp channel but keep getting error 403…',   time: '18m', priority: 'medium', unread: true,  tag: 'Support' },
  { id: 3, from: 'mark@brandco.com',company: 'BrandCo',         subject: 'Can I white-label the widget?',   preview: 'We\'re an agency and want to resell your product under our brand name…',            time: '45m', priority: 'medium', unread: false, tag: 'Sales' },
  { id: 4, from: 'Carlos Rivera',   company: 'Fintech.io',      subject: 'Intro: partnership opportunity',  preview: 'Hi there, I run partnerships at Fintech.io and we\'d love to explore a co-sell…',   time: '1h',  priority: 'high',   unread: true,  tag: 'Deal' },
  { id: 5, from: 'Aiko Tanaka',     company: 'TanakaCorp',      subject: 'Invoice #2041 — question',        preview: 'Could you clarify the charge on line 3? The amount looks different from last month…', time: '2h',  priority: 'low',    unread: false, tag: 'Billing' },
  { id: 6, from: 'Oliver Park',     company: 'Parkside Media',  subject: 'Feature request: CSV export',     preview: 'We export our data weekly and it would really help if we could schedule…',          time: '3h',  priority: 'low',    unread: false, tag: 'Feedback' },
]

const AI_DRAFT = `Hi David,

Thanks for getting back to us so quickly — happy to help upgrade your account to the Pro plan.

I'll set up 3 licences now and send over the updated invoice within the next hour. If you'd like to jump on a quick call to walk through the new features, I'm available this afternoon.

Best,
James`

/* ─── Email Preview ─────────────────────────────────────────────────────── */
function EmailPreview({ onClick }: { onClick: () => void }) {
  const [selected,   setSelected]   = useState(1)
  const [filter,     setFilter]     = useState('all')
  const [draftShown, setDraftShown] = useState(false)
  const [replyText,  setReplyText]  = useState('')

  function stop(e: React.MouseEvent) { e.stopPropagation() }

  const FILTERS = ['All', 'Unread', 'High Priority', 'Assigned to me']

  const displayed = EMAILS.filter(e => {
    if (filter === 'unread')        return e.unread
    if (filter === 'high priority') return e.priority === 'high'
    return true
  })

  const active = EMAILS.find(e => e.id === selected) ?? EMAILS[0]

  const TAG_COLORS: Record<string, string> = {
    Deal: 'bg-blue-50 text-blue-600', Support: 'bg-amber-50 text-amber-600',
    Sales: 'bg-purple-50 text-purple-600', Billing: 'bg-red-50 text-red-600',
    Feedback: 'bg-green-50 text-green-600',
  }

  return (
    <div className="group relative" role="button" aria-label="Open demo">
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      <div className="relative rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-2xl">

        {/* macOS chrome */}
        <div className="flex items-center justify-between px-5 py-3 bg-gray-100 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex items-center gap-2 px-4 py-1 rounded-md bg-white border border-gray-200">
            <span className="text-xs text-gray-400">app.appalix.ai/emails</span>
          </div>
          <div className="w-16" />
        </div>

        {/* App layout */}
        <div className="flex" style={{ height: 640 }}>

          {/* Sidebar */}
          <div className="w-44 shrink-0 bg-white border-r border-gray-100 flex flex-col py-3" onClick={stop}>
            <div className="px-3 mb-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-5 rounded-md bg-[#15A4AE]/15 flex items-center justify-center">
                  <span className="text-[#15A4AE] text-[9px] font-bold">A</span>
                </div>
                <span className="text-[11px] font-bold text-gray-900">Appalix</span>
              </div>
            </div>
            {[
              { icon: '⊞', label: 'Overview',      active: false },
              { icon: '✉', label: 'Emails',         active: true  },
              { icon: '💬', label: 'Conversations', active: false },
              { icon: '📋', label: 'Forms',         active: false },
              { icon: '🎫', label: 'Tickets',       active: false },
            ].map(item => (
              <div key={item.label} className={`flex items-center gap-2 px-3 py-1.5 text-[11px] ${item.active ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-500'}`}>
                <span className="text-[11px]">{item.icon}</span>{item.label}
              </div>
            ))}
            <div className="mt-4 px-3">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Labels</p>
              {['Deal', 'Support', 'Sales', 'Billing'].map(l => (
                <div key={l} className="flex items-center gap-1.5 px-1 py-1 text-[10px] text-gray-500">
                  <span className={`w-2 h-2 rounded-full ${TAG_COLORS[l]?.split(' ')[0]}`} />{l}
                </div>
              ))}
            </div>
          </div>

          {/* Email list */}
          <div className="w-64 shrink-0 border-r border-gray-100 flex flex-col" onClick={stop}>
            {/* Toolbar */}
            <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between">
              <Tip label="Compose a new email — Sage can pre-draft it for you" dir="bottom" clickable>
                <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 text-white text-[10px] font-medium">
                  ✏ Compose
                </button>
              </Tip>
              <Tip label="Search emails by sender, subject, or keyword" dir="bottom">
                <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-[11px] cursor-default">🔍</div>
              </Tip>
            </div>
            {/* Filters */}
            <div className="flex gap-1 px-3 py-2 border-b border-gray-100 flex-wrap">
              {FILTERS.map(f => (
                <Tip key={f} label={`Filter: ${f}`} dir="bottom" clickable>
                  <button
                    onClick={(e) => { stop(e); setFilter(f.toLowerCase()) }}
                    className={`px-2 py-0.5 rounded-full text-[9px] font-medium transition-colors ${filter === f.toLowerCase() ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >{f}</button>
                </Tip>
              ))}
            </div>
            {/* Email rows */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {displayed.map(email => (
                <Tip key={email.id} label="Click to open thread — AI scores urgency and pre-drafts your reply" dir="right" clickable>
                  <div
                    onClick={(e) => { stop(e); setSelected(email.id); setDraftShown(false); setReplyText('') }}
                    className={`px-3 py-2.5 cursor-pointer transition-colors ${selected === email.id ? 'bg-blue-50 border-l-2 border-blue-500' : 'hover:bg-gray-50 border-l-2 border-transparent'}`}
                  >
                    <div className="flex items-start gap-2 mb-1">
                      <PriorityDot p={email.priority} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-[10px] truncate ${email.unread ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>{email.from}</p>
                          <span className="text-[8px] text-gray-400 shrink-0 ml-1">{email.time}</span>
                        </div>
                        <p className={`text-[10px] truncate mt-0.5 ${email.unread ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>{email.subject}</p>
                        <p className="text-[9px] text-gray-500 truncate mt-0.5">{email.preview}</p>
                      </div>
                    </div>
                    <div className="pl-4">
                      <span className={`text-[8px] font-medium px-1.5 py-0.5 rounded-full ${TAG_COLORS[email.tag] ?? 'bg-gray-100 text-gray-500'}`}>{email.tag}</span>
                    </div>
                  </div>
                </Tip>
              ))}
            </div>
          </div>

          {/* Email thread + reply */}
          <div className="flex-1 flex flex-col bg-gray-50" onClick={stop}>
            {/* Thread header */}
            <div className="px-5 py-3 bg-white border-b border-gray-100 flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">{active.subject}</h3>
                <p className="text-[10px] text-gray-600 mt-0.5">From: <span className="font-medium">{active.from}</span> · {active.company}</p>
              </div>
              <div className="flex items-center gap-2">
                <Tip label="Assign this email to a team member" dir="bottom" clickable>
                  <button className="px-2.5 py-1 rounded-lg border border-gray-200 text-[9px] text-gray-500 bg-white hover:border-gray-300 transition-colors">Assign</button>
                </Tip>
                <Tip label="Create a CRM deal directly from this email" dir="bottom" clickable>
                  <button className="px-2.5 py-1 rounded-lg border border-blue-200 text-[9px] text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors font-medium">+ Deal</button>
                </Tip>
              </div>
            </div>

            {/* Thread body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Customer message */}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600 shrink-0">{active.from[0]}</div>
                <div className="flex-1 bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] font-semibold text-gray-900">{active.from} <span className="text-gray-400 font-normal">· {active.company}</span></p>
                    <span className="text-[9px] text-gray-400">{active.time} ago</span>
                  </div>
                  <p className="text-[11px] text-gray-700 leading-relaxed">{active.preview}</p>
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <Tip label="AI analysis of this email — sentiment, intent, and suggested next action" dir="top">
                      <div className="flex items-center gap-2 cursor-default">
                        <span className="text-[9px] font-semibold text-blue-600">⚡ AI Summary:</span>
                        <span className="text-[9px] text-gray-600">High-intent · upgrade request · respond within 2h</span>
                      </div>
                    </Tip>
                  </div>
                </div>
              </div>

              {/* AI draft badge */}
              <Tip label="Click to load AI-drafted reply — edited and ready to send in seconds" dir="top" clickable>
                <button
                  onClick={(e) => { stop(e); setDraftShown(true); setReplyText(AI_DRAFT) }}
                  className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-colors ${draftShown ? 'border-blue-200 bg-blue-50' : 'border-dashed border-blue-300 bg-white hover:bg-blue-50'}`}
                >
                  <span className="text-[#15A4AE] text-sm">✦</span>
                  <div className="text-left">
                    <p className="text-[10px] font-semibold text-blue-700">{draftShown ? '✓ AI draft loaded' : 'Use AI Draft Reply'}</p>
                    <p className="text-[9px] text-gray-500">{draftShown ? 'Edit below and send when ready' : 'Sage drafts a personalised reply in under 2 seconds'}</p>
                  </div>
                  {!draftShown && <span className="ml-auto text-[9px] text-blue-500 font-medium">Generate →</span>}
                </button>
              </Tip>
            </div>

            {/* Reply box */}
            <div className="px-5 py-3 bg-white border-t border-gray-100" onClick={stop}>
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                  <span className="text-[9px] text-gray-500">Reply to: <span className="font-medium text-gray-700">{active.from}</span></span>
                  <span className="ml-auto flex items-center gap-1 text-[9px] text-gray-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    AI assist on
                  </span>
                </div>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onClick={stop}
                  placeholder="Write a reply… or click 'Use AI Draft' above"
                  rows={4}
                  className="w-full px-3 py-2 text-[11px] text-gray-800 placeholder-gray-400 resize-none focus:outline-none bg-white"
                />
                <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tip label="Attach files from your computer or cloud storage" dir="top" clickable>
                      <button className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors">📎 Attach</button>
                    </Tip>
                  </div>
                  <Tip label="Send reply and auto-log to your CRM" dir="top" clickable>
                    <button className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[10px] font-medium hover:bg-blue-700 transition-colors">Send →</button>
                  </Tip>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* See it live */}
      <button
        onClick={onClick}
        className="absolute bottom-5 right-5 flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        See it live
      </button>
    </div>
  )
}

/* ─── Demo Modal ────────────────────────────────────────────────────────── */
function DemoModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-lg bg-[#222] border border-white/10 rounded-2xl p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors flex items-center justify-center text-sm">✕</button>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-600/40 bg-blue-600/10 text-blue-400 text-xs font-medium mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          Live demo · No credit card needed
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">See Email AI in action</h2>
        <p className="text-sm text-gray-400 leading-relaxed mb-7">
          Watch Sage score, prioritise, and draft replies to your real inbox — or start your free trial and connect your email in 60 seconds.
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
          {['No credit card', 'Cancel anytime', '7-day free trial'].map(t => (
            <span key={t} className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <svg className="w-3 h-3 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Features ──────────────────────────────────────────────────────────── */
const FEATURES = [
  { icon: '✦', tag: 'AI Drafts', title: 'Replies written before you open the email', desc: 'Sage reads the thread, scores urgency, and drafts a personalised reply. You review, tweak, and send in seconds — not minutes.' },
  { icon: '🎯', tag: 'Priority Scoring', title: 'Never miss a hot lead in your inbox', desc: 'Every email gets an AI priority score. High-intent messages bubble to the top automatically — no manual sorting needed.' },
  { icon: '👥', tag: 'Team Inbox', title: 'One inbox for your whole team', desc: 'Assign threads, leave internal notes, and see who\'s handling what — all without leaving the email view.' },
  { icon: '🔗', tag: 'CRM Sync', title: 'Every email auto-logged to your CRM', desc: 'Conversations, contacts, and deals created automatically from email threads. HubSpot, Salesforce, and 30+ integrations.' },
]

/* ─── Page ──────────────────────────────────────────────────────────────── */
export default function EmailPage() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="bg-[#1c1c1c] min-h-screen text-white">

      {/* Hero */}
      <section className="relative pt-36 pb-20 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="relative max-w-4xl mx-auto text-center">
          <FadeUp delay={0}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-600/40 bg-blue-600/10 text-blue-400 text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              AI-powered email management
            </div>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-snug mb-6">
              Inbox zero, every day —<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">
                without the effort
              </span>
            </h1>
          </FadeUp>
          <FadeUp delay={0.2}>
            <p className="text-base sm:text-xl text-gray-400 leading-relaxed max-w-2xl mx-auto mb-10">
              Sage reads every incoming email, scores urgency, and drafts the perfect reply — so your team responds faster and misses nothing.
            </p>
          </FadeUp>
          <FadeUp delay={0.3}>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/login" className="px-7 py-3.5 bg-[#1a8c76] hover:bg-[#14705d] text-white font-medium rounded-xl transition-colors text-sm">
                Start a 7 Day Free Trial
              </Link>
              <button onClick={() => setModalOpen(true)} className="px-7 py-3.5 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white font-medium rounded-xl transition-colors text-sm">
                See it in action →
              </button>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* Preview */}
      <section className="pb-24 px-6">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal>
            <EmailPreview onClick={() => setModalOpen(true)} />
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <p className="text-center text-xs text-gray-600 mt-4">Click any email to see AI scoring and one-click draft reply</p>
          </ScrollReveal>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal className="text-center mb-14">
            <p className="text-xs text-blue-400 uppercase tracking-widest font-semibold mb-3">Email Intelligence</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Your inbox, handled by AI</h2>
            <p className="text-gray-400 max-w-xl mx-auto text-sm leading-relaxed">From triage to reply, Sage handles the email workflow so your team focuses on closing deals.</p>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f, i) => (
              <ScrollReveal key={f.tag} delay={i * 0.05}>
                <div className="bg-white/3 border border-white/8 rounded-2xl p-6 hover:border-blue-600/30 hover:bg-blue-600/5 transition-all duration-300">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-600/10 border border-blue-600/20 text-blue-400 text-[10px] font-semibold mb-4">{f.tag}</div>
                  <p className="text-xl mb-1">{f.icon}</p>
                  <h3 className="text-base font-bold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 border-t border-white/5 text-center">
        <ScrollReveal>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to clear your inbox?</h2>
          <p className="text-gray-400 mb-8 text-sm max-w-md mx-auto">Connect your email in 60 seconds. No credit card required.</p>
          <Link href="/login" className="inline-block px-8 py-4 bg-[#1a8c76] hover:bg-[#14705d] text-white font-medium rounded-xl transition-colors text-sm">
            Start free trial →
          </Link>
        </ScrollReveal>
      </section>

      {modalOpen && <DemoModal onClose={() => setModalOpen(false)} />}
    </div>
  )
}
