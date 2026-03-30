'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { LayoutDashboard, Mail, Bot, Ticket, ClipboardList } from 'lucide-react'

const TABS = [
  { id: 'overview', label: 'Overview',  icon: LayoutDashboard },
  { id: 'email',    label: 'Email',     icon: Mail },
  { id: 'bots',     label: 'Conversations', icon: Bot },
  { id: 'forms',    label: 'Forms',     icon: ClipboardList },
  { id: 'tickets',  label: 'Tickets',   icon: Ticket },
] as const

export function OverviewTabBar({ activeTab }: { activeTab: string }) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  return (
    <div className="flex items-end px-6 pt-3 gap-1 border-b border-gray-200 dark:border-white/8 bg-gray-50 dark:bg-[#1c1c1c] shrink-0">
      {TABS.map(({ id, label, icon: Icon }) => {
        const isActive = id === activeTab
        return (
          <button
            key={id}
            onClick={() =>
              startTransition(() =>
                router.push(id === 'overview' ? '/dashboard' : `/dashboard?tab=${id}`)
              )
            }
            className={[
              'flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-t-lg border transition-colors duration-150',
              isActive
                ? [
                    'bg-white dark:bg-[#1a1a1a]',
                    'text-gray-900 dark:text-gray-100',
                    'border-gray-200 dark:border-white/8',
                    'border-b-white dark:border-b-[#1a1a1a]',
                    '-mb-px relative z-10',
                    'shadow-[0_-2px_4px_rgba(0,0,0,0.04)]',
                  ].join(' ')
                : [
                    'bg-gray-100/70 dark:bg-white/[0.03]',
                    'text-gray-500 dark:text-gray-400',
                    'border-transparent',
                    'hover:text-gray-700 dark:hover:text-gray-200',
                    'hover:bg-gray-200/50 dark:hover:bg-white/5',
                  ].join(' '),
            ].join(' ')}
          >
            <Icon
              className={`w-3.5 h-3.5 ${
                isActive ? 'text-brand-600 dark:text-[#ec732e]' : ''
              }`}
            />
            {label}
          </button>
        )
      })}
    </div>
  )
}
