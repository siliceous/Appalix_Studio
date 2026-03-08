'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip } from 'recharts'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  Mail, MessageSquare, FileText, Ticket as TicketIcon,
  Plus, Kanban, CheckSquare, Zap, RefreshCw, Calendar,
  ChevronDown, X, Copy, ExternalLink, CheckCircle2, User,
  Phone, Building2, Sparkles,
} from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import type { SageEmail, Conversation, Lead, SageTicket, SageContact } from '@/lib/types'

// ── Types ─────────────────────────────────────────────────────────────────────
type DatePreset = 'today' | 'yesterday' | '7d' | '30d'

interface RawEmail   { id: string; from_name: string | null; from_address: string; subject: string; received_at: string; ai_priority: string | null; ai_summary: string | null }
interface RawBot     { id: string; title: string | null; platform: string | null; message_count: number; last_activity_at: string; ai_priority: string | null; bot: { name: string } | null }
interface RawLead    { id: string; name: string; email: string | null; company: string | null; lead_score: string | null; source_platform: string; created_at: string }
interface RawTicket  { id: string; title: string; priority: string; status: string; created_at: string; contact: { name: string } | null }
interface RawTask    { id: string; title: string | null; body: string | null; due_at: string | null; deal_id: string; created_at: string; deal: { id: string; title: string; pipeline_id: string | null } | null }

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
function getRange(preset: DatePreset): { from: string; to: string } {
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
  const [replyText, setReplyText]     = useState('')
  const [copied, setCopied]           = useState(false)
  const [actionBusy, setActionBusy]   = useState(false)
  const [actionDone, setActionDone]   = useState<'contact' | 'ticket' | null>(null)

  // Escape to close
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  // Fetch full item
  useEffect(() => {
    setData(null); setLoading(true); setActionDone(null)
    const supabase = createClient()
    const go = async () => {
      if (popup.kind === 'email') {
        const { data: d } = await supabase.from('sage_emails')
          .select('id, from_name, from_address, subject, body_text, received_at, ai_priority, ai_summary, ai_insights, ai_category, ai_entities, ai_reply_drafts')
          .eq('id', popup.id).single()
        setData(d)
        const draft = (d as SageEmail | null)?.ai_reply_drafts?.[0]?.body ?? ''
        setReplyText(draft)
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

  async function createContact(name: string, email?: string | null, phone?: string | null, company?: string | null) {
    setActionBusy(true)
    const supabase = createClient()
    await supabase.from('sage_contacts').insert({
      workspace_id: workspaceId, name,
      email: email ?? null, phone: phone ?? null,
      company_name: company ?? null, source: 'manual', tags: [],
    } as Partial<SageContact>)
    setActionBusy(false); setActionDone('contact')
  }

  async function createTicket(title: string, desc?: string | null, priority?: string) {
    setActionBusy(true)
    const supabase = createClient()
    await supabase.from('sage_tickets').insert({
      workspace_id: workspaceId, title,
      description: desc ?? null,
      priority: (priority ?? 'medium') as SageTicket['priority'],
      status: 'open',
    } as Partial<SageTicket>)
    setActionBusy(false); setActionDone('ticket')
  }

  function copyReply() {
    navigator.clipboard.writeText(replyText)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const iconCls = { email: 'bg-green-100 dark:bg-green-500/15', bot: 'bg-blue-100 dark:bg-blue-500/15', form: 'bg-purple-100 dark:bg-purple-500/15', ticket: 'bg-orange-100 dark:bg-orange-500/15' }[popup.kind]
  const Icon    = { email: Mail, bot: MessageSquare, form: FileText, ticket: TicketIcon }[popup.kind]
  const iconCol = { email: 'text-green-600 dark:text-green-400', bot: 'text-blue-600 dark:text-blue-400', form: 'text-purple-600 dark:text-purple-400', ticket: 'text-orange-600 dark:text-orange-400' }[popup.kind]
  const label   = { email: 'Email Summary', bot: 'Chat Summary', form: 'Lead Details', ticket: 'Ticket Summary' }[popup.kind]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}>
      <div className="relative w-full sm:max-w-lg bg-white dark:bg-[#2a2a2a] rounded-t-2xl sm:rounded-2xl shadow-2xl border-t sm:border dark:border-white/12 max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconCls}`}>
              <Icon className={`w-4 h-4 ${iconCol}`} />
            </div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{label}</h2>
            <Sparkles className="w-3.5 h-3.5 text-[#61c2ad]" />
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8 transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
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
                    <div className="space-y-1">
                      <p className="text-xs text-gray-400">From</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{e.from_name ?? e.from_address}</p>
                      {e.from_name && <p className="text-xs text-gray-500">{e.from_address}</p>}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-400">Subject</p>
                      <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">{e.subject}</p>
                    </div>
                    {e.ai_summary && (
                      <div className="bg-[#61c2ad]/8 border border-[#61c2ad]/20 rounded-xl p-3.5">
                        <p className="text-[11px] text-[#61c2ad] font-semibold mb-1 uppercase tracking-wide">AI Summary</p>
                        <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{e.ai_summary}</p>
                      </div>
                    )}
                    {(e.ai_insights ?? []).length > 0 && (
                      <div>
                        <p className="text-xs text-gray-400 mb-1.5">Key Insights</p>
                        <ul className="space-y-1">
                          {(e.ai_insights ?? []).map((ins, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#61c2ad] mt-1.5 shrink-0" />{ins}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {e.ai_entities && Object.values(e.ai_entities).some(Boolean) && (
                      <div className="flex flex-wrap gap-2">
                        {e.ai_entities.name    && <span className="flex items-center gap-1 text-xs bg-gray-100 dark:bg-white/8 px-2 py-1 rounded-lg"><User className="w-3 h-3 text-gray-400" />{e.ai_entities.name}</span>}
                        {e.ai_entities.company && <span className="flex items-center gap-1 text-xs bg-gray-100 dark:bg-white/8 px-2 py-1 rounded-lg"><Building2 className="w-3 h-3 text-gray-400" />{e.ai_entities.company}</span>}
                      </div>
                    )}
                    {/* Reply draft */}
                    <div>
                      <p className="text-xs text-gray-400 mb-1.5">Reply draft</p>
                      <textarea
                        rows={4}
                        value={replyText}
                        onChange={e2 => setReplyText(e2.target.value)}
                        placeholder="Write your reply…"
                        className="w-full text-sm bg-gray-50 dark:bg-white/5 border dark:border-white/10 rounded-xl px-3 py-2.5 text-gray-800 dark:text-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-[#61c2ad]/40"
                      />
                      <button onClick={copyReply}
                        className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#61c2ad] transition-colors">
                        {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'Copied!' : 'Copy draft'}
                      </button>
                    </div>
                  </>
                )
              })()}

              {/* ── Bot chat popup ── */}
              {popup.kind === 'bot' && (() => {
                const c = data as Conversation & { bot: { name: string } | null }
                return (
                  <>
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{c.title ?? 'Untitled conversation'}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {(c as { bot?: { name: string } | null }).bot?.name && `${(c as { bot?: { name: string } | null }).bot!.name} · `}
                          {c.message_count} messages · {timeAgo(c.last_activity_at)}
                        </p>
                      </div>
                    </div>
                    {c.ai_summary && (
                      <div className="bg-blue-50/60 dark:bg-blue-500/8 border border-blue-200/60 dark:border-blue-500/20 rounded-xl p-3.5">
                        <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold mb-1 uppercase tracking-wide">AI Summary</p>
                        <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{c.ai_summary}</p>
                      </div>
                    )}
                    {(c.ai_insights ?? []).length > 0 && (
                      <div>
                        <p className="text-xs text-gray-400 mb-1.5">Key Insights</p>
                        <ul className="space-y-1">
                          {(c.ai_insights ?? []).map((ins, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />{ins}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {c.ai_entities && (Object.values(c.ai_entities) as (string | string[] | undefined)[]).some(Boolean) && (
                      <div>
                        <p className="text-xs text-gray-400 mb-1.5">Contact details</p>
                        <div className="flex flex-wrap gap-2">
                          {c.ai_entities.name  && <span className="flex items-center gap-1 text-xs bg-gray-100 dark:bg-white/8 px-2 py-1 rounded-lg"><User className="w-3 h-3 text-gray-400" />{c.ai_entities.name}</span>}
                          {c.ai_entities.email && <span className="flex items-center gap-1 text-xs bg-gray-100 dark:bg-white/8 px-2 py-1 rounded-lg"><Mail className="w-3 h-3 text-gray-400" />{c.ai_entities.email}</span>}
                          {c.ai_entities.phone && <span className="flex items-center gap-1 text-xs bg-gray-100 dark:bg-white/8 px-2 py-1 rounded-lg"><Phone className="w-3 h-3 text-gray-400" />{c.ai_entities.phone}</span>}
                          {c.ai_entities.product_interest && <span className="text-xs bg-gray-100 dark:bg-white/8 px-2 py-1 rounded-lg">{c.ai_entities.product_interest}</span>}
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
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{l.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{l.source_platform} · {timeAgo(l.created_at)}</p>
                      </div>
                      {l.lead_score && (
                        <span className="text-xs font-semibold px-2 py-1 rounded-full"
                          style={{ background: `${P_COLORS[l.lead_score]}20`, color: P_COLORS[l.lead_score] }}>
                          {l.lead_score} score
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
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
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t.title}</p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: `${P_COLORS[t.priority] ?? '#9ca3af'}20`, color: P_COLORS[t.priority] ?? '#9ca3af' }}>
                          {t.priority}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400">
                          {t.status}
                        </span>
                      </div>
                    </div>
                    {t.contact && (
                      <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 rounded-xl p-3">
                        <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-gray-800 dark:text-gray-200">{t.contact.name}</p>
                          {t.contact.email && <p className="text-[11px] text-gray-400">{t.contact.email}</p>}
                        </div>
                      </div>
                    )}
                    {t.description && (
                      <div className="bg-orange-50/60 dark:bg-orange-500/8 border border-orange-200/60 dark:border-orange-500/20 rounded-xl p-3.5">
                        <p className="text-[11px] text-orange-600 dark:text-orange-400 font-semibold mb-1 uppercase tracking-wide">Description</p>
                        <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">{t.description}</p>
                      </div>
                    )}
                  </>
                )
              })()}

              {/* Action done feedback */}
              {actionDone && (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 rounded-xl px-4 py-3">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {actionDone === 'contact' ? 'Contact created successfully.' : 'Ticket created successfully.'}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer actions */}
        {!loading && data && (
          <div className="px-5 py-4 border-t dark:border-white/10 shrink-0 flex flex-wrap items-center gap-2">
            {/* Primary navigation link */}
            <Link
              href={popup.kind === 'email' ? '/sage/emails' : popup.kind === 'bot' ? `/conversations/${popup.id}` : popup.kind === 'form' ? '/forms/leads' : '/sage/tickets'}
              className="flex items-center gap-1.5 text-xs font-medium text-[#61c2ad] hover:text-[#4fa898] transition-colors"
              onClick={onClose}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {popup.kind === 'email' ? 'Open in Inbox' : popup.kind === 'bot' ? 'View Conversation' : popup.kind === 'form' ? 'View in Leads' : 'View Ticket'}
            </Link>

            {/* Create actions when Sage Auto is OFF */}
            {!sageAuto && !actionDone && (
              <>
                <span className="text-gray-300 dark:text-white/15">·</span>
                <button
                  disabled={actionBusy}
                  onClick={() => {
                    if (popup.kind === 'email') {
                      const e = data as SageEmail
                      createContact(e.ai_entities?.name ?? e.from_name ?? e.from_address, e.ai_entities?.email ?? e.from_address, null, e.ai_entities?.company)
                    } else if (popup.kind === 'bot') {
                      const c = data as Conversation
                      createContact(c.ai_entities?.name ?? c.title ?? 'Contact', c.ai_entities?.email, c.ai_entities?.phone)
                    } else if (popup.kind === 'form') {
                      const l = data as Lead
                      createContact(l.name, l.email, l.phone, l.company)
                    } else {
                      const t = data as SageTicket & { contact: { name: string; email: string | null } | null }
                      if (t.contact) createContact(t.contact.name, t.contact.email)
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-500/20 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create Contact
                </button>

                {popup.kind !== 'form' && (
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
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-500/20 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <TicketIcon className="w-3.5 h-3.5" />
                    Create Ticket
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main dashboard component ──────────────────────────────────────────────────
export function SageDashboardClient({ workspaceId, greeting }: { workspaceId: string; greeting: string }) {
  const [dateRange,  setDateRange]  = useState<DatePreset>('today')
  const [sageAuto,   setSageAuto]   = useState(true)
  const [loading,    setLoading]    = useState(true)
  const [emails,     setEmails]     = useState<RawEmail[]>([])
  const [bots,       setBots]       = useState<RawBot[]>([])
  const [forms,      setForms]      = useState<RawLead[]>([])
  const [tickets,    setTickets]    = useState<RawTicket[]>([])
  const [tasks,      setTasks]      = useState<RawTask[]>([])
  const [popup,      setPopup]      = useState<PopupState | null>(null)
  const [doneBusy,   setDoneBusy]   = useState<string | null>(null)

  // Persist preferences
  useEffect(() => {
    const r = localStorage.getItem('sage-range')
    const a = localStorage.getItem('sage-auto')
    if (r) setDateRange(r as DatePreset)
    if (a !== null) setSageAuto(a !== 'false')
  }, [])

  const handleDateChange = (v: DatePreset) => {
    setDateRange(v)
    localStorage.setItem('sage-range', v)
  }
  const toggleSageAuto = () => {
    const next = !sageAuto
    setSageAuto(next)
    localStorage.setItem('sage-auto', String(next))
  }

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true)
    const { from, to } = getRange(dateRange)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sbAny = supabase as any

    const [eR, bR, fR, tR, xR] = await Promise.all([
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
    ])

    setEmails((eR.data ?? []) as RawEmail[])
    setBots((bR.data   ?? []) as RawBot[])
    setForms((fR.data  ?? []) as RawLead[])
    setTickets((tR.data ?? []) as RawTicket[])
    setTasks((xR.data  ?? []) as RawTask[])
    setLoading(false)
  }, [dateRange, workspaceId])

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
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()), [emails, bots, forms, tickets])

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
              { href: '/conversations',  label: 'Bot Chats',   Icon: MessageSquare,  cls: 'bg-white dark:bg-white/8 hover:bg-gray-50 dark:hover:bg-white/12 border dark:border-white/10 text-gray-700 dark:text-gray-300' },
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
          <div className="relative">
            <select value={dateRange} onChange={e => handleDateChange(e.target.value as DatePreset)}
              className="appearance-none bg-white dark:bg-[#232323] border dark:border-white/10 text-sm text-gray-700 dark:text-gray-300 rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-[#61c2ad]/40 cursor-pointer">
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
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
      {sageAuto && (
        <div className="mb-5 flex items-center gap-2 text-xs text-[#4fa898] dark:text-[#61c2ad] bg-[#61c2ad]/8 border border-[#61c2ad]/20 rounded-xl px-4 py-2.5">
          <Zap className="w-3.5 h-3.5 shrink-0" />
          <span><strong>Sage Auto is ON</strong> — AI is collecting from all channels, summarising, and automatically creating contacts &amp; updating your pipeline.</span>
        </div>
      )}

      {/* ── 4 Donut cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Emails',    sub: 'high & medium unread',  Icon: Mail,        iconCls: 'text-green-500',  segs: emailSegs,  total: emails.length  },
          { label: 'Bot Chats', sub: 'high & medium active',  Icon: MessageSquare, iconCls: 'text-blue-500', segs: botSegs,    total: bots.length    },
          { label: 'Forms',     sub: 'all submissions',       Icon: FileText,    iconCls: 'text-purple-500', segs: formSegs,   total: forms.length   },
          { label: 'Tickets',   sub: 'all tickets',           Icon: TicketIcon,  iconCls: 'text-orange-500', segs: ticketSegs, total: tickets.length },
        ].map(card => (
          <div key={card.label} className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-4 flex flex-col items-center">
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
          </div>
        ))}
      </div>

      {/* ── 2 : 1 layout ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Left: timeline */}
        <div className="xl:col-span-2 bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 flex flex-col">
          <div className="px-5 py-4 border-b dark:border-white/8 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Activity Feed</h2>
            <div className="flex items-center gap-3 text-[11px] text-gray-400">
              <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{emails.length}</span>
              <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{bots.length}</span>
              <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{forms.length}</span>
              <span className="flex items-center gap-1"><TicketIcon className="w-3 h-3" />{tickets.length}</span>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24"><RefreshCw className="w-5 h-5 text-gray-300 animate-spin" /></div>
          ) : timeline.length === 0 ? (
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
                      className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors cursor-pointer">
                      <PriorityDot priority={e.ai_priority ?? 'low'} pulse={e.ai_priority === 'high'} />
                      <div className="w-5 h-5 rounded-md bg-green-100 dark:bg-green-500/15 flex items-center justify-center shrink-0">
                        <Mail className="w-3 h-3 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{e.from_name ?? e.from_address}</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{e.subject}</p>
                        {e.ai_summary && <p className="text-[10px] text-gray-400 italic truncate mt-0.5">{e.ai_summary}</p>}
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0">{timeLabel}</span>
                    </div>
                  )
                }
                if (item.kind === 'bot') {
                  const b = item.data
                  return (
                    <div key={timeKey} onClick={() => setPopup({ kind: 'bot', id: b.id })}
                      className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors cursor-pointer">
                      <PriorityDot priority={b.ai_priority ?? 'low'} pulse={b.ai_priority === 'high'} />
                      <div className="w-5 h-5 rounded-md bg-blue-100 dark:bg-blue-500/15 flex items-center justify-center shrink-0">
                        <MessageSquare className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{b.title ?? 'Untitled conversation'}</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                          {b.bot?.name && <span className="font-medium">{b.bot.name} · </span>}{b.message_count} msgs
                        </p>
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0">{timeLabel}</span>
                    </div>
                  )
                }
                if (item.kind === 'form') {
                  const f = item.data
                  return (
                    <div key={timeKey} onClick={() => setPopup({ kind: 'form', id: f.id })}
                      className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors cursor-pointer">
                      <PriorityDot priority={f.lead_score ?? 'low'} />
                      <div className="w-5 h-5 rounded-md bg-purple-100 dark:bg-purple-500/15 flex items-center justify-center shrink-0">
                        <FileText className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{f.name}</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{f.company ?? f.email ?? f.source_platform}</p>
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0">{timeLabel}</span>
                    </div>
                  )
                }
                if (item.kind === 'ticket') {
                  const t = item.data
                  return (
                    <div key={timeKey} onClick={() => setPopup({ kind: 'ticket', id: t.id })}
                      className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors cursor-pointer">
                      <PriorityDot priority={t.priority} pulse={t.priority === 'high' || t.priority === 'urgent'} />
                      <div className="w-5 h-5 rounded-md bg-orange-100 dark:bg-orange-500/15 flex items-center justify-center shrink-0">
                        <TicketIcon className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{t.title}</p>
                        {t.contact && <p className="text-[11px] text-gray-500 dark:text-gray-400">{t.contact.name}</p>}
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0">{timeLabel}</span>
                    </div>
                  )
                }
                return null
              })}
            </div>
          )}
        </div>

        {/* Right: pending tasks */}
        <div className="xl:col-span-1 bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 flex flex-col">
          <div className="px-5 py-4 border-b dark:border-white/8 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-[#61c2ad]" />
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Pending Tasks</h2>
            </div>
            {tasks.length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#61c2ad]/10 text-[#61c2ad]">{tasks.length}</span>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24"><RefreshCw className="w-5 h-5 text-gray-300 animate-spin" /></div>
          ) : tasks.length === 0 ? (
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
                  <div key={task.id} className="flex items-start gap-0 px-5 py-3.5 group hover:bg-gray-50 dark:hover:bg-white/3 transition-colors">
                    <Link href={pipelineUrl} className="flex-1 min-w-0 pr-2">
                      <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-[#61c2ad] transition-colors">
                        {task.title ?? 'Untitled task'}
                      </p>
                      {task.deal && (
                        <p className="text-[11px] text-[#61c2ad] truncate mt-0.5">{task.deal.title}</p>
                      )}
                      {task.body && (
                        <p className="text-[10px] text-gray-400 italic truncate mt-0.5">{task.body}</p>
                      )}
                      {task.due_at && (
                        <span className={`flex items-center gap-1 text-[10px] font-medium mt-1 ${overdue(task.due_at) ? 'text-red-500' : 'text-gray-400'}`}>
                          <Calendar className="w-2.5 h-2.5" />
                          {new Date(task.due_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {overdue(task.due_at) && ' · overdue'}
                        </span>
                      )}
                    </Link>
                    {/* Done button */}
                    <button
                      onClick={e => markTaskDone(task.id, e)}
                      disabled={doneBusy === task.id}
                      title="Mark as done"
                      className="shrink-0 p-1.5 rounded-lg text-gray-300 dark:text-gray-600 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors disabled:opacity-50 mt-0.5"
                    >
                      {doneBusy === task.id
                        ? <RefreshCw className="w-4 h-4 animate-spin" />
                        : <CheckCircle2 className="w-4 h-4" />}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
