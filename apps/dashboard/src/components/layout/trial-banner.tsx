'use client'

import Link from 'next/link'
import { Sparkles, X } from 'lucide-react'
import { useState } from 'react'

interface Props {
  trialEndsAt: string
}

function daysLeft(trialEndsAt: string): number {
  const ms = new Date(trialEndsAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

export function TrialBanner({ trialEndsAt }: Props) {
  const [dismissed, setDismissed] = useState(false)
  const days = daysLeft(trialEndsAt)

  if (dismissed || days <= 0) return null

  const urgency = days <= 2

  return (
    <div className={`
      flex items-center justify-between gap-3 px-4 py-2 text-xs font-medium
      ${urgency
        ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 border-b border-amber-200 dark:border-amber-500/20'
        : 'bg-brand-50 dark:bg-[#15A4AE]/10 text-brand-800 dark:text-brand-300 border-b border-brand-100 dark:border-[#15A4AE]/20'
      }
    `}>
      <div className="flex items-center gap-2 min-w-0">
        <Sparkles className="w-3.5 h-3.5 shrink-0" />
        <span>
          {urgency
            ? `Your free trial ends in ${days} day${days === 1 ? '' : 's'} — all Pro features are currently active.`
            : `You're on a 14-day free trial. ${days} day${days === 1 ? '' : 's'} remaining with full Pro access.`
          }
        </span>
        <Link
          href="/settings/upgrade"
          className="shrink-0 underline underline-offset-2 hover:opacity-80 transition-opacity"
        >
          Choose a plan →
        </Link>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
