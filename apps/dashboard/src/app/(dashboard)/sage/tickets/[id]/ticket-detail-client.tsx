'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Search, Sparkles, RefreshCw, Loader2, User, Mail, Phone,
  Clock, Send, FileText, Users, CheckSquare, Check, Pencil,
  ChevronLeft, ChevronRight, Download, Trash2, Building2, Tag,
} from 'lucide-react'
import { EmailComposeModal } from '@/components/dashboard/email-compose-modal'
import {
  addTicketActivity, completeTicketTask, analyzeTicket,
  type TicketActivityType,
} from '@/app/actions/sage-tickets'
import { updateTicketStatus, updateTicketPriority, updateTicketContactInfo, deleteTicket, renameTicket, assignTicket } from '@/app/actions/sage'
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
  urgent: { badge: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',            label: 'Urgent' },
  high:   { badge: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400', label: 'High' },
  medium: { badge: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',    label: 'Medium' },
  low:    { badge: 'bg-gray-100 text-gray-600 dark:bg-white/8 dark:text-gray-400',            label: 'Low' },
}

const ACTIVITY_META: Record<TicketActivityType, { Icon: React.ElementType; color: string; label: string }> = {
  note:    { Icon: FileText,    color: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10',        label: 'Note' },
  call:    { Icon: Phone,       color: 'text-green-500 bg-green-50 dark:bg-green-500/10',     label: 'Call' },
  meeting: { Icon: Users,       color: 'text-purple-500 bg-purple-50 dark:bg-purple-500/10',  label: 'Meeting' },
  task:    { Icon: CheckSquare, color: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10',     label: 'Task' },
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
    <div className="flex flex-col h-full overflow-hidden bg-[#f5f4f1] dark:bg-[#181818]">

      {/* ══ TOP BAR ══════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-[#1c1c1c] border-b border-gray-200 dark:border-white/8 shrink-0">

        {/* Back */}
        <Link
          href="/sage/tickets"
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors shrink-0 mr-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Tickets</span>
        </Link>

        {/* Title + customer */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{ticket.title}</p>
          {customerName && <p className="text-[10px] text-gray-400 truncate">{customerName}</p>}
        </div>

        {/* Priority */}
        <select
          value={localPriority}
          onChange={e => handlePriorityChange(e.target.value)}
          disabled={readonly}
          className={cn(
            'text-[10px] font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 disabled:cursor-default shrink-0',
            priorityStyle.badge,
          )}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>

        {/* Status */}
        <select
          value={localStatus}
          onChange={e => handleStatusChange(e.target.value as SageTicketStatus)}
          disabled={readonly}
          className={cn(
            'text-[10px] font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 disabled:cursor-default shrink-0',
            statusStyle.badge,
          )}
        >
          {STATUS_FLOW.map(s => (
            <option key={s} value={s}>{STATUS_STYLES[s].label}</option>
          ))}
        </select>

        {/* Assign to */}
        {!readonly && members.length > 0 && (
          <select
            value={localAssignee}
            onChange={e => handleAssigneeChange(e.target.value)}
            className="text-xs border dark:border-white/10 rounded-lg px-2.5 py-1 bg-white dark:bg-white/5 text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/40 shrink-0 max-w-[130px]"
          >
            <option value="">Unassigned</option>
            {members.map(m => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
          </select>
        )}

        {/* Action icons */}
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={handleDownload} title="Download" className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8 rounded-lg transition-colors">
            <Download className="w-3.5 h-3.5" />
          </button>
          {!readonly && (
            <button onClick={handleRename} title="Rename" className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8 rounded-lg transition-colors">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          {!readonly && (
            <button onClick={() => void handleDelete()} title="Delete" className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ══ BODY ═════════════════════════════════════════════════════════════ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT PANEL — ticket list ──────────────────────────────────────── */}
        <div className={cn(
          'flex flex-col bg-white dark:bg-[#1c1c1c] border-r border-gray-200 dark:border-white/8 shrink-0 transition-all duration-200',
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
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">All Tickets</span>
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
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto p-5 space-y-4">

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

        {/* ── RIGHT PANEL ──────────────────────────────────────────────────── */}
        <div className="w-72 shrink-0 flex flex-col border-l border-gray-200 dark:border-white/8 overflow-y-auto bg-white dark:bg-[#1c1c1c]">
          <div className="p-4 space-y-4">

            {/* Customer details card */}
            <div className="bg-gray-50 dark:bg-white/3 rounded-xl border border-gray-100 dark:border-white/8 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Customer Details</p>
                {!readonly && !editingContact && (
                  <button onClick={() => setEditingContact(true)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                    <Pencil className="w-3 h-3 text-gray-400" />
                  </button>
                )}
              </div>

              {editingContact ? (
                <div className="space-y-2">
                  {[
                    { placeholder: 'Name',  value: editName,  onChange: setEditName,  type: 'text' },
                    { placeholder: 'Email', value: editEmail, onChange: setEditEmail, type: 'email' },
                    { placeholder: 'Phone', value: editPhone, onChange: setEditPhone, type: 'tel' },
                  ].map(f => (
                    <input key={f.placeholder} type={f.type} placeholder={f.placeholder} value={f.value}
                      onChange={e => f.onChange(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/50" />
                  ))}
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
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-[#15A4AE]/10 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-[#15A4AE]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {customerName ?? <span className="text-gray-400 italic text-xs font-normal">No name</span>}
                      </p>
                      <p className="text-[10px] text-gray-400">Customer</p>
                    </div>
                  </div>
                  {[
                    customerEmail && { Icon: Mail,  label: customerEmail },
                    ticket.phone  && { Icon: Phone, label: ticket.phone },
                  ].filter(Boolean).map((row, i) => {
                    const { Icon, label } = row as { Icon: React.ElementType; label: string }
                    return (
                      <div key={i} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                        <Icon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{label}</span>
                      </div>
                    )
                  })}
                  {ticket.contact?.id && (
                    <Link href={`/sage/contacts/${ticket.contact.id}`}
                      className="text-xs text-[#15A4AE] hover:underline flex items-center gap-1 mt-1">
                      View contact profile →
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Log activity */}
            {!readonly && (
              <div className="bg-gray-50 dark:bg-white/3 rounded-xl border border-gray-100 dark:border-white/8 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">Log Activity</p>

                {/* Type tabs */}
                <div className="flex gap-1 p-1 bg-gray-100 dark:bg-white/5 rounded-xl mb-3">
                  {(Object.keys(ACTIVITY_META) as TicketActivityType[]).map(t => {
                    const { Icon, label } = ACTIVITY_META[t]
                    return (
                      <button key={t} onClick={() => setActType(t)}
                        className={cn('flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium rounded-lg transition-colors',
                          actType === t ? 'bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
                        )}>
                        <Icon className="w-2.5 h-2.5" />{label}
                      </button>
                    )
                  })}
                </div>

                {actType !== 'note' && (
                  <input type="text"
                    placeholder={actType === 'task' ? 'Task title' : actType === 'call' ? 'Call summary' : 'Meeting subject'}
                    value={actTitle} onChange={e => setActTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/50 mb-2" />
                )}

                <textarea rows={3} value={actBody} onChange={e => setActBody(e.target.value)}
                  placeholder={actType === 'note' ? 'Write a note…' : 'Details / notes…'}
                  className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/50 resize-none mb-2" />

                {actType === 'task' && (
                  <input type="datetime-local" value={actDue} onChange={e => setActDue(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/50 mb-2" />
                )}

                <button onClick={() => void handleLogActivity()} disabled={logPending || (!actBody.trim() && !actTitle.trim())}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl bg-[#15A4AE] hover:bg-[#1290a0] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {logPending && <Loader2 className="w-3 h-3 animate-spin" />}
                  Log {ACTIVITY_META[actType].label}
                </button>
              </div>
            )}

            {/* Activity history */}
            <div className="bg-gray-50 dark:bg-white/3 rounded-xl border border-gray-100 dark:border-white/8 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">Activity History</p>

              {activities.length === 0 ? (
                <p className="text-xs text-gray-400 italic text-center py-4">No activity yet.</p>
              ) : (
                <div className="space-y-3">
                  {activities.map(act => {
                    const meta = ACTIVITY_META[act.type]
                    const Icon = meta.Icon
                    const isTask      = act.type === 'task'
                    const isCompleted = !!act.completed_at
                    return (
                      <div key={act.id} className="flex gap-2.5">
                        <div className={cn('w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5', meta.color)}>
                          {isCompleted ? <Check className="w-2.5 h-2.5" /> : <Icon className="w-2.5 h-2.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          {act.title && (
                            <p className={cn('text-xs font-medium', isCompleted ? 'line-through text-gray-400' : 'text-gray-900 dark:text-gray-100')}>
                              {act.title}
                            </p>
                          )}
                          {act.body && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed whitespace-pre-wrap">{act.body}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[10px] text-gray-400">{timeAgo(act.created_at)}</span>
                            {act.due_at && !isCompleted && (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                Due {new Date(act.due_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                            {isTask && !isCompleted && !readonly && (
                              <button onClick={() => void handleCompleteTask(act.id)} className="text-[10px] text-[#15A4AE] hover:underline">
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

      </div>

      {/* Email modal */}
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
