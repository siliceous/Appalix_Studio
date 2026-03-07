'use client'

import { useState } from 'react'
import { Ticket, Plus, Trash2, Mail } from 'lucide-react'
import { TicketModal } from '@/components/sage/ticket-modal'
import { updateTicketStatus, deleteTicket } from '@/app/actions/sage'
import { timeAgo } from '@/lib/utils'
import type { SageTicket, SageContact, SageTicketStatus } from '@/lib/types'

type TicketWithContact = SageTicket & { contact: Pick<SageContact, 'id' | 'name' | 'email'> | null }

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low:    { label: 'Low',    color: 'bg-gray-100 text-gray-600 dark:bg-white/8 dark:text-gray-400' },
  medium: { label: 'Medium', color: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' },
  high:   { label: 'High',   color: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' },
  urgent: { label: 'Urgent', color: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400' },
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open:     { label: 'Open',     color: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400' },
  pending:  { label: 'Pending',  color: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' },
  resolved: { label: 'Resolved', color: 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400' },
}

const FILTERS: Array<{ label: string; value: string }> = [
  { label: 'All',      value: 'all' },
  { label: 'Open',     value: 'open' },
  { label: 'Pending',  value: 'pending' },
  { label: 'Resolved', value: 'resolved' },
]

interface TicketsClientProps {
  tickets:  TicketWithContact[]
  contacts: Pick<SageContact, 'id' | 'name'>[]
}

export function TicketsClient({ tickets: initialTickets, contacts }: TicketsClientProps) {
  const [tickets,   setTickets]   = useState(initialTickets)
  const [filter,    setFilter]    = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [deleting,  setDeleting]  = useState<string | null>(null)

  const filtered = filter === 'all' ? tickets : tickets.filter(t => t.status === filter)

  async function handleStatusChange(id: string, status: SageTicketStatus) {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status } : t))
    await updateTicketStatus(id, status)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this ticket?')) return
    setDeleting(id)
    try {
      await deleteTicket(id)
      setTickets(prev => prev.filter(t => t.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Tickets</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {tickets.filter(t => t.status === 'open').length} open · {tickets.length} total
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Ticket
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-5 p-1 bg-gray-100 dark:bg-white/5 rounded-xl w-fit">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f.value
                ? 'bg-white dark:bg-[#232323] text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {f.label}
            <span className="ml-1.5 text-xs text-gray-400">
              {f.value === 'all' ? tickets.length : tickets.filter(t => t.status === f.value).length}
            </span>
          </button>
        ))}
      </div>

      {/* Tickets list */}
      <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Ticket className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {filter === 'all' ? 'No tickets yet.' : `No ${filter} tickets.`}
            </p>
            {filter === 'all' && (
              <button onClick={() => setShowModal(true)} className="mt-3 text-sm text-brand-600 dark:text-[#61c2ad] hover:underline">
                Create your first ticket →
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y dark:divide-white/8">
            {filtered.map(ticket => {
              const pc = PRIORITY_CONFIG[ticket.priority] ?? PRIORITY_CONFIG.medium
              const sc = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.open

              return (
                <div key={ticket.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors">
                  {/* Priority dot */}
                  <div className="mt-0.5 shrink-0">
                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium ${pc.color}`}>
                      {pc.label}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{ticket.title}</p>
                    {ticket.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{ticket.description}</p>
                    )}
                    {ticket.contact && (
                      <p className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
                        <Mail className="w-3 h-3" />
                        {ticket.contact.name}
                        {ticket.contact.email && <span className="text-gray-300 dark:text-gray-600">· {ticket.contact.email}</span>}
                      </p>
                    )}
                    <p className="text-[11px] text-gray-400 mt-1">{timeAgo(ticket.created_at)}</p>
                  </div>

                  {/* Status selector */}
                  <div className="shrink-0 flex items-center gap-2">
                    <select
                      value={ticket.status}
                      onChange={e => handleStatusChange(ticket.id, e.target.value as SageTicketStatus)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#61c2ad] ${sc.color}`}
                    >
                      <option value="open">Open</option>
                      <option value="pending">Pending</option>
                      <option value="resolved">Resolved</option>
                    </select>

                    <button
                      onClick={() => handleDelete(ticket.id)}
                      disabled={deleting === ticket.id}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 hover:text-red-500" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showModal && <TicketModal contacts={contacts} onClose={() => setShowModal(false)} />}
    </div>
  )
}
