'use client'

import { useState } from 'react'
import {
  Users, Calendar, Monitor, Target, Eye, RefreshCw,
  FlaskConical, ChevronRight, ChevronDown, ToggleLeft, ToggleRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FormBehaviour } from '@/features/forms/types'

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  icon: Icon, label, value, children,
}: {
  icon:     React.ElementType
  label:    string
  value:    string
  children?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-gray-100 dark:border-gray-700/60 last:border-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors text-left"
      >
        <Icon className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{label}</p>
          <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{value}</p>
        </div>
        {children
          ? (open
            ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
            : <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />)
          : <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0 mt-0.5" />
        }
      </button>
      {open && children && (
        <div className="px-4 pb-3 space-y-3">{children}</div>
      )}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-gray-600 dark:text-gray-400 shrink-0">{label}</span>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} className="shrink-0">
      {checked
        ? <ToggleRight className="w-5 h-5 text-brand-500" />
        : <ToggleLeft  className="w-5 h-5 text-gray-300" />
      }
    </button>
  )
}

function Select({ value, options, onChange }: {
  value:    string
  options:  { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-500"
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

// ── Panel ─────────────────────────────────────────────────────────────────────

interface Props {
  behaviour: FormBehaviour
  onChange:  (patch: Partial<FormBehaviour>) => void
}

export function FormBehaviourPanel({ behaviour: b, onChange }: Props) {
  const display    = b.display    ?? { trigger: 'immediate' as const }
  const scheduling = b.scheduling ?? { mode: 'always' as const, startAt: null, endAt: null }
  const targeting  = b.targeting  ?? { devices: ['desktop', 'mobile'] as ('desktop' | 'mobile' | 'tablet')[], hideForSources: [], urlRules: [] }
  const frequency  = b.frequency  ?? { mode: 'once_per_day' as const }
  const postSubmit = b.postSubmit ?? { createContact: true, createDeal: false, pipelineId: null, sendEmail: false, sendSms: false }
  const abTesting  = b.abTesting  ?? { enabled: false, variants: [] }

  // Audience summary
  const tags = b.audience?.tags ?? []

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-700/60">

      {/* Audience management */}
      <Section
        icon={Users}
        label="Audience management"
        value={tags.length > 0 ? `Tags: ${tags.join(', ')}` : 'No tags configured'}
      >
        <div>
          <p className="text-[11px] text-gray-400 mb-1.5">Tags applied on submission</p>
          <input
            placeholder="Add tags, comma-separated"
            defaultValue={tags.join(', ')}
            onBlur={e => {
              const newTags = e.target.value.split(',').map(t => t.trim()).filter(Boolean)
              onChange({ audience: { ...b.audience, tags: newTags } })
            }}
            className="w-full text-xs px-2.5 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <Row label="Create contact">
          <Toggle checked={postSubmit.createContact} onChange={v => onChange({ postSubmit: { ...postSubmit, createContact: v } })} />
        </Row>
        <Row label="Create deal">
          <Toggle checked={postSubmit.createDeal} onChange={v => onChange({ postSubmit: { ...postSubmit, createDeal: v } })} />
        </Row>
      </Section>

      {/* Scheduling */}
      <Section
        icon={Calendar}
        label="Scheduling"
        value={scheduling.mode === 'always' ? 'Always available' : 'Scheduled window'}
      >
        <Row label="Mode">
          <Select
            value={scheduling.mode}
            onChange={v => onChange({ scheduling: { ...scheduling, mode: v as 'always' | 'scheduled' } })}
            options={[
              { value: 'always',    label: 'Always on'  },
              { value: 'scheduled', label: 'Scheduled'  },
            ]}
          />
        </Row>
        {scheduling.mode === 'scheduled' && (
          <>
            <Row label="Start">
              <input
                type="datetime-local"
                defaultValue={scheduling.startAt ?? ''}
                onBlur={e => onChange({ scheduling: { ...scheduling, startAt: e.target.value || null } })}
                className="text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none"
              />
            </Row>
            <Row label="End">
              <input
                type="datetime-local"
                defaultValue={scheduling.endAt ?? ''}
                onBlur={e => onChange({ scheduling: { ...scheduling, endAt: e.target.value || null } })}
                className="text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none"
              />
            </Row>
          </>
        )}
      </Section>

      {/* Display trigger */}
      <Section
        icon={Monitor}
        label="Display"
        value={
          display.trigger === 'delay'       ? `After ${display.delaySeconds ?? 3}s`
          : display.trigger === 'scroll'    ? `After ${display.scrollPercentage ?? 50}% scroll`
          : display.trigger === 'exit_intent' ? 'On exit intent'
          : display.trigger === 'click'     ? 'On click'
          : 'Immediate'
        }
      >
        <Row label="Trigger">
          <Select
            value={display.trigger ?? 'delay'}
            onChange={v => onChange({ display: { ...display, trigger: v as NonNullable<FormBehaviour['display']>['trigger'] } })}
            options={[
              { value: 'immediate',   label: 'Immediate'    },
              { value: 'delay',       label: 'Time delay'   },
              { value: 'scroll',      label: 'Scroll depth' },
              { value: 'exit_intent', label: 'Exit intent'  },
              { value: 'click',       label: 'On click'     },
            ]}
          />
        </Row>
        {display.trigger === 'delay' && (
          <Row label="Delay (seconds)">
            <input
              type="number"
              min={0}
              max={60}
              defaultValue={display.delaySeconds ?? 3}
              onBlur={e => onChange({ display: { ...display, delaySeconds: parseInt(e.target.value) || 3 } })}
              className="w-16 text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none text-right"
            />
          </Row>
        )}
        {display.trigger === 'scroll' && (
          <Row label="Scroll %">
            <input
              type="number"
              min={0}
              max={100}
              defaultValue={display.scrollPercentage ?? 50}
              onBlur={e => onChange({ display: { ...display, scrollPercentage: parseInt(e.target.value) || 50 } })}
              className="w-16 text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none text-right"
            />
          </Row>
        )}
      </Section>

      {/* Targeting */}
      <Section
        icon={Target}
        label="Targeting"
        value={`${targeting.devices.length} device(s) · ${targeting.urlRules.length} URL rule(s)`}
      >
        <div>
          <p className="text-[11px] text-gray-400 mb-2">Devices</p>
          <div className="flex gap-2">
            {(['desktop', 'mobile', 'tablet'] as const).map(d => (
              <label key={d} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={targeting.devices.includes(d)}
                  onChange={e => {
                    const next = e.target.checked
                      ? [...targeting.devices, d]
                      : targeting.devices.filter(x => x !== d)
                    onChange({ targeting: { ...targeting, devices: next } })
                  }}
                  className="w-3.5 h-3.5 accent-brand-600"
                />
                <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">{d}</span>
              </label>
            ))}
          </div>
        </div>
      </Section>

      {/* Visibility / Frequency */}
      <Section
        icon={Eye}
        label="Visibility"
        value="Show on all devices"
      />

      <Section
        icon={RefreshCw}
        label="Frequency"
        value={frequency.mode.replace(/_/g, ' ')}
      >
        <Row label="Show">
          <Select
            value={frequency.mode}
            onChange={v => onChange({ frequency: { mode: v as NonNullable<FormBehaviour['frequency']>['mode'] } })}
            options={[
              { value: 'always',           label: 'Every visit'     },
              { value: 'once',             label: 'Once only'       },
              { value: 'once_per_day',     label: 'Once per day'    },
              { value: 'once_per_session', label: 'Once per session'},
            ]}
          />
        </Row>
      </Section>

      {/* A/B Test */}
      <Section
        icon={FlaskConical}
        label="A/B test"
        value={abTesting.enabled ? 'Test running' : 'Start A/B testing with a single click'}
      >
        <Row label="Enable A/B test">
          <Toggle
            checked={abTesting.enabled}
            onChange={v => onChange({ abTesting: { ...abTesting, enabled: v } })}
          />
        </Row>
      </Section>

    </div>
  )
}
