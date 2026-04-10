'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Zap, Plus, Search, X, Mail, MessageSquare, Phone,
  MoreHorizontal, Play, Pause, Copy, Trash2, ExternalLink,
  CheckCircle2, AlertTriangle, Clock, Square,
  TrendingUp, TrendingDown, Minus, ChevronRight,
  ArrowUpRight, Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { timeAgo } from '@/lib/utils'
import {
  deleteAutomationTemplate, duplicateAutomationTemplate,
  updateAutomationTemplate,
} from '@/app/actions/automation-templates-service'
import type { AutomationTemplate, AutomationExecutionRow } from '@/lib/types'

// ── Display helpers ───────────────────────────────────────────────────────────

const CHANNEL_ICON: Record<string, React.ElementType> = {
  email: Mail, sms: MessageSquare, call: Phone, multi: Zap,
}

const TYPE_LABEL: Record<string, string> = {
  warm_introduction:  'Warm Intro',
  qualification:      'Qualification',
  reengagement:       'Re-engagement',
  meeting_conversion: 'Meeting',
  nurture:            'Nurturing',
  custom:             'Custom',
}

const EXEC_STATUS: Record<string, { label: string; dot: string; badge: string }> = {
  running:   { label: 'Running',   dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' },
  waiting:   { label: 'Waiting',   dot: 'bg-amber-300',   badge: 'bg-amber-50 text-amber-500 dark:bg-amber-500/10 dark:text-amber-300' },
  paused:    { label: 'Paused',    dot: 'bg-gray-400',    badge: 'bg-gray-100 text-gray-500 dark:bg-white/8 dark:text-gray-400' },
  completed: { label: 'Completed', dot: 'bg-blue-400',    badge: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' },
  failed:    { label: 'Failed',    dot: 'bg-rose-400',    badge: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' },
  stopped:   { label: 'Stopped',   dot: 'bg-gray-300',    badge: 'bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-gray-500' },
}

function initials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function Avatar({ name, size = 32 }: { name: string | null; size?: number }) {
  return (
    <div
      className="rounded-full bg-[#141c2b] flex items-center justify-center shrink-0 text-white text-[11px] font-semibold select-none"
      style={{ width: size, height: size, minWidth: size }}
    >
      {initials(name)}
    </div>
  )
}

// ── Templates tab ─────────────────────────────────────────────────────────────

function TemplateRow({ tpl, onEdit, onDuplicate, onToggle, onDelete }: {
  tpl:         AutomationTemplate
  onEdit:      (id: string) => void
  onDuplicate: (id: string) => Promise<void>
  onToggle:    (id: string, active: boolean) => Promise<void>
  onDelete:    (id: string) => Promise<void>
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [busy, setBusy]         = useState(false)
  const Ch = CHANNEL_ICON[tpl.primary_channel] ?? Mail

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    try { await fn() } finally { setBusy(false); setMenuOpen(false) }
  }

  return (
    <div className="flex items-center gap-4 px-5 py-3.5 border-b border-gray-100 dark:border-white/6 hover:bg-gray-50/60 dark:hover:bg-white/[0.02] group transition-colors">
      {/* Icon */}
      <div className="w-9 h-9 rounded-xl bg-[#141c2b]/8 dark:bg-white/6 flex items-center justify-center shrink-0">
        <Ch className="w-4 h-4 text-[#141c2b] dark:text-gray-300" />
      </div>

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{tpl.name}</span>
          {tpl.is_system && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-500 dark:bg-violet-500/10 dark:text-violet-400 shrink-0">System</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-[11px] text-gray-400">{TYPE_LABEL[tpl.automation_type] ?? tpl.automation_type}</span>
          <span className="text-gray-300 dark:text-gray-700 text-[11px]">·</span>
          <span className="text-[11px] text-gray-400 capitalize">{tpl.trigger_type.replace(/_/g, ' ')}</span>
          <span className="text-gray-300 dark:text-gray-700 text-[11px]">·</span>
          <span className="text-[11px] text-gray-400">{tpl.steps.length} steps</span>
          <span className="text-gray-300 dark:text-gray-700 text-[11px]">·</span>
          <span className="text-[11px] text-gray-400">v{tpl.version}</span>
        </div>
      </div>

      {/* Status badge */}
      <span className={cn(
        'text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0',
        tpl.is_active
          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
          : 'bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-gray-500',
      )}>
        {tpl.is_active ? 'Active' : 'Draft'}
      </span>

      {/* Last updated */}
      <span className="text-[11px] text-gray-400 shrink-0 hidden lg:block">{timeAgo(tpl.updated_at)}</span>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {!tpl.is_system && (
          <button
            onClick={() => onEdit(tpl.id)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-[#141c2b] hover:text-[#141c2b] dark:hover:border-white/30 dark:hover:text-white rounded-lg transition-colors"
          >
            Edit
          </button>
        )}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(v => !v)}
            disabled={busy}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-white/10 rounded-xl shadow-lg overflow-hidden min-w-[160px]">
                <button onClick={() => run(() => onDuplicate(tpl.id))}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/8 transition-colors">
                  <Copy className="w-3.5 h-3.5 text-gray-400" /> Duplicate
                </button>
                {!tpl.is_system && (
                  <button onClick={() => run(() => onToggle(tpl.id, !tpl.is_active))}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/8 transition-colors">
                    {tpl.is_active ? <Pause className="w-3.5 h-3.5 text-gray-400" /> : <Play className="w-3.5 h-3.5 text-gray-400" />}
                    {tpl.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                )}
                {!tpl.is_system && (
                  <>
                    <div className="mx-3 border-t border-gray-100 dark:border-white/8" />
                    <button onClick={() => run(() => onDelete(tpl.id))}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Execution row (Running + History tabs) ────────────────────────────────────

function ExecutionRow({ exec, onOpen }: {
  exec:   AutomationExecutionRow
  onOpen: (id: string) => void
}) {
  const cfg = EXEC_STATUS[exec.status] ?? EXEC_STATUS.running

  return (
    <div
      onClick={() => onOpen(exec.id)}
      className="flex items-center gap-4 px-5 py-3.5 border-b border-gray-100 dark:border-white/6 hover:bg-gray-50/60 dark:hover:bg-white/[0.02] cursor-pointer transition-colors group"
    >
      <Avatar name={exec.contact_name ?? null} size={30} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {exec.contact_name ?? 'Unknown contact'}
          </span>
          <span className={cn('inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0', cfg.badge)}>
            <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot, exec.status === 'running' && 'animate-pulse')} />
            {cfg.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {exec.template_name && (
            <span className="text-[11px] text-gray-400 truncate">{exec.template_name}</span>
          )}
          {exec.step_count > 0 && (
            <>
              <span className="text-gray-300 dark:text-gray-700 text-[11px]">·</span>
              <span className="text-[11px] text-gray-400">{exec.step_count} steps</span>
            </>
          )}
          <span className="text-gray-300 dark:text-gray-700 text-[11px]">·</span>
          <span className="text-[11px] text-gray-400">{timeAgo(exec.updated_at)}</span>
        </div>
      </div>

      {exec.next_step_at && exec.status === 'waiting' && (
        <div className="flex items-center gap-1 text-[11px] text-amber-500 shrink-0 hidden md:flex">
          <Clock className="w-3 h-3" />
          {timeAgo(exec.next_step_at)}
        </div>
      )}
      {exec.completed_at && (
        <span className="text-[11px] text-gray-400 shrink-0 hidden md:block">{timeAgo(exec.completed_at)}</span>
      )}
      {exec.failed_at && (
        <span className="text-[11px] text-rose-400 shrink-0 hidden md:block">{timeAgo(exec.failed_at)}</span>
      )}

      <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, title, desc, action, onAction }: {
  icon:     React.ElementType
  title:    string
  desc:     string
  action?:  string
  onAction?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-[#141c2b]/8 dark:bg-white/5 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-[#141c2b] dark:text-gray-400" />
      </div>
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{title}</p>
      <p className="text-xs text-gray-400 max-w-[220px] leading-relaxed mb-5">{desc}</p>
      {action && onAction && (
        <button onClick={onAction}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#141c2b] hover:bg-[#0e1420] text-white text-xs font-semibold rounded-xl transition-colors">
          <Plus className="w-3.5 h-3.5" /> {action}
        </button>
      )}
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: number; icon: React.ElementType; color: string
}) {
  return (
    <div className="bg-white dark:bg-[#1e1e1e] rounded-xl border border-gray-200 dark:border-white/8 px-4 py-3 flex items-center gap-3">
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', color)}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div>
        <p className="text-xl font-bold text-gray-900 dark:text-white leading-none">{value}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

type Tab = 'templates' | 'running' | 'history'

export function AutomationsClient({ templates: initialTemplates, running, history, insights }: {
  templates: AutomationTemplate[]
  running:   AutomationExecutionRow[]
  history:   AutomationExecutionRow[]
  insights:  { active: number; engaged: number; completed: number; escalated: number }
}) {
  const router = useRouter()
  const [tab,       setTab]       = useState<Tab>('templates')
  const [templates, setTemplates] = useState(initialTemplates)
  const [searchQ,   setSearchQ]   = useState('')

  useEffect(() => { setTemplates(initialTemplates) }, [initialTemplates])

  // ── Template actions
  async function handleDuplicate(id: string) {
    const copy = await duplicateAutomationTemplate(id)
    setTemplates(prev => [copy, ...prev])
  }
  async function handleToggle(id: string, active: boolean) {
    await updateAutomationTemplate(id, { is_active: active })
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, is_active: active } : t))
  }
  async function handleDelete(id: string) {
    await deleteAutomationTemplate(id)
    setTemplates(prev => prev.filter(t => t.id !== id))
  }

  // ── Filter
  const q = searchQ.trim().toLowerCase()
  const filteredTemplates = q
    ? templates.filter(t => t.name.toLowerCase().includes(q) || t.automation_type.includes(q))
    : templates
  const filteredRunning = q
    ? running.filter(e => (e.contact_name ?? '').toLowerCase().includes(q) || (e.template_name ?? '').toLowerCase().includes(q))
    : running
  const filteredHistory = q
    ? history.filter(e => (e.contact_name ?? '').toLowerCase().includes(q) || (e.template_name ?? '').toLowerCase().includes(q))
    : history

  const TAB_COUNTS: Record<Tab, number> = {
    templates: templates.length,
    running:   running.length,
    history:   history.length,
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden px-4 pt-5 pb-4 bg-[#f5f4f1] dark:bg-[#111]">
      <div className="flex flex-col flex-1 min-h-0 w-full" style={{ maxWidth: '72rem', margin: '0 auto' }}>

        {/* ── Stat strip ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-3 mb-4 shrink-0">
          <StatCard label="Running"   value={insights.active}    icon={Zap}          color="bg-amber-400" />
          <StatCard label="Engaged"   value={insights.engaged}   icon={TrendingUp}   color="bg-emerald-500" />
          <StatCard label="Escalated" value={insights.escalated} icon={AlertTriangle} color="bg-rose-400" />
          <StatCard label="Completed" value={insights.completed} icon={CheckCircle2} color="bg-blue-500" />
        </div>

        {/* ── Card ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col flex-1 min-h-0 bg-white dark:bg-[#1e1e1e] rounded-xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] border border-gray-200/70 dark:border-white/8 overflow-hidden">

          {/* ── Toolbar ───────────────────────────────────────────────── */}
          <div className="shrink-0 bg-[#141c2b] px-4 py-2.5 flex items-center gap-3">
            <span className="text-sm font-semibold text-white shrink-0">Automations</span>

            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40 pointer-events-none" />
              <input
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Search…"
                className="w-full pl-7 pr-7 py-1.5 text-xs bg-white/8 border border-white/15 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors"
              />
              {searchQ && (
                <button onClick={() => setSearchQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex-1" />

            <button
              onClick={() => router.push('/sage/automation-builder')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-medium rounded-lg transition-colors"
            >
              <Plus className="w-3 h-3" /> New Template
            </button>
          </div>

          {/* ── Tabs ──────────────────────────────────────────────────── */}
          <div className="shrink-0 flex border-b border-gray-100 dark:border-white/8 px-4">
            {(['templates', 'running', 'history'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'flex items-center gap-1.5 px-1 py-3 mr-6 text-xs font-medium border-b-2 -mb-px transition-colors capitalize',
                  tab === t
                    ? 'border-[#141c2b] text-[#141c2b] dark:border-white dark:text-white'
                    : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
                )}
              >
                {t === 'templates' ? 'Templates' : t === 'running' ? 'Running' : 'History'}
                {TAB_COUNTS[t] > 0 && (
                  <span className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-full tabular-nums leading-none',
                    tab === t
                      ? 'bg-[#141c2b] text-white dark:bg-white dark:text-[#141c2b]'
                      : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400',
                  )}>
                    {TAB_COUNTS[t]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Content ───────────────────────────────────────────────── */}
          <div className="flex-1 min-h-0 overflow-y-auto">

            {/* Templates tab */}
            {tab === 'templates' && (() => {
              if (filteredTemplates.length === 0) return (
                <EmptyState
                  icon={Zap}
                  title="No templates yet"
                  desc="Build your first automation template to start sending sequences."
                  action="New Template"
                  onAction={() => router.push('/sage/automation-builder')}
                />
              )
              // Group by track
              const tracked = filteredTemplates.filter(t => t.track)
              const untracked = filteredTemplates.filter(t => !t.track)
              const trackGroups: Record<string, typeof filteredTemplates> = {}
              for (const t of tracked) {
                const k = t.track!
                trackGroups[k] = trackGroups[k] ?? []
                trackGroups[k].push(t)
              }
              const renderRow = (tpl: AutomationTemplate) => (
                <TemplateRow
                  key={tpl.id}
                  tpl={tpl}
                  onEdit={id => router.push(`/sage/automation-builder?templateId=${id}`)}
                  onDuplicate={handleDuplicate}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                />
              )
              return (
                <>
                  {Object.entries(trackGroups).map(([track, tpls]) => (
                    <div key={track}>
                      <div className="px-5 py-2 bg-gray-50 dark:bg-white/[0.03] border-b border-gray-100 dark:border-white/6 flex items-center gap-2">
                        <Zap className="w-3 h-3 text-violet-400 shrink-0" />
                        <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{track}</span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">{tpls.length} templates</span>
                      </div>
                      {tpls.map(renderRow)}
                    </div>
                  ))}
                  {untracked.length > 0 && (
                    <div>
                      {Object.keys(trackGroups).length > 0 && (
                        <div className="px-5 py-2 bg-gray-50 dark:bg-white/[0.03] border-b border-gray-100 dark:border-white/6">
                          <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Custom</span>
                        </div>
                      )}
                      {untracked.map(renderRow)}
                    </div>
                  )}
                </>
              )
            })()}

            {/* Running tab */}
            {tab === 'running' && (
              filteredRunning.length === 0
                ? <EmptyState
                    icon={Activity}
                    title="No active executions"
                    desc="Running automations appear here once contacts enter a sequence."
                  />
                : filteredRunning.map(exec => (
                    <ExecutionRow
                      key={exec.id}
                      exec={exec}
                      onOpen={id => router.push(`/sage/automations/${id}`)}
                    />
                  ))
            )}

            {/* History tab */}
            {tab === 'history' && (
              filteredHistory.length === 0
                ? <EmptyState
                    icon={CheckCircle2}
                    title="No history yet"
                    desc="Completed and failed automation runs will appear here."
                  />
                : filteredHistory.map(exec => (
                    <ExecutionRow
                      key={exec.id}
                      exec={exec}
                      onOpen={id => router.push(`/sage/automations/${id}`)}
                    />
                  ))
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
