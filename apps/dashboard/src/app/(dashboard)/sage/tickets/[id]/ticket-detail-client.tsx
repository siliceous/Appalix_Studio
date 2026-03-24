'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Search, Sparkles, RefreshCw, Loader2, User, Mail, Phone,
  Clock, Send, FileText, Users, CheckSquare, Check, Pencil,
  ChevronLeft, ChevronRight, Download, Trash2, Building2, Tag,
  Bell, AlertCircle, ExternalLink, Lock, ChevronDown,
} from 'lucide-react'
import { EmailComposeModal } from '@/components/dashboard/email-compose-modal'
import {
  addTicketActivity, completeTicketTask, analyzeTicket,
  type TicketActivityType,
} from '@/app/actions/sage-tickets'
import { updateTicketStatus, updateTicketPriority, updateTicketContactInfo, updateTicketDetails, deleteTicket, renameTicket, assignTicket } from '@/app/actions/sage'
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
  urgent: { badge: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',                         label: 'Urgent' },
  high:   { badge: 'bg-[#15A4AE]/10 text-[#15A4AE] dark:bg-[#15A4AE]/10 dark:text-[#15A4AE] border border-[#15A4AE]/30', label: 'High' },
  medium: { badge: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',                label: 'Medium' },
  low:    { badge: 'bg-gray-100 text-gray-600 dark:bg-white/8 dark:text-gray-400',                       label: 'Low' },
}

const ACTIVITY_META: Record<TicketActivityType, { Icon: React.ElementType; color: string; label: string }> = {
  note:    { Icon: FileText,    color: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10',        label: 'Note' },
  call:    { Icon: Phone,       color: 'text-green-500 bg-green-50 dark:bg-green-500/10',     label: 'Call' },
  meeting: { Icon: Users,       color: 'text-purple-500 bg-purple-50 dark:bg-purple-500/10',  label: 'Meeting' },
  task:    { Icon: CheckSquare, color: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10',     label: 'Task' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function daysSince(iso: string | null | undefined): number {
  if (!iso) return 0
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

function groupActivitiesByDate(acts: SageTicketActivity[]) {
  const now  = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay())
  const buckets: Record<string, SageTicketActivity[]> = { Today: [], 'This Week': [], Earlier: [] }
  for (const a of acts) {
    const day = new Date(new Date(a.created_at).getFullYear(), new Date(a.created_at).getMonth(), new Date(a.created_at).getDate())
    if (day >= today) buckets['Today'].push(a)
    else if (day >= weekStart) buckets['This Week'].push(a)
    else buckets['Earlier'].push(a)
  }
  return (['Today', 'This Week', 'Earlier'] as const)
    .filter(l => buckets[l].length > 0)
    .map(label => ({ label, items: buckets[label] }))
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

  // Left panel
  const [search,        setSearch]        = useState('')
  const [leftFilter,    setLeftFilter]    = useState<string>('all')
  const [leftCollapsed, setLeftCollapsed] = useState(false)

  // Top bar
  const [localStatus,   setLocalStatus]   = useState<SageTicketStatus>(ticket.status)
  const [localPriority, setLocalPriority] = useState<string>(ticket.priority ?? 'medium')
  const [localAssignee, setLocalAssignee] = useState<string>(ticket.owner_id ?? '')

  // Center
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [aiPending, startAi]      = useTransition()
  const [aiError,   setAiError]   = useState<string | null>(null)

  // Right panel — customer edit
  const [editingContact, setEditingContact] = useState(false)
  const [editName,  setEditName]  = useState(ticket.name ?? ticket.contact?.name ?? '')
  const [editEmail, setEditEmail] = useState(ticket.email ?? ticket.contact?.email ?? '')
  const [editPhone, setEditPhone] = useState(ticket.phone ?? '')
  const [savingContact, setSavingContact] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)

  // Right panel — activity
  const [activities, setActivities] = useState<SageTicketActivity[]>(initialActivities)
  const [actType,    setActType]    = useState<TicketActivityType>('note')
  const [actTitle,   setActTitle]   = useState('')
  const [actBody,    setActBody]    = useState('')
  const [actDue,     setActDue]     = useState('')
  const [logPending, startLog]      = useTransition()

  // Right panel — tabs + edit form
  const [rightTab,         setRightTab]         = useState<'overview' | 'activity'>('overview')
  const [showEditForm,     setShowEditForm]     = useState(false)
  const [editSaving,       setEditSaving]       = useState(false)
  const [confirmDelete,    setConfirmDelete]    = useState(false)
  const [deleting,         setDeleting]         = useState(false)
  const [showAddForm,      setShowAddForm]      = useState(false)
  const [showTypeMenu,     setShowTypeMenu]     = useState(false)
  const [showReminderForm, setShowReminderForm] = useState(false)
  const [reminderTitle,    setReminderTitle]    = useState('')
  const [reminderNote,     setReminderNote]     = useState('')
  const [reminderDue,      setReminderDue]      = useState('')
  const [reminderType,     setReminderType]     = useState<TicketActivityType>('call')
  const [reminderSaving,   setReminderSaving]   = useState(false)
  const [reminderSaved,    setReminderSaved]    = useState(false)

  useEffect(() => {
    setLocalStatus(ticket.status)
    setLocalPriority(ticket.priority ?? 'medium')
    setLocalAssignee(ticket.owner_id ?? '')
    setEditName(ticket.name ?? ticket.contact?.name ?? '')
    setEditEmail(ticket.email ?? ticket.contact?.email ?? '')
    setEditPhone(ticket.phone ?? '')
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

  async function handleStatusChange(val: SageTicketStatus) {
    setLocalStatus(val)
    void updateTicketStatus(ticket.id, val)
  }

  async function handlePriorityChange(val: string) {
    setLocalPriority(val)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    void updateTicketPriority(ticket.id, val as any)
  }

  async function handleAssigneeChange(val: string) {
    setLocalAssignee(val)
    void assignTicket(ticket.id, val || null)
  }

  function handleRename() {
    const newTitle = window.prompt('Rename ticket:', ticket.title)
    if (!newTitle || newTitle.trim() === ticket.title) return
    renameTicket(ticket.id, newTitle.trim()).then(() => router.refresh())
  }

  function handleDownload() {
    const data = JSON.stringify({
      title: ticket.title, name: ticket.name, email: ticket.email,
      phone: ticket.phone, status: localStatus, priority: localPriority,
      description: ticket.description, created_at: ticket.created_at,
    }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `ticket_${ticket.id.slice(0, 6)}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  async function handleDelete() {
    if (!window.confirm('Delete this ticket? This cannot be undone.')) return
    await deleteTicket(ticket.id)
    router.push('/sage/tickets')
  }

  async function handleLogActivity() {
    if (!actBody.trim() && !actTitle.trim()) return
    startLog(async () => {
      await addTicketActivity(ticket.id, actType, actTitle || undefined, actBody || undefined, actDue || undefined)
      setActTitle(''); setActBody(''); setActDue('')
      setShowAddForm(false)
      router.refresh()
    })
  }

  async function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (readonly) return
    const fd = new FormData(e.currentTarget)
    const newTitle    = (fd.get('title') as string).trim()
    const newPriority = fd.get('priority') as string
    const newStatus   = fd.get('status') as SageTicketStatus
    const newDesc     = (fd.get('description') as string).trim() || null
    setEditSaving(true)
    try {
      await Promise.all([
        updateTicketDetails(ticket.id, {
          title:       newTitle || undefined,
          description: newDesc,
        }),
        newStatus   !== localStatus   ? updateTicketStatus(ticket.id, newStatus)       : Promise.resolve(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        newPriority !== localPriority ? updateTicketPriority(ticket.id, newPriority as any) : Promise.resolve(),
      ])
      if (newStatus   !== localStatus)   setLocalStatus(newStatus)
      if (newPriority !== localPriority) setLocalPriority(newPriority)
      setShowEditForm(false)
      setConfirmDelete(false)
      router.refresh()
    } finally {
      setEditSaving(false)
    }
  }

  async function handleDeleteFromEdit() {
    setDeleting(true)
    try {
      await deleteTicket(ticket.id)
      router.push('/sage/tickets')
    } catch {
      setDeleting(false)
    }
  }

  async function handleScheduleActivity() {
    if (!reminderTitle.trim() || !reminderDue) return
    setReminderSaving(true)
    const dueIso = new Date(reminderDue).toISOString()
    await addTicketActivity(ticket.id, reminderType, reminderTitle.trim(), reminderNote.trim() || undefined, dueIso)
    setReminderTitle(''); setReminderNote(''); setReminderDue('')
    setReminderSaved(true)
    setTimeout(() => { setReminderSaved(false); setShowReminderForm(false) }, 2500)
    setReminderSaving(false)
    router.refresh()
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
  const source        = ticket.external_provider
    ? ticket.external_provider.charAt(0).toUpperCase() + ticket.external_provider.slice(1)
    : ticket.contact_method === 'email' ? 'Email' : ticket.contact_method === 'phone' ? 'Phone' : 'Bot'

  const filteredList = allTickets.filter(t => {
    const matchFilter = leftFilter === 'all' || t.status === leftFilter
    const q = search.toLowerCase()
    const matchSearch = !q || t.title.toLowerCase().includes(q) ||
      (t.name ?? t.contact?.name ?? '').toLowerCase().includes(q)
    return matchFilter && matchSearch
  })

  const priorityStyle = PRIORITY_STYLES[localPriority] ?? PRIORITY_STYLES.low
  const statusStyle   = STATUS_STYLES[localStatus]

  // Info pills for the center card
  const infoPills = [
    customerName  && { icon: User,      label: 'Name',     value: customerName },
    customerEmail && { icon: Mail,      label: 'Email',    value: customerEmail },
    ticket.phone  && { icon: Phone,     label: 'Phone',    value: ticket.phone },
    source        && { icon: Tag,       label: 'Source',   value: source },
    ticket.occurred_at && { icon: Clock, label: 'Occurred', value: new Date(ticket.occurred_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
    ticket.related_url && { icon: Building2, label: 'URL', value: ticket.related_url },
  ].filter(Boolean) as { icon: React.ElementType; label: string; value: string }[]

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden w-full">

        {/* ── LEFT PANEL — ticket list ──────────────────────────────────────── */}
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
                  <Link href="/sage/tickets" className="text-xs text-gray-400 hover:text-[#15A4AE] transition-colors">← All Tickets</Link>
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
                  {['all', 'open', 'in_progress', 'pending', 'resolved', 'closed'].map(f => (
                    <button key={f} onClick={() => setLeftFilter(f)}
                      className={cn('px-2 py-0.5 text-[10px] font-medium rounded-full transition-colors',
                        leftFilter === f ? 'bg-[#15A4AE] text-white' : 'bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/12',
                      )}>
                      {f === 'all' ? 'All' : f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {filteredList.length === 0
                  ? <p className="text-xs text-gray-400 text-center py-8 px-3">No tickets found</p>
                  : filteredList.map(t => {
                    const ss = STATUS_STYLES[t.status as SageTicketStatus]
                    const isActive = t.id === ticket.id
                    return (
                      <button key={t.id} onClick={() => router.push(`/sage/tickets/${t.id}`)}
                        className={cn('w-full text-left px-3 py-2.5 border-b border-gray-50 dark:border-white/5 transition-colors',
                          isActive ? 'bg-[#15A4AE]/8 dark:bg-[#15A4AE]/10 border-l-2 border-l-[#15A4AE]' : 'hover:bg-gray-50 dark:hover:bg-white/3',
                        )}>
                        <div className="flex items-start gap-2">
                          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0 mt-1.5', ss?.dot ?? 'bg-gray-300')} />
                          <div className="min-w-0 flex-1">
                            <p className={cn('text-xs font-medium truncate leading-snug', isActive ? 'text-[#1f6157] dark:text-[#15A4AE]' : 'text-gray-800 dark:text-gray-200')}>
                              {t.title}
                            </p>
                            <p className="text-[10px] text-gray-400 truncate mt-0.5">{t.name ?? t.contact?.name ?? 'Unknown'}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(t.created_at)}</p>
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

        {/* ── CENTER PANEL ─────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#f5f4f1] dark:bg-[#181818]">

          {/* Center header */}
          <div className="shrink-0 bg-white dark:bg-[#1c1c1c] border-b border-gray-200 dark:border-white/8 px-4 py-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="min-w-0 mr-2">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate leading-tight">{ticket.title}</p>
                {customerName && <p className="text-[10px] text-gray-400 leading-tight">{customerName}</p>}
              </div>
              <select value={localPriority} onChange={e => handlePriorityChange(e.target.value)} disabled={readonly}
                className={cn('text-[10px] font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 disabled:cursor-default shrink-0', priorityStyle.badge)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <select value={localStatus} onChange={e => handleStatusChange(e.target.value as SageTicketStatus)} disabled={readonly}
                className={cn('text-[10px] font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 disabled:cursor-default shrink-0', statusStyle.badge)}>
                {STATUS_FLOW.map(s => <option key={s} value={s}>{STATUS_STYLES[s].label}</option>)}
              </select>
              {!readonly && members.length > 0 && (
                <select value={localAssignee} onChange={e => handleAssigneeChange(e.target.value)}
                  className="text-[11px] border dark:border-white/10 rounded-full px-2.5 py-0.5 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 cursor-pointer">
                  <option value="">Unassigned</option>
                  {members.map(m => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
                </select>
              )}
              <div className="flex-1" />
              <div className="flex items-center gap-1 shrink-0 border-l border-gray-200 dark:border-white/8 pl-2 ml-1">
                <Link href="/sage/tickets"
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg border border-gray-200 dark:border-white/10 transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </Link>
                <button onClick={handleDownload} title="Download"
                  className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8 rounded-lg transition-colors">
                  <Download className="w-3.5 h-3.5" />
                </button>
                {!readonly && (
                  <button onClick={handleRename} title="Rename"
                    className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8 rounded-lg transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
                {!readonly && (
                  <button onClick={() => void handleDelete()} title="Delete"
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 space-y-4">

          {/* AI Summary card */}
          <div className="bg-white dark:bg-[#232323] rounded-xl border border-gray-200 dark:border-white/8">
            <div className="px-5 py-3.5 border-b border-gray-100 dark:border-white/8 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#15A4AE]" />
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">AI Summary</span>
              </div>
              <button onClick={handleGenerateAi} disabled={aiPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50">
                {aiPending
                  ? <><Loader2 className="w-3 h-3 animate-spin" /> Analysing…</>
                  : aiSummary
                    ? <><RefreshCw className="w-3 h-3" /> Re-analyse</>
                    : <><Sparkles className="w-3 h-3" /> Generate</>
                }
              </button>
            </div>
            <div className="px-5 py-4">
              {aiError && <p className="text-xs text-red-500">{aiError}</p>}
              {!aiError && !aiSummary && !aiPending && (
                <p className="text-sm text-gray-400 italic">Click Generate to have AI summarise this ticket.</p>
              )}
              {aiPending && !aiSummary && <p className="text-sm text-gray-400 italic">Generating summary…</p>}
              {aiSummary && <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{aiSummary}</p>}

              {/* Extracted info pills */}
              {infoPills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-white/8">
                  {infoPills.map(({ icon: Icon, label, value }) => (
                    <span key={label} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300">
                      <Icon className="w-3 h-3 text-gray-400 shrink-0" />
                      <span className="text-gray-400 mr-0.5">{label}:</span>{value}
                    </span>
                  ))}
                  <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border', priorityStyle.badge)}>
                    {PRIORITY_STYLES[localPriority]?.label ?? localPriority}
                  </span>
                  <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border', statusStyle.badge)}>
                    {statusStyle.label}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Customer message / description */}
          {ticket.description && (
            <div className="bg-white dark:bg-[#232323] rounded-xl border border-gray-200 dark:border-white/8">
              <div className="px-5 py-3.5 border-b border-gray-100 dark:border-white/8">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Message from customer</p>
                <p className="text-[10px] text-gray-400 mt-0.5">via {source} · {timeAgo(ticket.created_at)}</p>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
              </div>
              {customerEmail && (
                <div className="px-5 pb-4">
                  <button onClick={() => setShowEmailModal(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border border-[#15A4AE]/40 text-[#3a9e8a] dark:text-[#15A4AE] hover:bg-[#15A4AE]/8 transition-colors">
                    <Send className="w-3.5 h-3.5" /> Reply via Email
                  </button>
                </div>
              )}
            </div>
          )}

          </div>
        </div>

        {/* ── RIGHT PANEL — deal slide-over style ──────────────────────── */}
        <div className="w-80 shrink-0 flex flex-col border-l border-gray-200 dark:border-white/8 bg-white dark:bg-[#1e1e1e] overflow-hidden">

          {/* Header */}
          <div className="px-4 pt-4 pb-0 border-b dark:border-white/8 shrink-0">
            {/* Pills row — top */}
            <div className="flex items-center gap-1.5 flex-wrap mb-3">
              {source && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">{source}</span>
              )}
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', priorityStyle.badge)}>{PRIORITY_STYLES[localPriority]?.label ?? localPriority}</span>
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', statusStyle.badge)}>{statusStyle.label}</span>
            </div>
            <div className="flex items-start gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-xl bg-[#15A4AE]/15 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-[#15A4AE]">{ticket.title.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 leading-snug line-clamp-2">{ticket.title}</p>
                {customerName && <p className="text-[10px] text-gray-400 mt-0.5 truncate">{customerName}</p>}
              </div>
              {!readonly && (
                <button
                  onClick={() => { setShowEditForm(v => !v); setConfirmDelete(false) }}
                  title="Edit ticket"
                  className={cn('p-1.5 rounded-lg transition-colors shrink-0',
                    showEditForm
                      ? 'bg-[#15A4AE]/10 text-[#15A4AE]'
                      : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8'
                  )}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {/* Tabs */}
            <div className="flex">
              {(['overview', 'activity'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setRightTab(tab)}
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

          {/* Inline edit form */}
          {showEditForm && !readonly && (
            <form onSubmit={e => void handleEditSubmit(e)} className="border-b dark:border-white/8 px-4 py-3.5 bg-gray-50 dark:bg-white/[0.02] space-y-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Edit Ticket</p>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Title</label>
                <input name="title" type="text" required defaultValue={ticket.title}
                  className="w-full px-3 py-1.5 text-xs border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Priority</label>
                  <select name="priority" defaultValue={localPriority}
                    className="w-full px-2.5 py-1.5 text-xs border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]">
                    <option value="low">Low</option><option value="medium">Medium</option>
                    <option value="high">High</option><option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Status</label>
                  <select name="status" defaultValue={localStatus}
                    className="w-full px-2.5 py-1.5 text-xs border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]">
                    {STATUS_FLOW.map(s => <option key={s} value={s}>{STATUS_STYLES[s].label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
                <textarea name="description" rows={2} defaultValue={ticket.description ?? ''} placeholder="Add description…"
                  className="w-full px-3 py-1.5 text-xs border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#15A4AE] resize-none" />
              </div>
              <div className="flex gap-2 pt-1">
                {confirmDelete ? (
                  <>
                    <span className="flex-1 text-xs text-red-600 dark:text-red-400 flex items-center">Delete this ticket?</span>
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

                {/* Ticket Created (locked) */}
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-white/[0.03] rounded-xl border dark:border-white/8">
                  <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <div className="flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Ticket Created</p>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mt-0.5" suppressHydrationWarning>{formatDateTime(ticket.created_at)}</p>
                  </div>
                  <span className="text-[10px] text-gray-300 dark:text-gray-600 italic">locked</span>
                </div>

                {/* Ticket Details grid */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">Ticket Details</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 bg-gray-50 dark:bg-white/[0.03] rounded-xl border dark:border-white/8">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-0.5">Status</p>
                      <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{statusStyle.label}</p>
                    </div>
                    <div className="p-2.5 bg-gray-50 dark:bg-white/[0.03] rounded-xl border dark:border-white/8">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-0.5">Priority</p>
                      <p className="text-xs font-medium text-gray-900 dark:text-gray-100 capitalize">{localPriority}</p>
                    </div>
                    {source && (
                      <div className="p-2.5 bg-gray-50 dark:bg-white/[0.03] rounded-xl border dark:border-white/8">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-0.5">Source</p>
                        <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{source}</p>
                      </div>
                    )}
                    {ticket.occurred_at && (
                      <div className="p-2.5 bg-gray-50 dark:bg-white/[0.03] rounded-xl border dark:border-white/8">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-0.5">Occurred</p>
                        <p className="text-xs font-medium text-gray-900 dark:text-gray-100" suppressHydrationWarning>{formatDate(ticket.occurred_at)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Assigned To — permanent section */}
                <div className="p-3 bg-gray-50 dark:bg-white/[0.03] rounded-xl border dark:border-white/8">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1.5">Assigned To</p>
                  {localAssignee && members.find(m => m.user_id === localAssignee) ? (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#15A4AE]/20 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-[#15A4AE] uppercase">
                          {(members.find(m => m.user_id === localAssignee)?.name ?? '?').charAt(0)}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-gray-900 dark:text-gray-100">
                        {members.find(m => m.user_id === localAssignee)?.name}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">Unassigned</p>
                  )}
                </div>

                {/* Contact section */}
                {(customerName || customerEmail) && (
                  <div className="rounded-xl border dark:border-white/8 overflow-hidden">
                    <div className="flex items-center gap-2.5 px-3.5 py-3 bg-gray-50 dark:bg-white/[0.03] border-b dark:border-white/8">
                      <div className="w-9 h-9 rounded-full bg-[#15A4AE]/15 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-[#15A4AE]">
                          {(customerName ?? customerEmail ?? '?').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{customerName ?? 'Unknown'}</p>
                        <p className="text-[10px] text-gray-400">Customer</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {!readonly && (
                          <button onClick={() => setEditingContact(true)}
                            className="p-1.5 text-gray-400 hover:text-[#15A4AE] hover:bg-gray-100 dark:hover:bg-white/8 rounded-lg transition-colors" title="Edit">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {ticket.contact?.id && (
                          <a href={`/sage/contacts/${ticket.contact.id}`}
                            className="p-1.5 text-gray-400 hover:text-[#15A4AE] hover:bg-gray-100 dark:hover:bg-white/8 rounded-lg transition-colors">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>

                    {editingContact ? (
                      <div className="p-3 space-y-2">
                        {[
                          { placeholder: 'Name',  value: editName,  onChange: setEditName,  type: 'text' },
                          { placeholder: 'Email', value: editEmail, onChange: setEditEmail, type: 'email' },
                          { placeholder: 'Phone', value: editPhone, onChange: setEditPhone, type: 'tel' },
                        ].map(f => (
                          <input key={f.placeholder} type={f.type} placeholder={f.placeholder} value={f.value}
                            onChange={e => f.onChange(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/50" />
                        ))}
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => void handleSaveContact()} disabled={savingContact}
                            className="flex-1 py-1.5 text-xs font-medium rounded-lg bg-[#15A4AE] hover:bg-[#1290a0] text-white transition-colors disabled:opacity-50">
                            {savingContact ? 'Saving…' : 'Save'}
                          </button>
                          <button onClick={() => setEditingContact(false)}
                            className="flex-1 py-1.5 text-xs font-medium rounded-lg border dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="divide-y dark:divide-white/8">
                        {customerEmail && (
                          <div className="flex items-center gap-2.5 px-3.5 py-2.5">
                            <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{customerEmail}</span>
                          </div>
                        )}
                        {ticket.phone && (
                          <div className="flex items-center gap-2.5 px-3.5 py-2.5">
                            <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="text-xs text-gray-700 dark:text-gray-300">{ticket.phone}</span>
                          </div>
                        )}
                        {customerEmail && (
                          <div className="px-3.5 py-2.5 flex justify-end">
                            <button onClick={() => setShowEmailModal(true)}
                              className="flex items-center gap-1.5 text-xs text-[#15A4AE] hover:underline">
                              <Send className="w-3 h-3" /> Reply via Email
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Description */}
                {ticket.description && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1.5">Customer Message</p>
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap line-clamp-6">{ticket.description}</p>
                  </div>
                )}

                {/* Pending Tasks */}
                {(() => {
                  const now = Date.now()
                  const overdue = activities
                    .filter(a => a.due_at && !a.completed_at && new Date(a.due_at).getTime() < now)
                    .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime())
                  return (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                          <AlertCircle className="w-3 h-3" /> Pending Tasks
                          {overdue.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400 text-[10px] font-bold">{overdue.length}</span>
                          )}
                        </p>
                        {overdue.length > 0 && (
                          <button onClick={() => setRightTab('activity')}
                            className="text-[10px] text-[#15A4AE] hover:underline flex items-center gap-0.5">
                            View all <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      {overdue.length === 0 ? (
                        <p className="text-xs text-gray-400 dark:text-gray-500 italic">No overdue tasks — you&apos;re all caught up.</p>
                      ) : (
                        <div className="space-y-2">
                          {overdue.map(act => {
                            const meta = ACTIVITY_META[act.type]; const Icon = meta.Icon
                            return (
                              <div key={act.id} className="flex items-start gap-2 rounded-lg border dark:border-white/8 p-2.5 bg-gray-50 dark:bg-white/[0.02]">
                                <Icon className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{act.title || meta.label}</p>
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="text-[10px] text-amber-600 dark:text-amber-400" suppressHydrationWarning>Due {formatDate(act.due_at)}</span>
                                    {!readonly && (
                                      <button onClick={() => void handleCompleteTask(act.id)}
                                        className="flex items-center gap-0.5 text-[10px] text-gray-400 hover:text-[#15A4AE] transition-colors">
                                        <Check className="w-3 h-3" /> Done
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
                  )
                })()}

              </div>
            )}

            {/* ── ACTIVITY TAB ── */}
            {rightTab === 'activity' && (
              <div className="p-4 space-y-4">

                {/* Stats strip */}
                <div className="grid grid-cols-3 gap-0 rounded-xl border dark:border-white/8 overflow-hidden">
                  {[
                    { label: 'Interactions', value: activities.length },
                    { label: 'Last Contact', value: activities[0]?.created_at ? formatDate(activities[0].created_at) : 'Never' },
                    { label: 'Days Open',    value: daysSince(ticket.created_at) },
                  ].map((stat, i) => (
                    <div key={i} className={cn('px-2 py-3 text-center bg-gray-50 dark:bg-white/[0.02]', i < 2 && 'border-r dark:border-white/8')}>
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-none" suppressHydrationWarning>{stat.value}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 leading-tight">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Log section */}
                {!readonly && (
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
                                {(['call', 'meeting', 'task'] as TicketActivityType[]).map(t => (
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
                                  {(['call', 'meeting', 'task'] as TicketActivityType[]).map(t => (
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
                )}

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
                                  {isTask && !isDone && !readonly && (
                                    <button onClick={() => void handleCompleteTask(activity.id)}
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

      {/* Email modal */}
      {showEmailModal && customerEmail && (
        <EmailComposeModal
          to={customerEmail ?? ''}
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
