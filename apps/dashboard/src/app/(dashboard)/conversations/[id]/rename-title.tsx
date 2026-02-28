'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Check, X } from 'lucide-react'
import { renameConversation } from '@/app/actions/conversation'

interface Props {
  id: string
  title: string | null
}

export function RenameConversationTitle({ id, title }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(title ?? '')
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  function handleSave() {
    startTransition(async () => {
      await renameConversation(id, value)
      setEditing(false)
      router.refresh()
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') {
      setValue(title ?? '')
      setEditing(false)
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isPending}
          placeholder="Conversation title…"
          className="text-xl font-semibold text-gray-900 border-b-2 border-brand-500 bg-transparent outline-none w-full max-w-md disabled:opacity-50"
        />
        <button
          onClick={handleSave}
          disabled={isPending}
          title="Save"
          className="p-1 text-brand-600 hover:bg-brand-50 rounded transition-colors disabled:opacity-50"
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          onClick={() => { setValue(title ?? ''); setEditing(false) }}
          disabled={isPending}
          title="Cancel"
          className="p-1 text-gray-400 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <h1 className="text-xl font-semibold text-gray-900">
        {title ?? 'Untitled conversation'}
      </h1>
      <button
        onClick={() => setEditing(true)}
        title="Rename conversation"
        className="p-1 text-gray-300 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
