'use client'

import { Eye } from 'lucide-react'

interface TakenIntoAccountBlockProps {
  items: string[]
}

export function TakenIntoAccountBlock({ items }: TakenIntoAccountBlockProps) {
  if (items.length === 0) return null

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <Eye className="w-3 h-3 text-gray-400" />
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
          Sage has taken into account
        </p>
      </div>
      <ul className="space-y-0.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600 shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
