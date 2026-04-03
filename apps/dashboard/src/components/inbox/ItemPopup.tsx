'use client'

import React, { useState, useEffect, useRef } from 'react'
import { AIGuidancePanel } from '@/components/ai/AIGuidancePanel'
import {
  Mail, MessageSquare, FileText, Ticket as TicketIcon,
  Plus, Kanban, RefreshCw, Calendar, Check, ArrowRight, SendHorizontal,
  ChevronDown, X, ExternalLink, CheckCircle2, User,
  Phone, Building2, Sparkles,
  Send, Reply, Loader2, ArrowLeft, Maximize2, Minimize2,
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignJustify, List, ListOrdered, Paperclip,
  Palette, Highlighter, FileSignature, Type,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { timeAgo } from '@/lib/utils'
import {
  sendEmail,
  scheduleMeetingFromEmail,
  getEmailSignature,
  updateEmailPriority,
  enhanceEmailReply,
} from '@/app/actions/sage-emails'
import { EmailComposeModal } from '@/components/dashboard/email-compose-modal'
import {
  dashboardAddLead,
  dashboardAddTicket,
  batchMatchContacts,
} from '@/app/actions/sage-triage'
import { sendFormWelcomeSms, sendTicketAckSms } from '@/app/actions/auto-welcome'
import type { ContactMatch } from '@/app/actions/sage-triage'
import type { SageEmail, Conversation, Lead, SageTicket } from '@/lib/types'

// ── Priority colours (local — matches dashboard-client constants) ─────────────
const P_COLORS: Record<string, string> = {
  high:   '#22c55e',
  urgent: '#22c55e',
  medium: '#eab308',
  low:    '#9ca3af',
}

// ── Email body renderer — converts > quoted lines to styled blocks ────────────
function renderEmailBody(text: string) {
  const lines = text.split('\n')
  const out: React.ReactNode[] = []
  let quoteBuffer: string[] = []
  let key = 0

  const flushQuote = () => {
    if (quoteBuffer.length === 0) return
    out.push(
      <blockquote key={key++} className="border-l-2 border-gray-300 dark:border-white/20 pl-3 my-1 text-gray-400 dark:text-gray-500 italic text-xs leading-relaxed">
        {quoteBuffer.map((l, i) => <span key={i} className="block">{l}</span>)}
      </blockquote>
    )
    quoteBuffer = []
  }

  for (const raw of lines) {
    const stripped = raw.replace(/^>+\s?/, '')
    if (raw.trimStart().startsWith('>')) {
      quoteBuffer.push(stripped)
    } else {
      flushQuote()
      out.push(<span key={key++} className="block leading-relaxed">{raw || '\u00A0'}</span>)
    }
  }
  flushQuote()
  return out
}

// ── Types ─────────────────────────────────────────────────────────────────────
export type PopupState = { kind: 'email' | 'bot' | 'form' | 'ticket'; id: string; action?: string }

// ── ItemPopup component ───────────────────────────────────────────────────────
export function ItemPopup({
  popup, pipelines, contactMatch, onClose, onAction, onPriorityChanged,
}: {
  popup: PopupState
  pipelines: { id: string; name: string }[]
  contactMatch: ContactMatch | null | undefined
  onClose: () => void
  onAction: (extra?: Array<{ kind: string; id: string }>) => void
  onPriorityChanged?: (emailId: string, priority: string) => void
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData]               = useState<any>(null)
  const [loading, setLoading]         = useState(true)
  const [actionBusy, setActionBusy]   = useState(false)
  const [postAction, setPostAction]   = useState<'deal_added' | 'ticket_added' | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [showPipelinePicker, setShowPipelinePicker] = useState(false)
  const [ignoring, setIgnoring]       = useState(false)

  const [aiCollapsed, setAiCollapsed]                     = useState(false)
  const [replySummaryCollapsed, setReplySummaryCollapsed] = useState(false)
  const [contactDetailsCollapsed, setContactDetailsCollapsed] = useState(true)
  const [copiedField, setCopiedField]                     = useState<string | null>(null)
  const [smsBusy, setSmsBusy] = useState(false)

  function copyField(value: string, key: string) {
    navigator.clipboard.writeText(value).catch(() => {})
    setCopiedField(key)
    setTimeout(() => setCopiedField(null), 1500)
  }

  async function handleFormSms() {
    setSmsBusy(true)
    const res = await sendFormWelcomeSms(popup.id)
    setSmsBusy(false)
    if (res.ok && res.sentTo) {
      setData((prev: any) => prev ? { ...prev, auto_sms_sent_at: new Date().toISOString(), auto_sms_to: res.sentTo } : prev)
    }
  }

  async function handleTicketSms() {
    setSmsBusy(true)
    const res = await sendTicketAckSms(popup.id)
    setSmsBusy(false)
    if (res.ok && res.sentTo) {
      setData((prev: any) => prev ? { ...prev, auto_sms_sent_at: new Date().toISOString(), auto_sms_to: res.sentTo } : prev)
    }
  }

  function nextStepFor(aiAction: string | null | undefined, category: string | null | undefined, priority: string | null | undefined, kind: string): string | null {
    const ACTION_MAP: Record<string, string> = {
      create_lead:    'Add this contact to your pipeline as a new lead',
      update_lead:    'Update the existing lead record with this new information',
      reopen:         'Re-open and follow up on this lead — they may be ready again',
      create_ticket:  'Create a support ticket and assign it to your team',
      reply_draft:    'Reply to this email — an AI draft has been prepared for you.',
    }
    if (aiAction && aiAction !== 'ignore' && ACTION_MAP[aiAction]) return ACTION_MAP[aiAction]
    // Fallback: derive from category or priority
    if (category === 'Meeting') return 'Confirm or decline this meeting request'
    if (category === 'Sales Inquiry' || category === 'sales_inquiry') return 'Respond to this inquiry and qualify the opportunity'
    if (category === 'Support' || category === 'support') return 'Address the support request and create a ticket if needed'
    if (priority === 'high') return 'High priority — respond promptly and assess next action'
    if (kind === 'ticket') return 'Review the ticket and assign or respond'
    if (kind === 'form')   return 'Review this submission and add to your pipeline if qualified'
    if (kind === 'bot')    return 'Review the conversation and respond or add this contact to your pipeline'
    return null
  }
  const [popupSize, setPopupSize]             = useState<'sm' | 'md' | 'lg'>('md')
  const [priorityValue,  setPriorityValue]    = useState<string | null>(null)
  const [priorityOpen,   setPriorityOpen]     = useState(false)
  const [wasNewContact,  setWasNewContact]    = useState<boolean | null>(null)
  const [actionTime,     setActionTime]       = useState<Date | null>(null)

  const POPUP_PRIORITY_DOT: Record<string, string> = {
    high: 'bg-[#15A4AE]', medium: 'bg-amber-400', low: 'bg-gray-300 dark:bg-gray-600',
  }
  const POPUP_PRIORITY_BADGE: Record<string, string> = {
    high:   'bg-[#15A4AE]/10 text-[#3a9e8a] dark:text-[#15A4AE] border border-[#15A4AE]/30',
    medium: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200/70 dark:border-amber-500/20',
    low:    'bg-gray-100 dark:bg-white/5 text-gray-500 border border-gray-200 dark:border-white/10',
  }

  // Outbound email modal (bot / form / ticket)
  const [outboundEmail, setOutboundEmail] = useState<{ to: string; toName?: string; subject: string; context: string } | null>(null)

  // Reply compose state (email only)
  const [showReply, setShowReply]       = useState(popup.action === 'reply')
  const [replyBody, setReplyBody]       = useState('')
  const [isEnhancing, setIsEnhancing]   = useState(false)
  const [emailSignature, setEmailSignature] = useState<string | null>(null)
  const [sending, setSending]           = useState(false)
  const [sendResult, setSendResult]     = useState<string | null>(null)
  const [showCc, setShowCc]             = useState(false)
  const [showBcc, setShowBcc]           = useState(false)
  const [ccValue, setCcValue]           = useState('')
  const [bccValue, setBccValue]         = useState('')
  const replyRef      = useRef<HTMLDivElement>(null)
  const userTypedRef  = useRef(false)
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

  // Reset typed flag whenever a new email popup opens
  useEffect(() => { userTypedRef.current = false }, [popup.id])

  // Populate contentEditable with AI draft + signature when reply opens.
  useEffect(() => {
    if (!showReply || !replyRef.current) return
    if (userTypedRef.current) return
    const draftHtml = replyBody ? replyBody.replace(/\n/g, '<br>') : ''
    const sigHtml   = emailSignature
      ? `<br><br><hr style="border:none;border-top:1px solid #e5e7eb;margin:12px 0;" />${emailSignature}`
      : ''
    replyRef.current.innerHTML = draftHtml + sigHtml
  }, [showReply, replyBody, emailSignature])

  // Escape to close
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  // When action changes to 'reply'
  useEffect(() => {
    if (popup.action === 'reply') setShowReply(true)
  }, [popup.action])

  // Fetch full item
  useEffect(() => {
    setData(null); setLoading(true); setPostAction(null); setActionError(null); setShowReply(popup.action === 'reply'); setSendResult(null); setShowPipelinePicker(false); setIgnoring(false); setAiCollapsed(false); setReplySummaryCollapsed(false); setPriorityValue(null); setPriorityOpen(false)
    const supabase = createClient()
    const go = async () => {
      if (popup.kind === 'email') {
        const { data: d } = await supabase.from('sage_emails')
          .select('id, from_name, from_address, subject, body_text, received_at, ai_priority, ai_summary, ai_insights, ai_category, ai_action, ai_entities, ai_reply_drafts')
          .eq('id', popup.id).single()
        setData(d)
        const draft = (d as SageEmail | null)?.ai_reply_drafts?.[0]?.body ?? ''
        setReplyBody(draft)
      } else if (popup.kind === 'bot') {
        const { data: d } = await supabase.from('conversations')
          .select('id, title, platform, message_count, last_activity_at, ai_priority, ai_summary, ai_insights, ai_action, ai_entities, bot:bots(name)')
          .eq('id', popup.id).single()
        setData(d)
      } else if (popup.kind === 'form') {
        const { data: d } = await supabase.from('sage_form_submissions')
          .select('id, fields, ai_priority, ai_summary, ai_insights, ai_action, source_platform, created_at, actioned_at, action_type, auto_email_sent_at, auto_email_to, auto_sms_sent_at, auto_sms_to')
          .eq('id', popup.id).single()
        if (d) {
          const row = d as Record<string, unknown>
          const f = (row.fields as Record<string, string> | null) ?? {}
          setData({
            id:              row.id as string,
            name:            f.name ?? f.full_name ?? f.first_name ?? '(unknown)',
            email:           f.email ?? null,
            phone:           f.phone ?? null,
            company:         f.company ?? f.company_name ?? null,
            job_title:       f.job_title ?? f.title ?? null,
            website:         f.website ?? null,
            lead_score:      row.ai_priority as string ?? null,
            source_platform: row.source_platform as string,
            campaign_name:   f.campaign ?? f.campaign_name ?? null,
            form_name:       f.form_name ?? f.form ?? null,
            ai_summary:          row.ai_summary as string ?? null,
            ai_insights:         row.ai_insights as string[] ?? [],
            ai_action:           row.ai_action as string ?? null,
            created_at:          row.created_at as string,
            actioned_at:         row.actioned_at as string ?? null,
            action_type:         row.action_type as string ?? null,
            auto_email_sent_at:  row.auto_email_sent_at as string ?? null,
            auto_email_to:       row.auto_email_to as string ?? null,
            auto_sms_sent_at:    row.auto_sms_sent_at as string ?? null,
            auto_sms_to:         row.auto_sms_to as string ?? null,
            raw_fields:          f,
          })
        } else {
          setData(null)
        }
      } else if (popup.kind === 'ticket') {
        const { data: d } = await supabase.from('sage_tickets')
          .select('id, title, description, priority, status, created_at, name, email, phone, contact_method, related_url, occurred_at, auto_email_sent_at, auto_email_to, auto_sms_sent_at, auto_sms_to, contact:sage_contacts(name, email, phone)')
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
      const aiName = e.ai_entities?.name
      const looksLikeName = aiName && aiName.trim().split(/\s+/).length <= 4 && !/[\d,;!?]/.test(aiName)
      name  = looksLikeName ? aiName! : (e.from_name ?? e.from_address)
      email = e.from_address
      phone = e.ai_entities?.phone ?? null
      company  = e.ai_entities?.company ?? null
      interest = e.ai_entities?.product_interest ?? null
    } else if (popup.kind === 'bot') {
      const c = data as Conversation
      const botAiName = (c as any).ai_entities?.name as string | undefined
      const botNameOk = botAiName && botAiName.trim().split(/\s+/).length <= 4 && !/[\d,;!?]/.test(botAiName)
      name  = botNameOk ? botAiName! : (c.title ?? 'Contact')
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

    const isNew = contactMatch === null
    const result = await dashboardAddLead({ name, email, phone, company, interest, source: src, conversationId, pipelineId })
    setActionBusy(false)
    if (result.error) { setActionError(result.error); return }
    onAction()
    setWasNewContact(isNew)
    setActionTime(new Date())
    setPostAction('deal_added')
  }

  function triggerAddLead() {
    if (pipelines.length === 0) { setActionError('No pipelines found. Create one first.'); return }
    if (pipelines.length === 1) { handleAddLead(pipelines[0].id); return }
    setShowPipelinePicker(true)
  }

  async function handleAddTicket() {
    setActionBusy(true)
    let name = '', email: string | null = null, phone: string | null = null,
        title = '', desc: string | null = null, priority = 'medium'
    const src = popup.kind as 'email' | 'bot' | 'form' | 'ticket'

    if (popup.kind === 'email') {
      const e = data as SageEmail
      const aiNameT = e.ai_entities?.name
      const aiNameTOk = aiNameT && aiNameT.trim().split(/\s+/).length <= 4 && !/[\d,;!?]/.test(aiNameT)
      name  = aiNameTOk ? aiNameT! : (e.from_name ?? e.from_address)
      email = e.from_address
      phone = e.ai_entities?.phone ?? null
      title = e.subject; desc = e.ai_summary ?? null; priority = e.ai_priority ?? 'medium'
    } else if (popup.kind === 'bot') {
      const c = data as Conversation
      const botAiNameT = (c as any).ai_entities?.name as string | undefined
      const botNameTOk = botAiNameT && botAiNameT.trim().split(/\s+/).length <= 4 && !/[\d,;!?]/.test(botAiNameT)
      name  = botNameTOk ? botAiNameT! : (c.title ?? 'Contact')
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
    setActionTime(new Date())
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

  const iconCls   = 'bg-gray-100 dark:bg-white/10'
  const Icon     = { email: Mail, bot: MessageSquare, form: FileText, ticket: TicketIcon }[popup.kind]
  const iconCol  = { email: 'text-blue-500', bot: 'text-purple-500', form: 'text-green-500', ticket: 'text-amber-500' }[popup.kind]
  const label    = { email: 'Email Summary', bot: 'Chat Summary', form: 'Lead Details', ticket: 'Ticket Summary' }[popup.kind]

  const sizeClass = popupSize === 'sm' ? 'sm:max-w-lg' : popupSize === 'lg' ? 'sm:max-w-[95vw]' : 'sm:max-w-2xl'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:px-6 sm:py-8 bg-black/55 dark:bg-black/70"
      onClick={onClose}>
      <div className={`relative w-full ${sizeClass} bg-white dark:bg-[#2a2a2a] rounded-t-2xl sm:rounded-2xl shadow-2xl h-[96vh] sm:h-[calc(100vh-64px)] flex flex-col transition-all duration-200`}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0 border-b border-white/10 rounded-t-2xl sm:rounded-t-2xl bg-[#141c2b]">
          <div className="flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-white/10`}>
              <Icon className={`w-4 h-4 ${iconCol}`} />
            </div>
            <h2 className="text-sm font-semibold text-white">{label}</h2>
            <Sparkles className="w-3.5 h-3.5 text-[#15A4AE]" />
            {!postAction && contactMatch !== null && contactMatch !== undefined && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/15 text-[10px] font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">
                Existing contact{contactMatch.dealId ? ' · has deal' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {popup.kind === 'email' && !loading && data && showReply && (
              <button
                onClick={() => setShowReply(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors border border-white/20"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
            )}
            <button
              onClick={() => setPopupSize(s => s === 'sm' ? 'md' : s === 'md' ? 'lg' : 'sm')}
              title={popupSize === 'sm' ? 'Original size' : popupSize === 'md' ? 'Full width' : 'Small'}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              {popupSize === 'lg' ? <Minimize2 className="w-4 h-4 text-white/60" /> : <Maximize2 className="w-4 h-4 text-white/60" />}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-red-500/30 transition-colors">
              <X className="w-4 h-4 text-white/60" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className={`${popup.kind === 'email' ? 'overflow-hidden' : 'overflow-y-auto'} flex-1 px-6 py-5 flex flex-col gap-4`}>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="w-5 h-5 text-gray-300 animate-spin" />
            </div>
          ) : !data ? (
            <p className="text-sm text-gray-400 text-center py-12">Unable to load details.</p>
          ) : (
            <>
              {/* ── Contact / deal status badge ── */}
              {(() => {
                const fmtTime = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                if (postAction === 'deal_added') {
                  const label = wasNewContact ? 'Contact & Deal Created' : 'Deal Created'
                  return (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#15A4AE]/10 border border-[#15A4AE]/30 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#15A4AE] shrink-0" />
                      <span className="text-xs font-semibold text-[#3a9e8a] dark:text-[#15A4AE]">{label}</span>
                      {actionTime && <span className="text-[10px] text-gray-400 ml-auto">{fmtTime(actionTime)}</span>}
                    </div>
                  )
                }
                if (postAction === 'ticket_added') {
                  return (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/70 dark:border-amber-500/25 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Ticket Created</span>
                      {actionTime && <span className="text-[10px] text-gray-400 ml-auto">{fmtTime(actionTime)}</span>}
                    </div>
                  )
                }
                return null
              })()}

              {/* ── Email popup ── */}
              {popup.kind === 'email' && (() => {
                const e = data as SageEmail
                return (
                  <div className="flex-1 flex flex-col gap-4 min-h-0">
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
                      {(priorityValue ?? e.ai_priority) && (() => {
                        const cp = priorityValue ?? e.ai_priority ?? 'low'
                        return (
                          <div className="relative shrink-0">
                            <button
                              onClick={ev => { ev.stopPropagation(); setPriorityOpen(v => !v) }}
                              className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-0.5 rounded-full cursor-pointer hover:opacity-80 transition-opacity ${POPUP_PRIORITY_BADGE[cp] ?? ''}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${POPUP_PRIORITY_DOT[cp] ?? 'bg-gray-400'}`} />
                              {cp}
                              <ChevronDown className="w-3 h-3" />
                            </button>
                            {priorityOpen && (
                              <div className="absolute right-0 top-full mt-1 z-30 bg-white dark:bg-[#2a2a2a] rounded-xl border border-gray-200 dark:border-white/12 shadow-lg overflow-hidden min-w-[100px]">
                                {(['high', 'medium', 'low'] as const).map(p => (
                                  <button
                                    key={p}
                                    onClick={ev => {
                                      ev.stopPropagation()
                                      setPriorityValue(p)
                                      setPriorityOpen(false)
                                      onPriorityChanged?.(e.id, p)
                                      void updateEmailPriority(e.id, p)
                                    }}
                                    className={`flex items-center gap-2 w-full px-3 py-2 text-[10px] font-semibold uppercase tracking-wide transition-colors hover:opacity-80 ${POPUP_PRIORITY_BADGE[p] ?? ''}`}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full ${POPUP_PRIORITY_DOT[p] ?? 'bg-gray-400'}`} />
                                    {p}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })()}
                    </div>

                    {/* AI Summary + Sage Guidance — collapsible together */}
                    {!showReply && (
                      aiCollapsed ? (
                        <button
                          onClick={() => setAiCollapsed(false)}
                          className="flex items-center gap-2 w-full px-3.5 py-2.5 bg-blue-50 dark:bg-blue-500/20 border border-blue-200 dark:border-blue-500/30 rounded-xl text-left hover:bg-blue-100 dark:hover:bg-blue-500/25 transition-colors shrink-0"
                        >
                          <Sparkles className="w-3 h-3 text-blue-500 dark:text-blue-400 shrink-0" />
                          <span className="text-[11px] text-blue-700 dark:text-blue-300 font-bold uppercase tracking-wide flex-1">AI Summary</span>
                          <ChevronDown className="w-3.5 h-3.5 text-blue-400 shrink-0 -rotate-90" />
                        </button>
                      ) : (
                        <div className="flex flex-col gap-4 shrink-0">
                          {e.ai_summary && (
                            <div className="bg-blue-50 dark:bg-blue-500/20 border border-blue-200 dark:border-blue-500/30 rounded-xl p-4">
                              <div className="flex items-start gap-1.5 mb-2">
                                <Sparkles className="w-3 h-3 text-blue-500 dark:text-blue-400 mt-0.5" />
                                <p className="text-[11px] text-blue-700 dark:text-blue-300 font-bold uppercase tracking-wide flex-1">AI Summary</p>
                                <button
                                  onClick={() => setAiCollapsed(true)}
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors -mt-1"
                                >
                                  <ChevronDown className="w-3.5 h-3.5 rotate-180" />Collapse
                                </button>
                              </div>
                              <p className="text-[14px] text-gray-800 dark:text-gray-200 leading-relaxed">{e.ai_summary}</p>
                            </div>
                          )}

                          {/* AI Guidance Panel / Initial Signals — collapse together with AI Summary */}
                          {contactMatch?.dealId ? (
                            <AIGuidancePanel
                              entityType="deal"
                              entityId={contactMatch.dealId}
                              mode="compact"
                            />
                          ) : (e.ai_insights ?? []).length > 0 && (
                            <div className="bg-teal-50 dark:bg-teal-500/10 border border-teal-200/60 dark:border-teal-500/20 rounded-xl p-4">
                              <p className="text-[11px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wide mb-2.5">Initial Signals</p>
                              <ul className="space-y-2">
                                {(e.ai_insights ?? []).map((ins: string, i: number) => (
                                  <li key={i} className="flex items-start gap-2 text-[14px] text-gray-700 dark:text-gray-300">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0" />{ins}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )
                    )}

                    {/* Suggested Next Step */}
                    {!showReply && (() => {
                      const step = nextStepFor((e as any).ai_action, e.ai_category, e.ai_priority, 'email')
                      if (!step) return null
                      return (
                        <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200/70 dark:border-amber-500/25 rounded-xl shrink-0">
                          <ArrowRight className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-0.5">Suggested Next Step</p>
                            <p className="text-[14px] text-gray-800 dark:text-gray-200 leading-snug">{step}</p>
                          </div>
                        </div>
                      )
                    })()}

                    {/* Contact Details — separate collapsible, collapsed by default, one-click copy */}
                    {!showReply && (
                      <div className="shrink-0">
                        <button
                          onClick={() => setContactDetailsCollapsed(v => !v)}
                          className="flex items-center gap-1.5 w-full text-left mb-2 group"
                        >
                          <p className="text-xs text-gray-400 flex-1">Contact details</p>
                          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${contactDetailsCollapsed ? '-rotate-90' : ''}`} />
                        </button>
                        {!contactDetailsCollapsed && (
                          <div className="flex flex-wrap gap-2">
                            {[
                              { key: 'name',  icon: User,      value: e.ai_entities?.name ?? e.from_name ?? e.from_address },
                              { key: 'email', icon: Mail,      value: e.ai_entities?.email ?? e.from_address },
                              { key: 'phone', icon: Phone,     value: e.ai_entities?.phone },
                              { key: 'co',    icon: Building2, value: e.ai_entities?.company },
                            ].filter(f => f.value).map(f => (
                              <button key={f.key} onClick={() => copyField(f.value!, f.key)}
                                title="Click to copy"
                                className="flex items-center gap-1.5 text-xs bg-[#f0eeeb] dark:bg-white/8 px-2.5 py-1.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/12 transition-colors cursor-pointer">
                                {copiedField === f.key ? <Check className="w-3 h-3 text-green-500" /> : <f.icon className="w-3 h-3 text-gray-400" />}
                                <span className={copiedField === f.key ? 'text-green-600 dark:text-green-400' : ''}>{copiedField === f.key ? 'Copied!' : f.value}</span>
                              </button>
                            ))}
                            {e.ai_entities?.product_interest && (
                              <button onClick={() => copyField(e.ai_entities!.product_interest!, 'interest')}
                                title="Click to copy"
                                className="flex items-center gap-1.5 text-xs bg-[#f0eeeb] dark:bg-white/8 px-2.5 py-1.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/12 transition-colors cursor-pointer">
                                {copiedField === 'interest' ? <Check className="w-3 h-3 text-green-500" /> : null}
                                <span className={copiedField === 'interest' ? 'text-green-600 dark:text-green-400' : ''}>{copiedField === 'interest' ? 'Copied!' : e.ai_entities.product_interest}</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Full email body */}
                    {!showReply && e.body_text && (
                      <div className="border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden flex-1 flex flex-col min-h-0 bg-white dark:bg-[#1e1e1e]">
                        <div className="px-4 py-2.5 border-b border-gray-200 bg-white shrink-0">
                          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Email</p>
                        </div>
                        <div className="px-4 py-4 flex-1 overflow-y-auto">
                          <div className="text-sm text-gray-900 leading-relaxed" style={{ fontFamily: 'Arial, sans-serif' }}>{renderEmailBody(e.body_text)}</div>
                        </div>
                      </div>
                    )}

                    {/* AI summary inline when reply open */}
                    {showReply && e.ai_summary && (
                      replySummaryCollapsed ? (
                        <button
                          onClick={() => setReplySummaryCollapsed(false)}
                          className="flex items-center gap-2 w-full px-3.5 py-2.5 bg-blue-50 dark:bg-blue-500/20 border border-blue-200 dark:border-blue-500/30 rounded-xl text-left hover:bg-blue-100 dark:hover:bg-blue-500/25 transition-colors shrink-0"
                        >
                          <Sparkles className="w-3 h-3 text-blue-500 dark:text-blue-400 shrink-0" />
                          <span className="text-[11px] text-blue-700 dark:text-blue-300 font-bold uppercase tracking-wide flex-1">AI Summary</span>
                          <ChevronDown className="w-3.5 h-3.5 text-blue-400 shrink-0 -rotate-90" />
                        </button>
                      ) : (
                        <div className="bg-blue-50 dark:bg-blue-500/20 border border-blue-200 dark:border-blue-500/30 rounded-xl p-4 shrink-0">
                          <div className="flex items-start gap-1.5 mb-2">
                            <Sparkles className="w-3 h-3 text-blue-500 dark:text-blue-400 mt-0.5" />
                            <p className="text-[11px] text-blue-700 dark:text-blue-300 font-bold uppercase tracking-wide flex-1">AI Summary</p>
                            <button
                              onClick={() => setReplySummaryCollapsed(true)}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors -mt-1"
                            >
                              <ChevronDown className="w-3.5 h-3.5 rotate-180" />Collapse
                            </button>
                          </div>
                          <p className="text-[14px] text-gray-800 dark:text-gray-200 leading-relaxed">{e.ai_summary}</p>
                        </div>
                      )
                    )}

                    {/* Inline Reply compose */}
                    {showReply && (
                      <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white flex-1 flex flex-col min-h-0">
                        {/* Compose header — To row */}
                        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                          <Reply className="w-3.5 h-3.5 text-[#15A4AE] shrink-0" />
                          <span className="text-xs font-semibold text-gray-700 shrink-0">To:</span>
                          <span className="text-xs text-gray-600 flex-1 truncate">
                            {e.from_name ? `${e.from_name} <${e.from_address}>` : e.from_address}
                          </span>
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
                        </div>
                        {showCc && (
                          <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 bg-gray-50">
                            <span className="text-xs font-semibold text-gray-500 w-7 shrink-0">CC:</span>
                            <input
                              type="email"
                              value={ccValue}
                              onChange={ev => setCcValue(ev.target.value)}
                              placeholder="Add CC recipients…"
                              className="flex-1 text-xs bg-transparent text-gray-700 placeholder-gray-400 outline-none"
                            />
                          </div>
                        )}
                        {showBcc && (
                          <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 bg-gray-50">
                            <span className="text-xs font-semibold text-gray-500 w-7 shrink-0">BCC:</span>
                            <input
                              type="email"
                              value={bccValue}
                              onChange={ev => setBccValue(ev.target.value)}
                              placeholder="Add BCC recipients…"
                              className="flex-1 text-xs bg-transparent text-gray-700 placeholder-gray-400 outline-none"
                            />
                          </div>
                        )}
                        {/* Formatting toolbar */}
                        <div className="border-b border-gray-200 bg-gray-50">
                          <div className="flex items-center flex-wrap gap-0.5 px-3 py-1.5">
                            <button title="Font" onMouseDown={ev => { ev.preventDefault(); setFontOpen(v => !v); setColorOpen(false); setHlOpen(false) }}
                              className={`flex items-center gap-1 px-1.5 py-1 rounded text-[11px] font-medium transition-colors ${fontOpen ? 'bg-gray-200 dark:bg-white/15 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white'}`}>
                              <Type className="w-3.5 h-3.5" />
                              <span>Font</span>
                              <ChevronDown className="w-3 h-3" />
                            </button>
                            <div className="w-px h-4 bg-gray-200 dark:bg-white/10 mx-0.5" />
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
                            <button title="Text color" onMouseDown={ev => { ev.preventDefault(); setColorOpen(v => !v); setFontOpen(false); setHlOpen(false) }}
                              className={`p-1.5 rounded transition-colors ${colorOpen ? 'bg-gray-200 dark:bg-white/15 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white'}`}>
                              <Palette className="w-3.5 h-3.5" />
                            </button>
                            <button title="Highlight" onMouseDown={ev => { ev.preventDefault(); setHlOpen(v => !v); setFontOpen(false); setColorOpen(false) }}
                              className={`p-1.5 rounded transition-colors ${hlOpen ? 'bg-gray-200 dark:bg-white/15 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white'}`}>
                              <Highlighter className="w-3.5 h-3.5" />
                            </button>
                            <div className="w-px h-4 bg-gray-200 dark:bg-white/10 mx-0.5" />
                            <button title="Bullet list" onMouseDown={ev => { ev.preventDefault(); execFormat('insertUnorderedList') }}
                              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                              <List className="w-3.5 h-3.5" />
                            </button>
                            <button title="Numbered list" onMouseDown={ev => { ev.preventDefault(); execFormat('insertOrderedList') }}
                              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                              <ListOrdered className="w-3.5 h-3.5" />
                            </button>
                            <div className="w-px h-4 bg-gray-200 dark:bg-white/10 mx-0.5" />
                            <button title="Align left" onMouseDown={ev => { ev.preventDefault(); execFormat('justifyLeft') }}
                              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                              <AlignLeft className="w-3.5 h-3.5" />
                            </button>
                            <button title="Justify" onMouseDown={ev => { ev.preventDefault(); execFormat('justifyFull') }}
                              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                              <AlignJustify className="w-3.5 h-3.5" />
                            </button>
                            <div className="w-px h-4 bg-gray-200 dark:bg-white/10 mx-0.5" />
                            <button title="Insert signature" onMouseDown={ev => { ev.preventDefault(); insertSignature() }}
                              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                              <FileSignature className="w-3.5 h-3.5" />
                            </button>
                            <button title="Attach file" onMouseDown={ev => { ev.preventDefault(); fileInputRef.current?.click() }}
                              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                              <Paperclip className="w-3.5 h-3.5" />
                            </button>
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
                              <Calendar className="w-[18px] h-[18px]" />
                            </button>
                          </div>

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

                        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />

                        <div
                          key={popup.id}
                          ref={replyRef}
                          contentEditable
                          suppressContentEditableWarning
                          onInput={() => { userTypedRef.current = true; setReplyBody(replyRef.current?.innerText ?? '') }}
                          data-placeholder="Write your reply…"
                          className="flex-1 min-h-0 overflow-y-auto px-5 py-4 text-sm leading-relaxed outline-none [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-gray-400"
                          style={{ fontFamily: 'Arial, sans-serif', color: '#374151', backgroundColor: '#ffffff' }}
                        />

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
                    {/* Bot auto-reply notice */}
                    <div className="flex items-start gap-3 px-4 py-3 bg-green-50 dark:bg-green-500/10 border border-green-200/70 dark:border-green-500/25 rounded-xl">
                      <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase tracking-wide mb-0.5">Auto-reply sent</p>
                        <p className="text-[14px] text-gray-800 dark:text-gray-200 leading-snug">
                          {(c as { bot?: { name: string } | null }).bot?.name
                            ? `${(c as { bot?: { name: string } | null }).bot!.name} automatically replied to this conversation.`
                            : 'The bot automatically replied to this conversation.'}
                          {' '}The lead has been acknowledged.
                        </p>
                      </div>
                    </div>

                    {c.ai_summary && (
                      <div className="bg-purple-50 dark:bg-purple-500/20 border border-purple-200 dark:border-purple-500/30 rounded-xl p-4">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Sparkles className="w-3 h-3 text-purple-500 dark:text-purple-400" />
                          <p className="text-[11px] text-purple-700 dark:text-purple-300 font-bold uppercase tracking-wide">AI Summary</p>
                        </div>
                        <p className="text-[14px] text-gray-800 dark:text-gray-100 leading-relaxed">{c.ai_summary}</p>
                      </div>
                    )}
                    {(c.ai_insights ?? []).length > 0 && (
                      <div className="bg-teal-50 dark:bg-teal-500/10 border border-teal-200/60 dark:border-teal-500/20 rounded-xl p-4">
                        <p className="text-[11px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wide mb-2.5">Initial Signals</p>
                        <ul className="space-y-2">
                          {(c.ai_insights ?? []).map((ins: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-[14px] text-gray-700 dark:text-gray-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 shrink-0" />{ins}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {(() => {
                      const step = nextStepFor((c as any).ai_action, null, c.ai_priority, 'bot')
                      if (!step) return null
                      return (
                        <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200/70 dark:border-amber-500/25 rounded-xl">
                          <ArrowRight className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-0.5">Suggested Next Step</p>
                            <p className="text-[14px] text-gray-800 dark:text-gray-200 leading-snug">{step}</p>
                          </div>
                        </div>
                      )
                    })()}
                    {c.ai_entities && (Object.values(c.ai_entities) as (string | string[] | undefined)[]).some(Boolean) && (
                      <div>
                        <button
                          onClick={() => setContactDetailsCollapsed(v => !v)}
                          className="flex items-center gap-1.5 w-full text-left mb-2 group"
                        >
                          <p className="text-xs text-gray-400 flex-1">Contact details extracted</p>
                          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${contactDetailsCollapsed ? '-rotate-90' : ''}`} />
                        </button>
                        {!contactDetailsCollapsed && (
                          <div className="flex flex-wrap gap-2">
                            {[
                              { key: 'bc-name',  icon: User,      value: c.ai_entities.name },
                              { key: 'bc-email', icon: Mail,      value: c.ai_entities.email },
                              { key: 'bc-phone', icon: Phone,     value: c.ai_entities.phone },
                            ].filter(f => f.value).map(f => (
                              <button key={f.key} onClick={() => copyField(f.value!, f.key)}
                                title="Click to copy"
                                className="flex items-center gap-1.5 text-xs bg-[#f0eeeb] dark:bg-white/8 px-2.5 py-1.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/12 transition-colors cursor-pointer">
                                {copiedField === f.key ? <Check className="w-3 h-3 text-green-500" /> : <f.icon className="w-3 h-3 text-gray-400" />}
                                <span className={copiedField === f.key ? 'text-green-600 dark:text-green-400' : ''}>{copiedField === f.key ? 'Copied!' : f.value}</span>
                              </button>
                            ))}
                            {c.ai_entities.product_interest && (
                              <button onClick={() => copyField(c.ai_entities!.product_interest!, 'bc-interest')}
                                title="Click to copy"
                                className="flex items-center gap-1.5 text-xs bg-[#f0eeeb] dark:bg-white/8 px-2.5 py-1.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/12 transition-colors cursor-pointer">
                                <span className={copiedField === 'bc-interest' ? 'text-green-600 dark:text-green-400' : ''}>{copiedField === 'bc-interest' ? 'Copied!' : c.ai_entities.product_interest}</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )
              })()}

              {/* ── Form lead popup ── */}
              {popup.kind === 'form' && (() => {
                const l = data as Lead
                const row = data as Record<string, unknown>
                const formAiSummary = row.ai_summary as string | null | undefined
                const actionedAt    = row.actioned_at as string | null | undefined
                const actionType    = row.action_type as string | null | undefined
                const rawFields     = (row.raw_fields ?? {}) as Record<string, string>
                const knownKeys = new Set(['name','full_name','first_name','last_name','email','phone','company','company_name','job_title','title','website','campaign','campaign_name','form_name','form'])
                const extraFields = Object.entries(rawFields).filter(([k, v]) => !knownKeys.has(k) && v)
                const autoSummary = !formAiSummary ? [
                  l.name && l.name !== '(unknown)' ? `Submitted by ${l.name}` : 'New submission',
                  l.company ? `from ${l.company}` : null,
                  `via ${l.source_platform ?? 'unknown source'}`,
                  l.email ? `· ${l.email}` : null,
                  l.phone ? `· ${l.phone}` : null,
                ].filter(Boolean).join(' ') : null
                const displaySummary = formAiSummary ?? autoSummary
                return (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-500/25 flex items-center justify-center shrink-0 text-sm font-bold text-green-700 dark:text-green-300">
                        {l.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{l.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{timeAgo(l.created_at)}</p>
                      </div>
                      {l.lead_score && (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
                          style={{ background: `${P_COLORS[l.lead_score]}20`, color: P_COLORS[l.lead_score] }}>
                          {l.lead_score}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-500/20">
                        <ExternalLink className="w-3 h-3" />{l.source_platform}
                      </span>
                      {actionedAt ? (
                        <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-[#15A4AE]/10 text-[#3a9e8a] dark:text-[#15A4AE] border border-[#15A4AE]/25">
                          <CheckCircle2 className="w-3 h-3" />Actioned{actionType ? ` · ${actionType}` : ''}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-500/20">
                          New submission
                        </span>
                      )}
                    </div>

                    {displaySummary && (
                      <div className="bg-green-50 dark:bg-green-500/20 border border-green-200 dark:border-green-500/30 rounded-xl p-4">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Sparkles className="w-3 h-3 text-green-500 dark:text-green-400" />
                          <p className="text-[11px] text-green-700 dark:text-green-300 font-bold uppercase tracking-wide">AI Summary</p>
                          {!formAiSummary && <span className="text-[10px] text-gray-400 ml-auto">auto-generated</span>}
                        </div>
                        <p className="text-[14px] text-gray-800 dark:text-gray-100 leading-relaxed">{displaySummary}</p>
                      </div>
                    )}

                    {((row.ai_insights ?? []) as string[]).length > 0 && (
                      <div className="bg-teal-50 dark:bg-teal-500/10 border border-teal-200/60 dark:border-teal-500/20 rounded-xl p-4">
                        <p className="text-[11px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wide mb-2.5">Initial Signals</p>
                        <ul className="space-y-2">
                          {((row.ai_insights ?? []) as string[]).map((ins, i) => (
                            <li key={i} className="flex items-start gap-2 text-[14px] text-gray-700 dark:text-gray-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />{ins}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {(() => {
                      const step = nextStepFor(row.ai_action as string | null, null, row.ai_priority as string | null, 'form')
                      if (!step) return null
                      return (
                        <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200/70 dark:border-amber-500/25 rounded-xl">
                          <ArrowRight className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-0.5">Suggested Next Step</p>
                            <p className="text-[14px] text-gray-800 dark:text-gray-200 leading-snug">{step}</p>
                          </div>
                        </div>
                      )
                    })()}

                    {/* Auto-sent status */}
                    <AutoSentBlock
                      emailSentAt={row.auto_email_sent_at as string | null}
                      emailSentTo={row.auto_email_to as string | null}
                      smsSentAt={row.auto_sms_sent_at as string | null}
                      smsSentTo={row.auto_sms_to as string | null}
                      label="Welcome"
                    />

                    <div>
                      <button
                        onClick={() => setContactDetailsCollapsed(v => !v)}
                        className="flex items-center gap-1.5 w-full text-left mb-2 group"
                      >
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide flex-1">Contact Details</p>
                        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${contactDetailsCollapsed ? '-rotate-90' : ''}`} />
                      </button>
                      {!contactDetailsCollapsed && (
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { label: 'Email',    value: l.email,         icon: Mail },
                            { label: 'Phone',    value: l.phone,         icon: Phone },
                            { label: 'Company',  value: l.company,       icon: Building2 },
                            { label: 'Job Title',value: l.job_title,     icon: User },
                            { label: 'Website',  value: l.website,       icon: ExternalLink },
                            { label: 'Campaign', value: l.campaign_name, icon: Sparkles },
                            { label: 'Form',     value: l.form_name,     icon: FileText },
                          ].filter(f => f.value).map(f => {
                            const ck = `fl-${f.label}`
                            return (
                              <button key={f.label} onClick={() => copyField(f.value!, ck)}
                                title="Click to copy"
                                className="bg-[#f0eeeb] dark:bg-white/5 rounded-xl p-3 text-left hover:bg-gray-200 dark:hover:bg-white/10 transition-colors cursor-pointer">
                                <p className="text-[10px] text-gray-400 mb-0.5">{f.label}</p>
                                <p className={`text-xs font-medium break-all ${copiedField === ck ? 'text-green-600 dark:text-green-400' : 'text-gray-800 dark:text-gray-200'}`}>
                                  {copiedField === ck ? 'Copied!' : f.value}
                                </p>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {extraFields.length > 0 && (
                      <div>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">Form Fields</p>
                        <div className="grid grid-cols-2 gap-2">
                          {extraFields.map(([k, v]) => (
                            <div key={k} className="bg-[#f0eeeb] dark:bg-white/5 rounded-xl p-3">
                              <p className="text-[10px] text-gray-400 mb-0.5 capitalize">{k.replace(/_/g, ' ')}</p>
                              <p className="text-xs font-medium text-gray-800 dark:text-gray-200 break-all">{v}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}

              {/* ── Ticket popup ── */}
              {popup.kind === 'ticket' && (() => {
                const t = data as SageTicket & { contact: { name: string; email: string | null; phone: string | null } | null; name?: string | null; email?: string | null; phone?: string | null; contact_method?: string | null; related_url?: string | null; occurred_at?: string | null }
                const displayName  = t.contact?.name  ?? t.name  ?? null
                const displayEmail = t.contact?.email ?? t.email ?? null
                const displayPhone = t.contact?.phone ?? t.phone ?? null
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
                            {t.status.replace('_', ' ')}
                          </span>
                          {t.contact_method && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                              prefers {t.contact_method}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {((t as any).ai_insights ?? []).length > 0 && (
                      <div className="bg-teal-50 dark:bg-teal-500/10 border border-teal-200/60 dark:border-teal-500/20 rounded-xl p-4">
                        <p className="text-[11px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wide mb-2.5">Initial Signals</p>
                        <ul className="space-y-2">
                          {((t as any).ai_insights as string[]).map((ins, i) => (
                            <li key={i} className="flex items-start gap-2 text-[14px] text-gray-700 dark:text-gray-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0" />{ins}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {(() => {
                      const step = nextStepFor(null, null, t.priority, 'ticket')
                      if (!step) return null
                      return (
                        <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200/70 dark:border-amber-500/25 rounded-xl">
                          <ArrowRight className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-0.5">Suggested Next Step</p>
                            <p className="text-[14px] text-gray-800 dark:text-gray-200 leading-snug">{step}</p>
                          </div>
                        </div>
                      )
                    })()}
                    {/* Auto-sent status */}
                    <AutoSentBlock
                      emailSentAt={(t as any).auto_email_sent_at ?? null}
                      emailSentTo={(t as any).auto_email_to ?? null}
                      smsSentAt={(t as any).auto_sms_sent_at ?? null}
                      smsSentTo={(t as any).auto_sms_to ?? null}
                      label="Acknowledgement"
                    />

                    {(displayName || displayEmail || displayPhone) && (
                      <div>
                        <button
                          onClick={() => setContactDetailsCollapsed(v => !v)}
                          className="flex items-center gap-1.5 w-full text-left mb-2 group"
                        >
                          <p className="text-xs text-gray-400 flex-1">Contact details</p>
                          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${contactDetailsCollapsed ? '-rotate-90' : ''}`} />
                        </button>
                        {!contactDetailsCollapsed && (
                          <div className="flex flex-wrap gap-2">
                            {[
                              { key: 'tk-name',  icon: User,  value: displayName },
                              { key: 'tk-email', icon: Mail,  value: displayEmail },
                              { key: 'tk-phone', icon: Phone, value: displayPhone },
                            ].filter(f => f.value).map(f => (
                              <button key={f.key} onClick={() => copyField(f.value!, f.key)}
                                title="Click to copy"
                                className="flex items-center gap-1.5 text-xs bg-[#f0eeeb] dark:bg-white/8 px-2.5 py-1.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/12 transition-colors cursor-pointer">
                                {copiedField === f.key ? <Check className="w-3 h-3 text-green-500" /> : <f.icon className="w-3 h-3 text-gray-400" />}
                                <span className={copiedField === f.key ? 'text-green-600 dark:text-green-400' : ''}>{copiedField === f.key ? 'Copied!' : f.value}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {t.occurred_at && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-medium text-gray-400">Occurred:</span> {new Date(t.occurred_at).toLocaleDateString()}
                      </div>
                    )}
                    {t.description && (
                      <div className="bg-amber-50 dark:bg-amber-500/15 border border-amber-200/70 dark:border-amber-500/25 rounded-xl p-4">
                        <p className="text-[11px] text-amber-700 dark:text-amber-400 font-bold uppercase tracking-wide mb-2">Description</p>
                        <p className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed whitespace-pre-wrap">{t.description}</p>
                      </div>
                    )}
                    {t.related_url && (
                      <a href={t.related_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline truncate"
                        onClick={e => e.stopPropagation()}>
                        <ExternalLink className="w-3 h-3 shrink-0" /> {t.related_url}
                      </a>
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
          <div className="px-6 py-4 shrink-0 rounded-b-2xl sm:rounded-b-2xl bg-[#e8e0cc]">

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

              {/* Reply compose footer */}
              {showReply ? (
                sendResult === 'sent' ? (
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-[#0a5a70]">
                    <CheckCircle2 className="w-4 h-4" /> Reply sent
                  </p>
                ) : (
                  <>
                    <div className="flex-1" />
                    <button
                      disabled={isEnhancing}
                      onClick={async () => {
                        setIsEnhancing(true)
                        try {
                          const currentHtml = replyRef.current?.innerHTML ?? ''
                          const result = await enhanceEmailReply((data as SageEmail).id, currentHtml)
                          if (result.enhanced && replyRef.current) {
                            replyRef.current.innerHTML = result.enhanced.replace(/\n/g, '<br>')
                          }
                        } finally {
                          setIsEnhancing(false)
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0a5a70] hover:bg-[#0a5a70]/10 rounded-xl transition-colors disabled:opacity-50 border border-[#0a5a70]/30"
                    >
                      {isEnhancing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      {isEnhancing ? 'Enhancing…' : 'Enhance with Sage AI'}
                    </button>
                    <button onClick={handleSendReply} disabled={sending || !replyBody.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#2a7d6e] hover:bg-[#1f6157] text-white rounded-xl transition-colors disabled:opacity-50">
                      {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      {sending ? 'Sending…' : 'Send'}
                    </button>
                  </>
                )

              /* Post-deal or post-ticket */
              ) : postAction ? (
                <>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold ${popup.kind === 'email' ? 'text-[#0a5a70]' : 'text-[#15A4AE]'}`}>
                      {postAction === 'deal_added' ? 'Deal added to pipeline.' : 'Ticket created.'}
                    </p>
                    {ignoring && <p className={`text-[11px] mt-0.5 ${popup.kind === 'email' ? 'text-[#0a5a70]/70' : 'text-gray-400'}`}>Closing…</p>}
                  </div>
                  {!ignoring && popup.kind === 'email' && (
                    <button onClick={() => setShowReply(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#2a7d6e] hover:bg-[#1f6157] text-white rounded-xl transition-colors">
                      <Reply className="w-3.5 h-3.5" /> Reply
                    </button>
                  )}
                  {!ignoring && popup.kind === 'bot' && (data as Conversation)?.ai_entities?.email && (
                    <button onClick={() => setOutboundEmail({ to: (data as Conversation).ai_entities!.email!, toName: (data as Conversation).ai_entities?.name ?? undefined, subject: `Following up — ${(data as Conversation).title ?? 'your conversation'}`, context: [(data as Conversation).title ? `Conversation: ${(data as Conversation).title}` : '', (data as Conversation).ai_summary ? `Summary: ${(data as Conversation).ai_summary}` : ''].filter(Boolean).join('\n') })}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#2a7d6e] hover:bg-[#1f6157] text-white rounded-xl transition-colors">
                      <Mail className="w-3.5 h-3.5" /> Reply via Email
                    </button>
                  )}
                  {!ignoring && popup.kind === 'form' && (data as Lead)?.email && (
                    <button onClick={() => setOutboundEmail({ to: (data as Lead).email!, toName: (data as Lead).name ?? undefined, subject: `Following up — ${(data as Lead).form_name ?? 'your enquiry'}`, context: [(data as Lead).name ? `Name: ${(data as Lead).name}` : '', (data as Lead).campaign_name ? `Campaign: ${(data as Lead).campaign_name}` : ''].filter(Boolean).join('\n') })}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#2a7d6e] hover:bg-[#1f6157] text-white rounded-xl transition-colors">
                      <Mail className="w-3.5 h-3.5" /> Reply via Email
                    </button>
                  )}
                  {!ignoring && popup.kind === 'form' && (data as any)?.phone && !(data as any)?.auto_sms_sent_at && (
                    <button onClick={handleFormSms} disabled={smsBusy}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#2a7d6e] hover:bg-[#1f6157] text-white rounded-xl transition-colors disabled:opacity-50">
                      {smsBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Phone className="w-3.5 h-3.5" />} Send SMS
                    </button>
                  )}
                  {!ignoring && popup.kind === 'ticket' && ((data as {email?:string|null})?.email ?? (data as {contact?:{email?:string|null}|null})?.contact?.email) && (
                    <button onClick={() => { const t = data as {title?:string;description?:string;email?:string|null;name?:string|null;contact?:{email?:string|null;name?:string|null}|null}; const toEmail = t.contact?.email ?? t.email ?? ''; const toName = t.contact?.name ?? t.name ?? undefined; setOutboundEmail({ to: toEmail, toName: toName ?? undefined, subject: `Re: ${t.title ?? 'your ticket'}`, context: [t.title ? `Ticket: ${t.title}` : '', t.description ? `Details: ${t.description}` : ''].filter(Boolean).join('\n') }) }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#2a7d6e] hover:bg-[#1f6157] text-white rounded-xl transition-colors">
                      <Mail className="w-3.5 h-3.5" /> Reply via Email
                    </button>
                  )}
                  {!ignoring && popup.kind === 'ticket' && ((data as any)?.phone ?? (data as any)?.contact?.phone) && !(data as any)?.auto_sms_sent_at && (
                    <button onClick={handleTicketSms} disabled={smsBusy}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#2a7d6e] hover:bg-[#1f6157] text-white rounded-xl transition-colors disabled:opacity-50">
                      {smsBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Phone className="w-3.5 h-3.5" />} Send SMS
                    </button>
                  )}
                  {!ignoring && (
                    <button onClick={handleIgnore}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white/80 bg-white/10 hover:bg-white/20 rounded-xl transition-colors">
                      <X className="w-3.5 h-3.5" /> Ignore
                    </button>
                  )}
                </>

              /* Known contact */
              ) : contactMatch !== null && contactMatch !== undefined ? (
                <>
                  <Link href={`/sage/contacts/${contactMatch.contactId}`} onClick={onClose}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/15 hover:bg-blue-100 dark:hover:bg-blue-500/25 rounded-xl transition-colors border border-blue-200/70 dark:border-blue-500/25">
                    <User className="w-3.5 h-3.5" /> View Contact
                  </Link>
                  {contactMatch.dealId ? (
                    <Link href={contactMatch.dealPipelineId ? `/sage/pipelines/${contactMatch.dealPipelineId}` : '/sage/pipelines'} onClick={onClose}
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
                  {popup.kind === 'bot' && (data as Conversation)?.ai_entities?.email && (
                    <button onClick={() => setOutboundEmail({ to: (data as Conversation).ai_entities!.email!, toName: (data as Conversation).ai_entities?.name ?? undefined, subject: `Following up — ${(data as Conversation).title ?? 'your conversation'}`, context: [(data as Conversation).title ? `Conversation: ${(data as Conversation).title}` : '', (data as Conversation).ai_summary ? `Summary: ${(data as Conversation).ai_summary}` : ''].filter(Boolean).join('\n') })}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#2a7d6e] hover:bg-[#1f6157] text-white rounded-xl transition-colors">
                      <Mail className="w-3.5 h-3.5" /> Reply via Email
                    </button>
                  )}
                  {popup.kind === 'form' && (data as Lead)?.email && (
                    <button onClick={() => setOutboundEmail({ to: (data as Lead).email!, toName: (data as Lead).name ?? undefined, subject: `Following up — ${(data as Lead).form_name ?? 'your enquiry'}`, context: [(data as Lead).name ? `Name: ${(data as Lead).name}` : '', (data as Lead).campaign_name ? `Campaign: ${(data as Lead).campaign_name}` : ''].filter(Boolean).join('\n') })}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#2a7d6e] hover:bg-[#1f6157] text-white rounded-xl transition-colors">
                      <Mail className="w-3.5 h-3.5" /> Reply via Email
                    </button>
                  )}
                  {popup.kind === 'form' && (data as any)?.phone && !(data as any)?.auto_sms_sent_at && (
                    <button onClick={handleFormSms} disabled={smsBusy}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#2a7d6e] hover:bg-[#1f6157] text-white rounded-xl transition-colors disabled:opacity-50">
                      {smsBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Phone className="w-3.5 h-3.5" />} Send SMS
                    </button>
                  )}
                  {popup.kind === 'ticket' && ((data as {email?:string|null})?.email ?? (data as {contact?:{email?:string|null}|null})?.contact?.email) && (
                    <button onClick={() => { const t = data as {title?:string;description?:string;email?:string|null;name?:string|null;contact?:{email?:string|null;name?:string|null}|null}; const toEmail = t.contact?.email ?? t.email ?? ''; const toName = t.contact?.name ?? t.name ?? undefined; setOutboundEmail({ to: toEmail, toName: toName ?? undefined, subject: `Re: ${t.title ?? 'your ticket'}`, context: [t.title ? `Ticket: ${t.title}` : '', t.description ? `Details: ${t.description}` : ''].filter(Boolean).join('\n') }) }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#2a7d6e] hover:bg-[#1f6157] text-white rounded-xl transition-colors">
                      <Mail className="w-3.5 h-3.5" /> Reply via Email
                    </button>
                  )}
                  {popup.kind === 'ticket' && ((data as any)?.phone ?? (data as any)?.contact?.phone) && !(data as any)?.auto_sms_sent_at && (
                    <button onClick={handleTicketSms} disabled={smsBusy}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#2a7d6e] hover:bg-[#1f6157] text-white rounded-xl transition-colors disabled:opacity-50">
                      {smsBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Phone className="w-3.5 h-3.5" />} Send SMS
                    </button>
                  )}
                  <button onClick={handleIgnore}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white/80 bg-white/10 hover:bg-white/20 rounded-xl transition-colors">
                    <X className="w-3.5 h-3.5" /> Ignore
                  </button>
                </>

              /* Unknown contact OR still checking */
              ) : (
                <>
                  {contactMatch === undefined ? (
                    <span className="text-xs text-gray-400 flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin" /> Checking contacts…
                    </span>
                  ) : (
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
                  {popup.kind === 'email' && (
                    <button onClick={() => setShowReply(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#2a7d6e] hover:bg-[#1f6157] text-white rounded-xl transition-colors">
                      <Reply className="w-3.5 h-3.5" /> Reply
                    </button>
                  )}
                  {popup.kind === 'bot' && (data as Conversation)?.ai_entities?.email && (
                    <button onClick={() => setOutboundEmail({ to: (data as Conversation).ai_entities!.email!, toName: (data as Conversation).ai_entities?.name ?? undefined, subject: `Following up — ${(data as Conversation).title ?? 'your conversation'}`, context: [(data as Conversation).title ? `Conversation: ${(data as Conversation).title}` : '', (data as Conversation).ai_summary ? `Summary: ${(data as Conversation).ai_summary}` : ''].filter(Boolean).join('\n') })}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#2a7d6e] hover:bg-[#1f6157] text-white rounded-xl transition-colors">
                      <Mail className="w-3.5 h-3.5" /> Reply via Email
                    </button>
                  )}
                  {popup.kind === 'form' && (data as Lead)?.email && (
                    <button onClick={() => setOutboundEmail({ to: (data as Lead).email!, toName: (data as Lead).name ?? undefined, subject: `Following up — ${(data as Lead).form_name ?? 'your enquiry'}`, context: [(data as Lead).name ? `Name: ${(data as Lead).name}` : '', (data as Lead).campaign_name ? `Campaign: ${(data as Lead).campaign_name}` : ''].filter(Boolean).join('\n') })}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#2a7d6e] hover:bg-[#1f6157] text-white rounded-xl transition-colors">
                      <Mail className="w-3.5 h-3.5" /> Reply via Email
                    </button>
                  )}
                  {popup.kind === 'form' && (data as any)?.phone && !(data as any)?.auto_sms_sent_at && (
                    <button onClick={handleFormSms} disabled={smsBusy}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#2a7d6e] hover:bg-[#1f6157] text-white rounded-xl transition-colors disabled:opacity-50">
                      {smsBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Phone className="w-3.5 h-3.5" />} Send SMS
                    </button>
                  )}
                  {popup.kind === 'ticket' && ((data as {email?:string|null})?.email ?? (data as {contact?:{email?:string|null}|null})?.contact?.email) && (
                    <button onClick={() => { const t = data as {title?:string;description?:string;email?:string|null;name?:string|null;contact?:{email?:string|null;name?:string|null}|null}; const toEmail = t.contact?.email ?? t.email ?? ''; const toName = t.contact?.name ?? t.name ?? undefined; setOutboundEmail({ to: toEmail, toName: toName ?? undefined, subject: `Re: ${t.title ?? 'your ticket'}`, context: [t.title ? `Ticket: ${t.title}` : '', t.description ? `Details: ${t.description}` : ''].filter(Boolean).join('\n') }) }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#2a7d6e] hover:bg-[#1f6157] text-white rounded-xl transition-colors">
                      <Mail className="w-3.5 h-3.5" /> Reply via Email
                    </button>
                  )}
                  {popup.kind === 'ticket' && ((data as any)?.phone ?? (data as any)?.contact?.phone) && !(data as any)?.auto_sms_sent_at && (
                    <button onClick={handleTicketSms} disabled={smsBusy}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#2a7d6e] hover:bg-[#1f6157] text-white rounded-xl transition-colors disabled:opacity-50">
                      {smsBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Phone className="w-3.5 h-3.5" />} Send SMS
                    </button>
                  )}
                  <button onClick={handleIgnore}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-colors">
                    <X className="w-3.5 h-3.5" /> Ignore
                  </button>
                </>
              )}

            </div>
          </div>
        )}
      </div>

      {outboundEmail && (
        <EmailComposeModal
          to={outboundEmail.to}
          toName={outboundEmail.toName}
          subject={outboundEmail.subject}
          context={outboundEmail.context}
          onClose={() => setOutboundEmail(null)}
        />
      )}
    </div>
  )
}

// ── AutoSentBlock ─────────────────────────────────────────────────────────────

function AutoSentBlock({
  emailSentAt,
  emailSentTo,
  smsSentAt,
  smsSentTo,
  label,
}: {
  emailSentAt: string | null
  emailSentTo: string | null
  smsSentAt:   string | null
  smsSentTo:   string | null
  label:       string
}) {
  const emailSent = !!emailSentAt
  const smsSent   = !!smsSentAt
  const anySent   = emailSent || smsSent

  if (anySent) {
    return (
      <div className="flex items-start gap-3 px-4 py-3 bg-green-50 dark:bg-green-500/10 border border-green-200/70 dark:border-green-500/25 rounded-xl">
        <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
        <div className="flex flex-col gap-0.5">
          <p className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase tracking-wide">{label} sent automatically</p>
          {emailSent && (
            <p className="text-[13px] text-gray-700 dark:text-gray-300">
              Email → <span className="font-medium">{emailSentTo}</span>
              {emailSentAt && <span className="text-gray-400"> · {timeAgo(emailSentAt)}</span>}
            </p>
          )}
          {smsSent && (
            <p className="text-[13px] text-gray-700 dark:text-gray-300">
              SMS → <span className="font-medium">{smsSentTo}</span>
              {smsSentAt && <span className="text-gray-400"> · {timeAgo(smsSentAt)}</span>}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl">
      <SendHorizontal className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">{label} not yet sent</p>
        <p className="text-[13px] text-gray-500 dark:text-gray-400">Use the reply button to send a {label.toLowerCase()} email, or the SMS button to send a text.</p>
      </div>
    </div>
  )
}
