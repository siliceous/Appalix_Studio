'use client'

import React, { useState, useTransition, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Brain, Check, X, ChevronRight, Loader2,
  UserPlus, Ticket, Sparkles, Plus, Phone, Tag, Pencil, Trash2,
} from 'lucide-react'
import { triageCreateTicket, checkContactHasDeal } from '@/app/actions/sage-triage'
import { PipelinePickerModal } from '@/components/sage/pipeline-picker-modal'
import { analyzeConversations, renameConversation, deleteConversations } from '@/app/actions/bot-conversations'
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
  high:   'bg-[#15A4AE]',
  medium: 'bg-amber-400',
  low:    'bg-gray-300 dark:bg-gray-600',
}

const PRIORITY_BADGE: Record<string, string> = {
  high:   'bg-[#15A4AE]/10 dark:bg-[#15A4AE]/15 text-[#3a9e8a] dark:text-[#15A4AE] border-[#15A4AE]/30 dark:border-[#15A4AE]/25',
  medium: 'bg-amber-50 dark:bg-amber-500/10 text-amber-500/75 dark:text-amber-400/75 border-amber-200/70 dark:border-amber-500/18',
  low:    'bg-gray-100 dark:bg-white/5 text-gray-500 border-gray-200 dark:border-white/10',
}


function sortByRecency(a: TriageConversation, b: TriageConversation): number {
  const ta = a.conversation.last_activity_at ? new Date(a.conversation.last_activity_at).getTime() : 0
  const tb = b.conversation.last_activity_at ? new Date(b.conversation.last_activity_at).getTime() : 0
  return tb - ta
}


// ─── Detail Card ──────────────────────────────────────────────────────────────

interface DetailCardProps {
  tc:             TriageConversation
  actioned:       Map<string, string>
  onAction:       (tc: TriageConversation, mode: 'lead' | 'ticket') => void
  onDismiss:      (id: string) => void
  onClose:        () => void
  onAnalyze:      (id: string) => void
  onRename:       (id: string, title: string) => void
  isAnalyzing:    boolean
  isCreatingLead: boolean
}

function DetailCard({ tc, actioned, onAction, onDismiss, onClose, onAnalyze, onRename, isAnalyzing, isCreatingLead }: DetailCardProps) {
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
      'bg-white dark:bg-[#242424] rounded-2xl border shadow-sm',
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
                <Image src="/favicon.png" alt="Bot" width={12} height={12} className="w-3 h-3 object-contain" /> {botName}
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
            <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed line-clamp-3" title={conversation.ai_summary}>{conversation.ai_summary}</p>
          </div>
        ) : (
          <div className="rounded-xl bg-gray-50 dark:bg-white/3 border border-gray-200 dark:border-white/10 px-4 py-3 flex items-start gap-2.5">
            <Brain className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">AI Analysis Complete</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">No summary available — re-analyse to generate one.</p>
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
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${
              (actionLabel ?? '').toLowerCase().includes('exist')
                ? 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20'
                : 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20'
            }`}>
              <Check className={`w-4 h-4 ${(actionLabel ?? '').toLowerCase().includes('exist') ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`} />
              <span className={`text-sm font-medium ${(actionLabel ?? '').toLowerCase().includes('exist') ? 'text-orange-700 dark:text-orange-400' : 'text-green-700 dark:text-green-400'}`}>{actionLabel}</span>
            </div>
          ) : (
            <>
              <button
                onClick={() => onAction(tc, 'lead')}
                disabled={isCreatingLead}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-60"
              >
                {isCreatingLead
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking…</>
                  : <><UserPlus className="w-3.5 h-3.5" /> Add a Deal</>
                }
              </button>
              <button
                onClick={() => onAction(tc, 'ticket')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-sky-500 hover:bg-sky-600 text-white transition-colors"
              >
                <Ticket className="w-3.5 h-3.5" /> Add Ticket
              </button>
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
  const [selectedBotName,  setSelectedBotName]  = useState<string | null>(null)
  const [checkedIds,       setCheckedIds]       = useState<Set<string>>(new Set())
  const [showDealPicker,   setShowDealPicker]   = useState<TriageConversation | null>(null)
  const [isPending,          startTransition]          = useTransition()
  const [isAnalyzing,        startAnalyzeTransition]   = useTransition()
  const [isDeleting,         startDeleteTransition]    = useTransition()
  const [analyzeMsg,       setAnalyzeMsg]       = useState<string | null>(null)
  const [convPage,         setConvPage]         = useState(1)
  const convPageSize = 20

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

  // Scroll detail card into view when a conversation is selected
  useEffect(() => {
    if (selectedId && detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
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

  function handleDeleteSelected() {
    startDeleteTransition(async () => {
      const ids = [...checkedIds]
      const res = await deleteConversations(ids)
      if (res.error) return
      setCheckedIds(new Set())
      if (selectedId && ids.includes(selectedId)) setSelectedId('')
      router.refresh()
    })
  }

  function dismiss(convId: string) {
    setCheckedIds(prev => { const next = new Set(prev); next.delete(convId); return next })
    setDismissed(prev => new Set([...prev, convId]))
    if (convId === selectedId) setSelectedId('')
  }

  // Modal form state
  const [mName,      setMName]      = useState('')
  const [mEmail,     setMEmail]     = useState('')
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
    setMDealTitle(c.title ?? `Chat from ${tc.botName}`)
    setMNotes(c.ai_summary ?? '')
    setMPriority(c.ai_priority === 'high' ? 'urgent' : c.ai_priority === 'medium' ? 'high' : 'medium')
    setModalMode(mode)
  }

  // Open pipeline picker for lead creation; open ticket modal for tickets
  function handleAction(tc: TriageConversation, mode: 'lead' | 'ticket') {
    if (mode === 'ticket') { openModal(tc, 'ticket'); return }
    const c = tc.conversation
    const email = c.ai_entities?.email ?? ''
    const name  = c.ai_entities?.name  ?? ''
    startTransition(async () => {
      const hasDeal = await checkContactHasDeal(email, name)
      if (hasDeal) {
        setActioned(prev => new Map(prev).set(c.id, 'A deal already exists for this contact'))
        return
      }
      setShowDealPicker(tc)
    })
  }

  function handleModalSubmit() {
    if (!modalTc || modalMode !== 'ticket') return
    startTransition(async () => {
      setModalError(null)
      const convId = modalTc.conversation.id
      const result = await triageCreateTicket({
        title:          mDealTitle,
        description:    mNotes,
        contactEmail:   mEmail,
        contactName:    mName,
        priority:       mPriority,
        conversationId: convId,
      })
      if (!result.error) {
        setActioned(prev => new Map(prev).set(convId, 'Ticket created'))
        setModalMode(null)
      }
      if (result?.error) setModalError(result.error)
    })
  }

  const visible         = triageConversations.filter(tc => !dismissed.has(tc.conversation.id))
  const highConvs       = visible.filter(tc => tc.conversation.ai_priority === 'high')
  const medConvs        = visible.filter(tc => tc.conversation.ai_priority === 'medium')
  const unanalyzedCount = visible.filter(tc => !tc.conversation.ai_analyzed_at).length

  // Keep pendingCountRef in sync and auto-trigger
  useEffect(() => {
    const prev = pendingCountRef.current
    pendingCountRef.current = unanalyzedCount
    if (unanalyzedCount > 0 && unanalyzedCount !== prev) void runAutoAnalyze()
  }, [unanalyzedCount, runAutoAnalyze])

  const sortedVisible = [...visible].sort(sortByRecency)
  const selectedTc    = selectedId ? visible.find(tc => tc.conversation.id === selectedId) ?? null : null

  // Derive bot list for column 1
  const botMap2 = new Map<string, { name: string; total: number; highCount: number }>()
  for (const tc of visible) {
    const e = botMap2.get(tc.botName)
    if (e) { e.total++; if (tc.conversation.ai_priority === 'high') e.highCount++ }
    else botMap2.set(tc.botName, { name: tc.botName, total: 1, highCount: tc.conversation.ai_priority === 'high' ? 1 : 0 })
  }
  const botList = [...botMap2.values()]

  // Filter conversations by selected bot
  const convListVisible = selectedBotName
    ? [...visible.filter(tc => tc.botName === selectedBotName)].sort(sortByRecency)
    : sortedVisible

  // Paginate conversation list; reset on bot change
  useEffect(() => setConvPage(1), [selectedBotName])
  const convTotalPages = Math.max(1, Math.ceil(convListVisible.length / convPageSize))
  const convSafePage   = Math.min(convPage, convTotalPages)
  const convPaginated  = convListVisible.slice((convSafePage - 1) * convPageSize, convSafePage * convPageSize)

  return (
    <div className="flex flex-1 overflow-hidden">

      {/* ─── COLUMN 1: Bot list ───────────────────────────────────────────── */}
      <aside className="w-[168px] shrink-0 flex flex-col border-r dark:border-white/8 bg-gray-50/80 dark:bg-[#161616] overflow-hidden">
        <div className="px-3 py-3 bg-[#141c2b] border-b border-white/10 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Image src="/favicon.png" alt="Bots" width={14} height={14} className="w-3.5 h-3.5 shrink-0 object-contain" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wide">Bots</h2>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            title={isAnalyzing ? 'Analysing…' : 'Analyse conversations'}
            className="p-1 rounded-lg text-white hover:bg-white/10 disabled:opacity-50 transition-colors"
          >
            {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          </button>
        </div>

        {analyzeMsg && !isAnalyzing && (
          <p className={cn('text-[10px] px-3 py-1.5 font-medium border-b dark:border-white/8', analyzeMsg.startsWith('Error') ? 'text-red-500' : 'text-green-600 dark:text-green-400')}>
            {analyzeMsg}
          </p>
        )}

        <div className="flex-1 overflow-y-auto">
          {/* "All Bots" row */}
          <div
            onClick={() => { setSelectedBotName(null); setSelectedId('') }}
            className={cn(
              'px-3 py-2.5 cursor-pointer transition-colors border-l-[3px]',
              !selectedBotName ? 'border-l-[#15A4AE] bg-[#15A4AE]/8 dark:bg-[#15A4AE]/10' : 'border-l-transparent hover:bg-white dark:hover:bg-white/3',
            )}
          >
            <p className={cn('text-xs font-semibold', !selectedBotName ? 'text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400')}>All Bots</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-[10px] text-gray-400">{visible.length} convs</p>
              {highConvs.length > 0 && <span className="text-[10px] font-bold text-[#15A4AE]">· {highConvs.length}H</span>}
              {medConvs.length > 0 && <span className="text-[10px] font-bold text-amber-400">· {medConvs.length}M</span>}
            </div>
          </div>

          {botList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 p-4 text-center">
              <Image src="/favicon.png" alt="Bot" width={20} height={20} className="w-5 h-5 object-contain opacity-30 dark:opacity-20" />
              <p className="text-[11px] text-gray-400">No bots yet</p>
            </div>
          ) : botList.map(bot => (
            <div
              key={bot.name}
              onClick={() => { setSelectedBotName(bot.name); setSelectedId('') }}
              className={cn(
                'px-3 py-2.5 cursor-pointer transition-colors border-l-[3px]',
                selectedBotName === bot.name ? 'border-l-[#15A4AE] bg-[#15A4AE]/8 dark:bg-[#15A4AE]/10' : 'border-l-transparent hover:bg-white dark:hover:bg-white/3',
              )}
            >
              <p className={cn('text-xs font-medium truncate', selectedBotName === bot.name ? 'text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400')}>
                {bot.name}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-[10px] text-gray-400">{bot.total} convs</p>
                {bot.highCount > 0 && <span className="text-[10px] font-bold text-[#15A4AE]">· {bot.highCount}H</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="px-3 py-2.5 border-t dark:border-white/8 shrink-0">
          <Link href="/bots" className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            All bots <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </aside>

      {/* ─── COLUMN 2: Conversation list ─────────────────────────────────── */}
      <aside className="w-[240px] shrink-0 flex flex-col border-r dark:border-white/8 bg-gray-50/50 dark:bg-[#191919] overflow-hidden">
        <div className="px-3 py-2.5 bg-[#141c2b] border-b border-white/10 shrink-0 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white truncate max-w-[140px]">
              {selectedBotName ?? 'All Conversations'}
            </p>
            <p className="text-sm text-white">{convListVisible.length} conversation{convListVisible.length !== 1 ? 's' : ''}</p>
          </div>
          {checkedIds.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              disabled={isDeleting}
              className="flex items-center gap-1 text-sm px-2 py-1 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 border border-red-200 dark:border-red-500/20 disabled:opacity-50 transition-colors"
            >
              {isDeleting ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Trash2 className="w-2.5 h-2.5" />}
              {isDeleting ? '…' : `Del ${checkedIds.size}`}
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {convListVisible.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 p-4 text-center">
              <Image src="/favicon.png" alt="Bot" width={24} height={24} className="w-6 h-6 object-contain opacity-30 dark:opacity-20" />
              <p className="text-xs text-gray-400">
                {triageConversations.length === 0 ? 'No conversations yet' : 'No conversations for this bot'}
              </p>
              {triageConversations.length === 0 && (
                <Link href="/bots/new" className="text-xs text-blue-500 hover:underline">Create a bot →</Link>
              )}
            </div>
          ) : convPaginated.map(tc => {
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
                    ? priority === 'high'   ? 'border-l-[#15A4AE] bg-[#15A4AE]/8 dark:bg-[#15A4AE]/10'
                    : priority === 'medium' ? 'border-l-amber-400 bg-amber-50 dark:bg-amber-500/8'
                    : priority === 'low'    ? 'border-l-gray-400  bg-gray-100 dark:bg-white/5'
                    :                         'border-l-blue-400  bg-blue-50 dark:bg-blue-500/8'
                    : 'border-l-transparent hover:bg-white dark:hover:bg-white/3',
                )}
              >
                <div className="flex-1 min-w-0 px-3 py-2.5">
                  <div className="flex items-start gap-2">
                    <div className="flex flex-col items-center gap-0.5 pt-1 shrink-0">
                      <input
                        type="checkbox"
                        checked={checkedIds.has(conversation.id)}
                        onChange={e => { e.stopPropagation(); setCheckedIds(prev => { const n = new Set(prev); e.target.checked ? n.add(conversation.id) : n.delete(conversation.id); return n }) }}
                        onClick={e => e.stopPropagation()}
                        className="w-3 h-3 rounded accent-orange-500 cursor-pointer"
                      />
                      <span className={cn('w-1.5 h-1.5 rounded-full mt-0.5', priority ? PRIORITY_DOT[priority] : 'bg-gray-200 dark:bg-white/20')} />
                    </div>
                    <div className="min-w-0">
                      <p className={cn('text-xs font-semibold truncate', actioned.has(conversation.id) ? 'text-gray-400' : 'text-gray-800 dark:text-gray-200')}>
                        {conversation.title ?? 'Untitled'}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {conversation.message_count ?? 0} msgs · {conversation.last_activity_at ? timeAgo(conversation.last_activity_at) : ''}
                      </p>
                      {!selectedBotName && (
                        <p className="text-[10px] text-blue-400/80 truncate">{tc.botName}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="shrink-0 border-t dark:border-white/8 px-3 py-2 flex items-center justify-between">
          <button onClick={() => setConvPage(p => Math.max(1, p - 1))} disabled={convSafePage <= 1}
            className="text-[10px] px-2 py-1 rounded-lg border dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/8 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium text-gray-500 dark:text-gray-400">← Prev</button>
          <span className="text-[10px] text-gray-400">{convSafePage} / {convTotalPages}</span>
          <button onClick={() => setConvPage(p => Math.min(convTotalPages, p + 1))} disabled={convSafePage >= convTotalPages}
            className="text-[10px] px-2 py-1 rounded-lg border dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/8 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium text-gray-500 dark:text-gray-400">Next →</button>
        </div>
      </aside>

      {/* ─── COLUMN 3: Detail triage card ────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-[#1c1c1c]">
        {!selectedTc ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
              <Image src="/favicon.png" alt="Bot" width={24} height={24} className="w-6 h-6 object-contain opacity-30 dark:opacity-20" />
            </div>
            <p className="text-sm text-gray-400 dark:text-gray-500">Select a conversation to view the AI triage</p>
          </div>
        ) : (
          <>
            <div ref={detailRef} className="flex-1 overflow-y-auto p-5">
              <DetailCard
                tc={selectedTc}
                actioned={actioned}
                onAction={handleAction}
                onDismiss={dismiss}
                onClose={() => setSelectedId('')}
                onAnalyze={handleAnalyzeOne}
                onRename={handleRename}
                isAnalyzing={isAnalyzing}
                isCreatingLead={isPending}
              />
            </div>

            {/* ── Inline error (shown when lead creation fails without modal) ── */}
            {modalError && !modalMode && (
              <div className="border-t dark:border-white/8 px-5 py-3 shrink-0 bg-red-50 dark:bg-red-500/10">
                <p className="text-xs text-red-600 dark:text-red-400">{modalError}</p>
              </div>
            )}

            {/* ── Modal ── */}
            {modalMode && modalTc && (
              <div className="border-t dark:border-white/8 bg-gray-50 dark:bg-[#1c1c1c] p-5 shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
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
                      <textarea name="ticket-description" value={mNotes} onChange={e => setMNotes(e.target.value)} rows={2}
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
          </>
        )}
      </div>

      {showDealPicker && (
        <PipelinePickerModal
          prefill={{
            title:          showDealPicker.conversation.ai_entities?.product_interest
                              ?? showDealPicker.conversation.title
                              ?? `Chat via ${showDealPicker.botName}`,
            contactName:    showDealPicker.conversation.ai_entities?.name  ?? '',
            contactEmail:   showDealPicker.conversation.ai_entities?.email ?? '',
            contactPhone:   showDealPicker.conversation.ai_entities?.phone ?? undefined,
            notes:          showDealPicker.conversation.ai_summary ?? undefined,
            source:         'chat',
            conversationId: showDealPicker.conversation.id,
          }}
          onSuccess={(msg) => {
            setActioned(prev => new Map(prev).set(showDealPicker.conversation.id, msg))
            setTimeout(() => dismiss(showDealPicker.conversation.id), 2000)
          }}
          onClose={() => setShowDealPicker(null)}
        />
      )}
    </div>
  )
}
