'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Bot,
  MessageSquare,
  Plug,
  BarChart2,
  Settings,
  LogOut,
  BookOpen,
  Kanban,
  Users,
  Ticket,
  Mail,
  FileText,
  Inbox,
  Rss,
  PieChart,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Workspace } from '@/lib/types'

interface NavItem {
  href:  string
  label: string
  icon:  React.ElementType
  sub?:  boolean  // renders indented under its parent group item
}

interface NavGroup {
  label?: string
  pro?:   boolean
  items:  NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { href: '/dashboard',         label: 'Overview',  icon: LayoutDashboard },
      { href: '/dashboard/email',   label: 'Emails',    icon: Mail,        sub: true },
      { href: '/dashboard/bots',    label: 'Bots',      icon: MessageSquare, sub: true },
      { href: '/dashboard/forms',   label: 'Forms',     icon: FileText,    sub: true },
      { href: '/dashboard/tickets', label: 'Tickets',   icon: Ticket,      sub: true },
    ],
  },
  {
    label: 'Agent',
    items: [
      { href: '/bots',          label: 'Bots',           icon: Bot },
      { href: '/conversations',  label: 'Conversations',  icon: MessageSquare },
      { href: '/integrations',   label: 'Integrations',   icon: Plug },
      { href: '/sources',        label: 'Knowledge Base', icon: BookOpen },
    ],
  },
  {
    label: 'Sage',
    pro: true,
    items: [
      { href: '/sage/pipelines', label: 'Pipelines', icon: Kanban },
      { href: '/sage/contacts',  label: 'Contacts',  icon: Users },
      { href: '/sage/emails',    label: 'Emails',    icon: Mail },
      { href: '/sage/tickets',   label: 'Tickets',   icon: Ticket },
    ],
  },
  {
    label: 'Forms',
    pro: true,
    items: [
      { href: '/forms/leads',   label: 'All Leads', icon: Inbox },
      { href: '/forms/sources', label: 'Sources',   icon: Rss },
    ],
  },
  {
    items: [
      { href: '/analytics',       label: 'Analytics',          icon: BarChart2 },
      { href: '/forms/analytics', label: 'Campaign Analytics', icon: PieChart, sub: true },
      { href: '/settings',        label: 'Settings',           icon: Settings },
    ],
  },
]

interface SidebarProps {
  workspace: Workspace
}

export function Sidebar({ workspace }: SidebarProps) {
  const pathname  = usePathname()
  const router    = useRouter()
  const supabase  = createClient()
  const isProPlan = ['pro', 'scale', 'enterprise'].includes(workspace.plan)

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  // Plan badge colours
  const planBadgeCls =
    workspace.plan === 'enterprise' ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300' :
    workspace.plan === 'pro'        ? 'bg-brand-100 text-brand-700 dark:bg-[#61c2ad]/10 dark:text-[#61c2ad]' :
                                      'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300'

  const planDotCls =
    workspace.plan === 'enterprise' ? 'bg-purple-500' :
    workspace.plan === 'pro'        ? 'bg-[#61c2ad]' : 'bg-gray-400'

  return (
    /*
     * Outer wrapper: always occupies w-14 in the flex layout.
     * The inner <aside> is absolute and expands OVER content on hover
     * so nothing shifts/reflows.
     */
    <div className="w-14 shrink-0 relative z-20">
      <aside className={cn(
        'group absolute inset-y-0 left-0 flex flex-col',
        'w-14 hover:w-60',
        'bg-white dark:bg-[#232323] border-r dark:border-white/8',
        'transition-[width] duration-200 ease-in-out overflow-hidden',
        'hover:shadow-xl dark:hover:shadow-black/40',
      )}>

        {/* ── Logo + workspace ─────────────────────────────────── */}
        <div className="px-3 py-4 border-b dark:border-white/8 shrink-0">

          {/* Logo row */}
          <div className="flex items-center gap-2.5 mb-3 min-w-0">
            {/* Brand mark — always visible */}
            <div className="w-8 h-8 shrink-0 rounded-xl bg-brand-600 flex items-center justify-center text-white font-black text-sm select-none">
              A
            </div>
            {/* Full logo — fades in on hover */}
            <div className="overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-150 delay-75 whitespace-nowrap">
              <Image
                src="/logo.png"
                alt="Appalix"
                width={88}
                height={26}
                className="object-contain mix-blend-multiply dark:mix-blend-normal dark:invert"
                priority
              />
            </div>
          </div>

          {/* Workspace badge */}
          <div className="bg-gray-50 dark:bg-white/5 rounded-lg px-2 py-2">
            <div className="flex items-center gap-2 min-w-0">
              {/* Status dot — always visible */}
              <span className={cn('w-2 h-2 rounded-full shrink-0', planDotCls)} />
              {/* Name + plan — fades in on hover */}
              <div className="overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-150 delay-75 min-w-0">
                <p className="text-xs font-medium text-gray-900 dark:text-white truncate leading-tight">
                  {workspace.name}
                </p>
                <span className={cn('inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-medium leading-none', planBadgeCls)}>
                  {workspace.plan}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Navigation ───────────────────────────────────────── */}
        <nav className="flex-1 px-2 py-3 space-y-3 overflow-y-auto">
          {NAV_GROUPS.map((group, gi) => {
            const locked = group.pro && !isProPlan

            return (
              <div key={gi}>
                {/* Group label */}
                {group.label && (
                  <div className="flex items-center gap-2 px-2 mb-1 h-5 overflow-hidden">
                    {/* Collapsed: a short divider */}
                    <div className="w-4 h-px bg-gray-200 dark:bg-white/10 shrink-0 group-hover:hidden" />
                    {/* Expanded: label text */}
                    <div className="hidden group-hover:flex items-center gap-1.5 overflow-hidden">
                      <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {group.label}
                      </p>
                      {group.pro && !isProPlan && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-brand-100 dark:bg-[#61c2ad]/10 text-brand-600 dark:text-[#61c2ad] font-bold whitespace-nowrap">
                          Pro
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-0.5">
                  {group.items.map(({ href, label, icon: Icon, sub }) => {
                    const active = isActive(href)

                    const linkCls = cn(
                      'flex items-center gap-3 rounded-lg transition-[padding,background-color,color] duration-200 w-full',
                      sub
                        ? 'px-2 group-hover:pl-7 pr-2 py-1.5 text-xs'
                        : 'px-2 py-2 text-sm',
                      active
                        ? 'bg-brand-50 dark:bg-[#61c2ad]/10 text-brand-700 dark:text-[#61c2ad] font-medium'
                        : locked
                          ? 'text-gray-400 dark:text-gray-600 hover:bg-gray-50 dark:hover:bg-white/5'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white',
                    )

                    const content = (
                      <>
                        <Icon className={cn('shrink-0', sub ? 'w-4 h-4' : 'w-5 h-5')} />
                        <span className="overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-150 delay-75 whitespace-nowrap">
                          {label}
                        </span>
                      </>
                    )

                    return locked ? (
                      <Link key={href} href="/settings/upgrade" className={linkCls} title={label}>
                        {content}
                      </Link>
                    ) : (
                      <Link key={href} href={href} className={linkCls} title={label}>
                        {content}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>

        {/* ── Sign out ──────────────────────────────────────────── */}
        <div className="px-2 pb-4 pt-3 border-t dark:border-white/8 shrink-0">
          <button
            onClick={signOut}
            title="Sign out"
            className="flex items-center gap-3 w-full px-2 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span className="overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-150 delay-75 whitespace-nowrap">
              Sign out
            </span>
          </button>
        </div>

      </aside>
    </div>
  )
}
