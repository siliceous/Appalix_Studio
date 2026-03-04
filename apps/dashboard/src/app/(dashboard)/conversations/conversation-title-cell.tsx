'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { renameConversation } from '@/app/actions/conversation'

interface Props {
  id:    string
  title: string | null
}

export function ConversationTitleCell({ id, title }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleRename(e: React.MouseEvent) {
    e.preventDefault()
    const newTitle = window.prompt('Enter a title for this conversation:', title ?? '')
    if (newTitle === null) return
    startTransition(async () => {
      await renameConversation(id, newTitle)
      router.refresh()
    })
  }

  return (
    <span className="group inline-flex items-center gap-1.5">
      <a
        href={`/conversations/${id}`}
        className="font-medium text-gray-900 dark:text-gray-100 hover:text-brand-700 dark:hover:text-[#61c2ad]"
      >
        {title ?? 'Untitled'}
      </a>
      <button
        onClick={handleRename}
        disabled={isPending}
        title="Rename conversation"
        className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-brand-600 dark:hover:text-[#61c2ad] rounded transition-all disabled:opacity-30"
      >
        <Pencil className="w-3 h-3" />
      </button>
    </span>
  )
}
