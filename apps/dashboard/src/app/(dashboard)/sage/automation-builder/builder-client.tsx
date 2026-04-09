'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Save, Play, Plus, X, Trash2,
  Mail, MessageSquare, Phone, Clock, GitBranch,
  Zap, ArrowUpRight, CheckCircle2, Bell, Webhook,
  User, Briefcase, Loader2, ChevronDown, ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  createAutomationTemplate, updateAutomationTemplate, saveBuilderGraph,
} from '@/app/actions/automation-templates-service'
import type {
  AutomationTemplate, BuilderNode, BuilderGraph,
  AutomationStepType, AutomationType, AutomationTriggerType, AutomationTemplateChannel,
} from '@/lib/types'

// ── Node catalogue ────────────────────────────────────────────────────────────

type NodeSpec = {
  type:      AutomationStepType | 'trigger'
  label:     string
  icon:      React.ElementType
  color:     string
  bgColor:   string
  desc:      string
  canBranch: boolean
}

const NODE_SPECS: NodeSpec[] = [
  { type: 'send_email',      label: 'Send Email',      icon: Mail,          color: 'text-blue-500',    bgColor: 'bg-blue-500',    desc: 'Send an email to the contact',             canBranch: false },
  { type: 'send_sms',        label: 'Send SMS',         icon: MessageSquare, color: 'text-violet-500',  bgColor: 'bg-violet-500',  desc: 'Send an SMS to the contact',               canBranch: false },
  { type: 'call',            label: 'Call',             icon: Phone,         color: 'text-emerald-500', bgColor: 'bg-emerald-500', desc: 'Trigger an outbound call',                 canBranch: false },
  { type: 'wait',            label: 'Wait',             icon: Clock,         color: 'text-amber-500',   bgColor: 'bg-amber-400',   desc: 'Pause the sequence for N days/hours',      canBranch: false },
  { type: 'condition',       label: 'Decision',         icon: GitBranch,     color: 'text-indigo-500',  bgColor: 'bg-indigo-500',  desc: 'Branch based on a condition (Yes / No)',   canBranch: true  },
  { type: 'create_deal',     label: 'Create Deal',      icon: Briefcase,     color: 'text-teal-500',    bgColor: 'bg-teal-500',    desc: 'Create a deal in the pipeline',            canBranch: false },
  { type: 'assign',          label: 'Assign',           icon: User,          color: 'text-pink-500',    bgColor: 'bg-pink-500',    desc: 'Assign the contact to a team member',      canBranch: false },
  { type: 'create_ticket',   label: 'Create Ticket',    icon: Zap,           color: 'text-orange-500',  bgColor: 'bg-orange-500',  desc: 'Open a support ticket',                    canBranch: false },
  { type: 'create_task',     label: 'Create Task',      icon: CheckCircle2,  color: 'text-cyan-500',    bgColor: 'bg-cyan-500',    desc: 'Create an internal task',                  canBranch: false },
  { type: 'notify_internal', label: 'Notify Team',      icon: Bell,          color: 'text-rose-500',    bgColor: 'bg-rose-500',    desc: 'Send an internal notification to the team', canBranch: false },
  { type: 'handoff',         label: 'Handoff',          icon: ArrowUpRight,  color: 'text-rose-400',    bgColor: 'bg-rose-400',    desc: 'Hand off to a human or team',              canBranch: false },
  { type: 'webhook',         label: 'Webhook',          icon: Webhook,       color: 'text-gray-500',    bgColor: 'bg-gray-500',    desc: 'Call an external webhook URL',             canBranch: false },
  { type: 'end',             label: 'End',              icon: CheckCircle2,  color: 'text-gray-400',    bgColor: 'bg-gray-400',    desc: 'End the automation sequence',              canBranch: false },
]

const SPEC_BY_TYPE = new Map(NODE_SPECS.map(s => [s.type, s]))

const TRIGGER_TYPES: { value: AutomationTriggerType; label: string }[] = [
  { value: 'manual',              label: 'Manual trigger'         },
  { value: 'prospect_converted',  label: 'Prospect converted'     },
  { value: 'form_submit',         label: 'Form submitted'         },
  { value: 'inbound_email',       label: 'Inbound email received' },
  { value: 'inbound_sms',         label: 'Inbound SMS received'   },
  { value: 'deal_stage_change',   label: 'Deal stage changed'     },
]

const AUTOMATION_TYPES: { value: AutomationType; label: string }[] = [
  { value: 'warm_introduction',  label: 'Warm Introduction'  },
  { value: 'qualification',      label: 'Qualification'      },
  { value: 'reengagement',       label: 'Re-engagement'      },
  { value: 'meeting_conversion', label: 'Meeting Conversion' },
  { value: 'nurture',            label: 'Lead Nurturing'     },
  { value: 'custom',             label: 'Custom'             },
]

const CHANNELS: { value: AutomationTemplateChannel; label: string }[] = [
  { value: 'email', label: 'Email' },
  { value: 'sms',   label: 'SMS'   },
  { value: 'call',  label: 'Call'  },
  { value: 'multi', label: 'Multi-channel' },
]

// ── Node config panel ─────────────────────────────────────────────────────────

function ConfigPanel({ node, onUpdate, onDelete, onClose }: {
  node:     BuilderNode
  onUpdate: (id: string, patch: Partial<BuilderNode>) => void
  onDelete: (id: string) => void
  onClose:  () => void
}) {
  const spec = SPEC_BY_TYPE.get(node.type) ?? NODE_SPECS[0]
  const Icon = spec.icon

  function set(key: string, value: unknown) {
    onUpdate(node.id, { config: { ...node.config, [key]: value } })
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#1e1e1e] border-l border-gray-200 dark:border-white/10">
      {/* Header */}
      <div className="shrink-0 px-4 py-3.5 border-b border-gray-100 dark:border-white/8 flex items-center gap-3">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', spec.bgColor)}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{spec.label}</p>
          <p className="text-[11px] text-gray-400 truncate">{spec.desc}</p>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* Label (all nodes) */}
        <div>
          <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Label</label>
          <input
            value={node.label}
            onChange={e => onUpdate(node.id, { label: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#141c2b]/20 dark:focus:ring-white/20"
          />
        </div>

        {/* Type-specific fields */}
        {(node.type === 'send_email') && (
          <>
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Subject template</label>
              <input
                value={(node.config.subject_template as string) ?? ''}
                onChange={e => set('subject_template', e.target.value)}
                placeholder="e.g. Quick intro from {{sender_first_name}}"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#141c2b]/20 dark:focus:ring-white/20"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Tone / goal hint</label>
              <textarea
                value={(node.config.goal_hint as string) ?? ''}
                onChange={e => set('goal_hint', e.target.value)}
                rows={3}
                placeholder="e.g. Introduce the product and invite a short call"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#141c2b]/20 dark:focus:ring-white/20 resize-none"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!(node.config.approval_required)}
                  onChange={e => set('approval_required', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Require approval before sending</span>
              </label>
            </div>
          </>
        )}

        {node.type === 'send_sms' && (
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Message template</label>
            <textarea
              value={(node.config.body_template as string) ?? ''}
              onChange={e => set('body_template', e.target.value)}
              rows={4}
              placeholder="e.g. Hey {{contact_first_name}}, it's {{sender_first_name}}…"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#141c2b]/20 dark:focus:ring-white/20 resize-none"
            />
          </div>
        )}

        {node.type === 'wait' && (
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Delay (hours)</label>
            <input
              type="number"
              min={1}
              value={node.delay_hours ?? 24}
              onChange={e => onUpdate(node.id, { delay_hours: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#141c2b]/20 dark:focus:ring-white/20"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              {node.delay_hours && node.delay_hours >= 24 ? `= ${Math.round(node.delay_hours / 24)} day(s)` : ''}
            </p>
          </div>
        )}

        {node.type === 'condition' && (
          <>
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Condition label</label>
              <input
                value={(node.config.condition_label as string) ?? ''}
                onChange={e => set('condition_label', e.target.value)}
                placeholder="e.g. If reply received"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#141c2b]/20 dark:focus:ring-white/20"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Condition type</label>
              <select
                value={(node.config.check as string) ?? 'email_opened'}
                onChange={e => set('check', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none"
              >
                <option value="email_opened">Email opened</option>
                <option value="email_replied">Email replied</option>
                <option value="sms_replied">SMS replied</option>
                <option value="calendar_booked">Calendar booked</option>
                <option value="link_clicked">Link clicked</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div className="rounded-xl border border-indigo-100 dark:border-indigo-400/20 bg-indigo-50/50 dark:bg-indigo-900/10 p-3">
              <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 mb-1">Branching</p>
              <p className="text-[11px] text-indigo-500 dark:text-indigo-300 leading-relaxed">
                The Yes branch continues to the next node in the main flow.
                The No branch goes to the node below the split — add it after this node.
              </p>
            </div>
          </>
        )}

        {node.type === 'create_deal' && (
          <>
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Pipeline</label>
              <input
                value={(node.config.pipeline_id as string) ?? ''}
                onChange={e => set('pipeline_id', e.target.value)}
                placeholder="Pipeline ID or name"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#141c2b]/20"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Stage</label>
              <input
                value={(node.config.stage_id as string) ?? ''}
                onChange={e => set('stage_id', e.target.value)}
                placeholder="Stage ID or name"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#141c2b]/20"
              />
            </div>
          </>
        )}

        {node.type === 'assign' && (
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Assign to</label>
            <select
              value={(node.config.assign_mode as string) ?? 'owner'}
              onChange={e => set('assign_mode', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none"
            >
              <option value="owner">Current owner</option>
              <option value="round_robin">Round robin</option>
              <option value="ai">AI-selected</option>
              <option value="specific">Specific user</option>
            </select>
          </div>
        )}

        {node.type === 'notify_internal' && (
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Notification message</label>
            <textarea
              value={(node.config.message as string) ?? ''}
              onChange={e => set('message', e.target.value)}
              rows={3}
              placeholder="e.g. Contact replied — review and take over"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none resize-none"
            />
          </div>
        )}

        {node.type === 'webhook' && (
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Webhook URL</label>
            <input
              value={(node.config.url as string) ?? ''}
              onChange={e => set('url', e.target.value)}
              placeholder="https://…"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#141c2b]/20"
            />
          </div>
        )}

        {/* Variables hint */}
        <div className="rounded-xl border border-gray-100 dark:border-white/8 bg-gray-50 dark:bg-white/3 p-3">
          <p className="text-[11px] font-semibold text-gray-400 mb-1">Available variables</p>
          <p className="text-[11px] text-gray-400 leading-relaxed font-mono">
            {'{{contact_first_name}} {{contact_last_name}} {{contact_email}} {{sender_first_name}} {{company_name}} {{value_proposition}}'}
          </p>
        </div>
      </div>

      {/* Footer */}
      {node.type !== 'trigger' && (
        <div className="shrink-0 px-4 py-3 border-t border-gray-100 dark:border-white/8">
          <button
            onClick={() => onDelete(node.id)}
            className="flex items-center gap-2 text-xs text-rose-500 hover:text-rose-600 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete this step
          </button>
        </div>
      )}
    </div>
  )
}

// ── Canvas node card ──────────────────────────────────────────────────────────

function NodeCard({ node, selected, onSelect, onAddAfter }: {
  node:       BuilderNode
  selected:   boolean
  onSelect:   (id: string) => void
  onAddAfter: (afterId: string, branch?: 'yes' | 'no') => void
}) {
  const spec  = SPEC_BY_TYPE.get(node.type)
  const Icon  = spec?.icon ?? Zap
  const isTrigger = node.type === 'trigger'
  const emailSubject = typeof node.config.subject_template === 'string' ? node.config.subject_template : null
  const smsBody      = typeof node.config.body_template === 'string' ? node.config.body_template : null

  return (
    <div className="flex flex-col items-center">
      <div
        onClick={() => onSelect(node.id)}
        className={cn(
          'w-full max-w-[320px] rounded-2xl border-2 cursor-pointer transition-all duration-150 shadow-sm',
          selected
            ? 'border-[#141c2b] shadow-[0_0_0_3px_rgba(20,28,43,0.12)] dark:border-white dark:shadow-[0_0_0_3px_rgba(255,255,255,0.1)]'
            : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 hover:shadow-md',
          isTrigger
            ? 'bg-[#141c2b] dark:bg-[#141c2b]'
            : 'bg-white dark:bg-[#1e1e1e]',
        )}
      >
        <div className="flex items-start gap-3 px-4 py-3.5">
          {isTrigger ? (
            <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-white" />
            </div>
          ) : (
            <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center shrink-0', spec?.bgColor ?? 'bg-gray-400')}>
              <Icon className="w-4 h-4 text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className={cn(
              'text-[10px] font-semibold uppercase tracking-wide mb-0.5',
              isTrigger ? 'text-white/50' : 'text-gray-400',
            )}>
              {spec?.label ?? node.type}
            </p>
            <p className={cn(
              'text-sm font-medium leading-snug',
              isTrigger ? 'text-white' : 'text-gray-900 dark:text-gray-100',
            )}>
              {node.label}
            </p>
            {/* Brief config summary */}
            {node.type === 'send_email' && typeof node.config.subject_template === 'string' && (
              <p className="text-[11px] text-gray-400 truncate mt-0.5">{node.config.subject_template as string}</p>
            )}
            {node.type === 'send_sms' && !!node.config.body_template && (
              <p className="text-[11px] text-gray-400 truncate mt-0.5">{String(node.config.body_template).slice(0, 60)}</p>
            )}
            {node.type === 'wait' && !!node.delay_hours && (
              <p className="text-[11px] text-amber-500 mt-0.5">
                {node.delay_hours >= 24 ? `${Math.round(node.delay_hours / 24)} day${Math.round(node.delay_hours / 24) !== 1 ? 's' : ''}` : `${node.delay_hours}h`} delay
              </p>
            )}
            {node.type === 'condition' && typeof node.config.condition_label === 'string' && (
              <p className="text-[11px] text-indigo-400 mt-0.5">{node.config.condition_label as string}</p>
            )}
          </div>
        </div>

        {/* Condition branch indicator */}
        {node.type === 'condition' && (
          <div className="flex border-t border-gray-100 dark:border-white/8">
            <div className="flex-1 flex items-center justify-center gap-1 px-3 py-2 border-r border-gray-100 dark:border-white/8">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Yes path</span>
            </div>
            <div className="flex-1 flex items-center justify-center gap-1 px-3 py-2">
              <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 shrink-0" />
              <span className="text-[11px] font-medium text-gray-400">No path</span>
            </div>
          </div>
        )}
      </div>

      {/* Add node button */}
      {node.type !== 'end' && (
        <div className="flex flex-col items-center my-1">
          <div className="w-0.5 h-5 bg-gray-200 dark:bg-gray-700" />
          <AddButton onClick={() => onAddAfter(node.id)} />
        </div>
      )}
    </div>
  )
}

function AddButton({ onClick, label }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-dashed border-gray-300 dark:border-white/20 text-gray-400 hover:border-[#141c2b] hover:text-[#141c2b] dark:hover:border-white/40 dark:hover:text-white text-[11px] font-medium transition-colors bg-white dark:bg-[#181818]"
    >
      <Plus className="w-3 h-3" />{label ?? 'Add step'}
    </button>
  )
}

// ── Node picker sheet ─────────────────────────────────────────────────────────

function NodePicker({ onPick, onClose }: {
  onPick:  (type: AutomationStepType) => void
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const filtered = q
    ? NODE_SPECS.filter(s => s.type !== 'trigger' && s.label.toLowerCase().includes(q.toLowerCase()))
    : NODE_SPECS.filter(s => s.type !== 'trigger')

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#1e1e1e] w-full max-w-lg rounded-t-2xl border-t border-gray-200 dark:border-white/10 shadow-2xl pb-safe max-h-[70vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/8 shrink-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Add a step</p>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-4 py-3 border-b border-gray-100 dark:border-white/8 shrink-0">
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search steps…"
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#141c2b]/20"
          />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3 grid grid-cols-2 gap-2">
          {filtered.map(spec => {
            const Icon = spec.icon
            return (
              <button
                key={spec.type}
                onClick={() => onPick(spec.type as AutomationStepType)}
                className="flex items-start gap-3 px-4 py-3 rounded-xl border border-gray-100 dark:border-white/8 hover:border-[#141c2b]/30 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left"
              >
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5', spec.bgColor)}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{spec.label}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{spec.desc}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Template meta bar ─────────────────────────────────────────────────────────

function MetaBar({ name, automationType, triggerType, channel, onChange }: {
  name:           string
  automationType: AutomationType
  triggerType:    AutomationTriggerType
  channel:        AutomationTemplateChannel
  onChange:       (k: string, v: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="shrink-0 border-b border-gray-100 dark:border-white/8 bg-white dark:bg-[#1e1e1e]">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{name || 'Untitled automation'}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {AUTOMATION_TYPES.find(t => t.value === automationType)?.label}
            {' · '}
            {TRIGGER_TYPES.find(t => t.value === triggerType)?.label}
            {' · '}
            {CHANNELS.find(c => c.value === channel)?.label}
          </p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
      </button>

      {open && (
        <div className="px-5 pb-4 grid grid-cols-2 gap-3 border-t border-gray-100 dark:border-white/8 pt-3">
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Template name</label>
            <input
              value={name}
              onChange={e => onChange('name', e.target.value)}
              placeholder="e.g. Cold Lead Outreach"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#141c2b]/20"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Goal type</label>
            <select value={automationType} onChange={e => onChange('automationType', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none">
              {AUTOMATION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Trigger</label>
            <select value={triggerType} onChange={e => onChange('triggerType', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none">
              {TRIGGER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Primary channel</label>
            <select value={channel} onChange={e => onChange('channel', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none">
              {CHANNELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main builder client ───────────────────────────────────────────────────────

function makeId() {
  return `node_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function defaultGraph(): BuilderGraph {
  const triggerId = 'trigger_1'
  return {
    entryNodeId: triggerId,
    nodes: [
      { id: triggerId, type: 'trigger', label: 'New automation starts', config: {} },
    ],
    edges: [],
  }
}

export function BuilderClient({ template }: { template: AutomationTemplate | null }) {
  const router = useRouter()

  const [name,           setName]           = useState(template?.name            ?? '')
  const [automationType, setAutomationType] = useState<AutomationType>(template?.automation_type ?? 'warm_introduction')
  const [triggerType,    setTriggerType]    = useState<AutomationTriggerType>(template?.trigger_type ?? 'manual')
  const [channel,        setChannel]        = useState<AutomationTemplateChannel>(template?.primary_channel ?? 'email')

  const [graph,       setGraph]       = useState<BuilderGraph>(
    template?.config_json ?? defaultGraph()
  )
  const [selectedId,  setSelectedId]  = useState<string | null>(null)
  const [pickerAfter, setPickerAfter] = useState<string | null>(null)
  const [saving,      setSaving]      = useState(false)
  const [dirty,       setDirty]       = useState(false)

  const selectedNode = graph.nodes.find(n => n.id === selectedId) ?? null

  // ── Graph mutations ──────────────────────────────────────────────────────

  function updateNode(id: string, patch: Partial<BuilderNode>) {
    setGraph(g => ({ ...g, nodes: g.nodes.map(n => n.id === id ? { ...n, ...patch } : n) }))
    setDirty(true)
  }

  function addNodeAfter(afterId: string, type: AutomationStepType) {
    const spec = SPEC_BY_TYPE.get(type)
    const newId = makeId()
    const newNode: BuilderNode = {
      id:    newId,
      type,
      label: spec?.label ?? type,
      config: {},
      delay_hours: type === 'wait' ? 48 : undefined,
    }

    setGraph(g => {
      const nodes = [...g.nodes, newNode]
      // Rewire: find edge from afterId → target, redirect it newId → target, add afterId → newId
      const existingEdge = g.edges.find(e => e.from === afterId && !e.branch)
      const edges = g.edges.filter(e => !(e.from === afterId && !e.branch))
      edges.push({ from: afterId, to: newId })
      if (existingEdge) edges.push({ from: newId, to: existingEdge.to })
      return { ...g, nodes, edges }
    })
    setSelectedId(newId)
    setPickerAfter(null)
    setDirty(true)
  }

  function deleteNode(id: string) {
    setGraph(g => {
      const nodes = g.nodes.filter(n => n.id !== id)
      // Reconnect: find incoming and outgoing edges
      const inEdge  = g.edges.find(e => e.to === id && !e.branch)
      const outEdge = g.edges.find(e => e.from === id && !e.branch)
      let edges = g.edges.filter(e => e.from !== id && e.to !== id)
      if (inEdge && outEdge) edges.push({ from: inEdge.from, to: outEdge.to })
      return { ...g, nodes, edges }
    })
    setSelectedId(null)
    setDirty(true)
  }

  // ── Ordered walk for rendering ───────────────────────────────────────────

  function orderedNodes(): BuilderNode[] {
    const entryId = graph.entryNodeId ?? graph.nodes[0]?.id
    const byId    = new Map(graph.nodes.map(n => [n.id, n]))
    const nextMap = new Map<string, string>()
    for (const e of graph.edges) {
      if (!e.branch) nextMap.set(e.from, e.to)
    }
    const result: BuilderNode[] = []
    const visited = new Set<string>()
    let cursor: string | undefined = entryId
    while (cursor && byId.has(cursor) && !visited.has(cursor)) {
      visited.add(cursor)
      result.push(byId.get(cursor)!)
      cursor = nextMap.get(cursor)
    }
    // Append orphan nodes
    for (const n of graph.nodes) {
      if (!visited.has(n.id)) result.push(n)
    }
    return result
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  async function handleSave(activate = false) {
    if (!name.trim()) { alert('Please enter a template name.'); return }
    setSaving(true)
    try {
      let tpl: AutomationTemplate
      if (template) {
        // Update meta first
        await updateAutomationTemplate(template.id, {
          name, automation_type: automationType,
          trigger_type: triggerType, primary_channel: channel,
          ...(activate ? { is_active: true } : {}),
        })
        tpl = await saveBuilderGraph(template.id, graph)
      } else {
        tpl = await createAutomationTemplate({
          name,
          automation_type:  automationType,
          trigger_type:     triggerType,
          primary_channel:  channel,
          steps:            [],
        })
        tpl = await saveBuilderGraph(tpl.id, graph, {
          name, automation_type: automationType,
          trigger_type: triggerType, primary_channel: channel,
          ...(activate ? {} : {}),
        })
        if (activate) {
          await updateAutomationTemplate(tpl.id, { is_active: true })
        }
      }
      setDirty(false)
      router.push(`/sage/automation-builder?templateId=${tpl.id}`)
    } finally {
      setSaving(false)
    }
  }

  const nodes = orderedNodes()

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
        <span className="text-sm font-medium text-white truncate max-w-[200px]">{name || 'Untitled'}</span>
        {dirty && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300">Unsaved</span>}

        <div className="flex-1" />

        <button
          onClick={() => handleSave(false)}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-white/20 text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          Save draft
        </button>
        <button
          onClick={() => handleSave(true)}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
        >
          <Play className="w-3 h-3" /> Publish
        </button>
      </div>

      {/* ── Body: canvas + config panel ──────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── Canvas ───────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0 overflow-hidden">

          {/* Meta bar */}
          <MetaBar
            name={name}
            automationType={automationType}
            triggerType={triggerType}
            channel={channel}
            onChange={(k, v) => {
              if (k === 'name')           setName(v)
              if (k === 'automationType') setAutomationType(v as AutomationType)
              if (k === 'triggerType')    setTriggerType(v as AutomationTriggerType)
              if (k === 'channel')        setChannel(v as AutomationTemplateChannel)
              setDirty(true)
            }}
          />

          {/* Canvas scroll area */}
          <div
            className="flex-1 overflow-y-auto overflow-x-hidden px-8 py-8"
            onClick={e => { if (e.currentTarget === e.target) setSelectedId(null) }}
          >
            <div className="flex flex-col items-center gap-0 max-w-[380px] mx-auto">
              {nodes.map(node => (
                <NodeCard
                  key={node.id}
                  node={node}
                  selected={selectedId === node.id}
                  onSelect={setSelectedId}
                  onAddAfter={(afterId) => setPickerAfter(afterId)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Config panel ─────────────────────────────────────────────── */}
        {selectedNode && (
          <div className="w-[300px] shrink-0 overflow-hidden">
            <ConfigPanel
              node={selectedNode}
              onUpdate={updateNode}
              onDelete={deleteNode}
              onClose={() => setSelectedId(null)}
            />
          </div>
        )}
      </div>

      {/* ── Node picker ──────────────────────────────────────────────────── */}
      {pickerAfter && (
        <NodePicker
          onPick={type => addNodeAfter(pickerAfter, type)}
          onClose={() => setPickerAfter(null)}
        />
      )}
    </div>
  )
}
