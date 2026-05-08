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

function getUrlFromDrag(e: React.DragEvent): string | null {
  try {
    const raw = e.dataTransfer.getData('text/plain')
    const parsed = JSON.parse(raw)
    return parsed.src ?? parsed.props?.src ?? null
  } catch { return null }
}

export function FormImagesPanel({ theme, onUpdateTheme, blocks, onUpdateBlock }: Props) {
  const [profiles,    setProfiles]    = useState<Profile[]>([])
  const [allAssets,   setAllAssets]   = useState<Asset[]>([])
  const [activeBrand, setActiveBrand] = useState<string>('')
  const [dropOpen,    setDropOpen]    = useState(false)
  const [loading,     setLoading]     = useState(true)
  const [uploading,   setUploading]   = useState(false)
  const [dragOverId,  setDragOverId]  = useState<string | null>(null)
  const [dragOverBg,  setDragOverBg]  = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getFormImages().then(({ profiles, assets }) => {
      setProfiles(profiles)
      setAllAssets(assets)
      if (profiles.length > 0) setActiveBrand(profiles[0].id)
      setLoading(false)
    })
  }, [])

  const activeProfile = profiles.find(p => p.id === activeBrand)
  const visibleAssets = activeBrand
    ? allAssets.filter(a => a.brand_profile_id === activeBrand)
    : allAssets

  const imageBlocks = blocks.filter(b => b.type === 'image')
  const bgColor = theme.colors?.background      ?? '#ffffff'
  const bgImage = theme.colors?.backgroundImage ?? ''

  const bgPos      = theme.colors?.backgroundImagePosition ?? 'center center'
  const bgPosH     = bgPos.split(' ')[0] ?? 'center'
  const bgPosV     = bgPos.split(' ')[1] ?? 'center'

  function setBgPos(h: string, v: string) {
    patchColors({ backgroundImagePosition: `${h} ${v}` })
  }

  function patchColors(patch: Partial<NonNullable<FormTheme['colors']>>) {
    onUpdateTheme({ colors: { ...theme.colors, ...patch } })
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
      setAllAssets(prev => [{ id: `local-${Date.now()}`, brand_profile_id: activeBrand, file_url: publicUrl, asset_role: 'general' }, ...prev])
    } catch (err) {
      console.error('[FormImagesPanel] upload failed', err)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto [&::-webkit-scrollbar]:hidden">

      {/* ── Brand picker ── */}
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
            <div className="absolute top-full left-3 right-3 z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1">
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

    <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden px-3 py-4 space-y-5">

      {/* ── Form images — drop targets ── */}
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Form images</p>
        <p className="text-[11px] text-gray-400 mb-2">Drag an asset below onto an image to replace it.</p>

        {imageBlocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1.5 py-6 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-center">
            <ImageIcon className="w-5 h-5 text-gray-300" />
            <p className="text-[11px] text-gray-400">No image blocks on this step</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {imageBlocks.map((block, i) => {
              const src = block.props.src as string | undefined
              const isOver = dragOverId === block.id
              return (
                <div
                  key={block.id}
                  onDragOver={e => { e.preventDefault(); setDragOverId(block.id) }}
                  onDragLeave={() => setDragOverId(null)}
                  onDrop={e => {
                    e.preventDefault(); setDragOverId(null)
                    const url = getUrlFromDrag(e)
                    if (url) onUpdateBlock(block.id, { src: url })
                  }}
                  className={cn(
                    'relative rounded-xl border-2 overflow-hidden transition-all',
                    isOver
                      ? 'border-brand-500 scale-[1.02] shadow-lg'
                      : 'border-gray-200 dark:border-gray-700',
                  )}
                >
                  {src ? (
                    <img src={src} alt="" className="w-full h-16 object-cover" />
                  ) : (
                    <div className="w-full h-16 flex items-center justify-center bg-gray-50 dark:bg-white/5">
                      <ImageIcon className="w-5 h-5 text-gray-300" />
                    </div>
                  )}
                  <div className={cn(
                    'absolute inset-0 flex items-center justify-center text-[10px] font-bold transition-all',
                    isOver
                      ? 'bg-brand-500/20 text-brand-700 dark:text-brand-300 opacity-100'
                      : 'opacity-0',
                  )}>
                    Drop to replace
                  </div>
                  <div className="absolute bottom-0 inset-x-0 py-0.5 bg-black/40 text-white text-[9px] text-center">
                    Image {i + 1}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Brand assets — drag sources ── */}
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Brand assets</p>

        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 text-gray-300 animate-spin" /></div>
        ) : visibleAssets.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1.5 py-6 text-center">
            <ImageIcon className="w-5 h-5 text-gray-200" />
            <p className="text-[11px] text-gray-400">No assets yet — upload below</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            {visibleAssets.map(a => (
              <div
                key={a.id}
                draggable
                onDragStart={e => {
                  e.dataTransfer.effectAllowed = 'copy'
                  e.dataTransfer.setData('text/plain', JSON.stringify({ src: a.file_url }))
                }}
                className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 cursor-grab active:cursor-grabbing hover:border-brand-400 hover:shadow-md transition-all"
                title="Drag onto a form image to replace it"
              >
                <img src={a.file_url} alt="" className="w-full h-12 object-cover pointer-events-none" />
              </div>
            ))}
          </div>
        )}

        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f) }} />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 text-xs text-gray-500 hover:border-brand-300 hover:text-brand-600 transition-colors disabled:opacity-50"
        >
          {uploading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Uploading…</> : <><Upload className="w-3.5 h-3.5" />Upload image</>}
        </button>
      </div>

      {/* ── Form background ── */}
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Form background</p>

        <div className="flex items-center gap-2 mb-2">
          <label className="relative w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden cursor-pointer shrink-0 shadow-sm">
            <div className="absolute inset-0" style={{ background: bgColor }} />
            <input type="color" value={bgColor} onChange={e => patchColors({ background: e.target.value })}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
          </label>
          <input type="text" value={bgColor} onChange={e => patchColors({ background: e.target.value })}
            className="w-20 text-[11px] font-mono border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-500" />
          <span className="text-[11px] text-gray-400">Color</span>
        </div>

        <div
          onDragOver={e => { e.preventDefault(); setDragOverBg(true) }}
          onDragLeave={() => setDragOverBg(false)}
          onDrop={e => {
            e.preventDefault(); setDragOverBg(false)
            const url = getUrlFromDrag(e)
            if (url) patchColors({ backgroundImage: url })
          }}
          className={cn(
            'rounded-lg border border-dashed transition-all overflow-hidden',
            dragOverBg ? 'border-brand-400 bg-brand-50/40 scale-[1.01]' : 'border-gray-200 dark:border-gray-700',
          )}
        >
          {bgImage ? (
            <div className="relative group">
              <img src={bgImage} alt="bg" className="w-full h-16 object-cover" />
              <button onClick={() => patchColors({ backgroundImage: '' })}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-1 py-4 text-center">
              <ImageIcon className="w-4 h-4 text-gray-300" />
              <p className="text-[10px] text-gray-400">Drag here to set background</p>
            </div>
          )}
        </div>

        {bgImage && (
          <div className="mt-2.5">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Focal point</p>
            <div className="grid grid-cols-3 gap-1 w-fit">
              {(['top','center','bottom'] as const).flatMap(v =>
                (['left','center','right'] as const).map(h => {
                  const active = bgPosH === h && bgPosV === v
                  return (
                    <button
                      key={`${h}-${v}`}
                      onClick={() => setBgPos(h, v)}
                      title={`${h} ${v}`}
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                        active
                          ? 'bg-gray-800 dark:bg-white'
                          : 'bg-gray-100 dark:bg-white/8 hover:bg-gray-200 dark:hover:bg-white/15',
                      )}
                    >
                      <span className={cn('w-2 h-2 rounded-full', active ? 'bg-white dark:bg-gray-900' : 'bg-gray-400 dark:bg-gray-500')} />
                    </button>
                  )
                })
              )}
            </div>
            <p className="mt-1 text-[10px] text-gray-400 capitalize">{bgPosH} · {bgPosV}</p>
          </div>
        )}
      </div>

    </div>
    </div>
  )
}
