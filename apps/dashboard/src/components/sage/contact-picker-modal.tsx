'use client'

import { useState } from 'react'
import { X, Search, User } from 'lucide-react'
import type { SageContact } from '@/lib/types'

type PickableContact = Pick<SageContact, 'id' | 'name' | 'company_name'>

interface ContactPickerModalProps {
  contacts:   PickableContact[]
  onSelect:   (contact: PickableContact) => void
  onClose:    () => void
}

export function ContactPickerModal({ contacts, onSelect, onClose }: ContactPickerModalProps) {
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? contacts.filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
    : contacts

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white dark:bg-[#1e1e1e] rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl w-full max-w-sm flex flex-col" style={{ maxHeight: '70vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b dark:border-white/8 shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Add a Contact</h2>
            <p className="text-xs text-gray-400 mt-0.5">Select an existing contact to create a lead</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8 transition-colors">
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b dark:border-white/8 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search contacts…"
              className="w-full pl-8 pr-3 py-1.5 text-sm border dark:border-white/10 rounded-lg bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#15A4AE]"
            />
          </div>
        </div>

        {/* Contact list */}
        <div className="flex-1 overflow-y-auto divide-y dark:divide-white/8">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <User className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-sm text-gray-400">No contacts found</p>
            </div>
          ) : filtered.map(contact => (
            <button
              key={contact.id}
              onClick={() => { onSelect(contact); onClose() }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-brand-50 dark:hover:bg-[#15A4AE]/8 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-[#15A4AE]/15 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-brand-600 dark:text-[#15A4AE]">
                  {contact.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{contact.name}</p>
                {contact.company_name && (
                  <p className="text-xs text-gray-400">{contact.company_name}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
