'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import {
  X, Trophy, XCircle, FileText, Phone, Users, CheckSquare,
  Clock, Check, ChevronRight, ExternalLink, Building2, Tag,
  Calendar, DollarSign, AlertCircle,
} from 'lucide-react'
import { getDealDetail, addDealActivity, completeDealTask } from '@/app/actions/sage'
import { WonLostModal } from './won-lost-modal'
import type { SageDealActivity } from '@/lib/types'

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
  call:    'Call',
  meeting: 'Meeting',
  task:    'Task',
}

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  note:    'text-blue-500 bg-blue-50 dark:bg-blue-500/10',
  call:    'text-green-500 bg-green-50 dark:bg-green-500/10',
  meeting: 'text-purple-500 bg-purple-50 dark:bg-purple-500/10',
  task:    'text-amber-500 bg-amber-50 dark:bg-amber-500/10',
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatCurrency(value: number | null, currency: string): string {
  if (!value) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
}

const PRIORITY_BADGE: Record<string, string> = {
  high:   'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20',
  medium: 'bg-amber-50 dark:bg-amber-500/10 text-amber-500/75 dark:text-amber-400/75 border border-amber-200 dark:border-amber-500/25',
  low:    'bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10',
}

const STATUS_BADGE: Record<string, string> = {
  open: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  won:  'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400',
  lost: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
}

export function DealSlideOver({ dealId, onClose }: DealSlideOverProps) {
  const [deal,       setDeal]       = useState<Record<string, unknown> & { contact: Record<string, unknown> | null } | null>(null)
  const [activities, setActivities] = useState<SageDealActivity[]>([])
  const [loading,    setLoading]    = useState(false)
  const [activeTab,  setActiveTab]  = useState<'overview' | 'activity'>('overview')
  const [addType,    setAddType]    = useState<ActivityType | null>(null)
  const [formTitle,  setFormTitle]  = useState('')
  const [formBody,   setFormBody]   = useState('')
  const [formDue,    setFormDue]    = useState('')
  const [wonLostMode, setWonLostMode] = useState<'won' | 'lost' | null>(null)
  const [isPending,  startTransition] = useTransition()
  const slideRef = useRef<HTMLDivElement>(null)

  // Fetch deal detail when dealId changes
  useEffect(() => {
    if (!dealId) { setDeal(null); setActivities([]); return }
    setLoading(true)
    setActiveTab('overview')
    getDealDetail(dealId).then(res => {
      setDeal(res.deal)
      setActivities(res.activities)
      setLoading(false)
    })
  }, [dealId])

  // Escape to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function resetForm() {
    setAddType(null)
    setFormTitle('')
    setFormBody('')
    setFormDue('')
  }

  function handleSubmitActivity() {
    if (!addType || !dealId) return
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
    // Refresh deal
    if (dealId) {
      getDealDetail(dealId).then(res => {
        setDeal(res.deal)
        setActivities(res.activities)
      })
    }
  }

  const isOpen = !!dealId

  if (!isOpen) return null

  const contact = deal?.contact as Record<string, unknown> | null
  const stage   = deal?.stage   as Record<string, unknown> | null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
      />

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
            <div className="px-5 pt-5 pb-4 border-b dark:border-white/8 shrink-0">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 leading-snug">
                    {deal.title as string}
                  </h2>
                  {contact && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                      {contact.name as string}
                      {contact.company_name && ` · ${contact.company_name}`}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {deal.value && (
                      <span className="flex items-center gap-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                        <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                        {formatCurrency(deal.value as number, deal.currency as string)}
                      </span>
                    )}
                    {deal.close_date && (
                      <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <Calendar className="w-3 h-3" />
                        Close {new Date(deal.close_date as string).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_BADGE[deal.status as string] ?? ''}`}>
                      {deal.status as string}
                    </span>
                    {deal.priority && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${PRIORITY_BADGE[deal.priority as string] ?? ''}`}>
                        {deal.priority as string}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Won button */}
                  {deal.status !== 'won' && (
                    <button
                      onClick={() => setWonLostMode('won')}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 hover:bg-green-100 dark:hover:bg-green-500/20 rounded-lg border border-green-200 dark:border-green-500/20 transition-colors"
                    >
                      <Trophy className="w-3 h-3" />
                      Won
                    </button>
                  )}
                  {/* Lost button */}
                  {deal.status !== 'lost' && (
                    <button
                      onClick={() => setWonLostMode('lost')}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg border border-red-200 dark:border-red-500/20 transition-colors"
                    >
                      <XCircle className="w-3 h-3" />
                      Lost
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mt-4">
                {(['overview', 'activity'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${
                      activeTab === tab
                        ? 'bg-brand-50 dark:bg-[#ec732e]/10 text-brand-700 dark:text-[#ec732e]'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5'
                    }`}
                  >
                    {tab}
                    {tab === 'activity' && activities.length > 0 && (
                      <span className="ml-1.5 text-[10px] bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-400 px-1 rounded">
                        {activities.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === 'overview' && (
                <div className="p-5 space-y-5">
                  {/* Won/Lost info */}
                  {deal.status === 'won' && deal.won_at && (
                    <div className="p-3 bg-green-50 dark:bg-green-500/10 rounded-xl border border-green-200 dark:border-green-500/20 flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-green-700 dark:text-green-300">Deal Won</p>
                        <p className="text-xs text-green-600/70 dark:text-green-400/70">{formatDate(deal.won_at as string)}</p>
                      </div>
                    </div>
                  )}
                  {deal.status === 'lost' && (
                    <div className="p-3 bg-red-50 dark:bg-red-500/10 rounded-xl border border-red-200 dark:border-red-500/20 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-red-600 dark:text-red-400">Deal Lost</p>
                        {deal.lost_reason && (
                          <p className="text-xs text-red-500/70 dark:text-red-400/70">Reason: {deal.lost_reason as string}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {stage && (
                      <div className="p-3 bg-gray-50 dark:bg-white/[0.03] rounded-xl border dark:border-white/8">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">Stage</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{stage.name as string}</p>
                      </div>
                    )}
                    {deal.source && (
                      <div className="p-3 bg-gray-50 dark:bg-white/[0.03] rounded-xl border dark:border-white/8">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">Source</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">{deal.source as string}</p>
                      </div>
                    )}
                    {deal.win_percentage != null && (
                      <div className="p-3 bg-gray-50 dark:bg-white/[0.03] rounded-xl border dark:border-white/8">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">Win %</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{deal.win_percentage as number}%</p>
                      </div>
                    )}
                    {deal.close_date && (
                      <div className="p-3 bg-gray-50 dark:bg-white/[0.03] rounded-xl border dark:border-white/8">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">Close Date</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatDate(deal.close_date as string)}</p>
                      </div>
                    )}
                  </div>

                  {/* Contact card */}
                  {contact && (
                    <div className="p-3.5 bg-gray-50 dark:bg-white/[0.03] rounded-xl border dark:border-white/8">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">Contact</p>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-[#ec732e]/15 flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-brand-600 dark:text-[#ec732e]">
                            {(contact.name as string)?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{contact.name as string}</p>
                          {contact.email && (
                            <p className="text-xs text-gray-400 truncate">{contact.email as string}</p>
                          )}
                          {contact.phone && (
                            <p className="text-xs text-gray-400">{contact.phone as string}</p>
                          )}
                        </div>
                        <a
                          href={`/sage/contacts/${contact.id as string}`}
                          className="text-gray-400 hover:text-brand-600 dark:hover:text-[#ec732e] transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                      {contact.company_name && (
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500 dark:text-gray-400">
                          <Building2 className="w-3 h-3" />
                          {contact.company_name as string}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Description */}
                  {deal.description && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1.5">Description</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{deal.description as string}</p>
                    </div>
                  )}

                  {/* Tags */}
                  {Array.isArray(deal.tags) && (deal.tags as string[]).length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1.5 flex items-center gap-1">
                        <Tag className="w-3 h-3" /> Tags
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {(deal.tags as string[]).map(tag => (
                          <span key={tag} className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-400 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* View in Pipelines */}
                  <a
                    href={`/sage/pipelines/${deal.pipeline_id as string}`}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-brand-600 dark:hover:text-[#ec732e] transition-colors"
                  >
                    View in Pipeline <ChevronRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="p-5 space-y-4">
                  {/* Add activity buttons */}
                  <div className="flex gap-1.5 flex-wrap">
                    {(['note', 'call', 'meeting', 'task'] as ActivityType[]).map(type => {
                      const Icon = ACTIVITY_ICONS[type]
                      return (
                        <button
                          key={type}
                          onClick={() => setAddType(addType === type ? null : type)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                            addType === type
                              ? 'border-brand-400 bg-brand-50 dark:bg-[#ec732e]/10 text-brand-700 dark:text-[#ec732e]'
                              : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          + {ACTIVITY_LABELS[type]}
                        </button>
                      )
                    })}
                  </div>

                  {/* Inline add form */}
                  {addType && (
                    <div className="p-4 bg-gray-50 dark:bg-white/[0.03] rounded-xl border dark:border-white/8 space-y-3">
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Log {ACTIVITY_LABELS[addType]}
                      </p>
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
                        placeholder={addType === 'note' ? 'Write a note…' : addType === 'call' ? 'Call summary…' : addType === 'meeting' ? 'Meeting notes…' : 'Task description…'}
                        className="w-full px-3 py-2 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      {addType === 'task' && (
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Due date (optional)</label>
                          <input
                            type="datetime-local"
                            value={formDue}
                            onChange={e => setFormDue(e.target.value)}
                            className="px-3 py-1.5 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={resetForm}
                          className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        >
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

                  {/* Timeline */}
                  {activities.length === 0 ? (
                    <div className="text-center py-10">
                      <Clock className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No activities yet.</p>
                      <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Log a note, call, meeting, or task above.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activities.map(activity => {
                        const Icon = ACTIVITY_ICONS[activity.type]
                        const colorClass = ACTIVITY_COLORS[activity.type]
                        const isTask = activity.type === 'task'
                        const isDone = !!activity.completed_at

                        return (
                          <div
                            key={activity.id}
                            className={`flex gap-3 p-3.5 rounded-xl border transition-colors ${
                              isDone
                                ? 'bg-gray-50/50 dark:bg-white/[0.02] border-gray-100 dark:border-white/5 opacity-60'
                                : 'bg-white dark:bg-[#252525] border-gray-100 dark:border-white/8'
                            }`}
                          >
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${colorClass}`}>
                              {isDone ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 capitalize">
                                  {ACTIVITY_LABELS[activity.type]}
                                  {isDone && ' · Completed'}
                                </p>
                                <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0">{timeAgo(activity.created_at)}</span>
                              </div>
                              {activity.title && (
                                <p className={`text-sm font-medium mt-0.5 ${isDone ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>
                                  {activity.title}
                                </p>
                              )}
                              {activity.body && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-relaxed whitespace-pre-wrap">{activity.body}</p>
                              )}
                              {activity.due_at && !isDone && (
                                <p className="text-[10px] text-amber-500 dark:text-amber-400 mt-1 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Due {formatDate(activity.due_at)}
                                </p>
                              )}
                              {isTask && !isDone && (
                                <button
                                  onClick={() => handleCompleteTask(activity.id)}
                                  disabled={isPending}
                                  className="mt-2 flex items-center gap-1 text-[10px] font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 disabled:opacity-50 transition-colors"
                                >
                                  <Check className="w-3 h-3" />
                                  Mark complete
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Won/Lost modal */}
      {wonLostMode && deal && (
        <WonLostModal
          dealId={dealId!}
          dealTitle={deal.title as string}
          mode={wonLostMode}
          onClose={() => setWonLostMode(null)}
          onConfirm={handleWonLostConfirm}
        />
      )}
    </>
  )
}
