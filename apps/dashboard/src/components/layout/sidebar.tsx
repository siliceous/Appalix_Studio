'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  LayoutDashboard,
  Bot,
  MessageSquare,
  Plug,
  BarChart2,
  LogOut,
  BookOpen,
  Kanban,
  Users,
  Ticket,
  Mail,
  FileText,
  Inbox,
  FolderOpen,
  TrendingUp,
  ListFilter,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Workspace, UserPermissions, WorkspaceMemberRole } from '@/lib/types'
import { ROLE_RANK } from '@/lib/types'
import type { WorkspaceBranding } from '@/app/actions/workspace-branding'

interface NavItem {
  href:            string
  label:           string
  icon:            React.ElementType
  sub?:            boolean
  adminOnly?:      boolean
  adminPlus?:      boolean
  permissionKey?:  keyof UserPermissions
}

interface NavGroup {
  label?: string
  pro?:   boolean
  items:  NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { href: '/dashboard',         label: 'Overview',       icon: LayoutDashboard },
      { href: '/dashboard/email',   label: 'Emails',         icon: Mail,            sub: true },
      { href: '/dashboard/bots',    label: 'Conversations',  icon: MessageSquare,   sub: true },
      { href: '/dashboard/forms',   label: 'Forms',          icon: FileText,        sub: true },
      { href: '/dashboard/tickets', label: 'Tickets',        icon: Ticket,          sub: true },
    ],
  },
  {
    label: 'Agent',
    items: [
      { href: '/bots',         label: 'Bots',           icon: Bot,      adminOnly: true },
      { href: '/integrations', label: 'Integrations',   icon: Plug,     adminOnly: true },
      { href: '/sources',      label: 'Knowledge Base', icon: BookOpen, adminOnly: true },
    ],
  },
  {
    label: 'Sage',
    pro: true,
    items: [
      { href: '/sage/pipelines', label: 'Pipelines', icon: Kanban,     permissionKey: 'can_view_pipelines' },
      { href: '/sage/projects',  label: 'Projects',  icon: FolderOpen, permissionKey: 'can_view_projects'  },
      { href: '/sage/contacts',  label: 'Contacts',  icon: Users,      permissionKey: 'can_view_contacts'  },
      { href: '/sage/roi',       label: 'ROI',        icon: TrendingUp                                      },
      { href: '/sage/rules',     label: 'Rules',      icon: ListFilter, adminOnly: true                    },
    ],
  },
  {
    label: 'Forms',
    pro: true,
    items: [
      { href: '/forms/leads',   label: 'All Leads', icon: Inbox },
    ],
  },
  {
    items: [
      { href: '/analytics',    label: 'Analytics',   icon: BarChart2 },
      { href: '/my-activity',  label: 'My Activity', icon: Clock     },
    ],
  },
]

interface SidebarProps {
  workspace:        Workspace
  callerRole?:      string
  userPermissions?: UserPermissions
  userName?:        string | null
  userEmail?:       string | null
  userAvatar?:      string | null
  branding?:        WorkspaceBranding | null
}

// Routes that should carry ?viewAs= when a manager is viewing a junior
const VIEW_AS_ROUTES = new Set([
  '/dashboard', '/dashboard/email', '/dashboard/bots', '/dashboard/forms', '/dashboard/tickets',
  '/sage/pipelines', '/sage/contacts', '/sage/roi', '/my-activity',
])

export function Sidebar({ workspace, callerRole, userPermissions, userName, userEmail, userAvatar, branding }: SidebarProps) {
  const pathname    = usePathname()
  const searchParams = useSearchParams()
  const router      = useRouter()
  const viewAs      = searchParams.get('viewAs')
  const supabase    = createClient()
  const isProPlan   = ['pro', 'team', 'enterprise'].includes(workspace.plan)
  const isViewer    = callerRole === 'viewer'
  const callerRank  = ROLE_RANK[(callerRole ?? 'viewer') as WorkspaceMemberRole] ?? 1

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const planBadgeCls =
    workspace.plan === 'enterprise' ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300' :
    workspace.plan === 'pro'        ? 'bg-brand-100 text-brand-700 dark:bg-[#15A4AE]/10 dark:text-[#15A4AE]' :
                                      'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300'

  const settingsActive = pathname.startsWith('/settings')

  return (
    <div className="w-14 shrink-0 relative z-20">
      <aside className={cn(
        'group absolute inset-y-0 left-0 flex flex-col',
        'w-14 hover:w-[204px]',
        'bg-white dark:bg-[#232323] border-r dark:border-white/8',
        'transition-[width] duration-200 ease-in-out overflow-hidden',
        'hover:shadow-xl dark:hover:shadow-black/40',
      )}>

        {/* ── Logo + workspace ─────────────────────────────────── */}
        <div className="px-3 py-4 border-b dark:border-white/8 shrink-0">

          {/* Logo row */}
          <div className="flex items-center gap-2.5 mb-3 min-w-0">
            {branding?.favicon_url ? (
              <Image
                src={branding.favicon_url}
                alt={branding.brand_name ?? 'Icon'}
                width={32}
                height={32}
                className="w-8 h-8 shrink-0 rounded-xl object-cover select-none"
                priority
              />
            ) : branding?.brand_name ? (
              <div
                className="w-8 h-8 shrink-0 rounded-xl flex items-center justify-center text-white font-black text-sm select-none"
                style={{ backgroundColor: branding.primary_color ?? '#15A4AE' }}
              >
                {branding.brand_name.charAt(0).toUpperCase()}
              </div>
            ) : (
              <Image
                src="/favicon.png"
                alt="Appalix"
                width={32}
                height={32}
                className="w-8 h-8 shrink-0 rounded-xl object-contain select-none"
                priority
              />
            )}
            <div className="overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-150 delay-75 whitespace-nowrap">
              {branding?.logo_url ? (
                <Image
                  src={branding.logo_url}
                  alt={branding.brand_name ?? 'Logo'}
                  width={88}
                  height={26}
                  className="object-contain"
                  priority
                />
              ) : (
                <>
                  {!branding?.hide_powered_by && (
                    <Image
                      src="/logo.png"
                      alt="Appalix"
                      width={88}
                      height={26}
                      className="object-contain"
                      priority
                    />
                  )}
                  {(branding?.brand_name || branding?.hide_powered_by) && (
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {branding.brand_name ?? workspace.name}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Account identity — clicking goes to Settings */}
          <Link
            href="/settings"
            title="Settings"
            className={cn(
              'flex items-center gap-2.5 rounded-lg py-1.5 min-w-0 transition-colors',
              settingsActive
                ? 'group-hover:bg-brand-50 dark:group-hover:bg-[#15A4AE]/10 group-hover:ring-1 group-hover:ring-brand-200 dark:group-hover:ring-[#15A4AE]/20 group-hover:px-2'
                : 'group-hover:bg-gray-50 dark:group-hover:bg-white/5 group-hover:hover:bg-gray-100 dark:group-hover:hover:bg-white/8 group-hover:px-2',
            )}
          >
            {/* Avatar — w-8 to align exactly under brand mark */}
            {userAvatar ? (
              <Image
                src={userAvatar}
                alt={userName ?? 'Avatar'}
                width={32}
                height={32}
                className="w-8 h-8 shrink-0 rounded-full object-cover select-none"
              />
            ) : (
              <div
                className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-white text-[10px] font-bold uppercase select-none"
                style={{ backgroundColor: branding?.primary_color ?? '#15A4AE' }}
              >
                {userName
                  ? userName.split(' ').map((w: string) => w[0]).slice(0, 2).join('')
                  : (userEmail?.[0] ?? '?')}
              </div>
            )}
            {/* Name + email + plan — fades in on hover */}
            <div className="overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-150 delay-75 min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-900 dark:text-white truncate leading-tight">
                {userName ?? userEmail ?? 'My Account'}
              </p>
              {userName && userEmail && (
                <p className="text-[10px] text-gray-400 truncate leading-tight mt-0.5">{userEmail}</p>
              )}
              <span className={cn('inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium leading-none', planBadgeCls)}>
                {workspace.plan}
              </span>
            </div>
          </Link>
        </div>

        {/* ── Navigation ───────────────────────────────────────── */}
        <nav className="flex-1 px-2 py-3 space-y-3 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {NAV_GROUPS.map((group, gi) => {
            const locked = group.pro && !isProPlan

            return (
              <div key={gi}>
                {group.label && (
                  <div className="flex items-center gap-2 px-2 mb-1 h-5 overflow-hidden">
                    <div className="w-4 h-px bg-gray-200 dark:bg-white/10 shrink-0 group-hover:hidden" />
                    <div className="hidden group-hover:flex items-center gap-1.5 overflow-hidden">
                      <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {group.label}
                      </p>
                      {group.pro && !isProPlan && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-brand-100 dark:bg-[#15A4AE]/10 text-brand-600 dark:text-[#15A4AE] font-bold whitespace-nowrap">
                          Pro
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-0.5">
                  {group.items.filter(item => {
                    if (isViewer && item.adminOnly) return false
                    if (item.adminPlus && callerRank < ROLE_RANK.admin) return false
                    if (item.permissionKey && userPermissions && !userPermissions[item.permissionKey]) return false
                    return true
                  }).map(({ href, label, icon: Icon, sub }) => {
                    const active = isActive(href)

                    const linkCls = cn(
                      'flex items-center gap-3 rounded-lg transition-[padding,background-color,color] duration-200 w-full',
                      sub
                        ? 'px-2 group-hover:pl-7 pr-2 py-1.5 text-xs'
                        : 'px-2 py-2 text-sm',
                      active
                        ? 'bg-brand-50 dark:bg-[#15A4AE]/10 text-brand-700 dark:text-[#15A4AE] font-medium'
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

                    const resolvedHref = !locked && viewAs && VIEW_AS_ROUTES.has(href)
                      ? `${href}?viewAs=${viewAs}`
                      : href

                    return locked ? (
                      <Link key={href} href="/settings/upgrade" className={linkCls} title={label}>
                        {content}
                      </Link>
                    ) : (
                      <Link key={href} href={resolvedHref} className={linkCls} title={label}>
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
