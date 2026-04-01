'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon, Smile, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  const activeClass = 'bg-brand-50 border-brand-300 text-brand-700'
  const inactiveClass = 'border-gray-200 text-gray-600 hover:bg-gray-50'
  const base = 'flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium transition-colors'

  return (
    <div className="flex gap-3">
      <button onClick={() => setTheme('light')} className={`${base} ${theme === 'light' ? activeClass : inactiveClass}`}>
        <Sun className="w-4 h-4" />
        Light
      </button>
      <button onClick={() => setTheme('dark')} className={`${base} ${theme === 'dark' ? activeClass : inactiveClass}`}>
        <Moon className="w-4 h-4" />
        Dark
      </button>
      <button onClick={() => setTheme('happy')} className={`${base} ${theme === 'happy' ? activeClass : inactiveClass}`}>
        <Smile className="w-4 h-4" />
        Happy
      </button>
      <button
        onClick={() => setTheme('cool')}
        className={`${base} ${theme === 'cool' ? 'bg-[#233dff]/10 border-[#6877ed] text-[#04bbff]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
      >
        <Sparkles className="w-4 h-4" />
        Cool
      </button>
    </div>
  )
}
