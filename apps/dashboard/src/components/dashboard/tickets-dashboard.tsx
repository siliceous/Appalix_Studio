'use client'

import { useState } from 'react'
import { TicketCheck, User, Clock, Mail, Phone, ExternalLink, Inbox } from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import type { SageTicket, SageContact } from '@/lib/types'

type TicketRow = SageTicket & {
  contact: Pick<SageContact, 'id' | 'name' | 'email'> | null
}

const PRIORITY_STYLES: Record<string, { dot: string; badge: string; label: string }> = {
  urgent: { dot: 'bg-red-500',    badge: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',    label: 'Urgent' },
  high:   { dot: 'bg-[#ec732e]', badge: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400', label: 'High' },
  medium: { dot: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400', label: 'Medium' },
  low:    { dot: 'bg-gray-400',  badge: 'bg-gray-100 text-gray-600 dark:bg-white/8 dark:text-gray-400',   label: 'Low' },
}

const STATUS_STYLES: Record<string, { badge: string; label: string }> = {
  open:        { badge: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',   label: 'Open' },
  pending:     { badge: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400', label: 'Pending' },
  resolved:    { badge: 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400', label: 'Resolved' },
  in_progress: { badge: 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400', label: 'In Progress' },
  closed:      { badge: 'bg-gray-100 text-gray-600 dark:bg-white/8 dark:text-gray-400',      label: 'Closed' },
}

export function TicketsDashboard({ tickets }: { tickets: TicketRow[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(
    tickets.length > 0 ? tickets[0].id : null,
  )

  const selected = tickets.find((t) => t.id === selectedId) ?? null

  if (tickets.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-[#1c1c1c]">
        <div className="text-center max-w-xs">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 rounded-xl flex items-center justify-center mx-auto mb-3">
            <TicketCheck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No tickets yet</p>
          <p className="text-xs text-gray-400 mb-4">Support tickets created from email or chat will appear here.</p>
          <a href="/sage/tickets" className="text-xs text-brand-600 dark:text-[#ec732e] hover:underline">
            Go to Tickets →
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left panel — ticket list */}
      <aside className="w-[280px] shrink-0 flex flex-col border-r border-gray-200 dark:border-white/8 bg-gray-50/80 dark:bg-[#161616] overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-white/8 flex items-center justify-between shrink-0">
          <h2 className="text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
            Tickets
          </h2>
          <span className="text-xs bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-400 rounded-full px-2 py-0.5 font-medium">
            {tickets.length}
          </span>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {tickets.map((ticket) => {
            const priority = PRIORITY_STYLES[ticket.priority ?? 'low']
            const isSelected = ticket.id === selectedId
            return (
              <button
                key={ticket.id}
                onClick={() => setSelectedId(ticket.id)}
                className={[
                  'w-full text-left px-4 py-3 border-b border-gray-100 dark:border-white/5 transition-colors',
                  isSelected
                    ? 'bg-white dark:bg-[#1e1e1e]'
                    : 'hover:bg-gray-100/70 dark:hover:bg-white/4',
                ].join(' ')}
              >
                <div className="flex items-start gap-2.5">
                  <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${priority.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate leading-5">
                      {ticket.title}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                      {ticket.contact?.name ?? 'Unknown'} · {timeAgo(ticket.created_at)}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </aside>

      {/* Right panel — detail */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#1a1a1a]">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Inbox className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Select a ticket to view details</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            {/* Title row */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                {selected.title}
              </h1>
              <a
                href="/sage/tickets"
                className="shrink-0 flex items-center gap-1 text-xs text-brand-600 dark:text-[#ec732e] hover:underline"
              >
                View all
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-2 mb-5">
              {selected.priority && (
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${PRIORITY_STYLES[selected.priority]?.badge}`}>
                  {PRIORITY_STYLES[selected.priority]?.label} priority
                </span>
              )}
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLES[selected.status]?.badge ?? STATUS_STYLES.open.badge}`}>
                {STATUS_STYLES[selected.status]?.label ?? selected.status}
              </span>
              {selected.contact_method && (
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-gray-100 text-gray-600 dark:bg-white/8 dark:text-gray-400 flex items-center gap-1">
                  {selected.contact_method === 'email' ? (
                    <Mail className="w-3 h-3" />
                  ) : (
                    <Phone className="w-3 h-3" />
                  )}
                  via {selected.contact_method}
                </span>
              )}
            </div>

            {/* Description */}
            {selected.description && (
              <div className="mb-5">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Description
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {selected.description}
                </p>
              </div>
            )}

            {/* Contact */}
            {selected.contact && (
              <div className="mb-5 p-3 rounded-xl border border-gray-100 dark:border-white/8 bg-gray-50 dark:bg-white/3">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Contact
                </p>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-brand-100 dark:bg-[#ec732e]/10 flex items-center justify-center shrink-0">
                    <User className="w-3.5 h-3.5 text-brand-600 dark:text-[#ec732e]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {selected.contact.name}
                    </p>
                    {selected.contact.email && (
                      <p className="text-xs text-gray-400">{selected.contact.email}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              <span>Opened {timeAgo(selected.created_at)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
