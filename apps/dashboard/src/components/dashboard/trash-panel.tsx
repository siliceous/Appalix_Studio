'use client'

import React, { useState, useTransition } from 'react'
import { Trash2, RotateCcw, X, Loader2 } from 'lucide-react'
import type { TrashItem } from '@/app/actions/trash'
import {
  restoreSubmission, restoreConversation, restoreTicket,
  permanentDeleteSubmission, permanentDeleteConversation, permanentDeleteTicket,
} from '@/app/actions/trash'
import { useRouter } from 'next/navigation'

interface Props {
  items:   TrashItem[]
  type:    'conversation' | 'submission' | 'ticket'
  onClose: () => void
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const DAYS_COLOR: Record<number, string> = {
  0: 'bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20',
  1: 'bg-orange-100 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/20',
  2: 'bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
  3: 'bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/10',
}

export function TrashPanel({ items, type, onClose }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [localItems, setLocalItems] = useState<TrashItem[]>(items)
  const [loading, setLoading] = useState<Record<string, 'restore' | 'delete'>>({})

  const typeLabel = type === 'conversation' ? 'conversation' : type === 'submission' ? 'form submission' : 'ticket'

  async function handleRestore(id: string) {
    setLoading(p => ({ ...p, [id]: 'restore' }))
    let res: { error?: string }
    if (type === 'conversation') res = await restoreConversation(id)
    else if (type === 'submission') res = await restoreSubmission(id)
    else res = await restoreTicket(id)
    setLoading(p => { const n = { ...p }; delete n[id]; return n })
    if (res.error) { alert(res.error); return }
    setLocalItems(prev => prev.filter(i => i.id !== id))
    startTransition(() => router.refresh())
  }

  async function handlePermanentDelete(id: string) {
    if (!confirm('Permanently delete this item? This cannot be undone.')) return
    setLoading(p => ({ ...p, [id]: 'delete' }))
    let res: { error?: string }
    if (type === 'conversation') res = await permanentDeleteConversation(id)
    else if (type === 'submission') res = await permanentDeleteSubmission(id)
    else res = await permanentDeleteTicket(id)
    setLoading(p => { const n = { ...p }; delete n[id]; return n })
    if (res.error) { alert(res.error); return }
    setLocalItems(prev => prev.filter(i => i.id !== id))
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b dark:border-white/8 shrink-0">
        <Trash2 className="w-4 h-4 text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex-1">
          Trash — {typeLabel}s
        </h2>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Note */}
      <div className="px-4 py-2 bg-amber-50 dark:bg-amber-500/8 border-b border-amber-100 dark:border-amber-500/15 shrink-0">
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Items are permanently deleted after 3 days. Restore to recover them.
        </p>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {localItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center">
            <Trash2 className="w-8 h-8 text-gray-200 dark:text-gray-700 mb-3" />
            <p className="text-sm text-gray-400 dark:text-gray-500">Trash is empty</p>
          </div>
        ) : (
          <div className="divide-y dark:divide-white/6">
            {localItems.map(item => {
              const op = loading[item.id]
              const daysColor = DAYS_COLOR[Math.min(item.days_left, 3)] ?? DAYS_COLOR[3]
              return (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                      {item.name ?? '(no name)'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">Deleted {timeAgo(item.deleted_at)}</p>
                  </div>
                  <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${daysColor}`}>
                    {item.days_left === 0 ? 'expires today' : `${item.days_left}d left`}
                  </span>
                  <button
                    onClick={() => handleRestore(item.id)}
                    disabled={!!op}
                    title="Restore"
                    className="shrink-0 p-1.5 rounded-lg text-[#15A4AE] hover:bg-[#15A4AE]/10 transition-colors disabled:opacity-40"
                  >
                    {op === 'restore' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => handlePermanentDelete(item.id)}
                    disabled={!!op}
                    title="Delete forever"
                    className="shrink-0 p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-40"
                  >
                    {op === 'delete' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
