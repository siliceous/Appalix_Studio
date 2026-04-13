'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface VoiceSubNavProps {
  botId?: string
  botName?: string
}

export function VoiceSubNav({ botId }: VoiceSubNavProps) {
  const pathname = usePathname()

  const tabs = [
    ...(botId
      ? [{ label: 'Voice Config', href: `/agent/bots/${botId}`, match: `/agent/bots/${botId}` }]
      : []),
    {
      label: 'Training',
      href: botId ? `/agent/voice-training?bot=${botId}` : '/agent/voice-training',
      match: '/agent/voice-training',
    },
    {
      label: 'Knowledge Base',
      href: botId ? `/agent/knowledge-base/voice?bot=${botId}` : '/agent/knowledge-base/voice',
      match: '/agent/knowledge-base/voice',
    },
    {
      label: 'Phone Agents',
      href: '/phone/voice-agents',
      match: '/phone/voice-agents',
    },
  ]

  return (
    <div className="flex items-center gap-1 mb-6 p-1 bg-gray-100 dark:bg-white/5 rounded-xl w-fit flex-wrap">
      {tabs.map(tab => {
        const active = pathname.startsWith(tab.match)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              active
                ? 'bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
