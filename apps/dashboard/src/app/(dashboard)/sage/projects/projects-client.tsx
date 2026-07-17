'use client'

import {
  FolderOpen, Search, Plus, Building2, User, CheckSquare, Clock,
  CheckCircle2, XCircle, Pause, LayoutGrid, List,
} from 'lucide-react'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { SageProject } from '@/lib/types'
import { createProject, updateProject } from '@/app/actions/sage-projects'
import { timeAgo, cn } from '@/lib/utils'

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; badge: string; dot: string }> = {
  onboarding: {
    label: 'Onboarding',
    icon:  <Clock className="w-3 h-3" />,
    badge: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200/70 dark:border-blue-500/20',
    dot:   'bg-blue-400',
  },
  active: {
    label: 'Active',
    icon:  <CheckCircle2 className="w-3 h-3" />,
    badge: 'bg-[#15A4AE]/10 dark:bg-[#15A4AE]/15 text-[#1f6157] dark:text-[#15A4AE] border border-[#15A4AE]/30',
    dot:   'bg-[#15A4AE]',
  },
  on_hold: {
    label: 'On Hold',
    icon:  <Pause className="w-3 h-3" />,
    badge: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200/70 dark:border-amber-500/20',
    dot:   'bg-amber-400',
  },
  completed: {
    label: 'Completed',
    icon:  <CheckSquare className="w-3 h-3" />,
    badge: 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10',
    dot:   'bg-gray-400',
  },
  cancelled: {
    label: 'Cancelled',
    icon:  <XCircle className="w-3 h-3" />,
    badge: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200/70 dark:border-red-500/20',
    dot:   'bg-red-400',
  },
}

const PRIORITY_BADGE: Record<string, string> = {
  high:   'bg-[#15A4AE]/10 dark:bg-[#15A4AE]/15 text-[#1f6157] dark:text-[#15A4AE] border border-[#15A4AE]/30',
  medium: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200/70 dark:border-amber-500/20',
  low:    'bg-gray-100 dark:bg-white/5 text-gray-500 border border-gray-200 dark:border-white/10',
}

const SERVICE_TYPES = [
  { value: 'web_design',  label: 'Web Design' },
  { value: 'seo',         label: 'SEO' },
  { value: 'marketing',   label: 'Marketing' },
  { value: 'consulting',  label: 'Consulting' },
  { value: 'custom',      label: 'Custom' },
]

const KANBAN_COLUMNS = ['onboarding', 'active', 'on_hold', 'completed', 'cancelled'] as const

function formatCurrency(value: number | null, currency: string): string | null {
  if (value == null) return null
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency ?? 'USD', maximumFractionDigits: 0 }).format(value)
}

interface Props {
  projects: SageProject[]
}

export function ProjectsClient({ projects: initialProjects }: Props) {
  const router = useRouter()
  const [projects,     setProjects]     = useState(initialProjects)
  const [view,         setView]         = useState<'kanban' | 'list'>('kanban')
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showNew,      setShowNew]      = useState(false)
  const [isPending, startTransition]    = useTransition()

  const [name,        setName]        = useState('')
  const [serviceType, setServiceType] = useState('')
  const [formError,   setFormError]   = useState('')

  // Drag-and-drop state
  const [dragId,       setDragId]       = useState<string | null>(null)
  const [dragOverCol,  setDragOverCol]  = useState<string | null>(null)

  function handleDragStart(e: React.DragEvent, projectId: string) {
    e.dataTransfer.setData('projectId', projectId)
    e.dataTransfer.effectAllowed = 'move'
    setDragId(projectId)
  }

  function handleDragEnd() {
    setDragId(null)
    setDragOverCol(null)
  }

  function handleDragOver(e: React.DragEvent, status: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverCol(status)
  }

  function handleDrop(e: React.DragEvent, status: string) {
    e.preventDefault()
    const projectId = e.dataTransfer.getData('projectId')
    if (!projectId) return
    setDragId(null)
    setDragOverCol(null)
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: status as SageProject['status'] } : p))
    updateProject(projectId, { status: status as SageProject['status'] }).catch(() => setProjects(initialProjects))
  }

  const filtered = projects.filter(p => {
    const matchesSearch = !search || (
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.contact?.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (p.company?.name ?? '').toLowerCase().includes(search.toLowerCase())
    )
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const counts: Record<string, number> = { all: projects.length }
  for (const p of initialProjects) {
    counts[p.status] = (counts[p.status] ?? 0) + 1
  }

  async function handleCreate(e: { preventDefault: () => void; currentTarget: HTMLFormElement }) {
    e.preventDefault()
    if (!name.trim()) { setFormError('Project name is required'); return }
    setFormError('')
    startTransition(async () => {
      const result = await createProject({ name: name.trim(), service_type: serviceType || undefined })
      if (result.error) { setFormError(result.error); return }
      setShowNew(false)
      setName('')
      setServiceType('')
      if (result.id) router.push(`/sage/projects/${result.id}`)
    })
  }

  return (
    <div className="h-full flex flex-col">

      {/* Header */}
      <div className="shrink-0 flex items-center justify-between gap-4 flex-wrap px-6 py-3 border-b border-white/10 bg-[#141c2b] shadow-[0_2px_8px_rgba(0,0,0,0.35),0_1px_0px_rgba(255,255,255,0.06)_inset]">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-sm font-bold text-white">Projects</h1>
            <p className="text-xs text-white/50">
              {projects.length} project{projects.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="pl-8 pr-3 py-1.5 text-xs border border-white/15 rounded-lg bg-white/8 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 w-44"
            />
          </div>
          <div className="flex items-center gap-1 p-1 bg-white/8 rounded-lg border border-white/15">
            <button
              onClick={() => setView('kanban')}
              className={cn('p-1.5 rounded-md transition-colors', view === 'kanban' ? 'bg-white/20 text-white shadow-sm' : 'text-white/40 hover:text-white/70')}
              title="Kanban view"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setView('list')}
              className={cn('p-1.5 rounded-md transition-colors', view === 'list' ? 'bg-white/20 text-white shadow-sm' : 'text-white/40 hover:text-white/70')}
              title="List view"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#15A4AE] hover:bg-[#128a93] text-white transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New project
          </button>
        </div>
      </div>

      {/* New project modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1c1c1c] rounded-2xl border dark:border-white/10 p-6 w-full max-w-md shadow-xl">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">New Project</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Project name *</label>
                <input
                  autoFocus
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Acme Corp Website Redesign"
                  className="w-full px-3 py-2 text-sm border dark:border-white/10 rounded-lg bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Service type</label>
                <select
                  value={serviceType}
                  onChange={e => setServiceType(e.target.value)}
                  className="w-full px-3 py-2 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-[#232323] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40"
                >
                  <option value="">— none —</option>
                  {SERVICE_TYPES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                {serviceType && (
                  <p className="text-xs text-gray-400 mt-1">Tasks will be pre-filled from the {serviceType.replace('_', ' ')} template.</p>
                )}
              </div>
              {formError && <p className="text-xs text-red-500">{formError}</p>}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowNew(false); setName(''); setServiceType(''); setFormError('') }}
                  className="flex-1 px-3 py-2 text-sm border dark:border-white/10 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 px-3 py-2 text-sm font-semibold bg-[#15A4AE] hover:bg-[#128a93] disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  {isPending ? 'Creating…' : 'Create project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── KANBAN VIEW ─────────────────────────────────────────────────────── */}
      {view === 'kanban' && (
        <div className="flex-1 min-h-0 overflow-x-auto px-6 py-5">
          <div className="flex gap-4 h-full">
            {KANBAN_COLUMNS.map(status => {
              const cfg = STATUS_CONFIG[status]
              const col = projects.filter(p => p.status === status && (
                !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
                (p.contact?.name ?? '').toLowerCase().includes(search.toLowerCase())
              ))
              const isDragOver = dragOverCol === status
              return (
                <div key={status} className="w-72 flex flex-col h-full shrink-0">
                  {/* Column header */}
                  <div className="shrink-0 flex items-center gap-2 px-1 pb-3">
                    <span className={cn('w-2 h-2 rounded-full shrink-0', cfg.dot)} />
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{cfg.label}</span>
                    <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400">
                      {col.length}
                    </span>
                  </div>
                  {/* Column body — stretches to bottom */}
                  <div
                    className={cn(
                      'flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 rounded-xl p-2 border transition-colors',
                      isDragOver
                        ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-300 dark:border-blue-500/40 ring-2 ring-blue-400/30'
                        : 'bg-gray-50 dark:bg-[#1a1a1a] border-gray-100 dark:border-white/5',
                    )}
                    onDragOver={e => handleDragOver(e, status)}
                    onDragLeave={() => setDragOverCol(null)}
                    onDrop={e => handleDrop(e, status)}
                  >
                    {col.length === 0 && !isDragOver && (
                      <p className="text-[11px] text-gray-400 text-center py-6">No projects</p>
                    )}
                    {isDragOver && col.length === 0 && (
                      <div className="flex-1 flex items-center justify-center">
                        <p className="text-[11px] text-blue-500">Drop here</p>
                      </div>
                    )}
                    {col.map(p => {
                      const isOverdue = p.due_date ? new Date(p.due_date) < new Date() && p.status !== 'completed' : false
                      const isDragging = dragId === p.id
                      return (
                        <div
                          key={p.id}
                          draggable
                          onDragStart={e => handleDragStart(e, p.id)}
                          onDragEnd={handleDragEnd}
                          onClick={() => router.push(`/sage/projects/${p.id}`)}
                          className={cn(
                            'shrink-0 bg-white dark:bg-[#232323] rounded-xl border border-gray-200 dark:border-white/8 p-3 cursor-pointer shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-white/15 transition-all',
                            isDragging && 'opacity-40 scale-95',
                          )}
                        >
                          <p className="text-xs font-medium text-gray-900 dark:text-gray-100 leading-snug mb-1.5 truncate">{p.name}</p>
                          {p.contact?.name && (
                            <p className="flex items-center gap-1 text-[10px] text-gray-400 mb-1 truncate">
                              <User className="w-3 h-3 shrink-0" />
                              {p.contact.name}
                            </p>
                          )}
                          {p.company?.name && (
                            <p className="flex items-center gap-1 text-[10px] text-gray-400 mb-1 truncate">
                              <Building2 className="w-3 h-3 shrink-0" />
                              {p.company.name}
                            </p>
                          )}
                          <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                            <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', PRIORITY_BADGE[p.priority])}>
                              {p.priority}
                            </span>
                            {p.service_type && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400">
                                {SERVICE_TYPES.find(s => s.value === p.service_type)?.label ?? p.service_type}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-1.5">
                            {p.value != null && (
                              <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300">
                                {formatCurrency(p.value, p.currency)}
                              </span>
                            )}
                            {p.due_date && (
                              <span className={cn('text-[10px] ml-auto', isOverdue ? 'text-red-500 dark:text-red-400 font-medium' : 'text-gray-400')}>
                                {new Date(p.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    {/* Quick add at bottom */}
                    <button
                      onClick={() => setShowNew(true)}
                      className="shrink-0 flex items-center gap-1 px-2 py-1.5 text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-white/5 rounded-lg transition-colors w-full"
                    >
                      <Plus className="w-3 h-3" /> Add project
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── LIST VIEW ───────────────────────────────────────────────────────── */}
      {view === 'list' && (
        <div className="flex-1 overflow-auto p-6 space-y-5">
          {/* Filters */}
          <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-4 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[180px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search projects…"
                className="w-full pl-8 pr-3 py-2 text-sm border dark:border-white/10 rounded-lg bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {(['all', 'onboarding', 'active', 'on_hold', 'completed', 'cancelled'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn('flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors',
                    statusFilter === s
                      ? s === 'all'
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent'
                        : STATUS_CONFIG[s]?.badge ?? ''
                      : 'bg-white dark:bg-[#232323] border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/20'
                  )}
                >
                  {s !== 'all' && STATUS_CONFIG[s]?.icon}
                  {s === 'all' ? 'All' : STATUS_CONFIG[s]?.label}
                  {counts[s] != null && <span className="ml-0.5 font-bold">{counts[s]}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 overflow-hidden">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <FolderOpen className="w-10 h-10 text-gray-200 dark:text-gray-600 mb-3" />
                <p className="text-sm text-gray-400">
                  {search || statusFilter !== 'all'
                    ? 'No projects match your filters.'
                    : 'No projects yet. Create your first project or convert a won deal.'}
                </p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-white/8 bg-gray-50 dark:bg-white/[0.03]">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Project</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Contact</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Priority</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Value</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Due</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-white/5">
                  {filtered.map(p => (
                    <tr
                      key={p.id}
                      className="hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
                      onClick={() => router.push(`/sage/projects/${p.id}`)}
                    >
                      <td className="px-5 py-3.5 max-w-[240px]">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{p.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {p.company?.name && (
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <Building2 className="w-3 h-3" />{p.company.name}
                            </span>
                          )}
                          {p.service_type && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400">
                              {p.service_type.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 max-w-[160px]">
                        {p.contact ? (
                          <span
                            className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400"
                            onClick={e => e.stopPropagation()}
                          >
                            <User className="w-3 h-3 shrink-0" />
                            <Link
                              href={`/sage/contacts/${p.contact.id}`}
                              className="truncate hover:text-[#1f6157] dark:hover:text-[#15A4AE] transition-colors"
                            >
                              {p.contact.name}
                            </Link>
                          </span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {(() => {
                          const cfg = STATUS_CONFIG[p.status]
                          return (
                            <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full', cfg.badge)}>
                              {cfg.icon}{cfg.label}
                            </span>
                          )
                        })()}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', PRIORITY_BADGE[p.priority])}>
                          {p.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {p.value != null ? (
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {formatCurrency(p.value, p.currency)}
                          </span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {p.due_date ? (
                          <span className={cn('text-xs', new Date(p.due_date) < new Date() && p.status !== 'completed' ? 'text-red-500 dark:text-red-400 font-medium' : 'text-gray-500 dark:text-gray-400')}>
                            {new Date(p.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right text-xs text-gray-400 whitespace-nowrap">
                        {timeAgo(p.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
