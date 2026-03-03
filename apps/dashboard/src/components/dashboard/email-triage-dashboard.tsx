'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Mail, AlertCircle, ArrowRight, Sparkles,
  Plus, RefreshCw, Ticket, UserPlus, RotateCcw,
  Check, X, ChevronRight, Loader2, Trash2,
  Phone, Globe, Tag, Brain, Send,
  Paperclip, Receipt,
} from 'lucide-react'
import { triageCreateLead, triageCreateTicket, triageAddDealNote } from '@/app/actions/sage-triage'
import { syncEmails, deleteTriageEmails, reanalyzeEmails, sendEmail, fetchStripeInvoices, fetchStripeInvoicePDF } from '@/app/actions/sage-emails'
import type { SageEmail } from '@/lib/types'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export type TriageRecommendation =
  | 'create_lead'
  | 'update_lead'
  | 'reopen_account'
  | 'create_ticket'
  | 'ignore'

export interface TriageEmail {
  email:           SageEmail
  recommendation:  TriageRecommendation
  matchedContact?: { id: string; name: string; email: string | null } | null
  matchedDeal?:    { id: string; title: string } | null
}

interface EmailAttachment {
  filename:    string
  contentType: string
  dataBase64:  string
}

interface StripeInvoiceMeta {
  id:              string
  number:          string | null
  customer_name:   string | null
  customer_email:  string | null
  amount_due:      number
  currency:        string
  status:          string
}

interface Props {
  triageEmails: TriageEmail[]
  workspaceId:  string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PRIORITY_DOT: Record<string, string> = {
  high:   'bg-red-500',
  medium: 'bg-amber-400',
  low:    'bg-gray-300 dark:bg-gray-600',
}

const PRIORITY_BADGE: Record<string, string> = {
  high:   'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20',
  medium: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
  low:    'bg-gray-100 dark:bg-white/5 text-gray-500 border-gray-200 dark:border-white/10',
}

function formatDate(iso: string) {
  const d   = new Date(iso)
  const now = new Date()
  const diffH = (now.getTime() - d.getTime()) / 3_600_000
  if (diffH < 24)  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  if (diffH < 168) return d.toLocaleDateString('en-US', { weekday: 'short' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function recLabel(r: TriageRecommendation, t: TriageEmail): string {
  if (r === 'create_lead')     return 'Create Lead'
  if (r === 'update_lead')     return `Update: ${t.matchedDeal?.title ?? 'Deal'}`
  if (r === 'reopen_account')  return `Reopen: ${t.matchedContact?.name ?? 'Contact'}`
  if (r === 'create_ticket')   return 'Create Ticket'
  return 'Ignore'
}

function recIcon(r: TriageRecommendation) {
  if (r === 'create_lead')    return <UserPlus className="w-3.5 h-3.5" />
  if (r === 'update_lead')    return <RefreshCw className="w-3.5 h-3.5" />
  if (r === 'reopen_account') return <RotateCcw className="w-3.5 h-3.5" />
  if (r === 'create_ticket')  return <Ticket className="w-3.5 h-3.5" />
  return <X className="w-3.5 h-3.5" />
}

function recColor(r: TriageRecommendation): string {
  if (r === 'create_lead')    return 'bg-brand-600 hover:bg-brand-700 text-white'
  if (r === 'create_ticket')  return 'bg-red-500 hover:bg-red-600 text-white'
  if (r === 'ignore')         return 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
  return 'bg-[#61c2ad] hover:bg-[#52b09b] text-white'
}

function recBadgeColor(r: TriageRecommendation): string {
  if (r === 'create_lead')    return 'bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-100 dark:border-brand-500/20'
  if (r === 'create_ticket')  return 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20'
  if (r === 'update_lead')    return 'bg-[#61c2ad]/10 dark:bg-[#61c2ad]/15 text-[#52b09b] dark:text-[#61c2ad] border-[#61c2ad]/30'
  if (r === 'reopen_account') return 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
  return 'bg-gray-100 dark:bg-white/5 text-gray-400 border-gray-200 dark:border-white/8'
}

// ─── Triage Row (single-line) ─────────────────────────────────────────────────

interface RowProps {
  t:          TriageEmail
  isSelected: boolean
  isChecked:  boolean
  onSelect:   (t: TriageEmail) => void
  onToggle:   (id: string) => void
  onDelete:   (id: string) => void
  deletingId: string | null
}

function TriageRow({ t, isSelected, isChecked, onSelect, onToggle, onDelete, deletingId }: RowProps) {
  const isDeleting = deletingId === t.email.id
  const { email, recommendation } = t
  const entities = email.ai_entities

  return (
    <div
      onClick={() => onSelect(t)}
      className={cn(
        'flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors border-l-2',
        isSelected
          ? 'bg-gray-50 dark:bg-white/[0.04] border-l-brand-500'
          : 'border-l-transparent hover:bg-gray-50 dark:hover:bg-white/[0.03]',
      )}
    >
      {/* Checkbox */}
      <span
        role="checkbox"
        aria-checked={isChecked}
        onClick={e => { e.stopPropagation(); onToggle(email.id) }}
        className="shrink-0 cursor-pointer"
      >
        <span className={cn(
          'w-4 h-4 rounded border flex items-center justify-center transition-colors',
          isChecked
            ? 'bg-[#61c2ad] border-[#61c2ad]'
            : 'border-gray-300 dark:border-white/20 hover:border-[#61c2ad]',
        )}>
          {isChecked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
        </span>
      </span>

      {/* Priority dot */}
      <span className={cn(
        'w-2 h-2 rounded-full shrink-0',
        email.ai_priority ? PRIORITY_DOT[email.ai_priority] : 'bg-gray-200 dark:bg-white/20',
      )} />

      {/* Avatar */}
      <div className="w-7 h-7 rounded-full bg-brand-100 dark:bg-[#ec732e]/20 flex items-center justify-center shrink-0">
        <span className="text-[11px] font-bold text-brand-600 dark:text-[#ec732e]">
          {(email.from_name ?? email.from_address).charAt(0).toUpperCase()}
        </span>
      </div>

      {/* Sender + subject */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-sm font-semibold truncate text-gray-900 dark:text-gray-100">
            {email.from_name ?? email.from_address}
          </span>
          {entities?.company && (
            <span className="text-[11px] text-gray-400 shrink-0 truncate max-w-[120px]">
              · {entities.company}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{email.subject}</p>
      </div>

      {/* Action badge */}
      {email.ai_analyzed_at && recommendation !== 'ignore' && (
        <span className={cn(
          'hidden lg:block text-[10px] px-2 py-0.5 rounded-full font-medium border whitespace-nowrap shrink-0',
          recBadgeColor(recommendation),
        )}>
          {recLabel(recommendation, t)}
        </span>
      )}

      {/* Time */}
      <span className="text-[11px] text-gray-400 shrink-0 whitespace-nowrap">
        {formatDate(email.received_at)}
      </span>

      {/* Delete */}
      <button
        onClick={e => { e.stopPropagation(); onDelete(email.id) }}
        disabled={isDeleting}
        title="Delete"
        className="p-1.5 rounded-lg text-gray-300 dark:text-white/20 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors shrink-0 disabled:opacity-50"
      >
        {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
      </button>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function EmailTriageDashboard({ triageEmails }: Props) {
  const router = useRouter()
  const [dismissed,  setDismissed]  = useState<Set<string>>(new Set())
  const [modalMode,    setModalMode]    = useState<'lead' | 'ticket' | 'deal_note' | null>(null)
  const [modalEmail,   setModalEmail]   = useState<TriageEmail | null>(null)
  const [selectedRow,  setSelectedRow]  = useState<TriageEmail | null>(null)
  const [detailDraftIdx, setDetailDraftIdx] = useState(0)
  const [replyTarget,  setReplyTarget]  = useState<TriageEmail | null>(null)
  const [replyBody,    setReplyBody]    = useState('')
  const [replyDraftIdx, setReplyDraftIdx] = useState(0)
  const [replyResult,  setReplyResult]  = useState<string | null>(null)
  const [isPending,      startTransition]         = useTransition()
  const [isSyncing,      startSyncTransition]      = useTransition()
  const [isDeleting,     startDeleteTransition]    = useTransition()
  const [deletingId,     setDeletingId]            = useState<string | null>(null)
  const [isReanalyzing,  startReanalyzeTransition] = useTransition()
  const [isSending,      startSendTransition]      = useTransition()
  const [syncMsg,     setSyncMsg]     = useState<string | null>(null)
  const [analyzeMsg,  setAnalyzeMsg]  = useState<string | null>(null)

  // Attachment state (reply modal)
  const [replyAttachments,   setReplyAttachments]  = useState<EmailAttachment[]>([])
  const [showStripePanel,    setShowStripePanel]   = useState(false)
  const [stripeInvoices,     setStripeInvoices]    = useState<StripeInvoiceMeta[]>([])
  const [stripeError,        setStripeError]       = useState<string | null>(null)
  const [isFetchingInvoices, setIsFetchingInvoices] = useState(false)
  const [loadingInvoiceId,   setLoadingInvoiceId]  = useState<string | null>(null)

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // ── Computed ───────────────────────────────────────────────────────────────
  const visible        = triageEmails.filter(t => !dismissed.has(t.email.id))
  const highEmails     = visible.filter(t => t.email.ai_priority === 'high')
  const medEmails      = visible.filter(t => t.email.ai_priority === 'medium')
  const lowEmails      = visible.filter(t => t.email.ai_priority === 'low')
  const pendingEmails  = visible.filter(t => !t.email.ai_analyzed_at)
  const highCount      = highEmails.length
  const medCount       = medEmails.length
  const unanalyzedCount = visible.filter(t => !t.email.ai_analyzed_at).length
  const allSelected    = visible.length > 0 && visible.every(t => selectedIds.has(t.email.id))

  // ── Handlers ───────────────────────────────────────────────────────────────

  function selectRow(t: TriageEmail | null) {
    setSelectedRow(t)
    setDetailDraftIdx(0)
  }

  function toggleSelectAll() {
    const ids = visible.map(t => t.email.id)
    setSelectedIds(allSelected ? new Set() : new Set(ids))
  }

  function handleSync() {
    setSyncMsg(null)
    startSyncTransition(async () => {
      const res = await syncEmails()
      if (res.error) { setSyncMsg(`Error: ${res.error}`); return }
      setSyncMsg(res.synced > 0 ? `+${res.synced} new` : 'Up to date')
      router.refresh()
    })
  }

  function handleReanalyze() {
    setAnalyzeMsg(null)
    const targetIds = selectedIds.size > 0 ? Array.from(selectedIds) : undefined
    startReanalyzeTransition(async () => {
      const res = await reanalyzeEmails(50, targetIds)
      if (res.error) { setAnalyzeMsg(`Error: ${res.error}`); return }
      setAnalyzeMsg(res.reanalyzed > 0 ? `Analysed ${res.reanalyzed}` : 'All analysed')
      router.refresh()
    })
  }

  function handleDeleteSelected() {
    const ids = Array.from(selectedIds)
    startDeleteTransition(async () => {
      const res = await deleteTriageEmails(ids)
      if (res.error) { setSyncMsg(`Error: ${res.error}`); return }
      setDismissed(prev => new Set([...prev, ...ids]))
      setSelectedIds(new Set())
      if (selectedRow && ids.includes(selectedRow.email.id)) setSelectedRow(null)
      router.refresh()
    })
  }

  function handleDeleteOne(emailId: string) {
    setDeletingId(emailId)
    startDeleteTransition(async () => {
      await deleteTriageEmails([emailId])
      setDismissed(prev => new Set([...prev, emailId]))
      if (selectedRow?.email.id === emailId) setSelectedRow(null)
      setDeletingId(null)
      router.refresh()
    })
  }

  function toggleSelect(emailId: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(emailId)) next.delete(emailId)
      else next.add(emailId)
      return next
    })
  }

  function dismiss(emailId: string) {
    setDismissed(prev => new Set([...prev, emailId]))
    if (selectedRow?.email.id === emailId) setSelectedRow(null)
  }

  // Modal form state
  const [mName,      setMName]      = useState('')
  const [mEmail,     setMEmail]     = useState('')
  const [mCompany,   setMCompany]   = useState('')
  const [mDealTitle, setMDealTitle] = useState('')
  const [mNotes,     setMNotes]     = useState('')
  const [mPriority,  setMPriority]  = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
  const [mNote,      setMNote]      = useState('')
  const [modalError, setModalError] = useState<string | null>(null)

  function openModal(t: TriageEmail, mode: 'lead' | 'ticket' | 'deal_note') {
    const e = t.email
    setModalError(null)
    setModalEmail(t)
    if (mode === 'lead') {
      setMName(e.from_name ?? e.from_address)
      setMEmail(e.from_address)
      setMCompany(e.ai_entities?.company ?? '')
      setMDealTitle(e.subject.replace(/^(Re:|Fwd:)\s*/i, '').trim())
      setMNotes(e.ai_summary ?? '')
    }
    if (mode === 'ticket') {
      setMName(e.from_name ?? e.from_address)
      setMEmail(e.from_address)
      setMDealTitle(e.subject)
      setMNotes(e.ai_summary ?? (e.body_text ?? '').slice(0, 300))
      setMPriority(e.ai_priority === 'high' ? 'urgent' : e.ai_priority === 'medium' ? 'high' : 'medium')
    }
    if (mode === 'deal_note') {
      setMNote(`New email received: ${e.subject}${e.ai_summary ? ` — ${e.ai_summary}` : ''}`)
      setMDealTitle(t.matchedDeal?.title ?? '')
    }
    setModalMode(mode)
  }

  function handleModalSubmit() {
    if (!modalEmail) return
    startTransition(async () => {
      setModalError(null)
      let result: { error?: string }
      const emailId = modalEmail.email.id

      if (modalMode === 'lead') {
        result = await triageCreateLead({
          name:      mName,
          email:     mEmail,
          company:   mCompany || undefined,
          dealTitle: mDealTitle,
          notes:     mNotes || undefined,
        })
        if (!result.error) {
          setModalMode(null)
          setDismissed(prev => new Set([...prev, emailId]))
          if (selectedRow?.email.id === emailId) setSelectedRow(null)
        }
      } else if (modalMode === 'ticket') {
        result = await triageCreateTicket({
          title:        mDealTitle,
          description:  mNotes,
          contactEmail: mEmail,
          contactName:  mName,
          priority:     mPriority,
        })
        if (!result.error) {
          setModalMode(null)
          setDismissed(prev => new Set([...prev, emailId]))
          if (selectedRow?.email.id === emailId) setSelectedRow(null)
        }
      } else if (modalMode === 'deal_note') {
        const dealId = modalEmail.matchedDeal?.id
        if (!dealId) return
        result = await triageAddDealNote(dealId, mNote)
        if (!result.error) {
          setModalMode(null)
          setDismissed(prev => new Set([...prev, emailId]))
          if (selectedRow?.email.id === emailId) setSelectedRow(null)
        }
      } else {
        return
      }

      if (result?.error) setModalError(result.error)
    })
  }

  function openReply(t: TriageEmail) {
    const drafts = t.email.ai_reply_drafts ?? []
    setReplyTarget(t)
    setReplyDraftIdx(0)
    setReplyBody(drafts[0]?.body ?? '')
    setReplyResult(null)
    setReplyAttachments([])
    setShowStripePanel(false)
    setStripeInvoices([])
    setStripeError(null)
  }

  async function handleOpenStripePanel() {
    if (showStripePanel) { setShowStripePanel(false); return }
    setShowStripePanel(true)
    if (stripeInvoices.length > 0) return
    setIsFetchingInvoices(true)
    setStripeError(null)
    const res = await fetchStripeInvoices()
    setIsFetchingInvoices(false)
    if (res.error) { setStripeError(res.error); return }
    setStripeInvoices(res.invoices as StripeInvoiceMeta[])
  }

  async function handleAttachStripeInvoice(invoice: StripeInvoiceMeta) {
    setLoadingInvoiceId(invoice.id)
    const att = await fetchStripeInvoicePDF(invoice.id)
    setLoadingInvoiceId(null)
    if (att.error || !att.dataBase64) { setStripeError(att.error ?? 'Failed to fetch PDF'); return }
    setReplyAttachments(prev => [...prev, { filename: att.filename, contentType: att.contentType, dataBase64: att.dataBase64 }])
    setShowStripePanel(false)
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => {
        const dataUrl = (ev.target?.result as string) ?? ''
        const dataBase64 = dataUrl.split(',')[1] ?? ''
        setReplyAttachments(prev => [...prev, { filename: file.name, contentType: file.type || 'application/octet-stream', dataBase64 }])
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  function removeAttachment(index: number) {
    setReplyAttachments(prev => prev.filter((_, i) => i !== index))
  }

  function handleSendReply() {
    if (!replyTarget) return
    setShowStripePanel(false)
    startSendTransition(async () => {
      const e = replyTarget.email
      const res = await sendEmail({
        to:              e.from_address,
        subject:         `Re: ${e.subject}`,
        body:            replyBody,
        replyToEmailId:  e.id,
        attachments:     replyAttachments.length > 0 ? replyAttachments : undefined,
      })
      if (res.error) {
        setReplyResult(`Error: ${res.error}`)
      } else {
        setReplyResult('Sent!')
        setTimeout(() => {
          const id = replyTarget.email.id
          setReplyTarget(null)
          setReplyResult(null)
          setReplyAttachments([])
          setDismissed(prev => new Set([...prev, id]))
          if (selectedRow?.email.id === id) setSelectedRow(null)
        }, 1500)
      }
    })
  }

  // ── Section helper ────────────────────────────────────────────────────────
  function SectionHeader({ dot, label, count }: { dot: string; label: string; count: number }) {
    return (
      <div className="flex items-center gap-2 px-5 py-1.5 bg-gray-50/80 dark:bg-[#161616] border-b dark:border-white/8 sticky top-0 z-10">
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dot)} />
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {label} · {count}
        </span>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-1 overflow-hidden">

      {/* ── List pane ─────────────────────────────────────────────────── */}
      <div className={cn(
        'flex flex-col overflow-hidden border-r dark:border-white/8 bg-white dark:bg-[#1a1a1a] transition-[width] duration-200',
        selectedRow ? 'w-[40%]' : 'flex-1',
      )}>

        {/* Toolbar */}
        <div className="px-5 py-3 border-b dark:border-white/8 shrink-0">
          <div className="flex items-center justify-between gap-3 flex-wrap">

            {/* Left: title + select all + delete */}
            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-brand-500 shrink-0" />
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Triage</h2>
              <div className="w-px h-4 bg-gray-200 dark:bg-white/10 shrink-0" />
              <button
                onClick={toggleSelectAll}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors font-medium whitespace-nowrap"
              >
                {allSelected ? 'Deselect All' : 'Select All'}
              </button>
              {selectedIds.size > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  disabled={isDeleting}
                  title={`Delete ${selectedIds.size} selected`}
                  className="flex items-center justify-center w-6 h-6 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                >
                  {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                </button>
              )}
            </div>

            {/* Right: badges + actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {highCount > 0 && (
                <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-semibold border border-red-200 dark:border-red-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />{highCount} High
                </span>
              )}
              {medCount > 0 && (
                <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-200 dark:border-amber-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />{medCount} Med
                </span>
              )}
              <button
                onClick={handleSync}
                disabled={isSyncing || isReanalyzing}
                className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8 disabled:opacity-50 transition-colors border dark:border-white/8 font-medium"
              >
                <RefreshCw className={cn('w-3 h-3', isSyncing && 'animate-spin')} />
                {isSyncing ? 'Syncing…' : 'Sync'}
              </button>
              {(unanalyzedCount > 0 || selectedIds.size > 0) && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleReanalyze}
                    disabled={isReanalyzing || isSyncing}
                    className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold border border-purple-200 dark:border-purple-500/20 hover:bg-purple-100 dark:hover:bg-purple-500/15 disabled:opacity-50 transition-colors"
                  >
                    {isReanalyzing ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Brain className="w-2.5 h-2.5" />}
                    {isReanalyzing ? 'Analysing…' : selectedIds.size > 0 ? `Analyse ${selectedIds.size}` : `Analyse ${unanalyzedCount}`}
                  </button>
                  {analyzeMsg && !isReanalyzing && (
                    <span className={cn('text-[11px] font-medium', analyzeMsg.startsWith('Error') ? 'text-red-500' : 'text-green-600 dark:text-green-400')}>
                      {analyzeMsg}
                    </span>
                  )}
                </div>
              )}
              {syncMsg && (
                <span className={cn('text-[11px] font-medium', syncMsg.startsWith('Error') ? 'text-red-500' : 'text-green-600 dark:text-green-400')}>
                  {syncMsg}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Empty state or rows */}
        {triageEmails.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-400 p-8">
            <div className="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
              <Mail className="w-9 h-9 opacity-20" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-base font-semibold text-gray-600 dark:text-gray-300">No emails to triage yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 max-w-sm">
                Connect Gmail or Outlook under Sage → Integrations, then sync your inbox.
              </p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
              >
                <RefreshCw className={cn('w-4 h-4 shrink-0', isSyncing && 'animate-spin')} />
                {isSyncing ? 'Syncing inbox…' : 'Sync Inbox'}
              </button>
              <Link
                href="/sage/integrations"
                className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl px-5 py-2.5 hover:bg-amber-100 transition-colors font-medium mt-1"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                Connect Gmail or Outlook
                <ArrowRight className="w-4 h-4 shrink-0" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto divide-y dark:divide-white/8">

            {/* HIGH */}
            {highEmails.filter(t => !dismissed.has(t.email.id)).length > 0 && (
              <>
                <SectionHeader dot="bg-red-500" label="High Priority" count={highEmails.filter(t => !dismissed.has(t.email.id)).length} />
                {highEmails.filter(t => !dismissed.has(t.email.id)).map(t => (
                  <TriageRow
                    key={t.email.id} t={t}
                    isSelected={selectedRow?.email.id === t.email.id}
                    isChecked={selectedIds.has(t.email.id)}
                    onSelect={selectRow} onToggle={toggleSelect} onDelete={handleDeleteOne} deletingId={deletingId}
                  />
                ))}
              </>
            )}

            {/* MEDIUM */}
            {medEmails.filter(t => !dismissed.has(t.email.id)).length > 0 && (
              <>
                <SectionHeader dot="bg-amber-400" label="Medium" count={medEmails.filter(t => !dismissed.has(t.email.id)).length} />
                {medEmails.filter(t => !dismissed.has(t.email.id)).map(t => (
                  <TriageRow
                    key={t.email.id} t={t}
                    isSelected={selectedRow?.email.id === t.email.id}
                    isChecked={selectedIds.has(t.email.id)}
                    onSelect={selectRow} onToggle={toggleSelect} onDelete={handleDeleteOne} deletingId={deletingId}
                  />
                ))}
              </>
            )}

            {/* LOW */}
            {lowEmails.filter(t => !dismissed.has(t.email.id)).length > 0 && (
              <>
                <SectionHeader dot="bg-gray-400 dark:bg-gray-600" label="Low" count={lowEmails.filter(t => !dismissed.has(t.email.id)).length} />
                {lowEmails.filter(t => !dismissed.has(t.email.id)).map(t => (
                  <TriageRow
                    key={t.email.id} t={t}
                    isSelected={selectedRow?.email.id === t.email.id}
                    isChecked={selectedIds.has(t.email.id)}
                    onSelect={selectRow} onToggle={toggleSelect} onDelete={handleDeleteOne} deletingId={deletingId}
                  />
                ))}
              </>
            )}

            {/* PENDING */}
            {pendingEmails.filter(t => !dismissed.has(t.email.id)).length > 0 && (
              <>
                <div className="flex items-center gap-2 px-5 py-1.5 bg-gray-50/80 dark:bg-[#161616] border-b dark:border-white/8 sticky top-0 z-10">
                  <Brain className="w-3 h-3 text-purple-500 shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-500 dark:text-purple-400">
                    Pending Analysis · {pendingEmails.filter(t => !dismissed.has(t.email.id)).length}
                  </span>
                </div>
                {pendingEmails.filter(t => !dismissed.has(t.email.id)).map(t => (
                  <TriageRow
                    key={t.email.id} t={t}
                    isSelected={selectedRow?.email.id === t.email.id}
                    isChecked={selectedIds.has(t.email.id)}
                    onSelect={selectRow} onToggle={toggleSelect} onDelete={handleDeleteOne} deletingId={deletingId}
                  />
                ))}
              </>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-2.5 border-t dark:border-white/8 shrink-0">
          <Link
            href="/sage/emails"
            className="flex items-center justify-center gap-1.5 w-full py-1.5 text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-colors"
          >
            Full Email Inbox <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ── Detail pane (60%) ──────────────────────────────────────── */}
      {selectedRow && (
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#1a1a1a]">

          {/* Header */}
          <div className="px-5 py-4 border-b dark:border-white/8 shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                {/* Priority badge */}
                <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                  {selectedRow.email.ai_priority ? (
                    <span className={cn('flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border', PRIORITY_BADGE[selectedRow.email.ai_priority])}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', PRIORITY_DOT[selectedRow.email.ai_priority])} />
                      {selectedRow.email.ai_priority}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/5 text-gray-400 border border-gray-200 dark:border-white/8 font-medium">
                      <Brain className="w-2.5 h-2.5" /> Pending
                    </span>
                  )}
                </div>
                {/* Avatar + sender */}
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-[#ec732e]/20 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-brand-600 dark:text-[#ec732e]">
                      {(selectedRow.email.from_name ?? selectedRow.email.from_address).charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {selectedRow.email.from_name ?? selectedRow.email.from_address}
                      {selectedRow.email.ai_entities?.company && (
                        <span className="font-normal text-gray-400 text-xs ml-2">· {selectedRow.email.ai_entities.company}</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400">{selectedRow.email.from_address}</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-2.5">{selectedRow.email.subject}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(selectedRow.email.received_at).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                </p>
              </div>
              <button
                onClick={() => selectRow(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 shrink-0 mt-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">

            {/* AI Summary */}
            {selectedRow.email.ai_summary && (
              <div className="px-4 py-3.5 rounded-xl bg-brand-50 dark:bg-[#ec732e]/8 border border-brand-100 dark:border-[#ec732e]/15">
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-brand-500 dark:text-[#ec732e]" />
                  <span className="text-[10px] font-bold text-brand-600 dark:text-[#ec732e] uppercase tracking-wide">AI Summary</span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{selectedRow.email.ai_summary}</p>
                {selectedRow.email.ai_reason && (
                  <p className="text-xs text-gray-400 mt-2.5 pt-2.5 border-t border-brand-100 dark:border-[#ec732e]/15 italic">
                    {selectedRow.email.ai_reason}
                  </p>
                )}
              </div>
            )}

            {/* Key insights */}
            {(selectedRow.email.ai_insights ?? []).length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Key Points</p>
                <ul className="space-y-2">
                  {(selectedRow.email.ai_insights ?? []).map((pt, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#61c2ad] shrink-0" />
                      <span className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Entity chips */}
            {selectedRow.email.ai_entities && Object.keys(selectedRow.email.ai_entities).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedRow.email.ai_entities.name && (
                  <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-white/5 border dark:border-white/8 text-gray-600 dark:text-gray-300">
                    <UserPlus className="w-3 h-3 text-gray-400 shrink-0" /> {selectedRow.email.ai_entities.name}
                  </span>
                )}
                {selectedRow.email.ai_entities.phone && (
                  <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-white/5 border dark:border-white/8 text-gray-600 dark:text-gray-300">
                    <Phone className="w-3 h-3 text-gray-400 shrink-0" /> {selectedRow.email.ai_entities.phone}
                  </span>
                )}
                {selectedRow.email.ai_entities.website && (
                  <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-white/5 border dark:border-white/8 text-gray-600 dark:text-gray-300">
                    <Globe className="w-3 h-3 text-gray-400 shrink-0" /> {selectedRow.email.ai_entities.website}
                  </span>
                )}
                {selectedRow.email.ai_entities.product_interest && (
                  <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-brand-50 dark:bg-[#ec732e]/10 border border-brand-100 dark:border-[#ec732e]/20 text-brand-700 dark:text-[#ec732e]">
                    <Tag className="w-3 h-3 shrink-0" /> {selectedRow.email.ai_entities.product_interest}
                  </span>
                )}
              </div>
            )}

            {/* Body preview */}
            {selectedRow.email.body_text && (
              <div className="px-4 py-3.5 rounded-xl bg-gray-50 dark:bg-white/3 border border-gray-100 dark:border-white/6">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Email</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
                  {selectedRow.email.body_text.slice(0, 800)}
                  {selectedRow.email.body_text.length > 800 && <span className="text-gray-400"> … [truncated]</span>}
                </p>
              </div>
            )}

            {/* Reply drafts */}
            {(selectedRow.email.ai_reply_drafts ?? []).length > 0 && (
              <div className="rounded-xl border dark:border-white/8 overflow-hidden bg-gray-50 dark:bg-white/3">
                <div className="flex items-center gap-1.5 px-4 pt-3 pb-2 border-b dark:border-white/6">
                  <Mail className="w-3 h-3 text-gray-400 mr-0.5" />
                  {(selectedRow.email.ai_reply_drafts ?? []).map((d, i) => (
                    <button
                      key={i}
                      onClick={() => setDetailDraftIdx(i)}
                      className={cn(
                        'text-xs px-3 py-1 rounded-lg font-medium transition-colors',
                        detailDraftIdx === i
                          ? 'bg-brand-600 text-white'
                          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/8',
                      )}
                    >
                      {d.tone}
                    </button>
                  ))}
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {(selectedRow.email.ai_reply_drafts ?? [])[detailDraftIdx]?.body}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action footer */}
          <div className="px-5 py-4 border-t dark:border-white/8 shrink-0 flex flex-wrap items-center gap-2">
            {selectedRow.recommendation !== 'ignore' && selectedRow.email.ai_analyzed_at && (
              <button
                onClick={() => {
                  if (selectedRow.recommendation === 'create_lead')    openModal(selectedRow, 'lead')
                  else if (selectedRow.recommendation === 'create_ticket')  openModal(selectedRow, 'ticket')
                  else if (selectedRow.recommendation === 'update_lead')    openModal(selectedRow, 'deal_note')
                  else if (selectedRow.recommendation === 'reopen_account') openModal(selectedRow, 'lead')
                }}
                className={cn('flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors', recColor(selectedRow.recommendation))}
              >
                {recIcon(selectedRow.recommendation)}
                {recLabel(selectedRow.recommendation, selectedRow)}
              </button>
            )}
            {/* Create Contact — shown when no contact matched yet */}
            {!selectedRow.matchedContact && selectedRow.email.ai_analyzed_at && selectedRow.recommendation !== 'create_lead' && (
              <button
                onClick={() => openModal(selectedRow, 'lead')}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" /> Create Contact
              </button>
            )}
            <button
              onClick={() => openReply(selectedRow)}
              className="flex items-center gap-2 px-4 py-2 bg-[#61c2ad] hover:bg-[#52b09b] text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <Send className="w-3.5 h-3.5" /> Reply
            </button>
            <button
              onClick={() => dismiss(selectedRow.email.id)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/8 rounded-xl transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Ignore
            </button>
            <div className="ml-auto">
              <Link
                href="/sage/emails"
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-brand-600 dark:hover:text-[#61c2ad] transition-colors"
              >
                Open in inbox <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── CRM form modal ────────────────────────────────────────── */}
      {modalMode && modalEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl border dark:border-white/10 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b dark:border-white/8">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {modalMode === 'lead'   ? (modalEmail.recommendation === 'reopen_account' ? 'Reopen Account' : 'Create Lead') :
                   modalMode === 'ticket' ? 'Create Support Ticket' :
                                           'Log Note on Deal'}
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">From: {modalEmail.email.from_name ?? modalEmail.email.from_address}</p>
              </div>
              <button onClick={() => setModalMode(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
              {/* Lead form */}
              {modalMode === 'lead' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-500 block mb-1">Name *</label>
                    <input value={mName} onChange={e => setMName(e.target.value)}
                      className="w-full text-sm px-3 py-2 rounded-lg border dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-brand-500" />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-500 block mb-1">Email</label>
                    <input value={mEmail} onChange={e => setMEmail(e.target.value)}
                      className="w-full text-sm px-3 py-2 rounded-lg border dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-brand-500" />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-500 block mb-1">Company</label>
                    <input value={mCompany} onChange={e => setMCompany(e.target.value)} placeholder="Optional"
                      className="w-full text-sm px-3 py-2 rounded-lg border dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-brand-500" />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-500 block mb-1">Deal Title *</label>
                    <input value={mDealTitle} onChange={e => setMDealTitle(e.target.value)}
                      className="w-full text-sm px-3 py-2 rounded-lg border dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-brand-500" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[11px] font-semibold text-gray-500 block mb-1">Notes</label>
                    <textarea value={mNotes} onChange={e => setMNotes(e.target.value)} rows={2}
                      className="w-full text-sm px-3 py-2 rounded-lg border dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none" />
                  </div>
                </div>
              )}
              {/* Ticket form */}
              {modalMode === 'ticket' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-gray-500 block mb-1">Contact Name</label>
                      <input value={mName} onChange={e => setMName(e.target.value)}
                        className="w-full text-sm px-3 py-2 rounded-lg border dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-brand-500" />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-gray-500 block mb-1">Priority</label>
                      <select value={mPriority} onChange={e => setMPriority(e.target.value as 'low'|'medium'|'high'|'urgent')}
                        className="w-full text-sm px-3 py-2 rounded-lg border dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none">
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-500 block mb-1">Title *</label>
                    <input value={mDealTitle} onChange={e => setMDealTitle(e.target.value)}
                      className="w-full text-sm px-3 py-2 rounded-lg border dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-brand-500" />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-500 block mb-1">Description</label>
                    <textarea value={mNotes} onChange={e => setMNotes(e.target.value)} rows={2}
                      className="w-full text-sm px-3 py-2 rounded-lg border dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none" />
                  </div>
                </div>
              )}
              {/* Deal note form */}
              {modalMode === 'deal_note' && (
                <div className="space-y-3">
                  <div className="px-3 py-2 rounded-lg bg-[#61c2ad]/10 border border-[#61c2ad]/20 text-sm text-[#61c2ad] font-medium">
                    Deal: {mDealTitle}
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-500 block mb-1">Note</label>
                    <textarea value={mNote} onChange={e => setMNote(e.target.value)} rows={3}
                      className="w-full text-sm px-3 py-2 rounded-lg border dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none" />
                  </div>
                </div>
              )}
              {modalError && <p className="text-xs text-red-500 mt-2">{modalError}</p>}
              <div className="flex items-center gap-2 mt-4">
                <button onClick={handleModalSubmit} disabled={isPending}
                  className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60">
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  {modalMode === 'lead' ? 'Save Lead' : modalMode === 'ticket' ? 'Create Ticket' : 'Log Note'}
                </button>
                <button onClick={() => setModalMode(null)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Reply compose modal ───────────────────────────────────── */}
      {replyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl border dark:border-white/10 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b dark:border-white/8">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Reply</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  To: {replyTarget.email.from_name
                    ? `${replyTarget.email.from_name} <${replyTarget.email.from_address}>`
                    : replyTarget.email.from_address}
                </p>
              </div>
              <button onClick={() => { setReplyTarget(null); setReplyResult(null); setReplyAttachments([]) }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-2.5 border-b dark:border-white/8 bg-gray-50 dark:bg-white/3">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <span className="font-semibold text-gray-600 dark:text-gray-300">Subject: </span>
                Re: {replyTarget.email.subject}
              </p>
            </div>
            {(replyTarget.email.ai_reply_drafts ?? []).length > 0 && (
              <div className="flex items-center gap-1.5 px-5 pt-3 pb-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mr-1">Tone:</span>
                {(replyTarget.email.ai_reply_drafts ?? []).map((d, i) => (
                  <button key={i}
                    onClick={() => { setReplyDraftIdx(i); setReplyBody(d.body) }}
                    className={cn(
                      'text-[11px] px-2.5 py-1 rounded-lg font-medium transition-colors',
                      replyDraftIdx === i
                        ? 'bg-[#61c2ad] text-white'
                        : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10',
                    )}>
                    {d.tone}
                  </button>
                ))}
              </div>
            )}
            <div className="px-5 py-3 flex-1">
              <textarea
                value={replyBody}
                onChange={e => setReplyBody(e.target.value)}
                rows={9}
                placeholder="Write your reply…"
                className="w-full text-sm text-gray-700 dark:text-gray-200 bg-transparent focus:outline-none resize-none leading-relaxed placeholder:text-gray-300 dark:placeholder:text-gray-600"
              />
            </div>
            {replyAttachments.length > 0 && (
              <div className="px-5 pb-2 flex flex-wrap gap-1.5">
                {replyAttachments.map((att, i) => (
                  <span key={i} className="flex items-center gap-1 text-[11px] bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-300 rounded-md px-2 py-1 border dark:border-white/8">
                    <Paperclip className="w-3 h-3 shrink-0" />
                    <span className="max-w-[160px] truncate">{att.filename}</span>
                    <button onClick={() => removeAttachment(i)} className="ml-0.5 text-gray-400 hover:text-red-500 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {showStripePanel && (
              <div className="mx-5 mb-3 border dark:border-white/8 rounded-xl overflow-hidden shadow-sm">
                <div className="px-3 py-2 bg-gray-50 dark:bg-white/3 border-b dark:border-white/8 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Open Invoices</span>
                  {isFetchingInvoices && <Loader2 className="w-3 h-3 animate-spin text-gray-400" />}
                </div>
                {stripeError ? (
                  <div className="px-3 py-2 text-xs text-red-500">{stripeError}</div>
                ) : stripeInvoices.length === 0 && !isFetchingInvoices ? (
                  <div className="px-3 py-2 text-xs text-gray-400">No open invoices found</div>
                ) : (
                  <div className="max-h-36 overflow-y-auto">
                    {stripeInvoices.map(inv => (
                      <button
                        key={inv.id}
                        onClick={() => handleAttachStripeInvoice(inv)}
                        disabled={loadingInvoiceId === inv.id}
                        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-white/5 border-b last:border-0 dark:border-white/5 transition-colors disabled:opacity-60">
                        <div>
                          <p className="text-xs font-medium text-gray-800 dark:text-gray-200">
                            {inv.customer_name ?? inv.customer_email ?? inv.id}
                          </p>
                          <p className="text-[10px] text-gray-400">{inv.number ?? inv.id}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: inv.currency.toUpperCase() }).format(inv.amount_due / 100)}
                          </span>
                          {loadingInvoiceId === inv.id
                            ? <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                            : <Paperclip className="w-3 h-3 text-gray-400" />}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="px-5 py-3.5 border-t dark:border-white/8 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <label title="Attach file" className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8 cursor-pointer transition-colors">
                  <Paperclip className="w-3.5 h-3.5" />
                  <input type="file" multiple className="hidden" onChange={handleFileUpload} />
                </label>
                <button
                  title="Attach Stripe invoice"
                  onClick={handleOpenStripePanel}
                  className={cn(
                    'flex items-center justify-center w-7 h-7 rounded-lg transition-colors',
                    showStripePanel
                      ? 'bg-[#635bff]/10 text-[#635bff] dark:text-[#7b73ff]'
                      : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8',
                  )}>
                  <Receipt className="w-3.5 h-3.5" />
                </button>
                {replyResult && (
                  <span className={cn('text-xs font-medium ml-1', replyResult.startsWith('Error') ? 'text-red-500' : 'text-green-600 dark:text-green-400')}>
                    {replyResult}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setReplyTarget(null); setReplyResult(null); setReplyAttachments([]) }}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleSendReply}
                  disabled={isSending || !replyBody.trim()}
                  className="flex items-center gap-2 px-5 py-2 bg-[#61c2ad] hover:bg-[#52b09b] disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                  {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  {isSending ? 'Sending…' : `Send${replyAttachments.length > 0 ? ` (${replyAttachments.length})` : ''}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
