'use client'

import { useState } from 'react'
import { Plus, Trash2, ChevronRight, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FormStep } from '@/features/forms/types'

interface Props {
  steps:          FormStep[]
  selectedStepId: string
  onSelectStep:   (id: string) => void
  onAddStep:      () => void
  onDeleteStep:   (id: string) => void
}

export function FormStepController({ steps, selectedStepId, onSelectStep, onAddStep, onDeleteStep }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const sorted = [...steps].sort((a, b) => a.order - b.order)

  return (
    <div className="shrink-0 flex items-center gap-1 px-4 py-2.5 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-x-auto [&::-webkit-scrollbar]:hidden">
      {sorted.map((step, i) => (
        <div key={step.id} className="flex items-center gap-1 shrink-0">
          {i > 0 && <ChevronRight className="w-3 h-3 text-gray-300 dark:text-gray-600 shrink-0" />}
          <div
            className="relative group"
            onMouseEnter={() => setHoveredId(step.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <button
              onClick={() => onSelectStep(step.id)}
              className={cn(
                'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors',
                selectedStepId === step.id
                  ? 'bg-brand-50 dark:bg-brand-500/10 border-brand-200 dark:border-brand-500/30 text-brand-600 dark:text-brand-400'
                  : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300 dark:hover:border-gray-600',
                step.type === 'success' && 'border-green-200 dark:border-green-500/30 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10',
              )}
            >
              {step.type === 'success' ? (
                <><Check className="w-3 h-3" />{step.name}</>
              ) : (
                <>{step.name}{selectedStepId === step.id && <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />}</>
              )}
            </button>

            {/* Delete button — only for input steps, on hover */}
            {step.type !== 'success' && hoveredId === step.id && (
              <button
                onClick={e => { e.stopPropagation(); onDeleteStep(step.id) }}
                className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-400 hover:bg-red-100 hover:text-red-500 transition-colors z-10"
              >
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        </div>
      ))}

      {/* Add step */}
      <button
        onClick={onAddStep}
        className="shrink-0 flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors border border-dashed border-gray-200 dark:border-gray-700 ml-1"
      >
        <Plus className="w-3 h-3" />Add option
      </button>
    </div>
  )
}
