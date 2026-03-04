'use client'

import React, { useState, useTransition, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Bot, Brain, Check, X, ChevronRight, Loader2,
  UserPlus, Ticket, Sparkles, Plus, Phone, Tag, Pencil,
} from 'lucide-react'
import { triageCreateLead, triageCreateTicket } from '@/app/actions/sage-triage'
import { analyzeConversations, renameConversation } from '@/app/actions/bot-conversations'
import type { Conversation } from '@/lib/types'
import { timeAgo, PLATFORM_META, cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TriageConversation {
  conversation: Conversation
  botName:      string
  botType:      string
}

interface Props {
  triageConversations: TriageConversation[]
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

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }

function sortByPriority(a: TriageConversation, b: TriageConversation): number {
  const pa = a.conversation.ai_priority ? (PRIORITY_ORDER[a.conversation.ai_priority] ?? 3) : 3
  const pb = b.conversation.ai_priority ? (PRIORITY_ORDER[b.conversation.ai_priority] ?? 3) : 3
  if (pa !== pb) return pa - pb
  const ta = a.conversation.last_activity_at ? new Date(a.conversation.last_activity_at).getTime() : 0
  const tb = b.conversation.last_activity_at ? new Date(b.conversation.last_activity_at).getTime() : 0
  return tb - ta
}

// ─── Triage Card (grid view) ───────────────────────────────────────────────

interface CardProps {
  tc:          TriageConversation
  isDone:      boolean
  actionLabel: string | undefined
  isSelected:  boolean
  onSelect:    (id: string) => void
  onRename:    (id: string, title: string) => void
}

function ConvCard({ tc, isDone, actionLabel, isSelected, onSelect, onRename }: CardProps) {
  const { conversation, botName } = tc
  const platform = conversation.platform
  const meta     = platform ? PLATFORM_META[platform] : null

  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(conversation.title ?? '')
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation()
    setEditValue(conversation.title ?? '')
    setIsEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  function commitEdit() {
    setIsEditing(false)
    const trimmed = editValue.trim()
    if (trimmed !== (conversation.title ?? '')) onRename(conversation.id, trimmed)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter')  { e.preventDefault(); commitEdit() }
    if (e.key === 'Escape') { setIsEditing(false); setEditValue(conversation.title ?? '') }
  }

  return (
    <div
      onClick={e => { if (!isEditing) { e.stopPropagation(); onSelect(isSelected ? '' : conversation.id) } }}
      className={cn(
        'flex flex-col bg-white dark:bg-[#232323] rounded-xl border transition-all cursor-pointer hover:shadow-sm',
        isSelected
          ? 'ring-2 ring-blue-400/40 dark:ring-blue-400/30 border-blue-200 dark:border-blue-500/30'
          : isDone
            ? 'border-green-200 dark:border-green-500/20'
            : conversation.ai_priority === 'high'
              ? 'border-[#61c2ad]/50 dark:border-[#61c2ad]/35'
              : conversation.ai_priority === 'medium'
                ? 'border-amber-300/70 dark:border-amber-500/30'
                : 'border-gray-200 dark:border-white/8',
      )}
    >
      {/* Top row: badges + time */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {conversation.ai_priority ? (
            <span className={cn('flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border', PRIORITY_BADGE[conversation.ai_priority])}>
              <span className={cn('w-1.5 h-1.5 rounded-full', PRIORITY_DOT[conversation.ai_priority])} />
              {conversation.ai_priority}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/5 text-gray-500 border border-gray-200 dark:border-white/8 font-medium">
              <Brain className="w-2.5 h-2.5" /> Pending
            </span>
          )}
          {/* Bot badge */}
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 font-medium truncate max-w-[90px]">
            {botName}
          </span>
          {isDone && (
            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-500/20 font-medium">
              <Check className="w-2.5 h-2.5" /> {actionLabel}
            </span>
          )}
        </div>
        <span className="text-[10px] text-gray-400 shrink-0">
          {conversation.last_activity_at ? timeAgo(conversation.last_activity_at) : ''}
        </span>
      </div>

      {/* Title + platform + message count */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-sm',
            conversation.ai_priority === 'high'   ? 'bg-[#61c2ad]/15 dark:bg-[#61c2ad]/20'
            : conversation.ai_priority === 'medium' ? 'bg-amber-100 dark:bg-amber-500/15'
            : 'bg-gray-100 dark:bg-white/5',
          )}>
            <Bot className={cn('w-3.5 h-3.5',
              conversation.ai_priority === 'high'   ? 'text-[#61c2ad]'
              : conversation.ai_priority === 'medium' ? 'text-amber-600 dark:text-amber-400'
              : 'text-gray-400'
            )} />
          </div>
          <div className="min-w-0 flex-1">
            {isEditing ? (
              <input
                ref={inputRef}
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={handleKeyDown}
                onClick={e => e.stopPropagation()}
                className="w-full text-sm font-semibold bg-white dark:bg-[#2a2a2a] border border-blue-400 dark:border-blue-500 rounded px-1.5 py-0.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-400"
                autoFocus
              />
            ) : (
              <div className="flex items-center gap-1 group/title">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {conversation.title ?? 'Untitled conversation'}
                </p>
                <button
                  onClick={startEdit}
                  title="Rename"
                  className="shrink-0 opacity-0 group-hover/title:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
            )}
            <p className="text-[11px] text-gray-400">
              {conversation.message_count ?? 0} messages
              {meta ? ` · ${meta.label}` : ''}
            </p>
          </div>
        </div>
        {conversation.ai_summary && (
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5 line-clamp-1 italic">{conversation.ai_summary}</p>
        )}
      </div>
    </div>
  )
}

// ─── Detail Card ──────────────────────────────────────────────────────────────

interface DetailCardProps {
  tc:          TriageConversation
  actioned:    Map<string, string>
  onAction:    (tc: TriageConversation, mode: 'lead' | 'ticket') => void
  onDismiss:   (id: string) => void
  onClose:     () => void
  onAnalyze:   (id: string) => void
  onRename:    (id: string, title: string) => void
  isAnalyzing: boolean
}

function DetailCard({ tc, actioned, onAction, onDismiss, onClose, onAnalyze, onRename, isAnalyzing }: DetailCardProps) {
  const { conversation, botName } = tc
  const entities   = conversation.ai_entities
  const isDone     = actioned.has(conversation.id)
  const actionLabel = actioned.get(conversation.id)
  const action     = conversation.ai_action
  const platform   = conversation.platform
  const meta       = platform ? PLATFORM_META[platform] : null

  const [isTitleEditing, setIsTitleEditing] = useState(false)
  const [titleValue,     setTitleValue]     = useState(conversation.title ?? '')
  const titleInputRef = useRef<HTMLInputElement>(null)

  function startTitleEdit(e: React.MouseEvent) {
    e.stopPropagation()
    setTitleValue(conversation.title ?? '')
    setIsTitleEditing(true)
    setTimeout(() => titleInputRef.current?.select(), 0)
  }

  function commitTitleEdit() {
    setIsTitleEditing(false)
    const trimmed = titleValue.trim()
    if (trimmed !== (conversation.title ?? '')) onRename(conversation.id, trimmed)
  }

  function handleTitleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter')  { e.preventDefault(); commitTitleEdit() }
    if (e.key === 'Escape') { setIsTitleEditing(false); setTitleValue(conversation.title ?? '') }
  }

  return (
    <div className={cn(
      'bg-white dark:bg-[#232323] rounded-2xl border shadow-sm',
      conversation.ai_priority === 'high'
        ? 'border-blue-200 dark:border-blue-500/25'
        : conversation.ai_priority === 'medium'
          ? 'border-amber-200 dark:border-amber-500/25'
          : 'border-gray-200 dark:border-white/8',
    )}>

      {/* ── Header ── */}
      <div className="px-6 pt-5 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {isTitleEditing ? (
              <input
                ref={titleInputRef}
                value={titleValue}
                onChange={e => setTitleValue(e.target.value)}
                onBlur={commitTitleEdit}
                onKeyDown={handleTitleKeyDown}
                className="w-full text-xl font-bold bg-white dark:bg-[#2a2a2a] border border-blue-400 dark:border-blue-500 rounded-lg px-2 py-1 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-400 leading-tight"
                autoFocus
              />
            ) : (
              <div className="flex items-center gap-2 group/dtitle">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50 leading-tight">
                  {conversation.title ?? 'Untitled conversation'}
                </h2>
                <button
                  onClick={startTitleEdit}
                  title="Rename"
                  className="shrink-0 opacity-0 group-hover/dtitle:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mt-0.5"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              {/* Bot badge */}
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-xs font-semibold text-blue-700 dark:text-blue-400">
                <Bot className="w-3 h-3" /> {botName}
              </span>
              {/* Platform badge */}
              {meta && (
                <span className={cn('px-2.5 py-1 rounded-lg text-xs font-medium border border-transparent', meta.color)}>
                  {meta.label}
                </span>
              )}
              <span className="text-xs text-gray-400">
                {conversation.message_count ?? 0} messages ·{' '}
                {conversation.last_activity_at ? timeAgo(conversation.last_activity_at) : ''}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {conversation.ai_priority && (
              <span className={cn('text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide border flex items-center gap-1.5', PRIORITY_BADGE[conversation.ai_priority])}>
                <span className={cn('w-1.5 h-1.5 rounded-full', PRIORITY_DOT[conversation.ai_priority])} />
                {conversation.ai_priority}
              </span>
            )}
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

        {/* AI Summary / pending / analyzed-no-summary */}
        {!conversation.ai_analyzed_at ? (
          <div className="rounded-xl bg-gray-100 dark:bg-white/8 border border-dashed border-gray-300 dark:border-white/20 px-4 py-3 flex items-center justify-center gap-2">
            <Brain className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">AI analysis pending —</p>
            <button
              onClick={() => onAnalyze(conversation.id)}
              disabled={isAnalyzing}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline disabled:opacity-50 flex items-center gap-1 transition-colors"
            >
              {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              {isAnalyzing ? 'Analysing…' : 'Analyse this conversation'}
            </button>
          </div>
        ) : conversation.ai_summary ? (
          <div className="rounded-xl bg-gray-50 dark:bg-white/3 border border-gray-200 dark:border-white/10 px-4 py-3.5">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">AI Summary</span>
            </div>
            <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed">{conversation.ai_summary}</p>
          </div>
        ) : (
          <div className="rounded-xl bg-gray-50 dark:bg-white/3 border border-gray-200 dark:border-white/10 px-4 py-3 flex items-start gap-2.5">
            <Brain className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">AI Analysis Complete</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">Low priority — no summary generated for this conversation.</p>
            </div>
          </div>
        )}

        {/* AI Insights */}
        {Array.isArray(conversation.ai_insights) && (conversation.ai_insights as string[]).length > 0 && (
          <ul className="space-y-1.5 pl-1">
            {(conversation.ai_insights as string[]).map((insight, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 mt-1.5" />
                {insight}
              </li>
            ))}
          </ul>
        )}

        {/* Entity chips */}
        {entities && (entities.name || entities.email || entities.phone || entities.product_interest) && (
          <div className="flex flex-wrap gap-2">
            {entities.name && (
              <span className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-white/5 border dark:border-white/8 text-gray-700 dark:text-gray-300">
                <UserPlus className="w-3 h-3 text-gray-400 shrink-0" /> {entities.name}
              </span>
            )}
            {entities.email && (
              <span className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-white/5 border dark:border-white/8 text-gray-700 dark:text-gray-300">
                @ {entities.email}
              </span>
            )}
            {entities.phone && (
              <span className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-white/5 border dark:border-white/8 text-gray-700 dark:text-gray-300">
                <Phone className="w-3 h-3 text-gray-400 shrink-0" /> {entities.phone}
              </span>
            )}
            {entities.product_interest && (
              <span className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 text-blue-700 dark:text-blue-400">
                <Tag className="w-3 h-3 shrink-0" /> {entities.product_interest}
              </span>
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
              {action === 'create_lead' && (
                <button
                  onClick={() => onAction(tc, 'lead')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Create Lead
                </button>
              )}
              {action === 'create_ticket' && (
                <button
                  onClick={() => onAction(tc, 'ticket')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-sky-500 hover:bg-sky-600 text-white transition-colors"
                >
                  <Ticket className="w-3.5 h-3.5" /> Create Ticket
                </button>
              )}
              <button
                onClick={() => onDismiss(conversation.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/8 transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Ignore
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function BotTriageDashboard({ triageConversations }: Props) {
  const router = useRouter()
  const [dismissed,        setDismissed]        = useState<Set<string>>(new Set())
  const [actioned,         setActioned]         = useState<Map<string, string>>(new Map())
  const [modalMode,        setModalMode]        = useState<'lead' | 'ticket' | null>(null)
  const [modalTc,          setModalTc]          = useState<TriageConversation | null>(null)
  const [selectedId,       setSelectedId]       = useState<string>('')
  const [isPending,          startTransition]          = useTransition()
  const [isAnalyzing,        startAnalyzeTransition]   = useTransition()
  const [analyzeMsg,       setAnalyzeMsg]       = useState<string | null>(null)

  const pendingCountRef     = useRef(0)
  const isAutoAnalyzingRef  = useRef(false)
  const detailRef           = useRef<HTMLDivElement>(null)

  // Auto-analyze pending conversations
  const runAutoAnalyze = useCallback(async () => {
    if (isAutoAnalyzingRef.current) return
    isAutoAnalyzingRef.current = true
    try {
      await analyzeConversations(50, undefined)
      router.refresh()
    } finally {
      isAutoAnalyzingRef.current = false
    }
  }, [router])

  // Auto-refresh every 60 s; trigger analysis if pending conversations exist
  useEffect(() => {
    const id = setInterval(() => {
      router.refresh()
      if (pendingCountRef.current > 0) void runAutoAnalyze()
    }, 60_000)
    return () => clearInterval(id)
  }, [router, runAutoAnalyze])

  // Click-outside to close detail card
  useEffect(() => {
    if (!selectedId) return
    function handleMouseDown(e: MouseEvent) {
      if (detailRef.current && !detailRef.current.contains(e.target as Node)) {
        setSelectedId('')
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [selectedId])

  function handleAnalyze() {
    setAnalyzeMsg(null)
    startAnalyzeTransition(async () => {
      const res = await analyzeConversations(50)
      if (res.error) { setAnalyzeMsg(`Error: ${res.error}`); return }
      setAnalyzeMsg(res.analyzed > 0 ? `Analysed ${res.analyzed}` : 'All analysed')
      router.refresh()
    })
  }

  function handleAnalyzeOne(convId: string) {
    setAnalyzeMsg(null)
    startAnalyzeTransition(async () => {
      const res = await analyzeConversations(1, [convId])
      if (res.error) setAnalyzeMsg(`Error: ${res.error}`)
      else if (res.analyzed === 0) setAnalyzeMsg('Analysis returned no results — check API logs')
      router.refresh()
    })
  }

  function handleRename(convId: string, title: string) {
    void renameConversation(convId, title).then(() => router.refresh())
  }

  function dismiss(convId: string) {
    setDismissed(prev => new Set([...prev, convId]))
    if (convId === selectedId) setSelectedId('')
  }

  // Modal form state
  const [mName,      setMName]      = useState('')
  const [mEmail,     setMEmail]     = useState('')
  const [mCompany,   setMCompany]   = useState('')
  const [mDealTitle, setMDealTitle] = useState('')
  const [mNotes,     setMNotes]     = useState('')
  const [mPriority,  setMPriority]  = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
  const [modalError, setModalError] = useState<string | null>(null)

  function openModal(tc: TriageConversation, mode: 'lead' | 'ticket') {
    const c = tc.conversation
    setModalError(null)
    setModalTc(tc)
    setMName(c.ai_entities?.name ?? '')
    setMEmail(c.ai_entities?.email ?? '')
    setMCompany('')
    setMDealTitle(c.title ?? `Chat from ${tc.botName}`)
    setMNotes(c.ai_summary ?? '')
    if (mode === 'ticket') {
      setMPriority(c.ai_priority === 'high' ? 'urgent' : c.ai_priority === 'medium' ? 'high' : 'medium')
    }
    setModalMode(mode)
  }

  function handleModalSubmit() {
    if (!modalTc) return
    startTransition(async () => {
      setModalError(null)
      const convId = modalTc.conversation.id
      let result: { error?: string }

      if (modalMode === 'lead') {
        result = await triageCreateLead({
          name:      mName,
          email:     mEmail,
          company:   mCompany || undefined,
          dealTitle: mDealTitle,
          notes:     mNotes || undefined,
        })
        if (!result.error) {
          setActioned(prev => new Map(prev).set(convId, 'Lead created'))
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
          setActioned(prev => new Map(prev).set(convId, 'Ticket created'))
          setModalMode(null)
        }
      } else {
        return
      }

      if (result?.error) setModalError(result.error)
    })
  }

  const visible       = triageConversations.filter(tc => !dismissed.has(tc.conversation.id))
  const highConvs     = visible.filter(tc => tc.conversation.ai_priority === 'high')
  const medConvs      = visible.filter(tc => tc.conversation.ai_priority === 'medium')
  const lowConvs      = visible.filter(tc => tc.conversation.ai_priority === 'low')
  const pendingConvs  = visible.filter(tc => !tc.conversation.ai_analyzed_at)
  const unanalyzedCount = pendingConvs.length

  // Keep pendingCountRef in sync and auto-trigger
  useEffect(() => {
    const prev = pendingCountRef.current
    pendingCountRef.current = unanalyzedCount
    if (unanalyzedCount > 0 && unanalyzedCount !== prev) {
      void runAutoAnalyze()
    }
  }, [unanalyzedCount, runAutoAnalyze])

  const sortedVisible      = [...visible].sort(sortByPriority)
  const selectedTc         = selectedId ? visible.find(tc => tc.conversation.id === selectedId) ?? null : null

  const gridHigh    = highConvs.filter(tc => tc.conversation.id !== selectedId)
  const gridMed     = medConvs.filter(tc => tc.conversation.id !== selectedId)
  const gridLow     = lowConvs.filter(tc => tc.conversation.id !== selectedId)
  const gridPending = pendingConvs.filter(tc => tc.conversation.id !== selectedId)

  return (
    <div className="flex flex-1 overflow-hidden">

      {/* ─── LEFT: Priority-sorted conversation list ─────────────────────── */}
      <aside className="w-[260px] shrink-0 flex flex-col border-r dark:border-white/8 bg-gray-50/80 dark:bg-[#161616] overflow-hidden">

        {/* Header */}
        <div className="px-4 py-3 border-b dark:border-white/8 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-blue-500 shrink-0" />
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Bot Triage</h2>
            </div>
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8 disabled:opacity-50 transition-colors"
            >
              {isAnalyzing
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <Sparkles className="w-3 h-3" />}
              {isAnalyzing ? 'Analysing…' : 'Analyse'}
            </button>
          </div>

          {/* Status badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {highConvs.length > 0 && (
              <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-[#61c2ad]/10 text-[#3a9e8a] dark:text-[#61c2ad] font-semibold border border-[#61c2ad]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#61c2ad]" />{highConvs.length} High
              </span>
            )}
            {medConvs.length > 0 && (
              <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-200 dark:border-amber-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />{medConvs.length} Medium
              </span>
            )}
          </div>
          {(analyzeMsg && !isAnalyzing) && (
            <p className={cn('text-[11px] mt-1 font-medium', analyzeMsg.startsWith('Error') ? 'text-red-500' : 'text-green-600 dark:text-green-400')}>
              {analyzeMsg}
            </p>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                <Bot className="w-5 h-5 text-gray-300 dark:text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No conversations yet</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Create a bot to get started</p>
              </div>
            </div>
          ) : (
            sortedVisible.map(tc => {
              const { conversation } = tc
              const isActive  = selectedId === conversation.id
              const priority  = conversation.ai_priority
              return (
                <div
                  key={conversation.id}
                  onClick={() => setSelectedId(isActive ? '' : conversation.id)}
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
                          actioned.has(conversation.id) ? 'text-gray-400' : 'text-gray-800 dark:text-gray-200')}>
                          {conversation.title ?? 'Untitled'}
                        </span>
                        <p className="text-[11px] text-gray-400 truncate">{tc.botName}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center pr-3 shrink-0">
                    <span className="text-[10px] text-gray-400">
                      {conversation.last_activity_at ? timeAgo(conversation.last_activity_at) : ''}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-3 border-t dark:border-white/8 shrink-0">
          <Link href="/bots"
            className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-white/5 rounded-xl transition-colors">
            All Conversations <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </aside>

      {/* ─── CENTER: Detail view + card grid ──────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-[#1c1c1c]">

        {triageConversations.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-400 p-8">
            <div className="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
              <Bot className="w-9 h-9 opacity-20" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-base font-semibold text-gray-600 dark:text-gray-300">No bot conversations yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 max-w-sm">
                Create a bot and connect it to a platform to start chatting.
              </p>
            </div>
            <Link href="/bots/new"
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors">
              <Bot className="w-4 h-4 shrink-0" />
              Create a Bot
            </Link>
          </div>

        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-7">

              {/* Detail card */}
              {selectedTc && (
                <div ref={detailRef}>
                  <DetailCard
                    tc={selectedTc}
                    actioned={actioned}
                    onAction={openModal}
                    onDismiss={dismiss}
                    onClose={() => setSelectedId('')}
                    onAnalyze={handleAnalyzeOne}
                    onRename={handleRename}
                    isAnalyzing={isAnalyzing}
                  />
                </div>
              )}

              {/* Divider */}
              {selectedTc && (gridHigh.length + gridMed.length + gridLow.length + gridPending.length) > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-200 dark:bg-white/8" />
                  <span className="text-[11px] text-gray-400 font-medium whitespace-nowrap">Other conversations</span>
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
                    {gridHigh.map(tc => (
                      <ConvCard key={tc.conversation.id} tc={tc}
                        isDone={actioned.has(tc.conversation.id)} actionLabel={actioned.get(tc.conversation.id)}
                        isSelected={selectedId === tc.conversation.id}
                        onSelect={id => setSelectedId(selectedId === id ? '' : id)}
                        onRename={handleRename}
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
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-amber-500 dark:text-amber-400">
                      Medium · {gridMed.length}
                    </h3>
                    <div className="flex-1 h-px bg-amber-200 dark:bg-amber-500/20" />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                    {gridMed.map(tc => (
                      <ConvCard key={tc.conversation.id} tc={tc}
                        isDone={actioned.has(tc.conversation.id)} actionLabel={actioned.get(tc.conversation.id)}
                        isSelected={selectedId === tc.conversation.id}
                        onSelect={id => setSelectedId(selectedId === id ? '' : id)}
                        onRename={handleRename}
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
                    {gridLow.map(tc => (
                      <ConvCard key={tc.conversation.id} tc={tc}
                        isDone={actioned.has(tc.conversation.id)} actionLabel={actioned.get(tc.conversation.id)}
                        isSelected={selectedId === tc.conversation.id}
                        onSelect={id => setSelectedId(selectedId === id ? '' : id)}
                        onRename={handleRename}
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
                      onClick={handleAnalyze}
                      disabled={isAnalyzing}
                      className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-50 transition-colors group"
                    >
                      {isAnalyzing
                        ? <Loader2 className="w-3 h-3 shrink-0 animate-spin" />
                        : <Brain className="w-3 h-3 shrink-0 group-hover:scale-110 transition-transform" />}
                      {isAnalyzing ? 'Analysing…' : `Pending Analysis · ${gridPending.length}`}
                    </button>
                    <div className="flex-1 h-px bg-blue-200 dark:bg-blue-500/20" />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                    {gridPending.map(tc => (
                      <ConvCard key={tc.conversation.id} tc={tc}
                        isDone={actioned.has(tc.conversation.id)} actionLabel={actioned.get(tc.conversation.id)}
                        isSelected={selectedId === tc.conversation.id}
                        onSelect={id => setSelectedId(selectedId === id ? '' : id)}
                        onRename={handleRename}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          </>
        )}

        {/* ── Modal ── */}
        {modalMode && modalTc && (
          <div className="border-t dark:border-white/8 bg-white dark:bg-[#1e1e1e] p-5 shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {modalMode === 'lead' ? 'Create Lead' : 'Create Support Ticket'}
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  From: {modalTc.conversation.title ?? 'Untitled'} · {modalTc.botName}
                </p>
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

            {modalError && <p className="text-xs text-red-500 mt-2">{modalError}</p>}

            <div className="flex items-center gap-2 mt-4">
              <button onClick={handleModalSubmit} disabled={isPending}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60">
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                {modalMode === 'lead' ? 'Save Lead' : 'Create Ticket'}
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
