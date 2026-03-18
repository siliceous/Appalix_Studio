'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { deleteBot } from '@/app/actions/bot'

export function DeleteBotButton({ id }: { id: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!window.confirm('Delete this bot? All conversations and settings will be lost. This cannot be undone.')) return
    startTransition(async () => {
      await deleteBot(id)
      router.push('/bots')
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      title="Delete bot"
      className="inline-flex items-center gap-2 px-3 py-1.5 border border-red-200 dark:border-red-500/30 text-sm text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50"
    >
      <Trash2 className="w-4 h-4" />
      Delete
    </button>
  )
}
