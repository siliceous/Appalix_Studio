'use client'

import React, { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { TrashPanel } from './trash-panel'
import { fetchTrash } from '@/app/actions/trash'
import type { TrashItem } from '@/app/actions/trash'

interface Props {
  type:  'conversation' | 'submission' | 'ticket'
  count: number
}

export function TrashButton({ type, count }: Props) {
  const [open,    setOpen]    = useState(false)
  const [items,   setItems]   = useState<TrashItem[]>([])
  const [loading, setLoading] = useState(false)

  async function handleOpen() {
    setLoading(true)
    const data = await fetchTrash(type)
    setItems(data)
    setLoading(false)
    setOpen(true)
  }

  return (
    <>
      <button
        onClick={handleOpen}
        disabled={loading}
        className="relative flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8 rounded-lg border border-gray-200 dark:border-white/10 transition-colors disabled:opacity-60"
        title="Deleted items (recovered within 3 days)"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Trash
        {count > 0 && (
          <span className="ml-0.5 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#232323] rounded-2xl border dark:border-white/8 shadow-2xl w-full max-w-lg flex flex-col" style={{ maxHeight: '80vh' }}>
            <TrashPanel items={items} type={type} onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}
