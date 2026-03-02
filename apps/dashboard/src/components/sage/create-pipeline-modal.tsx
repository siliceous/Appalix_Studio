'use client'

import { useState, useTransition } from 'react'
import { X, Loader2, Check } from 'lucide-react'
import { createPipeline } from '@/app/actions/sage'

interface CreatePipelineModalProps {
  onClose: () => void
}

const TEMPLATES = [
  {
    key:         'sales',
    name:        'Sales Pipeline',
    description: 'Qualify leads from chat into closed deals',
    stages:      ['New Lead', 'Contacted', 'Qualified', 'Proposal Sent', 'Won / Lost'],
  },
  {
    key:         'agency',
    name:        'Agency Lead Gen',
    description: 'Manage inbound inquiries through to active clients',
    stages:      ['Inquiry', 'Qualified', 'Proposal', 'Contract', 'Active Client'],
  },
  {
    key:         'consulting',
    name:        'Consulting Sales',
    description: 'Track consulting engagements from discovery to delivery',
    stages:      ['Discovery', 'Proposal', 'Scoping', 'Approved', 'Completed'],
  },
  {
    key:         'support',
    name:        'Customer Support',
    description: 'Route and resolve support requests',
    stages:      ['Open', 'In Progress', 'Pending', 'Resolved'],
  },
  {
    key:         'onboarding',
    name:        'Onboarding',
    description: 'Guide new customers through setup and go-live',
    stages:      ['Welcome', 'Setup', 'Training', 'Go-Live', 'Review'],
  },
  {
    key:         'custom',
    name:        'Start from scratch',
    description: 'Build your own pipeline with custom stages',
    stages:      ['To Do', 'In Progress', 'Done'],
  },
]

export function CreatePipelineModal({ onClose }: CreatePipelineModalProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [step,     setStep]     = useState<'pick' | 'name'>('pick')
  const [name,     setName]     = useState('')
  const [pending,  startTransition] = useTransition()

  const template = TEMPLATES.find(t => t.key === selected)

  function handleNext() {
    if (!selected) return
    setName(template?.key !== 'custom' ? (template?.name ?? '') : '')
    setStep('name')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const formData = new FormData()
    formData.set('template', selected ?? 'custom')
    formData.set('name', name.trim())
    startTransition(() => {
      createPipeline(formData)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white dark:bg-[#232323] rounded-2xl border dark:border-white/8 shadow-2xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-white/8">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Create Pipeline</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {step === 'pick' ? 'Choose a template or start from scratch' : 'Name your pipeline'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {step === 'pick' ? (
          <>
            <div className="p-6 grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
              {TEMPLATES.map(t => (
                <button
                  key={t.key}
                  onClick={() => setSelected(t.key)}
                  className={`relative text-left p-4 rounded-xl border transition-all ${
                    selected === t.key
                      ? 'border-brand-500 dark:border-[#61c2ad] bg-brand-50 dark:bg-[#61c2ad]/10'
                      : 'border-gray-200 dark:border-white/8 hover:border-gray-300 dark:hover:border-white/15'
                  }`}
                >
                  {selected === t.key && (
                    <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-brand-600 dark:bg-[#61c2ad] flex items-center justify-center">
                      <Check className="w-3 h-3 text-white dark:text-[#1c1c1c]" />
                    </div>
                  )}
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1 pr-6">{t.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">{t.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {t.stages.map(s => (
                      <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400">
                        {s}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-3 px-6 py-4 border-t dark:border-white/8">
              <button onClick={onClose} className="flex-1 px-4 py-2 text-sm border dark:border-white/10 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleNext}
                disabled={!selected}
                className="flex-1 px-4 py-2 text-sm bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-colors disabled:opacity-40"
              >
                Continue →
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {template && (
              <div className="p-3 rounded-xl bg-brand-50 dark:bg-[#61c2ad]/10 border border-brand-100 dark:border-[#61c2ad]/20">
                <p className="text-xs font-medium text-brand-700 dark:text-[#61c2ad] mb-1">Template: {template.name}</p>
                <div className="flex flex-wrap gap-1">
                  {template.stages.map(s => (
                    <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-white dark:bg-[#232323] text-gray-500 dark:text-gray-400 border dark:border-white/8">
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
                className="w-full px-3 py-2 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#61c2ad]"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setStep('pick')} className="flex-1 px-4 py-2 text-sm border dark:border-white/10 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                ← Back
              </button>
              <button
                type="submit"
                disabled={pending || !name.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-colors disabled:opacity-60"
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
