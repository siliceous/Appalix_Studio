'use client'

import React, { useState, useTransition, useRef } from 'react'
import Link from 'next/link'
import {
  Mail, RefreshCw, Send, Sparkles, Star, Inbox,
  Loader2, AlertCircle, Paperclip, Receipt, FileText, X, ArrowRight,
  Pencil, Search, Trash2, Reply, Forward, FolderInput, MoreHorizontal,
} from 'lucide-react'
import {
  syncEmails, quickCheckEmails, sendEmail, rewriteEmail,
  markEmailStarred, markEmailTrashed,
  fetchStripeInvoices, fetchStripeInvoicePDF, generateProposalPDF,
} from '@/app/actions/sage-emails'
import type { SageEmail } from '@/lib/types'
import { cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────────────────

interface EmailAttachment { filename: string; contentType: string; dataBase64: string }

interface StripeInvoice {
  id: string; number: string | null; customer_name: string | null
  customer_email: string | null; amount_due: number; currency: string
  status: string; invoice_pdf: string | null; created: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d   = new Date(iso)
  const now = new Date()
  const diffH = (now.getTime() - d.getTime()) / 3_600_000
  if (diffH < 24)  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  if (diffH < 168) return d.toLocaleDateString('en-US', { weekday: 'short' })
  if (now.getFullYear() === d.getFullYear()) return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}

function formatFull(iso: string) {
  return new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: currency.toUpperCase(), maximumFractionDigits: 2,
  }).format(amount / 100)
}

type MailView       = 'inbox' | 'sent' | 'drafts' | 'all' | 'trash'
type ComposeMode    = 'reply' | 'forward' | 'compose' | null
const DRAFT_TONES   = ['Professional', 'Friendly', 'Concise'] as const

const PRIORITY_STYLE = {
  high:   'bg-red-50 dark:bg-red-500/10 text-red-500 border-red-200 dark:border-red-500/20',
  medium: 'bg-amber-50 dark:bg-amber-500/10 text-amber-500 border-amber-200 dark:border-amber-500/20',
  low:    'bg-gray-100 dark:bg-white/5 text-gray-400 border-gray-200 dark:border-white/10',
} as const

const PRIORITY_DOT = {
  high:   'bg-red-500',
  medium: 'bg-amber-400',
  low:    'bg-gray-300 dark:bg-gray-600',
} as const

// ─── Main component ──────────────────────────────────────────────────────────

interface EmailInboxProps {
  initialEmails:   SageEmail[]
  workspaceId:     string
  stripeConnected?: boolean
  contactDeals?:   Record<string, { id: string; title: string }[]>
}

export function EmailInbox({
  initialEmails,
  stripeConnected = false,
  contactDeals    = {},
}: EmailInboxProps) {

  // ── State ──────────────────────────────────────────────────────────────────
  const [emails,      setEmails]      = useState<SageEmail[]>(initialEmails)
  const [selected,    setSelected]    = useState<SageEmail | null>(null)
  const [mailView,    setMailView]    = useState<MailView>('inbox')
  const [search,      setSearch]      = useState('')
  const [composeMode, setComposeMode] = useState<ComposeMode>(null)
  const [showMoveMenu, setShowMoveMenu] = useState(false)

  const [composeTo,   setComposeTo]   = useState('')
  const [composeSubj, setComposeSubj] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [activeDraft, setActiveDraft] = useState(0)
  const [rewriteInst, setRewriteInst] = useState('')
  const [showRewrite, setShowRewrite] = useState(false)
  const [syncResult,  setSyncResult]  = useState<string | null>(null)
  const [sendResult,  setSendResult]  = useState<string | null>(null)

  const [attachments,      setAttachments]      = useState<EmailAttachment[]>([])
  const [showStripePanel,  setShowStripePanel]  = useState(false)
  const [stripeInvoices,   setStripeInvoices]   = useState<StripeInvoice[]>([])
  const [invoicesLoaded,   setInvoicesLoaded]   = useState(false)
  const [stripeError,      setStripeError]      = useState<string | null>(null)
  const [loadingInvoiceId, setLoadingInvoiceId] = useState<string | null>(null)
  const [isGenProp,        setIsGenProp]        = useState(false)
  const [proposalError,    setProposalError]    = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isPending,    startSyncTransition]    = useTransition()
  const [isChecking,   startCheckTransition]   = useTransition()
  const [isSending,    startSendTransition]    = useTransition()
  const [isRewriting,  startRewriteTrans]      = useTransition()

  // ── Derived ────────────────────────────────────────────────────────────────

  const viewEmails = emails.filter(e => {
    const trashed = e.is_trashed ?? false
    if (mailView === 'inbox')  return e.direction === 'inbound'  && !trashed
    if (mailView === 'sent')   return e.direction === 'outbound' && !trashed
    if (mailView === 'drafts') return false  // placeholder
    if (mailView === 'all')    return !trashed
    if (mailView === 'trash')  return trashed
    return true
  })

  const filteredEmails = viewEmails.filter(e =>
    !search.trim() ||
    e.from_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.from_address.toLowerCase().includes(search.toLowerCase()) ||
    e.subject.toLowerCase().includes(search.toLowerCase()),
  )

  const counts = {
    inbox:  emails.filter(e => e.direction === 'inbound'  && !(e.is_trashed ?? false)).length,
    sent:   emails.filter(e => e.direction === 'outbound' && !(e.is_trashed ?? false)).length,
    drafts: 0,
    all:    emails.filter(e => !(e.is_trashed ?? false)).length,
    trash:  emails.filter(e => e.is_trashed ?? false).length,
  }

  const linkedDeals = selected?.contact_id ? (contactDeals[selected.contact_id] ?? []) : []

  // ── Handlers ───────────────────────────────────────────────────────────────

  function openEmail(email: SageEmail) {
    setSelected(email)
    setComposeMode(null)
    setShowMoveMenu(false)
    setSendResult(null)
    setShowRewrite(false)
    setRewriteInst('')
    setAttachments([])
    setShowStripePanel(false)
    setStripeError(null)
    setProposalError(null)
  }

  function openCompose() {
    setSelected(null)
    setComposeMode('compose')
    setComposeTo('')
    setComposeSubj('')
    setComposeBody('')
    setAttachments([])
    setSendResult(null)
    setShowRewrite(false)
  }

  function openReply(mode: 'reply' | 'forward') {
    if (!selected) return
    if (mode === 'reply') {
      setComposeTo(selected.from_address)
      setComposeSubj(selected.subject.startsWith('Re:') ? selected.subject : `Re: ${selected.subject}`)
      const drafts = selected.ai_reply_drafts ?? []
      setComposeBody(drafts.length > 0 ? drafts[0].body : '')
      setActiveDraft(0)
    } else {
      setComposeTo('')
      setComposeSubj(`Fwd: ${selected.subject}`)
      setComposeBody(
        `\n\n——— Forwarded Message ———\nFrom: ${selected.from_name ?? selected.from_address} <${selected.from_address}>\nDate: ${formatFull(selected.received_at)}\nSubject: ${selected.subject}\n\n${selected.body_text ?? ''}`,
      )
    }
    setSendResult(null)
    setAttachments([])
    setShowRewrite(false)
    setComposeMode(mode)
  }

  function handleDraftTab(idx: number) {
    setActiveDraft(idx)
    const drafts = selected?.ai_reply_drafts ?? []
    if (drafts[idx]) setComposeBody(drafts[idx].body)
  }

  // Full sync (250 emails)
  function handleSync() {
    setSyncResult(null)
    startSyncTransition(async () => {
      const result = await syncEmails()
      if (result.error) {
        setSyncResult(`Error: ${result.error}`)
      } else {
        setSyncResult(result.synced === 0 ? 'Up to date.' : `${result.synced} new email${result.synced === 1 ? '' : 's'} synced.`)
        window.location.reload()
      }
    })
  }

  // Quick check (10 latest)
  function handleQuickCheck() {
    setSyncResult(null)
    startCheckTransition(async () => {
      const result = await quickCheckEmails()
      if (result.error) {
        setSyncResult(`Error: ${result.error}`)
      } else {
        setSyncResult(result.synced === 0 ? 'No new emails.' : `${result.synced} new email${result.synced === 1 ? '' : 's'}.`)
        if (result.synced > 0) window.location.reload()
      }
    })
  }

  // Optimistic star toggle
  function handleToggleStar(email: SageEmail, e: React.MouseEvent) {
    e.stopPropagation()
    const next = !email.is_starred
    setEmails(prev => prev.map(m => m.id === email.id ? { ...m, is_starred: next } : m))
    if (selected?.id === email.id) setSelected(s => s ? { ...s, is_starred: next } : s)
    markEmailStarred(email.id, next).catch(() => {
      // revert on error
      setEmails(prev => prev.map(m => m.id === email.id ? { ...m, is_starred: email.is_starred } : m))
    })
  }

  // Move to trash / restore
  function handleTrash(email: SageEmail, trashed = true) {
    setEmails(prev => prev.map(m => m.id === email.id ? { ...m, is_trashed: trashed } : m))
    if (selected?.id === email.id) setSelected(null)
    markEmailTrashed(email.id, trashed)
    setShowMoveMenu(false)
  }

  function handleMove(target: 'inbox' | 'trash') {
    if (!selected) return
    if (target === 'trash') handleTrash(selected, true)
    else handleTrash(selected, false)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    Array.from(e.target.files ?? []).forEach(file => {
      const reader = new FileReader()
      reader.onload = () => {
        const res = reader.result as string
        const comma = res.indexOf(',')
        setAttachments(prev => [...prev, {
          filename:    file.name,
          contentType: file.type || 'application/octet-stream',
          dataBase64:  comma >= 0 ? res.slice(comma + 1) : res,
        }])
      }
      reader.readAsDataURL(file)
    })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleOpenStripePanel() {
    setShowStripePanel(v => !v)
    if (!invoicesLoaded) {
      setStripeError(null)
      const result = await fetchStripeInvoices()
      if (result.error) { setStripeError(result.error) }
      else { setStripeInvoices(result.invoices); setInvoicesLoaded(true) }
    }
  }

  async function handleAttachInvoice(invoice: StripeInvoice) {
    setLoadingInvoiceId(invoice.id)
    const att = await fetchStripeInvoicePDF(invoice.id)
    if (att.error) { setStripeError(att.error) }
    else {
      setAttachments(prev => [...prev, { filename: att.filename, contentType: att.contentType, dataBase64: att.dataBase64 }])
      setShowStripePanel(false)
    }
    setLoadingInvoiceId(null)
  }

  async function handleGenerateProposal(dealId: string) {
    setIsGenProp(true)
    setProposalError(null)
    const att = await generateProposalPDF(dealId)
    if (att.error) { setProposalError(att.error) }
    else { setAttachments(prev => [...prev, { filename: att.filename, contentType: att.contentType, dataBase64: att.dataBase64 }]) }
    setIsGenProp(false)
  }

  function handleSend() {
    if (!composeTo || !composeSubj || !composeBody) return
    setSendResult(null)
    startSendTransition(async () => {
      const result = await sendEmail({
        to: composeTo, subject: composeSubj, body: composeBody,
        replyToEmailId: (composeMode === 'reply' || composeMode === 'forward') ? selected?.id : undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
      })
      if (result.error) {
        setSendResult(`Error: ${result.error}`)
      } else {
        setSendResult('Sent.')
        setComposeBody('')
        setAttachments([])
        const sent: SageEmail = {
          id: crypto.randomUUID(), workspace_id: selected?.workspace_id ?? '',
          contact_id: selected?.contact_id ?? null, deal_id: null,
          message_id: `sent-${Date.now()}`, thread_id: selected?.message_id ?? null,
          from_address: 'you', from_name: 'You', to_address: composeTo,
          subject: composeSubj, body_text: composeBody, body_html: null,
          received_at: new Date().toISOString(), direction: 'outbound',
          is_read: true, is_starred: false, is_trashed: false,
          ai_priority: null, ai_summary: null, ai_reason: null,
          ai_action: null, ai_entities: null, ai_insights: null,
          ai_reply_drafts: null, ai_analyzed_at: null,
          created_at: new Date().toISOString(),
        }
        setEmails(prev => [sent, ...prev])
        if (composeMode === 'compose') { setComposeMode(null); setSelected(null) }
        else { setComposeMode(null) }
      }
    })
  }

  function handleRewrite() {
    if (!composeBody) return
    startRewriteTrans(async () => {
      const result = await rewriteEmail({
        emailId: selected?.id, body: composeBody,
        instruction: rewriteInst || 'Rewrite this email to be clear, professional, and concise.',
      })
      if (!result.error) { setComposeBody(result.body); setShowRewrite(false); setRewriteInst('') }
    })
  }

  // ── Compose form (inline render function, not a component) ────────────────

  function renderComposeForm() {
    const isReply = composeMode === 'reply' || composeMode === 'forward'

    return (
      <div className="flex flex-col">
        {/* AI draft tabs — only in reply mode */}
        {isReply && selected?.ai_reply_drafts && selected.ai_reply_drafts.length > 0 && (
          <div className="flex items-center gap-1.5 px-5 py-2.5 border-b dark:border-white/8 bg-gray-50 dark:bg-white/2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mr-1">AI Drafts</span>
            {DRAFT_TONES.map((tone, i) => (
              selected.ai_reply_drafts![i] && (
                <button
                  key={tone}
                  onClick={() => handleDraftTab(i)}
                  className={cn(
                    'text-[11px] px-2.5 py-1 rounded-lg font-medium transition-colors',
                    activeDraft === i
                      ? 'bg-brand-600 text-white'
                      : 'bg-white dark:bg-white/5 border dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10',
                  )}
                >
                  {tone}
                </button>
              )
            ))}
          </div>
        )}

        <div className="px-5 py-4 space-y-3">
          {/* To */}
          <div className="flex items-center gap-2 border-b dark:border-white/8 pb-2.5">
            <span className="text-[11px] font-semibold text-gray-400 w-7 shrink-0">To</span>
            <input
              value={composeTo}
              onChange={e => setComposeTo(e.target.value)}
              placeholder="recipient@email.com"
              className="flex-1 text-sm bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none"
            />
          </div>
          {/* Subject */}
          <div className="flex items-center gap-2 border-b dark:border-white/8 pb-2.5">
            <span className="text-[11px] font-semibold text-gray-400 w-7 shrink-0">Sub</span>
            <input
              value={composeSubj}
              onChange={e => setComposeSubj(e.target.value)}
              placeholder="Subject"
              className="flex-1 text-sm bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none"
            />
          </div>
          {/* Body */}
          <textarea
            rows={composeMode === 'compose' ? 14 : 6}
            value={composeBody}
            onChange={e => setComposeBody(e.target.value)}
            placeholder={isReply ? 'Write your reply…' : 'Compose email…'}
            className="w-full text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 bg-transparent focus:outline-none resize-none leading-relaxed"
          />

          {/* Attachment chips */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {attachments.map((att, i) => (
                <span key={i} className="flex items-center gap-1 text-[11px] px-2 py-1 bg-gray-100 dark:bg-white/5 border dark:border-white/10 rounded-lg text-gray-600 dark:text-gray-300">
                  <Paperclip className="w-3 h-3 shrink-0 text-gray-400" />
                  <span className="max-w-[120px] truncate">{att.filename}</span>
                  <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-400"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          )}

          {/* AI rewrite input */}
          {showRewrite && (
            <div className="flex gap-2">
              <input
                value={rewriteInst}
                onChange={e => setRewriteInst(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleRewrite() }}
                placeholder="e.g. make it shorter, more formal…"
                className="flex-1 px-3 py-1.5 text-xs border dark:border-white/10 rounded-lg bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <button onClick={handleRewrite} disabled={isRewriting || !composeBody}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50">
                {isRewriting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Apply
              </button>
              <button onClick={() => setShowRewrite(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X className="w-4 h-4" /></button>
            </div>
          )}

          {/* Toolbar */}
          <div className="flex items-center gap-1 pt-1 border-t dark:border-white/8">
            {/* Send */}
            <button onClick={handleSend} disabled={isSending || !composeTo || !composeSubj || !composeBody}
              className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 mr-2">
              {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Send{attachments.length > 0 ? ` +${attachments.length}` : ''}
            </button>

            {/* File */}
            <input ref={fileInputRef} type="file" multiple className="sr-only" onChange={handleFileChange} />
            <button onClick={() => fileInputRef.current?.click()} title="Attach file"
              className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Stripe */}
            {stripeConnected && (
              <div className="relative">
                <button onClick={handleOpenStripePanel} title="Attach Stripe invoice"
                  className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                  <Receipt className="w-4 h-4" />
                </button>
                {showStripePanel && (
                  <div className="absolute bottom-full mb-2 left-0 w-72 bg-white dark:bg-[#2a2a2a] border dark:border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
                    <div className="px-3 py-2 border-b dark:border-white/8 flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Stripe Invoices</p>
                      <button onClick={() => setShowStripePanel(false)}><X className="w-3.5 h-3.5 text-gray-400" /></button>
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                      {stripeError && <p className="text-xs text-red-400 px-3 py-2">{stripeError}</p>}
                      {!invoicesLoaded && !stripeError && <div className="flex items-center justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-gray-400" /></div>}
                      {invoicesLoaded && stripeInvoices.length === 0 && <p className="text-xs text-gray-400 px-3 py-4">No open invoices found.</p>}
                      {stripeInvoices.map(inv => (
                        <button key={inv.id} onClick={() => handleAttachInvoice(inv)} disabled={loadingInvoiceId === inv.id}
                          className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 border-b dark:border-white/5 last:border-0 transition-colors disabled:opacity-60">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{inv.customer_name ?? inv.customer_email ?? 'Unknown'}</p>
                              <p className="text-[11px] text-gray-400">{inv.number ?? inv.id} · {formatCurrency(inv.amount_due, inv.currency)}</p>
                            </div>
                            {loadingInvoiceId === inv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400 shrink-0" /> : <Paperclip className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Proposal */}
            {linkedDeals.map(deal => (
              <button key={deal.id} onClick={() => handleGenerateProposal(deal.id)} disabled={isGenProp}
                title={`Generate proposal for "${deal.title}"`}
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-60">
                {isGenProp ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              </button>
            ))}

            {/* AI Rewrite */}
            <button onClick={() => setShowRewrite(v => !v)}
              className={cn(
                'ml-auto flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg font-medium transition-colors',
                showRewrite
                  ? 'bg-brand-50 dark:bg-[#61c2ad]/10 text-brand-600 dark:text-[#61c2ad]'
                  : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-600 dark:hover:text-gray-300',
              )}>
              <Sparkles className="w-3.5 h-3.5" /> AI Rewrite
            </button>
          </div>

          {/* Status */}
          {proposalError && <p className="text-[11px] text-red-400">{proposalError}</p>}
          {sendResult && (
            <p className={cn('text-xs font-medium', sendResult.startsWith('Error') ? 'text-red-500' : 'text-green-500')}>
              {sendResult}
            </p>
          )}
        </div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-white dark:bg-[#1a1a1a]">

      {/* ─── LEFT SIDEBAR ──────────────────────────────────────────────────── */}
      <aside className="w-[200px] shrink-0 flex flex-col border-r dark:border-white/8 bg-gray-50/80 dark:bg-[#161616]">
        {/* Compose */}
        <div className="p-3 pb-2">
          <button onClick={openCompose}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-white dark:bg-[#252525] hover:bg-gray-100 dark:hover:bg-[#2e2e2e] border dark:border-white/8 rounded-2xl shadow-sm text-sm font-semibold text-gray-700 dark:text-gray-200 transition-all">
            <Pencil className="w-4 h-4 text-brand-500 dark:text-[#61c2ad] shrink-0" />
            Compose
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto py-1">
          {([
            { key: 'inbox'  as MailView, label: 'Inbox',    icon: <Inbox    className="w-4 h-4" /> },
            { key: 'sent'   as MailView, label: 'Sent',     icon: <Send     className="w-4 h-4" /> },
            { key: 'drafts' as MailView, label: 'Drafts',   icon: <Pencil   className="w-4 h-4" /> },
            { key: 'all'    as MailView, label: 'All Mail', icon: <Mail     className="w-4 h-4" /> },
            { key: 'trash'  as MailView, label: 'Trash',    icon: <Trash2   className="w-4 h-4" /> },
          ]).map(item => (
            <button key={item.key} onClick={() => setMailView(item.key)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                mailView === item.key
                  ? 'bg-brand-100 dark:bg-[#ec732e]/15 text-brand-700 dark:text-[#ec732e]'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-white/5',
              )}>
              {item.icon}
              <span className="flex-1 text-left">{item.label}</span>
              {counts[item.key] > 0 && (
                <span className={cn('text-[11px] font-bold', mailView === item.key ? 'text-brand-600 dark:text-[#ec732e]' : 'text-gray-400 dark:text-gray-500')}>
                  {counts[item.key]}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Sync at bottom */}
        <div className="px-3 py-3 border-t dark:border-white/8 space-y-1">
          <button onClick={handleSync} disabled={isPending}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-white/5 transition-colors disabled:opacity-60">
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Sync All (250)
          </button>
          {syncResult && (
            <p className={cn('text-[11px] px-3', syncResult.startsWith('Error') ? 'text-red-400' : 'text-gray-400 dark:text-gray-500')}>
              {syncResult}
            </p>
          )}
        </div>
      </aside>

      {/* ─── EMAIL LIST ────────────────────────────────────────────────────── */}
      <div className="w-[360px] shrink-0 flex flex-col border-r dark:border-white/8">

        {/* Search + quick check */}
        <div className="px-4 py-3 border-b dark:border-white/8 bg-white dark:bg-[#1a1a1a] space-y-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-white/6 rounded-xl">
            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search in mail"
              className="flex-1 text-xs bg-transparent text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none" />
            {search && <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X className="w-3 h-3" /></button>}
          </div>
          <button onClick={handleQuickCheck} disabled={isChecking}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-medium text-brand-600 dark:text-[#61c2ad] hover:bg-brand-50 dark:hover:bg-[#61c2ad]/10 rounded-lg transition-colors disabled:opacity-60">
            {isChecking ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Check for new emails
          </button>
        </div>

        {/* Email rows */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-[#1a1a1a]">
          {filteredEmails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 py-12">
              <Mail className="w-10 h-10 opacity-20" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {mailView === 'trash' ? 'Trash is empty' : mailView === 'drafts' ? 'No drafts' : emails.length === 0 ? 'No emails yet' : 'No emails match filter'}
              </p>
              {emails.length === 0 && (
                <Link href="/sage/integrations"
                  className="flex items-center gap-2 text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5 hover:bg-amber-500/15 transition-colors">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  Connect Gmail or Outlook
                  <ArrowRight className="w-3.5 h-3.5 shrink-0 ml-auto" />
                </Link>
              )}
            </div>
          ) : (
            filteredEmails.map(email => {
              const isSelected = selected?.id === email.id
              const isUnread   = !email.is_read && email.direction === 'inbound'
              return (
                <button key={email.id} onClick={() => openEmail(email)}
                  className={cn(
                    'w-full text-left border-b dark:border-white/5 transition-colors',
                    isSelected
                      ? 'bg-blue-50 dark:bg-[#ec732e]/8 border-l-[3px] border-l-brand-500 dark:border-l-[#ec732e]'
                      : 'hover:bg-gray-50 dark:hover:bg-white/3 border-l-[3px] border-l-transparent',
                  )}>
                  <div className="flex items-center pl-3 pr-4 py-3 gap-2.5">
                    {/* Priority dot */}
                    <span className={cn('w-2 h-2 rounded-full shrink-0',
                      email.ai_priority ? PRIORITY_DOT[email.ai_priority] : 'invisible')} />
                    {/* Star */}
                    <button onClick={e => handleToggleStar(email, e)} className="shrink-0">
                      <Star className={cn('w-4 h-4 transition-colors',
                        email.is_starred ? 'text-amber-400 fill-amber-400' : 'text-gray-200 dark:text-gray-700 hover:text-amber-300')} />
                    </button>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 mb-0.5">
                        <span className={cn('text-sm leading-snug truncate',
                          isUnread ? 'font-bold text-gray-900 dark:text-gray-50' : 'font-medium text-gray-600 dark:text-gray-400')}>
                          {email.direction === 'outbound' ? `To: ${email.to_address}` : (email.from_name ?? email.from_address)}
                        </span>
                        <span className={cn('text-[11px] shrink-0 tabular-nums',
                          isUnread ? 'font-semibold text-gray-700 dark:text-gray-300' : 'text-gray-400')}>
                          {formatDate(email.received_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs truncate">
                        <span className={cn('truncate', isUnread ? 'font-semibold text-gray-800 dark:text-gray-200' : 'text-gray-500 dark:text-gray-500')}>
                          {email.subject}
                        </span>
                        {email.ai_summary && (
                          <span className="text-gray-400 dark:text-gray-600 truncate shrink-0 max-w-[100px]">
                            — {email.ai_summary}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ─── DETAIL / COMPOSE PANEL ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#1a1a1a]">

        {/* ── New Compose ── */}
        {composeMode === 'compose' && !selected ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b dark:border-white/8 shrink-0">
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">New Message</h2>
              <button onClick={() => setComposeMode(null)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              {renderComposeForm()}
            </div>
          </div>

        ) : selected ? (
          /* ── Email Detail ── */
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden">

              {/* ── Email header ── */}
              <div className="px-6 py-5 border-b dark:border-white/8 shrink-0">
                {/* Subject */}
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 leading-snug">
                  {selected.subject}
                </h2>

                {/* Sender row + action bar */}
                <div className="flex items-start justify-between gap-4">
                  {/* Sender info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-brand-100 dark:bg-[#ec732e]/20 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-brand-600 dark:text-[#ec732e]">
                        {(selected.from_name ?? selected.from_address).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                        {selected.direction === 'outbound' ? 'You' : (selected.from_name ?? selected.from_address)}
                        {selected.from_name && selected.direction === 'inbound' && (
                          <span className="text-xs text-gray-400 font-normal ml-1.5">&lt;{selected.from_address}&gt;</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">to {selected.to_address}</p>
                    </div>
                  </div>

                  {/* ── Top-right action bar ── */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Received time */}
                    <span className="text-xs text-gray-400 dark:text-gray-500 mr-1 whitespace-nowrap">
                      {formatFull(selected.received_at)}
                    </span>

                    {/* Star */}
                    <button onClick={e => handleToggleStar(selected, e)} title="Star"
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                      <Star className={cn('w-4 h-4', selected.is_starred ? 'text-amber-400 fill-amber-400' : 'text-gray-400')} />
                    </button>

                    {/* Priority badge */}
                    {selected.ai_priority && (
                      <span className={cn('flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wide border', PRIORITY_STYLE[selected.ai_priority])}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', PRIORITY_DOT[selected.ai_priority])} />
                        {selected.ai_priority}
                      </span>
                    )}

                    {/* Reply */}
                    <button onClick={() => openReply('reply')} title="Reply"
                      className={cn('p-1.5 rounded-lg transition-colors', composeMode === 'reply' ? 'bg-brand-100 dark:bg-[#ec732e]/15 text-brand-600 dark:text-[#ec732e]' : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400')}>
                      <Reply className="w-4 h-4" />
                    </button>

                    {/* Forward */}
                    <button onClick={() => openReply('forward')} title="Forward"
                      className={cn('p-1.5 rounded-lg transition-colors', composeMode === 'forward' ? 'bg-brand-100 dark:bg-[#ec732e]/15 text-brand-600 dark:text-[#ec732e]' : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400')}>
                      <Forward className="w-4 h-4" />
                    </button>

                    {/* Move to folder */}
                    <div className="relative">
                      <button onClick={() => setShowMoveMenu(v => !v)} title="Move to folder"
                        className={cn('p-1.5 rounded-lg transition-colors', showMoveMenu ? 'bg-gray-100 dark:bg-white/5' : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400')}>
                        <FolderInput className="w-4 h-4" />
                      </button>
                      {showMoveMenu && (
                        <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-[#2a2a2a] border dark:border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide px-3 pt-2.5 pb-1">Move to</p>
                          {[
                            { label: 'Inbox', action: () => handleMove('inbox') },
                            { label: 'Trash', action: () => handleMove('trash') },
                          ].map(item => (
                            <button key={item.label} onClick={item.action}
                              className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                              {item.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Delete */}
                    <button onClick={() => handleTrash(selected)} title="Move to Trash"
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* More */}
                    <button title="More actions"
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 transition-colors">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Email body */}
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-7 max-w-2xl">
                  {selected.body_text ?? '(No plain text body)'}
                </div>

                {/* Gmail-style Reply / Forward buttons at end of email body */}
                {!composeMode && (
                  <div className="flex gap-3 mt-8 mb-2">
                    <button onClick={() => openReply('reply')}
                      className="flex items-center gap-2 px-5 py-2 border dark:border-white/10 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <Reply className="w-4 h-4" /> Reply
                    </button>
                    <button onClick={() => openReply('forward')}
                      className="flex items-center gap-2 px-5 py-2 border dark:border-white/10 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <Forward className="w-4 h-4" /> Forward
                    </button>
                  </div>
                )}
              </div>

              {/* ── Inline Reply / Forward compose panel ── */}
              {(composeMode === 'reply' || composeMode === 'forward') && (
                <div className="mx-4 mb-4 rounded-2xl border dark:border-white/10 shadow-sm overflow-hidden bg-white dark:bg-[#1a1a1a] shrink-0">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b dark:border-white/8 bg-gray-50 dark:bg-white/3">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                      {composeMode === 'reply' ? `Reply to ${selected.from_name ?? selected.from_address}` : 'Forward'}
                    </span>
                    <button onClick={() => setComposeMode(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {renderComposeForm()}
                </div>
              )}
            </div>

            {/* ── AI insights sidebar ── */}
            {(selected.ai_insights?.length || selected.ai_summary) && (
              <div className="w-56 shrink-0 border-l dark:border-white/8 bg-gray-50 dark:bg-white/2 overflow-y-auto p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-brand-500 dark:text-[#61c2ad]" />
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300">AI Insights</p>
                </div>
                {selected.ai_summary && (
                  <div className="bg-white dark:bg-white/5 rounded-xl p-3 border dark:border-white/8">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide font-bold mb-1.5">Summary</p>
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{selected.ai_summary}</p>
                  </div>
                )}
                {selected.ai_insights && selected.ai_insights.length > 0 && (
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide font-bold mb-2">Key Points</p>
                    <ul className="space-y-2.5">
                      {selected.ai_insights.map((insight, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-500 dark:bg-[#61c2ad] shrink-0" />
                          <span className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

        ) : (
          /* ── Empty state ── */
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-400 dark:text-gray-500">
            <div className="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
              <Mail className="w-9 h-9 opacity-30" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                {emails.length === 0 ? 'Your inbox is empty' : 'Select an email to read'}
              </p>
              <p className="text-xs opacity-70">
                {emails.length === 0 ? 'Connect your email account and sync to get started' : 'Choose an email from the list on the left'}
              </p>
            </div>
            {emails.length === 0 && (
              <Link href="/sage/integrations"
                className="flex items-center gap-2 text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5 hover:bg-amber-500/15 transition-colors">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Connect Gmail or Outlook in Sage → Integrations
                <ArrowRight className="w-3.5 h-3.5 shrink-0 ml-auto" />
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
