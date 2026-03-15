'use client'

import React, { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { LayoutDashboard, ChevronDown, Zap, Mail, MessageSquare, FileText, Ticket as TicketIcon } from 'lucide-react'
import { updateAutoSetting, type AutoSettings } from '@/app/actions/sage-auto-settings'

export type SubpagePreset = 'all' | 'today' | 'yesterday' | '7d' | '30d' | 'custom'
export type SubpageSource = 'email' | 'bots' | 'forms' | 'tickets'

interface Props {
  sourceKey:    SubpageSource
  preset:       SubpagePreset
  autoEnabled:  boolean    // per-source setting from DB
  customFrom?:  string     // YYYY-MM-DD from URL
  customTo?:    string     // YYYY-MM-DD from URL
  viewAsUserId?: string | null  // when a senior is viewing a junior
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

const BASE_HREFS: Record<SubpageSource, string> = {
  email:   '/dashboard/email',
  bots:    '/dashboard/bots',
  forms:   '/dashboard/forms',
  tickets: '/dashboard/tickets',
}

export function SubpageToolbar({ sourceKey, preset, autoEnabled, customFrom, customTo, viewAsUserId }: Props) {
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

  // Build URL preserving viewAs
  const buildUrl = (base: string, extra?: Record<string, string>) => {
    const url = new URL(base, 'http://x')
    if (viewAsUserId) url.searchParams.set('viewAs', viewAsUserId)
    if (extra) for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v)
    return url.pathname + (url.search !== '?' ? url.search : '')
  }

  const toggleAuto = async () => {
    const next = !localAuto
    setLocalAuto(next)  // optimistic
    await updateAutoSetting(SOURCE_FIELD[sourceKey], next)
    router.refresh()
  }

  const handlePresetChange = (value: SubpagePreset) => {
    if (value === 'custom') {
      startTransition(() => router.push(buildUrl(pathname, { preset: 'custom' })))
      return
    }
    startTransition(() => {
      router.push(value === 'all' ? buildUrl(pathname) : buildUrl(pathname, { preset: value }))
    })
  }

  const applyCustomRange = () => {
    if (!fromDate || !toDate) return
    startTransition(() => {
      router.push(buildUrl(pathname, { preset: 'custom', from: fromDate, to: toDate }))
    })
  }

  const PAGES: { key: SubpageSource; label: string; Icon: React.ElementType; activeCls: string; hoverCls: string }[] = [
    { key: 'email',   label: 'Email',   Icon: Mail,          activeCls: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-500/20 dark:text-blue-200 dark:border-blue-500/40',    hoverCls: 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/6 hover:text-blue-600 dark:hover:text-blue-400' },
    { key: 'bots',    label: 'Bots',    Icon: MessageSquare, activeCls: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-500/20 dark:text-purple-200 dark:border-purple-500/40', hoverCls: 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/6 hover:text-purple-600 dark:hover:text-purple-400' },
    { key: 'forms',   label: 'Forms',   Icon: FileText,      activeCls: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-500/20 dark:text-green-200 dark:border-green-500/40',   hoverCls: 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/6 hover:text-green-600 dark:hover:text-green-400' },
    { key: 'tickets', label: 'Tickets', Icon: TicketIcon,    activeCls: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-500/20 dark:text-orange-200 dark:border-orange-500/40', hoverCls: 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/6 hover:text-orange-600 dark:hover:text-orange-400' },
  ]

  return (
    <nav className="px-4 border-b dark:border-white/8 bg-white dark:bg-[#1c1c1c] grid grid-cols-[1fr_auto] items-end shrink-0 gap-x-4 min-h-[52px] pb-2">
      {/* Overview link + page pill buttons */}
      <div className="flex items-end gap-1.5 min-w-0 overflow-x-auto">
        <Link
          href={viewAsUserId ? `/dashboard?viewAs=${viewAsUserId}` : '/dashboard'}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors shrink-0 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/6 mr-0.5"
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Overview</span>
        </Link>
        <div className="w-px h-5 bg-gray-200 dark:bg-white/10 self-center" />
        {/* Sibling page pill buttons — carry viewAs when set */}
        {PAGES.map(p => (
          <Link
            key={p.key}
            href={viewAsUserId ? `${BASE_HREFS[p.key]}?viewAs=${viewAsUserId}` : BASE_HREFS[p.key]}
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
      <div className="flex items-end gap-2.5">
        {/* Date preset + optional custom range inputs */}
        <div className="flex items-end gap-2">
          <div className="relative">
            <select
              value={preset}
              onChange={e => handlePresetChange(e.target.value as SubpagePreset)}
              className="appearance-none bg-gray-50 dark:bg-[#232323] border border-gray-200 dark:border-white/10 text-xs text-gray-600 dark:text-gray-300 rounded-lg pl-2.5 pr-6 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/40 cursor-pointer"
            >
              {PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
          </div>

          {preset === 'custom' && (
            <div className="flex items-end gap-1.5">
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="bg-gray-50 dark:bg-[#232323] border border-gray-200 dark:border-white/10 text-xs text-gray-600 dark:text-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/40"
              />
              <span className="text-xs text-gray-400">→</span>
              <input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={e => setToDate(e.target.value)}
                className="bg-gray-50 dark:bg-[#232323] border border-gray-200 dark:border-white/10 text-xs text-gray-600 dark:text-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/40"
              />
              <button
                onClick={applyCustomRange}
                disabled={!fromDate || !toDate}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-[#15A4AE]/10 text-[#3a9e8a] dark:text-[#15A4AE] border border-[#15A4AE]/25 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#15A4AE]/20 transition-colors"
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
              ? `Auto ON — AI automatically processes ${SOURCE_LABEL[sourceKey]} and updates the pipeline. Click to switch to manual review.`
              : `Auto OFF — ${SOURCE_LABEL[sourceKey]} require manual review before creating contacts or deals. Click to enable automation.`
          }
          className={[
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all',
            localAuto
              ? 'bg-[#15A4AE]/8 dark:bg-[#15A4AE]/10 border-[#15A4AE]/25 text-[#3a9e8a] dark:text-[#15A4AE]'
              : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-400 dark:text-gray-500',
          ].join(' ')}
        >
          <Zap className={`w-3 h-3 ${localAuto ? 'text-[#15A4AE]' : 'text-gray-400'}`} />
          <span>Auto</span>
          <span className="font-bold">{localAuto ? 'ON' : 'OFF'}</span>
        </button>
      </div>
    </nav>
  )
}
