'use client'

import React, { useEffect, useRef, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  MessageSquare, Download, Tag, Search, X, Pencil, Trash2,
} from 'lucide-react'
import { PLATFORM_META, timeAgo, formatDate } from '@/lib/utils'
import {
  updateConversationPriority, updateConversationStatus,
  assignConversation, renameConversation, deleteConversation,
} from '@/app/actions/conversation'
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
interface Props {
  conversations: ConvRow[]
  current:       ConvRow & { bots?: { id: string; name: string } | null }
  messages:      PanelMessage[]
  teamMembers?:  TeamMember[]
  canAssign?:    boolean
  readonly?:     boolean
}

// ── Component ─────────────────────────────────────────────────────────────────
export function ConversationPanelClient({
  conversations, current, messages,
  teamMembers = [], canAssign = false, readonly = false,
}: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [search,      setSearch]      = React.useState('')
  const [botFilter,   setBotFilter]   = React.useState('')
  const [localPriority, setLocalPriority] = React.useState(current.ai_priority ?? '')
  const [localStatus,   setLocalStatus]   = React.useState(current.status ?? 'active')
  const [localAssign,   setLocalAssign]   = React.useState<string | null>(current.assigned_to ?? null)
  const [assigning,     setAssigning]     = React.useState(false)

  function handlePriorityChange(val: string) {
    setLocalPriority(val)
    void updateConversationPriority(current.id, val)
  }
  function handleStatusChange(val: string) {
    setLocalStatus(val)
    void updateConversationStatus(current.id, val)
  }
  async function handleAssign(userId: string | null) {
    setAssigning(true)
    const result = await assignConversation(current.id, userId)
    if (!result.error) setLocalAssign(userId)
    setAssigning(false)
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
      router.push('/dashboard/bots')
    })
  }

  // Derive unique bots from the conversations list
  const bots = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const c of conversations) {
      if (c.bots?.id && c.bots?.name) map.set(c.bots.id, c.bots.name)
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [conversations])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'instant' })
  }, [current.id])

  const filtered = conversations.filter(c => {
    if (botFilter && c.bots?.id !== botFilter) return false
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
    for (const msg of messages) {
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
            {isBot ? 'Bot' : (current.ai_entities?.name ?? 'User')}
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
    <div className="flex h-full overflow-hidden w-full">

      {/* ── Left panel: conversation list ─────────────────────────────────── */}
      <div className="w-[240px] shrink-0 border-r dark:border-white/8 flex flex-col bg-gray-50 dark:bg-[#181818]">

        {/* Back link + Search + Bot filter */}
        <div className="p-3 border-b dark:border-white/8 space-y-2">
          <Link href="/dashboard/bots" className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#15A4AE] transition-colors">
            ← All conversations
          </Link>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full pl-8 pr-7 py-1.5 text-xs border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          {bots.length > 1 && (
            <select
              value={botFilter}
              onChange={e => setBotFilter(e.target.value)}
              className="w-full text-xs border dark:border-white/10 rounded-lg px-2.5 py-1.5 bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40"
            >
              <option value="">All bots</option>
              {bots.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
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
                href={`/conversations/${c.id}`}
                className={`flex items-start gap-3 px-3 py-3 border-b dark:border-white/5 transition-colors ${
                  isActive
                    ? 'bg-[#15A4AE]/10 dark:bg-[#15A4AE]/15'
                    : 'hover:bg-white dark:hover:bg-white/5'
                }`}
              >
                <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white ${getAvatarColor(c.id)}`}>
                  {getInitials(c.ai_entities?.name ?? c.title)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-xs font-semibold truncate ${isActive ? 'text-[#1f6157] dark:text-[#15A4AE]' : 'text-gray-900 dark:text-gray-100'}`}>
                      {name}
                    </span>
                    <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(c.last_activity_at)}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 leading-snug">{preview}</p>
                  {c.status === 'active' && (
                    <span className="inline-block mt-1 w-1.5 h-1.5 rounded-full bg-green-400" />
                  )}
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
      <div className="flex-1 flex flex-col overflow-hidden bg-[#f5f4f1] dark:bg-[#1c1c1c]">
        {/* Header: single row — avatar + name + dropdowns + action icons */}
        <div className="shrink-0 bg-white dark:bg-[#232323] border-b dark:border-white/8 px-4 py-2.5">
          <div className="flex items-center gap-2">
            {/* Avatar + name */}
            <div className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${getAvatarColor(current.id)}`}>
              {getInitials(current.ai_entities?.name ?? current.title)}
            </div>
            <div className="min-w-0 mr-2">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate block leading-tight">
                {current.ai_entities?.name ?? current.title ?? '(no title)'}
              </span>
              {current.bots?.name && (
                <p className="text-[10px] text-gray-400 leading-tight">via {current.bots.name}</p>
              )}
            </div>

            {/* Priority badge / dropdown */}
            <select
              value={localPriority}
              onChange={e => handlePriorityChange(e.target.value)}
              disabled={readonly}
              className="text-[11px] border dark:border-white/10 rounded-full px-2.5 py-0.5 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 disabled:opacity-60 cursor-pointer"
            >
              <option value="">Priority</option>
              <option value="low">⚪ Low</option>
              <option value="medium">🟡 Medium</option>
              <option value="high">🟢 High</option>
            </select>

            {/* Status dropdown */}
            <select
              value={localStatus}
              onChange={e => handleStatusChange(e.target.value)}
              disabled={readonly}
              className="text-[11px] border dark:border-white/10 rounded-full px-2.5 py-0.5 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 disabled:opacity-60 cursor-pointer"
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>

            {/* Assign dropdown */}
            {canAssign && (
              <select
                value={localAssign ?? ''}
                disabled={assigning || readonly}
                onChange={e => handleAssign(e.target.value || null)}
                className="text-[11px] border dark:border-white/10 rounded-full px-2.5 py-0.5 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 disabled:opacity-60 cursor-pointer"
              >
                <option value="">Assign to…</option>
                {teamMembers.map(m => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
              </select>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Action icons */}
            <div className="flex items-center gap-1 shrink-0">
              <a
                href={`/api/conversations/${current.id}/export`}
                download title="Download transcript"
                className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
              </a>
              {!readonly && (
                <>
                  <button onClick={handleRename} title="Rename"
                    className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={handleDelete} title="Delete conversation"
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
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

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare className="w-8 h-8 text-gray-200 dark:text-gray-600 mb-2" />
              <p className="text-sm text-gray-400">No messages yet.</p>
            </div>
          ) : renderMessages()}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── Right panel: details ───────────────────────────────────────────── */}
      <div className="w-[320px] shrink-0 overflow-y-auto bg-white dark:bg-[#232323]">
        <div className="p-4 space-y-5">

          {/* Tags / Platform */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Tag className="w-3 h-3" /> Tags
            </p>
            {current.platform ? (
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              <span className={`inline-flex text-xs px-2.5 py-0.5 rounded-full font-medium ${(PLATFORM_META as any)[current.platform]?.color ?? 'bg-gray-100 text-gray-500'}`}>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(PLATFORM_META as any)[current.platform]?.label ?? current.platform}
              </span>
            ) : (
              <p className="text-xs text-gray-400">No tags</p>
            )}
          </div>

          {/* AI Summary */}
          {current.ai_summary && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="text-[#15A4AE]">✦</span> AI Generated
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{current.ai_summary}</p>
            </div>
          )}

          <hr className="border-gray-100 dark:border-white/8" />

          {/* Conversation details */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Conversation Details</p>
            <div className="space-y-2.5">
              {current.bots?.name && <DetailRow label="Bot"      value={current.bots.name} />}
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
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">User Details</p>
              <div className="space-y-2.5">
                {current.ai_entities?.name  && <DetailRow label="Name"  value={current.ai_entities.name} />}
                {current.ai_entities?.email && <DetailRow label="Email" value={current.ai_entities.email} />}
                {current.ai_entities?.phone && <DetailRow label="Phone" value={current.ai_entities.phone} />}
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  )
}

// ── Detail row ────────────────────────────────────────────────────────────────
function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-[11px] text-gray-400 shrink-0">{label}</span>
      {typeof value === 'string'
        ? <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 text-right break-all">{value}</span>
        : value}
    </div>
  )
}
