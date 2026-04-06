'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  UserPlus, Search, Mail, Phone, Globe, Trash2,
  Zap, ArrowUpDown, SlidersHorizontal, Columns3, Check, Ticket, DollarSign, MailX,
} from 'lucide-react'
import { ContactModal } from '@/components/sage/contact-modal'
import { deleteContact, deleteContacts, undoDeleteContact, assignContact, patchContact } from '@/app/actions/sage'
import { triageCreateLead, triageCreateTicket } from '@/app/actions/sage-triage'
import { exportContacts } from '@/app/actions/csv-export'
import { importContacts } from '@/app/actions/csv-import'
import { CsvExportButton } from '@/components/ui/csv-export-button'
import { CsvImportButton } from '@/components/ui/csv-import-button'
import { timeAgo } from '@/lib/utils'
import Link from 'next/link'
import type { SageContact, WorkspaceMemberSummary, WorkspaceMemberRole } from '@/lib/types'
import { ROLE_RANK } from '@/lib/types'
import { ChevronDown, Loader2 } from 'lucide-react'
import { useTransition } from 'react'

// ── Inline assign dropdown ───────────────────────────────────────────────────
function AssignCell({ contactId, value, members, onAssigned }: {
  contactId: string
  value:     string
  members:   WorkspaceMemberSummary[]
  onAssigned: (contactId: string, userId: string) => void
}) {
  const [pending, startTransition] = useTransition()
  const [localValue, setLocalValue] = useState(value)

  function handleChange(userId: string) {
    setLocalValue(userId)
    onAssigned(contactId, userId)
    startTransition(async () => {
      await assignContact(contactId, userId || null)
    })
  }

  return (
    <div className="relative">
      <select
        value={localValue}
        onChange={e => handleChange(e.target.value)}
        disabled={pending}
        onClick={e => e.stopPropagation()}
        className="appearance-none pl-2 pr-6 py-1 text-xs border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/8 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#15A4AE] transition-colors disabled:opacity-50 max-w-[130px]"
      >
        <option value="">Unassigned</option>
        {members.map(m => (
          <option key={m.user_id} value={m.user_id}>{m.name || m.email}</option>
        ))}
      </select>
      {pending
        ? <span className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
            <Loader2 className="w-3 h-3 animate-spin text-[#15A4AE]" />
          </span>
        : <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
      }
    </div>
  )
}

// ── Click-to-navigate / double-click-to-edit (name cell) ────────────────────
function ClickOrEditCell({ value, href, onSave }: {
  value: string
  href: string
  onSave: (val: string) => Promise<void>
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(value)
  const [saving,  setSaving]  = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])
  useEffect(() => { if (!editing) setDraft(value) }, [value, editing])

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    timerRef.current = setTimeout(() => { router.push(href) }, 250)
  }
  function handleDoubleClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    setDraft(value); setEditing(true)
  }
  async function commit() {
    if (draft.trim() === value) { setEditing(false); return }
    setSaving(true)
    await onSave(draft.trim())
    setSaving(false)
    setEditing(false)
  }

  if (editing) return (
    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
      <input
        ref={inputRef}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        className="text-sm font-medium text-gray-900 dark:text-gray-100 bg-white dark:bg-white/5 border border-[#15A4AE]/50 rounded px-1.5 py-0.5 w-36 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/40"
      />
      {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#15A4AE] shrink-0" />}
    </div>
  )

  return (
    <span
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      title="Click to open · double-click to rename"
      className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:text-[#15A4AE] transition-colors select-none"
    >
      {value}
    </span>
  )
}

// ── Double-click-only inline edit (other cells) ──────────────────────────────
function InlineEditCell({ value, onSave, placeholder, multiline }: {
  value: string
  onSave: (val: string) => Promise<void>
  placeholder?: string
  multiline?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(value)
  const [saving,  setSaving]  = useState(false)
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])
  useEffect(() => { if (!editing) setDraft(value) }, [value, editing])

  async function commit() {
    if (draft.trim() === value) { setEditing(false); return }
    setSaving(true)
    await onSave(draft.trim())
    setSaving(false)
    setEditing(false)
  }

  if (editing) {
    const shared = {
      ref: inputRef,
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
      onBlur: commit,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (!multiline && e.key === 'Enter') commit()
        if (e.key === 'Escape') setEditing(false)
      },
      onClick: (e: React.MouseEvent) => e.stopPropagation(),
      className: 'text-xs text-gray-700 dark:text-gray-200 bg-white dark:bg-white/5 border border-[#15A4AE]/50 rounded px-1.5 py-0.5 w-full focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/40',
    }
    return (
      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
        {multiline
          ? <textarea {...shared as React.TextareaHTMLAttributes<HTMLTextAreaElement>} rows={2} style={{ resize: 'none' }} />
          : <input {...shared as React.InputHTMLAttributes<HTMLInputElement>} />
        }
        {saving && <Loader2 className="w-3 h-3 animate-spin text-[#15A4AE] shrink-0" />}
      </div>
    )
  }

  return (
    <span
      onDoubleClick={e => { e.stopPropagation(); setDraft(value); setEditing(true) }}
      title="Double-click to edit"
      className="text-xs text-gray-500 dark:text-gray-400 cursor-text hover:text-[#15A4AE] transition-colors select-none"
    >
      {value || <span className="italic text-gray-300 dark:text-gray-600">{placeholder ?? '—'}</span>}
    </span>
  )
}

// ── Column definitions ──────────────────────────────────────────────────────
type ColKey =
  | 'name' | 'title' | 'company_name' | 'email' | 'contact_type'
  | 'last_contacted_at' | 'interactions' | 'inactive_days'
  | 'tags' | 'city' | 'country' | 'created_at' | 'notes'
  | 'updated_at' | 'phone' | 'state' | 'street' | 'website_url'
  | 'deal_value' | 'assigned_to' | 'source'

const ALL_COLUMNS: { key: ColKey; label: string; required?: true }[] = [
  { key: 'name',              label: 'Person',         required: true },
  { key: 'title',             label: 'Title' },
  { key: 'company_name',      label: 'Company' },
  { key: 'email',             label: 'Email' },
  { key: 'contact_type',      label: 'Contact Type' },
  { key: 'last_contacted_at', label: 'Last Contacted' },
  { key: 'interactions',      label: 'Interactions' },
  { key: 'inactive_days',     label: 'Inactive Days' },
  { key: 'tags',              label: 'Tags' },
  { key: 'city',              label: 'City' },
  { key: 'country',           label: 'Country' },
  { key: 'created_at',        label: 'Created' },
  { key: 'notes',             label: 'Description' },
  { key: 'updated_at',        label: 'Modified' },
  { key: 'phone',             label: 'Phone' },
  { key: 'state',             label: 'State' },
  { key: 'street',            label: 'Street' },
  { key: 'website_url',       label: 'Website' },
  { key: 'deal_value',        label: 'Value' },
  { key: 'assigned_to',       label: 'Assigned To' },
  { key: 'source',            label: 'Source' },
]

const DEFAULT_VISIBLE = new Set<ColKey>(['name', 'company_name', 'email', 'contact_type', 'deal_value', 'tags', 'source', 'created_at', 'assigned_to'])

const SORT_FIELDS: { key: string; label: string }[] = [
  { key: '',             label: 'None' },
  { key: 'name',         label: 'Name' },
  { key: 'email',        label: 'Email' },
  { key: 'company_name', label: 'Company' },
  { key: 'contact_type', label: 'Contact Type' },
  { key: 'created_at',   label: 'Date Added' },
  { key: 'updated_at',   label: 'Modified' },
  { key: 'last_contacted_at', label: 'Last Contacted' },
  { key: 'inactive_days',    label: 'Inactive Days' },
]

const CONTACT_TYPE_META: Record<string, { label: string; color: string }> = {
  potential_customer: { label: 'Potential',  color: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' },
  active_customer:    { label: 'Active',     color: 'bg-brand-50 text-brand-700 dark:bg-[#15A4AE]/10 dark:text-[#15A4AE]' },
  other:              { label: 'Other',      color: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400' },
}

interface FilterState {
  contactType:   string[]
  lastContacted: '' | '7d' | '30d' | '90d' | '1y'
  tags:          string
  city:          string
  state:         string
  country:       string
  assignedTo:    string
}
const EMPTY_FILTER: FilterState = { contactType: [], lastContacted: '', tags: '', city: '', state: '', country: '', assignedTo: '' }

// ── Component ───────────────────────────────────────────────────────────────
interface ContactsClientProps {
  contacts:     SageContact[]
  members:      WorkspaceMemberSummary[]
  callerRole:   WorkspaceMemberSummary['role']
  teamMembers?: WorkspaceMemberSummary[]
  viewAsUserId?: string | null
}

export function ContactsClient({ contacts: initial, members, callerRole, teamMembers = [], viewAsUserId }: ContactsClientProps) {
  const canWrite  = callerRole !== 'viewer' && !viewAsUserId
  const canAssign = (ROLE_RANK[callerRole as WorkspaceMemberRole] ?? 0) >= ROLE_RANK.manager
  const router = useRouter()
  const [contacts,       setContacts]       = useState(initial)
  const [showModal,      setShowModal]      = useState(false)
  const [editingContact, setEditingContact] = useState<SageContact | null>(null)
  const [deleting,       setDeleting]       = useState<string | null>(null)
  const [actionLoading,  setActionLoading]  = useState<string | null>(null) // contactId + ':deal' | ':ticket'
  const [notification,   setNotification]   = useState<string | null>(null)

  function showNotification(msg: string) {
    setNotification(msg)
    setTimeout(() => setNotification(null), 5000)
  }

  async function handleCreateDeal(c: SageContact) {
    const key = `${c.id}:deal`
    setActionLoading(key)
    const res = await triageCreateLead({ name: c.name, email: c.email ?? '', phone: c.phone ?? undefined, company: c.company_name ?? undefined, dealTitle: `${c.name} — Deal`, notes: c.notes ?? undefined })
    setActionLoading(null)
    if (res?.error) showNotification(`Error: ${res.error}`)
    else { showNotification('Deal created'); router.refresh() }
  }

  async function handleCreateTicket(c: SageContact) {
    const key = `${c.id}:ticket`
    setActionLoading(key)
    const res = await triageCreateTicket({ title: `Support: ${c.name}`, description: c.notes ?? 'No details', contactEmail: c.email ?? '', contactName: c.name, priority: 'medium' })
    setActionLoading(null)
    if (res?.error) showNotification(`Error: ${res.error}`)
    else { showNotification('Ticket created'); router.refresh() }
  }
  const [selectedIds,    setSelectedIds]    = useState<Set<string>>(new Set())
  const [bulkDeleting,   setBulkDeleting]   = useState(false)
  const [undoToasts,     setUndoToasts]     = useState<{ id: string; name: string; timer: ReturnType<typeof setTimeout> }[]>([])
  const [search,      setSearch]      = useState('')
  const [openPanel,   setOpenPanel]   = useState<'sort' | 'filter' | 'columns' | null>(null)
  const [sortField,   setSortField]   = useState('')
  const [sortDir,     setSortDir]     = useState<'asc' | 'desc'>('asc')
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(new Set(DEFAULT_VISIBLE))
  const [filters,     setFilters]     = useState<FilterState>(EMPTY_FILTER)
  const [page,        setPage]        = useState(1)
  const [pageSize,    setPageSize]    = useState(20)

  function togglePanel(p: 'sort' | 'filter' | 'columns') {
    setOpenPanel(prev => prev === p ? null : p)
  }

  function toggleColumn(key: ColKey) {
    setVisibleCols(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function toggleContactTypeFilter(type: string) {
    setFilters(prev => ({
      ...prev,
      contactType: prev.contactType.includes(type)
        ? prev.contactType.filter(t => t !== type)
        : [...prev.contactType, type],
    }))
  }

  const activeFilterCount = [
    filters.contactType.length > 0, !!filters.lastContacted,
    !!filters.tags, !!filters.city, !!filters.state, !!filters.country, !!filters.assignedTo,
  ].filter(Boolean).length

  // ── Filtering + sorting ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = contacts.filter(c => {
      const q = search.toLowerCase()
      if (q && ![c.name, c.email, c.phone, c.company_name].some(v => v?.toLowerCase().includes(q))) return false
      if (filters.contactType.length && !filters.contactType.includes(c.contact_type ?? 'other')) return false
      if (filters.tags && !c.tags.some(t => t.toLowerCase().includes(filters.tags.toLowerCase()))) return false
      if (filters.city    && !c.city?.toLowerCase().includes(filters.city.toLowerCase()))    return false
      if (filters.state   && !c.state?.toLowerCase().includes(filters.state.toLowerCase()))  return false
      if (filters.country && !c.country?.toLowerCase().includes(filters.country.toLowerCase())) return false
      if (filters.lastContacted && c.last_contacted_at) {
        const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }
        const cutoff = new Date(Date.now() - daysMap[filters.lastContacted] * 86_400_000)
        if (new Date(c.last_contacted_at) < cutoff) return false
      }
      if (filters.assignedTo) {
        if (filters.assignedTo === '__unassigned__' ? !!c.assigned_to : c.assigned_to !== filters.assignedTo) return false
      }
      return true
    })

    if (sortField) {
      result = [...result].sort((a, b) => {
        const av = String((a as unknown as Record<string, unknown>)[sortField] ?? '')
        const bv = String((b as unknown as Record<string, unknown>)[sortField] ?? '')
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      })
    }
    return result
  }, [contacts, search, filters, sortField, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage   = Math.min(page, totalPages)
  const paginated  = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  // Reset to page 1 when filters/search/sort change
  useEffect(() => setPage(1), [search, filters, sortField, sortDir])

  const allSelected = filtered.length > 0 && filtered.every(c => selectedIds.has(c.id))

  function toggleSelectAll() {
    setSelectedIds(allSelected ? new Set() : new Set(filtered.map(c => c.id)))
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function handleBulkDelete() {
    if (!confirm(`Delete ${selectedIds.size} contact(s)? This cannot be undone.`)) return
    setBulkDeleting(true)
    const ids = [...selectedIds]
    try {
      await deleteContacts(ids)
      setContacts(prev => prev.filter(c => !ids.includes(c.id)))
      setSelectedIds(new Set())
    } finally {
      setBulkDeleting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this contact?')) return
    setDeleting(id)
    try {
      const result = await deleteContact(id)
      if (result?.softDeleted) {
        // Keep in list as visually hidden, show undo toast for 30s
        const contact = contacts.find(c => c.id === id)
        setContacts(prev => prev.filter(c => c.id !== id))
        const timer = setTimeout(() => {
          setUndoToasts(prev => prev.filter(t => t.id !== id))
        }, 30_000)
        setUndoToasts(prev => [...prev, { id, name: contact?.name ?? 'Contact', timer }])
      } else {
        setContacts(prev => prev.filter(c => c.id !== id))
      }
    } finally { setDeleting(null) }
  }

  async function handleUndo(id: string) {
    const toast = undoToasts.find(t => t.id === id)
    if (toast) clearTimeout(toast.timer)
    setUndoToasts(prev => prev.filter(t => t.id !== id))
    await undoDeleteContact(id)
    router.refresh()
  }

  // ── Cell renderer ────────────────────────────────────────────────────────
  function renderCell(key: ColKey, c: SageContact) {
    switch (key) {
      case 'name': return (
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-brand-100 dark:bg-[#15A4AE]/15 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-brand-700 dark:text-[#15A4AE]">{c.name.charAt(0).toUpperCase()}</span>
          </div>
          <ClickOrEditCell
            value={c.name}
            href={`/sage/contacts/${c.id}`}
            onSave={async val => { await patchContact(c.id, { name: val }); setContacts(prev => prev.map(x => x.id === c.id ? { ...x, name: val } : x)) }}
          />
        </div>
      )
      case 'title': return (
        <InlineEditCell value={c.title ?? ''} placeholder="—" onSave={async val => { await patchContact(c.id, { title: val }); setContacts(prev => prev.map(x => x.id === c.id ? { ...x, title: val } : x)) }} />
      )
      case 'company_name': return (
        <InlineEditCell value={c.company_name ?? ''} placeholder="—" onSave={async val => { await patchContact(c.id, { company_name: val }); setContacts(prev => prev.map(x => x.id === c.id ? { ...x, company_name: val } : x)) }} />
      )
      case 'email': return (
        <div className="flex items-center gap-1.5">
          <InlineEditCell value={c.email ?? ''} placeholder="—" onSave={async val => { await patchContact(c.id, { email: val }); setContacts(prev => prev.map(x => x.id === c.id ? { ...x, email: val } : x)) }} />
          {c.email_deliverability === 'bounced' && (
            <span title={`Email bounced${c.email_bounced_at ? ` · ${new Date(c.email_bounced_at).toLocaleDateString()}` : ''}`}>
              <MailX className="w-3.5 h-3.5 text-red-400 shrink-0" />
            </span>
          )}
          {c.email_deliverability === 'complained' && (
            <span title="Marked as spam">
              <MailX className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            </span>
          )}
        </div>
      )
      case 'contact_type': {
        const meta = CONTACT_TYPE_META[c.contact_type ?? 'other'] ?? CONTACT_TYPE_META.other
        return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${meta.color}`}>{meta.label}</span>
      }
      case 'last_contacted_at': return <span className="text-xs text-gray-400 whitespace-nowrap">{c.last_contacted_at ? timeAgo(c.last_contacted_at) : '—'}</span>
      case 'interactions': return <span className="text-xs text-gray-400">0</span>
      case 'inactive_days': {
        if (!c.last_contacted_at) return <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
        const d = Math.floor((Date.now() - new Date(c.last_contacted_at).getTime()) / 86_400_000)
        return <span className="text-xs text-gray-400">{d}d</span>
      }
      case 'tags': return c.tags.length > 0
        ? <div className="flex gap-1 flex-wrap">{c.tags.slice(0, 2).map(t => <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-400 whitespace-nowrap">{t}</span>)}{c.tags.length > 2 && <span className="text-[10px] text-gray-400">+{c.tags.length - 2}</span>}</div>
        : <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
      case 'city':    return <InlineEditCell value={c.city    ?? ''} placeholder="—" onSave={async val => { await patchContact(c.id, { city:    val }); setContacts(prev => prev.map(x => x.id === c.id ? { ...x, city:    val } : x)) }} />
      case 'state':   return <InlineEditCell value={c.state   ?? ''} placeholder="—" onSave={async val => { await patchContact(c.id, { state:   val }); setContacts(prev => prev.map(x => x.id === c.id ? { ...x, state:   val } : x)) }} />
      case 'country': return <InlineEditCell value={c.country ?? ''} placeholder="—" onSave={async val => { await patchContact(c.id, { country: val }); setContacts(prev => prev.map(x => x.id === c.id ? { ...x, country: val } : x)) }} />
      case 'street':  return <InlineEditCell value={c.street  ?? ''} placeholder="—" onSave={async val => { await patchContact(c.id, { street:  val }); setContacts(prev => prev.map(x => x.id === c.id ? { ...x, street:  val } : x)) }} />
      case 'created_at': return <span className="text-xs text-gray-400 whitespace-nowrap">{timeAgo(c.created_at)}</span>
      case 'updated_at': return <span className="text-xs text-gray-400 whitespace-nowrap">{timeAgo(c.updated_at)}</span>
      case 'notes': return (
        <InlineEditCell value={c.notes ?? ''} placeholder="—" multiline onSave={async val => { await patchContact(c.id, { notes: val }); setContacts(prev => prev.map(x => x.id === c.id ? { ...x, notes: val } : x)) }} />
      )
      case 'phone': return (
        <InlineEditCell value={c.phone ?? ''} placeholder="—" onSave={async val => { await patchContact(c.id, { phone: val }); setContacts(prev => prev.map(x => x.id === c.id ? { ...x, phone: val } : x)) }} />
      )
      case 'website_url': return (
        <InlineEditCell value={c.website_url ?? ''} placeholder="—" onSave={async val => { await patchContact(c.id, { website_url: val }); setContacts(prev => prev.map(x => x.id === c.id ? { ...x, website_url: val } : x)) }} />
      )
      case 'deal_value': {
        const display = c.value ?? c.deal_value
        return display
          ? <span className="text-xs font-semibold text-brand-600 dark:text-[#15A4AE] tabular-nums whitespace-nowrap">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(display)}
            </span>
          : <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
      }
      case 'assigned_to': {
        if (canAssign && teamMembers.length > 0) {
          return (
            <AssignCell
              contactId={c.id}
              value={c.assigned_to ?? ''}
              members={teamMembers}
              onAssigned={(contactId, userId) =>
                setContacts(prev => prev.map(x => x.id === contactId ? { ...x, assigned_to: userId || null } : x))
              }
            />
          )
        }
        if (!c.assigned_to) return <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
        const m = members.find(m => m.user_id === c.assigned_to)
        return (
          <span className="text-xs px-2 py-0.5 rounded-full bg-brand-50 dark:bg-[#15A4AE]/10 text-brand-700 dark:text-[#15A4AE] whitespace-nowrap">
            {m ? (m.name || m.email) : c.assigned_to.slice(0, 8)}
          </span>
        )
      }
      case 'source': {
        const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
          manual:         { label: 'Manual',          color: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400' },
          import:         { label: 'CSV Import',      color: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400' },
          chat:           { label: 'Chat',            color: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' },
          mailchimp:      { label: 'Mailchimp',       color: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400' },
          activecampaign: { label: 'ActiveCampaign',  color: 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400' },
        }
        const s = SOURCE_LABELS[c.source ?? 'manual'] ?? { label: c.source ?? 'Manual', color: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400' }
        return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${s.color}`}>{s.label}</span>
      }
      default: return null
    }
  }

  const visibleColDefs = ALL_COLUMNS.filter(c => visibleCols.has(c.key))

  // ── Shared button style ──────────────────────────────────────────────────
  const toolbarBtn = (active: boolean) =>
    `flex items-center gap-1.5 px-3 py-2 text-xs font-medium border rounded-lg transition-colors ${
      active
        ? 'bg-gray-100 dark:bg-white/10 border-gray-300 dark:border-white/20 text-gray-900 dark:text-gray-100'
        : 'dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
    }`

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden" onClick={() => setOpenPanel(null)}>

      {/* Action notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-xl shadow-xl">
          {notification}
        </div>
      )}

      {/* Undo delete toasts */}
      {undoToasts.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2">
          {undoToasts.map(toast => (
            <div key={toast.id} className="flex items-center gap-3 px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm rounded-xl shadow-xl">
              <span><strong>{toast.name}</strong> will be removed from Mailchimp in 5 minutes.</span>
              <button
                onClick={() => handleUndo(toast.id)}
                className="px-3 py-1 text-xs font-semibold bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg hover:opacity-80 transition-opacity"
              >
                Undo
              </button>
            </div>
          ))}
        </div>
      )}
      {/* Header */}
      <div className="pl-9 pt-5 pb-3 pr-4 flex items-start justify-between shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Contacts</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{contacts.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          {canWrite && selectedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {bulkDeleting ? 'Deleting…' : `Delete ${selectedIds.size}`}
            </button>
          )}
          <CsvExportButton action={exportContacts} />
          {canWrite && (
            <CsvImportButton action={importContacts} onSuccess={() => router.refresh()} />
          )}
          {canWrite && (
            <button
              onClick={e => { e.stopPropagation(); setShowModal(true) }}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <UserPlus className="w-4 h-4" /> New Contact
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap shrink-0" onClick={e => e.stopPropagation()}>
        {/* Search */}
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search contacts…"
            className="w-full pl-9 pr-4 py-2 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-[#232323] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#15A4AE]"
          />
        </div>

        {/* Automation */}
        <Link href="/sage/contacts/automations" className={toolbarBtn(false)}>
          <Zap className="w-3.5 h-3.5" /> Automation
        </Link>

        {/* Sort */}
        <div className="relative">
          <button onClick={() => togglePanel('sort')} className={toolbarBtn(openPanel === 'sort')}>
            <ArrowUpDown className="w-3.5 h-3.5" />
            Sort
            {sortField && <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />}
          </button>
          {openPanel === 'sort' && (
            <div className="absolute top-full mt-1 left-0 z-30 w-60 bg-white dark:bg-[#232323] border dark:border-white/10 rounded-xl shadow-xl p-3 space-y-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Sort by</p>
              <select
                value={sortField}
                onChange={e => setSortField(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-[#1c1c1c] text-gray-900 dark:text-gray-100"
              >
                {SORT_FIELDS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                {(['asc', 'desc'] as const).map(dir => (
                  <button
                    key={dir}
                    onClick={() => setSortDir(dir)}
                    className={`py-1.5 text-xs rounded-lg border transition-colors ${sortDir === dir ? 'bg-brand-600 border-brand-600 text-white' : 'dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                  >
                    {dir === 'asc' ? '↑ Ascending' : '↓ Descending'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Filter */}
        <div className="relative">
          <button onClick={() => togglePanel('filter')} className={toolbarBtn(openPanel === 'filter')}>
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filter
            {activeFilterCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-brand-600 text-white font-semibold">{activeFilterCount}</span>
            )}
          </button>
          {openPanel === 'filter' && (
            <div className="absolute top-full mt-1 right-0 z-30 w-72 bg-white dark:bg-[#232323] border dark:border-white/10 rounded-xl shadow-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Filters</p>
                {activeFilterCount > 0 && (
                  <button onClick={() => setFilters(EMPTY_FILTER)} className="text-xs text-brand-600 dark:text-[#15A4AE] hover:underline">Clear all</button>
                )}
              </div>

              {/* Contact Type */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Contact Type</p>
                <div className="space-y-1.5">
                  {Object.entries(CONTACT_TYPE_META).map(([key, meta]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <button
                        type="button"
                        onClick={() => toggleContactTypeFilter(key)}
                        className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${filters.contactType.includes(key) ? 'bg-brand-600 border-brand-600' : 'dark:border-white/20 border-gray-300'}`}
                      >
                        {filters.contactType.includes(key) && <Check className="w-2.5 h-2.5 text-white" />}
                      </button>
                      <span className="text-xs text-gray-600 dark:text-gray-400">{meta.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Last Contacted */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Last Contacted</p>
                <select
                  value={filters.lastContacted}
                  onChange={e => setFilters(prev => ({ ...prev, lastContacted: e.target.value as FilterState['lastContacted'] }))}
                  className="w-full px-2 py-1.5 text-xs border dark:border-white/10 rounded-lg bg-white dark:bg-[#1c1c1c] text-gray-900 dark:text-gray-100"
                >
                  <option value="">Any time</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                  <option value="1y">This year</option>
                </select>
              </div>

              {/* Tags */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Tags</p>
                <input
                  type="text"
                  value={filters.tags}
                  onChange={e => setFilters(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="Filter by tag…"
                  className="w-full px-2 py-1.5 text-xs border dark:border-white/10 rounded-lg bg-white dark:bg-[#1c1c1c] text-gray-900 dark:text-gray-100 placeholder-gray-400"
                />
              </div>

              {/* Assigned To */}
              {members.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Assigned To</p>
                  <select
                    value={filters.assignedTo}
                    onChange={e => setFilters(prev => ({ ...prev, assignedTo: e.target.value }))}
                    className="w-full px-2 py-1.5 text-xs border dark:border-white/10 rounded-lg bg-white dark:bg-[#1c1c1c] text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Anyone</option>
                    <option value="__unassigned__">Unassigned</option>
                    {members.map(m => (
                      <option key={m.user_id} value={m.user_id}>{m.name || m.email}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Location */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Location</p>
                <div className="space-y-1.5">
                  {(['city', 'state', 'country'] as const).map(field => (
                    <input
                      key={field}
                      type="text"
                      value={filters[field]}
                      onChange={e => setFilters(prev => ({ ...prev, [field]: e.target.value }))}
                      placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                      className="w-full px-2 py-1.5 text-xs border dark:border-white/10 rounded-lg bg-white dark:bg-[#1c1c1c] text-gray-900 dark:text-gray-100 placeholder-gray-400"
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* View as team member picker — managers+ only */}
        {teamMembers.length > 0 && (
          <div className="relative ml-auto">
            <select
              value={viewAsUserId ?? ''}
              onChange={e => {
                const v = e.target.value
                window.location.href = v ? `/sage/contacts?viewAs=${v}` : '/sage/contacts'
              }}
              className="appearance-none pl-2.5 pr-7 py-2 text-xs border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/8 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#15A4AE] transition-colors"
            >
              <option value="">My contacts</option>
              {teamMembers.map(m => (
                <option key={m.user_id} value={m.user_id}>{m.name || m.email}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
          </div>
        )}

        {/* Edit Columns */}
        <div className="relative">
          <button onClick={() => togglePanel('columns')} className={toolbarBtn(openPanel === 'columns')}>
            <Columns3 className="w-3.5 h-3.5" /> Edit Columns
          </button>
          {openPanel === 'columns' && (
            <div className="absolute top-full mt-1 right-0 z-30 w-52 bg-white dark:bg-[#232323] border dark:border-white/10 rounded-xl shadow-xl p-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Show / Hide Columns</p>
              <div className="space-y-0.5 max-h-72 overflow-y-auto">
                {ALL_COLUMNS.map(col => (
                  <div
                    key={col.key}
                    className={`flex items-center justify-between px-2 py-1.5 rounded-lg ${col.required ? 'opacity-50' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5'}`}
                    onClick={() => !col.required && toggleColumn(col.key)}
                  >
                    <span className="text-xs text-gray-700 dark:text-gray-300">{col.label}</span>
                    <div className={`relative w-8 h-4 rounded-full transition-colors ${visibleCols.has(col.key) ? 'bg-brand-600' : 'bg-gray-200 dark:bg-white/15'}`}>
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${visibleCols.has(col.key) ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 flex flex-col overflow-hidden min-w-0 flex-1">
      <div className="overflow-auto min-w-0 flex-1">
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <UserPlus className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {search || activeFilterCount > 0 ? 'No contacts match your filters.' : 'No contacts yet. Add your first one.'}
            </p>
            {!search && !activeFilterCount && canWrite && (
              <button onClick={() => setShowModal(true)} className="mt-4 text-sm text-brand-600 dark:text-[#15A4AE] hover:underline">
                Add a contact →
              </button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-[#141c2b]">
                {canWrite && (
                  <th className="pl-4 pr-2 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-white/30 accent-brand-600 cursor-pointer"
                    />
                  </th>
                )}
                {visibleColDefs.map(col => (
                  <th key={col.key} className="text-left px-4 py-3 text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                    {col.label}
                  </th>
                ))}
                {canWrite && <th className="px-4 py-3 w-16 bg-[#141c2b]" />}
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-white/8">
              {paginated.map(contact => (
                <tr
                  key={contact.id}
                  className={`transition-colors ${selectedIds.has(contact.id) ? 'bg-brand-50 dark:bg-[#15A4AE]/8' : 'hover:bg-gray-50 dark:hover:bg-white/3'}`}
                >
                  {canWrite && (
                    <td className="pl-4 pr-2 py-3" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(contact.id)}
                        onChange={() => toggleSelect(contact.id)}
                        className="w-4 h-4 rounded border-gray-300 dark:border-white/20 accent-brand-600 cursor-pointer"
                      />
                    </td>
                  )}
                  {visibleColDefs.map(col => (
                    <td
                      key={col.key}
                      className="px-4 py-3"
                      onClick={col.key === 'name' ? undefined : () => router.push(`/sage/contacts/${contact.id}`)}
                    >
                      {renderCell(col.key, contact)}
                    </td>
                  ))}
                  {canWrite && (
                    <td className="sticky right-0 px-4 py-3 bg-white dark:bg-[#1e1e1e] group-hover:bg-gray-50 dark:group-hover:bg-[#1e1e1e] z-10 shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.06)]" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => handleCreateDeal(contact)}
                          disabled={actionLoading === `${contact.id}:deal`}
                          title="Create deal"
                          className="p-1.5 rounded-lg text-[#15A4AE] hover:bg-[#15A4AE]/10 transition-colors disabled:opacity-50"
                        >
                          {actionLoading === `${contact.id}:deal`
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#15A4AE]" />
                            : <DollarSign className="w-3.5 h-3.5" />
                          }
                        </button>
                        <button
                          onClick={() => handleCreateTicket(contact)}
                          disabled={actionLoading === `${contact.id}:ticket`}
                          title="Create ticket"
                          className="p-1.5 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-500/10 transition-colors disabled:opacity-50"
                        >
                          {actionLoading === `${contact.id}:ticket`
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin text-yellow-500" />
                            : <Ticket className="w-3.5 h-3.5 text-gray-400 hover:text-yellow-500" />
                          }
                        </button>
                        <button
                          onClick={() => handleDelete(contact.id)}
                          disabled={deleting === contact.id}
                          title="Delete"
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination footer */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t dark:border-white/8 bg-gray-50/60 dark:bg-white/[0.02] rounded-b-xl">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
            className="text-xs border dark:border-white/10 rounded-lg px-2 py-1 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/40 cursor-pointer"
          >
            {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span>
            {filtered.length === 0 ? '0' : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filtered.length)}`} of {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage <= 1}
              className="px-2.5 py-1 rounded-lg border dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/8 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium">← Prev</button>
            <span className="px-1">{safePage} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}
              className="px-2.5 py-1 rounded-lg border dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/8 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium">Next →</button>
          </div>
        </div>
      </div>
      </div>

      {(showModal || editingContact) && (
        <ContactModal
          contact={editingContact ?? undefined}
          members={members}
          onClose={() => { setShowModal(false); setEditingContact(null) }}
          onSaved={saved => {
            if (editingContact) {
              setContacts(prev => prev.map(c => c.id === saved.id ? saved : c))
            } else {
              setContacts(prev => [saved, ...prev])
            }
          }}
        />
      )}
    </div>
  )
}
