'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  registerScannedAsset,
  scanWebsiteForBrand,
  createClientBrandProfile,
  renameBrandProfile,
  deleteClientBrandProfile,
  type BrandProfileFormData,
  type ScanResult,
} from '@/app/actions/branding'
import { EmailTemplatesTab } from './email-templates-tab'

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
  userId?:  string
  profiles: BrandProfileRow[]
  assets:   BrandAssetRow[]
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

type Tab = 'assets' | 'email-templates' | 'forms' | 'website'

const TABS: { key: Tab; label: string; icon: React.ElementType; comingSoon?: boolean }[] = [
  { key: 'assets',          label: 'Assets',          icon: Palette  },
  { key: 'email-templates', label: 'Email Templates', icon: FileText },
  { key: 'forms',           label: 'Forms',           icon: Layout,   comingSoon: true },
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

      {/* Header — dark panel, title only */}
      <div className="bg-gray-900 dark:bg-gray-800 px-4 py-3 shrink-0">
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

function ColorField({ label, name, value, onChange }: {
  label: string; name: string; value: string; onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</label>
      <div className="flex items-center gap-2">
        <div className="relative w-8 h-8 rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden shrink-0 cursor-pointer">
          <input type="color" value={value || '#000000'} onChange={e => onChange(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          <div className="w-full h-full rounded-lg" style={{ backgroundColor: value || '#e5e7eb' }} />
        </div>
        <input type="text" name={name} value={value} onChange={e => onChange(e.target.value)}
          placeholder="#000000" maxLength={7}
          className="flex-1 px-3 py-1.5 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-600 font-mono" />
      </div>
    </div>
  )
}

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
        {!asset.is_approved && (
          <button onClick={() => onApprove(asset.id, !asset.is_primary)}
            className="flex-1 flex items-center justify-center gap-0.5 py-1 text-[10px] font-medium rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition-colors">
            <Check className="w-2.5 h-2.5" /> Ok
          </button>
        )}
        {asset.is_approved && !asset.is_primary && (
          <button onClick={() => onApprove(asset.id, true)}
            className="flex-1 flex items-center justify-center gap-0.5 py-1 text-[10px] font-medium rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 transition-colors">
            <Star className="w-2.5 h-2.5" /> Main
          </button>
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
}: {
  profile:           BrandProfileRow | null
  assets:            BrandAssetRow[]
  profiles:          BrandProfileRow[]
  selectedProfileId: string | null
  onSelectProfile:   (id: string) => void
  onCreated:         (id: string) => void
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  const [scanning,        setScanning]        = useState(false)
  const [scanError,       setScanError]       = useState<string | null>(null)
  const [scanResult,      setScanResult]      = useState<ScanResult | null>(null)
  const [applyingAssets,  setApplyingAssets]  = useState<Record<string, boolean>>({})
  const [showLogoUpload,  setShowLogoUpload]  = useState(false)
  const [appliedAssets,   setAppliedAssets]   = useState<Record<string, boolean>>({})
  const [dupeModal,       setDupeModal]       = useState(false)
  const justSavedRef = useRef(false)

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
    font_heading:      profile?.font_heading      ?? '',
    font_heading_sub:  profile?.font_heading_sub  ?? '',
    font_body:         profile?.font_body         ?? '',
    brand_palette_json: profile?.brand_palette_json ?? undefined,
    brand_tone:        profile?.brand_tone        ?? '',
    brand_style:       profile?.brand_style       ?? '',
    cta_style:         profile?.cta_style         ?? '',
    brand_voice_notes: profile?.brand_voice_notes ?? '',
  })

  const profileId = profile?.id
  useEffect(() => {
    // After a save we deliberately cleared the form — don't repopulate it
    if (justSavedRef.current) { justSavedRef.current = false; return }
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
      font_heading:      profile?.font_heading      ?? '',
      font_heading_sub:  profile?.font_heading_sub  ?? '',
      font_body:          profile?.font_body          ?? '',
      brand_tone:         profile?.brand_tone         ?? '',
      brand_style:        profile?.brand_style        ?? '',
      cta_style:          profile?.cta_style          ?? '',
      brand_voice_notes:  profile?.brand_voice_notes  ?? '',
      brand_palette_json: profile?.brand_palette_json ?? undefined,
    })
    setSaved(false); setScanResult(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId])

  function set(key: keyof BrandProfileFormData, val: string) {
    setForm(f => ({ ...f, [key]: val })); setSaved(false); setScanResult(null)
  }

  const emptyForm: BrandProfileFormData = {
    company_name: '', tagline: '', website_url: '', footer_text: '',
    color_primary: '', color_secondary: '', color_accent: '', color_background: '', color_text: '',
    font_heading: '', font_heading_sub: '', font_body: '',
    brand_tone: '', brand_style: '', cta_style: '', brand_voice_notes: '',
    brand_palette_json: undefined,
  }

  function resetScanState() {
    justSavedRef.current = true
    setScanResult(null)
    setAppliedAssets({})
    setApplyingAssets({})
    setShowLogoUpload(false)
    setForm(emptyForm)
  }

  // Auto-import all discovered assets from the scan into a profile
  async function importScanAssets(brandProfileId: string) {
    if (!scanResult?.discoveredAssets?.length) return
    const pending = scanResult.discoveredAssets.filter(a => !appliedAssets[a.url])
    await Promise.allSettled(
      pending.map(a =>
        registerScannedAsset({ brandProfileId, sourceUrl: a.url, assetRole: a.role, label: a.label })
      )
    )
  }

  async function handleSave(confirmed = false) {
    const profileHasData = !!profile?.company_name
    const scanBroughtNewCompany = !!scanResult?.company_name && scanResult.company_name !== profile?.company_name
    if (!confirmed && profileHasData && scanBroughtNewCompany) {
      setDupeModal(true)
      return
    }
    setDupeModal(false)
    setSaving(true); setSaved(false)
    try {
      await saveBrandProfile(form, profile?.id)
      if (profile?.id) await importScanAssets(profile.id)
      setSaved(true)
      resetScanState()
      setTimeout(() => setSaved(false), 2500)
      router.refresh()
    } finally { setSaving(false) }
  }

  async function handleSaveAsNew() {
    setDupeModal(false)
    setSaving(true); setSaved(false)
    try {
      const newId = await createClientBrandProfile({
        name: form.company_name?.trim() || scanResult?.company_name?.trim() || 'New Brand',
        companyName: form.company_name?.trim() || scanResult?.company_name?.trim(),
      })
      await saveBrandProfile(form, newId)
      await importScanAssets(newId)
      setSaved(true)
      resetScanState()
      setTimeout(() => setSaved(false), 2500)
      onCreated(newId)
    } finally { setSaving(false) }
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

  async function handleScan() {
    const url = form.website_url?.trim(); if (!url) return
    setScanning(true); setScanError(null); setScanResult(null)
    try {
      const result = await scanWebsiteForBrand(url)
      if ('error' in result) { setScanError(result.error); return }
      setScanResult(result)
      setForm(f => ({
        ...f,
        company_name:      result.company_name      || f.company_name,
        tagline:           result.tagline           || f.tagline,
        footer_text:       result.footer_text       || f.footer_text,
        color_primary:     result.color_primary     || f.color_primary,
        color_secondary:   result.color_secondary   || f.color_secondary,
        color_background:  result.color_background  || f.color_background,
        color_text:        result.color_text        || f.color_text,
        color_accent:      result.color_button      || result.color_accent || f.color_accent,
        font_heading:      result.font_heading      || f.font_heading,
        font_heading_sub:  result.font_heading_sub  || f.font_heading_sub,
        font_body:         result.font_body         || f.font_body,
        brand_tone:        result.brand_tone        || f.brand_tone,
        brand_style:       result.brand_style       || f.brand_style,
        brand_voice_notes:  result.brand_voice_notes || f.brand_voice_notes,
        social_links_json:  result.social_links      || f.social_links_json,
        brand_palette_json: result.color_palette     || f.brand_palette_json,
      }))
    } finally { setScanning(false) }
  }

  async function handleImportAsset(asset: ScanResult['discoveredAssets'][number]) {
    if (!profile) return
    const key = asset.url
    setApplyingAssets(a => ({ ...a, [key]: true }))
    try {
      await registerScannedAsset({ brandProfileId: profile.id, sourceUrl: asset.url, assetRole: asset.role, label: asset.label })
      setAppliedAssets(a => ({ ...a, [key]: true }))
      router.refresh()
    } catch (e) { console.error('Asset import failed', e) }
    finally { setApplyingAssets(a => ({ ...a, [key]: false })) }
  }

  const logoAssets    = assets.filter(a => ['primary_logo', 'secondary_logo', 'logo_mark'].includes(a.asset_role))
  const faviconAssets = assets.filter(a => a.asset_role === 'favicon')
  const imageAssets   = assets.filter(a => !['primary_logo', 'secondary_logo', 'logo_mark', 'favicon'].includes(a.asset_role))

  return (
    <div className="flex-1 min-h-0 bg-gray-100 dark:bg-gray-950 overflow-hidden flex flex-col">

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

          {/* Header — dark bar, matches Identity header */}
          <div className="shrink-0 px-4 py-2.5 bg-gray-900 dark:bg-gray-800">
            <span className="text-sm font-semibold text-white">Assets</span>
          </div>

          {/* URL scan row — white bar, centered */}
          <div className="shrink-0 px-4 py-2 border-b border-gray-100 dark:border-white/8 bg-white dark:bg-gray-900 flex justify-center">
            <div className="flex items-center gap-2 w-full max-w-sm">
              <div className="flex items-center gap-1.5 flex-1 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-white/15 bg-white dark:bg-gray-800 min-w-0">
                <Globe className="w-3 h-3 text-gray-400 shrink-0" />
                <input
                  type="url"
                  value={form.website_url ?? ''}
                  onChange={e => set('website_url', e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && form.website_url?.trim()) handleScan() }}
                  placeholder="Enter your URL here"
                  className="flex-1 text-xs bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 min-w-0"
                />
              </div>
              <button onClick={handleScan} disabled={scanning || !form.website_url?.trim()}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white transition-colors shrink-0">
                {scanning ? <><Loader2 className="w-3 h-3 animate-spin" /> Scanning…</> : <><Scan className="w-3 h-3" /> Scan</>}
              </button>
            </div>
          </div>
          {scanError && (
            <div className="shrink-0 flex items-center gap-1 px-3 py-1 bg-red-500/10 border-b border-red-200/20">
              <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />
              <span className="text-[10px] text-red-400">{scanError}</span>
            </div>
          )}

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">


            {/* ── Color Palette — 5×2 circles, from scan or saved profile ── */}
            {(() => {
              const src = scanResult ? form : profile
              const palette: string[] = (src?.brand_palette_json as Array<{ hex: string }> | undefined)?.map(c => c.hex)
                ?? [src?.color_primary, src?.color_secondary, src?.color_accent, src?.color_background, src?.color_text].filter(Boolean) as string[]
              if (!palette.length) return null
              const capped = [...new Set(palette)].slice(0, 10)
              return (
                <section className="space-y-2">
                  <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Palette</h2>
                  {[capped.slice(0, 5), capped.slice(5)].filter(r => r.length > 0).map((row, ri) => (
                    <div key={ri} className="flex gap-2">
                      {row.map((hex, ci) => (
                        <button key={`${ri}-${ci}`} onClick={() => navigator.clipboard?.writeText(hex)}
                          title={hex} className="group shrink-0">
                          <div className="w-7 h-7 rounded-full border border-gray-200 dark:border-white/10 shadow-sm group-hover:scale-110 transition-transform"
                            style={{ backgroundColor: hex }} />
                        </button>
                      ))}
                    </div>
                  ))}
                </section>
              )
            })()}

            {/* ── Fonts — 2 per row, pangram preview ── */}
            {(() => {
              // When a scan is active use form state (live); otherwise use saved profile data
              const src = scanResult ? form : profile
              const fonts = [
                { label: 'Primary',   value: src?.font_heading     },
                { label: 'Secondary', value: src?.font_heading_sub },
                { label: 'Body',      value: src?.font_body        },
              ].filter(f => f.value) as { label: string; value: string }[]
              if (!fonts.length) return null

              const gfQuery = fonts.map(f => `family=${encodeURIComponent(f.value)}:wght@400;700`).join('&')
              return (
                <section className="space-y-2">
                  {/* eslint-disable-next-line @next/next/no-page-custom-font */}
                  <link rel="stylesheet" href={`https://fonts.googleapis.com/css2?${gfQuery}&display=swap`} />
                  <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Fonts</h2>
                  <div className="grid grid-cols-2 gap-2">
                    {fonts.map(({ label, value }) => (
                      <div key={label} className="flex flex-col gap-1.5 p-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/3">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{value}</p>
                          <button onClick={() => navigator.clipboard?.writeText(value)} title="Copy font name"
                            className="p-0.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors shrink-0">
                            <FileText className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug line-clamp-2"
                          style={{ fontFamily: `"${value}", sans-serif` }}>
                          The quick brown fox jumps over the lazy dog
                        </p>
                        <span className="text-[10px] text-gray-400">{label} font</span>
                      </div>
                    ))}
                  </div>
                </section>
              )
            })()}

            {/* ── Logos + Favicon — saved + scanned, single row ── */}
            {(() => {
              const savedLogos = [...logoAssets, ...faviconAssets]
              const logoRoles  = new Set(['primary_logo', 'secondary_logo', 'logo_mark', 'favicon'])
              const scannedLogos = scanResult?.discoveredAssets.filter(a => logoRoles.has(a.role)) ?? []
              const hasAny = savedLogos.length > 0 || scannedLogos.length > 0 || !!profile
              if (!hasAny) return null
              return (
                <section className="space-y-2">
                  <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Logos &amp; Favicon</h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Saved / uploaded logos */}
                    {savedLogos.map(a => (
                      <div key={a.id} className="group relative shrink-0" title={a.label ?? a.asset_role}>
                        <div className="w-20 h-20 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex items-center justify-center overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={a.file_url} alt={a.label ?? ''} className="max-w-full max-h-full object-contain p-2"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        </div>
                        {/* X to delete — always visible on hover */}
                        <button onClick={() => handleArchive(a.id)}
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white items-center justify-center hidden group-hover:flex shadow-sm">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {/* Scanned logos not yet imported */}
                    {scannedLogos.map(a => {
                      const applied  = appliedAssets[a.url]
                      const applying = applyingAssets[a.url]
                      return (
                        <div key={a.url} className="group relative shrink-0" title={`${a.label} (scan)`}>
                          <div className="w-20 h-20 rounded-xl border border-dashed border-brand-300 dark:border-brand-600/50 bg-brand-50/30 dark:bg-brand-600/5 flex items-center justify-center overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={a.url} alt={a.label} className="max-w-full max-h-full object-contain p-2"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                          </div>
                          {!applied && profile && (
                            <button onClick={() => handleImportAsset(a)} disabled={applying}
                              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-brand-600 text-white items-center justify-center hidden group-hover:flex shadow-sm disabled:opacity-60">
                              {applying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                            </button>
                          )}
                          {applied && (
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {/* Upload button — only shown when no logos exist yet, or explicitly toggled */}
                    {profile && savedLogos.length === 0 && scannedLogos.length === 0 && (
                      <button onClick={() => setShowLogoUpload(v => !v)}
                        className="w-20 h-20 rounded-xl border border-dashed border-gray-300 dark:border-white/20 flex items-center justify-center text-gray-400 hover:border-brand-400 hover:text-brand-500 transition-colors shrink-0">
                        <Plus className="w-5 h-5" />
                      </button>
                    )}
                    {profile && (savedLogos.length > 0 || scannedLogos.length > 0) && (
                      <button onClick={() => setShowLogoUpload(v => !v)} title="Add logo"
                        className="w-8 h-8 self-center rounded-lg border border-dashed border-gray-300 dark:border-white/20 flex items-center justify-center text-gray-400 hover:border-brand-400 hover:text-brand-500 transition-colors shrink-0">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {showLogoUpload && profile && (
                    <div className="grid grid-cols-4 gap-1.5 pt-1">
                      <UploadZone role="primary_logo"   profileId={profile.id} onUploaded={() => { router.refresh(); setShowLogoUpload(false) }} />
                      <UploadZone role="secondary_logo" profileId={profile.id} onUploaded={() => { router.refresh(); setShowLogoUpload(false) }} />
                      <UploadZone role="logo_mark"      profileId={profile.id} onUploaded={() => { router.refresh(); setShowLogoUpload(false) }} />
                      <UploadZone role="favicon"        profileId={profile.id} onUploaded={() => { router.refresh(); setShowLogoUpload(false) }} />
                    </div>
                  )}
                </section>
              )
            })()}

            {/* ── Images — saved + scanned + upload ── */}
            {(() => {
              const scannedImages = scanResult?.discoveredAssets.filter(a => a.role === 'general') ?? []
              const hasAny = imageAssets.length > 0 || scannedImages.length > 0 || !!profile
              if (!hasAny) return null
              return (
                <section className="space-y-1.5">
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Images</h2>
                  <div className="grid grid-cols-3 gap-2">
                    {/* Saved images */}
                    {imageAssets.map(a => <AssetCard key={a.id} asset={a} onApprove={handleApprove} onArchive={handleArchive} onDelete={handleDelete} />)}
                    {/* Scanned general images */}
                    {scannedImages.map(a => {
                      const applied  = appliedAssets[a.url]
                      const applying = applyingAssets[a.url]
                      return (
                        <div key={a.url} className="group relative flex flex-col gap-1.5 p-2 rounded-lg border border-dashed border-brand-300 dark:border-brand-600/50 bg-brand-50/20 dark:bg-brand-600/5">
                          <div className="w-full h-24 rounded bg-gray-50 dark:bg-white/5 flex items-center justify-center overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={a.url} alt={a.label} className="max-w-full max-h-full object-cover"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                          </div>
                          <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 truncate">{a.label}</p>
                          {!applied && profile && (
                            <button onClick={() => handleImportAsset(a)} disabled={applying}
                              className="flex items-center justify-center gap-0.5 py-1 text-[10px] font-medium rounded bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-60 transition-colors">
                              {applying ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Plus className="w-2.5 h-2.5" />}
                              {applying ? 'Saving…' : 'Import'}
                            </button>
                          )}
                          {applied && (
                            <div className="flex items-center justify-center gap-0.5 py-1 text-[10px] font-medium rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                              <Check className="w-2.5 h-2.5" /> Saved
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {/* Upload zones */}
                    {profile && (
                      <>
                        <UploadZone role="hero_image"       profileId={profile.id} onUploaded={() => router.refresh()} />
                        <UploadZone role="background_image" profileId={profile.id} onUploaded={() => router.refresh()} />
                        <UploadZone role="general"          profileId={profile.id} onUploaded={() => router.refresh()} />
                      </>
                    )}
                  </div>
                </section>
              )
            })()}

          </div>

          {/* Assets footer — save actions, only when a profile is selected */}
          {profile && (
            <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-t border-gray-200 dark:border-white/10">
              {scanResult ? (
                <>
                  <button onClick={() => handleSave()} disabled={saving}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white transition-colors shadow-sm">
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                  <button onClick={handleSaveAsNew} disabled={saving}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/8 disabled:opacity-60 transition-colors">
                    <Plus className="w-3 h-3" />
                    Save as New
                  </button>
                </>
              ) : (
                <span className="text-[10px] text-gray-400">Select a profile or scan a URL to begin</span>
              )}
            </div>
          )}

        </div>{/* end Assets card */}

        {/* ── Column 3: Brand Identity (right) ── */}
        <div className="w-80 shrink-0 flex flex-col rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">

          {/* Black header */}
          <div className="shrink-0 px-4 py-2.5 bg-gray-900 dark:bg-gray-800">
            <span className="text-sm font-semibold text-white">Identity</span>
          </div>

          {/* Green score bar */}
          {profile ? (() => {
            const pct  = Math.round((profile.brand_confidence_score / 6) * 100)
            const color = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'
            return (
              <div className={cn('shrink-0 flex items-center justify-between px-4 py-1', color)}>
                <span className="text-[10px] font-semibold text-white/90 tabular-nums">
                  {profile.brand_confidence_score}/6
                </span>
                <span className="text-[10px] text-white/80 tabular-nums">V{profile.brand_version}</span>
              </div>
            )
          })() : (
            <div className="shrink-0 h-1 bg-emerald-500/30" />
          )}

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">

            {/* ── Scan result summary ── */}
            {scanResult && (() => {
              const palette: string[] = scanResult.color_palette?.length
                ? scanResult.color_palette.map((c: { hex: string }) => c.hex)
                : [scanResult.color_primary, scanResult.color_secondary, scanResult.color_accent].filter(Boolean) as string[]
              const capped = [...new Set(palette)].slice(0, 10)
              const logoRoles = new Set(['primary_logo', 'secondary_logo', 'logo_mark', 'favicon', 'hero_image'])
              const assetItems = scanResult.discoveredAssets.filter(a => logoRoles.has(a.role))
              return (
                <div className="space-y-3 rounded-xl border border-brand-200 dark:border-brand-600/30 bg-brand-50/40 dark:bg-brand-600/5 p-3">
                  {/* Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                      <span className="text-xs font-semibold text-brand-700 dark:text-brand-400">Scan complete — fields pre-filled</span>
                    </div>
                    <button onClick={() => setScanResult(null)} className="text-gray-400 hover:text-gray-600 shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Key fields */}
                  <div className="space-y-1">
                    {[
                      { label: 'Company',      value: scanResult.company_name },
                      { label: 'Tagline',      value: scanResult.tagline },
                      { label: 'Tone',         value: scanResult.brand_tone },
                      { label: 'Style',        value: scanResult.brand_style },
                      { label: 'Primary font', value: scanResult.font_heading },
                    ].filter(r => r.value).map(({ label, value }) => (
                      <div key={label} className="flex items-baseline gap-2">
                        <span className="text-[10px] font-medium text-gray-400 w-20 shrink-0">{label}:</span>
                        <span className="text-xs text-gray-700 dark:text-gray-200 truncate">{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Colors — 5×2 grid */}
                  {capped.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                        Colors ({capped.length})
                      </span>
                      <div className="space-y-1.5">
                        {[capped.slice(0, 5), capped.slice(5)].filter(r => r.length > 0).map((row, ri) => (
                          <div key={ri} className="grid grid-cols-5 gap-2">
                            {row.map((hex, ci) => (
                              <button key={`${ri}-${ci}`} onClick={() => navigator.clipboard?.writeText(hex)} title={`Copy ${hex}`}
                                className="flex flex-col items-center gap-1 group">
                                <div className="w-8 h-8 rounded-full border border-gray-200 dark:border-white/10 shadow-sm group-hover:scale-110 transition-transform"
                                  style={{ backgroundColor: hex }} />
                                <span className="text-[9px] font-mono text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 w-full text-center truncate leading-tight">
                                  {hex}
                                </span>
                              </button>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Assets found */}
                  {assetItems.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Assets found</span>
                      <div className="space-y-1.5">
                        {assetItems.map(a => {
                          const key = a.url
                          const applied  = !!appliedAssets[key]
                          const applying = !!applyingAssets[key]
                          return (
                            <div key={key} className="flex items-center gap-2 p-1.5 rounded-lg bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10">
                              <div className="w-10 h-10 rounded-lg border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex items-center justify-center overflow-hidden shrink-0">
                                <img src={a.url} alt={a.label} className="max-w-full max-h-full object-contain p-0.5" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-700 dark:text-gray-200 capitalize truncate">{a.label}</p>
                                <p className="text-[9px] text-gray-400 capitalize">{a.role.replace(/_/g, ' ')}</p>
                              </div>
                              {profile && (
                                <button onClick={() => handleImportAsset(a)} disabled={applying || applied}
                                  className={cn(
                                    'shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-md transition-colors',
                                    applied
                                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                      : 'bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-60',
                                  )}>
                                  {applying ? <Loader2 className="w-2.5 h-2.5 animate-spin inline" /> : applied ? 'Saved' : 'Import'}
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] text-gray-400 leading-snug">Review, adjust, then click Save Brand Profile.</p>
                </div>
              )
            })()}

            {/* Form sections — only shown when a scan is active or user has entered data */}
            {(() => {
              const hasData = !!(form.company_name || form.tagline || form.color_primary || form.font_heading || form.brand_tone)
              if (!scanResult && !hasData) {
                return (
                  <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                    <Globe className="w-7 h-7 text-gray-300 dark:text-white/20" />
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Scan a URL to populate identity</p>
                    <p className="text-[10px] text-gray-300 dark:text-gray-600">or enter details manually below</p>
                  </div>
                )
              }
              return (
                <>
                  {/* Identity */}
                  <section className="space-y-3">
                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Identity</h2>
                    <div className="grid grid-cols-1 gap-3">
                      <Field label="Company Name"><Input value={form.company_name ?? ''} onChange={e => set('company_name', e.target.value)} placeholder="Acme Ltd" /></Field>
                      <Field label="Tagline"><Input value={form.tagline ?? ''} onChange={e => set('tagline', e.target.value)} placeholder="Short, punchy one-liner" /></Field>
                      <Field label="Footer Text"><Input value={form.footer_text ?? ''} onChange={e => set('footer_text', e.target.value)} placeholder="© 2025 Acme Ltd." /></Field>
                    </div>
                  </section>

                  {/* Colors — read-only circles, 5×2 */}
                  {(() => {
                    const colors = [form.color_primary, form.color_secondary, form.color_accent, form.color_background, form.color_text].filter(Boolean) as string[]
                    if (!colors.length) return null
                    return (
                      <section className="space-y-2">
                        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Colors</h2>
                        <div className="flex gap-2 flex-wrap">
                          {colors.map((hex, i) => (
                            <button key={i} onClick={() => navigator.clipboard?.writeText(hex)} title={hex} className="group shrink-0">
                              <div className="w-7 h-7 rounded-full border border-gray-200 dark:border-white/10 shadow-sm group-hover:scale-110 transition-transform"
                                style={{ backgroundColor: hex }} />
                            </button>
                          ))}
                        </div>
                      </section>
                    )
                  })()}

                  {/* Typography */}
                  <section className="space-y-3">
                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Typography</h2>
                    <div className="grid grid-cols-1 gap-3">
                      <Field label="Primary Font"><Input value={form.font_heading ?? ''} onChange={e => set('font_heading', e.target.value)} placeholder="Playfair Display" /></Field>
                      <Field label="Secondary Font"><Input value={form.font_heading_sub ?? ''} onChange={e => set('font_heading_sub', e.target.value)} placeholder="Same as primary" /></Field>
                      <Field label="Body Font"><Input value={form.font_body ?? ''} onChange={e => set('font_body', e.target.value)} placeholder="Inter" /></Field>
                    </div>
                  </section>

                  {/* Brand Voice */}
                  <section className="space-y-3">
                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Brand Voice</h2>
                    <div className="grid grid-cols-3 gap-3">
                      <Field label="Tone">
                        <Select value={form.brand_tone ?? ''} onChange={e => set('brand_tone', e.target.value)}>
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
                        <Select value={form.brand_style ?? ''} onChange={e => set('brand_style', e.target.value)}>
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
                        <Select value={form.cta_style ?? ''} onChange={e => set('cta_style', e.target.value)}>
                          <option value="">CTA…</option>
                          <option value="soft">Soft</option>
                          <option value="consultative">Consultative</option>
                          <option value="assertive">Assertive</option>
                        </Select>
                      </Field>
                    </div>
                    <Field label="Voice Notes">
                      <Textarea value={form.brand_voice_notes ?? ''} onChange={e => set('brand_voice_notes', e.target.value)}
                        placeholder="Audience, words to avoid, sample copy…" rows={3} />
                    </Field>
                  </section>
                </>
              )
            })()}

          </div>{/* end scrollable body */}

          {/* Fixed footer — save bar */}
          <div className="flex items-center gap-3 px-4 py-3 border-t border-gray-200 dark:border-white/10 shrink-0">
            <button onClick={() => handleSave()} disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5" /> : null}
              {saving ? 'Saving…' : saved ? 'Saved' : 'Save'}
            </button>
            {saved && <span className="text-xs text-emerald-500">Saved</span>}
          </div>

        </div>{/* end Brand Identity card */}

      </div>

      {/* ── Duplicate profile modal ── */}
      {dupeModal && profile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-xl p-6 space-y-4">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Profile already has data</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                The scan found a different brand. Save as a new profile, or replace the existing one.
              </p>
            </div>
            <div className="space-y-1.5 rounded-lg border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2.5">
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] font-medium text-gray-400 w-10 shrink-0">Name:</span>
                <span className="text-xs text-gray-700 dark:text-gray-200 truncate">{profile.company_name}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] font-medium text-gray-400 w-10 shrink-0">Date:</span>
                <span className="text-xs text-gray-700 dark:text-gray-200">
                  {new Date(profile.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <button onClick={handleSaveAsNew} disabled={saving}
                className="w-full px-3 py-2 text-xs font-medium rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white transition-colors flex items-center justify-center gap-1.5">
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                Save as New Profile
              </button>
              <button onClick={() => handleSave(true)} disabled={saving}
                className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/8 disabled:opacity-60 transition-colors">
                Replace Existing
              </button>
              <button onClick={() => setDupeModal(false)}
                className="w-full px-3 py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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

export function BrandingClient({ profiles, assets }: Props) {
  const router = useRouter()

  const defaultId = profiles.find(p => p.brand_type === 'workspace')?.id ?? profiles[0]?.id ?? null
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(defaultId)
  const [pendingSelectId,    setPendingSelectId]   = useState<string | null>(null)
  const [activeTab,          setActiveTab]          = useState<Tab>('assets')

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
        {activeTab === 'forms'           && <ComingSoonTab label="Forms" />}
        {activeTab === 'website'         && <ComingSoonTab label="Website" />}
      </div>

    </div>
  )
}
