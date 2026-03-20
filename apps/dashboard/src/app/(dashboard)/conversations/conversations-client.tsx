'use client'

import React, { useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  MessageSquare, Search, ChevronDown, Download,
  Pencil, ExternalLink, X, Trash2, Loader2,
} from 'lucide-react'
import { PLATFORM_META, timeAgo } from '@/lib/utils'
import { renameConversation, assignConversation, deleteConversation, updateConversationPriority, updateConversationStatus } from '@/app/actions/conversation'
import { deleteConversations } from '@/app/actions/bot-conversations'
import { exportConversations } from '@/app/actions/csv-export'
import { CsvExportButton } from '@/components/ui/csv-export-button'
import type { ConvRow, BotOption, ConvFilters, TeamMember } from './page'

// ── Constants ─────────────────────────────────────────────────────────────────
const PLATFORMS = ['slack', 'google_chat', 'facebook_messenger', 'whatsapp', 'wordpress', 'web_widget', 'shopify'] as const

const PRIORITY_BADGE: Record<string, string> = {
  high:   'bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/25',
  medium: 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-500/20',
  low:    'bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10',
}

const SENTIMENT_COLOR: Record<string, string> = {
  positive: 'text-green-500',
  neutral:  'text-gray-400',
  negative: 'text-red-500',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildUrl(base: string, filters: ConvFilters): string {
  const p = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => { if (v) p.set(k, v) })
  const qs = p.toString()
  return qs ? `${base}?${qs}` : base
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  conversations:    ConvRow[]
  bots:             BotOption[]
  filters:          ConvFilters
  showNewBotButton?: boolean
  teamMembers?:  TeamMember[]
  canAssign?:    boolean
  readonly?:     boolean
  statusCounts?: { active: number; completed: number; archived: number }
}

export function ConversationsClient({ conversations, bots, filters, teamMembers = [], canAssign = false, readonly = false, showNewBotButton = false, statusCounts }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [localAssign,    setLocalAssign]    = React.useState<Record<string, string | null>>({})
  const [selectedIds,    setSelectedIds]    = React.useState<Set<string>>(new Set())
  const [localPriority,  setLocalPriority]  = React.useState<Record<string, string>>({})
  const [localStatus,    setLocalStatus]    = React.useState<Record<string, string>>({})
  const [saving,         setSaving]         = React.useState<{ id: string; field: string } | null>(null)
  const [bulkSaving,     setBulkSaving]     = React.useState(false)

  const allSelected = conversations.length > 0 && selectedIds.size === conversations.length
  function toggleSelectAll() {
    setSelectedIds(allSelected ? new Set() : new Set(conversations.map(c => c.id)))
  }
  function toggleSelect(id: string) {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function handleBulkDelete() {
    if (!window.confirm(`Delete ${selectedIds.size} conversation(s)? This cannot be undone.`)) return
    const ids = [...selectedIds]
    startTransition(async () => {
      await deleteConversations(ids)
      setSelectedIds(new Set())
      router.refresh()
    })
  }

  async function handlePriorityChange(convId: string, priority: string) {
    setLocalPriority(prev => ({ ...prev, [convId]: priority }))
    setSaving({ id: convId, field: 'priority' })
    await updateConversationPriority(convId, priority)
    setSaving(null)
    router.refresh()
  }

  async function handleStatusChange(convId: string, status: string) {
    setLocalStatus(prev => ({ ...prev, [convId]: status }))
    setSaving({ id: convId, field: 'status' })
    await updateConversationStatus(convId, status)
    setSaving(null)
    router.refresh()
  }

  async function handleAssign(convId: string, userId: string | null) {
    setSaving({ id: convId, field: 'assign' })
    const result = await assignConversation(convId, userId)
    if (!result.error) setLocalAssign(prev => ({ ...prev, [convId]: userId }))
    setSaving(null)
    router.refresh()
  }

  const pushFilter = useCallback((patch: Partial<ConvFilters>) => {
    const next = { ...filters, ...patch }
    // Preserve preset/from/to from toolbar — only clear the conversation-specific filters
    Object.keys(next).forEach(k => { if (!next[k as keyof ConvFilters]) delete next[k as keyof ConvFilters] })
    router.push(buildUrl('/dashboard/bots', next))
  }, [filters, router])

  async function handleBulkPriorityChange(priority: string) {
    if (!priority || selectedIds.size === 0) return
    setBulkSaving(true)
    await Promise.all([...selectedIds].map(id => updateConversationPriority(id, priority)))
    setBulkSaving(false)
    setSelectedIds(new Set())
    router.refresh()
  }

  async function handleBulkStatusChange(status: string) {
    if (!status || selectedIds.size === 0) return
    setBulkSaving(true)
    await Promise.all([...selectedIds].map(id => updateConversationStatus(id, status)))
    setBulkSaving(false)
    setSelectedIds(new Set())
    router.refresh()
  }

  async function handleBulkAssignChange(userId: string) {
    if (selectedIds.size === 0) return
    setBulkSaving(true)
    await Promise.all([...selectedIds].map(id => assignConversation(id, userId || null)))
    setBulkSaving(false)
    setSelectedIds(new Set())
    router.refresh()
  }

  function handleDelete(id: string) {
    if (!window.confirm('Delete this conversation? This cannot be undone.')) return
    startTransition(async () => {
      await deleteConversation(id)
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

  const activePlatform = filters.platform ?? 'all'
  const activeBotId = filters.bot ?? ''
  const activeStatus = filters.status ?? ''

  return (
    <div className="space-y-5 p-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Conversations</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Permanent record of every bot conversation — {conversations.length} shown
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!readonly && selectedIds.size > 0 && (
            <>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete {selectedIds.size}
              </button>

              {/* Bulk priority */}
              <div className="relative">
                <select
                  defaultValue=""
                  disabled={bulkSaving}
                  onChange={e => { handleBulkPriorityChange(e.target.value); e.target.value = '' }}
                  className="appearance-none pl-3 pr-7 py-2 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 cursor-pointer disabled:opacity-50"
                >
                  <option value="" disabled>Priority</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>

              {/* Bulk status */}
              <div className="relative">
                <select
                  defaultValue=""
                  disabled={bulkSaving}
                  onChange={e => { handleBulkStatusChange(e.target.value); e.target.value = '' }}
                  className="appearance-none pl-3 pr-7 py-2 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 cursor-pointer disabled:opacity-50"
                >
                  <option value="" disabled>Status</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>

              {/* Bulk assign */}
              {canAssign && teamMembers.length > 0 && (
                <div className="relative">
                  <select
                    defaultValue=""
                    disabled={bulkSaving}
                    onChange={e => { handleBulkAssignChange(e.target.value); e.target.value = '' }}
                    className="appearance-none pl-3 pr-7 py-2 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 cursor-pointer disabled:opacity-50"
                  >
                    <option value="" disabled>Assign to</option>
                    <option value="">Unassign</option>
                    {teamMembers.map(m => (
                      <option key={m.user_id} value={m.user_id}>{m.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
              )}

              {bulkSaving && <Loader2 className="w-4 h-4 animate-spin text-[#15A4AE]" />}
            </>
          )}
          <CsvExportButton action={exportConversations} />
          {showNewBotButton && (
            <Link
              href="/bots/new"
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors"
            >
              + Bot
            </Link>
          )}
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-4 space-y-3">

        {/* Row 1: Search + Bot dropdown + Status */}
        <div className="flex flex-wrap gap-3 items-center">

          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              defaultValue={filters.q ?? ''}
              placeholder="Search conversations…"
              onKeyDown={e => { if (e.key === 'Enter') pushFilter({ q: (e.target as HTMLInputElement).value || undefined }) }}
              onBlur={e => { if (e.target.value !== (filters.q ?? '')) pushFilter({ q: e.target.value || undefined }) }}
              className="w-full pl-8 pr-3 py-2 text-sm border dark:border-white/10 rounded-lg bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40"
            />
            {filters.q && (
              <button onClick={() => pushFilter({ q: undefined })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Bot filter */}
          {bots.length > 1 && (
            <div className="relative">
              <select
                value={activeBotId}
                onChange={e => pushFilter({ bot: e.target.value || undefined })}
                className="appearance-none pl-3 pr-8 py-2 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 cursor-pointer"
              >
                <option value="">All bots</option>
                {bots.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          )}

          {/* Status filter */}
          <div className="flex items-center gap-1">
            {(['', 'active', 'completed', 'archived'] as const).map(s => {
              const count = statusCounts
                ? s === '' ? statusCounts.active + statusCounts.completed + statusCounts.archived
                : statusCounts[s]
                : null
              return (
                <button key={s}
                  onClick={() => pushFilter({ status: s || undefined })}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    activeStatus === s
                      ? 'bg-[#15A4AE]/15 dark:bg-[#15A4AE]/20 text-[#1f6157] dark:text-[#15A4AE] border border-[#15A4AE]/30'
                      : 'bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/12'
                  }`}>
                  {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                  {count !== null && <span className="ml-1 opacity-60">({count})</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* Row 2: Platform pills */}
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => pushFilter({ platform: undefined })}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activePlatform === 'all'
                ? 'bg-[#15A4AE]/15 dark:bg-[#15A4AE]/20 text-[#1f6157] dark:text-[#15A4AE] border border-[#15A4AE]/30'
                : 'bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/12'
            }`}>
            All platforms
          </button>
          {PLATFORMS.map(p => (
            <button key={p}
              onClick={() => pushFilter({ platform: p })}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activePlatform === p
                  ? 'bg-[#15A4AE] text-white'
                  : 'bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/12'
              }`}>
              {PLATFORM_META[p]?.label ?? p}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 overflow-x-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <MessageSquare className="w-10 h-10 text-gray-200 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-400">No conversations match your filters.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-white/8 bg-gray-50 dark:bg-white/[0.03]">
                {!readonly && (
                  <th className="px-4 py-3 w-px">
                    <input type="checkbox" checked={allSelected} onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 dark:border-white/20 accent-[#15A4AE] cursor-pointer" />
                  </th>
                )}
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Priority</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Conversation</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Bot</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Platform</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Msgs</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide w-[160px]">Last active</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                {canAssign && <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Assigned to</th>}
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide w-px whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-white/5">
              {conversations.map(c => {
                const contactName = c.ai_entities?.name ?? null
                const title = c.title ?? '(no title)'
                return (
                  <tr key={c.id} className={`transition-colors group ${selectedIds.has(c.id) ? 'bg-red-50 dark:bg-red-500/5' : 'hover:bg-gray-50 dark:hover:bg-white/[0.03]'}`}>
                    {!readonly && (
                      <td className="px-4 py-3.5 w-px">
                        <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleSelect(c.id)}
                          className="w-4 h-4 rounded border-gray-300 dark:border-white/20 accent-[#15A4AE] cursor-pointer" />
                      </td>
                    )}

                    {/* AI Priority */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        {!readonly ? (
                          <select
                            value={localPriority[c.id] ?? c.ai_priority ?? ''}
                            onChange={e => handlePriorityChange(c.id, e.target.value)}
                            onClick={e => e.stopPropagation()}
                            disabled={saving?.id === c.id && saving?.field === 'priority'}
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 disabled:opacity-60 ${PRIORITY_BADGE[(localPriority[c.id] ?? c.ai_priority) || 'low'] ?? PRIORITY_BADGE.low}`}
                          >
                            <option value="">—</option>
                            <option value="low">low</option>
                            <option value="medium">medium</option>
                            <option value="high">high</option>
                          </select>
                        ) : c.ai_priority ? (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${PRIORITY_BADGE[c.ai_priority] ?? PRIORITY_BADGE.low}`}>
                            {c.ai_priority}
                          </span>
                        ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                        {saving?.id === c.id && saving?.field === 'priority' && (
                          <Loader2 className="w-3 h-3 animate-spin text-[#15A4AE] shrink-0" />
                        )}
                      </div>
                    </td>

                    {/* Conversation title + contact name */}
                    <td className="px-5 py-3.5 max-w-[220px]">
                      <Link href={`/conversations/${c.id}`}
                        className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-[#15A4AE] transition-colors truncate block">
                        {title}
                      </Link>
                      {contactName && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{contactName}</p>
                      )}
                    </td>

                    {/* Bot name */}
                    <td className="px-4 py-3.5 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {c.bots?.name ?? '—'}
                    </td>

                    {/* Platform */}
                    <td className="px-4 py-3.5">
                      {c.platform ? (
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${(PLATFORM_META as any)[c.platform]?.color ?? 'bg-gray-100 text-gray-500'}`}>
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          {(PLATFORM_META as any)[c.platform]?.label ?? c.platform}
                        </span>
                      ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>

                    {/* Message count */}
                    <td className="px-4 py-3.5 text-right text-sm text-gray-500 dark:text-gray-400">
                      {c.message_count}
                    </td>

                    {/* Last active */}
                    <td className="px-4 py-3.5 text-right text-xs text-gray-400 whitespace-nowrap w-[160px]">
                      {timeAgo(c.last_activity_at)}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        {!readonly ? (
                          <select
                            value={localStatus[c.id] ?? c.status ?? 'active'}
                            onChange={e => handleStatusChange(c.id, e.target.value)}
                            onClick={e => e.stopPropagation()}
                            disabled={saving?.id === c.id && saving?.field === 'status'}
                            className="text-xs border dark:border-white/10 rounded-lg px-2 py-1 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 cursor-pointer disabled:opacity-60"
                          >
                            <option value="active">Active</option>
                            <option value="completed">Completed</option>
                            <option value="archived">Archived</option>
                          </select>
                        ) : (
                          <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{c.status ?? 'active'}</span>
                        )}
                        {saving?.id === c.id && saving?.field === 'status' && (
                          <Loader2 className="w-3 h-3 animate-spin text-[#15A4AE] shrink-0" />
                        )}
                      </div>
                    </td>

                    {/* Assign to */}
                    {canAssign && (
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          <select
                            value={localAssign[c.id] !== undefined ? (localAssign[c.id] ?? '') : (c.assigned_to ?? '')}
                            disabled={saving?.id === c.id && saving?.field === 'assign'}
                            onChange={e => handleAssign(c.id, e.target.value || null)}
                            className="text-xs border dark:border-white/10 rounded-lg px-2 py-1 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 disabled:opacity-50 max-w-[130px]"
                          >
                            <option value="">Unassigned</option>
                            {teamMembers.map(m => (
                              <option key={m.user_id} value={m.user_id}>{m.name}</option>
                            ))}
                          </select>
                          {saving?.id === c.id && saving?.field === 'assign' && (
                            <Loader2 className="w-3 h-3 animate-spin text-[#15A4AE] shrink-0" />
                          )}
                        </div>
                      </td>
                    )}

                    {/* Actions: view, rename, download, delete */}
                    <td className="px-5 py-3.5 w-px whitespace-nowrap">
                      <div className="flex items-center gap-1 justify-end">
                        <Link href={`/conversations/${c.id}`}
                          title="View full transcript"
                          className="p-1.5 text-gray-400 hover:text-[#15A4AE] hover:bg-[#15A4AE]/10 rounded-lg transition-colors">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        {!readonly && (
                          <button
                            onClick={() => handleRename(c.id, c.title)}
                            title="Rename"
                            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {!readonly && (
                          <a href={`/api/conversations/${c.id}/export`} download
                            title="Download transcript"
                            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors">
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {!readonly && (
                          <button
                            onClick={() => handleDelete(c.id)}
                            title="Delete conversation"
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>

                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {conversations.length === 150 && (
        <p className="text-xs text-center text-gray-400 pb-2">
          Showing first 150 results — use filters to narrow down.
        </p>
      )}
    </div>
  )
}
