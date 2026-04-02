'use client'

import { useState, useRef } from 'react'
import {
  Kanban, Plus, Trash2, ArrowRight, Loader2, Activity,
  DollarSign, Clock, CheckCircle2, AlertCircle, ChevronRight,
} from 'lucide-react'
import Link from 'next/link'
import { CreatePipelineModal } from '@/components/sage/create-pipeline-modal'
import { deletePipeline, assignDealToPipeline } from '@/app/actions/sage'
import { timeAgo } from '@/lib/utils'
import type { SagePipeline, SageDeal, SageActivityLog, SagePipelineStage } from '@/lib/types'

type PipelineWithMeta = SagePipeline & {
  stages:     SagePipelineStage[]
  deal_count: number
}

type UnassignedDeal = Pick<SageDeal, 'id' | 'title' | 'value' | 'currency' | 'status' | 'created_at'> & {
  contact?: { name: string; email: string } | null
}

interface Props {
  pipelines:       PipelineWithMeta[]
  unassignedDeals: UnassignedDeal[]
  activity:        SageActivityLog[]
  canWrite:        boolean
}

const STATUS_COLOR: Record<string, string> = {
  open: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  won:  'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400',
  lost: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
}

function formatCurrency(value: number | null, currency: string) {
  if (!value) return null
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
}

function eventLabel(type: string) {
  const map: Record<string, string> = {
    deal_created:  'Deal created',
    stage_changed: 'Deal moved to new stage',
    deal_won:      'Deal won',
    deal_lost:     'Deal lost',
  }
  return map[type] ?? type.replace(/_/g, ' ')
}

export function PipelinesClient({ pipelines: initialPipelines, unassignedDeals: initialDeals, activity, canWrite }: Props) {
  const [pipelines,   setPipelines]   = useState(initialPipelines)
  const [deals,       setDeals]       = useState(initialDeals)
  const [showModal,   setShowModal]   = useState(false)
  const [deleting,    setDeleting]    = useState<string | null>(null)
  const [assigning,   setAssigning]   = useState<string | null>(null)
  const [dragOverId,  setDragOverId]  = useState<string | null>(null)
  const [activityOpen, setActivityOpen] = useState(true)
  const draggingDealId = useRef<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm('Delete this pipeline and all its deals? This cannot be undone.')) return
    setDeleting(id)
    try {
      await deletePipeline(id)
      setPipelines(prev => prev.filter(p => p.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  async function handleDrop(pipelineId: string) {
    const dealId = draggingDealId.current
    if (!dealId) return
    setDragOverId(null)
    setAssigning(dealId)
    try {
      const { error } = await assignDealToPipeline(dealId, pipelineId)
      if (!error) {
        setDeals(prev => prev.filter(d => d.id !== dealId))
        setPipelines(prev => prev.map(p =>
          p.id === pipelineId ? { ...p, deal_count: p.deal_count + 1 } : p
        ))
      }
    } finally {
      setAssigning(null)
      draggingDealId.current = null
    }
  }

  return (
    <div className="flex h-full w-full gap-3 p-3 bg-[#f5f4f1] dark:bg-[#1c1c1c]">

      {/* ── Left: Pipelines ─────────────────────────────── */}
      <div className="w-72 shrink-0 flex flex-col bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-xl border border-gray-200/60 dark:border-white/8 overflow-hidden">
        <div className="px-4 py-2.5 bg-[#141c2b] border-b border-white/10 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-sm font-bold text-white">Pipelines</h2>
            <p className="text-sm text-white mt-0.5">{pipelines.length} pipeline{pipelines.length !== 1 ? 's' : ''}</p>
          </div>
          {canWrite && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors border border-white/20"
            >
              <Plus className="w-3.5 h-3.5" /> New
            </button>
          )}
        </div>

        <div className="flex-1 p-3 space-y-2">
          {pipelines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <Kanban className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-xs text-gray-400">No pipelines yet.</p>
              <p className="text-[11px] text-gray-400 mt-1">Create one to start organising deals.</p>
            </div>
          ) : pipelines.map(pipeline => (
            <Link
              key={pipeline.id}
              href={`/sage/pipelines/${pipeline.id}`}
              onDragOver={e => { e.preventDefault(); setDragOverId(pipeline.id) }}
              onDragLeave={() => setDragOverId(null)}
              onDrop={e => { e.preventDefault(); handleDrop(pipeline.id) }}
              className={`group block rounded-xl border transition-all duration-150 ${
                dragOverId === pipeline.id
                  ? 'border-[#15A4AE] bg-[#15A4AE]/5 dark:bg-[#15A4AE]/10 shadow-sm'
                  : 'border-gray-100 dark:border-white/8 bg-white dark:bg-[#232323] shadow-[0_1px_4px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.3)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.12),0_6px_20px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:-translate-y-0.5'
              }`}
            >
              <div className="px-3 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Kanban className="w-3.5 h-3.5 text-[#15A4AE] shrink-0" />
                    <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{pipeline.name}</span>
                  </div>
                  {canWrite && (
                    <button
                      onClick={e => { e.preventDefault(); handleDelete(pipeline.id) }}
                      disabled={deleting === pipeline.id}
                      className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all shrink-0"
                    >
                      {deleting === pipeline.id
                        ? <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                        : <Trash2 className="w-3 h-3 text-gray-400 hover:text-red-500" />}
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 mt-2">
                  {pipeline.stages?.length ?? 0} stages · {pipeline.deal_count} deal{pipeline.deal_count !== 1 ? 's' : ''}
                </p>
                {dragOverId === pipeline.id && (
                  <p className="text-[10px] text-[#15A4AE] mt-1.5 font-medium">Drop to assign →</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Center: Unassigned deals ──────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white dark:bg-[#232323] rounded-2xl shadow-xl border border-gray-200/60 dark:border-white/8">
        <div className="shrink-0 bg-[#141c2b] border-b border-white/10 px-6 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Unassigned Deals</h2>
            <p className="text-sm text-white mt-0.5">
              {deals.length > 0
                ? `${deals.length} deal${deals.length !== 1 ? 's' : ''} waiting to be assigned — drag onto a pipeline`
                : 'All deals are assigned to pipelines'}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {deals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <CheckCircle2 className="w-10 h-10 text-[#15A4AE]/40 mb-4" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">All caught up</h3>
              <p className="text-xs text-gray-400 max-w-xs">Every deal is assigned to a pipeline. New deals without a rule will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {deals.map(deal => (
                <div
                  key={deal.id}
                  draggable
                  onDragStart={() => { draggingDealId.current = deal.id }}
                  onDragEnd={() => { if (!assigning) draggingDealId.current = null }}
                  className={`bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 px-4 py-3 flex items-center gap-4 cursor-grab active:cursor-grabbing hover:shadow-sm transition-all select-none ${
                    assigning === deal.id ? 'opacity-50' : ''
                  }`}
                >
                  <DollarSign className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{deal.title}</p>
                    {deal.contact?.name && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{deal.contact.name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {deal.value && (
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {formatCurrency(deal.value, deal.currency)}
                      </span>
                    )}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLOR[deal.status] ?? ''}`}>
                      {deal.status}
                    </span>
                    <span className="text-[10px] text-gray-400">{timeAgo(deal.created_at)}</span>
                    {assigning === deal.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#15A4AE]" />}
                  </div>
                </div>
              ))}
            </div>
          )}

          {deals.length > 0 && (
            <div className="mt-6 flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/8 border border-amber-100 dark:border-amber-500/15">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                These deals have no pipeline rule set. Drag them onto a pipeline on the left to assign, or set up Sage Auto Rules to route them automatically.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* ── Right: Activity ───────────────────────────────── */}
      {activityOpen ? (
        <aside className="w-64 shrink-0 flex flex-col overflow-hidden bg-white dark:bg-[#242424] rounded-2xl shadow-xl border border-gray-200/60 dark:border-white/8">
            <div className="px-3 py-2.5 bg-[#141c2b] border-b border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-white" />
                <h3 className="text-sm font-semibold text-white">Activity</h3>
              </div>
              <button
                onClick={() => setActivityOpen(false)}
                className="p-1 rounded text-white hover:bg-white/10 transition-colors"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="divide-y dark:divide-white/8 flex-1 overflow-y-auto">
              {activity.length === 0 ? (
                <p className="px-4 py-8 text-sm text-gray-400 text-center">No activity yet.</p>
              ) : activity.map(a => (
                <div key={a.id} className="flex items-start gap-3 px-3 py-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#15A4AE] mt-1.5 shrink-0" />
                  <div>
                    <p className="text-[11px] text-gray-800 dark:text-gray-200 leading-snug">{eventLabel(a.event_type)}</p>
                    {a.payload && typeof a.payload === 'object' && 'title' in a.payload && (
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                        {String((a.payload as Record<string, unknown>).title)}
                      </p>
                    )}
                    <p className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
                      <Clock className="w-2.5 h-2.5" /> {timeAgo(a.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
        </aside>
      ) : (
        <div
          className="w-8 shrink-0 flex flex-col items-center py-4 gap-3 cursor-pointer hover:bg-[#ede9e2] dark:hover:bg-white/4 transition-colors rounded-2xl bg-white dark:bg-[#242424] border border-gray-200/60 dark:border-white/8 shadow-xl"
          onClick={() => setActivityOpen(true)}
          title="Show activity"
        >
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span
            className="text-[10px] text-gray-400 font-medium select-none"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', letterSpacing: '0.05em' }}
          >
            Activity
          </span>
        </div>
      )}

      {showModal && <CreatePipelineModal onClose={() => { setShowModal(false) }} />}
    </div>
  )
}
