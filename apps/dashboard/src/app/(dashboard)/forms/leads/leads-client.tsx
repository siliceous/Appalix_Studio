'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Trash2, ArrowRight, Search, ChevronDown, Inbox } from 'lucide-react'
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
  meta:       'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400',
  google_ads: 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400',
}

// Simple SVG logos
function MetaIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.5 7.5c0-.828-.448-1.5-1-1.5s-1 .672-1 1.5v4c0 .828.448 1.5 1 1.5s1-.672 1-1.5v-4zm-8 0c0-.828-.448-1.5-1-1.5s-1 .672-1 1.5v4c0 .828.448 1.5 1 1.5s1-.672 1-1.5v-4zm4-1.5c-1.381 0-2.5 1.344-2.5 3s1.119 3 2.5 3 2.5-1.344 2.5-3-1.119-3-2.5-3z" />
    </svg>
  )
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function PlatformIcon({ platform, className }: { platform: LeadAdPlatform; className?: string }) {
  if (platform === 'meta')       return <MetaIcon   className={className} />
  if (platform === 'google_ads') return <GoogleIcon className={className} />
  return null
}

// ---------------------------------------------------------------------------
// Score badge
// ---------------------------------------------------------------------------

const SCORE_STYLES: Record<LeadScore, string> = {
  high:   'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  medium: 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400',
  low:    'bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-400',
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
  const [leads, setLeads] = useState<Lead[]>(initial)
  const [search, setSearch]             = useState('')
  const [platformFilter, setPlatform]   = useState<'all' | LeadAdPlatform>('all')
  const [scoreFilter, setScore]         = useState<'all' | LeadScore>('all')
  const [deleting, setDeleting]         = useState<string | null>(null)
  const [moving, setMoving]             = useState<string | null>(null)
  const [, startTransition]             = useTransition()

  // Filters
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
      <div className="flex flex-col items-center justify-center h-full py-24 text-center px-6">
        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4">
          <Inbox className="w-5 h-5 text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">No leads yet</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mb-5">
          Connect Meta or Google Ads to start receiving leads automatically.
        </p>
        <Link
          href="/forms/sources"
          className="px-4 py-2 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors"
        >
          Connect a Platform
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search leads…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#61c2ad]"
          />
        </div>

        <div className="relative">
          <select
            value={platformFilter}
            onChange={e => setPlatform(e.target.value as 'all' | LeadAdPlatform)}
            className="appearance-none pl-3 pr-7 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#61c2ad]"
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
            className="appearance-none pl-3 pr-7 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#61c2ad]"
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
      <div className="bg-white dark:bg-[#232323] rounded-xl border border-gray-200 dark:border-white/8 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-white/6">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Platform</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Company</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Campaign</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Score</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(lead => (
                <tr
                  key={lead.id}
                  className="border-b border-gray-50 dark:border-white/4 last:border-0 hover:bg-gray-50 dark:hover:bg-white/2 transition-colors"
                >
                  {/* Platform */}
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${PLATFORM_COLOR[lead.source_platform]}`}>
                      <PlatformIcon platform={lead.source_platform} className="w-2.5 h-2.5" />
                      {PLATFORM_LABEL[lead.source_platform]}
                    </span>
                  </td>

                  {/* Name */}
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[140px]">{lead.name}</p>
                    {lead.phone && <p className="text-xs text-gray-400 mt-0.5">{lead.phone}</p>}
                  </td>

                  {/* Email */}
                  <td className="px-4 py-3">
                    <p className="text-gray-600 dark:text-gray-400 truncate max-w-[180px] text-xs">{lead.email ?? '—'}</p>
                  </td>

                  {/* Company */}
                  <td className="px-4 py-3">
                    <p className="text-gray-600 dark:text-gray-400 truncate max-w-[120px] text-xs">{lead.company ?? '—'}</p>
                    {lead.job_title && <p className="text-gray-400 text-[10px] mt-0.5">{lead.job_title}</p>}
                  </td>

                  {/* Campaign */}
                  <td className="px-4 py-3">
                    <p className="text-gray-600 dark:text-gray-400 truncate max-w-[140px] text-xs">{lead.campaign_name ?? '—'}</p>
                    {lead.form_name && <p className="text-gray-400 text-[10px] mt-0.5">{lead.form_name}</p>}
                  </td>

                  {/* Score */}
                  <td className="px-4 py-3">
                    <ScoreBadge score={lead.lead_score} />
                  </td>

                  {/* Pipeline Status */}
                  <td className="px-4 py-3">
                    {lead.pipeline_stage === 'crm_pipeline' ? (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-brand-100 dark:bg-[#61c2ad]/15 text-brand-700 dark:text-[#61c2ad]">
                        In Pipeline
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400">
                        New Lead
                      </span>
                    )}
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="text-xs text-gray-400">{formatDate(lead.created_at)}</p>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {lead.pipeline_stage !== 'crm_pipeline' && (
                        <button
                          onClick={() => handleMoveToPipeline(lead.id)}
                          disabled={moving === lead.id}
                          title="Move to CRM Pipeline"
                          className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-[#3d9585] dark:text-[#61c2ad] hover:bg-[#61c2ad]/10 rounded-md transition-colors disabled:opacity-50"
                        >
                          <ArrowRight className="w-3 h-3" />
                          {moving === lead.id ? 'Moving…' : 'Pipeline'}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(lead.id)}
                        disabled={deleting === lead.id}
                        title="Delete lead"
                        className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors disabled:opacity-40"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && leads.length > 0 && (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-400">No leads match your filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
