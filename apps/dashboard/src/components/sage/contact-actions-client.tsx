'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Plus } from 'lucide-react'
import { ContactModal } from './contact-modal'
import { DealModal } from './deal-modal'
import type { SageContact, SagePipelineStage, SagePipeline } from '@/lib/types'

interface ContactActionsClientProps {
  contact:      SageContact
  pipelineId:   string | null
  stages:       SagePipelineStage[]
  allPipelines: Pick<SagePipeline, 'id' | 'name'>[]
  ownerName:    string
}

export function ContactActionsClient({
  contact,
  pipelineId,
  stages,
  allPipelines,
  ownerName,
}: ContactActionsClientProps) {
  const router = useRouter()
  const [showEdit, setShowEdit] = useState(false)
  const [showDeal, setShowDeal] = useState(false)
  const [noPipelineMsg, setNoPipelineMsg] = useState(false)

  function handleAddDeal() {
    if (!pipelineId) {
      setNoPipelineMsg(true)
      setTimeout(() => setNoPipelineMsg(false), 3000)
      return
    }
    setShowDeal(true)
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setShowEdit(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border dark:border-white/10 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          title="Edit contact"
        >
          <Pencil className="w-3 h-3" />
          Edit
        </button>
        <button
          onClick={handleAddDeal}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors"
          title="Add deal for this contact"
        >
          <Plus className="w-3 h-3" />
          Add Deal
        </button>
      </div>

      {noPipelineMsg && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
          No pipeline found — create one first.
        </p>
      )}

      {showEdit && (
        <ContactModal
          contact={contact}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false)
            router.refresh()
          }}
        />
      )}

      {showDeal && pipelineId && (
        <DealModal
          pipelineId={pipelineId}
          stages={stages}
          contacts={[{ id: contact.id, name: contact.name }]}
          allPipelines={allPipelines}
          ownerName={ownerName}
          defaultContactId={contact.id}
          onClose={() => setShowDeal(false)}
        />
      )}
    </>
  )
}
