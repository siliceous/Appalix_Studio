'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Plus, Search, Settings2, User, Building2, X, GripVertical, Loader2,
  ArrowUpDown, SlidersHorizontal, LayoutList, KanbanSquare, GanttChartSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SageProject, SageProjectBoard, SageProjectBoardStage, SageContact, SageProjectTemplate } from '@/lib/types'
import { moveProjectToStage, updateBoardStages } from '@/app/actions/sage-projects'
import { exportProjectsForBoard } from '@/app/actions/csv-export'
import { CsvExportButton } from '@/components/ui/csv-export-button'
import { NewProjectModal } from '@/components/sage/new-project-modal'

const PRIORITY_COLOR: Record<string, string> = {
  high:   'text-red-500',
  medium: 'text-amber-500',
  low:    'text-blue-400',
}

const SERVICE_TYPES: Record<string, string> = {
  web_design: 'Web Design', seo: 'SEO', marketing: 'Marketing', consulting: 'Consulting', custom: 'Custom',
}

type SortKey = 'none' | 'value_desc' | 'due_date' | 'created_desc' | 'priority'
type FilterPriority = 'low' | 'medium' | 'high'
type ViewMode = 'kanban' | 'list' | 'timeline'

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }

const sortLabels: Record<SortKey, string> = {
  none:         'Default',
  value_desc:   'Value (high → low)',
  due_date:     'Due Date (soonest)',
  created_desc: 'Created (newest)',
  priority:     'Priority',
}

function formatCurrency(value: number | null, currency: string): string | null {
  if (value == null) return null
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency ?? 'USD', maximumFractionDigits: 0 }).format(value)
}

function fmtDate(iso: string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(iso).toLocaleDateString('en-US', opts ?? { month: 'short', day: 'numeric' })
}

interface Props {
  board:           SageProjectBoard
  initialProjects: SageProject[]
  contacts:        Pick<SageContact, 'id' | 'name' | 'email' | 'company_name'>[]
  templates:       SageProjectTemplate[]
}

type Column = SageProjectBoardStage | { id: '__unassigned__'; name: string; color: string; position: number; board_id: string; created_at: string }

// ─── Timeline view ────────────────────────────────────────────────────────────
function TimelineView({ projects, stages, onOpen }: {
  projects: SageProject[]
  stages:   SageProjectBoardStage[]
  onOpen:   (id: string) => void
}) {
  const today      = new Date(); today.setHours(0, 0, 0, 0)
  const windowStart = new Date(today); windowStart.setDate(today.getDate() - 7)
  const windowEnd   = new Date(today); windowEnd.setDate(today.getDate() + 60)
  const totalDays   = Math.round((windowEnd.getTime() - windowStart.getTime()) / 86_400_000)

  function pct(date: Date) {
    const d = Math.max(0, Math.min(totalDays, Math.round((date.getTime() - windowStart.getTime()) / 86_400_000)))
    return (d / totalDays) * 100
  }

  const todayPct = pct(today)

  const weekLabels: { label: string; pct: number }[] = []
  const cur = new Date(windowStart)
  while (cur <= windowEnd) {
    weekLabels.push({ label: fmtDate(cur.toISOString(), { month: 'short', day: 'numeric' }), pct: pct(cur) })
    cur.setDate(cur.getDate() + 7)
  }

  if (projects.length === 0) return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 text-gray-400">
      <GanttChartSquare className="w-10 h-10 mb-3 text-gray-300 dark:text-gray-600" />
      <p className="text-sm">No projects to display.</p>
    </div>
  )

  return (
    <div className="flex-1 overflow-auto px-6 py-5">
      <div className="min-w-[700px]">
        <div className="relative h-8 mb-2 ml-48">
          {weekLabels.map((w, i) => (
            <span key={i} className="absolute text-[10px] text-gray-400 -translate-x-1/2" style={{ left: `${w.pct}%` }}>{w.label}</span>
          ))}
        </div>
        <div className="space-y-2">
          {projects.map(p => {
            const start  = new Date(p.start_date ?? p.created_at); start.setHours(0, 0, 0, 0)
            const end    = p.due_date ? new Date(p.due_date) : new Date(today); end.setHours(0, 0, 0, 0)
            const left   = pct(start)
            const right  = pct(end)
            const width  = Math.max(right - left, 1)
            const isOver = p.due_date ? end < today && p.status !== 'completed' : false
            const stage  = stages.find(s => s.id === p.stage_id)
            return (
              <div key={p.id} className="flex items-center gap-3 group">
                <div className="w-48 shrink-0 text-right pr-3 cursor-pointer" onClick={() => onOpen(p.id)}>
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{p.name}</p>
                  {stage && <p className="text-[10px] text-gray-400 truncate">{stage.name}</p>}
                </div>
                <div className="flex-1 relative h-8 bg-gray-100 dark:bg-white/5 rounded-lg overflow-hidden cursor-pointer" onClick={() => onOpen(p.id)}>
                  <div className="absolute top-0 bottom-0 w-px bg-blue-400/60" style={{ left: `${todayPct}%` }} />
                  <div className={cn('absolute top-1 bottom-1 rounded-md flex items-center px-2 transition-opacity hover:opacity-80', isOver ? 'bg-red-500' : 'bg-blue-500')}
                    style={{ left: `${left}%`, width: `${width}%` }}>
                    <span className="text-[10px] text-white font-medium truncate">{p.name}</span>
                  </div>
                </div>
                <div className="w-20 shrink-0 text-xs text-right">
                  {p.due_date
                    ? <span className={isOver ? 'text-red-500 font-medium' : 'text-gray-400'}>{fmtDate(p.due_date)}</span>
                    : <span className="text-gray-300 dark:text-gray-600">—</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}


// ─── Main component ───────────────────────────────────────────────────────────
export function BoardClient({ board, initialProjects, contacts, templates }: Props) {
  const router = useRouter()
  const [projects,    setProjects]    = useState(initialProjects)
  const [stages]                      = useState<SageProjectBoardStage[]>(board.stages ?? [])
  const [search,      setSearch]      = useState('')
  const [dragId,      setDragId]      = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)
  const [showManage,  setShowManage]  = useState(false)
  const [showNew,     setShowNew]     = useState(false)

  // Controls
  const [viewMode,         setViewMode]         = useState<ViewMode>('kanban')
  const [sortKey,          setSortKey]          = useState<SortKey>('none')
  const [showSortMenu,     setShowSortMenu]     = useState(false)
  const [showFilterMenu,   setShowFilterMenu]   = useState(false)
  const [filterPriorities, setFilterPriorities] = useState<FilterPriority[]>([])

  // Manage stages
  const [editStages,   setEditStages]   = useState<string[]>([])
  const [savingStages, setSavingStages] = useState(false)

  const visibleProjects = useMemo(() => {
    let p = [...projects]
    if (search.trim()) {
      const q = search.toLowerCase()
      p = p.filter(proj =>
        proj.name.toLowerCase().includes(q) ||
        (proj.contact?.name ?? '').toLowerCase().includes(q) ||
        (proj.company?.name ?? '').toLowerCase().includes(q)
      )
    }
    if (filterPriorities.length > 0) {
      p = p.filter(proj => proj.priority && filterPriorities.includes(proj.priority as FilterPriority))
    }
    if (sortKey === 'value_desc')        p.sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    else if (sortKey === 'due_date')     p.sort((a, b) => !a.due_date ? 1 : !b.due_date ? -1 : a.due_date.localeCompare(b.due_date))
    else if (sortKey === 'created_desc') p.sort((a, b) => b.created_at.localeCompare(a.created_at))
    else if (sortKey === 'priority')     p.sort((a, b) => (PRIORITY_ORDER[a.priority ?? ''] ?? 99) - (PRIORITY_ORDER[b.priority ?? ''] ?? 99))
    return p
  }, [projects, search, filterPriorities, sortKey])

  const activeFilters = filterPriorities.length

  function toggleFilterPriority(p: FilterPriority) {
    setFilterPriorities(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  function handleDragStart(e: React.DragEvent, projectId: string) {
    e.dataTransfer.setData('projectId', projectId)
    e.dataTransfer.effectAllowed = 'move'
    setDragId(projectId)
  }
  function handleDragEnd() { setDragId(null); setDragOverCol(null) }
  function handleDragOver(e: React.DragEvent, stageId: string) {
    e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverCol(stageId)
  }
  function handleDrop(e: React.DragEvent, stageId: string) {
    e.preventDefault()
    const projectId = e.dataTransfer.getData('projectId')
    if (!projectId) return
    setDragId(null); setDragOverCol(null)
    const newStageId = stageId === '__unassigned__' ? null : stageId
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, stage_id: newStageId, board_id: board.id } : p))
    moveProjectToStage(projectId, board.id, stageId === '__unassigned__' ? '' : stageId).catch(() => setProjects(initialProjects))
  }

  function handleMoveStage(projectId: string, stageId: string) {
    const newStageId = stageId === '' ? null : stageId
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, stage_id: newStageId } : p))
    moveProjectToStage(projectId, board.id, stageId).catch(() => setProjects(initialProjects))
  }

  async function handleSaveStages() {
    setSavingStages(true)
    const filtered = editStages.filter(s => s.trim())
    await updateBoardStages(board.id, filtered.map(name => ({ name })))
    setSavingStages(false)
    setShowManage(false)
    router.refresh()
  }

  // Unassigned first, then named stages
  const columns: Column[] = [
    { id: '__unassigned__', name: 'Unassigned', color: '#9ca3af', position: -1, board_id: board.id, created_at: '' },
    ...stages,
  ]

  const VIEW_BUTTONS: { mode: ViewMode; icon: React.ReactNode; title: string }[] = [
    { mode: 'kanban',   icon: <KanbanSquare className="w-3.5 h-3.5" />,      title: 'Kanban' },
    { mode: 'list',     icon: <LayoutList className="w-3.5 h-3.5" />,        title: 'List' },
    { mode: 'timeline', icon: <GanttChartSquare className="w-3.5 h-3.5" />, title: 'Timeline' },
  ]

  return (
    <div className="h-full flex flex-col" onClick={() => { setShowSortMenu(false); setShowFilterMenu(false) }}>
      {/* Top bar */}
      <div className="shrink-0 flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-white/8 bg-white dark:bg-[#1c1c1c]">
        <Link href="/sage/projects" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{board.name}</h1>
          <p className="text-xs text-gray-400 mt-0.5">{stages.length} stages · {projects.length} projects</p>
        </div>
      </div>

      {/* Controls bar */}
      <div className="shrink-0 flex items-center gap-2 px-6 py-3 border-b border-gray-200 dark:border-white/8 bg-white dark:bg-[#232323] flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects…"
            onClick={e => e.stopPropagation()}
            className="w-full pl-8 pr-3 py-1.5 text-sm border dark:border-white/10 rounded-lg bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
        </div>

        {/* Sort */}
        <div className="relative" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => { setShowSortMenu(v => !v); setShowFilterMenu(false) }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
              sortKey !== 'none'
                ? 'border-blue-400/60 bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400'
                : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
            )}>
            <ArrowUpDown className="w-3.5 h-3.5" />
            {sortKey !== 'none' ? sortLabels[sortKey].split(' (')[0] : 'Sort'}
          </button>
          {showSortMenu && (
            <div className="absolute top-full left-0 mt-1.5 w-52 bg-white dark:bg-[#2a2a2a] border dark:border-white/10 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
              {(Object.entries(sortLabels) as [SortKey, string][]).map(([key, label]) => (
                <button key={key} onClick={() => { setSortKey(key); setShowSortMenu(false) }}
                  className={cn('w-full text-left px-4 py-2 text-xs transition-colors',
                    sortKey === key
                      ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                  )}>{label}</button>
              ))}
            </div>
          )}
        </div>

        {/* Filter */}
        <div className="relative" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => { setShowFilterMenu(v => !v); setShowSortMenu(false) }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
              activeFilters > 0
                ? 'border-blue-400/60 bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400'
                : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
            )}>
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {activeFilters > 0 ? `Filter (${activeFilters})` : 'Filter'}
          </button>
          {showFilterMenu && (
            <div className="absolute top-full left-0 mt-1.5 w-48 bg-white dark:bg-[#2a2a2a] border dark:border-white/10 rounded-xl shadow-lg z-20 p-3 space-y-3">
              <div>
                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">Priority</p>
                {(['high', 'medium', 'low'] as FilterPriority[]).map(p => (
                  <label key={p} className="flex items-center gap-2 py-0.5 cursor-pointer">
                    <input type="checkbox" checked={filterPriorities.includes(p)} onChange={() => toggleFilterPriority(p)} className="accent-blue-500" />
                    <span className="text-xs capitalize text-gray-700 dark:text-gray-300">{p}</span>
                  </label>
                ))}
              </div>
              {activeFilters > 0 && (
                <button onClick={() => setFilterPriorities([])} className="text-xs text-red-500 hover:text-red-600 font-medium">Clear filters</button>
              )}
            </div>
          )}
        </div>

        {/* View toggle */}
        <div className="flex items-center border dark:border-white/10 rounded-lg overflow-hidden">
          {VIEW_BUTTONS.map(({ mode, icon, title }, i) => (
            <button key={mode} onClick={() => setViewMode(mode)} title={title}
              className={cn(
                'p-1.5 transition-colors',
                i > 0 && 'border-l dark:border-white/10',
                viewMode === mode
                  ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
              )}>
              {icon}
            </button>
          ))}
        </div>

        {/* Manage Stages */}
        <button onClick={() => { setEditStages(stages.map(s => s.name)); setShowManage(true) }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
          <Settings2 className="w-3.5 h-3.5" /> Manage Stages
        </button>

        {/* CSV Export */}
        <CsvExportButton
          action={() => exportProjectsForBoard(board.id)}
          label="Export"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
        />

        {/* New Project */}
        <button onClick={() => setShowNew(true)}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors">
          <Plus className="w-3.5 h-3.5" /> New Project
        </button>
      </div>

      {/* ── List view ── */}
      {viewMode === 'list' && (
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {visibleProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <KanbanSquare className="w-10 h-10 mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-sm">No projects match your filters.</p>
            </div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b dark:border-white/8 text-left">
                  {['Project', 'Contact', 'Stage', 'Value', 'Priority', 'Due Date'].map(h => (
                    <th key={h} className="pb-2 pr-4 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {visibleProjects.map(p => {
                  const isOverdue = p.due_date ? new Date(p.due_date) < new Date() && p.status !== 'completed' : false
                  return (
                    <tr key={p.id}
                      onClick={() => router.push(`/sage/projects/${p.id}`)}
                      className="border-b dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/[0.03] cursor-pointer transition-colors group/row">
                      <td className="py-3 pr-4">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[200px]">{p.name}</p>
                        {p.service_type && <p className="text-[11px] text-gray-400">{SERVICE_TYPES[p.service_type] ?? p.service_type}</p>}
                      </td>
                      <td className="py-3 pr-4 max-w-[160px]">
                        {p.contact?.name
                          ? <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-1"><User className="w-3 h-3 shrink-0" />{p.contact.name}</p>
                          : p.company?.name
                            ? <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-1"><Building2 className="w-3 h-3 shrink-0" />{p.company.name}</p>
                            : <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>}
                      </td>
                      {/* Inline stage selector — click to change without opening project */}
                      <td className="py-3 pr-4" onClick={e => e.stopPropagation()}>
                        <select
                          value={p.stage_id ?? ''}
                          onChange={e => handleMoveStage(p.id, e.target.value)}
                          className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 font-medium cursor-pointer border-none focus:outline-none focus:ring-1 focus:ring-blue-400/40 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors appearance-none"
                        >
                          <option value="">Unassigned</option>
                          {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </td>
                      <td className="py-3 pr-4 text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {p.value ? formatCurrency(p.value, p.currency) : <span className="text-gray-300 dark:text-gray-600 font-normal">—</span>}
                      </td>
                      <td className="py-3 pr-4">
                        {p.priority
                          ? <span className={cn('text-[10px] font-semibold uppercase', PRIORITY_COLOR[p.priority])}>{p.priority}</span>
                          : <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>}
                      </td>
                      <td className="py-3 text-xs whitespace-nowrap">
                        {p.due_date
                          ? <span className={isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}>
                              {new Date(p.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          : <span className="text-gray-300 dark:text-gray-600">—</span>}
                      </td>
                      <td className="py-3" />
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Timeline view ── */}
      {viewMode === 'timeline' && (
        <TimelineView projects={visibleProjects} stages={stages} onOpen={id => router.push(`/sage/projects/${id}`)} />
      )}

      {/* ── Kanban view ── */}
      {viewMode === 'kanban' && (
        <div className="flex-1 min-h-0 overflow-x-auto px-6 py-5 pb-8">
          <div className="flex gap-4 h-full">
            {columns.map(stage => {
              const col = visibleProjects.filter(p =>
                stage.id === '__unassigned__'
                  ? (!p.stage_id || p.stage_id === null)
                  : p.stage_id === stage.id
              )
              const isDragOver   = dragOverCol === stage.id
              const isUnassigned = stage.id === '__unassigned__'
              return (
                <div key={stage.id} className="flex-shrink-0 w-72 flex flex-col h-full min-h-0">
                  {/* Stage header */}
                  <div className="shrink-0 flex items-center justify-between px-3 py-2 rounded-lg mb-3 bg-[#141c2b]">
                    <span className="text-xs font-semibold truncate text-white">
                      {stage.name}
                    </span>
                    <span className="text-xs font-bold ml-2 shrink-0 text-white/70">
                      {col.length}
                    </span>
                  </div>

                  <div
                    className={cn(
                      'flex-1 min-h-0 space-y-2 overflow-y-auto rounded-xl p-2 border transition-colors',
                      isDragOver
                        ? 'border-blue-400/40 bg-blue-50 dark:bg-blue-500/10'
                        : 'border-blue-500/10 dark:border-white/5 bg-[#f5f4f1] dark:bg-white/[0.02]',
                    )}
                    onDragOver={e => handleDragOver(e, stage.id)}
                    onDragLeave={() => setDragOverCol(null)}
                    onDrop={e => handleDrop(e, stage.id)}
                  >
                    {col.length === 0 && !isDragOver && (
                      <div className="flex items-center justify-center h-16 rounded-lg border border-dashed border-gray-200 dark:border-white/10">
                        <p className="text-xs text-gray-300 dark:text-gray-600">Drop here</p>
                      </div>
                    )}
                    {col.map(p => {
                      const isOverdue  = p.due_date ? new Date(p.due_date) < new Date() && p.status !== 'completed' : false
                      const isDragging = dragId === p.id
                      return (
                        <div key={p.id} draggable
                          onDragStart={e => handleDragStart(e, p.id)}
                          onDragEnd={handleDragEnd}
                          onClick={() => router.push(`/sage/projects/${p.id}`)}
                          className={cn(
                            'shrink-0 bg-white dark:bg-[#2a2a2a] rounded-xl p-3.5 border dark:border-white/8 cursor-pointer active:cursor-grabbing select-none transition-all',
                            isDragging ? 'opacity-40 scale-95 rotate-1' : 'hover:shadow-sm hover:border-gray-200 dark:hover:border-white/15',
                          )}
                        >
                          <div className="flex items-start gap-2">
                            <GripVertical className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug truncate">{p.name}</p>
                              {p.contact?.name && (
                                <p className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5 truncate">
                                  <User className="w-3 h-3 shrink-0" />{p.contact.name}
                                </p>
                              )}
                              {p.company?.name && !p.contact?.name && (
                                <p className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5 truncate">
                                  <Building2 className="w-3 h-3 shrink-0" />{p.company.name}
                                </p>
                              )}
                              <div className="flex items-center justify-between mt-2 gap-2 flex-wrap">
                                {p.value != null
                                  ? <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(p.value, p.currency)}</span>
                                  : <span className="text-xs text-gray-300 dark:text-gray-600">No value</span>
                                }
                                <div className="flex items-center gap-1.5">
                                  {p.priority && (
                                    <span className={cn('text-[10px] font-semibold uppercase', PRIORITY_COLOR[p.priority])}>{p.priority}</span>
                                  )}
                                  {p.service_type && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400">
                                      {SERVICE_TYPES[p.service_type] ?? p.service_type}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {p.due_date && (
                                <p className={cn('text-[10px] mt-1', isOverdue ? 'text-red-500 font-medium' : 'text-gray-400')}>
                                  Due {fmtDate(p.due_date)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    {!isUnassigned && (
                      <button onClick={() => setShowNew(true)}
                        className="shrink-0 flex items-center gap-1 px-2 py-1.5 text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-white/5 rounded-lg transition-colors w-full">
                        <Plus className="w-3 h-3" /> Add project
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* New project modal */}
      {showNew && (
        <NewProjectModal
          boardId={board.id}
          stages={stages}
          contacts={contacts}
          templates={templates}
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); router.refresh() }}
        />
      )}

      {/* Manage Stages modal */}
      {showManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowManage(false)} />
          <div className="relative bg-white dark:bg-[#232323] rounded-2xl border dark:border-white/8 shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b dark:border-white/8">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Manage Stages</h2>
              <button onClick={() => setShowManage(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-xs text-gray-400">Drag to reorder · click to rename · press × to remove</p>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {editStages.map((stage, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-gray-300 dark:text-gray-600 cursor-grab shrink-0" />
                    <span className="text-xs text-gray-400 w-5 text-right shrink-0">{i + 1}</span>
                    <input type="text" value={stage}
                      onChange={e => setEditStages(prev => prev.map((s, idx) => idx === i ? e.target.value : s))}
                      placeholder="Stage name"
                      className="flex-1 px-3 py-1.5 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <button type="button"
                      onClick={() => setEditStages(prev => prev.filter((_, idx) => idx !== i))}
                      disabled={editStages.length <= 1}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-30">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setEditStages(prev => [...prev, ''])}
                className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:opacity-80 transition-opacity">
                <Plus className="w-3.5 h-3.5" /> Add Stage
              </button>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowManage(false)}
                  className="flex-1 px-4 py-2 text-sm border dark:border-white/10 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">Cancel</button>
                <button type="button" onClick={handleSaveStages} disabled={savingStages}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-60">
                  {savingStages && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {savingStages ? 'Saving…' : 'Save Stages'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
