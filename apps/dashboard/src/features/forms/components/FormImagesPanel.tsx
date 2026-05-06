'use client'

import { useState, useEffect, useRef } from 'react'
import { Upload, Loader2, Image as ImageIcon, X, ChevronDown, Check } from 'lucide-react'
import { getFormImages } from '@/app/actions/forms'
import { getBrandAssetUploadUrl, registerBrandAsset } from '@/app/actions/branding'
import { cn } from '@/lib/utils'
import type { FormTheme, FormBlock } from '@/features/forms/types'

type Profile = { id: string; company_name: string | null }
type Asset   = { id: string; brand_profile_id: string; file_url: string; asset_role: string }

interface Props {
  theme:           FormTheme
  onUpdateTheme:   (patch: Partial<FormTheme>) => void
  selectedBlockId: string | null
  blocks:          FormBlock[]
  onUpdateBlock:   (id: string, props: Partial<FormBlock['props']>) => void
}

function SectionHead({ label }: { label: string }) {
  return <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
}

export function FormImagesPanel({ theme, onUpdateTheme, selectedBlockId, blocks, onUpdateBlock }: Props) {
  const [profiles,    setProfiles]    = useState<Profile[]>([])
  const [allAssets,   setAllAssets]   = useState<Asset[]>([])
  const [activeBrand, setActiveBrand] = useState<string>('')
  const [dropOpen,    setDropOpen]    = useState(false)
  const [loading,     setLoading]     = useState(true)
  const [uploading,   setUploading]   = useState(false)
  const [bgDragOver,  setBgDragOver]  = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getFormImages().then(({ profiles, assets }) => {
      setProfiles(profiles)
      setAllAssets(assets)
      if (profiles.length > 0) setActiveBrand(profiles[0].id)
      setLoading(false)
    })
  }, [])

  const activeProfile  = profiles.find(p => p.id === activeBrand)
  const visibleAssets  = activeBrand
    ? allAssets.filter(a => a.brand_profile_id === activeBrand)
    : allAssets

  const bgColor = theme.colors?.background      ?? '#ffffff'
  const bgImage = theme.colors?.backgroundImage ?? ''

  function patchColors(patch: Partial<NonNullable<FormTheme['colors']>>) {
    onUpdateTheme({ colors: { ...theme.colors, ...patch } })
  }

  const selectedBlock = selectedBlockId ? blocks.find(b => b.id === selectedBlockId) ?? null : null
  const isImageBlock  = selectedBlock?.type === 'image'

  function applyToBlock(url: string) {
    if (!isImageBlock || !selectedBlockId) return
    onUpdateBlock(selectedBlockId, { src: url })
  }

  function applyAsBg(url: string) {
    patchColors({ backgroundImage: url })
  }

  async function handleUpload(file: File) {
    setUploading(true)
    try {
      const { signedUrl, publicUrl } = await getBrandAssetUploadUrl({
        fileName: file.name, mimeType: file.type, assetRole: 'general',
      })
      await fetch(signedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
      if (activeBrand) {
        await registerBrandAsset({
          brandProfileId: activeBrand, assetType: 'image', assetRole: 'general',
          source: 'upload', fileUrl: publicUrl, storagePath: '', fileName: file.name,
          fileSize: file.size, mimeType: file.type,
        })
      }
      const newAsset: Asset = {
        id: `local-${Date.now()}`, brand_profile_id: activeBrand,
        file_url: publicUrl, asset_role: 'general',
      }
      setAllAssets(prev => [newAsset, ...prev])
    } catch (err) {
      console.error('[FormImagesPanel] upload failed', err)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Brand dropdown ─────────────────────────────── */}
      {profiles.length > 0 && (
        <div className="shrink-0 px-3 py-2.5 border-b border-gray-100 dark:border-white/8 relative">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Brand</p>
          <button
            onClick={() => setDropOpen(v => !v)}
            className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-white/[0.04] text-xs font-medium text-gray-700 dark:text-gray-300 hover:border-brand-300 transition-colors"
          >
            <span className="truncate">{activeProfile?.company_name ?? 'Select brand'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          </button>

          {dropOpen && (
            <div className="absolute top-full left-3 right-3 z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1 overflow-hidden">
              {profiles.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setActiveBrand(p.id); setDropOpen(false) }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  {p.id === activeBrand && <Check className="w-3 h-3 text-brand-500 shrink-0" />}
                  <span className={cn('truncate', p.id === activeBrand ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-300')}>
                    {p.company_name ?? '(unnamed)'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Scrollable content ──────────────────────────── */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden px-3 py-3 space-y-5">

        {/* Form background */}
        <div>
          <SectionHead label="Form background" />

          <div className="flex items-center gap-2 mb-3">
            <label className="relative w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden cursor-pointer shrink-0 shadow-sm">
              <div className="absolute inset-0" style={{ background: bgColor }} />
              <input
                type="color"
                value={bgColor}
                onChange={e => patchColors({ background: e.target.value })}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </label>
            <input
              type="text"
              value={bgColor}
              onChange={e => patchColors({ background: e.target.value })}
              className="w-20 text-[11px] font-mono border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <span className="text-[11px] text-gray-400">Color</span>
          </div>

          {/* Background image drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setBgDragOver(true) }}
            onDragLeave={() => setBgDragOver(false)}
            onDrop={e => {
              e.preventDefault(); setBgDragOver(false)
              try {
                const data = JSON.parse(e.dataTransfer.getData('text/plain')) as { type: string; props: { src: string } }
                if (data.type === 'image' && data.props.src) applyAsBg(data.props.src)
              } catch {}
            }}
            className={cn(
              'rounded-lg border border-dashed transition-colors overflow-hidden',
              bgDragOver ? 'border-brand-400 bg-brand-50/40 dark:border-brand-500/60' : 'border-gray-200 dark:border-gray-700',
            )}
          >
            {bgImage ? (
              <div className="relative group">
                <img src={bgImage} alt="bg" className="w-full h-20 object-cover" />
                <button
                  onClick={() => patchColors({ backgroundImage: '' })}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-1 py-3 text-center">
                <ImageIcon className="w-4 h-4 text-gray-300" />
                <p className="text-[10px] text-gray-400">Drag image here for bg</p>
              </div>
            )}
          </div>

          <input
            type="text"
            value={bgImage}
            onChange={e => patchColors({ backgroundImage: e.target.value })}
            placeholder="Or paste image URL…"
            className="mt-2 w-full text-[11px] border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {/* Assets */}
        <div>
          <SectionHead label="Assets" />

          <p className="text-[11px] text-gray-400 mb-2 leading-relaxed">
            {isImageBlock
              ? 'Click or drag to apply to selected image block'
              : selectedBlockId
                ? 'Select an image block on canvas to apply'
                : 'Drag onto canvas or select an image block'
            }
          </p>

          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
            </div>
          ) : visibleAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
              <ImageIcon className="w-6 h-6 text-gray-200" />
              <p className="text-[11px] text-gray-400">No images for this brand — upload one below</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5 mb-3">
              {visibleAssets.map(a => (
                <div
                  key={a.id}
                  draggable
                  onDragStart={e => {
                    e.dataTransfer.effectAllowed = 'copy'
                    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'image', props: { src: a.file_url, alt: '' } }))
                  }}
                  onClick={() => applyToBlock(a.file_url)}
                  title={isImageBlock ? 'Click to apply' : 'Drag to canvas'}
                  className={cn(
                    'rounded-lg overflow-hidden border transition-colors cursor-grab active:cursor-grabbing group relative',
                    isImageBlock
                      ? 'border-brand-200 dark:border-brand-700 hover:border-brand-400'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300',
                  )}
                >
                  <img src={a.file_url} alt={a.asset_role} className="w-full h-14 object-cover pointer-events-none" />
                  <button
                    onMouseDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); applyAsBg(a.file_url) }}
                    className="absolute bottom-0 inset-x-0 py-1 bg-black/50 text-white text-[9px] text-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Set as bg
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f) }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 text-xs text-gray-500 hover:border-brand-300 hover:text-brand-600 transition-colors disabled:opacity-50"
          >
            {uploading
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Uploading…</>
              : <><Upload className="w-3.5 h-3.5" />Upload image</>
            }
          </button>
        </div>

      </div>
    </div>
  )
}
