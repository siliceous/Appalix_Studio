'use client'

import { useTransition } from 'react'
import { deleteWorkspace } from '@/app/actions/workspace'

export function DeleteWorkspaceButton() {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    const confirmed = window.confirm(
      'Are you sure you want to delete this workspace?\n\n' +
      'This is permanent and cannot be undone. All bots, conversations, ' +
      'knowledge base data, and team members will be permanently removed.',
    )
    if (!confirmed) return

    startTransition(() => { deleteWorkspace() })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="px-4 py-2 border border-red-300 text-red-600 text-sm rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending ? 'Deleting workspace…' : 'Delete workspace'}
    </button>
  )
}
