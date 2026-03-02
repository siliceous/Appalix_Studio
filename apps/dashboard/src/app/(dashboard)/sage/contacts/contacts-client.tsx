'use client'

import { useState } from 'react'
import { UserPlus, Search, Mail, Phone, Tag, ExternalLink, Trash2 } from 'lucide-react'
import { ContactModal } from '@/components/sage/contact-modal'
import { deleteContact } from '@/app/actions/sage'
import { timeAgo } from '@/lib/utils'
import Link from 'next/link'
import type { SageContact } from '@/lib/types'

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  chat:   { label: 'Chat',   color: 'bg-brand-50 text-brand-700 dark:bg-[#61c2ad]/10 dark:text-[#61c2ad]' },
  manual: { label: 'Manual', color: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400' },
  import: { label: 'Import', color: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' },
}

interface ContactsClientProps {
  contacts: SageContact[]
}

export function ContactsClient({ contacts: initialContacts }: ContactsClientProps) {
  const [contacts,    setContacts]    = useState(initialContacts)
  const [showModal,   setShowModal]   = useState(false)
  const [search,      setSearch]      = useState('')
  const [deleting,    setDeleting]    = useState<string | null>(null)

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  )

  async function handleDelete(id: string) {
    if (!confirm('Delete this contact? This cannot be undone.')) return
    setDeleting(id)
    try {
      await deleteContact(id)
      setContacts(prev => prev.filter(c => c.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Contacts</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{contacts.length} total</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          New Contact
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email or phone…"
          className="w-full pl-9 pr-4 py-2.5 text-sm border dark:border-white/10 rounded-xl bg-white dark:bg-[#232323] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#61c2ad]"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <UserPlus className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {search ? 'No contacts match your search.' : 'No contacts yet. Add your first one.'}
            </p>
            {!search && (
              <button
                onClick={() => setShowModal(true)}
                className="mt-4 text-sm text-brand-600 dark:text-[#61c2ad] hover:underline"
              >
                Add a contact →
              </button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-white/8 bg-gray-50 dark:bg-white/3">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Contact</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">Tags</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Source</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden xl:table-cell">Added</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-white/8">
              {filtered.map(contact => {
                const src = SOURCE_LABELS[contact.source] ?? SOURCE_LABELS.manual
                return (
                  <tr key={contact.id} className="hover:bg-gray-50 dark:hover:bg-white/3 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-[#61c2ad]/15 flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-brand-700 dark:text-[#61c2ad]">
                            {contact.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{contact.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <div className="space-y-0.5">
                        {contact.email && (
                          <p className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                            <Mail className="w-3 h-3" /> {contact.email}
                          </p>
                        )}
                        {contact.phone && (
                          <p className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                            <Phone className="w-3 h-3" /> {contact.phone}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      {contact.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {contact.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-400">
                              <Tag className="w-2.5 h-2.5" />
                              {tag}
                            </span>
                          ))}
                          {contact.tags.length > 3 && (
                            <span className="text-[10px] text-gray-400">+{contact.tags.length - 3}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${src.color}`}>
                        {src.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 hidden xl:table-cell">
                      <span className="text-xs text-gray-400">{timeAgo(contact.created_at)}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 justify-end">
                        <Link
                          href={`/sage/contacts/${contact.id}`}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8 transition-colors"
                          title="View contact"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                        </Link>
                        <button
                          onClick={() => handleDelete(contact.id)}
                          disabled={deleting === contact.id}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                          title="Delete contact"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && <ContactModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
