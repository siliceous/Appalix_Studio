'use client'

import React, { useState, useTransition, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Mail, AlertCircle, ArrowRight, Sparkles,
  Plus, RefreshCw, Ticket, UserPlus, RotateCcw,
  Check, X, ChevronRight, Loader2, Trash2,
  Phone, Globe, Tag, Brain, ChevronDown,
} from 'lucide-react'
import { triageCreateLead, triageCreateTicket, triageAddDealNote } from '@/app/actions/sage-triage'
import { syncEmails, deleteTriageEmails, reanalyzeEmails } from '@/app/actions/sage-emails'
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

interface Props {
  triageEmails: TriageEmail[]
  workspaceId:  string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PRIORITY_DOT: Record<string, string> = {
  high:   'bg-[#61c2ad]',
  medium: 'bg-amber-400',
  low:    'bg-gray-300 dark:bg-gray-600',
}

const PRIORITY_BADGE: Record<string, string> = {
  high:   'bg-[#61c2ad]/10 dark:bg-[#61c2ad]/15 text-[#3a9e8a] dark:text-[#61c2ad] border-[#61c2ad]/30 dark:border-[#61c2ad]/25',
  medium: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
  low:    'bg-gray-100 dark:bg-white/5 text-gray-500 border-gray-200 dark:border-white/10',
}

// Priority sort order: high=0, medium=1, low=2, pending=3
const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }

function sortByPriority(a: TriageEmail, b: TriageEmail): number {
  const pa = a.email.ai_priority ? (PRIORITY_ORDER[a.email.ai_priority] ?? 3) : 3
  const pb = b.email.ai_priority ? (PRIORITY_ORDER[b.email.ai_priority] ?? 3) : 3
  if (pa !== pb) return pa - pb
  return new Date(b.email.received_at).getTime() - new Date(a.email.received_at).getTime()
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
  if (r === 'create_ticket')  return 'bg-red-500 hover:bg-red-600 text-white'
  if (r === 'ignore')         return 'bg-gray-200 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-white/10'
  return 'bg-[#61c2ad] hover:bg-[#52b09b] text-white'
}

// ─── Copy chip ────────────────────────────────────────────────────────────────

function CopyChip({ value, children, className }: { value: string; children: React.ReactNode; className: string }) {
  const [copied, setCopied] = useState(false)
  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation()
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? 'Copied!' : `Copy: ${value}`}
      className={cn(className, 'cursor-pointer transition-opacity hover:opacity-80 active:scale-95')}
    >
      {copied ? <span className="flex items-center gap-1"><Check className="w-2.5 h-2.5" />Copied</span> : children}
    </button>
  )
}

// ─── Triage Card ──────────────────────────────────────────────────────────────

interface CardProps {
  t:            TriageEmail
  isDone:       boolean
  actionLabel:  string | undefined
  isDismissed:  boolean
  isChecked:    boolean
  isSelected:   boolean
  onAction:     (t: TriageEmail, mode: 'lead' | 'ticket' | 'deal_note') => void
  onDismiss:    (id: string) => void
  onToggle:     (id: string) => void
  onSelect:     (id: string) => void
  isDeleting:   boolean
  onDelete:     (id: string) => void
}

function TriageCard({
  t, isDone, actionLabel, isDismissed, isChecked, isSelected,
  onAction, onDismiss, onToggle, onSelect, isDeleting, onDelete,
}: CardProps) {
  const [expanded,    setExpanded]    = useState(false)
  const [draftsOpen,  setDraftsOpen]  = useState(false)
  const [activeDraft, setActiveDraft] = useState(0)
  const cardRef = useRef<HTMLDivElement>(null)
  const { email, recommendation } = t
  const entities  = email.ai_entities
  const drafts    = email.ai_reply_drafts ?? []

  // Auto-expand and scroll into view when selected from the left panel
  useEffect(() => {
    if (isSelected) {
      setExpanded(true)
      setTimeout(() => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50)
    }
  }, [isSelected])

  if (isDismissed) return null

  function handlePrimaryAction(e: React.MouseEvent) {
    e.stopPropagation()
    if (recommendation === 'create_lead')    onAction(t, 'lead')
    if (recommendation === 'create_ticket')  onAction(t, 'ticket')
    if (recommendation === 'update_lead')    onAction(t, 'deal_note')
    if (recommendation === 'reopen_account') onAction(t, 'lead')
  }

  function handleHeaderClick() {
    setExpanded(v => !v)
    onSelect(email.id)
  }

  return (
    <div
      ref={cardRef}
      className={cn(
        'flex flex-col bg-white dark:bg-[#232323] rounded-xl border transition-all',
        isSelected
          ? 'ring-2 ring-[#61c2ad]/40 dark:ring-[#61c2ad]/30'
          : '',
        isDone
          ? 'border-green-200 dark:border-green-500/20'
          : email.ai_priority === 'high'
            ? 'border-[#61c2ad]/50 dark:border-[#61c2ad]/35'
            : email.ai_priority === 'medium'
              ? 'border-amber-300/70 dark:border-amber-500/30'
              : 'border-gray-200 dark:border-white/8',
      )}
    >
      {/* ── Clickable header — click anywhere here to expand/collapse ── */}
      <div
        onClick={handleHeaderClick}
        className="flex flex-col cursor-pointer select-none hover:bg-gray-50/60 dark:hover:bg-white/[0.02] rounded-t-xl transition-colors"
      >
        {/* Top row: badges + time + chevron + checkbox */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {email.ai_priority ? (
              <span className={cn('flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border', PRIORITY_BADGE[email.ai_priority])}>
                <span className={cn('w-1.5 h-1.5 rounded-full', PRIORITY_DOT[email.ai_priority])} />
                {email.ai_priority}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/8 font-medium">
                <Brain className="w-2.5 h-2.5" /> Pending
              </span>
            )}
            {email.ai_category && (
              <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold border', {
                'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20': email.ai_category === 'Sales',
                'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20': email.ai_category === 'Support',
                'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10': email.ai_category === 'Other',
              })}>
                {email.ai_category}
              </span>
            )}
            {isDone && (
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-500/20 font-medium">
                <Check className="w-2.5 h-2.5" /> {actionLabel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400">{formatDate(email.received_at)}</span>
            <ChevronDown className={cn('w-3.5 h-3.5 text-gray-400 transition-transform duration-200', expanded && 'rotate-180')} />
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onToggle(email.id) }}
              title={isChecked ? 'Deselect' : 'Select'}
            >
              <span className={cn(
                'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                isChecked ? 'bg-[#61c2ad] border-[#61c2ad]' : 'border-gray-300 dark:border-white/20 hover:border-[#61c2ad]',
              )}>
                {isChecked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
              </span>
            </button>
          </div>
        </div>

        {/* Sender + subject */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center shrink-0',
              email.ai_priority === 'high'   ? 'bg-[#61c2ad]/15 dark:bg-[#61c2ad]/20'
              : email.ai_priority === 'medium' ? 'bg-amber-100 dark:bg-amber-500/15'
              : 'bg-gray-100 dark:bg-white/5',
            )}>
              <span className={cn(
                'text-[11px] font-bold',
                email.ai_priority === 'high'   ? 'text-[#61c2ad]'
                : email.ai_priority === 'medium' ? 'text-amber-600 dark:text-amber-400'
                : 'text-gray-500 dark:text-gray-400',
              )}>
                {(email.from_name ?? email.from_address).charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                {email.from_name ?? email.from_address}
                {entities?.company && (
                  <span className="font-normal text-gray-400 text-xs ml-1">· {entities.company}</span>
                )}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-700 dark:text-gray-400 mt-1.5 leading-snug line-clamp-2">
            {email.subject}
          </p>
        </div>
      </div>

      {/* ── Accordion body — shown only when expanded ── */}
      {expanded && (
        <div className="border-t dark:border-white/8">

          {/* AI Summary */}
          {email.ai_summary ? (
            <div className="mx-4 mt-3 mb-2 px-3 py-2.5 rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles className="w-3 h-3 text-brand-500 dark:text-[#ec732e]" />
                <span className="text-[10px] font-bold text-brand-600 dark:text-[#ec732e] uppercase tracking-wide">AI Summary</span>
              </div>
              <p className="text-xs text-gray-900 dark:text-gray-100 leading-relaxed">{email.ai_summary}</p>
              {email.ai_reason && (
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1.5 italic">{email.ai_reason}</p>
              )}
            </div>
          ) : (
            <div className="mx-4 mt-3 mb-2 px-3 py-2 rounded-lg bg-purple-50 dark:bg-purple-500/8 border border-dashed border-purple-200 dark:border-purple-500/20 text-center">
              <p className="text-[11px] text-purple-500 dark:text-purple-400">AI analysis pending — click Analyse to generate insights</p>
            </div>
          )}

          {/* User prompt callout */}
          {email.ai_user_prompt && (
            <div className="mx-4 mb-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/3 border border-gray-200 dark:border-white/8 flex items-start gap-2">
              <span className="text-brand-500 dark:text-[#ec732e] text-sm leading-none mt-0.5">→</span>
              <p className="text-xs text-gray-900 dark:text-gray-100 font-medium leading-relaxed">{email.ai_user_prompt}</p>
            </div>
          )}

          {/* Intent + urgency signal chips */}
          {((entities?.intent_signals ?? []).length > 0 || (entities?.urgency_signals ?? []).length > 0) && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {(entities?.intent_signals ?? []).map((s, i) => (
                <CopyChip key={i} value={s} className="text-[10px] px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 font-medium">
                  {s}
                </CopyChip>
              ))}
              {(entities?.urgency_signals ?? []).map((s, i) => (
                <CopyChip key={i} value={s} className="text-[10px] px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20 font-medium">
                  ⚡ {s}
                </CopyChip>
              ))}
            </div>
          )}

          {/* Entity chips */}
          {entities && (entities.name || entities.phone || entities.website || entities.product_interest) && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {entities.name && (
                <CopyChip value={entities.name} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg bg-gray-50 dark:bg-white/5 border dark:border-white/8 text-gray-600 dark:text-gray-300">
                  <UserPlus className="w-2.5 h-2.5 text-gray-500 shrink-0" /> {entities.name}
                </CopyChip>
              )}
              {entities.phone && (
                <CopyChip value={entities.phone} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg bg-gray-50 dark:bg-white/5 border dark:border-white/8 text-gray-600 dark:text-gray-300">
                  <Phone className="w-2.5 h-2.5 text-gray-500 shrink-0" /> {entities.phone}
                </CopyChip>
              )}
              {entities.website && (
                <a
                  href={entities.website.startsWith('http') ? entities.website : `https://${entities.website}`}
                  target="_blank" rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg bg-gray-50 dark:bg-white/5 border dark:border-white/8 text-gray-600 dark:text-gray-300 hover:text-[#61c2ad] transition-colors"
                >
                  <Globe className="w-2.5 h-2.5 shrink-0" /> {entities.website}
                </a>
              )}
              {entities.product_interest && (
                <CopyChip value={entities.product_interest} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg bg-brand-50 dark:bg-[#ec732e]/10 border border-brand-100 dark:border-[#ec732e]/20 text-brand-700 dark:text-[#ec732e]">
                  <Tag className="w-2.5 h-2.5 shrink-0" /> {entities.product_interest}
                </CopyChip>
              )}
            </div>
          )}

          {/* Reply drafts inline */}
          {drafts.length > 0 && draftsOpen && (
            <div className="mx-4 mb-3 rounded-lg border dark:border-white/8 overflow-hidden bg-gray-50 dark:bg-white/3">
              <div className="flex items-center gap-1 px-3 pt-2 pb-1 flex-wrap">
                {drafts.map((d, i) => (
                  <button key={i} onClick={e => { e.stopPropagation(); setActiveDraft(i) }}
                    className={cn('text-[11px] px-2.5 py-1 rounded-lg font-medium transition-colors',
                      activeDraft === i ? 'bg-brand-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5')}>
                    {d.tone}
                  </button>
                ))}
              </div>
              <div className="px-3 py-2.5 border-t dark:border-white/8">
                <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap line-clamp-6">
                  {drafts[activeDraft]?.body}
                </p>
              </div>
              <div className="px-3 py-2 border-t dark:border-white/8 flex justify-end">
                <Link href="/sage/emails"
                  className="text-[11px] text-brand-600 dark:text-[#61c2ad] hover:underline flex items-center gap-1">
                  Open email client to send <ArrowRight className="w-2.5 h-2.5" />
                </Link>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="px-4 pb-4 pt-2 flex flex-wrap gap-1.5">
            {!isDone && recommendation !== 'ignore' && (
              <button
                onClick={handlePrimaryAction}
                className={cn('flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors', recColor(recommendation))}>
                {recIcon(recommendation)}
                {recLabel(recommendation, t)}
              </button>
            )}

            {drafts.length > 0 && (
              <button
                onClick={e => { e.stopPropagation(); setDraftsOpen(v => !v) }}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors border border-gray-200 dark:border-white/8">
                <Mail className="w-3 h-3" />
                Reply
                <ChevronDown className={cn('w-3 h-3 transition-transform', draftsOpen && 'rotate-180')} />
              </button>
            )}

            <button
              onClick={e => { e.stopPropagation(); onDismiss(email.id) }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors border border-gray-200 dark:border-white/8">
              <X className="w-3 h-3" /> Ignore
            </button>

            <button
              onClick={e => { e.stopPropagation(); onDelete(email.id) }}
              disabled={isDeleting}
              className="flex items-center justify-center w-7 h-7 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors border border-gray-200 dark:border-white/8 hover:border-red-200 dark:hover:border-red-500/20">
              {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function EmailTriageDashboard({ triageEmails }: Props) {
  const router = useRouter()
  const [dismissed,     setDismissed]     = useState<Set<string>>(new Set())
  const [actioned,      setActioned]      = useState<Map<string, string>>(new Map())
  const [modalMode,     setModalMode]     = useState<'lead' | 'ticket' | 'deal_note' | null>(null)
  const [modalEmail,    setModalEmail]    = useState<TriageEmail | null>(null)
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null)
  const [isPending,         startTransition]          = useTransition()
  const [isSyncing,         startSyncTransition]      = useTransition()
  const [isDeleting,        startDeleteTransition]    = useTransition()
  const [isReanalyzing,     startReanalyzeTransition] = useTransition()
  const [syncMsg,       setSyncMsg]       = useState<string | null>(null)
  const [analyzeMsg,    setAnalyzeMsg]    = useState<string | null>(null)
  const [selectedIds,   setSelectedIds]   = useState<Set<string>>(new Set())

  // Auto-refresh every 60 s so emails pushed by the IMAP IDLE loop appear
  useEffect(() => {
    const id = setInterval(() => { router.refresh() }, 60_000)
    return () => clearInterval(id)
  }, [router])

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
    // If specific emails are checked → re-analyze those
    // If nothing selected but unanalyzed pending → let server handle pending-only
    // If nothing selected and ALL already analyzed → force re-analyze all visible by passing their IDs
    const targetIds = selectedIds.size > 0
      ? Array.from(selectedIds)
      : unanalyzedCount === 0 && visible.length > 0
        ? visible.map(t => t.email.id)
        : undefined
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
      router.refresh()
    })
  }

  function handleDeleteOne(emailId: string) {
    startDeleteTransition(async () => {
      await deleteTriageEmails([emailId])
      setDismissed(prev => new Set([...prev, emailId]))
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
          setActioned(prev => new Map(prev).set(emailId, 'Lead + deal created'))
          setModalMode(null)
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
          setActioned(prev => new Map(prev).set(emailId, 'Ticket created'))
          setModalMode(null)
        }
      } else if (modalMode === 'deal_note') {
        const dealId = modalEmail.matchedDeal?.id
        if (!dealId) return
        result = await triageAddDealNote(dealId, mNote)
        if (!result.error) {
          setActioned(prev => new Map(prev).set(emailId, 'Note logged on deal'))
          setModalMode(null)
        }
      } else {
        return
      }

      if (result?.error) setModalError(result.error)
    })
  }

  const visible       = triageEmails.filter(t => !dismissed.has(t.email.id))
  const highEmails    = visible.filter(t => t.email.ai_priority === 'high')
  const medEmails     = visible.filter(t => t.email.ai_priority === 'medium')
  const lowEmails     = visible.filter(t => t.email.ai_priority === 'low')
  const pendingEmails = visible.filter(t => !t.email.ai_analyzed_at)
  const highCount     = highEmails.length
  const medCount      = medEmails.length
  const unanalyzedCount = visible.filter(t => !t.email.ai_analyzed_at).length

  // Left panel list sorted: high → medium → low → pending
  const sortedVisible = [...visible].sort(sortByPriority)

  const cardProps = {
    onAction:   openModal,
    onDismiss:  dismiss,
    onToggle:   toggleSelect,
    onSelect:   setSelectedEmailId,
    isDeleting,
    onDelete:   handleDeleteOne,
  }

  return (
    <div className="flex flex-1 overflow-hidden">

      {/* ─── LEFT: Priority-sorted email list ──────────────────────────────── */}
      <aside className="w-[260px] shrink-0 flex flex-col border-r dark:border-white/8 bg-gray-50/80 dark:bg-[#161616] overflow-hidden">

        {/* Header */}
        <div className="px-4 py-3 border-b dark:border-white/8 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-brand-500 shrink-0" />
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Triage</h2>
            </div>
            <div className="flex items-center gap-1">
              {selectedIds.size > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  disabled={isDeleting}
                  title={`Delete ${selectedIds.size} selected`}
                  className="flex items-center justify-center w-7 h-7 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                >
                  {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                </button>
              )}
              {visible.length > 0 && (
                <button
                  onClick={() => {
                    const allSel = visible.length > 0 && visible.every(t => selectedIds.has(t.email.id))
                    setSelectedIds(allSel ? new Set() : new Set(visible.map(t => t.email.id)))
                  }}
                  title={visible.every(t => selectedIds.has(t.email.id)) ? 'Deselect all' : 'Select all'}
                  className="text-[11px] px-2 py-1 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors font-medium"
                >
                  {visible.length > 0 && visible.every(t => selectedIds.has(t.email.id)) ? 'Deselect' : 'All'}
                </button>
              )}
              <button
                onClick={handleSync}
                disabled={isSyncing || isReanalyzing}
                className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={cn('w-3 h-3', isSyncing && 'animate-spin')} />
                {isSyncing ? 'Syncing…' : 'Sync'}
              </button>
            </div>
          </div>

          {/* Status badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {highCount > 0 && (
              <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-[#61c2ad]/10 text-[#3a9e8a] dark:text-[#61c2ad] font-semibold border border-[#61c2ad]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#61c2ad]" />{highCount} High
              </span>
            )}
            {medCount > 0 && (
              <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-200 dark:border-amber-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />{medCount} Medium
              </span>
            )}
            {visible.length > 0 && (
              <button
                onClick={handleReanalyze}
                disabled={isReanalyzing || isSyncing}
                className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold border border-purple-200 dark:border-purple-500/20 hover:bg-purple-100 dark:hover:bg-purple-500/15 disabled:opacity-50 transition-colors"
              >
                {isReanalyzing ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Brain className="w-2.5 h-2.5" />}
                {isReanalyzing
                  ? 'Analysing…'
                  : selectedIds.size > 0
                    ? `Analyse ${selectedIds.size}`
                    : unanalyzedCount > 0
                      ? `Analyse ${unanalyzedCount}`
                      : `Analyse ${visible.length}`}
              </button>
            )}
          </div>
          {(syncMsg || (analyzeMsg && !isReanalyzing)) && (
            <p className={cn('text-[11px] mt-1 font-medium', (syncMsg ?? analyzeMsg ?? '').startsWith('Error') ? 'text-red-500' : 'text-green-600 dark:text-green-400')}>
              {syncMsg ?? analyzeMsg}
            </p>
          )}
        </div>

        {/* Priority-sorted list — clicking a row expands the card in the center */}
        <div className="flex-1 overflow-y-auto">
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                <Mail className="w-5 h-5 text-gray-300 dark:text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No emails to triage</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Sync your inbox to get started</p>
              </div>
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
              >
                <RefreshCw className={cn('w-3 h-3', isSyncing && 'animate-spin')} />
                {isSyncing ? 'Syncing…' : 'Sync Inbox'}
              </button>
            </div>
          ) : (
            sortedVisible.map(t => {
              const isChecked = selectedIds.has(t.email.id)
              const isActive  = selectedEmailId === t.email.id
              const priority  = t.email.ai_priority
              return (
                <div
                  key={t.email.id}
                  onClick={() => setSelectedEmailId(t.email.id)}
                  className={cn(
                    'flex items-stretch border-l-[3px] transition-colors cursor-pointer',
                    isActive
                      ? priority === 'high'
                        ? 'border-l-[#61c2ad] bg-[#61c2ad]/8 dark:bg-[#61c2ad]/10'
                        : priority === 'medium'
                          ? 'border-l-amber-400 bg-amber-50 dark:bg-amber-500/8'
                          : priority === 'low'
                            ? 'border-l-gray-400 bg-gray-100 dark:bg-white/5'
                            : 'border-l-purple-400 bg-purple-50 dark:bg-purple-500/8'
                      : 'border-l-transparent hover:bg-white dark:hover:bg-white/3',
                  )}
                >
                  <div className="flex-1 min-w-0 px-3 py-2.5">
                    <div className="flex items-start gap-2">
                      <span className={cn('mt-1.5 w-2 h-2 rounded-full shrink-0',
                        priority ? PRIORITY_DOT[priority] : 'bg-gray-200 dark:bg-white/20')} />
                      <div className="flex-1 min-w-0">
                        <span className={cn('text-xs font-semibold truncate block',
                          actioned.has(t.email.id) ? 'text-gray-400' : 'text-gray-800 dark:text-gray-200')}>
                          {t.email.from_name ?? t.email.from_address}
                        </span>
                        <p className="text-[11px] text-gray-400 truncate">{t.email.subject}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-start gap-2 pt-2.5 pb-2.5 pr-3 shrink-0">
                    <span className="text-[10px] text-gray-400 leading-none">{formatDate(t.email.received_at)}</span>
                    <button onClick={e => { e.stopPropagation(); toggleSelect(t.email.id) }}>
                      <span className={cn(
                        'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                        isChecked ? 'bg-[#61c2ad] border-[#61c2ad]' : 'border-gray-300 dark:border-white/20 hover:border-[#61c2ad]',
                      )}>
                        {isChecked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                      </span>
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-3 border-t dark:border-white/8 shrink-0">
          <Link href="/sage/emails"
            className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-white/5 rounded-xl transition-colors">
            Full Email Inbox <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </aside>

      {/* ─── CENTER: Priority Card Grid ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-[#1c1c1c]">

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
              <Link href="/sage/integrations"
                className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl px-5 py-2.5 hover:bg-amber-100 transition-colors font-medium mt-1">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Connect Gmail or Outlook
                <ArrowRight className="w-4 h-4 shrink-0" />
              </Link>
            </div>
          </div>

        ) : (
          <>
            {/* ── Center toolbar: Select All + Delete ── */}
            <div className="flex items-center gap-2 px-5 py-2 border-b dark:border-white/8 shrink-0">
              <button
                onClick={() => {
                  const allSel = visible.every(t => selectedIds.has(t.email.id))
                  setSelectedIds(allSel ? new Set() : new Set(visible.map(t => t.email.id)))
                }}
                className="text-[11px] font-medium text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                {visible.every(t => selectedIds.has(t.email.id)) ? 'Deselect all' : `Select all (${visible.length})`}
              </button>
              {selectedIds.size > 0 && (
                <>
                  <span className="text-gray-200 dark:text-white/10">|</span>
                  <span className="text-[11px] text-gray-400">{selectedIds.size} selected</span>
                  <button
                    onClick={handleDeleteSelected}
                    disabled={isDeleting}
                    title={`Delete ${selectedIds.size} selected`}
                    className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50 transition-colors font-medium"
                  >
                    {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    Delete
                  </button>
                </>
              )}
            </div>

          <div className="flex-1 overflow-y-auto p-5">

            {/* HIGH */}
            {highEmails.filter(t => !dismissed.has(t.email.id)).length > 0 && (
              <section className="mb-7">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-[#61c2ad] shrink-0" />
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#3a9e8a] dark:text-[#61c2ad]">
                    High Priority · {highEmails.filter(t => !dismissed.has(t.email.id)).length}
                  </h3>
                  <div className="flex-1 h-px bg-[#61c2ad]/30 dark:bg-[#61c2ad]/20" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                  {highEmails.filter(t => !dismissed.has(t.email.id)).map(t => (
                    <TriageCard key={t.email.id} t={t}
                      isDone={actioned.has(t.email.id)} actionLabel={actioned.get(t.email.id)}
                      isDismissed={false} isChecked={selectedIds.has(t.email.id)}
                      isSelected={selectedEmailId === t.email.id}
                      {...cardProps}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* MEDIUM */}
            {medEmails.filter(t => !dismissed.has(t.email.id)).length > 0 && (
              <section className="mb-7">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-amber-500 dark:text-amber-400">
                    Medium · {medEmails.filter(t => !dismissed.has(t.email.id)).length}
                  </h3>
                  <div className="flex-1 h-px bg-amber-200 dark:bg-amber-500/20" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                  {medEmails.filter(t => !dismissed.has(t.email.id)).map(t => (
                    <TriageCard key={t.email.id} t={t}
                      isDone={actioned.has(t.email.id)} actionLabel={actioned.get(t.email.id)}
                      isDismissed={false} isChecked={selectedIds.has(t.email.id)}
                      isSelected={selectedEmailId === t.email.id}
                      {...cardProps}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* LOW */}
            {lowEmails.filter(t => !dismissed.has(t.email.id)).length > 0 && (
              <section className="mb-7">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-600 shrink-0" />
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    Low · {lowEmails.filter(t => !dismissed.has(t.email.id)).length}
                  </h3>
                  <div className="flex-1 h-px bg-gray-200 dark:bg-white/8" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                  {lowEmails.filter(t => !dismissed.has(t.email.id)).map(t => (
                    <TriageCard key={t.email.id} t={t}
                      isDone={actioned.has(t.email.id)} actionLabel={actioned.get(t.email.id)}
                      isDismissed={false} isChecked={selectedIds.has(t.email.id)}
                      isSelected={selectedEmailId === t.email.id}
                      {...cardProps}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* PENDING */}
            {pendingEmails.filter(t => !dismissed.has(t.email.id)).length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  {/* Clickable heading → triggers AI analysis */}
                  <button
                    onClick={handleReanalyze}
                    disabled={isReanalyzing || isSyncing}
                    className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-purple-500 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 disabled:opacity-50 transition-colors group"
                  >
                    {isReanalyzing
                      ? <Loader2 className="w-3 h-3 shrink-0 animate-spin" />
                      : <Brain className="w-3 h-3 shrink-0 group-hover:scale-110 transition-transform" />}
                    {isReanalyzing
                      ? 'Analysing…'
                      : `Pending Analysis · ${pendingEmails.filter(t => !dismissed.has(t.email.id)).length}`}
                  </button>
                  <div className="flex-1 h-px bg-purple-200 dark:bg-purple-500/20" />
                  {/* Select all pending */}
                  <button
                    onClick={() => {
                      const ids = pendingEmails.filter(t => !dismissed.has(t.email.id)).map(t => t.email.id)
                      const allSel = ids.length > 0 && ids.every(id => selectedIds.has(id))
                      setSelectedIds(prev => {
                        const next = new Set(prev)
                        ids.forEach(id => allSel ? next.delete(id) : next.add(id))
                        return next
                      })
                    }}
                    className="text-[11px] text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-medium transition-colors whitespace-nowrap"
                  >
                    {pendingEmails.filter(t => !dismissed.has(t.email.id)).every(t => selectedIds.has(t.email.id))
                      ? 'Deselect all' : 'Select all'}
                  </button>
                  {/* Delete selected */}
                  <button
                    onClick={handleDeleteSelected}
                    disabled={selectedIds.size === 0 || isDeleting}
                    title={selectedIds.size > 0 ? `Delete ${selectedIds.size} selected` : 'Select emails to delete'}
                    className="flex items-center justify-center w-6 h-6 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                  >
                    {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  </button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                  {pendingEmails.filter(t => !dismissed.has(t.email.id)).map(t => (
                    <TriageCard key={t.email.id} t={t}
                      isDone={actioned.has(t.email.id)} actionLabel={actioned.get(t.email.id)}
                      isDismissed={false} isChecked={selectedIds.has(t.email.id)}
                      isSelected={selectedEmailId === t.email.id}
                      {...cardProps}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
          </>
        )}

        {/* ── Modal slides up from bottom of center panel ── */}
        {modalMode && modalEmail && (
          <div className="border-t dark:border-white/8 bg-white dark:bg-[#1e1e1e] p-5 shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {modalMode === 'lead'   ? (modalEmail.recommendation === 'reopen_account' ? 'Reopen Account' : 'Create Lead') :
                   modalMode === 'ticket' ? 'Create Support Ticket' :
                                           'Log Note on Deal'}
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">From: {modalEmail.email.from_name ?? modalEmail.email.from_address}</p>
              </div>
              <button onClick={() => setModalMode(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-4 h-4" />
              </button>
            </div>

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
                <div className="px-3 py-2 rounded-lg bg-[#61c2ad]/10 border border-[#61c2ad]/20 text-sm text-[#3a9e8a] dark:text-[#61c2ad] font-medium">
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
                {modalMode === 'lead'   ? 'Save Lead' :
                 modalMode === 'ticket' ? 'Create Ticket' :
                                         'Log Note'}
              </button>
              <button onClick={() => setModalMode(null)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
