'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  X, FileText, Phone, Users, CheckSquare,
  User, Mail, Clock, Bot, Loader2, Ticket as TicketIcon, Check, Pencil,
} from 'lucide-react'
import {
  addTicketActivity, getTicketActivities, completeTicketTask,
  type TicketActivityType,
} from '@/app/actions/sage-tickets'
import { updateTicketStatus, updateTicketContactInfo } from '@/app/actions/sage'
import { timeAgo, cn } from '@/lib/utils'
import type { SageTicket, SageContact, SageTicketStatus, SageTicketActivity } from '@/lib/types'

type TicketWithContact = SageTicket & {
  contact: Pick<SageContact, 'id' | 'name' | 'email'> | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_FLOW: SageTicketStatus[] = ['open', 'in_progress', 'pending', 'resolved', 'closed']

const STATUS_STYLES: Record<SageTicketStatus, { badge: string; label: string }> = {
  open:        { badge: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',      label: 'Open' },
  in_progress: { badge: 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400', label: 'In Progress' },
  pending:     { badge: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',   label: 'Pending' },
  resolved:    { badge: 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400',   label: 'Resolved' },
  closed:      { badge: 'bg-gray-100 text-gray-600 dark:bg-white/8 dark:text-gray-400',          label: 'Closed' },
}

const PRIORITY_STYLES: Record<string, { badge: string; label: string }> = {
  urgent: { badge: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',          label: 'Urgent' },
  high:   { badge: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400', label: 'High' },
  medium: { badge: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',  label: 'Medium' },
  low:    { badge: 'bg-gray-100 text-gray-600 dark:bg-white/8 dark:text-gray-400',          label: 'Low' },
}

const ACTIVITY_META: Record<TicketActivityType, { Icon: React.ElementType; color: string; label: string }> = {
  note:    { Icon: FileText,    color: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10',     label: 'Note' },
  call:    { Icon: Phone,       color: 'text-green-500 bg-green-50 dark:bg-green-500/10',  label: 'Call' },
  meeting: { Icon: Users,       color: 'text-purple-500 bg-purple-50 dark:bg-purple-500/10', label: 'Meeting' },
  task:    { Icon: CheckSquare, color: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10',  label: 'Task' },
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  ticket:           TicketWithContact | null
  onClose:          () => void
  onStatusChanged?: (ticketId: string, status: SageTicketStatus) => void
}

export function TicketSlideOver({ ticket, onClose, onStatusChanged }: Props) {
  const router = useRouter()
  const [tab,          setTab]          = useState<'overview' | 'activity'>('overview')
  const [localStatus,  setLocalStatus]  = useState<SageTicketStatus>('open')
  const [activities,   setActivities]   = useState<SageTicketActivity[]>([])
  const [actType,      setActType]      = useState<TicketActivityType>('note')
  const [actTitle,     setActTitle]     = useState('')
  const [actBody,      setActBody]      = useState('')
  const [actDue,       setActDue]       = useState('')
  const [loadingActs,  setLoadingActs]  = useState(false)
  const [isPending,    startTransition] = useTransition()
  const [editingContact, setEditingContact] = useState(false)
  const [editName,  setEditName]  = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [savingContact, setSavingContact] = useState(false)

  // Reset when ticket changes
  useEffect(() => {
    if (!ticket) return
    setLocalStatus(ticket.status)
    setTab('overview')
    setActTitle(''); setActBody(''); setActDue('')
  }, [ticket?.id])

  // Load activities when switching to activity tab
  useEffect(() => {
    if (tab === 'activity' && ticket) void loadActivities()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, ticket?.id])

  async function loadActivities() {
    if (!ticket) return
    setLoadingActs(true)
    const data = await getTicketActivities(ticket.id)
    setActivities(data)
    setLoadingActs(false)
  }

  async function handleStatusChange(status: SageTicketStatus) {
    if (!ticket) return
    setLocalStatus(status)
    onStatusChanged?.(ticket.id, status)
    await updateTicketStatus(ticket.id, status)
    router.refresh()
  }

  async function handleLogActivity() {
    if (!ticket || (!actBody.trim() && !actTitle.trim())) return
    startTransition(async () => {
      await addTicketActivity(ticket.id, actType, actTitle || undefined, actBody || undefined, actDue || undefined)
      setActTitle(''); setActBody(''); setActDue('')
      await loadActivities()
    })
  }

  async function handleCompleteTask(activityId: string) {
    await completeTicketTask(activityId)
    await loadActivities()
  }

  if (!ticket) return null

  const priorityStyle = PRIORITY_STYLES[ticket.priority] ?? PRIORITY_STYLES.low
  const statusStyle   = STATUS_STYLES[localStatus]
  const source        = ticket.contact_method === 'email' ? 'Email' : 'Bot'

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-[520px] flex flex-col bg-white dark:bg-[#1e1e1e] border-l border-gray-200 dark:border-white/10 shadow-2xl">

        {/* ── Header ── */}
        <div className="px-6 pt-5 pb-0 border-b dark:border-white/8 shrink-0">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0 flex-1">
              {/* Badges row */}
              <div className="flex items-center gap-1.5 mb-2">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${priorityStyle.badge}`}>
                  {priorityStyle.label}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusStyle.badge}`}>
                  {statusStyle.label}
                </span>
              </div>
              {/* Contact name */}
              {ticket.contact && (
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                  {ticket.contact.name}
                  {ticket.contact.email && (
                    <span className="font-normal text-gray-400 ml-1.5">{ticket.contact.email}</span>
                  )}
                </p>
              )}
              {/* Ticket title */}
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-0.5 leading-snug">
                {ticket.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8 transition-colors mt-0.5"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-0">
            {(['overview', 'activity'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'px-4 py-2 text-xs font-medium border-b-2 transition-colors capitalize',
                  tab === t
                    ? 'border-[#61c2ad] text-[#3a9e8a] dark:text-[#61c2ad]'
                    : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Overview Tab ── */}
          {tab === 'overview' && (
            <div className="p-6 space-y-5">

              {/* Status flow */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
                  Status
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_FLOW.map(s => {
                    const ss = STATUS_STYLES[s]
                    return (
                      <button
                        key={s}
                        onClick={() => void handleStatusChange(s)}
                        className={cn(
                          'px-3 py-1 text-xs font-medium rounded-lg border transition-colors',
                          localStatus === s
                            ? `${ss.badge} border-current`
                            : 'border-gray-200 dark:border-white/10 text-gray-400 dark:text-gray-500 hover:border-gray-300 dark:hover:border-white/20 hover:text-gray-600 dark:hover:text-gray-300',
                        )}
                      >
                        {ss.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Contact info card */}
              <div className="p-3.5 rounded-xl border border-gray-100 dark:border-white/8 bg-gray-50 dark:bg-white/3">
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    Contact Info
                  </p>
                  {!editingContact && (
                    <button
                      onClick={() => {
                        setEditName(ticket.name ?? ticket.contact?.name ?? '')
                        setEditEmail(ticket.email ?? ticket.contact?.email ?? '')
                        setEditPhone(ticket.phone ?? '')
                        setEditingContact(true)
                      }}
                      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                      title="Edit contact info"
                    >
                      <Pencil className="w-3 h-3 text-gray-400" />
                    </button>
                  )}
                </div>

                {editingContact ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Name"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#61c2ad]/50"
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={editEmail}
                      onChange={e => setEditEmail(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#61c2ad]/50"
                    />
                    <input
                      type="tel"
                      placeholder="Phone"
                      value={editPhone}
                      onChange={e => setEditPhone(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#61c2ad]/50"
                    />
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={async () => {
                          setSavingContact(true)
                          await updateTicketContactInfo(ticket.id, {
                            name:  editName.trim()  || null,
                            email: editEmail.trim() || null,
                            phone: editPhone.trim() || null,
                          })
                          ticket.name  = editName.trim()  || null
                          ticket.email = editEmail.trim() || null
                          ticket.phone = editPhone.trim() || null
                          setSavingContact(false)
                          setEditingContact(false)
                          router.refresh()
                        }}
                        disabled={savingContact}
                        className="flex-1 py-1.5 text-xs font-medium rounded-lg bg-brand-600 hover:bg-brand-700 text-white transition-colors disabled:opacity-50"
                      >
                        {savingContact ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingContact(false)}
                        className="flex-1 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-[#61c2ad]/10 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-4 h-4 text-brand-600 dark:text-[#61c2ad]" />
                    </div>
                    <div className="space-y-1 min-w-0">
                      {(ticket.name ?? ticket.contact?.name) ? (
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {ticket.name ?? ticket.contact?.name}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400 italic">No name</p>
                      )}
                      {(ticket.email ?? ticket.contact?.email) ? (
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                          <Mail className="w-3 h-3 shrink-0" />
                          {ticket.email ?? ticket.contact?.email}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400 italic flex items-center gap-1.5"><Mail className="w-3 h-3 shrink-0" />No email</p>
                      )}
                      {ticket.phone ? (
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                          <Phone className="w-3 h-3 shrink-0" />
                          {ticket.phone}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400 italic flex items-center gap-1.5"><Phone className="w-3 h-3 shrink-0" />No phone</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              {ticket.description && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
                    Description
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap bg-gray-50 dark:bg-white/3 rounded-xl px-4 py-3 border dark:border-white/5">
                    {ticket.description}
                  </p>
                </div>
              )}

              {/* Meta grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-gray-100 dark:border-white/8 bg-gray-50 dark:bg-white/2">
                  <p className="text-[10px] text-gray-400 mb-1">Source</p>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    {source === 'Email'
                      ? <Mail className="w-3 h-3" />
                      : <Bot className="w-3 h-3" />
                    }
                    via {source}
                  </p>
                </div>
                <div className="p-3 rounded-xl border border-gray-100 dark:border-white/8 bg-gray-50 dark:bg-white/2">
                  <p className="text-[10px] text-gray-400 mb-1">Opened</p>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    {timeAgo(ticket.created_at)}
                  </p>
                </div>
                {ticket.occurred_at && (
                  <div className="p-3 rounded-xl border border-gray-100 dark:border-white/8 bg-gray-50 dark:bg-white/2 col-span-2">
                    <p className="text-[10px] text-gray-400 mb-1">Issue occurred</p>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      {new Date(ticket.occurred_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ── Activity Tab ── */}
          {tab === 'activity' && (
            <div className="p-6 space-y-4">

              {/* Type selector */}
              <div className="flex gap-1 p-1 bg-gray-100 dark:bg-white/5 rounded-xl">
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

              {/* Title (non-note) */}
              {actType !== 'note' && (
                <input
                  type="text"
                  placeholder={
                    actType === 'task'    ? 'Task title'      :
                    actType === 'call'    ? 'Call summary'    :
                    'Meeting subject'
                  }
                  value={actTitle}
                  onChange={e => setActTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#61c2ad]/50"
                />
              )}

              {/* Body */}
              <textarea
                rows={3}
                placeholder={
                  actType === 'note'
                    ? 'Write a note — what was done, what was said, next steps...'
                    : 'Details / resolution notes...'
                }
                value={actBody}
                onChange={e => setActBody(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#61c2ad]/50 resize-none"
              />

              {/* Due date (tasks only) */}
              {actType === 'task' && (
                <input
                  type="datetime-local"
                  value={actDue}
                  onChange={e => setActDue(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#61c2ad]/50"
                />
              )}

              <button
                onClick={() => void handleLogActivity()}
                disabled={isPending || (!actBody.trim() && !actTitle.trim())}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-brand-600 hover:bg-brand-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Log {ACTIVITY_META[actType].label}
              </button>

              {/* Timeline */}
              <div className="pt-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">
                  History
                </p>

                {loadingActs ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-300" />
                  </div>
                ) : activities.length === 0 ? (
                  <div className="text-center py-10">
                    <TicketIcon className="w-6 h-6 text-gray-200 dark:text-gray-700 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">No activity yet. Log your first action above.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
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
                              <p className={cn('text-xs font-medium', isCompleted ? 'line-through text-gray-400' : 'text-gray-900 dark:text-gray-100')}>
                                {act.title}
                              </p>
                            )}
                            {act.body && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 leading-relaxed whitespace-pre-wrap">
                                {act.body}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[10px] text-gray-400">{timeAgo(act.created_at)}</span>
                              {act.due_at && !isCompleted && (
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" />
                                  Due {new Date(act.due_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                              {isTask && !isCompleted && (
                                <button
                                  onClick={() => void handleCompleteTask(act.id)}
                                  className="text-[10px] text-[#3a9e8a] dark:text-[#61c2ad] hover:underline"
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
          )}
        </div>
      </div>
    </>
  )
}
