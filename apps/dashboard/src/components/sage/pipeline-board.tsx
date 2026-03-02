'use client'

import { useState } from 'react'
import { Plus, GripVertical } from 'lucide-react'
import { moveDeal } from '@/app/actions/sage'
import { DealModal } from './deal-modal'
import type { SageDeal, SagePipelineStage, SageContact } from '@/lib/types'

type DealWithContact = SageDeal & {
  contact: Pick<SageContact, 'id' | 'name'> | null
}

interface PipelineBoardProps {
  pipelineId: string
  stages:     SagePipelineStage[]
  deals:      DealWithContact[]
  contacts:   Pick<SageContact, 'id' | 'name'>[]
}

export function PipelineBoard({ pipelineId, stages, deals: initialDeals, contacts }: PipelineBoardProps) {
  const [deals,         setDeals]        = useState<DealWithContact[]>(initialDeals)
  const [dragId,        setDragId]       = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)
  const [showDealModal, setShowDealModal] = useState(false)
  const [defaultStage,  setDefaultStage] = useState<string | undefined>()

  function formatCurrency(value: number | null, currency: string) {
    if (!value) return null
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
  }

  function stageTotal(stageId: string) {
    return deals
      .filter(d => d.stage_id === stageId && d.value)
      .reduce((sum, d) => sum + (d.value ?? 0), 0)
  }

  function handleDragStart(e: React.DragEvent, dealId: string) {
    e.dataTransfer.setData('dealId', dealId)
    e.dataTransfer.effectAllowed = 'move'
    setDragId(dealId)
  }

  function handleDragEnd() {
    setDragId(null)
    setDragOverStage(null)
  }

  function handleDragOver(e: React.DragEvent, stageId: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverStage(stageId)
  }

  function handleDrop(e: React.DragEvent, stageId: string) {
    e.preventDefault()
    const dealId = e.dataTransfer.getData('dealId')
    if (!dealId) return
    setDragId(null)
    setDragOverStage(null)

    // Optimistic update
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage_id: stageId } : d))

    // Persist
    moveDeal(dealId, stageId).catch(() => {
      // Revert on error
      setDeals(initialDeals)
    })
  }

  function openAddDeal(stageId: string) {
    setDefaultStage(stageId)
    setShowDealModal(true)
  }

  const statusColors: Record<string, string> = {
    open: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
    won:  'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400',
    lost: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  }

  return (
    <>
      <div className="flex gap-4 h-full overflow-x-auto px-6 py-5 pb-8">
        {stages.map(stage => {
          const stageDeals = deals.filter(d => d.stage_id === stage.id)
          const total      = stageTotal(stage.id)
          const isDragOver = dragOverStage === stage.id

          return (
            <div
              key={stage.id}
              className="flex-shrink-0 w-72 flex flex-col"
              onDragOver={e => handleDragOver(e, stage.id)}
              onDragLeave={() => setDragOverStage(null)}
              onDrop={e => handleDrop(e, stage.id)}
            >
              {/* Stage header */}
              <div className={`flex items-center gap-2 mb-3 px-1 rounded-lg transition-colors ${isDragOver ? 'bg-brand-50 dark:bg-[#61c2ad]/5' : ''}`}>
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: stage.color }} />
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex-1 truncate">{stage.name}</span>
                <span className="text-xs text-gray-400 shrink-0">{stageDeals.length}</span>
                {total > 0 && (
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0">
                    {new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(total)}
                  </span>
                )}
              </div>

              {/* Deal cards */}
              <div className={`flex-1 space-y-2 min-h-[120px] rounded-xl p-2 border-2 transition-colors ${
                isDragOver
                  ? 'border-brand-300 dark:border-[#61c2ad]/40 bg-brand-50/50 dark:bg-[#61c2ad]/5'
                  : 'border-transparent'
              }`}>
                {stageDeals.map(deal => (
                  <div
                    key={deal.id}
                    draggable
                    onDragStart={e => handleDragStart(e, deal.id)}
                    onDragEnd={handleDragEnd}
                    className={`bg-white dark:bg-[#2a2a2a] rounded-xl p-3.5 border dark:border-white/8 cursor-grab active:cursor-grabbing select-none transition-all ${
                      dragId === deal.id ? 'opacity-40 scale-95 rotate-1' : 'hover:shadow-sm hover:border-gray-200 dark:hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug">{deal.title}</p>
                        {deal.contact && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{deal.contact.name}</p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          {deal.value ? (
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {formatCurrency(deal.value, deal.currency)}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300 dark:text-gray-600">No value</span>
                          )}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[deal.status] ?? ''}`}>
                            {deal.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {stageDeals.length === 0 && !isDragOver && (
                  <div className="flex items-center justify-center h-16 rounded-lg border border-dashed border-gray-200 dark:border-white/10">
                    <p className="text-xs text-gray-300 dark:text-gray-600">Drop here</p>
                  </div>
                )}
              </div>

              {/* Add deal button */}
              <button
                onClick={() => openAddDeal(stage.id)}
                className="mt-2 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-white/5 transition-colors w-full"
              >
                <Plus className="w-3.5 h-3.5" />
                Add deal
              </button>
            </div>
          )
        })}
      </div>

      {showDealModal && (
        <DealModal
          pipelineId={pipelineId}
          stages={stages}
          contacts={contacts}
          defaultStageId={defaultStage}
          onClose={() => {
            setShowDealModal(false)
            setDefaultStage(undefined)
          }}
        />
      )}
    </>
  )
}
