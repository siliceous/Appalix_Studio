'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Palette, Image as ImageIcon, FileText, Globe, Layout,
  Upload, Check, X, Trash2, Star, Loader2, Plus,
  AlertCircle, Scan, Pencil,
  Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  saveBrandProfile,
  approveAsset,
  archiveAsset,
  deleteAsset,
  getBrandAssetUploadUrl,
  registerBrandAsset,
  createClientBrandProfile,
  renameBrandProfile,
  deleteClientBrandProfile,
  startBrandScan,
  collectMoreImages,
  saveCandidateAsset,
  saveColorCandidate,
  saveAllColorCandidates,
  ignoreCandidate,
  deleteColor,
  saveFonts,
  type BrandProfileFormData,
  type ScanSessionRow,
  type CandidateRow,
} from '@/app/actions/branding'
import { EmailTemplatesTab } from './email-templates-tab'
import { MyFormsAndTemplates } from '@/features/forms/components/MyFormsAndTemplates'
import { type FormTemplate, type Form } from '@/features/forms/types'
import { useUserAvatar } from '@/contexts/user-avatar-context'

// ── Types ─────────────────────────────────────────────────────────────────────

interface BrandProfileRow {
  id:                     string
  workspace_id:           string
  brand_type:             string
  name:                   string | null
  company_name:           string | null
  tagline:                string | null
  website_url:            string | null
  footer_text:            string | null
  color_primary:          string | null
  color_secondary:        string | null
  color_accent:           string | null
  color_background:       string | null
  color_text:             string | null
  font_heading:           string | null
  font_heading_sub:       string | null
  font_body:              string | null
  brand_palette_json:     Array<{ hex: string; uses: number; roles: string }> | null
  brand_tone:             string | null
  brand_style:            string | null
  cta_style:              string | null
  brand_voice_notes:      string | null
  social_links_json:      Record<string, string> | null
  contact_details_json:   Record<string, string> | null
  brand_version:          number
  brand_confidence_score: number
  created_at:             string
  updated_at?:            string
}

interface BrandAssetRow {
  id:               string
  brand_profile_id: string
  asset_type:       string
  asset_role:       string
  file_url:         string
  file_name:        string | null
  mime_type:        string | null
  label:            string | null
  is_approved:      boolean
  is_primary:       boolean
  is_archived:      boolean
  alt_text:         string | null
}

interface Props {
  userId?:     string
  profiles:    BrandProfileRow[]
  assets:      BrandAssetRow[]
  sessions:    ScanSessionRow[]
  candidates:  CandidateRow[]
  templates:    FormTemplate[]
  builderForms: Form[]
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

type Tab = 'assets' | 'email-templates' | 'forms' | 'website'

const TABS: { key: Tab; label: string; icon: React.ElementType; comingSoon?: boolean }[] = [
  { key: 'assets',          label: 'Assets',          icon: Palette  },
  { key: 'email-templates', label: 'Email Templates', icon: FileText },
  { key: 'forms',           label: 'Forms',           icon: Layout   },
  { key: 'website',         label: 'Website',         icon: Globe,    comingSoon: true },
]

// ── Confidence bar ────────────────────────────────────────────────────────────

function ConfidenceBar({ score, compact, onDark }: { score: number; compact?: boolean; onDark?: boolean }) {
  const pct   = Math.round((score / 6) * 100)
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'
  const label = pct >= 80 ? 'Strong' : pct >= 50 ? 'Partial' : 'Incomplete'

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <div className={cn('flex-1 h-1 rounded-full overflow-hidden', onDark ? 'bg-white/20' : 'bg-gray-200 dark:bg-white/10')}>
          <div className={cn('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
        </div>
        <span className={cn('text-[10px] tabular-nums shrink-0', onDark ? 'text-white/40' : 'text-gray-400')}>{score}/6</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <div className={cn('flex-1 h-1.5 rounded-full overflow-hidden', onDark ? 'bg-white/25' : 'bg-gray-200 dark:bg-white/10')}>
        <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn('text-xs w-16 text-right tabular-nums', onDark ? 'text-white/70' : 'text-gray-500 dark:text-gray-400')}>{label} ({score}/6)</span>
    </div>
  )
}

// ── Left sidebar: Brand ID list ───────────────────────────────────────────────

function BrandSelector({
  profiles,
  selectedId,
  onSelect,
  onCreated,
}: {
  profiles:   BrandProfileRow[]
  selectedId: string | null
  onSelect:   (id: string) => void
  onCreated:  (id: string) => void
}) {
  const router = useRouter()
  const { brandColor } = useUserAvatar()
  const [showNew,    setShowNew]    = useState(false)
  const [newName,    setNewName]    = useState('')
  const [newCompany, setNewCompany] = useState('')
  const [creating,   setCreating]   = useState(false)
  const [createErr,  setCreateErr]  = useState<string | null>(null)

  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameVal,  setRenameVal]  = useState('')
  const [renameBusy, setRenameBusy] = useState(false)
  const renameRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (renamingId) renameRef.current?.focus() }, [renamingId])

  async function commitRename(id: string) {
    if (!renameVal.trim()) { setRenamingId(null); return }
    setRenameBusy(true)
    try { await renameBrandProfile(id, renameVal.trim()) }
    finally { setRenameBusy(false); setRenamingId(null) }
  }

  async function handleDelete(p: BrandProfileRow) {
    if (!confirm(`Delete "${p.name || 'this brand'}"? This cannot be undone.`)) return
    try { await deleteClientBrandProfile(p.id) }
    catch (e) { alert(e instanceof Error ? e.message : 'Delete failed') }
  }

  async function handleCreate() {
    if (!newName.trim()) { setCreateErr('Name is required'); return }
    setCreating(true); setCreateErr(null)
    try {
      const newId = await createClientBrandProfile({ name: newName.trim(), companyName: newCompany.trim() || undefined })
      setNewName(''); setNewCompany(''); setShowNew(false)
      onCreated(newId); router.refresh()
    } catch (e) { setCreateErr(e instanceof Error ? e.message : 'Failed to create') }
    finally { setCreating(false) }
  }

  async function handleCreatePrimary() {
    setCreating(true)
    try {
      await saveBrandProfile({})
      router.refresh()
    } catch (e) { alert(e instanceof Error ? e.message : 'Failed to create primary brand') }
    finally { setCreating(false) }
  }

  const workspaceBrand = profiles.find(p => p.brand_type === 'workspace')
  const clientBrands   = profiles.filter(p => p.brand_type === 'client')

  function BrandCard({ p, label }: { p: BrandProfileRow; label?: string }) {
    const isSelected = selectedId === p.id
    const isWorkspace = p.brand_type === 'workspace'
    const displayName = label ?? p.name ?? p.company_name ?? (isWorkspace ? 'My Brand' : 'Unnamed')
    const isRenaming  = renamingId === p.id
    const scoreColor  = p.brand_confidence_score >= 4 ? 'bg-emerald-500' : p.brand_confidence_score >= 2 ? 'bg-amber-400' : 'bg-red-400'

    return (
      <div className={cn(
        'group relative rounded-xl border transition-all cursor-pointer',
        isSelected
          ? 'bg-gray-100 dark:bg-white/8 border-gray-300 dark:border-white/20 shadow-sm'
          : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      )} onClick={() => !isRenaming && onSelect(p.id)}>

        <div className="px-3 py-2.5">
          {/* Name row */}
          {isRenaming ? (
            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
              <input ref={renameRef} value={renameVal}
                onChange={e => setRenameVal(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') commitRename(p.id); if (e.key === 'Escape') setRenamingId(null) }}
                className="flex-1 min-w-0 text-sm border border-brand-300 dark:border-brand-600/40 rounded px-1.5 py-0.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-brand-600"
              />
              <button onClick={() => commitRename(p.id)} disabled={renameBusy} className="text-emerald-500 disabled:opacity-50 shrink-0">
                {renameBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              </button>
              <button onClick={() => setRenamingId(null)} className="text-gray-400 hover:text-gray-600 shrink-0"><X className="w-3 h-3" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pr-10">
              <div className={cn('w-2 h-2 rounded-full shrink-0', scoreColor)} />
              <span className={cn('text-sm font-medium truncate', isSelected ? 'text-gray-900 dark:text-gray-100' : 'text-gray-800 dark:text-gray-200')}>
                {displayName}
              </span>
            </div>
          )}

          {/* Company name */}
          {p.company_name && !isRenaming && (
            <p className="text-sm text-gray-400 truncate mt-0.5 pl-4">{p.company_name}</p>
          )}

          {/* Confidence bar */}
          {!isRenaming && (
            <div className="mt-2 pl-4">
              <ConfidenceBar score={p.brand_confidence_score} compact />
            </div>
          )}

          {/* Type badge */}
          {!isRenaming && (
            <div className="mt-2 pl-4">
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full font-medium',
                isWorkspace
                  ? 'bg-brand-100 dark:bg-brand-600/15 text-brand-700 dark:text-brand-400'
                  : 'bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400'
              )}>
                {isWorkspace ? 'Primary' : 'Client'}
              </span>
            </div>
          )}
        </div>

        {/* Hover actions */}
        {!isRenaming && (
          <div className="absolute top-2 right-2 hidden group-hover:flex items-center gap-0.5">
            <button onClick={e => { e.stopPropagation(); setRenameVal(p.name ?? ''); setRenamingId(p.id) }}
              className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Rename">
              <Pencil className="w-3 h-3" />
            </button>
            {!isWorkspace && (
              <button onClick={e => { e.stopPropagation(); handleDelete(p) }}
                className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors" title="Delete">
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden h-full">

      {/* Header */}
      <div className="px-4 py-3 shrink-0" style={{ background: brandColor }}>
        <div className="flex items-center gap-2">
          <Palette className="w-3.5 h-3.5 text-white/60" />
          <span className="text-sm font-semibold text-white">Brand IDs</span>
        </div>
      </div>

      {/* New client form */}
      {showNew && (
        <div className="px-3 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 space-y-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3 h-3 text-violet-500 shrink-0" />
            <span className="text-[11px] font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wide">New Client</span>
          </div>
          <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowNew(false) }}
            placeholder="Brand name *"
            className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-600" />
          <input value={newCompany} onChange={e => setNewCompany(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
            placeholder="Company name"
            className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-600" />
          {createErr && <p className="text-[10px] text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {createErr}</p>}
          <div className="flex gap-1.5">
            <button onClick={handleCreate} disabled={creating}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white transition-colors">
              {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
              {creating ? 'Creating…' : 'Create'}
            </button>
            <button onClick={() => { setShowNew(false); setNewName(''); setNewCompany(''); setCreateErr(null) }}
              className="px-2.5 py-1.5 text-xs rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Brand list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {workspaceBrand && <BrandCard p={workspaceBrand} />}
        {!workspaceBrand && (
          <button onClick={handleCreatePrimary} disabled={creating}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium rounded-xl border border-dashed border-brand-300 dark:border-brand-600/40 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-600/5 disabled:opacity-60 transition-colors">
            {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            {creating ? 'Creating…' : 'Create Primary Brand'}
          </button>
        )}
        {clientBrands.length > 0 && (
          <>
            <div className="px-2 pt-2 pb-0.5">
              <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Clients</span>
            </div>
            {clientBrands.map(p => <BrandCard key={p.id} p={p} />)}
          </>
        )}
        {profiles.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">No brand profiles yet.</p>
        )}
      </div>

      {/* Footer — themed Add Client Brand button */}
      <div className="shrink-0 px-3 py-3 border-t border-gray-200 dark:border-gray-700">
        <button onClick={() => { setShowNew(v => !v); setCreateErr(null) }}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg bg-brand-600 hover:bg-brand-700 text-white transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add Client Brand
        </button>
      </div>

    </div>
  )
}

// ── Shared form primitives ────────────────────────────────────────────────────

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</label>
      {children}
      {hint && <p className="text-sm text-gray-400">{hint}</p>}
    </div>
  )
}

function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input className={cn(
      'px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-600 transition-colors',
      className)} {...props} />
  )
}

function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(
      'px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-600 transition-colors',
      className)} {...props}>{children}</select>
  )
}

function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea rows={3} className={cn(
      'px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-600 transition-colors resize-none',
      className)} {...props} />
  )
}

// ── Asset card ────────────────────────────────────────────────────────────────

function AssetCard({ asset, onApprove, onArchive, onDelete }: {
  asset:     BrandAssetRow
  onApprove: (id: string, primary: boolean) => void
  onArchive: (id: string) => void
  onDelete:  (id: string) => void
}) {
  const isImage = asset.mime_type?.startsWith('image/') ?? /\.(png|jpg|jpeg|gif|svg|webp)/i.test(asset.file_url)
  return (
    <div className="group relative flex flex-col gap-1.5 p-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-gray-300 dark:hover:border-white/20 transition-colors">
      <div className="w-full h-24 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/8 flex items-center justify-center overflow-hidden">
        {isImage
          ? <img src={asset.file_url} alt={asset.alt_text ?? asset.label ?? ''} className="max-w-full max-h-full object-contain p-1" />
          : <ImageIcon className="w-5 h-5 text-gray-300" />}
      </div>
      <p className="text-[10px] font-medium text-gray-600 dark:text-gray-300 truncate leading-tight">{asset.label ?? asset.file_name ?? 'Untitled'}</p>
      <div className="flex items-center gap-1">
        {!asset.is_primary && (
          <button onClick={() => onApprove(asset.id, true)}
            className="flex-1 flex items-center justify-center gap-0.5 py-1 text-[10px] font-medium rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 transition-colors">
            <Star className="w-2.5 h-2.5" /> Main
          </button>
        )}
        {asset.is_primary && (
          <span className="flex-1 flex items-center justify-center gap-0.5 py-1 text-[10px] font-medium text-amber-500">
            <Star className="w-2.5 h-2.5 fill-current" /> Primary
          </span>
        )}
        <button onClick={() => onArchive(asset.id)} title="Archive"
          className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors">
          <X className="w-3 h-3" />
        </button>
        <button onClick={() => onDelete(asset.id)} title="Delete"
          className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

// ── Upload zone ───────────────────────────────────────────────────────────────

function UploadZone({ role, profileId, onUploaded }: { role: string; profileId: string; onUploaded: () => void }) {
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setUploading(true); setError(null)
    try {
      const { signedUrl, path, publicUrl } = await getBrandAssetUploadUrl({ fileName: file.name, mimeType: file.type, assetRole: role })
      const res = await fetch(signedUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
      if (!res.ok) throw new Error('Upload failed')
      const assetType = ['primary_logo', 'secondary_logo', 'logo_mark'].includes(role) ? 'logo'
                      : role === 'favicon' ? 'favicon'
                      : file.type.startsWith('image/') ? 'image' : 'other'
      await registerBrandAsset({
        brandProfileId: profileId, assetType,
        assetRole: role, source: 'upload', fileUrl: publicUrl, storagePath: path,
        fileName: file.name, fileSize: file.size, mimeType: file.type,
      })
      onUploaded()
    } catch (e) { setError(e instanceof Error ? e.message : 'Upload failed') }
    finally { setUploading(false) }
  }

  return (
    <div onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
      onClick={() => inputRef.current?.click()}
      className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-dashed border-gray-200 dark:border-white/10 hover:border-brand-400 dark:hover:border-brand-600/50 bg-gray-50 dark:bg-white/3 cursor-pointer transition-colors min-h-[3.5rem]">
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      {uploading ? <Loader2 className="w-3.5 h-3.5 text-brand-500 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-gray-400" />}
      <p className="text-[10px] text-gray-400 text-center capitalize leading-tight">{uploading ? 'Uploading…' : role.replace(/_/g, ' ')}</p>
      {error && <p className="text-[10px] text-red-500 text-center">{error}</p>}
    </div>
  )
}

// ── Assets tab — three-column layout ─────────────────────────────────────────

function AssetsTab({
  profile, assets,
  profiles, selectedProfileId, onSelectProfile, onCreated,
  sessions, candidates,
}: {
  profile:           BrandProfileRow | null
  assets:            BrandAssetRow[]
  profiles:          BrandProfileRow[]
  selectedProfileId: string | null
  onSelectProfile:   (id: string) => void
  onCreated:         (id: string) => void
  sessions:          ScanSessionRow[]
  candidates:        CandidateRow[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const { brandColor } = useUserAvatar()

  const [scanning,       setScanning]      = useState(false)
  const [scanError,      setScanError]     = useState<string | null>(null)
  const [scanMessage,    setScanMessage]   = useState<string | null>(null)
  const [fontHeading,    setFontHeading]   = useState(profile?.font_heading     ?? '')
  const [fontSub,        setFontSub]       = useState(profile?.font_heading_sub ?? '')
  const [fontBody,       setFontBody]      = useState(profile?.font_body        ?? '')
  const [savingFonts,    setSavingFonts]   = useState(false)
  const [savedFonts,     setSavedFonts]    = useState(false)
  const [actionBusy,     setActionBusy]    = useState<Record<string, boolean>>({})
  const [collectingMore, setCollectingMore]= useState(false)
  const [saving,         setSaving]        = useState(false)
  const [saved,          setSaved]         = useState(false)
  const [showLogoUpload, setShowLogoUpload]= useState(false)

  const [form, setForm] = useState<BrandProfileFormData>({
    company_name:      profile?.company_name      ?? '',
    tagline:           profile?.tagline           ?? '',
    website_url:       profile?.website_url       ?? '',
    footer_text:       profile?.footer_text       ?? '',
    color_primary:     profile?.color_primary     ?? '',
    color_secondary:   profile?.color_secondary   ?? '',
    color_accent:      profile?.color_accent      ?? '',
    color_background:  profile?.color_background  ?? '',
    color_text:        profile?.color_text        ?? '',
    brand_tone:        profile?.brand_tone        ?? '',
    brand_style:       profile?.brand_style       ?? '',
    cta_style:         profile?.cta_style         ?? '',
    brand_voice_notes: profile?.brand_voice_notes ?? '',
  })

  // Most recent completed scan session for this profile
  const latestSession = sessions
    .filter(s => s.brand_profile_id === profile?.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] ?? null

  const profileCandidates = candidates.filter(c => c.brand_profile_id === profile?.id)
  const colorCandidates   = profileCandidates.filter(c => c.asset_type === 'color')
  const logoCandidates    = profileCandidates.filter(c => c.asset_type === 'logo')
  const faviconCandidates = profileCandidates.filter(c => c.asset_type === 'favicon')
  const imageCandidates   = profileCandidates.filter(c => c.asset_type === 'image' || c.asset_type === 'product_image')

  const savedPalette  = profile?.brand_palette_json ?? []
  const profileAssets = assets.filter(a => a.brand_profile_id === profile?.id)
  const savedLogos    = profileAssets.filter(a => ['primary_logo', 'secondary_logo', 'logo_mark'].includes(a.asset_role))
  const savedFavicons = profileAssets.filter(a => a.asset_role === 'favicon')
  const savedImages   = profileAssets.filter(a => !['primary_logo', 'secondary_logo', 'logo_mark', 'favicon'].includes(a.asset_role))
  const hasMoreImages = (latestSession?.scan_summary?.allImageUrls?.length ?? 0) > 0
  const isEcommerce   = latestSession?.is_ecommerce ?? false

  // Sync form and font cards when profile or latest session changes
  useEffect(() => {
    const scanFonts = latestSession?.scan_summary?.fonts
    setFontHeading(scanFonts?.heading    || profile?.font_heading     || '')
    setFontSub(    scanFonts?.headingSub || profile?.font_heading_sub || '')
    setFontBody(   scanFonts?.body       || profile?.font_body        || '')
    setForm({
      company_name:      profile?.company_name      ?? '',
      tagline:           profile?.tagline           ?? '',
      website_url:       profile?.website_url       ?? '',
      footer_text:       profile?.footer_text       ?? '',
      color_primary:     profile?.color_primary     ?? '',
      color_secondary:   profile?.color_secondary   ?? '',
      color_accent:      profile?.color_accent      ?? '',
      color_background:  profile?.color_background  ?? '',
      color_text:        profile?.color_text        ?? '',
      brand_tone:        profile?.brand_tone        ?? '',
      brand_style:       profile?.brand_style       ?? '',
      cta_style:         profile?.cta_style         ?? '',
      brand_voice_notes: profile?.brand_voice_notes ?? '',
    })
    setSaved(false)
    setScanMessage(null)
    setScanError(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, profile?.updated_at, latestSession?.id])

  function setField(key: keyof BrandProfileFormData, val: string) {
    setForm(f => ({ ...f, [key]: val })); setSaved(false)
  }

  function setBusy(id: string, busy: boolean) {
    setActionBusy(prev => ({ ...prev, [id]: busy }))
  }

  async function handleScan() {
    const url = form.website_url?.trim()
    if (!url || !profile) return
    setScanning(true); setScanError(null); setScanMessage(null)
    try {
      const result = await startBrandScan(profile.id, url)
      setScanMessage(result.message)
      router.refresh()
    } catch (e) {
      setScanError(e instanceof Error ? e.message : 'Scan failed')
    } finally { setScanning(false) }
  }

  async function handleSaveFonts() {
    if (!profile) return
    setSavingFonts(true)
    try {
      await saveFonts(profile.id, { heading: fontHeading, headingSub: fontSub, body: fontBody })
      setSavedFonts(true)
      setTimeout(() => setSavedFonts(false), 2000)
      router.refresh()
    } finally { setSavingFonts(false) }
  }

  async function handleSaveColor(id: string) {
    setBusy(id, true)
    try { await saveColorCandidate(id); router.refresh() }
    finally { setBusy(id, false) }
  }

  async function handleSaveAllColors() {
    if (!profile) return
    setSaving(true)
    try { await saveAllColorCandidates(profile.id); router.refresh() }
    finally { setSaving(false) }
  }

  async function handleDeleteColor(hex: string) {
    if (!profile) return
    await deleteColor(profile.id, hex)
    router.refresh()
  }

  async function handleSaveCandidate(id: string) {
    setBusy(id, true)
    try { await saveCandidateAsset(id); router.refresh() }
    catch (e) { alert(e instanceof Error ? e.message : 'Could not save asset') }
    finally { setBusy(id, false) }
  }

  async function handleIgnoreCandidate(id: string) {
    setBusy(id, true)
    try { await ignoreCandidate(id); router.refresh() }
    finally { setBusy(id, false) }
  }

  async function handleCollectMore() {
    if (!latestSession || !profile) return
    setCollectingMore(true)
    try { await collectMoreImages(latestSession.id, profile.id); router.refresh() }
    finally { setCollectingMore(false) }
  }

  function handleApprove(id: string, primary: boolean) {
    startTransition(async () => { await approveAsset(id, primary); router.refresh() })
  }
  function handleArchive(id: string) {
    startTransition(async () => { await archiveAsset(id); router.refresh() })
  }
  function handleDelete(id: string) {
    startTransition(async () => { await deleteAsset(id); router.refresh() })
  }

  async function handleSave() {
    if (!profile) return
    setSaving(true)
    try {
      await Promise.all([
        saveBrandProfile(form, profile.id),
        saveFonts(profile.id, { heading: fontHeading, headingSub: fontSub, body: fontBody }),
      ])
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      router.refresh()
    } finally { setSaving(false) }
  }

  const fontPreviewFonts = [fontHeading, fontSub, fontBody].filter(Boolean)
  const gfQuery = fontPreviewFonts.map(f => `family=${encodeURIComponent(f)}:wght@400;700`).join('&')

  return (
    <div className="flex-1 min-h-0 bg-[#f5f4f1] dark:bg-gray-950 overflow-hidden flex flex-col">
      <div className="flex gap-5 flex-1 min-h-0 px-6 py-5">

        {/* ── Column 1: Brand IDs ── */}
        <div className="w-52 shrink-0 flex flex-col overflow-hidden">
          <BrandSelector
            profiles={profiles}
            selectedId={selectedProfileId}
            onSelect={onSelectProfile}
            onCreated={onCreated}
          />
        </div>

        {/* ── Column 2: Assets (center) ── */}
        <div className="flex-1 min-w-0 flex flex-col rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">

          <div className="shrink-0 px-4 py-2.5" style={{ background: brandColor }}>
            <span className="text-sm font-semibold text-white">Assets</span>
          </div>

          {/* Scan bar */}
          <div className="shrink-0 px-4 py-2 border-b border-gray-100 dark:border-white/8 bg-white dark:bg-gray-900">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 flex-1 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-white/15 bg-white dark:bg-gray-800 min-w-0">
                <Globe className="w-3 h-3 text-gray-400 shrink-0" />
                <input type="url" value={form.website_url ?? ''}
                  onChange={e => setField('website_url', e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && form.website_url?.trim() && profile) handleScan() }}
                  placeholder="Enter your URL here"
                  className="flex-1 text-xs bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 min-w-0" />
              </div>
              <button onClick={handleScan} disabled={scanning || !form.website_url?.trim() || !profile}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white transition-colors shrink-0">
                {scanning ? <><Loader2 className="w-3 h-3 animate-spin" /> Scanning…</> : <><Scan className="w-3 h-3" /> Scan</>}
              </button>
            </div>
          </div>
          {scanError && (
            <div className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-red-500/10 border-b border-red-200/20">
              <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />
              <span className="text-[10px] text-red-400">{scanError}</span>
            </div>
          )}
          {scanMessage && !scanError && (
            <div className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 border-b border-emerald-200/20">
              <Check className="w-3 h-3 text-emerald-500 shrink-0" />
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">{scanMessage}</span>
            </div>
          )}

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">

            {/* ── Colours ── */}
            {(savedPalette.length > 0 || colorCandidates.length > 0) && (
              <section className="space-y-2">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Colours</h2>

                {savedPalette.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400">Saved</span>
                    <div className="flex flex-wrap gap-2">
                      {savedPalette.map(c => (
                        <div key={c.hex} className="group flex flex-col items-center gap-0.5">
                          <div className="relative">
                            <div className="w-7 h-7 rounded-full border border-gray-200 dark:border-white/10 shadow-sm cursor-pointer group-hover:scale-110 transition-transform"
                              style={{ backgroundColor: c.hex }} onClick={() => navigator.clipboard?.writeText(c.hex)} title={c.hex} />
                            <button onClick={() => handleDeleteColor(c.hex)}
                              className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-white items-center justify-center hidden group-hover:flex">
                              <X className="w-2 h-2" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {colorCandidates.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-400">New from scan ({colorCandidates.length})</span>
                      <button onClick={handleSaveAllColors} disabled={saving}
                        className="text-[10px] font-medium text-brand-600 dark:text-brand-400 hover:underline disabled:opacity-60">
                        Save All
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {colorCandidates.map(c => (
                        <div key={c.id} className="group flex flex-col items-center gap-0.5">
                          <div className="relative">
                            <div className="w-7 h-7 rounded-full border-2 border-dashed border-brand-300 dark:border-brand-600/50 shadow-sm cursor-pointer"
                              style={{ backgroundColor: c.value ?? '#ccc' }}
                              onClick={() => navigator.clipboard?.writeText(c.value ?? '')} title={c.value ?? ''} />
                            <button onClick={() => handleSaveColor(c.id)} disabled={!!actionBusy[c.id]}
                              className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-brand-600 text-white items-center justify-center hidden group-hover:flex disabled:opacity-60">
                              {actionBusy[c.id] ? <Loader2 className="w-2 h-2 animate-spin" /> : <Plus className="w-2 h-2" />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* ── Fonts ── */}
            {profile && (
              <section className="space-y-2">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Fonts</h2>
                {fontPreviewFonts.length > 0 && (
                  // eslint-disable-next-line @next/next/no-page-custom-font
                  <link rel="stylesheet" href={`https://fonts.googleapis.com/css2?${gfQuery}&display=swap`} />
                )}
                <div className="flex flex-col gap-2">
                  {([
                    { label: 'Primary',   value: fontHeading, onChange: setFontHeading, placeholder: 'e.g. Playfair Display' },
                    { label: 'Secondary', value: fontSub,     onChange: setFontSub,     placeholder: 'e.g. Lato' },
                    { label: 'Body',      value: fontBody,    onChange: setFontBody,     placeholder: 'e.g. Inter' },
                  ]).map(({ label, value, onChange, placeholder }) => (
                    <div key={label} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/3">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-16 shrink-0">{label}</span>
                      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                        className="w-28 shrink-0 text-xs border border-gray-200 dark:border-white/10 rounded px-1.5 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-brand-600" />
                      {value ? (
                        <p className="flex-1 text-sm text-gray-600 dark:text-gray-300 truncate"
                          style={{ fontFamily: `"${value}", sans-serif` }}>
                          The quick brown fox jumps over the lazy dog
                        </p>
                      ) : (
                        <p className="flex-1 text-xs text-gray-300 dark:text-gray-600 italic">No font set</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Logos & Favicons ── */}
            {(savedLogos.length > 0 || savedFavicons.length > 0 || logoCandidates.length > 0 || faviconCandidates.length > 0 || !!profile) && (
              <section className="space-y-2">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Logos &amp; Favicons</h2>

                {(savedLogos.length > 0 || savedFavicons.length > 0) && (
                  <div className="flex flex-wrap gap-2">
                    {[...savedLogos, ...savedFavicons].map(a => (
                      <div key={a.id} className="group relative shrink-0">
                        <div className="relative w-20 h-20 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex items-center justify-center overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={a.file_url} alt={a.label ?? ''} className="max-w-full max-h-full object-contain p-2"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 rounded-xl">
                            <button onClick={() => handleArchive(a.id)}
                              className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors">
                              <X className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(a.id)}
                              className="w-7 h-7 rounded-full bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-[9px] text-gray-400 text-center mt-0.5 truncate max-w-[5rem]">{a.label ?? a.asset_role}</p>
                      </div>
                    ))}
                    <button onClick={() => setShowLogoUpload(v => !v)} title="Add logo"
                      className="w-20 h-20 rounded-xl border border-dashed border-gray-300 dark:border-white/20 flex items-center justify-center text-gray-400 hover:border-brand-400 hover:text-brand-500 transition-colors shrink-0">
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                )}

                {(logoCandidates.length > 0 || faviconCandidates.length > 0) && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400">New from scan</span>
                    <div className="flex flex-wrap gap-3">
                      {[...logoCandidates, ...faviconCandidates].map(c => (
                        <div key={c.id} className="flex flex-col items-center gap-1">
                          <div className="w-20 h-20 rounded-xl border border-dashed border-brand-300 dark:border-brand-600/50 bg-brand-50/30 dark:bg-brand-600/5 flex items-center justify-center overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={c.value ?? ''} alt={c.title ?? ''} className="max-w-full max-h-full object-contain p-2"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                          </div>
                          <p className="text-[9px] text-gray-400 truncate max-w-[5rem] text-center">{c.title ?? c.asset_type}</p>
                          <div className="flex gap-1">
                            <button onClick={() => handleSaveCandidate(c.id)} disabled={!!actionBusy[c.id]}
                              className="px-2 py-0.5 text-[10px] font-medium rounded bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-60 transition-colors">
                              {actionBusy[c.id] ? <Loader2 className="w-2.5 h-2.5 animate-spin inline" /> : 'Save'}
                            </button>
                            <button onClick={() => handleIgnoreCandidate(c.id)} disabled={!!actionBusy[c.id]}
                              className="px-1.5 py-0.5 text-[10px] rounded border border-gray-200 dark:border-white/10 text-gray-400 hover:text-red-500 disabled:opacity-60 transition-colors">
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {profile && savedLogos.length === 0 && savedFavicons.length === 0 && logoCandidates.length === 0 && faviconCandidates.length === 0 && (
                  <div className="grid grid-cols-4 gap-1.5">
                    <UploadZone role="primary_logo"   profileId={profile.id} onUploaded={() => router.refresh()} />
                    <UploadZone role="secondary_logo" profileId={profile.id} onUploaded={() => router.refresh()} />
                    <UploadZone role="logo_mark"      profileId={profile.id} onUploaded={() => router.refresh()} />
                    <UploadZone role="favicon"        profileId={profile.id} onUploaded={() => router.refresh()} />
                  </div>
                )}
                {profile && showLogoUpload && (savedLogos.length > 0 || savedFavicons.length > 0) && (
                  <div className="grid grid-cols-4 gap-1.5">
                    <UploadZone role="primary_logo"   profileId={profile.id} onUploaded={() => { router.refresh(); setShowLogoUpload(false) }} />
                    <UploadZone role="secondary_logo" profileId={profile.id} onUploaded={() => { router.refresh(); setShowLogoUpload(false) }} />
                    <UploadZone role="logo_mark"      profileId={profile.id} onUploaded={() => { router.refresh(); setShowLogoUpload(false) }} />
                    <UploadZone role="favicon"        profileId={profile.id} onUploaded={() => { router.refresh(); setShowLogoUpload(false) }} />
                  </div>
                )}
              </section>
            )}

            {/* ── Images ── */}
            {(savedImages.length > 0 || imageCandidates.length > 0 || !!profile) && (
              <section className="space-y-2">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Images</h2>
                <div className="grid grid-cols-3 gap-2">
                  {savedImages.map(a => (
                    <AssetCard key={a.id} asset={a} onApprove={handleApprove} onArchive={handleArchive} onDelete={handleDelete} />
                  ))}
                  {imageCandidates.map(c => (
                    <div key={c.id} className="relative flex flex-col gap-1.5 p-2 rounded-lg border border-dashed border-brand-300 dark:border-brand-600/50 bg-brand-50/20 dark:bg-brand-600/5">
                      <div className="w-full h-24 rounded bg-gray-50 dark:bg-white/5 flex items-center justify-center overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={c.value ?? ''} alt={c.title ?? ''} className="max-w-full max-h-full object-cover"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      </div>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 truncate">{c.title}</p>
                      <div className="flex gap-1">
                        <button onClick={() => handleSaveCandidate(c.id)} disabled={!!actionBusy[c.id]}
                          className="flex-1 flex items-center justify-center gap-0.5 py-1 text-[10px] font-medium rounded bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-60 transition-colors">
                          {actionBusy[c.id] ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Plus className="w-2.5 h-2.5" />}
                          {actionBusy[c.id] ? 'Saving…' : 'Save'}
                        </button>
                        <button onClick={() => handleIgnoreCandidate(c.id)} disabled={!!actionBusy[c.id]}
                          className="p-1 rounded border border-gray-200 dark:border-white/10 text-gray-400 hover:text-red-500 disabled:opacity-60 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {profile && (
                    <>
                      <UploadZone role="hero_image"       profileId={profile.id} onUploaded={() => router.refresh()} />
                      <UploadZone role="background_image" profileId={profile.id} onUploaded={() => router.refresh()} />
                      <UploadZone role="general"          profileId={profile.id} onUploaded={() => router.refresh()} />
                    </>
                  )}
                </div>
                {hasMoreImages && (
                  <button onClick={handleCollectMore} disabled={collectingMore}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg border border-dashed border-gray-300 dark:border-white/20 text-gray-500 hover:border-brand-400 hover:text-brand-600 disabled:opacity-60 transition-colors">
                    {collectingMore ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                    {collectingMore ? 'Loading…' : 'Collect More Images'}
                  </button>
                )}
              </section>
            )}

            {/* ── Products (ecommerce only) ── */}
            {isEcommerce && imageCandidates.filter(c => c.asset_type === 'product_image').length > 0 && (
              <section className="space-y-2">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Products</h2>
                <div className="grid grid-cols-3 gap-2">
                  {imageCandidates.filter(c => c.asset_type === 'product_image').map(c => (
                    <div key={c.id} className="relative flex flex-col gap-1.5 p-2 rounded-lg border border-dashed border-brand-300 dark:border-brand-600/50 bg-brand-50/20 dark:bg-brand-600/5">
                      <div className="w-full h-24 rounded bg-gray-50 dark:bg-white/5 flex items-center justify-center overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={c.value ?? ''} alt={c.title ?? ''} className="max-w-full max-h-full object-contain"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      </div>
                      <p className="text-[10px] font-medium text-gray-500 truncate">{c.title}</p>
                      <div className="flex gap-1">
                        <button onClick={() => handleSaveCandidate(c.id)} disabled={!!actionBusy[c.id]}
                          className="flex-1 flex items-center justify-center gap-0.5 py-1 text-[10px] font-medium rounded bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-60 transition-colors">
                          {actionBusy[c.id] ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : 'Save'}
                        </button>
                        <button onClick={() => handleIgnoreCandidate(c.id)} disabled={!!actionBusy[c.id]}
                          className="p-1 rounded border border-gray-200 dark:border-white/10 text-gray-400 hover:text-red-500 disabled:opacity-60 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {!profile && (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <Palette className="w-8 h-8 text-gray-200 dark:text-white/10" />
                <p className="text-sm font-medium text-gray-400">Select a brand profile to get started</p>
              </div>
            )}

          </div>{/* end scrollable body */}

          {/* Sticky footer Save bar */}
          <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-t border-gray-200 dark:border-white/10">
            <button onClick={handleSave} disabled={saving || !profile}
              className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5" /> : null}
              {saving ? 'Saving…' : saved ? 'Saved' : 'Save'}
            </button>
            {saved && <span className="text-xs text-emerald-500">Saved</span>}
          </div>

        </div>{/* end Assets card */}

        {/* ── Column 3: Brand Identity (right) ── */}
        <div className="w-80 shrink-0 flex flex-col rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">

          <div className="shrink-0 px-4 py-2.5" style={{ background: brandColor }}>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-white shrink-0">Identity</span>
              {profile ? (() => {
                const pct   = Math.round((profile.brand_confidence_score / 6) * 100)
                const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444'
                return (
                  <div className="flex-1 flex items-center gap-1.5">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.12)' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                    </div>
                    <span className="text-[10px] tabular-nums shrink-0 text-white">{profile.brand_confidence_score}/6</span>
                  </div>
                )
              })() : <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }} />}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
            {!profile ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                <Globe className="w-7 h-7 text-gray-300 dark:text-white/20" />
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Select a brand profile</p>
              </div>
            ) : (
              <>
                <section className="space-y-3">
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Identity</h2>
                  <div className="grid grid-cols-1 gap-3">
                    <Field label="Company Name"><Input value={form.company_name ?? ''} onChange={e => setField('company_name', e.target.value)} placeholder="Acme Ltd" /></Field>
                    <Field label="Tagline"><Input value={form.tagline ?? ''} onChange={e => setField('tagline', e.target.value)} placeholder="Short, punchy one-liner" /></Field>
                    <Field label="Footer Text"><Input value={form.footer_text ?? ''} onChange={e => setField('footer_text', e.target.value)} placeholder="© 2025 Acme Ltd." /></Field>
                  </div>
                </section>

                <section className="space-y-3">
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Brand Voice</h2>
                  <div className="grid grid-cols-3 gap-2">
                    <Field label="Tone">
                      <Select value={form.brand_tone ?? ''} onChange={e => setField('brand_tone', e.target.value)}>
                        <option value="">Tone…</option>
                        <option value="professional">Professional</option>
                        <option value="friendly">Friendly</option>
                        <option value="premium">Premium</option>
                        <option value="direct">Direct</option>
                        <option value="playful">Playful</option>
                        <option value="authoritative">Authoritative</option>
                        <option value="conversational">Conversational</option>
                      </Select>
                    </Field>
                    <Field label="Style">
                      <Select value={form.brand_style ?? ''} onChange={e => setField('brand_style', e.target.value)}>
                        <option value="">Style…</option>
                        <option value="minimal">Minimal</option>
                        <option value="corporate">Corporate</option>
                        <option value="bold">Bold</option>
                        <option value="modern">Modern</option>
                        <option value="storytelling">Storytelling</option>
                        <option value="data-driven">Data-driven</option>
                      </Select>
                    </Field>
                    <Field label="CTA">
                      <Select value={form.cta_style ?? ''} onChange={e => setField('cta_style', e.target.value)}>
                        <option value="">CTA…</option>
                        <option value="soft">Soft</option>
                        <option value="consultative">Consultative</option>
                        <option value="assertive">Assertive</option>
                      </Select>
                    </Field>
                  </div>
                  <Field label="Voice Notes">
                    <Textarea value={form.brand_voice_notes ?? ''} onChange={e => setField('brand_voice_notes', e.target.value)}
                      placeholder="Audience, words to avoid, sample copy…" rows={3} />
                  </Field>
                </section>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 px-4 py-3 border-t border-gray-200 dark:border-white/10 shrink-0">
            <button onClick={handleSave} disabled={saving || !profile}
              className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5" /> : null}
              {saving ? 'Saving…' : saved ? 'Saved' : 'Save'}
            </button>
            {saved && <span className="text-xs text-emerald-500">Saved</span>}
          </div>

        </div>{/* end Brand Identity card */}

      </div>
    </div>
  )
}

// ── Coming soon tab ───────────────────────────────────────────────────────────

function ComingSoonTab({ label }: { label: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6 py-24">
      <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/8 flex items-center justify-center">
        <Plus className="w-5 h-5 text-gray-400" />
      </div>
      <p className="text-base font-semibold text-gray-700 dark:text-gray-300">{label}</p>
      <p className="text-sm text-gray-400 max-w-xs">Complete the Assets tab first. {label} generation uses your brand profile as its foundation.</p>
    </div>
  )
}

// ── Main client ───────────────────────────────────────────────────────────────

export function BrandingClient({ profiles, assets, sessions, candidates, templates, builderForms }: Props) {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const defaultId = profiles.find(p => p.brand_type === 'workspace')?.id ?? profiles[0]?.id ?? null
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(defaultId)
  const [pendingSelectId,    setPendingSelectId]   = useState<string | null>(null)
  const [activeTab,          setActiveTab]          = useState<Tab>(() => {
    const p = searchParams.get('tab') as Tab | null
    return (p && ['assets', 'email-templates', 'forms', 'website'].includes(p)) ? p : 'assets'
  })

  useEffect(() => {
    if (pendingSelectId && profiles.find(p => p.id === pendingSelectId)) {
      setSelectedProfileId(pendingSelectId)
      setPendingSelectId(null)
    }
  }, [profiles, pendingSelectId])

  const selectedProfile = profiles.find(p => p.id === selectedProfileId) ?? null
  const profileAssets   = assets.filter(a => a.brand_profile_id === selectedProfileId)

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">

      {/* Tab bar */}
      <div className="shrink-0 flex items-center gap-1 px-4 pt-4 pb-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={cn(
              'relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors',
              activeTab === tab.key
                ? 'text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-950 border border-b-0 border-gray-200 dark:border-gray-700 -mb-px'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            )}>
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.comingSoon && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 font-normal">Soon</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {activeTab === 'assets' && (
          <AssetsTab
            profile={selectedProfile}
            assets={profileAssets}
            profiles={profiles}
            selectedProfileId={selectedProfileId}
            onSelectProfile={id => { setSelectedProfileId(id); setActiveTab('assets') }}
            onCreated={newId => { setPendingSelectId(newId); router.refresh() }}
            sessions={sessions}
            candidates={candidates}
          />
        )}
        {activeTab === 'email-templates' && (
          <EmailTemplatesTab
            profile={selectedProfile ?? null}
            assets={assets}
            allProfiles={profiles}
            allAssets={assets}
          />
        )}
        {activeTab === 'forms' && (
          <MyFormsAndTemplates templates={templates} forms={builderForms} />
        )}
        {activeTab === 'website'         && <ComingSoonTab label="Website" />}
      </div>

    </div>
  )
}
