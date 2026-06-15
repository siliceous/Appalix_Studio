'use client'

import { X } from 'lucide-react'
import { useState } from 'react'
import type { StudioMode } from './studio-layout'

interface SettingsPanelProps {
  mode: StudioMode
  walletBalance: number
}

export function SettingsPanel({ mode, walletBalance }: SettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(true)

  const SETTINGS_BY_MODE: Record<StudioMode, { title: string; items: string[] }> = {
    talking_actors: {
      title: 'Actors Settings',
      items: ['Background', 'Language', 'Accent'],
    },
    video: {
      title: 'Video Settings',
      items: ['Model Selection', 'Aspect Ratio', 'Duration', 'Resolution', 'Camera Movement'],
    },
    image: {
      title: 'Image Settings',
      items: ['Model Selection', 'Aspect Ratio', 'Style Preset', 'Brand Colours', 'Logo Overlay'],
    },
    voice: {
      title: 'Voice Settings',
      items: ['Voice Provider', 'Language', 'Accent', 'Emotion', 'Speed', 'Pitch'],
    },
    more: {
      title: 'More Options',
      items: ['Coming Soon'],
    },
  }

  const settings = SETTINGS_BY_MODE[mode]

  if (!isOpen) {
    return null
  }

  return (
    <div className="w-80 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 backdrop-blur-md shadow-lg dark:shadow-black/20 overflow-hidden flex flex-col max-h-96">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{settings.title}</h2>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors text-gray-500 dark:text-gray-400"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Settings content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {settings.items.map((item, idx) => (
          <div key={idx} className="space-y-2">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block">
              {item}
            </label>
            <select className="w-full px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
              <option>Select {item}</option>
              <option>Option 1</option>
              <option>Option 2</option>
            </select>
          </div>
        ))}

        {/* Wallet info */}
        <div className="border-t border-gray-200 dark:border-white/10 pt-4">
          <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-lg p-3">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Wallet Balance</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              ${walletBalance.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {Math.floor(walletBalance * 12.5)} credits available
            </p>
            <button className="mt-2 w-full px-3 py-2 text-xs font-medium bg-white dark:bg-white/10 hover:bg-gray-100 dark:hover:bg-white/20 text-gray-900 dark:text-gray-100 rounded transition-colors">
              Add Credits
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
