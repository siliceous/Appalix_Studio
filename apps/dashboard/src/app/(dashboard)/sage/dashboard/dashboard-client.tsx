'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { PieChart, Pie, Cell, Tooltip } from 'recharts'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  Mail, MessageSquare, FileText, Ticket as TicketIcon,
  Plus, Kanban, CheckSquare, Zap, RefreshCw, Calendar,
  ChevronDown, X, ExternalLink, CheckCircle2, User,
  Phone, Building2, Sparkles, LayoutList, LayoutGrid,
  Send, Reply, Loader2,
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignJustify, List, ListOrdered, Paperclip,
  Palette, Highlighter, FileSignature, Type,
} from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import { sendEmail, scheduleMeetingFromEmail, getEmailSignature } from '@/app/actions/sage-emails'
import { updateAutoSetting, dismissFeedItem } from '@/app/actions/sage-auto-settings'
import { getWorkspacePipelines, dashboardAddLead, dashboardAddTicket, batchMatchContacts } from '@/app/actions/sage-triage'
import type { ContactMatch } from '@/app/actions/sage-triage'
import type { SageEmail, Conversation, Lead, SageTicket } from '@/lib/types'

// ── Types ─────────────────────────────────────────────────────────────────────
type DatePreset = 'today' | 'yesterday' | '7d' | '30d' | 'custom'

interface RawEmail   { id: string; from_name: string | null; from_address: string; subject: string; received_at: string; ai_priority: string | null; ai_summary: string | null; ai_entities?: Record<string, string> | null }
interface RawBot     { id: string; title: string | null; platform: string | null; message_count: number; last_activity_at: string; ai_priority: string | null; bot: { name: string } | null; ai_entities?: Record<string, string> | null }
interface RawLead    { id: string; name: string; email: string | null; phone: string | null; company: string | null; lead_score: string | null; source_platform: string; created_at: string }
interface RawTicket  { id: string; title: string; priority: string; status: string; created_at: string; contact: { name: string; email: string | null; phone: string | null } | null }
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
  popup, pipelines, contactMatch, onClose, onAction,
}: {
  popup: PopupState
  pipelines: { id: string; name: string }[]
  contactMatch: ContactMatch | null | undefined
  onClose: () => void
  onAction: (extra?: Array<{ kind: string; id: string }>) => void
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData]               = useState<any>(null)
  const [loading, setLoading]         = useState(true)
  const [actionBusy, setActionBusy]   = useState(false)
  const [postAction, setPostAction]   = useState<'deal_added' | 'ticket_added' | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [showPipelinePicker, setShowPipelinePicker] = useState(false)
  const [ignoring, setIgnoring]       = useState(false)

  // Reply compose state (email only)
  const [showReply, setShowReply]       = useState(false)
  const [replyBody, setReplyBody]       = useState('')
  const [emailSignature, setEmailSignature] = useState<string | null>(null)
  const [sending, setSending]           = useState(false)
  const [sendResult, setSendResult]     = useState<string | null>(null)
  const [showCc, setShowCc]             = useState(false)
  const [showBcc, setShowBcc]           = useState(false)
  const [ccValue, setCcValue]           = useState('')
  const [bccValue, setBccValue]         = useState('')
  const replyRef    = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [fontOpen,  setFontOpen]  = useState(false)
  const [colorOpen, setColorOpen] = useState(false)
  const [hlOpen,    setHlOpen]    = useState(false)

  const FONTS = [
    { label: 'Georgia',          execName: 'Georgia' },
    { label: 'Arial',            execName: 'Arial' },
    { label: 'Times New Roman',  execName: 'Times New Roman' },
    { label: 'Courier New',      execName: 'Courier New' },
    { label: 'Trebuchet MS',     execName: 'Trebuchet MS' },
    { label: 'Verdana',          execName: 'Verdana' },
  ]
  const TEXT_COLORS      = ['#ffffff','#111827','#6b7280','#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899']
  const HIGHLIGHT_COLORS = ['#fef08a','#bbf7d0','#bfdbfe','#fce7f3','#fed7aa','#e0e7ff','transparent']

  function execFormat(cmd: string, val?: string) {
    document.execCommand(cmd, false, val ?? undefined)
  }

  function applyFont(name: string) {
    replyRef.current?.focus()
    document.execCommand('fontName', false, name)
    setFontOpen(false)
  }

  function applyColor(color: string) {
    replyRef.current?.focus()
    document.execCommand('foreColor', false, color)
    setColorOpen(false)
  }

  function applyHighlight(color: string) {
    replyRef.current?.focus()
    document.execCommand('hiliteColor', false, color === 'transparent' ? 'transparent' : color)
    setHlOpen(false)
  }

  function insertSignature() {
    if (!replyRef.current) return
    replyRef.current.focus()
    if (emailSignature) {
      document.execCommand('insertHTML', false,
        `<br><hr style="border:none;border-top:1px solid #e5e7eb;margin:12px 0;" />${emailSignature}`)
    } else {
      document.execCommand('insertText', false, '\n\n— \nBest regards')
    }
  }

  function handleFileChange(ev: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(ev.target.files ?? [])
    if (files.length) setAttachedFiles(prev => [...prev, ...files])
    ev.target.value = ''
  }

  // Fetch connected email signature once for this popup
  useEffect(() => {
    if (popup.kind !== 'email') return
    getEmailSignature().then(({ html }) => { if (html) setEmailSignature(html) })
  }, [popup.kind])

  // Populate contentEditable with AI draft + signature when reply opens
  useEffect(() => {
    if (!showReply || !replyRef.current) return
    if (replyRef.current.innerText.trim()) return   // already has content
    const draftHtml = replyBody ? replyBody.replace(/\n/g, '<br>') : ''
    const sigHtml   = emailSignature
      ? `<br><br><hr style="border:none;border-top:1px solid #e5e7eb;margin:12px 0;" />${emailSignature}`
      : ''
    replyRef.current.innerHTML = draftHtml + sigHtml
  }, [showReply])

  // Escape to close
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  // Fetch full item
  useEffect(() => {
    setData(null); setLoading(true); setPostAction(null); setActionError(null); setShowReply(false); setSendResult(null); setShowPipelinePicker(false); setIgnoring(false)
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
          .select('id, title, description, priority, status, created_at, contact:sage_contacts(name, email, phone)')
          .eq('id', popup.id).single()
        setData(d)
      }
      setLoading(false)
    }
    go()
  }, [popup.id, popup.kind])

  async function handleAddLead(pipelineId: string) {
    setActionBusy(true); setShowPipelinePicker(false)
    const src = popup.kind === 'ticket' ? 'email' : popup.kind as 'email' | 'bot' | 'form'
    let name = '', email: string | null = null, phone: string | null = null,
        company: string | null = null, interest: string | null = null, conversationId: string | null = null

    if (popup.kind === 'email') {
      const e = data as SageEmail
      name  = e.ai_entities?.name ?? e.from_name ?? e.from_address
      email = e.ai_entities?.email ?? e.from_address
      phone = e.ai_entities?.phone ?? null
      company  = e.ai_entities?.company ?? null
      interest = e.ai_entities?.product_interest ?? null
    } else if (popup.kind === 'bot') {
      const c = data as Conversation
      name  = (c as any).ai_entities?.name ?? c.title ?? 'Contact'
      email = (c as any).ai_entities?.email ?? null
      phone = (c as any).ai_entities?.phone ?? null
      company  = (c as any).ai_entities?.company ?? null
      interest = (c as any).ai_entities?.product_interest ?? null
      conversationId = c.id
    } else if (popup.kind === 'form') {
      const l = data as Lead
      name  = l.name; email = l.email ?? null; phone = l.phone ?? null
      company  = l.company ?? null; interest = l.campaign_name ?? null
    } else if (popup.kind === 'ticket') {
      const t = data as any
      name  = t.contact?.name ?? t.title
      email = t.contact?.email ?? null
      phone = t.contact?.phone ?? null
    }

    const result = await dashboardAddLead({ name, email, phone, company, interest, source: src, conversationId, pipelineId })
    setActionBusy(false)
    if (result.error) { setActionError(result.error); return }
    onAction()
    setPostAction('deal_added')
  }

  function triggerAddLead() {
    if (pipelines.length === 0) { setActionError('No pipelines found. Create one first.'); return }
    if (pipelines.length === 1) { handleAddLead(pipelines[0].id); return }
    setShowPipelinePicker(true)
  }

  // Hard-coded dedup: email → name → phone (cannot be overwritten)
  // If existing open ticket found → log activity, no duplicate created
  async function handleAddTicket() {
    setActionBusy(true)
    let name = '', email: string | null = null, phone: string | null = null,
        title = '', desc: string | null = null, priority = 'medium'
    const src = popup.kind as 'email' | 'bot' | 'form' | 'ticket'

    if (popup.kind === 'email') {
      const e = data as SageEmail
      name  = e.ai_entities?.name ?? e.from_name ?? e.from_address
      email = e.ai_entities?.email ?? e.from_address
      phone = e.ai_entities?.phone ?? null
      title = e.subject; desc = e.ai_summary ?? null; priority = e.ai_priority ?? 'medium'
    } else if (popup.kind === 'bot') {
      const c = data as Conversation
      name  = (c as any).ai_entities?.name ?? c.title ?? 'Contact'
      email = (c as any).ai_entities?.email ?? null
      phone = (c as any).ai_entities?.phone ?? null
      title = c.title ?? 'Support ticket'; desc = (c as any).ai_summary ?? null; priority = (c as any).ai_priority ?? 'medium'
    } else if (popup.kind === 'form') {
      const l = data as Lead
      name = l.name; email = l.email ?? null; phone = l.phone ?? null
      title = `Form: ${l.name}`; priority = l.lead_score ?? 'medium'
    } else if (popup.kind === 'ticket') {
      const t = data as any
      name = t.contact?.name ?? t.title; email = t.contact?.email ?? null; phone = t.contact?.phone ?? null
      title = t.title; desc = t.description ?? null; priority = t.priority ?? 'medium'
    }

    const result = await dashboardAddTicket({ name, email, phone, title, description: desc, priority, source: src })
    setActionBusy(false)
    if (result.error) { setActionError(result.error); return }
    const extra = result.ticketId ? [{ kind: 'ticket', id: result.ticketId }] : []
    onAction(extra)
    setPostAction('ticket_added')
  }

  function handleIgnore() {
    setIgnoring(true)
    setTimeout(() => { onClose() }, 2000)
  }

  async function handleSendReply() {
    const html = replyRef.current?.innerHTML ?? ''
    const text = replyRef.current?.innerText?.trim() ?? ''
    if (!data || !text) return
    setSending(true); setSendResult(null)
    const e = data as SageEmail
    const result = await sendEmail({
      to: e.from_address,
      subject: `Re: ${e.subject}`,
      body: html,
      replyToEmailId: e.id,
    })
    setSending(false)
    const resultStr = result.ok ? 'sent' : (result.error ?? 'error')
    setSendResult(resultStr)
    if (result.ok) { onAction(); setTimeout(() => onClose(), 3000) }
  }

const iconCls = { email: 'bg-blue-200 dark:bg-blue-500/30', bot: 'bg-purple-200 dark:bg-purple-500/30', form: 'bg-green-200 dark:bg-green-500/30', ticket: 'bg-amber-100 dark:bg-amber-500/25' }[popup.kind]
  const Icon    = { email: Mail, bot: MessageSquare, form: FileText, ticket: TicketIcon }[popup.kind]
  const iconCol = { email: 'text-blue-700 dark:text-blue-300', bot: 'text-purple-700 dark:text-purple-300', form: 'text-green-700 dark:text-green-300', ticket: 'text-amber-700 dark:text-amber-400' }[popup.kind]
  const label   = { email: 'Email Summary', bot: 'Chat Summary', form: 'Lead Details', ticket: 'Ticket Summary' }[popup.kind]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:px-6 sm:py-8 bg-black/55 dark:bg-black/70"
      onClick={onClose}>
      <div className="relative w-full sm:max-w-2xl bg-white dark:bg-[#2a2a2a] rounded-t-2xl sm:rounded-2xl shadow-2xl border-t sm:border dark:border-white/12 h-[96vh] sm:h-[calc(100vh-64px)] flex flex-col"
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
              showReply ? (
                <Link
                  href="/sage/pipelines"
                  onClick={onClose}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                >
                  <Kanban className="w-3.5 h-3.5" />
                  Open Pipeline
                </Link>
              ) : (
                <button
                  onClick={() => setShowReply(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#2a7d6e] hover:bg-[#1f6157] text-white transition-colors"
                >
                  <Reply className="w-3.5 h-3.5" />
                  Reply
                </button>
              )
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8 transition-colors">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className={`${popup.kind === 'email' && showReply ? 'overflow-hidden' : 'overflow-y-auto'} flex-1 px-6 py-5 flex flex-col gap-4`}>
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
                  <div className={showReply ? 'flex-1 flex flex-col gap-4 min-h-0' : 'flex flex-col gap-4'}>
                    {/* From / Subject row */}
                    <div className="flex items-start gap-4">
                      <div className="w-9 h-9 rounded-full bg-blue-200 dark:bg-blue-500/30 flex items-center justify-center shrink-0 text-xs font-bold text-blue-700 dark:text-blue-300">
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
                      <div className="bg-blue-50 dark:bg-blue-500/20 border border-blue-200 dark:border-blue-500/30 rounded-xl p-4">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Sparkles className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                          <p className="text-[11px] text-blue-700 dark:text-blue-300 font-bold uppercase tracking-wide">AI Summary</p>
                        </div>
                        <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{e.ai_summary}</p>
                      </div>
                    )}

                    {/* Contact details — always shown for email (sender + any AI-extracted extras) */}
                    {!showReply && (
                      <div>
                        <p className="text-xs text-gray-400 mb-2">Contact details</p>
                        <div className="flex flex-wrap gap-2">
                          <span className="flex items-center gap-1.5 text-xs bg-gray-100 dark:bg-white/8 px-2.5 py-1.5 rounded-lg text-gray-700 dark:text-gray-300">
                            <User className="w-3 h-3 text-gray-400" />{e.ai_entities?.name ?? e.from_name ?? e.from_address}
                          </span>
                          <span className="flex items-center gap-1.5 text-xs bg-gray-100 dark:bg-white/8 px-2.5 py-1.5 rounded-lg text-gray-700 dark:text-gray-300">
                            <Mail className="w-3 h-3 text-gray-400" />{e.ai_entities?.email ?? e.from_address}
                          </span>
                          {e.ai_entities?.phone   && <span className="flex items-center gap-1.5 text-xs bg-gray-100 dark:bg-white/8 px-2.5 py-1.5 rounded-lg text-gray-700 dark:text-gray-300"><Phone className="w-3 h-3 text-gray-400" />{e.ai_entities.phone}</span>}
                          {e.ai_entities?.company && <span className="flex items-center gap-1.5 text-xs bg-gray-100 dark:bg-white/8 px-2.5 py-1.5 rounded-lg text-gray-700 dark:text-gray-300"><Building2 className="w-3 h-3 text-gray-400" />{e.ai_entities.company}</span>}
                          {e.ai_entities?.product_interest && <span className="text-xs bg-gray-100 dark:bg-white/8 px-2.5 py-1.5 rounded-lg text-gray-700 dark:text-gray-300">{e.ai_entities.product_interest}</span>}
                        </div>
                      </div>
                    )}

                    {/* Key Insights — visible only when reply compose is NOT open */}
                    {!showReply && (e.ai_insights ?? []).length > 0 && (
                      <div className="bg-gray-50 dark:bg-white/[0.07] border border-gray-100 dark:border-white/10 rounded-xl p-4">
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2.5">Key Insights</p>
                        <ul className="space-y-2">
                          {(e.ai_insights ?? []).map((ins: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0" />{ins}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Inline Reply compose — sits right after AI Summary */}
                    {showReply && (
                      <div className="rounded-2xl border dark:border-white/10 overflow-hidden bg-white dark:bg-[#1e1e1e] flex-1 flex flex-col min-h-0">
                        {/* Compose header — To row */}
                        <div className="flex items-center gap-2 px-4 py-2.5 border-b dark:border-white/8 bg-gray-50 dark:bg-white/5">
                          <Reply className="w-3.5 h-3.5 text-[#61c2ad] shrink-0" />
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 shrink-0">To:</span>
                          <span className="text-xs text-gray-600 dark:text-gray-300 flex-1 truncate">{e.from_name ?? e.from_address}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => setShowCc(v => !v)}
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${showCc ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8'}`}>
                              CC
                            </button>
                            <button onClick={() => setShowBcc(v => !v)}
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${showBcc ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8'}`}>
                              BCC
                            </button>
                          </div>
                          <button onClick={() => setShowReply(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors shrink-0">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {/* CC row */}
                        {showCc && (
                          <div className="flex items-center gap-2 px-4 py-2 border-b dark:border-white/8 bg-gray-50 dark:bg-white/5">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-7 shrink-0">CC:</span>
                            <input
                              type="email"
                              value={ccValue}
                              onChange={ev => setCcValue(ev.target.value)}
                              placeholder="Add CC recipients…"
                              className="flex-1 text-xs bg-transparent text-gray-700 dark:text-gray-200 placeholder-gray-400 outline-none"
                            />
                          </div>
                        )}
                        {/* BCC row */}
                        {showBcc && (
                          <div className="flex items-center gap-2 px-4 py-2 border-b dark:border-white/8 bg-gray-50 dark:bg-white/5">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-7 shrink-0">BCC:</span>
                            <input
                              type="email"
                              value={bccValue}
                              onChange={ev => setBccValue(ev.target.value)}
                              placeholder="Add BCC recipients…"
                              className="flex-1 text-xs bg-transparent text-gray-700 dark:text-gray-200 placeholder-gray-400 outline-none"
                            />
                          </div>
                        )}
                        {/* Formatting toolbar */}
                        <div className="border-b dark:border-white/8 bg-gray-50 dark:bg-white/[0.03]">
                          {/* ── Main toolbar row ── */}
                          <div className="flex items-center flex-wrap gap-0.5 px-3 py-1.5">

                            {/* Font picker toggle */}
                            <button title="Font" onMouseDown={ev => { ev.preventDefault(); setFontOpen(v => !v); setColorOpen(false); setHlOpen(false) }}
                              className={`flex items-center gap-1 px-1.5 py-1 rounded text-[11px] font-medium transition-colors ${fontOpen ? 'bg-gray-200 dark:bg-white/15 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white'}`}>
                              <Type className="w-3.5 h-3.5" />
                              <span>Font</span>
                              <ChevronDown className="w-3 h-3" />
                            </button>

                            <div className="w-px h-4 bg-gray-200 dark:bg-white/10 mx-0.5" />

                            {/* Bold / Italic / Underline / Strikethrough */}
                            {([
                              { cmd: 'bold',          Icon: Bold,          title: 'Bold' },
                              { cmd: 'italic',        Icon: Italic,        title: 'Italic' },
                              { cmd: 'underline',     Icon: Underline,     title: 'Underline' },
                              { cmd: 'strikeThrough', Icon: Strikethrough, title: 'Strikethrough' },
                            ] as const).map(({ cmd, Icon, title }) => (
                              <button key={cmd} title={title} onMouseDown={ev => { ev.preventDefault(); execFormat(cmd) }}
                                className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                                <Icon className="w-3.5 h-3.5" />
                              </button>
                            ))}

                            <div className="w-px h-4 bg-gray-200 dark:bg-white/10 mx-0.5" />

                            {/* Text color toggle */}
                            <button title="Text color" onMouseDown={ev => { ev.preventDefault(); setColorOpen(v => !v); setFontOpen(false); setHlOpen(false) }}
                              className={`p-1.5 rounded transition-colors ${colorOpen ? 'bg-gray-200 dark:bg-white/15 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white'}`}>
                              <Palette className="w-3.5 h-3.5" />
                            </button>

                            {/* Highlight toggle */}
                            <button title="Highlight" onMouseDown={ev => { ev.preventDefault(); setHlOpen(v => !v); setFontOpen(false); setColorOpen(false) }}
                              className={`p-1.5 rounded transition-colors ${hlOpen ? 'bg-gray-200 dark:bg-white/15 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white'}`}>
                              <Highlighter className="w-3.5 h-3.5" />
                            </button>

                            <div className="w-px h-4 bg-gray-200 dark:bg-white/10 mx-0.5" />

                            {/* Lists */}
                            <button title="Bullet list" onMouseDown={ev => { ev.preventDefault(); execFormat('insertUnorderedList') }}
                              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                              <List className="w-3.5 h-3.5" />
                            </button>
                            <button title="Numbered list" onMouseDown={ev => { ev.preventDefault(); execFormat('insertOrderedList') }}
                              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                              <ListOrdered className="w-3.5 h-3.5" />
                            </button>

                            <div className="w-px h-4 bg-gray-200 dark:bg-white/10 mx-0.5" />

                            {/* Alignment */}
                            <button title="Align left" onMouseDown={ev => { ev.preventDefault(); execFormat('justifyLeft') }}
                              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                              <AlignLeft className="w-3.5 h-3.5" />
                            </button>
                            <button title="Justify" onMouseDown={ev => { ev.preventDefault(); execFormat('justifyFull') }}
                              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                              <AlignJustify className="w-3.5 h-3.5" />
                            </button>

                            <div className="w-px h-4 bg-gray-200 dark:bg-white/10 mx-0.5" />

                            {/* Signature */}
                            <button title="Insert signature" onMouseDown={ev => { ev.preventDefault(); insertSignature() }}
                              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                              <FileSignature className="w-3.5 h-3.5" />
                            </button>

                            {/* Attach */}
                            <button title="Attach file" onMouseDown={ev => { ev.preventDefault(); fileInputRef.current?.click() }}
                              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                              <Paperclip className="w-3.5 h-3.5" />
                            </button>

                            {/* Calendar */}
                            <button title="Schedule meeting — logs to CRM & opens Google Calendar" onMouseDown={async ev => {
                              ev.preventDefault()
                              const result = await scheduleMeetingFromEmail({
                                emailId:     e.id,
                                subject:     e.subject ?? '(no subject)',
                                fromAddress: e.from_address,
                                fromName:    e.from_name,
                              })
                              if (result.ok) window.open(result.calendarUrl, '_blank')
                            }}
                              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                              <Calendar className="w-3.5 h-3.5" />
                            </button>

                          </div>

                          {/* ── Font picker panel ── */}
                          {fontOpen && (
                            <div className="px-3 py-2 border-t dark:border-white/8 flex flex-wrap gap-1">
                              {FONTS.map(f => (
                                <button key={f.execName} onMouseDown={ev => { ev.preventDefault(); applyFont(f.execName) }}
                                  className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                                  style={{ fontFamily: f.execName }}>
                                  {f.label}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* ── Text color panel ── */}
                          {colorOpen && (
                            <div className="px-3 py-2 border-t dark:border-white/8">
                              <p className="text-[10px] text-gray-400 mb-1.5 uppercase tracking-wide font-semibold">Text color</p>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {TEXT_COLORS.map(c => (
                                  <button key={c} onMouseDown={ev => { ev.preventDefault(); applyColor(c) }}
                                    className="w-5 h-5 rounded-full border-2 shadow-sm hover:scale-110 transition-transform"
                                    style={{ background: c, borderColor: c === '#ffffff' ? '#d1d5db' : undefined }} />
                                ))}
                              </div>
                            </div>
                          )}

                          {/* ── Highlight panel ── */}
                          {hlOpen && (
                            <div className="px-3 py-2 border-t dark:border-white/8">
                              <p className="text-[10px] text-gray-400 mb-1.5 uppercase tracking-wide font-semibold">Highlight color</p>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {HIGHLIGHT_COLORS.map(c => (
                                  <button key={c} onMouseDown={ev => { ev.preventDefault(); applyHighlight(c) }}
                                    className="w-5 h-5 rounded-full border-2 border-gray-200 dark:border-white/20 hover:scale-110 transition-transform"
                                    style={{ background: c === 'transparent' ? 'transparent' : c }}
                                    title={c === 'transparent' ? 'Remove highlight' : c}>
                                    {c === 'transparent' && <X className="w-3 h-3 text-gray-400 m-auto" />}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Hidden file input */}
                        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />

                        {/* Editable body */}
                        <div
                          ref={replyRef}
                          contentEditable
                          suppressContentEditableWarning
                          onInput={() => setReplyBody(replyRef.current?.innerText ?? '')}
                          data-placeholder="Write your reply…"
                          className="flex-1 min-h-0 overflow-y-auto px-5 py-4 text-sm text-gray-800 dark:text-gray-200 leading-relaxed outline-none [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-gray-400"
                          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                        />

                        {/* Attached files */}
                        {attachedFiles.length > 0 && (
                          <div className="px-4 py-2 border-t dark:border-white/8 flex flex-wrap gap-2">
                            {attachedFiles.map((f, i) => (
                              <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/8 text-xs text-gray-600 dark:text-gray-300">
                                <Paperclip className="w-3 h-3 text-gray-400" />
                                <span className="max-w-[140px] truncate">{f.name}</span>
                                <button onMouseDown={ev => { ev.preventDefault(); setAttachedFiles(prev => prev.filter((_, j) => j !== i)) }}
                                  className="text-gray-400 hover:text-red-500 transition-colors ml-0.5">
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}


                  </div>
                )
              })()}

              {/* ── Bot chat popup ── */}
              {popup.kind === 'bot' && (() => {
                const c = data as Conversation & { bot: { name: string } | null }
                return (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-purple-200 dark:bg-purple-500/30 flex items-center justify-center shrink-0 text-xs font-bold text-purple-700 dark:text-purple-300">
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
                      <div className="bg-purple-50 dark:bg-purple-500/20 border border-purple-200 dark:border-purple-500/30 rounded-xl p-4">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Sparkles className="w-3 h-3 text-purple-500 dark:text-purple-400" />
                          <p className="text-[11px] text-purple-700 dark:text-purple-300 font-bold uppercase tracking-wide">AI Summary</p>
                        </div>
                        <p className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed">{c.ai_summary}</p>
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
                const t = data as SageTicket & { contact: { name: string; email: string | null; phone: string | null } | null }
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
                      <div>
                        <p className="text-xs text-gray-400 mb-2">Contact details extracted</p>
                        <div className="flex flex-wrap gap-2">
                          <span className="flex items-center gap-1.5 text-xs bg-gray-100 dark:bg-white/8 px-2.5 py-1.5 rounded-lg text-gray-700 dark:text-gray-300"><User className="w-3 h-3 text-gray-400" />{t.contact.name}</span>
                          {t.contact.email && <span className="flex items-center gap-1.5 text-xs bg-gray-100 dark:bg-white/8 px-2.5 py-1.5 rounded-lg text-gray-700 dark:text-gray-300"><Mail className="w-3 h-3 text-gray-400" />{t.contact.email}</span>}
                          {t.contact.phone && <span className="flex items-center gap-1.5 text-xs bg-gray-100 dark:bg-white/8 px-2.5 py-1.5 rounded-lg text-gray-700 dark:text-gray-300"><Phone className="w-3 h-3 text-gray-400" />{t.contact.phone}</span>}
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

              {/* Error feedback */}
              {actionError && (
                <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-xl px-4 py-3">
                  <X className="w-4 h-4 shrink-0" />
                  {actionError}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer actions */}
        {!loading && data && (
          <div className="px-6 py-4 border-t dark:border-white/10 shrink-0">

            {/* Pipeline picker */}
            {showPipelinePicker && (
              <div className="mb-3">
                <p className="text-xs text-gray-400 mb-2">Choose a pipeline:</p>
                <div className="flex flex-wrap gap-2">
                  {pipelines.map(p => (
                    <button key={p.id} disabled={actionBusy} onClick={() => handleAddLead(p.id)}
                      className="px-3 py-1.5 text-xs font-semibold bg-[#2a7d6e] hover:bg-[#1f6157] text-white rounded-xl transition-colors disabled:opacity-50">
                      {actionBusy ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null}{p.name}
                    </button>
                  ))}
                  <button onClick={() => setShowPipelinePicker(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/8 hover:bg-gray-200 dark:hover:bg-white/12 rounded-xl transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">

              {/* ── Reply compose footer ── */}
              {showReply ? (
                sendResult === 'sent' ? (
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-[#61c2ad]">
                    <CheckCircle2 className="w-4 h-4" /> Reply sent
                  </p>
                ) : (
                  <>
                    <div className="flex-1" />
                    <button onClick={handleSendReply} disabled={sending || !replyBody.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#2a7d6e] hover:bg-[#1f6157] text-white rounded-xl transition-colors disabled:opacity-50">
                      {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      {sending ? 'Sending…' : 'Send'}
                    </button>
                  </>
                )

              /* ── Post-deal or post-ticket: Reply + Ignore ── */
              ) : postAction ? (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#61c2ad] font-semibold">
                      {postAction === 'deal_added' ? 'Deal added to pipeline.' : 'Ticket created.'}
                    </p>
                    {ignoring && <p className="text-[11px] text-gray-400 mt-0.5">Closing…</p>}
                  </div>
                  {!ignoring && popup.kind === 'email' && (
                    <button onClick={() => setShowReply(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#2a7d6e] hover:bg-[#1f6157] text-white rounded-xl transition-colors">
                      <Reply className="w-3.5 h-3.5" /> Reply
                    </button>
                  )}
                  {!ignoring && (
                    <button onClick={handleIgnore}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/8 hover:bg-gray-200 dark:hover:bg-white/12 rounded-xl transition-colors">
                      <X className="w-3.5 h-3.5" /> Ignore
                    </button>
                  )}
                </>

              /* ── Known contact: View Contact + View/Add Deal + Reply + Ignore ── */
              ) : contactMatch !== null && contactMatch !== undefined ? (
                <>
                  <Link href={`/sage/contacts/${contactMatch.contactId}`} onClick={onClose}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/15 hover:bg-blue-100 dark:hover:bg-blue-500/25 rounded-xl transition-colors border border-blue-200/70 dark:border-blue-500/25">
                    <User className="w-3.5 h-3.5" /> View Contact
                  </Link>
                  {contactMatch.dealId ? (
                    <Link href={`/sage/deals/${contactMatch.dealId}`} onClick={onClose}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#2a7d6e] bg-[#2a7d6e]/10 hover:bg-[#2a7d6e]/20 rounded-xl transition-colors border border-[#2a7d6e]/25">
                      <Kanban className="w-3.5 h-3.5" /> View Deal
                    </Link>
                  ) : !showPipelinePicker && (
                    <button disabled={actionBusy} onClick={triggerAddLead}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#2a7d6e] hover:bg-[#1f6157] text-white rounded-xl transition-colors disabled:opacity-50">
                      {actionBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      Add Deal
                    </button>
                  )}
                  <div className="flex-1" />
                  {popup.kind === 'email' && (
                    <button onClick={() => setShowReply(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#2a7d6e] hover:bg-[#1f6157] text-white rounded-xl transition-colors">
                      <Reply className="w-3.5 h-3.5" /> Reply
                    </button>
                  )}
                  <button onClick={handleIgnore}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/8 hover:bg-gray-200 dark:hover:bg-white/12 rounded-xl transition-colors">
                    <X className="w-3.5 h-3.5" /> Ignore
                  </button>
                </>

              /* ── Unknown contact OR still checking ── */
              ) : (
                <>
                  {contactMatch === undefined ? (
                    /* Still running batch match — show subtle loading */
                    <span className="text-xs text-gray-400 flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin" /> Checking contacts…
                    </span>
                  ) : (
                    /* No match — show Add Deal + Add Ticket */
                    <>
                      {!showPipelinePicker && (
                        <button disabled={actionBusy} onClick={triggerAddLead}
                          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#2a7d6e] hover:bg-[#1f6157] text-white rounded-xl transition-colors disabled:opacity-50">
                          {actionBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                          Add Deal
                        </button>
                      )}
                      {!showPipelinePicker && popup.kind !== 'form' && (
                        <button disabled={actionBusy} onClick={handleAddTicket}
                          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/25 border border-amber-200/70 dark:border-amber-500/25 rounded-xl transition-colors disabled:opacity-50">
                          {actionBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TicketIcon className="w-3.5 h-3.5" />}
                          Add Ticket
                        </button>
                      )}
                    </>
                  )}
                  <div className="flex-1" />
                  <button onClick={handleIgnore}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-colors border dark:border-white/8">
                    <X className="w-3.5 h-3.5" /> Ignore
                  </button>
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
    return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening'
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
  const [donutsCollapsed, setDonutsCollapsed] = useState(false)
  const [pipelines, setPipelines] = useState<{ id: string; name: string }[]>([])
  const [contactMatches, setContactMatches] = useState<Record<string, ContactMatch | null | undefined>>({})
  const [showAutoDesc, setShowAutoDesc] = useState(false)
  const autoDescTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    getWorkspacePipelines().then(({ pipelines: p }) => setPipelines(p))
  }, [workspaceId])

  const handleDateChange = (v: DatePreset) => {
    setDateRange(v)
    if (v !== 'custom') localStorage.setItem('sage-range', v)
  }
  const toggleSageAuto = async () => {
    const next = !sageAuto
    setSageAuto(next)
    await updateAutoSetting('global_auto_enabled', next)
    setShowAutoDesc(true)
    if (autoDescTimer.current) clearTimeout(autoDescTimer.current)
    autoDescTimer.current = setTimeout(() => setShowAutoDesc(false), 10000)
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
        .select('id, from_name, from_address, subject, received_at, ai_priority, ai_summary, ai_entities')
        .eq('workspace_id', workspaceId).eq('direction', 'inbound').eq('is_read', false).eq('is_trashed', false)
        .in('ai_priority', ['high', 'medium']).gte('received_at', from).lte('received_at', to)
        .order('received_at', { ascending: false }),
      supabase.from('conversations')
        .select('id, title, platform, message_count, last_activity_at, ai_priority, ai_entities, bot:bots(name)')
        .eq('workspace_id', workspaceId).eq('status', 'active')
        .in('ai_priority', ['high', 'medium']).gte('last_activity_at', from).lte('last_activity_at', to)
        .order('last_activity_at', { ascending: false }),
      supabase.from('leads')
        .select('id, name, email, phone, company, lead_score, source_platform, created_at')
        .eq('workspace_id', workspaceId).gte('created_at', from).lte('created_at', to)
        .order('created_at', { ascending: false }),
      supabase.from('sage_tickets')
        .select('id, title, priority, status, created_at, contact:sage_contacts(name, email, phone)')
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

    const newEmails  = (eR.data  ?? []) as RawEmail[]
    const newBots    = (bR.data  ?? []) as RawBot[]
    const newForms   = (fR.data  ?? []) as RawLead[]
    const newTickets = (tR.data  ?? []) as RawTicket[]
    setEmails(newEmails)
    setBots(newBots)
    setForms(newForms)
    setTickets(newTickets)
    setTasks((xR.data   ?? []) as RawTask[])
    setTicketTasks((xtR.data ?? []) as RawTicketTask[])
    setLoading(false)

    // Batch contact match — runs once after feed loads, no loading spinner needed
    const matchItems = [
      ...newEmails.map(e  => ({ id: e.id, email: e.ai_entities?.email ?? e.from_address, name: e.ai_entities?.name ?? e.from_name ?? undefined, phone: e.ai_entities?.phone ?? undefined })),
      ...newBots.map(b    => ({ id: b.id, email: b.ai_entities?.email ?? undefined, name: b.ai_entities?.name ?? b.title ?? undefined, phone: b.ai_entities?.phone ?? undefined })),
      ...newForms.map(f   => ({ id: f.id, email: f.email ?? undefined, name: f.name, phone: f.phone ?? undefined })),
      ...newTickets.map(t => ({ id: t.id, email: t.contact?.email ?? undefined, name: t.contact?.name ?? undefined, phone: t.contact?.phone ?? undefined })),
    ]
    // Mark all as undefined (checking) so popup shows loading footer briefly if opened early
    setContactMatches(Object.fromEntries(matchItems.map(i => [i.id, undefined])))
    batchMatchContacts(matchItems).then(results => setContactMatches(results))
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

  // ── Visible (non-dismissed) subsets — used by both donuts and timeline ───
  const visEmails  = useMemo(() => emails.filter(e  => !dismissedIds.has(`email-${e.id}`)),   [emails,   dismissedIds])
  const visBots    = useMemo(() => bots.filter(b    => !dismissedIds.has(`bot-${b.id}`)),     [bots,     dismissedIds])
  const visForms   = useMemo(() => forms.filter(f   => !dismissedIds.has(`form-${f.id}`)),    [forms,    dismissedIds])
  const visTickets = useMemo(() => tickets.filter(t => !dismissedIds.has(`ticket-${t.id}`)), [tickets,  dismissedIds])

  // ── Donut segments (always reflect visible feed, same as triage counts) ──
  const emailSegs:  DonutSegment[] = [{ name: 'High', value: visEmails.filter(e => e.ai_priority === 'high').length, fill: P_COLORS.high }, { name: 'Medium', value: visEmails.filter(e => e.ai_priority === 'medium').length, fill: P_COLORS.medium }]
  const botSegs:    DonutSegment[] = [{ name: 'High', value: visBots.filter(b => b.ai_priority === 'high').length,   fill: P_COLORS.high }, { name: 'Medium', value: visBots.filter(b => b.ai_priority === 'medium').length,   fill: P_COLORS.medium }]
  const formSegs:   DonutSegment[] = [{ name: 'High', value: visForms.filter(f => f.lead_score === 'high').length, fill: P_COLORS.high }, { name: 'Medium', value: visForms.filter(f => f.lead_score === 'medium').length, fill: P_COLORS.medium }, { name: 'Low', value: visForms.filter(f => f.lead_score === 'low' || !f.lead_score).length, fill: P_COLORS.low }]
  const ticketSegs: DonutSegment[] = [{ name: 'High', value: visTickets.filter(t => t.priority === 'high' || t.priority === 'urgent').length, fill: P_COLORS.high }, { name: 'Medium', value: visTickets.filter(t => t.priority === 'medium').length, fill: P_COLORS.medium }, { name: 'Low', value: visTickets.filter(t => t.priority === 'low').length, fill: P_COLORS.low }]

  // ── Timeline (uses pre-filtered visible arrays) ───────────────────────────
  const timeline = useMemo<TItem[]>(() => [
    ...visEmails.map(d  => ({ kind: 'email'  as const, data: d, time: d.received_at    })),
    ...visBots.map(d    => ({ kind: 'bot'    as const, data: d, time: d.last_activity_at })),
    ...visForms.map(d   => ({ kind: 'form'   as const, data: d, time: d.created_at      })),
    ...visTickets.map(d => ({ kind: 'ticket' as const, data: d, time: d.created_at      })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()),
  [visEmails, visBots, visForms, visTickets])

  const overdue = (due: string | null) => !!due && new Date(due) < new Date()

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* AI Summary popup */}
      {popup && (
        <ItemPopup
          popup={popup}
          pipelines={pipelines}
          contactMatch={contactMatches[popup.id]}
          onClose={() => setPopup(null)}
          onAction={(extra) => {
            if (popup) {
              // Always dismiss the source feed item
              const allKeys = [
                { kind: popup.kind, id: popup.id },
                ...(extra ?? []),
              ]
              setDismissedIds(prev => {
                const next = new Set(prev)
                allKeys.forEach(k => next.add(`${k.kind}-${k.id}`))
                return next
              })
              allKeys.forEach(k => dismissFeedItem(k.kind as 'email' | 'bot' | 'form' | 'ticket', k.id))
            }
          }}
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
              { href: '/sage/contacts',  label: 'Add Contact', Icon: Plus,           cls: 'bg-[#2a7d6e] hover:bg-[#1f6157] text-white shadow-sm' },
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

        <div className="flex items-start gap-3 flex-wrap">
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

          {/* Sage Auto with description underneath */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2.5 bg-white dark:bg-[#232323] border dark:border-white/10 rounded-xl px-4 py-2">
              <Zap className={`w-3.5 h-3.5 ${sageAuto ? 'text-[#61c2ad]' : 'text-gray-400'}`} />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sage Auto</span>
              <Toggle checked={sageAuto} onChange={toggleSageAuto} />
              <span className={`text-xs font-bold ${sageAuto ? 'text-[#61c2ad]' : 'text-gray-400'}`}>
                {sageAuto ? 'ON' : 'OFF'}
              </span>
            </div>
            <p className={`text-[11px] leading-relaxed px-1 max-w-[220px] whitespace-nowrap overflow-hidden text-ellipsis transition-opacity duration-500 ${showAutoDesc ? 'opacity-100' : 'opacity-0 pointer-events-none'} ${sageAuto ? 'text-[#61c2ad]' : 'text-gray-400 dark:text-gray-500'}`}>
              {sageAuto
                ? 'AI is collecting, summarising & auto-updating your pipeline.'
                : 'AI collects & summarises. You decide the next action.'}
            </p>
          </div>
        </div>
      </div>

      {/* ── 4 Donut cards ──────────────────────────────────────────────── */}
      <div className="mb-6">
        {/* Section header with collapse toggle */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Overview</span>
          <button
            onClick={() => setDonutsCollapsed(c => !c)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${donutsCollapsed ? '-rotate-90' : ''}`} />
            {donutsCollapsed ? 'Expand' : 'Collapse'}
          </button>
        </div>

        {donutsCollapsed ? (
          /* Collapsed: compact single-row pills */
          <div className="flex flex-wrap gap-3">
            {[
              { label: 'Emails',    Icon: Mail,          iconCls: 'text-blue-500',   total: visEmails.length,  href: '/dashboard/email'   },
              { label: 'Bot Chats', Icon: MessageSquare, iconCls: 'text-purple-500', total: visBots.length,    href: '/dashboard/bots'    },
              { label: 'Forms',     Icon: FileText,      iconCls: 'text-green-500',  total: visForms.length,   href: '/dashboard/forms'   },
              { label: 'Tickets',   Icon: TicketIcon,    iconCls: 'text-amber-500',  total: visTickets.length, href: '/dashboard/tickets' },
            ].map(card => (
              <Link key={card.label} href={card.href}
                className="flex items-center gap-2 bg-white dark:bg-[#232323] border dark:border-white/8 rounded-lg px-3 py-2 hover:shadow-sm hover:border-gray-300 dark:hover:border-white/15 transition-all">
                <card.Icon className={`w-3.5 h-3.5 ${card.iconCls}`} />
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{card.label}</span>
                <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{card.total}</span>
              </Link>
            ))}
          </div>
        ) : (
          /* Expanded: full donut cards */
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { label: 'Emails',    sub: 'high & medium unread',  Icon: Mail,          iconCls: 'text-blue-500',   segs: emailSegs,  total: visEmails.length,  href: '/dashboard/email'   },
              { label: 'Bot Chats', sub: 'high & medium active',  Icon: MessageSquare, iconCls: 'text-purple-500', segs: botSegs,    total: visBots.length,    href: '/dashboard/bots'    },
              { label: 'Forms',     sub: 'all submissions',       Icon: FileText,      iconCls: 'text-green-500',  segs: formSegs,   total: visForms.length,   href: '/dashboard/forms'   },
              { label: 'Tickets',   sub: 'all tickets',           Icon: TicketIcon,    iconCls: 'text-amber-500',  segs: ticketSegs, total: visTickets.length, href: '/dashboard/tickets' },
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
        )}
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
                <Mail className="w-3.5 h-3.5" />{visEmails.length}
              </button>
              <button
                onClick={() => { setFeedView('grid'); setTopType('bot') }}
                className={`flex items-center gap-1 text-purple-500 hover:text-purple-600 transition-colors ${topType === 'bot' && feedView === 'grid' ? 'font-semibold' : ''}`}
                title="Bot chats"
              >
                <MessageSquare className="w-3.5 h-3.5" />{visBots.length}
              </button>
              <button
                onClick={() => { setFeedView('grid'); setTopType('form') }}
                className={`flex items-center gap-1 text-green-500 hover:text-green-600 transition-colors ${topType === 'form' && feedView === 'grid' ? 'font-semibold' : ''}`}
                title="Form submissions"
              >
                <FileText className="w-3.5 h-3.5" />{visForms.length}
              </button>
              <button
                onClick={() => { setFeedView('grid'); setTopType('ticket') }}
                className={`flex items-center gap-1 text-amber-500 hover:text-amber-600 transition-colors ${topType === 'ticket' && feedView === 'grid' ? 'font-semibold' : ''}`}
                title="Tickets"
              >
                <TicketIcon className="w-3.5 h-3.5" />{visTickets.length}
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
                  count: visEmails.length,
                  rows: visEmails.length === 0
                    ? <p className="px-5 py-6 text-xs text-gray-400 text-center">No emails this period.</p>
                    : visEmails.map(e => (
                      <div key={e.id} onClick={() => setPopup({ kind: 'email', id: e.id })}
                        className="group flex items-start gap-3 px-5 py-4 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors cursor-pointer border-b border-blue-100 dark:border-blue-500/15 last:border-0">
                        <PriorityDot priority={e.ai_priority ?? 'low'} pulse={e.ai_priority === 'high'} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{e.from_name ?? e.from_address}</p>
                          <p className="text-[11px] text-blue-600/80 dark:text-blue-300/70 truncate">{e.subject}</p>
                          {e.ai_summary && <p className="text-[10px] text-blue-500/60 dark:text-blue-400/60 italic truncate mt-0.5">{e.ai_summary}</p>}
                        </div>
                        <span className="text-[10px] text-blue-500/70 dark:text-blue-400/60 shrink-0">{timeAgo(e.received_at)}</span>
                        <button onClick={ev => handleDismiss('email', e.id, ev)} title="Dismiss"
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-all shrink-0">
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
                  count: visBots.length,
                  rows: visBots.length === 0
                    ? <p className="px-5 py-6 text-xs text-gray-400 text-center">No bot chats this period.</p>
                    : visBots.map(b => (
                      <div key={b.id} onClick={() => setPopup({ kind: 'bot', id: b.id })}
                        className="group flex items-start gap-3 px-5 py-3 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors cursor-pointer border-b border-purple-100 dark:border-purple-500/15 last:border-0">
                        <PriorityDot priority={b.ai_priority ?? 'low'} pulse={b.ai_priority === 'high'} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{b.title ?? 'Untitled conversation'}</p>
                          <p className="text-[11px] text-purple-600/80 dark:text-purple-300/70">
                            {b.bot?.name && <span className="font-medium">{b.bot.name} · </span>}{b.message_count} msgs
                          </p>
                        </div>
                        <span className="text-[10px] text-purple-500/70 dark:text-purple-400/60 shrink-0">{timeAgo(b.last_activity_at)}</span>
                        <button onClick={ev => handleDismiss('bot', b.id, ev)} title="Dismiss"
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-purple-100 dark:hover:bg-purple-500/20 text-purple-400 hover:text-purple-600 dark:hover:text-purple-300 transition-all shrink-0">
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
                  count: visForms.length,
                  rows: visForms.length === 0
                    ? <p className="px-5 py-6 text-xs text-gray-400 text-center">No form submissions this period.</p>
                    : visForms.map(f => (
                      <div key={f.id} onClick={() => setPopup({ kind: 'form', id: f.id })}
                        className="group flex items-start gap-3 px-5 py-3 hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors cursor-pointer border-b border-green-100 dark:border-green-500/15 last:border-0">
                        <PriorityDot priority={f.lead_score ?? 'low'} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{f.name}</p>
                          <p className="text-[11px] text-green-600/80 dark:text-green-300/70 truncate">{f.company ?? f.email ?? f.source_platform}</p>
                        </div>
                        <span className="text-[10px] text-green-500/70 dark:text-green-400/60 shrink-0">{timeAgo(f.created_at)}</span>
                        <button onClick={ev => handleDismiss('form', f.id, ev)} title="Dismiss"
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-green-100 dark:hover:bg-green-500/20 text-green-400 hover:text-green-600 dark:hover:text-green-300 transition-all shrink-0">
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
                  count: visTickets.length,
                  rows: visTickets.length === 0
                    ? <p className="px-5 py-6 text-xs text-gray-400 text-center">No tickets this period.</p>
                    : visTickets.map(t => (
                      <div key={t.id} onClick={() => setPopup({ kind: 'ticket', id: t.id })}
                        className="group flex items-start gap-3 px-5 py-3 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors cursor-pointer border-b border-amber-100 dark:border-amber-500/15 last:border-0">
                        <PriorityDot priority={t.priority} pulse={t.priority === 'high' || t.priority === 'urgent'} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{t.title}</p>
                          {t.contact && <p className="text-[11px] text-amber-600/80 dark:text-amber-300/70">{t.contact.name}</p>}
                        </div>
                        <span className="text-[10px] text-amber-500/70 dark:text-amber-400/60 shrink-0">{timeAgo(t.created_at)}</span>
                        <button onClick={ev => handleDismiss('ticket', t.id, ev)} title="Dismiss"
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 transition-all shrink-0">
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
                            ? tablet.borderClass
                            : 'border-gray-100 dark:border-white/[0.06]'
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
                            <ChevronDown className={`w-4 h-4 ${tablet.accentClass} transition-transform duration-200 ${isActive ? 'rotate-180' : ''}`} />
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
