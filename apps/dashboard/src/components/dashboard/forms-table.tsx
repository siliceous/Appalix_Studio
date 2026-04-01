'use client'

import React, { useCallback, useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ClipboardList, Search, ChevronDown, X,
  UserPlus, Ticket, Download, Loader2, Trash2, Sparkles, Columns3, RefreshCw,
} from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import {
  formSubmissionCreateLead,
  formSubmissionCreateTicket,
  deleteSubmission,
  updateSubmissionPriority,
  updateSubmissionStatus,
  updateSubmissionAssignedTo,
  updateSubmissionName,
  updateSubmissionField,
  analyzeFormSubmissions,
} from '@/app/actions/sage-forms'
import { syncAllConnectedSources } from '@/app/actions/leads'
import type { SageForm, SageFormSubmission } from '@/app/actions/sage-forms'
import { TrashTab } from '@/components/dashboard/trash-tab'

// ── Constants ─────────────────────────────────────────────────────────────────
const PRIORITY_OPTIONS = ['high', 'medium', 'low'] as const
const STATUS_OPTIONS   = ['pending', 'lead', 'ticket', 'ignored'] as const

const PRIORITY_CLS: Record<string, string> = {
  high:   'bg-[#15A4AE]/10 dark:bg-[#15A4AE]/15 text-[#1f6157] dark:text-[#15A4AE] border border-[#15A4AE]/30',
  medium: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200/70 dark:border-amber-500/18',
  low:    'bg-gray-100 dark:bg-white/5 text-gray-500 border border-gray-200 dark:border-white/10',
}


const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  lead:    'Deal created',
  ticket:  'Ticket created',
  ignored: 'Ignored',
}

// ── Active pill style (consistent with conversations page) ────────────────────
const ACTIVE_PILL   = 'bg-white/20 text-white border border-white/40'
const INACTIVE_PILL = 'bg-white/8 text-white hover:bg-white/15'

// ── Types ─────────────────────────────────────────────────────────────────────
export type FormFilters = {
  preset?: string
  from?: string
  to?: string
  form?: string
  status?: string
  q?: string
  viewAs?: string
}

interface Props {
  submissions:               SageFormSubmission[]
  forms:                     SageForm[]
  filters:                   FormFilters
  readonly?:                 boolean
  connectedEmailProviders?:  string[]
  connectedFormProviders?:   string[]
  connectedLeadAdProviders?: string[]
  teamMembers?:              Array<{ user_id: string; name: string }>
  canAllocate?:              boolean
}

const EMAIL_PLATFORM_META: Record<string, { name: string; logo?: string; pill: string }> = {
  mailchimp:       { name: 'Mailchimp',        logo: '/integrations/mailchimp.png',       pill: 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/20' },
  activecampaign:  { name: 'ActiveCampaign',   logo: '/integrations/activecampaign.png',  pill: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20' },
  convertkit:      { name: 'Kit',              logo: '/integrations/kit.png',             pill: 'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/20' },
  klaviyo:         { name: 'Klaviyo',          logo: '/integrations/Klaviyo.png',         pill: 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/20' },
  constantcontact: { name: 'Constant Contact', logo: '/integrations/constantcontact.png', pill: 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-500/20' },
  gravity_forms:   { name: 'Gravity Forms',    pill: 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/20' },
  google_forms:    { name: 'Google Forms',      pill: 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/20' },
  typeform:        { name: 'Typeform',         pill: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20' },
  fluent_forms:    { name: 'Fluent Forms',     pill: 'bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-500/20' },
  google_ads:      { name: 'Google Ads',       pill: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20' },
  meta:            { name: 'Meta Ads',         pill: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20' },
}

// ── Click-once to navigate, double-click to edit inline ──────────────────────
function ClickOrEditCell({ value, href, onSave, readonly, className }: {
  value: string
  href: string
  onSave: (val: string) => Promise<void>
  readonly?: boolean
  className?: string
}) {
  const router = useRouter()
  const [editing, setEditing]   = useState(false)
  const [draft,   setDraft]     = useState(value)
  const [saving,  setSaving]    = useState(false)
  const inputRef  = useRef<HTMLInputElement>(null)
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  function handleClick() {
    if (readonly || editing) return
    clickTimer.current = setTimeout(() => { router.push(href) }, 250)
  }

  function handleDoubleClick() {
    if (readonly) return
    if (clickTimer.current) clearTimeout(clickTimer.current)
    setDraft(value)
    setEditing(true)
  }

  async function commit() {
    if (draft.trim() === value) { setEditing(false); return }
    setSaving(true)
    await onSave(draft.trim())
    setSaving(false)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
          className="flex-1 text-sm font-medium bg-white dark:bg-white/5 border border-[#15A4AE]/50 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/40 text-gray-900 dark:text-gray-100"
        />
        {saving && <Loader2 className="w-3 h-3 animate-spin text-[#15A4AE] shrink-0" />}
      </div>
    )
  }

  return (
    <span
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      title={readonly ? undefined : 'Click to open · Double-click to rename'}
      className={`cursor-pointer text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-[#15A4AE] transition-colors truncate block select-none ${className ?? ''}`}
    >
      {value}
    </span>
  )
}

// ── Double-click to edit inline (no navigation) ───────────────────────────────
function InlineEditCell({ value, onSave, readonly, placeholder, className }: {
  value: string
  onSave: (val: string) => Promise<void>
  readonly?: boolean
  placeholder?: string
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(value)
  const [saving,  setSaving]  = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  function handleDoubleClick() {
    if (readonly) return
    setDraft(value)
    setEditing(true)
  }

  async function commit() {
    if (draft.trim() === value) { setEditing(false); return }
    setSaving(true)
    await onSave(draft.trim())
    setSaving(false)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
          className="flex-1 text-xs bg-white dark:bg-white/5 border border-[#15A4AE]/50 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/40 text-gray-900 dark:text-gray-100 min-w-[80px]"
        />
        {saving && <Loader2 className="w-3 h-3 animate-spin text-[#15A4AE] shrink-0" />}
      </div>
    )
  }

  return (
    <span
      onDoubleClick={handleDoubleClick}
      title={readonly ? undefined : 'Double-click to edit'}
      className={`text-xs text-gray-500 dark:text-gray-400 truncate block select-none ${readonly ? '' : 'cursor-text hover:text-[#15A4AE] transition-colors'} ${className ?? ''}`}
    >
      {value || <span className="text-gray-300 dark:text-gray-600 italic">{placeholder ?? '—'}</span>}
    </span>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildUrl(base: string, filters: FormFilters): string {
  const p = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => { if (v) p.set(k, v) })
  const qs = p.toString()
  return qs ? `${base}?${qs}` : base
}

/** Case-insensitive field lookup — handles "Name", "Full Name", "name", "full_name" etc. */
function getField(fields: Record<string, string>, ...keys: string[]): string {
  // Build a normalized lookup map once
  const norm: Record<string, string> = {}
  for (const [k, v] of Object.entries(fields)) {
    norm[k.toLowerCase().replace(/[\s\-\.]+/g, '_')] = v
  }
  for (const key of keys) {
    // Exact match first
    if (fields[key]) return fields[key]
    // Normalized match
    const nk = key.toLowerCase().replace(/[\s\-\.]+/g, '_')
    if (norm[nk]) return norm[nk]
  }
  return ''
}

const META_KEYS = new Set(['form_title', 'form_name', 'id', 'form_id', 'ip', 'date_created', 'source_url', 'currency', 'payment_status'])

/** Extract non-meta trimmed values from fields */
function fieldVals(fields: Record<string, string>): string[] {
  return Object.entries(fields).filter(([k]) => !META_KEYS.has(k)).map(([, v]) => v?.trim() ?? '').filter(Boolean)
}

/** Scan all field values for an email address (handles numeric GF field IDs) */
function detectEmail(fields: Record<string, string>): string {
  return fieldVals(fields).find(v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) ?? ''
}

/** Scan all field values for a phone number */
function detectPhone(fields: Record<string, string>): string {
  return fieldVals(fields).find(v => /^[\+\d][\d\s\-\(\)\.]{5,18}$/.test(v)) ?? ''
}

/** Detect person name: 2-5 words, letters only, not email/phone */
function detectName(fields: Record<string, string>, skip: Set<string>): string {
  return fieldVals(fields).find(v => {
    if (skip.has(v)) return false
    if (v.length < 3 || v.length > 60) return false
    if (/[@\/\d]/.test(v)) return false
    const words = v.split(/\s+/)
    return words.length >= 2 && words.length <= 5 && words.every(w => /^[A-Za-zÀ-ÿ\-'\.]{2,}$/.test(w))
  }) ?? ''
}

/** Detect company: short non-name, non-email, non-phone string */
function detectCompany(fields: Record<string, string>, skip: Set<string>): string {
  return fieldVals(fields).find(v => {
    if (skip.has(v)) return false
    if (v.length < 2 || v.length > 80) return false
    if (/[@]/.test(v)) return false
    return !v.includes('  ') && v.split(/\s+/).length <= 6
  }) ?? ''
}

function getName(sub: SageFormSubmission): string {
  const byKey = getField(sub.fields, 'name', 'full_name', 'your_name', 'contact_name', 'first_name', 'fullname')
  if (sub.ai_entities?.name) return sub.ai_entities.name
  if (byKey) return byKey
  const email = detectEmail(sub.fields)
  const phone = detectPhone(sub.fields)
  return detectName(sub.fields, new Set([email, phone].filter(Boolean)))
}

function getEmail(sub: SageFormSubmission): string {
  return (sub.ai_entities?.email ?? (getField(sub.fields, 'email', 'email_address', 'your_email', 'emailaddress') || detectEmail(sub.fields))) || ''
}

function getCity(sub: SageFormSubmission): string {
  const val = getField(sub.fields, 'city', 'location', 'town', 'suburb')
  // Reject emails, URLs, phone-like strings, or anything too long to be a city
  if (!val) return ''
  if (/[@\/]/.test(val)) return ''
  if (val.length > 50) return ''
  return val
}

function getPhone(sub: SageFormSubmission): string {
  return (sub.ai_entities?.phone ?? (getField(sub.fields, 'phone', 'phone_number', 'mobile', 'mobile_number', 'tel', 'telephone', 'contact_number') || detectPhone(sub.fields))) || ''
}

function getCompany(sub: SageFormSubmission): string {
  const byKey = getField(sub.fields, 'company', 'company_name', 'organisation', 'organization', 'business', 'business_name')
  if (byKey) return byKey
  const email   = detectEmail(sub.fields)
  const phone   = detectPhone(sub.fields)
  const name    = getName(sub)
  return detectCompany(sub.fields, new Set([email, phone, name].filter(Boolean)))
}

function getAddress(sub: SageFormSubmission): string {
  return getField(sub.fields, 'address', 'street', 'street_address', 'address_1', 'address_line_1', 'address_line1')
}

function getMessage(sub: SageFormSubmission): string {
  return getField(sub.fields, 'message', 'notes', 'note', 'comments', 'comment', 'enquiry', 'your_message', 'description', 'details')
}

// ── Column visibility ─────────────────────────────────────────────────────────
type ColKey = 'priority' | 'name' | 'email' | 'phone' | 'company' | 'source' | 'submitted' | 'assigned' | 'city' | 'address' | 'message' | 'status'

const ALL_COLS: { key: ColKey; label: string; required?: boolean }[] = [
  { key: 'priority',  label: 'Priority' },
  { key: 'name',      label: 'Name',        required: true },
  { key: 'email',     label: 'Email' },
  { key: 'phone',     label: 'Phone' },
  { key: 'company',   label: 'Company' },
  { key: 'address',   label: 'Address' },
  { key: 'city',      label: 'City' },
  { key: 'message',   label: 'Message' },
  { key: 'source',    label: 'Source' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'status',    label: 'Status' },
  { key: 'assigned',  label: 'Assigned to' },
]

// Visible by default; priority/city/address/message/status are hidden until user enables them
const DEFAULT_COLS = new Set<ColKey>(['name', 'email', 'phone', 'company', 'source', 'submitted', 'assigned'])

// ── Main component ────────────────────────────────────────────────────────────
export function FormsTable({
  submissions, forms, filters, readonly = false,
  connectedEmailProviders = [],
  connectedFormProviders = [],
  connectedLeadAdProviders = [],
  teamMembers = [], canAllocate = false,
}: Props) {
  const router = useRouter()

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Local optimistic state for inline edits
  const [localPriority, setLocalPriority] = useState<Record<string, string>>({})
  const [localAssign,   setLocalAssign]   = useState<Record<string, string>>({})

  // Inline saving per row
  const [prioritySaving, setPrioritySaving] = useState<Record<string, boolean>>({})
  const [assignSaving,   setAssignSaving]   = useState<Record<string, boolean>>({})
  const [statusSaving,   setStatusSaving]   = useState<Record<string, boolean>>({})
  const [localStatus,    setLocalStatus]    = useState<Record<string, string>>({})

  // Bulk saving
  const [bulkSaving, setBulkSaving] = useState(false)

  // Refresh (sync all connected sources)
  const [refreshing,     setRefreshing]     = useState(false)
  const [refreshResult,  setRefreshResult]  = useState<string | null>(null)

  async function handleRefresh() {
    setRefreshing(true)
    setRefreshResult(null)
    try {
      const res = await syncAllConnectedSources()
      setRefreshResult(res.synced > 0 ? `+${res.synced} new` : 'Up to date')
      router.refresh()
    } catch {
      setRefreshResult('Error')
    } finally {
      setRefreshing(false)
      setTimeout(() => setRefreshResult(null), 4000)
    }
  }

  // Source platform filter (client-side — Mailchimp, ActiveCampaign, etc.)
  const [localSource, setLocalSource] = useState('')
  const filteredSubs = localSource
    ? submissions.filter(s => s.source_platform === localSource)
    : submissions

  // Pagination
  const [pageSize, setPageSize] = useState(20)
  const [page,     setPage]     = useState(1)
  // Reset to page 1 whenever filters or source changes
  const filterKey = JSON.stringify(filters) + localSource
  React.useEffect(() => setPage(1), [filterKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const totalPages  = Math.max(1, Math.ceil(filteredSubs.length / pageSize))
  const safePage    = Math.min(page, totalPages)
  const paginated   = filteredSubs.slice((safePage - 1) * pageSize, safePage * pageSize)

  // Column visibility — persisted to localStorage; initialise from DEFAULT_COLS
  // to match SSR, then hydrate from storage in an effect
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(DEFAULT_COLS)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('forms-table-cols')
      if (saved) setVisibleCols(new Set(JSON.parse(saved) as ColKey[]))
    } catch {}
  }, [])
  const [showColPicker,  setShowColPicker]  = useState(false)
  const colPickerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target as Node)) {
        setShowColPicker(false)
      }
    }
    if (showColPicker) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showColPicker])

  function toggleCol(key: ColKey) {
    setVisibleCols(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      try { localStorage.setItem('forms-table-cols', JSON.stringify([...next])) } catch {}
      return next
    })
  }
  const show = (key: ColKey) => visibleCols.has(key)

  // AI analysis
  const [analyzing,    setAnalyzing]    = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const pendingCount = submissions.filter(s => !s.ai_analyzed_at).length

  async function handleAnalyze() {
    if (analyzing) return
    setAnalyzing(true)
    setAnalyzeError(null)
    const result = await analyzeFormSubmissions()
    setAnalyzing(false)
    if (result.error) setAnalyzeError(result.error)
    router.refresh()
  }

  // Per-row quick action loading state
  const [quickAction, setQuickAction] = useState<Record<string, 'loading-deal' | 'loading-ticket' | 'loading-delete'>>({})

  // ── Filter navigation ────────────────────────────────────────────────────
  const pushFilter = useCallback((patch: Partial<FormFilters>) => {
    const next = { ...filters, ...patch }
    Object.keys(next).forEach(k => { if (!next[k as keyof FormFilters]) delete next[k as keyof FormFilters] })
    router.push(buildUrl('/dashboard/forms', next))
  }, [filters, router])

  // ── Selection helpers ────────────────────────────────────────────────────
  const allSelected = submissions.length > 0 && selectedIds.size === submissions.length
  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(submissions.map(s => s.id)))
  }
  function toggleOne(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── Inline row handlers ───────────────────────────────────────────────────
  async function handlePriorityChange(id: string, val: string) {
    setLocalPriority(p => ({ ...p, [id]: val }))
    setPrioritySaving(p => ({ ...p, [id]: true }))
    await updateSubmissionPriority(id, val as 'high' | 'medium' | 'low' | null)
    setPrioritySaving(p => ({ ...p, [id]: false }))
    router.refresh()
  }

  async function handleAssignChange(id: string, val: string) {
    setLocalAssign(p => ({ ...p, [id]: val }))
    setAssignSaving(p => ({ ...p, [id]: true }))
    await updateSubmissionAssignedTo(id, val || null)
    setAssignSaving(p => ({ ...p, [id]: false }))
    router.refresh()
  }

  async function handleStatusChange(id: string, val: string) {
    setLocalStatus(p => ({ ...p, [id]: val }))
    setStatusSaving(p => ({ ...p, [id]: true }))
    await updateSubmissionStatus(id, val)
    setStatusSaving(p => ({ ...p, [id]: false }))
    router.refresh()
  }

  // ── Bulk handlers ─────────────────────────────────────────────────────────
  async function handleBulkPriority(val: string) {
    if (!val || bulkSaving) return
    setBulkSaving(true)
    await Promise.all([...selectedIds].map(id => updateSubmissionPriority(id, val as 'high' | 'medium' | 'low')))
    setBulkSaving(false)
    router.refresh()
  }

  async function handleBulkStatus(val: string) {
    if (!val || bulkSaving) return
    setBulkSaving(true)
    await Promise.all([...selectedIds].map(id => updateSubmissionStatus(id, val)))
    setBulkSaving(false)
    router.refresh()
  }

  async function handleBulkAssign(val: string) {
    if (bulkSaving) return
    setBulkSaving(true)
    await Promise.all([...selectedIds].map(id => updateSubmissionAssignedTo(id, val || null)))
    setBulkSaving(false)
    router.refresh()
  }

  async function handleBulkDelete() {
    if (!window.confirm(`Delete ${selectedIds.size} submission(s)?`)) return
    setBulkSaving(true)
    await Promise.all([...selectedIds].map(id => deleteSubmission(id)))
    setBulkSaving(false)
    setSelectedIds(new Set())
    router.refresh()
  }

  // ── Quick-action handlers ─────────────────────────────────────────────────
  async function handleCreateLead(sub: SageFormSubmission) {
    setQuickAction(p => ({ ...p, [sub.id]: 'loading-deal' }))
    const res = await formSubmissionCreateLead(sub)
    setQuickAction(p => { const n = { ...p }; delete n[sub.id]; return n })
    if (!res.error) router.refresh()
  }

  async function handleCreateTicket(sub: SageFormSubmission) {
    setQuickAction(p => ({ ...p, [sub.id]: 'loading-ticket' }))
    const res = await formSubmissionCreateTicket(sub)
    setQuickAction(p => { const n = { ...p }; delete n[sub.id]; return n })
    if (!res.error) router.refresh()
  }

  function handleDownload(sub: SageFormSubmission) {
    const name = getName(sub) || 'submission'
    const data = JSON.stringify({ ...sub.fields, ...sub.ai_entities, submitted: sub.created_at }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `${name.replace(/\s+/g, '_')}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  async function handleDeleteSubmission(id: string) {
    setQuickAction(p => ({ ...p, [id]: 'loading-delete' }))
    await deleteSubmission(id)
    setQuickAction(p => { const n = { ...p }; delete n[id]; return n })
    router.refresh()
  }

  // ── Misc ──────────────────────────────────────────────────────────────────
  const activeForm   = filters.form   ?? ''
  const activeStatus = filters.status ?? ''

  const exportCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Company', 'City', 'Form', 'Priority', 'Status', 'Submitted', 'Assigned to']
    const rows = submissions.map(sub => {
      const name     = getName(sub) || 'Anonymous'
      const email    = getEmail(sub)
      const phone    = getPhone(sub)
      const company  = getCompany(sub)
      const city     = getCity(sub)
      const form     = forms.find(f => f.id === sub.form_id)?.name ?? ''
      const status   = STATUS_LABEL[sub.action_type ?? 'pending'] ?? 'Pending'
      const assignee = teamMembers.find(m => m.user_id === sub.assigned_to)?.name ?? ''
      return [name, email, phone, company, city, form, sub.ai_priority ?? '', status, new Date(sub.created_at).toLocaleString(), assignee]
    })
    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = 'form-submissions.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-full mx-auto space-y-5 p-8">

      {/* ── Connected sources bar ── */}
      {(() => {
        const submissionFormProviders = [...new Set(submissions.map(s => s.source_platform).filter(Boolean))]
          .filter(p => ['gravity_forms', 'google_forms', 'typeform', 'fluent_forms', 'google_ads', 'meta'].includes(p as string)) as string[]
        const allProviders = [...new Set([...connectedEmailProviders, ...connectedFormProviders, ...connectedLeadAdProviders, ...submissionFormProviders])]
        if (allProviders.length === 0) return null
        return (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-white/8 bg-white dark:bg-white/[0.03]">
            <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium shrink-0">Connected:</span>
            <div className="flex flex-wrap gap-1.5 flex-1">
              {allProviders.map(provider => {
                const meta = EMAIL_PLATFORM_META[provider]
                if (!meta) return null
                return (
                  <span key={provider} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${meta.pill}`}>
                    {meta.logo && <img src={meta.logo} alt="" className="w-3 h-3 object-contain" />}
                    {meta.name}
                  </span>
                )
              })}
            </div>
            <Link href="/forms/sources" className="text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0">Manage →</Link>
          </div>
        )
      })()}

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Form Submissions</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            All submissions across your forms — {filteredSubs.length} shown
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Bulk actions */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              {bulkSaving && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
              <select
                disabled={bulkSaving}
                defaultValue=""
                onChange={e => { handleBulkPriority(e.target.value); e.target.value = '' }}
                className="text-xs border dark:border-white/10 rounded-lg px-2 py-1.5 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-200 focus:outline-none disabled:opacity-50"
              >
                <option value="" disabled>Priority…</option>
                {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
              <select
                disabled={bulkSaving}
                defaultValue=""
                onChange={e => { handleBulkStatus(e.target.value); e.target.value = '' }}
                className="text-xs border dark:border-white/10 rounded-lg px-2 py-1.5 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-200 focus:outline-none disabled:opacity-50"
              >
                <option value="" disabled>Status…</option>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
              {canAllocate && teamMembers.length > 0 && (
                <select
                  disabled={bulkSaving}
                  defaultValue=""
                  onChange={e => { handleBulkAssign(e.target.value); e.target.value = '' }}
                  className="text-xs border dark:border-white/10 rounded-lg px-2 py-1.5 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-200 focus:outline-none disabled:opacity-50"
                >
                  <option value="" disabled>Assign to…</option>
                  <option value="">Unassign</option>
                  {teamMembers.map(m => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
                </select>
              )}
              <button
                onClick={handleBulkDelete}
                disabled={bulkSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete ({selectedIds.size})
              </button>
            </div>
          )}
          {pendingCount > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => void handleAnalyze()}
                disabled={analyzing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#15A4AE] bg-[#15A4AE]/8 dark:bg-[#15A4AE]/15 border border-[#15A4AE]/30 rounded-lg hover:bg-[#15A4AE]/15 transition-colors disabled:opacity-50"
              >
                {analyzing
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Sparkles className="w-3.5 h-3.5" />}
                {analyzing ? 'Analysing…' : `Analyse (${pendingCount})`}
              </button>
              {analyzeError && (
                <span className="text-xs text-red-500 dark:text-red-400">{analyzeError}</span>
              )}
            </div>
          )}
          <button
            onClick={() => void handleRefresh()}
            disabled={refreshing}
            title="Sync new contacts from all connected sources"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-white/5 border dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            {refreshing
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <RefreshCw className="w-3.5 h-3.5" />}
            {refreshResult ?? 'Refresh'}
          </button>
          <button
            onClick={exportCSV}
            disabled={submissions.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-white/5 border dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <Link
            href="/forms/sources"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors"
          >
            + Forms
          </Link>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="bg-[#141c2b] rounded-xl border border-white/10 p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              defaultValue={filters.q ?? ''}
              placeholder="Search by name or email…"
              onKeyDown={e => { if (e.key === 'Enter') pushFilter({ q: (e.target as HTMLInputElement).value || undefined }) }}
              onBlur={e => { if (e.target.value !== (filters.q ?? '')) pushFilter({ q: e.target.value || undefined }) }}
              className="w-full pl-8 pr-3 py-2 text-sm border border-white/20 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40"
            />
            {filters.q && (
              <button onClick={() => pushFilter({ q: undefined })} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {(() => {
            // Unique source platforms present in the current submissions
            const srcPlatforms = [...new Set(submissions.map(s => s.source_platform).filter(Boolean))] as string[]
            const showDropdown = forms.length > 1 || srcPlatforms.length > 0
            if (!showDropdown) return null
            // Combined select value: form ID or '__src__<platform>'
            const combinedValue = localSource ? `__src__${localSource}` : (activeForm ?? '')
            return (
              <div className="relative">
                <select
                  value={combinedValue}
                  onChange={e => {
                    const val = e.target.value
                    if (val.startsWith('__src__')) {
                      setLocalSource(val.slice(7))
                      pushFilter({ form: undefined })
                    } else {
                      setLocalSource('')
                      pushFilter({ form: val || undefined })
                    }
                  }}
                  className="dark-bar-select appearance-none pl-3 pr-8 py-2 text-sm border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 cursor-pointer"
                >
                  <option value="">All sources</option>
                  {forms.length > 0 && (
                    <optgroup label="Forms">
                      {forms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </optgroup>
                  )}
                  {srcPlatforms.length > 0 && (
                    <optgroup label="Integrations">
                      {srcPlatforms.map(p => (
                        <option key={p} value={`__src__${p}`}>
                          {EMAIL_PLATFORM_META[p]?.name ?? p}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 pointer-events-none" />
              </div>
            )
          })()}

          {/* Edit Columns picker */}
          <div className="relative" ref={colPickerRef}>
            <button
              onClick={() => setShowColPicker(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg transition-colors ${
                showColPicker
                  ? 'bg-[#15A4AE]/15 border-[#15A4AE]/40 text-[#15A4AE]'
                  : 'bg-white/5 border-white/20 text-white hover:bg-white/10'
              }`}
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span>Edit columns</span>
            </button>
            {showColPicker && (
              <div className="absolute left-0 top-full mt-1.5 z-50 w-52 bg-white dark:bg-[#1e1e1e] rounded-xl border border-gray-200 dark:border-white/10 shadow-lg py-1.5">
                <div className="px-3 pt-1 pb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Toggle columns
                </div>
                {ALL_COLS.map(col => (
                  <label key={col.key} className="flex items-center justify-between px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer select-none">
                    <span className="text-sm text-gray-700 dark:text-gray-200">{col.label}</span>
                    <button
                      type="button"
                      disabled={col.required}
                      onClick={() => !col.required && toggleCol(col.key)}
                      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                        visibleCols.has(col.key)
                          ? 'bg-[#15A4AE]'
                          : 'bg-gray-200 dark:bg-white/15'
                      } ${col.required ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${
                        visibleCols.has(col.key) ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </button>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {([
              { value: '',        label: 'All' },
              { value: 'pending', label: 'Pending' },
              { value: 'lead',    label: 'Deal created' },
              { value: 'ticket',  label: 'Ticket created' },
              { value: 'ignored', label: 'Ignored' },
              { value: 'trash',   label: 'Trash' },
            ]).map(s => (
              <button key={s.value}
                onClick={() => pushFilter({ status: s.value || undefined })}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${activeStatus === s.value ? ACTIVE_PILL : INACTIVE_PILL}`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Table or Trash ── */}
      {activeStatus === 'trash' ? (
        <TrashTab type="submission" />
      ) : (
      <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 overflow-hidden">
        {filteredSubs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ClipboardList className="w-10 h-10 text-gray-200 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-400">No submissions match your filters.</p>
          </div>
        ) : (
          <div className="relative overflow-x-auto">
          <table className="min-w-full text-sm table-auto">
            <thead>
              <tr className="bg-[#141c2b]">
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="rounded border-white/30 text-brand-600 focus:ring-[#15A4AE]/40"
                  />
                </th>
                {show('priority')  && <th className="text-left px-3 py-3 text-xs font-semibold text-white uppercase tracking-wide">Priority</th>}
                {show('name')      && <th className="text-left px-3 py-3 text-xs font-semibold text-white uppercase tracking-wide">Name</th>}
                {show('email')     && <th className="text-left px-3 py-3 text-xs font-semibold text-white uppercase tracking-wide">Email</th>}
                {show('phone')     && <th className="text-left px-3 py-3 text-xs font-semibold text-white uppercase tracking-wide">Phone</th>}
                {show('company')   && <th className="text-left px-3 py-3 text-xs font-semibold text-white uppercase tracking-wide">Company</th>}
                {show('address')   && <th className="text-left px-3 py-3 text-xs font-semibold text-white uppercase tracking-wide">Address</th>}
                {show('city')      && <th className="text-left px-3 py-3 text-xs font-semibold text-white uppercase tracking-wide">City</th>}
                {show('message')   && <th className="text-left px-3 py-3 text-xs font-semibold text-white uppercase tracking-wide">Message</th>}
                {show('source')    && <th className="text-left px-3 py-3 text-xs font-semibold text-white uppercase tracking-wide">Source</th>}
                {show('submitted') && <th className="text-left px-3 py-3 text-xs font-semibold text-white uppercase tracking-wide">Submitted</th>}
                {show('status')    && <th className="text-left px-3 py-3 text-xs font-semibold text-white uppercase tracking-wide">Status</th>}
                {show('assigned')  && <th className="text-left px-3 py-3 text-xs font-semibold text-white uppercase tracking-wide">Assigned to</th>}
                <th className="sticky right-0 text-right px-4 py-3 text-xs font-semibold text-white uppercase tracking-wide bg-[#141c2b] shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.2)]">Actions</th>
              </tr>
            </thead>
              <tbody className="divide-y dark:divide-white/5">
                {paginated.map(sub => {
                  const name     = getName(sub) || 'Anonymous'
                  const email    = getEmail(sub) ?? ''
                  const phone    = getPhone(sub)
                  const company  = getCompany(sub)
                  const form     = forms.find(f => f.id === sub.form_id)
                  const priority = localPriority[sub.id] ?? sub.ai_priority ?? null
                  const assigneeId = localAssign[sub.id] !== undefined ? localAssign[sub.id] : (sub.assigned_to ?? '')
                  const assignee = teamMembers.find(m => m.user_id === assigneeId)
                  const qa = quickAction[sub.id]
                  const selected = selectedIds.has(sub.id)

                  return (
                    <tr
                      key={sub.id}
                      className={`hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors group ${selected ? 'bg-brand-50/40 dark:bg-[#15A4AE]/5' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleOne(sub.id)}
                          className="rounded border-gray-300 dark:border-white/20 text-brand-600 focus:ring-[#15A4AE]/40"
                        />
                      </td>

                      {/* Priority — inline editable pill */}
                      {show('priority') && (
                        <td className="px-3 py-3 whitespace-nowrap">
                          {prioritySaving[sub.id] ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                          ) : (
                            <div className="relative inline-flex items-center">
                              <select
                                value={priority ?? ''}
                                disabled={readonly || prioritySaving[sub.id]}
                                onChange={e => handlePriorityChange(sub.id, e.target.value)}
                                className={`appearance-none pl-2 pr-5 py-0.5 rounded-full text-[10px] font-semibold cursor-pointer border-0 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/40 disabled:cursor-default ${
                                  priority ? PRIORITY_CLS[priority] : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500'
                                }`}
                              >
                                <option value="">— none —</option>
                                {PRIORITY_OPTIONS.map(p => (
                                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                                ))}
                              </select>
                              {!readonly && <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-current opacity-60 pointer-events-none" />}
                            </div>
                          )}
                        </td>
                      )}

                      {/* Name */}
                      {show('name') && (
                        <td className="px-3 py-3 overflow-hidden">
                          <ClickOrEditCell
                            value={name || '—'}
                            href={`/dashboard/forms/${sub.id}`}
                            onSave={async val => { await updateSubmissionName(sub.id, val); router.refresh() }}
                            readonly={readonly}
                          />
                        </td>
                      )}

                      {/* Email */}
                      {show('email') && (
                        <td className="px-3 py-3 overflow-hidden">
                          <InlineEditCell
                            value={email}
                            onSave={async val => { await updateSubmissionField(sub.id, 'email', val); router.refresh() }}
                            readonly={readonly}
                            placeholder="—"
                          />
                        </td>
                      )}

                      {/* Phone */}
                      {show('phone') && (
                        <td className="px-3 py-3 overflow-hidden">
                          <InlineEditCell
                            value={phone}
                            onSave={async val => { await updateSubmissionField(sub.id, 'phone', val); router.refresh() }}
                            readonly={readonly}
                            placeholder="—"
                          />
                        </td>
                      )}

                      {/* Company */}
                      {show('company') && (
                        <td className="px-3 py-3 overflow-hidden">
                          <InlineEditCell
                            value={company}
                            onSave={async val => { await updateSubmissionField(sub.id, 'company', val); router.refresh() }}
                            readonly={readonly}
                            placeholder="—"
                          />
                        </td>
                      )}

                      {/* Address */}
                      {show('address') && (
                        <td className="px-3 py-3 overflow-hidden">
                          <InlineEditCell
                            value={getAddress(sub)}
                            onSave={async val => { await updateSubmissionField(sub.id, 'address', val); router.refresh() }}
                            readonly={readonly}
                            placeholder="—"
                          />
                        </td>
                      )}

                      {/* City */}
                      {show('city') && (
                        <td className="px-3 py-3 overflow-hidden">
                          <InlineEditCell
                            value={getCity(sub)}
                            onSave={async val => { await updateSubmissionField(sub.id, 'city', val); router.refresh() }}
                            readonly={readonly}
                            placeholder="—"
                          />
                        </td>
                      )}

                      {/* Message */}
                      {show('message') && (
                        <td className="px-3 py-3 overflow-hidden">
                          <InlineEditCell
                            value={getMessage(sub)}
                            onSave={async val => { await updateSubmissionField(sub.id, 'message', val); router.refresh() }}
                            readonly={readonly}
                            placeholder="—"
                          />
                        </td>
                      )}

                      {/* Source / platform */}
                      {show('source') && (
                        <td className="px-3 py-3 overflow-hidden">
                          {sub.source_platform && EMAIL_PLATFORM_META[sub.source_platform] ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${EMAIL_PLATFORM_META[sub.source_platform].pill}`}>
                              {EMAIL_PLATFORM_META[sub.source_platform].logo && (
                                <img src={EMAIL_PLATFORM_META[sub.source_platform].logo} alt="" className="w-3 h-3 object-contain shrink-0" />
                              )}
                              <span className="truncate">{EMAIL_PLATFORM_META[sub.source_platform].name}</span>
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500 dark:text-gray-400 truncate block" title={form?.name ?? ''}>
                              {form?.name ?? '—'}
                            </span>
                          )}
                        </td>
                      )}

                      {/* Submitted */}
                      {show('submitted') && (
                        <td className="px-3 py-3 overflow-hidden">
                          <span className="text-xs text-gray-400 truncate block">{timeAgo(sub.created_at)}</span>
                          {sub.mailchimp_synced_at && (
                            <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-yellow-400/10 text-yellow-700 dark:text-yellow-400 border border-yellow-400/25" title={`Synced ${timeAgo(sub.mailchimp_synced_at)}`}>
                              <img src="/integrations/mailchimp.png" alt="" className="w-3 h-3 object-contain" />Synced
                            </span>
                          )}
                        </td>
                      )}

                      {/* Status — inline dropdown */}
                      {show('status') && (
                        <td className="px-3 py-3 whitespace-nowrap">
                          {statusSaving[sub.id] ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                          ) : (
                            <div className="relative inline-flex items-center">
                              <select
                                value={localStatus[sub.id] ?? sub.action_type ?? 'pending'}
                                disabled={readonly || statusSaving[sub.id]}
                                onChange={e => handleStatusChange(sub.id, e.target.value)}
                                className="appearance-none pl-2 pr-5 py-0.5 rounded-full text-[10px] font-semibold cursor-pointer border-0 bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/40 disabled:cursor-default"
                              >
                                {STATUS_OPTIONS.map(s => (
                                  <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                                ))}
                              </select>
                              {!readonly && <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-current opacity-60 pointer-events-none" />}
                            </div>
                          )}
                        </td>
                      )}

                      {/* Assigned to */}
                      {show('assigned') && (
                        <td className="px-3 py-3 whitespace-nowrap">
                          {assignSaving[sub.id] ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                          ) : canAllocate && teamMembers.length > 0 ? (
                            <select
                              value={assigneeId}
                              disabled={readonly || assignSaving[sub.id]}
                              onChange={e => handleAssignChange(sub.id, e.target.value)}
                              className="text-xs border dark:border-white/10 rounded-lg px-2 py-1 bg-transparent text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/40 disabled:opacity-60 max-w-[120px]"
                            >
                              <option value="">Unassigned</option>
                              {teamMembers.map(m => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
                            </select>
                          ) : assignee ? (
                            <span className="text-xs text-gray-600 dark:text-gray-300">{assignee.name}</span>
                          ) : (
                            <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                          )}
                        </td>
                      )}

                      {/* Actions */}
                      <td className="sticky right-0 px-4 py-3.5 whitespace-nowrap bg-white dark:bg-[#1e1e1e] group-hover:bg-gray-50 dark:group-hover:bg-[#1e1e1e] z-10 shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.08)]">
                        <div className="flex items-center gap-1 justify-end">
                          {!readonly && (
                            qa === 'loading-deal' ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                            ) : (
                              <button
                                onClick={() => handleCreateLead(sub)}
                                title="Create deal"
                                className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                              </button>
                            )
                          )}
                          {!readonly && (
                            qa === 'loading-ticket' ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-yellow-400" />
                            ) : (
                              <button
                                onClick={() => handleCreateTicket(sub)}
                                title="Create ticket"
                                className="p-1.5 text-yellow-500 hover:text-yellow-700 hover:bg-yellow-50 dark:hover:bg-yellow-500/10 rounded-lg transition-colors"
                              >
                                <Ticket className="w-3.5 h-3.5" />
                              </button>
                            )
                          )}
                          <button
                            onClick={() => handleDownload(sub)}
                            title="Download submission"
                            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          {!readonly && (
                            qa === 'loading-delete' ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
                            ) : (
                              <button
                                onClick={() => handleDeleteSubmission(sub.id)}
                                title="Delete submission"
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                              >
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
        {/* Pagination — always visible */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t dark:border-white/8 bg-gray-50/60 dark:bg-white/[0.02]">
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
              {filteredSubs.length === 0 ? '0' : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filteredSubs.length)}`} of {filteredSubs.length}
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
      )}

      {activeStatus !== 'trash' && submissions.length === 200 && (
        <p className="text-xs text-center text-gray-400 pb-2">
          Showing first 200 results — use filters to narrow down.
        </p>
      )}
    </div>
  )
}
