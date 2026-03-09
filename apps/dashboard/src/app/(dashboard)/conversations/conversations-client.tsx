'use client'

import React, { useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  MessageSquare, Search, ChevronDown, Download,
  Pencil, ExternalLink, X,
} from 'lucide-react'
import { PLATFORM_META, timeAgo } from '@/lib/utils'
import { renameConversation } from '@/app/actions/conversation'
import type { ConvRow, BotOption, ConvFilters } from './page'

// ── Constants ─────────────────────────────────────────────────────────────────
const PLATFORMS = ['slack', 'google_chat', 'facebook_messenger', 'whatsapp', 'wordpress', 'web_widget'] as const

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
  conversations: ConvRow[]
  bots: BotOption[]
  filters: ConvFilters
}

export function ConversationsClient({ conversations, bots, filters }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const pushFilter = useCallback((patch: Partial<ConvFilters>) => {
    const next = { ...filters, ...patch }
    // Preserve preset/from/to from toolbar — only clear the conversation-specific filters
    Object.keys(next).forEach(k => { if (!next[k as keyof ConvFilters]) delete next[k as keyof ConvFilters] })
    router.push(buildUrl('/conversations', next))
  }, [filters, router])

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
    <div className="max-w-6xl mx-auto space-y-5 p-8">

      {/* ── Header ── */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Conversations</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Permanent record of every bot conversation — {conversations.length} shown
        </p>
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
              className="w-full pl-8 pr-3 py-2 text-sm border dark:border-white/10 rounded-lg bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#61c2ad]/40"
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
                className="appearance-none pl-3 pr-8 py-2 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#61c2ad]/40 cursor-pointer"
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
            {(['', 'active', 'completed', 'archived'] as const).map(s => (
              <button key={s}
                onClick={() => pushFilter({ status: s || undefined })}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  activeStatus === s
                    ? 'bg-[#61c2ad] text-white'
                    : 'bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/12'
                }`}>
                {s === '' ? 'All status' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Platform pills */}
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => pushFilter({ platform: undefined })}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activePlatform === 'all'
                ? 'bg-[#61c2ad] text-white'
                : 'bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/12'
            }`}>
            All platforms
          </button>
          {PLATFORMS.map(p => (
            <button key={p}
              onClick={() => pushFilter({ platform: p })}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activePlatform === p
                  ? 'bg-[#61c2ad] text-white'
                  : 'bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/12'
              }`}>
              {PLATFORM_META[p]?.label ?? p}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 overflow-hidden">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <MessageSquare className="w-10 h-10 text-gray-200 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-400">No conversations match your filters.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-white/8 bg-gray-50 dark:bg-white/[0.03]">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Conversation</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Bot</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Platform</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Priority</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Summary</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Msgs</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Last active</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-white/5">
              {conversations.map(c => {
                const contactName = c.ai_entities?.name ?? null
                const title = c.title ?? '(no title)'
                return (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors group">

                    {/* Conversation title + contact name */}
                    <td className="px-5 py-3.5 max-w-[220px]">
                      <Link href={`/conversations/${c.id}`}
                        className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-[#61c2ad] transition-colors truncate block">
                        {c.sentiment && (
                          <span className={`mr-1.5 text-xs ${SENTIMENT_COLOR[c.sentiment] ?? ''}`}>●</span>
                        )}
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

                    {/* AI Priority */}
                    <td className="px-4 py-3.5">
                      {c.ai_priority ? (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${PRIORITY_BADGE[c.ai_priority] ?? PRIORITY_BADGE.low}`}>
                          {c.ai_priority}
                        </span>
                      ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>

                    {/* AI Summary excerpt */}
                    <td className="px-4 py-3.5 max-w-[280px]">
                      {c.ai_summary ? (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={c.ai_summary}>
                          {c.ai_summary.length > 90 ? c.ai_summary.slice(0, 90) + '…' : c.ai_summary}
                        </p>
                      ) : <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>}
                    </td>

                    {/* Message count */}
                    <td className="px-4 py-3.5 text-right text-sm text-gray-500 dark:text-gray-400">
                      {c.message_count}
                    </td>

                    {/* Last active */}
                    <td className="px-4 py-3.5 text-right text-xs text-gray-400 whitespace-nowrap">
                      {timeAgo(c.last_activity_at)}
                    </td>

                    {/* Actions: view, rename, download */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/conversations/${c.id}`}
                          title="View full transcript"
                          className="p-1.5 text-gray-400 hover:text-[#61c2ad] hover:bg-[#61c2ad]/10 rounded-lg transition-colors">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => handleRename(c.id, c.title)}
                          title="Rename"
                          className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <a href={`/api/conversations/${c.id}/export`} download
                          title="Download transcript"
                          className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors">
                          <Download className="w-3.5 h-3.5" />
                        </a>
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
