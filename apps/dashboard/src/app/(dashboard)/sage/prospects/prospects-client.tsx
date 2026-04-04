'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Plus, Search, Target, Trash2, ChevronDown, ChevronUp,
  Sparkles, MapPin, Globe, Mail, Phone, Check, X,
  Loader2, AlertCircle, Zap, Edit2, ArrowUpDown, Clock,
  Download, SlidersHorizontal, Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getIcpProfiles, createIcpProfile, updateIcpProfile, deleteIcpProfile,
  startProspectSearch, getProspectJob, getProspectResults,
  addProspectToPipeline, ignoreProspect, getRecentJobs,
  type IcpProfile, type ProspectCompany, type ProspectJob,
} from '@/app/actions/prospecting'

// ── Constants ─────────────────────────────────────────────────────────────────

const SERVICES = ['Website', 'SEO', 'Google Ads', 'Social Media', 'AI Chatbot', 'Branding', 'Email Marketing', 'Video']

const INDUSTRY_PRESETS = [
  // Healthcare
  'Dental Clinic', 'Medical Practice', 'Physiotherapy', 'Chiropractic', 'Optometry', 'Pharmacy', 'Veterinary',
  // Legal & Finance
  'Law Firm', 'Accounting', 'Financial Planning', 'Mortgage Broker', 'Insurance',
  // Trades & Construction
  'Plumber', 'Electrician', 'Builder', 'Painter', 'Roofer', 'HVAC', 'Landscaping', 'Cleaning Services',
  // Automotive
  'Car Dealership', 'Auto Mechanic', 'Panel Beater', 'Tyre Shop',
  // Hospitality & Retail
  'Restaurant', 'Cafe', 'Hotel', 'Retail Store', 'Clothing & Fashion',
  // Professional Services
  'Marketing Agency', 'IT Services', 'Real Estate Agency', 'Property Management',
  // Agriculture & Trade
  'Farming & Growers', 'Food Manufacturing', 'Import & Export', 'Wholesale & Distribution',
  // Beauty & Wellness
  'Hair Salon', 'Beauty Salon', 'Gym & Fitness', 'Spa & Massage',
  // Other
  'Transport & Logistics', 'Training & Education', 'Engineering',
]

const MARKET_SEGMENTS = [
  { value: 'b2b',  label: 'B2B',  desc: 'Sell to other businesses' },
  { value: 'b2c',  label: 'B2C',  desc: 'Sell to consumers'         },
  { value: 'both', label: 'Both', desc: 'Mixed audience'             },
] as const

const TIER: Record<string, { dot: string; bar: string; badge: string; label: string }> = {
  hot:       { dot: 'bg-emerald-400', bar: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20', label: 'Hot'     },
  warm:      { dot: 'bg-amber-400',   bar: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',             label: 'Warm'    },
  cold:      { dot: 'bg-slate-300',   bar: 'bg-slate-300',   badge: 'bg-gray-100 text-gray-500 border border-gray-200 dark:bg-white/5 dark:text-gray-400 dark:border-white/10',                         label: 'Cold'    },
  discarded: { dot: 'bg-gray-200',    bar: 'bg-gray-200',    badge: 'bg-gray-50 text-gray-400 border border-gray-100',                                                                                   label: 'Low fit' },
}

const JOB_STEPS   = ['searching', 'filtering', 'crawling', 'scoring', 'done'] as const
const JOB_LABELS: Record<string, string> = {
  pending:   'Starting…',
  searching: 'Searching web…',
  filtering: 'Filtering results…',
  crawling:  'Crawling websites…',
  scoring:   'Scoring companies…',
  done:      'Complete',
  failed:    'Failed',
}

type SortKey    = 'score' | 'company' | 'city' | 'country'
type TierFilter = 'all'   | 'hot'     | 'warm' | 'cold'

const COLUMNS = [
  { key: 'score',       label: 'Score',   defaultOn: true  },
  { key: 'city',        label: 'City',    defaultOn: true  },
  { key: 'country',     label: 'Country', defaultOn: true  },
  { key: 'description', label: 'About',   defaultOn: true  },
  { key: 'email',       label: 'Email',   defaultOn: true  },
  { key: 'phone',       label: 'Phone',   defaultOn: true  },
] as const

type ColKey = typeof COLUMNS[number]['key']

// ── Utilities ─────────────────────────────────────────────────────────────────

function CopyButton({ value, icon: Icon }: { value: string; icon: React.ElementType }) {
  const [copied, setCopied] = useState(false)
  function copy(e: React.MouseEvent) {
    e.stopPropagation()
    navigator.clipboard.writeText(value).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      onClick={copy}
      title={copied ? 'Copied!' : value}
      className="p-1.5 rounded-md text-gray-400 hover:text-[#15A4AE] hover:bg-[#15A4AE]/8 transition-colors"
    >
      {copied
        ? <Check className="w-3.5 h-3.5 text-emerald-500" />
        : <Icon className="w-3.5 h-3.5" />}
    </button>
  )
}

function ScoreBar({ score, tier }: { score: number; tier: string }) {
  const cfg = TIER[tier] ?? TIER.cold
  return (
    <div className="flex items-center gap-2">
      <div className="w-14 h-1.5 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden shrink-0">
        <div className={cn('h-full rounded-full', cfg.bar)} style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
      <span className="text-xs font-bold text-gray-700 dark:text-gray-300 tabular-nums">{score}</span>
    </div>
  )
}

// ── Tag input ─────────────────────────────────────────────────────────────────

function TagInput({ value, onChange, placeholder }: {
  value: string[]; onChange: (v: string[]) => void; placeholder: string
}) {
  const [input, setInput] = useState('')
  function add() {
    const v = input.trim()
    if (v && !value.includes(v)) onChange([...value, v])
    setInput('')
  }
  return (
    <div className="border border-gray-200 dark:border-white/10 rounded-lg p-2 flex flex-wrap gap-1 min-h-[38px] focus-within:ring-1 focus-within:ring-[#15A4AE]/60 focus-within:border-[#15A4AE]/50 bg-white dark:bg-white/5">
      {value.map(tag => (
        <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-[#15A4AE]/10 text-[#15A4AE] rounded text-[11px] font-medium">
          {tag}
          <button type="button" onClick={() => onChange(value.filter(v => v !== tag))} className="hover:text-red-500 transition-colors">
            <X className="w-2.5 h-2.5" />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() } }}
        onBlur={add}
        placeholder={value.length === 0 ? placeholder : '+ add'}
        className="flex-1 min-w-[80px] text-[11px] bg-transparent outline-none placeholder-gray-400 text-gray-800 dark:text-gray-200"
      />
    </div>
  )
}

// ── Filter section ────────────────────────────────────────────────────────────

function FilterSection({ label, count, defaultOpen = false, children }: {
  label: string; count?: number; defaultOpen?: boolean; children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-gray-50 dark:border-white/5">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
      >
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">{label}</span>
        <div className="flex items-center gap-1.5">
          {(count ?? 0) > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-[#15A4AE]/12 text-[#15A4AE] text-[9px] font-bold tabular-nums">{count}</span>
          )}
          {open
            ? <ChevronUp className="w-3 h-3 text-gray-400" />
            : <ChevronDown className="w-3 h-3 text-gray-400" />}
        </div>
      </button>
      {open && <div className="px-3 pb-3 pt-0.5">{children}</div>}
    </div>
  )
}

// ── ICP form modal ────────────────────────────────────────────────────────────

function IcpFormModal({ initial, onSave, onClose }: {
  initial?: Partial<IcpProfile>
  onSave:   (data: Omit<IcpProfile, 'id' | 'workspace_id' | 'is_active' | 'created_at' | 'updated_at'>) => Promise<void>
  onClose:  () => void
}) {
  const [name,      setName]      = useState(initial?.name ?? '')
  const [industry,  setIndustry]  = useState(initial?.industry ?? '')
  const [segment,   setSegment]   = useState<'b2b' | 'b2c' | 'both'>(initial?.market_segment ?? 'both')
  const [keywords,  setKeywords]  = useState<string[]>(initial?.target_keywords ?? [])
  const [locations, setLocations] = useState<string[]>(initial?.locations ?? [])
  const [excludes,  setExcludes]  = useState<string[]>(initial?.exclude_keywords ?? [])
  const [services,  setServices]  = useState<string[]>(initial?.services_of_interest ?? [])
  const [saving,    setSaving]    = useState(false)

  function toggle(svc: string) {
    setServices(p => p.includes(svc) ? p.filter(s => s !== svc) : [...p, svc])
  }

  async function submit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!name.trim() || !industry.trim()) return
    setSaving(true)
    await onSave({
      name:                 name.trim(),
      industry:             industry.trim(),
      market_segment:       segment,
      target_keywords:      keywords,
      locations,
      exclude_keywords:     excludes,
      services_of_interest: services,
    })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#232323] rounded-2xl shadow-2xl border border-gray-200/60 dark:border-white/8 w-full max-w-md flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/8 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">
              {initial?.id ? 'Edit Search Profile' : 'New Search Profile'}
            </h2>
            <p className="text-sm text-gray-400 mt-0.5">Define who you're targeting to score and rank results</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={submit} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Profile Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Sydney Dental Clinics"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 focus:border-[#15A4AE]" />
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Industry *</label>
            <input
              list="industry-presets"
              value={industry}
              onChange={e => setIndustry(e.target.value)}
              required
              placeholder="Type or choose an industry…"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 focus:border-[#15A4AE]"
            />
            <datalist id="industry-presets">
              {INDUSTRY_PRESETS.map(i => <option key={i} value={i} />)}
            </datalist>
            <p className="text-xs text-gray-400 mt-1">Choose from the list or type your own</p>
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Market Segment</label>
            <div className="flex gap-2">
              {MARKET_SEGMENTS.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSegment(s.value)}
                  className={cn(
                    'flex-1 py-2 rounded-xl border text-sm font-medium transition-colors text-center',
                    segment === s.value
                      ? 'bg-[#15A4AE] border-[#15A4AE] text-white'
                      : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-[#15A4AE]/50',
                  )}
                >
                  <span className="block font-bold">{s.label}</span>
                  <span className="block text-[10px] opacity-70 mt-0.5">{s.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Target Keywords</label>
            <TagInput value={keywords} onChange={setKeywords} placeholder="cosmetic dentist, implants…" />
            <p className="text-xs text-gray-400 mt-1">Press Enter after each keyword</p>
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Target Locations *</label>
            <TagInput value={locations} onChange={setLocations} placeholder="Sydney, Parramatta, Melbourne…" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Exclude Keywords</label>
            <TagInput value={excludes} onChange={setExcludes} placeholder="courses, jobs, directory…" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Services You Offer</label>
            <div className="flex flex-wrap gap-1.5">
              {SERVICES.map(svc => (
                <button key={svc} type="button" onClick={() => toggle(svc)}
                  className={cn('px-2.5 py-1 text-[11px] font-medium rounded-full border transition-colors',
                    services.includes(svc)
                      ? 'bg-[#15A4AE] text-white border-[#15A4AE]'
                      : 'bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:border-[#15A4AE]/50',
                  )}>
                  {svc}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-white/8">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors font-medium">
              Cancel
            </button>
            <button type="submit" disabled={saving || !name.trim() || !industry.trim()}
              className="flex-1 px-4 py-2 text-sm font-semibold bg-[#15A4AE] hover:bg-[#0e8b94] text-white rounded-xl transition-colors disabled:opacity-50">
              {saving ? 'Saving…' : initial?.id ? 'Save Changes' : 'Create Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Prospect table row ────────────────────────────────────────────────────────

function ProspectRow({ prospect, cols, onAdd, onIgnore }: {
  prospect: ProspectCompany
  cols:     Set<ColKey>
  onAdd:    (id: string) => Promise<unknown>
  onIgnore: (id: string) => Promise<unknown>
}) {
  const [busy,    setBusy]    = useState(false)
  const [pushed,  setPushed]  = useState(!!prospect.deal_id)
  const [ignored, setIgnored] = useState(prospect.status === 'ignored')

  if (ignored) return null

  const tier = prospect.score_tier ?? 'cold'
  const cfg  = TIER[tier] ?? TIER.cold
  const name = prospect.company_name ?? prospect.title ?? prospect.domain
  const desc = prospect.description ?? prospect.snippet
  const email = prospect.email_1 ?? prospect.emails?.[0] ?? null
  const phone = prospect.phone_1 ?? prospect.phones?.[0] ?? null

  async function handleAdd() {
    setBusy(true)
    await onAdd(prospect.id)
    setPushed(true)
    setBusy(false)
  }

  async function handleIgnore() {
    setBusy(true)
    await onIgnore(prospect.id)
    setIgnored(true)
    setBusy(false)
  }

  return (
    <tr className="group border-b border-gray-50 dark:border-white/[0.04] hover:bg-gray-50/70 dark:hover:bg-white/[0.025] transition-colors">

      {/* Tier dot */}
      <td className="pl-5 pr-2 py-3.5 w-3 shrink-0">
        <div className={cn('w-2 h-2 rounded-full', cfg.dot)} title={cfg.label} />
      </td>

      {/* Company — always visible */}
      <td className="px-3 py-3.5" style={{ minWidth: 180, maxWidth: 220 }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-white/8 border border-gray-200/60 dark:border-white/8 flex items-center justify-center shrink-0 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://www.google.com/s2/favicons?domain=${prospect.domain}&sz=32`}
              alt=""
              className="w-4 h-4 object-contain"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate leading-snug">{name}</p>
            <a
              href={`https://${prospect.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-[11px] text-gray-400 hover:text-[#15A4AE] transition-colors flex items-center gap-0.5 mt-0.5"
            >
              <Globe className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate">{prospect.domain}</span>
            </a>
          </div>
        </div>
      </td>

      {/* Score */}
      {cols.has('score') && (
        <td className="px-3 py-3.5 w-36 shrink-0">
          <div className="space-y-1.5">
            {prospect.score != null && <ScoreBar score={prospect.score} tier={tier} />}
            <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-bold inline-block', cfg.badge)}>
              {cfg.label}
            </span>
          </div>
        </td>
      )}

      {/* City */}
      {cols.has('city') && (
        <td className="px-3 py-3.5 w-28 shrink-0">
          {prospect.city ? (
            <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
              <MapPin className="w-3 h-3 shrink-0 text-gray-400" />
              <span className="truncate">{prospect.city}</span>
            </span>
          ) : (
            <span className="text-sm text-gray-300 dark:text-gray-600">—</span>
          )}
        </td>
      )}

      {/* Country */}
      {cols.has('country') && (
        <td className="px-3 py-3.5 w-28 shrink-0">
          {prospect.country ? (
            <span className="text-sm text-gray-600 dark:text-gray-400 truncate">{prospect.country}</span>
          ) : (
            <span className="text-sm text-gray-300 dark:text-gray-600">—</span>
          )}
        </td>
      )}

      {/* Description */}
      {cols.has('description') && (
        <td className="px-3 py-3.5" style={{ maxWidth: 240 }}>
          {desc ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">{desc}</p>
          ) : (
            <span className="text-sm text-gray-300 dark:text-gray-600">—</span>
          )}
        </td>
      )}

      {/* Email */}
      {cols.has('email') && (
        <td className="px-3 py-3.5 w-10 shrink-0">
          {email
            ? <CopyButton value={email} icon={Mail} />
            : <span className="text-xs text-gray-300 dark:text-gray-600 pl-1">—</span>}
        </td>
      )}

      {/* Phone */}
      {cols.has('phone') && (
        <td className="px-3 py-3.5 w-10 shrink-0">
          {phone
            ? <CopyButton value={phone} icon={Phone} />
            : <span className="text-xs text-gray-300 dark:text-gray-600 pl-1">—</span>}
        </td>
      )}

      {/* Actions */}
      <td className="px-4 py-3.5 w-36 shrink-0 text-right">
        {pushed ? (
          <span className="inline-flex items-center gap-1 text-sm text-[#15A4AE] font-semibold">
            <Check className="w-3.5 h-3.5" /> In pipeline
          </span>
        ) : (
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={handleIgnore} disabled={busy} title="Ignore"
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleAdd} disabled={busy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-[#15A4AE] hover:bg-[#0e8b94] text-white rounded-lg transition-colors disabled:opacity-50">
              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
              Add
            </button>
          </div>
        )}
      </td>
    </tr>
  )
}

// ── Job progress strip ────────────────────────────────────────────────────────

function JobProgressStrip({ job }: { job: ProspectJob }) {
  const idx      = JOB_STEPS.indexOf(job.status as typeof JOB_STEPS[number])
  const isDone   = job.status === 'done'
  const isFailed = job.status === 'failed'

  return (
    <div className={cn(
      'flex items-center gap-4 px-5 py-2.5 border-b text-xs shrink-0',
      isFailed ? 'bg-red-50 dark:bg-red-500/5 border-red-100 dark:border-red-500/10' :
      isDone   ? 'bg-emerald-50/60 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/10' :
                 'bg-[#15A4AE]/4 border-[#15A4AE]/15',
    )}>
      <div className="flex items-center gap-1.5 shrink-0">
        {!isDone && !isFailed && <Loader2 className="w-3.5 h-3.5 text-[#15A4AE] animate-spin" />}
        {isDone   && <Check className="w-3.5 h-3.5 text-emerald-500" />}
        {isFailed && <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
        <span className={cn('font-medium',
          isFailed ? 'text-red-600 dark:text-red-400' :
          isDone   ? 'text-emerald-700 dark:text-emerald-400' :
                     'text-gray-700 dark:text-gray-300',
        )}>
          {JOB_LABELS[job.status] ?? job.status}
        </span>
      </div>

      <div className="flex items-center gap-0.5 flex-1 max-w-[160px]">
        {JOB_STEPS.slice(0, -1).map((step, i) => (
          <div key={step} className="flex items-center gap-0.5 flex-1">
            <div className={cn('w-1.5 h-1.5 rounded-full shrink-0 transition-colors',
              i < idx  ? 'bg-[#15A4AE]' :
              i === idx ? 'bg-[#15A4AE] animate-pulse' :
              'bg-gray-200 dark:bg-white/10',
            )} />
            {i < JOB_STEPS.length - 2 && (
              <div className={cn('flex-1 h-px', i < idx ? 'bg-[#15A4AE]/50' : 'bg-gray-200 dark:bg-white/10')} />
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
        {job.stats.found    > 0 && <span>Found <strong className="text-gray-700 dark:text-gray-200 font-semibold">{job.stats.found}</strong></span>}
        {job.stats.relevant > 0 && <span>Relevant <strong className="text-gray-700 dark:text-gray-200 font-semibold">{job.stats.relevant}</strong></span>}
        {job.stats.crawled  > 0 && <span>Crawled <strong className="text-gray-700 dark:text-gray-200 font-semibold">{job.stats.crawled}</strong></span>}
        {job.stats.pushed   > 0 && <span>Pushed <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">{job.stats.pushed}</strong></span>}
      </div>

      {isFailed && job.error && (
        <span className="text-red-500 dark:text-red-400 truncate max-w-[240px]">{job.error}</span>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  initialProfiles:   IcpProfile[]
  initialRecentJobs: ProspectJob[]
}

export function ProspectsClient({ initialProfiles, initialRecentJobs }: Props) {
  const [profiles,      setProfiles]      = useState<IcpProfile[]>(initialProfiles)
  const [selectedIcp,   setSelectedIcp]   = useState<IcpProfile | null>(initialProfiles[0] ?? null)
  const [icpModal,      setIcpModal]      = useState<'create' | 'edit' | null>(
    initialProfiles.length === 0 ? 'create' : null,
  )
  const [editingIcp,    setEditingIcp]    = useState<IcpProfile | null>(null)
  const [showIcpPicker, setShowIcpPicker] = useState(false)
  const icpPickerRef = useRef<HTMLDivElement>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [location,    setLocation]    = useState(initialProfiles[0]?.locations[0] ?? '')
  const [running,     setRunning]     = useState(false)
  const [activeJob,   setActiveJob]   = useState<ProspectJob | null>(null)
  const [results,     setResults]     = useState<ProspectCompany[]>([])
  const [recentJobs,  setRecentJobs]  = useState<ProspectJob[]>(initialRecentJobs)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [tierFilter,    setTierFilter]    = useState<TierFilter>('all')
  const [tableSearch,   setTableSearch]   = useState('')
  const [sortKey,       setSortKey]       = useState<SortKey>('score')
  const [sortDir,       setSortDir]       = useState<'asc' | 'desc'>('desc')
  const [cols,          setCols]          = useState<Set<ColKey>>(
    () => new Set(COLUMNS.filter(c => c.defaultOn).map(c => c.key))
  )
  const [showColPicker, setShowColPicker] = useState(false)
  const [filterHasEmail,  setFilterHasEmail]  = useState(false)
  const [filterHasPhone,  setFilterHasPhone]  = useState(false)
  const [filterCity,      setFilterCity]      = useState('')
  const [filterCountry,   setFilterCountry]   = useState('')
  const [filterScoreMin,  setFilterScoreMin]  = useState(0)
  const [showFieldFilter, setShowFieldFilter] = useState(false)

  // ── Effects ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (selectedIcp?.locations[0]) setLocation(selectedIcp.locations[0])
  }, [selectedIcp?.id])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (icpPickerRef.current && !icpPickerRef.current.contains(e.target as Node)) {
        setShowIcpPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Polling ──────────────────────────────────────────────────────────────────
  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }, [])

  const startPolling = useCallback((jobId: string) => {
    stopPolling()
    pollRef.current = setInterval(async () => {
      const job = await getProspectJob(jobId)
      if (!job) return
      setActiveJob(job)
      if (job.status === 'done' || job.status === 'failed') {
        stopPolling()
        setRunning(false)
        if (job.status === 'done') {
          const res = await getProspectResults(jobId)
          setResults(res)
        }
      }
    }, 3000)
  }, [stopPolling])

  useEffect(() => () => stopPolling(), [stopPolling])

  // ── Handlers ─────────────────────────────────────────────────────────────────
  async function handleCreateIcp(data: Omit<IcpProfile, 'id' | 'workspace_id' | 'is_active' | 'created_at' | 'updated_at'>) {
    const result = await createIcpProfile(data)
    if (result.id) {
      const updated = await getIcpProfiles()
      setProfiles(updated)
      const created = updated.find(p => p.id === result.id)
      if (created) setSelectedIcp(created)
      setIcpModal(null)
    }
  }

  async function handleUpdateIcp(data: Omit<IcpProfile, 'id' | 'workspace_id' | 'is_active' | 'created_at' | 'updated_at'>) {
    if (!editingIcp) return
    await updateIcpProfile(editingIcp.id, data)
    const updated = await getIcpProfiles()
    setProfiles(updated)
    setSelectedIcp(updated.find(p => p.id === editingIcp.id) ?? null)
    setEditingIcp(null)
    setIcpModal(null)
  }

  async function handleDeleteIcp(id: string) {
    if (!confirm('Delete this ICP profile? This cannot be undone.')) return
    await deleteIcpProfile(id)
    const updated = await getIcpProfiles()
    setProfiles(updated)
    setSelectedIcp(updated[0] ?? null)
    setShowIcpPicker(false)
  }

  async function handleStartSearch() {
    if (!selectedIcp || !searchQuery.trim()) return
    setRunning(true)
    setResults([])
    setActiveJob(null)
    setTierFilter('all')
    setTableSearch('')
    const { jobId, error } = await startProspectSearch(selectedIcp.id, searchQuery, location)
    if (error || !jobId) { setRunning(false); return }
    const job = await getProspectJob(jobId)
    if (job) setActiveJob(job)
    startPolling(jobId)
    const updated = await getRecentJobs(selectedIcp.id)
    setRecentJobs(updated)
  }

  async function loadRecentJob(job: ProspectJob) {
    setActiveJob(job)
    if (job.status === 'done') {
      const res = await getProspectResults(job.id)
      setResults(res)
    } else if (job.status !== 'failed') {
      setRunning(true)
      startPolling(job.id)
    }
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir(key === 'score' ? 'desc' : 'asc') }
  }

  function toggleCol(key: ColKey) {
    setCols(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function exportCsv() {
    const headers = ['company_name', 'domain', 'city', 'state', 'country', 'email_1', 'phone_1', 'score', 'score_tier', 'description']
    const rows = visible.map(r => [
      r.company_name ?? '',
      r.domain,
      r.city    ?? '',
      r.state   ?? '',
      r.country ?? '',
      r.email_1 ?? r.emails?.[0] ?? '',
      r.phone_1 ?? r.phones?.[0] ?? '',
      r.score   ?? '',
      r.score_tier ?? '',
      (r.description ?? '').replace(/"/g, '""'),
    ].map(v => `"${v}"`).join(','))
    const csv  = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `prospects-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const activeFieldFilters = filterHasEmail || filterHasPhone || filterCity.trim() || filterCountry.trim() || filterScoreMin > 0

  // ── Derived ──────────────────────────────────────────────────────────────────
  const visible = results
    .filter(r => r.status !== 'ignored')
    .filter(r => {
      if (tierFilter === 'all')  return true
      if (tierFilter === 'hot')  return r.score_tier === 'hot'
      if (tierFilter === 'warm') return r.score_tier === 'warm'
      if (tierFilter === 'cold') return r.score_tier === 'cold' || r.score_tier === 'discarded'
      return true
    })
    .filter(r => {
      if (!tableSearch.trim()) return true
      const q = tableSearch.toLowerCase()
      return (
        (r.company_name ?? '').toLowerCase().includes(q) ||
        r.domain.toLowerCase().includes(q) ||
        (r.city ?? '').toLowerCase().includes(q) ||
        (r.country ?? '').toLowerCase().includes(q) ||
        (r.email_1 ?? '').toLowerCase().includes(q)
      )
    })
    .filter(r => !filterHasEmail  || !!(r.email_1 ?? r.emails?.[0]))
    .filter(r => !filterHasPhone  || !!(r.phone_1 ?? r.phones?.[0]))
    .filter(r => !filterCity.trim()    || (r.city ?? '').toLowerCase().includes(filterCity.toLowerCase()))
    .filter(r => !filterCountry.trim() || (r.country ?? '').toLowerCase().includes(filterCountry.toLowerCase()))
    .filter(r => filterScoreMin === 0  || (r.score ?? 0) >= filterScoreMin)
    .sort((a, b) => {
      let cmp = 0
      if (sortKey === 'score')   cmp = (a.score ?? 0) - (b.score ?? 0)
      if (sortKey === 'company') cmp = (a.company_name ?? a.domain).localeCompare(b.company_name ?? b.domain)
      if (sortKey === 'city')    cmp = (a.city ?? '').localeCompare(b.city ?? '')
      if (sortKey === 'country') cmp = (a.country ?? '').localeCompare(b.country ?? '')
      return sortDir === 'desc' ? -cmp : cmp
    })

  const hotCount  = results.filter(r => r.score_tier === 'hot'  && r.status !== 'ignored').length
  const warmCount = results.filter(r => r.score_tier === 'warm' && r.status !== 'ignored').length
  const coldCount = results.filter(r => (r.score_tier === 'cold' || r.score_tier === 'discarded') && r.status !== 'ignored').length
  const total     = hotCount + warmCount + coldCount

  const hasActiveFilters = !!(searchQuery.trim() || location.trim())

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      {icpModal === 'create' && (
        <IcpFormModal onSave={handleCreateIcp} onClose={() => setIcpModal(null)} />
      )}
      {icpModal === 'edit' && editingIcp && (
        <IcpFormModal initial={editingIcp} onSave={handleUpdateIcp} onClose={() => { setIcpModal(null); setEditingIcp(null) }} />
      )}

      <div className="flex h-full w-full gap-3 p-3 bg-[#f5f4f1] dark:bg-[#1c1c1c]">

        {/* ── LEFT: Filter sidebar ─────────────────────────────────────────────── */}
        <div className="w-64 shrink-0 flex flex-col bg-white dark:bg-[#181818] rounded-2xl shadow-xl border border-gray-200/60 dark:border-white/8 overflow-hidden">

          {/* Dark header — matches Sage list column headers */}
          <div className="px-3 py-2.5 bg-[#141c2b] border-b border-white/10 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">Prospects</h2>
                <p className="text-[10px] text-white/50">Search Profiles</p>
              </div>
              <button
                onClick={() => setIcpModal('create')}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                title="New search profile"
              >
                <Plus className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          </div>

          {/* Profile selector */}
          <div className="px-3 py-2.5 border-b border-gray-50 dark:border-white/5 shrink-0" ref={icpPickerRef}>

            {selectedIcp ? (
              /* Selected state: name + always-visible edit + switch chevron */
              <div className="relative">
                <div className="flex items-center gap-1.5">
                  {/* Profile name — click to switch */}
                  <button
                    onClick={() => setShowIcpPicker(o => !o)}
                    className="flex-1 text-left min-w-0 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8 transition-colors"
                  >
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate leading-snug">{selectedIcp.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-xs text-gray-400 capitalize truncate">{selectedIcp.industry}</p>
                      {selectedIcp.market_segment && selectedIcp.market_segment !== 'both' && (
                        <span className="shrink-0 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#15A4AE]/10 text-[#15A4AE]">
                          {selectedIcp.market_segment}
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Always-visible Edit button */}
                  <button
                    onClick={() => { setEditingIcp(selectedIcp); setIcpModal('edit') }}
                    title="Edit profile — add keywords, locations & services"
                    className="p-2 rounded-lg text-gray-400 hover:text-[#15A4AE] hover:bg-[#15A4AE]/8 transition-colors shrink-0"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {/* Switch profile chevron */}
                  <button
                    onClick={() => setShowIcpPicker(o => !o)}
                    className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors shrink-0"
                    title="Switch profile"
                  >
                    <ChevronDown className={cn('w-4 h-4 transition-transform duration-150', showIcpPicker && 'rotate-180')} />
                  </button>
                </div>

                {showIcpPicker && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 z-20 bg-white dark:bg-[#232323] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden">
                    {profiles.map(p => (
                      <div key={p.id} className="flex items-center group/item border-b border-gray-50 dark:border-white/5 last:border-0">
                        <button
                          onClick={() => { setSelectedIcp(p); setShowIcpPicker(false) }}
                          className={cn(
                            'flex-1 text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors',
                            selectedIcp?.id === p.id && 'bg-[#15A4AE]/5',
                          )}
                        >
                          <div className="flex items-center gap-1.5">
                            {selectedIcp?.id === p.id && <div className="w-1.5 h-1.5 rounded-full bg-[#15A4AE] shrink-0" />}
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{p.name}</p>
                          </div>
                          <p className="text-xs text-gray-400 capitalize mt-0.5 pl-3">
                            {p.industry}
                            {p.market_segment && p.market_segment !== 'both' && ` · ${p.market_segment.toUpperCase()}`}
                            {p.locations.length > 0 && ` · ${p.locations.slice(0, 2).join(', ')}`}
                          </p>
                        </button>
                        <div className="flex items-center gap-0.5 px-2 opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0">
                          <button
                            onClick={e => { e.stopPropagation(); setEditingIcp(p); setIcpModal('edit'); setShowIcpPicker(false) }}
                            className="p-1 rounded text-gray-400 hover:text-[#15A4AE] transition-colors" title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handleDeleteIcp(p.id) }}
                            className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors" title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* No profile selected */
              <div className="relative">
                <button
                  onClick={() => setShowIcpPicker(o => !o)}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.04] hover:bg-gray-100 dark:hover:bg-white/[0.07] text-left transition-colors"
                >
                  <p className="text-sm text-gray-400">Select a profile…</p>
                  <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform duration-150', showIcpPicker && 'rotate-180')} />
                </button>
                {showIcpPicker && profiles.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 z-20 bg-white dark:bg-[#232323] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden">
                    {profiles.map(p => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedIcp(p); setShowIcpPicker(false) }}
                        className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b border-gray-50 dark:border-white/5 last:border-0"
                      >
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{p.name}</p>
                        <p className="text-xs text-gray-400 capitalize mt-0.5">{p.industry}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Filter sections */}
          <div className="flex-1 overflow-y-auto">
            {selectedIcp ? (
              <>
                <FilterSection label="Search" defaultOpen count={searchQuery || location ? 1 : 0}>
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <input
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !running) handleStartSearch() }}
                        placeholder={`${selectedIcp.industry} near me`}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/60 focus:border-[#15A4AE]/50"
                      />
                    </div>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <input
                        value={location}
                        onChange={e => setLocation(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !running) handleStartSearch() }}
                        placeholder="City or suburb…"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/60 focus:border-[#15A4AE]/50"
                      />
                    </div>
                  </div>
                </FilterSection>

                <FilterSection label="Keywords" count={selectedIcp.target_keywords.length}>
                  {selectedIcp.target_keywords.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {selectedIcp.target_keywords.map(k => (
                        <span key={k} className="px-2 py-0.5 text-xs rounded-full bg-[#15A4AE]/10 text-[#15A4AE] font-medium">{k}</span>
                      ))}
                    </div>
                  ) : (
                    <button onClick={() => { setEditingIcp(selectedIcp); setIcpModal('edit') }}
                      className="text-sm text-[#15A4AE] hover:underline">+ Add keywords</button>
                  )}
                </FilterSection>

                <FilterSection label="Locations" count={selectedIcp.locations.length}>
                  {selectedIcp.locations.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {selectedIcp.locations.map(l => (
                        <span key={l} className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-400">{l}</span>
                      ))}
                    </div>
                  ) : (
                    <button onClick={() => { setEditingIcp(selectedIcp); setIcpModal('edit') }}
                      className="text-sm text-[#15A4AE] hover:underline">+ Add locations</button>
                  )}
                </FilterSection>

                <FilterSection label="Services" count={selectedIcp.services_of_interest.length}>
                  {selectedIcp.services_of_interest.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {selectedIcp.services_of_interest.map(s => (
                        <span key={s} className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-400">{s}</span>
                      ))}
                    </div>
                  ) : (
                    <button onClick={() => { setEditingIcp(selectedIcp); setIcpModal('edit') }}
                      className="text-sm text-[#15A4AE] hover:underline">+ Add services</button>
                  )}
                </FilterSection>

                <FilterSection label="Exclude" count={selectedIcp.exclude_keywords.length}>
                  {selectedIcp.exclude_keywords.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {selectedIcp.exclude_keywords.map(ex => (
                        <span key={ex} className="px-2 py-0.5 text-xs rounded-full bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400">{ex}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">None set</p>
                  )}
                </FilterSection>

                <FilterSection label="Recent Searches" count={recentJobs.length}>
                  {recentJobs.length > 0 ? (
                    <div className="space-y-0.5">
                      {recentJobs.slice(0, 5).map(job => (
                        <button key={job.id} onClick={() => loadRecentJob(job)}
                          className="w-full text-left px-2 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group/job">
                          <div className="flex items-start gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm text-gray-700 dark:text-gray-300 font-medium truncate group-hover/job:text-[#15A4AE] transition-colors">{job.search_query}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={cn('text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full',
                                  job.status === 'done'   ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' :
                                  job.status === 'failed' ? 'bg-red-100 text-red-500' :
                                  'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
                                )}>{job.status}</span>
                                {job.status === 'done' && job.stats.pushed > 0 && (
                                  <span className="text-xs text-gray-400">{job.stats.pushed} pushed</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">No searches yet</p>
                  )}
                </FilterSection>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-3">
                  <Target className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">No profile yet</p>
                <p className="text-sm text-gray-400 mt-1 leading-relaxed">Define who you're targeting to start finding prospects</p>
                <button onClick={() => setIcpModal('create')}
                  className="mt-3 px-3 py-1.5 text-sm font-semibold bg-[#15A4AE] hover:bg-[#0e8b94] text-white rounded-lg transition-colors">
                  Create Profile
                </button>
              </div>
            )}
          </div>

          {/* Find Prospects CTA */}
          {selectedIcp && (
            <div className="px-3 py-3 border-t border-gray-100 dark:border-white/8 shrink-0">
              <button
                onClick={handleStartSearch}
                disabled={!!running || !searchQuery.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-[#15A4AE] hover:bg-[#0e8b94] text-white rounded-xl transition-colors disabled:opacity-50 shadow-sm shadow-[#15A4AE]/20"
              >
                {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {running ? 'Running…' : 'Find Prospects'}
              </button>
              <p className="text-[10px] text-gray-400 text-center mt-1.5">
                ~20 companies · ~$2–4 per run
              </p>
            </div>
          )}
        </div>

        {/* ── CENTER: Results ──────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#232323] rounded-2xl shadow-xl border border-gray-200/60 dark:border-white/8 overflow-hidden">

          {/* Toolbar */}
          <div className="shrink-0 px-4 py-2.5 border-b border-gray-100 dark:border-white/8 flex items-center gap-3 flex-wrap">

            {/* Tier filter pills */}
            <div className="flex items-center gap-1">
              {([
                { key: 'all',  label: 'All',  count: total,     dot: '' },
                { key: 'hot',  label: 'Hot',  count: hotCount,  dot: 'bg-emerald-400' },
                { key: 'warm', label: 'Warm', count: warmCount, dot: 'bg-amber-400'   },
                { key: 'cold', label: 'Cold', count: coldCount, dot: 'bg-slate-300'   },
              ] as const).map(({ key, label, count, dot }) => (
                <button key={key} onClick={() => setTierFilter(key)}
                  className={cn('flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-full font-medium transition-colors',
                    tierFilter === key ? 'bg-[#15A4AE] text-white' : 'bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/12',
                  )}>
                  {dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dot)} />}
                  {label}
                  {results.length > 0 && (
                    <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full tabular-nums font-bold',
                      tierFilter === key ? 'bg-white/25' : 'bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400',
                    )}>{count}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="w-px h-4 bg-gray-200 dark:bg-white/10" />

            {/* Table search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input value={tableSearch} onChange={e => setTableSearch(e.target.value)}
                placeholder="Search company, city, email…"
                className="pl-9 pr-8 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/50 w-52"
              />
              {tableSearch && (
                <button onClick={() => setTableSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Field filter toggle */}
            <button
              onClick={() => setShowFieldFilter(f => !f)}
              title="Field filters"
              className={cn('flex items-center gap-1.5 px-2.5 py-2 text-[11px] rounded-lg font-medium border transition-colors',
                showFieldFilter || activeFieldFilters
                  ? 'bg-[#15A4AE]/10 border-[#15A4AE]/30 text-[#15A4AE]'
                  : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-gray-300',
              )}>
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filters
              {activeFieldFilters && <span className="w-1.5 h-1.5 rounded-full bg-[#15A4AE] shrink-0" />}
            </button>

            <div className="flex-1" />

            {/* Sort */}
            {results.length > 0 && (
              <div className="flex items-center gap-1">
                {([
                  { key: 'score',   label: 'Score'   },
                  { key: 'company', label: 'Company' },
                  { key: 'city',    label: 'City'    },
                  { key: 'country', label: 'Country' },
                ] as { key: SortKey; label: string }[]).map(({ key, label }) => (
                  <button key={key} onClick={() => toggleSort(key)}
                    className={cn('flex items-center gap-1 px-2 py-1 text-[11px] rounded-lg font-medium transition-colors',
                      sortKey === key ? 'text-[#15A4AE] bg-[#15A4AE]/8' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8',
                    )}>
                    <ArrowUpDown className="w-3 h-3" />
                    {label}
                    {sortKey === key && <span className="text-[9px]">{sortDir === 'desc' ? '↓' : '↑'}</span>}
                  </button>
                ))}
              </div>
            )}

            {/* CSV export */}
            {visible.length > 0 && (
              <button onClick={exportCsv} title="Export to CSV"
                className="p-2 rounded-lg text-gray-400 hover:text-[#15A4AE] hover:bg-[#15A4AE]/8 border border-gray-200 dark:border-white/10 transition-colors">
                <Download className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Column visibility */}
            <div className="relative">
              <button onClick={() => setShowColPicker(o => !o)} title="Show/hide columns"
                className="p-2 rounded-lg text-gray-400 hover:text-[#15A4AE] hover:bg-[#15A4AE]/8 border border-gray-200 dark:border-white/10 transition-colors">
                <Building2 className="w-3.5 h-3.5" />
              </button>
              {showColPicker && (
                <div className="absolute right-0 top-full mt-1.5 z-30 bg-white dark:bg-[#232323] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl p-3 w-44 space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-2">Columns</p>
                  {COLUMNS.map(c => (
                    <label key={c.key} className="flex items-center gap-2 cursor-pointer group/col">
                      <input type="checkbox" checked={cols.has(c.key)} onChange={() => toggleCol(c.key)}
                        className="w-3.5 h-3.5 accent-[#15A4AE]" />
                      <span className="text-sm text-gray-700 dark:text-gray-300 group-hover/col:text-[#15A4AE] transition-colors">{c.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Field filter bar */}
          {showFieldFilter && (
            <div className="shrink-0 px-4 py-3 border-b border-gray-100 dark:border-white/8 flex items-center gap-3 flex-wrap bg-gray-50/60 dark:bg-white/[0.015]">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Filter by field:</span>

              <button onClick={() => setFilterHasEmail(f => !f)}
                className={cn('flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] rounded-lg border font-medium transition-colors',
                  filterHasEmail ? 'bg-[#15A4AE] text-white border-[#15A4AE]' : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-[#15A4AE]/50',
                )}>
                <Mail className="w-3 h-3" /> Has Email
              </button>

              <button onClick={() => setFilterHasPhone(f => !f)}
                className={cn('flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] rounded-lg border font-medium transition-colors',
                  filterHasPhone ? 'bg-[#15A4AE] text-white border-[#15A4AE]' : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-[#15A4AE]/50',
                )}>
                <Phone className="w-3 h-3" /> Has Phone
              </button>

              <div className="relative">
                <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                <input value={filterCity} onChange={e => setFilterCity(e.target.value)} placeholder="City…"
                  className="pl-7 pr-3 py-1.5 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/50 w-32" />
              </div>

              <div className="relative">
                <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                <input value={filterCountry} onChange={e => setFilterCountry(e.target.value)} placeholder="Country…"
                  className="pl-7 pr-3 py-1.5 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/50 w-32" />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500">Score ≥</span>
                <input type="number" min={0} max={100} value={filterScoreMin || ''} onChange={e => setFilterScoreMin(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-16 px-2 py-1.5 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/50" />
              </div>

              {activeFieldFilters && (
                <button onClick={() => { setFilterHasEmail(false); setFilterHasPhone(false); setFilterCity(''); setFilterCountry(''); setFilterScoreMin(0) }}
                  className="flex items-center gap-1 px-2 py-1.5 text-[11px] rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors font-medium">
                  <X className="w-3 h-3" /> Clear all
                </button>
              )}
            </div>
          )}

          {/* Quick filters row */}
          {hasActiveFilters && (
            <div className="shrink-0 px-4 py-2 border-b border-gray-50 dark:border-white/[0.05] flex items-center gap-2 flex-wrap bg-gray-50/50 dark:bg-white/[0.01]">
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Search:</span>
              {selectedIcp && (
                <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-[#15A4AE]/10 text-[#15A4AE] border border-[#15A4AE]/20 font-medium">
                  Profile: {selectedIcp.name}
                </span>
              )}
              {searchQuery.trim() && (
                <button onClick={() => setSearchQuery('')}
                  className="flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/10 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 transition-colors font-medium">
                  "{searchQuery}" <X className="w-2.5 h-2.5" />
                </button>
              )}
              {location.trim() && (
                <button onClick={() => setLocation('')}
                  className="flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/10 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 transition-colors font-medium">
                  <MapPin className="w-2.5 h-2.5" />{location} <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          )}

          {/* Job progress */}
          {activeJob && <JobProgressStrip job={activeJob} />}

          {/* Results table */}
          <div className="flex-1 overflow-auto" onClick={() => setShowColPicker(false)}>
            {visible.length > 0 && (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-white/8 bg-gray-50/80 dark:bg-white/[0.02] sticky top-0 z-10">
                    <th className="pl-5 pr-2 py-2.5 w-4" />
                    {/* Company — always */}
                    <th className="px-3 py-2.5 text-left">
                      <button onClick={() => toggleSort('company')}
                        className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                        Company {sortKey === 'company' && <span>{sortDir === 'desc' ? '↓' : '↑'}</span>}
                      </button>
                    </th>
                    {cols.has('score') && (
                      <th className="px-3 py-2.5 text-left">
                        <button onClick={() => toggleSort('score')}
                          className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                          Score {sortKey === 'score' && <span>{sortDir === 'desc' ? '↓' : '↑'}</span>}
                        </button>
                      </th>
                    )}
                    {cols.has('city') && (
                      <th className="px-3 py-2.5 text-left">
                        <button onClick={() => toggleSort('city')}
                          className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                          City {sortKey === 'city' && <span>{sortDir === 'desc' ? '↓' : '↑'}</span>}
                        </button>
                      </th>
                    )}
                    {cols.has('country') && (
                      <th className="px-3 py-2.5 text-left">
                        <button onClick={() => toggleSort('country')}
                          className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                          Country {sortKey === 'country' && <span>{sortDir === 'desc' ? '↓' : '↑'}</span>}
                        </button>
                      </th>
                    )}
                    {cols.has('description') && (
                      <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">About</th>
                    )}
                    {cols.has('email') && (
                      <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">Email</th>
                    )}
                    {cols.has('phone') && (
                      <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">Phone</th>
                    )}
                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-gray-400">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map(p => (
                    <ProspectRow
                      key={p.id}
                      prospect={p}
                      cols={cols}
                      onAdd={addProspectToPipeline}
                      onIgnore={async (id) => { await ignoreProspect(id) }}
                    />
                  ))}
                </tbody>
              </table>
            )}

            {/* Empty: search done, no results */}
            {activeJob?.status === 'done' && results.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                <Search className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">No prospects matched</p>
                <p className="text-sm text-gray-400 mt-1">Try broadening your search or adjusting your profile keywords</p>
              </div>
            )}

            {/* Empty: no job yet */}
            {!activeJob && results.length === 0 && !running && (
              <div className="flex flex-col items-center justify-center h-full py-20 text-center px-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#15A4AE]/15 to-[#15A4AE]/5 flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-[#15A4AE]" />
                </div>
                <p className="text-base font-semibold text-gray-700 dark:text-gray-300">
                  {selectedIcp ? 'Ready to find prospects' : 'Select a profile to get started'}
                </p>
                <p className="text-sm text-gray-400 mt-1.5 max-w-xs leading-relaxed">
                  {selectedIcp
                    ? 'Enter a search query in the left panel and click Find Prospects'
                    : 'Create a search profile to define your target market'}
                </p>
                {selectedIcp && (
                  <div className="mt-6 px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/8 text-left max-w-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-2">How it works</p>
                    <div className="space-y-1.5">
                      {[
                        'Searches the web with your query',
                        'AI filters out irrelevant results',
                        'We crawl each company homepage',
                        'Score against your target profile',
                        'Strong matches auto-added to pipeline',
                      ].map((step, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span className="w-4 h-4 rounded-full bg-[#15A4AE]/15 text-[#15A4AE] text-[9px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {running && !activeJob && (
              <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                <Loader2 className="w-8 h-8 text-[#15A4AE] animate-spin mb-3" />
                <p className="text-sm text-gray-500">Starting search…</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
