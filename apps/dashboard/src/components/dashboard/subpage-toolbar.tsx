'use client'

import React, { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { LayoutDashboard, ChevronDown, Zap, Mail, MessageSquare, FileText, Ticket as TicketIcon } from 'lucide-react'
import { updateAutoSetting, type AutoSettings } from '@/app/actions/sage-auto-settings'

export type SubpagePreset = 'all' | 'today' | 'yesterday' | '7d' | '30d' | 'custom'
export type SubpageSource = 'email' | 'bots' | 'forms' | 'tickets'

interface Props {
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

export function SubpageToolbar({ sourceKey, preset, autoEnabled, customFrom, customTo }: Props) {
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

  const PAGES: { key: SubpageSource; label: string; href: string; Icon: React.ElementType; activeCls: string; hoverCls: string }[] = [
    { key: 'email',   label: 'Email',   href: '/dashboard/email',   Icon: Mail,          activeCls: 'bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-500/12 dark:text-blue-300 dark:border-blue-500/25',    hoverCls: 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/6 hover:text-blue-600 dark:hover:text-blue-400' },
    { key: 'bots',    label: 'Bots',    href: '/dashboard/bots',    Icon: MessageSquare, activeCls: 'bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-500/12 dark:text-purple-300 dark:border-purple-500/25', hoverCls: 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/6 hover:text-purple-600 dark:hover:text-purple-400' },
    { key: 'forms',   label: 'Forms',   href: '/dashboard/forms',   Icon: FileText,      activeCls: 'bg-green-50 text-green-700 border-green-200/80 dark:bg-green-500/12 dark:text-green-300 dark:border-green-500/25',   hoverCls: 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/6 hover:text-green-600 dark:hover:text-green-400' },
    { key: 'tickets', label: 'Tickets', href: '/dashboard/tickets', Icon: TicketIcon,    activeCls: 'bg-orange-50 text-orange-700 border-orange-200/80 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/30', hoverCls: 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/6 hover:text-orange-600 dark:hover:text-orange-400' },
  ]

  return (
    <nav className="px-4 border-b dark:border-white/8 bg-white dark:bg-[#1c1c1c] flex items-center justify-between shrink-0 gap-4 min-h-[52px]">
      {/* Overview link + page pill buttons */}
      <div className="flex items-center gap-1.5">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors shrink-0 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/6 mr-0.5"
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Overview</span>
        </Link>
        <div className="w-px h-5 bg-gray-200 dark:bg-white/10" />
        {/* Sibling page pill buttons */}
        {PAGES.map(p => (
          <Link
            key={p.key}
            href={p.href}
            className={[
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border transition-colors whitespace-nowrap',
              sourceKey === p.key
                ? p.activeCls
                : `border-transparent ${p.hoverCls}`,
            ].join(' ')}
          >
            <p.Icon className="w-3.5 h-3.5 shrink-0" />
            {p.label}
          </Link>
        ))}
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
