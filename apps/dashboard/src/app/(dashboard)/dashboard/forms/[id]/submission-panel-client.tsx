'use client'

import React, { useTransition, useState as useLocalState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search, X, ArrowLeft, Download, Trash2, Loader2,
  UserPlus, Ticket, ClipboardList, Send, CheckCircle,
  ChevronUp, ChevronDown,
} from 'lucide-react'
import { EmailComposeModal } from '@/components/dashboard/email-compose-modal'
import { PipelinePickerModal } from '@/components/sage/pipeline-picker-modal'
import { timeAgo, formatDate } from '@/lib/utils'
import {
  updateSubmissionPriority, updateSubmissionAssignedTo,
  updateSubmissionField, formSubmissionCreateTicket, deleteSubmission,
  analyzeFormSubmissions,
} from '@/app/actions/sage-forms'
import type { SageFormSubmission, SageForm } from '@/app/actions/sage-forms'

export type TeamMember = { user_id: string; name: string }

const TRACKING_KEYS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'gclid', 'fbclid', 'ttclid', 'msclkid',
  'page_url', 'source_url', 'referrer', 'landing_page', 'ref',
])
const SYSTEM_KEYS = new Set([
  'form_title', 'form_name', 'id', 'form_id', 'ip', 'date_created',
  'workspace_id', 'entry_id', 'entry_date', 'source_platform',
])

const SOURCE_PLATFORM_LABELS: Record<string, string> = {
  mailchimp:       'Mailchimp',
  activecampaign:  'ActiveCampaign',
  convertkit:      'Kit (ConvertKit)',
  klaviyo:         'Klaviyo',
  constantcontact: 'Constant Contact',
  gravity_forms:   'Gravity Forms',
  google_forms:    'Google Forms',
  typeform:        'Typeform',
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  'bg-purple-500', 'bg-blue-500', 'bg-[#15A4AE]', 'bg-yellow-500',
  'bg-red-500', 'bg-pink-500', 'bg-indigo-500', 'bg-orange-500',
]
function getAvatarColor(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}
function getInitials(name: string | null | undefined) {
  if (!name) return '?'
  return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

const PRIORITY_CLS: Record<string, string> = {
  high:   'bg-[#15A4AE]/10 text-[#1f6157] dark:text-[#15A4AE] border border-[#15A4AE]/30',
  medium: 'bg-amber-50 text-amber-700 dark:text-amber-400 border border-amber-200/70',
  low:    'bg-gray-100 text-gray-500 border border-gray-200 dark:border-white/10',
}

// ── Inline editable field ─────────────────────────────────────────────────────
function InlineEditField({ value, onSave, placeholder, multiline }: {
  value: string
  onSave: (val: string) => Promise<void>
  placeholder?: string
  multiline?: boolean
}) {
  const [editing, setEditing] = useLocalState(false)
  const [draft,   setDraft]   = useLocalState(value)
  const [saving,  setSaving]  = useLocalState(false)
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null)

  // Keep draft in sync with incoming value (e.g. after router.refresh())
  useEffect(() => { if (!editing) setDraft(value) }, [value, editing])
  useEffect(() => { if (editing) ref.current?.focus() }, [editing])

  async function commit() {
    if (draft.trim() === value) { setEditing(false); return }
    setSaving(true)
    await onSave(draft.trim())
    setSaving(false)
    setEditing(false)
  }

  if (editing) {
    const shared = {
      ref,
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
      onBlur: commit,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (!multiline && e.key === 'Enter') { e.preventDefault(); commit() }
        if (e.key === 'Escape') { setEditing(false) }
      },
      className: 'w-full text-sm text-gray-800 dark:text-gray-100 bg-white dark:bg-white/5 border border-[#15A4AE]/50 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/40',
      placeholder,
    }
    return (
      <div className="flex items-start gap-1.5 flex-1">
        {multiline
          ? <textarea {...shared as React.TextareaHTMLAttributes<HTMLTextAreaElement>} rows={3} style={{ resize: 'none' }} className={shared.className + ' leading-snug'} />
          : <input {...shared as React.InputHTMLAttributes<HTMLInputElement>} />
        }
        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#15A4AE] shrink-0 mt-1" />}
      </div>
    )
  }

  return (
    <span
      onClick={() => { setDraft(value); setEditing(true) }}
      title="Click to edit"
      className="text-sm text-gray-800 dark:text-gray-100 cursor-text break-all hover:text-[#15A4AE] transition-colors"
    >
      {value || <span className="italic text-gray-300 dark:text-gray-600">{placeholder ?? '—'}</span>}
    </span>
  )
}

// ── Props ──────────────────────────────────────────────────────────────────────
interface Props {
  submissions:    SageFormSubmission[]
  current:        SageFormSubmission
  forms:          SageForm[]
  teamMembers?:   TeamMember[]
  canAssign?:     boolean
  dealOwnerName?: string | null
  prevId?:        string | null
  nextId?:        string | null
}

export function SubmissionPanelClient({
  submissions, current, forms,
  teamMembers = [], canAssign = false,
  dealOwnerName,
  prevId = null, nextId = null,
}: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [search,        setSearch]        = React.useState('')
  const [localPriority, setLocalPriority] = React.useState(current.ai_priority ?? '')
  const [localAssign,   setLocalAssign]   = React.useState(current.assigned_to ?? '')
  const [saving,        setSaving]        = React.useState<'priority' | 'assign' | null>(null)
  const [actionLoading, setActionLoading] = React.useState<'ticket' | 'analyse' | null>(null)
  const [analyseMsg,    setAnalyseMsg]    = React.useState<string | null>(null)
  const [showEmailModal,  setShowEmailModal]  = React.useState(false)
  const [showDealPicker,  setShowDealPicker]  = React.useState(false)
  const [notification,    setNotification]    = React.useState<string | null>(null)
  const [showTracking,    setShowTracking]    = React.useState(false)
  const [showRawPayload,  setShowRawPayload]  = React.useState(false)

  function showNotification(msg: string) {
    setNotification(msg)
    setTimeout(() => setNotification(null), msg.toLowerCase().includes('exist') ? 10000 : 5000)
  }

  const currentForm = forms.find(f => f.id === current.form_id) ?? null
  const META_KEYS_PANEL = new Set(['form_title', 'form_name', 'id', 'form_id', 'ip', 'date_created', 'source_url'])
  function fVals(): string[] {
    return Object.entries(current.fields).filter(([k]) => !META_KEYS_PANEL.has(k)).map(([, v]) => v?.trim() ?? '').filter(Boolean)
  }

  // Case-insensitive field lookup — handles "Name", "Full Name", "name", "full_name", numeric IDs etc.
  function getField(...keys: string[]): string {
    const norm: Record<string, string> = {}
    for (const [k, v] of Object.entries(current.fields)) {
      norm[k.toLowerCase().replace(/[\s\-\.]+/g, '_')] = v
    }
    for (const key of keys) {
      if (current.fields[key]) return current.fields[key]
      const nk = key.toLowerCase().replace(/[\s\-\.]+/g, '_')
      if (norm[nk]) return norm[nk]
    }
    return ''
  }

  const detectedEmail = fVals().find(v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) ?? ''
  const detectedPhone = fVals().find(v => /^[\+\d][\d\s\-\(\)\.]{5,18}$/.test(v)) ?? ''

  function detectPersonName(skip: Set<string>): string {
    return fVals().find(v => {
      if (skip.has(v)) return false
      if (v.length < 3 || v.length > 60 || /[@\/\d]/.test(v)) return false
      const words = v.split(/\s+/)
      return words.length >= 2 && words.length <= 5 && words.every(w => /^[A-Za-zÀ-ÿ\-'\.]{2,}$/.test(w))
    }) ?? ''
  }
  function detectCompanyVal(skip: Set<string>): string {
    return fVals().find(v => {
      if (skip.has(v)) return false
      if (v.length < 2 || v.length > 80 || /[@]/.test(v)) return false
      return !v.includes('  ') && v.split(/\s+/).length <= 6
    }) ?? ''
  }

  const _nameByKey = getField('name', 'full_name', 'your_name', 'contact_name', 'first_name')
  const _nameSkip  = new Set([detectedEmail, detectedPhone].filter(Boolean))
  const contactName    = (current.ai_entities?.name  ?? (_nameByKey || detectPersonName(_nameSkip))) || 'Anonymous'
  const contactEmail   = (current.ai_entities?.email ?? (getField('email', 'email_address', 'your_email') || detectedEmail)) || null
  const contactPhone   = (current.ai_entities?.phone ?? (getField('phone', 'phone_number', 'mobile', 'telephone', 'tel') || detectedPhone)) || null
  const _companyByKey  = getField('company', 'company_name', 'organisation', 'organization', 'business')
  const _companySkip   = new Set([detectedEmail, detectedPhone, contactName === 'Anonymous' ? '' : contactName].filter(Boolean))
  const contactCompany = _companyByKey || detectCompanyVal(_companySkip)
  const contactCity    = getField('city', 'location', 'town', 'suburb')

  async function handlePriorityChange(val: string) {
    setLocalPriority(val)
    setSaving('priority')
    await updateSubmissionPriority(current.id, val as 'high' | 'medium' | 'low' | null)
    setSaving(null)
    router.refresh()
  }

  async function handleAssign(val: string) {
    setLocalAssign(val)
    setSaving('assign')
    await updateSubmissionAssignedTo(current.id, val || null)
    setSaving(null)
    router.refresh()
  }

  function handleDownload() {
    const data = JSON.stringify({ ...current.fields, ...current.ai_entities, submitted: current.created_at }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `${contactName.replace(/\s+/g, '_')}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  function handleDelete() {
    if (!window.confirm('Delete this submission? This cannot be undone.')) return
    startTransition(async () => {
      const res = await deleteSubmission(current.id)
      if (res.error) { alert(res.error); return }
      router.push('/dashboard/forms')
    })
  }

  async function handleCreateTicket() {
    setActionLoading('ticket')
    const res = await formSubmissionCreateTicket(current)
    setActionLoading(null)
    if (res?.error) {
      showNotification(`Error: ${res.error}`)
    } else {
      showNotification('Ticket created')
      router.refresh()
    }
  }

  async function handleAnalyse() {
    setActionLoading('analyse')
    setAnalyseMsg(null)
    const res = await analyzeFormSubmissions(current.form_id ?? undefined)
    setActionLoading(null)
    setAnalyseMsg(res.error ? `Error: ${res.error}` : `Analysed ${res.analyzed} submission${res.analyzed !== 1 ? 's' : ''}`)
    router.refresh()
  }

  const filtered = submissions.filter(s => {
    if (!search) return true
    const q = search.toLowerCase()
    const norm = Object.fromEntries(Object.entries(s.fields).map(([k, v]) => [k.toLowerCase().replace(/[\s\-]+/g, '_'), v]))
    const n = (s.ai_entities?.name  ?? norm['name']  ?? '').toLowerCase()
    const e = (s.ai_entities?.email ?? norm['email'] ?? '').toLowerCase()
    return n.includes(q) || e.includes(q)
  })

  return (
    <div className="flex h-full w-full gap-3 p-3 bg-[#f5f4f1] dark:bg-[#1c1c1c]">

      {/* ── Left panel ─────────────────────────────────────────────────────── */}
      <div className="w-[240px] shrink-0 flex flex-col bg-white dark:bg-[#181818] rounded-2xl shadow-xl border border-gray-200/60 dark:border-white/8 overflow-hidden">
        <div className="px-3 py-2.5 bg-[#141c2b] border-b border-white/10 shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Submissions</h2>
            <Link href="/dashboard/forms" className="text-sm text-white hover:opacity-70 transition-opacity">← Back</Link>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full pl-8 pr-7 py-1.5 text-sm border border-white/20 rounded-lg !bg-[#f5f4f1] !text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <ClipboardList className="w-7 h-7 text-gray-200 dark:text-gray-600 mb-2" />
              <p className="text-xs text-gray-400">No submissions found</p>
            </div>
          ) : filtered.map(s => {
            const sNorm   = Object.fromEntries(Object.entries(s.fields).map(([k, v]) => [k.toLowerCase().replace(/[\s\-]+/g, '_'), v]))
            const name    = s.ai_entities?.name  ?? sNorm['name']  ?? 'Anonymous'
            const email   = s.ai_entities?.email ?? sNorm['email'] ?? null
            const isActive = s.id === current.id
            const form    = forms.find(f => f.id === s.form_id)
            return (
              <Link
                key={s.id}
                href={`/dashboard/forms/${s.id}`}
                className={`flex items-start gap-3 px-3 py-3 border-b dark:border-white/5 transition-colors ${
                  isActive ? 'bg-[#15A4AE]/10 dark:bg-[#15A4AE]/15' : 'hover:bg-white dark:hover:bg-white/5'
                }`}
              >
                <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white ${getAvatarColor(s.id)}`}>
                  {getInitials(name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-sm font-semibold truncate ${isActive ? 'text-[#1f6157] dark:text-[#15A4AE]' : 'text-gray-900 dark:text-gray-100'}`}>
                      {name}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0">{timeAgo(s.created_at)}</span>
                  </div>
                  {email && <p className="text-xs text-gray-400 truncate mt-0.5">{email}</p>}
                  {form  && <p className="text-[10px] text-gray-400 truncate mt-0.5">{form.name}</p>}
                  <div className="flex items-center gap-1.5 mt-1">
                    {s.ai_priority === 'high'   && <span className="text-[10px] font-semibold text-[#15A4AE]">High</span>}
                    {s.ai_priority === 'medium' && <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">Medium</span>}
                    {s.ai_priority === 'low'    && <span className="text-[10px] font-semibold text-gray-400">Low</span>}
                    {s.action_type === 'lead'   && <span className="text-[10px] text-blue-500">Deal ✓</span>}
                    {s.action_type === 'ticket' && <span className="text-[10px] text-yellow-600">Ticket ✓</span>}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        <div className="p-2 border-t dark:border-white/8 text-[10px] text-gray-400 text-center">
          {submissions.length} total
        </div>
      </div>

      {/* ── Center panel: form fields ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#232323] rounded-2xl shadow-xl border border-gray-200/60 dark:border-white/8">

        {/* Header */}
        <div className="shrink-0 bg-[#141c2b] border-b border-white/10 px-4 py-2.5">
          <div className="flex items-center gap-3">
            {/* Left: avatar + name */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold text-white ${getAvatarColor(current.id)}`}>
                {getInitials(contactName)}
              </div>
              <div className="min-w-0">
                <span className="text-sm font-semibold text-white truncate block leading-tight">{contactName}</span>
                {currentForm && <p className="text-sm text-white leading-tight">via {currentForm.name}</p>}
              </div>
            </div>

            {/* Right: all controls */}
            <div className="flex items-center gap-1 shrink-0">
              <select
                value={localPriority}
                onChange={e => handlePriorityChange(e.target.value)}
                disabled={saving === 'priority'}
                className="dark-bar-select text-sm border border-white/20 rounded-full px-2.5 py-0.5 focus:outline-none disabled:opacity-60 cursor-pointer"
              >
                <option value="">Priority</option>
                <option value="low">⚪ Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🟢 High</option>
              </select>
              {saving === 'priority' && <Loader2 className="w-3 h-3 animate-spin text-[#15A4AE] shrink-0" />}

              {canAssign && teamMembers.length > 0 && (
                <>
                  <select
                    value={localAssign}
                    disabled={saving === 'assign'}
                    onChange={e => handleAssign(e.target.value)}
                    className="dark-bar-select text-sm border border-white/20 rounded-full px-2.5 py-0.5 focus:outline-none disabled:opacity-60 cursor-pointer"
                  >
                    <option value="">Assign to…</option>
                    {teamMembers.map(m => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
                  </select>
                  {saving === 'assign' && <Loader2 className="w-3 h-3 animate-spin text-[#15A4AE] shrink-0" />}
                </>
              )}

              <button onClick={handleAnalyse} disabled={actionLoading === 'analyse'}
                className="flex items-center gap-1 px-2.5 py-1.5 text-sm font-medium text-white hover:bg-white/10 rounded-lg border border-white/20 transition-colors disabled:opacity-60">
                {actionLoading === 'analyse' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>✦</span>}
                AI Analyse
              </button>
              <button onClick={handleCreateTicket} disabled={actionLoading === 'ticket'}
                className="flex items-center gap-1 px-2.5 py-1.5 text-sm font-medium text-white hover:bg-white/10 rounded-lg border border-white/20 transition-colors disabled:opacity-60">
                {actionLoading === 'ticket' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ticket className="w-3.5 h-3.5" />}
                Add Ticket
              </button>
              <button onClick={() => setShowDealPicker(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-sm font-medium text-white hover:bg-white/10 rounded-lg border border-white/20 transition-colors">
                <UserPlus className="w-3.5 h-3.5" />
                Add a Deal
              </button>
              <button onClick={handleDownload} title="Download"
                className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <Download className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleDelete} title="Delete"
                className="p-1.5 text-white/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center border border-white/20 rounded-lg overflow-hidden">
                <button onClick={() => prevId && router.push(`/dashboard/forms/${prevId}`)} disabled={!prevId} title="Previous" className="p-1.5 text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border-r border-white/20">
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => nextId && router.push(`/dashboard/forms/${nextId}`)} disabled={!nextId} title="Next" className="p-1.5 text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
          {analyseMsg && <p className="mt-1.5 text-xs text-purple-600 dark:text-purple-400">{analyseMsg}</p>}
        </div>

        {/* Submission Answers */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Section 1 — Primary Contact */}
          <div>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Primary Contact</h2>
            <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border border-gray-100 dark:border-white/8 overflow-hidden">
              {[
                { label: 'Name',    value: contactName !== 'Anonymous' ? contactName : '', fieldKey: 'name'    },
                { label: 'Email',   value: contactEmail   ?? '',                            fieldKey: 'email'   },
                { label: 'Phone',   value: contactPhone   ?? '',                            fieldKey: 'phone'   },
                { label: 'Company', value: contactCompany,                                  fieldKey: 'company' },
                { label: 'City',    value: contactCity,                                     fieldKey: 'city'    },
              ].map((r, i, arr) => (
                <div key={r.label} className={`flex items-baseline gap-4 px-4 py-2.5 ${i < arr.length - 1 ? 'border-b border-gray-50 dark:border-white/5' : ''}`}>
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide w-20 shrink-0">{r.label}</span>
                  <InlineEditField
                    value={r.value}
                    placeholder={`Add ${r.label.toLowerCase()}…`}
                    onSave={async (val) => {
                      await updateSubmissionField(current.id, r.fieldKey, val)
                      router.refresh()
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Section 2 — Submission Answers */}
          <div>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Submission Answers</h2>
            {(() => {
              const src = Object.keys(current.raw_payload ?? {}).length > 0 ? current.raw_payload : current.fields
              const rows = Object.entries(src).filter(([k]) => !TRACKING_KEYS.has(k) && !SYSTEM_KEYS.has(k))
              if (rows.length === 0) return <p className="text-sm text-gray-400">No data collected.</p>
              return (
                <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border border-gray-100 dark:border-white/8 overflow-hidden">
                  {rows.map(([k, v], i) => {
                    const label = /^\d+(\.\d+)?$/.test(k) ? `Field ${k}` : k.replace(/[_\-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                    const isLong = String(v).length > 80
                    return (
                      <div key={k} className={`px-4 py-2.5 ${i > 0 ? 'border-t border-gray-50 dark:border-white/5' : ''} ${isLong ? 'flex flex-col gap-1' : 'flex items-baseline gap-4'}`}>
                        <span className={`text-[11px] font-semibold text-gray-400 uppercase tracking-wide shrink-0 ${isLong ? '' : 'w-28'}`}>{label}</span>
                        <InlineEditField
                          value={String(v ?? '')}
                          multiline={isLong}
                          placeholder="—"
                          onSave={async (val) => {
                            await updateSubmissionField(current.id, k, val)
                            router.refresh()
                          }}
                        />
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>

        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────────────────────── */}
      <div className="w-[320px] shrink-0 overflow-y-auto bg-white dark:bg-[#232323] rounded-2xl shadow-xl border border-gray-200/60 dark:border-white/8">
        <div className="p-4 space-y-5">

          {/* Status pills */}
          <div className="flex flex-wrap gap-1.5 items-center">
            {current.source_platform && (
              <span className="inline-flex items-center text-xs px-2.5 py-1 rounded-full font-medium bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                {SOURCE_PLATFORM_LABELS[current.source_platform] ?? current.source_platform}
              </span>
            )}
            {localPriority && (
              <span className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full font-medium ${PRIORITY_CLS[localPriority] ?? ''}`}>
                {localPriority.charAt(0).toUpperCase() + localPriority.slice(1)}
              </span>
            )}
            {current.action_type ? (
              <span className="inline-flex items-center text-xs px-2.5 py-1 rounded-full font-medium bg-gray-100 text-gray-500 border border-gray-200 dark:border-white/10">
                {current.action_type === 'lead' ? 'Deal created' : current.action_type === 'ticket' ? 'Ticket created' : current.action_type === 'ignored' ? 'Ignored' : current.action_type}
              </span>
            ) : (
              <span className="inline-flex items-center text-xs px-2.5 py-1 rounded-full font-medium bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400 border border-green-200 dark:border-green-500/20">New</span>
            )}
          </div>

          {notification && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
              notification.toLowerCase().includes('exist')
                ? 'bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 text-orange-600 dark:text-orange-400'
                : 'bg-[#15A4AE]/10 border border-[#15A4AE]/20 text-[#15A4AE]'
            }`}>
              <CheckCircle className="w-3.5 h-3.5 shrink-0" />
              {notification}
            </div>
          )}

          {current.ai_summary && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="text-[#15A4AE]">✦</span> AI Generated
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{current.ai_summary}</p>
            </div>
          )}

          {/* Reply by Email */}
          {contactEmail && (
            <button
              onClick={() => setShowEmailModal(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border border-[#15A4AE]/40 text-[#15A4AE] hover:bg-[#15A4AE]/8 transition-colors"
            >
              <Send className="w-3.5 h-3.5" /> Reply by Email
            </button>
          )}

          {current.ai_insights && current.ai_insights.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">AI Insights</p>
              <ul className="space-y-1.5">
                {current.ai_insights.map((insight, i) => (
                  <li key={i} className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-2">
                    <span className="text-[#15A4AE] shrink-0 mt-0.5">•</span>{insight}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <hr className="border-gray-100 dark:border-white/8" />

          {/* Section 3 — Metadata */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Metadata</p>
            <div className="space-y-2.5">
              {currentForm && <DetailRow label="Form"      value={currentForm.name} />}
              <DetailRow label="Submitted"  value={formatDate(current.created_at)} />
              {current.source_platform && <DetailRow label="Source" value={SOURCE_PLATFORM_LABELS[current.source_platform] ?? current.source_platform} />}
              {current.action_type && (
                <DetailRow label="Status" value={
                  current.action_type === 'lead' ? 'Deal created' :
                  current.action_type === 'ticket' ? 'Ticket created' :
                  current.action_type === 'ignored' ? 'Ignored' : current.action_type
                } />
              )}
              {dealOwnerName && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-400 shrink-0">Assigned to</span>
                  <span className="flex items-center gap-1.5 text-xs font-medium text-[#15A4AE]">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${getAvatarColor(dealOwnerName)}`}>
                      {getInitials(dealOwnerName)}
                    </span>
                    {dealOwnerName}
                  </span>
                </div>
              )}
              {current.ai_entities?.product_interest && (
                <DetailRow label="Interest" value={current.ai_entities.product_interest} />
              )}
              <DetailRow label="ID" value={`#${current.id.slice(0, 6).toUpperCase()}`} />
            </div>
          </div>

          {/* Section 4 — Tracking (collapsible) */}
          {(() => {
            const src = Object.keys(current.raw_payload ?? {}).length > 0 ? current.raw_payload : current.fields
            const trackingRows = Object.entries(src).filter(([k]) => TRACKING_KEYS.has(k) && src[k])
            if (trackingRows.length === 0) return null
            return (
              <>
                <hr className="border-gray-100 dark:border-white/8" />
                <div>
                  <button
                    onClick={() => setShowTracking(v => !v)}
                    className="flex items-center gap-1.5 w-full text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 hover:text-gray-600 transition-colors"
                  >
                    <span>{showTracking ? '▾' : '▸'}</span> Tracking
                  </button>
                  {showTracking && (
                    <div className="space-y-2 mt-2">
                      {trackingRows.map(([k, v]) => (
                        <DetailRow key={k} label={k.replace(/_/g, ' ')} value={String(v)} />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )
          })()}

          {/* Section 5 — Raw Payload (collapsible, debug) */}
          {Object.keys(current.raw_payload ?? {}).length > 0 && (
            <>
              <hr className="border-gray-100 dark:border-white/8" />
              <div>
                <button
                  onClick={() => setShowRawPayload(v => !v)}
                  className="flex items-center gap-1.5 w-full text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 hover:text-gray-600 transition-colors"
                >
                  <span>{showRawPayload ? '▾' : '▸'}</span> Raw Payload
                </button>
                {showRawPayload && (
                  <pre className="mt-2 text-[10px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-white/5 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                    {JSON.stringify(current.raw_payload, null, 2)}
                  </pre>
                )}
              </div>
            </>
          )}

        </div>
      </div>

      {showEmailModal && contactEmail && (
        <EmailComposeModal
          to={contactEmail}
          toName={contactName ?? undefined}
          subject={`Re: ${currentForm?.name ?? 'Your enquiry'}`}
          context={current.ai_summary ?? undefined}
          onClose={() => setShowEmailModal(false)}
        />
      )}

      {showDealPicker && (
        <PipelinePickerModal
          prefill={{
            title:        `${contactName} — ${currentForm?.name ?? 'Form submission'}`,
            contactName:  contactName ?? '',
            contactEmail: contactEmail ?? '',
            contactPhone: contactPhone ?? undefined,
            notes:        current.ai_summary ?? undefined,
            source:       'form',
            submissionId: current.id,
          }}
          onSuccess={(msg) => { showNotification(msg); router.refresh() }}
          onClose={() => setShowDealPicker(false)}
        />
      )}
    </div>
  )
}


function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-sm text-gray-400 dark:text-gray-500 shrink-0">{label}</span>
      {typeof value === 'string'
        ? <span className="text-sm text-gray-700 dark:text-gray-300 text-right break-all">{value}</span>
        : value}
    </div>
  )
}
