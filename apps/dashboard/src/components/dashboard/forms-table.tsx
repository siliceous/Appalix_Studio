'use client'

import React, { useCallback, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ClipboardList, Search, ChevronDown, X,
  UserPlus, Ticket, CheckCircle2, Clock, Download,
} from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import { formSubmissionCreateLead, formSubmissionCreateTicket, markSubmissionActioned } from '@/app/actions/sage-forms'
import type { SageForm, SageFormSubmission } from '@/app/actions/sage-forms'

// ── Constants ─────────────────────────────────────────────────────────────────
const PRIORITY_BADGE: Record<string, string> = {
  high:   'bg-[#15A4AE]/10 dark:bg-[#15A4AE]/15 text-[#1f6157] dark:text-[#15A4AE] border border-[#15A4AE]/30',
  medium: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200/70 dark:border-amber-500/18',
  low:    'bg-gray-100 dark:bg-white/5 text-gray-500 border border-gray-200 dark:border-white/10',
}

const STATUS_BADGE: Record<string, string> = {
  lead:    'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20',
  ticket:  'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20',
  ignored: 'bg-gray-100 dark:bg-white/5 text-gray-400 border border-gray-200 dark:border-white/10',
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
  submissions: SageFormSubmission[]
  forms: SageForm[]
  filters: FormFilters
  readonly?: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildUrl(base: string, filters: FormFilters): string {
  const p = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => { if (v) p.set(k, v) })
  const qs = p.toString()
  return qs ? `${base}?${qs}` : base
}

// ── Main component ────────────────────────────────────────────────────────────
export function FormsTable({ submissions, forms, filters, readonly = false }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [actioning, setActioning] = useState<Record<string, string>>({})

  const pushFilter = useCallback((patch: Partial<FormFilters>) => {
    const next = { ...filters, ...patch }
    Object.keys(next).forEach(k => { if (!next[k as keyof FormFilters]) delete next[k as keyof FormFilters] })
    router.push(buildUrl('/dashboard/forms', next))
  }, [filters, router])

  async function handleCreateLead(sub: SageFormSubmission) {
    setActioning(p => ({ ...p, [sub.id]: 'loading' }))
    const res = await formSubmissionCreateLead(sub)
    if (res.error) {
      setActioning(p => ({ ...p, [sub.id]: 'error' }))
    } else {
      setActioning(p => ({ ...p, [sub.id]: 'lead' }))
      router.refresh()
    }
  }

  async function handleCreateTicket(sub: SageFormSubmission) {
    setActioning(p => ({ ...p, [sub.id]: 'loading' }))
    const res = await formSubmissionCreateTicket(sub)
    if (res.error) {
      setActioning(p => ({ ...p, [sub.id]: 'error' }))
    } else {
      setActioning(p => ({ ...p, [sub.id]: 'ticket' }))
      router.refresh()
    }
  }

  async function handleIgnore(sub: SageFormSubmission) {
    startTransition(async () => {
      await markSubmissionActioned(sub.id, 'ignored')
      router.refresh()
    })
  }

  const activeForm   = filters.form   ?? ''
  const activeStatus = filters.status ?? ''

  const exportCSV = () => {
    const headers = ['Name', 'Email', 'Form', 'Priority', 'Summary', 'Status', 'Submitted']
    const rows = submissions.map(sub => {
      const name   = sub.ai_entities?.name  ?? sub.fields.name  ?? 'Anonymous'
      const email  = sub.ai_entities?.email ?? sub.fields.email ?? ''
      const form   = forms.find(f => f.id === sub.form_id)?.name ?? ''
      const status = sub.action_type === 'lead' ? 'Lead created'
        : sub.action_type === 'ticket' ? 'Ticket created'
        : sub.action_type === 'ignored' ? 'Ignored'
        : 'Pending'
      return [name, email, form, sub.ai_priority ?? '', sub.ai_summary ?? '', status, new Date(sub.created_at).toLocaleString()]
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
    <div className="max-w-6xl mx-auto space-y-5 p-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Form Submissions</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            All submissions across your forms — {submissions.length} shown
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
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

        {/* Row 1: Search + Form dropdown + Status pills */}
        <div className="flex flex-wrap gap-3 items-center">

          {/* Search */}
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
              <button onClick={() => pushFilter({ q: undefined })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Form filter */}
          {forms.length > 1 && (
            <div className="relative">
              <select
                value={activeForm}
                onChange={e => pushFilter({ form: e.target.value || undefined })}
                className="appearance-none pl-3 pr-8 py-2 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 cursor-pointer"
              >
                <option value="">All forms</option>
                {forms.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          )}

          {/* Status pills */}
          <div className="flex items-center gap-1">
            {([
              { value: '',        label: 'All' },
              { value: 'pending', label: 'Pending' },
              { value: 'lead',    label: 'Lead created' },
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
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-white/8 bg-gray-50 dark:bg-white/[0.03]">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Submitter</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Form</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Priority</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Summary</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Submitted</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-white/5">
              {submissions.map(sub => {
                const name  = sub.ai_entities?.name  ?? sub.fields.name  ?? 'Anonymous'
                const email = sub.ai_entities?.email ?? sub.fields.email ?? null
                const form  = forms.find(f => f.id === sub.form_id)
                const actionState = actioning[sub.id]
                const effectiveActionType = actionState === 'lead' ? 'lead'
                  : actionState === 'ticket' ? 'ticket'
                  : sub.action_type

                return (
                  <tr key={sub.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors group">

                    {/* Submitter name + email */}
                    <td className="px-5 py-3.5 max-w-[200px]">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{name}</p>
                      {email && <p className="text-xs text-gray-400 mt-0.5 truncate">{email}</p>}
                    </td>

                    {/* Form name */}
                    <td className="px-4 py-3.5 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {form?.name ?? '—'}
                    </td>

                    {/* Priority */}
                    <td className="px-4 py-3.5">
                      {sub.ai_priority ? (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${PRIORITY_BADGE[sub.ai_priority]}`}>
                          {sub.ai_priority}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 italic">
                          <Clock className="w-3 h-3" />pending
                        </span>
                      )}
                    </td>

                    {/* AI Summary */}
                    <td className="px-4 py-3.5 max-w-[280px]">
                      {sub.ai_summary ? (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={sub.ai_summary}>
                          {sub.ai_summary.length > 90 ? sub.ai_summary.slice(0, 90) + '…' : sub.ai_summary}
                        </p>
                      ) : <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      {effectiveActionType ? (
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[effectiveActionType] ?? STATUS_BADGE.ignored}`}>
                          <CheckCircle2 className="w-3 h-3" />
                          {effectiveActionType === 'lead' ? 'Lead created' : effectiveActionType === 'ticket' ? 'Ticket created' : 'Ignored'}
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400">Pending</span>
                      )}
                    </td>

                    {/* Submitted */}
                    <td className="px-4 py-3.5 text-right text-xs text-gray-400 whitespace-nowrap">
                      {timeAgo(sub.created_at)}
                    </td>

                    {/* Actions — only show for pending and not in readonly mode */}
                    <td className="px-5 py-3.5">
                      {!readonly && !effectiveActionType && actionState !== 'loading' ? (
                        <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleCreateLead(sub)}
                            title="Create lead"
                            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors">
                            <UserPlus className="w-3 h-3" />Lead
                          </button>
                          <button
                            onClick={() => handleCreateTicket(sub)}
                            title="Create ticket"
                            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-500/10 rounded-lg transition-colors">
                            <Ticket className="w-3 h-3" />Ticket
                          </button>
                          <button
                            onClick={() => handleIgnore(sub)}
                            title="Ignore"
                            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : actionState === 'loading' ? (
                        <div className="flex justify-end pr-2">
                          <span className="text-[10px] text-gray-400 animate-pulse">Saving…</span>
                        </div>
                      ) : null}
                    </td>

                  </tr>
                )
              })}
            </tbody>
          </table>
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
