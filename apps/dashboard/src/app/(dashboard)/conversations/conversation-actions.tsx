'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Trash2, Pencil } from 'lucide-react'
import { deleteConversation, renameConversation } from '@/app/actions/conversation'

interface Props {
  id: string
  title: string | null
}

export function ConversationActions({ id, title }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!window.confirm('Delete this conversation? This cannot be undone.')) return
    startTransition(async () => {
      await deleteConversation(id)
      router.refresh()
    })
  }

  function handleRename() {
    const newTitle = window.prompt('Enter a title for this conversation:', title ?? '')
    if (newTitle === null) return // cancelled
    startTransition(async () => {
      await renameConversation(id, newTitle)
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-1 justify-end">
      <button
        onClick={handleRename}
        disabled={isPending}
        title="Rename conversation"
        className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors disabled:opacity-50"
      >
        <Pencil className="w-4 h-4" />
      </button>
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
