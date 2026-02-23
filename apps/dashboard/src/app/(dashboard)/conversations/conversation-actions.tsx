'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Trash2 } from 'lucide-react'
import { deleteConversation } from '@/app/actions/conversation'

interface Props {
  id: string
}

export function ConversationActions({ id }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!window.confirm('Delete this conversation? This cannot be undone.')) return
    startTransition(async () => {
      await deleteConversation(id)
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-1 justify-end">
      <a
        href={`/api/conversations/${id}/export`}
        download
        title="Download as plain text"
        className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
      >
        <Download className="w-4 h-4" />
      </a>
      <button
        onClick={handleDelete}
        disabled={isPending}
        title="Delete conversation"
        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}
