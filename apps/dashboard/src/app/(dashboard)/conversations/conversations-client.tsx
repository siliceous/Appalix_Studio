'use client'

import React, { useCallback, useEffect, useTransition, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  MessageSquare, Search, Download, Pencil, Trash2, Loader2,
  Star, MoreHorizontal, Tag, X, ChevronDown, ExternalLink,
} from 'lucide-react'
import { PLATFORM_META, timeAgo, formatDate } from '@/lib/utils'
import {
  renameConversation, assignConversation, deleteConversation,
  updateConversationPriority, getConversationMessages,
} from '@/app/actions/conversation'
import { deleteConversations } from '@/app/actions/bot-conversations'
import { exportConversations } from '@/app/actions/csv-export'
import { CsvExportButton } from '@/components/ui/csv-export-button'
import type { ConvRow, BotOption, ConvFilters, TeamMember } from './page'

// ── Types ─────────────────────────────────────────────────────────────────────
type Message = { id: string; role: string; content: string; created_at: string }

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
function buildUrl(base: string, filters: ConvFilters): string {
  const p = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => { if (v) p.set(k, v) })
  const qs = p.toString()
  return qs ? `${base}?${qs}` : base
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

const PRIORITY_BADGE: Record<string, string> = {
  high:   'bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/25',
  medium: 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-500/20',
  low:    'bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10',
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  conversations:     ConvRow[]
  bots:              BotOption[]
  filters:           ConvFilters
  showNewBotButton?: boolean
  teamMembers?:      TeamMember[]
  canAssign?:        boolean
  readonly?:         boolean
}

export function ConversationsClient({
  conversations, bots, filters, teamMembers = [], canAssign = false, readonly = false,
}: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  // Selected conversation + messages
  const [selectedId, setSelectedId]       = useState<string | null>(conversations[0]?.id ?? null)
  const [messages,   setMessages]         = useState<Message[]>([])
  const [loadingMsgs, setLoadingMsgs]     = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Right panel: local state
  const [localPriority, setLocalPriority] = useState<Record<string, string>>({})
  const [localAssign,   setLocalAssign]   = useState<Record<string, string | null>>({})
  const [assigning,     setAssigning]     = useState(false)

  // Left panel search (client-side for instant feel)
  const [search, setSearch] = useState(filters.q ?? '')

  const selectedConv = conversations.find(c => c.id === selectedId) ?? null

  // Fetch messages when selection changes
  useEffect(() => {
    if (!selectedId) { setMessages([]); return }
    setLoadingMsgs(true)
    getConversationMessages(selectedId).then(data => {
      setMessages(data ?? [])
      setLoadingMsgs(false)
    })
  }, [selectedId])

  // Auto-scroll to bottom when messages load
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Select first conversation on mount
  useEffect(() => {
    if (conversations.length > 0 && !selectedId) {
      setSelectedId(conversations[0].id)
    }
  }, [conversations, selectedId])

  const pushFilter = useCallback((patch: Partial<ConvFilters>) => {
    const next = { ...filters, ...patch }
    Object.keys(next).forEach(k => { if (!next[k as keyof ConvFilters]) delete next[k as keyof ConvFilters] })
    router.push(buildUrl('/dashboard/bots', next))
  }, [filters, router])

  function handleDelete(id: string) {
    if (!window.confirm('Delete this conversation? This cannot be undone.')) return
    startTransition(async () => {
      await deleteConversation(id)
      if (selectedId === id) setSelectedId(conversations.find(c => c.id !== id)?.id ?? null)
      router.refresh()
    })
  }

  function handleRename(id: string, currentTitle: string | null) {
    const newTitle = window.prompt('Rename conversation:', currentTitle ?? '')
    if (newTitle === null) return
    startTransition(async () => {
      await renameConversation(id, newTitle)
      router.refresh()
    })
  }

  async function handleAssign(convId: string, userId: string | null) {
    setAssigning(true)
    const result = await assignConversation(convId, userId)
    if (!result.error) setLocalAssign(prev => ({ ...prev, [convId]: userId }))
    setAssigning(false)
  }

  function handlePriorityChange(convId: string, priority: string) {
    setLocalPriority(prev => ({ ...prev, [convId]: priority }))
    void updateConversationPriority(convId, priority)
  }

  // Group messages by date for separators
  function renderMessages() {
    const result: React.ReactNode[] = []
    let lastDay = ''
    for (const msg of messages) {
      const day = new Date(msg.created_at).toDateString()
      if (day !== lastDay) {
        lastDay = day
        result.push(
          <div key={`sep-${msg.created_at}`} className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-gray-100 dark:bg-white/8" />
            <span className="text-[10px] font-semibold text-gray-400 tracking-widest">{dayLabel(msg.created_at)}</span>
            <div className="flex-1 h-px bg-gray-100 dark:bg-white/8" />
          </div>
        )
      }
      const isBot  = msg.role === 'assistant'
      const isUser = msg.role === 'user'
      const isTool = msg.role === 'tool'
      result.push(
        <div key={msg.id} className={`flex flex-col gap-1 ${isBot ? 'items-end' : 'items-start'}`}>
          <span className="text-[10px] text-gray-400 px-1">
            {isBot ? 'Bot' : (selectedConv?.ai_entities?.name ?? 'You')}
          </span>
          <div className={`max-w-[72%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isBot
              ? 'bg-[#15A4AE] text-white rounded-br-sm'
              : isTool
              ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-500/30 text-yellow-900 dark:text-yellow-200 text-xs font-mono'
              : 'bg-white dark:bg-white/8 border border-gray-100 dark:border-white/10 text-gray-800 dark:text-gray-100 rounded-bl-sm'
          }`}>
            {isTool && <p className="text-xs font-bold mb-1 text-yellow-700 dark:text-yellow-400">Tool result</p>}
            <p className="whitespace-pre-wrap">{msg.content}</p>
          </div>
          <span className="text-[10px] text-gray-400 px-1">{msgTime(msg.created_at)}</span>
        </div>
      )
    }
    return result
  }

  // Filter conversations by search
  const filtered = search
    ? conversations.filter(c => {
        const name  = (c.ai_entities?.name  ?? c.title ?? '').toLowerCase()
        const email = (c.ai_entities?.email ?? '').toLowerCase()
        const q = search.toLowerCase()
        return name.includes(q) || email.includes(q)
      })
    : conversations

  const activeBotId    = filters.bot ?? ''
  const activeStatus   = filters.status ?? ''
  const activePlatform = filters.platform ?? 'all'

  return (
    <div className="flex h-full overflow-hidden w-full">

      {/* ── Left panel: conversation list ─────────────────────────────────── */}
      <div className="w-[280px] shrink-0 border-r dark:border-white/8 flex flex-col bg-white dark:bg-[#1e1e1e]">

        {/* Search */}
        <div className="p-3 border-b dark:border-white/8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className="w-full pl-8 pr-8 py-1.5 text-xs border dark:border-white/10 rounded-lg bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Status filter pills */}
        <div className="flex gap-1 px-3 py-2 border-b dark:border-white/8 overflow-x-auto">
          {(['', 'active', 'completed', 'archived'] as const).map(s => (
            <button key={s}
              onClick={() => pushFilter({ status: s || undefined })}
              className={`shrink-0 px-2.5 py-1 text-[10px] font-semibold rounded-full transition-colors ${
                activeStatus === s
                  ? 'bg-[#15A4AE]/15 text-[#1f6157] dark:text-[#15A4AE] border border-[#15A4AE]/30'
                  : 'bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/12'
              }`}>
              {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* Bot filter (if multiple bots) */}
        {bots.length > 1 && (
          <div className="px-3 py-2 border-b dark:border-white/8">
            <div className="relative">
              <select
                value={activeBotId}
                onChange={e => pushFilter({ bot: e.target.value || undefined })}
                className="w-full appearance-none pl-3 pr-7 py-1.5 text-xs border dark:border-white/10 rounded-lg bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40"
              >
                <option value="">All bots</option>
                {bots.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center px-4">
              <MessageSquare className="w-8 h-8 text-gray-200 dark:text-gray-600 mb-2" />
              <p className="text-xs text-gray-400">No conversations found</p>
            </div>
          ) : filtered.map(c => {
            const name   = c.ai_entities?.name ?? c.title ?? '(no title)'
            const preview = c.ai_summary ? c.ai_summary.slice(0, 60) + (c.ai_summary.length > 60 ? '…' : '') : c.title ?? ''
            const isSelected = c.id === selectedId
            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full text-left px-3 py-3 flex items-start gap-3 border-b dark:border-white/5 transition-colors ${
                  isSelected
                    ? 'bg-[#15A4AE]/10 dark:bg-[#15A4AE]/15'
                    : 'hover:bg-gray-50 dark:hover:bg-white/[0.03]'
                }`}
              >
                {/* Avatar */}
                <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white ${getAvatarColor(c.id)}`}>
                  {getInitials(c.ai_entities?.name ?? c.title)}
                </div>
                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{name}</span>
                    <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(c.last_activity_at)}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">{preview}</p>
                  {c.status === 'active' && (
                    <span className="inline-block mt-1 w-2 h-2 rounded-full bg-green-400" />
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Bottom: count */}
        <div className="p-3 border-t dark:border-white/8 text-[10px] text-gray-400 text-center">
          {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* ── Middle panel: chat view ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#f5f4f1] dark:bg-[#1c1c1c]">
        {!selectedConv ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="w-12 h-12 text-gray-200 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-400">Select a conversation to view messages</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="shrink-0 bg-white dark:bg-[#232323] border-b dark:border-white/8 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${getAvatarColor(selectedConv.id)}`}>
                  {getInitials(selectedConv.ai_entities?.name ?? selectedConv.title)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {selectedConv.ai_entities?.name ?? selectedConv.title ?? '(no title)'}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      selectedConv.status === 'active'
                        ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400'
                    }`}>
                      {selectedConv.status ?? 'active'}
                    </span>
                  </div>
                  {selectedConv.bots?.name && (
                    <p className="text-[11px] text-gray-400 mt-0.5">via {selectedConv.bots.name}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <a
                  href={`/conversations/${selectedConv.id}`}
                  title="Open full page"
                  className="p-1.5 text-gray-400 hover:text-[#15A4AE] hover:bg-[#15A4AE]/10 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                {!readonly && (
                  <>
                    <button
                      onClick={() => handleRename(selectedConv.id, selectedConv.title)}
                      title="Rename"
                      className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <a
                      href={`/api/conversations/${selectedConv.id}/export`}
                      download
                      title="Download transcript"
                      className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    {canAssign && teamMembers.length > 0 && (
                      <select
                        value={localAssign[selectedConv.id] !== undefined ? (localAssign[selectedConv.id] ?? '') : (selectedConv.assigned_to ?? '')}
                        disabled={assigning}
                        onChange={e => handleAssign(selectedConv.id, e.target.value || null)}
                        title="Assign to team member"
                        className="text-xs border dark:border-white/10 rounded-lg px-2 py-1.5 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 disabled:opacity-50 max-w-[130px]"
                      >
                        <option value="">Assign to…</option>
                        {teamMembers.map(m => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
                      </select>
                    )}
                    <button
                      onClick={() => handleDelete(selectedConv.id)}
                      title="Delete"
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Tone indicator */}
            {selectedConv.sentiment && (
              <div className="shrink-0 flex justify-center py-2">
                <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase px-3 py-1 bg-white dark:bg-white/5 rounded-full border dark:border-white/8">
                  {selectedConv.sentiment} tone
                </span>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {loadingMsgs ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 text-[#15A4AE] animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <p className="text-sm text-gray-400">No messages in this conversation yet.</p>
                </div>
              ) : renderMessages()}
              <div ref={messagesEndRef} />
            </div>
          </>
        )}
      </div>

      {/* ── Right panel: conversation details ─────────────────────────────── */}
      <div className="w-[270px] shrink-0 border-l dark:border-white/8 overflow-y-auto bg-white dark:bg-[#1e1e1e] flex flex-col">
        {!selectedConv ? (
          <div className="flex items-center justify-center h-full text-center p-6">
            <p className="text-xs text-gray-400">Select a conversation to see details</p>
          </div>
        ) : (
          <div className="p-4 space-y-5">

            {/* Tags */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Tag className="w-3 h-3" /> Tags
              </p>
              {selectedConv.platform ? (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                <span className={`inline-flex text-xs px-2.5 py-0.5 rounded-full font-medium ${(PLATFORM_META as any)[selectedConv.platform]?.color ?? 'bg-gray-100 text-gray-500'}`}>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(PLATFORM_META as any)[selectedConv.platform]?.label ?? selectedConv.platform}
                </span>
              ) : (
                <p className="text-xs text-gray-400">No tags</p>
              )}
            </div>

            {/* AI Summary */}
            {selectedConv.ai_summary && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span className="text-[#15A4AE]">✦</span> AI Generated
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{selectedConv.ai_summary}</p>
              </div>
            )}

            <hr className="border-gray-100 dark:border-white/8" />

            {/* Conversation details */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Conversation Details</p>
              <div className="space-y-2">
                <DetailRow label="Tone"          value={selectedConv.sentiment ?? '—'} />
                <DetailRow label="Total Messages" value={String(selectedConv.message_count)} />
                <DetailRow label="Priority"       value={
                  <select
                    value={localPriority[selectedConv.id] ?? selectedConv.ai_priority ?? ''}
                    onChange={e => handlePriorityChange(selectedConv.id, e.target.value)}
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 ${
                      PRIORITY_BADGE[(localPriority[selectedConv.id] ?? selectedConv.ai_priority) || 'low'] ?? PRIORITY_BADGE.low
                    }`}
                    disabled={readonly}
                  >
                    <option value="">—</option>
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                  </select>
                } />
                <DetailRow label="Status" value={selectedConv.status ?? '—'} />
                <DetailRow label="Started On" value={formatDate(selectedConv.created_at)} />
                <DetailRow label="ID" value={`#${selectedConv.id.slice(0, 6)}`} />
              </div>
            </div>

            {/* Assign to */}
            {canAssign && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Assigned To</p>
                <select
                  value={localAssign[selectedConv.id] !== undefined ? (localAssign[selectedConv.id] ?? '') : (selectedConv.assigned_to ?? '')}
                  disabled={assigning}
                  onChange={e => handleAssign(selectedConv.id, e.target.value || null)}
                  className="w-full text-xs border dark:border-white/10 rounded-lg px-2 py-1.5 bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 disabled:opacity-50"
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map(m => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
                </select>
              </div>
            )}

            <hr className="border-gray-100 dark:border-white/8" />

            {/* User details */}
            {(selectedConv.ai_entities?.email || selectedConv.ai_entities?.phone || selectedConv.ai_entities?.name) && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">User Details</p>
                <div className="space-y-2">
                  {selectedConv.ai_entities?.name  && <DetailRow label="Name"  value={selectedConv.ai_entities.name} />}
                  {selectedConv.ai_entities?.email && <DetailRow label="Email" value={selectedConv.ai_entities.email} />}
                  {selectedConv.ai_entities?.phone && <DetailRow label="Phone" value={selectedConv.ai_entities.phone} />}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  )
}

// ── Detail row helper ─────────────────────────────────────────────────────────
function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-[11px] text-gray-400 shrink-0">{label}</span>
      {typeof value === 'string' ? (
        <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 text-right break-all">{value}</span>
      ) : value}
    </div>
  )
}
