'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Zap, Mail, MessageSquare, Phone, Loader2, Play, Pause, Check, ChevronRight, CheckCheck, AlertCircle } from 'lucide-react'
import { listActiveAutomationTemplates, startAutomationExecution, pauseAutomationExecution, resumeAutomationExecution } from '@/app/actions/automation-executions'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

type Template = Awaited<ReturnType<typeof listActiveAutomationTemplates>>[number]

export type AutomationRunState = {
  executionId: string
  status:      'running' | 'paused' | 'completed' | 'stopped' | 'failed'
  templateId:  string
  templateName:string
}

export interface RunAutomationModalProps {
  open:          boolean
  onClose:       () => void
  /** Who we're running the automation for */
  contactName:   string | null
  contactId?:    string | null
  /** Identifies the source row (conversation.id / lead.id / ticket.id) */
  sourceType:    string
  sourceRefId:   string
  /** Called after successfully starting / pausing / resuming */
  onStateChange?: (state: AutomationRunState) => void
  /** Pass existing state if this contact already has a running automation */
  existingState?: AutomationRunState | null
  triggerPayload?: Record<string, unknown>
}

// ── Display helpers ───────────────────────────────────────────────────────────

const CHANNEL_ICON: Record<string, React.ElementType> = {
  email: Mail, sms: MessageSquare, call: Phone,
  multi: Zap,
}

const TYPE_LABEL: Record<string, string> = {
  warm_introduction:  'Warm Intro',
  qualification:      'Qualification',
  reengagement:       'Re-engagement',
  meeting_conversion: 'Meeting Follow-up',
  nurture:            'Lead Nurturing',
  custom:             'Custom',
  welcome:            'Welcome',
  abandoned_cart:     'Abandoned Cart',
  abandoned_checkout: 'Abandoned Checkout',
  product_review:     'Product Review',
  wheel_of_fortune:   'Wheel of Fortune',
  ticket_registered:  'Ticket Registered',
  purchase_followup:  'Purchase Follow-up',
}

const TRACK_COLOR: Record<string, string> = {
  'Welcome & Onboarding': 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  'eCommerce Recovery':   'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400',
  'Reviews & Reputation': 'bg-yellow-50 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400',
  'Support':              'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
  'Lead Nurturing':       'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400',
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RunAutomationModal({
  open, onClose, contactName, contactId, sourceType, sourceRefId,
  onStateChange, existingState, triggerPayload,
}: RunAutomationModalProps) {
  const [templates, setTemplates]     = useState<Template[]>([])
  const [loading, setLoading]         = useState(false)
  const [selected, setSelected]       = useState<string | null>(null)
  const [starting, setStarting]       = useState(false)
  const [toggling, setToggling]       = useState(false)
  const [runState, setRunState]       = useState<AutomationRunState | null>(existingState ?? null)

  // Fetch templates when modal opens
  useEffect(() => {
    if (!open) return
    setLoading(true)
    listActiveAutomationTemplates()
      .then(setTemplates)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [open])

  // Sync existingState prop
  useEffect(() => { setRunState(existingState ?? null) }, [existingState])

  const emitState = useCallback((state: AutomationRunState) => {
    setRunState(state)
    onStateChange?.(state)
  }, [onStateChange])

  async function handleStart() {
    if (!selected) return
    setStarting(true)
    try {
      const result = await startAutomationExecution({
        templateId:     selected,
        contactId:      contactId ?? null,
        sourceType,
        sourceRefId,
        contactName:    contactName ?? null,
        triggerPayload,
      })
      const tpl = templates.find(t => t.id === selected)
      emitState({
        executionId:  result.executionId,
        status:       result.status as AutomationRunState['status'],
        templateId:   selected,
        templateName: tpl?.name ?? '',
      })
    } catch (err) {
      console.error('[RunAutomationModal] start failed:', err)
    } finally {
      setStarting(false)
    }
  }

  async function handleTogglePause() {
    if (!runState) return
    setToggling(true)
    try {
      if (runState.status === 'running' || runState.status === 'paused') {
        if (runState.status === 'running') {
          await pauseAutomationExecution(runState.executionId)
          emitState({ ...runState, status: 'paused' })
        } else {
          await resumeAutomationExecution(runState.executionId)
          emitState({ ...runState, status: 'running' })
        }
      }
    } catch (err) {
      console.error('[RunAutomationModal] toggle failed:', err)
    } finally {
      setToggling(false)
    }
  }

  if (!open) return null

  // Group templates by track
  const tracks = [...new Set(templates.map(t => t.track ?? 'Other'))].sort()
  const grouped = tracks.map(track => ({
    track,
    items: templates.filter(t => (t.track ?? 'Other') === track),
  }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 flex flex-col max-h-[80vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/8 shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Run Automation</h2>
            {contactName && (
              <p className="text-xs text-gray-400 mt-0.5">for <span className="font-medium text-gray-600 dark:text-gray-300">{contactName}</span></p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Completed / failed / stopped banner */}
        {runState && (runState.status === 'completed' || runState.status === 'failed' || runState.status === 'stopped') && (
          <div className={cn(
            'flex items-center gap-2.5 mx-4 mt-4 px-4 py-3 rounded-xl border text-sm shrink-0',
            runState.status === 'completed'
              ? 'bg-[#15A4AE]/8 border-[#15A4AE]/25 dark:bg-[#15A4AE]/10 dark:border-[#15A4AE]/20'
              : 'bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/20',
          )}>
            {runState.status === 'completed'
              ? <CheckCheck className="w-3.5 h-3.5 text-[#15A4AE] shrink-0" />
              : <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-800 dark:text-gray-100 truncate">{runState.templateName}</p>
              <p className={cn('text-[11px]', runState.status === 'completed' ? 'text-[#15A4AE]' : 'text-red-400')}>
                {runState.status === 'completed' ? 'Completed — select a template below to re-run' : `${runState.status === 'failed' ? 'Failed' : 'Stopped'} — select a template to re-run`}
              </p>
            </div>
          </div>
        )}

        {/* Running state banner */}
        {runState && (runState.status === 'running' || runState.status === 'paused') && (
          <div className={cn(
            'flex items-center justify-between mx-4 mt-4 px-4 py-3 rounded-xl border text-sm shrink-0',
            runState.status === 'running'
              ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20'
              : 'bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20',
          )}>
            <div className="flex items-center gap-2.5">
              <span className={cn('w-2 h-2 rounded-full', runState.status === 'running' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400')} />
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-100 text-xs">{runState.templateName}</p>
                <p className={cn('text-[11px]', runState.status === 'running' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400')}>
                  {runState.status === 'running' ? 'Running' : 'Paused'}
                </p>
              </div>
            </div>
            <button
              onClick={handleTogglePause}
              disabled={toggling}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                runState.status === 'running'
                  ? 'bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 dark:text-amber-400'
                  : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 dark:text-emerald-400',
              )}
            >
              {toggling ? <Loader2 className="w-3 h-3 animate-spin" />
                : runState.status === 'running' ? <><Pause className="w-3 h-3" /> Pause</>
                : <><Play className="w-3 h-3" /> Resume</>}
            </button>
          </div>
        )}

        {/* Template list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : grouped.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400">No active automations available.</div>
          ) : (
            grouped.map(({ track, items }) => (
              <div key={track}>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">{track}</p>
                <div className="space-y-1.5">
                  {items.map(tpl => {
                    const Ch = CHANNEL_ICON[tpl.primary_channel] ?? Zap
                    const isSelected = selected === tpl.id
                    const isRunning  = runState?.templateId === tpl.id
                    return (
                      <button
                        key={tpl.id}
                        onClick={() => !isRunning && setSelected(isSelected ? null : tpl.id)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-all',
                          isRunning
                            ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-500/30 dark:bg-emerald-500/5 cursor-default'
                            : isSelected
                              ? 'border-[#15A4AE]/60 bg-[#15A4AE]/5 dark:border-[#15A4AE]/40 dark:bg-[#15A4AE]/10'
                              : 'border-gray-200 dark:border-white/8 hover:border-gray-300 dark:hover:border-white/15 hover:bg-gray-50 dark:hover:bg-white/3',
                        )}
                      >
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                          isSelected ? 'bg-[#15A4AE]/15' : 'bg-gray-100 dark:bg-white/8',
                        )}>
                          <Ch className={cn('w-4 h-4', isSelected ? 'text-[#15A4AE]' : 'text-gray-500 dark:text-gray-400')} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium text-gray-800 dark:text-gray-100">{tpl.name}</span>
                            {tpl.track && (
                              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', TRACK_COLOR[tpl.track] ?? 'bg-gray-100 text-gray-500')}>
                                {TYPE_LABEL[tpl.automation_type] ?? tpl.automation_type}
                              </span>
                            )}
                            {isRunning && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 font-medium">
                                Active
                              </span>
                            )}
                          </div>
                          {tpl.description && (
                            <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{tpl.description}</p>
                          )}
                          <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-0.5">
                            {(tpl.steps as unknown[]).length} steps · {tpl.primary_channel}
                          </p>
                        </div>

                        {isSelected && !isRunning && (
                          <ChevronRight className="w-3.5 h-3.5 text-[#15A4AE] shrink-0" />
                        )}
                        {isRunning && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-3.5 border-t border-gray-100 dark:border-white/8">
          <button onClick={onClose} className="px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
            Cancel
          </button>
          {!runState && (
            <button
              onClick={handleStart}
              disabled={!selected || starting}
              className="flex items-center gap-2 px-4 py-1.5 bg-[#15A4AE] hover:bg-[#0d8f99] disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
            >
              {starting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              {starting ? 'Starting…' : 'Start Automation'}
            </button>
          )}
          {runState && (runState.status === 'completed' || runState.status === 'stopped' || runState.status === 'failed') && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Check className="w-3.5 h-3.5" />
              Automation {runState.status}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Trigger button shown on each row ──────────────────────────────────────────

export function AutomationTriggerButton({
  state, onClick,
}: {
  state: AutomationRunState | null
  onClick: () => void
}) {
  if (!state) {
    return (
      <button
        onClick={onClick}
        title="Run automation"
        className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-[#15A4AE] hover:bg-[#15A4AE]/10 transition-colors"
      >
        <Zap className="w-3.5 h-3.5" />
      </button>
    )
  }

  if (state.status === 'running') {
    return (
      <button
        onClick={onClick}
        title={`Running: ${state.templateName}`}
        className="p-1.5 rounded-lg text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
      >
        <Pause className="w-3.5 h-3.5" />
      </button>
    )
  }

  if (state.status === 'paused') {
    return (
      <button
        onClick={onClick}
        title={`Paused: ${state.templateName}`}
        className="p-1.5 rounded-lg text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
      >
        <Play className="w-3.5 h-3.5" />
      </button>
    )
  }

  if (state.status === 'completed') {
    return (
      <button
        onClick={onClick}
        title={`Completed: ${state.templateName} — click to re-run`}
        className="p-1.5 rounded-lg text-[#15A4AE] hover:text-[#0d8f99] hover:bg-[#15A4AE]/10 transition-colors"
      >
        <CheckCheck className="w-3.5 h-3.5" />
      </button>
    )
  }

  if (state.status === 'failed' || state.status === 'stopped') {
    return (
      <button
        onClick={onClick}
        title={`${state.status === 'failed' ? 'Failed' : 'Stopped'}: ${state.templateName} — click to re-run`}
        className="p-1.5 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
      >
        <AlertCircle className="w-3.5 h-3.5" />
      </button>
    )
  }

  // Fallback — show neutral zap
  return (
    <button
      onClick={onClick}
      title="Run automation"
      className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-[#15A4AE] hover:bg-[#15A4AE]/10 transition-colors"
    >
      <Zap className="w-3.5 h-3.5" />
    </button>
  )
}
