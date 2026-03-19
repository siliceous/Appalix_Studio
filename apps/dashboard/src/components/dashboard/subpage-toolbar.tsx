'use client'

import React, { useState, useEffect, useTransition, useRef } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { LayoutDashboard, ChevronDown, Zap, Mail, MessageSquare, FileText, Ticket as TicketIcon, Calendar, Loader2 } from 'lucide-react'
import { updateAutoSetting, type AutoSettings } from '@/app/actions/sage-auto-settings'

export type SubpagePreset = 'all' | 'today' | 'yesterday' | '7d' | '30d' | 'custom'
export type SubpageSource = 'email' | 'bots' | 'forms' | 'tickets'

interface TeamMemberOption { user_id: string; name: string; email?: string }

interface Props {
  sourceKey:    SubpageSource
  preset:       SubpagePreset
  autoEnabled:  boolean    // per-source setting from DB
  customFrom?:  string     // YYYY-MM-DD from URL
  customTo?:    string     // YYYY-MM-DD from URL
  viewAsUserId?: string | null  // when a senior is viewing a junior
  teamMembers?:  TeamMemberOption[]  // managers+ only — for "My view" picker
}


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

export function SubpageToolbar({ sourceKey, preset, autoEnabled, customFrom, customTo, viewAsUserId, teamMembers }: Props) {
  const router   = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()
  const [localAuto,   setLocalAuto]   = useState(autoEnabled)
  const [fromDate,    setFromDate]    = useState(customFrom ?? '')
  const [toDate,      setToDate]      = useState(customTo   ?? '')
  const [showCal,     setShowCal]     = useState(false)
  const [loadingKey,  setLoadingKey]  = useState<SubpageSource | null>(null)
  const calRef = useRef<HTMLDivElement>(null)

  // Clear loading state once navigation settles
  useEffect(() => { setLoadingKey(null) }, [pathname])

  // Sync when server re-renders with updated prop
  useEffect(() => { setLocalAuto(autoEnabled) }, [autoEnabled])

  useEffect(() => {
    setFromDate(customFrom ?? '')
    setToDate(customTo   ?? '')
  }, [customFrom, customTo])

  // Close calendar on outside click
  useEffect(() => {
    if (!showCal) return
    const handler = (e: MouseEvent) => {
      if (calRef.current && !calRef.current.contains(e.target as Node)) setShowCal(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showCal])

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

  const ACTIVE_CLS = 'bg-[#15A4AE]/15 text-[#1f6157] border-[#15A4AE]/30 dark:bg-[#15A4AE]/20 dark:text-[#15A4AE] dark:border-[#15A4AE]/40'
  const HOVER_CLS  = 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/6 hover:text-[#15A4AE] dark:hover:text-[#15A4AE]'

  const PAGES: { key: SubpageSource; label: string; Icon: React.ElementType }[] = [
    { key: 'email',   label: 'Email',   Icon: Mail          },
    { key: 'bots',    label: 'Bots',    Icon: MessageSquare },
    { key: 'forms',   label: 'Forms',   Icon: FileText      },
    { key: 'tickets', label: 'Tickets', Icon: TicketIcon    },
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
        {PAGES.map(p => {
          const isActive  = sourceKey === p.key
          const isLoading = loadingKey === p.key
          return (
            <button
              key={p.key}
              onClick={() => {
                if (isActive || isLoading) return
                setLoadingKey(p.key)
                router.push(viewAsUserId ? `${BASE_HREFS[p.key]}?viewAs=${viewAsUserId}` : BASE_HREFS[p.key])
              }}
              className={[
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border transition-colors whitespace-nowrap',
                isActive
                  ? ACTIVE_CLS
                  : `border-transparent ${HOVER_CLS}`,
              ].join(' ')}
            >
              {isLoading
                ? <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
                : <p.Icon className="w-3.5 h-3.5 shrink-0" />}
              {p.label}
            </button>
          )
        })}
      </div>

      {/* Controls */}
      <div className="flex items-end gap-2.5">
        {/* Calendar date picker */}
        <div className="relative" ref={calRef}>
          <button
            onClick={() => setShowCal(v => !v)}
            title="Filter by date"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              preset !== 'all'
                ? 'border-[#15A4AE]/40 text-[#3a9e8a] dark:text-[#15A4AE] bg-[#15A4AE]/5'
                : 'border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-[#232323] hover:bg-gray-100 dark:hover:bg-white/8'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            {preset === 'all'       ? 'All time'
            : preset === 'today'    ? 'Today'
            : preset === 'yesterday'? 'Yesterday'
            : preset === '7d'       ? 'Last 7 days'
            : preset === '30d'      ? 'Last 30 days'
            : fromDate && toDate    ? `${fromDate} → ${toDate}`
            : 'Custom'}
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>

          {showCal && (
            <div className="absolute right-0 top-full mt-2 z-50 bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-white/12 rounded-2xl shadow-xl p-4 w-72">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Quick Presets</p>
              <div className="grid grid-cols-3 gap-1.5 mb-4">
                {(['all', 'today', 'yesterday', '7d', '30d'] as SubpagePreset[]).map(p => (
                  <button
                    key={p}
                    onClick={() => { handlePresetChange(p); if (p !== 'custom') setShowCal(false) }}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      preset === p
                        ? 'bg-[#15A4AE] text-white'
                        : 'bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/12'
                    }`}
                  >
                    {p === 'all' ? 'All time' : p === 'today' ? 'Today' : p === 'yesterday' ? 'Yest.' : p === '7d' ? '7 days' : '30 days'}
                  </button>
                ))}
              </div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Custom Range</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-400 w-7 shrink-0">From</span>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={e => setFromDate(e.target.value)}
                    className="flex-1 text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/40"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-400 w-7 shrink-0">To</span>
                  <input
                    type="date"
                    value={toDate}
                    min={fromDate || undefined}
                    onChange={e => setToDate(e.target.value)}
                    className="flex-1 text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/40"
                  />
                </div>
              </div>
              {fromDate && toDate && (
                <button
                  onClick={() => { applyCustomRange(); setShowCal(false) }}
                  className="mt-3 w-full py-1.5 bg-[#15A4AE] hover:bg-[#1290a0] text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Apply
                </button>
              )}
            </div>
          )}
        </div>

        {/* My view / team member picker — managers+ only */}
        {teamMembers && teamMembers.length > 0 && (
          <div className="relative">
            <select
              value={viewAsUserId ?? ''}
              onChange={e => {
                const v = e.target.value
                const url = new URL(window.location.href)
                if (v) url.searchParams.set('viewAs', v)
                else url.searchParams.delete('viewAs')
                router.push(url.pathname + url.search)
              }}
              className="appearance-none pl-2.5 pr-7 py-1.5 text-xs border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/8 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#15A4AE] transition-colors"
            >
              <option value="">My view</option>
              {teamMembers.map(m => (
                <option key={m.user_id} value={m.user_id}>{m.name || m.email}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
          </div>
        )}

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
