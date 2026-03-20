'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Search, Sparkles, RefreshCw, Loader2, User, Mail, Phone,
  Clock, Send, FileText, Users, CheckSquare, Check, Pencil,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import { EmailComposeModal } from '@/components/dashboard/email-compose-modal'
import {
  addTicketActivity, completeTicketTask, analyzeTicket,
  type TicketActivityType,
} from '@/app/actions/sage-tickets'
import { updateTicketStatus, updateTicketPriority, updateTicketContactInfo } from '@/app/actions/sage'
import { timeAgo, cn } from '@/lib/utils'
import type { SageTicket, SageContact, SageTicketStatus, SageTicketActivity, WorkspaceMemberSummary } from '@/lib/types'

type TicketWithContact = SageTicket & { contact: Pick<SageContact, 'id' | 'name' | 'email'> | null }

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_FLOW: SageTicketStatus[] = ['open', 'in_progress', 'pending', 'resolved', 'closed']

const STATUS_STYLES: Record<SageTicketStatus, { badge: string; dot: string; label: string }> = {
  open:        { badge: 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400', dot: 'bg-purple-400',  label: 'Open' },
  in_progress: { badge: 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400',     dot: 'bg-green-400',   label: 'In Progress' },
  pending:     { badge: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',     dot: 'bg-amber-400',   label: 'Pending' },
  resolved:    { badge: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',         dot: 'bg-blue-400',    label: 'Resolved' },
  closed:      { badge: 'bg-gray-100 text-gray-600 dark:bg-white/8 dark:text-gray-400',            dot: 'bg-gray-400',    label: 'Closed' },
}

const PRIORITY_STYLES: Record<string, { badge: string; label: string }> = {
  urgent: { badge: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',           label: 'Urgent' },
  high:   { badge: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400', label: 'High' },
  medium: { badge: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',   label: 'Medium' },
  low:    { badge: 'bg-gray-100 text-gray-600 dark:bg-white/8 dark:text-gray-400',           label: 'Low' },
}

const ACTIVITY_META: Record<TicketActivityType, { Icon: React.ElementType; color: string; label: string }> = {
  note:    { Icon: FileText,    color: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10',       label: 'Note' },
  call:    { Icon: Phone,       color: 'text-green-500 bg-green-50 dark:bg-green-500/10',    label: 'Call' },
  meeting: { Icon: Users,       color: 'text-purple-500 bg-purple-50 dark:bg-purple-500/10', label: 'Meeting' },
  task:    { Icon: CheckSquare, color: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10',    label: 'Task' },
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  ticket:     TicketWithContact
  allTickets: TicketWithContact[]
  activities: SageTicketActivity[]
  callerRole?: string
  members?:   WorkspaceMemberSummary[]
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TicketDetailClient({ ticket, allTickets, activities: initialActivities, callerRole, members = [] }: Props) {
  const router   = useRouter()
  const readonly = callerRole === 'viewer'

  // Left panel state
  const [search,     setSearch]     = useState('')
  const [leftFilter, setLeftFilter] = useState<string>('all')
  const [leftCollapsed, setLeftCollapsed] = useState(false)

  // Center state
  const [activities,   setActivities]   = useState<SageTicketActivity[]>(initialActivities)
  const [actType,      setActType]      = useState<TicketActivityType>('note')
  const [actTitle,     setActTitle]     = useState('')
  const [actBody,      setActBody]      = useState('')
  const [actDue,       setActDue]       = useState('')
  const [logPending,   startLog]        = useTransition()

  // Right panel — ticket card state
  const [localStatus,   setLocalStatus]   = useState<SageTicketStatus>(ticket.status)
  const [localPriority, setLocalPriority] = useState<string>(ticket.priority ?? 'medium')
  const [editingContact, setEditingContact] = useState(false)
  const [editName,  setEditName]  = useState(ticket.name ?? ticket.contact?.name ?? '')
  const [editEmail, setEditEmail] = useState(ticket.email ?? ticket.contact?.email ?? '')
  const [editPhone, setEditPhone] = useState(ticket.phone ?? '')
  const [savingContact, setSavingContact] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)

  // AI summary state
  const [aiSummary,  setAiSummary]  = useState<string | null>(null)
  const [aiPending,  startAi]       = useTransition()
  const [aiError,    setAiError]    = useState<string | null>(null)

  // Reset contact edit fields when ticket changes
  useEffect(() => {
    setEditName(ticket.name ?? ticket.contact?.name ?? '')
    setEditEmail(ticket.email ?? ticket.contact?.email ?? '')
    setEditPhone(ticket.phone ?? '')
    setLocalStatus(ticket.status)
    setLocalPriority(ticket.priority ?? 'medium')
    setAiSummary(null)
    setAiError(null)
  }, [ticket.id])

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleGenerateAi() {
    setAiError(null)
    startAi(async () => {
      const res = await analyzeTicket(ticket.id)
      if ('error' in res) setAiError(res.error)
      else setAiSummary(res.summary)
    })
  }

  async function handleStatusChange(status: SageTicketStatus) {
    setLocalStatus(status)
    void updateTicketStatus(ticket.id, status)
  }

  async function handlePriorityChange(priority: string) {
    setLocalPriority(priority)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    void updateTicketPriority(ticket.id, priority as any)
  }

  async function handleLogActivity() {
    if (!actBody.trim() && !actTitle.trim()) return
    startLog(async () => {
      await addTicketActivity(ticket.id, actType, actTitle || undefined, actBody || undefined, actDue || undefined)
      setActTitle(''); setActBody(''); setActDue('')
      router.refresh()
    })
  }

  async function handleCompleteTask(activityId: string) {
    await completeTicketTask(activityId)
    setActivities(prev => prev.map(a => a.id === activityId ? { ...a, completed_at: new Date().toISOString() } : a))
  }

  async function handleSaveContact() {
    setSavingContact(true)
    await updateTicketContactInfo(ticket.id, {
      name:  editName.trim()  || null,
      email: editEmail.trim() || null,
      phone: editPhone.trim() || null,
    })
    setSavingContact(false)
    setEditingContact(false)
    router.refresh()
  }

  // ── Derived ─────────────────────────────────────────────────────────────────

  const customerEmail = ticket.email ?? ticket.contact?.email ?? null
  const customerName  = ticket.name  ?? ticket.contact?.name  ?? null

  const filteredList = allTickets.filter(t => {
    const matchFilter = leftFilter === 'all' || t.status === leftFilter
    const q = search.toLowerCase()
    const matchSearch = !q || t.title.toLowerCase().includes(q) ||
      (t.name ?? t.contact?.name ?? '').toLowerCase().includes(q)
    return matchFilter && matchSearch
  })

  const openTasks = activities.filter(a => a.type === 'task' && !a.completed_at)
  const upcomingActivities = activities.filter(a => a.due_at && !a.completed_at)

  const priorityStyle = PRIORITY_STYLES[localPriority] ?? PRIORITY_STYLES.low
  const statusStyle   = STATUS_STYLES[localStatus]
  const source        = ticket.contact_method === 'email' ? 'Email' : 'Bot'

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden bg-[#f5f4f1] dark:bg-[#181818]">

      {/* ══ LEFT PANEL — ticket list ══════════════════════════════════════════ */}
      <div className={cn(
        'flex flex-col bg-white dark:bg-[#1c1c1c] border-r border-gray-200 dark:border-white/8 shrink-0 transition-all duration-200',
        leftCollapsed ? 'w-10' : 'w-64',
      )}>
        {leftCollapsed ? (
          <button
            onClick={() => setLeftCollapsed(false)}
            className="flex items-center justify-center h-12 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            title="Expand ticket list"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <>
            {/* Left header */}
            <div className="px-3 pt-3 pb-2 border-b border-gray-100 dark:border-white/8 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <Link
                  href="/dashboard/sage/tickets"
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" />
                  All Tickets
                </Link>
                <button
                  onClick={() => setLeftCollapsed(true)}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/8 transition-colors"
                  title="Collapse"
                >
                  <ChevronLeft className="w-3 h-3 text-gray-400" />
                </button>
              </div>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search tickets…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-6 pr-2.5 py-1.5 text-xs border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/40"
                />
              </div>
              {/* Status filters */}
              <div className="flex flex-wrap gap-1 mt-2">
                {['all', 'open', 'in_progress', 'pending', 'resolved', 'closed'].map(f => (
                  <button
                    key={f}
                    onClick={() => setLeftFilter(f)}
                    className={cn(
                      'px-2 py-0.5 text-[10px] font-medium rounded-full transition-colors',
                      leftFilter === f
                        ? 'bg-[#15A4AE] text-white'
                        : 'bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/12',
                    )}
                  >
                    {f === 'all' ? 'All' : f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Ticket list */}
            <div className="flex-1 overflow-y-auto">
              {filteredList.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-8 px-3">No tickets found</p>
              ) : (
                filteredList.map(t => {
                  const ss = STATUS_STYLES[t.status as SageTicketStatus]
                  const isActive = t.id === ticket.id
                  return (
                    <button
                      key={t.id}
                      onClick={() => router.push(`/dashboard/sage/tickets/${t.id}`)}
                      className={cn(
                        'w-full text-left px-3 py-2.5 border-b border-gray-50 dark:border-white/5 transition-colors',
                        isActive
                          ? 'bg-[#15A4AE]/8 dark:bg-[#15A4AE]/10 border-l-2 border-l-[#15A4AE]'
                          : 'hover:bg-gray-50 dark:hover:bg-white/3',
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0 mt-1.5', ss?.dot ?? 'bg-gray-300')} />
                        <div className="min-w-0 flex-1">
                          <p className={cn('text-xs font-medium truncate leading-snug', isActive ? 'text-[#1f6157] dark:text-[#15A4AE]' : 'text-gray-800 dark:text-gray-200')}>
                            {t.title}
                          </p>
                          <p className="text-[10px] text-gray-400 truncate mt-0.5">
                            {t.name ?? t.contact?.name ?? 'Unknown'}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(t.created_at)}</p>
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </>
        )}
      </div>

      {/* ══ CENTER PANEL — ticket details ════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Center header */}
        <div className="px-6 py-4 bg-white dark:bg-[#1c1c1c] border-b border-gray-200 dark:border-white/8 shrink-0">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                {/* Priority select */}
                <select
                  value={localPriority}
                  onChange={e => handlePriorityChange(e.target.value)}
                  disabled={readonly}
                  className={cn(
                    'text-[10px] font-semibold px-2 py-0.5 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 disabled:cursor-default',
                    priorityStyle.badge,
                  )}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', statusStyle.badge)}>
                  {statusStyle.label}
                </span>
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {timeAgo(ticket.created_at)}
                </span>
                {source && (
                  <span className="text-[10px] text-gray-400">via {source}</span>
                )}
              </div>
              <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100 leading-snug">
                {ticket.title}
              </h1>
              {customerName && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{customerName}</p>
              )}
            </div>
          </div>
        </div>

        {/* Center body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Description */}
          {ticket.description && (
            <div className="bg-white dark:bg-[#232323] rounded-xl border border-gray-200 dark:border-white/8 p-5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">Description</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
            </div>
          )}

          {/* Log activity form */}
          {!readonly && (
            <div className="bg-white dark:bg-[#232323] rounded-xl border border-gray-200 dark:border-white/8 p-5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">Log Activity</p>

              {/* Type selector */}
              <div className="flex gap-1 p-1 bg-gray-100 dark:bg-white/5 rounded-xl mb-3">
                {(Object.keys(ACTIVITY_META) as TicketActivityType[]).map(t => {
                  const { Icon, label } = ACTIVITY_META[t]
                  return (
                    <button
                      key={t}
                      onClick={() => setActType(t)}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition-colors',
                        actType === t
                          ? 'bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-gray-100 shadow-sm'
                          : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
                      )}
                    >
                      <Icon className="w-3 h-3" />
                      {label}
                    </button>
                  )
                })}
              </div>

              {actType !== 'note' && (
                <input
                  type="text"
                  placeholder={actType === 'task' ? 'Task title' : actType === 'call' ? 'Call summary' : 'Meeting subject'}
                  value={actTitle}
                  onChange={e => setActTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/50 mb-3"
                />
              )}

              <textarea
                rows={3}
                placeholder={actType === 'note' ? 'Write a note — what was done, next steps...' : 'Details / resolution notes...'}
                value={actBody}
                onChange={e => setActBody(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/50 resize-none mb-3"
              />

              {actType === 'task' && (
                <input
                  type="datetime-local"
                  value={actDue}
                  onChange={e => setActDue(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/50 mb-3"
                />
              )}

              <button
                onClick={() => void handleLogActivity()}
                disabled={logPending || (!actBody.trim() && !actTitle.trim())}
                className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-[#15A4AE] hover:bg-[#1290a0] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {logPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Log {ACTIVITY_META[actType].label}
              </button>
            </div>
          )}

          {/* Activity timeline */}
          <div className="bg-white dark:bg-[#232323] rounded-xl border border-gray-200 dark:border-white/8 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-4">Activity History</p>

            {activities.length === 0 ? (
              <p className="text-sm text-gray-400 italic text-center py-6">No activity yet.</p>
            ) : (
              <div className="space-y-4">
                {activities.map(act => {
                  const meta = ACTIVITY_META[act.type]
                  const Icon = meta.Icon
                  const isTask      = act.type === 'task'
                  const isCompleted = !!act.completed_at
                  return (
                    <div key={act.id} className="flex gap-3">
                      <div className={cn('w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5', meta.color)}>
                        {isCompleted ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        {act.title && (
                          <p className={cn('text-sm font-medium', isCompleted ? 'line-through text-gray-400' : 'text-gray-900 dark:text-gray-100')}>
                            {act.title}
                          </p>
                        )}
                        {act.body && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 leading-relaxed whitespace-pre-wrap">{act.body}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-gray-400">{timeAgo(act.created_at)}</span>
                          {act.due_at && !isCompleted && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              Due {new Date(act.due_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                          {isTask && !isCompleted && !readonly && (
                            <button
                              onClick={() => void handleCompleteTask(act.id)}
                              className="text-[10px] text-[#3a9e8a] dark:text-[#15A4AE] hover:underline"
                            >
                              Mark done
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ══ RIGHT PANEL — AI + ticket card + customer ════════════════════════ */}
      <div className="w-72 shrink-0 flex flex-col bg-[#f5f4f1] dark:bg-[#181818] border-l border-gray-200 dark:border-white/8 overflow-y-auto">
        <div className="p-4 space-y-4">

          {/* AI Summary */}
          <div className="bg-white dark:bg-[#232323] rounded-xl border border-gray-200 dark:border-white/8">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-white/8 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#15A4AE]" />
                <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">AI Summary</span>
              </div>
              <button
                onClick={handleGenerateAi}
                disabled={aiPending}
                className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
              >
                {aiPending
                  ? <><Loader2 className="w-2.5 h-2.5 animate-spin" /> Analysing…</>
                  : aiSummary
                    ? <><RefreshCw className="w-2.5 h-2.5" /> Re-analyse</>
                    : <><Sparkles className="w-2.5 h-2.5" /> Generate</>
                }
              </button>
            </div>
            <div className="px-4 py-3">
              {aiError && <p className="text-xs text-red-500">{aiError}</p>}
              {!aiError && !aiSummary && !aiPending && (
                <p className="text-xs text-gray-400 italic">Click Generate to have AI summarise this ticket.</p>
              )}
              {aiPending && !aiSummary && (
                <p className="text-xs text-gray-400 italic">Generating summary…</p>
              )}
              {aiSummary && (
                <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{aiSummary}</p>
              )}
            </div>
          </div>

          {/* Ticket Card — status flow */}
          <div className="bg-white dark:bg-[#232323] rounded-xl border border-gray-200 dark:border-white/8 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2.5">Status</p>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_FLOW.map(s => {
                const ss = STATUS_STYLES[s]
                return (
                  <button
                    key={s}
                    onClick={() => !readonly && void handleStatusChange(s)}
                    disabled={readonly}
                    className={cn(
                      'px-2.5 py-1 text-[10px] font-medium rounded-lg border transition-colors',
                      localStatus === s
                        ? `${ss.badge} border-current`
                        : 'border-gray-200 dark:border-white/10 text-gray-400 dark:text-gray-500 hover:border-gray-300 dark:hover:border-white/20 hover:text-gray-600 dark:hover:text-gray-300 disabled:cursor-default',
                    )}
                  >
                    {ss.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Open Tasks */}
          {openTasks.length > 0 && (
            <div className="bg-white dark:bg-[#232323] rounded-xl border border-gray-200 dark:border-white/8 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2.5">
                Action To-Do ({openTasks.length})
              </p>
              <div className="space-y-2">
                {openTasks.map(task => (
                  <div key={task.id} className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded border-2 border-amber-300 dark:border-amber-500/50 shrink-0 mt-0.5 flex items-center justify-center">
                      <CheckSquare className="w-2.5 h-2.5 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {task.title && <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{task.title}</p>}
                      {task.body  && <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">{task.body}</p>}
                      {!readonly && (
                        <button
                          onClick={() => void handleCompleteTask(task.id)}
                          className="text-[10px] text-[#15A4AE] hover:underline mt-0.5"
                        >
                          Mark done
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Follow-up card */}
          {upcomingActivities.length > 0 && (
            <div className="bg-white dark:bg-[#232323] rounded-xl border border-gray-200 dark:border-white/8 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2.5">
                Follow-up ({upcomingActivities.length})
              </p>
              <div className="space-y-2">
                {upcomingActivities.map(act => {
                  const meta = ACTIVITY_META[act.type]
                  const Icon = meta.Icon
                  return (
                    <div key={act.id} className="flex items-start gap-2">
                      <div className={cn('w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5', meta.color)}>
                        <Icon className="w-2.5 h-2.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {act.title && <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{act.title}</p>}
                        {act.due_at && (
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(act.due_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Customer Details */}
          <div className="bg-white dark:bg-[#232323] rounded-xl border border-gray-200 dark:border-white/8 p-4">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Customer</p>
              {!readonly && !editingContact && (
                <button
                  onClick={() => setEditingContact(true)}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/8 transition-colors"
                >
                  <Pencil className="w-3 h-3 text-gray-400" />
                </button>
              )}
            </div>

            {editingContact ? (
              <div className="space-y-2">
                <input type="text" placeholder="Name" value={editName} onChange={e => setEditName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/50" />
                <input type="email" placeholder="Email" value={editEmail} onChange={e => setEditEmail(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/50" />
                <input type="tel" placeholder="Phone" value={editPhone} onChange={e => setEditPhone(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/50" />
                <div className="flex gap-2 pt-1">
                  <button onClick={() => void handleSaveContact()} disabled={savingContact}
                    className="flex-1 py-1.5 text-xs font-medium rounded-lg bg-[#15A4AE] hover:bg-[#1290a0] text-white transition-colors disabled:opacity-50">
                    {savingContact ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={() => setEditingContact(false)}
                    className="flex-1 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#15A4AE]/10 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-[#15A4AE]" />
                </div>
                <div className="space-y-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {customerName ?? <span className="text-gray-400 italic text-xs">No name</span>}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 truncate">
                    <Mail className="w-3 h-3 shrink-0" />
                    {customerEmail ?? <span className="italic text-gray-400">No email</span>}
                  </p>
                  {ticket.phone && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                      <Phone className="w-3 h-3 shrink-0" />
                      {ticket.phone}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Email reply */}
          {customerEmail && (
            <button
              onClick={() => setShowEmailModal(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl border border-[#15A4AE]/40 text-[#3a9e8a] dark:text-[#15A4AE] hover:bg-[#15A4AE]/8 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              Reply via Email
            </button>
          )}

        </div>
      </div>

      {/* Email compose modal */}
      {showEmailModal && customerEmail && (
        <EmailComposeModal
          to={customerEmail}
          toName={customerName ?? undefined}
          subject={`Re: ${ticket.title}`}
          context={[
            `Ticket: ${ticket.title}`,
            ticket.description ? `Details: ${ticket.description}` : '',
            `Status: ${localStatus} · Priority: ${localPriority}`,
          ].filter(Boolean).join('\n')}
          onClose={() => setShowEmailModal(false)}
        />
      )}
    </div>
  )
}
