'use client'

import { useState } from 'react'
import { TicketCheck, User, Clock, Mail, ExternalLink, Inbox, Bot, Pencil } from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import type { SageTicket, SageContact, SageTicketStatus } from '@/lib/types'
import { TicketSlideOver } from './ticket-slide-over'

// Derive ticket source for display.
// contact_method='email' → from Email.
// Anything else (chat, phone, null) → from Bot.
// Per spec, Bot overrides Email when a ticket has both origins.
function ticketSource(ticket: SageTicket): 'bot' | 'email' {
  return ticket.contact_method === 'email' ? 'email' : 'bot'
}

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
  open:        { badge: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',        label: 'Open' },
  in_progress: { badge: 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400', label: 'In Progress' },
  pending:     { badge: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',     label: 'Pending' },
  resolved:    { badge: 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400',     label: 'Resolved' },
  closed:      { badge: 'bg-gray-100 text-gray-600 dark:bg-white/8 dark:text-gray-400',            label: 'Closed' },
}

export function TicketsDashboard({ tickets: initialTickets }: { tickets: TicketRow[] }) {
  const [tickets,      setTickets]      = useState<TicketRow[]>(initialTickets)
  const [selectedId,   setSelectedId]   = useState<string | null>(
    initialTickets.length > 0 ? initialTickets[0].id : null,
  )
  const [slideTicket,  setSlideTicket]  = useState<TicketRow | null>(null)

  const selected = tickets.find((t) => t.id === selectedId) ?? null

  function handleStatusChanged(ticketId: string, status: SageTicketStatus) {
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status } : t))
  }

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
    <>
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — ticket list */}
        <aside className="w-[280px] shrink-0 flex flex-col border-r border-gray-200 dark:border-white/8 bg-gray-50/80 dark:bg-[#161616] overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-white/8 flex items-center justify-between shrink-0">
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
              const priority   = PRIORITY_STYLES[ticket.priority ?? 'low']
              const isSelected = ticket.id === selectedId
              const source     = ticketSource(ticket)

              return (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedId(ticket.id)}
                  className={[
                    'w-full text-left px-4 py-3 transition-colors border-l-[3px] group',
                    isSelected
                      ? ticket.priority === 'urgent' ? 'border-l-red-500 bg-red-50 dark:bg-red-500/15'
                      : ticket.priority === 'high'   ? 'border-l-orange-400 bg-orange-50 dark:bg-orange-500/15'
                      : ticket.priority === 'medium' ? 'border-l-amber-400 bg-amber-50 dark:bg-amber-500/15'
                      :                                'border-l-gray-400 bg-gray-100 dark:bg-white/8'
                      : 'border-l-transparent hover:bg-white dark:hover:bg-white/3',
                  ].join(' ')}
                >
                  <div className="flex items-start gap-2.5">
                    <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${priority.dot}`} />
                    <div className="flex-1 min-w-0">
                      {/* Contact name — first line */}
                      <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate leading-5">
                        {ticket.name ?? ticket.contact?.name ?? 'Unknown'}
                      </p>
                      {/* Ticket title — second line */}
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate leading-4">
                        {ticket.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        {source === 'bot' ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 shrink-0">
                            <Bot className="w-2.5 h-2.5" />
                            Bot
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 shrink-0">
                            <Mail className="w-2.5 h-2.5" />
                            Email
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400 truncate">
                          {timeAgo(ticket.created_at)}
                        </span>
                      </div>
                    </div>
                    {/* Pencil icon — opens slide-over */}
                    <button
                      onClick={e => { e.stopPropagation(); setSlideTicket(ticket) }}
                      className="shrink-0 p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
                      title="Open ticket detail"
                    >
                      <Pencil className="w-3 h-3 text-gray-400" />
                    </button>
                  </div>
                </button>
              )
            })}
          </div>
        </aside>

        {/* Right panel — detail */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-[#1c1c1c]">
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
              <div className="flex items-start justify-between gap-4 mb-1">
                <div className="min-w-0">
                  {(selected.name || selected.contact) && (
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-0.5">
                      {selected.name ?? selected.contact?.name}
                      {selected.contact?.email && (
                        <span className="font-normal text-gray-400 ml-1.5">{selected.contact.email}</span>
                      )}
                    </p>
                  )}
                  <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                    {selected.title}
                  </h1>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setSlideTicket(selected)}
                    className="flex items-center gap-1 text-xs text-brand-600 dark:text-[#61c2ad] hover:underline"
                    title="Open full detail & activity"
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </button>
                  <a
                    href="/sage/tickets"
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    View all
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Badges */}
              <div className="flex items-center gap-2 mb-5 mt-3">
                {selected.priority && (
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${PRIORITY_STYLES[selected.priority]?.badge}`}>
                    {PRIORITY_STYLES[selected.priority]?.label} priority
                  </span>
                )}
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLES[selected.status]?.badge ?? STATUS_STYLES.open.badge}`}>
                  {STATUS_STYLES[selected.status]?.label ?? selected.status}
                </span>
                {ticketSource(selected) === 'bot' ? (
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 flex items-center gap-1">
                    <Bot className="w-3 h-3" />
                    via Bot
                  </span>
                ) : (
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    via Email
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

      {/* Slide-over */}
      <TicketSlideOver
        ticket={slideTicket}
        onClose={() => setSlideTicket(null)}
        onStatusChanged={handleStatusChanged}
      />
    </>
  )
}
