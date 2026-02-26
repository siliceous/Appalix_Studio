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
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Workspace } from '@/lib/types'

const NAV_ITEMS: { href: string; label: string; icon: React.ElementType; pro?: boolean }[] = [
  { href: '/dashboard',        label: 'Overview',        icon: LayoutDashboard },
  { href: '/bots',             label: 'Bots',            icon: Bot },
  { href: '/conversations',    label: 'Conversations',   icon: MessageSquare },
  { href: '/integrations',     label: 'Integrations',    icon: Plug },
  { href: '/sources',          label: 'Knowledge Base',  icon: BookOpen },
  { href: '/sage',             label: 'Sage',             icon: Sparkles, pro: true },
  { href: '/analytics',        label: 'Analytics',       icon: BarChart2 },
  { href: '/settings',         label: 'Settings',        icon: Settings },
]

interface SidebarProps {
  workspace: Workspace
}

export function Sidebar({ workspace }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-60 shrink-0 flex flex-col bg-white border-r min-h-screen">
      {/* Logo + workspace */}
      <div className="px-4 py-5 border-b">
        <div className="flex items-center mb-4">
          <Image src="/logo.png" alt="Appalix" width={120} height={36} className="object-contain mix-blend-multiply" priority />
        </div>

        {/* Workspace badge */}
        <div className="bg-gray-50 rounded-lg px-3 py-2">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-0.5">Workspace</p>
          <p className="text-sm font-medium text-gray-900 truncate">{workspace.name}</p>
          <span className={cn(
            'inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium',
            workspace.plan === 'enterprise' ? 'bg-purple-100 text-purple-700' :
            workspace.plan === 'pro'        ? 'bg-brand-100 text-brand-700' :
                                             'bg-gray-100 text-gray-600',
          )}>
            {workspace.plan}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon, pro }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          const isProPlan = ['pro', 'scale', 'enterprise'].includes(workspace.plan)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-brand-50 text-brand-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
              {pro && !isProPlan && (
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-brand-100 text-brand-600 font-semibold">
                  Pro
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 pb-4 border-t pt-4">
        <button
          onClick={signOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
