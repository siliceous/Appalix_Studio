'use client'

import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Mail, MessageSquare, Phone, Clock,
  CheckCircle2, AlertTriangle, Zap, ArrowUpRight,
  Activity, GitBranch, User, Briefcase, Bell,
  TrendingUp, TrendingDown, Minus, ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { timeAgo } from '@/lib/utils'
import type { AutomationExecutionRow, AutomationStepState } from '@/lib/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

const STEP_TYPE_META: Record<string, { icon: React.ElementType; color: string }> = {
  send_email:     { icon: Mail,          color: 'bg-blue-500'   },
  send_sms:       { icon: MessageSquare, color: 'bg-violet-500' },
  call:           { icon: Phone,         color: 'bg-emerald-500'},
  wait:           { icon: Clock,         color: 'bg-amber-400'  },
  condition:      { icon: GitBranch,     color: 'bg-indigo-500' },
  handoff:        { icon: ArrowUpRight,  color: 'bg-rose-400'   },
  create_deal:    { icon: Briefcase,     color: 'bg-teal-500'   },
  assign:         { icon: User,          color: 'bg-pink-500'   },
  notify_internal:{ icon: Bell,          color: 'bg-rose-500'   },
  webhook:        { icon: Zap,           color: 'bg-gray-500'   },
  update_contact: { icon: User,          color: 'bg-teal-500'   },
  create_ticket:  { icon: Zap,           color: 'bg-orange-500' },
  create_task:    { icon: CheckCircle2,  color: 'bg-cyan-500'   },
  end:            { icon: CheckCircle2,  color: 'bg-gray-400'   },
}

const STATUS_STYLE: Record<AutomationStepState['status'], {
  icon: string; border: string; bg: string; label: string; labelText: string; pulse: boolean
}> = {
  completed: { icon: 'bg-emerald-500', border: 'border-emerald-200 dark:border-emerald-500/30', bg: 'bg-white dark:bg-[#1e1e1e]',        label: '✓ Done',     labelText: 'text-emerald-500', pulse: false },
  running:   { icon: 'bg-amber-400',   border: 'border-amber-300 dark:border-amber-400/40',    bg: 'bg-amber-50/50 dark:bg-amber-900/10', label: '⚡ Running', labelText: 'text-amber-500',   pulse: true  },
  waiting:   { icon: 'bg-amber-300',   border: 'border-amber-200 dark:border-amber-300/30',    bg: 'bg-amber-50/30 dark:bg-amber-900/8',  label: '⏱ Waiting', labelText: 'text-amber-400',   pulse: true  },
  pending:   { icon: 'bg-gray-300 dark:bg-gray-600', border: 'border-gray-200 dark:border-white/8', bg: 'bg-white dark:bg-[#1e1e1e]', label: 'Pending', labelText: 'text-gray-400',   pulse: false },
  failed:    { icon: 'bg-rose-400',    border: 'border-rose-200 dark:border-rose-400/30',      bg: 'bg-rose-50/50 dark:bg-rose-900/10',   label: '✗ Failed',  labelText: 'text-rose-500',    pulse: false },
  skipped:   { icon: 'bg-gray-200 dark:bg-gray-700', border: 'border-gray-100 dark:border-white/5', bg: 'bg-white dark:bg-[#1e1e1e]', label: '— Skipped', labelText: 'text-gray-300 dark:text-gray-600', pulse: false },
}

const EXEC_STATUS_STYLE: Record<string, { badge: string; dot: string }> = {
  running:   { badge: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',   dot: 'bg-amber-400 animate-pulse' },
  waiting:   { badge: 'bg-amber-50 text-amber-500 dark:bg-amber-500/10 dark:text-amber-300',   dot: 'bg-amber-300' },
  paused:    { badge: 'bg-gray-100 text-gray-500 dark:bg-white/8 dark:text-gray-400',          dot: 'bg-gray-400' },
  completed: { badge: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',       dot: 'bg-blue-400' },
  failed:    { badge: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',       dot: 'bg-rose-400' },
  stopped:   { badge: 'bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-gray-500',          dot: 'bg-gray-300' },
}

function initials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function stepDetail(step: AutomationStepState): string | null {
  const out = step.output_data
  const cfg = step.config
  if (step.type === 'send_email') return (out.subject ?? cfg.subject_template ?? null) as string | null
  if (step.type === 'send_sms')   return String(out.body ?? cfg.body_template ?? '').slice(0, 80) || null
  if (step.type === 'wait') {
    const h = step.delay_hours
    if (!h) return null
    return h >= 24 ? `${Math.round(h / 24)} day delay` : `${h}h delay`
  }
  if (step.type === 'condition') {
    if (step.branch_taken) return `Took ${step.branch_taken === 'yes' ? 'Yes' : 'No'} path`
    return (cfg.condition_label as string | null)
  }
  return null
}

// ── Timeline step node ────────────────────────────────────────────────────────

function TimelineStep({ step }: { step: AutomationStepState }) {
  const meta  = STEP_TYPE_META[step.type] ?? { icon: Activity, color: 'bg-gray-400' }
  const style = STATUS_STYLE[step.status] ?? STATUS_STYLE.pending
  const Icon  = meta.icon
  const detail = stepDetail(step)

  return (
    <div className="relative flex gap-4">
      {/* Left: icon + line */}
      <div className="flex flex-col items-center">
        <div className={cn(
          'w-9 h-9 rounded-full flex items-center justify-center shrink-0 z-10',
          style.icon, style.pulse && 'animate-pulse',
        )}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 w-0.5 bg-gray-200 dark:bg-gray-700 mt-1 min-h-[24px]" />
      </div>

      {/* Right: card */}
      <div className={cn(
        'flex-1 mb-3 rounded-xl border px-4 py-3 transition-all duration-300',
        style.bg, style.border,
        step.isCurrent && 'shadow-[0_0_0_2px_rgba(251,191,36,0.35)]',
      )}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">{step.type.replace(/_/g, ' ')}</p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug">{step.label}</p>
            {detail && <p className="text-xs text-gray-400 mt-0.5 truncate">{detail}</p>}
          </div>
          <div className="shrink-0 text-right">
            <span className={cn('text-[10px] font-semibold uppercase tracking-wide', style.labelText)}>{style.label}</span>
            {step.status === 'completed' && step.completed_at && (
              <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(step.completed_at)}</p>
            )}
            {step.status === 'waiting' && step.resume_at && (
              <p className="text-[10px] text-amber-400 mt-0.5">in {timeAgo(step.resume_at)}</p>
            )}
          </div>
        </div>

        {/* Error */}
        {step.error_data && (
          <div className="mt-2 text-[11px] text-rose-500 bg-rose-50 dark:bg-rose-500/10 rounded-lg px-2.5 py-1.5 truncate">
            {String((step.error_data as { message?: string }).message ?? 'Error')}
          </div>
        )}

        {/* Condition branch */}
        {step.type === 'condition' && step.branch_taken && (
          <div className={cn(
            'mt-2 text-[11px] font-medium px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5',
            step.branch_taken === 'yes'
              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
              : 'bg-gray-100 text-gray-500 dark:bg-white/8 dark:text-gray-400',
          )}>
            ↳ {step.branch_taken === 'yes' ? 'Yes path taken' : 'No path taken'}
          </div>
        )}

        {/* Email output preview */}
        {step.type === 'send_email' && !!step.output_data.message_id && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-500">
            <CheckCircle2 className="w-3 h-3" /> Sent · ID: {String(step.output_data.message_id).slice(0, 20)}…
          </div>
        )}
      </div>
    </div>
  )
}

// ── Monitor client ────────────────────────────────────────────────────────────

export function MonitorClient({ exec, contact, templateName, automationType, steps, triggerType, failureReason }: {
  exec:           AutomationExecutionRow
  contact:        { id: string; name: string; email: string | null; phone: string | null; company_name: string | null } | null
  templateName:   string | null
  automationType: string | null
  steps:          AutomationStepState[]
  triggerType:    string
  failureReason:  string | null
}) {
  const router = useRouter()
  const execStyle = EXEC_STATUS_STYLE[exec.status] ?? EXEC_STATUS_STYLE.running

  const doneCount    = steps.filter(s => s.status === 'completed').length
  const currentStep  = steps.find(s => s.isCurrent)
  const pct          = steps.length > 0 ? Math.round((doneCount / steps.length) * 100) : 0

  const storyLine1 = currentStep
    ? `${currentStep.type === 'wait' ? 'Waiting' : 'Executing'}: ${currentStep.label}`
    : exec.status === 'completed' ? 'Sequence completed successfully'
    : exec.status === 'failed' ? 'Sequence failed'
    : 'Automation is active'

  const storyLine2 = triggerType.replace(/_/g, ' ') + ' trigger'
    + (templateName ? ` · ${templateName}` : '')
    + (automationType ? ` · ${automationType.replace(/_/g, ' ')}` : '')

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-[#f5f4f1] dark:bg-[#111]">

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-[#141c2b] px-4 py-2.5 flex items-center gap-3">
        <button
          onClick={() => router.push('/sage/automations')}
          className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Automations
        </button>
        <span className="text-white/30">/</span>
        <span className="text-sm font-medium text-white truncate">
          {contact?.name ?? 'Execution'} · Monitor
        </span>

        <div className="flex-1" />

        {templateName && (
          <span className="text-[11px] text-white/50">{templateName}</span>
        )}
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── Timeline (left/main) ─────────────────────────────────────── */}
        <div className="flex-1 min-w-0 overflow-y-auto px-6 py-6">
          <div className="max-w-[560px] mx-auto space-y-0">

            {/* ── Story banner ─────────────────────────────────────────── */}
            <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl border border-gray-200 dark:border-white/8 px-5 py-4 mb-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[#141c2b] flex items-center justify-center shrink-0 text-white text-sm font-bold">
                  {initials(contact?.name ?? null)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">{contact?.name ?? 'Unknown'}</h2>
                    <span className={cn('inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full', execStyle.badge)}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', execStyle.dot)} />
                      {exec.status.charAt(0).toUpperCase() + exec.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{storyLine1}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{storyLine2}</p>
                </div>
              </div>

              {/* Progress bar */}
              {steps.length > 0 && (
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-400 tabular-nums shrink-0">{doneCount}/{steps.length} steps · {pct}%</span>
                </div>
              )}

              {/* Failure reason */}
              {failureReason && (
                <div className="mt-3 text-xs text-rose-500 bg-rose-50 dark:bg-rose-500/10 rounded-lg px-3 py-2">
                  {failureReason}
                </div>
              )}
            </div>

            {/* ── Trigger node ─────────────────────────────────────────── */}
            <div className="relative flex gap-4 mb-0">
              <div className="flex flex-col items-center">
                <div className="w-9 h-9 rounded-full bg-[#141c2b] flex items-center justify-center shrink-0 z-10">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 w-0.5 bg-gray-200 dark:bg-gray-700 mt-1 min-h-[24px]" />
              </div>
              <div className="flex-1 mb-3 rounded-xl border border-[#141c2b]/20 dark:border-white/10 bg-[#141c2b]/5 dark:bg-white/4 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Trigger</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                  {triggerType.replace(/_/g, ' ')}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">{timeAgo(exec.created_at)}</p>
              </div>
            </div>

            {/* ── Steps ────────────────────────────────────────────────── */}
            {steps.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <Activity className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-sm text-gray-400">No steps executed yet.</p>
                <p className="text-xs text-gray-400 mt-1">The scheduler will pick this up within 1 minute.</p>
              </div>
            ) : (
              steps.map(step => <TimelineStep key={step.id} step={step} />)
            )}

            {/* ── End cap ──────────────────────────────────────────────── */}
            {exec.status === 'completed' && (
              <div className="relative flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center shrink-0 z-10">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="flex-1 mb-3 rounded-xl border border-blue-100 dark:border-blue-400/20 bg-blue-50/50 dark:bg-blue-900/10 px-4 py-3">
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Sequence complete</p>
                  {exec.completed_at && <p className="text-[11px] text-gray-400 mt-0.5">{timeAgo(exec.completed_at)}</p>}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* ── Context rail (right) ─────────────────────────────────────── */}
        <div className="w-[220px] shrink-0 border-l border-gray-200 dark:border-white/10 overflow-y-auto bg-white dark:bg-[#1e1e1e] px-4 py-5 space-y-5">

          {/* Status */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-2">Status</p>
            <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full', execStyle.badge)}>
              <span className={cn('w-2 h-2 rounded-full', execStyle.dot)} />
              {exec.status.charAt(0).toUpperCase() + exec.status.slice(1)}
            </span>
          </div>

          {/* Contact */}
          {contact && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-2">Contact</p>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#141c2b] flex items-center justify-center shrink-0 text-white text-[10px] font-bold">
                  {initials(contact.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{contact.name}</p>
                  {contact.email && <p className="text-[10px] text-gray-400 truncate">{contact.email}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Template */}
          {templateName && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Template</p>
              <p className="text-xs text-gray-700 dark:text-gray-300">{templateName}</p>
            </div>
          )}

          {/* Goal */}
          {automationType && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Goal</p>
              <p className="text-xs text-gray-700 dark:text-gray-300 capitalize">{automationType.replace(/_/g, ' ')}</p>
            </div>
          )}

          {/* Steps */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Steps</p>
            <p className="text-xs text-gray-700 dark:text-gray-300">{exec.step_count} executed</p>
          </div>

          {/* Trigger */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Trigger</p>
            <p className="text-xs text-gray-700 dark:text-gray-300 capitalize">{exec.trigger_type.replace(/_/g, ' ')}</p>
          </div>

          {/* Next action */}
          {exec.next_step_at && exec.status === 'waiting' && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Next action</p>
              <div className="flex items-center gap-1.5 text-xs text-amber-500">
                <Clock className="w-3 h-3 shrink-0" />
                {timeAgo(exec.next_step_at)}
              </div>
            </div>
          )}

          {/* Started */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Started</p>
            <p className="text-xs text-gray-400">{timeAgo(exec.created_at)}</p>
          </div>

          {/* Link to template builder */}
          {exec.template_id && (
            <div className="pt-2 border-t border-gray-100 dark:border-white/8">
              <a
                href={`/sage/automation-builder?templateId=${exec.template_id}`}
                className="flex items-center gap-1.5 text-xs text-[#141c2b] dark:text-gray-300 hover:underline"
              >
                <ExternalLink className="w-3 h-3" /> View template
              </a>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
