'use client'

import { useTransition } from 'react'
import { X, Loader2 } from 'lucide-react'
import { createTicket } from '@/app/actions/sage'
import type { SageContact } from '@/lib/types'

interface TicketModalProps {
  contacts: Pick<SageContact, 'id' | 'name'>[]
  onClose:  () => void
}

export function TicketModal({ contacts, onClose }: TicketModalProps) {
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      await createTicket(formData)
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white dark:bg-[#232323] rounded-2xl border dark:border-white/8 shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-white/8 shrink-0">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">New Ticket</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Customer Name
            </label>
            <input
              name="name"
              type="text"
              autoFocus
              placeholder="e.g. John Smith"
              className="w-full px-3 py-2 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#15A4AE]"
            />
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Email
              </label>
              <input
                name="email"
                type="email"
                placeholder="customer@example.com"
                className="w-full px-3 py-2 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#15A4AE]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Phone
              </label>
              <input
                name="phone"
                type="tel"
                placeholder="+1 555 000 0000"
                className="w-full px-3 py-2 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#15A4AE]"
              />
            </div>
          </div>
          <p className="text-[11px] text-gray-400 -mt-2">At least an email or phone number is required.</p>

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              name="title"
              type="text"
              required
              placeholder="e.g. Login issue for Acme Corp"
              className="w-full px-3 py-2 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#15A4AE]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
            <textarea
              name="description"
              rows={3}
              placeholder="Describe the issue…"
              className="w-full px-3 py-2 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#15A4AE] resize-none"
            />
          </div>

          {/* Urgency + Contact method */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Priority</label>
              <select
                name="priority"
                defaultValue="medium"
                className="w-full px-3 py-2 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#15A4AE]"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Contact via</label>
              <select
                name="contact_method"
                defaultValue="email"
                className="w-full px-3 py-2 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#15A4AE]"
              >
                <option value="email">Email</option>
                <option value="phone">Phone</option>
              </select>
            </div>
          </div>

          {/* Contact */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Contact</label>
            <select
              name="contact_id"
              className="w-full px-3 py-2 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#15A4AE]"
            >
              <option value="">None</option>
              {contacts.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Related URL */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Related URL <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              name="related_url"
              type="url"
              placeholder="https://…"
              className="w-full px-3 py-2 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#15A4AE]"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm border dark:border-white/10 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-colors disabled:opacity-60"
            >
              {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {pending ? 'Creating…' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
