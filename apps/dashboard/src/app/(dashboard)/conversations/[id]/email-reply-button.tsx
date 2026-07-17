'use client'

import { useState } from 'react'
import { Mail } from 'lucide-react'
import { EmailComposeModal } from '@/components/dashboard/email-compose-modal'

interface Props {
  to:      string
  toName?: string
  subject: string
  context: string
}

export function ConversationEmailReplyButton({ to, toName, subject, context }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#15A4AE]/40 text-[#3a9e8a] dark:text-[#15A4AE] text-sm font-medium rounded-lg hover:bg-[#15A4AE]/8 transition-colors"
      >
        <Mail className="w-3.5 h-3.5" />
        Reply via Email
      </button>
      {open && (
        <EmailComposeModal
          to={to}
          toName={toName}
          subject={subject}
          context={context}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
