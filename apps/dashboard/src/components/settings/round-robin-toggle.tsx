'use client'

import { useState, useTransition } from 'react'
import { toggleRoundRobin } from '@/app/actions/workspace'

interface Props {
  enabled:   boolean
  isAdmin:   boolean
}

export function RoundRobinToggle({ enabled, isAdmin }: Props) {
  const [on, setOn]           = useState(enabled)
  const [isPending, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.checked
    setOn(next)
    startTransition(async () => {
      const res = await toggleRoundRobin(next)
      if (!res.success) {
        setOn(!next) // revert on error
        alert(res.error)
      }
    })
  }

  return (
    <label className={`flex items-center gap-3 ${!isAdmin || isPending ? 'opacity-60' : 'cursor-pointer'}`}>
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only"
          checked={on}
          disabled={!isAdmin || isPending}
          onChange={handleChange}
        />
        <div className={`w-10 h-5 rounded-full transition-colors ${on ? 'bg-brand-600' : 'bg-gray-200 dark:bg-white/15'}`}>
          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </div>
      </div>
      <span className="text-sm text-gray-700 dark:text-gray-300">
        {on ? 'On' : 'Off'}
      </span>
    </label>
  )
}
