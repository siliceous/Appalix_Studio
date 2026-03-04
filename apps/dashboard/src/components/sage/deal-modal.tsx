'use client'

import { useTransition } from 'react'
import { X, Loader2 } from 'lucide-react'
import { createDeal } from '@/app/actions/sage'
import type { SageContact, SagePipelineStage, SagePipeline } from '@/lib/types'

interface DealModalProps {
  pipelineId:        string
  stages:            SagePipelineStage[]
  contacts:          Pick<SageContact, 'id' | 'name'>[]
  allPipelines:      Pick<SagePipeline, 'id' | 'name'>[]
  ownerName:         string
  defaultStageId?:   string
  defaultContactId?: string
  onClose:           () => void
}

const FIELD_CLS = 'w-full px-3 py-2 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#61c2ad]'
const LABEL_CLS = 'block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5'

export function DealModal({
  pipelineId,
  stages,
  contacts,
  allPipelines,
  ownerName,
  defaultStageId,
  defaultContactId,
  onClose,
}: DealModalProps) {
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    // pipeline_id comes from the <select> named "pipeline_id" in the form
    startTransition(async () => {
      await createDeal(formData)
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white dark:bg-[#232323] rounded-2xl border dark:border-white/8 shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-white/8 shrink-0">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Add a New Item</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto flex-1">

          {/* Name */}
          <div>
            <label className={LABEL_CLS}>Name <span className="text-red-500">*</span></label>
            <input
              name="title"
              type="text"
              required
              autoFocus
              placeholder="e.g. Acme Corp — Enterprise plan"
              className={FIELD_CLS}
            />
          </div>

          {/* Pipeline + Stage (2 col) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>Pipeline</label>
              <select name="pipeline_id" defaultValue={pipelineId} className={FIELD_CLS}>
                {allPipelines.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Stage</label>
              <select
                name="stage_id"
                defaultValue={defaultStageId ?? stages[0]?.id ?? ''}
                className={FIELD_CLS}
              >
                {stages.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Primary Contact + Company (2 col) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>Primary Contact</label>
              <select name="contact_id" defaultValue={defaultContactId ?? ''} className={FIELD_CLS}>
                <option value="">No contact</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Company</label>
              <input
                name="company_name"
                type="text"
                placeholder="e.g. Acme Corp"
                className={FIELD_CLS}
              />
            </div>
          </div>

          {/* Status + Owner (2 col) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>Status</label>
              <select name="status" defaultValue="open" className={FIELD_CLS}>
                <option value="open">Open</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Owner</label>
              <input
                type="text"
                value={ownerName}
                readOnly
                className={`${FIELD_CLS} opacity-60 cursor-default`}
              />
            </div>
          </div>

          {/* Value + Currency (2 col) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>Value</label>
              <input
                name="value"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className={FIELD_CLS}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Currency</label>
              <select name="currency" className={FIELD_CLS}>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
                <option value="EUR">EUR</option>
                <option value="AUD">AUD</option>
                <option value="CAD">CAD</option>
              </select>
            </div>
          </div>

          {/* Close Date + Source (2 col) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>Close Date</label>
              <input
                name="close_date"
                type="date"
                className={`${FIELD_CLS} dark:[color-scheme:dark]`}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Source</label>
              <select name="source" className={FIELD_CLS}>
                <option value="">Select…</option>
                <option value="manual">Manual</option>
                <option value="chat">Chat</option>
                <option value="website">Website</option>
                <option value="referral">Referral</option>
                <option value="social">Social</option>
              </select>
            </div>
          </div>

          {/* Priority + Win % (2 col) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>Priority</label>
              <select name="priority" className={FIELD_CLS}>
                <option value="">None</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Win %</label>
              <input
                name="win_percentage"
                type="number"
                min="0"
                max="100"
                step="1"
                placeholder="0–100"
                className={FIELD_CLS}
              />
            </div>
          </div>

          {/* Visibility */}
          <div>
            <label className={LABEL_CLS}>Visibility</label>
            <select name="visibility" defaultValue="everyone" className={FIELD_CLS}>
              <option value="everyone">Everyone</option>
              <option value="team">Team</option>
              <option value="only_me">Only me</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className={LABEL_CLS}>Description</label>
            <textarea
              name="description"
              rows={3}
              placeholder="Notes about this deal…"
              className={`${FIELD_CLS} resize-none`}
            />
          </div>

          {/* Tags */}
          <div>
            <label className={LABEL_CLS}>Tags <span className="text-gray-400 font-normal">(comma-separated)</span></label>
            <input
              name="tags"
              type="text"
              placeholder="e.g. enterprise, q2, high-value"
              className={FIELD_CLS}
            />
          </div>

          <div className="flex gap-3 pt-1 pb-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm border dark:border-white/10 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-colors disabled:opacity-60"
            >
              {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {pending ? 'Adding…' : 'Add Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
