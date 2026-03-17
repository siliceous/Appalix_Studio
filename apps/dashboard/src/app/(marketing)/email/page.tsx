'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FadeUp, ScrollReveal } from '@/components/marketing/animate'

/* ─── Tooltip ───────────────────────────────────────────────────────────── */
function Tip({ label, children, dir = 'top', clickable = false }: {
  label: string; children: React.ReactNode; dir?: 'top' | 'bottom' | 'right' | 'left'; clickable?: boolean
}) {
  const [show, setShow] = useState(false)
  const wrapPos =
    dir === 'bottom' ? 'top-full left-1/2 -translate-x-1/2 mt-[9px]'
    : dir === 'right' ? 'left-full top-1/2 -translate-y-1/2 ml-[9px]'
    : dir === 'left'  ? 'right-full top-1/2 -translate-y-1/2 mr-[9px]'
    : 'bottom-full left-1/2 -translate-x-1/2 mb-[9px]'
  const arrowEl =
    dir === 'bottom' ? <span className="absolute -top-[5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border-l border-t border-gray-200 rotate-45" />
    : dir === 'right' ? <span className="absolute -left-[5px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white border-l border-b border-gray-200 rotate-45" />
    : dir === 'left'  ? <span className="absolute -right-[5px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white border-r border-t border-gray-200 rotate-45" />
    : <span className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border-r border-b border-gray-200 rotate-45" />
  return (
    <div className="relative" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className={`pointer-events-none absolute ${wrapPos} z-50 w-max max-w-[200px]`}>
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

/* ─── Data ──────────────────────────────────────────────────────────────── */
type Priority = 'high' | 'medium' | 'low'

type DemoEmail = {
  id: string
  from_name: string
  from_address: string
  subject: string
  received_at: string
  priority: Priority
  category: string
  ai_summary: string
  ai_insights: string[]
  body_text: string
  entities: {
    name?: string; company?: string; phone?: string; website?: string
    product_interest?: string; intent_signals?: string[]; urgency_signals?: string[]
  }
  recommendation: 'create_lead' | 'create_ticket' | 'ignore'
}

const EMAILS: DemoEmail[] = [
  {
    id: 'e1',
    from_name: 'Marcus Webb',
    from_address: 'marcus@growthco.io',
    subject: 'Interested in your AI chat solution',
    received_at: '2026-03-17T09:14:00Z',
    priority: 'high',
    category: 'Sales',
    ai_summary: 'Marcus is evaluating AI chat tools for a 120-person sales team. Ready to start a trial this week and has budget approved.',
    ai_insights: [
      'Decision maker — VP of Sales at GrowthCo',
      'Budget approved for Q1 purchase',
      'Wants a 30-min demo call ASAP',
    ],
    body_text: "Hi, I came across Appalix and I'm very interested in the AI agent for our sales team. We have about 120 reps. Is it possible to schedule a demo this week? Budget is approved.",
    entities: {
      name: 'Marcus Webb', company: 'GrowthCo', phone: '+1 415 555 0198',
      website: 'growthco.io', product_interest: 'AI Agent',
      intent_signals: ['Ready to buy', 'Demo request'],
      urgency_signals: ['This week', 'Q1 deadline'],
    },
    recommendation: 'create_lead',
  },
  {
    id: 'e2',
    from_name: 'Priya Nair',
    from_address: 'priya@techflow.dev',
    subject: 'Re: Onboarding — API key not working',
    received_at: '2026-03-17T08:45:00Z',
    priority: 'high',
    category: 'Support',
    ai_summary: 'Customer cannot authenticate via API. Getting 401 on all POST requests. They are blocked on their launch.',
    ai_insights: [
      'API key was just regenerated — old key still being used',
      'Launch is tomorrow — urgent to resolve',
    ],
    body_text: "Hi, I've been trying to use the API key from my dashboard but I keep getting 401 Unauthorized. I've double-checked the header format. We're launching tomorrow so this is urgent!",
    entities: {
      name: 'Priya Nair', company: 'TechFlow',
      urgency_signals: ['Launching tomorrow', 'Urgent'],
    },
    recommendation: 'create_ticket',
  },
  {
    id: 'e3',
    from_name: 'Daniel Okoro',
    from_address: 'daniel@nexiocrm.com',
    subject: 'Partnership opportunity — CRM integration',
    received_at: '2026-03-17T07:30:00Z',
    priority: 'medium',
    category: 'Partnership',
    ai_summary: 'Daniel wants to explore a white-label or API partnership to embed Appalix chat into Nexio CRM.',
    ai_insights: [
      'They have 400+ SMB customers on their CRM',
      'Looking for a rev-share or OEM licensing deal',
    ],
    body_text: "Hello, we run a CRM product with 400 SMB clients and we'd love to embed your AI chat. Would you be open to a white-label arrangement or API licensing? Happy to jump on a call.",
    entities: {
      name: 'Daniel Okoro', company: 'Nexio CRM', website: 'nexiocrm.com',
      product_interest: 'White-label / API',
      intent_signals: ['Partnership discussion', 'Rev-share interest'],
    },
    recommendation: 'create_lead',
  },
  {
    id: 'e4',
    from_name: 'Sophie Chen',
    from_address: 'sophie@bluewave.co',
    subject: 'Invoice INV-0831 — payment confirmation',
    received_at: '2026-03-16T15:20:00Z',
    priority: 'low',
    category: 'Invoice',
    ai_summary: 'Customer is confirming payment for INV-0831 ($299). No action required.',
    ai_insights: ['Payment confirmed via bank transfer', 'No further action needed'],
    body_text: "Hi, just wanted to confirm that payment for INV-0831 was sent via bank transfer yesterday. Please let me know when you receive it. Thanks!",
    entities: { name: 'Sophie Chen', company: 'BlueWave' },
    recommendation: 'ignore',
  },
  {
    id: 'e5',
    from_name: 'Ravi Sharma',
    from_address: 'ravi@scalex.io',
    subject: 'Trial feedback — really impressed',
    received_at: '2026-03-16T11:05:00Z',
    priority: 'medium',
    category: 'Sales',
    ai_summary: 'Ravi is on trial and loves the product. Asking about upgrading to the Pro plan.',
    ai_insights: [
      'Strong buying signal — wants to upgrade',
      'Currently on trial, 5 days remaining',
    ],
    body_text: "Hi, we've been trialing Appalix for 2 weeks now and the team loves it. Can you tell me more about the Pro plan pricing? I think we're ready to upgrade.",
    entities: {
      name: 'Ravi Sharma', company: 'ScaleX',
      product_interest: 'Pro Plan upgrade',
      intent_signals: ['Ready to upgrade', 'Trial converting'],
    },
    recommendation: 'create_lead',
  },
]

const PRIORITY_DOT: Record<Priority, string> = {
  high:   'bg-[#15A4AE]',
  medium: 'bg-amber-400',
  low:    'bg-gray-300',
}

const PRIORITY_BADGE: Record<Priority, string> = {
  high:   'bg-[#15A4AE]/10 text-[#3a9e8a] border-[#15A4AE]/30',
  medium: 'bg-amber-50 text-amber-600 border-amber-200',
  low:    'bg-gray-100 text-gray-500 border-gray-200',
}

function categoryClass(cat: string): string {
  if (cat === 'Sales')       return 'bg-teal-50 text-teal-600 border-teal-200'
  if (cat === 'Support')     return 'bg-sky-50 text-sky-600 border-sky-200'
  if (cat === 'Invoice')     return 'bg-violet-50 text-violet-600 border-violet-200'
  if (cat === 'Partnership') return 'bg-cyan-50 text-cyan-600 border-cyan-200'
  return 'bg-gray-100 text-gray-500 border-gray-200'
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date('2026-03-17T10:00:00Z')
  const diffH = (now.getTime() - d.getTime()) / 3_600_000
  if (diffH < 24) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/* ─── Demo Modal ────────────────────────────────────────────────────────── */
function DemoModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#15A4AE]/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-[#15A4AE]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Try Email Triage</h3>
        <p className="text-sm text-gray-500 mb-6">Connect your inbox and let AI prioritise every email for you — automatically.</p>
        <Link href="/login" className="block w-full py-2.5 bg-[#15A4AE] hover:bg-[#0f8a94] text-white text-sm font-semibold rounded-xl transition-colors">
          Get started free
        </Link>
        <button onClick={onClose} className="mt-3 text-xs text-gray-400 hover:text-gray-600 transition-colors">Maybe later</button>
      </div>
    </div>
  )
}

/* ─── Triage Preview ────────────────────────────────────────────────────── */
function TriagePreview({ onOpenDemo }: { onOpenDemo: () => void }) {
  const [selected, setSelected]   = useState<string>('e1')
  const [actioned, setActioned]   = useState<Record<string, string>>({})
  const [showReply, setShowReply] = useState(false)
  const [replyText, setReplyText] = useState('')

  const selectedEmail = EMAILS.find(e => e.id === selected) ?? null
  const highCount     = EMAILS.filter(e => e.priority === 'high').length
  const medCount      = EMAILS.filter(e => e.priority === 'medium').length

  function handleAction(emailId: string, label: string) {
    setActioned(prev => ({ ...prev, [emailId]: label }))
  }

  return (
    <div className="flex h-[540px] bg-[#f5f5f5] overflow-hidden rounded-b-2xl">

      {/* ── Left sidebar ── */}
      <aside className="w-[220px] shrink-0 flex flex-col border-r border-gray-200 bg-gray-50 overflow-hidden">

        {/* Header */}
        <div className="px-3 py-3 border-b border-gray-200 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <div>
                <Tip label="Email Triage — AI-sorted inbox" dir="right">
                  <p className="text-xs font-bold text-gray-900 cursor-default">Triage</p>
                </Tip>
                <p className="text-[9px] text-gray-400 truncate">you@company.com</p>
              </div>
            </div>
            <Tip label="Sync inbox to fetch latest emails" dir="bottom">
              <button className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sync
              </button>
            </Tip>
          </div>

          {/* Priority badges */}
          <div className="flex items-center gap-1 flex-wrap">
            <Tip label="High-priority emails needing immediate attention" dir="bottom">
              <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-[#15A4AE]/10 text-[#3a9e8a] font-semibold border border-[#15A4AE]/30 cursor-default">
                <span className="w-1.5 h-1.5 rounded-full bg-[#15A4AE]" />{highCount} High
              </span>
            </Tip>
            <Tip label="Medium-priority emails" dir="bottom">
              <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 font-semibold border border-amber-200 cursor-default">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />{medCount} Med
              </span>
            </Tip>
            <Tip label="Re-analyse all emails with AI" dir="bottom" clickable>
              <button className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-semibold border border-blue-200 hover:bg-blue-100 transition-colors">
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Analyse 5
              </button>
            </Tip>
          </div>
        </div>

        {/* Email list */}
        <div className="flex-1 overflow-y-auto">
          {EMAILS.map(email => {
            const isActive   = selected === email.id
            const priority   = email.priority
            const borderCls  =
              isActive
                ? priority === 'high'   ? 'border-l-[#15A4AE] bg-[#15A4AE]/8'
                  : priority === 'medium' ? 'border-l-amber-400 bg-amber-50'
                  : 'border-l-gray-400 bg-gray-100'
                : 'border-l-transparent hover:bg-white'
            return (
              <Tip key={email.id} label={`${email.priority} priority · ${email.category}`} dir="right">
                <div
                  onClick={() => { setSelected(email.id); setShowReply(false) }}
                  className={`flex items-stretch border-l-[3px] transition-colors cursor-pointer ${borderCls}`}
                >
                  <div className="flex-1 min-w-0 px-2.5 py-2">
                    <div className="flex items-start gap-1.5">
                      <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[priority]}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-[11px] font-semibold truncate ${actioned[email.id] ? 'text-gray-400' : 'text-gray-800'}`}>
                          {email.from_name}
                        </p>
                        <p className="text-[10px] text-gray-400 truncate leading-snug">{email.subject}</p>
                      </div>
                      <span className="text-[9px] text-gray-400 shrink-0 tabular-nums">{formatTime(email.received_at)}</span>
                    </div>
                  </div>
                </div>
              </Tip>
            )
          })}
        </div>
      </aside>

      {/* ── Right: Detail card ── */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {selectedEmail ? (
          <div className="flex flex-col h-full bg-white m-3 rounded-xl border border-gray-200 shadow-sm overflow-hidden">

            {/* Detail header */}
            <div className="px-5 pt-4 pb-3 shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <Tip label="Email subject line" dir="bottom">
                    <h3 className="text-sm font-bold text-gray-900 leading-snug cursor-default">{selectedEmail.subject}</h3>
                  </Tip>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-blue-600">{selectedEmail.from_name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-900">{selectedEmail.from_name}</p>
                      <p className="text-[10px] text-gray-400">{selectedEmail.from_address}</p>
                    </div>
                    <span className="text-gray-200 mx-0.5">·</span>
                    <span className="text-[10px] text-gray-400">{formatTime(selectedEmail.received_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Tip label="AI-assigned priority — click to change" dir="bottom" clickable>
                    <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border cursor-pointer ${PRIORITY_BADGE[selectedEmail.priority]}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[selectedEmail.priority]}`} />
                      {selectedEmail.priority}
                    </span>
                  </Tip>
                  <Tip label={`Email category: ${selectedEmail.category}`} dir="bottom">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border cursor-default ${categoryClass(selectedEmail.category)}`}>
                      {selectedEmail.category}
                    </span>
                  </Tip>
                  <Tip label="Delete this email from triage" dir="bottom">
                    <button className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </Tip>
                </div>
              </div>
            </div>

            {/* Detail content */}
            <div className="flex-1 overflow-y-auto px-5 pb-4 pt-3 border-t border-gray-100 space-y-3">

              {/* AI Summary card */}
              {!showReply && (
                <div className="rounded-xl bg-blue-50/40 border border-blue-100 overflow-hidden">
                  <div className="px-4 pt-3 pb-2">
                    <div className="flex items-center gap-1.5 mb-2">
                      <svg className="w-3 h-3 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <Tip label="AI-generated summary of this email" dir="right">
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide cursor-default">AI Summary</span>
                      </Tip>
                    </div>
                    <p className="text-xs text-gray-800 leading-relaxed">{selectedEmail.ai_summary}</p>
                    <ul className="mt-2 space-y-1">
                      {selectedEmail.ai_insights.map((ins, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[11px] text-gray-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 mt-1.5" />{ins}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {/* Entity + signal tags */}
                  <div className="flex flex-wrap gap-1.5 px-4 py-2 border-t border-gray-100 bg-white/60">
                    {selectedEmail.entities.name && (
                      <Tip label="Contact name extracted by AI" dir="top">
                        <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-gray-100 border border-gray-200 text-gray-600 cursor-default">
                          <svg className="w-2.5 h-2.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                          {selectedEmail.entities.name}
                        </span>
                      </Tip>
                    )}
                    {selectedEmail.entities.company && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-gray-100 border border-gray-200 text-gray-600 cursor-default">
                        {selectedEmail.entities.company}
                      </span>
                    )}
                    {selectedEmail.entities.phone && (
                      <Tip label="Phone number extracted by AI" dir="top">
                        <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-gray-100 border border-gray-200 text-gray-600 cursor-default">
                          <svg className="w-2.5 h-2.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                          {selectedEmail.entities.phone}
                        </span>
                      </Tip>
                    )}
                    {selectedEmail.entities.product_interest && (
                      <Tip label="Product the sender is interested in" dir="top">
                        <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-blue-50 border border-blue-100 text-blue-700 cursor-default">
                          <svg className="w-2.5 h-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                          {selectedEmail.entities.product_interest}
                        </span>
                      </Tip>
                    )}
                    {(selectedEmail.entities.intent_signals ?? []).map((s, i) => (
                      <Tip key={i} label="Buying intent signal detected by AI" dir="top">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-teal-50 border border-teal-100 text-teal-700 cursor-default">{s}</span>
                      </Tip>
                    ))}
                    {(selectedEmail.entities.urgency_signals ?? []).map((s, i) => (
                      <Tip key={i} label="Urgency signal detected by AI" dir="top">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-100 text-amber-700 cursor-default">⚡ {s}</span>
                      </Tip>
                    ))}
                  </div>
                </div>
              )}

              {/* Email body */}
              {!showReply && (
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Email</span>
                  </div>
                  <div className="px-3 py-2.5">
                    <p className="text-xs text-gray-700 leading-relaxed font-mono">{selectedEmail.body_text}</p>
                  </div>
                </div>
              )}

              {/* Reply composer */}
              {showReply && (
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-1.5 bg-gray-50 border-b border-gray-100">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase w-4 shrink-0">To</span>
                    <span className="text-xs text-gray-700 truncate">{selectedEmail.from_name} &lt;{selectedEmail.from_address}&gt;</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-1.5 bg-gray-50 border-b border-gray-100">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase w-4 shrink-0">Re</span>
                    <span className="text-xs text-gray-600 flex-1 truncate">Re: {selectedEmail.subject}</span>
                    <Tip label="Schedule a meeting with this sender" dir="left" clickable>
                      <button className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 font-medium hover:bg-emerald-100 transition-colors shrink-0">
                        <svg className="w-2.5 h-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                        Schedule Meeting
                      </button>
                    </Tip>
                  </div>
                  <Tip label="AI-drafted reply — edit before sending" dir="top">
                    <textarea
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder="Write your reply…"
                      className="w-full px-4 py-3 text-xs text-gray-800 resize-none focus:outline-none h-[80px] placeholder-gray-400"
                    />
                  </Tip>
                  <div className="flex items-center gap-1 px-3 py-1.5 border-t border-gray-100 bg-gray-50">
                    {['B','I','U'].map(f => (
                      <button key={f} className="w-5 h-5 rounded text-[11px] font-bold text-gray-500 hover:bg-gray-200 transition-colors flex items-center justify-center">{f}</button>
                    ))}
                    <span className="w-px h-4 bg-gray-200 mx-0.5" />
                    <Tip label="Attach a file" dir="top">
                      <button className="w-5 h-5 rounded text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors flex items-center justify-center">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                      </button>
                    </Tip>
                    <div className="flex-1" />
                    <Tip label="Rewrite with AI for a more professional tone" dir="top" clickable>
                      <button className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 font-semibold hover:bg-blue-100 transition-colors">
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                        AI Rewrite
                      </button>
                    </Tip>
                  </div>
                </div>
              )}

              {/* Actioned state */}
              {actioned[selectedEmail.id] && (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-xl">
                  <svg className="w-3.5 h-3.5 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  <span className="text-xs font-medium text-green-700">{actioned[selectedEmail.id]}</span>
                </div>
              )}

            </div>

            {/* Sticky action bar */}
            {!showReply && (
              <div className="px-4 py-2.5 border-t border-gray-100 bg-white flex items-center gap-2 shrink-0">
                {!actioned[selectedEmail.id] && selectedEmail.recommendation === 'create_lead' && (
                  <Tip label="Create a Lead + Deal in your CRM from this email" dir="top" clickable>
                    <button
                      onClick={() => handleAction(selectedEmail.id, 'Lead + deal created')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                      Add Deal
                    </button>
                  </Tip>
                )}
                {!actioned[selectedEmail.id] && selectedEmail.recommendation === 'create_ticket' && (
                  <Tip label="Create a support ticket from this email" dir="top" clickable>
                    <button
                      onClick={() => handleAction(selectedEmail.id, 'Ticket created')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                      Create Ticket
                    </button>
                  </Tip>
                )}
                <div className="flex-1" />
                <Tip label="Open reply composer to respond to this email" dir="top" clickable>
                  <button
                    onClick={() => setShowReply(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#15A4AE] hover:bg-[#0f8a94] text-white transition-colors shadow-sm"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                    Reply
                  </button>
                </Tip>
                <Tip label="Mark as done and remove from triage queue" dir="top">
                  <button
                    onClick={() => handleAction(selectedEmail.id, 'Ignored')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    Ignore
                  </button>
                </Tip>
              </div>
            )}

            {/* Reply send bar */}
            {showReply && (
              <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 flex items-center gap-2 shrink-0">
                <Tip label="Dismiss and go back to detail view" dir="top">
                  <button
                    onClick={() => setShowReply(false)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    Ignore
                  </button>
                </Tip>
                <div className="flex-1" />
                <Tip label="Send reply email" dir="top" clickable>
                  <button
                    onClick={() => { handleAction(selectedEmail.id, 'Reply sent'); setShowReply(false) }}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-[#15A4AE] hover:bg-[#0f8a94] text-white transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    Send
                  </button>
                </Tip>
              </div>
            )}

          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
            Select an email to view details
          </div>
        )}
      </div>

    </div>
  )
}

/* ─── Main page ─────────────────────────────────────────────────────────── */
export default function EmailPage() {
  const [showDemo, setShowDemo] = useState(false)

  return (
    <main className="bg-[#111] min-h-screen text-white pt-16">

      {showDemo && <DemoModal onClose={() => setShowDemo(false)} />}

      {/* ── Hero ── */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-10 text-center">
        <FadeUp>
          <span className="inline-block text-xs font-semibold tracking-widest text-[#15A4AE] uppercase mb-4">
            Email Triage
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-5">
            AI that reads your inbox<br />
            <span className="text-[#15A4AE]">so you don't have to</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto mb-8">
            Every inbound email is automatically analysed, prioritised, and turned into a lead, ticket, or reply draft — before you even open it.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setShowDemo(true)}
              className="px-6 py-2.5 bg-[#15A4AE] hover:bg-[#0f8a94] text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Get started free
            </button>
            <Link href="/pricing" className="px-6 py-2.5 border border-white/15 text-gray-300 hover:text-white text-sm font-medium rounded-xl transition-colors">
              View pricing
            </Link>
          </div>
        </FadeUp>
      </section>

      {/* ── Interactive preview ── */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <FadeUp delay={0.1}>
          <div className="rounded-2xl border border-white/10 overflow-hidden bg-[#1a1a1a] shadow-2xl">
            <div className="flex items-center gap-2 px-4 py-3 bg-[#222] border-b border-white/8">
              <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
              <span className="w-3 h-3 rounded-full bg-[#28c840]" />
              <div className="flex-1 mx-4 bg-[#2a2a2a] rounded-md px-3 py-1 text-[11px] text-gray-500">
                app.appalix.ai/sage/triage
              </div>
            </div>
            <TriagePreview onOpenDemo={() => setShowDemo(true)} />
          </div>
        </FadeUp>
      </section>

      {/* ── Feature cards ── */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <ScrollReveal>
          <h2 className="text-2xl font-bold text-center mb-10">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                ),
                title: 'AI Priority Scoring',
                desc: 'Every email gets a High / Medium / Low priority score based on intent signals, urgency, and sender context — automatically.',
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                ),
                title: 'One-click Lead & Ticket Creation',
                desc: 'AI pre-fills contact name, company, email, and deal title from the email. Create a lead or ticket in one click.',
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                ),
                title: 'AI Reply Drafts',
                desc: 'For every high-priority email, Appalix drafts a reply for you. Edit, rewrite with AI, and send — all without leaving triage.',
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                ),
                title: 'Smart Categorisation',
                desc: 'Sales, Support, Invoice, Partnership, Meeting and more — each email is auto-tagged so you can filter instantly.',
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ),
                title: 'Auto-sync & Real-time',
                desc: 'Inbox syncs every 60 seconds. New emails are automatically analysed in the background — no manual refresh needed.',
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                ),
                title: 'Meeting Scheduling',
                desc: 'Reply to any email and add a calendar invite in one click — links straight to Google Calendar or Outlook.',
              },
            ].map((c, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#15A4AE]/30 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-[#15A4AE]/10 flex items-center justify-center text-[#15A4AE] mb-4">
                  {c.icon}
                </div>
                <h3 className="font-semibold text-white mb-2">{c.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-2xl mx-auto px-6 pb-24 text-center">
        <ScrollReveal>
          <h2 className="text-3xl font-bold mb-4">Zero inbox, zero effort</h2>
          <p className="text-gray-400 mb-8">Connect Gmail or Outlook and let AI handle the triage for you.</p>
          <button
            onClick={() => setShowDemo(true)}
            className="px-8 py-3 bg-[#15A4AE] hover:bg-[#0f8a94] text-white font-semibold rounded-xl transition-colors"
          >
            Start for free
          </button>
        </ScrollReveal>
      </section>

    </main>
  )
}
