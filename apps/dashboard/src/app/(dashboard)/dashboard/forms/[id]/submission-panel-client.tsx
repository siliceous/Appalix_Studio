'use client'

import React, { useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search, X, ArrowLeft, Download, Pencil, Trash2, Loader2,
  UserPlus, Ticket, ClipboardList,
} from 'lucide-react'
import { timeAgo, formatDate } from '@/lib/utils'
import {
  updateSubmissionPriority, updateSubmissionAssignedTo,
  updateSubmissionName, markSubmissionActioned,
  formSubmissionCreateLead, formSubmissionCreateTicket,
  analyzeFormSubmissions,
} from '@/app/actions/sage-forms'
import type { SageFormSubmission, SageForm } from '@/app/actions/sage-forms'

export type TeamMember = { user_id: string; name: string }

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

// ── Props ──────────────────────────────────────────────────────────────────────
interface Props {
  submissions:  SageFormSubmission[]
  current:      SageFormSubmission
  forms:        SageForm[]
  teamMembers?: TeamMember[]
  canAssign?:   boolean
}

export function SubmissionPanelClient({
  submissions, current, forms,
  teamMembers = [], canAssign = false,
}: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [search,        setSearch]        = React.useState('')
  const [localPriority, setLocalPriority] = React.useState(current.ai_priority ?? '')
  const [localAssign,   setLocalAssign]   = React.useState(current.assigned_to ?? '')
  const [saving,        setSaving]        = React.useState<'priority' | 'assign' | null>(null)
  const [actionLoading, setActionLoading] = React.useState<'deal' | 'ticket' | 'analyse' | null>(null)
  const [analyseMsg,    setAnalyseMsg]    = React.useState<string | null>(null)

  const currentForm = forms.find(f => f.id === current.form_id) ?? null
  const contactName  = current.ai_entities?.name  ?? current.fields.name  ?? 'Anonymous'
  const contactEmail = current.ai_entities?.email ?? current.fields.email ?? null
  const contactPhone = current.ai_entities?.phone ?? current.fields.phone ?? current.fields.phone_number ?? null

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

  function handleRename() {
    const newName = window.prompt('Rename contact:', contactName)
    if (newName === null || newName === contactName) return
    startTransition(async () => {
      await updateSubmissionName(current.id, newName.trim())
      router.refresh()
    })
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
      await markSubmissionActioned(current.id, 'ignored')
      router.push('/dashboard/forms')
    })
  }

  async function handleCreateDeal() {
    setActionLoading('deal')
    await formSubmissionCreateLead(current)
    setActionLoading(null)
    router.refresh()
  }

  async function handleCreateTicket() {
    setActionLoading('ticket')
    await formSubmissionCreateTicket(current)
    setActionLoading(null)
    router.refresh()
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
    const n = (s.ai_entities?.name ?? s.fields.name ?? '').toLowerCase()
    const e = (s.ai_entities?.email ?? s.fields.email ?? '').toLowerCase()
    return n.includes(q) || e.includes(q)
  })

  return (
    <div className="flex h-full overflow-hidden w-full">

      {/* ── Left panel ─────────────────────────────────────────────────────── */}
      <div className="w-[240px] shrink-0 border-r dark:border-white/8 flex flex-col bg-gray-50 dark:bg-[#181818]">
        <div className="p-3 border-b dark:border-white/8 space-y-2">
          <Link href="/dashboard/forms" className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#15A4AE] transition-colors">
            ← All submissions
          </Link>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full pl-8 pr-7 py-1.5 text-xs border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40"
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
            const name    = s.ai_entities?.name ?? s.fields.name ?? 'Anonymous'
            const email   = s.ai_entities?.email ?? s.fields.email ?? null
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
      <div className="flex-1 flex flex-col overflow-hidden bg-[#f5f4f1] dark:bg-[#1c1c1c]">

        {/* Header */}
        <div className="shrink-0 bg-white dark:bg-[#232323] border-b dark:border-white/8 px-4 py-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <div className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${getAvatarColor(current.id)}`}>
              {getInitials(contactName)}
            </div>
            <div className="min-w-0 mr-2">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate block leading-tight">{contactName}</span>
              {currentForm && <p className="text-[10px] text-gray-400 leading-tight">via {currentForm.name}</p>}
            </div>

            <select
              value={localPriority}
              onChange={e => handlePriorityChange(e.target.value)}
              disabled={saving === 'priority'}
              className="text-[11px] border dark:border-white/10 rounded-full px-2.5 py-0.5 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 disabled:opacity-60 cursor-pointer"
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
                  className="text-[11px] border dark:border-white/10 rounded-full px-2.5 py-0.5 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 disabled:opacity-60 cursor-pointer"
                >
                  <option value="">Assign to…</option>
                  {teamMembers.map(m => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
                </select>
                {saving === 'assign' && <Loader2 className="w-3 h-3 animate-spin text-[#15A4AE] shrink-0" />}
              </>
            )}

            <div className="flex-1" />

            {/* Action tab buttons */}
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={handleAnalyse} disabled={actionLoading === 'analyse'}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-lg border border-purple-200 dark:border-purple-500/20 transition-colors disabled:opacity-60">
                {actionLoading === 'analyse' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span className="text-[#15A4AE]">✦</span>}
                AI Analyse
              </button>
              <button onClick={handleCreateTicket} disabled={actionLoading === 'ticket'}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-500/10 rounded-lg border border-yellow-200 dark:border-yellow-500/20 transition-colors disabled:opacity-60">
                {actionLoading === 'ticket' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ticket className="w-3.5 h-3.5" />}
                Add Ticket
              </button>
              <button onClick={handleCreateDeal} disabled={actionLoading === 'deal'}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg border border-blue-200 dark:border-blue-500/20 transition-colors disabled:opacity-60">
                {actionLoading === 'deal' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                Add a Deal
              </button>
            </div>

            {/* Icon actions */}
            <div className="flex items-center gap-1 shrink-0 border-l dark:border-white/8 pl-2 ml-1">
              <Link href="/dashboard/forms"
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg border border-gray-200 dark:border-white/10 transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </Link>
              <button onClick={handleDownload} title="Download"
                className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors">
                <Download className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleRename} title="Rename"
                className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleDelete} title="Delete"
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          {analyseMsg && <p className="mt-1.5 text-xs text-purple-600 dark:text-purple-400">{analyseMsg}</p>}
        </div>

        {/* Form fields */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Form Fields</h2>
          {Object.keys(current.fields).length === 0 ? (
            <p className="text-sm text-gray-400">No fields collected.</p>
          ) : (
            <FieldGroups fields={current.fields} />
          )}
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────────────────────── */}
      <div className="w-[320px] shrink-0 overflow-y-auto bg-white dark:bg-[#232323] border-l dark:border-white/8">
        <div className="p-4 space-y-5">

          {localPriority && (
            <span className={`inline-block text-xs px-2.5 py-0.5 rounded-full font-semibold ${PRIORITY_CLS[localPriority] ?? ''}`}>
              {localPriority.charAt(0).toUpperCase() + localPriority.slice(1)} priority
            </span>
          )}

          {current.ai_summary && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="text-[#15A4AE]">✦</span> AI Generated
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{current.ai_summary}</p>
            </div>
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

          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Form Details</p>
            <div className="space-y-2.5">
              {currentForm && <DetailRow label="Form"      value={currentForm.name} />}
              <DetailRow label="Submitted"  value={formatDate(current.created_at)} />
              {current.source_platform && <DetailRow label="Source" value={current.source_platform} />}
              {current.action_type && (
                <DetailRow label="Status" value={
                  current.action_type === 'lead' ? 'Deal created' :
                  current.action_type === 'ticket' ? 'Ticket created' :
                  current.action_type === 'ignored' ? 'Ignored' : current.action_type
                } />
              )}
              <DetailRow label="ID" value={`#${current.id.slice(0, 6).toUpperCase()}`} />
            </div>
          </div>

          {(contactName || contactEmail || contactPhone) && (
            <>
              <hr className="border-gray-100 dark:border-white/8" />
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">User Details</p>
                <div className="space-y-2.5">
                  {contactName  && <DetailRow label="Name"  value={contactName} />}
                  {contactEmail && <DetailRow label="Email" value={contactEmail} />}
                  {contactPhone && <DetailRow label="Phone" value={contactPhone} />}
                  {current.fields.company && <DetailRow label="Company" value={current.fields.company} />}
                  {current.fields.city    && <DetailRow label="City"    value={current.fields.city} />}
                  {current.ai_entities?.product_interest && (
                    <DetailRow label="Interest" value={current.ai_entities.product_interest} />
                  )}
                </div>
              </div>
            </>
          )}

        </div>
      </div>

    </div>
  )
}

// ── Smart field grouping ───────────────────────────────────────────────────────
const ADDRESS_KEYS  = ['street', 'city', 'state', 'zip', 'postcode', 'postal_code', 'country']
const NAME_KEYS     = ['first_name', 'last_name', 'firstname', 'lastname']
const FIRST_KEYS    = ['first_name', 'firstname']
const LAST_KEYS     = ['last_name', 'lastname']

function fieldLabel(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function FieldGroups({ fields }: { fields: Record<string, string> }) {
  const keys        = Object.keys(fields)
  const rendered    = new Set<string>()
  const blocks: React.ReactNode[] = []

  // 1. Name — first_name + last_name on one line
  const firstKey = keys.find(k => FIRST_KEYS.includes(k.toLowerCase()))
  const lastKey  = keys.find(k => LAST_KEYS.includes(k.toLowerCase()))
  if (firstKey || lastKey) {
    const combined = [firstKey && fields[firstKey], lastKey && fields[lastKey]].filter(Boolean).join(' ')
    if (combined) {
      blocks.push(
        <FieldCard key="__name__" label="Name" value={combined} />
      )
    }
    if (firstKey) rendered.add(firstKey)
    if (lastKey)  rendered.add(lastKey)
  }

  // 2. Address — group street / city / state / zip / country into one card
  const addrKeys = keys.filter(k => ADDRESS_KEYS.includes(k.toLowerCase()))
  if (addrKeys.length > 0) {
    const parts = addrKeys.map(k => fields[k]).filter(Boolean)
    if (parts.length > 0) {
      blocks.push(
        <div key="__address__" className="bg-white dark:bg-[#2a2a2a] rounded-xl border border-gray-100 dark:border-white/8 px-4 py-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Address</p>
          <div className="space-y-0.5">
            {addrKeys.map(k => fields[k] ? (
              <p key={k} className="text-sm text-gray-800 dark:text-gray-100 leading-snug">{fields[k]}</p>
            ) : null)}
          </div>
        </div>
      )
    }
    addrKeys.forEach(k => rendered.add(k))
  }

  // 3. Remaining — skip already-rendered + full name keys, 2-per-row for short values
  const remaining = keys.filter(k => !rendered.has(k) && !NAME_KEYS.includes(k.toLowerCase()))

  // Split remaining into short (≤40 chars) and long
  const short = remaining.filter(k => (fields[k] ?? '').length <= 40)
  const long  = remaining.filter(k => (fields[k] ?? '').length > 40)

  // Pair short fields side-by-side
  for (let i = 0; i < short.length; i += 2) {
    const a = short[i]
    const b = short[i + 1]
    if (b) {
      blocks.push(
        <div key={`pair-${i}`} className="grid grid-cols-2 gap-3">
          <FieldCard label={fieldLabel(a)} value={fields[a]} />
          <FieldCard label={fieldLabel(b)} value={fields[b]} />
        </div>
      )
    } else {
      blocks.push(<FieldCard key={a} label={fieldLabel(a)} value={fields[a]} />)
    }
  }

  // Long fields each get their own full-width card
  for (const k of long) {
    blocks.push(<FieldCard key={k} label={fieldLabel(k)} value={fields[k]} />)
  }

  return <div className="space-y-3">{blocks}</div>
}

function FieldCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border border-gray-100 dark:border-white/8 px-4 py-3">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed whitespace-pre-wrap break-words">
        {value || <span className="italic text-gray-300">—</span>}
      </p>
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
