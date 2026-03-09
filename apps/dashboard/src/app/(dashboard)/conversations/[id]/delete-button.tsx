'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { deleteConversation } from '@/app/actions/conversation'

export function DeleteConversationButton({ id }: { id: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!window.confirm('Delete this conversation? This cannot be undone.')) return
    startTransition(async () => {
      await deleteConversation(id)
      router.push('/dashboard/bots')
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      title="Delete conversation"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 text-sm rounded-lg transition-colors disabled:opacity-50"
    >
      <Trash2 className="w-3.5 h-3.5" />
      Delete
    </button>
  )
}
