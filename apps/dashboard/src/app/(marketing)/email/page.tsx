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
    <span className="relative flex h-2 w-2 shrink-0 mt-1">
      <span className={`animate-ping absolute inset-0 rounded-full ${cls} opacity-60`} />
      <span className={`relative rounded-full h-2 w-2 ${cls}`} />
    </span>
  )
  return <span className={`w-2 h-2 rounded-full shrink-0 mt-1 ${cls}`} />
}

/* ─── Email thread data ──────────────────────────────────────────────────── */
const THREADS = [
  {
    id: 1, folder: 'inbox',
    from: 'David Henderson', email: 'david@hendersonco.com', avatar: 'DH',
    subject: 'RE: Pricing enquiry — Henderson & Co',
    snippet: 'Thanks for the quick reply — we want to upgrade to Pro with 3 licences and need the invoice today…',
    aiSummary: 'Client wants to upgrade to Pro plan, 3 licences. Ready to purchase today. High urgency.',
    aiPoints: ['Upgrade intent confirmed', 'Needs invoice same day', 'Decision maker on thread'],
    time: '2m', priority: 'high', starred: true, unread: true,
    body: 'Hi James,\n\nThanks for the quick response. We\'ve decided to move forward with the Pro plan and need 3 licences for our team.\n\nCould you send over the invoice today? We\'d like to get started this week.\n\nBest regards,\nDavid',
  },
  {
    id: 2, folder: 'inbox',
    from: 'Priya Sharma', email: 'priya@logisticsco.com', avatar: 'PS',
    subject: 'Follow-up: WhatsApp integration help',
    snippet: 'Hi, we\'re trying to set up the WhatsApp channel but keep getting error 403 when connecting…',
    aiSummary: 'Technical issue with WhatsApp OAuth. Error 403 suggests permission scope problem.',
    aiPoints: ['WhatsApp connection failing', 'Error 403 = scope issue', 'May need re-auth'],
    time: '18m', priority: 'medium', starred: false, unread: true,
    body: 'Hi,\n\nWe\'re trying to connect WhatsApp but keep getting a 403 error when we click the Connect button. We\'ve tried three times now.\n\nAny idea what\'s wrong?\n\nPriya',
  },
  {
    id: 3, folder: 'inbox',
    from: 'Carlos Rivera', email: 'carlos@fintech.io', avatar: 'CR',
    subject: 'Intro: partnership opportunity',
    snippet: 'Hi, I run partnerships at Fintech.io and we\'d love to explore a co-sell arrangement…',
    aiSummary: 'Partnership inquiry from Fintech.io. Potential co-sell arrangement. Forward to BD team.',
    aiPoints: ['Partnership inquiry', 'Co-sell opportunity', 'Route to BD team'],
    time: '1h', priority: 'high', starred: false, unread: false,
    body: 'Hi team,\n\nI run partnerships at Fintech.io. We serve 800+ fintech companies and think there\'s a great co-sell opportunity with Appalix.\n\nWould love 20 minutes to explore this.\n\nBest,\nCarlos',
  },
  {
    id: 4, folder: 'inbox',
    from: 'mark@brandco.com', email: 'mark@brandco.com', avatar: 'MB',
    subject: 'Can I white-label the widget?',
    snippet: 'We\'re an agency and want to resell your product under our brand name…',
    aiSummary: 'Agency asking about white-label options. Resale interest. Scale plan candidate.',
    aiPoints: ['White-label inquiry', 'Agency reseller potential', 'Qualify for Scale plan'],
    time: '2h', priority: 'medium', starred: false, unread: false,
    body: 'Hi,\n\nWe run a digital agency and would like to offer AI chat to our 40+ clients. Is white-labelling available?\n\nMark',
  },
  {
    id: 5, folder: 'sent',
    from: 'James (You)', email: 'james@appalix.ai', avatar: 'J',
    subject: 'RE: Quarterly review scheduled',
    snippet: 'Thanks for confirming — I\'ll have the deck ready before our 10am call…',
    aiSummary: 'Internal follow-up email confirming quarterly review prep.',
    aiPoints: ['Deck to be ready', '10am call confirmed'],
    time: '3h', priority: 'low', starred: false, unread: false,
    body: 'Thanks for confirming. I\'ll have the deck ready 30 minutes before our 10am call.\n\nJames',
  },
  {
    id: 6, folder: 'inbox',
    from: 'Aiko Tanaka', email: 'aiko@tanakacorp.co.jp', avatar: 'AT',
    subject: 'Invoice #2041 — question',
    snippet: 'Could you clarify the charge on line 3? The amount looks different from last month…',
    aiSummary: 'Billing query on invoice line item. Low urgency, forward to accounts.',
    aiPoints: ['Billing clarification needed', 'Line 3 discrepancy', 'Low priority'],
    time: '1d', priority: 'low', starred: false, unread: false,
    body: 'Hi,\n\nCould you clarify the charge on line 3 of invoice #2041? It\'s £12 more than last month.\n\nAiko',
  },
]

const NAV = [
  { key: 'inbox', label: 'Inbox',    count: 4  },
  { key: 'sent',  label: 'Sent',     count: 0  },
  { key: 'drafts',label: 'Drafts',   count: 1  },
  { key: 'all',   label: 'All Mail', count: 0  },
  { key: 'trash', label: 'Trash',    count: 0  },
]

/* ─── Email Preview ─────────────────────────────────────────────────────── */
function EmailPreview({ onClick }: { onClick: () => void }) {
  const [folder,      setFolder]      = useState('inbox')
  const [selectedId,  setSelectedId]  = useState(1)
  const [starred,     setStarred]     = useState<Record<number, boolean>>({ 1: true })
  const [replyOpen,   setReplyOpen]   = useState(false)
  const [replyText,   setReplyText]   = useState('')

  function stop(e: React.MouseEvent) { e.stopPropagation() }

  const displayed = folder === 'all' ? THREADS : THREADS.filter(t => t.folder === folder)
  const thread    = THREADS.find(t => t.id === selectedId) ?? THREADS[0]

  return (
    <div className="group relative" role="button" aria-label="Open demo">
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-[#15A4AE]/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      <div className="relative rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-2xl">

        {/* macOS chrome */}
        <div className="flex items-center justify-between px-5 py-3 bg-gray-100 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex items-center gap-2 px-4 py-1 rounded-md bg-white border border-gray-200">
            <span className="text-xs text-gray-400">app.appalix.ai/sage/emails</span>
          </div>
          <div className="w-16" />
        </div>

        <div className="flex" style={{ height: 620 }}>

          {/* Left sidebar — nav */}
          <div className="w-36 shrink-0 bg-white border-r border-gray-100 flex flex-col py-3" onClick={stop}>
            <div className="px-3 mb-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-5 rounded-md bg-[#15A4AE]/15 flex items-center justify-center">
                  <span className="text-[#15A4AE] text-[9px] font-bold">A</span>
                </div>
                <span className="text-[11px] font-bold text-gray-900">Appalix</span>
              </div>
            </div>

            <Tip label="Compose a new email — Sage pre-drafts it from context" dir="right" clickable>
              <button className="mx-3 mb-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#15A4AE] text-white text-[10px] font-semibold hover:bg-[#0e8f99] transition-colors">
                ✏ Compose
              </button>
            </Tip>

            {NAV.map(n => (
              <Tip key={n.key} label={`View your ${n.label.toLowerCase()} — AI scores every thread for priority`} dir="right" clickable>
                <button
                  onClick={(e) => { stop(e); setFolder(n.key) }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-[11px] transition-colors ${folder === n.key ? 'bg-[#15A4AE]/10 text-[#15A4AE] font-semibold' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  <span>{n.label}</span>
                  {n.count > 0 && <span className={`text-[9px] font-bold px-1.5 rounded-full ${folder === n.key ? 'bg-[#15A4AE]/20 text-[#15A4AE]' : 'bg-gray-100 text-gray-500'}`}>{n.count}</span>}
                </button>
              </Tip>
            ))}

            <div className="mt-auto px-3 py-3 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#15A4AE]/20 flex items-center justify-center text-[9px] text-[#15A4AE] font-bold">J</div>
                <div>
                  <p className="text-[10px] font-medium text-gray-800 leading-none">James</p>
                  <p className="text-[9px] text-gray-400 mt-0.5">Pro Plan</p>
                </div>
              </div>
            </div>
          </div>

          {/* Middle — thread list */}
          <div className="w-64 shrink-0 border-r border-gray-100 flex flex-col bg-gray-50" onClick={stop}>
            {/* Search */}
            <div className="px-3 py-2.5 border-b border-gray-100 bg-white">
              <Tip label="Search by sender, subject, or keyword" dir="bottom">
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gray-100 cursor-default">
                  <span className="text-gray-400 text-[11px]">🔍</span>
                  <span className="text-[10px] text-gray-400">Search emails…</span>
                </div>
              </Tip>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {displayed.length === 0 && (
                <p className="px-4 py-8 text-[11px] text-gray-400 text-center">No emails in {folder}</p>
              )}
              {displayed.map(t => (
                <Tip key={t.id} label="Click to open thread — AI summary and reply assist ready" dir="right" clickable>
                  <div
                    onClick={(e) => { stop(e); setSelectedId(t.id); setReplyOpen(false); setReplyText('') }}
                    className={`px-3 py-2.5 cursor-pointer transition-colors border-l-2 ${selectedId === t.id ? 'bg-white border-[#15A4AE]' : 'hover:bg-white border-transparent'}`}
                  >
                    <div className="flex items-start gap-2">
                      <PriorityDot p={t.priority} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className={`text-[10px] truncate ${t.unread ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>{t.from}</p>
                          <span className="text-[8px] text-gray-400 shrink-0 ml-1">{t.time}</span>
                        </div>
                        <p className={`text-[10px] truncate ${t.unread ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>{t.subject}</p>
                        <p className="text-[9px] text-gray-500 truncate mt-0.5">{t.snippet}</p>
                        {t.priority === 'high' && (
                          <span className="mt-1 inline-block text-[8px] font-semibold text-[#15A4AE] bg-[#15A4AE]/10 px-1.5 py-0.5 rounded-full">AI: {t.aiSummary.split('.')[0]}</span>
                        )}
                      </div>
                      <Tip label="Star important emails to pin them to the top" dir="top" clickable>
                        <button
                          onClick={(e) => { stop(e); setStarred(s => ({ ...s, [t.id]: !s[t.id] })) }}
                          className={`text-[11px] shrink-0 mt-0.5 transition-colors ${starred[t.id] ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-300'}`}
                        >★</button>
                      </Tip>
                    </div>
                  </div>
                </Tip>
              ))}
            </div>
          </div>

          {/* Right — thread detail + AI insights */}
          <div className="flex-1 flex flex-col bg-white min-w-0" onClick={stop}>

            {/* Thread header */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-gray-900 truncate pr-4">{thread.subject}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="w-4 h-4 rounded-full bg-[#15A4AE]/20 flex items-center justify-center text-[8px] font-bold text-[#15A4AE] shrink-0">{thread.avatar[0]}</div>
                  <p className="text-[10px] text-gray-600">{thread.from} <span className="text-gray-400">· {thread.email}</span></p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Tip label="Add a calendar event from this email" dir="bottom" clickable>
                  <button className="w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-500 text-[11px] flex items-center justify-center transition-colors">📅</button>
                </Tip>
                <Tip label="Forward this email to a colleague" dir="bottom" clickable>
                  <button className="w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-500 text-[11px] flex items-center justify-center transition-colors">↗</button>
                </Tip>
                <Tip label="Move to folder" dir="bottom" clickable>
                  <button className="w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-500 text-[11px] flex items-center justify-center transition-colors">📁</button>
                </Tip>
                <Tip label="Delete email" dir="bottom" clickable>
                  <button className="w-6 h-6 rounded-md bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-500 text-[11px] flex items-center justify-center transition-colors">🗑</button>
                </Tip>
              </div>
            </div>

            {/* Thread body + AI panel */}
            <div className="flex-1 overflow-y-auto flex">

              {/* Email body */}
              <div className="flex-1 px-4 py-4 min-w-0">
                <div className="bg-white rounded-xl border border-gray-100 p-3 mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-[#15A4AE]/20 flex items-center justify-center text-[9px] font-bold text-[#15A4AE] shrink-0">{thread.avatar}</div>
                    <div>
                      <p className="text-[10px] font-semibold text-gray-900">{thread.from}</p>
                      <p className="text-[8px] text-gray-400">{thread.time} ago</p>
                    </div>
                    <PriorityDot p={thread.priority} />
                  </div>
                  <p className="text-[11px] text-gray-700 leading-relaxed whitespace-pre-line">{thread.body}</p>
                </div>

                {/* Reply/Forward buttons */}
                <div className="flex items-center gap-2 mb-3">
                  <Tip label="Reply with AI-drafted response — edit before sending" dir="top" clickable>
                    <button
                      onClick={(e) => { stop(e); setReplyOpen(true); setReplyText('') }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-[10px] text-gray-600 hover:border-[#15A4AE]/50 hover:text-[#15A4AE] transition-colors bg-white"
                    >
                      ↩ Reply
                    </button>
                  </Tip>
                  <Tip label="Forward this thread to a colleague" dir="top" clickable>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-[10px] text-gray-600 hover:border-gray-300 transition-colors bg-white">
                      ↗ Forward
                    </button>
                  </Tip>
                </div>

                {/* Inline reply box */}
                {replyOpen && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm" onClick={stop}>
                    <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                      <span className="text-[9px] text-gray-500">Replying to <span className="font-medium">{thread.from}</span></span>
                      <Tip label="Generate an AI draft reply based on this thread" dir="top" clickable>
                        <button
                          onClick={(e) => { stop(e); setReplyText(`Hi ${thread.from.split(' ')[0]},\n\nThanks for your message. I'll look into this right away and get back to you shortly.\n\nBest,\nJames`) }}
                          className="flex items-center gap-1 text-[9px] text-[#15A4AE] font-medium hover:text-[#0e8f99] transition-colors"
                        >
                          <span>✦</span> AI Draft
                        </button>
                      </Tip>
                    </div>
                    <textarea
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      onClick={stop}
                      placeholder="Write a reply…"
                      rows={3}
                      className="w-full px-3 py-2 text-[11px] text-gray-800 placeholder-gray-400 resize-none focus:outline-none"
                    />
                    <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 flex justify-end">
                      <Tip label="Send reply and auto-log to CRM" dir="top" clickable>
                        <button className="px-3 py-1.5 rounded-lg bg-[#15A4AE] text-white text-[10px] font-medium hover:bg-[#0e8f99] transition-colors">Send →</button>
                      </Tip>
                    </div>
                  </div>
                )}
              </div>

              {/* AI Insights sidebar */}
              <div className="w-44 shrink-0 border-l border-gray-100 bg-gray-50 px-3 py-3 overflow-y-auto">
                <Tip label="AI analysis of this email — automatically updated" dir="top">
                  <div className="flex items-center gap-1.5 mb-3 cursor-default">
                    <span className="text-[#15A4AE] text-xs">✦</span>
                    <p className="text-[10px] font-bold text-gray-900">AI Insights</p>
                  </div>
                </Tip>
                <div className="mb-3">
                  <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-widest mb-1">Summary</p>
                  <p className="text-[10px] text-gray-700 leading-relaxed">{thread.aiSummary}</p>
                </div>
                <div>
                  <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-widest mb-1">Key Points</p>
                  <div className="space-y-1">
                    {thread.aiPoints.map((p, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <span className="text-[#15A4AE] text-[9px] mt-0.5 shrink-0">·</span>
                        <p className="text-[10px] text-gray-700 leading-snug">{p}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Quick Actions</p>
                  <Tip label="Create a deal in your CRM linked to this email" dir="top" clickable>
                    <button className="w-full text-left px-2 py-1.5 rounded-lg text-[9px] text-gray-600 hover:bg-white hover:border hover:border-gray-200 transition-colors flex items-center gap-1.5 cursor-default">
                      <span className="text-[#15A4AE]">⧉</span> Create Deal
                    </button>
                  </Tip>
                  <Tip label="Save sender as a contact in Sage CRM" dir="top" clickable>
                    <button className="w-full text-left px-2 py-1.5 rounded-lg text-[9px] text-gray-600 hover:bg-white hover:border hover:border-gray-200 transition-colors flex items-center gap-1.5 cursor-default">
                      <span className="text-[#15A4AE]">👤</span> Add Contact
                    </button>
                  </Tip>
                  <Tip label="Create a task to follow up on this email" dir="top" clickable>
                    <button className="w-full text-left px-2 py-1.5 rounded-lg text-[9px] text-gray-600 hover:bg-white hover:border hover:border-gray-200 transition-colors flex items-center gap-1.5 cursor-default">
                      <span className="text-[#15A4AE]">☑</span> Add Task
                    </button>
                  </Tip>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button onClick={onClick} className="absolute bottom-5 right-5 flex items-center gap-2 px-4 py-2 rounded-xl bg-[#15A4AE] hover:bg-[#0e8f99] text-white text-xs font-semibold shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 z-10">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-600/40 bg-brand-600/10 text-brand-400 text-xs font-medium mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />Live demo · No credit card needed
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">See Email AI in action</h2>
        <p className="text-sm text-gray-400 leading-relaxed mb-7">Watch Sage score, prioritise, and draft replies to your real inbox — connect your email in 60 seconds.</p>
        <div className="flex flex-col gap-3">
          <Link href="/login" onClick={onClose} className="w-full py-3.5 bg-[#1a8c76] hover:bg-[#14705d] text-white font-medium rounded-xl transition-colors text-sm text-center">Start a 7-day free trial — free</Link>
          <Link href="/contact" onClick={onClose} className="w-full py-3.5 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white font-medium rounded-xl transition-colors text-sm text-center">Book a live demo →</Link>
        </div>
        <div className="mt-6 pt-5 border-t border-white/5 flex items-center justify-center gap-5">
          {['No credit card', 'Cancel anytime', '7-day free trial'].map(t => (
            <span key={t} className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <svg className="w-3 h-3 text-brand-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>{t}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

const FEATURES = [
  { icon: '✦', tag: 'AI Drafts',       title: 'Replies written before you open the email',   desc: 'Sage reads the thread, scores urgency, and drafts a personalised reply. Review, tweak, and send in seconds — not minutes.' },
  { icon: '🎯', tag: 'Priority Scoring',title: 'Never miss a hot lead in your inbox',         desc: 'Every email gets an AI priority score. High-intent messages rise to the top automatically — no manual sorting.' },
  { icon: '👥', tag: 'Team Inbox',      title: 'One inbox for your whole team',               desc: 'Assign threads, leave internal notes, and see who\'s handling what — all without leaving the email view.' },
  { icon: '🔗', tag: 'CRM Sync',        title: 'Every email auto-logged to your CRM',         desc: 'Conversations, contacts, and deals created automatically from email threads. HubSpot, Salesforce, and 30+ integrations.' },
]

export default function EmailPage() {
  const [modalOpen, setModalOpen] = useState(false)
  return (
    <div className="bg-[#1c1c1c] min-h-screen text-white">
      <section className="relative pt-36 pb-20 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-brand-600/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="relative max-w-4xl mx-auto text-center">
          <FadeUp delay={0}><div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-600/40 bg-brand-600/10 text-brand-400 text-xs font-medium mb-6"><span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />AI-powered email management</div></FadeUp>
          <FadeUp delay={0.1}><h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-snug mb-6">Inbox zero, every day —<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-600">without the effort</span></h1></FadeUp>
          <FadeUp delay={0.2}><p className="text-base sm:text-xl text-gray-400 leading-relaxed max-w-2xl mx-auto mb-10">Sage reads every incoming email, scores urgency, and drafts the perfect reply — so your team responds faster and misses nothing.</p></FadeUp>
          <FadeUp delay={0.3}><div className="flex flex-col sm:flex-row gap-3 justify-center"><Link href="/login" className="px-7 py-3.5 bg-[#1a8c76] hover:bg-[#14705d] text-white font-medium rounded-xl transition-colors text-sm">Start a 7 Day Free Trial</Link><button onClick={() => setModalOpen(true)} className="px-7 py-3.5 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white font-medium rounded-xl transition-colors text-sm">See it in action →</button></div></FadeUp>
        </div>
      </section>
      <section className="pb-24 px-6">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal><EmailPreview onClick={() => setModalOpen(true)} /></ScrollReveal>
          <ScrollReveal delay={0.1}><p className="text-center text-xs text-gray-600 mt-4">Click emails to open threads — AI insights and draft reply appear instantly</p></ScrollReveal>
        </div>
      </section>
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal className="text-center mb-14"><p className="text-xs text-brand-400 uppercase tracking-widest font-semibold mb-3">Email Intelligence</p><h2 className="text-3xl sm:text-4xl font-bold mb-4">Your inbox, handled by AI</h2><p className="text-gray-400 max-w-xl mx-auto text-sm leading-relaxed">From triage to reply, Sage handles the email workflow so your team focuses on closing deals.</p></ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f, i) => (<ScrollReveal key={f.tag} delay={i * 0.05}><div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-brand-600/30 transition-colors"><span className="text-xs text-brand-400 font-semibold uppercase tracking-widest mb-2 block">{f.tag}</span><p className="text-xl mb-1">{f.icon}</p><h3 className="text-base font-bold text-white mb-2">{f.title}</h3><p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p></div></ScrollReveal>))}
          </div>
        </div>
      </section>
      <section className="py-24 px-6 border-t border-white/5 text-center">
        <ScrollReveal><h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to clear your inbox?</h2><p className="text-gray-400 mb-8 text-sm max-w-md mx-auto">Connect your email in 60 seconds. No credit card required.</p><Link href="/login" className="inline-block px-8 py-4 bg-[#1a8c76] hover:bg-[#14705d] text-white font-medium rounded-xl transition-colors text-sm">Start free trial →</Link></ScrollReveal>
      </section>
      {modalOpen && <DemoModal onClose={() => setModalOpen(false)} />}
    </div>
  )
}
