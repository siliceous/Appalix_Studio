'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import {
  X, Trophy, XCircle, FileText, Phone, Users, CheckSquare,
  Clock, Check, ChevronRight, ExternalLink, Building2, Tag,
  DollarSign, AlertCircle, Mail, Globe, MapPin,
  User, Lock, ChevronDown, Pencil, Bell,
} from 'lucide-react'
import { getDealDetail, addDealActivity, completeDealTask, addDealReminder, getDealReminders, updateDeal } from '@/app/actions/sage'
import { WonLostModal } from './won-lost-modal'
import { ContactEditModal } from './contact-edit-modal'
import type { SageDealActivity } from '@/lib/types'

type DealReminder = { id: string; title: string; note: string | null; due_at: string }

type ActivityType = 'note' | 'call' | 'meeting' | 'task'

interface DealSlideOverProps {
  dealId:  string | null
  onClose: () => void
}

const ACTIVITY_ICONS: Record<ActivityType, React.ElementType> = {
  note:    FileText,
  call:    Phone,
  meeting: Users,
  task:    CheckSquare,
}

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  note:    'Note',
  call:    'Phone Call',
  meeting: 'Meeting',
  task:    'Task',
}

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  note:    'text-blue-500 bg-blue-50 dark:bg-blue-500/10',
  call:    'text-green-500 bg-green-50 dark:bg-green-500/10',
  meeting: 'text-purple-500 bg-purple-50 dark:bg-purple-500/10',
  task:    'text-amber-500 bg-amber-50 dark:bg-amber-500/10',
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
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
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const thisWeekStart = new Date(today)
  thisWeekStart.setDate(today.getDate() - today.getDay())

  const groups: { label: string; items: SageDealActivity[] }[] = []
  const buckets: Record<string, SageDealActivity[]> = { Today: [], 'This Week': [], Earlier: [] }

  for (const a of activities) {
    const d = new Date(a.created_at)
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    if (day >= today) buckets['Today'].push(a)
    else if (day >= thisWeekStart) buckets['This Week'].push(a)
    else buckets['Earlier'].push(a)
  }

  for (const label of ['Today', 'This Week', 'Earlier']) {
    if (buckets[label].length > 0) groups.push({ label, items: buckets[label] })
  }
  return groups
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

export function DealSlideOver({ dealId, onClose }: DealSlideOverProps) {
  const [deal,          setDeal]          = useState<Record<string, unknown> & { contact: Record<string, unknown> | null } | null>(null)
  const [activities,    setActivities]    = useState<SageDealActivity[]>([])
  const [loading,       setLoading]       = useState(false)
  const [activeTab,     setActiveTab]     = useState<'overview' | 'activity'>('overview')
  const [addType,       setAddType]       = useState<ActivityType>('note')
  const [showTypeMenu,  setShowTypeMenu]  = useState(false)
  const [showAddForm,   setShowAddForm]   = useState(false)
  const [formTitle,     setFormTitle]     = useState('')
  const [formBody,      setFormBody]      = useState('')
  const [formDue,       setFormDue]       = useState('')
  const [wonLostMode,      setWonLostMode]      = useState<'won' | 'lost' | null>(null)
  const [editingContactId, setEditingContactId] = useState<string | null>(null)
  const [showEditForm,     setShowEditForm]     = useState(false)
  const [editSaving,       setEditSaving]       = useState(false)
  const [isPending,        startTransition]     = useTransition()
  const slideRef = useRef<HTMLDivElement>(null)

  // Set Activity state (future-dated planned activity + notification)
  const [reminders,          setReminders]          = useState<DealReminder[]>([])
  const [showReminderForm,   setShowReminderForm]   = useState(false)
  const [reminderTitle,      setReminderTitle]      = useState('')
  const [reminderNote,       setReminderNote]       = useState('')
  const [reminderDue,        setReminderDue]        = useState('')
  const [reminderType,       setReminderType]       = useState<ActivityType>('call')
  const [reminderSaving,     setReminderSaving]     = useState(false)
  const [reminderSaved,      setReminderSaved]      = useState(false)
  const [showReminderTypeMenu, setShowReminderTypeMenu] = useState(false)

  useEffect(() => {
    if (!dealId) { setDeal(null); setActivities([]); setReminders([]); return }
    setLoading(true)
    setActiveTab('overview')
    Promise.all([
      getDealDetail(dealId),
      getDealReminders(dealId),
    ]).then(([detail, rems]) => {
      setDeal(detail.deal)
      setActivities(detail.activities)
      setReminders(rems)
      setLoading(false)
    })
  }, [dealId])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function resetForm() {
    setShowAddForm(false)
    setFormTitle('')
    setFormBody('')
    setFormDue('')
  }

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
      if (dealId) {
        const res = await getDealDetail(dealId)
        setActivities(res.activities)
      }
    })
  }

  function handleWonLostConfirm() {
    setWonLostMode(null)
    if (dealId) {
      getDealDetail(dealId).then(res => { setDeal(res.deal); setActivities(res.activities) })
    }
  }

  async function handleSubmitReminder() {
    if (!dealId || !reminderTitle.trim() || !reminderDue) return
    setReminderSaving(true)
    // Request browser notification permission on first use
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
    const dueIso = new Date(reminderDue).toISOString()
    // Save as a deal activity (shows in timeline) + reminder (fires notification)
    await Promise.all([
      addDealActivity(dealId, reminderType, reminderTitle, reminderNote || undefined, dueIso),
      addDealReminder(dealId, reminderTitle, reminderNote || null, dueIso),
    ])
    const [detail, rems] = await Promise.all([getDealDetail(dealId), getDealReminders(dealId)])
    setActivities(detail.activities)
    setReminders(rems)
    setReminderTitle('')
    setReminderNote('')
    setReminderDue('')
    setReminderType('call')
    setReminderSaved(true)
    setTimeout(() => { setReminderSaved(false); setShowReminderForm(false) }, 2500)
    setReminderSaving(false)
  }

  const isOpen = !!dealId
  if (!isOpen) return null

  const contact = deal?.contact as Record<string, unknown> | null
  const stage   = deal?.stage   as Record<string, unknown> | null

  const dealTitle      = (deal?.title          as string       ) ?? ''
  const dealValue      = (deal?.value          as number | null) ?? null
  const dealCurrency   = (deal?.currency       as string       ) ?? 'USD'
  const dealStatus     = (deal?.status         as string       ) ?? ''
  const dealPriority   = (deal?.priority       as string | null) ?? null
  const dealCloseDate  = (deal?.close_date     as string | null) ?? null
  const dealSource     = (deal?.source         as string | null) ?? null
  const dealWinPct     = (deal?.win_percentage as number | null) ?? null
  const dealWonAt      = (deal?.won_at         as string | null) ?? null
  const dealLostReason = (deal?.lost_reason    as string | null) ?? null
  const dealDesc       = (deal?.description    as string | null) ?? null
  const dealTags       = Array.isArray(deal?.tags) ? (deal!.tags as string[]) : []
  const dealPipelineId = (deal?.pipeline_id    as string | null) ?? null
  const dealCreatedAt  = (deal?.created_at     as string | null) ?? null

  // Contact fields (all of them)
  const contactId      = (contact?.id           as string | null) ?? null
  const contactName    = (contact?.name         as string | null) ?? null
  const contactEmail   = (contact?.email        as string | null) ?? null
  const contactPhone   = (contact?.phone        as string | null) ?? null
  const contactCompany = (contact?.company_name as string | null) ?? null
  const contactTitle   = (contact?.title        as string | null) ?? null
  const contactWebsite = (contact?.website_url  as string | null) ?? null
  const contactGoal    = (contact?.business_goal as string | null) ?? null
  const contactType    = (contact?.contact_type as string | null) ?? null
  const contactSource  = (contact?.source       as string | null) ?? null
  const contactTags    = Array.isArray(contact?.tags) ? (contact!.tags as string[]) : []
  const contactCreated = (contact?.created_at   as string | null) ?? null
  const contactStreet  = (contact?.street       as string | null) ?? null
  const contactCity    = (contact?.city         as string | null) ?? null
  const contactState   = (contact?.state        as string | null) ?? null
  const contactZip     = (contact?.zip          as string | null) ?? null
  const contactCountry = (contact?.country      as string | null) ?? null

  const addressParts = [contactStreet, contactCity, contactState, contactZip, contactCountry].filter(Boolean)
  const fullAddress  = addressParts.length > 0 ? addressParts.join(', ') : null

  // Activity stats
  const lastActivity   = activities[0]?.created_at ?? null
  const inactiveDays   = lastActivity ? daysSince(lastActivity) : daysSince(dealCreatedAt)
  const daysInStage    = daysSince(dealCreatedAt)

  const activityGroups = groupActivitiesByDate(activities)

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40 transition-opacity" onClick={onClose} />

      {/* Slide-over panel */}
      <div
        ref={slideRef}
        className={`fixed top-0 right-0 h-full w-[520px] max-w-full bg-white dark:bg-[#1e1e1e] border-l dark:border-white/8 z-50 flex flex-col shadow-2xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {loading || !deal ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-7 h-7 rounded-full border-2 border-gray-200 dark:border-white/10 border-t-brand-600 animate-spin" />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-5 pt-5 pb-0 border-b dark:border-white/8 shrink-0">
              <div className="flex items-start gap-3 mb-4">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-[#61c2ad]/15 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-brand-700 dark:text-[#61c2ad]">
                    {dealTitle.charAt(0).toUpperCase()}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug">{dealTitle}</h2>
                  {contactName && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {contactName}{contactCompany ? ` · ${contactCompany}` : ''}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {dealValue && (
                      <span className="flex items-center gap-1 text-sm font-bold text-gray-900 dark:text-gray-100">
                        <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                        {formatCurrency(dealValue, dealCurrency)}
                      </span>
                    )}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_BADGE[dealStatus] ?? ''}`}>
                      {dealStatus}
                    </span>
                    {dealPriority && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${PRIORITY_BADGE[dealPriority] ?? ''}`}>
                        {dealPriority}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {dealStatus !== 'won' && (
                    <button
                      onClick={() => setWonLostMode('won')}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 hover:bg-green-100 dark:hover:bg-green-500/20 rounded-lg border border-green-200 dark:border-green-500/20 transition-colors"
                    >
                      <Trophy className="w-3 h-3" /> Won
                    </button>
                  )}
                  {dealStatus !== 'lost' && (
                    <button
                      onClick={() => setWonLostMode('lost')}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg border border-red-200 dark:border-red-500/20 transition-colors"
                    >
                      <XCircle className="w-3 h-3" /> Lost
                    </button>
                  )}
                  <button
                    onClick={() => setShowEditForm(v => !v)}
                    title="Edit deal"
                    className={`p-1.5 rounded-lg transition-colors ${showEditForm ? 'bg-brand-50 dark:bg-[#61c2ad]/10 text-brand-600 dark:text-[#61c2ad]' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8'}`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={onClose}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-0 border-b-0">
                {(['overview', 'activity'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 text-xs font-semibold capitalize transition-colors border-b-2 ${
                      activeTab === tab
                        ? 'border-brand-600 dark:border-[#61c2ad] text-brand-700 dark:text-[#61c2ad]'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
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
            {showEditForm && (
              <form
                onSubmit={async e => {
                  e.preventDefault()
                  if (!dealId) return
                  setEditSaving(true)
                  await updateDeal(dealId, new FormData(e.currentTarget))
                  const res = await getDealDetail(dealId)
                  setDeal(res.deal)
                  setEditSaving(false)
                  setShowEditForm(false)
                }}
                className="border-b dark:border-white/8 px-5 py-4 bg-gray-50 dark:bg-white/[0.02] space-y-3"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">Edit Deal</p>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Title</label>
                  <input name="title" type="text" required defaultValue={dealTitle} className="w-full px-3 py-1.5 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#61c2ad]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Value</label>
                    <input name="value" type="number" min="0" step="0.01" defaultValue={dealValue ?? ''} placeholder="0.00" className="w-full px-3 py-1.5 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#61c2ad]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Currency</label>
                    <select name="currency" defaultValue={dealCurrency} className="w-full px-3 py-1.5 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#61c2ad]">
                      <option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option>
                      <option value="AUD">AUD</option><option value="CAD">CAD</option><option value="NZD">NZD</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Close Date</label>
                    <input name="close_date" type="date" defaultValue={dealCloseDate ?? ''} className="w-full px-3 py-1.5 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#61c2ad] dark:[color-scheme:dark]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Priority</label>
                    <select name="priority" defaultValue={dealPriority ?? ''} className="w-full px-3 py-1.5 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#61c2ad]">
                      <option value="">None</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
                  <textarea name="description" rows={2} defaultValue={dealDesc ?? ''} placeholder="Add notes…" className="w-full px-3 py-1.5 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#61c2ad] resize-none" />
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setShowEditForm(false)} className="flex-1 px-3 py-1.5 text-xs border dark:border-white/10 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={editSaving} className="flex-1 px-3 py-1.5 text-xs bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-60">
                    {editSaving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto">

              {/* ── OVERVIEW TAB ── */}
              {activeTab === 'overview' && (
                <div className="p-5 space-y-5">

                  {/* Won/Lost banner */}
                  {dealStatus === 'won' && dealWonAt && (
                    <div className="p-3 bg-green-50 dark:bg-green-500/10 rounded-xl border border-green-200 dark:border-green-500/20 flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-green-700 dark:text-green-300">Deal Won</p>
                        <p className="text-xs text-green-600/70 dark:text-green-400/70">{formatDate(dealWonAt)}</p>
                      </div>
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

                  {/* Lead created timestamp (locked) */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-white/[0.03] rounded-xl border dark:border-white/8">
                    <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <div className="flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Lead Created</p>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mt-0.5">{formatDateTime(dealCreatedAt)}</p>
                    </div>
                    <span className="text-[10px] text-gray-300 dark:text-gray-600 italic">locked</span>
                  </div>

                  {/* Deal details grid */}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">Deal Details</p>
                    <div className="grid grid-cols-2 gap-2">
                      {stage && (
                        <div className="p-2.5 bg-gray-50 dark:bg-white/[0.03] rounded-xl border dark:border-white/8">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-0.5">Stage</p>
                          <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{stage.name as string}</p>
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

                  {/* Contact — full fields */}
                  {contact && contactName && (
                    <div className="rounded-xl border dark:border-white/8 overflow-hidden">
                      {/* Contact header */}
                      <div className="flex items-center gap-3 px-3.5 py-3 bg-gray-50 dark:bg-white/[0.03] border-b dark:border-white/8">
                        <div className="w-9 h-9 rounded-full bg-brand-100 dark:bg-[#61c2ad]/15 flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-brand-700 dark:text-[#61c2ad]">
                            {contactName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{contactName}</p>
                          {contactTitle && <p className="text-xs text-gray-400">{contactTitle}</p>}
                          {contactType && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-50 dark:bg-[#61c2ad]/10 text-brand-700 dark:text-[#61c2ad] font-medium capitalize">
                              {contactType.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                        {contactId && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setEditingContactId(contactId)}
                              className="p-1.5 text-gray-400 hover:text-brand-600 dark:hover:text-[#61c2ad] hover:bg-gray-100 dark:hover:bg-white/8 rounded-lg transition-colors"
                              title="Edit contact"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <a href={`/sage/contacts/${contactId}`} className="p-1.5 text-gray-400 hover:text-brand-600 dark:hover:text-[#61c2ad] hover:bg-gray-100 dark:hover:bg-white/8 rounded-lg transition-colors">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Contact fields list */}
                      <div className="divide-y dark:divide-white/8">
                        {contactEmail && (
                          <div className="flex items-center gap-2.5 px-3.5 py-2.5">
                            <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <a href={`mailto:${contactEmail}`} className="text-xs text-gray-700 dark:text-gray-300 hover:text-brand-600 dark:hover:text-[#61c2ad] transition-colors truncate">{contactEmail}</a>
                          </div>
                        )}
                        {contactPhone && (
                          <div className="flex items-center gap-2.5 px-3.5 py-2.5">
                            <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <a href={`tel:${contactPhone}`} className="text-xs text-gray-700 dark:text-gray-300 hover:text-brand-600 dark:hover:text-[#61c2ad] transition-colors">{contactPhone}</a>
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
                            <a href={contactWebsite.startsWith('http') ? contactWebsite : `https://${contactWebsite}`} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-700 dark:text-gray-300 hover:text-brand-600 dark:hover:text-[#61c2ad] transition-colors truncate">
                              {contactWebsite}
                            </a>
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
                        {contactCreated && (
                          <div className="flex items-center gap-2.5 px-3.5 py-2.5">
                            <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="text-[10px] text-gray-400 uppercase tracking-wide">Contact created</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">{formatDate(contactCreated)}</span>
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

                  {/* Deal description */}
                  {dealDesc && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1.5">Description</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{dealDesc}</p>
                    </div>
                  )}

                  {/* Pending Tasks — overdue Set Activities */}
                  {(() => {
                    const now = Date.now()
                    const overdue = activities.filter(a =>
                      a.due_at && !a.completed_at && new Date(a.due_at).getTime() < now
                    ).sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime())

                    function overdueUrgency(dueAt: string) {
                      const msOverdue = now - new Date(dueAt).getTime()
                      const days = msOverdue / 86400000
                      if (days > 3)  return { bar: 'bg-red-500',    text: 'text-red-600 dark:text-red-400',    label: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20' }
                      if (days > 1)  return { bar: 'bg-amber-500',  text: 'text-amber-600 dark:text-amber-400', label: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/25' }
                      return           { bar: 'bg-yellow-400',  text: 'text-yellow-600 dark:text-yellow-400', label: 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-500/25' }
                    }

                    return (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                            <AlertCircle className="w-3 h-3" /> Pending Tasks
                            {overdue.length > 0 && (
                              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400 text-[10px] font-bold">{overdue.length}</span>
                            )}
                          </p>
                          {overdue.length > 0 && (
                            <button
                              onClick={() => setActiveTab('activity')}
                              className="text-[10px] text-brand-600 dark:text-[#61c2ad] hover:underline flex items-center gap-0.5"
                            >
                              View all <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        {overdue.length === 0 ? (
                          <p className="text-xs text-gray-400 dark:text-gray-500 italic">No overdue tasks — you&apos;re all caught up.</p>
                        ) : (
                          <div className="space-y-2">
                            {overdue.map(act => {
                              const Icon = ACTIVITY_ICONS[act.type as ActivityType] ?? FileText
                              const urgency = overdueUrgency(act.due_at!)
                              return (
                                <div key={act.id} className="flex items-start gap-2.5 rounded-lg border dark:border-white/8 p-2.5 bg-gray-50 dark:bg-white/[0.02]">
                                  <div className={`w-1 self-stretch rounded-full shrink-0 ${urgency.bar}`} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                      <Icon className={`w-3 h-3 shrink-0 ${urgency.text}`} />
                                      <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate flex-1">
                                        {act.title || ACTIVITY_LABELS[act.type as ActivityType]}
                                      </p>
                                    </div>
                                    <div className="flex items-center justify-between gap-2 mt-1">
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${urgency.label}`}>
                                        Due {formatDate(act.due_at)}
                                      </span>
                                      <button
                                        onClick={() => handleCompleteTask(act.id)}
                                        disabled={isPending}
                                        className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-brand-600 dark:hover:text-[#61c2ad] transition-colors disabled:opacity-50"
                                      >
                                        <Check className="w-3 h-3" /> Done
                                      </button>
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

                  {dealPipelineId && (
                    <a href={`/sage/pipelines/${dealPipelineId}`} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-brand-600 dark:hover:text-[#61c2ad] transition-colors">
                      View in Pipeline <ChevronRight className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              )}

              {/* ── ACTIVITY TAB ── */}
              {activeTab === 'activity' && (
                <div className="p-5 space-y-4">

                  {/* Stats strip */}
                  <div className="grid grid-cols-4 gap-0 rounded-xl border dark:border-white/8 overflow-hidden">
                    {[
                      { label: 'Interactions',    value: activities.length },
                      { label: 'Last Contacted',  value: lastActivity ? formatDate(lastActivity) : 'Never' },
                      { label: 'Inactive Days',   value: inactiveDays },
                      { label: 'Days in Stage',   value: daysInStage },
                    ].map((stat, i) => (
                      <div key={i} className={`px-3 py-3 text-center ${i < 3 ? 'border-r dark:border-white/8' : ''} bg-gray-50 dark:bg-white/[0.02]`}>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-none">{stat.value}</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 leading-tight">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Log Activity section */}
                  <div className="rounded-xl border dark:border-white/8 overflow-hidden">
                    {/* Log Activity | Set Activity | Create Note */}
                    <div className="flex border-b dark:border-white/8">
                      <button
                        onClick={() => { setShowReminderForm(true); setShowAddForm(false) }}
                        className={`flex-1 px-3 py-2.5 text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${
                          showReminderForm
                            ? 'text-amber-600 dark:text-amber-400 border-b-2 border-amber-500 dark:border-amber-400'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                      >
                        <Bell className="w-3 h-3" />
                        Set Activity
                        {reminders.length > 0 && (
                          <span className="ml-0.5 text-[10px] bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1 py-0.5 rounded-full leading-none">
                            {reminders.length}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => { setShowAddForm(true); setShowReminderForm(false); setAddType('call') }}
                        className={`flex-1 px-3 py-2.5 text-xs font-semibold transition-colors ${
                          showAddForm && addType !== 'note'
                            ? 'text-brand-700 dark:text-[#61c2ad] border-b-2 border-brand-600 dark:border-[#61c2ad]'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                      >
                        Log Activity
                      </button>
                      <button
                        onClick={() => { setShowAddForm(true); setShowReminderForm(false); setAddType('note') }}
                        className={`flex-1 px-3 py-2.5 text-xs font-semibold transition-colors ${
                          showAddForm && addType === 'note'
                            ? 'text-brand-700 dark:text-[#61c2ad] border-b-2 border-brand-600 dark:border-[#61c2ad]'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                      >
                        Create Note
                      </button>
                    </div>

                    {showAddForm && (
                      <div className="p-3 bg-white dark:bg-[#252525] space-y-2.5">
                        {/* Activity type dropdown (only for Log Activity) */}
                        {addType !== 'note' && (
                          <div className="relative">
                            <button
                              onClick={() => setShowTypeMenu(v => !v)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/8 transition-colors"
                            >
                              {ACTIVITY_LABELS[addType]}
                              <ChevronDown className="w-3 h-3 text-gray-400" />
                            </button>
                            {showTypeMenu && (
                              <div className="absolute top-full left-0 mt-1 w-40 bg-white dark:bg-[#2a2a2a] border dark:border-white/10 rounded-xl shadow-lg z-10 py-1">
                                {(['call', 'meeting', 'task'] as ActivityType[]).map(t => (
                                  <button
                                    key={t}
                                    onClick={() => { setAddType(t); setShowTypeMenu(false) }}
                                    className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                                      addType === t
                                        ? 'text-brand-700 dark:text-[#61c2ad] bg-brand-50 dark:bg-[#61c2ad]/10'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                                    }`}
                                  >
                                    {ACTIVITY_LABELS[t]}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {addType === 'task' && (
                          <input
                            type="text"
                            value={formTitle}
                            onChange={e => setFormTitle(e.target.value)}
                            placeholder="Task title…"
                            className="w-full px-3 py-2 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                        )}

                        <textarea
                          value={formBody}
                          onChange={e => setFormBody(e.target.value)}
                          rows={3}
                          placeholder={
                            addType === 'note' ? 'Write a note…'
                            : addType === 'call' ? 'Call summary…'
                            : addType === 'meeting' ? 'Meeting notes…'
                            : 'Task description…'
                          }
                          className="w-full px-3 py-2 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />

                        {addType === 'task' && (
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Due date (optional)</label>
                            <input
                              type="datetime-local"
                              value={formDue}
                              onChange={e => setFormDue(e.target.value)}
                              className="px-3 py-1.5 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:[color-scheme:dark]"
                            />
                          </div>
                        )}

                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={resetForm} className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                            Cancel
                          </button>
                          <button
                            onClick={handleSubmitActivity}
                            disabled={isPending || (!formBody.trim() && !formTitle.trim())}
                            className="px-4 py-1.5 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-lg disabled:opacity-50 transition-colors"
                          >
                            {isPending ? 'Saving…' : 'Save'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Set Activity form */}
                    {showReminderForm && (
                      <div className="p-3 bg-white dark:bg-[#252525] space-y-2.5">
                        {reminderSaved ? (
                          <div className="flex items-center gap-2 px-3 py-2.5 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl">
                            <Check className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                            <div>
                              <p className="text-xs font-semibold text-green-700 dark:text-green-400">Activity scheduled!</p>
                              <p className="text-[11px] text-green-600/70 dark:text-green-400/70 mt-0.5">Added to timeline · you'll be notified 10 min before.</p>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Activity type selector */}
                            <div className="relative">
                              <button
                                onClick={() => setShowReminderTypeMenu(v => !v)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/8 transition-colors"
                              >
                                {ACTIVITY_LABELS[reminderType]}
                                <ChevronDown className="w-3 h-3 text-gray-400" />
                              </button>
                              {showReminderTypeMenu && (
                                <div className="absolute top-full left-0 mt-1 w-40 bg-white dark:bg-[#2a2a2a] border dark:border-white/10 rounded-xl shadow-lg z-10 py-1">
                                  {(['call', 'meeting', 'task'] as ActivityType[]).map(t => (
                                    <button
                                      key={t}
                                      onClick={() => { setReminderType(t); setShowReminderTypeMenu(false) }}
                                      className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                                        reminderType === t
                                          ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10'
                                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                                      }`}
                                    >
                                      {ACTIVITY_LABELS[t]}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Subject */}
                            <input
                              type="text"
                              value={reminderTitle}
                              onChange={e => setReminderTitle(e.target.value)}
                              placeholder="Subject (e.g. Follow up call with John)"
                              className="w-full px-3 py-2 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                            />

                            {/* Body */}
                            <textarea
                              value={reminderNote}
                              onChange={e => setReminderNote(e.target.value)}
                              rows={2}
                              placeholder="Details / agenda (optional)…"
                              className="w-full px-3 py-2 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
                            />

                            {/* Scheduled time */}
                            <div>
                              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Scheduled for</label>
                              <input
                                type="datetime-local"
                                value={reminderDue}
                                onChange={e => setReminderDue(e.target.value)}
                                className="px-3 py-1.5 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:[color-scheme:dark]"
                              />
                              <p className="text-[10px] text-gray-400 mt-1">Appears in timeline · pop-up reminder 10 min before</p>
                            </div>

                            <div className="flex items-center gap-2 justify-end">
                              <button
                                onClick={() => { setShowReminderForm(false); setReminderTitle(''); setReminderNote(''); setReminderDue('') }}
                                className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleSubmitReminder}
                                disabled={reminderSaving || !reminderTitle.trim() || !reminderDue}
                                className="px-4 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-lg disabled:opacity-50 transition-colors"
                              >
                                {reminderSaving ? 'Scheduling…' : 'Schedule Activity'}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {!showAddForm && !showReminderForm && (
                      <button
                        onClick={() => { setShowAddForm(true); setAddType('call') }}
                        className="w-full px-4 py-3 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors text-left"
                      >
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
                      {activityGroups.map(group => (
                        <div key={group.label}>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">{group.label}</p>
                          <div className="space-y-2">
                            {group.items.map(activity => {
                              const Icon      = ACTIVITY_ICONS[activity.type]
                              const colorClass = ACTIVITY_COLORS[activity.type]
                              const isTask    = activity.type === 'task'
                              const isDone    = !!activity.completed_at

                              return (
                                <div
                                  key={activity.id}
                                  className={`flex gap-3 p-3.5 rounded-xl border transition-colors ${
                                    isDone
                                      ? 'bg-gray-50/50 dark:bg-white/[0.02] border-gray-100 dark:border-white/5 opacity-60'
                                      : 'bg-white dark:bg-[#252525] border-gray-100 dark:border-white/8'
                                  }`}
                                >
                                  {/* User avatar */}
                                  <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center shrink-0 text-[10px] font-bold text-gray-600 dark:text-gray-300">
                                    M
                                  </div>
                                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${colorClass}`}>
                                    {isDone ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                        {activity.type === 'call' ? 'You logged a Phone Call'
                                          : activity.type === 'meeting' ? 'You logged a Meeting'
                                          : activity.type === 'task' ? (isDone ? 'Task completed' : 'Task added')
                                          : 'Note added'}
                                        {isDone && ' · Done'}
                                      </p>
                                      <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0 tabular-nums">
                                        {new Date(activity.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                      </span>
                                    </div>
                                    {activity.title && (
                                      <p className={`text-xs mt-0.5 font-medium ${isDone ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                                        {activity.title}
                                      </p>
                                    )}
                                    {activity.body && (
                                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{activity.body}</p>
                                    )}
                                    {activity.due_at && !isDone && (
                                      <p className="text-[10px] text-amber-500 mt-1 flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> Due {formatDate(activity.due_at)}
                                      </p>
                                    )}
                                    {isTask && !isDone && (
                                      <button
                                        onClick={() => handleCompleteTask(activity.id)}
                                        disabled={isPending}
                                        className="mt-1.5 flex items-center gap-1 text-[10px] font-medium text-green-600 dark:text-green-400 hover:text-green-700 disabled:opacity-50 transition-colors"
                                      >
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
          </>
        )}
      </div>

      {wonLostMode && deal && (
        <WonLostModal
          dealId={dealId!}
          dealTitle={deal.title as string}
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
            if (dealId) getDealDetail(dealId).then(res => { setDeal(res.deal); setActivities(res.activities) })
          }}
        />
      )}
    </>
  )
}
