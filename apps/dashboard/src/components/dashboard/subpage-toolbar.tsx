'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { LayoutDashboard, ChevronRight, ChevronDown, Zap } from 'lucide-react'
import { updateAutoSetting, type AutoSettings } from '@/app/actions/sage-auto-settings'

export type SubpagePreset = 'all' | 'today' | 'yesterday' | '7d' | '30d' | 'custom'
export type SubpageSource = 'email' | 'bots' | 'forms' | 'tickets'

interface Props {
  title:       string
  sourceKey:   SubpageSource
  preset:      SubpagePreset
  autoEnabled: boolean    // per-source setting from DB
  customFrom?: string     // YYYY-MM-DD from URL
  customTo?:   string     // YYYY-MM-DD from URL
}

const PRESETS: { value: SubpagePreset; label: string }[] = [
  { value: 'all',       label: 'All time'      },
  { value: 'today',     label: 'Today'         },
  { value: 'yesterday', label: 'Yesterday'     },
  { value: '7d',        label: 'Last 7 days'   },
  { value: '30d',       label: 'Last 30 days'  },
  { value: 'custom',    label: 'Date range...' },
]

const SOURCE_LABEL: Record<SubpageSource, string> = {
  email:   'emails',
  bots:    'bot conversations',
  forms:   'form submissions',
  tickets: 'tickets',
}

const SOURCE_FIELD: Record<SubpageSource, keyof AutoSettings> = {
  email:   'email_auto_enabled',
  bots:    'bots_auto_enabled',
  forms:   'forms_auto_enabled',
  tickets: 'tickets_auto_enabled',
}

export function SubpageToolbar({ title, sourceKey, preset, autoEnabled, customFrom, customTo }: Props) {
  const router   = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()
  const [localAuto, setLocalAuto] = useState(autoEnabled)
  const [fromDate, setFromDate]   = useState(customFrom ?? '')
  const [toDate,   setToDate]     = useState(customTo   ?? '')

  // Sync when server re-renders with updated prop
  useEffect(() => { setLocalAuto(autoEnabled) }, [autoEnabled])

  useEffect(() => {
    setFromDate(customFrom ?? '')
    setToDate(customTo   ?? '')
  }, [customFrom, customTo])

  const toggleAuto = async () => {
    const next = !localAuto
    setLocalAuto(next)  // optimistic
    await updateAutoSetting(SOURCE_FIELD[sourceKey], next)
    router.refresh()
  }

  const handlePresetChange = (value: SubpagePreset) => {
    if (value === 'custom') {
      startTransition(() => router.push(`${pathname}?preset=custom`))
      return
    }
    startTransition(() => {
      router.push(value === 'all' ? pathname : `${pathname}?preset=${value}`)
    })
  }

  const applyCustomRange = () => {
    if (!fromDate || !toDate) return
    startTransition(() => {
      router.push(`${pathname}?preset=custom&from=${fromDate}&to=${toDate}`)
    })
  }

  return (
    <nav className="px-6 py-2.5 border-b dark:border-white/8 bg-white dark:bg-[#1c1c1c] flex items-center justify-between shrink-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          Overview
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2.5">
        {/* Date preset + optional custom range inputs */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={preset}
              onChange={e => handlePresetChange(e.target.value as SubpagePreset)}
              className="appearance-none bg-gray-50 dark:bg-[#232323] border border-gray-200 dark:border-white/10 text-xs text-gray-600 dark:text-gray-300 rounded-lg pl-2.5 pr-6 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#61c2ad]/40 cursor-pointer"
            >
              {PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
          </div>

          {preset === 'custom' && (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="bg-gray-50 dark:bg-[#232323] border border-gray-200 dark:border-white/10 text-xs text-gray-600 dark:text-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#61c2ad]/40"
              />
              <span className="text-xs text-gray-400">→</span>
              <input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={e => setToDate(e.target.value)}
                className="bg-gray-50 dark:bg-[#232323] border border-gray-200 dark:border-white/10 text-xs text-gray-600 dark:text-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#61c2ad]/40"
              />
              <button
                onClick={applyCustomRange}
                disabled={!fromDate || !toDate}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-[#61c2ad]/10 text-[#3a9e8a] dark:text-[#61c2ad] border border-[#61c2ad]/25 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#61c2ad]/20 transition-colors"
              >
                Apply
              </button>
            </div>
          )}
        </div>

        {/* Per-source Sage Auto toggle */}
        <button
          onClick={toggleAuto}
          title={
            localAuto
              ? `Sage Auto ON — AI auto-processes ${SOURCE_LABEL[sourceKey]} into pipeline. Click to require manual review.`
              : `Sage Auto OFF — ${SOURCE_LABEL[sourceKey]} require manual review. Click to enable auto-processing.`
          }
          className={[
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all',
            localAuto
              ? 'bg-[#61c2ad]/8 dark:bg-[#61c2ad]/10 border-[#61c2ad]/25 text-[#3a9e8a] dark:text-[#61c2ad]'
              : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-400 dark:text-gray-500',
          ].join(' ')}
        >
          <Zap className={`w-3 h-3 ${localAuto ? 'text-[#61c2ad]' : 'text-gray-400'}`} />
          <span>Auto</span>
          <span className="font-bold">{localAuto ? 'ON' : 'OFF'}</span>
        </button>
      </div>
    </nav>
  )
}
