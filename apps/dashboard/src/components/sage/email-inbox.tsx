'use client'

import React, { useState, useTransition, useRef } from 'react'
import {
  Mail, RefreshCw, Send, Sparkles, Star, ChevronDown, ChevronUp,
  Loader2, AlertCircle, Paperclip, Receipt, FileText, X,
} from 'lucide-react'
import {
  syncEmails, sendEmail, rewriteEmail,
  fetchStripeInvoices, fetchStripeInvoicePDF, generateProposalPDF,
} from '@/app/actions/sage-emails'
import type { SageEmail } from '@/lib/types'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------

interface EmailAttachment { filename: string; contentType: string; dataBase64: string }

interface StripeInvoice {
  id:             string
  number:         string | null
  customer_name:  string | null
  customer_email: string | null
  amount_due:     number
  currency:       string
  status:         string
  invoice_pdf:    string | null
  created:        number
}

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

const PRIORITY_CONFIG = {
  high:   { label: 'High',   color: 'bg-red-500/15 text-red-400 border-red-500/20' },
  medium: { label: 'Medium', color: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  low:    { label: 'Low',    color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
} as const

function PriorityBadge({ priority }: { priority: 'high' | 'medium' | 'low' | null }) {
  if (!priority) return null
  const cfg = PRIORITY_CONFIG[priority]
  return (
    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border font-semibold uppercase tracking-wide', cfg.color)}>
      {cfg.label}
    </span>
  )
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffHours = (now.getTime() - d.getTime()) / (1000 * 60 * 60)

  if (diffHours < 24)  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  if (diffHours < 168) return d.toLocaleDateString('en-US', { weekday: 'short' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: currency.toUpperCase(), maximumFractionDigits: 2,
  }).format(amount / 100)
}

type PriorityFilter = 'all' | 'high' | 'medium' | 'low'
const DRAFT_TONES = ['Professional', 'Friendly', 'Concise'] as const

// ---------------------------------------------------------------
// Main component
// ---------------------------------------------------------------

interface EmailInboxProps {
  initialEmails:  SageEmail[]
  workspaceId:    string
  stripeConnected?: boolean
  contactDeals?:  Record<string, { id: string; title: string }[]>
}

export function EmailInbox({
  initialEmails,
  stripeConnected = false,
  contactDeals = {},
}: EmailInboxProps) {
  const [emails,      setEmails]      = useState<SageEmail[]>(initialEmails)
  const [selected,    setSelected]    = useState<SageEmail | null>(null)
  const [filter,      setFilter]      = useState<PriorityFilter>('all')
  const [composeTo,   setComposeTo]   = useState('')
  const [composeSubj, setComposeSubj] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [activeDraft, setActiveDraft] = useState<number>(0)
  const [rewriteInst, setRewriteInst] = useState('')
  const [showRewrite, setShowRewrite] = useState(false)
  const [syncResult,  setSyncResult]  = useState<string | null>(null)
  const [sendResult,  setSendResult]  = useState<string | null>(null)

  // Attachments
  const [attachments,        setAttachments]        = useState<EmailAttachment[]>([])
  const [showStripePanel,    setShowStripePanel]    = useState(false)
  const [stripeInvoices,     setStripeInvoices]     = useState<StripeInvoice[]>([])
  const [invoicesLoaded,     setInvoicesLoaded]     = useState(false)
  const [stripeError,        setStripeError]        = useState<string | null>(null)
  const [loadingInvoiceId,   setLoadingInvoiceId]   = useState<string | null>(null)
  const [isGeneratingProp,   setIsGeneratingProp]   = useState(false)
  const [proposalError,      setProposalError]      = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isPending,    startTransition]        = useTransition()
  const [isSending,    startSendTransition]    = useTransition()
  const [isRewriting,  startRewriteTransition] = useTransition()

  // ---------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------

  const inbound  = emails.filter(e => e.direction === 'inbound')
  const filtered = filter === 'all' ? inbound : inbound.filter(e => e.ai_priority === filter)

  const counts = {
    high:   inbound.filter(e => e.ai_priority === 'high').length,
    medium: inbound.filter(e => e.ai_priority === 'medium').length,
    low:    inbound.filter(e => e.ai_priority === 'low').length,
  }

  // Deals linked to the currently selected email's contact
  const contactId = selected?.contact_id ?? null
  const linkedDeals = contactId ? (contactDeals[contactId] ?? []) : []

  // ---------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------

  function handleSelectEmail(email: SageEmail) {
    setSelected(email)
    setComposeTo(email.from_address)
    setComposeSubj(email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`)
    setComposeBody('')
    setActiveDraft(0)
    setSendResult(null)
    setShowRewrite(false)
    setRewriteInst('')
    setAttachments([])
    setShowStripePanel(false)
    setStripeError(null)
    setProposalError(null)

    const drafts = email.ai_reply_drafts ?? []
    if (drafts.length > 0) setComposeBody(drafts[0].body)
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
          ? 'Inbox up to date.'
          : `${result.synced} new email${result.synced === 1 ? '' : 's'} synced.`)
        window.location.reload()
      }
    })
  }

  // File upload — read via FileReader, strip data URL prefix
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        const comma = result.indexOf(',')
        const dataBase64 = comma >= 0 ? result.slice(comma + 1) : result
        setAttachments(prev => [...prev, { filename: file.name, contentType: file.type || 'application/octet-stream', dataBase64 }])
      }
      reader.readAsDataURL(file)
    })
    // Reset so the same file can be re-added
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Stripe — open panel and lazy-load invoices
  async function handleOpenStripePanel() {
    setShowStripePanel(v => !v)
    if (!invoicesLoaded) {
      setStripeError(null)
      const result = await fetchStripeInvoices()
      if (result.error) {
        setStripeError(result.error)
      } else {
        setStripeInvoices(result.invoices)
        setInvoicesLoaded(true)
      }
    }
  }

  async function handleAttachInvoice(invoice: StripeInvoice) {
    setLoadingInvoiceId(invoice.id)
    setStripeError(null)
    const att = await fetchStripeInvoicePDF(invoice.id)
    if (att.error) {
      setStripeError(att.error)
    } else {
      setAttachments(prev => [...prev, { filename: att.filename, contentType: att.contentType, dataBase64: att.dataBase64 }])
      setShowStripePanel(false)
    }
    setLoadingInvoiceId(null)
  }

  // Proposal PDF generation
  async function handleGenerateProposal(dealId: string) {
    setIsGeneratingProp(true)
    setProposalError(null)
    const att = await generateProposalPDF(dealId)
    if (att.error) {
      setProposalError(att.error)
    } else {
      setAttachments(prev => [...prev, { filename: att.filename, contentType: att.contentType, dataBase64: att.dataBase64 }])
    }
    setIsGeneratingProp(false)
  }

  function removeAttachment(idx: number) {
    setAttachments(prev => prev.filter((_, i) => i !== idx))
  }

  function handleSend() {
    if (!composeTo || !composeSubj || !composeBody) return
    setSendResult(null)
    startSendTransition(async () => {
      const result = await sendEmail({
        to:             composeTo,
        subject:        composeSubj,
        body:           composeBody,
        replyToEmailId: selected?.id,
        attachments:    attachments.length > 0 ? attachments : undefined,
      })
      if (result.error) {
        setSendResult(`Error: ${result.error}`)
      } else {
        setSendResult('Email sent successfully.')
        setComposeBody('')
        setAttachments([])
        const sent: SageEmail = {
          id:              crypto.randomUUID(),
          workspace_id:    selected?.workspace_id ?? '',
          contact_id:      selected?.contact_id ?? null,
          deal_id:         null,
          message_id:      `sent-${Date.now()}`,
          thread_id:       selected?.message_id ?? null,
          from_address:    'you',
          from_name:       'You',
          to_address:      composeTo,
          subject:         composeSubj,
          body_text:       composeBody,
          body_html:       null,
          received_at:     new Date().toISOString(),
          direction:       'outbound',
          is_read:         true,
          is_starred:      false,
          ai_priority:     null,
          ai_summary:      null,
          ai_insights:     null,
          ai_reply_drafts: null,
          ai_analyzed_at:  null,
          created_at:      new Date().toISOString(),
        }
        setEmails(prev => [sent, ...prev])
      }
    })
  }

  function handleRewrite() {
    if (!composeBody) return
    startRewriteTransition(async () => {
      const result = await rewriteEmail({
        emailId:     selected?.id,
        body:        composeBody,
        instruction: rewriteInst || 'Rewrite this email to be clear, professional, and concise.',
      })
      if (!result.error) {
        setComposeBody(result.body)
        setShowRewrite(false)
        setRewriteInst('')
      }
    })
  }

  // ---------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">

      {/* ── Left panel: list ── */}
      <div className="w-80 shrink-0 flex flex-col border-r dark:border-white/8 bg-white dark:bg-[#1a1a1a]">

        {/* Header + sync */}
        <div className="px-4 pt-5 pb-3 border-b dark:border-white/8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-brand-500 dark:text-[#61c2ad]" />
              <h1 className="text-sm font-bold text-gray-900 dark:text-gray-100">Emails</h1>
            </div>
            <button
              onClick={handleSync}
              disabled={isPending}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium transition-colors disabled:opacity-60"
            >
              {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Sync
            </button>
          </div>

          {syncResult && (
            <p className="text-[11px] text-gray-400 dark:text-gray-500">{syncResult}</p>
          )}

          {/* Priority filter tabs */}
          <div className="flex gap-1 mt-2">
            {(['all', 'high', 'medium', 'low'] as PriorityFilter[]).map(p => (
              <button
                key={p}
                onClick={() => setFilter(p)}
                className={cn(
                  'flex-1 text-[11px] py-1 rounded-md font-medium transition-colors',
                  filter === p
                    ? 'bg-brand-600 text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5',
                )}
              >
                {p === 'all'
                  ? 'All'
                  : `${p.charAt(0).toUpperCase() + p.slice(1)}${counts[p as keyof typeof counts] ? ` · ${counts[p as keyof typeof counts]}` : ''}`}
              </button>
            ))}
          </div>
        </div>

        {/* Email list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-400">
              <Mail className="w-8 h-8 opacity-30" />
              <p className="text-xs">No emails here yet.</p>
              <p className="text-[11px] opacity-70">Click Sync to fetch from your inbox.</p>
            </div>
          ) : (
            filtered.map(email => (
              <button
                key={email.id}
                onClick={() => handleSelectEmail(email)}
                className={cn(
                  'w-full text-left px-4 py-3 border-b dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors',
                  selected?.id === email.id ? 'bg-brand-50 dark:bg-[#61c2ad]/5' : '',
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {email.from_name ?? email.from_address}
                  </span>
                  <span className="text-[10px] text-gray-400 shrink-0">{formatDate(email.received_at)}</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate mb-1.5">{email.subject}</p>
                <div className="flex items-center gap-1.5">
                  <PriorityBadge priority={email.ai_priority} />
                  {email.ai_summary && (
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 truncate leading-tight">
                      {email.ai_summary}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Right panel: detail + compose ── */}
      {selected ? (
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#1a1a1a]">

          {/* Email header */}
          <div className="px-6 py-4 border-b dark:border-white/8 shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">{selected.subject}</h2>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <span>From: <strong className="text-gray-700 dark:text-gray-300">{selected.from_name ?? selected.from_address}</strong></span>
                  {selected.from_name && <span className="text-xs text-gray-400">&lt;{selected.from_address}&gt;</span>}
                  <span>·</span>
                  <span className="text-xs">{new Date(selected.received_at).toLocaleString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <PriorityBadge priority={selected.ai_priority} />
                <button className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                  <Star className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">

            {/* Email body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed text-sm">
                {selected.body_text ?? '(No plain text body)'}
              </div>
            </div>

            {/* AI insights sidebar */}
            {(selected.ai_insights?.length || selected.ai_summary) && (
              <div className="w-64 shrink-0 border-l dark:border-white/8 bg-gray-50 dark:bg-white/3 overflow-y-auto p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-brand-500 dark:text-[#61c2ad]" />
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">AI Insights</p>
                </div>

                {selected.ai_summary && (
                  <div className="bg-white dark:bg-white/5 rounded-xl p-3 border dark:border-white/8">
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold mb-1">Summary</p>
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{selected.ai_summary}</p>
                  </div>
                )}

                {selected.ai_insights && selected.ai_insights.length > 0 && (
                  <div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold mb-2">Key Points</p>
                    <ul className="space-y-1.5">
                      {selected.ai_insights.map((insight, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="mt-1 w-1 h-1 rounded-full bg-brand-500 dark:bg-[#61c2ad] shrink-0" />
                          <span className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Compose / reply area */}
          <div className="border-t dark:border-white/8 shrink-0 bg-gray-50 dark:bg-white/2">

            {/* Reply draft tabs */}
            {selected.ai_reply_drafts && selected.ai_reply_drafts.length > 0 && (
              <div className="flex items-center gap-1 px-6 pt-3 pb-1">
                <span className="text-[10px] text-gray-400 mr-1">AI drafts:</span>
                {DRAFT_TONES.map((tone, i) => (
                  selected.ai_reply_drafts![i] && (
                    <button
                      key={tone}
                      onClick={() => handleDraftTab(i)}
                      className={cn(
                        'text-[11px] px-2.5 py-1 rounded-lg font-medium transition-colors',
                        activeDraft === i
                          ? 'bg-brand-600 text-white'
                          : 'bg-white dark:bg-white/5 border dark:border-white/8 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/8',
                      )}
                    >
                      {tone}
                    </button>
                  )
                ))}
              </div>
            )}

            <div className="px-6 pb-4 pt-2 space-y-2">
              {/* To / Subject */}
              <div className="flex gap-2">
                <input
                  value={composeTo}
                  onChange={e => setComposeTo(e.target.value)}
                  placeholder="To"
                  className="flex-1 px-3 py-1.5 text-xs border dark:border-white/10 rounded-lg bg-white dark:bg-[#232323] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <input
                  value={composeSubj}
                  onChange={e => setComposeSubj(e.target.value)}
                  placeholder="Subject"
                  className="flex-[2] px-3 py-1.5 text-xs border dark:border-white/10 rounded-lg bg-white dark:bg-[#232323] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              {/* Body textarea */}
              <textarea
                rows={5}
                value={composeBody}
                onChange={e => setComposeBody(e.target.value)}
                placeholder="Write your reply…"
                className="w-full px-3 py-2 text-sm border dark:border-white/10 rounded-xl bg-white dark:bg-[#232323] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
              />

              {/* ── Attachment chips ── */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {attachments.map((att, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-1 text-[11px] px-2 py-1 bg-white dark:bg-white/5 border dark:border-white/10 rounded-lg text-gray-600 dark:text-gray-300"
                    >
                      <Paperclip className="w-3 h-3 text-gray-400 shrink-0" />
                      <span className="max-w-[140px] truncate">{att.filename}</span>
                      <button
                        onClick={() => removeAttachment(i)}
                        className="ml-0.5 text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* ── Attachment toolbar ── */}
              <div className="relative flex items-center gap-1.5">
                {/* File upload */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="sr-only"
                  onChange={handleFileChange}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach file"
                  className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-white dark:bg-white/5 border dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors"
                >
                  <Paperclip className="w-3 h-3" />
                  File
                </button>

                {/* Stripe invoice button */}
                {stripeConnected && (
                  <div className="relative">
                    <button
                      onClick={handleOpenStripePanel}
                      title="Attach Stripe invoice"
                      className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-white dark:bg-white/5 border dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors"
                    >
                      <Receipt className="w-3 h-3" />
                      Invoice
                    </button>

                    {/* Stripe invoice dropdown */}
                    {showStripePanel && (
                      <div className="absolute bottom-full mb-2 left-0 w-72 bg-white dark:bg-[#2a2a2a] border dark:border-white/10 rounded-xl shadow-lg z-50 overflow-hidden">
                        <div className="px-3 py-2 border-b dark:border-white/8 flex items-center justify-between">
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Stripe Invoices</p>
                          <button onClick={() => setShowStripePanel(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="max-h-56 overflow-y-auto">
                          {stripeError && (
                            <p className="text-xs text-red-400 px-3 py-2">{stripeError}</p>
                          )}
                          {!invoicesLoaded && !stripeError && (
                            <div className="flex items-center justify-center py-6">
                              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                            </div>
                          )}
                          {invoicesLoaded && stripeInvoices.length === 0 && (
                            <p className="text-xs text-gray-400 px-3 py-4">No open invoices found.</p>
                          )}
                          {stripeInvoices.map(inv => (
                            <button
                              key={inv.id}
                              onClick={() => handleAttachInvoice(inv)}
                              disabled={loadingInvoiceId === inv.id}
                              className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 border-b dark:border-white/5 last:border-0 transition-colors disabled:opacity-60"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                                    {inv.customer_name ?? inv.customer_email ?? 'Unknown'}
                                  </p>
                                  <p className="text-[11px] text-gray-400">
                                    {inv.number ?? inv.id} · {formatCurrency(inv.amount_due, inv.currency)}
                                  </p>
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

                {/* Proposal button — only when contact has linked deals */}
                {linkedDeals.length > 0 && (
                  <div className="flex items-center gap-1">
                    {linkedDeals.map(deal => (
                      <button
                        key={deal.id}
                        onClick={() => handleGenerateProposal(deal.id)}
                        disabled={isGeneratingProp}
                        title={`Generate proposal for "${deal.title}"`}
                        className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-white dark:bg-white/5 border dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors disabled:opacity-60"
                      >
                        {isGeneratingProp
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <FileText className="w-3 h-3" />}
                        <span className="max-w-[80px] truncate">Proposal: {deal.title}</span>
                      </button>
                    ))}
                  </div>
                )}

                {proposalError && (
                  <p className="text-[11px] text-red-400">{proposalError}</p>
                )}
              </div>

              {/* AI Rewrite expander */}
              <div className="bg-white dark:bg-white/3 border dark:border-white/8 rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowRewrite(v => !v)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-brand-500 dark:text-[#61c2ad]" />
                    AI Rewrite
                  </span>
                  {showRewrite ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                {showRewrite && (
                  <div className="px-3 pb-3 flex gap-2">
                    <input
                      value={rewriteInst}
                      onChange={e => setRewriteInst(e.target.value)}
                      placeholder="Instruction (e.g. make it shorter, more formal…)"
                      className="flex-1 px-2.5 py-1.5 text-xs border dark:border-white/10 rounded-lg bg-white dark:bg-[#232323] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      onKeyDown={e => { if (e.key === 'Enter') handleRewrite() }}
                    />
                    <button
                      onClick={handleRewrite}
                      disabled={isRewriting || !composeBody}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {isRewriting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      Rewrite
                    </button>
                  </div>
                )}
              </div>

              {/* Send row */}
              <div className="flex items-center justify-between">
                {sendResult && (
                  <p className={cn('text-xs', sendResult.startsWith('Error') ? 'text-red-400' : 'text-green-400')}>
                    {sendResult}
                  </p>
                )}
                {!sendResult && <span />}
                <button
                  onClick={handleSend}
                  disabled={isSending || !composeTo || !composeSubj || !composeBody}
                  className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium rounded-xl transition-colors disabled:opacity-50"
                >
                  {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Send{attachments.length > 0 ? ` + ${attachments.length} attachment${attachments.length > 1 ? 's' : ''}` : ''}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Empty state */
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400 dark:text-gray-500">
          <Mail className="w-12 h-12 opacity-20" />
          <p className="text-sm font-medium">Select an email to read</p>
          <p className="text-xs opacity-70">
            {emails.length === 0
              ? 'Click Sync to fetch your inbox'
              : 'Choose an email from the list'}
          </p>
          {emails.length === 0 && (
            <div className="mt-2 flex items-center gap-2 text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Connect Gmail or Outlook in Sage → Integrations first</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
