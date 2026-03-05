'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { getContactDetail } from '@/app/actions/sage'
import { ContactModal } from './contact-modal'
import type { SageContact } from '@/lib/types'

interface ContactEditModalProps {
  contactId: string
  onClose:   () => void
  onSaved?:  (contact: SageContact) => void
}

export function ContactEditModal({ contactId, onClose, onSaved }: ContactEditModalProps) {
  const [contact, setContact] = useState<SageContact | null>(null)

  useEffect(() => {
    getContactDetail(contactId).then(setContact)
  }, [contactId])

  if (!contact) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <Loader2 className="relative w-6 h-6 animate-spin text-white" />
      </div>
    )
  }

  return <ContactModal contact={contact} onClose={onClose} onSaved={onSaved} />
}
