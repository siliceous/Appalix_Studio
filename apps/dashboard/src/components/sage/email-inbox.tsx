'use client'

import React, { useState, useTransition, useRef } from 'react'
import Link from 'next/link'
import {
  Mail, RefreshCw, Send, Sparkles, Star,
  Loader2, AlertCircle, Paperclip, Receipt, FileText, X, ArrowRight,
  Pencil, Search, Inbox,
} from 'lucide-react'
import {
  syncEmails, sendEmail, rewriteEmail,
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

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: currency.toUpperCase(), maximumFractionDigits: 2,
  }).format(amount / 100)
}

type MailView      = 'inbox' | 'sent' | 'all'
type PriorityFilter = 'all' | 'high' | 'medium' | 'low'
const DRAFT_TONES  = ['Professional', 'Friendly', 'Concise'] as const

// ─── Main component ──────────────────────────────────────────────────────────

interface EmailInboxProps {
  initialEmails:   SageEmail[]
  workspaceId:     string
  stripeConnected?:  boolean
  contactDeals?:   Record<string, { id: string; title: string }[]>
}

export function EmailInbox({
  initialEmails,
  stripeConnected = false,
  contactDeals    = {},
}: EmailInboxProps) {

  // ── State ──────────────────────────────────────────────────────────────────
  const [emails,    setEmails]    = useState<SageEmail[]>(initialEmails)
  const [selected,  setSelected]  = useState<SageEmail | null>(null)
  const [mailView,  setMailView]  = useState<MailView>('inbox')
  const [priority,  setPriority]  = useState<PriorityFilter>('all')
  const [search,    setSearch]    = useState('')
  const [composing, setComposing] = useState(false)

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

  const [isPending,   startTransition]     = useTransition()
  const [isSending,   startSendTransition] = useTransition()
  const [isRewriting, startRewriteTrans]   = useTransition()

  // ── Derived ────────────────────────────────────────────────────────────────

  const viewEmails = emails.filter(e =>
    mailView === 'inbox' ? e.direction === 'inbound'  :
    mailView === 'sent'  ? e.direction === 'outbound' : true,
  )
  const filteredEmails = viewEmails
    .filter(e => priority === 'all' || e.ai_priority === priority)
    .filter(e =>
      !search.trim() ||
      e.from_name?.toLowerCase().includes(search.toLowerCase()) ||
      e.from_address.toLowerCase().includes(search.toLowerCase()) ||
      e.subject.toLowerCase().includes(search.toLowerCase()),
    )

  const counts = {
    inbox:  emails.filter(e => e.direction === 'inbound').length,
    sent:   emails.filter(e => e.direction === 'outbound').length,
    high:   viewEmails.filter(e => e.ai_priority === 'high').length,
    medium: viewEmails.filter(e => e.ai_priority === 'medium').length,
    low:    viewEmails.filter(e => e.ai_priority === 'low').length,
  }

  const linkedDeals = selected?.contact_id ? (contactDeals[selected.contact_id] ?? []) : []

  // ── Handlers ───────────────────────────────────────────────────────────────

  function openEmail(email: SageEmail) {
    setSelected(email)
    setComposing(false)
    setComposeTo(email.from_address)
    setComposeSubj(email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`)
    setActiveDraft(0)
    setSendResult(null)
    setShowRewrite(false)
    setRewriteInst('')
    setAttachments([])
    setShowStripePanel(false)
    setStripeError(null)
    setProposalError(null)
    const drafts = email.ai_reply_drafts ?? []
    setComposeBody(drafts.length > 0 ? drafts[0].body : '')
  }

  function openCompose() {
    setSelected(null)
    setComposing(true)
    setComposeTo('')
    setComposeSubj('')
    setComposeBody('')
    setAttachments([])
    setSendResult(null)
    setShowRewrite(false)
  }

  function handleDraftTab(idx: number) {
    setActiveDraft(idx)
    const drafts = selected?.ai_reply_drafts ?? []
    if (drafts[idx]) setComposeBody(drafts[idx].body)
  }

  function handleSync() {
    setSyncResult(null)
    startTransition(async () => {
      const result = await syncEmails()
      if (result.error) {
        setSyncResult(`Error: ${result.error}`)
      } else {
        setSyncResult(result.synced === 0
          ? 'Up to date.'
          : `${result.synced} new email${result.synced === 1 ? '' : 's'} synced.`)
        window.location.reload()
      }
    })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    Array.from(e.target.files ?? []).forEach(file => {
      const reader = new FileReader()
      reader.onload = () => {
        const res = reader.result as string
        const comma = res.indexOf(',')
        setAttachments(prev => [...prev, {
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
          dataBase64: comma >= 0 ? res.slice(comma + 1) : res,
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
        replyToEmailId: selected?.id,
        attachments: attachments.length > 0 ? attachments : undefined,
      })
      if (result.error) {
        setSendResult(`Error: ${result.error}`)
      } else {
        setSendResult('Sent successfully.')
        setComposeBody('')
        setAttachments([])
        const sent: SageEmail = {
          id: crypto.randomUUID(), workspace_id: selected?.workspace_id ?? '',
          contact_id: selected?.contact_id ?? null, deal_id: null,
          message_id: `sent-${Date.now()}`, thread_id: selected?.message_id ?? null,
          from_address: 'you', from_name: 'You', to_address: composeTo,
          subject: composeSubj, body_text: composeBody, body_html: null,
          received_at: new Date().toISOString(), direction: 'outbound',
          is_read: true, is_starred: false,
          ai_priority: null, ai_summary: null, ai_insights: null,
          ai_reply_drafts: null, ai_analyzed_at: null,
          created_at: new Date().toISOString(),
        }
        setEmails(prev => [sent, ...prev])
        if (composing) { setComposing(false); setSelected(null) }
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

  // ── Inline compose/reply form (called as function to avoid component remounting) ─
  function renderComposeArea(mode: 'reply' | 'compose') {
    const isReply = mode === 'reply'
    return (
      <div className={cn('border-t dark:border-white/8 bg-white dark:bg-[#1a1a1a]', !isReply && 'flex-1 flex flex-col overflow-hidden')}>

        {/* AI draft tabs — reply only */}
        {isReply && selected?.ai_reply_drafts && selected.ai_reply_drafts.length > 0 && (
          <div className="flex items-center gap-1.5 px-6 pt-3 pb-2.5 border-b dark:border-white/8">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wide mr-1">AI Drafts</span>
            {DRAFT_TONES.map((tone, i) => (
              selected.ai_reply_drafts![i] && (
                <button
                  key={tone}
                  onClick={() => handleDraftTab(i)}
                  className={cn(
                    'text-[11px] px-2.5 py-1 rounded-lg font-medium transition-colors',
                    activeDraft === i
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10',
                  )}
                >
                  {tone}
                </button>
              )
            ))}
          </div>
        )}

        <div className={cn('px-5 py-4 space-y-3', !isReply && 'flex-1 flex flex-col overflow-auto')}>
          {/* To field */}
          <div className="flex items-center gap-2 border-b dark:border-white/8 pb-2.5">
            <span className="text-[11px] font-medium text-gray-400 w-6 shrink-0">To</span>
            <input
              value={composeTo}
              onChange={e => setComposeTo(e.target.value)}
              placeholder="recipient@email.com"
              className="flex-1 text-sm bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none"
            />
          </div>

          {/* Subject field */}
          <div className="flex items-center gap-2 border-b dark:border-white/8 pb-2.5">
            <span className="text-[11px] font-medium text-gray-400 w-6 shrink-0">Sub</span>
            <input
              value={composeSubj}
              onChange={e => setComposeSubj(e.target.value)}
              placeholder="Subject"
              className="flex-1 text-sm bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none"
            />
          </div>

          {/* Body */}
          <textarea
            rows={isReply ? 5 : 12}
            value={composeBody}
            onChange={e => setComposeBody(e.target.value)}
            placeholder={isReply ? 'Write your reply…' : 'Compose email…'}
            className={cn(
              'w-full text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 bg-transparent focus:outline-none resize-none leading-relaxed',
              !isReply && 'flex-1',
            )}
          />

          {/* Attachment chips */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {attachments.map((att, i) => (
                <span key={i} className="flex items-center gap-1 text-[11px] px-2 py-1 bg-gray-100 dark:bg-white/5 border dark:border-white/10 rounded-lg text-gray-600 dark:text-gray-300">
                  <Paperclip className="w-3 h-3 text-gray-400 shrink-0" />
                  <span className="max-w-[120px] truncate">{att.filename}</span>
                  <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-400">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* AI rewrite row */}
          {showRewrite && (
            <div className="flex gap-2">
              <input
                value={rewriteInst}
                onChange={e => setRewriteInst(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleRewrite() }}
                placeholder="e.g. make it shorter, more formal…"
                className="flex-1 px-3 py-1.5 text-xs border dark:border-white/10 rounded-lg bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <button
                onClick={handleRewrite}
                disabled={isRewriting || !composeBody}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {isRewriting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                Apply
              </button>
              <button onClick={() => setShowRewrite(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Toolbar row */}
          <div className="flex items-center gap-1 pt-1 border-t dark:border-white/8">
            {/* Send */}
            <button
              onClick={handleSend}
              disabled={isSending || !composeTo || !composeSubj || !composeBody}
              className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 mr-2"
            >
              {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Send{attachments.length > 0 ? ` +${attachments.length}` : ''}
            </button>

            {/* File attach */}
            <input ref={fileInputRef} type="file" multiple className="sr-only" onChange={handleFileChange} />
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Attach file"
              className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Stripe invoice */}
            {stripeConnected && (
              <div className="relative">
                <button onClick={handleOpenStripePanel} title="Attach Stripe invoice"
                  className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <Receipt className="w-4 h-4" />
                </button>
                {showStripePanel && (
                  <div className="absolute bottom-full mb-2 left-0 w-72 bg-white dark:bg-[#2a2a2a] border dark:border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
                    <div className="px-3 py-2 border-b dark:border-white/8 flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Stripe Invoices</p>
                      <button onClick={() => setShowStripePanel(false)} className="text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                      {stripeError && <p className="text-xs text-red-400 px-3 py-2">{stripeError}</p>}
                      {!invoicesLoaded && !stripeError && (
                        <div className="flex items-center justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-gray-400" /></div>
                      )}
                      {invoicesLoaded && stripeInvoices.length === 0 && (
                        <p className="text-xs text-gray-400 px-3 py-4">No open invoices found.</p>
                      )}
                      {stripeInvoices.map(inv => (
                        <button key={inv.id} onClick={() => handleAttachInvoice(inv)} disabled={loadingInvoiceId === inv.id}
                          className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 border-b dark:border-white/5 last:border-0 transition-colors disabled:opacity-60"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{inv.customer_name ?? inv.customer_email ?? 'Unknown'}</p>
                              <p className="text-[11px] text-gray-400">{inv.number ?? inv.id} · {formatCurrency(inv.amount_due, inv.currency)}</p>
                            </div>
                            {loadingInvoiceId === inv.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400 shrink-0" />
                              : <Paperclip className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Proposal buttons */}
            {linkedDeals.map(deal => (
              <button
                key={deal.id}
                onClick={() => handleGenerateProposal(deal.id)}
                disabled={isGenProp}
                title={`Generate proposal for "${deal.title}"`}
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-60"
              >
                {isGenProp ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              </button>
            ))}

            {/* AI Rewrite toggle */}
            <button
              onClick={() => setShowRewrite(v => !v)}
              className={cn(
                'ml-auto flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg font-medium transition-colors',
                showRewrite
                  ? 'bg-brand-50 dark:bg-[#61c2ad]/10 text-brand-600 dark:text-[#61c2ad]'
                  : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-600 dark:hover:text-gray-300',
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              AI Rewrite
            </button>
          </div>

          {/* Status messages */}
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

      {/* ──────────────────────────────────────────────────────────────────────
          LEFT SIDEBAR
      ─────────────────────────────────────────────────────────────────────── */}
      <aside className="w-[200px] shrink-0 flex flex-col border-r dark:border-white/8 bg-gray-50/80 dark:bg-[#161616]">

        {/* Compose button */}
        <div className="p-3 pb-2">
          <button
            onClick={openCompose}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-white dark:bg-[#252525] hover:bg-gray-100 dark:hover:bg-[#2e2e2e] border dark:border-white/8 rounded-2xl shadow-sm text-sm font-semibold text-gray-700 dark:text-gray-200 transition-all"
          >
            <Pencil className="w-4 h-4 text-brand-500 dark:text-[#61c2ad] shrink-0" />
            Compose
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
          {([
            { key: 'inbox' as MailView, label: 'Inbox',    icon: <Inbox className="w-4 h-4" />,      count: counts.inbox },
            { key: 'sent'  as MailView, label: 'Sent',     icon: <Send className="w-4 h-4" />,       count: counts.sent },
            { key: 'all'   as MailView, label: 'All Mail', icon: <Mail className="w-4 h-4" />,       count: null },
          ]).map(item => (
            <button
              key={item.key}
              onClick={() => { setMailView(item.key); setPriority('all') }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                mailView === item.key
                  ? 'bg-brand-100 dark:bg-[#ec732e]/15 text-brand-700 dark:text-[#ec732e]'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-white/5',
              )}
            >
              {item.icon}
              <span className="flex-1 text-left">{item.label}</span>
              {item.count !== null && item.count > 0 && (
                <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                  {item.count}
                </span>
              )}
            </button>
          ))}

          {/* Priority section */}
          <div className="pt-4 pb-1 px-3">
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Priority</p>
          </div>
          {([
            { key: 'high'   as PriorityFilter, label: 'High',   dot: 'bg-red-500',   count: counts.high   },
            { key: 'medium' as PriorityFilter, label: 'Medium', dot: 'bg-amber-400', count: counts.medium },
            { key: 'low'    as PriorityFilter, label: 'Low',    dot: 'bg-gray-400',  count: counts.low    },
          ]).map(item => (
            <button
              key={item.key}
              onClick={() => setPriority(prev => prev === item.key ? 'all' : item.key)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors',
                priority === item.key
                  ? 'bg-brand-100 dark:bg-[#ec732e]/15 text-brand-700 dark:text-[#ec732e]'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-white/5',
              )}
            >
              <span className={cn('w-2 h-2 rounded-full shrink-0', item.dot)} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.count > 0 && (
                <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500">{item.count}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Sync button */}
        <div className="px-3 py-3 border-t dark:border-white/8 space-y-1">
          <button
            onClick={handleSync}
            disabled={isPending}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-white/5 transition-colors disabled:opacity-60"
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Sync Inbox
          </button>
          {syncResult && (
            <p className={cn('text-[11px] px-3', syncResult.startsWith('Error') ? 'text-red-400' : 'text-gray-400 dark:text-gray-500')}>
              {syncResult}
            </p>
          )}
        </div>
      </aside>

      {/* ──────────────────────────────────────────────────────────────────────
          EMAIL LIST
      ─────────────────────────────────────────────────────────────────────── */}
      <div className="w-[360px] shrink-0 flex flex-col border-r dark:border-white/8">

        {/* Search bar */}
        <div className="px-4 py-3 border-b dark:border-white/8 bg-white dark:bg-[#1a1a1a]">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-white/6 rounded-xl">
            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search in mail"
              className="flex-1 text-xs bg-transparent text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Email rows */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-[#1a1a1a]">
          {filteredEmails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 py-12">
              <Mail className="w-10 h-10 opacity-20" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {emails.length === 0 ? 'No emails yet' : 'No emails match filter'}
              </p>
              {emails.length === 0 && (
                <Link
                  href="/sage/integrations"
                  className="flex items-center gap-2 text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5 hover:bg-amber-500/15 transition-colors"
                >
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
                <button
                  key={email.id}
                  onClick={() => openEmail(email)}
                  className={cn(
                    'w-full text-left border-b dark:border-white/5 transition-colors',
                    isSelected
                      ? 'bg-blue-50 dark:bg-[#ec732e]/8 border-l-[3px] border-l-brand-500 dark:border-l-[#ec732e]'
                      : 'hover:bg-gray-50 dark:hover:bg-white/3 border-l-[3px] border-l-transparent',
                  )}
                >
                  <div className="flex items-center pl-3 pr-4 py-3 gap-2.5">
                    {/* Priority dot */}
                    <span className={cn(
                      'w-2 h-2 rounded-full shrink-0 transition-all',
                      email.ai_priority === 'high'   ? 'bg-red-500' :
                      email.ai_priority === 'medium' ? 'bg-amber-400' :
                      email.ai_priority === 'low'    ? 'bg-gray-300 dark:bg-gray-600' :
                      'invisible',
                    )} />

                    {/* Star */}
                    <Star className={cn(
                      'w-4 h-4 shrink-0',
                      email.is_starred
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-gray-200 dark:text-gray-700',
                    )} />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Sender + date */}
                      <div className="flex items-baseline justify-between gap-2 mb-0.5">
                        <span className={cn(
                          'text-sm leading-snug truncate',
                          isUnread
                            ? 'font-bold text-gray-900 dark:text-gray-50'
                            : 'font-medium text-gray-600 dark:text-gray-400',
                        )}>
                          {email.direction === 'outbound'
                            ? `To: ${email.to_address}`
                            : (email.from_name ?? email.from_address)}
                        </span>
                        <span className={cn(
                          'text-[11px] shrink-0 tabular-nums',
                          isUnread ? 'font-semibold text-gray-700 dark:text-gray-300' : 'text-gray-400',
                        )}>
                          {formatDate(email.received_at)}
                        </span>
                      </div>

                      {/* Subject + AI snippet */}
                      <div className="flex items-center gap-1 text-xs truncate">
                        <span className={cn(
                          'truncate',
                          isUnread ? 'font-semibold text-gray-800 dark:text-gray-200' : 'text-gray-500 dark:text-gray-500',
                        )}>
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

      {/* ──────────────────────────────────────────────────────────────────────
          DETAIL / COMPOSE PANEL
      ─────────────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#1a1a1a]">

        {composing ? (
          /* ── New Compose ── */
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b dark:border-white/8 shrink-0">
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">New Message</h2>
              <button onClick={() => setComposing(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            {renderComposeArea('compose')}
          </div>

        ) : selected ? (
          /* ── Email Detail ── */
          <div className="flex-1 flex overflow-hidden">

            {/* Main email body column */}
            <div className="flex-1 flex flex-col overflow-hidden">

              {/* Email header */}
              <div className="px-6 py-5 border-b dark:border-white/8 shrink-0">
                {/* Subject */}
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 leading-snug">
                  {selected.subject}
                </h2>

                {/* From / To / Date row */}
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-brand-100 dark:bg-[#ec732e]/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-brand-600 dark:text-[#ec732e]">
                      {(selected.from_name ?? selected.from_address).charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {selected.direction === 'outbound' ? 'You' : (selected.from_name ?? selected.from_address)}
                        </span>
                        {selected.from_name && selected.direction === 'inbound' && (
                          <span className="text-xs text-gray-400 ml-1.5">&lt;{selected.from_address}&gt;</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {selected.ai_priority && (
                          <span className={cn(
                            'flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wide',
                            selected.ai_priority === 'high'   ? 'bg-red-50 dark:bg-red-500/10 text-red-500' :
                            selected.ai_priority === 'medium' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-500' :
                            'bg-gray-100 dark:bg-white/5 text-gray-400',
                          )}>
                            <span className={cn('w-1.5 h-1.5 rounded-full',
                              selected.ai_priority === 'high' ? 'bg-red-500' :
                              selected.ai_priority === 'medium' ? 'bg-amber-400' : 'bg-gray-300'
                            )} />
                            {selected.ai_priority}
                          </span>
                        )}
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {new Date(selected.received_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      to <span className="text-gray-600 dark:text-gray-400">{selected.to_address}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Email body */}
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-7 max-w-2xl">
                  {selected.body_text ?? '(No plain text body)'}
                </div>
              </div>

              {/* Inline reply */}
              <div className="mx-4 mb-4 rounded-2xl border dark:border-white/10 overflow-hidden shadow-sm">
                {renderComposeArea('reply')}
              </div>
            </div>

            {/* AI insights sidebar */}
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
                {emails.length === 0 ? 'Connect your email account and sync to get started' : 'Click any email in the list on the left'}
              </p>
            </div>
            {emails.length === 0 && (
              <Link
                href="/sage/integrations"
                className="flex items-center gap-2 text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5 hover:bg-amber-500/15 transition-colors"
              >
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
