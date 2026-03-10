'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Plus, ChevronDown, Loader2 } from 'lucide-react'
import { assignContact } from '@/app/actions/sage'
import { ContactModal } from './contact-modal'
import { DealModal } from './deal-modal'
import type { SageContact, SagePipelineStage, SagePipeline, WorkspaceMemberSummary } from '@/lib/types'

interface ContactActionsClientProps {
  contact:      SageContact
  pipelineId:   string | null
  stages:       SagePipelineStage[]
  allPipelines: Pick<SagePipeline, 'id' | 'name'>[]
  ownerName:    string
  members?:     WorkspaceMemberSummary[]
}

export function ContactActionsClient({
  contact,
  pipelineId,
  stages,
  allPipelines,
  ownerName,
  members,
}: ContactActionsClientProps) {
  const router = useRouter()
  const [showEdit, setShowEdit]       = useState(false)
  const [showDeal, setShowDeal]       = useState(false)
  const [noPipelineMsg, setNoPipelineMsg] = useState(false)
  const [assignedTo, setAssignedTo]   = useState<string>(contact.assigned_to ?? '')
  const [assigning, startAssign]      = useTransition()

  function handleAddDeal() {
    if (!pipelineId) {
      setNoPipelineMsg(true)
      setTimeout(() => setNoPipelineMsg(false), 3000)
      return
    }
    setShowDeal(true)
  }

  function handleAssign(userId: string) {
    const next = userId || null
    setAssignedTo(userId)
    startAssign(async () => {
      await assignContact(contact.id, next)
      router.refresh()
    })
  }

  const assignedMember = members?.find(m => m.user_id === assignedTo)

  return (
    <>
      <div className="flex items-center gap-1.5 flex-wrap justify-end">

        {/* Assign to dropdown — shown when there are members */}
        {members && members.length > 0 && (
          <div className="relative">
            <select
              value={assignedTo}
              onChange={e => handleAssign(e.target.value)}
              disabled={assigning}
              className="appearance-none pl-2.5 pr-7 py-1.5 text-xs border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/8 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#61c2ad] transition-colors disabled:opacity-50 max-w-[140px]"
            >
              <option value="">Unassigned</option>
              {members.map(m => (
                <option key={m.user_id} value={m.user_id}>
                  {m.name || m.email}
                </option>
              ))}
            </select>
            {assigning
              ? <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-gray-400 pointer-events-none" />
              : <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
            }
          </div>
        )}

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
          members={members}
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
          onClose={() => setShowDeal(false)}
        />
      )}
    </>
  )
}
