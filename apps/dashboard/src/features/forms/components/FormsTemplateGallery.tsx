'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter }  from 'next/navigation'
import {
  Search, Loader2, Layers, Mail, MessageSquare,
  PanelRight, Globe, Maximize2, LayoutTemplate, Check,
  SlidersHorizontal, X, Zap, ShoppingBag, RotateCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createFormFromTemplate } from '@/app/actions/forms'
import type { FormTemplate, FormType, FormGoal, ChannelMode } from '@/features/forms/types'

// ── Filter config ─────────────────────────────────────────────────────────────

const GOALS: { value: FormGoal; label: string; icon: React.ElementType }[] = [
  { value: 'collect_subscribers', label: 'Collect subscribers', icon: Mail          },
  { value: 'stop_abandonment',    label: 'Stop abandonment',    icon: RotateCcw     },
  { value: 'promote_offers',      label: 'Promote offers',      icon: ShoppingBag   },
  { value: 'out_of_stock_interest', label: 'Back in stock',     icon: Zap           },
]

const TYPES: { value: FormType; label: string; icon: React.ElementType }[] = [
  { value: 'popup',        label: 'Popup',        icon: Maximize2          },
  { value: 'embedded',     label: 'Embedded',     icon: LayoutTemplate     },
  { value: 'landing_page', label: 'Landing page', icon: Globe              },
  { value: 'flyout',       label: 'Flyout',       icon: PanelRight         },
]

const CHANNELS: { value: ChannelMode; label: string; icon: React.ElementType }[] = [
  { value: 'email_only', label: 'Email only',  icon: Mail           },
  { value: 'sms_only',   label: 'SMS only',    icon: MessageSquare  },
  { value: 'email_sms',  label: 'Email + SMS', icon: Layers         },
]

// ── Template card mockup ──────────────────────────────────────────────────────

// size='compact' → small overlay (top/background layouts)
// size='side'    → side panel (left/right layouts)
// size='full'    → no-image full-card (large, readable text)
type CardSize = 'compact' | 'side' | 'full'
function MiniFormCard({ template, size = 'compact' }: { template: FormTemplate; size?: CardSize }) {
  const primary   = template.theme?.colors?.primary    ?? '#6366f1'
  const bg        = template.theme?.colors?.background ?? '#ffffff'
  const text      = template.theme?.colors?.text       ?? '#111827'
  const btnRadius = template.theme?.buttons?.radius    ?? '6px'
  const fRadius   = template.theme?.fields?.radius     ?? '5px'
  const isMulti   = template.is_multi_step

  const blocks = template.config.blocks ?? []

  const heading     = blocks.find(b => b.type === 'text' && b.props.variant === 'heading')
  const bodyText    = blocks.find(b => b.type === 'text' && b.props.variant === 'body')
  const emailBlock  = blocks.find(b => b.type === 'email')
  const phoneBlock  = blocks.find(b => b.type === 'phone')
  const inputBlock  = blocks.find(b => b.type === 'text_input')
  const buttonBlock = blocks.find(b => b.type === 'button')
  const wheelBlock  = blocks.find(b => b.type === 'wheel_of_fortune')

  const headingText = (heading?.props.content  as string | undefined) ?? template.name
  const bodyStr     = (bodyText?.props.content  as string | undefined) ?? ''
  const btnLabel    = (buttonBlock?.props.label as string | undefined) ?? 'Submit'
  const emailPh     = (emailBlock?.props.placeholder as string | undefined) ?? 'Enter your email'
  const phonePh     = (phoneBlock?.props.placeholder as string | undefined) ?? 'Phone number'
  const inputPh     = (inputBlock?.props.placeholder as string | undefined) ?? 'Your answer'

  const hSize  = size === 'full' ? '15px' : size === 'side' ? '12px' : '9px'
  const bSize  = size === 'full' ? '11px' : size === 'side' ? '9px'  : '7px'
  const iH     = size === 'full' ? 32     : size === 'side' ? 26     : 18
  const btnH   = size === 'full' ? 36     : size === 'side' ? 28     : 20
  const btnTxt = size === 'full' ? '11px' : size === 'side' ? '10px' : '8px'
  const gap    = size === 'full' ? 'gap-2' : size === 'side' ? 'gap-2.5' : 'gap-1.5'
  const pad    = size === 'full' ? 'px-5 py-4' : size === 'side' ? 'px-4 py-4' : 'px-3 py-2.5'

  return (
    <div
      className={`flex flex-col ${gap} ${pad} w-full`}
      style={{ background: bg, color: text }}
    >
      <p className="font-bold leading-tight"
        style={{ fontSize: hSize, color: text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {headingText}
      </p>

      {bodyStr && (
        <p style={{ fontSize: bSize, color: text, opacity: 0.55, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          {bodyStr}
        </p>
      )}

      {wheelBlock && (
        <div className="flex items-center justify-center gap-1 py-0.5">
          {[...Array(6)].map((_, i) => (
            <div key={i}
              className="rounded-full"
              style={{
                width:  size === 'full' ? 16 : size === 'side' ? 12 : 8,
                height: size === 'full' ? 16 : size === 'side' ? 12 : 8,
                background: ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444'][i],
              }} />
          ))}
        </div>
      )}

      {inputBlock && (
        <div className="flex items-center px-2"
          style={{ height: iH, border: '1px solid #e5e7eb', borderRadius: fRadius, background: '#f9fafb' }}>
          <span style={{ fontSize: bSize, color: '#9ca3af', whiteSpace: 'nowrap', overflow: 'hidden' }}>{inputPh}</span>
        </div>
      )}

      {emailBlock && (
        <div className="flex items-center px-2"
          style={{ height: iH, border: '1px solid #e5e7eb', borderRadius: fRadius, background: '#f9fafb' }}>
          <span style={{ fontSize: bSize, color: '#9ca3af', whiteSpace: 'nowrap', overflow: 'hidden' }}>{emailPh}</span>
        </div>
      )}

      {phoneBlock && (
        <div className="flex items-center px-2"
          style={{ height: iH, border: '1px solid #e5e7eb', borderRadius: fRadius, background: '#f9fafb' }}>
          <span style={{ fontSize: bSize, color: '#9ca3af', whiteSpace: 'nowrap', overflow: 'hidden' }}>{phonePh}</span>
        </div>
      )}

      <div className="flex items-center justify-center"
        style={{ height: btnH, background: primary, borderRadius: btnRadius }}>
        <span style={{ fontSize: btnTxt, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '90%' }}>
          {btnLabel}
        </span>
      </div>

      {isMulti && (
        <div className="flex items-center justify-center gap-1 pt-0.5">
          {[0, 1].map(i => (
            <div key={i} className="rounded-full"
              style={{
                width:  i === 0 ? (size === 'full' ? 18 : size === 'side' ? 14 : 10) : (size === 'full' ? 9 : size === 'side' ? 7 : 5),
                height: size === 'full' ? 5 : size === 'side' ? 4 : 3,
                background: i === 0 ? primary : '#d1d5db',
              }} />
          ))}
        </div>
      )}
    </div>
  )
}

function TemplateMockup({ template }: { template: FormTemplate }) {
  const bg       = template.theme?.colors?.background   ?? '#ffffff'
  const radius   = template.theme?.modal?.radius        ?? '8px'
  const imgPos   = template.theme?.imagePosition        ?? 'top'
  const objPos   = template.theme?.imageObjectPosition  ?? 'center top'

  const firstImgBlock = template.config.blocks?.find(b => b.type === 'image' && b.props.src)
  const previewImg    = template.preview_image_url ?? (firstImgBlock?.props.src as string | undefined)

  if (!previewImg) {
    return (
      <div className="w-full h-full flex items-center justify-center"
        style={{ background: template.type === 'popup' ? '#e5e7eb' : bg }}>
        <div className="overflow-hidden shadow-xl"
          style={{ width: '80%', background: bg, borderRadius: radius, border: '1px solid rgba(0,0,0,0.08)' }}>
          <MiniFormCard template={template} size="full" />
        </div>
      </div>
    )
  }

  if (imgPos === 'background') {
    return (
      <div className="w-full h-full relative overflow-hidden">
        <img src={previewImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.42)' }} />
        <div className="absolute inset-3 overflow-hidden"
          style={{ borderRadius: radius, border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 6px 28px rgba(0,0,0,0.35)', background: bg }}>
          <MiniFormCard template={template} size="full" />
        </div>
      </div>
    )
  }

  if (imgPos === 'left') {
    return (
      <div className="w-full h-full flex overflow-hidden">
        <div className="w-[40%] shrink-0 overflow-hidden">
          <img src={previewImg} alt="" className="w-full h-full object-cover" style={{ objectPosition: objPos }} />
        </div>
        <div className="w-[60%] shrink-0 overflow-hidden flex flex-col justify-center" style={{ background: bg }}>
          <MiniFormCard template={template} size="side" />
        </div>
      </div>
    )
  }

  if (imgPos === 'right') {
    return (
      <div className="w-full h-full flex overflow-hidden">
        <div className="w-[60%] shrink-0 overflow-hidden flex flex-col justify-center" style={{ background: bg }}>
          <MiniFormCard template={template} size="side" />
        </div>
        <div className="w-[40%] shrink-0 overflow-hidden">
          <img src={previewImg} alt="" className="w-full h-full object-cover" style={{ objectPosition: objPos }} />
        </div>
      </div>
    )
  }

  // default: 'top'
  return (
    <div className="w-full h-full relative overflow-hidden" style={{ background: bg }}>
      <img src={previewImg} alt="" className="w-full object-cover" style={{ height: '45%' }} />
      <div className="absolute inset-x-0" style={{ top: '26%', height: '26%', background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.38))' }} />
      <div className="absolute inset-x-2 bottom-2 overflow-hidden"
        style={{ top: '38%', borderRadius: radius, border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.18)', background: bg }}>
        <MiniFormCard template={template} size="side" />
      </div>
    </div>
  )
}

// ── Type + goal badges ────────────────────────────────────────────────────────

const TYPE_COLOURS: Record<FormType, string> = {
  popup:        'bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300',
  embedded:     'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300',
  landing_page: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  flyout:       'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300',
}

const CHANNEL_LABELS: Record<ChannelMode, string> = {
  email_only: 'Email',
  sms_only:   'SMS',
  email_sms:  'Email + SMS',
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props { templates: FormTemplate[] }

export function FormsTemplateGallery({ templates }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [search,        setSearch]        = useState('')
  const [selectedGoals, setSelectedGoals] = useState<FormGoal[]>([])
  const [selectedTypes, setSelectedTypes] = useState<FormType[]>([])
  const [selectedChs,   setSelectedChs]   = useState<ChannelMode[]>([])
  const [multiStep,     setMultiStep]     = useState<boolean | null>(null)
  const [creatingId,    setCreatingId]    = useState<string | null>(null)
  const [createErr,     setCreateErr]     = useState<string | null>(null)

  // Filter templates client-side (server pre-fetched all)
  const filtered = useMemo(() => {
    return templates.filter(t => {
      if (search && !t.name.toLowerCase().includes(search.toLowerCase()) &&
          !t.description?.toLowerCase().includes(search.toLowerCase()) &&
          !t.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))) return false
      if (selectedGoals.length && !selectedGoals.includes(t.goal)) return false
      if (selectedTypes.length && !selectedTypes.includes(t.type)) return false
      if (selectedChs.length   && !selectedChs.includes(t.channel_mode)) return false
      if (multiStep !== null && t.is_multi_step !== multiStep) return false
      return true
    })
  }, [templates, search, selectedGoals, selectedTypes, selectedChs, multiStep])

  function toggleGoal(v: FormGoal) {
    setSelectedGoals(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v])
  }
  function toggleType(v: FormType) {
    setSelectedTypes(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v])
  }
  function toggleChannel(v: ChannelMode) {
    setSelectedChs(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v])
  }

  const activeFilters = selectedGoals.length + selectedTypes.length + selectedChs.length + (multiStep !== null ? 1 : 0)

  function clearAll() {
    setSelectedGoals([]); setSelectedTypes([]); setSelectedChs([]); setMultiStep(null)
  }

  async function handleUseTemplate(templateId: string) {
    const template = templates.find(t => t.id === templateId)
    if (!template) return
    setCreatingId(templateId)
    setCreateErr(null)
    startTransition(async () => {
      const result = await createFormFromTemplate(templateId, template.name)
      if (result.error) { setCreateErr(result.error); setCreatingId(null); return }
      if (result.form) router.push(`/dashboard/forms/${result.form.id}/edit`)
    })
  }

  return (
    <div className="flex h-full overflow-hidden bg-[#f0f0f2] dark:bg-gray-950">

      {/* ── Left filter sidebar ─────────────────────────────────── */}
      <div className="w-[240px] shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col overflow-hidden">

        <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Filters</span>
            {activeFilters > 0 && (
              <button
                onClick={clearAll}
                className="ml-auto flex items-center gap-1 text-[11px] text-brand-600 dark:text-brand-400 hover:underline"
              >
                <X className="w-3 h-3" />Clear all
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden px-3 py-4 space-y-6">

          {/* Goal */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Goal</p>
            <div className="space-y-0.5">
              {GOALS.map(g => (
                <button
                  key={g.value}
                  onClick={() => toggleGoal(g.value)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors',
                    selectedGoals.includes(g.value)
                      ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 font-medium'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                  )}
                >
                  <g.icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="flex-1 text-left text-xs">{g.label}</span>
                  {selectedGoals.includes(g.value) && (
                    <Check className="w-3 h-3 text-brand-500 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Form type */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Form type</p>
            <div className="space-y-0.5">
              {TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => toggleType(t.value)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors',
                    selectedTypes.includes(t.value)
                      ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 font-medium'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                  )}
                >
                  <t.icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="flex-1 text-left text-xs capitalize">{t.label}</span>
                  {selectedTypes.includes(t.value) && (
                    <Check className="w-3 h-3 text-brand-500 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Channel */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Channel</p>
            <div className="space-y-0.5">
              {CHANNELS.map(c => (
                <button
                  key={c.value}
                  onClick={() => toggleChannel(c.value)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors',
                    selectedChs.includes(c.value)
                      ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 font-medium'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                  )}
                >
                  <c.icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="flex-1 text-left text-xs">{c.label}</span>
                  {selectedChs.includes(c.value) && (
                    <Check className="w-3 h-3 text-brand-500 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Multi-step */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Features</p>
            <button
              onClick={() => setMultiStep(p => p === true ? null : true)}
              className={cn(
                'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-colors',
                multiStep === true
                  ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 font-medium'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
              )}
            >
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span className="flex-1 text-left">Multi-step</span>
              {multiStep === true && <Check className="w-3 h-3 text-brand-500 shrink-0" />}
            </button>
          </div>

        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

        {/* Top bar */}
        <div className="shrink-0 px-6 py-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center gap-4">
          <div>
            <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">Choose a template</h1>
            <p className="text-xs text-gray-400 mt-0.5">Pick a starting point — you can customise everything in the editor.</p>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 w-56">
              <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search templates…"
                className="flex-1 text-xs bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none"
              />
              {search && (
                <button onClick={() => setSearch('')}>
                  <X className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>

            {/* Start from scratch */}
            <button
              onClick={() => handleUseTemplate(templates.find(t => t.name === 'Blank' || t.tags.includes('blank'))?.id ?? templates[0]?.id ?? '')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Start from scratch
            </button>
          </div>
        </div>

        {/* Active filter chips */}
        {activeFilters > 0 && (
          <div className="shrink-0 px-6 py-2 flex items-center gap-2 flex-wrap border-b border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-900">
            {selectedGoals.map(g => (
              <span key={g} className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300">
                {GOALS.find(x => x.value === g)?.label}
                <button onClick={() => toggleGoal(g)}><X className="w-2.5 h-2.5" /></button>
              </span>
            ))}
            {selectedTypes.map(t => (
              <span key={t} className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300">
                {TYPES.find(x => x.value === t)?.label}
                <button onClick={() => toggleType(t)}><X className="w-2.5 h-2.5" /></button>
              </span>
            ))}
            {selectedChs.map(c => (
              <span key={c} className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300">
                {CHANNEL_LABELS[c]}
                <button onClick={() => toggleChannel(c)}><X className="w-2.5 h-2.5" /></button>
              </span>
            ))}
            {multiStep && (
              <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300">
                Multi-step
                <button onClick={() => setMultiStep(null)}><X className="w-2.5 h-2.5" /></button>
              </span>
            )}
          </div>
        )}

        {/* Error */}
        {createErr && (
          <div className="shrink-0 px-6 py-2 bg-red-50 dark:bg-red-500/10 border-b border-red-100 dark:border-red-500/20 text-xs text-red-600 dark:text-red-400">
            {createErr}
          </div>
        )}

        {/* Template grid (+ My Forms at top if any) */}
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden px-6 py-6">

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
              <LayoutTemplate className="w-10 h-10 text-gray-200 dark:text-white/10" />
              <p className="text-sm font-medium text-gray-500">No templates match your filters</p>
              <button onClick={clearAll} className="text-xs text-brand-600 hover:underline">Clear filters</button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-5">
              {filtered.map(template => (
                <div
                  key={template.id}
                  onClick={() => !isPending && handleUseTemplate(template.id)}
                  className="group relative flex flex-col rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden hover:border-brand-300 dark:hover:border-brand-600 hover:shadow-lg transition-all cursor-pointer"
                >
                  {/* Loading overlay */}
                  {creatingId === template.id && isPending && (
                    <div className="absolute inset-0 z-10 bg-white/80 dark:bg-gray-900/80 flex items-center justify-center rounded-2xl">
                      <Loader2 className="w-7 h-7 animate-spin text-brand-600" />
                    </div>
                  )}

                  {/* Preview area */}
                  <div className="h-[280px] bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <TemplateMockup template={template} />
                  </div>

                  {/* Info */}
                  <div className="flex flex-col p-4 gap-2">
                    <div className="flex items-start gap-2">
                      <p className="flex-1 text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug">{template.name}</p>
                      {template.is_multi_step && (
                        <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300">
                          Multi-step
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed line-clamp-2">
                      {template.description}
                    </p>

                    {/* Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={cn(
                        'text-[10px] font-medium px-1.5 py-0.5 rounded-md capitalize',
                        TYPE_COLOURS[template.type]
                      )}>
                        {template.type.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400">
                        {CHANNEL_LABELS[template.channel_mode]}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
