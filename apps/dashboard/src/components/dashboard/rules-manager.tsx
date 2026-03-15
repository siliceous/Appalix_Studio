'use client'

import React, { useState, useTransition } from 'react'
import { Header } from '@/components/layout/header'
import { cn }     from '@/lib/utils'
import {
  Plus, Trash2, Pencil, ToggleLeft, ToggleRight, Zap,
  ChevronDown, X, AlertCircle, GripVertical,
} from 'lucide-react'
import {
  type SageRule, type NewRule, type RuleCondition,
  type RuleChannel, type RuleAction,
  createRule, updateRule, deleteRule, toggleRule,
} from '@/app/actions/sage-rules'

// ─── Types ───────────────────────────────────────────────────────────────────

type Pipeline = { id: string; name: string }

interface Props {
  initialRules: SageRule[]
  pipelines:    Pipeline[]
}

const CHANNEL_LABELS: Record<RuleChannel, string> = {
  any:     'Any channel',
  email:   'Email',
  bots:    'Bot conversation',
  forms:   'Form submission',
  tickets: 'Ticket',
}

const ACTION_LABELS: Record<RuleAction, string> = {
  create_lead:   'Create contact & deal',
  create_ticket: 'Create ticket',
  ignore:        'Ignore (skip)',
}

const FIELD_LABELS: Record<string, string> = {
  priority: 'Priority',
  content:  'Message / summary',
  channel:  'Channel',
}

const OP_LABELS: Record<string, string> = {
  eq:           'is',
  contains:     'contains',
  not_contains: 'does not contain',
}

const PRIORITY_VALUES = ['high', 'medium', 'low']

const EMPTY_CONDITION: RuleCondition = { field: 'priority', op: 'eq', value: 'high' }

function emptyRule(): NewRule {
  return {
    name:          '',
    enabled:       true,
    channel:       'any',
    conditions:    [{ ...EMPTY_CONDITION }],
    action_type:   'create_lead',
    pipeline_id:   null,
    notify_owner:  false,
    rule_priority: 0,
  }
}

// ─── Channel badge ────────────────────────────────────────────────────────────

function ChannelBadge({ channel }: { channel: RuleChannel }) {
  const cls =
    channel === 'email'   ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'   :
    channel === 'bots'    ? 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300' :
    channel === 'forms'   ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' :
    channel === 'tickets' ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300' :
                            'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400'
  return (
    <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full', cls)}>
      {CHANNEL_LABELS[channel]}
    </span>
  )
}

// ─── Condition Row ────────────────────────────────────────────────────────────

function ConditionRow({
  cond, idx, onChange, onRemove, canRemove,
}: {
  cond:     RuleCondition
  idx:      number
  onChange: (idx: number, patch: Partial<RuleCondition>) => void
  onRemove: (idx: number) => void
  canRemove: boolean
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {idx > 0 && (
        <span className="text-[10px] font-semibold text-gray-400 uppercase w-8 text-center shrink-0">AND</span>
      )}
      {idx === 0 && <div className="w-8 shrink-0" />}

      {/* Field */}
      <select
        value={cond.field}
        onChange={e => onChange(idx, { field: e.target.value as RuleCondition['field'], value: '' })}
        className="text-xs rounded-md border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-gray-200 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        {Object.entries(FIELD_LABELS).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>

      {/* Op */}
      <select
        value={cond.op}
        onChange={e => onChange(idx, { op: e.target.value as RuleCondition['op'] })}
        className="text-xs rounded-md border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-gray-200 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        {Object.entries(OP_LABELS).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>

      {/* Value */}
      {cond.field === 'priority' ? (
        <select
          value={cond.value}
          onChange={e => onChange(idx, { value: e.target.value })}
          className="text-xs rounded-md border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-gray-200 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {PRIORITY_VALUES.map(p => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={cond.value}
          onChange={e => onChange(idx, { value: e.target.value })}
          placeholder={cond.field === 'content' ? 'e.g. enterprise, urgent…' : 'value'}
          className="text-xs rounded-md border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-gray-200 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 min-w-0 flex-1"
        />
      )}

      {canRemove && (
        <button
          type="button"
          onClick={() => onRemove(idx)}
          className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

// ─── Rule Form Modal ──────────────────────────────────────────────────────────

function RuleModal({
  initial, pipelines, onSave, onClose,
}: {
  initial:   NewRule
  pipelines: Pipeline[]
  onSave:    (rule: NewRule) => Promise<void>
  onClose:   () => void
}) {
  const [form, setForm] = useState<NewRule>(initial)
  const [saving, startSave] = useTransition()
  const [error, setError]   = useState<string | null>(null)

  function setField<K extends keyof NewRule>(key: K, value: NewRule[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function addCondition() {
    setField('conditions', [...form.conditions, { ...EMPTY_CONDITION }])
  }

  function removeCondition(idx: number) {
    setField('conditions', form.conditions.filter((_, i) => i !== idx))
  }

  function updateCondition(idx: number, patch: Partial<RuleCondition>) {
    setField('conditions', form.conditions.map((c, i) => i === idx ? { ...c, ...patch } : c))
  }

  function handleSave() {
    if (!form.name.trim()) { setError('Rule name is required'); return }
    if (form.conditions.some(c => !c.value.trim())) { setError('All condition values must be filled in'); return }
    setError(null)
    startSave(async () => { await onSave(form) })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#2a2a2a] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b dark:border-white/10">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-brand-600 dark:text-[#15A4AE]" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              {initial.name ? 'Edit rule' : 'New automation rule'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Rule name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setField('name', e.target.value)}
              placeholder="e.g. High-priority enterprise leads"
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Channel */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Apply to channel</label>
            <select
              value={form.channel}
              onChange={e => setField('channel', e.target.value as RuleChannel)}
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {(Object.entries(CHANNEL_LABELS) as [RuleChannel, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Conditions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Conditions (all must match)</label>
              <button
                type="button"
                onClick={addCondition}
                className="text-[11px] text-brand-600 dark:text-[#15A4AE] hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add condition
              </button>
            </div>
            <div className="space-y-2 bg-gray-50 dark:bg-white/5 rounded-xl p-3">
              {form.conditions.map((cond, idx) => (
                <ConditionRow
                  key={idx}
                  cond={cond}
                  idx={idx}
                  onChange={updateCondition}
                  onRemove={removeCondition}
                  canRemove={form.conditions.length > 1}
                />
              ))}
            </div>
          </div>

          {/* Action */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Action to take</label>
            <select
              value={form.action_type}
              onChange={e => setField('action_type', e.target.value as RuleAction)}
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {(Object.entries(ACTION_LABELS) as [RuleAction, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Pipeline (only for create_lead) */}
          {form.action_type === 'create_lead' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Route to pipeline</label>
              <select
                value={form.pipeline_id ?? ''}
                onChange={e => setField('pipeline_id', e.target.value || null)}
                className="w-full text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Use workspace default pipeline</option>
                {pipelines.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Notify owner */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => setField('notify_owner', !form.notify_owner)}
              className={cn(
                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                form.notify_owner ? 'bg-brand-600 dark:bg-[#15A4AE]' : 'bg-gray-200 dark:bg-white/10',
              )}
            >
              <span className={cn(
                'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform',
                form.notify_owner ? 'translate-x-4' : 'translate-x-0.5',
              )} />
            </div>
            <span className="text-xs text-gray-700 dark:text-gray-300">Notify workspace owner when this rule fires</span>
          </label>

          {/* Priority */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Rule priority <span className="font-normal text-gray-400">(higher = evaluated first)</span>
            </label>
            <input
              type="number"
              value={form.rule_priority}
              onChange={e => setField('rule_priority', parseInt(e.target.value) || 0)}
              min={0}
              max={999}
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t dark:border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save rule'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Rule Card ────────────────────────────────────────────────────────────────

function RuleCard({
  rule, pipelines, onEdit, onDelete, onToggle,
}: {
  rule:      SageRule
  pipelines: Pipeline[]
  onEdit:    (rule: SageRule) => void
  onDelete:  (id: string) => void
  onToggle:  (id: string, enabled: boolean) => void
}) {
  const pipeline = pipelines.find(p => p.id === rule.pipeline_id)

  return (
    <div className={cn(
      'bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/8 p-4 transition-opacity',
      !rule.enabled && 'opacity-50',
    )}>
      <div className="flex items-start gap-3">
        <GripVertical className="w-4 h-4 text-gray-300 dark:text-white/20 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-sm font-medium text-gray-900 dark:text-white">{rule.name}</span>
            <ChannelBadge channel={rule.channel} />
            {rule.rule_priority > 0 && (
              <span className="text-[10px] text-gray-400">priority {rule.rule_priority}</span>
            )}
          </div>

          {/* Conditions summary */}
          <div className="space-y-0.5 mb-2">
            {rule.conditions.map((c, i) => (
              <p key={i} className="text-xs text-gray-500 dark:text-gray-400">
                {i > 0 && <span className="text-gray-400 mr-1">AND</span>}
                <span className="font-medium text-gray-700 dark:text-gray-300">{FIELD_LABELS[c.field]}</span>
                {' '}{OP_LABELS[c.op]}{' '}
                <span className="italic">"{c.value}"</span>
              </p>
            ))}
          </div>

          {/* Action summary */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-gray-400">→</span>
            <span className={cn(
              'font-medium',
              rule.action_type === 'ignore' ? 'text-gray-500' :
              rule.action_type === 'create_ticket' ? 'text-orange-600 dark:text-orange-400' :
              'text-brand-700 dark:text-[#15A4AE]',
            )}>
              {ACTION_LABELS[rule.action_type]}
            </span>
            {rule.action_type === 'create_lead' && (
              <span className="text-gray-400">
                {pipeline ? `→ "${pipeline.name}"` : '→ default pipeline'}
              </span>
            )}
            {rule.notify_owner && (
              <span className="text-gray-400">· notify owner</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onToggle(rule.id, !rule.enabled)}
            title={rule.enabled ? 'Disable rule' : 'Enable rule'}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            {rule.enabled
              ? <ToggleRight className="w-4 h-4 text-brand-600 dark:text-[#15A4AE]" />
              : <ToggleLeft  className="w-4 h-4" />
            }
          </button>
          <button
            onClick={() => onEdit(rule)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(rule.id)}
            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function RulesManager({ initialRules, pipelines }: Props) {
  const [rules, setRules]         = useState<SageRule[]>(initialRules)
  const [modalRule, setModalRule] = useState<NewRule | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [, startTransition]       = useTransition()

  function openNew() {
    setEditingId(null)
    setModalRule(emptyRule())
  }

  function openEdit(rule: SageRule) {
    setEditingId(rule.id)
    setModalRule({
      name:          rule.name,
      enabled:       rule.enabled,
      channel:       rule.channel,
      conditions:    rule.conditions,
      action_type:   rule.action_type,
      pipeline_id:   rule.pipeline_id,
      notify_owner:  rule.notify_owner,
      rule_priority: rule.rule_priority,
    })
  }

  async function handleSave(form: NewRule) {
    if (editingId) {
      await updateRule(editingId, form)
      setRules(prev => prev.map(r => r.id === editingId ? { ...r, ...form } : r))
    } else {
      const created = await createRule(form)
      if (created) setRules(prev => [...prev, created])
    }
    setModalRule(null)
    setEditingId(null)
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteRule(id)
      setRules(prev => prev.filter(r => r.id !== id))
    })
  }

  function handleToggle(id: string, enabled: boolean) {
    startTransition(async () => {
      await toggleRule(id, enabled)
      setRules(prev => prev.map(r => r.id === id ? { ...r, enabled } : r))
    })
  }

  const active   = rules.filter(r => r.enabled)
  const inactive = rules.filter(r => !r.enabled)

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-8">
      <div className="flex items-start justify-between gap-4">
        <Header
          title="Automation Rules"
          description="Rule-based routing overrides the default Sage Auto action per item. Rules are evaluated in priority order — first match wins."
        />
        <button
          onClick={openNew}
          className="shrink-0 flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New rule
        </button>
      </div>

      {/* How it works */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-brand-50 dark:bg-[#15A4AE]/8 border border-brand-100 dark:border-[#15A4AE]/20 text-xs text-brand-800 dark:text-[#15A4AE]">
        <Zap className="w-4 h-4 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-medium">How rules work</p>
          <p className="text-brand-700 dark:text-[#15A4AE]/80">
            When Sage Auto processes an item, it checks your rules first. The highest-priority matching rule wins
            and overrides the default action and pipeline. If no rule matches, the workspace default applies.
            All conditions in a rule must pass (AND logic).
          </p>
        </div>
      </div>

      {rules.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/8">
          <Zap className="w-8 h-8 text-gray-300 dark:text-white/20 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No rules yet</p>
          <p className="text-xs text-gray-400 mt-1 mb-5">
            Create your first rule to route leads intelligently.
          </p>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create first rule
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {active.map(rule => (
            <RuleCard
              key={rule.id}
              rule={rule}
              pipelines={pipelines}
              onEdit={openEdit}
              onDelete={handleDelete}
              onToggle={handleToggle}
            />
          ))}

          {inactive.length > 0 && (
            <>
              <p className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold px-1 mt-5">Disabled</p>
              {inactive.map(rule => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  pipelines={pipelines}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onToggle={handleToggle}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* Modal */}
      {modalRule && (
        <RuleModal
          initial={modalRule}
          pipelines={pipelines}
          onSave={handleSave}
          onClose={() => { setModalRule(null); setEditingId(null) }}
        />
      )}
    </div>
  )
}
