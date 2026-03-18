'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { deleteIntegration } from '@/app/actions/integration'

export function DeleteIntegrationButton({ id }: { id: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!window.confirm('Delete this integration? This cannot be undone.')) return
    startTransition(async () => {
      await deleteIntegration(id)
      router.push('/integrations')
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      title="Delete integration"
      className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-red-200 dark:bg-white/5 dark:border-red-500/30 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50"
    >
      <Trash2 className="w-4 h-4" />
      Delete
    </button>
  )
}
