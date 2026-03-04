'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Trash2, ArrowRight, Search, ChevronDown, Inbox, Loader2 } from 'lucide-react'
import { deleteLead, moveLeadToPipeline } from '@/app/actions/leads'
import type { Lead, LeadAdPlatform, LeadScore } from '@/lib/types'

// ---------------------------------------------------------------------------
// Platform meta
// ---------------------------------------------------------------------------

const PLATFORM_LABEL: Record<LeadAdPlatform, string> = {
  meta:       'Meta Ads',
  google_ads: 'Google Ads',
}

const PLATFORM_COLOR: Record<LeadAdPlatform, string> = {
  meta:       'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400',
  google_ads: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400',
}

const SCORE_STYLES: Record<LeadScore, string> = {
  high:   'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  medium: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400',
  low:    'bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400',
}

function ScoreBadge({ score }: { score: LeadScore | null }) {
  if (!score) return <span className="text-xs text-gray-400">—</span>
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${SCORE_STYLES[score]}`}>
      {score}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface LeadsClientProps {
  leads: Lead[]
}

export function LeadsClient({ leads: initial }: LeadsClientProps) {
  const [leads, setLeads]           = useState<Lead[]>(initial)
  const [search, setSearch]         = useState('')
  const [platformFilter, setPlatform] = useState<'all' | LeadAdPlatform>('all')
  const [scoreFilter, setScore]     = useState<'all' | LeadScore>('all')
  const [deleting, setDeleting]     = useState<string | null>(null)
  const [moving, setMoving]         = useState<string | null>(null)
  const [, startTransition]         = useTransition()

  const filtered = leads.filter(l => {
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      l.name.toLowerCase().includes(q) ||
      (l.email ?? '').toLowerCase().includes(q) ||
      (l.company ?? '').toLowerCase().includes(q) ||
      (l.campaign_name ?? '').toLowerCase().includes(q)
    const matchPlatform = platformFilter === 'all' || l.source_platform === platformFilter
    const matchScore    = scoreFilter === 'all' || l.lead_score === scoreFilter
    return matchSearch && matchPlatform && matchScore
  })

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

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  // Empty state
  if (leads.length === 0) {
    return (
      <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 flex flex-col items-center justify-center py-16 text-center">
        <Inbox className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No leads yet</p>
        <p className="text-xs text-gray-400 mb-5">Connect Meta or Google Ads to start receiving leads automatically.</p>
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
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-[#232323] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#61c2ad]"
          />
        </div>

        <div className="relative">
          <select
            value={platformFilter}
            onChange={e => setPlatform(e.target.value as 'all' | LeadAdPlatform)}
            className="appearance-none pl-3 pr-7 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-[#232323] text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#61c2ad]"
          >
            <option value="all">All platforms</option>
            <option value="meta">Meta Ads</option>
            <option value="google_ads">Google Ads</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={scoreFilter}
            onChange={e => setScore(e.target.value as 'all' | LeadScore)}
            className="appearance-none pl-3 pr-7 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-[#232323] text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#61c2ad]"
          >
            <option value="all">All scores</option>
            <option value="high">High priority</option>
            <option value="medium">Medium priority</option>
            <option value="low">Low priority</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>

        <p className="text-xs text-gray-400 ml-auto">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-white/8">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Platform</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Name</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Email</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Company</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Campaign</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Score</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Date</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-white/5">
              {filtered.map(lead => (
                <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-white/3 transition-colors">
                  {/* Platform */}
                  <td className="px-5 py-3.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${PLATFORM_COLOR[lead.source_platform]}`}>
                      {PLATFORM_LABEL[lead.source_platform]}
                    </span>
                  </td>

                  {/* Name */}
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[140px]">{lead.name}</p>
                    {lead.phone && <p className="text-xs text-gray-400 mt-0.5">{lead.phone}</p>}
                  </td>

                  {/* Email */}
                  <td className="px-5 py-3.5">
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[180px]">{lead.email ?? '—'}</p>
                  </td>

                  {/* Company */}
                  <td className="px-5 py-3.5">
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[120px]">{lead.company ?? '—'}</p>
                    {lead.job_title && <p className="text-xs text-gray-400 mt-0.5">{lead.job_title}</p>}
                  </td>

                  {/* Campaign */}
                  <td className="px-5 py-3.5">
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[140px]">{lead.campaign_name ?? '—'}</p>
                    {lead.form_name && <p className="text-xs text-gray-400 mt-0.5">{lead.form_name}</p>}
                  </td>

                  {/* Score */}
                  <td className="px-5 py-3.5">
                    <ScoreBadge score={lead.lead_score} />
                  </td>

                  {/* Status */}
                  <td className="px-5 py-3.5">
                    {lead.pipeline_stage === 'crm_pipeline' ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-50 dark:bg-[#61c2ad]/10 text-brand-700 dark:text-[#61c2ad]">
                        In Pipeline
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400">
                        New Lead
                      </span>
                    )}
                  </td>

                  {/* Date */}
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <p className="text-xs text-gray-400">{formatDate(lead.created_at)}</p>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1 justify-end">
                      {lead.pipeline_stage !== 'crm_pipeline' && (
                        <button
                          onClick={() => handleMoveToPipeline(lead.id)}
                          disabled={moving === lead.id}
                          title="Move to CRM Pipeline"
                          className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-[#3d9585] dark:text-[#61c2ad] hover:bg-[#61c2ad]/10 rounded-md transition-colors disabled:opacity-50"
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
              <p className="text-sm text-gray-400">No leads match your filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
