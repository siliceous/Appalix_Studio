'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Mail, AlertCircle, ArrowRight, Star, Sparkles,
  Plus, RefreshCw, Ticket, UserPlus, RotateCcw,
  Check, X, ChevronRight, Loader2, Trash2,
  Building2, Phone, Globe, Tag, Brain,
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

function formatFull(iso: string) {
  return new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
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

// ─── Main component ────────────────────────────────────────────────────────────

export function EmailTriageDashboard({ triageEmails }: Props) {
  const router = useRouter()
  const [selected,   setSelected]   = useState<TriageEmail | null>(triageEmails[0] ?? null)
  const [dismissed,  setDismissed]  = useState<Set<string>>(new Set())
  const [actioned,   setActioned]   = useState<Map<string, string>>(new Map())
  const [modalMode,  setModalMode]  = useState<'lead' | 'ticket' | 'deal_note' | null>(null)
  const [activeDraft, setActiveDraft] = useState(0)
  const [composeOpen, setComposeOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isSyncing, startSyncTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()
  const [isReanalyzing, startReanalyzeTransition] = useTransition()
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

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
    setSyncMsg(null)
    startReanalyzeTransition(async () => {
      const res = await reanalyzeEmails(50)
      if (res.error) { setSyncMsg(`Error: ${res.error}`); return }
      setSyncMsg(res.reanalyzed > 0 ? `Analysed ${res.reanalyzed}` : 'All analysed')
      router.refresh()
    })
  }

  function handleDeleteSelected() {
    const ids = Array.from(selectedIds)
    startDeleteTransition(async () => {
      const res = await deleteTriageEmails(ids)
      if (res.error) { setSyncMsg(`Error: ${res.error}`); return }
      // Remove from local state
      setDismissed(prev => new Set([...prev, ...ids]))
      setSelectedIds(new Set())
      if (selected && ids.includes(selected.email.id)) {
        const next = visible.find(t => !ids.includes(t.email.id))
        setSelected(next ?? null)
      }
      router.refresh()
    })
  }

  function toggleSelect(emailId: string, e: React.MouseEvent) {
    e.stopPropagation()
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(emailId)) next.delete(emailId)
      else next.add(emailId)
      return next
    })
  }

  // Modal form state
  const [mName,     setMName]     = useState('')
  const [mEmail,    setMEmail]    = useState('')
  const [mCompany,  setMCompany]  = useState('')
  const [mDealTitle, setMDealTitle] = useState('')
  const [mNotes,    setMNotes]    = useState('')
  const [mPriority, setMPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
  const [mNote,     setMNote]     = useState('')
  const [modalError, setModalError] = useState<string | null>(null)

  const visible = triageEmails.filter(t => !dismissed.has(t.email.id))
  const highCount = visible.filter(t => t.email.ai_priority === 'high').length
  const medCount  = visible.filter(t => t.email.ai_priority === 'medium').length
  const unanalyzedCount = visible.filter(t => !t.email.ai_analyzed_at).length

  function dismiss(emailId: string) {
    setDismissed(prev => new Set([...prev, emailId]))
    if (selected?.email.id === emailId) {
      const next = visible.find(t => t.email.id !== emailId)
      setSelected(next ?? null)
    }
  }

  function openModal(mode: 'lead' | 'ticket' | 'deal_note') {
    if (!selected) return
    const e = selected.email
    setModalError(null)
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
      const deal = selected.matchedDeal
      setMNote(`New email received: ${e.subject}${e.ai_summary ? ` — ${e.ai_summary}` : ''}`)
      setMDealTitle(deal?.title ?? '')
    }
    setModalMode(mode)
  }

  function handleModalSubmit() {
    if (!selected) return
    startTransition(async () => {
      setModalError(null)
      let result: { error?: string }
      const emailId = selected.email.id

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
        const dealId = selected.matchedDeal?.id
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

  const draftTabs = selected?.email.ai_reply_drafts ?? []
  const entities  = selected?.email.ai_entities

  return (
    <div className="flex flex-1 overflow-hidden">

      {/* ─── LEFT: Triage List ─────────────────────────────────────────────── */}
      <aside className="w-[280px] shrink-0 flex flex-col border-r dark:border-white/8 bg-gray-50/80 dark:bg-[#161616] overflow-hidden">

        {/* Header */}
        <div className="px-4 py-3 border-b dark:border-white/8 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-brand-500 shrink-0" />
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Email Triage</h2>
            </div>
            <div className="flex items-center gap-1">
              {/* Delete selected button */}
              {selectedIds.size > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  disabled={isDeleting}
                  title={`Delete ${selectedIds.size} selected`}
                  className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                >
                  {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  Delete ({selectedIds.size})
                </button>
              )}
              <button
                onClick={handleSync}
                disabled={isSyncing || isReanalyzing}
                title="Sync inbox"
                className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={cn('w-3 h-3', isSyncing && 'animate-spin')} />
                {isSyncing ? 'Syncing…' : 'Sync'}
              </button>
            </div>
          </div>

          {/* Status badges row */}
          <div className="flex items-center gap-2 flex-wrap">
            {highCount > 0 && (
              <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-semibold border border-red-200 dark:border-red-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                {highCount} High
              </span>
            )}
            {medCount > 0 && (
              <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-200 dark:border-amber-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                {medCount} Medium
              </span>
            )}
            {unanalyzedCount > 0 && (
              <button
                onClick={handleReanalyze}
                disabled={isReanalyzing || isSyncing}
                title="Run AI analysis on unanalyzed emails"
                className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold border border-purple-200 dark:border-purple-500/20 hover:bg-purple-100 dark:hover:bg-purple-500/15 disabled:opacity-50 transition-colors"
              >
                {isReanalyzing ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Brain className="w-2.5 h-2.5" />}
                {isReanalyzing ? 'Analysing…' : `Analyse ${unanalyzedCount}`}
              </button>
            )}
          </div>
          {syncMsg && (
            <p className={cn('text-[11px] mt-1 font-medium', syncMsg.startsWith('Error') ? 'text-red-500' : 'text-green-600 dark:text-green-400')}>
              {syncMsg}
            </p>
          )}
        </div>

        {/* List */}
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
              <Link href="/sage/emails"
                className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:underline">
                Full Inbox <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          ) : (
            visible.map(t => {
              const isSelected  = selected?.email.id === t.email.id
              const isChecked   = selectedIds.has(t.email.id)
              const done        = actioned.has(t.email.id)
              return (
                <div key={t.email.id}
                  className={cn(
                    'flex items-stretch transition-colors',
                    isSelected
                      ? 'bg-[#61c2ad]/[0.12] dark:bg-[#61c2ad]/[0.1] border-l-[3px] border-l-[#61c2ad]'
                      : 'hover:bg-white dark:hover:bg-white/3 border-l-[3px] border-l-transparent',
                  )}>
                  {/* Checkbox column */}
                  <button
                    onClick={e => toggleSelect(t.email.id, e)}
                    className="flex items-center justify-center pl-2.5 pr-1 py-3 shrink-0"
                    title={isChecked ? 'Deselect' : 'Select'}
                  >
                    <span className={cn(
                      'w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0',
                      isChecked
                        ? 'bg-brand-600 border-brand-600 dark:bg-[#ec732e] dark:border-[#ec732e]'
                        : 'border-gray-300 dark:border-white/20 hover:border-brand-400',
                    )}>
                      {isChecked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                    </span>
                  </button>

                  {/* Email row */}
                  <button
                    onClick={() => { setSelected(t); setComposeOpen(false); setModalMode(null) }}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="flex items-start gap-2.5 pr-3 py-3">
                      {/* Priority dot */}
                      <span className={cn('mt-1.5 w-2 h-2 rounded-full shrink-0',
                        t.email.ai_priority ? PRIORITY_DOT[t.email.ai_priority] : 'bg-gray-200 dark:bg-white/20')} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className={cn('text-xs font-semibold truncate',
                            done ? 'text-gray-400' : 'text-gray-800 dark:text-gray-200')}>
                            {t.email.from_name ?? t.email.from_address}
                          </span>
                          <span className="text-[10px] text-gray-400 shrink-0">{formatDate(t.email.received_at)}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate leading-tight">
                          {t.email.subject}
                        </p>
                        {/* Recommendation chip */}
                        <div className="mt-1.5 flex items-center gap-1">
                          {done ? (
                            <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-lg bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 font-medium border border-green-200 dark:border-green-500/20">
                              <Check className="w-2.5 h-2.5" /> {actioned.get(t.email.id)}
                            </span>
                          ) : !t.email.ai_analyzed_at ? (
                            <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-400 font-medium border border-gray-200 dark:border-white/10">
                              <Brain className="w-2.5 h-2.5" /> Pending analysis
                            </span>
                          ) : (
                            <span className={cn('flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-lg font-medium border',
                              t.recommendation === 'create_ticket'  ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20' :
                              t.recommendation === 'ignore'         ? 'bg-gray-100 dark:bg-white/5 text-gray-400 border-gray-200 dark:border-white/10' :
                                                                      'bg-[#61c2ad]/10 text-[#61c2ad] border-[#61c2ad]/20')}>
                              {recIcon(t.recommendation)}
                              {recLabel(t.recommendation, t)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-3 border-t dark:border-white/8">
          <Link href="/sage/emails"
            className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-white/5 rounded-xl transition-colors">
            Full Email Inbox <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </aside>

      {/* ─── RIGHT: Detail Panel ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#1a1a1a]">

        {triageEmails.length === 0 ? (
          /* Empty state — no emails synced yet */
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-400 p-8">
            <div className="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
              <Mail className="w-9 h-9 opacity-20" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-base font-semibold text-gray-600 dark:text-gray-300">No emails to triage yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 max-w-sm">
                Connect Gmail or Outlook under Sage → Integrations, then sync your inbox to get AI-powered triage here.
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
              {syncMsg && (
                <p className={cn('text-xs font-medium', syncMsg.startsWith('Error') ? 'text-red-500' : 'text-green-600 dark:text-green-400')}>
                  {syncMsg}
                </p>
              )}
              <Link href="/sage/integrations"
                className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl px-5 py-2.5 hover:bg-amber-100 dark:hover:bg-amber-500/15 transition-colors font-medium mt-1">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Connect Gmail or Outlook
                <ArrowRight className="w-4 h-4 shrink-0" />
              </Link>
            </div>
          </div>

        ) : !selected ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <p className="text-sm">Select an email to review</p>
          </div>

        ) : (
          <>
            {/* Email header */}
            <div className="px-6 py-5 border-b dark:border-white/8 shrink-0">
              <div className="flex items-start justify-between gap-4 mb-3">
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-snug flex-1">
                  {selected.email.subject}
                </h2>
                <span className="text-xs text-gray-400 shrink-0 mt-1">{formatFull(selected.email.received_at)}</span>
              </div>

              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-[#ec732e]/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-brand-600 dark:text-[#ec732e]">
                    {(selected.email.from_name ?? selected.email.from_address).charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {selected.email.from_name ?? selected.email.from_address}
                    {selected.email.from_name && (
                      <span className="text-xs text-gray-400 font-normal ml-1.5">&lt;{selected.email.from_address}&gt;</span>
                    )}
                  </p>
                </div>
                {/* Priority badge */}
                {selected.email.ai_priority && (
                  <span className={cn('flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wide border', PRIORITY_BADGE[selected.email.ai_priority])}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', PRIORITY_DOT[selected.email.ai_priority])} />
                    {selected.email.ai_priority}
                  </span>
                )}
                {/* Star */}
                <Star className={cn('w-4 h-4 shrink-0',
                  selected.email.is_starred ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-600')} />
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-6 py-5 space-y-6">

                {/* AI Summary */}
                {selected.email.ai_summary && (
                  <div className="bg-brand-50 dark:bg-[#ec732e]/8 border border-brand-100 dark:border-[#ec732e]/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-brand-500 dark:text-[#ec732e]" />
                      <p className="text-[10px] font-bold text-brand-600 dark:text-[#ec732e] uppercase tracking-wide">AI Summary</p>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{selected.email.ai_summary}</p>
                    {/* Priority reason */}
                    {selected.email.ai_reason && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 pt-2 border-t border-brand-100 dark:border-[#ec732e]/15 italic">
                        {selected.email.ai_reason}
                      </p>
                    )}
                  </div>
                )}

                {/* Pending analysis */}
                {!selected.email.ai_analyzed_at && (
                  <div className="bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 rounded-xl p-4 flex items-center gap-3">
                    <Brain className="w-4 h-4 text-purple-500 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-purple-700 dark:text-purple-400">Not yet analysed</p>
                      <p className="text-xs text-purple-500 dark:text-purple-400 mt-0.5">Click &ldquo;Analyse&rdquo; in the left panel to run AI triage on this email.</p>
                    </div>
                  </div>
                )}

                {/* Extracted Entities */}
                {entities && Object.keys(entities).length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Extracted Contact Info</p>
                    <div className="flex flex-wrap gap-2">
                      {entities.name && (
                        <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-white/5 border dark:border-white/8 text-gray-700 dark:text-gray-300">
                          <UserPlus className="w-3 h-3 text-gray-400 shrink-0" />
                          {entities.name}
                        </span>
                      )}
                      {entities.company && (
                        <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-white/5 border dark:border-white/8 text-gray-700 dark:text-gray-300">
                          <Building2 className="w-3 h-3 text-gray-400 shrink-0" />
                          {entities.company}
                        </span>
                      )}
                      {entities.phone && (
                        <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-white/5 border dark:border-white/8 text-gray-700 dark:text-gray-300">
                          <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                          {entities.phone}
                        </span>
                      )}
                      {entities.website && (
                        <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-white/5 border dark:border-white/8 text-gray-700 dark:text-gray-300">
                          <Globe className="w-3 h-3 text-gray-400 shrink-0" />
                          {entities.website}
                        </span>
                      )}
                      {entities.product_interest && (
                        <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-brand-50 dark:bg-[#ec732e]/10 border border-brand-100 dark:border-[#ec732e]/20 text-brand-700 dark:text-[#ec732e]">
                          <Tag className="w-3 h-3 shrink-0" />
                          {entities.product_interest}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* AI Key Points */}
                {selected.email.ai_insights && selected.email.ai_insights.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Key Points</p>
                    <ul className="space-y-2">
                      {selected.email.ai_insights.map((insight, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-400 dark:bg-[#61c2ad] shrink-0" />
                          <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Email body */}
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Email Body</p>
                  <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-7 max-w-2xl">
                    {selected.email.body_text?.slice(0, 1500) ?? '(no body)'}
                    {(selected.email.body_text?.length ?? 0) > 1500 && (
                      <span className="text-gray-400"> … [truncated]</span>
                    )}
                  </div>
                </div>

                {/* AI Reply Drafts */}
                {draftTabs.length > 0 && !composeOpen && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">AI Reply Drafts</p>
                    </div>
                    <div className="flex gap-1.5 mb-3">
                      {draftTabs.map((d, i) => (
                        <button key={i} onClick={() => { setActiveDraft(i); setComposeOpen(true) }}
                          className={cn(
                            'text-[11px] px-3 py-1.5 rounded-lg font-medium transition-colors border',
                            activeDraft === i && composeOpen
                              ? 'bg-brand-600 text-white border-brand-600'
                              : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/8',
                          )}>
                          {d.tone}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Compose / reply draft */}
                {composeOpen && draftTabs[activeDraft] && (
                  <div className="rounded-xl border dark:border-white/10 overflow-hidden bg-gray-50 dark:bg-white/3">
                    <div className="flex items-center justify-between px-4 py-2.5 border-b dark:border-white/8">
                      <div className="flex gap-1.5">
                        {draftTabs.map((d, i) => (
                          <button key={i} onClick={() => setActiveDraft(i)}
                            className={cn('text-[11px] px-2.5 py-1 rounded-lg font-medium transition-colors',
                              activeDraft === i
                                ? 'bg-brand-600 text-white'
                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5')}>
                            {d.tone}
                          </button>
                        ))}
                      </div>
                      <button onClick={() => setComposeOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                        {draftTabs[activeDraft].body}
                      </p>
                    </div>
                    <div className="px-4 py-2.5 border-t dark:border-white/8 flex justify-end">
                      <Link href="/sage/emails"
                        className="text-xs text-brand-600 dark:text-[#61c2ad] hover:underline flex items-center gap-1">
                        Open full email client to send <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                )}

                {/* ── Action buttons ── */}
                {!actioned.has(selected.email.id) ? (
                  <div className="pt-2 border-t dark:border-white/8">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3">Recommended Action</p>
                    <div className="flex flex-wrap gap-2">
                      {/* Primary action */}
                      {selected.recommendation !== 'ignore' && selected.email.ai_analyzed_at && (
                        <button
                          onClick={() => {
                            if (selected.recommendation === 'create_lead')    openModal('lead')
                            if (selected.recommendation === 'create_ticket')  openModal('ticket')
                            if (selected.recommendation === 'update_lead')    openModal('deal_note')
                            if (selected.recommendation === 'reopen_account') openModal('lead')
                          }}
                          className={cn('flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors', recColor(selected.recommendation))}>
                          {recIcon(selected.recommendation)}
                          {recLabel(selected.recommendation, selected)}
                        </button>
                      )}
                      {/* Draft Reply */}
                      {draftTabs.length > 0 && (
                        <button onClick={() => setComposeOpen(v => !v)}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white dark:bg-white/5 border dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/8 transition-colors">
                          <Mail className="w-3.5 h-3.5" /> Draft Reply
                        </button>
                      )}
                      {/* Ignore */}
                      <button onClick={() => dismiss(selected.email.id)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white dark:bg-white/5 border dark:border-white/10 text-gray-400 hover:bg-gray-50 dark:hover:bg-white/8 transition-colors">
                        <X className="w-3.5 h-3.5" /> Ignore
                      </button>
                      {/* Delete */}
                      <button
                        onClick={() => {
                          startDeleteTransition(async () => {
                            await deleteTriageEmails([selected.email.id])
                            dismiss(selected.email.id)
                            router.refresh()
                          })
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white dark:bg-white/5 border dark:border-white/10 text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:border-red-200 dark:hover:border-red-500/20 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 border-t dark:border-white/8">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <Check className="w-4 h-4" />
                      <span className="text-sm font-medium">{actioned.get(selected.email.id)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Pre-filled Modal (slides up from bottom of detail panel) ── */}
            {modalMode && (
              <div className="border-t dark:border-white/8 bg-white dark:bg-[#1e1e1e] p-5 shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {modalMode === 'lead'     ? (selected.recommendation === 'reopen_account' ? 'Reopen Account' : 'Create Lead') :
                     modalMode === 'ticket'   ? 'Create Support Ticket' :
                                               'Log Note on Deal'}
                  </h3>
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

                {modalError && (
                  <p className="text-xs text-red-500 mt-2">{modalError}</p>
                )}

                <div className="flex items-center gap-2 mt-4">
                  <button onClick={handleModalSubmit} disabled={isPending}
                    className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60">
                    {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    {modalMode === 'lead'     ? 'Save Lead' :
                     modalMode === 'ticket'   ? 'Create Ticket' :
                                               'Log Note'}
                  </button>
                  <button onClick={() => setModalMode(null)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
