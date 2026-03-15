'use client'

import React, { useState, useMemo } from 'react'
import { Download, Clock, Search, Filter } from 'lucide-react'
import type { ActivityRow } from './page'

const ENTITY_COLORS: Record<string, string> = {
  email:        'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300',
  ticket:       'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400',
  conversation: 'bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300',
  lead:         'bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-300',
  deal:         'bg-[#61c2ad]/15 text-[#3a9e8a] dark:text-[#61c2ad]',
  contact:      'bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-300',
  task:         'bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
}

function fmt(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  const today = new Date(); today.setHours(0,0,0,0)
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
  const day = new Date(d); day.setHours(0,0,0,0)
  if (day.getTime() === today.getTime()) return 'Today'
  if (day.getTime() === yesterday.getTime()) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function downloadCsv(rows: ActivityRow[]) {
  const header = ['Date & Time', 'Event', 'Type', 'Detail']
  const lines  = rows.map(r => [
    new Date(r.created_at).toLocaleString('en-US', { hour12: false }),
    r.event_type,
    r.entity_type,
    r.label,
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
  const csv = [header.join(','), ...lines].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const a   = document.createElement('a')
  a.href = url; a.download = `my-activity-${new Date().toISOString().slice(0,10)}.csv`
  a.click(); URL.revokeObjectURL(url)
}

export function MyActivityClient({ rows }: { rows: ActivityRow[] }) {
  const [search,     setSearch]     = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  const entityTypes = useMemo(() => {
    const s = new Set(rows.map(r => r.entity_type))
    return ['all', ...Array.from(s).sort()]
  }, [rows])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return rows.filter(r => {
      if (typeFilter !== 'all' && r.entity_type !== typeFilter) return false
      if (q && !r.label.toLowerCase().includes(q)) return false
      return true
    })
  }, [rows, search, typeFilter])

  // Group by calendar date
  const grouped = useMemo(() => {
    const map = new Map<string, ActivityRow[]>()
    for (const r of filtered) {
      const key = new Date(r.created_at).toISOString().slice(0, 10)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r)
    }
    return map
  }, [filtered])

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="px-8 pt-8 pb-5 border-b dark:border-white/8 shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">My Activity</h1>
            <p className="text-sm text-gray-400 mt-0.5">Read-only log of all your actions · {rows.length} entries</p>
          </div>
          <button
            onClick={() => downloadCsv(filtered)}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[#61c2ad] hover:bg-[#4aab96] text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search activities…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#61c2ad]/40 text-gray-700 dark:text-gray-200 placeholder-gray-400"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#61c2ad]/40"
            >
              {entityTypes.map(t => (
                <option key={t} value={t}>{t === 'all' ? 'All types' : t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
          {(search || typeFilter !== 'all') && (
            <button
              onClick={() => { setSearch(''); setTypeFilter('all') }}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              Clear filters
            </button>
          )}
          <span className="ml-auto text-xs text-gray-400">{filtered.length} entries</span>
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <Clock className="w-10 h-10 mb-3 opacity-20" />
            <p className="text-sm font-medium">{rows.length === 0 ? 'No activity recorded yet' : 'No entries match your filters'}</p>
          </div>
        ) : (
          <div className="space-y-8 max-w-3xl">
            {Array.from(grouped.entries()).map(([dateKey, dayRows]) => (
              <div key={dateKey}>
                {/* Date separator */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {fmtDate(dateKey + 'T12:00:00')}
                  </span>
                  <div className="flex-1 h-px bg-gray-100 dark:bg-white/6" />
                  <span className="text-[10px] text-gray-300 dark:text-white/20 shrink-0">{dayRows.length}</span>
                </div>

                {/* Rows */}
                <div className="space-y-0.5">
                  {dayRows.map(r => (
                    <div
                      key={r.id}
                      className="flex items-start gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors group"
                    >
                      {/* Type pill */}
                      <span className={`shrink-0 mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${ENTITY_COLORS[r.entity_type] ?? 'bg-gray-100 dark:bg-white/8 text-gray-500'}`}>
                        {r.entity_type}
                      </span>
                      {/* Label */}
                      <p className="flex-1 text-sm text-gray-800 dark:text-gray-200 leading-snug">
                        {r.label}
                      </p>
                      {/* Time */}
                      <span className="shrink-0 text-[11px] text-gray-400 dark:text-gray-500 tabular-nums mt-0.5">
                        {new Date(r.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
