'use client'

import React, { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ClipboardList, Search, ChevronDown, X,
  UserPlus, Ticket, Download, ChevronUp, Loader2, Trash2, Pencil,
} from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import {
  formSubmissionCreateLead,
  formSubmissionCreateTicket,
  markSubmissionActioned,
  updateFormMailchimpList,
  updateSubmissionPriority,
  updateSubmissionStatus,
  updateSubmissionAssignedTo,
  updateSubmissionName,
} from '@/app/actions/sage-forms'
import { toggleMailchimpSync, syncFromEmailPlatform } from '@/app/actions/leads'
import type { SageForm, SageFormSubmission } from '@/app/actions/sage-forms'

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
  mailchimpConnected?:      boolean
  mailchimpListId?:         string
  mailchimpLists?:          Array<{ id: string; name: string }>
  connectedEmailProviders?:  string[]
  mailchimpSyncEnabled?:     boolean
  teamMembers?:             Array<{ user_id: string; name: string }>
  canAllocate?:             boolean
}

const EMAIL_PLATFORM_META: Record<string, { name: string; logo: string }> = {
  mailchimp:       { name: 'Mailchimp',       logo: '/integrations/mailchimp.png' },
  activecampaign:  { name: 'ActiveCampaign',  logo: '/integrations/activecampaign.png' },
  convertkit:      { name: 'Kit',             logo: '/integrations/kit.png' },
  klaviyo:         { name: 'Klaviyo',         logo: '/integrations/Klaviyo.png' },
  constantcontact: { name: 'Constant Contact',logo: '/integrations/constantcontact.png' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function openOAuthPopup(path: string, onClose: () => void) {
  const w = 600, h = 700
  const left = Math.round(window.screenX + (window.outerWidth - w) / 2)
  const top  = Math.round(window.screenY + (window.outerHeight - h) / 2)
  const popup = window.open(path, 'oauth-popup', `width=${w},height=${h},left=${left},top=${top},toolbar=0,menubar=0,location=0`)
  if (!popup) return
  const timer = setInterval(() => {
    if (popup.closed) { clearInterval(timer); onClose() }
  }, 500)
}

function buildUrl(base: string, filters: FormFilters): string {
  const p = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => { if (v) p.set(k, v) })
  const qs = p.toString()
  return qs ? `${base}?${qs}` : base
}

function getCity(sub: SageFormSubmission): string {
  return sub.fields.city ?? sub.fields.location ?? ''
}

function getPhone(sub: SageFormSubmission): string {
  return sub.ai_entities?.phone ?? sub.fields.phone ?? sub.fields.phone_number ?? sub.fields.mobile ?? ''
}

function getCompany(sub: SageFormSubmission): string {
  return sub.fields.company ?? sub.fields.company_name ?? sub.fields.organisation ?? sub.fields.organization ?? ''
}

// ── Main component ────────────────────────────────────────────────────────────
export function FormsTable({
  submissions, forms, filters, readonly = false,
  mailchimpConnected = false, mailchimpListId = '', mailchimpLists = [],
  connectedEmailProviders = [], mailchimpSyncEnabled = false,
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

  // Per-row quick action loading state
  const [quickAction, setQuickAction] = useState<Record<string, 'loading-deal' | 'loading-ticket' | 'loading-delete'>>({})

  // Email integration state
  const [mcExpanded, setMcExpanded] = useState(false)
  const [mcSaving, setMcSaving]     = useState<Record<string, boolean>>({})
  const [syncEnabled, setSyncEnabled]   = useState(mailchimpSyncEnabled)
  const [syncToggling, setSyncToggling] = useState(false)
  const [syncing, setSyncing]           = useState(false)
  const [syncResult, setSyncResult]     = useState<{ synced: number; skipped: number; error?: string } | null>(null)
  const [bannerCollapsed, setBannerCollapsed] = useState(false)

  // ── Email integration handlers ───────────────────────────────────────────
  async function handleToggleSync() {
    if (syncToggling) return
    const next = !syncEnabled
    setSyncEnabled(next)
    setSyncToggling(true)
    try {
      await toggleMailchimpSync(next)
      router.refresh()
    } finally {
      setSyncToggling(false)
    }
  }

  async function handleSyncNow() {
    if (syncing) return
    setSyncing(true)
    setSyncResult(null)
    try {
      const result = await syncFromEmailPlatform('mailchimp')
      setSyncResult(result)
      router.refresh()
    } finally {
      setSyncing(false)
    }
  }

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
    await Promise.all([...selectedIds].map(id => markSubmissionActioned(id, 'ignored')))
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
    const current = sub.ai_entities?.name ?? sub.fields.name ?? ''
    const newName = window.prompt('Rename contact:', current)
    if (newName === null || newName === current) return
    updateSubmissionName(sub.id, newName.trim()).then(() => router.refresh())
  }

  function handleDownload(sub: SageFormSubmission) {
    const name = sub.ai_entities?.name ?? sub.fields.name ?? 'submission'
    const data = JSON.stringify({ ...sub.fields, ...sub.ai_entities, submitted: sub.created_at }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `${name.replace(/\s+/g, '_')}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  async function handleDeleteSubmission(id: string) {
    setQuickAction(p => ({ ...p, [id]: 'loading-delete' }))
    await markSubmissionActioned(id, 'ignored')
    setQuickAction(p => { const n = { ...p }; delete n[id]; return n })
    router.refresh()
  }

  // ── Misc ──────────────────────────────────────────────────────────────────
  const activeForm   = filters.form   ?? ''
  const activeStatus = filters.status ?? ''

  const exportCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Company', 'City', 'Form', 'Priority', 'Status', 'Submitted', 'Assigned to']
    const rows = submissions.map(sub => {
      const name     = sub.ai_entities?.name  ?? sub.fields.name  ?? 'Anonymous'
      const email    = sub.ai_entities?.email ?? sub.fields.email ?? ''
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

      {/* ── Email integrations banner ── */}
      <div className="rounded-xl border border-gray-200 dark:border-white/8 bg-white dark:bg-white/[0.03] overflow-hidden">
        {connectedEmailProviders.length > 0 && (
          <div className="border-b border-gray-100 dark:border-white/6">
            <div className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium shrink-0">Syncing to:</span>
              {connectedEmailProviders.map(provider => {
                const meta = EMAIL_PLATFORM_META[provider]
                if (!meta) return null
                return (
                  <div key={provider} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                    <img src={meta.logo} alt={meta.name} className="w-3.5 h-3.5 object-contain" />
                    <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">{meta.name}</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-500">✓ Connected</span>
                  </div>
                )
              })}
              <div className="ml-auto flex items-center gap-2 shrink-0">
                <Link href="/sage/integrations" className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">Manage →</Link>
                <button
                  onClick={() => setBannerCollapsed(v => !v)}
                  className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors"
                >
                  {bannerCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {!bannerCollapsed && connectedEmailProviders.includes('mailchimp') && (
              <div className="flex items-center gap-3 px-4 py-2.5 border-t border-gray-100 dark:border-white/6 bg-gray-50/60 dark:bg-white/[0.02] overflow-x-auto">
                <button
                  onClick={handleToggleSync}
                  disabled={syncToggling}
                  className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border transition-colors ${
                    syncEnabled
                      ? 'border-brand-200 dark:border-[#15A4AE]/30 bg-brand-50 dark:bg-[#15A4AE]/10'
                      : 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/5'
                  } ${syncToggling ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-brand-300 dark:hover:border-[#15A4AE]/40'}`}
                >
                  <span className={`text-[11px] font-medium ${syncEnabled ? 'text-brand-600 dark:text-[#15A4AE]' : 'text-gray-400 dark:text-gray-500'}`}>
                    Mailchimp Auto Sync
                  </span>
                  <span className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${syncEnabled ? 'bg-brand-600' : 'bg-gray-200 dark:bg-white/15'}`}>
                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${syncEnabled ? 'translate-x-[14px]' : 'translate-x-[2px]'}`} />
                  </span>
                </button>
                <button
                  onClick={handleSyncNow}
                  disabled={syncing}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-[11px] font-medium text-gray-600 dark:text-gray-300 hover:border-brand-300 dark:hover:border-[#15A4AE]/40 hover:text-brand-600 dark:hover:text-[#15A4AE] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {syncing ? 'Syncing…' : 'Sync Now'}
                </button>
                {syncResult && (
                  <span className={`text-[11px] font-medium whitespace-nowrap shrink-0 ${syncResult.error ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    {syncResult.error
                      ? `⚠ ${syncResult.error}`
                      : syncResult.synced === 0 && syncResult.skipped === 0
                        ? '✓ No contacts found in Mailchimp'
                        : `✓ ${syncResult.synced} new · ${syncResult.skipped} duplicate${syncResult.skipped !== 1 ? 's' : ''} skipped`
                    }
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {mailchimpConnected && (
          <div className="flex items-center gap-2.5 px-4 py-2.5 text-sm">
            <img src="/integrations/mailchimp.png" alt="Mailchimp" className="w-4 h-4 object-contain shrink-0" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Mailchimp default list{mailchimpListId ? `: ${mailchimpListId}` : ''}</span>
            {mailchimpLists.length > 1 && forms.length > 0 && (
              <button onClick={() => setMcExpanded(v => !v)} className="ml-auto text-xs font-medium text-[#15A4AE] hover:underline shrink-0">
                {mcExpanded ? 'Hide per-form settings ↑' : 'Set audience per form ↓'}
              </button>
            )}
          </div>
        )}
        {mcExpanded && mailchimpConnected && forms.length > 0 && mailchimpLists.length > 0 && (
          <div className="border-t border-gray-100 dark:border-white/6 px-4 py-3 space-y-2 bg-gray-50 dark:bg-white/[0.02]">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-2">Override Mailchimp audience per form</p>
            {forms.map(form => (
              <div key={form.id} className="flex items-center gap-3">
                <span className="text-xs text-gray-700 dark:text-gray-300 min-w-[140px] truncate">{form.name}</span>
                <select
                  value={form.mailchimp_list_id ?? ''}
                  disabled={mcSaving[form.id]}
                  onChange={async e => {
                    const listId = e.target.value || null
                    setMcSaving(p => ({ ...p, [form.id]: true }))
                    await updateFormMailchimpList(form.id, listId)
                    setMcSaving(p => ({ ...p, [form.id]: false }))
                    router.refresh()
                  }}
                  className="text-xs border dark:border-white/10 rounded-lg px-2 py-1 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/40 disabled:opacity-50"
                >
                  <option value="">— Workspace default —</option>
                  {mailchimpLists.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
                {mcSaving[form.id] && <span className="text-[10px] text-gray-400 animate-pulse">Saving…</span>}
              </div>
            ))}
          </div>
        )}

        {connectedEmailProviders.length === 0 && !mailchimpConnected && (
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="text-xs text-gray-500 dark:text-gray-400">Connect an email platform to auto-sync form submissions</span>
            <button
              onClick={() => openOAuthPopup('/api/oauth/mailchimp', () => router.refresh())}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors shrink-0 whitespace-nowrap"
            >
              <img src="/integrations/mailchimp.png" alt="" className="w-3.5 h-3.5 object-contain" />
              Connect Mailchimp
            </button>
          </div>
        )}
      </div>

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

      {/* ── Table ── */}
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
                  const name     = sub.ai_entities?.name  ?? sub.fields.name  ?? 'Anonymous'
                  const email    = sub.ai_entities?.email ?? sub.fields.email ?? null
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
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{name}</p>
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
                            {EMAIL_PLATFORM_META[sub.source_platform] && (
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

      {submissions.length === 200 && (
        <p className="text-xs text-center text-gray-400 pb-2">
          Showing first 200 results — use filters to narrow down.
        </p>
      )}
    </div>
  )
}
