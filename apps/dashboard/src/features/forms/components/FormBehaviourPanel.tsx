'use client'

import { useState } from 'react'
import {
  Users, Calendar, Monitor, Target, Eye, RefreshCw,
  FlaskConical, ChevronRight, ChevronDown, ToggleLeft, ToggleRight, X,
  Smartphone, Globe, Tablet,
  Maximize2, PanelBottom, AlignJustify, Lock, PanelRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FormBehaviour } from '@/features/forms/types'

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  icon: Icon, label, value, children,
}: {
  icon:      React.ElementType
  label:     string
  value:     string
  children?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-gray-100 dark:border-gray-700/60 last:border-0">
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          'w-full flex items-start gap-3 px-4 py-3 transition-colors text-left',
          open
            ? 'bg-gray-100 dark:bg-white/[0.06]'
            : 'hover:bg-gray-50 dark:hover:bg-white/[0.03]',
        )}
      >
        <Icon className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</p>
          <p className="text-xs text-gray-400 mt-0.5 leading-snug">{value}</p>
        </div>
        {children
          ? (open
            ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
            : <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />)
          : <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0 mt-0.5" />
        }
      </button>
      {open && children && (
        <div className="px-4 py-3 space-y-3 bg-white dark:bg-gray-900">{children}</div>
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

function SubDivider() {
  return <div className="border-t border-gray-100 dark:border-gray-700/50 !my-3" />
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{children}</p>
  )
}

// ── Tag input ─────────────────────────────────────────────────────────────────

function TagInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [input, setInput] = useState('')

  function addTag(raw: string) {
    const tag = raw.trim().replace(/,+$/, '').trim()
    if (tag && !tags.includes(tag)) onChange([...tags, tag])
    setInput('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(input) }
    else if (e.key === 'Backspace' && !input && tags.length > 0) onChange(tags.slice(0, -1))
  }

  return (
    <div
      className="flex flex-wrap gap-1.5 p-2 min-h-[38px] border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus-within:ring-1 focus-within:ring-brand-500 cursor-text"
      onClick={e => (e.currentTarget.querySelector('input') as HTMLInputElement)?.focus()}
    >
      {tags.map(tag => (
        <span key={tag} className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 shrink-0">
          {tag}
          <button onClick={() => onChange(tags.filter(t => t !== tag))} className="hover:text-brand-900 dark:hover:text-brand-100">
            <X className="w-2.5 h-2.5" />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => input.trim() && addTag(input)}
        placeholder={tags.length === 0 ? 'Search for tags or add a new one' : ''}
        className="flex-1 min-w-[100px] text-xs bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none"
      />
    </div>
  )
}

// ── Targeting section content ─────────────────────────────────────────────────

const VISITOR_LABELS: Record<string, string> = {
  all:           'All visitors',
  hide_existing: "Don't show to existing contacts",
  show_existing: 'Show to existing contacts',
  segment:       'Target by specific segment',
}

const SOURCE_OPTIONS = [
  { value: 'direct',     label: 'Direct' },
  { value: 'appalix',    label: 'Email or SMS' },
  { value: 'organic',    label: 'Organic search' },
  { value: 'google_ads', label: 'Google Ads' },
  { value: 'facebook',   label: 'Facebook' },
  { value: 'instagram',  label: 'Instagram' },
  { value: 'linkedin',   label: 'LinkedIn' },
  { value: 'tiktok',     label: 'TikTok' },
]

function TargetingContent({
  b, onChange,
}: {
  b:        FormBehaviour
  onChange: (patch: Partial<FormBehaviour>) => void
}) {
  const tgt           = b.targeting ?? {}
  const visitorType   = tgt.visitorType   ?? 'all'
  const pageRules     = tgt.pageRules     ?? []
  const locationMode  = tgt.locationMode  ?? 'show'
  const locationValues = tgt.locationValues ?? []
  const sourceMode    = tgt.sourceMode    ?? 'hide'
  const activeSources = tgt.sources       ?? []
  const utmSource     = tgt.utmSource     ?? ''
  const utmParams     = tgt.utmParams     ?? []

  type MatchType = 'is' | 'contains' | 'starts_with'
  const [pageInputs, setPageInputs] = useState<Record<string, { match: MatchType; value: string }>>({
    appears_on: { match: 'contains', value: '' },
    not_on:     { match: 'contains', value: '' },
  })
  const [locationInput, setLocationInput] = useState('')
  const [utmKey,        setUtmKey]        = useState('')
  const [utmVal,        setUtmVal]        = useState('')
  const [showAddUtm,    setShowAddUtm]    = useState(false)

  function patch(p: Partial<NonNullable<FormBehaviour['targeting']>>) {
    onChange({ targeting: { ...tgt, ...p } })
  }

  const inputCls = 'text-xs px-2.5 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-brand-500'

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug">
        Whom would you like to show this form to?
      </p>

      {/* ── Visitor targeting ── */}
      <div className="space-y-2">
        <SubHeading>Visitor targeting options</SubHeading>
        {Object.entries(VISITOR_LABELS).map(([val, label]) => (
          <label key={val} className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="radio"
              name="appalix-visitor-type"
              value={val}
              checked={visitorType === val}
              onChange={() => patch({ visitorType: val as typeof visitorType })}
              className="w-3.5 h-3.5 accent-brand-600"
            />
            <span className="text-xs text-gray-700 dark:text-gray-300">{label}</span>
          </label>
        ))}
      </div>

      <SubDivider />

      {/* ── Page targeting ── */}
      <div className="space-y-3">
        <SubHeading>Page targeting options</SubHeading>

        {/* Appears on URL + Does not appear on URL — always visible, each accepts many rules */}
        {([
          { type: 'appears_on' as const, label: 'Appears on URL'          },
          { type: 'not_on'     as const, label: 'Does not appear on URL'  },
        ]).map(({ type: ruleType, label }) => {
          const inp      = pageInputs[ruleType] ?? { match: 'contains' as MatchType, value: '' }
          const existing = pageRules.filter(r => r.type === ruleType)
          return (
            <div key={ruleType} className="space-y-1.5">
              <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">{label}</p>

              {/* Saved rules */}
              {existing.map((rule, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="text-[11px] px-1.5 py-0.5 border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 shrink-0">
                    {rule.match ?? 'contains'}
                  </span>
                  <span className="text-xs text-brand-600 dark:text-brand-400 flex-1 truncate">{rule.url}</span>
                  <button onClick={() => patch({ pageRules: pageRules.filter(r => !(r.type === rule.type && r.url === rule.url && r.match === rule.match)) })}>
                    <X className="w-3 h-3 text-gray-400 hover:text-red-400" />
                  </button>
                </div>
              ))}

              {/* Add new rule */}
              <div className="space-y-1">
                <select
                  value={inp.match}
                  onChange={e => setPageInputs(prev => ({ ...prev, [ruleType]: { ...inp, match: e.target.value as MatchType } }))}
                  className="w-full text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="contains">contains</option>
                  <option value="is">is</option>
                  <option value="starts_with">starts with</option>
                </select>
                <div className="flex gap-1">
                  <input
                    value={inp.value}
                    onChange={e => setPageInputs(prev => ({ ...prev, [ruleType]: { ...inp, value: e.target.value } }))}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && inp.value.trim()) {
                        patch({ pageRules: [...pageRules, { type: ruleType, match: inp.match, url: inp.value.trim() }] })
                        setPageInputs(prev => ({ ...prev, [ruleType]: { ...inp, value: '' } }))
                      }
                    }}
                    placeholder="/products"
                    className={cn(inputCls, 'flex-1 min-w-0')}
                  />
                  <button
                    onClick={() => {
                      const v = inp.value.trim()
                      if (v) {
                        patch({ pageRules: [...pageRules, { type: ruleType, match: inp.match, url: v }] })
                        setPageInputs(prev => ({ ...prev, [ruleType]: { ...inp, value: '' } }))
                      }
                    }}
                    className="text-xs px-2.5 py-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 shrink-0"
                  >Add</button>
                </div>
              </div>
            </div>
          )
        })}

        {/* Out of stock — checkbox toggle */}
        <label className="flex items-center gap-2.5 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={pageRules.some(r => r.type === 'out_of_stock')}
            onChange={() => {
              const has = pageRules.some(r => r.type === 'out_of_stock')
              patch({ pageRules: has ? pageRules.filter(r => r.type !== 'out_of_stock') : [...pageRules, { type: 'out_of_stock' }] })
            }}
            className="w-3.5 h-3.5 accent-brand-600 rounded"
          />
          <span className="text-xs text-gray-700 dark:text-gray-300">Out of stock pages</span>
        </label>
      </div>

      <SubDivider />

      {/* ── Location targeting ── */}
      <div className="space-y-2">
        <SubHeading>Location targeting</SubHeading>
        <div className="flex gap-1.5">
          {(['show', 'hide'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => patch({ locationMode: mode })}
              className={cn(
                'text-xs px-2.5 py-1 rounded-lg border transition-colors',
                locationMode === mode
                  ? 'bg-brand-50 dark:bg-brand-500/10 border-brand-300 dark:border-brand-600 text-brand-700 dark:text-brand-300'
                  : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300',
              )}
            >
              {mode === 'show' ? 'Show to visitors in' : 'Do not show to visitors in'}
            </button>
          ))}
        </div>
        {locationValues.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {locationValues.map((loc, i) => (
              <span key={i} className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-300">
                {loc}
                <button onClick={() => patch({ locationValues: locationValues.filter((_, j) => j !== i) })}>
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}
        <input
          value={locationInput}
          onChange={e => setLocationInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && locationInput.trim()) {
              patch({ locationValues: [...locationValues, locationInput.trim()] })
              setLocationInput('')
            }
          }}
          onBlur={() => {
            if (locationInput.trim()) {
              patch({ locationValues: [...locationValues, locationInput.trim()] })
              setLocationInput('')
            }
          }}
          placeholder="Enter country or region, press Enter…"
          className={cn(inputCls, 'w-full')}
        />
      </div>

      <SubDivider />

      {/* ── Source targeting ── */}
      <div className="space-y-2">
        <SubHeading>Source targeting</SubHeading>
        <div className="flex items-center gap-1.5 flex-wrap text-xs text-gray-600 dark:text-gray-400">
          <span>Set</span>
          <select
            value={sourceMode}
            onChange={e => patch({ sourceMode: e.target.value as 'show' | 'hide' })}
            className="text-xs border border-gray-200 dark:border-gray-600 rounded-md px-1.5 py-0.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="show">show</option>
            <option value="hide">not show</option>
          </select>
          <span>for sources:</span>
        </div>
        <div className="space-y-1.5">
          {SOURCE_OPTIONS.map(src => (
            <label key={src.value} className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={activeSources.includes(src.value)}
                onChange={e => {
                  const next = e.target.checked
                    ? [...activeSources, src.value]
                    : activeSources.filter(s => s !== src.value)
                  patch({ sources: next })
                }}
                className="w-3.5 h-3.5 accent-brand-600 rounded"
              />
              <span className="text-xs text-gray-700 dark:text-gray-300">{src.label}</span>
            </label>
          ))}
        </div>
      </div>

      <SubDivider />

      {/* ── UTM targeting ── */}
      <div className="space-y-2">
        <SubHeading>UTM targeting</SubHeading>
        <p className="text-xs text-gray-400 leading-snug">
          Your form will be displayed only if all parameters entered are in the URL.
        </p>
        <div className="space-y-1">
          <p className="text-[11px] text-gray-500 dark:text-gray-400">Source</p>
          <input
            value={utmSource}
            onChange={e => patch({ utmSource: e.target.value })}
            placeholder="e.g. newsletter"
            className={cn(inputCls, 'w-full')}
          />
        </div>
        {utmParams.map((param, i) => (
          <div key={i} className="flex items-center gap-2 text-[11px]">
            <span className="text-gray-500 shrink-0 w-20 truncate font-medium">{param.key}</span>
            <span className="text-gray-700 dark:text-gray-300 flex-1 truncate">{param.value}</span>
            <button onClick={() => patch({ utmParams: utmParams.filter((_, j) => j !== i) })}>
              <X className="w-3 h-3 text-gray-400 hover:text-red-400" />
            </button>
          </div>
        ))}
        {showAddUtm ? (
          <div className="space-y-1.5">
            <div className="flex gap-1.5">
              <input
                autoFocus
                value={utmKey}
                onChange={e => setUtmKey(e.target.value)}
                placeholder="Key (e.g. utm_medium)"
                className={cn(inputCls, 'flex-1')}
              />
              <input
                value={utmVal}
                onChange={e => setUtmVal(e.target.value)}
                placeholder="Value"
                className={cn(inputCls, 'flex-1')}
              />
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  if (utmKey.trim()) {
                    patch({ utmParams: [...utmParams, { key: utmKey.trim(), value: utmVal.trim() }] })
                    setUtmKey(''); setUtmVal(''); setShowAddUtm(false)
                  }
                }}
                className="text-xs px-2.5 py-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
              >Add</button>
              <button onClick={() => { setUtmKey(''); setUtmVal(''); setShowAddUtm(false) }} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowAddUtm(true)} className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">
            + Add UTM
          </button>
        )}
      </div>
    </div>
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
  const frequency  = b.frequency  ?? { mode: 'once_per_day' as const }
  const abTesting  = b.abTesting  ?? { enabled: false, variants: [] }

  const tags        = b.audience?.tags ?? []
  const tgt         = b.targeting ?? {}
  const devices     = tgt.devices ?? ['desktop', 'mobile', 'tablet']

  // Targeting summary
  const tgtSummary = (() => {
    const vt = tgt.visitorType ?? 'all'
    if (vt !== 'all') return VISITOR_LABELS[vt]
    if ((tgt.pageRules ?? []).length)     return `${tgt.pageRules!.length} page rule(s)`
    if ((tgt.locationValues ?? []).length) return 'Location rules set'
    if ((tgt.sources ?? []).length)       return 'Source rules set'
    if ((tgt.utmParams ?? []).length)     return 'UTM rules set'
    return 'All visitors, all pages'
  })()

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-700/60">

      {/* 1 ── Display */}
      <Section
        icon={Monitor}
        label="Display"
        value={(() => {
          const style = display.style ?? 'popup'
          const styleLabel = { popup: 'Popup', fly_in_below: 'Fly-in below', inline: 'Inline', locked: 'Locked content', widget: 'Widget' }[style]
          const triggerLabel = display.trigger === 'delay' ? ` · After ${display.delaySeconds ?? 3}s` : display.trigger === 'scroll' ? ` · ${display.scrollPercentage ?? 50}% scroll` : display.trigger === 'exit_intent' ? ' · Exit intent' : display.trigger === 'click' ? ' · On click' : ' · Immediate'
          return styleLabel + triggerLabel
        })()}
      >
        {/* ── Form style ── */}
        <SubHeading>Form style</SubHeading>
        <div className="grid grid-cols-5 gap-1">
          {([
            { value: 'popup',        label: 'Popup',      Icon: Maximize2    },
            { value: 'fly_in_below', label: 'Fly-in',     Icon: PanelBottom  },
            { value: 'inline',       label: 'Inline',     Icon: AlignJustify },
            { value: 'locked',       label: 'Locked',     Icon: Lock         },
            { value: 'widget',       label: 'Widget',     Icon: PanelRight   },
          ] as const).map(({ value, label, Icon }) => {
            const active = (display.style ?? 'popup') === value
            return (
              <button
                key={value}
                onClick={() => onChange({ display: { ...display, style: value } })}
                className={cn(
                  'flex flex-col items-center gap-1 py-2 rounded-lg border text-center transition-colors',
                  active
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400'
                    : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:border-gray-300 hover:text-gray-600 dark:hover:text-gray-300'
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[10px] font-medium leading-none">{label}</span>
              </button>
            )
          })}
        </div>

        <SubDivider />

        {/* ── Animation ── */}
        <SubHeading>Animation</SubHeading>
        <Row label="Entry">
          <Select
            value={display.entryAnimation ?? 'fade'}
            onChange={v => onChange({ display: { ...display, entryAnimation: v as NonNullable<FormBehaviour['display']>['entryAnimation'] } })}
            options={[
              { value: 'none',       label: 'None'       },
              { value: 'fade',       label: 'Fade in'    },
              { value: 'slide_up',   label: 'Slide up'   },
              { value: 'slide_down', label: 'Slide down' },
              { value: 'slide_left', label: 'Slide left' },
              { value: 'slide_right',label: 'Slide right'},
              { value: 'zoom',       label: 'Zoom in'    },
            ]}
          />
        </Row>
        <Row label="Exit">
          <Select
            value={display.exitAnimation ?? 'fade'}
            onChange={v => onChange({ display: { ...display, exitAnimation: v as NonNullable<FormBehaviour['display']>['exitAnimation'] } })}
            options={[
              { value: 'none',       label: 'None'        },
              { value: 'fade',       label: 'Fade out'    },
              { value: 'slide_up',   label: 'Slide up'    },
              { value: 'slide_down', label: 'Slide down'  },
              { value: 'slide_left', label: 'Slide left'  },
              { value: 'slide_right',label: 'Slide right' },
              { value: 'zoom',       label: 'Zoom out'    },
            ]}
          />
        </Row>

        <SubDivider />

        {/* ── Trigger ── */}
        <SubHeading>Trigger</SubHeading>
        <Row label="Show">
          <Select
            value={display.trigger ?? 'immediate'}
            onChange={v => onChange({ display: { ...display, trigger: v as NonNullable<FormBehaviour['display']>['trigger'] } })}
            options={[
              { value: 'immediate',   label: 'Immediately'  },
              { value: 'delay',       label: 'After delay'  },
              { value: 'scroll',      label: 'On scroll'    },
              { value: 'exit_intent', label: 'Exit intent'  },
              { value: 'click',       label: 'On click'     },
            ]}
          />
        </Row>
        {display.trigger === 'delay' && (
          <Row label="Seconds">
            <input
              type="number" min={0} max={60}
              defaultValue={display.delaySeconds ?? 3}
              onBlur={e => onChange({ display: { ...display, delaySeconds: parseInt(e.target.value) || 3 } })}
              className="w-16 text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none text-right"
            />
          </Row>
        )}
        {display.trigger === 'scroll' && (
          <Row label="Scroll %">
            <input
              type="number" min={0} max={100}
              defaultValue={display.scrollPercentage ?? 50}
              onBlur={e => onChange({ display: { ...display, scrollPercentage: parseInt(e.target.value) || 50 } })}
              className="w-16 text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none text-right"
            />
          </Row>
        )}

        <SubDivider />

        {/* ── Success message ── */}
        <SubHeading>Success message</SubHeading>
        <div className="space-y-1.5">
          <input
            defaultValue={display.successTitle ?? 'Thank you!'}
            onBlur={e => onChange({ display: { ...display, successTitle: e.target.value } })}
            placeholder="Thank you!"
            className="w-full text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <textarea
            defaultValue={display.successBody ?? 'Your response has been submitted.'}
            onBlur={e => onChange({ display: { ...display, successBody: e.target.value } })}
            placeholder="Your response has been submitted."
            rows={2}
            className="w-full text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
          />
        </div>
      </Section>

      {/* 2 ── Targeting */}
      <Section icon={Target} label="Targeting" value={tgtSummary}>
        <TargetingContent b={b} onChange={onChange} />
      </Section>

      {/* 3 ── Frequency */}
      <Section icon={RefreshCw} label="Frequency" value={frequency.mode.replace(/_/g, ' ')}>
        <Row label="Show">
          <Select
            value={frequency.mode}
            onChange={v => onChange({ frequency: { mode: v as NonNullable<FormBehaviour['frequency']>['mode'] } })}
            options={[
              { value: 'always',           label: 'Every visit'      },
              { value: 'once',             label: 'Once only'        },
              { value: 'once_per_day',     label: 'Once per day'     },
              { value: 'once_per_session', label: 'Once per session' },
            ]}
          />
        </Row>
      </Section>

      {/* 4 ── Audience management */}
      <Section
        icon={Users}
        label="Audience management"
        value={tags.length > 0 ? `${tags.length} tag${tags.length !== 1 ? 's' : ''}` : 'No tags configured'}
      >
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Audience</p>
          <p className="text-[11px] text-gray-400 leading-snug">
            Set up a tag to determine if your subscribers came from this form. This allows you to send them tailored messages.
          </p>
        </div>
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Tags</p>
          <TagInput
            tags={tags}
            onChange={newTags => onChange({ audience: { ...b.audience, tags: newTags } })}
          />
        </div>

        <div className="pt-1 space-y-3">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Verification</p>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Enable double opt-in</p>
              <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">Subscribers will need to confirm their consent by email.</p>
            </div>
            <Toggle
              checked={b.audience?.doubleOptIn ?? false}
              onChange={v => onChange({ audience: { ...b.audience, doubleOptIn: v } })}
            />
          </div>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Enable reCAPTCHA</p>
              <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">Visitors will need to pass a quick check if flagged as bots.</p>
            </div>
            <Toggle
              checked={b.audience?.recaptcha ?? false}
              onChange={v => onChange({ audience: { ...b.audience, recaptcha: v } })}
            />
          </div>
        </div>
      </Section>

      {/* 5 ── Scheduling */}
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
              { value: 'always',    label: 'Always on' },
              { value: 'scheduled', label: 'Scheduled' },
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

      {/* 6 ── Visibility */}
      <Section
        icon={Eye}
        label="Visibility"
        value={devices.length === 3 ? 'All devices' : devices.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ') || 'No devices selected'}
      >
        <p className="text-[11px] text-gray-400 leading-snug mb-1">Choose which devices this form appears on.</p>
        <div className="space-y-2">
          {([
            { value: 'desktop', label: 'Website',   Icon: Globe       },
            { value: 'mobile',  label: 'Mobile',    Icon: Smartphone  },
            { value: 'tablet',  label: 'Tablet',    Icon: Tablet      },
          ] as const).map(({ value, label, Icon: DevIcon }) => (
            <label key={value} className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={devices.includes(value)}
                onChange={e => {
                  const next = e.target.checked
                    ? [...devices, value]
                    : devices.filter(d => d !== value)
                  onChange({ targeting: { ...tgt, devices: next } })
                }}
                className="w-3.5 h-3.5 accent-brand-600 rounded"
              />
              <DevIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="text-xs text-gray-700 dark:text-gray-300">{label}</span>
            </label>
          ))}
        </div>
      </Section>

      {/* 7 ── A/B test */}
      <Section
        icon={FlaskConical}
        label="A/B test"
        value={abTesting.enabled
          ? `${abTesting.variants.length} variant${abTesting.variants.length !== 1 ? 's' : ''} — test running`
          : 'Not configured'}
      >
        <Row label="Enable A/B test">
          <Toggle
            checked={abTesting.enabled}
            onChange={v => {
              const variants = v && abTesting.variants.length === 0
                ? [{ id: 'variant_a', weight: 50 }, { id: 'variant_b', weight: 50 }]
                : abTesting.variants
              onChange({ abTesting: { ...abTesting, enabled: v, variants } })
            }}
          />
        </Row>

        {abTesting.enabled && (() => {
          const variants = abTesting.variants.length > 0
            ? abTesting.variants
            : [{ id: 'variant_a', weight: 50 }, { id: 'variant_b', weight: 50 }]
          const total = variants.reduce((s, v) => s + v.weight, 0)

          function setVariants(next: typeof variants) {
            onChange({ abTesting: { ...abTesting, variants: next } })
          }

          function adjustWeight(idx: number, newWeight: number) {
            newWeight = Math.min(99, Math.max(1, newWeight))
            const rest = 100 - newWeight
            const others = variants.filter((_, j) => j !== idx)
            const otherTotal = others.reduce((s, v) => s + v.weight, 0)
            const next = variants.map((v, j) => {
              if (j === idx) return { ...v, weight: newWeight }
              const share = otherTotal > 0
                ? Math.round(v.weight / otherTotal * rest)
                : Math.round(rest / others.length)
              return { ...v, weight: Math.max(1, share) }
            })
            // fix rounding so total = 100
            const sum = next.reduce((s, v) => s + v.weight, 0)
            const lastOther = next.findIndex((_, j) => j !== idx)
            if (lastOther !== -1) next[lastOther].weight += 100 - sum
            setVariants(next)
          }

          return (
            <div className="space-y-3 pt-1">
              <p className="text-[11px] text-gray-400 leading-snug">
                Visitors are randomly assigned to a variant based on weight. Weights must total 100%.
              </p>

              {variants.map((variant, i) => {
                const letter = String.fromCharCode(65 + i)
                return (
                  <div key={variant.id} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        Variant {letter}{i === 0 ? ' (this form)' : ''}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 w-8 text-right">
                          {variant.weight}%
                        </span>
                        {variants.length > 2 && (
                          <button
                            onClick={() => {
                              const next = variants.filter((_, j) => j !== i)
                              const t = next.reduce((s, v) => s + v.weight, 0)
                              const norm = next.map(v => ({ ...v, weight: Math.round(v.weight / t * 100) }))
                              const diff = 100 - norm.reduce((s, v) => s + v.weight, 0)
                              if (norm.length > 0) norm[0].weight += diff
                              setVariants(norm)
                            }}
                          >
                            <X className="w-3 h-3 text-gray-400 hover:text-red-400" />
                          </button>
                        )}
                      </div>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={99}
                      value={variant.weight}
                      onChange={e => adjustWeight(i, parseInt(e.target.value))}
                      className="w-full h-1.5 accent-brand-600 cursor-pointer"
                    />
                  </div>
                )
              })}

              <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700/50 pt-2">
                <span className="text-[11px] text-gray-400">Total</span>
                <span className={cn(
                  'text-xs font-semibold',
                  total === 100 ? 'text-emerald-500' : 'text-red-400'
                )}>{total}%</span>
              </div>

              {variants.length < 4 && (
                <button
                  onClick={() => {
                    const share = Math.floor(100 / (variants.length + 1))
                    const existing = variants.map(v => ({ ...v, weight: Math.floor(v.weight * variants.length / (variants.length + 1)) }))
                    const newId = `variant_${String.fromCharCode(97 + variants.length)}`
                    const next = [...existing, { id: newId, weight: share }]
                    const diff = 100 - next.reduce((s, v) => s + v.weight, 0)
                    next[0].weight += diff
                    setVariants(next)
                  }}
                  className="text-xs text-brand-600 dark:text-brand-400 hover:underline"
                >
                  + Add variant
                </button>
              )}
            </div>
          )
        })()}
      </Section>

    </div>
  )
}
