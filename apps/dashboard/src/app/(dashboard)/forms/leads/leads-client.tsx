'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Trash2, ArrowRight, Search, ChevronDown, Inbox, Loader2 } from 'lucide-react'
import { deleteLead, deleteLeads, moveLeadToPipeline, updateLeadScore, updateLeadStatus } from '@/app/actions/leads'
import { exportLeads } from '@/app/actions/csv-export'
import { CsvExportButton } from '@/components/ui/csv-export-button'
import type { Lead, LeadScore, WorkspaceMemberRole } from '@/lib/types'

// ---------------------------------------------------------------------------
// Priority (lead_score)
// ---------------------------------------------------------------------------

const PRIORITY_OPTIONS: { value: string; label: string }[] = [
  { value: '',       label: 'None'   },
  { value: 'high',   label: 'High'   },
  { value: 'medium', label: 'Medium' },
  { value: 'low',    label: 'Low'    },
]

const PRIORITY_STYLES: Record<string, string> = {
  high:   'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  medium: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400',
  low:    'bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400',
}

// ---------------------------------------------------------------------------
// Status (pipeline_stage)
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'new_lead',      label: 'New Lead'    },
  { value: 'contacted',     label: 'Contacted'   },
  { value: 'qualified',     label: 'Qualified'   },
  { value: 'crm_pipeline',  label: 'In Pipeline' },
]

const STATUS_STYLES: Record<string, string> = {
  new_lead:     'bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400',
  contacted:    'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400',
  qualified:    'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400',
  crm_pipeline: 'bg-[#15A4AE]/10 dark:bg-[#15A4AE]/10 text-[#3d9585] dark:text-[#15A4AE]',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface TeamMember {
  user_id: string
  name:    string
  role:    WorkspaceMemberRole
}

interface LeadsClientProps {
  leads:         Lead[]
  canAllocate:   boolean
  teamMembers:   TeamMember[]
  memberNameMap: Record<string, string>
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LeadsClient({ leads: initial, canAllocate, teamMembers, memberNameMap }: LeadsClientProps) {
  const router = useRouter()
  const [leads, setLeads]             = useState<Lead[]>(initial)
  const [search, setSearch]           = useState('')
  const [deleting, setDeleting]       = useState<string | null>(null)
  const [moving, setMoving]           = useState<string | null>(null)
  const [assigning, setAssigning]     = useState<string | null>(null)
  const [updatingPriority, setUpdatingPriority] = useState<string | null>(null)
  const [updatingStatus,   setUpdatingStatus]   = useState<string | null>(null)
  const [bulkSaving,       setBulkSaving]       = useState(false)
  const [, startTransition]           = useTransition()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 60_000)
    return () => clearInterval(interval)
  }, [router])

  function toggleSelect(id: string) {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function handleBulkDelete() {
    if (!window.confirm(`Delete ${selectedIds.size} lead(s)? This cannot be undone.`)) return
    const ids = [...selectedIds]
    startTransition(async () => {
      await deleteLeads(ids)
      setLeads(prev => prev.filter(l => !ids.includes(l.id)))
      setSelectedIds(new Set())
    })
  }

  async function handleBulkPriorityChange(score: string) {
    if (selectedIds.size === 0) return
    setBulkSaving(true)
    const ids = [...selectedIds]
    await Promise.all(ids.map(id => updateLeadScore(id, score || null)))
    setLeads(prev => prev.map(l =>
      ids.includes(l.id) ? { ...l, lead_score: (score || null) as LeadScore | null } : l
    ))
    setBulkSaving(false)
    setSelectedIds(new Set())
  }

  async function handleBulkStatusChange(stage: string) {
    if (!stage || selectedIds.size === 0) return
    setBulkSaving(true)
    const ids = [...selectedIds]
    await Promise.all(ids.map(id => updateLeadStatus(id, stage)))
    setLeads(prev => prev.map(l =>
      ids.includes(l.id) ? { ...l, pipeline_stage: stage } : l
    ))
    setBulkSaving(false)
    setSelectedIds(new Set())
  }

  async function handleBulkAssignChange(assignedTo: string) {
    if (selectedIds.size === 0) return
    setBulkSaving(true)
    const ids = [...selectedIds]
    await Promise.all(ids.map(id =>
      fetch('/api/allocate-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: id, assigned_to: assignedTo || null }),
      })
    ))
    setLeads(prev => prev.map(l =>
      ids.includes(l.id) ? { ...l, assigned_to: assignedTo || null } : l
    ))
    setBulkSaving(false)
    setSelectedIds(new Set())
  }

  const filtered = leads.filter(l => {
    const q = search.toLowerCase()
    return (
      !q ||
      l.name.toLowerCase().includes(q) ||
      (l.email ?? '').toLowerCase().includes(q) ||
      (l.company ?? '').toLowerCase().includes(q) ||
      (l.phone ?? '').toLowerCase().includes(q) ||
      (l.form_name ?? '').toLowerCase().includes(q)
    )
  })

  const allSelected = filtered.length > 0 && filtered.every(l => selectedIds.has(l.id))
  function toggleSelectAll() {
    setSelectedIds(allSelected ? new Set() : new Set(filtered.map(l => l.id)))
  }

  function handleDelete(id: string) {
    setDeleting(id)
    startTransition(async () => {
      await deleteLead(id)
      setLeads(prev => prev.filter(l => l.id !== id))
      setDeleting(null)
    })
  }

  function handleMoveToPipeline(id: string) {
    setMoving(id)
    startTransition(async () => {
      await moveLeadToPipeline(id)
      setLeads(prev => prev.map(l => l.id === id ? { ...l, pipeline_stage: 'crm_pipeline' } : l))
      setMoving(null)
    })
  }

  async function handleAssign(leadId: string, assignedTo: string | null) {
    setAssigning(leadId)
    try {
      const res = await fetch('/api/allocate-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId, assigned_to: assignedTo }),
      })
      if (res.ok) {
        setLeads(prev => prev.map(l =>
          l.id === leadId
            ? { ...l, assigned_to: assignedTo, allocated_at: new Date().toISOString() }
            : l
        ))
      }
    } finally {
      setAssigning(null)
    }
  }

  function handlePriorityChange(leadId: string, score: string) {
    setUpdatingPriority(leadId)
    startTransition(async () => {
      await updateLeadScore(leadId, score || null)
      setLeads(prev => prev.map(l =>
        l.id === leadId ? { ...l, lead_score: (score || null) as LeadScore | null } : l
      ))
      setUpdatingPriority(null)
    })
  }

  function handleStatusChange(leadId: string, stage: string) {
    setUpdatingStatus(leadId)
    startTransition(async () => {
      await updateLeadStatus(leadId, stage)
      setLeads(prev => prev.map(l =>
        l.id === leadId ? { ...l, pipeline_stage: stage } : l
      ))
      setUpdatingStatus(null)
    })
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function getCity(lead: Lead): string {
    if (!lead.raw_payload) return '—'
    const p = lead.raw_payload as Record<string, unknown>
    return (p.city as string) || (p.address as Record<string, string> | undefined)?.city || '—'
  }

  // Empty state
  if (leads.length === 0) {
    return (
      <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 flex flex-col items-center justify-center py-16 text-center">
        <Inbox className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No leads yet</p>
        <p className="text-xs text-gray-400 mb-5">Connect Meta, Google Ads or a form to start receiving leads.</p>
        <Link
          href="/forms/sources"
          className="px-4 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 transition-colors"
        >
          Connect a Platform
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search leads…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-[#232323] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#15A4AE]"
          />
        </div>

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {selectedIds.size > 0 && (
            <>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete {selectedIds.size}
              </button>

              {/* Bulk priority */}
              <div className="relative">
                <select
                  defaultValue=""
                  disabled={bulkSaving}
                  onChange={e => { handleBulkPriorityChange(e.target.value); e.target.value = '' }}
                  className="appearance-none pl-3 pr-7 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#15A4AE] cursor-pointer disabled:opacity-50"
                >
                  <option value="" disabled>Priority</option>
                  <option value="">None</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>

              {/* Bulk status */}
              <div className="relative">
                <select
                  defaultValue=""
                  disabled={bulkSaving}
                  onChange={e => { handleBulkStatusChange(e.target.value); e.target.value = '' }}
                  className="appearance-none pl-3 pr-7 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#15A4AE] cursor-pointer disabled:opacity-50"
                >
                  <option value="" disabled>Status</option>
                  <option value="new_lead">New Lead</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="crm_pipeline">In Pipeline</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>

              {/* Bulk assign */}
              {canAllocate && teamMembers.length > 0 && (
                <div className="relative">
                  <select
                    defaultValue=""
                    disabled={bulkSaving}
                    onChange={e => { handleBulkAssignChange(e.target.value); e.target.value = '' }}
                    className="appearance-none pl-3 pr-7 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#15A4AE] cursor-pointer disabled:opacity-50"
                  >
                    <option value="" disabled>Assign to</option>
                    <option value="">Unassign</option>
                    {teamMembers.map(m => (
                      <option key={m.user_id} value={m.user_id}>{m.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
              )}

              {bulkSaving && <Loader2 className="w-4 h-4 animate-spin text-[#15A4AE]" />}
            </>
          )}
          <CsvExportButton action={exportLeads} />
          <Link
            href="/forms/sources"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + Forms
          </Link>
          <p className="text-xs text-gray-400">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#141c2b]">
                <th className="px-5 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-white/30 accent-brand-600 cursor-pointer"
                  />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/70 uppercase tracking-wide">Priority</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/70 uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/70 uppercase tracking-wide">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/70 uppercase tracking-wide">Phone</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/70 uppercase tracking-wide">Company</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/70 uppercase tracking-wide">City</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/70 uppercase tracking-wide">Form</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/70 uppercase tracking-wide">Submitted</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/70 uppercase tracking-wide">Status</th>
                {canAllocate && (
                  <th className="text-left px-4 py-3 text-xs font-semibold text-white/70 uppercase tracking-wide">Assigned to</th>
                )}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-white/5">
              {filtered.map(lead => (
                <tr
                  key={lead.id}
                  className={`transition-colors ${selectedIds.has(lead.id) ? 'bg-brand-50 dark:bg-[#15A4AE]/8' : 'hover:bg-gray-50 dark:hover:bg-white/3'}`}
                >
                  {/* Checkbox */}
                  <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(lead.id)}
                      onChange={() => toggleSelect(lead.id)}
                      className="w-4 h-4 rounded border-gray-300 dark:border-white/20 accent-brand-600 cursor-pointer"
                    />
                  </td>

                  {/* Priority */}
                  <td className="px-4 py-3.5">
                    {updatingPriority === lead.id ? (
                      <div className="flex items-center h-[26px] w-[90px]">
                        <Loader2 className="w-4 h-4 animate-spin text-[#15A4AE]" />
                      </div>
                    ) : (
                      <div className="relative">
                        <select
                          value={lead.lead_score ?? ''}
                          onChange={e => handlePriorityChange(lead.id, e.target.value)}
                          className={`appearance-none pl-2 pr-6 py-1 text-[10px] font-semibold rounded-full border-0 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:focus:ring-[#15A4AE] cursor-pointer ${lead.lead_score ? PRIORITY_STYLES[lead.lead_score] : 'bg-gray-100 dark:bg-white/8 text-gray-400'}`}
                        >
                          {PRIORITY_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none opacity-60" />
                      </div>
                    )}
                  </td>

                  {/* Name */}
                  <td className="px-4 py-3.5">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[140px]">{lead.name}</p>
                  </td>

                  {/* Email */}
                  <td className="px-4 py-3.5">
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[160px]">{lead.email ?? '—'}</p>
                  </td>

                  {/* Phone */}
                  <td className="px-4 py-3.5">
                    <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{lead.phone ?? '—'}</p>
                  </td>

                  {/* Company */}
                  <td className="px-4 py-3.5">
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px]">{lead.company ?? '—'}</p>
                  </td>

                  {/* City */}
                  <td className="px-4 py-3.5">
                    <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{getCity(lead)}</p>
                  </td>

                  {/* Form */}
                  <td className="px-4 py-3.5">
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px]">{lead.form_name ?? '—'}</p>
                  </td>

                  {/* Submitted */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <p className="text-xs text-gray-400">{formatDate(lead.created_at)}</p>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3.5">
                    {updatingStatus === lead.id ? (
                      <div className="flex items-center h-[26px] w-[100px]">
                        <Loader2 className="w-4 h-4 animate-spin text-[#15A4AE]" />
                      </div>
                    ) : (
                      <div className="relative">
                        <select
                          value={lead.pipeline_stage}
                          onChange={e => handleStatusChange(lead.id, e.target.value)}
                          className={`appearance-none pl-2 pr-6 py-1 text-[10px] font-semibold rounded-full border-0 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:focus:ring-[#15A4AE] cursor-pointer ${STATUS_STYLES[lead.pipeline_stage] ?? STATUS_STYLES.new_lead}`}
                        >
                          {STATUS_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none opacity-60" />
                      </div>
                    )}
                  </td>

                  {/* Assigned to */}
                  {canAllocate && (
                    <td className="px-4 py-3.5">
                      {assigning === lead.id ? (
                        <div className="flex items-center justify-center h-[26px] w-[120px]">
                          <Loader2 className="w-4 h-4 animate-spin text-[#15A4AE]" />
                        </div>
                      ) : teamMembers.length > 0 ? (
                        <div className="relative">
                          <select
                            value={lead.assigned_to ?? ''}
                            onChange={e => handleAssign(lead.id, e.target.value || null)}
                            className="appearance-none pl-2 pr-6 py-1 text-xs border border-gray-200 dark:border-white/10 rounded-md bg-white dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:focus:ring-[#15A4AE] max-w-[120px]"
                          >
                            <option value="">Unassigned</option>
                            {teamMembers.map(m => (
                              <option key={m.user_id} value={m.user_id}>{m.name}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">
                          {lead.assigned_to ? (memberNameMap[lead.assigned_to] ?? '—') : '—'}
                        </span>
                      )}
                    </td>
                  )}

                  {/* Actions */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1 justify-end">
                      {lead.pipeline_stage !== 'crm_pipeline' && (
                        <button
                          onClick={() => handleMoveToPipeline(lead.id)}
                          disabled={moving === lead.id}
                          title="Move to CRM Pipeline"
                          className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-[#3d9585] dark:text-[#15A4AE] hover:bg-[#15A4AE]/10 rounded-md transition-colors disabled:opacity-50"
                        >
                          {moving === lead.id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <ArrowRight className="w-3 h-3" />
                          }
                          {moving === lead.id ? 'Moving…' : 'Pipeline'}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(lead.id)}
                        disabled={deleting === lead.id}
                        title="Delete lead"
                        className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors disabled:opacity-40"
                      >
                        {deleting === lead.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />
                        }
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-400">No leads match your search.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
