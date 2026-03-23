'use client'

import React, { useEffect, useState, useTransition } from 'react'
import { X, Loader2 } from 'lucide-react'
import { getPipelinesForPicker, createDealFromContext } from '@/app/actions/sage-triage'

type Pipeline = { id: string; name: string; stages: { id: string; name: string }[] }

interface Props {
  prefill: {
    title: string
    contactName: string
    contactEmail: string
    contactPhone?: string
    notes?: string
    source: 'chat' | 'email' | 'form'
    conversationId?: string
    submissionId?: string
  }
  onSuccess: (message: string) => void
  onClose: () => void
}

const FIELD = 'w-full px-3 py-2 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]'
const LABEL = 'block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5'

export function PipelinePickerModal({ prefill, onSuccess, onClose }: Props) {
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPipelineId, setSelectedPipelineId] = useState('')
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    getPipelinesForPicker().then(data => {
      setPipelines(data)
      if (data[0]) setSelectedPipelineId(data[0].id)
      setLoading(false)
    })
  }, [])

  const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId)
  const stages = selectedPipeline?.stages ?? []

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const pipelineId = fd.get('pipeline_id') as string
    const stageId    = fd.get('stage_id') as string
    const title      = fd.get('title') as string
    startTransition(async () => {
      const result = await createDealFromContext({
        title,
        contactName:    prefill.contactName,
        contactEmail:   prefill.contactEmail,
        contactPhone:   prefill.contactPhone,
        notes:          prefill.notes,
        source:         prefill.source,
        conversationId: prefill.conversationId,
        submissionId:   prefill.submissionId,
        pipelineId,
        stageId,
      })
      if (result.error) {
        onSuccess(`Error: ${result.error}`)
      } else {
        onSuccess(`Deal added to ${result.pipelineName}`)
      }
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#232323] rounded-2xl border dark:border-white/8 shadow-2xl w-full max-w-sm flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b dark:border-white/8">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Add a Deal</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-[#15A4AE]" />
          </div>
        ) : pipelines.length === 0 ? (
          <div className="px-5 py-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">No pipelines found. <a href="/sage/pipelines" className="text-[#15A4AE] hover:underline">Create one first →</a></p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
            <div>
              <label className={LABEL}>Deal title</label>
              <input name="title" type="text" required defaultValue={prefill.title} className={FIELD} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Pipeline</label>
                <select
                  name="pipeline_id"
                  value={selectedPipelineId}
                  onChange={e => setSelectedPipelineId(e.target.value)}
                  className={FIELD}
                >
                  {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL}>Stage</label>
                <select name="stage_id" defaultValue={stages[0]?.id ?? ''} className={FIELD}>
                  {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm border dark:border-white/10 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">Cancel</button>
              <button type="submit" disabled={pending} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-[#15A4AE] hover:bg-[#1290a0] text-white font-medium rounded-xl transition-colors disabled:opacity-60">
                {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {pending ? 'Adding…' : 'Add Deal'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
