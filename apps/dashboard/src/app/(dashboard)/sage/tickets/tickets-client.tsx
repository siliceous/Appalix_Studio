'use client'

import { useState, useTransition } from 'react'
import { Ticket, Plus, Trash2, Mail, Pencil, Merge, X, Loader2, Search } from 'lucide-react'
import { TicketModal } from '@/components/sage/ticket-modal'
import { TicketSlideOver } from '@/components/dashboard/ticket-slide-over'
import { updateTicketStatus, deleteTicket, mergeTickets } from '@/app/actions/sage'
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
  open:        { label: 'Open',        color: 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400' },
  in_progress: { label: 'In Progress', color: 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400' },
  pending:     { label: 'Pending',     color: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' },
  resolved:    { label: 'Resolved',    color: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' },
  closed:      { label: 'Closed',      color: 'bg-gray-100 text-gray-600 dark:bg-white/8 dark:text-gray-400' },
}

const FILTERS: Array<{ label: string; value: string }> = [
  { label: 'All',      value: 'all' },
  { label: 'Open',     value: 'open' },
  { label: 'Pending',  value: 'pending' },
  { label: 'Resolved', value: 'resolved' },
]

interface TicketsClientProps {
  tickets:    TicketWithContact[]
  contacts:   Pick<SageContact, 'id' | 'name'>[]
  triageMode?: boolean   // when true, auto-remove resolved/closed on status change
}

export function TicketsClient({ tickets: initialTickets, contacts, triageMode = false }: TicketsClientProps) {
  const [tickets,      setTickets]      = useState(initialTickets)
  const [filter,       setFilter]       = useState('all')
  const [search,       setSearch]       = useState('')
  const [showModal,    setShowModal]    = useState(false)
  const [deleting,     setDeleting]     = useState<string | null>(null)
  const [slideTicket,  setSlideTicket]  = useState<TicketWithContact | null>(null)
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set())
  const [showMerge,    setShowMerge]    = useState(false)
  const [primaryId,    setPrimaryId]    = useState<string | null>(null)
  const [merging,      startMerge]      = useTransition()

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function clearSelection() {
    setSelectedIds(new Set())
    setShowMerge(false)
    setPrimaryId(null)
  }

  async function handleMerge() {
    if (!primaryId) return
    const dupes = [...selectedIds].filter(id => id !== primaryId)
    startMerge(async () => {
      await mergeTickets(primaryId, dupes)
      setTickets(prev => {
        const kept = prev.find(t => t.id === primaryId)
        const removed = new Set(dupes)
        return prev
          .filter(t => !removed.has(t.id))
          .map(t => t.id === primaryId && kept ? { ...kept } : t)
      })
      clearSelection()
    })
  }

  // Sort: open (unactioned) oldest first → in_progress/pending → resolved/closed
  function sortTickets(list: TicketWithContact[]) {
    const rank = (s: string) => s === 'open' ? 0 : (s === 'in_progress' || s === 'pending') ? 1 : 2
    return [...list].sort((a, b) => {
      const rd = rank(a.status) - rank(b.status)
      if (rd !== 0) return rd
      // Within the same rank: open = oldest first (ASC), others = newest first (DESC)
      const asc = rank(a.status) === 0
      return asc
        ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }

  const q = search.toLowerCase()
  const searched = q
    ? tickets.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.name ?? '').toLowerCase().includes(q) ||
        (t.email ?? '').toLowerCase().includes(q) ||
        (t.contact?.name ?? '').toLowerCase().includes(q) ||
        (t.contact?.email ?? '').toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q)
      )
    : tickets
  const filtered = sortTickets(filter === 'all' ? searched : searched.filter(t => t.status === filter))

  async function handleStatusChange(id: string, status: SageTicketStatus) {
    if (triageMode && (status === 'resolved' || status === 'closed')) {
      setTickets(prev => prev.filter(t => t.id !== id))
    } else {
      setTickets(prev => prev.map(t => t.id === id ? { ...t, status } : t))
    }
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

  const selectedTickets = tickets.filter(t => selectedIds.has(t.id))

  return (
    <div className="max-w-6xl mx-auto space-y-5 p-8">
      {/* Merge modal */}
      {showMerge && selectedIds.size >= 2 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={clearSelection} />
          <div className="relative bg-white dark:bg-[#232323] rounded-2xl border dark:border-white/8 shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Merge {selectedIds.size} Tickets</h2>
              <button onClick={clearSelection} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8 transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Choose the primary ticket to keep. The others will be closed and their content appended to it.</p>
            <div className="space-y-2 mb-5">
              {selectedTickets.map(t => (
                <label key={t.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${primaryId === t.id ? 'border-brand-500 dark:border-[#61c2ad] bg-brand-50 dark:bg-[#61c2ad]/8' : 'border-gray-200 dark:border-white/8 hover:bg-gray-50 dark:hover:bg-white/3'}`}>
                  <input
                    type="radio"
                    name="primary"
                    value={t.id}
                    checked={primaryId === t.id}
                    onChange={() => setPrimaryId(t.id)}
                    className="mt-0.5 accent-brand-600"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{t.title}</p>
                    {(t.name || t.contact?.name) && (
                      <p className="text-xs text-gray-400 mt-0.5">{t.name ?? t.contact?.name}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={clearSelection} className="flex-1 px-4 py-2 text-sm border dark:border-white/10 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleMerge}
                disabled={!primaryId || merging}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-colors disabled:opacity-60"
              >
                {merging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Merge className="w-3.5 h-3.5" />}
                {merging ? 'Merging…' : 'Merge'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Tickets</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {tickets.filter(t => t.status === 'open').length} open · {tickets.length} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size >= 2 && (
            <button
              onClick={() => { setPrimaryId([...selectedIds][0]); setShowMerge(true) }}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Merge className="w-4 h-4" />
              Merge {selectedIds.size}
            </button>
          )}
          {selectedIds.size > 0 && (
            <button onClick={clearSelection} className="flex items-center gap-1.5 px-3 py-2 text-sm border dark:border-white/10 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Ticket
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tickets…"
              className="w-full pl-8 pr-3 py-2 text-sm border dark:border-white/10 rounded-lg bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#61c2ad]/40"
            />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {/* Status pills */}
          <div className="flex items-center gap-1">
            {FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  filter === f.value
                    ? 'bg-[#61c2ad]/15 dark:bg-[#61c2ad]/20 text-[#1f6157] dark:text-[#61c2ad] border border-[#61c2ad]/30'
                    : 'bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/12'
                }`}
              >
                {f.label}
                <span className="ml-1 opacity-60">
                  {f.value === 'all' ? tickets.length : tickets.filter(t => t.status === f.value).length}
                </span>
              </button>
            ))}
          </div>
        </div>
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

              const isSelected = selectedIds.has(ticket.id)
              return (
                <div key={ticket.id} className={`flex items-start gap-4 px-5 py-4 transition-colors ${isSelected ? 'bg-amber-50 dark:bg-amber-500/8' : 'hover:bg-gray-50 dark:hover:bg-white/3'}`}>
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(ticket.id)}
                    className="mt-1 shrink-0 w-4 h-4 rounded border-gray-300 dark:border-white/20 accent-amber-500 cursor-pointer"
                  />
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
                    {(ticket.name || ticket.contact) && (
                      <p className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
                        <Mail className="w-3 h-3" />
                        {ticket.name ?? ticket.contact?.name}
                        {ticket.contact?.email && <span className="text-gray-300 dark:text-gray-600">· {ticket.contact.email}</span>}
                      </p>
                    )}
                    <p className="text-[11px] text-gray-400 mt-1">{timeAgo(ticket.created_at)}</p>
                  </div>

                  {/* Status selector + actions */}
                  <div className="shrink-0 flex items-center gap-2">
                    <select
                      value={ticket.status}
                      onChange={e => handleStatusChange(ticket.id, e.target.value as SageTicketStatus)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#61c2ad] ${sc.color}`}
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="pending">Pending</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>

                    <button
                      onClick={() => setSlideTicket(ticket)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8 transition-colors"
                      title="Open detail"
                    >
                      <Pencil className="w-3.5 h-3.5 text-gray-400" />
                    </button>

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

      <TicketSlideOver
        ticket={slideTicket}
        onClose={() => setSlideTicket(null)}
        onStatusChanged={(id, status) => {
          if (triageMode && (status === 'resolved' || status === 'closed')) {
            setSlideTicket(null)
            setTickets(prev => prev.filter(t => t.id !== id))
          } else {
            setTickets(prev => prev.map(t => t.id === id ? { ...t, status } : t))
          }
        }}
      />
    </div>
  )
}
