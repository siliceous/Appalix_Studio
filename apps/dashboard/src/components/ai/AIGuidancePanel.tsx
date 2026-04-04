'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sparkles, RefreshCw, ChevronDown } from 'lucide-react'
import { getDealGuidance, refreshAiReview } from '@/app/actions/ai-guidance'
import { AIStatusBadge } from './AIStatusBadge'
import { TakenIntoAccountBlock } from './TakenIntoAccountBlock'
import { DraftActionPanel } from './DraftActionPanel'
import type { AiGuidanceUIOutput, EntityType } from '@/lib/ai-guidance/types'

// ── Props ─────────────────────────────────────────────────────────────────────

interface AIGuidancePanelProps {
  entityType: EntityType
  entityId:   string
  /**
   * compact — used inside the inbound popup card (condensed, prioritises summary + draft)
   * full    — used on contact/deal/project pages (all sections visible)
   * speakable — future Sage Voice mode (returns null, no-op in early rollout)
   */
  mode: 'compact' | 'full' | 'speakable'
  /** When true, hides the draft communication panel in full mode (used when drafts are shown separately). */
  hideDrafts?: boolean
  /**
   * Voice hook — future use only. Called when speakable text is ready.
   * No-op until Sage Voice is active.
   */
  onSpeakableReady?: (text: string) => void
}

// ── Momentum colour map ───────────────────────────────────────────────────────

const MOMENTUM_COLOURS: Record<'low' | 'medium' | 'high', string> = {
  low:    'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300',
  medium: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
  high:   'bg-[#15A4AE]/10 text-[#3a9e8a] dark:text-[#15A4AE]',
}

// ── Main component ────────────────────────────────────────────────────────────

export function AIGuidancePanel({ entityType, entityId, mode, hideDrafts, onSpeakableReady }: AIGuidancePanelProps) {
  // speakable mode is a no-op in early rollout
  if (mode === 'speakable') {
    void onSpeakableReady  // suppress unused warning
    return null
  }

  return (
    <AIGuidancePanelInner
      entityType={entityType}
      entityId={entityId}
      mode={mode}
      hideDrafts={hideDrafts}
    />
  )
}

// ── Inner component (handles data fetching and state) ─────────────────────────

function AIGuidancePanelInner({
  entityType,
  entityId,
  mode,
  hideDrafts,
}: {
  entityType:  EntityType
  entityId:    string
  mode:        'compact' | 'full'
  hideDrafts?: boolean
}) {
  const [guidance, setGuidance]         = useState<AiGuidanceUIOutput | null>(null)
  const [loading, setLoading]           = useState(true)
  const [collapsed, setCollapsed]       = useState(mode === 'compact')
  const [refreshing, setRefreshing]     = useState(false)
  const [pollCount, setPollCount]       = useState(0)
  const [pollExhausted, setPollExhausted] = useState(false)

  const fetchGuidance = useCallback(async () => {
    if (entityType !== 'deal') {
      setLoading(false)
      return
    }
    try {
      const result = await getDealGuidance(entityId)
      setGuidance(result)
    } catch {
      // Silently fail — panel shows empty state
    } finally {
      setLoading(false)
    }
  }, [entityType, entityId])

  useEffect(() => {
    fetchGuidance()
  }, [fetchGuidance])

  // Poll while AI is updating — cap at 6 attempts (~30s) then show "no review yet"
  useEffect(() => {
    if (!guidance?.isUpdating) return
    if (pollCount >= 6) {
      setPollExhausted(true)
      return
    }
    const timer = setTimeout(() => {
      setPollCount(n => n + 1)
      fetchGuidance()
    }, 5000)
    return () => clearTimeout(timer)
  }, [guidance?.isUpdating, fetchGuidance, pollCount])

  async function handleRefresh() {
    setRefreshing(true)
    await refreshAiReview(entityType, entityId)
    // Wait a moment then re-fetch
    setTimeout(async () => {
      await fetchGuidance()
      setRefreshing(false)
    }, 3000)
  }

  function handleDraftActioned() {
    // Re-fetch guidance after draft action to update pending drafts list
    fetchGuidance()
  }

  if (loading) return <LoadingSkeleton />

  // No guidance available (contact/project or no data)
  if (!guidance && entityType !== 'deal') return null
  if (!guidance) return null

  const isUpdating = guidance.isUpdating || refreshing

  // Placeholder state — no memory written yet
  if (!guidance.situationSummary) {
    return pollExhausted ? (
      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] px-4 py-4 flex items-center gap-3">
        <Sparkles className="w-4 h-4 text-gray-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">No analysis yet</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Sage wasn't able to complete the analysis.</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="ml-auto text-[11px] font-semibold text-[#15A4AE] hover:underline shrink-0 disabled:opacity-50"
        >
          {refreshing ? 'Analysing…' : 'Analyse again'}
        </button>
      </div>
    ) : (
      <div className="rounded-xl border border-[#15A4AE]/20 bg-[#15A4AE]/5 px-4 py-4 flex items-center gap-3">
        <RefreshCw className="w-4 h-4 text-[#15A4AE] animate-spin shrink-0" />
        <p className="text-xs font-semibold text-[#15A4AE]">Sage is analysing this deal…</p>
      </div>
    )
  }
  const hasDrafts  = guidance.pendingDrafts.length > 0

  // ── Compact mode (popup card) ───────────────────────────────────────────────

  if (mode === 'compact') {
    return (
      <div className="flex flex-col gap-3">
        {/* Collapsed state */}
        {collapsed ? (
          <button
            onClick={() => setCollapsed(false)}
            className="flex items-center gap-2 w-full px-3.5 py-2.5 bg-[#15A4AE]/8 dark:bg-[#15A4AE]/10 border border-[#15A4AE]/20 rounded-xl text-left hover:bg-[#15A4AE]/12 transition-colors shrink-0"
          >
            <Sparkles className="w-3 h-3 text-[#15A4AE] shrink-0" />
            <span className="text-[11px] text-[#15A4AE] font-bold uppercase tracking-wide flex-1">
              Sage Guidance
            </span>
            {hasDrafts && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">
                {guidance.pendingDrafts.length} draft{guidance.pendingDrafts.length > 1 ? 's' : ''}
              </span>
            )}
            <ChevronDown className="w-3.5 h-3.5 text-[#15A4AE] shrink-0 -rotate-90" />
          </button>
        ) : (
          /* Expanded compact */
          <div className="flex flex-col gap-3 bg-[#15A4AE]/5 dark:bg-[#15A4AE]/8 border border-[#15A4AE]/20 rounded-xl p-4">
            {/* Header */}
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#15A4AE] shrink-0" />
              <span className="text-[11px] text-[#15A4AE] font-bold uppercase tracking-wide flex-1">
                Sage Guidance
              </span>
              <AIStatusBadge
                lastReviewedAt={guidance.lastReviewedAt}
                isUpdating={isUpdating}
              />
              <button
                onClick={() => setCollapsed(true)}
                className="p-0.5 hover:bg-[#15A4AE]/10 rounded transition-colors"
              >
                <ChevronDown className="w-3.5 h-3.5 text-[#15A4AE] rotate-180" />
              </button>
            </div>

            {/* Momentum badge */}
            <span className={`self-start text-[10px] font-semibold px-2 py-0.5 rounded-full ${MOMENTUM_COLOURS[guidance.momentumLevel]}`}>
              {guidance.momentumLabel}
            </span>

            {/* Situation */}
            {guidance.situationSummary && (
              <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                {guidance.situationSummary}
              </p>
            )}

            {/* Suggested direction */}
            {guidance.suggestedDirection && (
              <div className="bg-white dark:bg-white/5 rounded-lg px-3 py-2.5 border border-[#15A4AE]/15">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">
                  Suggested direction
                </p>
                <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                  {guidance.suggestedDirection}
                </p>
              </div>
            )}

            {/* Drafts */}
            {hasDrafts && (
              <DraftActionPanel
                drafts={guidance.pendingDrafts}
                onDraftActioned={handleDraftActioned}
              />
            )}

            {/* Taken into account */}
            <TakenIntoAccountBlock items={guidance.takenIntoAccount} />
          </div>
        )}
      </div>
    )
  }

  // ── Full mode (entity pages) ──────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#15A4AE]" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Sage Guidance</h3>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${MOMENTUM_COLOURS[guidance.momentumLevel]}`}>
            {guidance.momentumLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <AIStatusBadge
            lastReviewedAt={guidance.lastReviewedAt}
            isUpdating={isUpdating}
            onRefresh={handleRefresh}
          />
        </div>
      </div>

      {/* Situation understanding */}
      {guidance.situationSummary && (
        <GuidanceBlock
          label="What appears to be happening"
          content={guidance.situationSummary}
          accent="blue"
        />
      )}

      {/* Commercial context */}
      {guidance.commercialContext && (
        <GuidanceBlock
          label="What this may mean"
          content={guidance.commercialContext}
          accent="teal"
        />
      )}

      {/* Stakeholder context (if any signals) */}
      {guidance.suggestedDirection && (
        <GuidanceBlock
          label="Suggested direction"
          content={guidance.suggestedDirection}
          accent="green"
        />
      )}

      {/* Draft section */}
      {!hideDrafts && hasDrafts && (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">
            Next communication draft
          </p>
          <DraftActionPanel
            drafts={guidance.pendingDrafts}
            onDraftActioned={handleDraftActioned}
          />
        </div>
      )}

      {/* Taken into account */}
      {guidance.takenIntoAccount.length > 0 && (
        <div className="pt-2 border-t border-gray-100 dark:border-white/8">
          <TakenIntoAccountBlock items={guidance.takenIntoAccount} />
        </div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function GuidanceBlock({
  label,
  content,
  accent,
}: {
  label:   string
  content: string
  accent:  'blue' | 'teal' | 'green'
}) {
  const colours = {
    blue:  'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20',
    teal:  'bg-[#15A4AE]/5 dark:bg-[#15A4AE]/8 border-[#15A4AE]/20',
    green: 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20',
  }
  const labelColours = {
    blue:  'text-blue-600 dark:text-blue-400',
    teal:  'text-[#3a9e8a] dark:text-[#15A4AE]',
    green: 'text-green-700 dark:text-green-400',
  }

  return (
    <div className={`rounded-xl p-4 border ${colours[accent]}`}>
      <p className={`text-[10px] font-bold uppercase tracking-wide mb-2 ${labelColours[accent]}`}>
        {label}
      </p>
      <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{content}</p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-3 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="w-3.5 h-3.5 rounded-full bg-gray-200 dark:bg-white/10" />
        <div className="h-3 w-24 rounded bg-gray-200 dark:bg-white/10" />
        <div className="flex items-center gap-1.5 ml-auto">
          <RefreshCw className="w-3 h-3 text-gray-300 animate-spin" />
          <span className="text-[10px] text-gray-300">Loading guidance…</span>
        </div>
      </div>
      <div className="h-20 rounded-xl bg-gray-100 dark:bg-white/5" />
    </div>
  )
}
