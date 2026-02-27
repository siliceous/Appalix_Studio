'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return (
    <div className="flex gap-3">
      <button
        onClick={() => setTheme('light')}
        className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
          theme === 'light'
            ? 'bg-brand-50 border-brand-300 text-brand-700 dark:bg-[#61c2ad]/10 dark:border-[#61c2ad]/40 dark:text-[#61c2ad]'
            : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
        }`}
      >
        <Sun className="w-4 h-4" />
        Light
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
          theme === 'dark'
            ? 'bg-brand-50 border-brand-300 text-brand-700 dark:bg-[#61c2ad]/10 dark:border-[#61c2ad]/40 dark:text-[#61c2ad]'
            : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
        }`}
      >
        <Moon className="w-4 h-4" />
        Dark
      </button>
    </div>
  )
}
