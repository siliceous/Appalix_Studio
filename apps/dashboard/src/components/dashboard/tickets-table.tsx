'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Ticket, Search, ChevronDown, X, UserPlus, Pencil, Download,
  Trash2, Loader2, Mail, Bot, MessageSquare,
} from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import type { SageTicket, SageContact, SageTicketStatus, SageTicketPriority } from '@/lib/types'
import {
  updateTicketPriority, updateTicketStatus, assignTicket,
  deleteTicket, deleteTickets, renameTicket, addContactFromTicket,
} from '@/app/actions/sage'

// ── Types ──────────────────────────────────────────────────────────────────────
type TicketRow = SageTicket & { contact: Pick<SageContact, 'id' | 'name' | 'email'> | null }

export type TeamMember = { user_id: string; name: string }

// ── Constants ──────────────────────────────────────────────────────────────────
const PRIORITY_OPTIONS: SageTicketPriority[] = ['urgent', 'high', 'medium', 'low']
const STATUS_OPTIONS: SageTicketStatus[]      = ['open', 'in_progress', 'pending', 'resolved', 'closed']

const PRIORITY_CLS: Record<string, string> = {
  urgent: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20',
  high:   'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20',
  medium: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200/70 dark:border-amber-500/18',
  low:    'bg-gray-100 dark:bg-white/5 text-gray-500 border border-gray-200 dark:border-white/10',
}

const STATUS_CLS: Record<string, string> = {
  open:        'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20',
  in_progress: 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20',
  pending:     'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20',
  resolved:    'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20',
  closed:      'bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/10',
}

const STATUS_LABEL: Record<string, string> = {
  open: 'Open', in_progress: 'In Progress', pending: 'Pending', resolved: 'Resolved', closed: 'Closed',
}

const ACTIVE_PILL   = 'bg-[#15A4AE]/15 dark:bg-[#15A4AE]/20 text-[#1f6157] dark:text-[#15A4AE] border border-[#15A4AE]/30'
const INACTIVE_PILL = 'bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/12'

// ── Source badge ───────────────────────────────────────────────────────────────
function SourceBadge({ ticket }: { ticket: SageTicket }) {
  const provider = ticket.external_provider
  const method   = ticket.contact_method

  if (provider) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-500/20 whitespace-nowrap">
        {provider.charAt(0).toUpperCase() + provider.slice(1)}
      </span>
    )
  }
  if (method === 'email') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 whitespace-nowrap">
        <Mail className="w-2.5 h-2.5" /> Email
      </span>
    )
  }
  // phone or unrecognised → Bot / unknown
  if (method === 'phone') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-gray-100 dark:bg-white/8 text-gray-500 border border-gray-200 dark:border-white/10 whitespace-nowrap">
        <MessageSquare className="w-2.5 h-2.5" /> Phone
      </span>
    )
  }
  // null / anything else → Bot
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20 whitespace-nowrap">
      <Bot className="w-2.5 h-2.5" /> Bot
    </span>
  )
}

// ── Props ──────────────────────────────────────────────────────────────────────
interface Props {
  tickets:      TicketRow[]
  contacts?:    Pick<SageContact, 'id' | 'name'>[]
  readonly?:    boolean
  teamMembers?: TeamMember[]
  canAllocate?: boolean
}

// ── Component ──────────────────────────────────────────────────────────────────
export function TicketsTable({
  tickets, readonly = false, teamMembers = [], canAllocate = false,
}: Props) {
  const router = useRouter()

  const [selectedIds,    setSelectedIds]    = useState<Set<string>>(new Set())
  const [search,         setSearch]         = useState('')
  const [activeStatus,   setActiveStatus]   = useState('')
  const [localPriority,  setLocalPriority]  = useState<Record<string, string>>({})
  const [localStatus,    setLocalStatus]    = useState<Record<string, string>>({})
  const [localAssign,    setLocalAssign]    = useState<Record<string, string>>({})
  const [prioritySaving, setPrioritySaving] = useState<Record<string, boolean>>({})
  const [statusSaving,   setStatusSaving]   = useState<Record<string, boolean>>({})
  const [assignSaving,   setAssignSaving]   = useState<Record<string, boolean>>({})
  const [quickAction,    setQuickAction]    = useState<Record<string, 'loading-contact' | 'loading-delete'>>({})
  const [bulkSaving,     setBulkSaving]     = useState(false)

  // ── Filter ───────────────────────────────────────────────────────────────
  const filtered = tickets.filter(t => {
    const name = (t.name ?? t.contact?.name ?? t.title ?? '').toLowerCase()
    if (search && !name.includes(search.toLowerCase()) && !t.title.toLowerCase().includes(search.toLowerCase())) return false
    if (activeStatus && t.status !== activeStatus) return false
    return true
  })

  // ── Selection ────────────────────────────────────────────────────────────
  const allSelected = filtered.length > 0 && filtered.every(t => selectedIds.has(t.id))
  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(filtered.map(t => t.id)))
  }
  function toggleOne(id: string) {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  // ── Row handlers ─────────────────────────────────────────────────────────
  async function handlePriorityChange(id: string, val: string) {
    setLocalPriority(p => ({ ...p, [id]: val }))
    setPrioritySaving(p => ({ ...p, [id]: true }))
    await updateTicketPriority(id, val as SageTicketPriority)
    setPrioritySaving(p => ({ ...p, [id]: false }))
    router.refresh()
  }

  async function handleStatusChange(id: string, val: string) {
    setLocalStatus(p => ({ ...p, [id]: val }))
    setStatusSaving(p => ({ ...p, [id]: true }))
    await updateTicketStatus(id, val as SageTicketStatus)
    setStatusSaving(p => ({ ...p, [id]: false }))
    router.refresh()
  }

  async function handleAssignChange(id: string, val: string) {
    setLocalAssign(p => ({ ...p, [id]: val }))
    setAssignSaving(p => ({ ...p, [id]: true }))
    await assignTicket(id, val || null)
    setAssignSaving(p => ({ ...p, [id]: false }))
    router.refresh()
  }

  function handleRename(t: TicketRow) {
    const newTitle = window.prompt('Rename ticket:', t.title)
    if (newTitle === null || newTitle.trim() === t.title) return
    renameTicket(t.id, newTitle.trim()).then(() => router.refresh())
  }

  function handleDownload(t: TicketRow) {
    const data = JSON.stringify({
      title: t.title, name: t.name, email: t.email, phone: t.phone,
      status: t.status, priority: t.priority, description: t.description,
      source: t.external_provider ?? t.contact_method, created_at: t.created_at,
    }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `ticket_${t.id.slice(0, 6)}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  async function handleAddContact(t: TicketRow) {
    setQuickAction(p => ({ ...p, [t.id]: 'loading-contact' }))
    await addContactFromTicket(t.id, { name: t.name ?? t.contact?.name ?? null, email: t.email ?? t.contact?.email ?? null, phone: t.phone ?? null })
    setQuickAction(p => { const n = { ...p }; delete n[t.id]; return n })
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this ticket? This cannot be undone.')) return
    setQuickAction(p => ({ ...p, [id]: 'loading-delete' }))
    await deleteTicket(id)
    setQuickAction(p => { const n = { ...p }; delete n[id]; return n })
    router.refresh()
  }

  // ── Bulk handlers ─────────────────────────────────────────────────────────
  async function handleBulkPriority(val: string) {
    if (!val || bulkSaving) return
    setBulkSaving(true)
    await Promise.all([...selectedIds].map(id => updateTicketPriority(id, val as SageTicketPriority)))
    setBulkSaving(false); router.refresh()
  }
  async function handleBulkStatus(val: string) {
    if (!val || bulkSaving) return
    setBulkSaving(true)
    await Promise.all([...selectedIds].map(id => updateTicketStatus(id, val as SageTicketStatus)))
    setBulkSaving(false); router.refresh()
  }
  async function handleBulkAssign(val: string) {
    if (bulkSaving) return
    setBulkSaving(true)
    await Promise.all([...selectedIds].map(id => assignTicket(id, val || null)))
    setBulkSaving(false); router.refresh()
  }
  async function handleBulkDelete() {
    if (!window.confirm(`Delete ${selectedIds.size} ticket(s)? This cannot be undone.`)) return
    setBulkSaving(true)
    await deleteTickets([...selectedIds])
    setBulkSaving(false); setSelectedIds(new Set()); router.refresh()
  }

  const exportCSV = () => {
    const headers = ['Name', 'Title', 'Source', 'Priority', 'Status', 'Assigned to', 'Created']
    const rows = filtered.map(t => {
      const name     = t.name ?? t.contact?.name ?? 'Unknown'
      const source   = t.external_provider ?? t.contact_method ?? 'bot'
      const assignee = teamMembers.find(m => m.user_id === t.owner_id)?.name ?? ''
      return [name, t.title, source, t.priority ?? '', t.status, assignee, new Date(t.created_at).toLocaleString()]
    })
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob); const a = document.createElement('a')
    a.href = url; a.download = 'tickets.csv'; a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-full mx-auto space-y-5 p-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Tickets</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{filtered.length} ticket{filtered.length !== 1 ? 's' : ''} shown</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Bulk actions */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              {bulkSaving && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
              <select disabled={bulkSaving} defaultValue="" onChange={e => { handleBulkPriority(e.target.value); e.target.value = '' }}
                className="text-xs border dark:border-white/10 rounded-lg px-2 py-1.5 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-200 focus:outline-none disabled:opacity-50">
                <option value="" disabled>Priority…</option>
                {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
              <select disabled={bulkSaving} defaultValue="" onChange={e => { handleBulkStatus(e.target.value); e.target.value = '' }}
                className="text-xs border dark:border-white/10 rounded-lg px-2 py-1.5 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-200 focus:outline-none disabled:opacity-50">
                <option value="" disabled>Status…</option>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
              {canAllocate && teamMembers.length > 0 && (
                <select disabled={bulkSaving} defaultValue="" onChange={e => { handleBulkAssign(e.target.value); e.target.value = '' }}
                  className="text-xs border dark:border-white/10 rounded-lg px-2 py-1.5 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-200 focus:outline-none disabled:opacity-50">
                  <option value="" disabled>Assign to…</option>
                  <option value="">Unassign</option>
                  {teamMembers.map(m => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
                </select>
              )}
              <button onClick={handleBulkDelete} disabled={bulkSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors disabled:opacity-50">
                <Trash2 className="w-3.5 h-3.5" />
                Delete ({selectedIds.size})
              </button>
            </div>
          )}
          <button onClick={exportCSV} disabled={filtered.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-white/5 border dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or title…"
              className="w-full pl-8 pr-3 py-2 text-sm border dark:border-white/10 rounded-lg bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>
            )}
          </div>
          <div className="flex items-center gap-1">
            {[{ value: '', label: 'All' }, ...STATUS_OPTIONS.map(s => ({ value: s, label: STATUS_LABEL[s] }))].map(s => (
              <button key={s.value} onClick={() => setActiveStatus(s.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${activeStatus === s.value ? ACTIVE_PILL : INACTIVE_PILL}`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Ticket className="w-10 h-10 text-gray-200 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-400">No tickets match your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="border-b dark:border-white/8 bg-gray-50 dark:bg-white/[0.03]">
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll}
                      className="rounded border-gray-300 dark:border-white/20 text-brand-600 focus:ring-[#15A4AE]/40" />
                  </th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Priority</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Name</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Source</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Submitted</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Assigned to</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-white/5">
                {filtered.map(t => {
                  const name       = t.name ?? t.contact?.name ?? 'Unknown'
                  const priority   = localPriority[t.id] ?? t.priority ?? 'low'
                  const status     = localStatus[t.id]   ?? t.status   ?? 'open'
                  const assigneeId = localAssign[t.id]   !== undefined ? localAssign[t.id] : (t.owner_id ?? '')
                  const assignee   = teamMembers.find(m => m.user_id === assigneeId)
                  const qa         = quickAction[t.id]
                  const selected   = selectedIds.has(t.id)

                  return (
                    <tr key={t.id} className={`hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors group ${selected ? 'bg-brand-50/40 dark:bg-[#15A4AE]/5' : ''}`}>

                      {/* Checkbox */}
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selected} onChange={() => toggleOne(t.id)}
                          className="rounded border-gray-300 dark:border-white/20 text-brand-600 focus:ring-[#15A4AE]/40" />
                      </td>

                      {/* Priority */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        {prioritySaving[t.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" /> : (
                          <div className="relative inline-flex items-center">
                            <select value={priority} disabled={readonly || prioritySaving[t.id]} onChange={e => handlePriorityChange(t.id, e.target.value)}
                              className={`appearance-none pl-2 pr-5 py-0.5 rounded-full text-[10px] font-semibold cursor-pointer border-0 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/40 disabled:cursor-default ${PRIORITY_CLS[priority] ?? ''}`}>
                              {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                            </select>
                            {!readonly && <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-current opacity-60 pointer-events-none" />}
                          </div>
                        )}
                      </td>

                      {/* Name + title */}
                      <td className="px-3 py-3 max-w-[180px]">
                        <Link
                          href={`/sage/tickets/${t.id}`}
                          className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-[#15A4AE] dark:hover:text-[#15A4AE] transition-colors truncate block"
                        >
                          {name}
                        </Link>
                        <p className="text-xs text-gray-400 truncate mt-0.5">{t.title}</p>
                      </td>

                      {/* Source */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <SourceBadge ticket={t} />
                      </td>

                      {/* Timestamp */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="text-xs text-gray-400">{timeAgo(t.created_at)}</span>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        {statusSaving[t.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" /> : (
                          <div className="relative inline-flex items-center">
                            <select value={status} disabled={readonly || statusSaving[t.id]} onChange={e => handleStatusChange(t.id, e.target.value)}
                              className={`appearance-none pl-2 pr-5 py-0.5 rounded-full text-[10px] font-semibold cursor-pointer border-0 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/40 disabled:cursor-default ${STATUS_CLS[status] ?? ''}`}>
                              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                            </select>
                            {!readonly && <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-current opacity-60 pointer-events-none" />}
                          </div>
                        )}
                      </td>

                      {/* Assigned to */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        {assignSaving[t.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" /> :
                          canAllocate && teamMembers.length > 0 ? (
                            <select value={assigneeId} disabled={readonly || assignSaving[t.id]} onChange={e => handleAssignChange(t.id, e.target.value)}
                              className="text-xs border dark:border-white/10 rounded-lg px-2 py-1 bg-transparent text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/40 disabled:opacity-60 max-w-[120px]">
                              <option value="">Unassigned</option>
                              {teamMembers.map(m => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
                            </select>
                          ) : assignee ? (
                            <span className="text-xs text-gray-600 dark:text-gray-300">{assignee.name}</span>
                          ) : (
                            <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                          )
                        }
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 w-px whitespace-nowrap">
                        <div className="flex items-center gap-1 justify-end">
                          {!readonly && (
                            qa === 'loading-contact' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" /> : (
                              <button onClick={() => handleAddContact(t)} title="Add contact"
                                className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors">
                                <UserPlus className="w-3.5 h-3.5" />
                              </button>
                            )
                          )}
                          {!readonly && (
                            <button onClick={() => handleRename(t)} title="Rename"
                              className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button onClick={() => handleDownload(t)} title="Download"
                            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors">
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          {!readonly && (
                            qa === 'loading-delete' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" /> : (
                              <button onClick={() => handleDelete(t.id)} title="Delete"
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )
                          )}
                        </div>
                      </td>

                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filtered.length >= 200 && (
        <p className="text-xs text-center text-gray-400 pb-2">Showing first 200 results — use filters to narrow down.</p>
      )}
    </div>
  )
}
