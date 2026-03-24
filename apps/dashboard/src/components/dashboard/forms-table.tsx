'use client'

import React, { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ClipboardList, Search, ChevronDown, X,
  UserPlus, Ticket, Download, Loader2, Trash2, Pencil, Sparkles,
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
  analyzeFormSubmissions,
} from '@/app/actions/sage-forms'
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
const ACTIVE_PILL   = 'bg-[#15A4AE]/15 dark:bg-[#15A4AE]/20 text-[#1f6157] dark:text-[#15A4AE] border border-[#15A4AE]/30'
const INACTIVE_PILL = 'bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/12'

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
  submissions:              SageFormSubmission[]
  forms:                    SageForm[]
  filters:                  FormFilters
  readonly?:                boolean
  connectedEmailProviders?:  string[]
  teamMembers?:             Array<{ user_id: string; name: string }>
  canAllocate?:             boolean
}

const EMAIL_PLATFORM_META: Record<string, { name: string; logo?: string }> = {
  mailchimp:       { name: 'Mailchimp',       logo: '/integrations/mailchimp.png' },
  activecampaign:  { name: 'ActiveCampaign',  logo: '/integrations/activecampaign.png' },
  convertkit:      { name: 'Kit',             logo: '/integrations/kit.png' },
  klaviyo:         { name: 'Klaviyo',         logo: '/integrations/Klaviyo.png' },
  constantcontact: { name: 'Constant Contact',logo: '/integrations/constantcontact.png' },
  gravity_forms:   { name: 'Gravity Forms' },
  wpforms:         { name: 'WPForms' },
  typeform:        { name: 'Typeform' },
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

/** Scan all field values for an email address (handles numeric GF field IDs) */
function detectEmail(fields: Record<string, string>): string {
  return Object.values(fields).find(v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())) ?? ''
}

/** Scan all field values for a phone number (handles numeric GF field IDs) */
function detectPhone(fields: Record<string, string>): string {
  return Object.values(fields).find(v => /^[\+\d][\d\s\-\(\)\.]{5,18}$/.test(v.trim())) ?? ''
}

function getName(sub: SageFormSubmission): string {
  return (sub.ai_entities?.name ?? getField(sub.fields, 'name', 'full_name', 'your_name', 'contact_name', 'first_name', 'fullname')) || ''
}

function getEmail(sub: SageFormSubmission): string {
  return (sub.ai_entities?.email ?? (getField(sub.fields, 'email', 'email_address', 'your_email', 'emailaddress') || detectEmail(sub.fields))) || ''
}

function getCity(sub: SageFormSubmission): string {
  return getField(sub.fields, 'city', 'location', 'town', 'suburb')
}

function getPhone(sub: SageFormSubmission): string {
  return (sub.ai_entities?.phone ?? (getField(sub.fields, 'phone', 'phone_number', 'mobile', 'mobile_number', 'tel', 'telephone', 'contact_number') || detectPhone(sub.fields))) || ''
}

function getCompany(sub: SageFormSubmission): string {
  return getField(sub.fields, 'company', 'company_name', 'organisation', 'organization', 'business', 'business_name')
}

// ── Main component ────────────────────────────────────────────────────────────
export function FormsTable({
  submissions, forms, filters, readonly = false,
  connectedEmailProviders = [],
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

  // Bulk saving
  const [bulkSaving, setBulkSaving] = useState(false)

  // AI analysis
  const [analyzing, setAnalyzing] = useState(false)
  const pendingCount = submissions.filter(s => !s.ai_analyzed_at).length

  async function handleAnalyze() {
    if (analyzing) return
    setAnalyzing(true)
    await analyzeFormSubmissions()
    setAnalyzing(false)
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

  function handleRename(sub: SageFormSubmission) {
    const current = getName(sub) || ''
    const newName = window.prompt('Rename contact:', current)
    if (newName === null || newName === current) return
    updateSubmissionName(sub.id, newName.trim()).then(() => router.refresh())
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
        const formProviders = [...new Set(submissions.map(s => s.source_platform).filter(Boolean))]
          .filter(p => ['gravity_forms', 'wpforms', 'typeform'].includes(p as string)) as string[]
        const allProviders = [...connectedEmailProviders, ...formProviders]
        if (allProviders.length === 0) return null
        return (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-white/8 bg-white dark:bg-white/[0.03]">
            <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium shrink-0">Connected:</span>
            <div className="flex flex-wrap gap-1.5 flex-1">
              {allProviders.map(provider => {
                const meta = EMAIL_PLATFORM_META[provider]
                if (!meta) return null
                return (
                  <span key={provider} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
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
            All submissions across your forms — {submissions.length} shown
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
          )}
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
      <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              defaultValue={filters.q ?? ''}
              placeholder="Search by name or email…"
              onKeyDown={e => { if (e.key === 'Enter') pushFilter({ q: (e.target as HTMLInputElement).value || undefined }) }}
              onBlur={e => { if (e.target.value !== (filters.q ?? '')) pushFilter({ q: e.target.value || undefined }) }}
              className="w-full pl-8 pr-3 py-2 text-sm border dark:border-white/10 rounded-lg bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40"
            />
            {filters.q && (
              <button onClick={() => pushFilter({ q: undefined })} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {forms.length > 1 && (
            <div className="relative">
              <select
                value={activeForm}
                onChange={e => pushFilter({ form: e.target.value || undefined })}
                className="appearance-none pl-3 pr-8 py-2 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 cursor-pointer"
              >
                <option value="">All forms</option>
                {forms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          )}

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
        {submissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ClipboardList className="w-10 h-10 text-gray-200 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-400">No submissions match your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="border-b dark:border-white/8 bg-gray-50 dark:bg-white/[0.03]">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="rounded border-gray-300 dark:border-white/20 text-brand-600 focus:ring-[#15A4AE]/40"
                    />
                  </th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Priority</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Name</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Email</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Phone</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Company</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">City</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Form</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Submitted</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Assigned to</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-white/5">
                {submissions.map(sub => {
                  const name     = getName(sub) || 'Anonymous'
                  const email    = getEmail(sub) || null
                  const phone    = getPhone(sub)
                  const company  = getCompany(sub)
                  const city     = getCity(sub)
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

                      {/* Name */}
                      <td className="px-3 py-3 max-w-[140px]">
                        <Link
                          href={`/dashboard/forms/${sub.id}`}
                          className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-[#15A4AE] truncate block"
                        >
                          {name}
                        </Link>
                      </td>

                      {/* Email */}
                      <td className="px-3 py-3 max-w-[160px]">
                        {email
                          ? <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{email}</p>
                          : <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                        }
                      </td>

                      {/* Phone */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        {phone
                          ? <span className="text-xs text-gray-500 dark:text-gray-400">{phone}</span>
                          : <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                        }
                      </td>

                      {/* Company */}
                      <td className="px-3 py-3 max-w-[120px]">
                        {company
                          ? <span className="text-xs text-gray-700 dark:text-gray-300 truncate block">{company}</span>
                          : <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                        }
                      </td>

                      {/* City */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        {city
                          ? <span className="text-xs text-gray-500 dark:text-gray-400">{city}</span>
                          : <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                        }
                      </td>

                      {/* Form / platform */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        {sub.source_platform ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-500/20">
                            {EMAIL_PLATFORM_META[sub.source_platform]?.logo && (
                              <img src={EMAIL_PLATFORM_META[sub.source_platform].logo} alt="" className="w-3 h-3 object-contain" />
                            )}
                            {EMAIL_PLATFORM_META[sub.source_platform]?.name ?? sub.source_platform}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[100px] block">
                            {form?.name ?? '—'}
                          </span>
                        )}
                      </td>

                      {/* Submitted */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="text-xs text-gray-400">{timeAgo(sub.created_at)}</span>
                        {sub.mailchimp_synced_at && (
                          <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-yellow-400/10 text-yellow-700 dark:text-yellow-400 border border-yellow-400/25" title={`Synced ${timeAgo(sub.mailchimp_synced_at)}`}>
                            <img src="/integrations/mailchimp.png" alt="" className="w-3 h-3 object-contain" />Synced
                          </span>
                        )}
                      </td>

                      {/* Assigned to */}
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

                      {/* Actions */}
                      <td className="px-4 py-3.5 w-px whitespace-nowrap">
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
                          {!readonly && (
                            <button
                              onClick={() => handleRename(sub)}
                              title="Rename contact"
                              className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
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
