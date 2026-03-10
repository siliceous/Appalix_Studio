'use client'

import { ChevronDown } from 'lucide-react'

interface Member { user_id: string; name: string; email: string }

interface PipelineViewAsPickerProps {
  pipelineId:   string
  teamMembers:  Member[]
  viewAsUserId: string | null
}

export function PipelineViewAsPicker({ pipelineId, teamMembers, viewAsUserId }: PipelineViewAsPickerProps) {
  if (teamMembers.length === 0) return null

  return (
    <div className="relative ml-auto">
      <select
        value={viewAsUserId ?? ''}
        onChange={e => {
          const v = e.target.value
          window.location.href = v
            ? `/sage/pipelines/${pipelineId}?viewAs=${v}`
            : `/sage/pipelines/${pipelineId}`
        }}
        className="appearance-none pl-2.5 pr-7 py-1.5 text-xs border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/8 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#61c2ad] transition-colors"
      >
        <option value="">My view</option>
        {teamMembers.map(m => (
          <option key={m.user_id} value={m.user_id}>
            {m.name || m.email}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
    </div>
  )
}
