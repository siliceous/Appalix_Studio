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

/* ─── Ticket data ───────────────────────────────────────────────────────── */
type Ticket = {
  id: string; subject: string; from: string; company: string; channel: string
  status: 'open' | 'in_progress' | 'resolved'; priority: 'high' | 'medium' | 'low'
  sla: string; slaRed: boolean; assignee: string; time: string
  messages: { role: 'user' | 'agent' | 'bot'; text: string; time: string }[]
}

const TICKETS: Ticket[] = [
  {
    id: '#2041', subject: 'Widget not loading on mobile Safari', from: 'James Owens', company: 'OwensCo', channel: '🌐 Web',
    status: 'open', priority: 'high', sla: '1h 20m left', slaRed: true, assignee: 'Amy C.', time: '23m',
    messages: [
      { role: 'user',  text: 'Hi, the chat widget stopped loading on our website when viewed on mobile Safari. It works fine on Chrome and desktop.', time: '23m' },
      { role: 'bot',   text: 'Thanks for reaching out! I\'ve created ticket #2041. Our team will respond within 2 hours. In the meantime, can you tell me your Safari version?', time: '23m' },
      { role: 'user',  text: 'Safari 17, iOS 17.2', time: '20m' },
      { role: 'agent', text: 'Hi James, thanks for the details. This is a known issue with Safari 17 and a CSP header. I\'ll send you the fix now.', time: '5m' },
    ],
  },
  {
    id: '#2039', subject: 'Telegram bot not responding after update', from: 'Aiko Tanaka', company: 'TanakaCorp', channel: '✈️ Telegram',
    status: 'in_progress', priority: 'medium', sla: '3h 45m left', slaRed: false, assignee: 'Tom R.', time: '1h',
    messages: [
      { role: 'user',  text: 'Our Telegram bot stopped responding after we updated the API token yesterday. Old conversations still show but new messages aren\'t getting replies.', time: '1h' },
      { role: 'bot',   text: 'Ticket #2039 created. Your account manager Tom R. will be in touch shortly.', time: '1h' },
      { role: 'agent', text: 'Hi Aiko — looks like the webhook URL needs to be re-registered. I\'m doing that now on our end.', time: '45m' },
    ],
  },
  {
    id: '#2037', subject: 'Export to CSV not working', from: 'Peter Voss', company: 'VossMedia', channel: '✉ Email',
    status: 'in_progress', priority: 'low', sla: '8h 10m left', slaRed: false, assignee: 'Amy C.', time: '3h',
    messages: [
      { role: 'user',  text: 'When I click Export CSV on the forms page, nothing happens. No download, no error. Tried in Firefox and Chrome.', time: '3h' },
      { role: 'agent', text: 'Hi Peter, can you tell me how many rows you\'re trying to export? We\'ve had a report of a timeout with 1000+ rows.', time: '2h' },
      { role: 'user',  text: 'About 450 rows. Should be fine, right?', time: '1h' },
    ],
  },
  {
    id: '#2035', subject: 'HubSpot sync stopped creating deals', from: 'Carlos Rivera', company: 'Fintech.io', channel: '🌐 Web',
    status: 'resolved', priority: 'high', sla: 'Resolved', slaRed: false, assignee: 'Tom R.', time: '1d',
    messages: [
      { role: 'user',  text: 'HubSpot deals stopped being created automatically yesterday. Contacts still sync fine, but no deals.', time: '1d' },
      { role: 'agent', text: 'This was caused by a HubSpot API scope change. I\'ve reconnected the integration and back-filled the missing deals. All good now!', time: '22h' },
    ],
  },
  {
    id: '#2033', subject: 'WhatsApp template message rejected', from: 'Priya Sharma', company: 'LogisticsCo', channel: '💬 WhatsApp',
    status: 'resolved', priority: 'medium', sla: 'Resolved', slaRed: false, assignee: 'Amy C.', time: '2d',
    messages: [
      { role: 'user',  text: 'Meta rejected our WhatsApp template message. The error says "promotional content not allowed".' , time: '2d' },
      { role: 'agent', text: 'Meta has strict rules on template messages — I\'ve rewritten it to be transactional rather than promotional. Resubmitted. Approval usually takes 24h.', time: '1d 22h' },
    ],
  },
]

const STATUS_MAP = {
  open:        { label: 'Open',        cls: 'bg-amber-100 text-amber-700' },
  in_progress: { label: 'In Progress', cls: 'bg-blue-100 text-blue-700'   },
  resolved:    { label: 'Resolved',    cls: 'bg-green-100 text-green-700'  },
}
const PRIORITY_CLS = { high: 'bg-red-500', medium: 'bg-yellow-400', low: 'bg-gray-300' }

const AI_REPLIES: Record<string, string> = {
  '#2041': `Hi James,

Thanks for the Safari version info. The fix for this is to add the following to your Content Security Policy header:

  Content-Security-Policy: frame-ancestors 'self' https://cdn.appalix.ai

This allows the widget to load in Safari's strict mode. Let me know if you need help adding this to your hosting config and I'll walk you through it.

Best, Amy`,
  '#2039': `Hi Aiko,

The webhook has been re-registered and your bot should be responding again. To confirm: go to Telegram → send /start to your bot — you should get an instant reply.

If you update the API token again in future, re-register the webhook in Settings → Integrations → Telegram → Re-register Webhook.

Best, Tom`,
  '#2037': `Hi Peter,

The export issue at 450 rows is a bug we shipped yesterday — our deepest apologies. We've just deployed a fix. Please try the export again and it should work immediately.

As a thank you, we've added 1 month free to your subscription.

Best, Amy`,
}

/* ─── Tickets Preview ───────────────────────────────────────────────────── */
function TicketsPreview({ onClick }: { onClick: () => void }) {
  const [selectedId,  setSelectedId]  = useState('#2041')
  const [draftShown,  setDraftShown]  = useState(false)
  const [replyText,   setReplyText]   = useState('')
  const [filterStatus, setFilter]     = useState<string>('all')

  function stop(e: React.MouseEvent) { e.stopPropagation() }

  const displayed = TICKETS.filter(t => filterStatus === 'all' || t.status === filterStatus)
  const ticket    = TICKETS.find(t => t.id === selectedId) ?? TICKETS[0]

  return (
    <div className="group relative" role="button" aria-label="Open demo">
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-amber-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      <div className="relative rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-2xl">

        {/* macOS chrome */}
        <div className="flex items-center justify-between px-5 py-3 bg-gray-100 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex items-center gap-2 px-4 py-1 rounded-md bg-white border border-gray-200">
            <span className="text-xs text-gray-400">app.appalix.ai/tickets</span>
          </div>
          <div className="w-16" />
        </div>

        <div className="flex" style={{ height: 640 }}>

          {/* Sidebar */}
          <div className="w-44 shrink-0 bg-white border-r border-gray-100 flex flex-col py-3" onClick={stop}>
            <div className="px-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-[#15A4AE]/15 flex items-center justify-center">
                  <span className="text-[#15A4AE] text-[9px] font-bold">A</span>
                </div>
                <span className="text-[11px] font-bold text-gray-900">Appalix</span>
              </div>
            </div>
            {[
              { icon: '⊞', label: 'Overview',      active: false },
              { icon: '✉', label: 'Emails',         active: false },
              { icon: '💬', label: 'Conversations', active: false },
              { icon: '📋', label: 'Forms',         active: false },
              { icon: '🎫', label: 'Tickets',       active: true  },
            ].map(item => (
              <div key={item.label} className={`flex items-center gap-2 px-3 py-1.5 text-[11px] ${item.active ? 'bg-amber-50 text-amber-600 font-semibold' : 'text-gray-500'}`}>
                <span>{item.icon}</span>{item.label}
              </div>
            ))}
          </div>

          {/* Ticket list */}
          <div className="w-64 shrink-0 border-r border-gray-100 flex flex-col" onClick={stop}>
            {/* Filter bar */}
            <div className="px-3 py-2 border-b border-gray-100 bg-white flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-900">Tickets</p>
              <Tip label="Filter by status" dir="bottom" clickable>
                <select
                  value={filterStatus}
                  onChange={e => { stop(e as unknown as React.MouseEvent); setFilter(e.target.value) }}
                  onClick={stop}
                  className="text-[9px] border border-gray-200 rounded-lg px-1.5 py-1 text-gray-600 bg-white focus:outline-none"
                >
                  <option value="all">All</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </Tip>
            </div>

            {/* Ticket rows */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {displayed.map(t => (
                <Tip key={t.id} label="Click to open ticket — AI drafts the perfect reply" dir="right" clickable>
                  <div
                    onClick={(e) => { stop(e); setSelectedId(t.id); setDraftShown(false); setReplyText('') }}
                    className={`px-3 py-2.5 cursor-pointer transition-colors ${selectedId === t.id ? 'bg-amber-50 border-l-2 border-amber-500' : 'hover:bg-gray-50 border-l-2 border-transparent'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-bold text-gray-400">{t.id}</span>
                      <span className={`text-[8px] font-medium px-1.5 py-0.5 rounded-full ${STATUS_MAP[t.status].cls}`}>{STATUS_MAP[t.status].label}</span>
                    </div>
                    <p className="text-[10px] font-semibold text-gray-900 truncate mb-1">{t.subject}</p>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_CLS[t.priority]}`} />
                      <p className="text-[9px] text-gray-600 truncate">{t.from} · {t.channel}</p>
                    </div>
                    {t.status !== 'resolved' && (
                      <p className={`text-[9px] mt-1 font-medium ${t.slaRed ? 'text-red-500' : 'text-gray-400'}`}>⏱ {t.sla}</p>
                    )}
                  </div>
                </Tip>
              ))}
            </div>
          </div>

          {/* Ticket detail */}
          <div className="flex-1 flex flex-col bg-gray-50" onClick={stop}>
            {/* Header */}
            <div className="px-4 py-3 bg-white border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-amber-600">{ticket.id}</span>
                    <span className={`text-[8px] font-medium px-1.5 py-0.5 rounded-full ${STATUS_MAP[ticket.status].cls}`}>{STATUS_MAP[ticket.status].label}</span>
                    <span className={`w-2 h-2 rounded-full ${PRIORITY_CLS[ticket.priority]}`} />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">{ticket.subject}</h3>
                  <p className="text-[10px] text-gray-500 mt-0.5">{ticket.from} · {ticket.company} · {ticket.channel}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Tip label="Reassign to another team member" dir="bottom" clickable>
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 text-[9px] text-gray-600 bg-white cursor-default">
                      👤 {ticket.assignee}
                    </div>
                  </Tip>
                  {ticket.status !== 'resolved' && (
                    <Tip label="Mark this ticket as resolved" dir="bottom" clickable>
                      <button className="px-2.5 py-1 rounded-lg bg-green-600 text-white text-[9px] font-medium hover:bg-green-700 transition-colors">✓ Resolve</button>
                    </Tip>
                  )}
                </div>
              </div>
              {ticket.status !== 'resolved' && (
                <div className={`mt-2 flex items-center gap-2 px-2.5 py-1 rounded-lg border ${ticket.slaRed ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-gray-50'} w-fit`}>
                  <span className={`text-[9px] font-medium ${ticket.slaRed ? 'text-red-600' : 'text-gray-600'}`}>⏱ SLA: {ticket.sla}</span>
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {ticket.messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[78%] px-3 py-2 rounded-xl text-[11px] leading-relaxed ${
                    msg.role === 'user'  ? 'bg-white border border-gray-200 shadow-sm text-gray-800' :
                    msg.role === 'bot'   ? 'bg-amber-50 border border-amber-100 text-amber-800' :
                                          'bg-[#2a7d6e] text-white'
                  }`}>
                    {msg.role === 'bot' && <p className="text-[8px] font-bold text-amber-600 mb-1">🤖 Sage Bot</p>}
                    {msg.role === 'agent' && <p className="text-[8px] font-bold text-white/70 mb-1">👤 {ticket.assignee}</p>}
                    {msg.text}
                    <p className={`text-[8px] mt-1 ${msg.role === 'agent' ? 'text-white/50' : 'text-gray-400'}`}>{msg.time} ago</p>
                  </div>
                </div>
              ))}

              {/* AI draft CTA */}
              {ticket.status !== 'resolved' && (
                <Tip label="Click to load an AI-drafted reply based on the full conversation thread" dir="top" clickable>
                  <button
                    onClick={(e) => { stop(e); setDraftShown(true); setReplyText(AI_REPLIES[ticket.id] ?? '') }}
                    className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-colors ${draftShown ? 'border-amber-200 bg-amber-50' : 'border-dashed border-amber-300 bg-white hover:bg-amber-50'}`}
                  >
                    <span className="text-amber-500 text-sm">✦</span>
                    <div className="text-left">
                      <p className="text-[10px] font-semibold text-amber-700">{draftShown ? '✓ AI draft loaded' : 'Generate AI Reply'}</p>
                      <p className="text-[9px] text-gray-500">{draftShown ? 'Edit below and send' : 'Sage reads the full thread and drafts the perfect response'}</p>
                    </div>
                    {!draftShown && <span className="ml-auto text-[9px] text-amber-500 font-medium">Draft →</span>}
                  </button>
                </Tip>
              )}
            </div>

            {/* Reply box */}
            {ticket.status !== 'resolved' && (
              <div className="px-4 py-3 bg-white border-t border-gray-100" onClick={stop}>
                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-[9px] text-gray-500">Reply to: <span className="font-medium text-gray-700">{ticket.from}</span></span>
                    <span className="flex items-center gap-1 text-[9px] text-gray-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />AI assist on
                    </span>
                  </div>
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onClick={stop}
                    placeholder="Write a reply… or click 'Generate AI Reply' above"
                    rows={3}
                    className="w-full px-3 py-2 text-[11px] text-gray-800 placeholder-gray-400 resize-none focus:outline-none bg-white"
                  />
                  <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[9px] text-gray-400">Sending as <span className="font-medium text-gray-600">{ticket.assignee}</span></span>
                    <Tip label="Send reply and update ticket status automatically" dir="top" clickable>
                      <button className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-[10px] font-medium hover:bg-amber-600 transition-colors">Send Reply →</button>
                    </Tip>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={onClick}
        className="absolute bottom-5 right-5 flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-600/40 bg-amber-600/10 text-amber-400 text-xs font-medium mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          Live demo · No credit card needed
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">See Ticket AI in action</h2>
        <p className="text-sm text-gray-400 leading-relaxed mb-7">
          Watch Sage auto-create tickets from any channel, draft expert replies, and resolve issues faster than any manual process.
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
              <svg className="w-3 h-3 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
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
  { icon: '⚡', tag: 'Auto-Creation', title: 'Tickets created from every channel', desc: 'Email, bot chat, WhatsApp, and forms — every support query becomes a tracked ticket automatically, with no manual effort.' },
  { icon: '✦', tag: 'AI Replies', title: 'Expert answers in one click', desc: 'Sage reads the full thread and drafts a technically accurate reply. Your agent reviews, personalises, and sends in seconds.' },
  { icon: '⏱', tag: 'SLA Tracking', title: 'Never miss a response deadline', desc: 'SLA timers on every ticket. Red alerts before breach. Escalation rules that fire automatically based on priority and wait time.' },
  { icon: '🎯', tag: 'Smart Routing', title: 'Right ticket, right person', desc: 'AI reads the issue and routes to the correct team or agent — billing, technical, or onboarding — based on content, not just tags.' },
]

/* ─── Page ──────────────────────────────────────────────────────────────── */
export default function TicketsPage() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="bg-[#1c1c1c] min-h-screen text-white">

      <section className="relative pt-36 pb-20 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-amber-600/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="relative max-w-4xl mx-auto text-center">
          <FadeUp delay={0}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-600/40 bg-amber-600/10 text-amber-400 text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              AI-powered support ticketing
            </div>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-snug mb-6">
              Resolve every ticket faster<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">
                with AI on your side
              </span>
            </h1>
          </FadeUp>
          <FadeUp delay={0.2}>
            <p className="text-base sm:text-xl text-gray-400 leading-relaxed max-w-2xl mx-auto mb-10">
              Sage creates tickets from every channel, drafts expert replies from your knowledge base, and tracks SLAs — so your team resolves issues before customers notice a delay.
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

      <section className="pb-24 px-6">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal>
            <TicketsPreview onClick={() => setModalOpen(true)} />
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <p className="text-center text-xs text-gray-600 mt-4">Click any ticket to see the thread — click &apos;Generate AI Reply&apos; to see Sage in action</p>
          </ScrollReveal>
        </div>
      </section>

      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal className="text-center mb-14">
            <p className="text-xs text-amber-400 uppercase tracking-widest font-semibold mb-3">Ticket Intelligence</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Support that scales without headcount</h2>
            <p className="text-gray-400 max-w-xl mx-auto text-sm leading-relaxed">Automate the repetitive parts of support — creation, routing, and first drafts — so your team focuses on the hard problems.</p>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f, i) => (
              <ScrollReveal key={f.tag} delay={i * 0.05}>
                <div className="bg-white/3 border border-white/8 rounded-2xl p-6 hover:border-amber-600/30 hover:bg-amber-600/5 transition-all duration-300">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-600/10 border border-amber-600/20 text-amber-400 text-[10px] font-semibold mb-4">{f.tag}</div>
                  <p className="text-xl mb-1">{f.icon}</p>
                  <h3 className="text-base font-bold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6 border-t border-white/5 text-center">
        <ScrollReveal>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to transform your support?</h2>
          <p className="text-gray-400 mb-8 text-sm max-w-md mx-auto">Start free. No credit card. Tickets flowing in minutes.</p>
          <Link href="/login" className="inline-block px-8 py-4 bg-[#1a8c76] hover:bg-[#14705d] text-white font-medium rounded-xl transition-colors text-sm">
            Start free trial →
          </Link>
        </ScrollReveal>
      </section>

      {modalOpen && <DemoModal onClose={() => setModalOpen(false)} />}
    </div>
  )
}
