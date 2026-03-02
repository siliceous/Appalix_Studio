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
  Link2,
  LayoutGrid,
  Mail,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Workspace } from '@/lib/types'

interface NavItem {
  href:  string
  label: string
  icon:  React.ElementType
}

interface NavGroup {
  label?: string
  pro?:   boolean
  items:  NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
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
      { href: '/sage/dashboard',    label: 'Dashboard',    icon: LayoutGrid },
      { href: '/sage/pipelines',    label: 'Pipelines',    icon: Kanban },
      { href: '/sage/contacts',     label: 'Contacts',     icon: Users },
      { href: '/sage/emails',       label: 'Emails',       icon: Mail },
      { href: '/sage/tickets',      label: 'Tickets',      icon: Ticket },
      { href: '/sage/integrations', label: 'Integrations', icon: Link2 },
    ],
  },
  {
    items: [
      { href: '/analytics', label: 'Analytics', icon: BarChart2 },
      { href: '/settings',  label: 'Settings',  icon: Settings },
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

  return (
    <aside className="w-60 shrink-0 flex flex-col bg-white dark:bg-[#232323] border-r dark:border-white/8 min-h-screen">
      {/* Logo + workspace */}
      <div className="px-4 py-5 border-b dark:border-white/8">
        <div className="flex items-center mb-4">
          <Image
            src="/logo.png"
            alt="Appalix"
            width={120}
            height={36}
            className="object-contain mix-blend-multiply dark:mix-blend-normal dark:invert"
            priority
          />
        </div>

        {/* Workspace badge */}
        <div className="bg-gray-50 dark:bg-white/5 rounded-lg px-3 py-2">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium mb-0.5">Workspace</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{workspace.name}</p>
          <span className={cn(
            'inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium',
            workspace.plan === 'enterprise' ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300' :
            workspace.plan === 'pro'        ? 'bg-brand-100 text-brand-700 dark:bg-[#61c2ad]/10 dark:text-[#61c2ad]' :
                                             'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300',
          )}>
            {workspace.plan}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        {NAV_GROUPS.map((group, gi) => {
          // Hide Pro-gated groups for non-Pro plans — but show the label as locked
          const locked = group.pro && !isProPlan

          return (
            <div key={gi}>
              {group.label && (
                <div className="flex items-center gap-2 px-3 mb-1">
                  <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    {group.label}
                  </p>
                  {group.pro && !isProPlan && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-brand-100 dark:bg-[#61c2ad]/10 text-brand-600 dark:text-[#61c2ad] font-bold">
                      Pro
                    </span>
                  )}
                </div>
              )}

              <div className="space-y-0.5">
                {group.items.map(({ href, label, icon: Icon }) => {
                  const active = isActive(href)

                  if (locked) {
                    return (
                      <Link
                        key={href}
                        href="/settings/upgrade"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 dark:text-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        {label}
                      </Link>
                    )
                  }

                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                        active
                          ? 'bg-brand-50 dark:bg-[#61c2ad]/10 text-brand-700 dark:text-[#61c2ad] font-medium'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white',
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {label}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 pb-4 border-t dark:border-white/8 pt-4">
        <button
          onClick={signOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
