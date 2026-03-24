'use client'

import React, { useEffect, useState, useTransition } from 'react'
import { RotateCcw, X, Loader2, Trash2 } from 'lucide-react'
import { fetchTrash, restoreSubmission, restoreConversation, restoreTicket, permanentDeleteSubmission, permanentDeleteConversation, permanentDeleteTicket } from '@/app/actions/trash'
import type { TrashItem } from '@/app/actions/trash'
import { useRouter } from 'next/navigation'

interface Props {
  type: 'conversation' | 'submission' | 'ticket'
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

export function TrashTab({ type }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [items,   setItems]   = useState<TrashItem[]>([])
  const [loading, setLoading] = useState(true)
  const [ops,     setOps]     = useState<Record<string, 'restore' | 'delete'>>({})

  useEffect(() => {
    fetchTrash(type).then(data => { setItems(data); setLoading(false) })
  }, [type])

  async function handleRestore(id: string) {
    setOps(p => ({ ...p, [id]: 'restore' }))
    let res: { error?: string }
    if (type === 'conversation') res = await restoreConversation(id)
    else if (type === 'submission') res = await restoreSubmission(id)
    else res = await restoreTicket(id)
    setOps(p => { const n = { ...p }; delete n[id]; return n })
    if (res.error) { alert(res.error); return }
    setItems(prev => prev.filter(i => i.id !== id))
    startTransition(() => router.refresh())
  }

  async function handlePermanentDelete(id: string) {
    if (!confirm('Permanently delete? This cannot be undone.')) return
    setOps(p => ({ ...p, [id]: 'delete' }))
    let res: { error?: string }
    if (type === 'conversation') res = await permanentDeleteConversation(id)
    else if (type === 'submission') res = await permanentDeleteSubmission(id)
    else res = await permanentDeleteTicket(id)
    setOps(p => { const n = { ...p }; delete n[id]; return n })
    if (res.error) { alert(res.error); return }
    setItems(prev => prev.filter(i => i.id !== id))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 overflow-hidden">
      {/* Banner */}
      <div className="px-4 py-2.5 bg-amber-50 dark:bg-amber-500/8 border-b border-amber-100 dark:border-amber-500/15 flex items-center gap-2">
        <Trash2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Items are permanently deleted after 3 days. Restore to recover them.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Trash2 className="w-10 h-10 text-gray-200 dark:text-gray-600 mb-3" />
          <p className="text-sm text-gray-400">Trash is empty</p>
        </div>
      ) : (
        <div className="divide-y dark:divide-white/6">
          {items.map(item => {
            const op = ops[item.id]
            const daysColor = DAYS_COLOR[Math.min(item.days_left, 3)] ?? DAYS_COLOR[3]
            return (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors">
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
                  className="shrink-0 flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-[#15A4AE] border border-[#15A4AE]/30 hover:bg-[#15A4AE]/8 transition-colors disabled:opacity-40"
                >
                  {op === 'restore' ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                  Restore
                </button>
                <button
                  onClick={() => handlePermanentDelete(item.id)}
                  disabled={!!op}
                  title="Delete forever"
                  className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-40"
                >
                  {op === 'delete' ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
