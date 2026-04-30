'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { GitBranch, Activity, LayoutTemplate } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/sage/automation-builder', label: 'Builder',   icon: GitBranch      },
  { href: '/sage/automations',        label: 'Runs',      icon: Activity       },
  { href: '/sage/templates',          label: 'Templates', icon: LayoutTemplate },
]

export function AutomationTabBar() {
  const pathname = usePathname()
  return (
    <div className="shrink-0 flex items-center gap-1 px-4 pt-3 pb-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors',
              active
                ? 'text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-950 border border-b-0 border-gray-200 dark:border-gray-700 -mb-px'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        )
      })}
    </div>
  )
}
