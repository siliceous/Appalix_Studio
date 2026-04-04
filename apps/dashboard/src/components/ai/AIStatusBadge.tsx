'use client'

import { RefreshCw } from 'lucide-react'
import { timeAgo } from '@/lib/utils'

interface AIStatusBadgeProps {
  lastReviewedAt: string | null
  isUpdating: boolean
  onRefresh?: () => void
}

export function AIStatusBadge({ lastReviewedAt, isUpdating, onRefresh }: AIStatusBadgeProps) {
  if (isUpdating) {
    return (
      <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
        <RefreshCw className="w-3 h-3 animate-spin" />
        AI updating…
      </span>
    )
  }

  if (!lastReviewedAt) return null

  return (
    <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
      <span className="w-1.5 h-1.5 rounded-full bg-[#15A4AE]" />
      Sage reviewed {timeAgo(lastReviewedAt)}
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="ml-1 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          title="Refresh AI review"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      )}
    </span>
  )
}
