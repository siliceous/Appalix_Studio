'use client'

import React, { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Search, ChevronLeft, ChevronRight, Plus, Circle, CheckCircle2,
  CheckSquare, Trash2, User, Building2, Link2, CalendarDays,
  Pencil, Lock, X, Check, ArrowLeft, Bell, Phone, FileText, Users, Clock, ChevronDown,
} from 'lucide-react'
import { cn, timeAgo } from '@/lib/utils'
import type { SageProject, SageProjectTask, SageProjectActivity, WorkspaceMemberSummary } from '@/lib/types'
import {
  updateProject, deleteProject, createTask, updateTask, deleteTask,
  addProjectActivity, completeProjectActivity, type ProjectActivityType,
} from '@/app/actions/sage-projects'

const STATUS_STYLES: Record<string, { badge: string; dot: string; label: string }> = {
  onboarding: { badge: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',       dot: 'bg-blue-400',     label: 'Onboarding' },
  active:     { badge: 'bg-[#15A4AE]/10 text-[#1f6157] dark:text-[#15A4AE] border border-[#15A4AE]/30', dot: 'bg-[#15A4AE]', label: 'Active' },
  on_hold:    { badge: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',   dot: 'bg-amber-400',    label: 'On Hold' },
  completed:  { badge: 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400',          dot: 'bg-gray-400',     label: 'Completed' },
  cancelled:  { badge: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',           dot: 'bg-red-400',      label: 'Cancelled' },
}

const PRIORITY_STYLES: Record<string, string> = {
  high:   'bg-[#15A4AE]/10 text-[#1f6157] dark:text-[#15A4AE] border border-[#15A4AE]/30',
  medium: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  low:    'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400',
}

const SERVICE_TYPES = [
  { value: 'web_design',  label: 'Web Design' },
  { value: 'seo',         label: 'SEO' },
  { value: 'marketing',   label: 'Marketing' },
  { value: 'consulting',  label: 'Consulting' },
  { value: 'custom',      label: 'Custom' },
]

const ACTIVITY_META: Record<ProjectActivityType, { Icon: React.ElementType; color: string; label: string }> = {
  note:    { Icon: FileText, color: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10',       label: 'Note' },
  call:    { Icon: Phone,    color: 'text-green-500 bg-green-50 dark:bg-green-500/10',    label: 'Call' },
  meeting: { Icon: Users,    color: 'text-purple-500 bg-purple-50 dark:bg-purple-500/10', label: 'Meeting' },
  task:    { Icon: Bell,     color: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10',    label: 'Task' },
}

function daysSince(iso: string | null | undefined): number {
  if (!iso) return 0
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

function groupActivitiesByDate(acts: SageProjectActivity[]) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay())
  const buckets: Record<string, SageProjectActivity[]> = { Today: [], 'This Week': [], Earlier: [] }
  for (const a of acts) {
    const d = new Date(a.created_at)
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    if (day >= today) buckets['Today'].push(a)
    else if (day >= weekStart) buckets['This Week'].push(a)
    else buckets['Earlier'].push(a)
  }
  return Object.entries(buckets).filter(([, items]) => items.length > 0).map(([label, items]) => ({ label, items }))
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatCurrency(value: number | null, currency: string): string | null {
  if (value == null) return null
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency ?? 'USD', maximumFractionDigits: 0 }).format(value)
}

interface Props {
  project:       SageProject
  allProjects:   SageProject[]
  tasks:         SageProjectTask[]
  activities:    SageProjectActivity[]
  members:       WorkspaceMemberSummary[]
  currentUserId: string
}

export function ProjectDetailClient({ project: initial, allProjects, tasks: initialTasks, activities: initialActivities, members }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [project, setProject] = useState(initial)
  const [tasks,   setTasks]   = useState(initialTasks)

  const [search,        setSearch]        = useState('')
  const [leftFilter,    setLeftFilter]    = useState<string>('all')
  const [leftCollapsed, setLeftCollapsed] = useState(false)

  const [rightTab,     setRightTab]     = useState<'overview' | 'activity'>('overview')
  const [showEditForm, setShowEditForm] = useState(false)
  const [editSaving,   setEditSaving]   = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting,     setDeleting]     = useState(false)

  const [editName,        setEditName]        = useState(project.name)
  const [editServiceType, setEditServiceType] = useState(project.service_type ?? '')
  const [editPriority,    setEditPriority]    = useState(project.priority)
  const [editStartDate,   setEditStartDate]   = useState(project.start_date ?? '')
  const [editDueDate,     setEditDueDate]     = useState(project.due_date ?? '')
  const [editValue,       setEditValue]       = useState(project.value != null ? String(project.value) : '')

  const [showNewTask,  setShowNewTask]  = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskError, setNewTaskError] = useState('')
  const newTaskRef = useRef<HTMLInputElement>(null)

  // Activity state
  const [activities,       setActivities]       = useState<SageProjectActivity[]>(initialActivities)
  const [actType,          setActType]          = useState<ProjectActivityType>('note')
  const [actTitle,         setActTitle]         = useState('')
  const [actBody,          setActBody]          = useState('')
  const [actDue,           setActDue]           = useState('')
  const [showAddForm,      setShowAddForm]      = useState(false)
  const [showTypeMenu,     setShowTypeMenu]     = useState(false)
  const [showReminderForm, setShowReminderForm] = useState(false)
  const [reminderTitle,    setReminderTitle]    = useState('')
  const [reminderNote,     setReminderNote]     = useState('')
  const [reminderDue,      setReminderDue]      = useState('')
  const [reminderType,     setReminderType]     = useState<ProjectActivityType>('call')
  const [reminderSaving,   setReminderSaving]   = useState(false)
  const [reminderSaved,    setReminderSaved]    = useState(false)
  const [logPending,       startLog]            = useTransition()

  useEffect(() => {
    setProject(initial)
    setEditName(initial.name)
    setEditServiceType(initial.service_type ?? '')
    setEditPriority(initial.priority)
    setEditStartDate(initial.start_date ?? '')
    setEditDueDate(initial.due_date ?? '')
    setEditValue(initial.value != null ? String(initial.value) : '')
  }, [initial.id])

  const completedCount = tasks.filter(t => t.status === 'completed').length
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0

  const filteredList = allProjects.filter(p => {
    const matchFilter = leftFilter === 'all' || p.status === leftFilter
    const q = search.toLowerCase()
    const matchSearch = !q || p.name.toLowerCase().includes(q) ||
      (p.contact?.name ?? '').toLowerCase().includes(q)
    return matchFilter && matchSearch
  })

  function saveField(fields: Parameters<typeof updateProject>[1]) {
    startTransition(async () => {
      setProject(p => ({ ...p, ...fields }))
      await updateProject(project.id, fields)
    })
  }

  function toggleTask(task: SageProjectTask) {
    const next = task.status === 'completed' ? 'pending' : 'completed'
    setTasks(ts => ts.map(t => t.id === task.id ? { ...t, status: next, completed_at: next === 'completed' ? new Date().toISOString() : null } : t))
    startTransition(async () => {
      await updateTask(task.id, project.id, { status: next })
    })
  }

  function handleDeleteTask(taskId: string) {
    setTasks(ts => ts.filter(t => t.id !== taskId))
    startTransition(async () => {
      await deleteTask(taskId, project.id)
    })
  }

  async function handleAddTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!newTaskTitle.trim()) { setNewTaskError('Task title is required'); return }
    setNewTaskError('')
    const optimisticId = `temp-${Date.now()}`
    const optimisticTask: SageProjectTask = {
      id:           optimisticId,
      project_id:   project.id,
      workspace_id: project.workspace_id,
      title:        newTaskTitle.trim(),
      description:  null,
      assigned_to:  null,
      status:       'pending',
      priority:     'medium',
      due_date:     null,
      order_index:  tasks.length,
      completed_at: null,
      created_at:   new Date().toISOString(),
      updated_at:   new Date().toISOString(),
    }
    setTasks(ts => [...ts, optimisticTask])
    setNewTaskTitle('')
    setShowNewTask(false)
    startTransition(async () => {
      const result = await createTask(project.id, { title: optimisticTask.title })
      if (result.id) {
        setTasks(ts => ts.map(t => t.id === optimisticId ? { ...t, id: result.id! } : t))
      } else {
        setTasks(ts => ts.filter(t => t.id !== optimisticId))
        setNewTaskError(result.error ?? 'Failed to create task')
      }
    })
  }

  async function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setEditSaving(true)
    try {
      const fields: Parameters<typeof updateProject>[1] = {
        name:         editName.trim() || project.name,
        service_type: editServiceType || null,
        priority:     editPriority as 'low' | 'medium' | 'high',
        start_date:   editStartDate || null,
        due_date:     editDueDate || null,
        value:        editValue ? (Number(editValue) || null) : null,
      }
      setProject(p => ({ ...p, ...fields }))
      await updateProject(project.id, fields)
      setShowEditForm(false)
      router.refresh()
    } finally {
      setEditSaving(false)
    }
  }

  async function handleDeleteFromEdit() {
    setDeleting(true)
    try {
      await deleteProject(project.id)
      router.push('/sage/projects')
    } catch {
      setDeleting(false)
    }
  }

  function handleDeleteProject() {
    if (!window.confirm('Delete this project? This cannot be undone.')) return
    startTransition(async () => {
      await deleteProject(project.id)
      router.push('/sage/projects')
    })
  }

  async function handleLogActivity() {
    if (!actBody.trim() && !actTitle.trim()) return
    startLog(async () => {
      await addProjectActivity(project.id, actType, actTitle || undefined, actBody || undefined, actDue || undefined)
      setActTitle(''); setActBody(''); setActDue('')
      setShowAddForm(false)
      router.refresh()
    })
  }

  async function handleScheduleActivity() {
    if (!reminderTitle.trim() || !reminderDue) return
    setReminderSaving(true)
    const dueIso = new Date(reminderDue).toISOString()
    await addProjectActivity(project.id, reminderType, reminderTitle.trim(), reminderNote.trim() || undefined, dueIso)
    setReminderTitle(''); setReminderNote(''); setReminderDue('')
    setReminderSaved(true)
    setTimeout(() => { setReminderSaved(false); setShowReminderForm(false) }, 2500)
    setReminderSaving(false)
    router.refresh()
  }

  async function handleCompleteActivity(activityId: string) {
    await completeProjectActivity(activityId, project.id)
    setActivities(prev => prev.map(a => a.id === activityId ? { ...a, completed_at: new Date().toISOString() } : a))
  }

  const statusStyle   = STATUS_STYLES[project.status] ?? STATUS_STYLES.active
  const priorityStyle = PRIORITY_STYLES[project.priority] ?? PRIORITY_STYLES.low
  const serviceLabel  = SERVICE_TYPES.find(s => s.value === project.service_type)?.label ?? project.service_type
  const ownerMember   = members.find(m => m.user_id === project.owner_id)
  const isOverdue     = project.due_date ? new Date(project.due_date) < new Date() && project.status !== 'completed' : false

  return (
    <div className="flex h-full overflow-hidden w-full">

      {/* ── LEFT PANEL ──────────────────────────────────────────────────────── */}
      <div className={cn(
        'flex flex-col bg-gray-50 dark:bg-[#181818] border-r border-gray-200 dark:border-white/8 shrink-0 transition-all duration-200 overflow-hidden',
        leftCollapsed ? 'w-10' : 'w-64',
      )}>
        {leftCollapsed ? (
          <button
            onClick={() => setLeftCollapsed(false)}
            className="flex items-center justify-center h-12 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <>
            <div className="px-3 pt-3 pb-2 border-b border-gray-100 dark:border-white/8 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <Link href="/sage/projects" className="text-xs text-gray-400 hover:text-[#15A4AE] transition-colors">← All Projects</Link>
                <button onClick={() => setLeftCollapsed(true)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/8 transition-colors">
                  <ChevronLeft className="w-3 h-3 text-gray-400" />
                </button>
              </div>
              <div className="relative mb-2">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                <input
                  type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-6 pr-2.5 py-1.5 text-xs border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/40"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {(['all', 'onboarding', 'active', 'on_hold', 'completed', 'cancelled'] as const).map(f => (
                  <button key={f} onClick={() => setLeftFilter(f)}
                    className={cn('px-2 py-0.5 text-[10px] font-medium rounded-full transition-colors',
                      leftFilter === f ? 'bg-[#15A4AE] text-white' : 'bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/12',
                    )}>
                    {f === 'all' ? 'All' : f === 'on_hold' ? 'On Hold' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredList.length === 0
                ? <p className="text-xs text-gray-400 text-center py-8 px-3">No projects found</p>
                : filteredList.map(p => {
                  const ss = STATUS_STYLES[p.status]
                  const isActive = p.id === project.id
                  return (
                    <button key={p.id} onClick={() => router.push(`/sage/projects/${p.id}`)}
                      className={cn('w-full text-left px-3 py-2.5 border-b border-gray-50 dark:border-white/5 transition-colors',
                        isActive ? 'bg-[#15A4AE]/8 dark:bg-[#15A4AE]/10 border-l-2 border-l-[#15A4AE]' : 'hover:bg-gray-50 dark:hover:bg-white/3',
                      )}>
                      <div className="flex items-start gap-2">
                        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0 mt-1.5', ss?.dot ?? 'bg-gray-300')} />
                        <div className="min-w-0 flex-1">
                          <p className={cn('text-xs font-medium truncate leading-snug', isActive ? 'text-[#1f6157] dark:text-[#15A4AE]' : 'text-gray-800 dark:text-gray-200')}>
                            {p.name}
                          </p>
                          {p.contact?.name && <p className="text-[10px] text-gray-400 truncate mt-0.5">{p.contact.name}</p>}
                          <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(p.created_at)}</p>
                        </div>
                      </div>
                    </button>
                  )
                })
              }
            </div>
          </>
        )}
      </div>

      {/* ── CENTER PANEL ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#f5f4f1] dark:bg-[#181818]">

        {/* Center header */}
        <div className="shrink-0 bg-white dark:bg-[#1c1c1c] border-b border-gray-200 dark:border-white/8 px-4 py-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="min-w-0 mr-2">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate leading-tight">{project.name}</p>
              {project.contact?.name && <p className="text-[10px] text-gray-400 leading-tight">{project.contact.name}</p>}
            </div>
            <select
              value={project.status}
              onChange={e => saveField({ status: e.target.value as SageProject['status'] })}
              className={cn('text-[10px] font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 shrink-0', statusStyle.badge)}
            >
              {Object.entries(STATUS_STYLES).map(([val, cfg]) => (
                <option key={val} value={val}>{cfg.label}</option>
              ))}
            </select>
            <select
              value={project.priority}
              onChange={e => saveField({ priority: e.target.value as 'low' | 'medium' | 'high' })}
              className={cn('text-[10px] font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 shrink-0', priorityStyle)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <div className="flex-1" />
            <div className="flex items-center gap-1 shrink-0 border-l border-gray-200 dark:border-white/8 pl-2 ml-1">
              <Link href="/sage/projects"
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg border border-gray-200 dark:border-white/10 transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </Link>
              <button onClick={handleDeleteProject} disabled={isPending} title="Delete project"
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 space-y-4">

          {/* Progress card */}
          <div className="bg-white dark:bg-[#232323] rounded-xl border border-gray-200 dark:border-white/8">
            <div className="px-5 py-3.5 border-b border-gray-100 dark:border-white/8 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Task Progress</span>
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{completedCount}/{tasks.length} done</span>
            </div>
            <div className="px-5 py-4">
              <div className="h-2 bg-gray-100 dark:bg-white/8 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#15A4AE] rounded-full transition-all duration-500"
                  style={{ width: tasks.length > 0 ? `${progress}%` : '0%' }}
                />
              </div>
            </div>
          </div>

          {/* Tasks card */}
          <div className="bg-white dark:bg-[#232323] rounded-xl border border-gray-200 dark:border-white/8 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-white/8">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Tasks</h2>
              <button
                onClick={() => { setShowNewTask(true); setTimeout(() => newTaskRef.current?.focus(), 50) }}
                className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#15A4AE] hover:bg-[#128a93] text-white transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add task
              </button>
            </div>

            {tasks.length === 0 && !showNewTask ? (
              <div className="py-10 flex flex-col items-center text-center">
                <CheckSquare className="w-8 h-8 text-gray-200 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-400">No tasks yet.</p>
                <button
                  onClick={() => { setShowNewTask(true); setTimeout(() => newTaskRef.current?.focus(), 50) }}
                  className="mt-2 text-xs text-[#15A4AE] hover:underline"
                >
                  Add the first task
                </button>
              </div>
            ) : (
              <ul className="divide-y dark:divide-white/5">
                {tasks.map(task => (
                  <li key={task.id} className="flex items-start gap-3 px-5 py-3 group hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                    <button
                      onClick={() => toggleTask(task)}
                      className="mt-0.5 shrink-0 text-gray-300 dark:text-gray-600 hover:text-[#15A4AE] transition-colors"
                    >
                      {task.status === 'completed'
                        ? <CheckCircle2 className="w-4 h-4 text-[#15A4AE]" />
                        : <Circle className="w-4 h-4" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm', task.status === 'completed' ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-200')}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', PRIORITY_STYLES[task.priority])}>
                          {task.priority}
                        </span>
                        {task.due_date && (
                          <span className={cn('text-xs flex items-center gap-0.5', new Date(task.due_date) < new Date() && task.status !== 'completed' ? 'text-red-500 dark:text-red-400' : 'text-gray-400')}>
                            <CalendarDays className="w-3 h-3" />
                            {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 shrink-0 p-1 text-gray-300 hover:text-red-500 transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}

                {showNewTask && (
                  <li className="px-5 py-3">
                    <form onSubmit={handleAddTask} className="flex items-center gap-2">
                      <Circle className="w-4 h-4 text-gray-300 shrink-0" />
                      <input
                        ref={newTaskRef}
                        type="text"
                        value={newTaskTitle}
                        onChange={e => setNewTaskTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Escape') { setShowNewTask(false); setNewTaskTitle('') } }}
                        placeholder="Task title…"
                        className="flex-1 text-sm bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none border-b dark:border-white/10 pb-0.5 focus:border-[#15A4AE]/60"
                      />
                      <button type="submit" className="text-[#15A4AE] hover:text-[#128a93]">
                        <Check className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => { setShowNewTask(false); setNewTaskTitle('') }} className="text-gray-400 hover:text-gray-600">
                        <X className="w-4 h-4" />
                      </button>
                    </form>
                    {newTaskError && <p className="text-xs text-red-500 mt-1 ml-6">{newTaskError}</p>}
                  </li>
                )}
              </ul>
            )}
          </div>

        </div>
      </div>

      {/* ── RIGHT PANEL ─────────────────────────────────────────────────────── */}
      <div className="w-80 shrink-0 flex flex-col border-l border-gray-200 dark:border-white/8 bg-white dark:bg-[#1e1e1e] overflow-hidden">

        {/* Header */}
        <div className="px-4 pt-4 pb-0 border-b dark:border-white/8 shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-3">
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', statusStyle.badge)}>{statusStyle.label}</span>
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', priorityStyle)}>{project.priority}</span>
            {serviceLabel && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400">
                {serviceLabel}
              </span>
            )}
          </div>
          <div className="flex items-start gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-xl bg-[#15A4AE]/15 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-[#15A4AE]">{project.name.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 leading-snug line-clamp-2">{project.name}</p>
              {project.contact?.name && <p className="text-[10px] text-gray-400 mt-0.5 truncate">{project.contact.name}</p>}
            </div>
            <button
              onClick={() => { setShowEditForm(v => !v); setConfirmDelete(false) }}
              title="Edit project"
              className={cn('p-1.5 rounded-lg transition-colors shrink-0',
                showEditForm
                  ? 'bg-[#15A4AE]/10 text-[#15A4AE]'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8'
              )}
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex">
            {(['overview', 'activity'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setRightTab(tab as 'overview' | 'activity')}
                className={cn('px-3.5 py-2 text-xs font-semibold capitalize transition-colors border-b-2',
                  rightTab === tab
                    ? 'border-[#15A4AE] text-[#15A4AE]'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                )}
              >
                {tab}
                {tab === 'activity' && activities.length > 0 && (
                  <span className="ml-1.5 text-[10px] bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded-full">
                    {activities.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Edit form */}
        {showEditForm && (
          <form onSubmit={e => void handleEditSubmit(e)} className="border-b dark:border-white/8 px-4 py-3.5 bg-gray-50 dark:bg-white/[0.02] space-y-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Edit Project</p>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Name</label>
              <input type="text" required value={editName} onChange={e => setEditName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Service Type</label>
                <select value={editServiceType} onChange={e => setEditServiceType(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]">
                  <option value="">— none —</option>
                  {SERVICE_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Priority</label>
                <select value={editPriority} onChange={e => setEditPriority(e.target.value as 'low' | 'medium' | 'high')}
                  className="w-full px-2.5 py-1.5 text-xs border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Start Date</label>
                <input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Due Date</label>
                <input type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Value</label>
              <input type="number" value={editValue} onChange={e => setEditValue(e.target.value)} placeholder="0"
                className="w-full px-3 py-1.5 text-xs border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]" />
            </div>
            <div className="flex gap-2 pt-1">
              {confirmDelete ? (
                <>
                  <span className="flex-1 text-xs text-red-600 dark:text-red-400 flex items-center">Delete this project?</span>
                  <button type="button" onClick={() => setConfirmDelete(false)}
                    className="px-3 py-1.5 text-xs border dark:border-white/10 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">No</button>
                  <button type="button" disabled={deleting} onClick={() => void handleDeleteFromEdit()}
                    className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-60">
                    {deleting ? 'Deleting…' : 'Yes, delete'}
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => setConfirmDelete(true)}
                    className="px-3 py-1.5 text-xs border border-red-200 dark:border-red-500/20 rounded-lg text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                    Delete
                  </button>
                  <button type="button" onClick={() => { setShowEditForm(false); setConfirmDelete(false) }}
                    className="flex-1 px-3 py-1.5 text-xs border dark:border-white/10 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={editSaving}
                    className="flex-1 px-3 py-1.5 text-xs bg-[#15A4AE] hover:bg-[#1290a0] text-white font-semibold rounded-lg transition-colors disabled:opacity-60">
                    {editSaving ? 'Saving…' : 'Save'}
                  </button>
                </>
              )}
            </div>
          </form>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── OVERVIEW TAB ── */}
          {rightTab === 'overview' && (
            <div className="p-4 space-y-4">

              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-white/[0.03] rounded-xl border dark:border-white/8">
                <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Project Created</p>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mt-0.5" suppressHydrationWarning>{formatDate(project.created_at)}</p>
                </div>
                <span className="text-[10px] text-gray-300 dark:text-gray-600 italic">locked</span>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">Project Details</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-gray-50 dark:bg-white/[0.03] rounded-xl border dark:border-white/8">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-0.5">Status</p>
                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{statusStyle.label}</p>
                  </div>
                  <div className="p-2.5 bg-gray-50 dark:bg-white/[0.03] rounded-xl border dark:border-white/8">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-0.5">Priority</p>
                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100 capitalize">{project.priority}</p>
                  </div>
                  {serviceLabel && (
                    <div className="p-2.5 bg-gray-50 dark:bg-white/[0.03] rounded-xl border dark:border-white/8">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-0.5">Service</p>
                      <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{serviceLabel}</p>
                    </div>
                  )}
                  {project.value != null && (
                    <div className="p-2.5 bg-gray-50 dark:bg-white/[0.03] rounded-xl border dark:border-white/8">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-0.5">Value</p>
                      <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{formatCurrency(project.value, project.currency)}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-white/[0.03] rounded-xl border dark:border-white/8">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1.5">Owner</p>
                {ownerMember ? (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#15A4AE]/20 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-[#15A4AE] uppercase">{ownerMember.name.charAt(0)}</span>
                    </div>
                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{ownerMember.name}</p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">Unassigned</p>
                )}
              </div>

              {project.due_date && (
                <div className="p-2.5 bg-gray-50 dark:bg-white/[0.03] rounded-xl border dark:border-white/8">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-0.5">Due Date</p>
                  <p className={cn('text-xs font-medium', isOverdue ? 'text-red-500 dark:text-red-400' : 'text-gray-900 dark:text-gray-100')} suppressHydrationWarning>
                    {formatDate(project.due_date)}
                  </p>
                </div>
              )}

              {(project.deal || project.contact || project.company) && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">Linked Records</p>
                  <div className="space-y-1.5">
                    {project.deal && (
                      <Link href="/sage/pipelines" className="flex items-center gap-2 px-3 py-2 rounded-xl border dark:border-white/8 bg-gray-50 dark:bg-white/[0.03] text-xs text-gray-600 dark:text-gray-400 hover:text-[#1f6157] dark:hover:text-[#15A4AE] transition-colors">
                        <Link2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{project.deal.title}</span>
                      </Link>
                    )}
                    {project.contact && (
                      <Link href={`/sage/contacts/${project.contact.id}`} className="flex items-center gap-2 px-3 py-2 rounded-xl border dark:border-white/8 bg-gray-50 dark:bg-white/[0.03] text-xs text-gray-600 dark:text-gray-400 hover:text-[#1f6157] dark:hover:text-[#15A4AE] transition-colors">
                        <User className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{project.contact.name}</span>
                      </Link>
                    )}
                    {project.company && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border dark:border-white/8 bg-gray-50 dark:bg-white/[0.03] text-xs text-gray-600 dark:text-gray-400">
                        <Building2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{project.company.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ── ACTIVITY TAB ── */}
          {rightTab === 'activity' && (
            <div className="p-4 space-y-4">

              {/* Stats strip */}
              <div className="grid grid-cols-3 gap-0 rounded-xl border dark:border-white/8 overflow-hidden">
                {[
                  { label: 'Interactions', value: activities.length },
                  { label: 'Last Activity', value: activities[0]?.created_at ? formatDate(activities[0].created_at) : 'Never' },
                  { label: 'Days Active',   value: daysSince(project.created_at) },
                ].map((stat, i) => (
                  <div key={i} className={cn('px-2 py-3 text-center bg-gray-50 dark:bg-white/[0.02]', i < 2 && 'border-r dark:border-white/8')}>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-none" suppressHydrationWarning>{stat.value}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 leading-tight">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Log / Schedule panel */}
              <div className="rounded-xl border dark:border-white/8 overflow-hidden">
                <div className="flex border-b dark:border-white/8">
                  <button
                    onClick={() => { setShowReminderForm(true); setShowAddForm(false) }}
                    className={cn('flex-1 px-2 py-2.5 text-[10px] font-semibold transition-colors flex items-center justify-center gap-1',
                      showReminderForm
                        ? 'text-amber-600 dark:text-amber-400 border-b-2 border-amber-500'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    )}
                  >
                    <Bell className="w-3 h-3" /> Set Activity
                  </button>
                  <button
                    onClick={() => { setShowAddForm(true); setShowReminderForm(false); setActType('call') }}
                    className={cn('flex-1 px-2 py-2.5 text-[10px] font-semibold transition-colors',
                      showAddForm && actType !== 'note'
                        ? 'text-[#15A4AE] border-b-2 border-[#15A4AE]'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    )}
                  >
                    Log Activity
                  </button>
                  <button
                    onClick={() => { setShowAddForm(true); setShowReminderForm(false); setActType('note') }}
                    className={cn('flex-1 px-2 py-2.5 text-[10px] font-semibold transition-colors',
                      showAddForm && actType === 'note'
                        ? 'text-[#15A4AE] border-b-2 border-[#15A4AE]'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    )}
                  >
                    Create Note
                  </button>
                </div>

                {/* Log Activity / Create Note form */}
                {showAddForm && (
                  <div className="p-3 space-y-2.5">
                    {actType !== 'note' && (
                      <div className="relative">
                        <button onClick={() => setShowTypeMenu(v => !v)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/8 transition-colors">
                          {ACTIVITY_META[actType].label}
                          <ChevronDown className="w-3 h-3 text-gray-400" />
                        </button>
                        {showTypeMenu && (
                          <div className="absolute top-full left-0 mt-1 w-36 bg-white dark:bg-[#2a2a2a] border dark:border-white/10 rounded-xl shadow-lg z-10 py-1">
                            {(['call', 'meeting', 'task'] as ProjectActivityType[]).map(t => (
                              <button key={t} onClick={() => { setActType(t); setShowTypeMenu(false) }}
                                className={cn('w-full text-left px-3 py-2 text-xs transition-colors',
                                  actType === t ? 'text-[#15A4AE] bg-[#15A4AE]/5' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                                )}>
                                {ACTIVITY_META[t].label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {actType === 'task' && (
                      <input type="text" value={actTitle} onChange={e => setActTitle(e.target.value)} placeholder="Task title…"
                        className="w-full px-3 py-2 text-xs border dark:border-white/10 rounded-lg bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]" />
                    )}
                    <textarea value={actBody} onChange={e => setActBody(e.target.value)} rows={3}
                      placeholder={actType === 'note' ? 'Write a note…' : actType === 'call' ? 'Call summary…' : actType === 'meeting' ? 'Meeting notes…' : 'Task description…'}
                      className="w-full px-3 py-2 text-xs border dark:border-white/10 rounded-lg bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#15A4AE]" />
                    {actType === 'task' && (
                      <div>
                        <label className="block text-[11px] text-gray-500 dark:text-gray-400 mb-1">Due date (optional)</label>
                        <input type="datetime-local" value={actDue} onChange={e => setActDue(e.target.value)}
                          className="px-3 py-1.5 text-xs border dark:border-white/10 rounded-lg bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#15A4AE] dark:[color-scheme:dark]" />
                      </div>
                    )}
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => { setShowAddForm(false); setActTitle(''); setActBody(''); setActDue('') }}
                        className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">Cancel</button>
                      <button onClick={() => void handleLogActivity()} disabled={logPending || (!actBody.trim() && !actTitle.trim())}
                        className="px-4 py-1.5 text-xs font-semibold bg-[#15A4AE] hover:bg-[#1290a0] text-white rounded-lg disabled:opacity-50 transition-colors">
                        {logPending ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Set Activity (schedule future) form */}
                {showReminderForm && (
                  <div className="p-3 space-y-2.5">
                    {reminderSaved ? (
                      <div className="flex items-center gap-2 px-3 py-2.5 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl">
                        <Check className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-green-700 dark:text-green-400">Activity scheduled!</p>
                          <p className="text-[11px] text-green-600/70 dark:text-green-400/70 mt-0.5">Added to timeline.</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="relative">
                          <button onClick={() => setShowTypeMenu(v => !v)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/8 transition-colors">
                            {ACTIVITY_META[reminderType].label}
                            <ChevronDown className="w-3 h-3 text-gray-400" />
                          </button>
                          {showTypeMenu && (
                            <div className="absolute top-full left-0 mt-1 w-36 bg-white dark:bg-[#2a2a2a] border dark:border-white/10 rounded-xl shadow-lg z-10 py-1">
                              {(['call', 'meeting', 'task'] as ProjectActivityType[]).map(t => (
                                <button key={t} onClick={() => { setReminderType(t); setShowTypeMenu(false) }}
                                  className={cn('w-full text-left px-3 py-2 text-xs transition-colors',
                                    reminderType === t ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                                  )}>
                                  {ACTIVITY_META[t].label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <input type="text" value={reminderTitle} onChange={e => setReminderTitle(e.target.value)}
                          placeholder="Subject (e.g. Follow up call)"
                          className="w-full px-3 py-2 text-xs border dark:border-white/10 rounded-lg bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400" />
                        <textarea value={reminderNote} onChange={e => setReminderNote(e.target.value)} rows={2}
                          placeholder="Details / agenda (optional)…"
                          className="w-full px-3 py-2 text-xs border dark:border-white/10 rounded-lg bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400" />
                        <div>
                          <label className="block text-[11px] text-gray-500 dark:text-gray-400 mb-1">Scheduled for</label>
                          <input type="datetime-local" value={reminderDue} onChange={e => setReminderDue(e.target.value)}
                            className="px-3 py-1.5 text-xs border dark:border-white/10 rounded-lg bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:[color-scheme:dark]" />
                          <p className="text-[10px] text-gray-400 mt-1">Appears in timeline</p>
                        </div>
                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={() => { setShowReminderForm(false); setReminderTitle(''); setReminderNote(''); setReminderDue('') }}
                            className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">Cancel</button>
                          <button onClick={() => void handleScheduleActivity()} disabled={reminderSaving || !reminderTitle.trim() || !reminderDue}
                            className="px-4 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-lg disabled:opacity-50 transition-colors">
                            {reminderSaving ? 'Scheduling…' : 'Schedule'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {!showAddForm && !showReminderForm && (
                  <button onClick={() => { setShowAddForm(true); setActType('call') }}
                    className="w-full px-4 py-3 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors text-left">
                    Click here to add a note or log activity…
                  </button>
                )}
              </div>

              {/* Timeline */}
              {activities.length === 0 ? (
                <div className="text-center py-10">
                  <Clock className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No activities yet.</p>
                  <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Log a note, call, meeting, or task above.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {groupActivitiesByDate(activities).map(group => (
                    <div key={group.label}>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">{group.label}</p>
                      <div className="space-y-2">
                        {group.items.map(activity => {
                          const meta   = ACTIVITY_META[activity.type]
                          const Icon   = meta.Icon
                          const isTask = activity.type === 'task'
                          const isDone = !!activity.completed_at
                          return (
                            <div key={activity.id}
                              className={cn('flex gap-3 p-3 rounded-xl border transition-colors',
                                isDone ? 'bg-gray-50/50 dark:bg-white/[0.02] border-gray-100 dark:border-white/5 opacity-60' : 'bg-white dark:bg-[#252525] border-gray-100 dark:border-white/8'
                              )}>
                              <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5', meta.color)}>
                                {isDone ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                    {activity.type === 'call' ? 'Phone Call logged'
                                      : activity.type === 'meeting' ? 'Meeting logged'
                                      : activity.type === 'task' ? (isDone ? 'Task completed' : 'Task added')
                                      : 'Note added'}
                                  </p>
                                  <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0 tabular-nums">
                                    {new Date(activity.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                  </span>
                                </div>
                                {activity.title && (
                                  <p className={cn('text-xs mt-0.5 font-medium', isDone ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200')}>
                                    {activity.title}
                                  </p>
                                )}
                                {activity.body && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{activity.body}</p>
                                )}
                                {activity.due_at && !isDone && (
                                  <p className="text-[10px] text-amber-500 mt-1 flex items-center gap-1" suppressHydrationWarning>
                                    <Clock className="w-3 h-3" /> Due {formatDate(activity.due_at)}
                                  </p>
                                )}
                                {isTask && !isDone && (
                                  <button onClick={() => void handleCompleteActivity(activity.id)}
                                    className="mt-1.5 flex items-center gap-1 text-[10px] font-medium text-green-600 dark:text-green-400 hover:text-green-700 transition-colors">
                                    <Check className="w-3 h-3" /> Mark complete
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

        </div>
      </div>

    </div>
  )
}
