'use client'

import React, { useEffect, useRef, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  MessageSquare, Download, Search, X, Pencil, Trash2, Loader2,
  UserPlus, Ticket, Send, CheckCircle, UserCheck, Phone,
  ChevronUp, ChevronDown,
} from 'lucide-react'
import { EmailComposeModal } from '@/components/dashboard/email-compose-modal'
import { PipelinePickerModal } from '@/components/sage/pipeline-picker-modal'
import { PLATFORM_META, timeAgo, formatDate } from '@/lib/utils'
import {
  updateConversationPriority, updateConversationStatus,
  assignConversation, renameConversation, deleteConversation,
  conversationCreateTicket, toggleBotPause,
} from '@/app/actions/conversation'
import { sendSms, confirmSmsContactName, dismissSmsContactSuggestion } from '@/app/actions/sms'
import { createClient } from '@/lib/supabase/client'
import type { ConvRow } from '@/app/(dashboard)/conversations/page'

export type TeamMember = { user_id: string; name: string }

// ── Types ─────────────────────────────────────────────────────────────────────
export type PanelMessage = {
  id: string
  role: string
  content: string
  tokens_output?: number | null
  response_time_ms?: number | null
  is_error?: boolean | null
  created_at: string
}

// ── Pill styles ───────────────────────────────────────────────────────────────
const PRIORITY_PILL: Record<string, string> = {
  high:   'bg-[#15A4AE]/10 text-[#15A4AE] border border-[#15A4AE]/30',
  medium: 'bg-amber-50 text-amber-700 dark:text-amber-400 border border-amber-200/70',
  low:    'bg-gray-100 text-gray-500 border border-gray-200 dark:border-white/10',
}
const STATUS_PILL: Record<string, string> = {
  active:    'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400 border border-green-200 dark:border-green-500/20',
  completed: 'bg-gray-100 text-gray-500 border border-gray-200 dark:border-white/10',
  archived:  'bg-amber-50 text-amber-700 dark:text-amber-400 border border-amber-200/70',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  'bg-purple-500', 'bg-blue-500', 'bg-[#15A4AE]', 'bg-yellow-500',
  'bg-red-500', 'bg-pink-500', 'bg-indigo-500', 'bg-orange-500',
]
function getAvatarColor(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}
function getInitials(name: string | null | undefined) {
  if (!name) return '?'
  return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)
}
function dayLabel(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'TODAY'
  if (d.toDateString() === yesterday.toDateString()) return 'YESTERDAY'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()
}
function msgTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}


// ── Props ─────────────────────────────────────────────────────────────────────
interface SmsContact { id: string; name: string; phone: string }

interface Props {
  conversations:        ConvRow[]
  current:              ConvRow & { bots?: { id: string; name: string } | null }
  messages:             PanelMessage[]
  teamMembers?:         TeamMember[]
  canAssign?:           boolean
  smsSuggestedContact?: SmsContact | null
  prevId?:              string | null
  nextId?:              string | null
}

// ── Component ─────────────────────────────────────────────────────────────────
export function SmsPanelClient({
  conversations, current, messages,
  teamMembers = [], canAssign = false,
  smsSuggestedContact = null,
  prevId = null, nextId = null,
}: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [search,      setSearch]      = React.useState('')
  const [localPriority, setLocalPriority] = React.useState(current.ai_priority ?? '')
  const [localStatus,   setLocalStatus]   = React.useState(current.status ?? 'active')
  const [localAssign,   setLocalAssign]   = React.useState<string | null>(current.assigned_to ?? null)
  const [saving,        setSaving]        = React.useState<'priority' | 'status' | 'assign' | null>(null)
  const [actionLoading, setActionLoading] = React.useState<'ticket' | null>(null)
  const [showEmailModal, setShowEmailModal] = React.useState(false)
  const [showDealPicker, setShowDealPicker] = React.useState(false)
  const [notification, setNotification] = React.useState<string | null>(null)
  const customerEmail = current.ai_entities?.email ?? null
  const customerName  = current.ai_entities?.name  ?? null

  // Live messages (seeded from server-rendered props, extended by Realtime)
  const [liveMessages,  setLiveMessages]  = React.useState<PanelMessage[]>(messages)
  const [lastActivity,  setLastActivity]  = React.useState(current.last_activity_at ?? new Date().toISOString())
  // Clock ticker — refreshes "X min ago" label every 30 s
  const [now, setNow] = React.useState(() => Date.now())

  // Human takeover state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [isBotPaused,  setIsBotPaused]  = React.useState<boolean>(!!(current as any).bot_paused)
  const [takingOver,   setTakingOver]   = React.useState(false)
  const [agentDraft,   setAgentDraft]   = React.useState('')
  const [agentSending, setAgentSending] = React.useState(false)
  const [agentError,   setAgentError]   = React.useState<string | null>(null)

  // Reset state when navigating to a different conversation
  useEffect(() => {
    setLiveMessages(messages)
    setLastActivity(current.last_activity_at ?? new Date().toISOString())
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setIsBotPaused(!!(current as any).bot_paused)
    setAgentDraft('')
    setAgentError(null)
  }, [current.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Supabase Realtime — stream new messages, activity, and bot_paused updates
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`conv-${current.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${current.id}` },
        (payload) => {
          const msg = payload.new as PanelMessage
          setLiveMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
          setLastActivity(new Date().toISOString())
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `id=eq.${current.id}` },
        (payload) => {
          const updated = payload.new as { last_activity_at?: string; bot_paused?: boolean }
          if (updated.last_activity_at) setLastActivity(updated.last_activity_at)
          if (typeof updated.bot_paused === 'boolean') setIsBotPaused(updated.bot_paused)
        },
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [current.id])

  // Ticker — keeps "X min ago" label fresh without a page reload
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const minutesSinceActivity = Math.floor((now - new Date(lastActivity).getTime()) / 60_000)
  const isUserActive = minutesSinceActivity < 5

  // SMS reply state
  const [smsDraft,    setSmsDraft]    = React.useState('')
  const [smsSending,  setSmsSending]  = React.useState(false)
  const [smsError,    setSmsError]    = React.useState<string | null>(null)

  // SMS name suggestion state
  const [suggestion,        setSuggestion]        = React.useState<SmsContact | null>(smsSuggestedContact)
  const [editingName,       setEditingName]        = React.useState(false)
  const [editNameValue,     setEditNameValue]      = React.useState(smsSuggestedContact?.name ?? '')
  const [suggestionWorking, setSuggestionWorking]  = React.useState(false)

  async function handleConfirmName() {
    if (!suggestion) return
    setSuggestionWorking(true)
    const result = await confirmSmsContactName(suggestion.id, editNameValue || suggestion.name, current.id)
    if (!result.error) {
      setSuggestion(null)
      router.refresh()
    }
    setSuggestionWorking(false)
  }

  async function handleDismissSuggestion() {
    if (!suggestion) return
    setSuggestionWorking(true)
    await dismissSmsContactSuggestion(suggestion.id, suggestion.phone)
    setSuggestion(null)
    setSuggestionWorking(false)
  }

  async function handleToggleTakeover() {
    setTakingOver(true)
    const next = !isBotPaused
    const result = await toggleBotPause(current.id, next)
    if (!result.error) {
      setIsBotPaused(next)
      setAgentDraft('')
      setAgentError(null)
    }
    setTakingOver(false)
  }

  async function handleAgentSend() {
    const text = agentDraft.trim()
    if (!text || agentSending) return
    setAgentSending(true)
    setAgentError(null)
    const result = await sendSms(current.id, text)
    if (result.error) {
      setAgentError(result.error)
    } else {
      setAgentDraft('')
    }
    setAgentSending(false)
  }

  async function handleSmsSend() {
    if (!smsDraft.trim() || smsSending) return
    setSmsSending(true)
    setSmsError(null)
    const result = await sendSms(current.id, smsDraft.trim())
    if (result.error) {
      setSmsError(result.error)
    } else {
      setSmsDraft('')
      router.refresh()
    }
    setSmsSending(false)
  }

  async function handlePriorityChange(val: string) {
    setLocalPriority(val)
    setSaving('priority')
    await updateConversationPriority(current.id, val)
    setSaving(null)
    router.refresh()
  }
  async function handleStatusChange(val: string) {
    setLocalStatus(val)
    setSaving('status')
    await updateConversationStatus(current.id, val)
    setSaving(null)
    router.refresh()
  }
  async function handleAssign(userId: string | null) {
    setSaving('assign')
    const result = await assignConversation(current.id, userId)
    if (!result.error) setLocalAssign(userId)
    setSaving(null)
    router.refresh()
  }
  function handleRename() {
    const newTitle = window.prompt('Rename conversation:', current.title ?? '')
    if (newTitle === null) return
    startTransition(async () => {
      await renameConversation(current.id, newTitle)
      router.refresh()
    })
  }
  function handleDelete() {
    if (!window.confirm('Delete this conversation? This cannot be undone.')) return
    startTransition(async () => {
      await deleteConversation(current.id)
      router.push('/dashboard/sms')
    })
  }
  function showNotification(msg: string) {
    setNotification(msg)
    setTimeout(() => setNotification(null), msg.toLowerCase().includes('exist') ? 10000 : 5000)
  }
  async function handleCreateTicket() {
    setActionLoading('ticket')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await conversationCreateTicket(current as any)
    setActionLoading(null)
    router.refresh()
  }

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'instant' })
  }, [current.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [liveMessages])

  const filtered = conversations.filter(c => {
    if (search) {
      const q = search.toLowerCase()
      return (
        (c.ai_entities?.name ?? c.title ?? '').toLowerCase().includes(q) ||
        (c.ai_entities?.email ?? '').toLowerCase().includes(q)
      )
    }
    return true
  })

  // Group messages with date separators
  function renderMessages() {
    const nodes: React.ReactNode[] = []
    let lastDay = ''
    for (const msg of liveMessages) {
      const day = new Date(msg.created_at).toDateString()
      if (day !== lastDay) {
        lastDay = day
        nodes.push(
          <div key={`sep-${msg.created_at}`} className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-gray-200 dark:bg-white/8" />
            <span className="text-[10px] font-semibold text-gray-400 tracking-widest">{dayLabel(msg.created_at)}</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-white/8" />
          </div>
        )
      }
      const isBot  = msg.role === 'assistant'
      const isTool = msg.role === 'tool'
      nodes.push(
        <div key={msg.id} className={`flex flex-col gap-0.5 ${isBot ? 'items-end' : 'items-start'}`}>
          <span className="text-[10px] text-gray-400 px-1">
            {isBot
              ? 'You'
              : (current.ai_entities?.name ?? (current as any).platform_thread_id)
            }
          </span>
          <div className={`max-w-[72%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isBot
              ? 'bg-[#15A4AE] text-white rounded-br-sm'
              : isTool
              ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-500/30 text-yellow-900 dark:text-yellow-200 text-xs font-mono'
              : msg.is_error
              ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-800 dark:text-red-300'
              : 'bg-white dark:bg-white/8 border border-gray-100 dark:border-white/10 text-gray-800 dark:text-gray-100 rounded-bl-sm'
          }`}>
            {isTool && <p className="text-xs font-bold mb-1 text-yellow-700 dark:text-yellow-400">Tool result</p>}
            <p className="whitespace-pre-wrap">{msg.content}</p>
            {msg.role === 'assistant' && (msg.tokens_output != null || msg.response_time_ms != null) && (
              <p className="text-[10px] text-white/60 mt-1">
                {msg.tokens_output != null && `${msg.tokens_output} tokens`}
                {msg.response_time_ms != null && ` · ${(msg.response_time_ms / 1000).toFixed(1)}s`}
              </p>
            )}
          </div>
          <span className="text-[10px] text-gray-400 px-1">{msgTime(msg.created_at)}</span>
        </div>
      )
    }
    return nodes
  }

  return (
    <div className="flex h-full w-full gap-3 p-3 bg-[#f5f4f1] dark:bg-[#1c1c1c]">

      {/* ── Left panel: conversation list — floating ───────────────────────── */}
      <div className="w-[240px] shrink-0 flex flex-col bg-white dark:bg-[#181818] rounded-2xl shadow-xl border border-gray-200/60 dark:border-white/8 overflow-hidden">

        {/* Header */}
        <div className="px-3 py-2.5 bg-[#141c2b] border-b border-white/10 shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">SMS</h2>
            <Link href="/dashboard/sms" className="text-sm text-white hover:opacity-70 transition-opacity">← Back</Link>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full pl-8 pr-7 py-1.5 text-sm border border-white/20 rounded-lg !bg-[#f5f4f1] !text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <MessageSquare className="w-7 h-7 text-gray-200 dark:text-gray-600 mb-2" />
              <p className="text-xs text-gray-400">No conversations found</p>
            </div>
          ) : filtered.map(c => {
            const name    = c.ai_entities?.name ?? c.title ?? '(no title)'
            const preview = c.ai_summary ? c.ai_summary.slice(0, 55) + (c.ai_summary.length > 55 ? '…' : '') : (c.title ?? '')
            const isActive = c.id === current.id
            return (
              <Link
                key={c.id}
                href={`/dashboard/sms/${c.id}`}
                className={`flex items-start gap-3 px-3 py-3 border-b dark:border-white/5 transition-colors ${
                  isActive
                    ? 'bg-[#15A4AE]/10 dark:bg-[#15A4AE]/15'
                    : 'hover:bg-white dark:hover:bg-white/5'
                }`}
              >
                <div className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-green-500">
                  <Phone className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className={`text-sm font-semibold truncate ${isActive ? 'text-[#1f6157] dark:text-[#15A4AE]' : 'text-gray-900 dark:text-gray-100'}`}>
                        {name}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">{timeAgo(c.last_activity_at)}</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 leading-snug">{preview}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    {c.status === 'active' && (() => {
                      const mins = Math.floor((now - new Date(c.last_activity_at ?? 0).getTime()) / 60_000)
                      const alive = mins < 5
                      return (
                        <span className={`relative flex w-2 h-2 shrink-0 ${alive ? '' : 'items-center justify-center'}`}>
                          {alive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#15A4AE] opacity-60" />}
                          <span className={`relative inline-flex rounded-full w-1.5 h-1.5 ${alive ? 'bg-[#15A4AE]' : 'bg-gray-400'}`} />
                        </span>
                      )
                    })()}
                    {c.ai_priority === 'high'   && <span className="text-[10px] font-semibold text-green-600 dark:text-green-400">High</span>}
                    {c.ai_priority === 'medium' && <span className="text-[10px] font-semibold text-yellow-600 dark:text-yellow-400">Medium</span>}
                    {c.ai_priority === 'low'    && <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500">Low</span>}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        <div className="p-2 border-t dark:border-white/8 text-[10px] text-gray-400 text-center">
          {conversations.length} total
        </div>
      </div>

      {/* ── Middle panel: chat ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-white dark:bg-[#232323] rounded-2xl shadow-xl border border-gray-200/60 dark:border-white/8 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header: single row — avatar + name | all controls */}
        <div className="shrink-0 bg-[#141c2b] border-b border-white/10 px-4 py-2.5 flex items-center gap-3">
          {/* Left: avatar + name */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-green-500">
              <Phone className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-white truncate leading-tight">
                  {current.ai_entities?.name ?? current.title ?? '(no title)'}
                </span>
              </div>
              <p className="text-sm text-white leading-tight">{(current as any).platform_thread_id}</p>
              {/* Online / inactive indicator */}
              <div className="flex items-center gap-1 mt-0.5">
                <span className={`relative flex w-2 h-2 shrink-0 ${isUserActive ? '' : 'items-center justify-center'}`}>
                  {isUserActive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#15A4AE] opacity-60" />}
                  <span className={`relative inline-flex rounded-full w-1.5 h-1.5 ${isUserActive ? 'bg-[#15A4AE]' : 'bg-gray-400'}`} />
                </span>
                <span className={`text-[10px] leading-none ${isUserActive ? 'text-[#15A4AE]' : 'text-gray-400'}`}>
                  {isUserActive
                    ? 'Active now'
                    : minutesSinceActivity < 60
                    ? `Inactive · ${minutesSinceActivity}m ago`
                    : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          {/* Right: all controls — keep tight, icon-only where possible */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Priority dropdown */}
            <select
              value={localPriority}
              onChange={e => handlePriorityChange(e.target.value)}
              disabled={saving === 'priority'}
              className="dark-bar-select text-xs border border-white/20 rounded-full px-2 py-0.5 focus:outline-none disabled:opacity-60 cursor-pointer"
            >
              <option value="">Pri</option>
              <option value="low">⚪ Low</option>
              <option value="medium">🟡 Med</option>
              <option value="high">🟢 High</option>
            </select>
            {saving === 'priority' && <Loader2 className="w-3 h-3 animate-spin text-[#15A4AE] shrink-0" />}

            {/* Status dropdown */}
            <select
              value={localStatus}
              onChange={e => handleStatusChange(e.target.value)}
              disabled={saving === 'status'}
              className="dark-bar-select text-xs border border-white/20 rounded-full px-2 py-0.5 focus:outline-none disabled:opacity-60 cursor-pointer"
            >
              <option value="active">Active</option>
              <option value="completed">Done</option>
              <option value="archived">Arch</option>
            </select>
            {saving === 'status' && <Loader2 className="w-3 h-3 animate-spin text-[#15A4AE] shrink-0" />}

            {/* Assign dropdown */}
            {canAssign && (
              <>
                <select
                  value={localAssign ?? ''}
                  disabled={saving === 'assign'}
                  onChange={e => handleAssign(e.target.value || null)}
                  className="dark-bar-select text-xs border border-white/20 rounded-full px-2 py-0.5 focus:outline-none disabled:opacity-60 cursor-pointer max-w-[90px]"
                >
                  <option value="">Assign…</option>
                  {teamMembers.map(m => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
                </select>
                {saving === 'assign' && <Loader2 className="w-3 h-3 animate-spin text-[#15A4AE] shrink-0" />}
              </>
            )}

            {/* ── separator ── */}
            <div className="w-px h-5 bg-white/20 mx-0.5 shrink-0" />

            {/* Icon-only action buttons */}
            <button onClick={handleCreateTicket} disabled={actionLoading === 'ticket'} title="Add Ticket"
              className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-60">
              {actionLoading === 'ticket' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ticket className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => setShowDealPicker(true)} title="Add a Deal"
              className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              <UserPlus className="w-3.5 h-3.5" />
            </button>
            <a href={`/api/conversations/${current.id}/export`} download title="Download transcript"
              className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              <Download className="w-3.5 h-3.5" />
            </a>
            <button onClick={handleRename} title="Rename"
              className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleDelete} title="Delete conversation"
              className="p-1.5 text-white/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {/* Prev / Next navigation */}
            <div className="flex items-center border border-white/20 rounded-lg overflow-hidden ml-0.5">
              <button onClick={() => prevId && router.push(`/dashboard/sms/${prevId}`)} disabled={!prevId} title="Previous conversation" className="p-1.5 text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border-r border-white/20">
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => nextId && router.push(`/dashboard/sms/${nextId}`)} disabled={!nextId} title="Next conversation" className="p-1.5 text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Tone indicator */}
        {current.sentiment && (
          <div className="shrink-0 flex justify-center py-2">
            <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase px-3 py-1 bg-white dark:bg-white/5 rounded-full border dark:border-white/8">
              {current.sentiment} tone selected
            </span>
          </div>
        )}

        {/* Maybe banner — shown when an auto-suggested name is pending confirmation */}
        {suggestion && (
          <div className="shrink-0 mx-4 mt-3 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/25">
            <UserCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-xs text-amber-800 dark:text-amber-300 font-medium shrink-0">Maybe:</span>
            {editingName ? (
              <input
                autoFocus
                value={editNameValue}
                onChange={e => setEditNameValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleConfirmName(); if (e.key === 'Escape') setEditingName(false) }}
                className="flex-1 text-xs border border-amber-300 dark:border-amber-500/40 rounded-lg px-2 py-1 bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400/40 min-w-0"
              />
            ) : (
              <span className="flex-1 text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">{suggestion.name}</span>
            )}
            <button
              onClick={() => { setEditingName(true); setEditNameValue(suggestion.name) }}
              disabled={suggestionWorking}
              className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline disabled:opacity-50 shrink-0"
            >Edit</button>
            <button
              onClick={handleConfirmName}
              disabled={suggestionWorking}
              className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors disabled:opacity-50 shrink-0"
            >
              {suggestionWorking ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
              Confirm
            </button>
            <button
              onClick={handleDismissSuggestion}
              disabled={suggestionWorking}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50 shrink-0"
              title="Dismiss"
            ><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {liveMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare className="w-8 h-8 text-gray-200 dark:text-gray-600 mb-2" />
              <p className="text-sm text-gray-400">No messages yet.</p>
            </div>
          ) : renderMessages()}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply box — always visible */}
        {isBotPaused ? (
          /* ── Human takeover mode — fully active reply box ── */
          <div className="shrink-0 border-t dark:border-white/8 bg-white dark:bg-[#232323] p-3 space-y-2">
            {agentError && <p className="text-xs text-red-500 px-1">{agentError}</p>}
            <div className="flex items-end gap-2">
              <button
                onClick={handleToggleTakeover}
                disabled={takingOver}
                title="Return to Bot"
                className="shrink-0 flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold rounded-xl border transition-colors disabled:opacity-60 whitespace-nowrap bg-amber-500/20 border-amber-400/50 text-amber-600 dark:text-amber-300 hover:bg-amber-500/30"
              >
                {takingOver ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                Return to Bot
              </button>
              <textarea
                value={agentDraft}
                onChange={e => setAgentDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAgentSend() }
                }}
                placeholder="Type your reply… (Enter to send, Shift+Enter for new line)"
                rows={2}
                disabled={agentSending}
                className="flex-1 resize-none text-sm border border-amber-300/60 dark:border-amber-500/40 rounded-xl px-3 py-2 bg-amber-50/50 dark:bg-amber-500/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40 disabled:opacity-60"
              />
              <button
                onClick={handleAgentSend}
                disabled={agentSending || !agentDraft.trim()}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-amber-500 text-white hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {agentSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Send
              </button>
            </div>
            <p className="text-[10px] text-amber-600 dark:text-amber-400 px-1 font-medium">
              You are handling this conversation — bot is paused
            </p>
          </div>
        ) : (
          /* ── Bot mode — reply box locked, greyed when user inactive ── */
          <div className={`shrink-0 border-t dark:border-white/8 bg-white dark:bg-[#232323] p-3 space-y-2 transition-opacity duration-500 ${isUserActive ? 'opacity-100' : 'opacity-40'}`}>
            {smsError && <p className="text-xs text-red-500 px-1">{smsError}</p>}
            <div className="flex items-end gap-2">
              <button
                onClick={handleToggleTakeover}
                disabled={takingOver}
                title="Take Over from Bot"
                className="shrink-0 flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold rounded-xl border transition-colors disabled:opacity-60 whitespace-nowrap bg-[#15A4AE]/20 border-[#15A4AE]/50 text-[#15A4AE] hover:bg-[#15A4AE]/30"
              >
                {takingOver ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                Take Over
              </button>
              <textarea
                value={smsDraft}
                onChange={e => setSmsDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSmsSend() }
                }}
                placeholder={
                  !isUserActive
                    ? 'User is not active…'
                    : 'Reply via SMS… (Enter to send, Shift+Enter for new line)'
                }
                rows={2}
                disabled={smsSending || !isUserActive}
                className="flex-1 resize-none text-sm border dark:border-white/10 rounded-xl px-3 py-2 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 disabled:cursor-not-allowed"
              />
              <button
                onClick={handleSmsSend}
                disabled={smsSending || !smsDraft.trim() || !isUserActive}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-[#15A4AE] text-white hover:bg-[#1290a0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {smsSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Send
              </button>
            </div>
            <p className="text-[10px] text-gray-400 px-1">
              {`SMS · ${(current as any).platform_thread_id}`}
            </p>
          </div>
        )}
        </div>{/* end inner flex */}
      </div>{/* end middle panel */}

      {/* ── Right panel: details — floating ────────────────────────────────── */}
      <div className="w-[320px] shrink-0 flex flex-col bg-white dark:bg-[#232323] rounded-2xl shadow-xl border border-gray-200/60 dark:border-white/8 overflow-hidden">
        <div className="px-4 py-2.5 bg-[#141c2b] border-b border-white/10 shrink-0">
          <h2 className="text-sm font-semibold text-white">Details</h2>
        </div>
        <div className="p-4 space-y-5 overflow-y-auto flex-1">

          {/* Status pills */}
          <div className="flex flex-wrap gap-1.5">
            {current.platform && (
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              <span className="inline-flex items-center text-xs px-2.5 py-1 rounded-full font-medium bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(PLATFORM_META as any)[current.platform]?.label ?? current.platform}
              </span>
            )}
            {localPriority && (
              <span className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full font-medium ${PRIORITY_PILL[localPriority] ?? 'bg-gray-100 text-gray-500'}`}>
                {localPriority.charAt(0).toUpperCase() + localPriority.slice(1)}
              </span>
            )}
            {localStatus && (
              <span className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_PILL[localStatus] ?? 'bg-gray-100 text-gray-500'}`}>
                {localStatus.charAt(0).toUpperCase() + localStatus.slice(1)}
              </span>
            )}
          </div>

          {notification && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
              notification.toLowerCase().includes('exist')
                ? 'bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 text-orange-600 dark:text-orange-400'
                : 'bg-[#15A4AE]/10 border border-[#15A4AE]/20 text-[#15A4AE]'
            }`}>
              <CheckCircle className="w-3.5 h-3.5 shrink-0" />
              {notification}
            </div>
          )}

          {/* AI Summary */}
          {current.ai_summary && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="text-[#15A4AE]">✦</span> AI Generated
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{current.ai_summary}</p>
            </div>
          )}

          {/* Reply by Email */}
          {customerEmail && (
            <button
              onClick={() => setShowEmailModal(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border border-[#15A4AE]/40 text-[#15A4AE] hover:bg-[#15A4AE]/8 transition-colors"
            >
              <Send className="w-3.5 h-3.5" /> Reply by Email
            </button>
          )}

          {/* SMS badge */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/20 text-xs text-teal-700 dark:text-teal-400">
            <Phone className="w-3.5 h-3.5 shrink-0" />
            SMS conversation — use reply box below
          </div>

          <hr className="border-gray-100 dark:border-white/8" />

          {/* Conversation details */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Conversation Details</p>
            <div className="space-y-2.5">
              <DetailRow label="Platform"     value={
                current.platform
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  ? ((PLATFORM_META as any)[current.platform]?.label ?? current.platform)
                  : '—'
              } />
              <DetailRow label="Tone"          value={current.sentiment ?? '—'} />
              <DetailRow label="Total Messages" value={String(current.message_count)} />
              <DetailRow label="Started On"    value={formatDate(current.created_at)} />
              <DetailRow label="ID"            value={`#${current.id.slice(0, 6).toUpperCase()}`} />
            </div>
          </div>

          <hr className="border-gray-100 dark:border-white/8" />

          {/* User details */}
          {(current.ai_entities?.email || current.ai_entities?.phone || current.ai_entities?.name) && (
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-3">User Details</p>
              <div className="space-y-2.5">
                {current.ai_entities?.name  && <DetailRow label="Name"  value={current.ai_entities.name} />}
                {current.ai_entities?.email && <DetailRow label="Email" value={current.ai_entities.email} />}
                {current.ai_entities?.phone && <DetailRow label="Phone" value={current.ai_entities.phone} />}
              </div>
            </div>
          )}

        </div>
      </div>

      {showEmailModal && customerEmail && (
        <EmailComposeModal
          to={customerEmail}
          toName={customerName ?? undefined}
          subject={`Re: ${current.title ?? 'Your conversation'}`}
          context={current.ai_summary ?? undefined}
          onClose={() => setShowEmailModal(false)}
        />
      )}

      {showDealPicker && (
        <PipelinePickerModal
          prefill={{
            title:          current.ai_entities?.product_interest ?? current.title ?? `Chat conversation`,
            contactName:    customerName  ?? '',
            contactEmail:   customerEmail ?? '',
            contactPhone:   current.ai_entities?.phone ?? undefined,
            notes:          current.ai_summary ?? undefined,
            source:         'chat',
            conversationId: current.id,
          }}
          onSuccess={(msg) => { showNotification(msg); router.refresh() }}
          onClose={() => setShowDealPicker(false)}
        />
      )}
    </div>
  )
}

// ── Detail row ────────────────────────────────────────────────────────────────
function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-sm text-gray-400 dark:text-gray-500 shrink-0">{label}</span>
      {typeof value === 'string'
        ? <span className="text-sm text-gray-700 dark:text-gray-300 text-right break-all">{value}</span>
        : value}
    </div>
  )
}
