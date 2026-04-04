'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Bot, Plug, BookOpen,
  Target, Users, Kanban, FolderOpen, Receipt, ListFilter, Clock,
  Settings, TrendingUp, BarChart2, CreditCard,
} from 'lucide-react'
import { useUserAvatar } from '@/contexts/user-avatar-context'

export type SagePageKey =
  | 'bots' | 'integrations' | 'sources'
  | 'prospects' | 'contacts' | 'pipelines' | 'projects' | 'quotes' | 'rules'
  | 'my-activity'

interface PageDef { key: SagePageKey; label: string; href: string; icon: React.ElementType }

const AGENT_PAGES: PageDef[] = [
  { key: 'bots',         label: 'Bots',           href: '/bots',         icon: Bot      },
  { key: 'integrations', label: 'Integrations',   href: '/integrations', icon: Plug     },
  { key: 'sources',      label: 'Knowledge Base', href: '/sources',      icon: BookOpen },
]

const SAGE_PAGES: PageDef[] = [
  { key: 'prospects',  label: 'Prospects',        href: '/sage/prospects',  icon: Target     },
  { key: 'contacts',   label: 'Contacts',         href: '/sage/contacts',   icon: Users      },
  { key: 'pipelines',  label: 'Pipelines',        href: '/sage/pipelines',  icon: Kanban     },
  { key: 'projects',   label: 'Projects',         href: '/sage/projects',   icon: FolderOpen },
  { key: 'quotes',     label: 'Quotes',           href: '/sage/quotes',     icon: Receipt    },
  { key: 'rules',      label: 'Rules',            href: '/sage/rules',      icon: ListFilter },
]

const STANDALONE_PAGES: PageDef[] = [
  { key: 'my-activity', label: 'My Activity', href: '/my-activity', icon: Clock },
]

const ALL_SECTIONS = [AGENT_PAGES, SAGE_PAGES, STANDALONE_PAGES]

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

export function SageToolbar({ pageKey }: { pageKey: SagePageKey }) {
  const router = useRouter()
  const [showProfile, setShowProfile] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  const { avatarUrl, userName, plan, brandColor } = useUserAvatar()
  const initials = userName
    ? userName.split(' ').map((w: string) => w[0]).slice(0, 2).join('')
    : '?'

  const planBadgeCls =
    plan === 'enterprise' ? 'bg-purple-500/20 text-purple-300' :
    plan === 'pro'        ? 'bg-[#15A4AE]/20 text-[#15A4AE]'  :
                            'bg-white/10 text-white/60'

  const sectionPages = ALL_SECTIONS.find(s => s.some(p => p.key === pageKey)) ?? []

  useEffect(() => {
    if (!showProfile) return
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showProfile])

  const ACTIVE_CLS = 'bg-white/20 text-white border-white/40'
  const HOVER_CLS  = 'text-white border-transparent hover:bg-white/10'

  return (
    <nav className="px-4 ml-3 mr-4 border-b border-white/10 bg-[#141c2b] rounded-b-2xl shadow-lg grid grid-cols-[1fr_auto] items-end shrink-0 gap-x-4 min-h-[52px] pb-2">
      {/* Overview + sibling page pills */}
      <div className="flex items-end gap-1.5 min-w-0 overflow-x-auto">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm text-white hover:text-white transition-colors shrink-0 px-2 py-1.5 rounded-lg hover:bg-white/10 mr-0.5"
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Overview</span>
        </Link>
        {sectionPages.length > 1 && (
          <>
            <div className="w-px h-5 bg-white/15 self-center" />
            {sectionPages.map(p => {
              const isActive = p.key === pageKey
              return (
                <button
                  key={p.key}
                  onClick={() => { if (!isActive) router.push(p.href) }}
                  className={[
                    'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl border transition-colors whitespace-nowrap',
                    isActive ? ACTIVE_CLS : `border-transparent ${HOVER_CLS}`,
                  ].join(' ')}
                >
                  <p.icon className="w-3.5 h-3.5 shrink-0" />
                  {p.label}
                </button>
              )
            })}
          </>
        )}
      </div>

      {/* Profile avatar + dropdown */}
      <div className="flex items-end">
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
