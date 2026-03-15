'use client'

import { useState, useTransition, useRef } from 'react'
import { X, Loader2, Check, TrendingUp, Building2, Briefcase, Headphones, Rocket, Sparkles, GripVertical, Plus, Trash2 } from 'lucide-react'
import { createPipeline } from '@/app/actions/sage'

interface CreatePipelineModalProps {
  onClose: () => void
}

const TEMPLATES = [
  {
    key:         'sales',
    name:        'Sales Pipeline',
    description: 'Qualify leads from chat into closed deals',
    icon:        TrendingUp,
    color:       'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    stages:      ['New Lead', 'Contacted', 'Qualified', 'Proposal Sent', 'Won / Lost'],
  },
  {
    key:         'agency',
    name:        'Agency Lead Gen',
    description: 'Manage inbound inquiries through to active clients',
    icon:        Building2,
    color:       'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400',
    stages:      ['Inquiry', 'Qualified', 'Proposal', 'Contract', 'Active Client'],
  },
  {
    key:         'consulting',
    name:        'Consulting Sales',
    description: 'Track consulting engagements from discovery to delivery',
    icon:        Briefcase,
    color:       'bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400',
    stages:      ['Discovery', 'Proposal', 'Scoping', 'Approved', 'Completed'],
  },
  {
    key:         'support',
    name:        'Customer Support',
    description: 'Route and resolve support requests efficiently',
    icon:        Headphones,
    color:       'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400',
    stages:      ['Open', 'In Progress', 'Pending', 'Resolved'],
  },
  {
    key:         'onboarding',
    name:        'Onboarding',
    description: 'Guide new customers through setup and go-live',
    icon:        Rocket,
    color:       'bg-brand-100 dark:bg-[#15A4AE]/20 text-brand-700 dark:text-[#15A4AE]',
    stages:      ['Welcome', 'Setup', 'Training', 'Go-Live', 'Review'],
  },
  {
    key:         'custom',
    name:        'Start from scratch',
    description: 'Build your own pipeline with custom stages',
    icon:        Sparkles,
    color:       'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300',
    stages:      ['To Do', 'In Progress', 'Done'],
  },
]

export function CreatePipelineModal({ onClose }: CreatePipelineModalProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [step,     setStep]     = useState<'pick' | 'name' | 'stages'>('pick')
  const [name,     setName]     = useState('')
  const [stages,   setStages]   = useState<string[]>([])
  const [pending,  startTransition] = useTransition()
  const dragIndexRef = useRef<number | null>(null)

  const template = TEMPLATES.find(t => t.key === selected)

  function handleNext() {
    if (!selected) return
    setName(template?.key !== 'custom' ? (template?.name ?? '') : '')
    setStep('name')
  }

  function handleToStages() {
    if (!name.trim()) return
    setStages(template?.stages ?? ['To Do', 'In Progress', 'Done'])
    setStep('stages')
  }

  function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    const formData = new FormData()
    formData.set('template', selected ?? 'custom')
    formData.set('name', name.trim())
    formData.set('custom_stages', JSON.stringify(stages.filter(s => s.trim())))
    startTransition(() => {
      createPipeline(formData)
    })
  }

  // Stage list management
  function updateStage(i: number, val: string) {
    setStages(prev => prev.map((s, idx) => idx === i ? val : s))
  }

  function deleteStage(i: number) {
    setStages(prev => prev.filter((_, idx) => idx !== i))
  }

  function addStage() {
    setStages(prev => [...prev, ''])
  }

  // HTML5 drag-to-reorder
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white dark:bg-[#1e1e1e] rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-white/8">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Create Pipeline</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {step === 'pick'   ? 'Choose a template to get started'
             : step === 'name'  ? 'Name your pipeline'
             :                    'Customise your stages'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8 transition-colors">
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Step 1 — pick template */}
        {step === 'pick' && (
          <>
            <div className="p-5 grid grid-cols-3 gap-2.5">
              {TEMPLATES.map(t => {
                const Icon = t.icon
                const isSelected = selected === t.key
                return (
                  <button
                    key={t.key}
                    onClick={() => setSelected(t.key)}
                    className={`relative text-left p-3 rounded-xl border-2 transition-all duration-150 ${
                      isSelected
                        ? 'border-brand-500 dark:border-[#15A4AE] bg-brand-50 dark:bg-[#15A4AE]/12 shadow-sm'
                        : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/4 hover:border-gray-300 dark:hover:border-white/20 hover:bg-white dark:hover:bg-white/7'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-brand-600 dark:bg-[#15A4AE] flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 text-white dark:text-[#1c1c1c]" />
                      </div>
                    )}
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 ${t.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <p className={`text-xs font-semibold mb-0.5 pr-4 leading-snug ${isSelected ? 'text-brand-800 dark:text-[#15A4AE]' : 'text-gray-900 dark:text-gray-100'}`}>
                      {t.name}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2 leading-relaxed">{t.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {t.stages.map(s => (
                        <span
                          key={s}
                          className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                            isSelected
                              ? 'bg-brand-100 dark:bg-[#15A4AE]/20 text-brand-700 dark:text-[#15A4AE]'
                              : 'bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 dark:border-white/8">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-white/20 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleNext}
                disabled={!selected}
                className="flex-1 px-4 py-2 text-sm bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 dark:disabled:bg-white/10 text-white disabled:text-gray-500 dark:disabled:text-gray-500 font-medium rounded-xl transition-colors"
              >
                Continue →
              </button>
            </div>
          </>
        )}

        {/* Step 2 — name */}
        {step === 'name' && (
          <div className="p-6 space-y-4">
            {template && (
              <div className={`p-3 rounded-xl border ${template.color.includes('brand') ? 'bg-brand-50 dark:bg-[#15A4AE]/12 border-brand-100 dark:border-[#15A4AE]/25' : 'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/10'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center ${template.color}`}>
                    <template.icon className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{template.name}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {template.stages.map(s => (
                    <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-white dark:bg-white/10 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/12">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Pipeline Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="e.g. Q1 Sales 2026"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleToStages() } }}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#15A4AE]"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setStep('pick')}
                className="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-white/20 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors font-medium"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleToStages}
                disabled={!name.trim()}
                className="flex-1 px-4 py-2 text-sm bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 dark:disabled:bg-white/10 text-white disabled:text-gray-500 dark:disabled:text-gray-500 font-medium rounded-xl transition-colors"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — customise stages */}
        {step === 'stages' && (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Drag to reorder · click to rename · press × to remove
            </p>

            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
              {stages.map((stage, i) => (
                <div
                  key={i}
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragOver={e => handleDragOver(e, i)}
                  className="flex items-center gap-2 group"
                >
                  <GripVertical className="w-4 h-4 text-gray-300 dark:text-gray-600 cursor-grab shrink-0" />
                  <span className="text-xs text-gray-400 dark:text-gray-500 w-5 shrink-0 text-right">{i + 1}</span>
                  <input
                    type="text"
                    value={stage}
                    onChange={e => updateStage(i, e.target.value)}
                    placeholder="Stage name"
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#15A4AE]"
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
              className="flex items-center gap-1.5 text-xs font-medium text-[#3d9585] dark:text-[#15A4AE] hover:text-brand-700 dark:hover:text-[#15A4AE]/80 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Stage
            </button>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setStep('name')}
                className="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-white/20 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors font-medium"
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={pending || stages.filter(s => s.trim()).length === 0}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 dark:disabled:bg-white/10 text-white disabled:text-gray-500 dark:disabled:text-gray-500 font-medium rounded-xl transition-colors"
              >
                {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {pending ? 'Creating…' : 'Create Pipeline'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
