'use client'

import React, { useState, useEffect, useRef, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Bot, Plug, BookOpen,
  Target, Users, Kanban, FolderOpen, Receipt,
  Settings, TrendingUp, BarChart2, CreditCard,
  Mail, MessageSquare, FileText, Ticket as TicketIcon,
  Calendar, ChevronDown, Zap, Loader2,
} from 'lucide-react'
import { useUserAvatar } from '@/contexts/user-avatar-context'
import { updateAutoSetting, type AutoSettings } from '@/app/actions/sage-auto-settings'

export type SagePageKey =
  | 'bots' | 'integrations' | 'sources'
  | 'prospects' | 'contacts' | 'pipelines' | 'projects' | 'quotes' | 'rules'
  | 'email' | 'conversations' | 'forms' | 'tickets' | 'my-activity'

export type TriagePreset = 'all' | 'today' | 'yesterday' | '7d' | '30d' | 'custom'

interface TeamMemberOption { user_id: string; name: string; email?: string }

interface PageDef { key: SagePageKey; label: string; href: string; icon: React.ElementType }

const TRIAGE_PAGES: PageDef[] = [
  { key: 'email',         label: 'Email',         href: '/dashboard/email',  icon: Mail          },
  { key: 'conversations', label: 'Conversations', href: '/dashboard/bots',   icon: MessageSquare },
  { key: 'forms',         label: 'Forms',         href: '/dashboard/forms',  icon: FileText      },
  { key: 'tickets',       label: 'Tickets',       href: '/sage/tickets',     icon: TicketIcon    },
]

const SAGE_PAGES: PageDef[] = [
  { key: 'prospects',  label: 'Lead Enrichment',  href: '/sage/prospects',  icon: Target     },
  { key: 'contacts',   label: 'Contacts',   href: '/sage/contacts',   icon: Users      },
  { key: 'pipelines',  label: 'Pipelines',  href: '/sage/pipelines',  icon: Kanban     },
  { key: 'projects',   label: 'Projects',   href: '/sage/projects',   icon: FolderOpen },
  { key: 'quotes',     label: 'Quotes',     href: '/sage/quotes',     icon: Receipt    },
]

const AGENT_PAGES: PageDef[] = [
  { key: 'bots',         label: 'Bots',           href: '/bots',         icon: Bot      },
  { key: 'integrations', label: 'Integrations',   href: '/integrations', icon: Plug     },
  { key: 'sources',      label: 'Knowledge Base', href: '/sources',      icon: BookOpen },
]

const TRIAGE_KEYS = new Set<SagePageKey>(['email', 'conversations', 'forms', 'tickets'])

const TRIAGE_SOURCE_FIELD: Record<string, keyof AutoSettings> = {
  email:         'email_auto_enabled',
  conversations: 'bots_auto_enabled',
  forms:         'forms_auto_enabled',
  tickets:       'tickets_auto_enabled',
}

const TRIAGE_SOURCE_LABEL: Record<string, string> = {
  email:         'emails',
  conversations: 'bot conversations',
  forms:         'form submissions',
  tickets:       'tickets',
}

const PROFILE_LINKS = [
  { href: '/settings',         label: 'Settings',       Icon: Settings   },
  { href: '/sage/roi',         label: 'ROI',            Icon: TrendingUp },
  { href: '/analytics',        label: 'Analytics',      Icon: BarChart2  },
  { href: '/settings/upgrade', label: 'Plan (Upgrade)', Icon: CreditCard },
]

function ToolbarAvatar({ src, initials, brandColor }: { src: string | null; initials: string; brandColor: string }) {
  return (
    <div
      className="relative w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-white text-[10px] font-bold uppercase select-none overflow-hidden"
      style={{ backgroundColor: brandColor }}
    >
      {initials}
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="absolute inset-0 w-full h-full object-cover z-10"
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
        />
      )}
    </div>
  )
}

export interface DeliveryStats {
  sent:      number
  delivered: number
  bounced:   number
  failed:    number
  hasIssues: boolean
}

interface Props {
  pageKey: SagePageKey
  // triage-only props (omit for non-triage pages)
  preset?:        TriagePreset
  autoEnabled?:   boolean
  customFrom?:    string
  customTo?:      string
  viewAsUserId?:  string | null
  teamMembers?:   TeamMemberOption[]
  deliveryStats?: DeliveryStats | null
}

export function SageToolbar({ pageKey, preset, autoEnabled, customFrom, customTo, viewAsUserId, teamMembers, deliveryStats }: Props) {
  const router   = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()

  const isTriagePage = TRIAGE_KEYS.has(pageKey)

  const [localAuto,       setLocalAuto]       = useState(autoEnabled ?? false)
  const [fromDate,        setFromDate]        = useState(customFrom ?? '')
  const [toDate,          setToDate]          = useState(customTo   ?? '')
  const [showCal,         setShowCal]         = useState(false)
  const [loadingKey,      setLoadingKey]      = useState<SagePageKey | null>(null)
  const [showProfile,     setShowProfile]     = useState(false)
  const [showSageMenu,    setShowSageMenu]    = useState(false)
  const [showOverviewMenu, setShowOverviewMenu] = useState(false)
  const calRef         = useRef<HTMLDivElement>(null)
  const profileRef     = useRef<HTMLDivElement>(null)
  const sageMenuRef    = useRef<HTMLDivElement>(null)
  const overviewMenuRef = useRef<HTMLDivElement>(null)

  const { avatarUrl, userName, plan, brandColor } = useUserAvatar()
  const initials = userName
    ? userName.split(' ').map((w: string) => w[0]).slice(0, 2).join('')
    : '?'

  const planBadgeCls =
    plan === 'enterprise' ? 'bg-purple-500/20 text-purple-300' :
    plan === 'pro'        ? 'bg-[#15A4AE]/20 text-[#15A4AE]'  :
                            'bg-white/10 text-white/60'

  useEffect(() => { setLocalAuto(autoEnabled ?? false) }, [autoEnabled])
  useEffect(() => { setFromDate(customFrom ?? '') }, [customFrom])
  useEffect(() => { setToDate(customTo ?? '') }, [customTo])
  useEffect(() => { setLoadingKey(null) }, [pathname])

  useEffect(() => {
    if (!showCal) return
    const handler = (e: MouseEvent) => {
      if (calRef.current && !calRef.current.contains(e.target as Node)) setShowCal(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showCal])

  useEffect(() => {
    if (!showProfile) return
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showProfile])

  useEffect(() => {
    if (!showSageMenu) return
    const handler = (e: MouseEvent) => {
      if (sageMenuRef.current && !sageMenuRef.current.contains(e.target as Node)) setShowSageMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showSageMenu])

  useEffect(() => {
    if (!showOverviewMenu) return
    const handler = (e: MouseEvent) => {
      if (overviewMenuRef.current && !overviewMenuRef.current.contains(e.target as Node)) setShowOverviewMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showOverviewMenu])

  const buildUrl = (base: string, extra?: Record<string, string>) => {
    const url = new URL(base, 'http://x')
    if (viewAsUserId) url.searchParams.set('viewAs', viewAsUserId)
    if (extra) for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v)
    return url.pathname + (url.search !== '?' ? url.search : '')
  }

  const toggleAuto = async () => {
    const next = !localAuto
    setLocalAuto(next)
    const field = TRIAGE_SOURCE_FIELD[pageKey]
    if (field) await updateAutoSetting(field, next)
    router.refresh()
  }

  const handlePresetChange = (value: TriagePreset) => {
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

  const ACTIVE_CLS = 'bg-white/20 text-white border-white/40'
  const HOVER_CLS  = 'text-white border-transparent hover:bg-white/10'

  const navButton = (p: PageDef) => {
    const isActive  = p.key === pageKey
    const isLoading = loadingKey === p.key
    return (
      <button
        key={p.key}
        onClick={() => {
          if (isActive || isLoading) return
          setLoadingKey(p.key)
          router.push(p.href)
        }}
        className={[
          'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl border transition-colors whitespace-nowrap',
          isActive ? ACTIVE_CLS : `border-transparent ${HOVER_CLS}`,
        ].join(' ')}
      >
        {isLoading
          ? <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
          : <p.icon className="w-3.5 h-3.5 shrink-0" />}
        {p.label}
      </button>
    )
  }

  const Divider = () => <div className="w-px h-5 bg-white/15 self-center shrink-0" />

  return (
    <nav className="px-4 ml-3 mr-4 border-b border-white/10 bg-[#141c2b] rounded-b-2xl shadow-lg flex items-end shrink-0 gap-x-2 min-h-[52px] pb-2">

      {/* Nav pills — dropdowns live OUTSIDE the overflow-x-auto scroll zone */}
      {isTriagePage ? (
        <>
          {/* Scrollable triage pills */}
          <div className="flex flex-1 items-end gap-1.5 overflow-x-auto min-w-0">
            <Link
              href={viewAsUserId ? `/dashboard?viewAs=${viewAsUserId}` : '/dashboard'}
              className="flex items-center gap-1.5 text-sm text-white hover:text-white transition-colors shrink-0 px-2 py-1.5 rounded-lg hover:bg-white/10 mr-0.5"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Overview</span>
            </Link>
            <Divider />
            {TRIAGE_PAGES.map(navButton)}
          </div>

          {/* Sage ▾ — outside overflow div so dropdown isn't clipped */}
          <Divider />
          <div className="relative shrink-0" ref={sageMenuRef}>
            <button
              onClick={() => setShowSageMenu(v => !v)}
              className={[
                'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl border transition-colors whitespace-nowrap',
                showSageMenu ? 'bg-white/20 text-white border-white/40' : 'border-transparent text-white hover:bg-white/10',
              ].join(' ')}
            >
              Sage
              <ChevronDown className={`w-3 h-3 opacity-60 transition-transform ${showSageMenu ? 'rotate-180' : ''}`} />
            </button>

            {showSageMenu && (
              <div className="absolute right-0 top-full mt-2 z-50 bg-white dark:bg-[#1e2535] border border-gray-200 dark:border-white/12 rounded-2xl shadow-xl w-52 overflow-hidden py-1.5">
                <p className="px-3 pt-1 pb-1.5 text-[10px] font-semibold text-gray-400 dark:text-white/40 uppercase tracking-wide">CRM</p>
                {SAGE_PAGES.map(p => (
                  <button
                    key={p.key}
                    onClick={() => { setShowSageMenu(false); setLoadingKey(p.key); router.push(p.href) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/8 transition-colors"
                  >
                    <p.icon className="w-3.5 h-3.5 shrink-0 text-gray-400 dark:text-white/40" />
                    {p.label}
                  </button>
                ))}
                <div className="mx-3 my-1.5 border-t border-gray-100 dark:border-white/8" />
                <p className="px-3 pt-0.5 pb-1.5 text-[10px] font-semibold text-gray-400 dark:text-white/40 uppercase tracking-wide">Agents</p>
                {AGENT_PAGES.map(p => (
                  <button
                    key={p.key}
                    onClick={() => { setShowSageMenu(false); setLoadingKey(p.key); router.push(p.href) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/8 transition-colors"
                  >
                    <p.icon className="w-3.5 h-3.5 shrink-0 text-gray-400 dark:text-white/40" />
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Overview ▾ — outside overflow div so dropdown isn't clipped */}
          <div className="relative shrink-0 mr-0.5" ref={overviewMenuRef}>
            <button
              onClick={() => setShowOverviewMenu(v => !v)}
              className={[
                'flex items-center gap-1.5 px-2 py-1.5 text-sm rounded-lg border transition-colors whitespace-nowrap',
                showOverviewMenu ? 'bg-white/10 text-white border-white/20' : 'border-transparent text-white hover:bg-white/10',
              ].join(' ')}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Overview</span>
              <ChevronDown className={`w-3 h-3 opacity-60 transition-transform ${showOverviewMenu ? 'rotate-180' : ''}`} />
            </button>

            {showOverviewMenu && (
              <div className="absolute left-0 top-full mt-2 z-50 bg-white dark:bg-[#1e2535] border border-gray-200 dark:border-white/12 rounded-2xl shadow-xl w-52 overflow-hidden py-1.5">
                <Link
                  href={viewAsUserId ? `/dashboard?viewAs=${viewAsUserId}` : '/dashboard'}
                  onClick={() => setShowOverviewMenu(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/8 transition-colors"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 shrink-0 text-gray-400 dark:text-white/40" />
                  Dashboard
                </Link>
                <div className="mx-3 my-1.5 border-t border-gray-100 dark:border-white/8" />
                <p className="px-3 pt-0.5 pb-1.5 text-[10px] font-semibold text-gray-400 dark:text-white/40 uppercase tracking-wide">Triage</p>
                {TRIAGE_PAGES.map(p => (
                  <button
                    key={p.key}
                    onClick={() => { setShowOverviewMenu(false); setLoadingKey(p.key); router.push(p.href) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/8 transition-colors"
                  >
                    <p.icon className="w-3.5 h-3.5 shrink-0 text-gray-400 dark:text-white/40" />
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Scrollable sage + agent pills */}
          <div className="flex flex-1 items-end gap-1.5 overflow-x-auto min-w-0">
            <Divider />
            {SAGE_PAGES.map(navButton)}
            <Divider />
            {AGENT_PAGES.map(navButton)}
          </div>
        </>
      )}

      {/* Right controls */}
      <div className="flex items-end gap-2.5 shrink-0">

        {isTriagePage && (
          <>
            {/* Date picker */}
            <div className="relative" ref={calRef}>
              <button
                onClick={() => setShowCal(v => !v)}
                title="Filter by date"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                  preset && preset !== 'all'
                    ? 'border-white/40 text-white bg-white/20'
                    : 'border-white/20 text-white hover:bg-white/10'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                {!preset || preset === 'all' ? 'All time'
                : preset === 'today'         ? 'Today'
                : preset === 'yesterday'     ? 'Yesterday'
                : preset === '7d'            ? 'Last 7 days'
                : preset === '30d'           ? 'Last 30 days'
                : fromDate && toDate         ? `${fromDate} → ${toDate}`
                : 'Custom'}
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              {showCal && (
                <div className="absolute right-0 top-full mt-2 z-50 bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-white/12 rounded-2xl shadow-xl p-4 w-72">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Quick Presets</p>
                  <div className="grid grid-cols-3 gap-1.5 mb-4">
                    {(['all', 'today', 'yesterday', '7d', '30d'] as TriagePreset[]).map(p => (
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
                      <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="flex-1 text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/40" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-400 w-7 shrink-0">To</span>
                      <input type="date" value={toDate} min={fromDate || undefined} onChange={e => setToDate(e.target.value)} className="flex-1 text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/40" />
                    </div>
                  </div>
                  {fromDate && toDate && (
                    <button onClick={() => { applyCustomRange(); setShowCal(false) }} className="mt-3 w-full py-1.5 bg-[#15A4AE] hover:bg-[#1290a0] text-white text-xs font-semibold rounded-lg transition-colors">Apply</button>
                  )}
                </div>
              )}
            </div>

            {/* ViewAs picker — managers+ only */}
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
                  className="dark-bar-select appearance-none pl-2.5 pr-7 py-1.5 text-sm border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/30 transition-colors cursor-pointer"
                >
                  <option value="">My view</option>
                  {teamMembers.map(m => (
                    <option key={m.user_id} value={m.user_id}>{m.name || m.email}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40 pointer-events-none" />
              </div>
            )}

            {/* Auto toggle */}
            <button
              onClick={toggleAuto}
              title={
                localAuto
                  ? `Auto ON — AI automatically processes ${TRIAGE_SOURCE_LABEL[pageKey] ?? 'items'}. Click to switch to manual review.`
                  : `Auto OFF — ${TRIAGE_SOURCE_LABEL[pageKey] ?? 'Items'} require manual review. Click to enable automation.`
              }
              className={[
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium border transition-all',
                localAuto ? 'bg-white/20 border-white/40 text-white' : 'bg-white/5 border-white/15 text-white',
              ].join(' ')}
            >
              <Zap className={`w-3 h-3 ${localAuto ? 'text-[#15A4AE]' : 'text-white'}`} />
              <span>Auto</span>
              <span className="font-bold">{localAuto ? 'ON' : 'OFF'}</span>
            </button>
          </>
        )}

        {/* Email delivery stats — only on email page when data exists */}
        {deliveryStats && (
          <div className={`flex items-center gap-3 px-3 py-1.5 rounded-lg border text-[14px] font-medium ${
            deliveryStats.hasIssues
              ? 'border-red-500/30 bg-red-500/10 text-white'
              : 'border-emerald-500/30 bg-emerald-500/10 text-white'
          }`}>
            <span className="text-white/50 font-normal">30d</span>
            <span title="Sent" className="tabular-nums">{deliveryStats.sent.toLocaleString()} sent</span>
            {deliveryStats.bounced > 0 && (
              <span title="Bounced" className="tabular-nums text-red-300">
                {deliveryStats.bounced} bounced ({((deliveryStats.bounced / deliveryStats.sent) * 100).toFixed(1)}%)
              </span>
            )}
            {deliveryStats.failed > 0 && (
              <span title="Failed" className="tabular-nums text-amber-300">
                {deliveryStats.failed} failed
              </span>
            )}
            {!deliveryStats.hasIssues && deliveryStats.delivered > 0 && (
              <span title="Delivered" className="tabular-nums text-emerald-300">
                {deliveryStats.delivered} delivered
              </span>
            )}
          </div>
        )}

        {/* Profile avatar + dropdown */}
        <div className="relative ml-2" ref={profileRef}>
          <button
            onClick={() => setShowProfile(v => !v)}
            title="Account"
            className={`flex items-center rounded-full border transition-all ${
              showProfile ? 'border-white/40 ring-2 ring-white/20' : 'border-white/20 hover:border-white/40'
            }`}
          >
            <ToolbarAvatar src={avatarUrl} initials={initials} brandColor={brandColor} />
          </button>

          {showProfile && (
            <div className="absolute right-0 top-full mt-2 z-50 bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-white/12 rounded-2xl shadow-xl w-52 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-white/8 flex items-center gap-2.5">
                <ToolbarAvatar src={avatarUrl} initials={initials} brandColor={brandColor} />
                <div className="min-w-0 flex-1">
                  {userName && (
                    <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{userName}</p>
                  )}
                  <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full font-medium leading-none mt-0.5 ${planBadgeCls}`}>
                    {plan}
                  </span>
                </div>
              </div>
              <div className="py-1.5">
                {PROFILE_LINKS.map(({ href, label, Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setShowProfile(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    <Icon className="w-4 h-4 shrink-0 text-gray-400 dark:text-gray-500" />
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
