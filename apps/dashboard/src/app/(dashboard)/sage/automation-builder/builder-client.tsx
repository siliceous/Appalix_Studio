'use client'

import { useState, useCallback, useMemo, memo, useEffect, useRef, useReducer } from 'react'
import { useRouter } from 'next/navigation'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  SelectionMode,
  useReactFlow,
  applyNodeChanges,
  type Node,
  type Edge,
  type NodeProps,
  type EdgeProps,
  type NodeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  Save, Play, Plus, X, Trash2,
  Mail, MessageSquare, Phone, Clock, GitBranch,
  Zap, ArrowUpRight, CheckCircle2, Bell, Webhook,
  User, Briefcase, Loader2,
  ArrowLeft, ArrowRight, Undo2, Redo2,
  ZoomIn, ZoomOut, Maximize2, LayoutGrid, MousePointer2,
  ChevronDown,
  // Taxonomy category icons
  Calendar, Bot, CreditCard, ShoppingBag, Megaphone,
  FileText, Star, BookOpen, Users, Link2, Layers, Tag, FolderOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SageToolbar } from '@/components/dashboard/sage-toolbar'
import { AutomationTabBar } from '@/components/dashboard/automation-side-tabs'
import {
  createAutomationTemplate, updateAutomationTemplate, saveBuilderGraph,
} from '@/app/actions/automation-templates-service'
import type {
  AutomationTemplate, BuilderNode, BuilderEdge, BuilderGraph,
  AutomationStepType, AutomationType, AutomationTriggerType, AutomationTemplateChannel,
} from '@/lib/types'

// ── Node catalogue ─────────────────────────────────────────────────────────────

type NodeSpec = {
  type:    AutomationStepType | 'trigger'
  label:   string
  icon:    React.ElementType
  bgColor: string
  desc:    string
}

const NODE_SPECS: NodeSpec[] = [
  { type: 'send_email',      label: 'Send Email',      icon: Mail,          bgColor: 'bg-blue-500',    desc: 'Send an email to the contact'              },
  { type: 'send_sms',        label: 'Send SMS',        icon: MessageSquare, bgColor: 'bg-violet-500',  desc: 'Send an SMS to the contact'                },
  { type: 'call',            label: 'Call',            icon: Phone,         bgColor: 'bg-emerald-500', desc: 'Trigger an outbound call'                  },
  { type: 'wait',            label: 'Wait',            icon: Clock,         bgColor: 'bg-amber-400',   desc: 'Pause the sequence for N days/hours'       },
  { type: 'condition',       label: 'Decision',        icon: GitBranch,     bgColor: 'bg-indigo-500',  desc: 'Branch based on a condition (Yes / No)'    },
  { type: 'create_deal',     label: 'Create Deal',     icon: Briefcase,     bgColor: 'bg-teal-500',    desc: 'Create a deal in the pipeline'             },
  { type: 'update_contact',  label: 'Update Contact',  icon: User,          bgColor: 'bg-sky-500',     desc: 'Update contact fields or tags'             },
  { type: 'assign',          label: 'Assign Owner',    icon: Users,         bgColor: 'bg-pink-500',    desc: 'Assign the contact to a team member'       },
  { type: 'create_ticket',   label: 'Create Ticket',   icon: Tag,           bgColor: 'bg-orange-500',  desc: 'Open a support ticket'                     },
  { type: 'create_task',     label: 'Create Task',     icon: CheckCircle2,  bgColor: 'bg-cyan-500',    desc: 'Create an internal task'                   },
  { type: 'notify_internal', label: 'Notify Team',     icon: Bell,          bgColor: 'bg-rose-500',    desc: 'Send an internal notification to the team' },
  { type: 'handoff',         label: 'Handoff',         icon: ArrowUpRight,  bgColor: 'bg-rose-400',    desc: 'Hand off to a human or team'               },
  { type: 'webhook',         label: 'Webhook',         icon: Webhook,       bgColor: 'bg-gray-500',    desc: 'Call an external webhook URL'              },
  { type: 'end',             label: 'End',             icon: CheckCircle2,  bgColor: 'bg-gray-400',    desc: 'End the automation sequence'               },
]

// ── Node taxonomy (categorised, with trigger references) ───────────────────────

type TriggerRef = { label: string; desc: string; type?: AutomationTriggerType }

type TaxonomyCategory = {
  id:       string
  label:    string
  icon:     React.ElementType
  color:    string          // Tailwind bg-* for the icon dot
  triggers: TriggerRef[]   // Reference only — not clickable
  actions:  NodeSpec[]     // Clickable step types
}

const TAXONOMY: TaxonomyCategory[] = [
  {
    id: 'contact', label: 'Contact', icon: User, color: 'bg-sky-500',
    triggers: [
      { label: 'Prospect converted',  desc: 'Fires when a prospect becomes a contact',         type: 'prospect_converted' },
      { label: 'Contact created',     desc: 'Fires when a new contact is added',               type: 'contact_created'    },
      { label: 'Newsletter signup',   desc: 'Fires when a contact signs up for the newsletter', type: 'newsletter_signup'  },
      { label: 'Tag added',           desc: 'Fires when a tag is applied to a contact'          },
      { label: 'Field updated',       desc: 'Fires when a contact field value changes'          },
    ],
    actions: NODE_SPECS.filter(s => ['update_contact', 'assign'].includes(s.type)),
  },
  {
    id: 'events', label: 'Events', icon: Calendar, color: 'bg-purple-500',
    triggers: [
      { label: 'Event registered', desc: 'Contact signs up for an event'   },
      { label: 'Event attended',   desc: 'Contact attends an event'        },
      { label: 'Event no-show',    desc: 'Contact misses a registered event' },
    ],
    actions: [],
  },
  {
    id: 'conversations', label: 'Conversations/AI', icon: Bot, color: 'bg-violet-500',
    triggers: [
      { label: 'Message received',       desc: 'Any inbound message from a contact'       },
      { label: 'AI intent detected',     desc: 'Sage AI classifies a contact message'     },
      { label: 'Unhandled conversation', desc: 'AI cannot resolve — needs human review'   },
    ],
    actions: NODE_SPECS.filter(s => s.type === 'handoff'),
  },
  {
    id: 'appointments', label: 'Appointments', icon: Calendar, color: 'bg-teal-500',
    triggers: [
      { label: 'Appointment booked',    desc: 'Contact books a meeting slot'              },
      { label: 'Appointment reminder',  desc: 'N hours before a scheduled meeting'       },
      { label: 'Appointment cancelled', desc: 'Contact or rep cancels a booking'         },
      { label: 'No-show',               desc: 'Contact misses a confirmed appointment'   },
    ],
    actions: [],
  },
  {
    id: 'deals', label: 'Deals / Pipelines', icon: Briefcase, color: 'bg-teal-600',
    triggers: [
      { label: 'Deal stage changed', desc: 'Deal moves to a different pipeline stage', type: 'deal_stage_change' },
      { label: 'Deal created',       desc: 'A new deal enters the pipeline'            },
      { label: 'Deal won',           desc: 'Deal is marked as won'                     },
      { label: 'Deal lost',          desc: 'Deal is marked as lost'                    },
    ],
    actions: NODE_SPECS.filter(s => s.type === 'create_deal'),
  },
  {
    id: 'payments', label: 'Payments', icon: CreditCard, color: 'bg-green-600',
    triggers: [
      { label: 'Payment received',       desc: 'A payment is successfully processed'  },
      { label: 'Payment failed',         desc: 'A payment attempt fails'              },
      { label: 'Subscription started',   desc: 'Contact starts a recurring plan'      },
      { label: 'Subscription cancelled', desc: 'Contact cancels a subscription'       },
    ],
    actions: [],
  },
  {
    id: 'ecommerce', label: 'Ecommerce', icon: ShoppingBag, color: 'bg-orange-500',
    triggers: [
      { label: 'Order placed / Purchase completed', desc: 'Contact completes a purchase',                     type: 'purchase_completed'  },
      { label: 'Cart abandoned',                    desc: 'Contact leaves items in cart without purchasing',  type: 'cart_abandoned'      },
      { label: 'Checkout abandoned',                desc: 'Contact starts checkout but does not pay',        type: 'checkout_abandoned'  },
      { label: 'Wheel of fortune submitted',        desc: 'Contact spins the wheel and submits their email', type: 'wheel_submitted'     },
      { label: 'Refund requested',                  desc: 'Contact requests a refund'                                                    },
    ],
    actions: [],
  },
  {
    id: 'marketing', label: 'Marketing', icon: Megaphone, color: 'bg-pink-500',
    triggers: [
      { label: 'Email opened',      desc: 'Contact opens a campaign email'          },
      { label: 'Link clicked',      desc: 'Contact clicks a tracked link'           },
      { label: 'Form submitted',    desc: 'Contact fills out a marketing form',     type: 'form_submit' },
      { label: 'Sequence enrolled', desc: 'Contact is added to a sequence'          },
    ],
    actions: NODE_SPECS.filter(s => s.type === 'send_email'),
  },
  {
    id: 'calls', label: 'Calls / IVR', icon: Phone, color: 'bg-emerald-500',
    triggers: [
      { label: 'Inbound call',    desc: 'Contact calls in to the number'          },
      { label: 'Call answered',   desc: 'Call is picked up by a rep'              },
      { label: 'Voicemail left',  desc: 'Call ends with a voicemail'              },
      { label: 'Call completed',  desc: 'A call session finishes'                 },
    ],
    actions: NODE_SPECS.filter(s => s.type === 'call'),
  },
  {
    id: 'communication', label: 'Communication', icon: MessageSquare, color: 'bg-blue-500',
    triggers: [
      { label: 'Inbound email received', desc: 'Contact replies to or sends an email', type: 'inbound_email' },
      { label: 'Inbound SMS received',   desc: 'Contact sends an SMS',                 type: 'inbound_sms'   },
    ],
    actions: NODE_SPECS.filter(s => ['send_email', 'send_sms'].includes(s.type)),
  },
  {
    id: 'forms', label: 'Forms', icon: FileText, color: 'bg-amber-500',
    triggers: [
      { label: 'Form submitted', desc: 'Contact completes a form',     type: 'form_submit' },
      { label: 'Form viewed',    desc: 'Contact opens a form page'     },
      { label: 'Field filled',   desc: 'A specific field is completed' },
    ],
    actions: NODE_SPECS.filter(s => s.type === 'webhook'),
  },
  {
    id: 'tickets', label: 'Tickets', icon: Tag, color: 'bg-orange-500',
    triggers: [
      { label: 'Ticket created',  desc: 'A new support ticket is opened',   type: 'ticket_created'  },
      { label: 'Ticket resolved', desc: 'A ticket is marked resolved',      type: 'ticket_resolved' },
      { label: 'Ticket replied',  desc: 'A reply is added to a ticket'                              },
    ],
    actions: NODE_SPECS.filter(s => s.type === 'create_ticket'),
  },
  {
    id: 'projects', label: 'Projects', icon: FolderOpen, color: 'bg-cyan-500',
    triggers: [
      { label: 'Project created',  desc: 'A new project is created'         },
      { label: 'Task completed',   desc: 'A task is marked as done'         },
      { label: 'Milestone reached', desc: 'A project milestone is achieved' },
    ],
    actions: NODE_SPECS.filter(s => s.type === 'create_task'),
  },
  {
    id: 'internal', label: 'Internal', icon: Bell, color: 'bg-rose-500',
    triggers: [
      { label: 'Manual start', desc: 'Manually start this automation for a contact', type: 'manual' },
      { label: 'Internal note', desc: 'A note is added to a contact'                               },
    ],
    actions: NODE_SPECS.filter(s => ['notify_internal', 'assign'].includes(s.type)),
  },
  {
    id: 'reviews', label: 'Reviews', icon: Star, color: 'bg-yellow-500',
    triggers: [
      { label: 'Review received', desc: 'Contact submits a review'          },
      { label: 'Review replied',  desc: 'A response is posted to a review'  },
      { label: 'NPS submitted',   desc: 'Contact submits an NPS score'      },
    ],
    actions: [],
  },
  {
    id: 'courses', label: 'Courses', icon: BookOpen, color: 'bg-indigo-500',
    triggers: [
      { label: 'Course enrolled',    desc: 'Contact enrols in a course'        },
      { label: 'Lesson completed',   desc: 'Contact finishes a lesson'         },
      { label: 'Course completed',   desc: 'Contact finishes all lessons'      },
      { label: 'Quiz passed',        desc: 'Contact passes a quiz'             },
    ],
    actions: [],
  },
  {
    id: 'affiliates', label: 'Affiliates', icon: Link2, color: 'bg-lime-600',
    triggers: [
      { label: 'Referral created',  desc: 'An affiliate referral is tracked'  },
      { label: 'Commission earned', desc: 'A commission becomes payable'       },
    ],
    actions: [],
  },
  {
    id: 'communities', label: 'Communities', icon: Users, color: 'bg-violet-500',
    triggers: [
      { label: 'Member joined',  desc: 'Contact joins a community'            },
      { label: 'Post created',   desc: 'Contact publishes a post'             },
      { label: 'Comment added',  desc: 'Contact replies to a community post'  },
    ],
    actions: [],
  },
  {
    id: 'system', label: 'System', icon: Webhook, color: 'bg-gray-500',
    triggers: [
      { label: 'Scheduled',  desc: 'Runs on a date/time or cron schedule'    },
    ],
    actions: NODE_SPECS.filter(s => ['wait', 'condition', 'webhook', 'end'].includes(s.type)),
  },
]

// Context-aware default category based on the preceding node type
function getContextCategory(nodeType?: string): string {
  if (!nodeType) return 'all'
  const map: Record<string, string> = {
    send_email:      'communication',
    send_sms:        'communication',
    call:            'calls',
    create_deal:     'deals',
    update_contact:  'contact',
    assign:          'internal',
    create_ticket:   'tickets',
    create_task:     'projects',
    notify_internal: 'internal',
    handoff:         'internal',
    webhook:         'system',
    wait:            'system',
    condition:       'all',
    trigger:         'all',
  }
  return map[nodeType] ?? 'all'
}

// Module-level recent picks (persists across picker opens within the session)
const recentPicks: AutomationStepType[] = []

const SPEC_BY_TYPE = new Map(NODE_SPECS.map(s => [s.type, s]))

const TYPE_LABEL: Record<string, string> = {
  warm_introduction:  'Warm Intro',
  qualification:      'Qualification',
  reengagement:       'Re-engagement',
  meeting_conversion: 'Meeting',
  nurture:            'Nurturing',
  custom:             'Custom',
}

const TRIGGER_TYPES: { value: AutomationTriggerType; label: string }[] = [
  { value: 'manual',             label: 'Manual'           },
  { value: 'prospect_converted', label: 'Prospect conv.'   },
  { value: 'form_submit',        label: 'Form submitted'   },
  { value: 'inbound_email',      label: 'Inbound email'    },
  { value: 'inbound_sms',        label: 'Inbound SMS'      },
  { value: 'deal_stage_change',  label: 'Deal stage'       },
]

const AUTOMATION_TYPES: { value: AutomationType; label: string }[] = [
  { value: 'warm_introduction',  label: 'Warm Intro'   },
  { value: 'qualification',      label: 'Qualify'      },
  { value: 'reengagement',       label: 'Re-engage'    },
  { value: 'meeting_conversion', label: 'Meetings'     },
  { value: 'nurture',            label: 'Nurture'      },
  { value: 'custom',             label: 'Custom'       },
]

const AUTOMATION_TYPES_FULL: { value: AutomationType; label: string }[] = [
  { value: 'warm_introduction',  label: 'Warm Introduction'  },
  { value: 'qualification',      label: 'Qualification'      },
  { value: 'reengagement',       label: 'Re-engagement'      },
  { value: 'meeting_conversion', label: 'Meeting Conversion' },
  { value: 'nurture',            label: 'Lead Nurturing'     },
  { value: 'custom',             label: 'Custom'             },
]

const TRIGGER_TYPES_FULL: { value: AutomationTriggerType; label: string }[] = [
  { value: 'manual',             label: 'Manual trigger'         },
  { value: 'prospect_converted', label: 'Prospect converted'     },
  { value: 'form_submit',        label: 'Form submitted'         },
  { value: 'inbound_email',      label: 'Inbound email received' },
  { value: 'inbound_sms',        label: 'Inbound SMS received'   },
  { value: 'deal_stage_change',  label: 'Deal stage changed'     },
]

const CHANNELS: { value: AutomationTemplateChannel; label: string }[] = [
  { value: 'email', label: 'Email'         },
  { value: 'sms',   label: 'SMS'           },
  { value: 'call',  label: 'Call'          },
  { value: 'multi', label: 'Multi-channel' },
]

// ── Layout constants ───────────────────────────────────────────────────────────

const NODE_W    = 150   // 25% narrower than 200
const TRIGGER_W = 150   // same as action cards
const NODE_H    = 68    // 25% taller than previous 56
const COND_H    = 94    // 25% taller than previous 76
const V_GAP     = 52
const H_GAP     = 320

// ── Auto-layout ────────────────────────────────────────────────────────────────

function computeAutoLayout(graph: BuilderGraph): Record<string, { x: number; y: number }> {
  const byId     = new Map(graph.nodes.map(n => [n.id, n]))
  const nextsAll = new Map<string, string[]>()
  const yeses    = new Map<string, string>()
  const nos      = new Map<string, string>()

  for (const e of graph.edges) {
    if (e.branch === 'yes')     yeses.set(e.from, e.to)
    else if (e.branch === 'no') nos.set(e.from, e.to)
    else nextsAll.set(e.from, [...(nextsAll.get(e.from) ?? []), e.to])
  }

  const pos: Record<string, { x: number; y: number }> = {}
  const visited = new Set<string>()

  function place(id: string, x: number, y: number) {
    if (visited.has(id) || !byId.has(id)) return
    visited.add(id)
    const w = byId.get(id)!.type === 'trigger' ? TRIGGER_W : NODE_W
    pos[id] = { x: x - w / 2, y }
    const node  = byId.get(id)!
    const h     = node.type === 'condition' ? COND_H : NODE_H
    const nexts = nextsAll.get(id) ?? []
    if (node.type === 'condition') {
      const yesId = yeses.get(id) ?? nexts[0]
      const noId  = nos.get(id)
      if (yesId) place(yesId, x - H_GAP / 2, y + h + V_GAP)
      if (noId)  place(noId,  x + H_GAP / 2, y + h + V_GAP)
    } else if (nexts.length === 1) {
      place(nexts[0], x, y + h + V_GAP)
    } else if (nexts.length > 1) {
      nexts.forEach((nid, i) => {
        const offset = (i - (nexts.length - 1) / 2) * H_GAP
        place(nid, x + offset, y + h + V_GAP)
      })
    }
  }

  const entryId = graph.entryNodeId ?? graph.nodes[0]?.id
  if (entryId) place(entryId, 0, 0)

  let orphanY = 0
  for (const n of graph.nodes) {
    if (!visited.has(n.id)) {
      pos[n.id] = { x: H_GAP, y: orphanY }
      orphanY += NODE_H + V_GAP
    }
  }
  return pos
}

// ── BuilderGraph ↔ React Flow converters ──────────────────────────────────────

// Template-level metadata shown on trigger card
type TriggerMeta = {
  goalLabel:    string
  triggerLabel: string
  channelLabel: string
}

type FlowNodeData = {
  bnode:      BuilderNode
  selected:   boolean
  onSelect:   (id: string) => void
  onAddAfter: (id: string) => void
  onDelete:   (id: string) => void
  canBranch:  boolean
  meta?:      TriggerMeta   // only passed to trigger nodes
}

type FlowEdgeData = {
  branch?:    'yes' | 'no'
  fromId:     string
  onAddAfter: (id: string) => void
}

function graphToRFNodes(
  graph:      BuilderGraph,
  selectedId: string | null,
  onSelect:   (id: string) => void,
  onAddAfter: (id: string) => void,
  onDelete:   (id: string) => void,
  meta?:      TriggerMeta,
): Node[] {
  const autoLayout = computeAutoLayout(graph)
  return graph.nodes.map(n => ({
    id:       n.id,
    type:     n.type === 'trigger' ? 'triggerNode' : 'automationNode',
    position: n.position ?? autoLayout[n.id] ?? { x: 0, y: 0 },
    width:    n.type === 'trigger' ? TRIGGER_W : NODE_W,
    data:     {
      bnode:     n,
      selected:  n.id === selectedId,
      onSelect,
      onAddAfter,
      onDelete,
      canBranch: n.type !== 'end',
      ...(n.type === 'trigger' ? { meta } : {}),
    } satisfies FlowNodeData,
  }))
}

function graphToRFEdges(graph: BuilderGraph, onAddAfter: (id: string) => void): Edge[] {
  return graph.edges.map(e => ({
    id:           `${e.from}→${e.to}`,
    source:       e.from,
    target:       e.to,
    sourceHandle: e.branch === 'yes' ? 'yes' : e.branch === 'no' ? 'no' : 'default',
    targetHandle: 'target',
    type:         'buttonEdge',
    animated:     false,
    data:         {
      branch:     e.branch,
      fromId:     e.from,
      onAddAfter,
    } satisfies FlowEdgeData,
  }))
}

// ── Custom node: trigger (30% smaller, shows goal/trigger/channel chips) ───────

const TriggerNodeComponent = memo(function TriggerNodeComponent({ data }: NodeProps) {
  const { bnode, selected, onSelect, onAddAfter, onDelete, canBranch } = data as FlowNodeData
  return (
    <div style={{ position: 'relative' }} className="group/card">
      <div
        onClick={e => { e.stopPropagation(); onSelect(bnode.id) }}
        className={cn(
          'relative w-[150px] rounded-xl border-2 cursor-pointer transition-all bg-blue-600 shadow-lg',
          selected
            ? 'border-white/80 shadow-[0_0_0_3px_rgba(255,255,255,0.2)]'
            : 'border-blue-400/50 hover:border-white/60',
        )}
      >
        {/* Delete bin — always visible */}
        <button
          onClick={e => { e.stopPropagation(); onDelete(bnode.id) }}
          title="Remove"
          className="nodrag nopan absolute bottom-1 right-1 p-0.5 rounded text-white/50 hover:text-white hover:bg-white/20 transition-all z-10"
        >
          <Trash2 className="w-2.5 h-2.5" />
        </button>

        <div className="flex items-center gap-1.5 px-2.5 py-2.5">
          <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <Zap className="w-2.5 h-2.5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[7px] font-semibold uppercase tracking-widest text-white/60 leading-none mb-0.5">Trigger</p>
            <p className="text-[10px] font-semibold text-white leading-tight truncate">{bnode.label}</p>
          </div>
        </div>

        <Handle
          type="source"
          position={Position.Bottom}
          id="default"
          className="!w-2 !h-2 !bg-white/60 !border-2 !border-blue-600"
        />
      </div>

      {canBranch && (
        <div
          className="absolute left-1/2 -translate-x-1/2 nodrag nopan z-10"
          style={{ top: 'calc(100% + 8px)' }}
          onClick={e => { e.stopPropagation(); onAddAfter(bnode.id) }}
        >
          <button className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-md border-2 border-white dark:border-[#111] transition-colors">
            <Plus className="w-2.5 h-2.5" />
          </button>
        </div>
      )}
    </div>
  )
})

// ── Implicit channel badge for action nodes ────────────────────────────────────

function getChannelBadge(type: string): { label: string; color: string } | null {
  const map: Record<string, { label: string; color: string }> = {
    send_email: { label: 'Email',  color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'    },
    send_sms:   { label: 'SMS',    color: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300' },
    call:       { label: 'Call',   color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
  }
  return map[type] ?? null
}

// ── Custom node: automation step ───────────────────────────────────────────────

const AutomationNodeComponent = memo(function AutomationNodeComponent({ data }: NodeProps) {
  const { bnode, selected, onSelect, onAddAfter, onDelete, canBranch } = data as FlowNodeData
  const spec         = SPEC_BY_TYPE.get(bnode.type)
  const Icon         = spec?.icon ?? Zap
  const isCondition  = bnode.type === 'condition'
  const channelBadge = getChannelBadge(bnode.type)

  return (
    <div style={{ position: 'relative' }} className="group/card">
      <div
        onClick={e => { e.stopPropagation(); onSelect(bnode.id) }}
        className={cn(
          'relative w-[150px] rounded-xl border-2 cursor-pointer transition-all bg-white dark:bg-[#1e1e1e] shadow-sm',
          selected
            ? 'border-[#141c2b] shadow-[0_0_0_3px_rgba(20,28,43,0.12)] dark:border-white dark:shadow-[0_0_0_3px_rgba(255,255,255,0.12)]'
            : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/25 hover:shadow-md',
        )}
      >
        <Handle
          type="target"
          position={Position.Top}
          id="target"
          className="!w-2 !h-2 !bg-gray-300 dark:!bg-gray-600 !border-2 !border-white dark:!border-[#1e1e1e]"
        />

        {/* Delete bin — always visible */}
        <button
          onClick={e => { e.stopPropagation(); onDelete(bnode.id) }}
          title="Delete step"
          className="nodrag nopan absolute bottom-1 right-1 p-0.5 rounded text-gray-300 dark:text-gray-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all z-10"
        >
          <Trash2 className="w-2.5 h-2.5" />
        </button>

        <div className="flex items-center gap-1.5 px-2.5 py-2.5">
          <div className={cn('w-5 h-5 rounded-lg flex items-center justify-center shrink-0', spec?.bgColor ?? 'bg-gray-400')}>
            <Icon className="w-2.5 h-2.5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 mb-0.5">
              <p className="text-[7px] font-semibold uppercase tracking-wide text-gray-400 truncate flex-1">{spec?.label ?? bnode.type}</p>
              {channelBadge && (
                <span className={cn('text-[7px] font-semibold px-1 py-px rounded-full shrink-0', channelBadge.color)}>
                  {channelBadge.label}
                </span>
              )}
            </div>
            <p className="text-[10px] font-semibold text-gray-900 dark:text-gray-100 leading-tight truncate">{bnode.label}</p>
          </div>
        </div>

        {isCondition ? (
          <>
            <div className="flex border-t border-gray-100 dark:border-white/8">
              <div className="flex-1 flex items-center justify-center gap-1 py-1 border-r border-gray-100 dark:border-white/8">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400">Yes</span>
              </div>
              <div className="flex-1 flex items-center justify-center gap-1 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
                <span className="text-[9px] font-medium text-gray-400">No</span>
              </div>
            </div>
            <Handle type="source" position={Position.Bottom} id="yes"
              style={{ left: '27%' }}
              className="!w-2 !h-2 !bg-emerald-400 !border-2 !border-white dark:!border-[#1e1e1e]"
            />
            <Handle type="source" position={Position.Bottom} id="no"
              style={{ left: '73%' }}
              className="!w-2 !h-2 !bg-gray-400 !border-2 !border-white dark:!border-[#1e1e1e]"
            />
          </>
        ) : (
          <Handle
            type="source"
            position={Position.Bottom}
            id="default"
            className="!w-2 !h-2 !bg-gray-300 dark:!bg-gray-600 !border-2 !border-white dark:!border-[#1e1e1e]"
          />
        )}
      </div>

      {canBranch && (
        <div
          className="absolute left-1/2 -translate-x-1/2 nodrag nopan z-10"
          style={{ top: 'calc(100% + 8px)' }}
          onClick={e => { e.stopPropagation(); onAddAfter(bnode.id) }}
        >
          <button className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-md border-2 border-white dark:border-[#111] transition-colors">
            <Plus className="w-2.5 h-2.5" />
          </button>
        </div>
      )}
    </div>
  )
})

// ── Custom edge ────────────────────────────────────────────────────────────────

const ButtonEdgeComponent = memo(function ButtonEdgeComponent({
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  data,
}: EdgeProps) {
  const { branch, fromId, onAddAfter } = (data ?? {}) as Partial<FlowEdgeData>
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  })
  const isYes = branch === 'yes'
  const isNo  = branch === 'no'

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{ stroke: isYes ? '#10b981' : isNo ? '#9ca3af' : '#94a3b8', strokeWidth: 2 }}
      />
      <EdgeLabelRenderer>
        {branch && (
          <div
            style={{
              transform: `translate(-50%, -50%) translate(${
                sourceX + (targetX - sourceX) * 0.15
              }px, ${sourceY + (targetY - sourceY) * 0.15}px)`,
            }}
            className="absolute nodrag nopan pointer-events-none"
          >
            <span className={cn(
              'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
              isYes
                ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                : 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400',
            )}>
              {isYes ? 'Yes' : 'No'}
            </span>
          </div>
        )}
        {fromId && onAddAfter && (
          <div
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
            className="absolute nodrag nopan"
          >
            <button
              onClick={() => onAddAfter(fromId)}
              className="flex items-center justify-center w-6 h-6 rounded-full bg-white dark:bg-[#2a2a2a] border-2 border-gray-300 dark:border-white/20 text-gray-400 hover:border-[#141c2b] hover:text-[#141c2b] dark:hover:border-white/50 dark:hover:text-white shadow-sm transition-all opacity-0 hover:opacity-100 focus:opacity-100 [.react-flow__edge:hover_&]:opacity-100"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  )
})

// Stable module-scope node/edge type maps
const nodeTypes = {
  triggerNode:    TriggerNodeComponent,
  automationNode: AutomationNodeComponent,
}
const edgeTypes = {
  buttonEdge: ButtonEdgeComponent,
}

// ── Config panel ───────────────────────────────────────────────────────────────

function ConfigPanel({
  node, onUpdate, onDelete, onClose,
  // Template-level — only used when node.type === 'trigger'
  automationType, onAutomationTypeChange,
  triggerType,    onTriggerTypeChange,
  channel,        onChannelChange,
}: {
  node:                   BuilderNode
  onUpdate:               (id: string, patch: Partial<BuilderNode>) => void
  onDelete:               (id: string) => void
  onClose:                () => void
  automationType:         AutomationType
  onAutomationTypeChange: (v: AutomationType) => void
  triggerType:            AutomationTriggerType
  onTriggerTypeChange:    (v: AutomationTriggerType) => void
  channel:                AutomationTemplateChannel
  onChannelChange:        (v: AutomationTemplateChannel) => void
}) {
  const spec = node.type === 'trigger'
    ? { label: 'Trigger', icon: Zap, bgColor: 'bg-blue-600', desc: 'Configure what starts this automation' }
    : (SPEC_BY_TYPE.get(node.type) ?? NODE_SPECS[0])
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

        {/* TRIGGER NODE — shows Goal, Trigger Type, Channel instead of label */}
        {node.type === 'trigger' && (
          <>
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Goal</label>
              <select
                value={automationType}
                onChange={e => onAutomationTypeChange(e.target.value as AutomationType)}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#141c2b]/20"
              >
                {AUTOMATION_TYPES_FULL.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Trigger type</label>
              <select
                value={triggerType}
                onChange={e => onTriggerTypeChange(e.target.value as AutomationTriggerType)}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#141c2b]/20"
              >
                {TRIGGER_TYPES_FULL.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Primary channel</label>
              <select
                value={channel}
                onChange={e => onChannelChange(e.target.value as AutomationTemplateChannel)}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#141c2b]/20"
              >
                {CHANNELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </>
        )}

        {/* REGULAR NODES */}
        {node.type !== 'trigger' && (
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Label</label>
            <input
              value={node.label}
              onChange={e => onUpdate(node.id, { label: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#141c2b]/20 dark:focus:ring-white/20"
            />
          </div>
        )}

        {node.type === 'send_email' && (
          <>
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Subject template</label>
              <input
                value={(node.config.subject_template as string) ?? ''}
                onChange={e => set('subject_template', e.target.value)}
                placeholder="e.g. Quick intro from {{sender_first_name}}"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#141c2b]/20"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Tone / goal hint</label>
              <textarea
                value={(node.config.goal_hint as string) ?? ''}
                onChange={e => set('goal_hint', e.target.value)}
                rows={3}
                placeholder="e.g. Introduce the product and invite a short call"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#141c2b]/20 resize-none"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!(node.config.approval_required)}
                onChange={e => set('approval_required', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Require approval before sending</span>
            </label>
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
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#141c2b]/20 resize-none"
            />
          </div>
        )}

        {node.type === 'wait' && (
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Delay (hours)</label>
            <input
              type="number" min={1}
              value={node.delay_hours ?? 24}
              onChange={e => onUpdate(node.id, { delay_hours: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#141c2b]/20"
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
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#141c2b]/20"
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
                Yes path goes left, No path goes right. Use the + button below this node to add steps.
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

        <div className="rounded-xl border border-gray-100 dark:border-white/8 bg-gray-50 dark:bg-white/3 p-3">
          <p className="text-[11px] font-semibold text-gray-400 mb-1">Available variables</p>
          <p className="text-[11px] text-gray-400 leading-relaxed font-mono">
            {'{{contact_first_name}} {{contact_last_name}} {{contact_email}} {{sender_first_name}} {{company_name}}'}
          </p>
        </div>
      </div>

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

// ── Node picker — premium categorised taxonomy ─────────────────────────────────

type SelectableTrigger = TriggerRef & {
  type:     AutomationTriggerType   // guaranteed present (filtered)
  catId:    string
  catLabel: string
  catColor: string
  catIcon:  React.ElementType
}

function getActionBadge(type: string): { label: string; color: string } {
  if (type === 'wait')      return { label: 'Delay',     color: 'text-amber-700 bg-amber-50 dark:bg-amber-500/15 dark:text-amber-400'   }
  if (type === 'condition') return { label: 'Condition', color: 'text-indigo-700 bg-indigo-50 dark:bg-indigo-500/15 dark:text-indigo-400' }
  if (type === 'end')       return { label: 'End',       color: 'text-gray-600 bg-gray-100 dark:bg-white/8 dark:text-gray-400'           }
  return                           { label: 'Action',    color: 'text-blue-700 bg-blue-50 dark:bg-blue-500/15 dark:text-blue-400'        }
}

function NodePicker({ onPick, onPickTrigger, onClose, contextNodeType }: {
  onPick:          (type: AutomationStepType) => void
  onPickTrigger:   (type: AutomationTriggerType) => void
  onClose:         () => void
  contextNodeType?: string
}) {
  const isAtStart = contextNodeType === 'trigger'
  const [q, setQ]                     = useState('')
  const [activeCatId, setActiveCatId] = useState<string>(
    () => isAtStart ? 'all' : getContextCategory(contextNodeType)
  )
  const [activeTab, setActiveTab]     = useState<'actions' | 'triggers'>('actions')

  // All selectable (typed) triggers across all categories
  const allSelectableTriggers: SelectableTrigger[] = useMemo(
    () => TAXONOMY.flatMap(cat =>
      cat.triggers
        .filter((t): t is TriggerRef & { type: AutomationTriggerType } => !!t.type)
        .map(t => ({ ...t, catId: cat.id, catLabel: cat.label, catColor: cat.color, catIcon: cat.icon }))
    ),
    []
  )

  // Trigger count per category (selectable only)
  const triggerCountByCat = useMemo(
    () => Object.fromEntries(TAXONOMY.map(cat => [cat.id, cat.triggers.filter(t => t.type).length])),
    []
  )

  // Search
  const qLow = q.toLowerCase()
  const searchActionResults: (NodeSpec & { catLabel: string })[] = q
    ? TAXONOMY.flatMap(cat =>
        cat.actions
          .filter(s =>
            s.label.toLowerCase().includes(qLow) ||
            s.desc.toLowerCase().includes(qLow)  ||
            cat.label.toLowerCase().includes(qLow)
          )
          .map(s => ({ ...s, catLabel: cat.label }))
      )
    : []
  const searchTriggerResults: SelectableTrigger[] = q
    ? allSelectableTriggers.filter(t =>
        t.label.toLowerCase().includes(qLow) ||
        t.desc.toLowerCase().includes(qLow)  ||
        t.catLabel.toLowerCase().includes(qLow)
      )
    : []

  const activeCat  = TAXONOMY.find(c => c.id === activeCatId)
  const recentSpecs: NodeSpec[] = recentPicks
    .map(t => NODE_SPECS.find(s => s.type === t))
    .filter(Boolean) as NodeSpec[]

  function pick(type: AutomationStepType) {
    const idx = recentPicks.indexOf(type)
    if (idx > -1) recentPicks.splice(idx, 1)
    recentPicks.unshift(type)
    if (recentPicks.length > 6) recentPicks.length = 6
    onPick(type)
  }

  function navTo(catId: string) { setActiveCatId(catId); setQ('') }

  const allActionCount   = NODE_SPECS.filter(s => s.type !== 'trigger').length
  const allTriggerCount  = allSelectableTriggers.length

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#1e1e1e] w-[900px] rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '88vh' }}
        onClick={e => e.stopPropagation()}
      >

        {/* ── Search bar ── */}
        <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-white/8">
          <div className="flex-1 relative">
            <input
              autoFocus
              value={q}
              onChange={e => { setQ(e.target.value) }}
              placeholder="Search actions and triggers…"
              className="w-full pl-3 pr-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#141c2b]/20 dark:focus:ring-white/15"
            />
          </div>
          <button
            onClick={onClose}
            className="p-1.5 shrink-0 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* Left sidebar */}
          <div className="w-[160px] shrink-0 border-r border-gray-100 dark:border-white/8 overflow-y-auto py-2 space-y-px">

            {/* All */}
            <PickerSidebarBtn
              active={activeCatId === 'all' && !q}
              icon={Layers}
              label="All"
              count={activeTab === 'actions' ? allActionCount : allTriggerCount}
              color="bg-[#141c2b]"
              onClick={() => navTo('all')}
            />

            {/* Recent */}
            {recentSpecs.length > 0 && activeTab === 'actions' && (
              <PickerSidebarBtn
                active={activeCatId === 'recent' && !q}
                icon={Clock}
                label="Recent"
                count={recentSpecs.length}
                color="bg-amber-400"
                onClick={() => navTo('recent')}
              />
            )}

            <div className="mx-3 my-1.5 border-t border-gray-100 dark:border-white/8" />

            {TAXONOMY.map(cat => {
              const count   = activeTab === 'actions' ? cat.actions.length : (triggerCountByCat[cat.id] ?? 0)
              const isEmpty = count === 0
              return (
                <button
                  key={cat.id}
                  onClick={() => { if (!isEmpty) navTo(cat.id) }}
                  disabled={isEmpty}
                  title={isEmpty ? `No ${activeTab} in ${cat.label} yet` : undefined}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors',
                    isEmpty
                      ? 'opacity-35 cursor-not-allowed text-gray-500'
                      : activeCatId === cat.id && !q
                        ? 'bg-gray-100 dark:bg-white/8 text-gray-900 dark:text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-800 dark:hover:text-gray-200',
                  )}
                >
                  <div className={cn('w-5 h-5 rounded-md flex items-center justify-center shrink-0', cat.color)}>
                    <cat.icon className="w-2.5 h-2.5 text-white" />
                  </div>
                  <span className="text-[11px] font-medium flex-1 truncate">{cat.label}</span>
                  {count > 0 && (
                    <span className="text-[9px] font-semibold text-gray-400 dark:text-gray-500 shrink-0">{count}</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Right content */}
          <div className="flex-1 flex flex-col min-h-0">

            {/* Actions / Triggers tabs — hidden when searching */}
            {!q && (
              <div className="shrink-0 flex items-center gap-1 px-4 pt-3 pb-2 border-b border-gray-50 dark:border-white/5">
                <button
                  onClick={() => setActiveTab('actions')}
                  className={cn(
                    'px-3 py-1 rounded-lg text-[12px] font-semibold transition-colors',
                    activeTab === 'actions'
                      ? 'bg-[#141c2b] text-white dark:bg-white dark:text-[#141c2b]'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/8 hover:text-gray-700 dark:hover:text-gray-200',
                  )}
                >
                  Actions
                </button>
                <button
                  onClick={() => setActiveTab('triggers')}
                  className={cn(
                    'px-3 py-1 rounded-lg text-[12px] font-semibold transition-colors',
                    activeTab === 'triggers'
                      ? 'bg-[#141c2b] text-white dark:bg-white dark:text-[#141c2b]'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/8 hover:text-gray-700 dark:hover:text-gray-200',
                  )}
                >
                  Triggers
                </button>
                {isAtStart && activeTab === 'triggers' && (
                  <span className="ml-2 text-[10px] text-violet-500 dark:text-violet-400 font-medium">
                    Select what starts this automation
                  </span>
                )}
              </div>
            )}

            {/* Scrollable grid */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3">

              {/* ── Search mode ── */}
              {q && (
                <div className="space-y-4">
                  {searchActionResults.length === 0 && searchTriggerResults.length === 0 ? (
                    <div className="h-48 flex flex-col items-center justify-center gap-2 text-gray-400">
                      <p className="text-sm font-medium">No results for "{q}"</p>
                      <p className="text-xs">Try a different keyword or browse categories on the left</p>
                    </div>
                  ) : (
                    <>
                      {searchActionResults.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Actions</p>
                          <div className="grid grid-cols-2 gap-2">
                            {searchActionResults.map(spec => (
                              <PickerActionCard key={spec.type} spec={spec} catLabel={spec.catLabel} onPick={pick} />
                            ))}
                          </div>
                        </div>
                      )}
                      {searchTriggerResults.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Triggers</p>
                          <div className="grid grid-cols-2 gap-2">
                            {searchTriggerResults.map(t => (
                              <PickerTriggerCard
                                key={`${t.catId}-${t.label}`}
                                trigger={t}
                                onPick={type => { onPickTrigger(type); onClose() }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ── Recent ── */}
              {!q && activeCatId === 'recent' && activeTab === 'actions' && (
                <div className="grid grid-cols-2 gap-2">
                  {recentSpecs.map(spec => (
                    <PickerActionCard key={spec.type} spec={spec} onPick={pick} />
                  ))}
                </div>
              )}

              {/* ── All categories (Actions tab) ── */}
              {!q && activeCatId === 'all' && activeTab === 'actions' && (
                <div className="space-y-5">
                  {TAXONOMY.filter(c => c.actions.length > 0).map(cat => (
                    <div key={cat.id}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className={cn('w-4 h-4 rounded-md flex items-center justify-center shrink-0', cat.color)}>
                          <cat.icon className="w-2 h-2 text-white" />
                        </div>
                        <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{cat.label}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {cat.actions.map(spec => (
                          <PickerActionCard key={spec.type} spec={spec} onPick={pick} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── All categories (Triggers tab) ── */}
              {!q && activeCatId === 'all' && activeTab === 'triggers' && (
                <div className="space-y-5">
                  {TAXONOMY.filter(c => c.triggers.some(t => t.type)).map(cat => (
                    <div key={cat.id}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className={cn('w-4 h-4 rounded-md flex items-center justify-center shrink-0', cat.color)}>
                          <cat.icon className="w-2 h-2 text-white" />
                        </div>
                        <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{cat.label}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {cat.triggers
                          .filter((t): t is TriggerRef & { type: AutomationTriggerType } => !!t.type)
                          .map(t => (
                            <PickerTriggerCard
                              key={`${cat.id}-${t.label}`}
                              trigger={{ ...t, catId: cat.id, catLabel: cat.label, catColor: cat.color, catIcon: cat.icon }}
                              onPick={type => { onPickTrigger(type); onClose() }}
                            />
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Single category ── */}
              {!q && activeCatId !== 'all' && activeCatId !== 'recent' && activeCat && (
                <div>
                  {activeTab === 'actions' ? (
                    activeCat.actions.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {activeCat.actions.map(spec => (
                          <PickerActionCard key={spec.type} spec={spec} onPick={pick} />
                        ))}
                      </div>
                    ) : (
                      <PickerComingSoon label={activeCat.label} icon={activeCat.icon} color={activeCat.color} thing="actions" />
                    )
                  ) : (
                    /* Triggers tab — single category */
                    <>
                      {activeCat.triggers.some(t => t.type) ? (
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          {activeCat.triggers
                            .filter((t): t is TriggerRef & { type: AutomationTriggerType } => !!t.type)
                            .map(t => (
                              <PickerTriggerCard
                                key={`${activeCat.id}-${t.label}`}
                                trigger={{ ...t, catId: activeCat.id, catLabel: activeCat.label, catColor: activeCat.color, catIcon: activeCat.icon }}
                                onPick={type => { onPickTrigger(type); onClose() }}
                              />
                            ))}
                        </div>
                      ) : (
                        <PickerComingSoon label={activeCat.label} icon={activeCat.icon} color={activeCat.color} thing="triggers" />
                      )}

                      {/* Coming-soon reference chips */}
                      {activeCat.triggers.filter(t => !t.type).length > 0 && (
                        <div className="mt-3">
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Planned</p>
                          <div className="flex flex-wrap gap-1.5">
                            {activeCat.triggers.filter(t => !t.type).map(t => (
                              <span
                                key={t.label}
                                title={t.desc}
                                className="inline-flex text-[11px] font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-white/8 px-2.5 py-1 rounded-full cursor-default"
                              >
                                {t.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── NodePicker sub-components ─────────────────────────────────────────────────

function PickerSidebarBtn({
  active, icon: Icon, label, count, color, onClick,
}: {
  active:  boolean
  icon:    React.ElementType
  label:   string
  count:   number
  color:   string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors',
        active
          ? 'bg-gray-100 dark:bg-white/8 text-gray-900 dark:text-white'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-800 dark:hover:text-gray-200',
      )}
    >
      <div className={cn('w-5 h-5 rounded-md flex items-center justify-center shrink-0', color)}>
        <Icon className="w-2.5 h-2.5 text-white" />
      </div>
      <span className="text-[11px] font-medium flex-1 truncate">{label}</span>
      <span className="text-[9px] font-semibold text-gray-400 dark:text-gray-500 shrink-0">{count}</span>
    </button>
  )
}

function PickerActionCard({
  spec, catLabel, onPick,
}: {
  spec:      NodeSpec
  catLabel?: string
  onPick:    (type: AutomationStepType) => void
}) {
  const Icon  = spec.icon
  const badge = getActionBadge(spec.type)
  return (
    <button
      onClick={() => onPick(spec.type as AutomationStepType)}
      className="flex items-start gap-3 px-3.5 py-3 rounded-xl border border-gray-100 dark:border-white/8 hover:border-[#141c2b]/20 dark:hover:border-white/20 hover:bg-gray-50/80 dark:hover:bg-white/5 transition-all text-left group"
    >
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-transform group-hover:scale-105', spec.bgColor)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-200 leading-tight truncate">{spec.label}</p>
          <span className={cn('shrink-0 text-[9px] font-bold px-1.5 py-px rounded-full uppercase tracking-wide', badge.color)}>
            {badge.label}
          </span>
          {catLabel && (
            <span className="ml-auto text-[9px] font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-white/8 px-1.5 py-px rounded-full shrink-0">
              {catLabel}
            </span>
          )}
        </div>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-tight line-clamp-2">{spec.desc}</p>
      </div>
    </button>
  )
}

function PickerTriggerCard({
  trigger, onPick,
}: {
  trigger: SelectableTrigger
  onPick:  (type: AutomationTriggerType) => void
}) {
  const CatIcon = trigger.catIcon
  return (
    <button
      onClick={() => onPick(trigger.type)}
      className="flex items-start gap-3 px-3.5 py-3 rounded-xl border border-gray-100 dark:border-white/8 hover:border-violet-300 dark:hover:border-violet-400/30 hover:bg-violet-50/40 dark:hover:bg-violet-500/5 transition-all text-left group"
    >
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-transform group-hover:scale-105', trigger.catColor)}>
        <CatIcon className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-200 leading-tight truncate">{trigger.label}</p>
          <span className="shrink-0 text-[9px] font-bold px-1.5 py-px rounded-full uppercase tracking-wide text-violet-700 bg-violet-50 dark:bg-violet-500/15 dark:text-violet-400">
            Trigger
          </span>
        </div>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-tight line-clamp-2">{trigger.desc}</p>
      </div>
    </button>
  )
}

function PickerComingSoon({
  label, icon: Icon, color, thing,
}: {
  label: string; icon: React.ElementType; color: string; thing: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-2.5 text-gray-400">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center opacity-25', color)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-sm font-medium">Coming soon</p>
      <p className="text-xs text-center max-w-[180px]">
        {label} {thing} are on the roadmap
      </p>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeId() { return `node_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` }

function defaultGraph(): BuilderGraph {
  const triggerId = 'trigger_1'
  return {
    entryNodeId: triggerId,
    nodes: [{ id: triggerId, type: 'trigger', label: '+ Add trigger', config: {} }],
    edges: [],
  }
}

/** Convert a saved AutomationTemplate (steps[]) into a visual BuilderGraph. */
function stepsToGraph(template: AutomationTemplate): BuilderGraph {
  const triggerId = 'trigger_1'
  const nodes: BuilderNode[] = [
    { id: triggerId, type: 'trigger', label: template.name, config: {} },
  ]
  const edges: BuilderEdge[] = []

  for (const step of template.steps) {
    nodes.push({
      id:          step.id,
      type:        step.type as AutomationStepType,
      label:       step.label,
      config:      step.config ?? {},
      delay_hours: step.delay_hours,
    })
  }

  // Trigger → entry step
  if (template.entry_step_id) {
    edges.push({ from: triggerId, to: template.entry_step_id })
  }

  // Step → step edges
  for (const step of template.steps) {
    if (step.type === 'condition' && step.branch_yes_id && step.branch_no_id) {
      edges.push({ from: step.id, to: step.branch_yes_id, branch: 'yes' })
      edges.push({ from: step.id, to: step.branch_no_id,  branch: 'no'  })
    } else if (step.next_step_id) {
      edges.push({ from: step.id, to: step.next_step_id })
    }
  }

  return { nodes, edges, entryNodeId: triggerId }
}

// ── History reducer ────────────────────────────────────────────────────────────

type HistoryState = {
  past:    BuilderGraph[]
  present: BuilderGraph
  future:  BuilderGraph[]
}

type HistoryAction =
  | { type: 'COMMIT'; graph: BuilderGraph }
  | { type: 'UNDO' }
  | { type: 'REDO' }

function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case 'COMMIT':
      return { past: [...state.past.slice(-50), state.present], present: action.graph, future: [] }
    case 'UNDO':
      if (state.past.length === 0) return state
      return { past: state.past.slice(0, -1), present: state.past[state.past.length - 1], future: [state.present, ...state.future.slice(0, 49)] }
    case 'REDO':
      if (state.future.length === 0) return state
      return { past: [...state.past.slice(-50), state.present], present: state.future[0], future: state.future.slice(1) }
  }
}

// ── BuilderClient — provides ReactFlow context ─────────────────────────────────

export function BuilderClient({ template, systemTemplates }: {
  template:        AutomationTemplate | null
  systemTemplates: AutomationTemplate[]
}) {
  return (
    <ReactFlowProvider>
      <BuilderInner template={template} systemTemplates={systemTemplates} />
    </ReactFlowProvider>
  )
}

// ── BuilderInner — full builder with useReactFlow access ───────────────────────

function BuilderInner({ template, systemTemplates }: {
  template:        AutomationTemplate | null
  systemTemplates: AutomationTemplate[]
}) {
  const router               = useRouter()
  const { fitView, zoomIn, zoomOut, setViewport } = useReactFlow()
  const canvasContainerRef = useRef<HTMLDivElement>(null)

  // ── Metadata ──────────────────────────────────────────────────────────────
  const [name,           setName]           = useState(template?.name            ?? '')
  const [automationType, setAutomationType] = useState<AutomationType>(template?.automation_type ?? 'warm_introduction')
  const [triggerType,    setTriggerType]    = useState<AutomationTriggerType>(template?.trigger_type ?? 'manual')
  const [channel,        setChannel]        = useState<AutomationTemplateChannel>(template?.primary_channel ?? 'email')

  // ── UI state ──────────────────────────────────────────────────────────────
  const [selectedId,      setSelectedId]      = useState<string | null>(null)
  const [pickerAfter,     setPickerAfter]     = useState<string | null>(null)
  const [saving,          setSaving]          = useState(false)
  const [dirty,           setDirty]           = useState(false)
  const [tplDropdownOpen, setTplDropdownOpen] = useState(false)

  // ── Graph history ─────────────────────────────────────────────────────────
  const initialGraph = template?.config_json ?? defaultGraph()
  const [history, dispatch] = useReducer(historyReducer, {
    past: [], present: initialGraph, future: [],
  })
  const graph   = history.present
  const canUndo = history.past.length   > 0
  const canRedo = history.future.length > 0

  // ── Stable mutable refs ───────────────────────────────────────────────────
  const graphRef    = useRef(graph)
  graphRef.current  = graph
  const draggingRef = useRef(false)

  // Callback refs — stable fn wrappers so rfNodes lazy-init can reference them
  const onSelectImpl   = useRef((id: string) => setSelectedId(id))
  const onAddAfterImpl = useRef((id: string) => setPickerAfter(id))
  onSelectImpl.current   = (id: string) => setSelectedId(id)
  onAddAfterImpl.current = (id: string) => setPickerAfter(id)

  const handleSelect   = useCallback((id: string) => onSelectImpl.current(id),   [])
  const handleAddAfter = useCallback((id: string) => onAddAfterImpl.current(id), [])

  // Stable delete — delegates to deleteNode (defined later, kept fresh via ref)
  const onDeleteImpl = useRef((id: string) => { /* filled below */ void id })
  const handleDelete = useCallback((id: string) => onDeleteImpl.current(id), [])

  // ── Template meta chips (derived, stable via useCallback) ─────────────────
  const getMeta = useCallback((): TriggerMeta => ({
    goalLabel:    AUTOMATION_TYPES.find(t => t.value === automationType)?.label    ?? automationType,
    triggerLabel: TRIGGER_TYPES.find(t => t.value === triggerType)?.label          ?? triggerType,
    channelLabel: CHANNELS.find(c => c.value === channel)?.label                  ?? channel,
  }), [automationType, triggerType, channel])

  // ── RF visual node state (separate from graph for smooth drag) ────────────
  const initialMeta: TriggerMeta = {
    goalLabel:    AUTOMATION_TYPES.find(t => t.value === (template?.automation_type ?? 'warm_introduction'))?.label ?? 'Custom',
    triggerLabel: TRIGGER_TYPES.find(t => t.value === (template?.trigger_type ?? 'manual'))?.label ?? 'Manual',
    channelLabel: CHANNELS.find(c => c.value === (template?.primary_channel ?? 'email'))?.label ?? 'Email',
  }
  const [rfNodes, setRfNodes] = useState<Node[]>(() =>
    graphToRFNodes(initialGraph, null, handleSelect, handleAddAfter, handleDelete, initialMeta)
  )

  // ── Sync rfNodes from graph/selectedId/meta changes (skip during drag) ────
  useEffect(() => {
    if (!draggingRef.current) {
      setRfNodes(graphToRFNodes(graph, selectedId, handleSelect, handleAddAfter, handleDelete, getMeta()))
    }
  // handleSelect / handleAddAfter / handleDelete are stable (empty deps) — safe to omit
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph, selectedId, getMeta])

  // ── RF edges (always derived from graph) ──────────────────────────────────
  const rfEdges = useMemo(
    () => graphToRFEdges(graph, handleAddAfter),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [graph],
  )

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return
      switch (e.key.toLowerCase()) {
        case 'z':
          e.preventDefault()
          if (e.shiftKey) { dispatch({ type: 'REDO' }); setDirty(true) }
          else            { dispatch({ type: 'UNDO' }); setDirty(true) }
          break
        case 'y':
          e.preventDefault()
          dispatch({ type: 'REDO' }); setDirty(true)
          break
        case 'a':
          e.preventDefault()
          setRfNodes(nds => nds.map(n => ({ ...n, selected: true })))
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── Graph mutations ───────────────────────────────────────────────────────
  function commitGraph(newGraph: BuilderGraph) {
    dispatch({ type: 'COMMIT', graph: newGraph })
    setDirty(true)
  }

  function updateNode(id: string, patch: Partial<BuilderNode>) {
    const g = graphRef.current
    commitGraph({ ...g, nodes: g.nodes.map(n => n.id === id ? { ...n, ...patch } : n) })
  }

  function addNodeAfter(afterId: string, type: AutomationStepType) {
    const g      = graphRef.current
    const spec   = SPEC_BY_TYPE.get(type)
    const newId  = makeId()
    const srcRF  = rfNodes.find(n => n.id === afterId)
    const srcPos = srcRF?.position ?? (computeAutoLayout(g)[afterId] ?? { x: 0, y: 0 })
    const srcH   = g.nodes.find(n => n.id === afterId)?.type === 'condition' ? COND_H : NODE_H
    const newNode: BuilderNode = {
      id:          newId,
      type,
      label:       spec?.label ?? type,
      config:      {},
      delay_hours: type === 'wait' ? 48 : undefined,
      position:    { x: srcPos.x, y: srcPos.y + srcH + V_GAP },
    }
    commitGraph({ ...g, nodes: [...g.nodes, newNode], edges: [...g.edges, { from: afterId, to: newId }] })
    setSelectedId(newId)
    setPickerAfter(null)
  }

  function deleteNode(id: string) {
    const g       = graphRef.current
    const inEdge  = g.edges.find(e => e.to   === id && !e.branch)
    const outEdge = g.edges.find(e => e.from === id && !e.branch)
    let edges     = g.edges.filter(e => e.from !== id && e.to !== id)
    if (inEdge && outEdge) edges.push({ from: inEdge.from, to: outEdge.to })
    commitGraph({ ...g, nodes: g.nodes.filter(n => n.id !== id), edges })
    setSelectedId(null)
  }
  // Keep the stable handleDelete ref pointing at the live deleteNode closure
  onDeleteImpl.current = deleteNode

  // ── Auto-layout ───────────────────────────────────────────────────────────
  function applyAutoLayout() {
    const g      = graphRef.current
    const layout = computeAutoLayout(g)
    commitGraph({ ...g, nodes: g.nodes.map(n => ({ ...n, position: layout[n.id] })) })
    setTimeout(() => fitView({ duration: 400, padding: 0.3 }), 50)
  }

  // ── onNodesChange — smooth drag via applyNodeChanges ─────────────────────
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    setRfNodes(nds => applyNodeChanges(changes, nds))

    type PosChange = NodeChange & { type: 'position'; id: string; dragging: boolean; position?: { x: number; y: number } }
    const posChanges = changes.filter((c): c is PosChange => c.type === 'position')
    if (posChanges.length === 0) return

    if (posChanges.some(c => c.dragging)) draggingRef.current = true

    const ended = posChanges.filter(c => !c.dragging && !!c.position)
    if (ended.length > 0) {
      draggingRef.current = false
      const g = graphRef.current
      dispatch({
        type: 'COMMIT',
        graph: {
          ...g,
          nodes: g.nodes.map(n => {
            const ch = ended.find(c => c.id === n.id)
            return ch?.position ? { ...n, position: ch.position } : n
          }),
        },
      })
      setDirty(true)
    }
  }, [])

  const selectAll = useCallback(
    () => setRfNodes(nds => nds.map(n => ({ ...n, selected: true }))),
    [],
  )

  // ── Save / Publish ────────────────────────────────────────────────────────
  async function handleSave(activate = false) {
    if (!name.trim()) { alert('Please enter a template name.'); return }
    setSaving(true)
    try {
      const g = graphRef.current
      let tpl: AutomationTemplate
      if (template) {
        await updateAutomationTemplate(template.id, {
          name, automation_type: automationType, trigger_type: triggerType, primary_channel: channel,
          ...(activate ? { is_active: true } : {}),
        })
        tpl = await saveBuilderGraph(template.id, g)
      } else {
        tpl = await createAutomationTemplate({ name, automation_type: automationType, trigger_type: triggerType, primary_channel: channel, steps: [] })
        tpl = await saveBuilderGraph(tpl.id, g, { name, automation_type: automationType, trigger_type: triggerType, primary_channel: channel })
        if (activate) await updateAutomationTemplate(tpl.id, { is_active: true })
      }
      setDirty(false)
      router.push('/sage/automations')
    } finally {
      setSaving(false)
    }
  }

  const selectedNode = graph.nodes.find(n => n.id === selectedId) ?? null

  // ── Dark bar button (icon-only or icon+label on the dark bar) ─────────────
  function DBtn({
    icon: Icon, onClick, disabled = false, title, label,
  }: {
    icon:     React.ElementType
    onClick:  () => void
    disabled?: boolean
    title:    string
    label?:   string
  }) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={cn(
          'flex items-center gap-1.5 rounded-lg text-white hover:bg-white/15 transition-colors',
          'disabled:opacity-30 disabled:cursor-not-allowed',
          label ? 'px-3 h-9 text-[13px] font-medium' : 'justify-center w-9 h-9',
        )}
      >
        <Icon className="w-5 h-5 shrink-0" />
        {label && <span>{label}</span>}
      </button>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-y-0 left-[80px] right-0 z-20 flex flex-col overflow-hidden bg-[#f5f4f1] dark:bg-[#111]">

      {/* ── SageToolbar (top menu bar) ────────────────────── */}
      <SageToolbar pageKey="automations" />
      <AutomationTabBar />

      {/* ── Page heading row ─────────────────────────────── */}
      <div className="shrink-0 px-8 pt-4 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white leading-tight">Flow Builder</h1>
          <p className="text-xs text-gray-400 mt-0.5">Design and publish your automation workflow</p>
        </div>

        <div className="flex items-center gap-2">

          {/* ── Prebuilt templates dropdown ── */}
          {systemTemplates.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setTplDropdownOpen(v => !v)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border border-gray-200 dark:border-white/15 bg-white dark:bg-white/8 text-gray-700 dark:text-white rounded-xl hover:border-gray-300 dark:hover:border-white/25 hover:shadow-sm transition-all"
              >
                <Layers className="w-3.5 h-3.5" />
                Prebuilt
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>
              {tplDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setTplDropdownOpen(false)} />
                  <div className="absolute right-0 top-full mt-1.5 z-40 bg-white dark:bg-[#252525] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl overflow-y-auto max-h-[480px] min-w-[312px]">
                    {/* Group by track */}
                    {(() => {
                      const trackGroups: Record<string, AutomationTemplate[]> = {}
                      for (const t of systemTemplates) {
                        const k = t.track ?? 'Templates'
                        trackGroups[k] = trackGroups[k] ?? []
                        trackGroups[k].push(t)
                      }
                      return Object.entries(trackGroups).map(([track, tpls]) => (
                        <div key={track}>
                          <div className="px-4 py-2.5 bg-gray-50 dark:bg-white/[0.04] border-b border-gray-100 dark:border-white/8">
                            <p className="text-[12px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{track}</p>
                          </div>
                          {tpls.map(tpl => (
                            <button
                              key={tpl.id}
                              onClick={() => {
                                const g = tpl.config_json ?? stepsToGraph(tpl)
                                dispatch({ type: 'COMMIT', graph: g })
                                setName(tpl.name)
                                setAutomationType(tpl.automation_type)
                                setTriggerType(tpl.trigger_type)
                                setChannel(tpl.primary_channel)
                                setDirty(true)
                                setSelectedId(null)
                                setTplDropdownOpen(false)
                                // Position trigger ~80px from the top (≈ 4 background dots)
                                requestAnimationFrame(() => requestAnimationFrame(() => {
                                  const w = canvasContainerRef.current?.clientWidth ?? 800
                                  setViewport({ x: w / 2, y: 80, zoom: 1 }, { duration: 400 })
                                }))
                              }}
                              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b border-gray-100 dark:border-white/6 last:border-0 text-left"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-[14px] font-medium text-gray-800 dark:text-gray-200 truncate">{tpl.name}</p>
                                <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-1">
                                  {TYPE_LABEL[tpl.automation_type] ?? tpl.automation_type}
                                  {' · '}
                                  {tpl.steps.length} steps
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      ))
                    })()}
                  </div>
                </>
              )}
            </div>
          )}

          {dirty && (
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-400/15 text-amber-600 dark:text-amber-300 font-medium border border-amber-200 dark:border-amber-400/20">
              Unsaved
            </span>
          )}
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border border-gray-200 dark:border-white/15 bg-white dark:bg-white/8 text-gray-700 dark:text-white rounded-xl hover:border-gray-300 dark:hover:border-white/25 hover:shadow-sm transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" /> Publish
          </button>
        </div>
      </div>

      {/* ── Dark bar — name (click-to-edit) + tool controls centred ─ */}
      <div className="shrink-0 px-8 pb-0">
        <div className="bg-[#141c2b] rounded-t-2xl px-4 py-1.5 flex items-center">

          {/* Name — left anchor, same width as the right spacer for balance */}
          <input
            value={name}
            onChange={e => { setName(e.target.value); setDirty(true) }}
            placeholder="Untitled"
            className="w-64 px-1 py-0.5 text-sm font-semibold bg-transparent border-b border-transparent text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 transition-colors cursor-pointer focus:cursor-text shrink-0"
          />

          {/* Buttons — centred */}
          <div className="flex-1 flex items-center justify-center gap-0.5">
            <div className="w-px h-5 bg-white/15 shrink-0 mx-2" />
            <DBtn icon={ArrowLeft}  onClick={() => router.back()}    title="Back"    />
            <DBtn icon={ArrowRight} onClick={() => router.forward()} title="Forward" />
            <div className="w-px h-5 bg-white/15 shrink-0 mx-2" />
            <DBtn icon={Undo2} onClick={() => { dispatch({ type: 'UNDO' }); setDirty(true) }} disabled={!canUndo} title="Undo (⌘Z)"   />
            <DBtn icon={Redo2} onClick={() => { dispatch({ type: 'REDO' }); setDirty(true) }} disabled={!canRedo} title="Redo (⌘⇧Z)" />
            <div className="w-px h-5 bg-white/15 shrink-0 mx-2" />
            <DBtn icon={MousePointer2} onClick={selectAll} title="Select all (⌘A)" label="Select All" />
            <div className="w-px h-5 bg-white/15 shrink-0 mx-2" />
            <DBtn icon={Maximize2}  onClick={() => fitView({ duration: 300, padding: 0.3 })} title="Fit view"    />
            <DBtn icon={ZoomIn}     onClick={() => zoomIn({ duration: 200 })}                title="Zoom in"    />
            <DBtn icon={ZoomOut}    onClick={() => zoomOut({ duration: 200 })}               title="Zoom out"   />
            <DBtn icon={LayoutGrid} onClick={applyAutoLayout}                                title="Auto layout" label="Layout" />
            <div className="w-px h-5 bg-white/15 shrink-0 mx-2" />
          </div>

          {/* Right spacer — mirrors name width to keep buttons truly centred */}
          <div className="w-64 shrink-0" />
        </div>
      </div>

      {/* ── Canvas + floating config panel ────────────────── */}
      <div className="flex-1 px-8 pb-0 min-h-0 relative overflow-hidden">

        {/* Canvas — always full width */}
        <div
          ref={canvasContainerRef}
          className="w-full h-full bg-white dark:bg-[#1a1a1a] rounded-b-2xl border border-t-0 border-gray-200 dark:border-white/10 shadow-sm overflow-hidden"
          onClick={() => setSelectedId(null)}
        >
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            onNodesChange={handleNodesChange}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            minZoom={0.3}
            maxZoom={1.5}
            defaultEdgeOptions={{ type: 'buttonEdge', animated: false }}
            nodesDraggable
            nodesConnectable={false}
            elementsSelectable
            panOnDrag
            zoomOnScroll
            zoomOnPinch
            multiSelectionKeyCode="Shift"
            selectionOnDrag={true}
            selectionMode={SelectionMode.Partial}
            proOptions={{ hideAttribution: true }}
            className="bg-gray-50/60 dark:bg-[#111]"
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={14}
              size={1.5}
              color="#9ca3af"
              className="dark:!fill-white/20"
            />
            <Controls
              showInteractive={false}
              className="!shadow-md !rounded-xl !border !border-gray-200 dark:!border-white/10 !bg-white dark:!bg-[#1e1e1e] !overflow-hidden"
            />
            <div
              className="absolute top-4 right-4 z-10 nodrag nopan"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  const last = graph.nodes[graph.nodes.length - 1]
                  if (last) setPickerAfter(last.id)
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl shadow-lg transition-all"
              >
                <Plus className="w-4 h-4" /> Add Step
              </button>
            </div>
          </ReactFlow>
        </div>

        {/* Config panel — floats over the canvas, does not shrink it */}
        {selectedNode && (
          <div className="absolute top-0 right-0 bottom-0 w-[300px] z-10 bg-white dark:bg-[#1e1e1e] border-l border-gray-200 dark:border-white/10 shadow-2xl rounded-br-2xl overflow-hidden">
            <ConfigPanel
              node={selectedNode}
              onUpdate={updateNode}
              onDelete={deleteNode}
              onClose={() => setSelectedId(null)}
              automationType={automationType}
              onAutomationTypeChange={v => { setAutomationType(v); setDirty(true) }}
              triggerType={triggerType}
              onTriggerTypeChange={v => { setTriggerType(v); setDirty(true) }}
              channel={channel}
              onChannelChange={v => { setChannel(v); setDirty(true) }}
            />
          </div>
        )}
      </div>

      {pickerAfter && (
        <NodePicker
          onPick={type => addNodeAfter(pickerAfter, type)}
          onPickTrigger={type => { setTriggerType(type); setDirty(true); setPickerAfter(null) }}
          onClose={() => setPickerAfter(null)}
          contextNodeType={graph.nodes.find(n => n.id === pickerAfter)?.type}
        />
      )}
    </div>
  )
}
