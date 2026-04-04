'use client'

import { useState, useTransition, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Search, ChevronLeft, ChevronRight, Trophy, XCircle, FileText,
  Phone, Users, CheckSquare, Check, AlertCircle, DollarSign,
  Tag, Mail, Globe, MapPin, User, Lock, Clock, Bell, ChevronDown,
  Pencil, Building2, ExternalLink, Sparkles, MessageSquare,
  ArrowLeft, Reply, Send, Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignJustify, List, ListOrdered, Paperclip,
  FileSignature, Type, Palette, Highlighter, Loader2,
} from 'lucide-react'
import { cn, timeAgo } from '@/lib/utils'
import {
  getDealDetail, addDealActivity, completeDealTask,
  addDealReminder, getDealReminders, updateDeal, deleteDeal, moveDeal,
} from '@/app/actions/sage'
import { convertDealToProject } from '@/app/actions/sage-projects'
import { getDealGuidance } from '@/app/actions/ai-guidance'
import { sendEmail, getEmailSignature } from '@/app/actions/sage-emails'
import { WonLostModal } from '@/components/sage/won-lost-modal'
import { ContactEditModal } from '@/components/sage/contact-edit-modal'
import { AIGuidancePanel } from '@/components/ai/AIGuidancePanel'
import { DraftActionPanel } from '@/components/ai/DraftActionPanel'
import type { SageDealActivity, SagePipelineStage } from '@/lib/types'
import type { AiDraft } from '@/lib/ai-guidance/types'

// ── Types ─────────────────────────────────────────────────────────────────────

type DealReminder  = { id: string; title: string; note: string | null; due_at: string }
type ActivityType  = 'note' | 'call' | 'meeting' | 'task'
type DealListItem  = {
  id: string; title: string; value: number | null; currency: string
  status: string; stage_id: string | null; close_date: string | null
  priority: string | null; created_at: string
  contact: { id: string; name: string } | null
}

interface Props {
  pipelineId:        string
  pipeline:          { id: string; name: string }
  stages:            SagePipelineStage[]
  allDeals:          DealListItem[]
  deal:              Record<string, unknown> & { contact: Record<string, unknown> | null }
  initialActivities: SageDealActivity[]
  initialReminders:  DealReminder[]
  openEditForm?:     boolean
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ACTIVITY_ICONS: Record<ActivityType, React.ElementType> = {
  note: FileText, call: Phone, meeting: Users, task: CheckSquare,
}
const ACTIVITY_LABELS: Record<ActivityType, string> = {
  note: 'Note', call: 'Phone Call', meeting: 'Meeting', task: 'Task',
}
const ACTIVITY_COLORS: Record<ActivityType, string> = {
  note:    'text-blue-500 bg-blue-50 dark:bg-blue-500/10',
  call:    'text-green-500 bg-green-50 dark:bg-green-500/10',
  meeting: 'text-purple-500 bg-purple-50 dark:bg-purple-500/10',
  task:    'text-amber-500 bg-amber-50 dark:bg-amber-500/10',
}
const PRIORITY_BADGE: Record<string, string> = {
  high:   'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20',
  medium: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/25',
  low:    'bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10',
}
const STATUS_BADGE: Record<string, string> = {
  open: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  won:  'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400',
  lost: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
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
function formatCurrency(value: number | null, currency: string): string {
  if (!value) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
}
function daysSince(iso: string | null | undefined): number {
  if (!iso) return 0
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}
function groupActivitiesByDate(activities: SageDealActivity[]) {
  const now       = new Date()
  const today     = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay())
  const buckets: Record<string, SageDealActivity[]> = { Today: [], 'This Week': [], Earlier: [] }
  for (const a of activities) {
    const d   = new Date(a.created_at)
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    if (day >= today) buckets['Today'].push(a)
    else if (day >= weekStart) buckets['This Week'].push(a)
    else buckets['Earlier'].push(a)
  }
  return Object.entries(buckets).filter(([, items]) => items.length > 0).map(([label, items]) => ({ label, items }))
}

// ── Draft section (right column) ──────────────────────────────────────────────

function DraftSection({ dealId }: { dealId: string }) {
  const [drafts, setDrafts]   = useState<AiDraft[]>([])
  const [loaded, setLoaded]   = useState(false)

  const fetchDrafts = useCallback(async () => {
    const guidance = await getDealGuidance(dealId)
    setDrafts(guidance.pendingDrafts)
    setLoaded(true)
  }, [dealId])

  useEffect(() => { fetchDrafts() }, [fetchDrafts])

  if (!loaded) return null
  if (drafts.length === 0) return (
    <div className="px-4 py-3 flex items-center gap-2 text-xs text-gray-400">
      <Sparkles className="w-3.5 h-3.5 text-[#15A4AE]/50 shrink-0" />
      No draft communication yet
    </div>
  )
  return (
    <div className="p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2.5 flex items-center gap-1.5">
        <MessageSquare className="w-3 h-3" /> Suggested Communication
      </p>
      <DraftActionPanel drafts={drafts} onDraftActioned={fetchDrafts} />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function DealDetailClient({
  pipelineId, pipeline, stages, allDeals,
  deal: initialDeal, initialActivities, initialReminders, openEditForm,
}: Props) {
  const router = useRouter()

  const [deal,       setDeal]       = useState(initialDeal)
  const [activities, setActivities] = useState(initialActivities)
  const [reminders,  setReminders]  = useState(initialReminders)

  const [leftCollapsed,     setLeftCollapsed]     = useState(false)
  const [leftSearchInput,   setLeftSearchInput]   = useState('')
  const [leftSearchBubbles, setLeftSearchBubbles] = useState<string[]>([])
  const [leftStageFilter,   setLeftStageFilter]   = useState<string>('all')

  function addSearchBubble(raw: string) {
    const val = raw.trim().toLowerCase()
    if (val && !leftSearchBubbles.includes(val)) {
      setLeftSearchBubbles(prev => [...prev, val])
    }
    setLeftSearchInput('')
  }

  function removeSearchBubble(val: string) {
    setLeftSearchBubbles(prev => prev.filter(b => b !== val))
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
      e.preventDefault()
      if (leftSearchInput.trim()) addSearchBubble(leftSearchInput)
    } else if (e.key === 'Backspace' && !leftSearchInput && leftSearchBubbles.length > 0) {
      setLeftSearchBubbles(prev => prev.slice(0, -1))
    }
  }

  // Activity form
  const [addType,             setAddType]             = useState<ActivityType>('note')
  const [showTypeMenu,        setShowTypeMenu]        = useState(false)
  const [showAddForm,         setShowAddForm]         = useState(false)
  const [formTitle,           setFormTitle]           = useState('')
  const [formBody,            setFormBody]            = useState('')
  const [formDue,             setFormDue]             = useState('')
  const [showReminderForm,    setShowReminderForm]    = useState(false)
  const [reminderTitle,       setReminderTitle]       = useState('')
  const [reminderNote,        setReminderNote]        = useState('')
  const [reminderDue,         setReminderDue]         = useState('')
  const [reminderType,        setReminderType]        = useState<ActivityType>('call')
  const [reminderSaving,      setReminderSaving]      = useState(false)
  const [reminderSaved,       setReminderSaved]       = useState(false)
  const [showReminderTypeMenu, setShowReminderTypeMenu] = useState(false)
  const [taskFilter,          setTaskFilter]          = useState<'all' | 'pending' | 'upcoming' | 'reminders'>('all')

  // Edit / delete
  const [showEditForm,  setShowEditForm]  = useState(openEditForm ?? false)
  const [editSaving,    setEditSaving]    = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting,      setDeleting]      = useState(false)

  // Won/Lost + contact edit
  const [wonLostMode,      setWonLostMode]      = useState<'won' | 'lost' | null>(null)
  const [editingContactId, setEditingContactId] = useState<string | null>(null)
  const [converting,       setConverting]       = useState(false)

  const [isPending, startTransition] = useTransition()

  // Center mode: guidance vs compose
  const [centerMode,     setCenterMode]     = useState<'guidance' | 'compose'>('guidance')

  // Right panel tab
  const [rightTab,       setRightTab]       = useState<'overview' | 'activity'>('overview')

  // Compose state
  const [composeSubject,  setComposeSubject]  = useState('')
  const [composeSending,  setComposeSending]  = useState(false)
  const [composeSent,     setComposeSent]     = useState<string | null>(null)
  const [composeShowCc,   setComposeShowCc]   = useState(false)
  const [composeShowBcc,  setComposeShowBcc]  = useState(false)
  const [composeCc,       setComposeCc]       = useState('')
  const [composeBcc,      setComposeBcc]      = useState('')
  const [emailSignature,  setEmailSignature]  = useState<string | null>(null)
  const [fontOpen,        setFontOpen]        = useState(false)
  const [colorOpen,       setColorOpen]       = useState(false)
  const [hlOpen,          setHlOpen]          = useState(false)
  const composeRef = useRef<HTMLDivElement>(null)

  const FONTS = [
    'Georgia', 'Arial', 'Times New Roman', 'Courier New', 'Trebuchet MS', 'Verdana',
  ]
  const TEXT_COLORS      = ['#ffffff','#111827','#6b7280','#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899']
  const HIGHLIGHT_COLORS = ['#fef08a','#bbf7d0','#bfdbfe','#fce7f3','#fed7aa','#e0e7ff','transparent']

  function execFormat(cmd: string, val?: string) {
    document.execCommand(cmd, false, val ?? undefined)
  }

  function insertComposeSignature() {
    if (!composeRef.current) return
    composeRef.current.focus()
    if (emailSignature) {
      document.execCommand('insertHTML', false,
        `<br><hr style="border:none;border-top:1px solid #e5e7eb;margin:12px 0;" />${emailSignature}`)
    } else {
      document.execCommand('insertText', false, '\n\n— \nBest regards')
    }
  }

  function openCompose() {
    setComposeSent(null)
    setComposeSubject('')
    setComposeShowCc(false)
    setComposeShowBcc(false)
    setComposeCc('')
    setComposeBcc('')
    setCenterMode('compose')
    getEmailSignature().then(({ html }) => { if (html) setEmailSignature(html) })
  }

  async function handleComposeSend() {
    const html = composeRef.current?.innerHTML ?? ''
    const text = composeRef.current?.innerText?.trim() ?? ''
    if (!contactEmail || !text) return
    setComposeSending(true)
    const result = await sendEmail({
      to: contactEmail,
      subject: composeSubject || `Re: ${dealTitle}`,
      body: html,
    })
    setComposeSending(false)
    if (result.ok) {
      setComposeSent('sent')
      setTimeout(() => { setCenterMode('guidance'); setComposeSent(null) }, 2500)
    } else {
      setComposeSent(result.error ?? 'error')
    }
  }

  // ── Derived deal fields ──────────────────────────────────────────────────────

  const dealId        = deal?.id            as string
  const dealTitle     = (deal?.title        as string)        ?? ''
  const dealValue     = (deal?.value        as number | null) ?? null
  const dealCurrency  = (deal?.currency     as string)        ?? 'USD'
  const dealStatus    = (deal?.status       as string)        ?? ''
  const dealPriority  = (deal?.priority     as string | null) ?? null
  const dealCloseDate = (deal?.close_date   as string | null) ?? null
  const dealSource    = (deal?.source       as string | null) ?? null
  const dealWinPct    = (deal?.win_percentage as number | null) ?? null
  const dealWonAt     = (deal?.won_at       as string | null) ?? null
  const dealLostReason = (deal?.lost_reason as string | null) ?? null
  const dealDesc      = (deal?.description  as string | null) ?? null
  const dealTags      = Array.isArray(deal?.tags) ? (deal!.tags as string[]) : []
  const dealCreatedAt = (deal?.created_at   as string | null) ?? null
  const stageObj      = deal?.stage         as Record<string, unknown> | null

  const contact        = deal?.contact      as Record<string, unknown> | null
  const contactId      = (contact?.id       as string | null) ?? null
  const contactName    = (contact?.name     as string | null) ?? null
  const contactEmail   = (contact?.email    as string | null) ?? null
  const contactPhone   = (contact?.phone    as string | null) ?? null
  const contactCompany = (contact?.company_name as string | null) ?? null
  const contactTitle   = (contact?.title    as string | null) ?? null
  const contactWebsite = (contact?.website_url as string | null) ?? null
  const contactGoal    = (contact?.business_goal as string | null) ?? null
  const contactType    = (contact?.contact_type as string | null) ?? null
  const contactSource  = (contact?.source   as string | null) ?? null
  const contactTags    = Array.isArray(contact?.tags) ? (contact!.tags as string[]) : []
  const contactCreated = (contact?.created_at as string | null) ?? null
  const contactStreet  = (contact?.street   as string | null) ?? null
  const contactCity    = (contact?.city     as string | null) ?? null
  const contactState   = (contact?.state    as string | null) ?? null
  const contactZip     = (contact?.zip      as string | null) ?? null
  const contactCountry = (contact?.country  as string | null) ?? null
  const fullAddress    = [contactStreet, contactCity, contactState, contactZip, contactCountry].filter(Boolean).join(', ') || null

  const lastActivity = activities[0]?.created_at ?? null
  const inactiveDays = lastActivity ? daysSince(lastActivity) : daysSince(dealCreatedAt)
  const daysInStage  = daysSince(dealCreatedAt)
  const activityGroups = groupActivitiesByDate(activities)

  // ── Left column deal list ────────────────────────────────────────────────────

  const filteredDeals = allDeals.filter(d => {
    const matchStage  = leftStageFilter === 'all' || d.stage_id === leftStageFilter
    const activeBubbles = [
      ...leftSearchBubbles,
      ...(leftSearchInput.trim() ? [leftSearchInput.trim().toLowerCase()] : []),
    ]
    const matchSearch = activeBubbles.length === 0 || activeBubbles.some(q =>
      d.title.toLowerCase().includes(q) || (d.contact?.name ?? '').toLowerCase().includes(q)
    )
    return matchStage && matchSearch && d.status === 'open'
  })

  // ── Activity handlers ────────────────────────────────────────────────────────

  function resetForm() { setShowAddForm(false); setFormTitle(''); setFormBody(''); setFormDue('') }

  function handleSubmitActivity() {
    if (!dealId) return
    startTransition(async () => {
      const result = await addDealActivity(dealId, addType, formTitle, formBody, formDue || undefined)
      if (!result.error) {
        const res = await getDealDetail(dealId)
        setActivities(res.activities)
        resetForm()
      }
    })
  }

  function handleCompleteTask(activityId: string) {
    startTransition(async () => {
      await completeDealTask(activityId)
      const res = await getDealDetail(dealId)
      setActivities(res.activities)
    })
  }

  async function handleSubmitReminder() {
    if (!dealId || !reminderTitle.trim() || !reminderDue) return
    setReminderSaving(true)
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
    const dueIso = new Date(reminderDue).toISOString()
    await Promise.all([
      addDealActivity(dealId, reminderType, reminderTitle, reminderNote || undefined, dueIso),
      addDealReminder(dealId, reminderTitle, reminderNote || null, dueIso),
    ])
    const [detail, rems] = await Promise.all([getDealDetail(dealId), getDealReminders(dealId)])
    setActivities(detail.activities)
    setReminders(rems)
    setReminderTitle(''); setReminderNote(''); setReminderDue(''); setReminderType('call')
    setReminderSaved(true)
    setTimeout(() => { setReminderSaved(false); setShowReminderForm(false) }, 2500)
    setReminderSaving(false)
  }

  function handleWonLostConfirm() {
    setWonLostMode(null)
    if (dealId) {
      getDealDetail(dealId).then(detail => {
        setDeal(detail.deal!)
        setActivities(detail.activities)
      })
    }
  }

  async function handleConvertToProject() {
    if (!dealId) return
    setConverting(true)
    const result = await convertDealToProject(dealId, {
      name:       dealTitle,
      contact_id: contactId ?? undefined,
      value:      dealValue ?? undefined,
      currency:   dealCurrency,
    })
    setConverting(false)
    if (result.id) router.push(`/sage/projects/${result.id}`)
  }

  // ── Tasks & Reminders section ────────────────────────────────────────────────

  const now = Date.now()
  type PendingItem =
    | { kind: 'task';     id: string; label: string; type: string; due_at: string }
    | { kind: 'reminder'; id: string; label: string; note: string | null; due_at: string }

  const taskItems: PendingItem[] = activities
    .filter(a => a.due_at && !a.completed_at)
    .map(a => ({ kind: 'task' as const, id: a.id, label: a.title || ACTIVITY_LABELS[a.type as ActivityType] || a.type, type: a.type, due_at: a.due_at! }))

  const reminderItems: PendingItem[] = reminders
    .map(r => ({ kind: 'reminder' as const, id: r.id, label: r.title, note: r.note, due_at: r.due_at }))

  const allPendingItems  = [...taskItems, ...reminderItems].sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime())
  const overdueItems     = allPendingItems.filter(i => i.kind === 'task' && new Date(i.due_at).getTime() < now)
  const upcomingItems    = allPendingItems.filter(i => i.kind === 'task' && new Date(i.due_at).getTime() >= now)
  const overdueCount     = overdueItems.length

  const pendingCounts = { all: allPendingItems.length, pending: overdueItems.length, upcoming: upcomingItems.length, reminders: reminderItems.length }
  const visibleItems  =
    taskFilter === 'pending'   ? overdueItems :
    taskFilter === 'upcoming'  ? upcomingItems :
    taskFilter === 'reminders' ? reminderItems :
    allPendingItems

  function itemStyle(dueAt: string) {
    const isOv = new Date(dueAt).getTime() < now
    if (!isOv) return { bar: 'bg-[#15A4AE]', text: 'text-[#15A4AE]', label: 'bg-[#15A4AE]/10 text-[#15A4AE] border border-[#15A4AE]/20' }
    const days = (now - new Date(dueAt).getTime()) / 86400000
    if (days > 3) return { bar: 'bg-red-500',   text: 'text-red-600 dark:text-red-400',   label: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20' }
    if (days > 1) return { bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', label: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/25' }
    return         { bar: 'bg-yellow-400', text: 'text-yellow-600 dark:text-yellow-400', label: 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-500/25' }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {wonLostMode && (
        <WonLostModal
          dealId={dealId}
          dealTitle={dealTitle}
          mode={wonLostMode}
          onClose={() => setWonLostMode(null)}
          onConfirm={handleWonLostConfirm}
        />
      )}
      {editingContactId && (
        <ContactEditModal
          contactId={editingContactId}
          onClose={() => setEditingContactId(null)}
          onSaved={() => {
            setEditingContactId(null)
            getDealDetail(dealId).then(d => { if (d.deal) setDeal(d.deal) })
          }}
        />
      )}

      <div className="flex h-full w-full gap-3 p-3 bg-[#f5f4f1] dark:bg-[#1c1c1c]">

        {/* ── LEFT: Deal list ─────────────────────────────────────────────── */}
        <div className={cn(
          'flex flex-col bg-white dark:bg-[#181818] rounded-2xl shadow-xl border border-gray-200/60 dark:border-white/8 shrink-0 transition-all duration-200 overflow-hidden',
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
              <div className="px-3 py-2.5 bg-[#141c2b] border-b border-white/10 shrink-0 space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-white truncate">{pipeline.name}</h2>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Link href={`/sage/pipelines/${pipelineId}`} className="text-xs text-white/70 hover:text-white transition-opacity">← Back</Link>
                    <button onClick={() => setLeftCollapsed(true)} className="p-1 rounded hover:bg-white/10 transition-colors">
                      <ChevronLeft className="w-3 h-3 text-white" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  {/* Bubble chips */}
                  {leftSearchBubbles.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {leftSearchBubbles.map(b => (
                        <span key={b} className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-[#15A4AE]/20 text-[#15A4AE] border border-[#15A4AE]/30">
                          {b}
                          <button
                            onClick={() => removeSearchBubble(b)}
                            className="hover:text-white transition-colors leading-none"
                          >×</button>
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Search input */}
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder={leftSearchBubbles.length === 0 ? 'Search deals…' : 'Add keyword…'}
                      value={leftSearchInput}
                      onChange={e => setLeftSearchInput(e.target.value)}
                      onKeyDown={handleSearchKeyDown}
                      onBlur={() => { if (leftSearchInput.trim()) addSearchBubble(leftSearchInput) }}
                      className="w-full pl-6 pr-2.5 py-1.5 text-xs border border-white/20 rounded-lg !bg-[#f5f4f1] !text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/40"
                    />
                  </div>
                </div>
              </div>

              {/* Stage filter */}
              <div className="px-3 py-2 border-b border-gray-100 dark:border-white/8 shrink-0">
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => setLeftStageFilter('all')}
                    className={cn('px-2 py-0.5 text-[10px] font-medium rounded-full transition-colors',
                      leftStageFilter === 'all' ? 'bg-[#15A4AE] text-white' : 'bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/12',
                    )}>All</button>
                  {stages.map(s => (
                    <button key={s.id} onClick={() => setLeftStageFilter(s.id)}
                      className={cn('px-2 py-0.5 text-[10px] font-medium rounded-full transition-colors truncate max-w-[80px]',
                        leftStageFilter === s.id ? 'bg-[#15A4AE] text-white' : 'bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/12',
                      )}>{s.name}</button>
                  ))}
                </div>
              </div>

              {/* Deal list */}
              <div className="flex-1 overflow-y-auto">
                {filteredDeals.length === 0
                  ? <p className="text-xs text-gray-400 text-center py-8 px-3">No deals found</p>
                  : filteredDeals.map(d => {
                    const isActive = d.id === dealId
                    const stg = stages.find(s => s.id === d.stage_id)
                    return (
                      <button key={d.id}
                        onClick={() => router.push(`/sage/pipelines/${pipelineId}/deals/${d.id}`)}
                        className={cn('w-full text-left px-3 py-2.5 border-b border-gray-50 dark:border-white/5 transition-colors',
                          isActive ? 'bg-[#15A4AE]/8 dark:bg-[#15A4AE]/10 border-l-2 border-l-[#15A4AE]' : 'hover:bg-gray-50 dark:hover:bg-white/3',
                        )}>
                        <div className="min-w-0">
                          <p className={cn('text-xs font-semibold truncate leading-snug', isActive ? 'text-[#1f6157] dark:text-[#15A4AE]' : 'text-gray-800 dark:text-gray-200')}>
                            {d.contact?.name ?? d.title}
                          </p>
                          {d.contact?.name && <p className="text-[10px] text-gray-400 truncate mt-0.5">{d.title}</p>}
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {stg && <span className="text-[10px] text-gray-400 truncate">{stg.name}</span>}
                            {d.value && <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">{formatCurrency(d.value, d.currency)}</span>}
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

        {/* ── CENTER: Sage Analysis + Compose ────────────────────────────── */}
        <div className="flex-[2] min-w-0 flex flex-col overflow-hidden bg-white dark:bg-[#232323] rounded-2xl shadow-xl border border-gray-200/60 dark:border-white/8">

          {/* Center header */}
          <div className="shrink-0 bg-[#141c2b] border-b border-white/10 px-4 py-2.5 flex items-center gap-3 shadow-[0_4px_12px_rgba(0,0,0,0.25)]">
            {centerMode === 'compose' ? (
              <>
                <button
                  onClick={() => setCenterMode('guidance')}
                  className="flex items-center gap-1.5 text-xs font-semibold text-white/70 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/60 truncate">
                    To: {contactName ? `${contactName}${contactEmail ? ` <${contactEmail}>` : ''}` : contactEmail ?? '—'}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <Sparkles className="w-3.5 h-3.5 text-[#15A4AE] shrink-0" />
                  <p className="text-sm font-semibold text-white truncate">Sage Analysis</p>
                </div>
                {contactEmail && (
                  <button
                    onClick={openCompose}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#15A4AE] bg-[#15A4AE]/10 hover:bg-[#15A4AE]/20 rounded-lg border border-[#15A4AE]/25 transition-colors shrink-0"
                  >
                    <Reply className="w-3 h-3" /> Compose
                  </button>
                )}
              </>
            )}
          </div>

          {/* Center content */}
          {centerMode === 'guidance' ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <AIGuidancePanel entityType="deal" entityId={dealId} mode="full" />
            </div>
          ) : (
            /* ── Compose mode ── */
            <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-[#232323]">
              {/* To row */}
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 dark:border-white/8 bg-gray-50 dark:bg-white/[0.02] shrink-0">
                <Reply className="w-3.5 h-3.5 text-[#15A4AE] shrink-0" />
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 shrink-0">To:</span>
                <span className="text-xs text-gray-600 dark:text-gray-400 flex-1 truncate">
                  {contactName ? `${contactName} <${contactEmail}>` : contactEmail ?? '—'}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setComposeShowCc(v => !v)}
                    className={cn('px-2 py-0.5 rounded text-[11px] font-semibold transition-colors',
                      composeShowCc ? 'bg-[#15A4AE]/10 text-[#15A4AE]' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8')}>
                    CC
                  </button>
                  <button onClick={() => setComposeShowBcc(v => !v)}
                    className={cn('px-2 py-0.5 rounded text-[11px] font-semibold transition-colors',
                      composeShowBcc ? 'bg-[#15A4AE]/10 text-[#15A4AE]' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8')}>
                    BCC
                  </button>
                </div>
              </div>
              {composeShowCc && (
                <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 dark:border-white/8 bg-gray-50 dark:bg-white/[0.02] shrink-0">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-8 shrink-0">CC:</span>
                  <input type="email" value={composeCc} onChange={e => setComposeCc(e.target.value)}
                    placeholder="Add CC recipients…"
                    className="flex-1 text-xs bg-transparent text-gray-700 dark:text-gray-300 placeholder-gray-400 outline-none" />
                </div>
              )}
              {composeShowBcc && (
                <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 dark:border-white/8 bg-gray-50 dark:bg-white/[0.02] shrink-0">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-8 shrink-0">BCC:</span>
                  <input type="email" value={composeBcc} onChange={e => setComposeBcc(e.target.value)}
                    placeholder="Add BCC recipients…"
                    className="flex-1 text-xs bg-transparent text-gray-700 dark:text-gray-300 placeholder-gray-400 outline-none" />
                </div>
              )}
              {/* Subject */}
              <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 dark:border-white/8 shrink-0">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 shrink-0">Subject:</span>
                <input type="text" value={composeSubject} onChange={e => setComposeSubject(e.target.value)}
                  placeholder={`Re: ${dealTitle}`}
                  className="flex-1 text-xs bg-transparent text-gray-800 dark:text-gray-200 placeholder-gray-400 outline-none" />
              </div>
              {/* Formatting toolbar */}
              <div className="border-b border-gray-100 dark:border-white/8 shrink-0">
                <div className="flex items-center flex-wrap gap-0.5 px-3 py-1.5">
                  {/* Font picker */}
                  <div className="relative">
                    <button title="Font" onMouseDown={ev => { ev.preventDefault(); setFontOpen(v => !v); setColorOpen(false); setHlOpen(false) }}
                      className={cn('flex items-center gap-1 px-1.5 py-1 rounded text-[11px] font-medium transition-colors', fontOpen ? 'bg-gray-200 dark:bg-white/15 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white')}>
                      <Type className="w-3.5 h-3.5" /><span>Font</span><ChevronDown className="w-3 h-3" />
                    </button>
                    {fontOpen && (
                      <div className="absolute top-full left-0 mt-1 z-20 bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-white/10 rounded-xl shadow-lg overflow-hidden min-w-[160px]">
                        {FONTS.map(f => (
                          <button key={f} onMouseDown={ev => { ev.preventDefault(); execFormat('fontName', f); setFontOpen(false) }}
                            style={{ fontFamily: f }}
                            className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">{f}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="w-px h-4 bg-gray-200 dark:bg-white/10 mx-0.5" />
                  {([
                    { cmd: 'bold',          Icon: Bold,          title: 'Bold' },
                    { cmd: 'italic',        Icon: Italic,        title: 'Italic' },
                    { cmd: 'underline',     Icon: Underline,     title: 'Underline' },
                    { cmd: 'strikeThrough', Icon: Strikethrough, title: 'Strikethrough' },
                  ] as const).map(({ cmd, Icon, title }) => (
                    <button key={cmd} title={title} onMouseDown={ev => { ev.preventDefault(); execFormat(cmd) }}
                      className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                      <Icon className="w-3.5 h-3.5" />
                    </button>
                  ))}
                  <div className="w-px h-4 bg-gray-200 dark:bg-white/10 mx-0.5" />
                  {/* Text color */}
                  <div className="relative">
                    <button title="Text color" onMouseDown={ev => { ev.preventDefault(); setColorOpen(v => !v); setFontOpen(false); setHlOpen(false) }}
                      className={cn('p-1.5 rounded transition-colors', colorOpen ? 'bg-gray-200 dark:bg-white/15 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white')}>
                      <Palette className="w-3.5 h-3.5" />
                    </button>
                    {colorOpen && (
                      <div className="absolute top-full left-0 mt-1 z-20 bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-white/10 rounded-xl shadow-lg p-2 flex flex-wrap gap-1.5" style={{ width: 128 }}>
                        {TEXT_COLORS.map(c => (
                          <button key={c} onMouseDown={ev => { ev.preventDefault(); execFormat('foreColor', c); setColorOpen(false) }}
                            className="w-5 h-5 rounded-full border border-gray-200 dark:border-white/10 hover:scale-110 transition-transform"
                            style={{ background: c }} />
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Highlight */}
                  <div className="relative">
                    <button title="Highlight" onMouseDown={ev => { ev.preventDefault(); setHlOpen(v => !v); setFontOpen(false); setColorOpen(false) }}
                      className={cn('p-1.5 rounded transition-colors', hlOpen ? 'bg-gray-200 dark:bg-white/15 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white')}>
                      <Highlighter className="w-3.5 h-3.5" />
                    </button>
                    {hlOpen && (
                      <div className="absolute top-full left-0 mt-1 z-20 bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-white/10 rounded-xl shadow-lg p-2 flex flex-wrap gap-1.5" style={{ width: 128 }}>
                        {HIGHLIGHT_COLORS.map(c => (
                          <button key={c} onMouseDown={ev => { ev.preventDefault(); execFormat('hiliteColor', c === 'transparent' ? 'transparent' : c); setHlOpen(false) }}
                            className="w-5 h-5 rounded-full border border-gray-200 dark:border-white/10 hover:scale-110 transition-transform"
                            style={{ background: c === 'transparent' ? 'repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 0/8px 8px' : c }} />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="w-px h-4 bg-gray-200 dark:bg-white/10 mx-0.5" />
                  <button title="Bullet list" onMouseDown={ev => { ev.preventDefault(); execFormat('insertUnorderedList') }}
                    className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button title="Numbered list" onMouseDown={ev => { ev.preventDefault(); execFormat('insertOrderedList') }}
                    className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                    <ListOrdered className="w-3.5 h-3.5" />
                  </button>
                  <button title="Align left" onMouseDown={ev => { ev.preventDefault(); execFormat('justifyLeft') }}
                    className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                    <AlignLeft className="w-3.5 h-3.5" />
                  </button>
                  <button title="Justify" onMouseDown={ev => { ev.preventDefault(); execFormat('justifyFull') }}
                    className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                    <AlignJustify className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-px h-4 bg-gray-200 dark:bg-white/10 mx-0.5" />
                  <button title="Insert signature" onMouseDown={ev => { ev.preventDefault(); insertComposeSignature() }}
                    className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                    <FileSignature className="w-3.5 h-3.5" />
                  </button>
                  <button title="Attach file" onMouseDown={ev => { ev.preventDefault() }}
                    className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                    <Paperclip className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {/* Body */}
              <div
                ref={composeRef}
                contentEditable
                suppressContentEditableWarning
                data-placeholder="Write your email…"
                className="flex-1 p-4 text-sm text-gray-800 dark:text-gray-200 leading-relaxed outline-none overflow-y-auto empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:pointer-events-none"
              />
              {/* Footer */}
              <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 dark:border-white/8 shrink-0 bg-gray-50 dark:bg-white/[0.02]">
                <button
                  onClick={handleComposeSend}
                  disabled={composeSending || !contactEmail}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-[#15A4AE] hover:bg-[#0e8b94] disabled:opacity-50 text-white rounded-xl transition-colors"
                >
                  {composeSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  {composeSending ? 'Sending…' : 'Send'}
                </button>
                <button onClick={() => setCenterMode('guidance')}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                  Discard
                </button>
                {composeSent && (
                  <span className={cn('ml-auto text-xs font-semibold', composeSent === 'sent' ? 'text-green-600 dark:text-green-400' : 'text-red-500')}>
                    {composeSent === 'sent' ? 'Email sent!' : composeSent}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Deal details + tabs ───────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-xl border border-gray-200/60 dark:border-white/8 overflow-hidden">

          {/* Right header */}
          <div className="shrink-0 bg-[#141c2b] border-b border-white/10 px-4 py-2.5 flex items-center gap-3 shadow-[0_4px_12px_rgba(0,0,0,0.25)]">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-tight">{dealTitle}</p>
              {(stageObj || contactName) && (
                <p className="text-xs text-white/60 leading-tight truncate">
                  {stageObj ? (stageObj.name as string) : ''}{stageObj && contactName ? ' · ' : ''}{contactName ?? ''}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {dealStatus !== 'won' && (
                <button onClick={() => setWonLostMode('won')}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 hover:bg-green-100 rounded-lg border border-green-200 dark:border-green-500/20 transition-colors">
                  <Trophy className="w-3 h-3" /> Won
                </button>
              )}
              {dealStatus !== 'lost' && (
                <button onClick={() => setWonLostMode('lost')}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 rounded-lg border border-red-200 dark:border-red-500/20 transition-colors">
                  <XCircle className="w-3 h-3" /> Lost
                </button>
              )}
              <button onClick={() => setShowEditForm(v => !v)}
                className={cn('p-1.5 rounded-lg transition-colors', showEditForm ? 'bg-[#15A4AE]/10 text-[#15A4AE]' : 'text-white/60 hover:text-white hover:bg-white/10')}>
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100 dark:border-white/8 shrink-0 bg-white dark:bg-[#1e1e1e]">
            {(['overview', 'activity'] as const).map(tab => (
              <button key={tab} onClick={() => setRightTab(tab)}
                className={cn('flex-1 py-2.5 text-xs font-semibold transition-colors capitalize',
                  rightTab === tab ? 'text-[#15A4AE] border-b-2 border-[#15A4AE]' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
                )}>
                {tab}
              </button>
            ))}
          </div>

          {/* Inline edit form */}
          {showEditForm && (
            <form
              onSubmit={async e => {
                e.preventDefault()
                if (!dealId) return
                setEditSaving(true)
                const fd = new FormData(e.currentTarget)
                const newStageId = (fd.get('stage_id') as string) || null
                await updateDeal(dealId, fd)
                if (newStageId && newStageId !== (deal?.stage_id as string)) {
                  await moveDeal(dealId, newStageId)
                }
                const res = await getDealDetail(dealId)
                setDeal(res.deal!)
                setEditSaving(false)
                setShowEditForm(false)
                router.refresh()
              }}
              className="border-b dark:border-white/8 px-5 py-4 bg-gray-50 dark:bg-white/[0.02] space-y-3 shrink-0"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Edit Deal</p>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Title</label>
                <input name="title" type="text" required defaultValue={dealTitle}
                  className="w-full px-3 py-1.5 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Value</label>
                  <input name="value" type="number" min="0" step="0.01" defaultValue={dealValue ?? ''}
                    className="w-full px-3 py-1.5 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Currency</label>
                  <select name="currency" defaultValue={dealCurrency}
                    className="w-full px-3 py-1.5 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]">
                    <option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option>
                    <option value="AUD">AUD</option><option value="CAD">CAD</option><option value="NZD">NZD</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Close Date</label>
                  <input name="close_date" type="date" defaultValue={dealCloseDate ?? ''}
                    className="w-full px-3 py-1.5 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#15A4AE] dark:[color-scheme:dark]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Priority</label>
                  <select name="priority" defaultValue={dealPriority ?? ''}
                    className="w-full px-3 py-1.5 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]">
                    <option value="">None</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                  </select>
                </div>
              </div>
              {stages.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Stage</label>
                  <select name="stage_id" defaultValue={(deal?.stage_id as string) ?? ''}
                    className="w-full px-3 py-1.5 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]">
                    {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
                <textarea name="description" rows={2} defaultValue={dealDesc ?? ''}
                  className="w-full px-3 py-1.5 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#15A4AE] resize-none" />
              </div>
              <div className="flex gap-2 pt-1">
                {confirmDelete ? (
                  <>
                    <span className="flex-1 text-xs text-red-600 dark:text-red-400 flex items-center">Delete this deal?</span>
                    <button type="button" onClick={() => setConfirmDelete(false)}
                      className="px-3 py-1.5 text-xs border dark:border-white/10 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">No</button>
                    <button type="button" disabled={deleting}
                      onClick={async () => {
                        if (!dealId) return
                        setDeleting(true)
                        try { await deleteDeal(dealId); router.push(`/sage/pipelines/${pipelineId}`) }
                        catch { setDeleting(false) }
                      }}
                      className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-60">
                      {deleting ? 'Deleting…' : 'Yes, delete'}
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => setConfirmDelete(true)}
                      className="px-3 py-1.5 text-xs border border-red-200 dark:border-red-500/20 rounded-lg text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">Delete</button>
                    <button type="button" onClick={() => { setShowEditForm(false); setConfirmDelete(false) }}
                      className="flex-1 px-3 py-1.5 text-xs border dark:border-white/10 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">Cancel</button>
                    <button type="submit" disabled={editSaving}
                      className="flex-1 px-3 py-1.5 text-xs bg-[#15A4AE] hover:bg-[#0e8b94] text-white font-semibold rounded-lg transition-colors disabled:opacity-60">
                      {editSaving ? 'Saving…' : 'Save'}
                    </button>
                  </>
                )}
              </div>
            </form>
          )}

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">

            {/* ── OVERVIEW TAB ── */}
            {rightTab === 'overview' && (
              <div className="p-4 space-y-4">

                {/* Won/Lost banners */}
                {dealStatus === 'won' && dealWonAt && (
                  <div className="p-3 bg-green-50 dark:bg-green-500/10 rounded-xl border border-green-200 dark:border-green-500/20 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-green-700 dark:text-green-300">Deal Won</p>
                      <p className="text-xs text-green-600/70 dark:text-green-400/70">{formatDate(dealWonAt)}</p>
                    </div>
                    <button onClick={handleConvertToProject} disabled={converting}
                      className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white transition-colors">
                      {converting ? 'Creating…' : '→ Start project'}
                    </button>
                  </div>
                )}
                {dealStatus === 'lost' && (
                  <div className="p-3 bg-red-50 dark:bg-red-500/10 rounded-xl border border-red-200 dark:border-red-500/20 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-red-600 dark:text-red-400">Deal Lost</p>
                      {dealLostReason && <p className="text-xs text-red-500/70 dark:text-red-400/70">Reason: {dealLostReason}</p>}
                    </div>
                  </div>
                )}

                {/* Deal details grid */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">Deal Details</p>
                  <div className="grid grid-cols-2 gap-2">
                    {dealValue && (
                      <div className="p-2.5 bg-gray-50 dark:bg-white/[0.03] rounded-xl border dark:border-white/8">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-0.5">Value</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatCurrency(dealValue, dealCurrency)}</p>
                      </div>
                    )}
                    {stageObj && (
                      <div className="p-2.5 bg-gray-50 dark:bg-white/[0.03] rounded-xl border dark:border-white/8">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-0.5">Stage</p>
                        {stages.length > 0 ? (
                          <select value={(deal?.stage_id as string) ?? ''}
                            onChange={async e => {
                              if (!dealId) return
                              await moveDeal(dealId, e.target.value)
                              const res = await getDealDetail(dealId)
                              setDeal(res.deal!)
                              router.refresh()
                            }}
                            className="w-full text-xs font-medium text-gray-900 dark:text-gray-100 bg-transparent border-none p-0 focus:outline-none cursor-pointer">
                            {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        ) : (
                          <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{stageObj.name as string}</p>
                        )}
                      </div>
                    )}
                    {dealPriority && (
                      <div className="p-2.5 bg-gray-50 dark:bg-white/[0.03] rounded-xl border dark:border-white/8">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-0.5">Priority</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${PRIORITY_BADGE[dealPriority] ?? ''}`}>{dealPriority}</span>
                      </div>
                    )}
                    {dealCloseDate && (
                      <div className="p-2.5 bg-gray-50 dark:bg-white/[0.03] rounded-xl border dark:border-white/8">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-0.5">Close Date</p>
                        <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{formatDate(dealCloseDate)}</p>
                      </div>
                    )}
                    {dealSource && (
                      <div className="p-2.5 bg-gray-50 dark:bg-white/[0.03] rounded-xl border dark:border-white/8">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-0.5">Source</p>
                        <p className="text-xs font-medium text-gray-900 dark:text-gray-100 capitalize">{dealSource}</p>
                      </div>
                    )}
                    {dealWinPct != null && (
                      <div className="p-2.5 bg-gray-50 dark:bg-white/[0.03] rounded-xl border dark:border-white/8">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-0.5">Win %</p>
                        <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{dealWinPct}%</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Lead created */}
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-white/[0.03] rounded-xl border dark:border-white/8">
                  <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <div className="flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Lead Created</p>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mt-0.5">{formatDateTime(dealCreatedAt)}</p>
                  </div>
                  <span className="text-[10px] text-gray-300 dark:text-gray-600 italic">locked</span>
                </div>

                {/* Contact */}
                {contact && contactName && (
                  <div className="rounded-xl border dark:border-white/8 overflow-hidden">
                    <div className="flex items-center gap-3 px-3.5 py-3 bg-gray-50 dark:bg-white/[0.03] border-b dark:border-white/8">
                      <div className="w-9 h-9 rounded-full bg-[#15A4AE]/15 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-[#15A4AE]">{contactName.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{contactName}</p>
                        {contactTitle && <p className="text-xs text-gray-400">{contactTitle}</p>}
                        {contactType && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#15A4AE]/10 text-[#15A4AE] font-medium capitalize">
                            {contactType.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                      {contactId && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => setEditingContactId(contactId)}
                            className="p-1.5 text-gray-400 hover:text-[#15A4AE] hover:bg-gray-100 dark:hover:bg-white/8 rounded-lg transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <a href={`/sage/contacts/${contactId}`}
                            className="p-1.5 text-gray-400 hover:text-[#15A4AE] hover:bg-gray-100 dark:hover:bg-white/8 rounded-lg transition-colors">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}
                    </div>
                    <div className="divide-y dark:divide-white/8">
                      {contactEmail && (
                        <div className="flex items-center gap-2.5 px-3.5 py-2.5">
                          <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <a href={`mailto:${contactEmail}`} className="text-xs text-gray-700 dark:text-gray-300 hover:text-[#15A4AE] transition-colors truncate">{contactEmail}</a>
                        </div>
                      )}
                      {contactPhone && (
                        <div className="flex items-center gap-2.5 px-3.5 py-2.5">
                          <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <a href={`tel:${contactPhone}`} className="text-xs text-gray-700 dark:text-gray-300 hover:text-[#15A4AE] transition-colors">{contactPhone}</a>
                        </div>
                      )}
                      {contactCompany && (
                        <div className="flex items-center gap-2.5 px-3.5 py-2.5">
                          <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="text-xs text-gray-700 dark:text-gray-300">{contactCompany}</span>
                        </div>
                      )}
                      {contactWebsite && (
                        <div className="flex items-center gap-2.5 px-3.5 py-2.5">
                          <Globe className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <a href={contactWebsite.startsWith('http') ? contactWebsite : `https://${contactWebsite}`} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-gray-700 dark:text-gray-300 hover:text-[#15A4AE] transition-colors truncate">{contactWebsite}</a>
                        </div>
                      )}
                      {fullAddress && (
                        <div className="flex items-start gap-2.5 px-3.5 py-2.5">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                          <span className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{fullAddress}</span>
                        </div>
                      )}
                      {contactGoal && (
                        <div className="flex items-start gap-2.5 px-3.5 py-2.5">
                          <User className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Business Goal</p>
                            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{contactGoal}</p>
                          </div>
                        </div>
                      )}
                      {contactSource && (
                        <div className="flex items-center gap-2.5 px-3.5 py-2.5">
                          <Tag className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="text-[10px] text-gray-400 uppercase tracking-wide">Source</span>
                          <span className="text-xs text-gray-700 dark:text-gray-300 capitalize ml-1">{contactSource}</span>
                        </div>
                      )}
                      {contactTags.length > 0 && (
                        <div className="flex items-start gap-2.5 px-3.5 py-2.5">
                          <Tag className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                          <div className="flex flex-wrap gap-1">
                            {contactTags.map(t => (
                              <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-400">{t}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Description */}
                {dealDesc && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1.5">Description</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{dealDesc}</p>
                  </div>
                )}

                {/* Deal tags */}
                {dealTags.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1.5">Tags</p>
                    <div className="flex flex-wrap gap-1.5">
                      {dealTags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-400 rounded-full">{tag}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── ACTIVITY TAB ── */}
            {rightTab === 'activity' && (
              <div className="flex flex-col">

                {/* Activity stats */}
                <div className="grid grid-cols-2 gap-0 mx-4 my-3 rounded-xl border dark:border-white/8 overflow-hidden">
                  {[
                    { label: 'Interactions',   value: activities.length },
                    { label: 'Last Contacted', value: lastActivity ? formatDate(lastActivity) : 'Never' },
                    { label: 'Inactive Days',  value: inactiveDays },
                    { label: 'Days in Stage',  value: daysInStage },
                  ].map((stat, i) => (
                    <div key={i} className={cn('px-3 py-2.5 text-center bg-gray-50 dark:bg-white/[0.02]', i % 2 === 0 ? 'border-r dark:border-white/8' : '', i < 2 ? 'border-b dark:border-white/8' : '')}>
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-none">{stat.value}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 leading-tight">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Tasks & Reminders */}
                {allPendingItems.length > 0 && (
                  <div className="px-4 pb-3 space-y-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 flex items-center gap-1.5">
                      <AlertCircle className="w-3 h-3" /> Tasks &amp; Reminders
                      {overdueCount > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400">
                          {overdueCount} overdue
                        </span>
                      )}
                    </p>
                    <div className="flex border-b dark:border-white/8 -mx-0.5 mb-2">
                      {(['all', 'pending', 'upcoming', 'reminders'] as const).map(f => (
                        <button key={f} onClick={() => setTaskFilter(f)}
                          className={cn('flex-1 px-1 py-2 text-[11px] font-semibold transition-colors flex items-center justify-center gap-1',
                            taskFilter === f ? 'text-[#15A4AE] border-b-2 border-[#15A4AE]' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
                          )}>
                          {f.charAt(0).toUpperCase() + f.slice(1)}
                          {pendingCounts[f] > 0 && (
                            <span className={cn('text-[9px] px-1 py-0.5 rounded-full leading-none font-bold',
                              f === 'pending' && pendingCounts[f] > 0 ? 'bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400' : 'bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400',
                            )}>{pendingCounts[f]}</span>
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {visibleItems.map(item => {
                        const style   = itemStyle(item.due_at)
                        const overdue = new Date(item.due_at).getTime() < now
                        const Icon    = item.kind === 'reminder' ? Bell : (ACTIVITY_ICONS[item.type as ActivityType] ?? FileText)
                        return (
                          <div key={`${item.kind}-${item.id}`} className="flex items-start gap-2.5 rounded-lg border dark:border-white/8 p-2.5 bg-gray-50 dark:bg-white/[0.02]">
                            <div className={`w-1 self-stretch rounded-full shrink-0 ${style.bar}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <Icon className={`w-3 h-3 shrink-0 ${style.text}`} />
                                <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate flex-1">{item.label}</p>
                                {item.kind === 'reminder' && (
                                  <span className="text-[9px] px-1 py-0.5 rounded bg-gray-100 dark:bg-white/8 text-gray-400 shrink-0">reminder</span>
                                )}
                              </div>
                              {'note' in item && item.note && (
                                <p className="text-[11px] text-gray-400 truncate mb-1">{item.note}</p>
                              )}
                              <div className="flex items-center justify-between gap-2 mt-1">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${style.label}`}>
                                  {overdue ? 'Overdue · ' : 'Due '}{formatDate(item.due_at)}
                                </span>
                                {item.kind === 'task' && (
                                  <button onClick={() => handleCompleteTask(item.id)} disabled={isPending}
                                    className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-[#15A4AE] transition-colors disabled:opacity-50">
                                    <Check className="w-3 h-3" /> Done
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="border-t border-gray-100 dark:border-white/8 mx-4" />

                {/* Log activity form */}
                <div className="mx-4 my-3 rounded-xl border dark:border-white/8 overflow-hidden">
                  <div className="flex border-b dark:border-white/8">
                    <button onClick={() => { setShowReminderForm(true); setShowAddForm(false) }}
                      className={cn('flex-1 px-2 py-2.5 text-xs font-semibold transition-colors flex items-center justify-center gap-1',
                        showReminderForm ? 'text-amber-600 dark:text-amber-400 border-b-2 border-amber-500' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
                      )}>
                      <Bell className="w-3 h-3" /> Set Activity
                      {reminders.length > 0 && (
                        <span className="ml-0.5 text-[10px] bg-amber-100 dark:bg-amber-500/20 text-amber-600 px-1 py-0.5 rounded-full leading-none">{reminders.length}</span>
                      )}
                    </button>
                    <button onClick={() => { setShowAddForm(true); setShowReminderForm(false); setAddType('call') }}
                      className={cn('flex-1 px-2 py-2.5 text-xs font-semibold transition-colors',
                        showAddForm && addType !== 'note' ? 'text-[#15A4AE] border-b-2 border-[#15A4AE]' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
                      )}>
                      Log Activity
                    </button>
                    <button onClick={() => { setShowAddForm(true); setShowReminderForm(false); setAddType('note') }}
                      className={cn('flex-1 px-2 py-2.5 text-xs font-semibold transition-colors',
                        showAddForm && addType === 'note' ? 'text-[#15A4AE] border-b-2 border-[#15A4AE]' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
                      )}>
                      Note
                    </button>
                  </div>

                  {showAddForm && (
                    <div className="p-3 bg-white dark:bg-[#252525] space-y-2.5">
                      {addType !== 'note' && (
                        <div className="relative">
                          <button onClick={() => setShowTypeMenu(v => !v)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-colors">
                            {ACTIVITY_LABELS[addType]} <ChevronDown className="w-3 h-3 text-gray-400" />
                          </button>
                          {showTypeMenu && (
                            <div className="absolute top-full left-0 mt-1 w-40 bg-white dark:bg-[#2a2a2a] border dark:border-white/10 rounded-xl shadow-lg z-10 py-1">
                              {(['call', 'meeting', 'task'] as ActivityType[]).map(t => (
                                <button key={t} onClick={() => { setAddType(t); setShowTypeMenu(false) }}
                                  className={cn('w-full text-left px-3 py-2 text-xs transition-colors',
                                    addType === t ? 'text-[#15A4AE] bg-[#15A4AE]/10' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5',
                                  )}>{ACTIVITY_LABELS[t]}</button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {addType === 'task' && (
                        <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Task title…"
                          className="w-full px-3 py-2 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]" />
                      )}
                      <textarea value={formBody} onChange={e => setFormBody(e.target.value)} rows={3}
                        placeholder={addType === 'note' ? 'Write a note…' : addType === 'call' ? 'Call summary…' : addType === 'meeting' ? 'Meeting notes…' : 'Task description…'}
                        className="w-full px-3 py-2 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#15A4AE]" />
                      {addType === 'task' && (
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Due date (optional)</label>
                          <input type="datetime-local" value={formDue} onChange={e => setFormDue(e.target.value)}
                            className="px-3 py-1.5 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#15A4AE] dark:[color-scheme:dark]" />
                        </div>
                      )}
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={resetForm} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-200">Cancel</button>
                        <button onClick={handleSubmitActivity} disabled={isPending || (!formBody.trim() && !formTitle.trim())}
                          className="px-4 py-1.5 text-xs font-semibold bg-[#15A4AE] hover:bg-[#0e8b94] text-white rounded-lg disabled:opacity-50 transition-colors">
                          {isPending ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    </div>
                  )}

                  {showReminderForm && (
                    <div className="p-3 bg-white dark:bg-[#252525] space-y-2.5">
                      {reminderSaved ? (
                        <div className="flex items-center gap-2 px-3 py-2.5 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl">
                          <Check className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-green-700 dark:text-green-400">Activity scheduled!</p>
                            <p className="text-[11px] text-green-600/70 mt-0.5">You'll be notified 10 min before.</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="relative">
                            <button onClick={() => setShowReminderTypeMenu(v => !v)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-colors">
                              {ACTIVITY_LABELS[reminderType]} <ChevronDown className="w-3 h-3 text-gray-400" />
                            </button>
                            {showReminderTypeMenu && (
                              <div className="absolute top-full left-0 mt-1 w-40 bg-white dark:bg-[#2a2a2a] border dark:border-white/10 rounded-xl shadow-lg z-10 py-1">
                                {(['call', 'meeting', 'task'] as ActivityType[]).map(t => (
                                  <button key={t} onClick={() => { setReminderType(t); setShowReminderTypeMenu(false) }}
                                    className={cn('w-full text-left px-3 py-2 text-xs transition-colors',
                                      reminderType === t ? 'text-amber-600 bg-amber-50 dark:bg-amber-500/10' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5',
                                    )}>{ACTIVITY_LABELS[t]}</button>
                                ))}
                              </div>
                            )}
                          </div>
                          <input type="text" value={reminderTitle} onChange={e => setReminderTitle(e.target.value)}
                            placeholder="Subject (e.g. Follow up call)"
                            className="w-full px-3 py-2 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400" />
                          <textarea value={reminderNote} onChange={e => setReminderNote(e.target.value)} rows={2}
                            placeholder="Details / agenda (optional)…"
                            className="w-full px-3 py-2 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400" />
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Scheduled for</label>
                            <input type="datetime-local" value={reminderDue} onChange={e => setReminderDue(e.target.value)}
                              className="px-3 py-1.5 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:[color-scheme:dark]" />
                            <p className="text-[10px] text-gray-400 mt-1">Pop-up reminder 10 min before</p>
                          </div>
                          <div className="flex items-center gap-2 justify-end">
                            <button onClick={() => { setShowReminderForm(false); setReminderTitle(''); setReminderNote(''); setReminderDue('') }}
                              className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-200">Cancel</button>
                            <button onClick={handleSubmitReminder} disabled={reminderSaving || !reminderTitle.trim() || !reminderDue}
                              className="px-4 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-lg disabled:opacity-50 transition-colors">
                              {reminderSaving ? 'Scheduling…' : 'Schedule'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {!showAddForm && !showReminderForm && (
                    <button onClick={() => { setShowAddForm(true); setAddType('call') }}
                      className="w-full px-4 py-3 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors text-left">
                      Click here to add a note or log activity…
                    </button>
                  )}
                </div>

                {/* Activity feed */}
                <div className="px-4 pb-4 space-y-4">
                  {activityGroups.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">No activity logged yet.</p>
                  ) : (
                    activityGroups.map(group => (
                      <div key={group.label}>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">{group.label}</p>
                        <div className="space-y-2">
                          {group.items.map(activity => {
                            const Icon  = ACTIVITY_ICONS[activity.type as ActivityType] ?? FileText
                            const color = ACTIVITY_COLORS[activity.type as ActivityType] ?? 'text-gray-400 bg-gray-50 dark:bg-white/5'
                            const isTask = activity.type === 'task'
                            const isDone = !!activity.completed_at
                            return (
                              <div key={activity.id} className="flex items-start gap-2.5">
                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${isDone ? 'bg-gray-100 dark:bg-white/5' : color}`}>
                                  <Icon className={`w-3 h-3 ${isDone ? 'text-gray-400' : ''}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      {activity.title && (
                                        <p className={`text-xs font-semibold leading-snug ${isDone ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                                          {activity.title}
                                        </p>
                                      )}
                                      {activity.body && (
                                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mt-0.5 whitespace-pre-wrap">{activity.body}</p>
                                      )}
                                      {activity.due_at && (
                                        <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">Due: {formatDate(activity.due_at)}</p>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-gray-400 shrink-0 mt-0.5">{timeAgo(activity.created_at)}</span>
                                  </div>
                                  {isTask && !isDone && (
                                    <button onClick={() => handleCompleteTask(activity.id)} disabled={isPending}
                                      className="mt-1 flex items-center gap-1 text-[10px] text-gray-400 hover:text-[#15A4AE] transition-colors disabled:opacity-50">
                                      <Check className="w-3 h-3" /> Mark done
                                    </button>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>

              </div>
            )}

          </div>
        </div>

      </div>
    </>
  )
}
