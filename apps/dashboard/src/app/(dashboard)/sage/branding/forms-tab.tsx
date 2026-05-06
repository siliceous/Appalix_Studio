'use client'

import { useState, useTransition, useRef } from 'react'
import {
  Plus, Loader2, Check, X, Trash2, ToggleLeft, ToggleRight,
  Layout, Copy, ExternalLink, FileText, Image as ImageIcon,
  Palette, Type, Share2, BookOpen, ChevronRight, ChevronLeft,
  Pencil, User, Mail, Phone, AlignLeft, Columns, LayoutGrid,
  Settings2, Eye, Clock, ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  createForm,
  deleteForm,
  updateFormActive,
  updateBrandFieldsConfig,
  updateFormMeta,
  type SageForm,
  type SageFormSubmission,
  type BrandFieldsConfig,
} from '@/app/actions/sage-forms'
import { useRouter } from 'next/navigation'

const DEFAULT_BRAND_FIELDS: BrandFieldsConfig = {
  collect_logo:       true,
  collect_colors:     true,
  collect_fonts:      true,
  collect_photos:     false,
  collect_social:     false,
  collect_guidelines: false,
}

// ── Field catalogue ───────────────────────────────────────────────────────────

const FIELD_ITEMS = [
  { key: 'collect_logo',       icon: ImageIcon,  label: 'Logo',          desc: 'Primary & dark variants' },
  { key: 'collect_colors',     icon: Palette,    label: 'Brand Colours', desc: 'Primary, secondary, accent' },
  { key: 'collect_fonts',      icon: Type,       label: 'Typography',    desc: 'Heading & body fonts' },
  { key: 'collect_photos',     icon: ImageIcon,  label: 'Photography',   desc: 'Hero & product images' },
  { key: 'collect_social',     icon: Share2,     label: 'Social Links',  desc: 'All social profiles' },
  { key: 'collect_guidelines', icon: BookOpen,   label: 'Guidelines',    desc: 'PDF brand guide upload' },
] as const

const CONTACT_FIELDS = [
  { icon: User,      label: 'Full Name' },
  { icon: Mail,      label: 'Email'     },
  { icon: Phone,     label: 'Phone'     },
  { icon: AlignLeft, label: 'Message'   },
]

const LAYOUT_OPTIONS = [
  { icon: Columns,    label: 'One column'  },
  { icon: LayoutGrid, label: 'Two columns' },
]

// ── Form templates ────────────────────────────────────────────────────────────

const FORM_TEMPLATES = [
  {
    id:          'brand_intake',
    form_type:   'brand_intake',
    icon:        Palette,
    label:       'Brand Intake',
    badge:       'Popular',
    description: 'Collect full brand identity — logos, colours, fonts, social links and brand guidelines.',
    fields: {
      collect_logo: true, collect_colors: true, collect_fonts: true,
      collect_photos: false, collect_social: true, collect_guidelines: true,
    } as BrandFieldsConfig,
  },
  {
    id:          'logo_pack',
    form_type:   'logo_pack',
    icon:        ImageIcon,
    label:       'Logo Package',
    badge:       null,
    description: 'Focused form to collect just the client\'s logo files in all variants.',
    fields: {
      collect_logo: true, collect_colors: false, collect_fonts: false,
      collect_photos: false, collect_social: false, collect_guidelines: false,
    } as BrandFieldsConfig,
  },
  {
    id:          'full_kit',
    form_type:   'custom',
    icon:        BookOpen,
    label:       'Full Brand Kit',
    badge:       'Complete',
    description: 'Everything — logos, colours, typography, photography, social profiles and brand guidelines.',
    fields: {
      collect_logo: true, collect_colors: true, collect_fonts: true,
      collect_photos: true, collect_social: true, collect_guidelines: true,
    } as BrandFieldsConfig,
  },
  {
    id:          'custom',
    form_type:   'custom',
    icon:        Layout,
    label:       'Blank Form',
    badge:       null,
    description: 'Start from scratch and configure exactly what asset fields you need.',
    fields: {
      collect_logo: false, collect_colors: false, collect_fonts: false,
      collect_photos: false, collect_social: false, collect_guidelines: false,
    } as BrandFieldsConfig,
  },
]

// ── Template gallery ──────────────────────────────────────────────────────────

function TemplateGallery({
  profileId,
  hasExistingForms,
  onBack,
  onCreated,
}: {
  profileId:        string | null
  hasExistingForms: boolean
  onBack:           () => void
  onCreated:        (form: SageForm) => void
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [formName,   setFormName]   = useState('')
  const [creating,   setCreating]   = useState(false)
  const [createErr,  setCreateErr]  = useState<string | null>(null)

  async function handleCreate(templateId: string) {
    const template = FORM_TEMPLATES.find(t => t.id === templateId)
    if (!template || !profileId || !formName.trim()) { setCreateErr('Form name is required'); return }
    setCreating(true); setCreateErr(null)
    try {
      const result = await createForm({
        name:             formName.trim(),
        brand_profile_id: profileId,
        form_type:        template.form_type,
        fields_config:    template.fields,
      })
      if (result.error) { setCreateErr(result.error); return }
      if (result.form) onCreated(result.form)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden bg-gray-50 dark:bg-gray-950">
      <div className="max-w-3xl mx-auto px-8 py-8">

        {/* Header */}
        <div className="flex items-start gap-4 mb-8">
          {hasExistingForms && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors pt-0.5 shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />Back
            </button>
          )}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Choose a template</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Pick a starting point for your brand asset collection form. You can customise it after.
            </p>
          </div>
        </div>

        {/* Template grid */}
        <div className="grid grid-cols-2 gap-4">
          {FORM_TEMPLATES.map(template => {
            const isSelected  = selectedId === template.id
            const enabledKeys = FIELD_ITEMS.filter(f => template.fields[f.key as keyof BrandFieldsConfig])

            return (
              <div
                key={template.id}
                onClick={() => {
                  setSelectedId(template.id)
                  if (!formName || formName === FORM_TEMPLATES.find(t => t.id === selectedId)?.label) {
                    setFormName(template.label)
                  }
                  setCreateErr(null)
                }}
                className={cn(
                  'relative flex flex-col rounded-2xl border p-5 cursor-pointer transition-all',
                  isSelected
                    ? 'border-brand-400 dark:border-brand-500/60 bg-white dark:bg-gray-900 shadow-md ring-2 ring-brand-200/60 dark:ring-brand-500/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm',
                )}
              >
                {/* Badge */}
                {template.badge && (
                  <span className="absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400">
                    {template.badge}
                  </span>
                )}

                {/* Icon */}
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors',
                  isSelected
                    ? 'bg-brand-100 dark:bg-brand-500/20'
                    : 'bg-gray-100 dark:bg-white/8',
                )}>
                  <template.icon className={cn(
                    'w-5 h-5 transition-colors',
                    isSelected ? 'text-brand-500' : 'text-gray-500 dark:text-gray-400',
                  )} />
                </div>

                {/* Name & description */}
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{template.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-3 flex-1 leading-relaxed">{template.description}</p>

                {/* Field chips */}
                <div className="flex flex-wrap gap-1 mb-4 min-h-[20px]">
                  {enabledKeys.map(f => (
                    <span
                      key={f.key}
                      className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 font-medium"
                    >
                      {f.label}
                    </span>
                  ))}
                  {enabledKeys.length === 0 && (
                    <span className="text-[10px] text-gray-400 italic">Configure fields manually</span>
                  )}
                </div>

                {/* CTA: name input when selected, button otherwise */}
                {isSelected ? (
                  <div className="space-y-2 mt-auto" onClick={e => e.stopPropagation()}>
                    <input
                      autoFocus
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleCreate(template.id) }}
                      placeholder="Give this form a name…"
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-brand-300 dark:border-brand-600/40 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                    {createErr && <p className="text-[10px] text-red-500">{createErr}</p>}
                    <button
                      onClick={() => handleCreate(template.id)}
                      disabled={creating || !formName.trim() || !profileId}
                      className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors disabled:opacity-60"
                    >
                      {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      {creating ? 'Creating…' : 'Create form'}
                    </button>
                  </div>
                ) : (
                  <button className="mt-auto flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-brand-300 dark:hover:border-brand-500/40 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                    Use this template <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {!profileId && (
          <p className="text-xs text-amber-500 text-center mt-6">Select a brand profile first to create a form.</p>
        )}
      </div>
    </div>
  )
}

// ── Submission row ────────────────────────────────────────────────────────────

function SubmissionRow({ sub }: { sub: SageFormSubmission }) {
  const name  = sub.ai_entities?.name  ?? sub.fields?.name  ?? 'Anonymous'
  const email = sub.ai_entities?.email ?? sub.fields?.email ?? null
  const ago   = (() => {
    const diff = Date.now() - new Date(sub.created_at).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 60)  return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  })()
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors border-b border-gray-100 dark:border-white/5 last:border-0">
      <div className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center shrink-0">
        <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400">
          {String(name).charAt(0).toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{name}</p>
        {email && <p className="text-xs text-gray-400 truncate">{email}</p>}
      </div>
      <span className="text-[10px] text-gray-400 shrink-0">{ago}</span>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyCenter({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8 py-20">
      <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center">
        <Layout className="w-7 h-7 text-brand-500" />
      </div>
      <div>
        <p className="text-base font-semibold text-gray-800 dark:text-gray-200">No form selected</p>
        <p className="text-sm text-gray-400 mt-1 max-w-xs">
          Select a form from the left, or create one to start collecting brand assets from your client.
        </p>
      </div>
      <button
        onClick={onNew}
        className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
      >
        <Plus className="w-4 h-4" />New form
      </button>
    </div>
  )
}

// ── Right panel: settings ─────────────────────────────────────────────────────

function SettingsPanel({
  form,
  onToggleActive,
  onFieldToggle,
  saving,
}: {
  form:           SageForm
  onToggleActive: () => void
  onFieldToggle:  (key: keyof BrandFieldsConfig, val: boolean) => void
  saving:         boolean
}) {
  const publicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/forms/${form.id}`
    : `/forms/${form.id}`

  function copy(text: string) {
    navigator.clipboard.writeText(text).catch(() => {})
  }

  const config = {
    ...DEFAULT_BRAND_FIELDS,
    ...(typeof form.fields_config === 'object' && form.fields_config !== null ? form.fields_config : {}),
  } as BrandFieldsConfig

  const SETTING_ROWS: {
    icon: React.ElementType
    label: string
    value: string
    action?: React.ReactNode
  }[] = [
    {
      icon:   Eye,
      label:  'Status',
      value:  form.is_active ? 'Active — accepting submissions' : 'Inactive — form is closed',
      action: (
        <button
          onClick={onToggleActive}
          disabled={saving}
          className={cn(
            'flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors shrink-0 disabled:opacity-50',
            form.is_active
              ? 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-100'
              : 'bg-gray-100 dark:bg-white/8 text-gray-500 hover:bg-gray-200 dark:hover:bg-white/12',
          )}
        >
          {form.is_active
            ? <><ToggleRight className="w-3.5 h-3.5" />Active</>
            : <><ToggleLeft  className="w-3.5 h-3.5" />Inactive</>
          }
        </button>
      ),
    },
    {
      icon:  Clock,
      label: 'Scheduling',
      value: 'Always available',
    },
    {
      icon:  Settings2,
      label: 'Display',
      value: 'Inline embed',
    },
    {
      icon:  ExternalLink,
      label: 'Public link',
      value: publicUrl,
      action: (
        <button
          onClick={() => copy(publicUrl)}
          className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-lg transition-colors shrink-0"
          title="Copy link"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ]

  return (
    <div className="w-[260px] shrink-0 border-l border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden bg-white dark:bg-gray-900">

      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Settings</p>
      </div>

      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden">

        {/* Behaviour section */}
        <div className="px-3 py-3 space-y-0.5">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1 pb-1">Behaviour</p>
          {SETTING_ROWS.map(row => (
            <div
              key={row.label}
              className="flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.03] cursor-default group transition-colors"
            >
              <row.icon className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{row.label}</p>
                <p className="text-[11px] text-gray-400 truncate mt-0.5">{row.value}</p>
              </div>
              {row.action && <div className="shrink-0">{row.action}</div>}
              {!row.action && <ChevronRight className="w-3 h-3 text-gray-300 dark:text-gray-600 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />}
            </div>
          ))}
        </div>

        {/* Asset fields section */}
        <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-700/60 space-y-0.5">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1 pb-1">Asset Fields</p>
          <p className="text-[11px] text-gray-400 px-1 pb-2">Choose what clients can submit.</p>
          {FIELD_ITEMS.map(f => {
            const checked = config[f.key as keyof BrandFieldsConfig] ?? false
            return (
              <label
                key={f.key}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.03] cursor-pointer transition-colors"
              >
                <f.icon className="w-4 h-4 text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{f.label}</p>
                  <p className="text-[11px] text-gray-400">{f.desc}</p>
                </div>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={e => onFieldToggle(f.key as keyof BrandFieldsConfig, e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-brand-600 shrink-0"
                />
              </label>
            )
          })}
        </div>

      </div>
    </div>
  )
}

// ── Main FormsTab ─────────────────────────────────────────────────────────────

interface Props {
  profileId:   string | null
  profileName: string | null
  forms:       SageForm[]
  submissions: SageFormSubmission[]
}

export function FormsTab({ profileId, profileName, forms: initialForms, submissions: initialSubs }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // ── State ────────────────────────────────────────────────────────────────

  const [forms,       setForms]       = useState<SageForm[]>(initialForms)
  const [subs,        setSubs]        = useState<SageFormSubmission[]>(initialSubs)
  const [view,        setView]        = useState<'builder' | 'templates'>('builder')
  const [selectedId,  setSelectedId]  = useState<string | null>(forms[0]?.id ?? null)
  const [saving,      setSaving]      = useState(false)
  const [copiedId,    setCopiedId]    = useState<string | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft,   setNameDraft]   = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)

  const selectedForm = forms.find(f => f.id === selectedId) ?? null
  const formSubs     = subs.filter(s => s.form_id === selectedId)

  // ── Actions ──────────────────────────────────────────────────────────────

  function handleNewForm() {
    if (!profileId) return
    setView('templates')
  }

  function handleTemplateCreated(form: SageForm) {
    setForms(prev => [form, ...prev])
    setSelectedId(form.id)
    setView('builder')
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this form and all its submissions?')) return
    startTransition(async () => {
      await deleteForm(id)
      setForms(prev => prev.filter(f => f.id !== id))
      setSubs(prev => prev.filter(s => s.form_id !== id))
      if (selectedId === id) setSelectedId(forms.find(f => f.id !== id)?.id ?? null)
      router.refresh()
    })
  }

  async function handleToggleActive() {
    if (!selectedForm) return
    setSaving(true)
    const next = !selectedForm.is_active
    await updateFormActive(selectedForm.id, next)
    setForms(prev => prev.map(f => f.id === selectedForm.id ? { ...f, is_active: next } : f))
    setSaving(false)
  }

  async function handleFieldToggle(key: keyof BrandFieldsConfig, val: boolean) {
    if (!selectedForm) return
    const current = { ...DEFAULT_BRAND_FIELDS, ...(selectedForm.fields_config ?? {}) } as BrandFieldsConfig
    const next = { ...current, [key]: val }
    setForms(prev => prev.map(f => f.id === selectedForm.id ? { ...f, fields_config: next } : f))
    await updateBrandFieldsConfig(selectedForm.id, next)
  }

  async function commitName() {
    if (!selectedForm || !nameDraft.trim() || nameDraft.trim() === selectedForm.name) {
      setEditingName(false); return
    }
    setSaving(true)
    await updateFormMeta(selectedForm.id, { name: nameDraft.trim() })
    setForms(prev => prev.map(f => f.id === selectedForm.id ? { ...f, name: nameDraft.trim() } : f))
    setSaving(false); setEditingName(false)
  }

  function copyLink(id: string) {
    const url = `${window.location.origin}/forms/${id}`
    navigator.clipboard.writeText(url).catch(() => {})
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // ── Template gallery view ─────────────────────────────────────────────────

  if (view === 'templates') {
    return (
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel stays visible so user sees their form list */}
        <div className="w-[220px] shrink-0 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden bg-white dark:bg-gray-900">
          <div className="px-3 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
            <div className="flex items-center gap-2">
              <Layout className="w-3.5 h-3.5 text-brand-500" />
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Forms</span>
              {profileName && (
                <span className="ml-auto text-[10px] text-gray-400 truncate max-w-[80px]" title={profileName}>{profileName}</span>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden px-2 py-2 space-y-1">
            {forms.length === 0 && (
              <p className="text-[11px] text-gray-400 text-center py-4 px-2">No forms yet.</p>
            )}
            {forms.map(form => (
              <div
                key={form.id}
                onClick={() => { setSelectedId(form.id); setView('builder') }}
                className="group relative flex flex-col gap-0.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.03] border border-transparent"
              >
                <div className="flex items-center gap-2 pr-5">
                  <FileText className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                  <span className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{form.name}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="px-2 py-2 border-t border-gray-200 dark:border-gray-700 shrink-0">
            <button
              onClick={() => setView('builder')}
              disabled={!profileId}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.04] rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed border border-gray-200 dark:border-gray-700"
            >
              <X className="w-3.5 h-3.5" />Cancel
            </button>
          </div>
        </div>

        {/* Template gallery fills the rest */}
        <TemplateGallery
          profileId={profileId}
          hasExistingForms={forms.length > 0}
          onBack={() => setView('builder')}
          onCreated={handleTemplateCreated}
        />
      </div>
    )
  }

  // ── Builder view ──────────────────────────────────────────────────────────

  return (
    <div className="flex flex-1 overflow-hidden">

      {/* ── Left panel: form list ─────────────────────────── */}
      <div className="w-[220px] shrink-0 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden bg-white dark:bg-gray-900">

        {/* Header */}
        <div className="px-3 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <Layout className="w-3.5 h-3.5 text-brand-500" />
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Forms</span>
            {profileName && (
              <span className="ml-auto text-[10px] text-gray-400 truncate max-w-[80px]" title={profileName}>{profileName}</span>
            )}
          </div>

          {/* Field items */}
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Items</p>
          <div className="grid grid-cols-2 gap-1">
            {FIELD_ITEMS.map(f => (
              <div
                key={f.key}
                className="flex flex-col items-center gap-1 p-2 rounded-lg border border-gray-100 dark:border-white/8 bg-gray-50 dark:bg-white/[0.02] cursor-default"
              >
                <f.icon className="w-4 h-4 text-gray-400" />
                <span className="text-[10px] text-gray-500 dark:text-gray-400 text-center leading-tight">{f.label}</span>
              </div>
            ))}
          </div>

          {/* Contact fields */}
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-3 mb-2">Contact</p>
          <div className="grid grid-cols-2 gap-1">
            {CONTACT_FIELDS.map(f => (
              <div
                key={f.label}
                className="flex flex-col items-center gap-1 p-2 rounded-lg border border-gray-100 dark:border-white/8 bg-gray-50 dark:bg-white/[0.02] cursor-default"
              >
                <f.icon className="w-4 h-4 text-gray-400" />
                <span className="text-[10px] text-gray-500 dark:text-gray-400 text-center leading-tight">{f.label}</span>
              </div>
            ))}
          </div>

          {/* Layout options */}
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-3 mb-2">Layouts</p>
          <div className="space-y-1">
            {LAYOUT_OPTIONS.map(l => (
              <div
                key={l.label}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-gray-100 dark:border-white/8 bg-gray-50 dark:bg-white/[0.02] cursor-default"
              >
                <l.icon className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-[10px] text-gray-500 dark:text-gray-400">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Form list */}
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden px-2 py-2 space-y-1">
          {forms.length === 0 && (
            <p className="text-[11px] text-gray-400 text-center py-4 px-2">No forms yet. Create one below.</p>
          )}
          {forms.map(form => (
            <div
              key={form.id}
              onClick={() => setSelectedId(form.id)}
              className={cn(
                'group relative flex flex-col gap-0.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors',
                selectedId === form.id
                  ? 'bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/30'
                  : 'hover:bg-gray-50 dark:hover:bg-white/[0.03] border border-transparent',
              )}
            >
              <div className="flex items-center gap-2 pr-5">
                <FileText className={cn('w-3.5 h-3.5 shrink-0', selectedId === form.id ? 'text-brand-500' : 'text-gray-400')} />
                <span className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{form.name}</span>
              </div>
              <div className="flex items-center gap-2 pl-5">
                <span className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                  form.is_active
                    ? 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400'
                    : 'bg-gray-100 dark:bg-white/8 text-gray-400',
                )}>
                  {form.is_active ? 'Active' : 'Draft'}
                </span>
                <span className="text-[10px] text-gray-400">
                  {subs.filter(s => s.form_id === form.id).length} sub
                </span>
              </div>
              {/* Delete button */}
              <button
                onClick={e => { e.stopPropagation(); handleDelete(form.id) }}
                disabled={isPending}
                className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 p-0.5 text-gray-300 hover:text-red-500 rounded transition-all disabled:opacity-30"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        {/* New form button */}
        <div className="px-2 py-2 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <button
            onClick={handleNewForm}
            disabled={!profileId}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed border border-dashed border-brand-300 dark:border-brand-500/30"
          >
            <Plus className="w-3.5 h-3.5" />New form
          </button>
        </div>
      </div>

      {/* ── Center panel ─────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-950">
        {!selectedForm ? (
          <EmptyCenter onNew={handleNewForm} />
        ) : (
          <>
            {/* Toolbar */}
            <div className="shrink-0 flex items-center gap-3 px-5 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              {/* Editable form name */}
              {editingName ? (
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <input
                    ref={nameInputRef}
                    value={nameDraft}
                    autoFocus
                    onChange={e => setNameDraft(e.target.value)}
                    onBlur={commitName}
                    onKeyDown={e => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') setEditingName(false) }}
                    className="text-sm font-semibold bg-transparent border-b border-brand-400 focus:outline-none text-gray-900 dark:text-gray-100 min-w-0"
                  />
                  {saving && <Loader2 className="w-3 h-3 animate-spin text-brand-500 shrink-0" />}
                </div>
              ) : (
                <button
                  onClick={() => { setNameDraft(selectedForm.name); setEditingName(true) }}
                  className="flex items-center gap-2 group min-w-0"
                >
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{selectedForm.name}</span>
                  <Pencil className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              )}

              <div className="ml-auto flex items-center gap-2">
                {/* Copy link */}
                <button
                  onClick={() => copyLink(selectedForm.id)}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {copiedId === selectedForm.id
                    ? <><Check className="w-3.5 h-3.5 text-green-500" />Copied!</>
                    : <><Copy className="w-3.5 h-3.5" />Copy link</>
                  }
                </button>

                {/* Open in new tab */}
                <a
                  href={`/forms/${selectedForm.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />Preview
                </a>
              </div>
            </div>

            {/* Form canvas */}
            <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden p-6">

              {/* Form card preview */}
              <div className="max-w-md mx-auto bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm mb-6">
                <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{selectedForm.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Brand asset collection form</p>
                </div>
                <div className="px-6 py-4 space-y-3">
                  {/* Always-on contact fields */}
                  {CONTACT_FIELDS.slice(0, 2).map(f => (
                    <div key={f.label} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
                      <f.icon className="w-3.5 h-3.5 text-gray-300" />
                      <span className="text-xs text-gray-300 dark:text-gray-500">{f.label}</span>
                    </div>
                  ))}
                  {/* Enabled brand fields */}
                  {FIELD_ITEMS.map(f => {
                    const cfg = { ...DEFAULT_BRAND_FIELDS, ...(selectedForm.fields_config ?? {}) } as BrandFieldsConfig
                    if (!cfg[f.key as keyof BrandFieldsConfig]) return null
                    return (
                      <div key={f.key} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-brand-100 dark:border-brand-500/20 bg-brand-50/40 dark:bg-brand-500/5">
                        <f.icon className="w-3.5 h-3.5 text-brand-400" />
                        <span className="text-xs text-brand-500 dark:text-brand-400">{f.label}</span>
                      </div>
                    )
                  })}
                  <div className="pt-1">
                    <div className="w-full py-2 rounded-lg bg-brand-600 flex items-center justify-center">
                      <span className="text-xs font-semibold text-white">Submit assets</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submissions */}
              <div className="max-w-md mx-auto">
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Submissions</p>
                  <span className="text-[10px] bg-gray-100 dark:bg-white/8 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">
                    {formSubs.length}
                  </span>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  {formSubs.length === 0 ? (
                    <div className="py-10 text-center">
                      <p className="text-sm text-gray-400">No submissions yet</p>
                      <p className="text-xs text-gray-300 dark:text-gray-500 mt-1">
                        Share the form link with your client to start collecting assets.
                      </p>
                    </div>
                  ) : (
                    formSubs.map(sub => <SubmissionRow key={sub.id} sub={sub} />)
                  )}
                </div>
              </div>
            </div>

            {/* Step bar */}
            <div className="shrink-0 px-5 py-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2">
              {['Contact', 'Assets', 'Confirmation'].map((step, i) => (
                <div key={step} className="flex items-center gap-2">
                  {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-300" />}
                  <div className={cn(
                    'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border',
                    i === 0
                      ? 'bg-brand-50 dark:bg-brand-500/10 border-brand-200 dark:border-brand-500/30 text-brand-600 dark:text-brand-400'
                      : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500',
                  )}>
                    Step {i + 1}
                    {i === 0 && <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />}
                  </div>
                  {i === 2 && (
                    <div className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-400">
                      <Check className="w-3 h-3" />Success
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Right panel: settings ─────────────────────────── */}
      {selectedForm && (
        <SettingsPanel
          form={selectedForm}
          onToggleActive={handleToggleActive}
          onFieldToggle={handleFieldToggle}
          saving={saving}
        />
      )}

    </div>
  )
}
