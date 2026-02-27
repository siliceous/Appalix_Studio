'use client'

import { useState } from 'react'
import { PLATFORM_META } from '@/lib/utils'
import type { Platform } from '@/lib/types'

const PLATFORMS: { platform: Platform; desc: string }[] = [
  { platform: 'web_widget',          desc: 'Embed a chat widget on any website' },
  { platform: 'custom_api',          desc: 'Connect via REST API with an API key' },
  { platform: 'slack',               desc: 'Respond to messages in Slack' },
  { platform: 'wordpress',           desc: 'Embed on a WordPress site' },
  { platform: 'facebook_messenger',  desc: 'Handle Messenger conversations' },
  { platform: 'whatsapp',            desc: 'Chat on WhatsApp Business' },
  { platform: 'google_chat',         desc: 'Answer questions in Google Chat' },
]

export function PlatformSelector({ defaultPlatform }: { defaultPlatform: Platform }) {
  const [selected, setSelected] = useState<Platform>(defaultPlatform)

  return (
    <div className="grid grid-cols-2 gap-2">
      {PLATFORMS.map(({ platform, desc }) => {
        const isSelected = selected === platform
        return (
          <label
            key={platform}
            className={
              isSelected
                ? 'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors bg-brand-100 border-brand-400 dark:bg-brand-900/40 dark:border-brand-400/60'
                : 'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
            }
          >
            <input
              type="radio"
              name="platform"
              value={platform}
              checked={isSelected}
              onChange={() => setSelected(platform)}
              className="mt-0.5 accent-brand-600"
            />
            <div>
              <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-1 ${PLATFORM_META[platform]?.color}`}>
                {PLATFORM_META[platform]?.label}
              </span>
              <p className="text-xs text-gray-500">{desc}</p>
            </div>
          </label>
        )
      })}
    </div>
  )
}
