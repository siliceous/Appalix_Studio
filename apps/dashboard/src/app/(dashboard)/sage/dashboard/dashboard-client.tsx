'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip } from 'recharts'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  Mail, MessageSquare, FileText, Ticket as TicketIcon,
  Plus, Kanban, CheckSquare, Zap, RefreshCw, Calendar,
  ChevronDown, X, Copy, ExternalLink, CheckCircle2, User,
  Phone, Building2, Sparkles, LayoutList, LayoutGrid,
  Send, Reply, Loader2,
} from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import { sendEmail } from '@/app/actions/sage-emails'
import { updateAutoSetting, dismissFeedItem } from '@/app/actions/sage-auto-settings'
import type { SageEmail, Conversation, Lead, SageTicket } from '@/lib/types'

// ── Types ─────────────────────────────────────────────────────────────────────
type DatePreset = 'today' | 'yesterday' | '7d' | '30d' | 'custom'

interface RawEmail   { id: string; from_name: string | null; from_address: string; subject: string; received_at: string; ai_priority: string | null; ai_summary: string | null }
interface RawBot     { id: string; title: string | null; platform: string | null; message_count: number; last_activity_at: string; ai_priority: string | null; bot: { name: string } | null }
interface RawLead    { id: string; name: string; email: string | null; company: string | null; lead_score: string | null; source_platform: string; created_at: string }
interface RawTicket  { id: string; title: string; priority: string; status: string; created_at: string; contact: { name: string } | null }
interface RawTask       { id: string; title: string | null; body: string | null; due_at: string | null; deal_id: string; created_at: string; deal: { id: string; title: string; pipeline_id: string | null } | null }
interface RawTicketTask { id: string; title: string | null; body: string | null; due_at: string | null; ticket_id: string; created_at: string; ticket: { id: string; title: string } | null }

type TItem =
  | { kind: 'email';  data: RawEmail;  time: string }
  | { kind: 'bot';    data: RawBot;    time: string }
  | { kind: 'form';   data: RawLead;   time: string }
  | { kind: 'ticket'; data: RawTicket; time: string }

// Priority colours: High=green, Medium=yellow, Low=grey
const P_COLORS: Record<string, string> = {
  high:   '#22c55e',
  urgent: '#22c55e',
  medium: '#eab308',
  low:    '#9ca3af',
}
const P_BG: Record<string, string> = {
  high:   'bg-green-500',
  urgent: 'bg-green-500',
  medium: 'bg-yellow-400',
  low:    'bg-gray-400',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getRange(preset: DatePreset, customFrom?: string, customTo?: string): { from: string; to: string } {
  const now   = new Date()
  const today = new Date(now); today.setHours(0, 0, 0, 0)
  switch (preset) {
    case 'today':     return { from: today.toISOString(), to: now.toISOString() }
    case 'yesterday': {
      const s = new Date(today); s.setDate(s.getDate() - 1)
      const e = new Date(today); e.setMilliseconds(-1)
      return { from: s.toISOString(), to: e.toISOString() }
    }
    case '7d':  { const s = new Date(today); s.setDate(s.getDate() - 7);  return { from: s.toISOString(), to: now.toISOString() } }
    case '30d': { const s = new Date(today); s.setDate(s.getDate() - 30); return { from: s.toISOString(), to: now.toISOString() } }
    case 'custom': {
      if (customFrom && customTo) {
        const f = new Date(customFrom + 'T00:00:00'); const t = new Date(customTo + 'T23:59:59')
        return { from: f.toISOString(), to: t.toISOString() }
      }
      return { from: today.toISOString(), to: now.toISOString() }
    }
  }
}

// ── Recharts donut ────────────────────────────────────────────────────────────
interface DonutSegment { name: string; value: number; fill: string }

function DonutChart({ segments, total, size = 130 }: { segments: DonutSegment[]; total: number; size?: number }) {
  const ir = Math.round(size * 0.29)
  const or = Math.round(size * 0.44)
  const data = total === 0
    ? [{ name: 'empty', value: 1, fill: '#e5e7eb' }]
    : segments.filter(s => s.value > 0)

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <PieChart width={size} height={size}>
        <Pie data={data} cx="50%" cy="50%" innerRadius={ir} outerRadius={or}
          dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0} isAnimationActive={total > 0}>
          {data.map((e, i) => <Cell key={i} fill={e.fill} />)}
        </Pie>
        {total > 0 && <Tooltip formatter={(v: number, n: string) => [v, n]}
          contentStyle={{ fontSize: 11, borderRadius: 8, padding: '4px 8px' }} />}
      </PieChart>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-none">{total}</span>
      </div>
    </div>
  )
}

// ── Priority dot ──────────────────────────────────────────────────────────────
function PriorityDot({ priority, pulse = false }: { priority: string; pulse?: boolean }) {
  const cls = P_BG[priority] ?? 'bg-gray-400'
  if (pulse && (priority === 'high' || priority === 'urgent')) {
    return (
      <span className="relative flex h-2 w-2 shrink-0 mt-[5px]">
        <span className={`animate-ping absolute inset-0 rounded-full ${cls} opacity-70`} />
        <span className={`relative rounded-full h-2 w-2 ${cls}`} />
      </span>
    )
  }
  return <span className={`w-2 h-2 rounded-full shrink-0 mt-[5px] ${cls}`} />
}

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} aria-label="Toggle"
      className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors focus:outline-none ${checked ? 'bg-[#61c2ad]' : 'bg-gray-300 dark:bg-gray-600'}`}>
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
    </button>
  )
}

// ── AI Summary popup ──────────────────────────────────────────────────────────
type PopupState = { kind: 'email' | 'bot' | 'form' | 'ticket'; id: string }

function ItemPopup({
  popup, sageAuto, workspaceId, onClose,
}: {
  popup: PopupState
  sageAuto: boolean
  workspaceId: string
  onClose: () => void
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData]               = useState<any>(null)
  const [loading, setLoading]         = useState(true)
  const [actionBusy, setActionBusy]   = useState(false)
  const [actionDone, setActionDone]   = useState<'contact' | 'ticket' | null>(null)

  // Reply compose state (email only)
  const [showReply, setShowReply]       = useState(false)
  const [showInsights, setShowInsights] = useState(true)
  const [replyBody, setReplyBody]       = useState('')
  const [sending, setSending]           = useState(false)
  const [sendResult, setSendResult]     = useState<string | null>(null)
  const [copied, setCopied]             = useState(false)

  // Escape to close
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  // Fetch full item
  useEffect(() => {
    setData(null); setLoading(true); setActionDone(null); setShowReply(false); setSendResult(null)
    const supabase = createClient()
    const go = async () => {
      if (popup.kind === 'email') {
        const { data: d } = await supabase.from('sage_emails')
          .select('id, from_name, from_address, subject, body_text, received_at, ai_priority, ai_summary, ai_insights, ai_category, ai_entities, ai_reply_drafts')
          .eq('id', popup.id).single()
        setData(d)
        const draft = (d as SageEmail | null)?.ai_reply_drafts?.[0]?.body ?? ''
        setReplyBody(draft)
      } else if (popup.kind === 'bot') {
        const { data: d } = await supabase.from('conversations')
          .select('id, title, platform, message_count, last_activity_at, ai_priority, ai_summary, ai_insights, ai_entities, bot:bots(name)')
          .eq('id', popup.id).single()
        setData(d)
      } else if (popup.kind === 'form') {
        const { data: d } = await supabase.from('leads')
          .select('id, name, email, phone, company, job_title, website, lead_score, source_platform, campaign_name, ad_name, form_name, created_at')
          .eq('id', popup.id).single()
        setData(d)
      } else if (popup.kind === 'ticket') {
        const { data: d } = await supabase.from('sage_tickets')
          .select('id, title, description, priority, status, created_at, contact:sage_contacts(name, email)')
          .eq('id', popup.id).single()
        setData(d)
      }
      setLoading(false)
    }
    go()
  }, [popup.id, popup.kind])

  async function createLead(name: string, email?: string | null, phone?: string | null, company?: string | null) {
    setActionBusy(true)
    const supabase = createClient()
    await (supabase as any).from('sage_contacts').insert({
      workspace_id: workspaceId, name,
      email: email ?? null, phone: phone ?? null,
      company_name: company ?? null, source: 'manual', tags: [],
    })
    setActionBusy(false); setActionDone('contact')
  }

  async function createTicket(title: string, desc?: string | null, priority?: string) {
    setActionBusy(true)
    const supabase = createClient()
    await (supabase as any).from('sage_tickets').insert({
      workspace_id: workspaceId, title,
      description: desc ?? null,
      priority: priority ?? 'medium',
      status: 'open',
    })
    setActionBusy(false); setActionDone('ticket')
  }

  async function handleSendReply() {
    if (!data || !replyBody.trim()) return
    setSending(true); setSendResult(null)
    const e = data as SageEmail
    const result = await sendEmail({
      to: e.from_address,
      subject: `Re: ${e.subject}`,
      body: replyBody,
      replyToEmailId: e.id,
    })
    setSending(false)
    setSendResult(result.ok ? 'sent' : (result.error ?? 'error'))
  }

  function copyReply() {
    navigator.clipboard.writeText(replyBody)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const iconCls = { email: 'bg-blue-200 dark:bg-blue-500/30', bot: 'bg-purple-200 dark:bg-purple-500/30', form: 'bg-green-200 dark:bg-green-500/30', ticket: 'bg-amber-100 dark:bg-amber-500/25' }[popup.kind]
  const Icon    = { email: Mail, bot: MessageSquare, form: FileText, ticket: TicketIcon }[popup.kind]
  const iconCol = { email: 'text-blue-700 dark:text-blue-300', bot: 'text-purple-700 dark:text-purple-300', form: 'text-green-700 dark:text-green-300', ticket: 'text-amber-700 dark:text-amber-400' }[popup.kind]
  const label   = { email: 'Email Summary', bot: 'Chat Summary', form: 'Lead Details', ticket: 'Ticket Summary' }[popup.kind]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/55 dark:bg-black/70"
      onClick={onClose}>
      <div className="relative w-full sm:max-w-2xl bg-white dark:bg-[#2a2a2a] rounded-t-2xl sm:rounded-2xl shadow-2xl border-t sm:border dark:border-white/12 max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconCls}`}>
              <Icon className={`w-4 h-4 ${iconCol}`} />
            </div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{label}</h2>
            <Sparkles className="w-3.5 h-3.5 text-[#61c2ad]" />
          </div>
          <div className="flex items-center gap-2">
            {/* Quick-action buttons in header for email */}
            {popup.kind === 'email' && !loading && data && (
              <button
                onClick={() => setShowReply(v => { if (!v) setShowInsights(false); return !v; })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${showReply ? 'bg-[#61c2ad] text-white' : 'bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/12'}`}
              >
                <Reply className="w-3.5 h-3.5" />
                Reply
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8 transition-colors">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="w-5 h-5 text-gray-300 animate-spin" />
            </div>
          ) : !data ? (
            <p className="text-sm text-gray-400 text-center py-12">Unable to load details.</p>
          ) : (
            <>
              {/* ── Email popup ── */}
              {popup.kind === 'email' && (() => {
                const e = data as SageEmail
                return (
                  <>
                    {/* From / Subject row */}
                    <div className="flex items-start gap-4">
                      <div className="w-9 h-9 rounded-full bg-green-200 dark:bg-green-500/30 flex items-center justify-center shrink-0 text-xs font-bold text-green-700 dark:text-green-300">
                        {(e.from_name ?? e.from_address).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{e.from_name ?? e.from_address}</p>
                        {e.from_name && <p className="text-xs text-gray-400">{e.from_address}</p>}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">{e.subject}</p>
                      </div>
                      {e.ai_priority && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                          style={{ background: `${P_COLORS[e.ai_priority] ?? '#9ca3af'}20`, color: P_COLORS[e.ai_priority] ?? '#9ca3af' }}>
                          {e.ai_priority}
                        </span>
                      )}
                    </div>

                    {/* AI Summary */}
                    {e.ai_summary && (
                      <div className="bg-[#61c2ad]/10 dark:bg-[#61c2ad]/[0.12] border border-[#61c2ad]/25 dark:border-[#61c2ad]/20 rounded-xl p-4">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Sparkles className="w-3 h-3 text-[#61c2ad]" />
                          <p className="text-[11px] text-[#61c2ad] font-bold uppercase tracking-wide">AI Summary</p>
                        </div>
                        <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{e.ai_summary}</p>
                      </div>
                    )}

                    {/* Inline Reply compose — sits right after AI Summary */}
                    {showReply && (
                      <div className="rounded-2xl border dark:border-white/10 overflow-hidden bg-gray-50 dark:bg-white/3">
                        <div className="flex items-center justify-between px-4 py-2.5 border-b dark:border-white/8 bg-white dark:bg-white/5">
                          <div className="flex items-center gap-2">
                            <Reply className="w-3.5 h-3.5 text-[#61c2ad]" />
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">Reply to {e.from_name ?? e.from_address}</span>
                          </div>
                          <button onClick={() => setShowReply(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="p-4 space-y-3">
                          <textarea
                            rows={10}
                            value={replyBody}
                            onChange={ev => setReplyBody(ev.target.value)}
                            placeholder="Write your reply…"
                            className="w-full text-sm bg-white dark:bg-[#1a1a1a] border dark:border-white/10 rounded-xl px-3 py-3 text-gray-800 dark:text-gray-200 placeholder-gray-400 resize-y min-h-[160px] focus:outline-none focus:ring-2 focus:ring-[#61c2ad]/40 leading-relaxed"
                          />
                          <div className="flex items-center gap-2 pt-1 border-t dark:border-white/8">
                            <button
                              onClick={handleSendReply}
                              disabled={sending || !replyBody.trim() || sendResult === 'sent'}
                              className="flex items-center gap-1.5 px-4 py-2 bg-[#61c2ad] hover:bg-[#4fa898] text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
                            >
                              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                              {sending ? 'Sending…' : sendResult === 'sent' ? 'Sent!' : 'Send'}
                            </button>
                            <button onClick={copyReply}
                              className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-500 dark:text-gray-400 hover:text-[#61c2ad] transition-colors rounded-xl hover:bg-gray-100 dark:hover:bg-white/8">
                              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                              {copied ? 'Copied!' : 'Copy'}
                            </button>
                            {sendResult && sendResult !== 'sent' && (
                              <p className="text-xs text-red-500 ml-1">Error: {sendResult}</p>
                            )}
                            {sendResult === 'sent' && (
                              <p className="flex items-center gap-1 text-xs text-green-500 ml-1"><CheckCircle2 className="w-3.5 h-3.5" /> Reply sent</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Key Insights — collapsible, collapsed by default when reply is open */}
                    {(e.ai_insights ?? []).length > 0 && (
                      <div className="bg-gray-50 dark:bg-white/[0.07] border border-gray-100 dark:border-white/10 rounded-xl overflow-hidden">
                        <button
                          onClick={() => setShowInsights(v => !v)}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-100 dark:hover:bg-white/6 transition-colors"
                        >
                          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Key Insights</p>
                          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${showInsights ? 'rotate-180' : ''}`} />
                        </button>
                        {showInsights && (
                          <div className="px-4 pb-4">
                            <ul className="space-y-2">
                              {(e.ai_insights ?? []).map((ins, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#61c2ad] mt-2 shrink-0" />{ins}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Entity chips */}
                    {e.ai_entities && Object.values(e.ai_entities).some(Boolean) && (
                      <div className="flex flex-wrap gap-2">
                        {e.ai_entities.name    && <span className="flex items-center gap-1.5 text-xs bg-gray-100 dark:bg-white/8 px-2.5 py-1.5 rounded-lg text-gray-700 dark:text-gray-300"><User className="w-3 h-3 text-gray-400" />{e.ai_entities.name}</span>}
                        {e.ai_entities.company && <span className="flex items-center gap-1.5 text-xs bg-gray-100 dark:bg-white/8 px-2.5 py-1.5 rounded-lg text-gray-700 dark:text-gray-300"><Building2 className="w-3 h-3 text-gray-400" />{e.ai_entities.company}</span>}
                      </div>
                    )}
                  </>
                )
              })()}

              {/* ── Bot chat popup ── */}
              {popup.kind === 'bot' && (() => {
                const c = data as Conversation & { bot: { name: string } | null }
                return (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-200 dark:bg-blue-500/30 flex items-center justify-center shrink-0 text-xs font-bold text-blue-700 dark:text-blue-300">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{c.title ?? 'Untitled conversation'}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {(c as { bot?: { name: string } | null }).bot?.name && `${(c as { bot?: { name: string } | null }).bot!.name} · `}
                          {c.message_count} messages · {timeAgo(c.last_activity_at)}
                        </p>
                      </div>
                    </div>
                    {c.ai_summary && (
                      <div className="bg-blue-50 dark:bg-blue-500/20 border border-blue-200 dark:border-blue-500/30 rounded-xl p-4">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Sparkles className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                          <p className="text-[11px] text-blue-700 dark:text-blue-300 font-bold uppercase tracking-wide">AI Summary</p>
                        </div>
                        <p className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed">{c.ai_summary}</p>
                      </div>
                    )}
                    {(c.ai_insights ?? []).length > 0 && (
                      <div className="bg-gray-50 dark:bg-white/[0.07] border border-gray-100 dark:border-white/10 rounded-xl p-4">
                        <p className="text-[11px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wide mb-2.5">Key Insights</p>
                        <ul className="space-y-2">
                          {(c.ai_insights ?? []).map((ins, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0" />{ins}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {c.ai_entities && (Object.values(c.ai_entities) as (string | string[] | undefined)[]).some(Boolean) && (
                      <div>
                        <p className="text-xs text-gray-400 mb-2">Contact details extracted</p>
                        <div className="flex flex-wrap gap-2">
                          {c.ai_entities.name  && <span className="flex items-center gap-1.5 text-xs bg-gray-100 dark:bg-white/8 px-2.5 py-1.5 rounded-lg text-gray-700 dark:text-gray-300"><User className="w-3 h-3 text-gray-400" />{c.ai_entities.name}</span>}
                          {c.ai_entities.email && <span className="flex items-center gap-1.5 text-xs bg-gray-100 dark:bg-white/8 px-2.5 py-1.5 rounded-lg text-gray-700 dark:text-gray-300"><Mail className="w-3 h-3 text-gray-400" />{c.ai_entities.email}</span>}
                          {c.ai_entities.phone && <span className="flex items-center gap-1.5 text-xs bg-gray-100 dark:bg-white/8 px-2.5 py-1.5 rounded-lg text-gray-700 dark:text-gray-300"><Phone className="w-3 h-3 text-gray-400" />{c.ai_entities.phone}</span>}
                          {c.ai_entities.product_interest && <span className="text-xs bg-gray-100 dark:bg-white/8 px-2.5 py-1.5 rounded-lg text-gray-700 dark:text-gray-300">{c.ai_entities.product_interest}</span>}
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}

              {/* ── Form lead popup ── */}
              {popup.kind === 'form' && (() => {
                const l = data as Lead
                return (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-purple-200 dark:bg-purple-500/30 flex items-center justify-center shrink-0 text-xs font-bold text-purple-700 dark:text-purple-300">
                        {l.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{l.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{l.source_platform} · {timeAgo(l.created_at)}</p>
                      </div>
                      {l.lead_score && (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
                          style={{ background: `${P_COLORS[l.lead_score]}20`, color: P_COLORS[l.lead_score] }}>
                          {l.lead_score}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      {[
                        { label: 'Email',    value: l.email,         icon: Mail },
                        { label: 'Phone',    value: l.phone,         icon: Phone },
                        { label: 'Company',  value: l.company,       icon: Building2 },
                        { label: 'Job',      value: l.job_title,     icon: User },
                        { label: 'Campaign', value: l.campaign_name, icon: Sparkles },
                        { label: 'Form',     value: l.form_name,     icon: FileText },
                      ].filter(f => f.value).map(f => (
                        <div key={f.label} className="bg-gray-50 dark:bg-white/5 rounded-xl p-3">
                          <p className="text-[10px] text-gray-400 mb-0.5">{f.label}</p>
                          <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{f.value}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )
              })()}

              {/* ── Ticket popup ── */}
              {popup.kind === 'ticket' && (() => {
                const t = data as SageTicket & { contact: { name: string; email: string | null } | null }
                return (
                  <>
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-500/25 flex items-center justify-center shrink-0">
                        <TicketIcon className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t.title}</p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: `${P_COLORS[t.priority] ?? '#9ca3af'}20`, color: P_COLORS[t.priority] ?? '#9ca3af' }}>
                            {t.priority}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400">
                            {t.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    {t.contact && (
                      <div className="flex items-center gap-2.5 bg-gray-50 dark:bg-white/5 rounded-xl p-3">
                        <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-gray-800 dark:text-gray-200">{t.contact.name}</p>
                          {t.contact.email && <p className="text-[11px] text-gray-400">{t.contact.email}</p>}
                        </div>
                      </div>
                    )}
                    {t.description && (
                      <div className="bg-amber-50 dark:bg-amber-500/15 border border-amber-200/70 dark:border-amber-500/25 rounded-xl p-4">
                        <p className="text-[11px] text-amber-700 dark:text-amber-400 font-bold uppercase tracking-wide mb-2">Description</p>
                        <p className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed whitespace-pre-wrap">{t.description}</p>
                      </div>
                    )}
                  </>
                )
              })()}

              {/* Action done feedback */}
              {actionDone && (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 rounded-xl px-4 py-3">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {actionDone === 'contact' ? 'Lead created successfully.' : 'Ticket created successfully.'}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer actions */}
        {!loading && data && (
          <div className="px-6 py-4 border-t dark:border-white/10 shrink-0">
            <div className="flex items-center gap-2">

              {sageAuto ? (
                /* ── Sage Auto ON: Dismiss + Open Pipeline ── */
                <>
                  <button
                    onClick={onClose}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-gray-100 dark:bg-white/8 hover:bg-gray-200 dark:hover:bg-white/12 rounded-xl transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    Dismiss
                  </button>
                  <div className="flex-1" />
                  <Link
                    href="/sage/pipelines"
                    onClick={onClose}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#61c2ad] hover:bg-[#4fa898] text-white rounded-xl transition-colors"
                  >
                    <Kanban className="w-3.5 h-3.5" />
                    Open Pipeline
                  </Link>
                </>
              ) : (
                /* ── Sage Auto OFF: Create Lead + Create Ticket + Triage link ── */
                <>
                  {!actionDone && (
                    <button
                      disabled={actionBusy}
                      onClick={() => {
                        if (popup.kind === 'email') {
                          const e = data as SageEmail
                          createLead(e.ai_entities?.name ?? e.from_name ?? e.from_address, e.ai_entities?.email ?? e.from_address, null, e.ai_entities?.company)
                        } else if (popup.kind === 'bot') {
                          const c = data as Conversation
                          createLead(c.ai_entities?.name ?? c.title ?? 'Contact', c.ai_entities?.email, c.ai_entities?.phone)
                        } else if (popup.kind === 'form') {
                          const l = data as Lead
                          createLead(l.name, l.email, l.phone, l.company)
                        } else {
                          const t = data as SageTicket & { contact: { name: string; email: string | null } | null }
                          if (t.contact) createLead(t.contact.name, t.contact.email)
                        }
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#61c2ad] hover:bg-[#4fa898] text-white rounded-xl transition-colors disabled:opacity-50"
                    >
                      {actionBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      Create Lead
                    </button>
                  )}

                  {!actionDone && popup.kind !== 'form' && (
                    <button
                      disabled={actionBusy}
                      onClick={() => {
                        if (popup.kind === 'email') {
                          const e = data as SageEmail
                          createTicket(e.subject, e.ai_summary, 'medium')
                        } else if (popup.kind === 'bot') {
                          const c = data as Conversation
                          createTicket(c.title ?? 'Support ticket', c.ai_summary, 'medium')
                        } else {
                          const t = data as SageTicket
                          createTicket(t.title, t.description, t.priority)
                        }
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/25 border border-amber-200/70 dark:border-amber-500/25 rounded-xl transition-colors disabled:opacity-50"
                    >
                      {actionBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TicketIcon className="w-3.5 h-3.5" />}
                      Create Ticket
                    </button>
                  )}

                  <div className="flex-1" />

                  <Link
                    href={
                      popup.kind === 'email' ? '/sage/emails' :
                      popup.kind === 'bot'   ? '/sage/bots' :
                      popup.kind === 'form'  ? '/sage/forms' :
                                              '/sage/tickets'
                    }
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-[#61c2ad] hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-colors border dark:border-white/8"
                    onClick={onClose}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {popup.kind === 'email' ? 'Email Triage' :
                     popup.kind === 'bot'   ? 'Bot Triage' :
                     popup.kind === 'form'  ? 'Form Triage' :
                                             'Ticket Triage'}
                  </Link>
                </>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main dashboard component ──────────────────────────────────────────────────
export function SageDashboardClient({ workspaceId }: { workspaceId: string }) {
  const [dateRange,  setDateRange]  = useState<DatePreset>('today')
  const [customFrom, setCustomFrom] = useState<string>('')
  const [customTo,   setCustomTo]   = useState<string>('')
  const greeting = useMemo(() => {
    const h = new Date().getHours()
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  }, [])
  const [sageAuto,   setSageAuto]   = useState(true)
  const [loading,    setLoading]    = useState(true)
  const [emails,     setEmails]     = useState<RawEmail[]>([])
  const [bots,       setBots]       = useState<RawBot[]>([])
  const [forms,      setForms]      = useState<RawLead[]>([])
  const [tickets,    setTickets]    = useState<RawTicket[]>([])
  const [tasks,        setTasks]        = useState<RawTask[]>([])
  const [ticketTasks,  setTicketTasks]  = useState<RawTicketTask[]>([])
  const [popup,      setPopup]      = useState<PopupState | null>(null)
  const [doneBusy,   setDoneBusy]   = useState<string | null>(null)
  const [feedView,    setFeedView]   = useState<'list' | 'grid'>('list')
  const [topType,     setTopType]    = useState<'email' | 'bot' | 'form' | 'ticket' | null>(null)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  // Load preferences + DB settings on mount
  useEffect(() => {
    const r = localStorage.getItem('sage-range')
    if (r) setDateRange(r as DatePreset)

    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sbAny = supabase as any
    sbAny.from('sage_workspace_settings')
      .select('global_auto_enabled')
      .eq('workspace_id', workspaceId)
      .maybeSingle()
      .then(({ data }: { data: { global_auto_enabled: boolean } | null }) => {
        if (data != null) setSageAuto(data.global_auto_enabled ?? true)
      })
    sbAny.from('sage_feed_dismissals')
      .select('source_type, source_id')
      .eq('workspace_id', workspaceId)
      .then(({ data }: { data: { source_type: string; source_id: string }[] | null }) => {
        if (data) setDismissedIds(new Set(data.map(d => `${d.source_type}-${d.source_id}`)))
      })
  }, [workspaceId])

  const handleDateChange = (v: DatePreset) => {
    setDateRange(v)
    if (v !== 'custom') localStorage.setItem('sage-range', v)
  }
  const toggleSageAuto = async () => {
    const next = !sageAuto
    setSageAuto(next)
    await updateAutoSetting('global_auto_enabled', next)
  }

  const handleDismiss = async (kind: 'email' | 'bot' | 'form' | 'ticket', id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDismissedIds(prev => new Set([...prev, `${kind}-${id}`]))
    await dismissFeedItem(kind, id)
  }

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (dateRange === 'custom' && (!customFrom || !customTo)) return
    setLoading(true)
    const { from, to } = getRange(dateRange, customFrom, customTo)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sbAny = supabase as any

    const [eR, bR, fR, tR, xR, xtR] = await Promise.all([
      supabase.from('sage_emails')
        .select('id, from_name, from_address, subject, received_at, ai_priority, ai_summary')
        .eq('workspace_id', workspaceId).eq('direction', 'inbound').eq('is_read', false).eq('is_trashed', false)
        .in('ai_priority', ['high', 'medium']).gte('received_at', from).lte('received_at', to)
        .order('received_at', { ascending: false }),
      supabase.from('conversations')
        .select('id, title, platform, message_count, last_activity_at, ai_priority, bot:bots(name)')
        .eq('workspace_id', workspaceId).eq('status', 'active')
        .in('ai_priority', ['high', 'medium']).gte('last_activity_at', from).lte('last_activity_at', to)
        .order('last_activity_at', { ascending: false }),
      supabase.from('leads')
        .select('id, name, email, company, lead_score, source_platform, created_at')
        .eq('workspace_id', workspaceId).gte('created_at', from).lte('created_at', to)
        .order('created_at', { ascending: false }),
      supabase.from('sage_tickets')
        .select('id, title, priority, status, created_at, contact:sage_contacts(name)')
        .eq('workspace_id', workspaceId).gte('created_at', from).lte('created_at', to)
        .order('created_at', { ascending: false }),
      sbAny.from('sage_deal_activities')
        .select('id, title, body, due_at, deal_id, created_at, deal:sage_deals(id, title, pipeline_id)')
        .eq('workspace_id', workspaceId).eq('type', 'task').is('completed_at', null)
        .order('due_at', { ascending: true }).limit(40),
      sbAny.from('sage_ticket_activities')
        .select('id, title, body, due_at, ticket_id, created_at, ticket:sage_tickets(id, title)')
        .eq('workspace_id', workspaceId).eq('type', 'task').is('completed_at', null)
        .order('due_at', { ascending: true }).limit(40),
    ])

    setEmails((eR.data ?? []) as RawEmail[])
    setBots((bR.data   ?? []) as RawBot[])
    setForms((fR.data  ?? []) as RawLead[])
    setTickets((tR.data ?? []) as RawTicket[])
    setTasks((xR.data   ?? []) as RawTask[])
    setTicketTasks((xtR.data ?? []) as RawTicketTask[])
    setLoading(false)
  }, [dateRange, customFrom, customTo, workspaceId])

  useEffect(() => { fetchData() }, [fetchData])

  // Mark task done
  async function markTaskDone(taskId: string, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
    setDoneBusy(taskId)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('sage_deal_activities')
      .update({ completed_at: new Date().toISOString() }).eq('id', taskId)
    setTasks(prev => prev.filter(t => t.id !== taskId))
    setDoneBusy(null)
  }

  // Mark ticket task done
  async function markTicketTaskDone(taskId: string, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
    setDoneBusy(taskId)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('sage_ticket_activities')
      .update({ completed_at: new Date().toISOString() }).eq('id', taskId)
    setTicketTasks(prev => prev.filter(t => t.id !== taskId))
    setDoneBusy(null)
  }

  // ── Donut segments ────────────────────────────────────────────────────────
  const emailSegs:  DonutSegment[] = [{ name: 'High', value: emails.filter(e => e.ai_priority === 'high').length, fill: P_COLORS.high }, { name: 'Medium', value: emails.filter(e => e.ai_priority === 'medium').length, fill: P_COLORS.medium }]
  const botSegs:    DonutSegment[] = [{ name: 'High', value: bots.filter(b => b.ai_priority === 'high').length,   fill: P_COLORS.high }, { name: 'Medium', value: bots.filter(b => b.ai_priority === 'medium').length,   fill: P_COLORS.medium }]
  const formSegs:   DonutSegment[] = [{ name: 'High', value: forms.filter(f => f.lead_score === 'high').length, fill: P_COLORS.high }, { name: 'Medium', value: forms.filter(f => f.lead_score === 'medium').length, fill: P_COLORS.medium }, { name: 'Low', value: forms.filter(f => f.lead_score === 'low' || !f.lead_score).length, fill: P_COLORS.low }]
  const ticketSegs: DonutSegment[] = [{ name: 'High', value: tickets.filter(t => t.priority === 'high' || t.priority === 'urgent').length, fill: P_COLORS.high }, { name: 'Medium', value: tickets.filter(t => t.priority === 'medium').length, fill: P_COLORS.medium }, { name: 'Low', value: tickets.filter(t => t.priority === 'low').length, fill: P_COLORS.low }]

  // ── Timeline ──────────────────────────────────────────────────────────────
  const timeline = useMemo<TItem[]>(() => [
    ...emails.map(d  => ({ kind: 'email'  as const, data: d, time: d.received_at    })),
    ...bots.map(d    => ({ kind: 'bot'    as const, data: d, time: d.last_activity_at })),
    ...forms.map(d   => ({ kind: 'form'   as const, data: d, time: d.created_at      })),
    ...tickets.map(d => ({ kind: 'ticket' as const, data: d, time: d.created_at      })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
   .filter(item => !dismissedIds.has(`${item.kind}-${item.data.id}`)), [emails, bots, forms, tickets, dismissedIds])

  const overdue = (due: string | null) => !!due && new Date(due) < new Date()

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* AI Summary popup */}
      {popup && (
        <ItemPopup
          popup={popup}
          sageAuto={sageAuto}
          workspaceId={workspaceId}
          onClose={() => setPopup(null)}
        />
      )}

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-6 mb-5 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{greeting}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 mb-4">
            Here&apos;s what needs your attention today
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { href: '/sage/contacts',  label: 'Add Contact', Icon: Plus,           cls: 'bg-[#61c2ad] hover:bg-[#4fa898] text-white shadow-sm' },
              { href: '/sage/emails',    label: 'Inbox',       Icon: Mail,           cls: 'bg-white dark:bg-white/8 hover:bg-gray-50 dark:hover:bg-white/12 border dark:border-white/10 text-gray-700 dark:text-gray-300' },
              { href: '/conversations',  label: 'Bot Conv.',   Icon: MessageSquare,  cls: 'bg-white dark:bg-white/8 hover:bg-gray-50 dark:hover:bg-white/12 border dark:border-white/10 text-gray-700 dark:text-gray-300' },
              { href: '/forms/leads',    label: 'Forms',       Icon: FileText,       cls: 'bg-white dark:bg-white/8 hover:bg-gray-50 dark:hover:bg-white/12 border dark:border-white/10 text-gray-700 dark:text-gray-300' },
              { href: '/sage/pipelines', label: 'Pipelines',   Icon: Kanban,         cls: 'bg-white dark:bg-white/8 hover:bg-gray-50 dark:hover:bg-white/12 border dark:border-white/10 text-gray-700 dark:text-gray-300' },
            ].map(({ href, label, Icon: Ic, cls }) => (
              <Link key={href} href={href} className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-xl transition-colors ${cls}`}>
                <Ic className="w-3.5 h-3.5" /> {label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Date range */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <select value={dateRange} onChange={e => handleDateChange(e.target.value as DatePreset)}
                className="appearance-none bg-white dark:bg-[#232323] border dark:border-white/10 text-sm text-gray-700 dark:text-gray-300 rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-[#61c2ad]/40 cursor-pointer">
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="custom">Choose...</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            </div>
            {dateRange === 'custom' && (
              <div className="flex items-center gap-1.5">
                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                  className="bg-white dark:bg-[#232323] border dark:border-white/10 text-sm text-gray-700 dark:text-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#61c2ad]/40"
                  placeholder="dd/mm/yyyy" />
                <span className="text-xs text-gray-400">to</span>
                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                  className="bg-white dark:bg-[#232323] border dark:border-white/10 text-sm text-gray-700 dark:text-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#61c2ad]/40"
                  placeholder="dd/mm/yyyy" />
              </div>
            )}
          </div>

          {/* Sage Auto */}
          <div className="flex items-center gap-2.5 bg-white dark:bg-[#232323] border dark:border-white/10 rounded-xl px-4 py-2">
            <Zap className={`w-3.5 h-3.5 ${sageAuto ? 'text-[#61c2ad]' : 'text-gray-400'}`} />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sage Auto</span>
            <Toggle checked={sageAuto} onChange={toggleSageAuto} />
            <span className={`text-xs font-bold ${sageAuto ? 'text-[#61c2ad]' : 'text-gray-400'}`}>
              {sageAuto ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>
      </div>

      {/* Sage Auto banner */}
      {sageAuto ? (
        <div className="mb-5 flex items-center gap-2 text-xs text-[#4fa898] dark:text-[#61c2ad] bg-[#61c2ad]/8 border border-[#61c2ad]/20 rounded-xl px-4 py-2.5">
          <Zap className="w-3.5 h-3.5 shrink-0" />
          <span><strong>Sage Auto is ON</strong> — AI is collecting from all channels, summarising, and automatically creating contacts &amp; updating your pipeline.</span>
        </div>
      ) : (
        <div className="mb-5 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-xl px-4 py-2.5">
          <Zap className="w-3.5 h-3.5 shrink-0 text-gray-400" />
          <span><strong className="text-gray-600 dark:text-gray-300">Sage Auto is OFF</strong> — AI continues collecting and summarising conversations from all channels, while you review them and decide the next action.</span>
        </div>
      )}

      {/* ── 4 Donut cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Emails',    sub: 'high & medium unread',  Icon: Mail,        iconCls: 'text-blue-500',   segs: emailSegs,  total: emails.length,  href: '/dashboard/email'   },
          { label: 'Bot Chats', sub: 'high & medium active',  Icon: MessageSquare, iconCls: 'text-purple-500', segs: botSegs,  total: bots.length,    href: '/dashboard/bots'    },
          { label: 'Forms',     sub: 'all submissions',       Icon: FileText,    iconCls: 'text-green-500',  segs: formSegs,   total: forms.length,   href: '/dashboard/forms'   },
          { label: 'Tickets',   sub: 'all tickets',           Icon: TicketIcon,  iconCls: 'text-amber-500', segs: ticketSegs, total: tickets.length, href: '/dashboard/tickets' },
        ].map(card => (
          <Link key={card.label} href={card.href} className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-4 flex flex-col items-center hover:shadow-md hover:border-gray-300 dark:hover:border-white/15 transition-all cursor-pointer">
            <div className="w-full flex items-center justify-between mb-2">
              <div>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{card.label}</p>
                <p className="text-[10px] text-gray-400">{card.sub}</p>
              </div>
              <card.Icon className={`w-4 h-4 ${card.iconCls}`} />
            </div>
            <DonutChart segments={card.segs} total={card.total} />
            <div className="flex items-center gap-2.5 mt-2 text-[11px] flex-wrap justify-center">
              {card.segs.map(s => (
                <span key={s.name} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: s.fill }} />
                  <span className="text-gray-500 dark:text-gray-400">{s.value} {s.name.toLowerCase()}</span>
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>

      {/* ── 2 : 1 layout ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Left: activity feed */}
        <div className="xl:col-span-2 bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 flex flex-col">
          {/* Header */}
          <div className="px-5 py-4 border-b dark:border-white/8 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Activity Feed</h2>
              {/* List / Grid toggle */}
              <div className="flex items-center gap-0.5 ml-2 bg-gray-100 dark:bg-white/6 rounded-lg p-0.5">
                <button
                  onClick={() => setFeedView('list')}
                  className={`p-1 rounded-md transition-colors ${feedView === 'list' ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                  title="List view"
                >
                  <LayoutList className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setFeedView('grid')}
                  className={`p-1 rounded-md transition-colors ${feedView === 'grid' ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                  title="Grid view"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {/* Type icon counts — clickable in both views; in grid view also brings that tablet to top */}
            <div className="flex items-center gap-3 text-xs">
              <button
                onClick={() => { setFeedView('grid'); setTopType('email') }}
                className={`flex items-center gap-1 text-blue-500 hover:text-blue-600 transition-colors ${topType === 'email' && feedView === 'grid' ? 'font-semibold' : ''}`}
                title="Emails"
              >
                <Mail className="w-3.5 h-3.5" />{emails.length}
              </button>
              <button
                onClick={() => { setFeedView('grid'); setTopType('bot') }}
                className={`flex items-center gap-1 text-purple-500 hover:text-purple-600 transition-colors ${topType === 'bot' && feedView === 'grid' ? 'font-semibold' : ''}`}
                title="Bot chats"
              >
                <MessageSquare className="w-3.5 h-3.5" />{bots.length}
              </button>
              <button
                onClick={() => { setFeedView('grid'); setTopType('form') }}
                className={`flex items-center gap-1 text-green-500 hover:text-green-600 transition-colors ${topType === 'form' && feedView === 'grid' ? 'font-semibold' : ''}`}
                title="Form submissions"
              >
                <FileText className="w-3.5 h-3.5" />{forms.length}
              </button>
              <button
                onClick={() => { setFeedView('grid'); setTopType('ticket') }}
                className={`flex items-center gap-1 text-amber-500 hover:text-amber-600 transition-colors ${topType === 'ticket' && feedView === 'grid' ? 'font-semibold' : ''}`}
                title="Tickets"
              >
                <TicketIcon className="w-3.5 h-3.5" />{tickets.length}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24"><RefreshCw className="w-5 h-5 text-gray-300 animate-spin" /></div>
          ) : feedView === 'list' ? (
            /* ── LIST VIEW ──────────────────────────────────────────────── */
            timeline.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-5 text-center">
                <p className="text-sm text-gray-400">No activity for this period.</p>
                <p className="text-xs text-gray-400 mt-1">Try selecting a wider date range.</p>
              </div>
            ) : (
              <div className="divide-y dark:divide-white/8 overflow-y-auto max-h-[680px]">
                {timeline.map(item => {
                  const timeKey = `${item.kind}-${item.data.id}`
                  const timeLabel = timeAgo(item.time)
                  if (item.kind === 'email') {
                    const e = item.data
                    return (
                      <div key={timeKey} onClick={() => setPopup({ kind: 'email', id: e.id })}
                        className="group flex items-start gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors cursor-pointer">
                        <PriorityDot priority={e.ai_priority ?? 'low'} pulse={e.ai_priority === 'high'} />
                        <div className="w-6 h-6 rounded-md bg-blue-200 dark:bg-blue-500/30 flex items-center justify-center shrink-0">
                          <Mail className="w-3.5 h-3.5 text-blue-700 dark:text-blue-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{e.from_name ?? e.from_address}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{e.subject}</p>
                          {e.ai_summary && <p className="text-[11px] text-gray-400 italic truncate mt-0.5">{e.ai_summary}</p>}
                        </div>
                        <span className="text-xs text-gray-400 shrink-0">{timeLabel}</span>
                        <button onClick={ev => handleDismiss('email', e.id, ev)} title="Dismiss"
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all shrink-0">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  }
                  if (item.kind === 'bot') {
                    const b = item.data
                    return (
                      <div key={timeKey} onClick={() => setPopup({ kind: 'bot', id: b.id })}
                        className="group flex items-start gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors cursor-pointer">
                        <PriorityDot priority={b.ai_priority ?? 'low'} pulse={b.ai_priority === 'high'} />
                        <div className="w-6 h-6 rounded-md bg-purple-200 dark:bg-purple-500/30 flex items-center justify-center shrink-0">
                          <MessageSquare className="w-3.5 h-3.5 text-purple-700 dark:text-purple-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{b.title ?? 'Untitled conversation'}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {b.bot?.name && <span className="font-medium">{b.bot.name} · </span>}{b.message_count} msgs
                          </p>
                        </div>
                        <span className="text-xs text-gray-400 shrink-0">{timeLabel}</span>
                        <button onClick={ev => handleDismiss('bot', b.id, ev)} title="Dismiss"
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all shrink-0">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  }
                  if (item.kind === 'form') {
                    const f = item.data
                    return (
                      <div key={timeKey} onClick={() => setPopup({ kind: 'form', id: f.id })}
                        className="group flex items-start gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors cursor-pointer">
                        <PriorityDot priority={f.lead_score ?? 'low'} />
                        <div className="w-6 h-6 rounded-md bg-green-200 dark:bg-green-500/30 flex items-center justify-center shrink-0">
                          <FileText className="w-3.5 h-3.5 text-green-700 dark:text-green-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{f.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{f.company ?? f.email ?? f.source_platform}</p>
                        </div>
                        <span className="text-xs text-gray-400 shrink-0">{timeLabel}</span>
                        <button onClick={ev => handleDismiss('form', f.id, ev)} title="Dismiss"
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all shrink-0">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  }
                  if (item.kind === 'ticket') {
                    const t = item.data
                    return (
                      <div key={timeKey} onClick={() => setPopup({ kind: 'ticket', id: t.id })}
                        className="group flex items-start gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors cursor-pointer">
                        <PriorityDot priority={t.priority} pulse={t.priority === 'high' || t.priority === 'urgent'} />
                        <div className="w-6 h-6 rounded-md bg-yellow-200 dark:bg-yellow-500/30 flex items-center justify-center shrink-0">
                          <TicketIcon className="w-3.5 h-3.5 text-yellow-700 dark:text-yellow-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{t.title}</p>
                          {t.contact && <p className="text-xs text-gray-500 dark:text-gray-400">{t.contact.name}</p>}
                        </div>
                        <span className="text-xs text-gray-400 shrink-0">{timeLabel}</span>
                        <button onClick={ev => handleDismiss('ticket', t.id, ev)} title="Dismiss"
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all shrink-0">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  }
                  return null
                })}
              </div>
            )
          ) : (
            /* ── GRID VIEW: 4 stacked tablets ───────────────────────────── */
            (() => {
              const allTablets: Array<{
                key: 'email' | 'bot' | 'form' | 'ticket'
                label: string
                icon: React.ReactNode
                accentClass: string
                borderClass: string
                bgClass: string
                count: number
                rows: React.ReactNode
              }> = [
                {
                  key: 'email',
                  label: 'Emails',
                  icon: <Mail className="w-3.5 h-3.5" />,
                  accentClass: 'text-blue-700 dark:text-blue-300',
                  borderClass: 'border-blue-200 dark:border-blue-500/30',
                  bgClass: 'bg-blue-100 dark:bg-blue-500/25',
                  count: emails.length,
                  rows: emails.length === 0
                    ? <p className="px-5 py-6 text-xs text-gray-400 text-center">No emails this period.</p>
                    : emails.filter(e => !dismissedIds.has(`email-${e.id}`)).map(e => (
                      <div key={e.id} onClick={() => setPopup({ kind: 'email', id: e.id })}
                        className="group flex items-start gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors cursor-pointer border-b dark:border-white/6 last:border-0">
                        <PriorityDot priority={e.ai_priority ?? 'low'} pulse={e.ai_priority === 'high'} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{e.from_name ?? e.from_address}</p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{e.subject}</p>
                          {e.ai_summary && <p className="text-[10px] text-gray-400 italic truncate mt-0.5">{e.ai_summary}</p>}
                        </div>
                        <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(e.received_at)}</span>
                        <button onClick={ev => handleDismiss('email', e.id, ev)} title="Dismiss"
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all shrink-0">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )),
                },
                {
                  key: 'bot',
                  label: 'Bot Chats',
                  icon: <MessageSquare className="w-3.5 h-3.5" />,
                  accentClass: 'text-purple-700 dark:text-purple-300',
                  borderClass: 'border-purple-200 dark:border-purple-500/30',
                  bgClass: 'bg-purple-100 dark:bg-purple-500/25',
                  count: bots.length,
                  rows: bots.length === 0
                    ? <p className="px-5 py-6 text-xs text-gray-400 text-center">No bot chats this period.</p>
                    : bots.filter(b => !dismissedIds.has(`bot-${b.id}`)).map(b => (
                      <div key={b.id} onClick={() => setPopup({ kind: 'bot', id: b.id })}
                        className="group flex items-start gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors cursor-pointer border-b dark:border-white/6 last:border-0">
                        <PriorityDot priority={b.ai_priority ?? 'low'} pulse={b.ai_priority === 'high'} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{b.title ?? 'Untitled conversation'}</p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            {b.bot?.name && <span className="font-medium">{b.bot.name} · </span>}{b.message_count} msgs
                          </p>
                        </div>
                        <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(b.last_activity_at)}</span>
                        <button onClick={ev => handleDismiss('bot', b.id, ev)} title="Dismiss"
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all shrink-0">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )),
                },
                {
                  key: 'form',
                  label: 'Form Submissions',
                  icon: <FileText className="w-3.5 h-3.5" />,
                  accentClass: 'text-green-700 dark:text-green-300',
                  borderClass: 'border-green-200 dark:border-green-500/30',
                  bgClass: 'bg-green-100 dark:bg-green-500/25',
                  count: forms.length,
                  rows: forms.length === 0
                    ? <p className="px-5 py-6 text-xs text-gray-400 text-center">No form submissions this period.</p>
                    : forms.filter(f => !dismissedIds.has(`form-${f.id}`)).map(f => (
                      <div key={f.id} onClick={() => setPopup({ kind: 'form', id: f.id })}
                        className="group flex items-start gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors cursor-pointer border-b dark:border-white/6 last:border-0">
                        <PriorityDot priority={f.lead_score ?? 'low'} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{f.name}</p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{f.company ?? f.email ?? f.source_platform}</p>
                        </div>
                        <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(f.created_at)}</span>
                        <button onClick={ev => handleDismiss('form', f.id, ev)} title="Dismiss"
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all shrink-0">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )),
                },
                {
                  key: 'ticket',
                  label: 'Tickets',
                  icon: <TicketIcon className="w-3.5 h-3.5" />,
                  accentClass: 'text-amber-700 dark:text-amber-400',
                  borderClass: 'border-amber-200/70 dark:border-amber-500/25',
                  bgClass: 'bg-amber-50 dark:bg-amber-500/15',
                  count: tickets.length,
                  rows: tickets.length === 0
                    ? <p className="px-5 py-6 text-xs text-gray-400 text-center">No tickets this period.</p>
                    : tickets.filter(t => !dismissedIds.has(`ticket-${t.id}`)).map(t => (
                      <div key={t.id} onClick={() => setPopup({ kind: 'ticket', id: t.id })}
                        className="group flex items-start gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors cursor-pointer border-b dark:border-white/6 last:border-0">
                        <PriorityDot priority={t.priority} pulse={t.priority === 'high' || t.priority === 'urgent'} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{t.title}</p>
                          {t.contact && <p className="text-[11px] text-gray-500 dark:text-gray-400">{t.contact.name}</p>}
                        </div>
                        <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(t.created_at)}</span>
                        <button onClick={ev => handleDismiss('ticket', t.id, ev)} title="Dismiss"
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all shrink-0">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )),
                },
              ]

              // Bring topType to front of the stack
              const ordered = topType
                ? [...allTablets.filter(t => t.key === topType), ...allTablets.filter(t => t.key !== topType)]
                : allTablets

              return (
                <div className="flex flex-col gap-2 p-4 overflow-y-auto max-h-[700px]">
                  {ordered.map(tablet => {
                    const isActive   = topType === tablet.key
                    const isCollapsed = topType !== null && !isActive
                    return (
                      <div
                        key={tablet.key}
                        className={`rounded-xl border overflow-hidden transition-all duration-200 ${
                          isActive
                            ? `${tablet.borderClass} ring-1 ring-inset ${tablet.borderClass}`
                            : 'border-gray-100 dark:border-white/8'
                        }`}
                      >
                        {/* Tablet header */}
                        <div
                          className={`px-4 py-2.5 flex items-center justify-between cursor-pointer ${tablet.bgClass}`}
                          onClick={() => setTopType(isActive ? null : tablet.key)}
                        >
                          <div className={`flex items-center gap-2 text-xs font-semibold ${tablet.accentClass}`}>
                            {tablet.icon}
                            {tablet.label}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tablet.bgClass} ${tablet.accentClass}`}>
                              {tablet.count}
                            </span>
                            <span className={`text-[10px] ${tablet.accentClass} transition-transform duration-200 ${isActive ? 'rotate-180' : ''}`}>▾</span>
                          </div>
                        </div>
                        {/* Tablet rows */}
                        <div className={`overflow-y-auto transition-all duration-200 ${
                          isActive    ? 'max-h-[520px]' :
                          isCollapsed ? 'max-h-0'       : 'max-h-[200px]'
                        }`}>
                          {tablet.rows}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()
          )}
        </div>

        {/* Right: pending tasks */}
        <div className="xl:col-span-1 bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 flex flex-col">
          <div className="px-5 py-4 border-b dark:border-white/8 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Pending Tasks</h2>
            </div>
            {(tasks.length + ticketTasks.length) > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400">{tasks.length + ticketTasks.length}</span>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24"><RefreshCw className="w-5 h-5 text-gray-300 animate-spin" /></div>
          ) : tasks.length === 0 && ticketTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-5">
              <CheckSquare className="w-8 h-8 text-gray-200 dark:text-gray-700 mx-auto mb-2" />
              <p className="text-sm text-gray-400">All caught up!</p>
            </div>
          ) : (
            <div className="divide-y dark:divide-white/8 overflow-y-auto max-h-[680px]">
              {tasks.map(task => {
                const pipelineUrl = task.deal?.pipeline_id
                  ? `/sage/pipelines/${task.deal.pipeline_id}?deal=${task.deal_id}`
                  : '/sage/pipelines'
                return (
                  <div key={task.id} className="flex items-start gap-0 px-5 py-4 group hover:bg-gray-50 dark:hover:bg-white/3 transition-colors">
                    <Link href={pipelineUrl} className="flex-1 min-w-0 pr-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                        {task.title ?? 'Untitled task'}
                      </p>
                      {task.deal && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{task.deal.title}</p>
                      )}
                      {task.body && (
                        <p className="text-[11px] text-gray-400 italic truncate mt-0.5">{task.body}</p>
                      )}
                      {task.due_at && (
                        <span className={`flex items-center gap-1 text-xs font-medium mt-1 ${overdue(task.due_at) ? 'text-red-500' : 'text-gray-400'}`}>
                          <Calendar className="w-3 h-3" />
                          {new Date(task.due_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {overdue(task.due_at) && ' · overdue'}
                        </span>
                      )}
                    </Link>
                    <button
                      onClick={e => markTaskDone(task.id, e)}
                      disabled={doneBusy === task.id}
                      title="Mark as done"
                      className="shrink-0 w-5 h-5 mt-0.5 rounded border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-500/10 hover:text-green-600 text-transparent transition-colors disabled:opacity-50"
                    >
                      {doneBusy === task.id
                        ? <RefreshCw className="w-3 h-3 text-gray-400 animate-spin" />
                        : <CheckCircle2 className="w-3 h-3" />}
                    </button>
                  </div>
                )
              })}
              {ticketTasks.map(task => (
                <div key={task.id} className="flex items-start gap-0 px-5 py-4 group hover:bg-gray-50 dark:hover:bg-white/3 transition-colors">
                  <Link href="/sage/tickets" className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">Ticket</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                      {task.title ?? 'Untitled task'}
                    </p>
                    {task.ticket && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{task.ticket.title}</p>
                    )}
                    {task.body && (
                      <p className="text-[11px] text-gray-400 italic truncate mt-0.5">{task.body}</p>
                    )}
                    {task.due_at && (
                      <span className={`flex items-center gap-1 text-xs font-medium mt-1 ${overdue(task.due_at) ? 'text-red-500' : 'text-gray-400'}`}>
                        <Calendar className="w-3 h-3" />
                        {new Date(task.due_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {overdue(task.due_at) && ' · overdue'}
                      </span>
                    )}
                  </Link>
                  <button
                    onClick={e => markTicketTaskDone(task.id, e)}
                    disabled={doneBusy === task.id}
                    title="Mark as done"
                    className="shrink-0 w-5 h-5 mt-0.5 rounded border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-500/10 hover:text-green-600 text-transparent transition-colors disabled:opacity-50"
                  >
                    {doneBusy === task.id
                      ? <RefreshCw className="w-3 h-3 text-gray-400 animate-spin" />
                      : <CheckCircle2 className="w-3 h-3" />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
