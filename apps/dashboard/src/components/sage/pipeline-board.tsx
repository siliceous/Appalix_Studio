'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, GripVertical, Search, SlidersHorizontal, ArrowUpDown, Settings2, Pencil, LayoutList, KanbanSquare } from 'lucide-react'
import { moveDeal } from '@/app/actions/sage'
import { exportDeals } from '@/app/actions/csv-export'
import { importDeals } from '@/app/actions/csv-import'
import { CsvExportButton } from '@/components/ui/csv-export-button'
import { CsvImportButton } from '@/components/ui/csv-import-button'
import { DealModal } from './deal-modal'
import { ManageStagesModal } from './manage-stages-modal'
import { DealSlideOver } from './deal-slide-over'
import type { SageDeal, SagePipelineStage, SageContact, SagePipeline } from '@/lib/types'

type DealWithContact = SageDeal & {
  contact: Pick<SageContact, 'id' | 'name'> | null
}

interface PipelineBoardProps {
  pipelineId:        string
  stages:            SagePipelineStage[]
  deals:             DealWithContact[]
  contacts:          Pick<SageContact, 'id' | 'name' | 'company_name'>[]
  allPipelines:      Pick<SagePipeline, 'id' | 'name'>[]
  ownerName:         string
  dealLastActivity:  Record<string, string>  // dealId → ISO timestamp of last activity
  initialDealId?:    string                  // auto-open this deal's slide-over on mount
  callerRole?:       string
}

type SortKey = 'none' | 'value_desc' | 'close_date' | 'created_desc' | 'priority'
type FilterStatus = 'open' | 'won' | 'lost'
type FilterPriority = 'low' | 'medium' | 'high'

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }

// Activity status dot: how long since the last logged activity on a deal
function activityDot(dealId: string, dealCreatedAt: string, lastActivity: Record<string, string>) {
  const lastAt   = lastActivity[dealId] ?? dealCreatedAt
  const hoursAgo = (Date.now() - new Date(lastAt).getTime()) / 3_600_000
  if (hoursAgo < 12)  return { cls: 'bg-green-400',  tip: `Last activity ${Math.floor(hoursAgo)}h ago` }
  if (hoursAgo < 24)  return { cls: 'bg-yellow-400', tip: `${Math.floor(hoursAgo)}h since last activity — follow up soon` }
  if (hoursAgo < 36)  return { cls: 'bg-amber-500',  tip: `${Math.floor(hoursAgo)}h without activity — overdue` }
  return               { cls: 'bg-red-500',           tip: `${Math.floor(hoursAgo)}h without activity — gone cold` }
}

export function PipelineBoard({
  pipelineId,
  stages: initialStages,
  deals: initialDeals,
  contacts,
  allPipelines,
  ownerName,
  dealLastActivity,
  initialDealId,
  callerRole,
}: PipelineBoardProps) {
  const canWrite = callerRole !== 'viewer'
  const router = useRouter()
  const [deals,              setDeals]              = useState<DealWithContact[]>(initialDeals)
  const [stages,             setStages]             = useState<SagePipelineStage[]>(initialStages)
  const [dragId,             setDragId]             = useState<string | null>(null)
  const [dragOverStage,      setDragOverStage]      = useState<string | null>(null)
  const [showDealModal,      setShowDealModal]      = useState(false)
  const [showManageStages,   setShowManageStages]   = useState(false)

  const [defaultStage,       setDefaultStage]       = useState<string | undefined>()
  const [selectedDealId,     setSelectedDealId]     = useState<string | null>(initialDealId ?? null)
  const [openEditOnDealId,   setOpenEditOnDealId]   = useState<string | null>(null)

  // Header controls
  const [searchQuery,      setSearchQuery]      = useState('')
  const [sortKey,          setSortKey]          = useState<SortKey>('none')
  const [showSortMenu,     setShowSortMenu]     = useState(false)
  const [showFilterMenu,   setShowFilterMenu]   = useState(false)
  const [filterStatuses,   setFilterStatuses]   = useState<FilterStatus[]>(['open'])
  const [filterPriorities, setFilterPriorities] = useState<FilterPriority[]>([])
  const [viewMode,         setViewMode]         = useState<'kanban' | 'list'>('kanban')

  function formatCurrency(value: number | null, currency: string) {
    if (!value) return null
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
  }

  // Apply search + filter + sort
  const visibleDeals = useMemo(() => {
    let d = [...deals]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      d = d.filter(deal =>
        deal.title.toLowerCase().includes(q) ||
        deal.contact?.name.toLowerCase().includes(q) ||
        (deal.company_name?.toLowerCase().includes(q) ?? false)
      )
    }

    if (filterStatuses.length > 0) {
      d = d.filter(deal => filterStatuses.includes(deal.status as FilterStatus))
    }

    if (filterPriorities.length > 0) {
      d = d.filter(deal => deal.priority && filterPriorities.includes(deal.priority as FilterPriority))
    }

    if (sortKey === 'value_desc') {
      d.sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    } else if (sortKey === 'close_date') {
      d.sort((a, b) => {
        if (!a.close_date && !b.close_date) return 0
        if (!a.close_date) return 1
        if (!b.close_date) return -1
        return a.close_date.localeCompare(b.close_date)
      })
    } else if (sortKey === 'created_desc') {
      d.sort((a, b) => b.created_at.localeCompare(a.created_at))
    } else if (sortKey === 'priority') {
      d.sort((a, b) => (PRIORITY_ORDER[a.priority ?? ''] ?? 99) - (PRIORITY_ORDER[b.priority ?? ''] ?? 99))
    }

    return d
  }, [deals, searchQuery, sortKey, filterStatuses, filterPriorities])

  function stageTotal(stageId: string) {
    return visibleDeals
      .filter(d => d.stage_id === stageId && d.value)
      .reduce((sum, d) => sum + (d.value ?? 0), 0)
  }

  function handleDragStart(e: React.DragEvent, dealId: string) {
    e.dataTransfer.setData('dealId', dealId)
    e.dataTransfer.effectAllowed = 'move'
    setDragId(dealId)
  }

  function handleDragEnd() {
    setDragId(null)
    setDragOverStage(null)
  }

  function handleDragOver(e: React.DragEvent, stageId: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverStage(stageId)
  }

  function handleDrop(e: React.DragEvent, stageId: string) {
    e.preventDefault()
    const dealId = e.dataTransfer.getData('dealId')
    if (!dealId) return
    setDragId(null)
    setDragOverStage(null)
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage_id: stageId } : d))
    moveDeal(dealId, stageId).catch(() => setDeals(initialDeals))
  }

  function toggleFilterStatus(s: FilterStatus) {
    setFilterStatuses(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  function toggleFilterPriority(p: FilterPriority) {
    setFilterPriorities(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  const activeFilters = filterStatuses.length + filterPriorities.length

  const statusColors: Record<string, string> = {
    open: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
    won:  'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400',
    lost: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  }

  const priorityColors: Record<string, string> = {
    high:   'text-red-500',
    medium: 'text-amber-500',
    low:    'text-blue-400',
  }

  const sortLabels: Record<SortKey, string> = {
    none:         'Default',
    value_desc:   'Value (high → low)',
    close_date:   'Close Date (soonest)',
    created_desc: 'Created (newest)',
    priority:     'Priority',
  }

  return (
    <>
      {/* Board controls bar */}
      <div className="flex items-center gap-2 px-6 py-3 border-b dark:border-white/8 bg-white dark:bg-[#232323] shrink-0 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search deals…"
            className="w-full pl-8 pr-3 py-1.5 text-sm border dark:border-white/10 rounded-lg bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#15A4AE]"
          />
        </div>

        {/* Sort */}
        <div className="relative">
          <button
            onClick={() => { setShowSortMenu(v => !v); setShowFilterMenu(false) }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              sortKey !== 'none'
                ? 'border-brand-400 bg-brand-50 dark:bg-brand-600/15 text-brand-700 dark:text-[#15A4AE]'
                : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
            }`}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            {sortKey !== 'none' ? sortLabels[sortKey].split(' (')[0] : 'Sort'}
          </button>
          {showSortMenu && (
            <div className="absolute top-full left-0 mt-1.5 w-52 bg-white dark:bg-[#2a2a2a] border dark:border-white/10 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
              {(Object.entries(sortLabels) as [SortKey, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => { setSortKey(key); setShowSortMenu(false) }}
                  className={`w-full text-left px-4 py-2 text-xs transition-colors ${
                    sortKey === key
                      ? 'bg-brand-50 dark:bg-[#15A4AE]/10 text-brand-700 dark:text-[#15A4AE]'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filter */}
        <div className="relative">
          <button
            onClick={() => { setShowFilterMenu(v => !v); setShowSortMenu(false) }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              activeFilters > 0
                ? 'border-brand-400 bg-brand-50 dark:bg-brand-600/15 text-brand-700 dark:text-[#15A4AE]'
                : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {activeFilters > 0 ? `Filter (${activeFilters})` : 'Filter'}
          </button>
          {showFilterMenu && (
            <div className="absolute top-full left-0 mt-1.5 w-48 bg-white dark:bg-[#2a2a2a] border dark:border-white/10 rounded-xl shadow-lg z-20 p-3 space-y-3">
              <div>
                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">Status</p>
                {(['open', 'won', 'lost'] as FilterStatus[]).map(s => (
                  <label key={s} className="flex items-center gap-2 py-0.5 cursor-pointer">
                    <input type="checkbox" checked={filterStatuses.includes(s)} onChange={() => toggleFilterStatus(s)} className="accent-brand-600" />
                    <span className="text-xs capitalize text-gray-700 dark:text-gray-300">{s}</span>
                  </label>
                ))}
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">Priority</p>
                {(['high', 'medium', 'low'] as FilterPriority[]).map(p => (
                  <label key={p} className="flex items-center gap-2 py-0.5 cursor-pointer">
                    <input type="checkbox" checked={filterPriorities.includes(p)} onChange={() => toggleFilterPriority(p)} className="accent-brand-600" />
                    <span className="text-xs capitalize text-gray-700 dark:text-gray-300">{p}</span>
                  </label>
                ))}
              </div>
              {activeFilters > 0 && (
                <button onClick={() => { setFilterStatuses([]); setFilterPriorities([]) }} className="text-xs text-red-500 hover:text-red-600 font-medium">
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* View toggle */}
        <div className="flex items-center border dark:border-white/10 rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('kanban')}
            title="Kanban view"
            className={`p-1.5 transition-colors ${viewMode === 'kanban' ? 'bg-brand-50 dark:bg-[#15A4AE]/15 text-brand-600 dark:text-[#15A4AE]' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'}`}
          >
            <KanbanSquare className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            title="List view"
            className={`p-1.5 transition-colors border-l dark:border-white/10 ${viewMode === 'list' ? 'bg-brand-50 dark:bg-[#15A4AE]/15 text-brand-600 dark:text-[#15A4AE]' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'}`}
          >
            <LayoutList className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Manage Stages */}
        {canWrite && (
          <button
            onClick={() => setShowManageStages(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            <Settings2 className="w-3.5 h-3.5" />
            Manage Stages
          </button>
        )}

        {/* CSV export / import */}
        <div className="ml-auto flex items-center gap-2">
          <CsvExportButton
            action={() => exportDeals(pipelineId)}
            label="Export"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
          />
          {canWrite && (
            <CsvImportButton
              action={importDeals}
              label="Import"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
              onSuccess={() => router.refresh()}
            />
          )}
          {canWrite && (
            <button
              onClick={() => setShowDealModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-600 hover:bg-brand-700 text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add an Opportunity
            </button>
          )}
        </div>
      </div>

      {/* List view */}
      {viewMode === 'list' && (
        <div
          className="flex-1 overflow-y-auto px-6 py-4"
          onClick={() => { setShowSortMenu(false); setShowFilterMenu(false) }}
        >
          {visibleDeals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <KanbanSquare className="w-10 h-10 mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-sm">No deals match your filters.</p>
            </div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b dark:border-white/8 text-left">
                  {['Deal', 'Contact', 'Stage', 'Value', 'Priority', 'Status', 'Close Date'].map(h => (
                    <th key={h} className="pb-2 pr-4 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {visibleDeals.map(deal => {
                  const dot = activityDot(deal.id, deal.created_at, dealLastActivity)
                  return (
                    <tr
                      key={deal.id}
                      onClick={() => setSelectedDealId(deal.id)}
                      className="border-b dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/[0.03] cursor-pointer transition-colors group/row"
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <span title={dot.tip} className={`w-2 h-2 rounded-full shrink-0 ${dot.cls}`} />
                          <span className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[180px]">{deal.title}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-xs text-gray-500 dark:text-gray-400 truncate max-w-[140px]">
                        {deal.contact?.name ?? deal.company_name ?? '—'}
                      </td>
                      <td className="py-3 pr-4" onClick={e => e.stopPropagation()}>
                        {canWrite ? (
                          <select
                            value={deal.stage_id ?? ''}
                            onChange={async e => {
                              const newStageId = e.target.value
                              setDeals(prev => prev.map(d => d.id === deal.id ? { ...d, stage_id: newStageId } : d))
                              moveDeal(deal.id, newStageId).catch(() => setDeals(initialDeals))
                            }}
                            className="text-[11px] px-2 py-0.5 rounded-full bg-[#15A4AE]/10 text-[#3d9585] dark:text-[#15A4AE] font-medium cursor-pointer border-none focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/40 hover:bg-[#15A4AE]/20 transition-colors appearance-none"
                          >
                            {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        ) : (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#15A4AE]/10 text-[#3d9585] dark:text-[#15A4AE] font-medium">
                            {stages.find(s => s.id === deal.stage_id)?.name ?? '—'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {deal.value ? formatCurrency(deal.value, deal.currency) : <span className="text-gray-300 dark:text-gray-600 font-normal">—</span>}
                      </td>
                      <td className="py-3 pr-4">
                        {deal.priority ? (
                          <span className={`text-[10px] font-semibold uppercase ${priorityColors[deal.priority]}`}>{deal.priority}</span>
                        ) : <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[deal.status] ?? ''}`}>{deal.status}</span>
                      </td>
                      <td className="py-3 pr-4 text-xs text-gray-400 whitespace-nowrap">
                        {deal.close_date ? new Date(deal.close_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                      <td className="py-3">
                        {canWrite && (
                          <button
                            onClick={e => { e.stopPropagation(); setOpenEditOnDealId(deal.id); setSelectedDealId(deal.id) }}
                            className="opacity-0 group-hover/row:opacity-100 p-1 text-gray-400 hover:text-brand-600 dark:hover:text-[#15A4AE] rounded transition-all"
                            title="Edit deal"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Kanban */}
      {viewMode === 'kanban' && <div
        className="flex gap-4 h-full overflow-x-auto px-6 py-5 pb-8"
        onClick={() => { setShowSortMenu(false); setShowFilterMenu(false) }}
      >
        {stages.map(stage => {
          const stageDeals = visibleDeals.filter(d => d.stage_id === stage.id)
          const total      = stageTotal(stage.id)
          const isDragOver = dragOverStage === stage.id

          return (
            <div
              key={stage.id}
              className="flex-shrink-0 w-72 flex flex-col h-full min-h-0"
              onDragOver={e => handleDragOver(e, stage.id)}
              onDragLeave={() => setDragOverStage(null)}
              onDrop={e => handleDrop(e, stage.id)}
            >
              {/* Stage header */}
              <div className="flex items-center gap-2 mb-3">
                <span className="flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#15A4AE]/15 dark:bg-[#15A4AE]/20 text-[#3d9585] dark:text-[#15A4AE] truncate">
                  {stage.name}
                </span>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0 tabular-nums">{stageDeals.length}</span>
                {total > 0 && (
                  <span className="text-xs font-semibold text-[#3d9585] dark:text-[#15A4AE] shrink-0">
                    {new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(total)}
                  </span>
                )}
              </div>

              {/* Deal cards */}
              <div className={`flex-1 min-h-0 space-y-2 overflow-y-auto rounded-xl p-2 border-2 transition-colors ${
                isDragOver
                  ? 'border-brand-300 dark:border-[#15A4AE]/40 bg-brand-50/50 dark:bg-[#15A4AE]/5'
                  : 'border-transparent'
              }`}>
                {stageDeals.map(deal => (
                  <div
                    key={deal.id}
                    draggable={canWrite}
                    onDragStart={canWrite ? e => handleDragStart(e, deal.id) : undefined}
                    onDragEnd={canWrite ? handleDragEnd : undefined}
                    onClick={() => { if (!dragId) setSelectedDealId(deal.id) }}
                    className={`bg-white dark:bg-[#2a2a2a] rounded-xl p-3.5 border dark:border-white/8 cursor-pointer active:cursor-grabbing select-none transition-all ${
                      dragId === deal.id ? 'opacity-40 scale-95 rotate-1' : 'hover:shadow-sm hover:border-gray-200 dark:hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 group/title">
                          {/* Activity status dot */}
                          {(() => {
                            const dot = activityDot(deal.id, deal.created_at, dealLastActivity)
                            return (
                              <span
                                title={dot.tip}
                                className={`w-2 h-2 rounded-full shrink-0 ${dot.cls}`}
                              />
                            )
                          })()}
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug flex-1">{deal.title}</p>
                          {canWrite && (
                            <button
                              onClick={e => { e.stopPropagation(); setOpenEditOnDealId(deal.id); setSelectedDealId(deal.id) }}
                              className="opacity-0 group-hover/title:opacity-100 p-0.5 text-gray-400 hover:text-brand-600 dark:hover:text-[#15A4AE] rounded transition-all shrink-0"
                              title="Edit deal"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        {deal.contact && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{deal.contact.name}</p>
                        )}
                        {deal.company_name && !deal.contact && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{deal.company_name}</p>
                        )}
                        <div className="flex items-center justify-between mt-2 gap-2 flex-wrap">
                          {deal.value ? (
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {formatCurrency(deal.value, deal.currency)}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300 dark:text-gray-600">No value</span>
                          )}
                          <div className="flex items-center gap-1.5">
                            {deal.priority && (
                              <span className={`text-[10px] font-semibold uppercase ${priorityColors[deal.priority]}`}>
                                {deal.priority}
                              </span>
                            )}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[deal.status] ?? ''}`}>
                              {deal.status}
                            </span>
                          </div>
                        </div>
                        {deal.close_date && (
                          <p className="text-[10px] text-gray-400 mt-1">
                            Close {new Date(deal.close_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {stageDeals.length === 0 && !isDragOver && (
                  <div className="flex items-center justify-center h-16 rounded-lg border border-dashed border-gray-200 dark:border-white/10">
                    <p className="text-xs text-gray-300 dark:text-gray-600">Drop here</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>}

      {showDealModal && (
        <DealModal
          pipelineId={pipelineId}
          stages={stages}
          contacts={contacts}
          allPipelines={allPipelines}
          ownerName={ownerName}
          defaultStageId={defaultStage}
          onClose={() => {
            setShowDealModal(false)
            setDefaultStage(undefined)
            router.refresh()
          }}
        />
      )}


      {showManageStages && (
        <ManageStagesModal
          pipelineId={pipelineId}
          initialStages={stages.map(s => s.name)}
          onClose={() => setShowManageStages(false)}
          onSaved={newNames => {
            setStages(prev => newNames.map((name, i) => {
              const existing = prev.find(s => s.name === name)
              return existing
                ? { ...existing, position: i }
                : { id: `tmp-${i}`, pipeline_id: pipelineId, name, position: i, color: '#6b7280', created_at: '' }
            }))
          }}
        />
      )}

      <DealSlideOver
        dealId={selectedDealId}
        stages={stages}
        openEditForm={openEditOnDealId === selectedDealId && openEditOnDealId !== null}
        onClose={() => { setSelectedDealId(null); setOpenEditOnDealId(null) }}
        onDealDeleted={id => {
          setDeals(prev => prev.filter(d => d.id !== id))
          setSelectedDealId(null)
        }}
        onDealUpdated={(id, changes) => {
          setDeals(prev => prev.map(d => d.id === id
            ? { ...d, ...changes, priority: changes.priority as 'low' | 'medium' | 'high' | null, stage_id: changes.stage_id ?? d.stage_id, status: (changes.status ?? d.status) as 'open' | 'won' | 'lost' }
            : d
          ))
          // Close slide-over if deal was won/lost (it leaves the filtered board)
          if (changes.status === 'won' || changes.status === 'lost') {
            setSelectedDealId(null)
          }
        }}
      />


    </>
  )
}
