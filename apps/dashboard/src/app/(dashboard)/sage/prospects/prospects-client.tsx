'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Plus, Search, Target, Trash2, ChevronDown, ChevronUp,
  Sparkles, MapPin, Mail, Phone, Check, X,
  Loader2, AlertCircle, Zap, Edit2, ArrowUpDown, Clock,
  Download, Building2, Upload, UserPlus, DollarSign, Save,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getIcpProfiles, createIcpProfile, updateIcpProfile, deleteIcpProfile,
  startLocalSearch, getProspectJob, getProspectResults,
  addProspectToPipeline, getRecentJobs, getWorkspacePipelines,
  createContactFromProspect, deleteProspect, updateProspect,
  getProspectCredits,
  type IcpProfile, type ProspectCompany, type ProspectJob,
} from '@/app/actions/prospecting'
import type { CreditBalance } from '@/lib/prospecting/credits'
import type { DetectedPerson } from '@/lib/prospecting/extract'
import { ActivitySidebar } from '@/components/team/activity-sidebar'
import type { ActivityEntry, ViewingAsInfo } from '@/app/actions/activity-feed'

// ── Constants ─────────────────────────────────────────────────────────────────


const ALL_COUNTRIES = [
  'Afghanistan','Albania','Algeria','Andorra','Angola','Antigua and Barbuda','Argentina','Armenia','Australia',
  'Austria','Azerbaijan','Bahamas','Bahrain','Bangladesh','Barbados','Belarus','Belgium','Belize','Benin',
  'Bhutan','Bolivia','Bosnia and Herzegovina','Botswana','Brazil','Brunei','Bulgaria','Burkina Faso','Burundi',
  'Cabo Verde','Cambodia','Cameroon','Canada','Central African Republic','Chad','Chile','China','Colombia',
  'Comoros','Congo','Costa Rica','Croatia','Cuba','Cyprus','Czech Republic','Denmark','Djibouti','Dominica',
  'Dominican Republic','Ecuador','Egypt','El Salvador','Equatorial Guinea','Eritrea','Estonia','Eswatini',
  'Ethiopia','Fiji','Finland','France','Gabon','Gambia','Georgia','Germany','Ghana','Greece','Grenada',
  'Guatemala','Guinea','Guinea-Bissau','Guyana','Haiti','Honduras','Hungary','Iceland','India','Indonesia',
  'Iran','Iraq','Ireland','Israel','Italy','Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kiribati',
  'Kuwait','Kyrgyzstan','Laos','Latvia','Lebanon','Lesotho','Liberia','Libya','Liechtenstein','Lithuania',
  'Luxembourg','Madagascar','Malawi','Malaysia','Maldives','Mali','Malta','Marshall Islands','Mauritania',
  'Mauritius','Mexico','Micronesia','Moldova','Monaco','Mongolia','Montenegro','Morocco','Mozambique',
  'Myanmar','Namibia','Nauru','Nepal','Netherlands','New Zealand','Nicaragua','Niger','Nigeria','North Korea',
  'North Macedonia','Norway','Oman','Pakistan','Palau','Palestine','Panama','Papua New Guinea','Paraguay',
  'Peru','Philippines','Poland','Portugal','Qatar','Romania','Russia','Rwanda','Saint Kitts and Nevis',
  'Saint Lucia','Saint Vincent and the Grenadines','Samoa','San Marino','Saudi Arabia','Senegal','Serbia',
  'Seychelles','Sierra Leone','Singapore','Slovakia','Slovenia','Solomon Islands','Somalia','South Africa',
  'South Korea','South Sudan','Spain','Sri Lanka','Sudan','Suriname','Sweden','Switzerland','Syria',
  'Taiwan','Tajikistan','Tanzania','Thailand','Timor-Leste','Togo','Tonga','Trinidad and Tobago','Tunisia',
  'Turkey','Turkmenistan','Tuvalu','Uganda','Ukraine','United Arab Emirates','United Kingdom',
  'United States','Uruguay','Uzbekistan','Vanuatu','Vatican City','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe',
]

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
  { key: 'score',        label: 'Score',   defaultOn: true  },
  { key: 'email',        label: 'Email',   defaultOn: true  },
  { key: 'phone',        label: 'Phone',   defaultOn: true  },
  { key: 'contact_name', label: 'Contact', defaultOn: true  },
  { key: 'url',          label: 'URL',     defaultOn: true  },
  { key: 'description',  label: 'About',   defaultOn: true  },
  { key: 'pricing_hint', label: 'Pricing', defaultOn: false },
  { key: 'city',         label: 'City',    defaultOn: true  },
  { key: 'country',      label: 'Country', defaultOn: true  },
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
      <div className="w-14 h-1.5 rounded-full bg-gray-100 dark:bg-white/10 shrink-0">
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
  const suppressBlur = useRef(false)

  function add() {
    const v = input.trim()
    if (v && !value.includes(v)) onChange([...value, v])
    setInput('')
  }

  return (
    <div className="border border-gray-200 dark:border-white/10 rounded-lg p-2 flex flex-wrap gap-1 min-h-[38px] focus-within:ring-1 focus-within:ring-[#15A4AE]/60 focus-within:border-[#15A4AE]/50 bg-white dark:bg-white/5">
      {value.map(tag => (
        <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-[#15A4AE]/10 text-[#15A4AE] rounded text-sm font-medium">
          {tag}
          <button type="button" onClick={() => onChange(value.filter(v => v !== tag))} className="hover:text-red-500 transition-colors">
            <X className="w-2.5 h-2.5" />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            suppressBlur.current = true
            add()
            setTimeout(() => { suppressBlur.current = false }, 0)
          }
        }}
        onBlur={() => { if (!suppressBlur.current) add() }}
        placeholder={value.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[80px] text-sm bg-transparent outline-none placeholder-gray-400 text-gray-800 dark:text-gray-200"
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
  const [country,   setCountry]   = useState(initial?.target_country ?? '')
  const [state,     setState]     = useState(initial?.target_state    ?? '')
  const [postcode,  setPostcode]  = useState(initial?.target_postcode ?? '')
  const [segment,   setSegment]   = useState<'b2b' | 'b2c' | 'both'>(initial?.market_segment ?? 'both')
  const [keywords,  setKeywords]  = useState<string[]>(initial?.target_keywords ?? [])
  const [locations, setLocations] = useState<string[]>(initial?.locations ?? [])
  const [excludes,  setExcludes]  = useState<string[]>(initial?.exclude_keywords ?? [])
  const [services,  setServices]  = useState<string[]>(initial?.services_of_interest ?? [])
  const [saving,    setSaving]    = useState(false)

  async function submit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!name.trim() || !industry.trim() || !country.trim()) return
    setSaving(true)
    await onSave({
      name:                 name.trim(),
      industry:             industry.trim(),
      market_segment:       segment,
      target_country:       country.trim(),
      target_state:         state.trim(),
      target_postcode:      postcode.trim(),
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
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Country *</label>
            <input
              list="country-presets"
              value={country}
              onChange={e => setCountry(e.target.value)}
              required
              placeholder="e.g. Australia, United Kingdom, United States…"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 focus:border-[#15A4AE]"
            />
            <datalist id="country-presets">
              {ALL_COUNTRIES.map(c => <option key={c} value={c} />)}
            </datalist>
            <p className="text-xs text-gray-400 mt-1">Ensures searches target the right country</p>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">State / Region</label>
              <input value={state} onChange={e => setState(e.target.value)} placeholder="e.g. NSW, California…"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 focus:border-[#15A4AE]" />
            </div>
            <div className="w-32">
              <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Postcode / ZIP</label>
              <input value={postcode} onChange={e => setPostcode(e.target.value)} placeholder="2000…"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 focus:border-[#15A4AE]" />
            </div>
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
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Services / Products You Sell</label>
            <TagInput value={services} onChange={setServices} placeholder="e.g. Solar installation, Battery storage…" />
            <p className="text-xs text-gray-400 mt-1">Press Enter after each. Used to score prospects who may need what you offer.</p>
          </div>

          <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-white/8">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors font-medium">
              Cancel
            </button>
            <button type="submit" disabled={saving || !name.trim() || !industry.trim() || !country.trim()}
              className="flex-1 px-4 py-2 text-sm font-semibold bg-[#15A4AE] hover:bg-[#0e8b94] text-white rounded-xl transition-colors disabled:opacity-50">
              {saving ? 'Saving…' : initial?.id ? 'Save Changes' : 'Create Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Decision maker cell ───────────────────────────────────────────────────────

function DecisionMakerCell({
  decisionMakers,
  fallbackName,
}: {
  decisionMakers: DetectedPerson[]
  fallbackName:   string | null
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Sort by confidence descending
  const sorted = [...decisionMakers].sort((a, b) => b.confidence_score - a.confidence_score)
  const top    = sorted[0]
  const rest   = sorted.slice(1)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!top && !fallbackName) {
    return <span className="text-sm text-gray-300 dark:text-gray-600">—</span>
  }

  if (!top) {
    return <span className="text-sm text-gray-700 dark:text-gray-300 truncate block max-w-[160px]">{fallbackName}</span>
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={e => { e.stopPropagation(); if (rest.length > 0) setOpen(v => !v) }}
        className="flex items-start gap-1.5 text-left group/dm w-full"
      >
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate max-w-[140px] leading-tight">
            {top.full_name}
          </p>
          {top.title && (
            <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate max-w-[140px] leading-tight mt-0.5">
              {top.title}
            </p>
          )}
        </div>
        {rest.length > 0 && (
          <span className="shrink-0 mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400">
            +{rest.length}
          </span>
        )}
      </button>

      {open && rest.length > 0 && (
        <div
          onClick={e => e.stopPropagation()}
          className="absolute left-0 top-full mt-1 z-50 w-56 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1e1e1e] shadow-lg py-1.5"
        >
          {sorted.map((dm, i) => (
            <div key={i} className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/5">
              <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{dm.full_name}</p>
              {dm.title && (
                <p className="text-[11px] text-gray-400 truncate mt-0.5">{dm.title}</p>
              )}
              <div className="flex items-center gap-1 mt-1">
                <div className="h-1 w-12 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#15A4AE]/70"
                    style={{ width: `${Math.round(dm.confidence_score * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-400">{Math.round(dm.confidence_score * 100)}%</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Prospect table row ────────────────────────────────────────────────────────

function ProspectRow({ prospect, cols, isPushed, onCreateDeal, onCreateContact, onDelete, onUpdate }: {
  prospect:        ProspectCompany
  cols:            Set<ColKey>
  isPushed?:       boolean
  onCreateDeal:    (id: string) => void
  onCreateContact: (id: string) => Promise<void>
  onDelete:        (id: string) => Promise<void>
  onUpdate:        (id: string, data: { email_1?: string; phone_1?: string; description?: string; city?: string; country?: string }) => Promise<void>
}) {
  const [busy,         setBusy]         = useState(false)
  const [gone,         setGone]         = useState(false)
  const [contactDone,  setContactDone]  = useState(!!prospect.contact_id)
  const [editMode,     setEditMode]     = useState(false)
  const [editEmail,    setEditEmail]    = useState(prospect.email_1 ?? prospect.emails?.[0] ?? '')
  const [editPhone,    setEditPhone]    = useState(prospect.phone_1 ?? prospect.phones?.[0] ?? '')
  const [editDesc,     setEditDesc]     = useState(prospect.description ?? '')
  const [editCity,     setEditCity]     = useState(prospect.city ?? '')
  const [editCountry,  setEditCountry]  = useState(prospect.country ?? '')

  // local display overrides after edit
  const [localEmail,   setLocalEmail]   = useState<string | null>(null)
  const [localPhone,   setLocalPhone]   = useState<string | null>(null)
  const [localDesc,    setLocalDesc]    = useState<string | null>(null)
  const [localCity,    setLocalCity]    = useState<string | null>(null)
  const [localCountry, setLocalCountry] = useState<string | null>(null)

  const pushed = isPushed ?? !!prospect.deal_id

  if (gone) return null

  const tier = prospect.score_tier ?? 'cold'
  const cfg  = TIER[tier] ?? TIER.cold
  const name = prospect.company_name ?? prospect.title ?? prospect.domain

  const displayEmail   = localEmail   ?? prospect.email_1 ?? prospect.emails?.[0] ?? null
  const displayPhone   = localPhone   ?? prospect.phone_1 ?? prospect.phones?.[0] ?? null
  const displayDesc    = localDesc    ?? prospect.description ?? prospect.snippet
  const displayCity    = localCity    ?? prospect.city
  const displayCountry = localCountry ?? prospect.country

  async function handleCreateContact() {
    setBusy(true)
    await onCreateContact(prospect.id)
    setContactDone(true)
    setBusy(false)
  }

  async function handleDelete() {
    if (!confirm('Delete this prospect permanently? This cannot be undone.')) return
    setBusy(true)
    await onDelete(prospect.id)
    setGone(true)
    setBusy(false)
  }

  async function handleSave() {
    setBusy(true)
    await onUpdate(prospect.id, {
      email_1:     editEmail,
      phone_1:     editPhone,
      description: editDesc,
      city:        editCity,
      country:     editCountry,
    })
    setLocalEmail(editEmail || null)
    setLocalPhone(editPhone || null)
    setLocalDesc(editDesc || null)
    setLocalCity(editCity || null)
    setLocalCountry(editCountry || null)
    setEditMode(false)
    setBusy(false)
  }

  return (
    <>
      <tr className="group border-b border-gray-50 dark:border-white/[0.04] hover:bg-gray-50/70 dark:hover:bg-white/[0.025] transition-colors">

        {/* Tier dot */}
        <td className="pl-5 pr-2 py-2 w-3 shrink-0">
          <div className={cn('w-2 h-2 rounded-full', cfg.dot)} title={cfg.label} />
        </td>

        {/* Company — always visible */}
        <td className="px-3 py-2" style={{ minWidth: 180, maxWidth: 220 }}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 rounded bg-gray-100 dark:bg-white/8 border border-gray-200/60 dark:border-white/8 flex items-center justify-center shrink-0 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://www.google.com/s2/favicons?domain=${prospect.domain}&sz=32`}
                alt=""
                className="w-3.5 h-3.5 object-contain"
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
              />
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{name}</p>
          </div>
        </td>

        {/* Score */}
        {cols.has('score') && (
          <td className="px-3 py-2 w-36 shrink-0">
            <div className="flex items-center gap-2">
              {prospect.score != null && <ScoreBar score={prospect.score} tier={tier} />}
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0', cfg.badge)}>
                {cfg.label}
              </span>
            </div>
          </td>
        )}

        {/* Email */}
        {cols.has('email') && (
          <td className="px-3 py-2 shrink-0" style={{ minWidth: 160, maxWidth: 200 }}>
            {displayEmail ? (
              <div className="flex items-center gap-1 group/cell">
                <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{displayEmail}</span>
                <CopyButton value={displayEmail} icon={Mail} />
              </div>
            ) : (
              <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
            )}
          </td>
        )}

        {/* Phone */}
        {cols.has('phone') && (
          <td className="px-3 py-2 shrink-0" style={{ minWidth: 140, maxWidth: 180 }}>
            {displayPhone ? (
              <div className="flex items-center gap-1 group/cell">
                <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{displayPhone}</span>
                <CopyButton value={displayPhone} icon={Phone} />
              </div>
            ) : (
              <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
            )}
          </td>
        )}

        {/* Contact / Decision makers */}
        {cols.has('contact_name') && (
          <td className="px-3 py-2 w-44 shrink-0">
            <DecisionMakerCell
              decisionMakers={prospect.decision_makers ?? []}
              fallbackName={prospect.contact_name}
            />
          </td>
        )}

        {/* URL */}
        {cols.has('url') && (
          <td className="px-3 py-2 shrink-0" style={{ minWidth: 140, maxWidth: 200 }}>
            {prospect.domain ? (
              <a
                href={`https://${prospect.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="text-xs text-[#15A4AE] hover:underline truncate block"
              >
                {prospect.domain}
              </a>
            ) : (
              <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
            )}
          </td>
        )}

        {/* About / description */}
        {cols.has('description') && (
          <td className="px-3 py-2" style={{ maxWidth: 260 }}>
            {displayDesc ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{displayDesc}</p>
            ) : (
              <span className="text-sm text-gray-300 dark:text-gray-600">—</span>
            )}
          </td>
        )}

        {/* Pricing hint */}
        {cols.has('pricing_hint') && (
          <td className="px-3 py-2" style={{ maxWidth: 200 }}>
            {prospect.pricing_hint ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{prospect.pricing_hint}</p>
            ) : (
              <span className="text-sm text-gray-300 dark:text-gray-600">—</span>
            )}
          </td>
        )}

        {/* City */}
        {cols.has('city') && (
          <td className="px-3 py-2 w-28 shrink-0">
            {displayCity ? (
              <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 shrink-0 text-gray-400" />
                <span className="truncate">{displayCity}</span>
              </span>
            ) : (
              <span className="text-sm text-gray-300 dark:text-gray-600">—</span>
            )}
          </td>
        )}

        {/* Country */}
        {cols.has('country') && (
          <td className="px-3 py-2 w-28 shrink-0">
            {displayCountry ? (
              <span className="text-sm text-gray-600 dark:text-gray-400 truncate">{displayCountry}</span>
            ) : (
              <span className="text-sm text-gray-300 dark:text-gray-600">—</span>
            )}
          </td>
        )}

        {/* Actions */}
        <td className="sticky right-0 px-3 py-2 bg-white dark:bg-[#232323] group-hover:bg-gray-50/70 dark:group-hover:bg-white/[0.025] z-10 shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-end gap-0.5">
            {pushed && (
              <span className="inline-flex items-center gap-1 text-[11px] text-[#15A4AE] font-semibold mr-1.5 shrink-0">
                <Check className="w-3 h-3" /> Pipeline
              </span>
            )}
            {/* Create contact */}
            <button
              onClick={handleCreateContact}
              disabled={busy || contactDone}
              title={contactDone ? 'Contact created' : 'Create contact'}
              className={cn(
                'p-1.5 rounded-lg transition-colors shrink-0 disabled:opacity-40',
                contactDone
                  ? 'text-[#15A4AE]'
                  : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10'
              )}
            >
              {contactDone ? <Check className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
            </button>
            {/* Create deal */}
            <button
              onClick={() => onCreateDeal(prospect.id)}
              disabled={busy || pushed}
              title="Create deal"
              className={cn(
                'p-1.5 rounded-lg transition-colors shrink-0 disabled:opacity-40',
                pushed ? 'text-[#15A4AE]' : 'text-[#15A4AE] hover:bg-[#15A4AE]/10',
              )}
            >
              <DollarSign className="w-3.5 h-3.5" />
            </button>
            {/* Edit */}
            <button
              onClick={() => setEditMode(e => !e)}
              title="Edit"
              className={cn(
                'p-1.5 rounded-lg transition-colors shrink-0',
                editMode
                  ? 'text-[#15A4AE] bg-[#15A4AE]/10'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8'
              )}
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            {/* Delete */}
            <button
              onClick={handleDelete}
              disabled={busy}
              title="Delete"
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors shrink-0 disabled:opacity-40"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </td>
      </tr>

      {/* Inline edit row */}
      {editMode && (
        <tr className="border-b border-[#15A4AE]/10 bg-[#15A4AE]/[0.03] dark:bg-[#15A4AE]/[0.05]">
          <td colSpan={99} className="px-5 py-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Email</label>
                <input value={editEmail} onChange={e => setEditEmail(e.target.value)}
                  placeholder="email@company.com"
                  className="px-2 py-1 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 w-44 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/50 focus:border-[#15A4AE]" />
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Phone</label>
                <input value={editPhone} onChange={e => setEditPhone(e.target.value)}
                  placeholder="+1 555 000 0000"
                  className="px-2 py-1 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 w-36 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/50 focus:border-[#15A4AE]" />
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">About</label>
                <input value={editDesc} onChange={e => setEditDesc(e.target.value)}
                  placeholder="Short description…"
                  className="px-2 py-1 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 w-56 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/50 focus:border-[#15A4AE]" />
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">City</label>
                <input value={editCity} onChange={e => setEditCity(e.target.value)}
                  placeholder="Sydney"
                  className="px-2 py-1 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 w-28 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/50 focus:border-[#15A4AE]" />
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Country</label>
                <input value={editCountry} onChange={e => setEditCountry(e.target.value)}
                  placeholder="Australia"
                  className="px-2 py-1 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 w-28 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/50 focus:border-[#15A4AE]" />
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <button onClick={() => setEditMode(false)}
                  className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={busy}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-[#15A4AE] hover:bg-[#0e8b94] text-white rounded-lg transition-colors disabled:opacity-50">
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── Job progress strip ────────────────────────────────────────────────────────

function Dot() {
  return <span className="text-gray-300 dark:text-white/20 mx-0.5">·</span>
}

function JobProgressStrip({ job, profileName }: { job: ProspectJob; profileName?: string }) {
  const isDone   = job.status === 'done'
  const isFailed = job.status === 'failed'
  const isRunning = !isDone && !isFailed

  return (
    <div className={cn(
      'flex items-center gap-1.5 px-4 py-1.5 border-b text-[11px] shrink-0 flex-wrap',
      isFailed ? 'bg-red-50 dark:bg-red-500/5 border-red-100 dark:border-red-500/10' :
      isDone   ? 'bg-emerald-50/60 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/10' :
                 'bg-[#15A4AE]/4 border-[#15A4AE]/15',
    )}>
      {isRunning && <Loader2 className="w-3 h-3 text-[#15A4AE] animate-spin shrink-0" />}
      {isDone    && <Check   className="w-3 h-3 text-emerald-500 shrink-0" />}
      {isFailed  && <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />}
      <span className="font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide text-[10px]">Search</span>
      {profileName && <><Dot /><span className="text-gray-600 dark:text-gray-300 font-medium">{profileName}</span></>}
      {job.search_query && <><Dot /><span className="text-gray-600 dark:text-gray-300">{job.search_query}</span></>}
      {job.location     && <><Dot /><span className="text-gray-400">{job.location}</span></>}
      <Dot />
      <span className={cn('font-medium',
        isFailed ? 'text-red-600 dark:text-red-400' :
        isDone   ? 'text-emerald-700 dark:text-emerald-400' :
                   'text-[#15A4AE]',
      )}>
        {JOB_LABELS[job.status] ?? job.status}
      </span>
      {job.stats.found    > 0 && <><Dot /><span className="text-gray-500 dark:text-gray-400">Found <strong className="text-gray-700 dark:text-gray-200">{job.stats.found}</strong></span></>}
      {job.stats.relevant > 0 && <><Dot /><span className="text-gray-500 dark:text-gray-400">Relevant <strong className="text-gray-700 dark:text-gray-200">{job.stats.relevant}</strong></span></>}
      {job.stats.crawled  > 0 && <><Dot /><span className="text-gray-500 dark:text-gray-400">Crawled <strong className="text-gray-700 dark:text-gray-200">{job.stats.crawled}</strong></span></>}
      {job.stats.pushed   > 0 && <><Dot /><span className="text-gray-500 dark:text-gray-400">Pushed <strong className="text-emerald-600 dark:text-emerald-400">{job.stats.pushed}</strong></span></>}
      {isFailed && job.error  && <><Dot /><span className="text-red-500 dark:text-red-400 truncate max-w-[240px]">{job.error}</span></>}
    </div>
  )
}

// ── Buy credits modal ─────────────────────────────────────────────────────────

const CREDIT_PACKS = [
  { key: 'starter', label: 'Starter',  credits: 100,  price: '$35',  priceNote: 'one-off',  highlight: false },
  { key: 'growth',  label: 'Growth',   credits: 500,  price: '$99',  priceNote: 'one-off',  highlight: true  },
  { key: 'agency',  label: 'Agency',   credits: 1000, price: '$179', priceNote: 'one-off',  highlight: false },
] as const

function BuyCreditsModal({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState<string | null>(null)

  async function buyPack(pack: string) {
    setLoading(pack)
    try {
      const res  = await fetch('/api/checkout/prospect-credits', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ pack }),
      })
      const data = await res.json() as { url?: string; error?: string }
      if (data.url) window.location.href = data.url
      else alert(data.error ?? 'Something went wrong')
    } catch {
      alert('Failed to start checkout')
    }
    setLoading(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#232323] rounded-2xl shadow-2xl border border-gray-200/60 dark:border-white/8 w-full max-w-sm">

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/8">
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Buy Lead Credits</h2>
            <p className="text-xs text-gray-400 mt-0.5">One-off top-ups, never expire</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-2.5">
          {CREDIT_PACKS.map(pack => (
            <div
              key={pack.key}
              className={cn(
                'relative flex items-center justify-between rounded-xl border p-3.5 transition-colors',
                pack.highlight
                  ? 'border-[#15A4AE]/40 bg-[#15A4AE]/5 dark:bg-[#15A4AE]/8'
                  : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03]',
              )}
            >
              {pack.highlight && (
                <span className="absolute -top-2 left-3 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-[#15A4AE] text-white rounded-full">
                  Popular
                </span>
              )}
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{pack.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  <span className="font-bold text-gray-600 dark:text-gray-300">{pack.credits.toLocaleString()}</span> lead credits · {pack.priceNote}
                </p>
              </div>
              <button
                onClick={() => buyPack(pack.key)}
                disabled={!!loading}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50',
                  pack.highlight
                    ? 'bg-[#15A4AE] hover:bg-[#0e8b94] text-white'
                    : 'bg-white dark:bg-white/8 border border-gray-200 dark:border-white/15 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/15',
                )}
              >
                {loading === pack.key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {pack.price}
              </button>
            </div>
          ))}

          <p className="text-[10px] text-gray-400 text-center pt-1">
            Credits are shared across all profiles in your workspace. Unused credits never expire.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Pipeline picker modal ─────────────────────────────────────────────────────

function PipelinePickerModal({ onConfirm, onClose }: {
  onConfirm: (pipelineId: string, stageId: string) => Promise<void>
  onClose:   () => void
}) {
  type Pipeline = { id: string; name: string; stages: { id: string; name: string; position: number }[] }
  const [pipelines,   setPipelines]   = useState<Pipeline[]>([])
  const [loading,     setLoading]     = useState(true)
  const [selPipeline, setSelPipeline] = useState<Pipeline | null>(null)
  const [selStage,    setSelStage]    = useState<string>('')
  const [saving,      setSaving]      = useState(false)

  useEffect(() => {
    getWorkspacePipelines().then(data => {
      setPipelines(data)
      if (data[0]) { setSelPipeline(data[0]); setSelStage(data[0].stages[0]?.id ?? '') }
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (selPipeline) setSelStage(selPipeline.stages[0]?.id ?? '')
  }, [selPipeline?.id])

  async function confirm() {
    if (!selPipeline || !selStage) return
    setSaving(true)
    await onConfirm(selPipeline.id, selStage)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#232323] rounded-2xl shadow-2xl border border-gray-200/60 dark:border-white/8 w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/8">
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Add to Pipeline</h2>
            <p className="text-sm text-gray-400 mt-0.5">Choose where this prospect should go</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-[#15A4AE] animate-spin" />
            </div>
          ) : pipelines.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No pipelines found. Create one in Pipelines first.</p>
          ) : (
            <>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-2">Pipeline</label>
                <div className="space-y-1">
                  {pipelines.map(p => (
                    <button key={p.id} type="button" onClick={() => setSelPipeline(p)}
                      className={cn('w-full text-left px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors',
                        selPipeline?.id === p.id
                          ? 'bg-[#15A4AE]/8 border-[#15A4AE]/40 text-[#15A4AE]'
                          : 'border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5',
                      )}>
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {selPipeline && selPipeline.stages.length > 0 && (
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-2">Stage</label>
                  <select value={selStage} onChange={e => setSelStage(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40">
                    {selPipeline.stages.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors font-medium">
            Cancel
          </button>
          <button type="button" onClick={confirm} disabled={saving || !selPipeline || !selStage || loading}
            className="flex-1 px-4 py-2 text-sm font-semibold bg-[#15A4AE] hover:bg-[#0e8b94] text-white rounded-xl transition-colors disabled:opacity-50">
            {saving ? 'Adding…' : 'Add to Pipeline'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  initialProfiles:   IcpProfile[]
  initialRecentJobs: ProspectJob[]
  activity:          ActivityEntry[]
  activityDate:      string
  viewingAs?:        ViewingAsInfo | null
}

const LAST_ICP_KEY = 'prospects:lastIcpId'

export function ProspectsClient({ initialProfiles, initialRecentJobs, activity, activityDate, viewingAs }: Props) {
  const [profiles,      setProfiles]      = useState<IcpProfile[]>(initialProfiles)
  const [selectedIcp,   setSelectedIcp]   = useState<IcpProfile | null>(() => {
    if (typeof window === 'undefined') return initialProfiles[0] ?? null
    const lastId = localStorage.getItem(LAST_ICP_KEY)
    return (lastId && initialProfiles.find(p => p.id === lastId)) || initialProfiles[0] || null
  })
  const [icpModal,      setIcpModal]      = useState<'create' | 'edit' | null>(
    initialProfiles.length === 0 ? 'create' : null,
  )
  const [editingIcp,    setEditingIcp]    = useState<IcpProfile | null>(null)
  const [showIcpPicker, setShowIcpPicker] = useState(false)
  const icpPickerRef = useRef<HTMLDivElement>(null)

  function selectProfile(p: IcpProfile | null) {
    setSelectedIcp(p)
    if (p) localStorage.setItem(LAST_ICP_KEY, p.id)
    else   localStorage.removeItem(LAST_ICP_KEY)
  }

  const [searchQuery, setSearchQuery] = useState('')
  const [location,    setLocation]    = useState(initialProfiles[0]?.locations[0] ?? '')
  const [running,     setRunning]     = useState(false)
  const [leadCount,   setLeadCount]   = useState(20)
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
  const [showColPicker,     setShowColPicker]     = useState(false)
  const [contactOnlyFilter, setContactOnlyFilter] = useState(true)
  const [page,              setPage]              = useState(1)
  const [pageSize,          setPageSize]          = useState(20)
  const [pickerProspectId,   setPickerProspectId]   = useState<string | null>(null)
  const [pushedIds,          setPushedIds]           = useState<Set<string>>(new Set())
  const [credits,            setCredits]             = useState<CreditBalance | null>(null)
  const [showBuyCredits,     setShowBuyCredits]       = useState(false)
  const importRef = useRef<HTMLInputElement>(null)

  function handleImportCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      const lines = text.split('\n').filter(l => l.trim())
      if (lines.length < 2) return
      const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim())
      const get = (vals: string[], key: string) => vals[headers.indexOf(key)]?.replace(/^"|"$/g, '').trim() ?? ''
      const imported: ProspectCompany[] = lines.slice(1).map((line, i) => {
        const vals = line.match(/"[^"]*"|[^,]*/g) ?? []
        return {
          id:           `imported-${Date.now()}-${i}`,
          job_id:       'imported',
          domain:       get(vals, 'domain') || get(vals, 'website') || '',
          company_name: get(vals, 'company_name') || null,
          city:         get(vals, 'city') || null,
          state:        get(vals, 'state') || null,
          country:      get(vals, 'country') || null,
          email_1:      get(vals, 'email_1') || null,
          phone_1:      get(vals, 'phone_1') || null,
          score:        Number(get(vals, 'score')) || null,
          score_tier:   (get(vals, 'score_tier') as ProspectCompany['score_tier']) || null,
          description:  get(vals, 'description') || null,
          status:       'pending',
          emails:       [],
          phones:       [],
          website:      null,
          location:     null,
          annual_revenue: null,
          employee_count: null,
        } as unknown as ProspectCompany
      })
      setResults(prev => [...imported, ...prev])
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // ── Effects ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (selectedIcp?.locations[0]) setLocation(selectedIcp.locations[0])
    // Auto-load most recent completed job for this profile (persistence)
    if (selectedIcp && results.length === 0) {
      const lastDone = recentJobs.find(j => j.icp_id === selectedIcp.id && j.status === 'done')
      if (lastDone) loadRecentJob(lastDone)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const refreshCredits = useCallback(() => {
    getProspectCredits().then(setCredits).catch(() => {})
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
        refreshCredits()
        if (job.status === 'done') {
          const res = await getProspectResults(jobId)
          setResults(res)
        }
      }
    }, 3000)
  }, [stopPolling, refreshCredits])

  useEffect(() => () => stopPolling(), [stopPolling])
  useEffect(() => setPage(1), [tierFilter, tableSearch, contactOnlyFilter, sortKey, sortDir])

  // Load credit balance on mount; re-fetch if returning from Stripe checkout
  useEffect(() => {
    getProspectCredits().then(setCredits).catch(err => console.error('[credits] load failed:', err))
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('credits') === '1') {
      const url = new URL(window.location.href)
      url.searchParams.delete('credits')
      window.history.replaceState({}, '', url.toString())
    }
  }, [])

  // ── Handlers ─────────────────────────────────────────────────────────────────
  async function handleCreateIcp(data: Omit<IcpProfile, 'id' | 'workspace_id' | 'is_active' | 'created_at' | 'updated_at'>) {
    const result = await createIcpProfile(data)
    if (result.id) {
      const updated = await getIcpProfiles()
      setProfiles(updated)
      const created = updated.find(p => p.id === result.id)
      if (created) selectProfile(created)
      setIcpModal(null)
    }
  }

  async function handleUpdateIcp(data: Omit<IcpProfile, 'id' | 'workspace_id' | 'is_active' | 'created_at' | 'updated_at'>) {
    if (!editingIcp) return
    await updateIcpProfile(editingIcp.id, data)
    const updated = await getIcpProfiles()
    setProfiles(updated)
    selectProfile(updated.find(p => p.id === editingIcp.id) ?? null)
    setEditingIcp(null)
    setIcpModal(null)
  }

  async function inlineSaveIcp(field: string, value: string[]) {
    if (!selectedIcp) return
    const deduped = [...new Set(value)]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await updateIcpProfile(selectedIcp.id, { [field]: deduped } as any)
    const updated = { ...selectedIcp, [field]: deduped }
    selectProfile(updated)
    setProfiles(prev => prev.map(p => p.id === selectedIcp.id ? updated : p))
  }

  async function handleDeleteIcp(id: string) {
    if (!confirm('Delete this ICP profile? This cannot be undone.')) return
    await deleteIcpProfile(id)
    const updated = await getIcpProfiles()
    setProfiles(updated)
    selectProfile(updated[0] ?? null)
    setShowIcpPicker(false)
  }

  async function handleStartSearch() {
    if (!selectedIcp || !searchQuery.trim()) return
    setRunning(true)
    setResults([])
    setActiveJob(null)
    setTierFilter('all')
    setTableSearch('')
    const { jobId, error } = await startLocalSearch(selectedIcp.id, searchQuery, location, leadCount)
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

  // ── Derived ──────────────────────────────────────────────────────────────────
  const visible = results
    .filter(r => r.status !== 'ignored')
    .filter(r => !contactOnlyFilter || (r.email_1 ?? r.emails?.[0]) || (r.phone_1 ?? r.phones?.[0]))
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
    .sort((a, b) => {
      let cmp = 0
      if (sortKey === 'score')   cmp = (a.score ?? 0) - (b.score ?? 0)
      if (sortKey === 'company') cmp = (a.company_name ?? a.domain).localeCompare(b.company_name ?? b.domain)
      if (sortKey === 'city')    cmp = (a.city ?? '').localeCompare(b.city ?? '')
      if (sortKey === 'country') cmp = (a.country ?? '').localeCompare(b.country ?? '')
      return sortDir === 'desc' ? -cmp : cmp
    })

  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize))
  const safePage   = Math.min(page, totalPages)
  const paginated  = visible.slice((safePage - 1) * pageSize, safePage * pageSize)

  const hotCount  = results.filter(r => r.score_tier === 'hot'  && r.status !== 'ignored').length
  const warmCount = results.filter(r => r.score_tier === 'warm' && r.status !== 'ignored').length
  const coldCount = results.filter(r => (r.score_tier === 'cold' || r.score_tier === 'discarded') && r.status !== 'ignored').length
  const total     = hotCount + warmCount + coldCount

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      {icpModal === 'create' && (
        <IcpFormModal onSave={handleCreateIcp} onClose={() => setIcpModal(null)} />
      )}
      {icpModal === 'edit' && editingIcp && (
        <IcpFormModal initial={editingIcp} onSave={handleUpdateIcp} onClose={() => { setIcpModal(null); setEditingIcp(null) }} />
      )}
      {showBuyCredits && (
        <BuyCreditsModal onClose={() => setShowBuyCredits(false)} />
      )}
      {pickerProspectId && (
        <PipelinePickerModal
          onConfirm={async (pipelineId, stageId) => {
            const result = await addProspectToPipeline(pickerProspectId, pipelineId, stageId)
            if (!result.error) {
              setPushedIds(prev => new Set([...prev, pickerProspectId]))
            }
            setPickerProspectId(null)
          }}
          onClose={() => setPickerProspectId(null)}
        />
      )}

      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* ── Page heading ─────────────────────────────────────────────────────── */}
        <div className="pl-9 pt-5 pb-2 pr-4 shrink-0 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Lead Enrichment</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">AI Lead Intelligence — enrich and score your best leads automatically</p>
          </div>
            <div className="flex items-center gap-2">
              {/* Credits button */}
              <button
                onClick={() => setShowBuyCredits(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#15A4AE] hover:bg-[#0e8b94] text-white text-sm font-semibold rounded-xl transition-colors"
              >
                <Zap className="w-3.5 h-3.5" />
                {credits !== null ? `${credits.total} Credits` : 'Buy Credits'}
              </button>
            </div>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden gap-3 p-3 bg-[#f5f4f1] dark:bg-[#1c1c1c]">

        {/* ── LEFT: Filter sidebar ─────────────────────────────────────────────── */}
        <div className="w-64 shrink-0 flex flex-col bg-white dark:bg-[#181818] rounded-2xl border border-gray-200/60 dark:border-white/8 overflow-hidden shadow-[0_4px_6px_-1px_rgba(0,0,0,0.08),0_10px_30px_-5px_rgba(0,0,0,0.12),0_1px_0px_rgba(255,255,255,0.8)_inset] dark:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3),0_20px_40px_-10px_rgba(0,0,0,0.5),0_1px_0px_rgba(255,255,255,0.04)_inset]">

          {/* Dark header — matches Sage list column headers */}
          <div className="px-3 py-2.5 bg-[#141c2b] border-b border-white/10 shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.35),0_1px_0px_rgba(255,255,255,0.06)_inset]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">Lead Enrichment</h2>
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
                          onClick={() => { selectProfile(p); setShowIcpPicker(false) }}
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
                        onClick={() => { selectProfile(p); setShowIcpPicker(false) }}
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

          {/* Live config panel */}
          <div className="flex-1 overflow-y-auto">
            {selectedIcp ? (
              <>
                {/* ── Leads to find — first selector right under profile name ── */}
                <div className="px-3 py-3 border-b border-gray-100 dark:border-white/5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Leads to find</span>
                    <span className="text-xs font-bold text-[#15A4AE] tabular-nums">{leadCount}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={25}
                    value={leadCount}
                    onChange={e => setLeadCount(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[#15A4AE] bg-gray-200 dark:bg-white/10"
                  />
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[10px] text-gray-400">1</span>
                    <span className="text-[10px] text-gray-400">25</span>
                  </div>
                </div>

                {/* ── Search query ── */}
                <div className="px-3 py-3 border-b border-gray-100 dark:border-white/5">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !running) handleStartSearch() }}
                      placeholder={`${selectedIcp.industry}…`}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/60 focus:border-[#15A4AE]/50"
                    />
                  </div>
                </div>

                {/* ── Locations ── */}
                <FilterSection label="Locations" defaultOpen count={selectedIcp.locations.length}>
                  <div className="space-y-1.5">
                    {/* Input first */}
                    <TagInput
                      value={[]}
                      onChange={added => {
                        const newOnes = added.filter(a => !selectedIcp.locations.includes(a))
                        if (!newOnes.length) return
                        inlineSaveIcp('locations', [...selectedIcp.locations, ...newOnes])
                        setLocation(newOnes[newOnes.length - 1])
                      }}
                      placeholder="Add suburb or city…"
                    />
                    {/* Geo context — country / state / postcode */}
                    {(selectedIcp.target_country || selectedIcp.target_state || selectedIcp.target_postcode) && (
                      <div className="flex flex-wrap gap-1">
                        {selectedIcp.target_country && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400 font-medium">{selectedIcp.target_country}</span>
                        )}
                        {selectedIcp.target_state && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400 font-medium">{selectedIcp.target_state}</span>
                        )}
                        {selectedIcp.target_postcode && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400 font-medium">{selectedIcp.target_postcode}</span>
                        )}
                      </div>
                    )}
                    {/* Suburb / city bubbles */}
                    {selectedIcp.locations.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {[...new Set(selectedIcp.locations)].map(loc => (
                          <button
                            key={loc}
                            type="button"
                            onClick={() => setLocation(loc)}
                            className={cn(
                              'flex items-center gap-1 pl-2.5 pr-1 py-0.5 text-xs rounded-full border font-medium transition-colors',
                              location === loc
                                ? 'bg-[#15A4AE] text-white border-[#15A4AE]'
                                : 'bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:border-[#15A4AE]/50',
                            )}
                          >
                            {loc}
                            <span
                              role="button"
                              onClick={e => {
                                e.stopPropagation()
                                const next = selectedIcp.locations.filter(l => l !== loc)
                                inlineSaveIcp('locations', next)
                                if (location === loc) setLocation(next[0] ?? '')
                              }}
                              className="p-0.5 rounded-full opacity-50 hover:opacity-100 hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-500/20 transition-all"
                            >
                              <X className="w-2.5 h-2.5" />
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </FilterSection>

                {/* ── Search Keywords ── */}
                <FilterSection label="Search Keywords" defaultOpen count={selectedIcp.target_keywords.length}>
                  <div className="space-y-1.5">
                    <TagInput
                      value={[]}
                      onChange={added => {
                        const newOnes = added.filter(a => !selectedIcp.target_keywords.includes(a))
                        if (!newOnes.length) return
                        inlineSaveIcp('target_keywords', [...selectedIcp.target_keywords, ...newOnes])
                      }}
                      placeholder="e.g. solar installer, battery…"
                    />
                    {selectedIcp.target_keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {selectedIcp.target_keywords.map(kw => (
                          <span key={kw} className="flex items-center gap-1 pl-2.5 pr-1 py-0.5 text-xs rounded-full border font-medium bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10">
                            {kw}
                            <button
                              type="button"
                              onClick={() => inlineSaveIcp('target_keywords', selectedIcp.target_keywords.filter(k => k !== kw))}
                              className="p-0.5 rounded-full opacity-50 hover:opacity-100 hover:text-red-500 transition-all"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </FilterSection>

                {/* ── Services You Sell ── */}
                <FilterSection label="Services You Sell" defaultOpen count={selectedIcp.services_of_interest.length}>
                  <div className="space-y-1.5">
                    <TagInput
                      value={[]}
                      onChange={added => {
                        const newOnes = added.filter(a => !selectedIcp.services_of_interest.includes(a))
                        if (!newOnes.length) return
                        inlineSaveIcp('services_of_interest', [...selectedIcp.services_of_interest, ...newOnes])
                      }}
                      placeholder="e.g. Website, SEO, solar install…"
                    />
                    {selectedIcp.services_of_interest.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {selectedIcp.services_of_interest.map(s => (
                          <span key={s} className="flex items-center gap-1 pl-2.5 pr-1 py-0.5 text-xs rounded-full border font-medium bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10">
                            {s}
                            <button
                              type="button"
                              onClick={() => inlineSaveIcp('services_of_interest', selectedIcp.services_of_interest.filter(v => v !== s))}
                              className="p-0.5 rounded-full opacity-50 hover:opacity-100 hover:text-red-500 transition-all"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </FilterSection>

                {/* ── Exclude ── */}
                <FilterSection label="Exclude" count={selectedIcp.exclude_keywords.length}>
                  <div className="space-y-1.5">
                    <TagInput
                      value={[]}
                      onChange={added => {
                        const newOnes = added.filter(a => !selectedIcp.exclude_keywords.includes(a))
                        if (!newOnes.length) return
                        inlineSaveIcp('exclude_keywords', [...selectedIcp.exclude_keywords, ...newOnes])
                      }}
                      placeholder="e.g. directory, courses, jobs…"
                    />
                    {selectedIcp.exclude_keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {selectedIcp.exclude_keywords.map(ex => (
                          <span key={ex} className="flex items-center gap-1 pl-2.5 pr-1 py-0.5 text-xs rounded-full border font-medium bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10">
                            {ex}
                            <button
                              type="button"
                              onClick={() => inlineSaveIcp('exclude_keywords', selectedIcp.exclude_keywords.filter(e => e !== ex))}
                              className="p-0.5 rounded-full opacity-50 hover:opacity-100 hover:text-red-500 transition-all"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </FilterSection>

                {/* ── Recent searches ── */}
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
                disabled={!!running || !searchQuery.trim() || credits?.total === 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-[#15A4AE] hover:bg-[#0e8b94] text-white rounded-xl transition-colors disabled:opacity-50 shadow-sm shadow-[#15A4AE]/20"
              >
                {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {running ? 'Running…' : 'Find Leads'}
              </button>
            </div>
          )}
        </div>

        {/* ── CENTER: Results ──────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#232323] rounded-2xl border border-gray-200/60 dark:border-white/8 overflow-hidden shadow-[0_4px_6px_-1px_rgba(0,0,0,0.08),0_10px_30px_-5px_rgba(0,0,0,0.12),0_1px_0px_rgba(255,255,255,0.8)_inset] dark:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3),0_20px_40px_-10px_rgba(0,0,0,0.5),0_1px_0px_rgba(255,255,255,0.04)_inset]">

          {/* ── Toolbar bar 1: dark navy ── */}
          <div className="shrink-0 px-4 py-2.5 bg-[#141c2b] border-b border-white/10 flex items-center gap-3 flex-wrap shadow-[0_2px_8px_rgba(0,0,0,0.35),0_1px_0px_rgba(255,255,255,0.06)_inset]">

            {/* Tier filter pills */}
            <div className="flex items-center gap-1">
              {([
                { key: 'all',  label: 'All',  count: total,     dot: '' },
                { key: 'hot',  label: 'Hot',  count: hotCount,  dot: 'bg-emerald-400' },
                { key: 'warm', label: 'Warm', count: warmCount, dot: 'bg-amber-400'   },
                { key: 'cold', label: 'Cold', count: coldCount, dot: 'bg-slate-400'   },
              ] as const).map(({ key, label, count, dot }) => (
                <button key={key} onClick={() => setTierFilter(key)}
                  className={cn('flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-full font-medium transition-colors',
                    tierFilter === key ? 'bg-[#15A4AE] text-white' : 'bg-white/10 text-white hover:bg-white/15',
                  )}>
                  {dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dot)} />}
                  {label}
                  {results.length > 0 && (
                    <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full tabular-nums font-bold',
                      tierFilter === key ? 'bg-white/25 text-white' : 'bg-white/10 text-white',
                    )}>{count}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Contact filter toggle */}
            {results.length > 0 && (
              <button
                onClick={() => setContactOnlyFilter(v => !v)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-full font-medium transition-colors border',
                  contactOnlyFilter
                    ? 'bg-[#15A4AE]/20 border-[#15A4AE]/50 text-[#15A4AE]'
                    : 'bg-white/10 border-white/20 text-white hover:bg-white/15',
                )}
              >
                <Mail className="w-3 h-3" />
                {contactOnlyFilter ? 'Has contact' : 'Show all'}
              </button>
            )}

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
                      sortKey === key ? 'text-[#15A4AE] bg-[#15A4AE]/15' : 'text-white hover:bg-white/10',
                    )}>
                    <ArrowUpDown className="w-3 h-3" />
                    {label}
                    {sortKey === key && <span className="text-[9px]">{sortDir === 'desc' ? '↓' : '↑'}</span>}
                  </button>
                ))}
              </div>
            )}

            {/* Column visibility */}
            <div className="relative">
              <button onClick={() => setShowColPicker(o => !o)} title="Show/hide columns"
                className={cn('p-2 rounded-lg border transition-colors',
                  showColPicker ? 'bg-[#15A4AE]/15 border-[#15A4AE]/40 text-white' : 'text-white hover:bg-white/10 border-white/20',
                )}>
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

            {/* Import / Export */}
            <input ref={importRef} type="file" accept=".csv" className="hidden" onChange={handleImportCsv} />
            <button
              onClick={() => importRef.current?.click()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-colors border border-white/20"
            >
              <Upload className="w-3.5 h-3.5" />
              Import CSV
            </button>
            {visible.length > 0 && (
              <button
                onClick={exportCsv}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-colors border border-white/20"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            )}
          </div>


          {/* Job progress — single line */}
          {activeJob && <JobProgressStrip job={activeJob} profileName={selectedIcp?.name} />}

          {/* Results table */}
          <div className="flex-1 overflow-auto" onClick={() => setShowColPicker(false)}>
            {visible.length > 0 && (
              <table className="w-full border-separate border-spacing-0">
                <thead>
                  <tr className="sticky top-0 z-10">
                    <th className="pl-5 pr-2 py-2.5 w-4 bg-[#141c2b] border-b border-white/10 rounded-tl-xl" />
                    {/* Company — always */}
                    <th className="px-3 py-2.5 text-left bg-[#141c2b] border-b border-white/10">
                      <button onClick={() => toggleSort('company')}
                        className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-white hover:text-white transition-colors">
                        Company {sortKey === 'company' && <span>{sortDir === 'desc' ? '↓' : '↑'}</span>}
                      </button>
                    </th>
                    {cols.has('score') && (
                      <th className="px-3 py-2.5 text-left bg-[#141c2b] border-b border-white/10">
                        <button onClick={() => toggleSort('score')}
                          className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-white hover:text-white transition-colors">
                          Score {sortKey === 'score' && <span>{sortDir === 'desc' ? '↓' : '↑'}</span>}
                        </button>
                      </th>
                    )}
                    {cols.has('email') && (
                      <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-white bg-[#141c2b] border-b border-white/10">Email</th>
                    )}
                    {cols.has('phone') && (
                      <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-white bg-[#141c2b] border-b border-white/10">Phone</th>
                    )}
                    {cols.has('contact_name') && (
                      <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-white bg-[#141c2b] border-b border-white/10">Contact</th>
                    )}
                    {cols.has('url') && (
                      <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-white bg-[#141c2b] border-b border-white/10">URL</th>
                    )}
                    {cols.has('description') && (
                      <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-white bg-[#141c2b] border-b border-white/10">About</th>
                    )}
                    {cols.has('pricing_hint') && (
                      <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-white bg-[#141c2b] border-b border-white/10">Pricing</th>
                    )}
                    {cols.has('city') && (
                      <th className="px-3 py-2.5 text-left bg-[#141c2b] border-b border-white/10">
                        <button onClick={() => toggleSort('city')}
                          className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-white hover:text-white transition-colors">
                          City {sortKey === 'city' && <span>{sortDir === 'desc' ? '↓' : '↑'}</span>}
                        </button>
                      </th>
                    )}
                    {cols.has('country') && (
                      <th className="px-3 py-2.5 text-left bg-[#141c2b] border-b border-white/10">
                        <button onClick={() => toggleSort('country')}
                          className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-white hover:text-white transition-colors">
                          Country {sortKey === 'country' && <span>{sortDir === 'desc' ? '↓' : '↑'}</span>}
                        </button>
                      </th>
                    )}
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-white bg-[#141c2b] border-b border-white/10 rounded-tr-xl">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(p => (
                    <ProspectRow
                      key={p.id}
                      prospect={p}
                      cols={cols}
                      isPushed={pushedIds.has(p.id)}
                      onCreateDeal={id => setPickerProspectId(id)}
                      onCreateContact={async (id) => { await createContactFromProspect(id) }}
                      onDelete={async (id) => {
                        await deleteProspect(id)
                        setResults(prev => prev.filter(r => r.id !== id))
                      }}
                      onUpdate={async (id, data) => { await updateProspect(id, data) }}
                    />
                  ))}
                </tbody>
              </table>
            )}

            {/* Pagination footer */}
            {visible.length > 0 && (
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 dark:border-white/8 bg-gray-50/60 dark:bg-white/[0.02] shrink-0">
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
                    className="text-xs border dark:border-white/10 rounded-lg px-2 py-1 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/40 cursor-pointer"
                  >
                    {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    {visible.length === 0 ? '0' : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, visible.length)}`} of {visible.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage <= 1}
                      className="px-2.5 py-1 rounded-lg border dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/8 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium">← Prev</button>
                    <span className="px-1">{safePage} / {totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}
                      className="px-2.5 py-1 rounded-lg border dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/8 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium">Next →</button>
                  </div>
                </div>
              </div>
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
                  {selectedIcp ? 'Ready to find leads' : 'Select a profile to get started'}
                </p>
                <p className="text-sm text-gray-400 mt-1.5 max-w-xs leading-relaxed">
                  {selectedIcp
                    ? 'Enter a search query in the left panel and click Find Leads'
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

        {/* ── RIGHT: Activity ──────────────────────────────────────────────────── */}
        <ActivitySidebar
          activity={activity}
          date={activityDate}
          currentPath="/sage/prospects"
          viewingAs={viewingAs}
          className="w-64 flex-shrink-0 flex flex-col overflow-hidden"
        />

        </div>
      </div>
    </>
  )
}
