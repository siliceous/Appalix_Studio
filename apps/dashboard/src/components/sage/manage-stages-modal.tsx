'use client'

import { useState, useTransition, useRef } from 'react'
import { X, Loader2, GripVertical, Plus, Trash2 } from 'lucide-react'
import { updatePipelineStages } from '@/app/actions/sage'

interface ManageStagesModalProps {
  pipelineId:   string
  initialStages: string[]
  onClose:      () => void
  onSaved:      (newStageNames: string[]) => void
}

export function ManageStagesModal({ pipelineId, initialStages, onClose, onSaved }: ManageStagesModalProps) {
  const [stages, setStages]   = useState<string[]>(initialStages)
  const [pending, startTransition] = useTransition()
  const dragIndexRef = useRef<number | null>(null)

  function updateStage(i: number, val: string) {
    setStages(prev => prev.map((s, idx) => idx === i ? val : s))
  }

  function deleteStage(i: number) {
    setStages(prev => prev.filter((_, idx) => idx !== i))
  }

  function addStage() {
    setStages(prev => [...prev, ''])
  }

  function handleDragStart(i: number) {
    dragIndexRef.current = i
  }

  function handleDragOver(e: React.DragEvent, i: number) {
    e.preventDefault()
    const from = dragIndexRef.current
    if (from === null || from === i) return
    setStages(prev => {
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(i, 0, item)
      return next
    })
    dragIndexRef.current = i
  }

  function handleSave() {
    const filtered = stages.filter(s => s.trim())
    if (filtered.length === 0) return
    startTransition(async () => {
      await updatePipelineStages(pipelineId, filtered)
      onSaved(filtered)
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white dark:bg-[#232323] rounded-2xl border dark:border-white/8 shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-white/8">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Manage Stages</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-xs text-gray-400 dark:text-gray-500">Drag to reorder · click to rename · press × to remove</p>

          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {stages.map((stage, i) => (
              <div
                key={i}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={e => handleDragOver(e, i)}
                className="flex items-center gap-2"
              >
                <GripVertical className="w-4 h-4 text-gray-300 dark:text-gray-600 cursor-grab shrink-0" />
                <span className="text-xs text-gray-400 dark:text-gray-500 w-5 shrink-0 text-right">{i + 1}</span>
                <input
                  type="text"
                  value={stage}
                  onChange={e => updateStage(i, e.target.value)}
                  placeholder="Stage name"
                  className="flex-1 px-3 py-1.5 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#15A4AE]"
                />
                <button
                  type="button"
                  onClick={() => deleteStage(i)}
                  disabled={stages.length <= 1}
                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors disabled:opacity-30"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addStage}
            className="flex items-center gap-1.5 text-xs font-medium text-[#3d9585] dark:text-[#15A4AE] hover:opacity-80 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Stage
          </button>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm border dark:border-white/10 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={pending || stages.filter(s => s.trim()).length === 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-colors disabled:opacity-60"
            >
              {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {pending ? 'Saving…' : 'Save Stages'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
