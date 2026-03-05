'use client'

import React, { useState, useTransition, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Mail, AlertCircle, ArrowRight, Sparkles,
  Plus, RefreshCw, Ticket, UserPlus, RotateCcw,
  Check, X, ChevronRight, Loader2, Trash2,
  Phone, Globe, Tag, Brain,
  Calendar, MapPin, Users, Clock,
} from 'lucide-react'
import { triageCreateLead, triageCreateTicket, triageAddDealNote } from '@/app/actions/sage-triage'
import { syncEmails, deleteTriageEmails, reanalyzeEmails, sendEmail } from '@/app/actions/sage-emails'
import type { SageEmail, SageMeeting } from '@/lib/types'
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
  meeting?:        SageMeeting | null
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
  medium: 'bg-amber-50 dark:bg-amber-500/10 text-amber-500/75 dark:text-amber-400/75 border-amber-200/70 dark:border-amber-500/18',
  low:    'bg-gray-100 dark:bg-white/5 text-gray-500 border-gray-200 dark:border-white/10',
}

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
  if (r === 'create_ticket') return 'bg-sky-500 hover:bg-sky-600 text-white'
  if (r === 'ignore')        return 'bg-gray-200 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-white/10'
  return 'bg-blue-600 hover:bg-blue-700 text-white'
}

function categoryClass(cat: string): string {
  if (cat === 'Sales')        return 'bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-500/20'
  if (cat === 'Support')      return 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-500/20'
  if (cat === 'Invoice')      return 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-500/20'
  if (cat === 'Receipt')      return 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20'
  if (cat === 'Financial')    return 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
  if (cat === 'Social')       return 'bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-500/20'
  if (cat === 'Promotion')    return 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/20'
  if (cat === 'Legal')        return 'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/20'
  if (cat === 'Security')     return 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20'
  if (cat === 'Meeting')      return 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20'
  if (cat === 'Partnership')  return 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/20'
  if (cat === 'Shipping')     return 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
  if (cat === 'Subscription') return 'bg-slate-100 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-500/20'
  return 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/10'
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

// ─── Compact Triage Card (grid view) ─────────────────────────────────────────

interface CardProps {
  t:          TriageEmail
  isDone:     boolean
  actionLabel: string | undefined
  isChecked:  boolean
  isSelected: boolean
  onSelect:   (id: string) => void
  onToggle:   (id: string) => void
}

function TriageCard({ t, isDone, actionLabel, isChecked, isSelected, onSelect, onToggle }: CardProps) {
  const { email } = t
  const entities = email.ai_entities

  return (
    <div
      onClick={e => { e.stopPropagation(); onSelect(isSelected ? '' : email.id) }}
      className={cn(
        'flex flex-col bg-white dark:bg-[#232323] rounded-xl border transition-all cursor-pointer hover:shadow-sm',
        isSelected
          ? 'ring-2 ring-blue-400/40 dark:ring-blue-400/30 border-blue-200 dark:border-blue-500/30'
          : isDone
            ? 'border-green-200 dark:border-green-500/20'
            : email.ai_priority === 'high'
              ? 'border-[#61c2ad]/50 dark:border-[#61c2ad]/35'
              : email.ai_priority === 'medium'
                ? 'border-amber-200 dark:border-amber-500/25'
                : email.ai_priority === 'low'
                  ? 'border-transparent'
                  : 'border-gray-200 dark:border-white/8',
      )}
    >
      {/* Top row: badges + time + checkbox */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {email.ai_priority ? (
            <span className={cn('flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border', PRIORITY_BADGE[email.ai_priority])}>
              <span className={cn('w-1.5 h-1.5 rounded-full', PRIORITY_DOT[email.ai_priority])} />
              {email.ai_priority}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/5 text-gray-500 border border-gray-200 dark:border-white/8 font-medium">
              <Brain className="w-2.5 h-2.5" /> Pending
            </span>
          )}
          {email.ai_category && (
            <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold border', categoryClass(email.ai_category))}>
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
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onToggle(email.id) }}
            title={isChecked ? 'Deselect' : 'Select'}
          >
            <span className={cn(
              'w-4 h-4 rounded border flex items-center justify-center transition-colors',
              isChecked ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-white/20 hover:border-blue-400',
            )}>
              {isChecked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
            </span>
          </button>
        </div>
      </div>

      {/* Sender + subject + summary preview */}
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
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5 leading-snug line-clamp-2">{email.subject}</p>
        {email.ai_summary && (
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 line-clamp-1 italic">{email.ai_summary}</p>
        )}
      </div>
    </div>
  )
}

// ─── Full-width Detail Card ────────────────────────────────────────────────────

interface DetailCardProps {
  t:             TriageEmail
  allEmails:     TriageEmail[]
  actioned:      Map<string, string>
  onAction:      (t: TriageEmail, mode: 'lead' | 'ticket' | 'deal_note') => void
  onDismiss:     (id: string) => void
  onDelete:      (id: string) => void
  onClose:       () => void
  onAnalyze:     (id: string) => void
  isDeleting:    boolean
  isAnalyzing:   boolean
}

function DetailCard({ t, allEmails, actioned, onAction, onDismiss, onDelete, onClose, onAnalyze, isDeleting, isAnalyzing }: DetailCardProps) {
  const { email, recommendation, meeting } = t
  const entities  = email.ai_entities
  const drafts    = email.ai_reply_drafts ?? []

  const [activeDraft,    setActiveDraft]    = useState(0)
  // Lazy init so the textarea and Send button are ready immediately on first render
  const [composeBody,    setComposeBody]    = useState(() => drafts[0]?.body ?? '')
  const [sent,           setSent]           = useState(false)
  const [noteText,       setNoteText]       = useState('')
  const [noteSaved,      setNoteSaved]      = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [isLoggingNote,  setIsLoggingNote]  = useState(false)
  const [sendError,      setSendError]      = useState<string | null>(null)
  const isDone    = actioned.has(email.id)
  const actionLabel = actioned.get(email.id)

  // Reset compose state when switching to a different email
  useEffect(() => {
    setSent(false)
    setNoteText('')
    setNoteSaved(false)
    setSendError(null)
    setActiveDraft(0)
    setComposeBody(drafts[0]?.body ?? '')
  }, [email.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync textarea when tone tab changes (only before sending)
  useEffect(() => {
    if (!sent) setComposeBody(drafts[activeDraft]?.body ?? '')
  }, [activeDraft]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSendReply() {
    if (!composeBody.trim()) return
    setIsSendingEmail(true)
    setSendError(null)
    const subjectPrefix = /^Re:/i.test(email.subject) ? '' : 'Re: '
    const result = await sendEmail({
      to:             email.from_address,
      subject:        subjectPrefix + email.subject,
      body:           composeBody,
      replyToEmailId: email.id,
    })
    setIsSendingEmail(false)
    if (result.ok) {
      setSent(true)
      setNoteText(composeBody.slice(0, 300))
      // No deal to log against → auto-dismiss after 2s
      if (!t.matchedDeal) {
        setTimeout(() => { onDismiss(email.id); onClose() }, 2000)
      }
    } else {
      setSendError(result.error ?? 'Send failed')
    }
  }

  async function handleLogNote() {
    const dealId = t.matchedDeal?.id
    if (!dealId || !noteText.trim()) return
    setIsLoggingNote(true)
    await triageAddDealNote(dealId, noteText)
    setIsLoggingNote(false)
    setNoteSaved(true)
    // Email fully actioned — remove from triage after brief confirmation
    setTimeout(() => { onDismiss(email.id); onClose() }, 1500)
  }

  // Related emails from the same sender (excluding current, newest first)
  const relatedEmails = allEmails
    .filter(te => te.email.id !== email.id && te.email.from_address.toLowerCase() === email.from_address.toLowerCase())
    .sort((a, b) => new Date(b.email.received_at).getTime() - new Date(a.email.received_at).getTime())
    .slice(0, 5)

  function handlePrimaryAction() {
    if (recommendation === 'create_lead')    onAction(t, 'lead')
    if (recommendation === 'create_ticket')  onAction(t, 'ticket')
    if (recommendation === 'update_lead')    onAction(t, 'deal_note')
    if (recommendation === 'reopen_account') onAction(t, 'lead')
  }

  function formatMeetingTime(iso: string | null) {
    if (!iso) return null
    const d = new Date(iso)
    return d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
  }

  return (
    <div
      className={cn(
        'bg-white dark:bg-[#232323] rounded-2xl border shadow-sm',
        email.ai_priority === 'high'
          ? 'border-blue-200 dark:border-blue-500/25'
          : email.ai_priority === 'medium'
            ? 'border-amber-200 dark:border-amber-500/25'
            : 'border-gray-200 dark:border-white/8',
      )}
    >
      {/* ── Header ── */}
      <div className="px-6 pt-5 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50 leading-tight">{email.subject}</h2>
            <div className="flex items-center gap-2 mt-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/15 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                  {(email.from_name ?? email.from_address).charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{email.from_name ?? email.from_address}</p>
                {email.from_name && <p className="text-xs text-gray-400">{email.from_address}</p>}
              </div>
              <span className="text-gray-200 dark:text-white/15 mx-0.5">·</span>
              <span className="text-xs text-gray-400">
                {new Date(email.received_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {email.ai_priority && (
              <span className={cn('text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide border flex items-center gap-1.5', PRIORITY_BADGE[email.ai_priority])}>
                <span className={cn('w-1.5 h-1.5 rounded-full', PRIORITY_DOT[email.ai_priority])} />
                {email.ai_priority}
              </span>
            )}
            {email.ai_category && (
              <span className={cn('text-[11px] px-2.5 py-0.5 rounded-full font-semibold border', categoryClass(email.ai_category))}>
                {email.ai_category}
              </span>
            )}
            <button
              onClick={e => { e.stopPropagation(); onDelete(email.id) }}
              disabled={isDeleting}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-100 dark:hover:border-red-500/20"
            >
              {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={e => { e.stopPropagation(); onClose() }}
              title="Close"
              className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-6 pb-5 pt-4 border-t dark:border-white/8 space-y-4">

        {/* Meeting details card — shown when a .ics was parsed from this email */}
        {meeting && (
          <div className="rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 px-4 py-3.5 space-y-2.5">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Meeting Invite</span>
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{meeting.title}</p>
            <div className="space-y-1.5">
              {(meeting.start_at || meeting.end_at) && (
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                  <Clock className="w-3 h-3 text-indigo-400 shrink-0" />
                  <span>
                    {formatMeetingTime(meeting.start_at)}
                    {meeting.end_at && meeting.end_at !== meeting.start_at && ` → ${formatMeetingTime(meeting.end_at)}`}
                  </span>
                </div>
              )}
              {meeting.location && (
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                  <MapPin className="w-3 h-3 text-indigo-400 shrink-0" />
                  <span className="truncate">{meeting.location}</span>
                </div>
              )}
              {meeting.organizer && (
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                  <UserPlus className="w-3 h-3 text-indigo-400 shrink-0" />
                  <span>{meeting.organizer_name ? `${meeting.organizer_name} (${meeting.organizer})` : meeting.organizer}</span>
                </div>
              )}
              {meeting.attendees.length > 0 && (
                <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
                  <Users className="w-3 h-3 text-indigo-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">
                    {meeting.attendees.slice(0, 5).join(', ')}
                    {meeting.attendees.length > 5 ? ` +${meeting.attendees.length - 5} more` : ''}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI user prompt callout */}
        {email.ai_user_prompt && (
          <div className="rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 px-4 py-3 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-sm text-gray-900 dark:text-gray-100 font-medium leading-relaxed">{email.ai_user_prompt}</p>
          </div>
        )}

        {/* AI Summary */}
        {!email.ai_analyzed_at ? (
          /* Never analyzed — show clickable analyse button */
          <div className="rounded-xl bg-gray-100 dark:bg-white/8 border border-dashed border-gray-300 dark:border-white/20 px-4 py-3 flex items-center justify-center gap-2">
            <Brain className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">AI analysis pending —</p>
            <button
              onClick={() => onAnalyze(email.id)}
              disabled={isAnalyzing}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline disabled:opacity-50 flex items-center gap-1 transition-colors"
            >
              {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              {isAnalyzing ? 'Analysing…' : 'Analyse this email'}
            </button>
          </div>
        ) : email.ai_summary ? (
          /* Analyzed with a summary (High/Medium) */
          <div className="rounded-xl bg-gray-50 dark:bg-white/3 border border-gray-200 dark:border-white/10 px-4 py-3.5">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">AI Summary</span>
            </div>
            <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed">{email.ai_summary}</p>
            {email.ai_reason && <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">{email.ai_reason}</p>}
          </div>
        ) : (
          /* Analyzed but low priority — no summary generated */
          <div className="rounded-xl bg-gray-50 dark:bg-white/3 border border-gray-200 dark:border-white/10 px-4 py-3 flex items-start gap-2.5">
            <Brain className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">AI Analysis Complete</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                {email.ai_reason ?? 'Low priority — no summary generated for this email.'}
              </p>
            </div>
          </div>
        )}

        {/* AI Insights */}
        {Array.isArray(email.ai_insights) && (email.ai_insights as string[]).length > 0 && (
          <ul className="space-y-1.5 pl-1">
            {(email.ai_insights as string[]).map((insight, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 mt-1.5" />
                {insight}
              </li>
            ))}
          </ul>
        )}

        {/* Intent + urgency chips */}
        {((entities?.intent_signals ?? []).length > 0 || (entities?.urgency_signals ?? []).length > 0) && (
          <div className="flex flex-wrap gap-2">
            {(entities?.intent_signals ?? []).map((s, i) => (
              <CopyChip key={i} value={s} className="text-[11px] px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 font-medium">
                {s}
              </CopyChip>
            ))}
            {(entities?.urgency_signals ?? []).map((s, i) => (
              <CopyChip key={i} value={s} className="text-[11px] px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-500/20 font-medium">
                ⚡ {s}
              </CopyChip>
            ))}
          </div>
        )}

        {/* Entity chips */}
        {entities && (entities.name || entities.phone || entities.website || entities.product_interest) && (
          <div className="flex flex-wrap gap-2">
            {entities.name && (
              <CopyChip value={entities.name} className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-white/5 border dark:border-white/8 text-gray-700 dark:text-gray-300">
                <UserPlus className="w-3 h-3 text-gray-400 shrink-0" /> {entities.name}
              </CopyChip>
            )}
            {entities.phone && (
              <CopyChip value={entities.phone} className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-white/5 border dark:border-white/8 text-gray-700 dark:text-gray-300">
                <Phone className="w-3 h-3 text-gray-400 shrink-0" /> {entities.phone}
              </CopyChip>
            )}
            {entities.website && (
              <a
                href={entities.website.startsWith('http') ? entities.website : `https://${entities.website}`}
                target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-white/5 border dark:border-white/8 text-gray-700 dark:text-gray-300 hover:text-blue-600 transition-colors"
              >
                <Globe className="w-3 h-3 shrink-0" /> {entities.website}
              </a>
            )}
            {entities.product_interest && (
              <CopyChip value={entities.product_interest} className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 text-blue-700 dark:text-blue-400">
                <Tag className="w-3 h-3 shrink-0" /> {entities.product_interest}
              </CopyChip>
            )}
          </div>
        )}

        {/* Reply drafts */}
        {drafts.length > 0 && (
          <div className="rounded-xl border dark:border-white/8 overflow-hidden">
            {/* Tone tabs */}
            <div className="flex items-center gap-1 px-4 py-2.5 border-b dark:border-white/8 bg-gray-50 dark:bg-white/3">
              <Mail className="w-3.5 h-3.5 text-gray-400 mr-1.5" />
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mr-2">Reply</span>
              {drafts.map((d, i) => (
                <button key={i}
                  onClick={() => { setActiveDraft(i); if (!sent) setComposeBody(d.body) }}
                  className={cn('text-[11px] px-2.5 py-1 rounded-lg font-medium transition-colors',
                    activeDraft === i ? 'bg-blue-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/8')}>
                  {d.tone}
                </button>
              ))}
            </div>

            {!sent ? (
              <>
                {/* Editable compose area */}
                <div className="px-4 py-3 bg-white dark:bg-[#232323]">
                  <textarea
                    value={composeBody}
                    onChange={e => setComposeBody(e.target.value)}
                    rows={6}
                    className="w-full text-sm text-gray-800 dark:text-gray-200 leading-relaxed bg-transparent resize-none outline-none"
                  />
                </div>
                {sendError && (
                  <div className="px-4 py-2 bg-red-50 dark:bg-red-500/10 border-t border-red-200 dark:border-red-500/20 text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-2">
                    <X className="w-3 h-3 shrink-0" /> {sendError}
                  </div>
                )}
                <div className="px-4 py-2.5 border-t dark:border-white/8 bg-gray-50 dark:bg-white/3 flex items-center justify-between gap-2">
                  <div className="ml-auto">
                    <button
                      onClick={handleSendReply}
                      disabled={isSendingEmail || !composeBody.trim()}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-[11px] font-semibold rounded-lg transition-colors"
                    >
                      {isSendingEmail
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <ArrowRight className="w-3 h-3" />}
                      Send
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* Post-send: confirmation + log note */
              <div className="bg-white dark:bg-[#232323]">
                <div className="px-4 py-2.5 flex items-center gap-2 border-b dark:border-white/8 bg-green-50 dark:bg-green-500/10">
                  <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                  <span className="text-[11px] font-medium text-green-700 dark:text-green-400">Reply sent</span>
                </div>
                {t.matchedDeal && !noteSaved && (
                  <div className="px-4 py-3 space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Log follow-up note</p>
                    <textarea
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      rows={3}
                      placeholder="Add a note about this reply..."
                      className="w-full text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-lg px-3 py-2 resize-none outline-none focus:ring-1 focus:ring-brand-500"
                    />
                    <button
                      onClick={handleLogNote}
                      disabled={isLoggingNote || !noteText.trim()}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-[11px] font-semibold rounded-lg transition-colors"
                    >
                      {isLoggingNote ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                      Log note
                    </button>
                  </div>
                )}
                {noteSaved && (
                  <div className="px-4 py-2.5 flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-brand-500" />
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">Note logged in Follow ups</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          {isDone ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl">
              <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-700 dark:text-green-400">{actionLabel}</span>
            </div>
          ) : (
            <>
              {recommendation !== 'ignore' && (
                <button
                  onClick={handlePrimaryAction}
                  className={cn('flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors', recColor(recommendation))}
                >
                  {recIcon(recommendation)}
                  {recLabel(recommendation, t)}
                </button>
              )}
              <button
                onClick={() => onDismiss(email.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/8 transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Ignore
              </button>
            </>
          )}
        </div>

        {/* Email History — previous emails from this sender */}
        {relatedEmails.length > 0 && (
          <div className="pt-2 border-t dark:border-white/8">
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Email history ({relatedEmails.length})
            </p>
            <div className="space-y-1.5">
              {relatedEmails.map(te => (
                <div key={te.email.id} className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border dark:border-white/6">
                  <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                    {te.email.ai_priority && (
                      <span className={cn('w-2 h-2 rounded-full', PRIORITY_DOT[te.email.ai_priority])} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{te.email.subject}</p>
                      <span className="text-[10px] text-gray-400 shrink-0 tabular-nums">
                        {formatDate(te.email.received_at)}
                      </span>
                    </div>
                    {te.email.ai_summary && (
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">{te.email.ai_summary}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function EmailTriageDashboard({ triageEmails }: Props) {
  const router = useRouter()
  const [dismissed,       setDismissed]       = useState<Set<string>>(new Set())
  const [actioned,        setActioned]        = useState<Map<string, string>>(new Map())
  const [modalMode,       setModalMode]       = useState<'lead' | 'ticket' | 'deal_note' | null>(null)
  const [modalEmail,      setModalEmail]      = useState<TriageEmail | null>(null)
  const [selectedEmailId, setSelectedEmailId] = useState<string>('')
  const [isPending,         startTransition]          = useTransition()
  const [isSyncing,         startSyncTransition]      = useTransition()
  const [isDeleting,        startDeleteTransition]    = useTransition()
  const [isReanalyzing,     startReanalyzeTransition] = useTransition()
  const [syncMsg,         setSyncMsg]         = useState<string | null>(null)
  const [analyzeMsg,      setAnalyzeMsg]      = useState<string | null>(null)
  const [selectedIds,     setSelectedIds]     = useState<Set<string>>(new Set())

  // Ref so the interval callback can always see the latest pending count
  const pendingCountRef     = useRef(0)
  const isAutoAnalyzingRef  = useRef(false)
  // Guards against double-refresh when manual sync triggers auto-analyze
  const isSyncingRef        = useRef(false)
  // Incremented after each sync/reanalyze to force-remount scroll containers
  const [refreshKey, setRefreshKey] = useState(0)
  // Ref on the detail card — used for document-level click-outside detection
  const detailRef = useRef<HTMLDivElement>(null)

  // Scroll <main> to top after every refresh so stale content never peeks below
  useEffect(() => {
    const main = document.querySelector('main')
    if (main) main.scrollTop = 0
  }, [refreshKey])

  // Auto-analyze: runs when there are unanalyzed emails, no manual run needed
  const runAutoAnalyze = useCallback(async () => {
    if (isAutoAnalyzingRef.current || isSyncingRef.current) return
    isAutoAnalyzingRef.current = true
    try {
      await reanalyzeEmails(50, undefined)
      setRefreshKey(k => k + 1)
      router.refresh()
    } finally {
      isAutoAnalyzingRef.current = false
    }
  }, [router])

  // Auto-sync + auto-analyze every 60 s — syncs IMAP, then analyzes pending, single refresh
  useEffect(() => {
    const id = setInterval(async () => {
      if (isSyncingRef.current || isAutoAnalyzingRef.current) return
      isSyncingRef.current = true
      try {
        const syncRes = await syncEmails()
        if (!syncRes.error && syncRes.synced > 0) {
          setSyncMsg(`+${syncRes.synced} new`)
        }
        // Always re-analyze after sync (catches new + existing pending)
        await reanalyzeEmails(50, undefined)
        setRefreshKey(k => k + 1)
        router.refresh()
      } finally {
        isSyncingRef.current = false
      }
    }, 60_000)
    return () => clearInterval(id)
  }, [router])

  // Click-outside to close the detail card
  useEffect(() => {
    if (!selectedEmailId) return
    function handleMouseDown(e: MouseEvent) {
      if (detailRef.current && !detailRef.current.contains(e.target as Node)) {
        setSelectedEmailId('')
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [selectedEmailId])

  function handleSync() {
    setSyncMsg(null)
    isSyncingRef.current = true
    startSyncTransition(async () => {
      const res = await syncEmails()
      if (res.error) { setSyncMsg(`Error: ${res.error}`); isSyncingRef.current = false; return }
      setSyncMsg(res.synced > 0 ? `+${res.synced} new` : 'Up to date')
      setRefreshKey(k => k + 1)
      router.refresh()
      // Allow auto-analyze to fire again after the refresh settles
      setTimeout(() => { isSyncingRef.current = false }, 3000)
    })
  }

  function handleReanalyze() {
    setAnalyzeMsg(null)
    const targetIds = selectedIds.size > 0
      ? Array.from(selectedIds)
      : unanalyzedCount === 0 && visible.length > 0
        ? visible.map(t => t.email.id)
        : undefined
    startReanalyzeTransition(async () => {
      const res = await reanalyzeEmails(50, targetIds)
      if (res.error) { setAnalyzeMsg(`Error: ${res.error}`); return }
      setAnalyzeMsg(res.reanalyzed > 0 ? `Analysed ${res.reanalyzed}` : 'All analysed')
      setRefreshKey(k => k + 1)
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
      if (ids.includes(selectedEmailId)) setSelectedEmailId('')
      setRefreshKey(k => k + 1)
      router.refresh()
    })
  }

  function handleDeleteOne(emailId: string) {
    startDeleteTransition(async () => {
      await deleteTriageEmails([emailId])
      setDismissed(prev => new Set([...prev, emailId]))
      if (emailId === selectedEmailId) setSelectedEmailId('')
      setRefreshKey(k => k + 1)
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
    if (emailId === selectedEmailId) setSelectedEmailId('')
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

      if (result?.error) {
        setModalError(result.error)
      } else {
        // Pair with refreshKey so scroll containers remount cleanly
        setRefreshKey(k => k + 1)
        router.refresh()
      }
    })
  }

  const visible         = triageEmails.filter(t => !dismissed.has(t.email.id))
  const highEmails      = visible.filter(t => t.email.ai_priority === 'high')
  const medEmails       = visible.filter(t => t.email.ai_priority === 'medium')
  const lowEmails       = visible.filter(t => t.email.ai_priority === 'low')
  const pendingEmails   = visible.filter(t => !t.email.ai_analyzed_at)
  const highCount       = highEmails.length
  const medCount        = medEmails.length
  const unanalyzedCount = pendingEmails.length

  // Keep ref in sync and auto-trigger analysis when new pending emails appear
  useEffect(() => {
    const prev = pendingCountRef.current
    pendingCountRef.current = unanalyzedCount
    if (unanalyzedCount > 0 && unanalyzedCount !== prev) {
      void runAutoAnalyze()
    }
  }, [unanalyzedCount, runAutoAnalyze])

  const sortedVisible       = [...visible].sort(sortByPriority)
  const selectedTriageEmail = selectedEmailId ? visible.find(t => t.email.id === selectedEmailId) ?? null : null

  // Emails that appear in the grid below the detail card (exclude the selected one)
  const gridHigh    = highEmails.filter(t => t.email.id !== selectedEmailId)
  const gridMed     = medEmails.filter(t => t.email.id !== selectedEmailId)
  const gridLow     = lowEmails.filter(t => t.email.id !== selectedEmailId)
  const gridPending = pendingEmails.filter(t => t.email.id !== selectedEmailId)

  function handleAnalyzeOne(emailId: string) {
    setAnalyzeMsg(null)
    startReanalyzeTransition(async () => {
      const res = await reanalyzeEmails(1, [emailId])
      if (res.error) {
        setAnalyzeMsg(`Error: ${res.error}`)
      } else if (res.reanalyzed === 0) {
        setAnalyzeMsg('Analysis returned no results — check API logs')
      }
      setRefreshKey(k => k + 1)
      router.refresh()
    })
  }

  const detailCardProps = {
    allEmails:   visible,
    actioned,
    onAction:    openModal,
    onDismiss:   dismiss,
    onDelete:    handleDeleteOne,
    onClose:     () => setSelectedEmailId(''),
    onAnalyze:   handleAnalyzeOne,
    isDeleting,
    isAnalyzing: isReanalyzing,
  }

  return (
    <div className="flex flex-1 overflow-hidden">

      {/* ─── LEFT: Priority-sorted email list ──────────────────────────────── */}
      <aside className="w-[260px] shrink-0 flex flex-col border-r dark:border-white/8 bg-gray-50/80 dark:bg-[#161616] overflow-hidden">

        {/* Header */}
        <div className="px-4 py-3 border-b dark:border-white/8 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-500 shrink-0" />
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
                  {visible.every(t => selectedIds.has(t.email.id)) ? 'Deselect' : 'All'}
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
              <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-500/75 dark:text-amber-400/75 font-semibold border border-amber-200/70 dark:border-amber-500/18">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />{medCount} Medium
              </span>
            )}
            {visible.length > 0 && (
              <button
                onClick={handleReanalyze}
                disabled={isReanalyzing || isSyncing}
                className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold border border-blue-200 dark:border-blue-500/20 hover:bg-blue-100 dark:hover:bg-blue-500/15 disabled:opacity-50 transition-colors"
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

        {/* Priority-sorted list */}
        <div key={refreshKey} className="flex-1 overflow-y-auto">
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
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
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
                  onClick={() => setSelectedEmailId(isActive ? '' : t.email.id)}
                  className={cn(
                    'flex items-stretch border-l-[3px] transition-colors cursor-pointer',
                    isActive
                      ? priority === 'high'
                        ? 'border-l-[#61c2ad] bg-[#61c2ad]/8 dark:bg-[#61c2ad]/10'
                        : priority === 'medium'
                          ? 'border-l-amber-400 bg-amber-50 dark:bg-amber-500/8'
                          : priority === 'low'
                            ? 'border-l-gray-400 bg-gray-100 dark:bg-white/5'
                            : 'border-l-blue-400 bg-blue-50 dark:bg-blue-500/8'
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
                        isChecked ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-white/20 hover:border-blue-400',
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

      {/* ─── CENTER: Detail view + card grid ──────────────────────────────── */}
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
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
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
            {/* ── Select All + Delete toolbar ── */}
            <div className="flex items-center gap-3 px-5 py-2 border-b dark:border-white/8 bg-white dark:bg-[#1a1a1a] shrink-0">
              <button
                onClick={() => {
                  const allSel = visible.every(t => selectedIds.has(t.email.id))
                  setSelectedIds(allSel ? new Set() : new Set(visible.map(t => t.email.id)))
                }}
                className="flex items-center gap-2 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                <span className={cn(
                  'w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors',
                  visible.every(t => selectedIds.has(t.email.id)) && visible.length > 0
                    ? 'bg-blue-600 border-blue-600'
                    : 'border-gray-300 dark:border-white/20',
                )}>
                  {visible.every(t => selectedIds.has(t.email.id)) && visible.length > 0 && (
                    <Check className="w-2 h-2 text-white" strokeWidth={3} />
                  )}
                </span>
                {selectedIds.size > 0
                  ? `${selectedIds.size} selected`
                  : `Select all (${visible.length})`}
              </button>

              <button
                onClick={handleDeleteSelected}
                disabled={selectedIds.size === 0 || isDeleting}
                title={selectedIds.size > 0 ? `Delete ${selectedIds.size} selected` : 'Select emails first'}
                className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:text-red-600 hover:border-red-200 dark:hover:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-gray-200 dark:disabled:hover:border-white/10 disabled:hover:text-gray-500 transition-colors"
              >
                {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                Delete
              </button>
            </div>

            <div key={refreshKey} className="flex-1 overflow-y-auto p-5 space-y-7">

              {/* ── Full-width Detail Card (shown when email is selected) ── */}
              {selectedTriageEmail && (
                <div ref={detailRef}>
                  <DetailCard t={selectedTriageEmail} {...detailCardProps} />
                </div>
              )}

              {/* ── Divider between detail and remaining grid ── */}
              {selectedTriageEmail && (gridHigh.length + gridMed.length + gridLow.length + gridPending.length) > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-200 dark:bg-white/8" />
                  <span className="text-[11px] text-gray-400 font-medium whitespace-nowrap">Other emails</span>
                  <div className="flex-1 h-px bg-gray-200 dark:bg-white/8" />
                </div>
              )}

              {/* ── HIGH ── */}
              {gridHigh.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full bg-[#61c2ad] shrink-0" />
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#3a9e8a] dark:text-[#61c2ad]">
                      High Priority · {gridHigh.length}
                    </h3>
                    <div className="flex-1 h-px bg-[#61c2ad]/30 dark:bg-[#61c2ad]/20" />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                    {gridHigh.map(t => (
                      <TriageCard key={t.email.id} t={t}
                        isDone={actioned.has(t.email.id)} actionLabel={actioned.get(t.email.id)}
                        isChecked={selectedIds.has(t.email.id)} isSelected={selectedEmailId === t.email.id}
                        onSelect={id => setSelectedEmailId(selectedEmailId === id ? '' : id)}
                        onToggle={toggleSelect}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* ── MEDIUM ── */}
              {gridMed.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-amber-500/75 dark:text-amber-400/75">
                      Medium · {gridMed.length}
                    </h3>
                    <div className="flex-1 h-px bg-amber-200/60 dark:bg-amber-500/15" />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                    {gridMed.map(t => (
                      <TriageCard key={t.email.id} t={t}
                        isDone={actioned.has(t.email.id)} actionLabel={actioned.get(t.email.id)}
                        isChecked={selectedIds.has(t.email.id)} isSelected={selectedEmailId === t.email.id}
                        onSelect={id => setSelectedEmailId(selectedEmailId === id ? '' : id)}
                        onToggle={toggleSelect}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* ── LOW ── */}
              {gridLow.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-600 shrink-0" />
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      Low · {gridLow.length}
                    </h3>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-white/8" />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                    {gridLow.map(t => (
                      <TriageCard key={t.email.id} t={t}
                        isDone={actioned.has(t.email.id)} actionLabel={actioned.get(t.email.id)}
                        isChecked={selectedIds.has(t.email.id)} isSelected={selectedEmailId === t.email.id}
                        onSelect={id => setSelectedEmailId(selectedEmailId === id ? '' : id)}
                        onToggle={toggleSelect}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* ── PENDING ── */}
              {gridPending.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      onClick={handleReanalyze}
                      disabled={isReanalyzing || isSyncing}
                      className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-50 transition-colors group"
                    >
                      {isReanalyzing
                        ? <Loader2 className="w-3 h-3 shrink-0 animate-spin" />
                        : <Brain className="w-3 h-3 shrink-0 group-hover:scale-110 transition-transform" />}
                      {isReanalyzing ? 'Analysing…' : `Pending Analysis · ${gridPending.length}`}
                    </button>
                    <div className="flex-1 h-px bg-blue-200 dark:bg-blue-500/20" />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                    {gridPending.map(t => (
                      <TriageCard key={t.email.id} t={t}
                        isDone={actioned.has(t.email.id)} actionLabel={actioned.get(t.email.id)}
                        isChecked={selectedIds.has(t.email.id)} isSelected={selectedEmailId === t.email.id}
                        onSelect={id => setSelectedEmailId(selectedEmailId === id ? '' : id)}
                        onToggle={toggleSelect}
                      />
                    ))}
                  </div>
                </section>
              )}

            </div>
          </>
        )}

        {/* ── Modal slides up from bottom ── */}
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
                    className="w-full text-sm px-3 py-2 rounded-lg border dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 block mb-1">Email</label>
                  <input value={mEmail} onChange={e => setMEmail(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-lg border dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 block mb-1">Company</label>
                  <input value={mCompany} onChange={e => setMCompany(e.target.value)} placeholder="Optional"
                    className="w-full text-sm px-3 py-2 rounded-lg border dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 block mb-1">Deal Title *</label>
                  <input value={mDealTitle} onChange={e => setMDealTitle(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-lg border dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="text-[11px] font-semibold text-gray-500 block mb-1">Notes</label>
                  <textarea value={mNotes} onChange={e => setMNotes(e.target.value)} rows={2}
                    className="w-full text-sm px-3 py-2 rounded-lg border dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
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
                      className="w-full text-sm px-3 py-2 rounded-lg border dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500" />
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
                    className="w-full text-sm px-3 py-2 rounded-lg border dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 block mb-1">Description</label>
                  <textarea value={mNotes} onChange={e => setMNotes(e.target.value)} rows={2}
                    className="w-full text-sm px-3 py-2 rounded-lg border dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
                </div>
              </div>
            )}

            {/* Deal note form */}
            {modalMode === 'deal_note' && (
              <div className="space-y-3">
                <div className="px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 text-sm text-blue-700 dark:text-blue-400 font-medium">
                  Deal: {mDealTitle}
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 block mb-1">Note</label>
                  <textarea value={mNote} onChange={e => setMNote(e.target.value)} rows={3}
                    className="w-full text-sm px-3 py-2 rounded-lg border dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
                </div>
              </div>
            )}

            {modalError && <p className="text-xs text-red-500 mt-2">{modalError}</p>}

            <div className="flex items-center gap-2 mt-4">
              <button onClick={handleModalSubmit} disabled={isPending}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60">
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
