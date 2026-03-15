'use client'

import { FolderOpen, Search, Trophy, Building2, User, XCircle } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'
import type { SageDeal, SageContact, SageCompany, SagePipelineStage } from '@/lib/types'
import { timeAgo } from '@/lib/utils'

type Project = SageDeal & {
  contact: Pick<SageContact, 'id' | 'name' | 'email'> | null
  company: Pick<SageCompany, 'id' | 'name'> | null
  stage:   Pick<SagePipelineStage, 'id' | 'name' | 'color'> | null
}

const PRIORITY_BADGE: Record<string, string> = {
  high:   'bg-[#15A4AE]/10 dark:bg-[#15A4AE]/15 text-[#1f6157] dark:text-[#15A4AE] border border-[#15A4AE]/30',
  medium: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200/70 dark:border-amber-500/18',
  low:    'bg-gray-100 dark:bg-white/5 text-gray-500 border border-gray-200 dark:border-white/10',
}

function formatCurrency(value: number | null, currency: string) {
  if (value == null) return null
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency ?? 'USD', maximumFractionDigits: 0 }).format(value)
}

interface Props {
  projects:  Project[]
  lostDeals: Project[]
}

export function ProjectsClient({ projects, lostDeals }: Props) {
  const [search, setSearch]   = useState('')
  const [view,   setView]     = useState<'won' | 'lost'>('won')

  const list = view === 'won' ? projects : lostDeals

  const filtered = search
    ? list.filter(p => {
        const q = search.toLowerCase()
        return (
          p.title.toLowerCase().includes(q) ||
          (p.contact?.name ?? '').toLowerCase().includes(q) ||
          (p.company?.name ?? '').toLowerCase().includes(q)
        )
      })
    : list

  const totalValue = list.reduce((sum, p) => sum + (p.value ?? 0), 0)
  const currency   = list[0]?.currency ?? 'USD'

  return (
    <div className="max-w-6xl mx-auto space-y-5 p-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Projects</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {view === 'won' ? 'All won deals' : 'All lost deals'} — {list.length} deal{list.length !== 1 ? 's' : ''}
            {totalValue > 0 && (
              <span className={`ml-2 font-medium ${view === 'won' ? 'text-[#1f6157] dark:text-[#15A4AE]' : 'text-red-500 dark:text-red-400'}`}>
                · {formatCurrency(totalValue, currency)} total value
              </span>
            )}
          </p>
        </div>

        {/* Won / Lost toggle pills */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('won')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              view === 'won'
                ? 'bg-[#15A4AE]/10 dark:bg-[#15A4AE]/15 border-[#15A4AE]/30 text-[#1f6157] dark:text-[#15A4AE]'
                : 'bg-white dark:bg-[#232323] border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-[#15A4AE]/30 hover:text-[#1f6157] dark:hover:text-[#15A4AE]'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            Won deals
            <span className="ml-0.5 font-bold">{projects.length}</span>
          </button>

          <button
            onClick={() => setView('lost')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              view === 'lost'
                ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400'
                : 'bg-white dark:bg-[#232323] border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-red-200 hover:text-red-500'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            Lost deals
            <span className="ml-0.5 font-bold">{lostDeals.length}</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Search ${view === 'won' ? 'projects' : 'lost deals'}…`}
            className="w-full pl-8 pr-3 py-2 text-sm border dark:border-white/10 rounded-lg bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FolderOpen className="w-10 h-10 text-gray-200 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-400">
              {search
                ? 'No deals match your search.'
                : view === 'won'
                  ? 'No won deals yet. Close your first deal to see it here.'
                  : 'No lost deals.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-white/8 bg-gray-50 dark:bg-white/[0.03]">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  {view === 'won' ? 'Project' : 'Deal'}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Value</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Priority</th>
                {view === 'lost' && (
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Reason</th>
                )}
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  {view === 'won' ? 'Won' : 'Lost'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-white/5">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors">

                  {/* Title + company */}
                  <td className="px-5 py-3.5 max-w-[240px]">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{p.title}</p>
                    {p.company?.name && (
                      <p className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                        <Building2 className="w-3 h-3" />{p.company.name}
                      </p>
                    )}
                  </td>

                  {/* Contact */}
                  <td className="px-4 py-3.5 max-w-[180px]">
                    {p.contact ? (
                      <Link href={`/sage/contacts/${p.contact.id}`} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-[#1f6157] dark:hover:text-[#15A4AE] transition-colors">
                        <User className="w-3 h-3 shrink-0" />
                        <span className="truncate">{p.contact.name}</span>
                      </Link>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                    )}
                  </td>

                  {/* Value */}
                  <td className="px-4 py-3.5">
                    {p.value != null ? (
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {formatCurrency(p.value, p.currency)}
                      </span>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                    )}
                  </td>

                  {/* Priority */}
                  <td className="px-4 py-3.5">
                    {p.priority ? (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${PRIORITY_BADGE[p.priority]}`}>
                        {p.priority}
                      </span>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                    )}
                  </td>

                  {/* Lost reason (lost view only) */}
                  {view === 'lost' && (
                    <td className="px-4 py-3.5">
                      {p.lost_reason ? (
                        <span className="text-xs text-red-500 dark:text-red-400">{p.lost_reason}</span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                      )}
                    </td>
                  )}

                  {/* Won/Lost date */}
                  <td className="px-5 py-3.5 text-right text-xs text-gray-400 whitespace-nowrap">
                    {view === 'won'
                      ? (p.won_at  ? timeAgo(p.won_at)  : timeAgo(p.created_at))
                      : (p.lost_at ? timeAgo(p.lost_at) : timeAgo(p.created_at))
                    }
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  )
}
