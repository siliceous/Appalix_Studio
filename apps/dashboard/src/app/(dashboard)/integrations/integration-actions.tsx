'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, AlertCircle, Trash2, Pencil, Eye } from 'lucide-react'
import { setIntegrationStatus, deleteIntegration } from '@/app/actions/integration'
import type { IntegrationStatus } from '@/lib/types'

interface Props {
  id: string
  status: IntegrationStatus
}

export function IntegrationActions({ id, status }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    if (status === 'active') {
      if (!window.confirm('Deactivate this integration? It will stop responding to messages.')) return
      startTransition(async () => {
        await setIntegrationStatus(id, 'inactive')
        router.refresh()
      })
    } else if (status === 'inactive') {
      startTransition(async () => {
        await setIntegrationStatus(id, 'active')
        router.refresh()
      })
    }
  }

  function handleDelete() {
    if (!window.confirm('Delete this integration? This cannot be undone.')) return
    startTransition(async () => {
      await deleteIntegration(id)
      router.refresh()
    })
  }

  const statusBadge =
    status === 'active' ? (
      <button
        onClick={handleToggle}
        disabled={isPending}
        title="Click to deactivate"
        className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700 hover:bg-green-200 transition-colors disabled:opacity-50"
      >
        <CheckCircle2 className="w-3 h-3" />
        Active
      </button>
    ) : status === 'inactive' ? (
      <button
        onClick={handleToggle}
        disabled={isPending}
        title="Click to activate"
        className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors disabled:opacity-50"
      >
        <XCircle className="w-3 h-3" />
        Inactive
      </button>
    ) : (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-600">
        <AlertCircle className="w-3 h-3" />
        Error
      </span>
    )

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {statusBadge}
      <a
        href={`/integrations/${id}`}
        className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
        title="Setup guide"
      >
        <Eye className="w-4 h-4" />
      </a>
      <a
        href={`/integrations/${id}/edit`}
        className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
        title="Edit"
      >
        <Pencil className="w-4 h-4" />
      </a>
      <button
        onClick={handleDelete}
        disabled={isPending}
        title="Delete"
        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}
