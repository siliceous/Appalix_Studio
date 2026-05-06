'use client'

/**
 * EmailBuilderCanvas
 *
 * 3-panel visual A4-style drag-and-drop email editor.
 *
 * LEFT  (220px) — block palette + email settings + block property editor
 * CENTER         — A4 canvas with sortable blocks, floating card style
 * RIGHT (256px)  — brand assets panel: brand selector, colors, logo, images, upload
 *
 * Drag-drop architecture:
 *   - Single DndContext wraps left palette + center canvas.
 *   - Palette items: useDraggable, IDs prefixed "new::".
 *   - Canvas blocks: useSortable, IDs are block UUIDs.
 *   - DragOverlay renders via React portal — never clipped.
 */

import React, { useState, useRef, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical, Trash2, Plus,
  AlignLeft, AlignCenter, AlignRight,
  RotateCcw, RotateCw,
  Heading1, Type, ImageIcon, MousePointerClick,
  Minus, Space, Share2, Mail, Layout, Columns,
  ChevronDown, Upload, Check, Palette,
} from 'lucide-react'
import {
  type ContentBlock,
  type BlockType,
  type ColumnRatio,
  renderEmailHtml,
} from '@/lib/email-templates/html-renderer'
import { getBrandAssetUploadUrl, registerBrandAsset } from '@/app/actions/branding'
import { useUserAvatar } from '@/contexts/user-avatar-context'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AssetDefaults {
  profileId?:   string
  logoUrl?:     string
  logoAlt?:     string
  companyName?: string
  companyUrl?:  string
  footerText?:  string
  socialLinks?: Record<string, string>
  primaryColor: string
}

// Minimal shape — only what the right panel needs
export interface BrandProfile {
  id:                  string
  company_name:        string | null
  color_primary?:      string | null
  color_secondary?:    string | null
  color_accent?:       string | null
  color_background?:   string | null
  color_text?:         string | null
  brand_palette_json?: Array<{ hex: string }> | null
  font_heading?:       string | null
  font_heading_sub?:   string | null
  font_body?:          string | null
  social_links_json?:  Record<string, string> | null
  website_url?:        string | null
}

export interface BrandAsset {
  id:               string
  brand_profile_id: string
  asset_role:       string
  file_url:         string
  is_approved:      boolean
  is_primary:       boolean
  is_archived:      boolean
}

// ── UID ───────────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9)

// ── Block factory ─────────────────────────────────────────────────────────────

function makeBlock(paletteId: string, defaults: AssetDefaults): ContentBlock {
  const parts     = paletteId.split('::')
  const blockType = parts[1] as BlockType
  const extra     = parts[2]

  switch (blockType) {
    case 'logo':
      return {
        id: uid(), type: 'logo',
        logoUrl: defaults.logoUrl,
        logoAlt: defaults.logoAlt ?? defaults.companyName ?? 'Logo',
        align:   'left',
        bgColor: '#f8f9fa',
      }
    case 'headline':
      return { id: uid(), type: 'headline', text: 'Your headline here', align: 'center' }
    case 'text':
      return { id: uid(), type: 'text', text: 'Add your message here.', align: 'left' }
    case 'image':
      return { id: uid(), type: 'image', url: '', alt: '', align: 'center' }
    case 'button':
      return { id: uid(), type: 'button', text: 'Get Started', url: '', align: 'center' }
    case 'divider':
      return { id: uid(), type: 'divider' }
    case 'spacer':
      return { id: uid(), type: 'spacer', height: 32 }
    case 'social':
      return { id: uid(), type: 'social', socialLinks: defaults.socialLinks ?? {}, align: 'center' }
    case 'footer_block':
      return {
        id: uid(), type: 'footer_block',
        companyName:    defaults.companyName ?? 'Your Company',
        companyUrl:     defaults.companyUrl ?? '',
        unsubscribeUrl: '',
        socialLinks:    defaults.socialLinks ?? {},
      }
    case 'columns': {
      const ratio    = (extra ?? '1:1') as ColumnRatio
      const colCount = ratio.split(':').length
      return {
        id: uid(), type: 'columns', ratio,
        columns: Array.from({ length: colCount }, () => []),
      }
    }
    default:
      return { id: uid(), type: 'text', text: '', align: 'left' }
  }
}

// ── Default hybrid Basic+Newsletter blocks ────────────────────────────────────

export function makeHybridNewsletterBlocks(defaults: AssetDefaults): ContentBlock[] {
  return [
    { id: uid(), type: 'logo',     logoUrl: defaults.logoUrl, logoAlt: defaults.companyName ?? 'Logo', align: 'left', bgColor: '#f8f9fa' },
    { id: uid(), type: 'headline', text: 'Stay in the loop with our latest updates', align: 'center' },
    { id: uid(), type: 'text',     text: "Welcome to our newsletter. We're sharing our best stories, updates, and resources — curated just for you.", align: 'center' },
    { id: uid(), type: 'image',    url: '', alt: 'Featured story image', align: 'center' },
    { id: uid(), type: 'divider' },
    { id: uid(), type: 'button',   text: 'Read the full story', url: '', align: 'center' },
    { id: uid(), type: 'divider' },
    {
      id: uid(), type: 'columns', ratio: '1:1',
      columns: [
        [{ id: uid(), type: 'image',    url: '', alt: 'Article image', align: 'center' }],
        [
          { id: uid(), type: 'headline', text: 'Featured Article', align: 'left' },
          { id: uid(), type: 'text',     text: "A short teaser that gives the reader a taste of what's inside. Keep it punchy and relevant.", align: 'left' },
          { id: uid(), type: 'button',   text: 'Read more →', url: '', align: 'left' },
        ],
      ],
    },
    { id: uid(), type: 'spacer', height: 24 },
    {
      id: uid(), type: 'columns', ratio: '1:1',
      columns: [
        [
          { id: uid(), type: 'image',    url: '', alt: 'Article 2', align: 'center' },
          { id: uid(), type: 'headline', text: 'Article Two',       align: 'center' },
          { id: uid(), type: 'text',     text: 'Short teaser for article two.', align: 'center' },
        ],
        [
          { id: uid(), type: 'image',    url: '', alt: 'Article 3', align: 'center' },
          { id: uid(), type: 'headline', text: 'Article Three',     align: 'center' },
          { id: uid(), type: 'text',     text: 'Short teaser for article three.', align: 'center' },
        ],
      ],
    },
    { id: uid(), type: 'divider' },
    { id: uid(), type: 'social',       socialLinks: defaults.socialLinks ?? {}, align: 'center' },
    { id: uid(), type: 'footer_block', companyName: defaults.companyName ?? 'Your Company', companyUrl: defaults.companyUrl ?? '', unsubscribeUrl: '', socialLinks: defaults.socialLinks ?? {} },
  ]
}

// ── Palette config ────────────────────────────────────────────────────────────

const CORE_PALETTE: { id: string; label: string; icon: React.ElementType }[] = [
  { id: 'new::logo',         label: 'Logo',     icon: Layout            },
  { id: 'new::headline',     label: 'Headline', icon: Heading1          },
  { id: 'new::text',         label: 'Text',     icon: Type              },
  { id: 'new::image',        label: 'Image',    icon: ImageIcon         },
  { id: 'new::button',       label: 'Button',   icon: MousePointerClick },
  { id: 'new::social',       label: 'Social',   icon: Share2            },
  { id: 'new::divider',      label: 'Divider',  icon: Minus             },
  { id: 'new::spacer',       label: 'Spacer',   icon: Space             },
  { id: 'new::footer_block', label: 'Footer',   icon: Mail              },
]

const COLUMN_PALETTE: { id: string; label: string }[] = [
  { id: 'new::columns::1:1',     label: '2 Equal' },
  { id: 'new::columns::1:2',     label: '1 : 2'   },
  { id: 'new::columns::2:1',     label: '2 : 1'   },
  { id: 'new::columns::1:1:1',   label: '3 Equal' },
  { id: 'new::columns::1:1:1:1', label: '4 Equal' },
  { id: 'new::columns::1:3',     label: '1 : 3'   },
  { id: 'new::columns::3:1',     label: '3 : 1'   },
]

// ── Block visual renderers ────────────────────────────────────────────────────

const SOCIAL_PLATFORM_COLORS: Record<string, string> = {
  twitter: '#1DA1F2', x: '#000000', facebook: '#1877F2',
  instagram: '#E1306C', linkedin: '#0A66C2', youtube: '#FF0000',
  tiktok: '#000000', github: '#24292E', pinterest: '#E60023',
}

function BlockVisual({ block, primary }: { block: ContentBlock; primary: string }) {
  switch (block.type) {

    case 'logo': {
      const align = block.align ?? 'left'
      const justifyMap = { left: 'flex-start', center: 'center', right: 'flex-end' } as const
      return (
        <div style={{ background: block.blockBgColor || block.bgColor || '#f8f9fa', padding: '16px 32px', display: 'flex', justifyContent: justifyMap[align], alignItems: 'center' }}>
          {block.logoUrl
            ? <img src={block.logoUrl} alt={block.logoAlt ?? 'Logo'} style={{ maxHeight: 44, maxWidth: 160, objectFit: 'contain', display: 'block' }} />
            : <div style={{ height: 32, width: 110, background: '#e5e7eb', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, letterSpacing: 0.5 }}>YOUR LOGO</span>
              </div>
          }
        </div>
      )
    }

    case 'headline':
      return (
        <div style={{ padding: '20px 32px 8px', textAlign: block.align ?? 'center' }}>
          <div style={{ fontSize: block.fontSize ?? 26, fontWeight: 700, fontStyle: block.italic ? 'italic' : 'normal', textDecoration: block.underline ? 'underline' : 'none', color: block.textColor ?? '#111827', lineHeight: 1.3, fontFamily: block.fontFamily ?? undefined }}>
            {block.text || <span style={{ color: '#d1d5db' }}>Your headline here</span>}
          </div>
        </div>
      )

    case 'text':
      return (
        <div style={{ padding: '8px 32px', textAlign: block.align ?? 'left' }}>
          <p style={{ margin: 0, fontSize: block.fontSize ?? 14, lineHeight: 1.75, fontWeight: block.bold ? 700 : 400, fontStyle: block.italic ? 'italic' : 'normal', textDecoration: block.underline ? 'underline' : 'none', color: block.textColor ?? '#374151', whiteSpace: 'pre-wrap', fontFamily: block.fontFamily ?? undefined }}>
            {block.text || <span style={{ color: '#d1d5db' }}>Your text goes here.</span>}
          </p>
        </div>
      )

    case 'image':
      return (
        <div style={{ padding: block.align === 'center' ? '12px 0' : '12px 32px', textAlign: block.align ?? 'center' }}>
          {block.url
            ? <img src={block.url} alt={block.alt ?? ''} style={{ width: block.imageWidth ?? '100%', maxWidth: '100%', borderRadius: 8, display: 'block', margin: 'auto', transform: block.imageRotate ? `rotate(${block.imageRotate}deg)` : undefined }} />
            : <div style={{ width: '100%', height: 180, background: '#f3f4f6', border: '2px dashed #d1d5db', borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <ImageIcon style={{ width: 28, height: 28, color: '#d1d5db' }} />
                <span style={{ fontSize: 11, color: '#9ca3af' }}>No image — set URL in properties or pick from Brand Assets →</span>
              </div>
          }
        </div>
      )

    case 'button': {
      const align = block.align ?? 'center'
      const justifyMap = { left: 'flex-start', center: 'center', right: 'flex-end' } as const
      return (
        <div style={{ padding: '12px 32px', display: 'flex', justifyContent: justifyMap[align] }}>
          <div style={{ background: block.bgColor ?? primary, color: block.textColor ?? '#fff', padding: '11px 26px', borderRadius: 7, fontWeight: block.bold ? 700 : 600, fontStyle: block.italic ? 'italic' : 'normal', textDecoration: block.underline ? 'underline' : 'none', fontSize: block.fontSize ?? 14, cursor: 'default', letterSpacing: 0.2, fontFamily: block.fontFamily ?? undefined }}>
            {block.text || 'Get Started'}
          </div>
        </div>
      )
    }

    case 'divider':
      return (
        <div style={{ padding: '8px 32px' }}>
          <div style={{ height: 1, background: '#e5e7eb' }} />
        </div>
      )

    case 'spacer':
      return (
        <div style={{ height: block.height ?? 32, background: 'repeating-linear-gradient(45deg,#f9fafb 0,#f9fafb 2px,transparent 2px,transparent 8px)', borderTop: '1px dashed #e5e7eb', borderBottom: '1px dashed #e5e7eb' }} />
      )

    case 'social': {
      const links     = block.socialLinks ?? {}
      const platforms = Object.keys(links).filter(k => links[k])
      return (
        <div style={{ padding: '16px 32px', display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
          {platforms.length > 0
            ? platforms.map(p => (
                <div key={p} style={{ width: 34, height: 34, borderRadius: '50%', background: SOCIAL_PLATFORM_COLORS[p.toLowerCase()] ?? primary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700 }}>
                  {p[0].toUpperCase()}
                </div>
              ))
            : <>
                {[primary, '#6b7280', '#9ca3af'].map((c, i) => (
                  <div key={i} style={{ width: 34, height: 34, borderRadius: '50%', background: c, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>
                    {['f', 'in', 'x'][i]}
                  </div>
                ))}
                <span style={{ width: '100%', textAlign: 'center', fontSize: 10, color: '#d1d5db', marginTop: 4 }}>Set social links in properties</span>
              </>
          }
        </div>
      )
    }

    case 'footer_block': {
      const links     = block.socialLinks ?? {}
      const platforms = Object.keys(links).filter(k => links[k])
      return (
        <div style={{ padding: '20px 32px', background: '#f9fafb', borderTop: '1px solid #e5e7eb', textAlign: 'center' }}>
          {platforms.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
              {platforms.map(p => (
                <div key={p} style={{ width: 28, height: 28, borderRadius: '50%', background: SOCIAL_PLATFORM_COLORS[p.toLowerCase()] ?? primary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>
                  {p[0].toUpperCase()}
                </div>
              ))}
            </div>
          )}
          <p style={{ margin: '0 0 4px', fontSize: 12, color: '#6b7280' }}>
            © {new Date().getFullYear()}{' '}
            <span style={{ color: primary, fontWeight: 600 }}>{block.companyName || 'Your Company'}</span>
            {' · All rights reserved.'}
          </p>
          <p style={{ margin: 0, fontSize: 10, color: '#9ca3af' }}>
            <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>Unsubscribe</span>
            {' · '}
            <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>Update preferences</span>
          </p>
        </div>
      )
    }

    case 'columns': {
      const ratio = block.ratio ?? '1:1'
      const parts = ratio.split(':').map(Number)
      const total = parts.reduce((a, b) => a + b, 0)
      const cols  = block.columns ?? parts.map(() => [])
      return (
        <div style={{ padding: '8px 16px', display: 'flex', gap: 12 }}>
          {parts.map((w, i) => {
            const colBlocks = cols[i] ?? []
            return (
              <div key={i} style={{ flex: w / total, minWidth: 0 }}>
                {colBlocks.length > 0
                  ? colBlocks.map(sub => <BlockVisual key={sub.id} block={sub} primary={primary} />)
                  : <div style={{ minHeight: 72, border: '2px dashed #e5e7eb', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 10, color: '#d1d5db' }}>Empty column</span>
                    </div>
                }
              </div>
            )
          })}
        </div>
      )
    }

    default:
      return null
  }
}

// ── Column cell drop zone (for palette-item drops into columns) ───────────────

function ColumnCellDropZone({
  id, primary, children,
}: {
  id:       string
  primary:  string
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{
        flex: 1, minHeight: 72,
        border: `2px dashed ${isOver ? primary : '#e5e7eb'}`,
        borderRadius: 8, padding: 2,
        background: isOver ? `${primary}08` : 'transparent',
        display: 'flex', flexDirection: 'column', gap: 2,
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      {children}
      {isOver && (
        <div style={{ height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: primary, fontWeight: 600 }}>
          Drop here
        </div>
      )}
    </div>
  )
}

// ── Sub-path type ─────────────────────────────────────────────────────────────

type SubPath = { outerBlockId: string; colIdx: number; subIdx: number }

// ── Column sub-block: droppable + clickable ───────────────────────────────────
// Each sub-block registers itself with useDroppable so brand-asset drags land here.

function ColumnSubBlockDroppable({
  sub, isSub, primary, onSelect, onUpdate,
}: {
  sub:      ContentBlock
  isSub:    boolean
  primary:  string
  onSelect: () => void
  onUpdate: (patch: Partial<ContentBlock>) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: sub.id })
  const isTextType = ['headline', 'text', 'button'].includes(sub.type)
  return (
    <div
      ref={setNodeRef}
      onClick={e => { e.stopPropagation(); onSelect() }}
      style={{
        position: 'relative', cursor: 'pointer',
        outline: isSub ? `2px solid ${primary}` : isOver ? `2px dashed ${primary}` : '1px dashed transparent',
        borderRadius: 4,
        background: sub.blockBgColor ?? 'transparent',
        transition: 'outline 0.1s',
        paddingTop: isSub && isTextType ? 36 : 0,
      }}
      onMouseEnter={e => { if (!isSub && !isOver) (e.currentTarget as HTMLElement).style.outline = '1px dashed #d1d5db' }}
      onMouseLeave={e => { if (!isSub && !isOver) (e.currentTarget as HTMLElement).style.outline = '1px dashed transparent' }}
    >
      {isSub && isTextType && (
        <div style={{ position: 'absolute', top: 2, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 20, overflow: 'visible' }} onClick={e => e.stopPropagation()}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              display: 'flex', alignItems: 'center', gap: 1,
              background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
              padding: '2px 5px', boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              whiteSpace: 'nowrap',
            }}
          >
            {(['bold','italic','underline'] as const).map(prop => {
              const active = (sub[prop] as boolean | undefined) ?? false
              const label = prop === 'bold' ? 'B' : prop === 'italic' ? 'I' : 'U'
              const extra: React.CSSProperties = prop === 'italic' ? { fontStyle: 'italic' } : prop === 'underline' ? { textDecoration: 'underline' } : {}
              return (
                <button key={prop} onClick={() => onUpdate({ [prop]: !active })}
                  style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, border: 'none', cursor: 'pointer', padding: 0, background: active ? `${primary}22` : 'transparent', color: active ? primary : '#6b7280', fontSize: 10, fontWeight: 700, ...extra }}>
                  {label}
                </button>
              )
            })}
            <label style={{ position: 'relative', width: 14, height: 14, cursor: 'pointer', borderRadius: 3, border: '1px solid #e5e7eb', overflow: 'hidden', flexShrink: 0, display: 'block' }}>
              <div style={{ position: 'absolute', inset: 0, background: sub.textColor ?? '#111827' }} />
              <input type="color" value={sub.textColor ?? '#111827'} onChange={e => onUpdate({ textColor: e.target.value })} style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
            </label>
            <div style={{ width: 1, height: 12, background: '#e5e7eb', margin: '0 1px', flexShrink: 0 }} />
            {(['left','center','right'] as const).map(a => {
              const Icon = a === 'left' ? AlignLeft : a === 'center' ? AlignCenter : AlignRight
              return (
                <button key={a} onClick={() => onUpdate({ align: a })}
                  style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, border: 'none', cursor: 'pointer', padding: 0, background: (sub.align ?? 'left') === a ? `${primary}22` : 'transparent', color: (sub.align ?? 'left') === a ? primary : '#6b7280' }}>
                  <Icon style={{ width: 11, height: 11 }} />
                </button>
              )
            })}
          </div>
        </div>
      )}
      {isSub && !isTextType && (
        <div style={{ position: 'absolute', top: 2, left: 2, zIndex: 15, fontSize: 8, background: primary, color: '#fff', padding: '1px 5px', borderRadius: 3, pointerEvents: 'none' }}>
          editing
        </div>
      )}
      {isSub && isTextType
        ? <InlineTextEditor block={sub} onChange={onUpdate} />
        : <BlockVisual block={sub} primary={primary} />
      }
    </div>
  )
}

// ── Columns block canvas renderer (sub-blocks are clickable + droppable) ──────

function ColumnsBlockCanvas({
  block, primary, selectedSubPath, onSelectSub, onUpdateSub, onUpdateBlock,
}: {
  block:           ContentBlock
  primary:         string
  selectedSubPath: SubPath | null
  onSelectSub:     (p: SubPath) => void
  onUpdateSub:     (colIdx: number, subIdx: number, patch: Partial<ContentBlock>) => void
  onUpdateBlock:   (patch: Partial<ContentBlock>) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const divDragRef   = useRef<{ divIdx: number; startX: number; startWidths: number[]; containerW: number } | null>(null)

  const ratio  = block.ratio ?? '1:1'
  const fracs  = ratio.split(':').map(Number)
  const total  = fracs.reduce((a, b) => a + b, 0)
  const cols   = block.columns ?? fracs.map(() => [])
  const colWidths = block.columnWidths ?? fracs.map(f => Math.round((f / total) * 100))

  function onDividerDown(e: React.PointerEvent<HTMLDivElement>, divIdx: number) {
    e.preventDefault(); e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    divDragRef.current = {
      divIdx, startX: e.clientX,
      startWidths: [...colWidths],
      containerW: containerRef.current?.offsetWidth ?? 500,
    }
  }
  function onDividerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!divDragRef.current || !e.buttons) return
    const { divIdx, startX, startWidths, containerW } = divDragRef.current
    const totalW = startWidths.reduce((a, b) => a + b, 0)
    const dPct   = ((e.clientX - startX) / containerW) * totalW
    const next   = [...startWidths]
    next[divIdx]     = Math.max(10, Math.round(startWidths[divIdx]     + dPct))
    next[divIdx + 1] = Math.max(10, Math.round(startWidths[divIdx + 1] - dPct))
    onUpdateBlock({ columnWidths: next })
  }
  function onDividerUp(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.releasePointerCapture(e.pointerId)
    divDragRef.current = null
  }

  return (
    <div ref={containerRef} style={{ padding: '8px 16px', display: 'flex', gap: 0 }}>
      {colWidths.map((w, colIdx) => {
        const colBlocks = cols[colIdx] ?? []
        return (
          <React.Fragment key={colIdx}>
            {/* Draggable divider between columns */}
            {colIdx > 0 && (
              <div
                onPointerDown={e => onDividerDown(e, colIdx - 1)}
                onPointerMove={onDividerMove}
                onPointerUp={onDividerUp}
                onClick={e => e.stopPropagation()}
                style={{ width: 10, flexShrink: 0, alignSelf: 'stretch', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'col-resize', zIndex: 10, touchAction: 'none', userSelect: 'none' }}
              >
                <div style={{ width: 3, height: 32, borderRadius: 2, background: '#d1d5db' }} />
              </div>
            )}
            <div style={{ flex: `${w} 1 0%`, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <ColumnCellDropZone id={`colcell::${block.id}::${colIdx}`} primary={primary}>
                {colBlocks.map((sub, subIdx) => {
                  const isSub = selectedSubPath?.outerBlockId === block.id
                    && selectedSubPath.colIdx === colIdx
                    && selectedSubPath.subIdx === subIdx
                  return (
                    <ColumnSubBlockDroppable
                      key={sub.id}
                      sub={sub}
                      isSub={isSub}
                      primary={primary}
                      onSelect={() => onSelectSub({ outerBlockId: block.id, colIdx, subIdx })}
                      onUpdate={(patch) => onUpdateSub(colIdx, subIdx, patch)}
                    />
                  )
                })}
                {colBlocks.length === 0 && (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 60 }}>
                    <span style={{ fontSize: 10, color: '#d1d5db' }}>Drag blocks here</span>
                  </div>
                )}
              </ColumnCellDropZone>
            </div>
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ── Sortable canvas block ─────────────────────────────────────────────────────

const IMG_CORNERS: { key: string; style: React.CSSProperties; cursor: string; sign: number }[] = [
  { key: 'tl', style: { top: -5, left: -5 },     cursor: 'nwse-resize', sign: -1 },
  { key: 'tr', style: { top: -5, right: -5 },    cursor: 'nesw-resize', sign:  1 },
  { key: 'bl', style: { bottom: -5, left: -5 },  cursor: 'nesw-resize', sign: -1 },
  { key: 'br', style: { bottom: -5, right: -5 }, cursor: 'nwse-resize', sign:  1 },
]

function CanvasBlock({
  block, selected, isDropTarget, onSelect, onDelete, onChange, primary, selectedSubPath, onSelectSub,
}: {
  block:           ContentBlock
  selected:        boolean
  isDropTarget:    boolean
  onSelect:        () => void
  onDelete:        () => void
  onChange:        (patch: Partial<ContentBlock>) => void
  primary:         string
  selectedSubPath: SubPath | null
  onSelectSub:     (p: SubPath) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id })

  const [imgResizing,  setImgResizing]  = useState(false)
  const [imgLiveWidth, setImgLiveWidth] = useState<number | null>(null)
  const imgWrapRef = useRef<HTMLDivElement>(null)

  const isTextType = ['headline', 'text', 'button'].includes(block.type)

  function updateSubBlock(colIdx: number, subIdx: number, patch: Partial<ContentBlock>) {
    const cols = (block.columns ?? []).map(c => [...c])
    if (!cols[colIdx]) return
    cols[colIdx][subIdx] = { ...cols[colIdx][subIdx], ...patch }
    onChange({ columns: cols })
  }

  function startImgResize(e: React.MouseEvent, sign: number) {
    e.preventDefault(); e.stopPropagation()
    const imgEl = imgWrapRef.current
    if (!imgEl) return
    const startX     = e.clientX
    const startPx    = imgEl.offsetWidth
    const containerW = imgEl.parentElement?.offsetWidth ?? startPx
    setImgResizing(true)
    function onMove(ev: MouseEvent) {
      const newPx = Math.max(40, Math.min(containerW, startPx + (ev.clientX - startX) * sign))
      const pct   = Math.round((newPx / containerW) * 100)
      setImgLiveWidth(pct)
      onChange({ imageWidth: `${pct}%` })
    }
    function onUp() {
      setImgResizing(false); setImgLiveWidth(null)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const btnStyle = (active = false): React.CSSProperties => ({
    width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 4, border: 'none', cursor: 'pointer', padding: 0,
    background: active ? `${primary}22` : 'transparent', color: active ? primary : '#6b7280',
  })
  const sep = <div style={{ width: 1, height: 14, background: '#e5e7eb', margin: '0 2px', flexShrink: 0 }} />
  const toolbarWrap: React.CSSProperties = {
    position: 'absolute', top: -38, left: '50%', transform: 'translateX(-50%)', zIndex: 30,
    display: 'flex', alignItems: 'center', gap: 1,
    background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
    padding: '3px 6px', boxShadow: '0 2px 10px rgba(0,0,0,0.13)', whiteSpace: 'nowrap',
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1, position: 'relative', background: block.blockBgColor ?? 'transparent' }}
      onClick={onSelect}
    >
      {/* Text format toolbar */}
      {selected && isTextType && (
        <TextFormatToolbar block={block} onChange={onChange} primary={primary} />
      )}

      {/* Image toolbar — rotate + alignment */}
      {selected && block.type === 'image' && (
        <div onClick={e => e.stopPropagation()} style={toolbarWrap}>
          <button onClick={() => onChange({ imageRotate: ((block.imageRotate ?? 0) - 90 + 360) % 360 })} style={btnStyle()} title="Rotate left"><RotateCcw style={{ width: 12, height: 12 }} /></button>
          <button onClick={() => onChange({ imageRotate: ((block.imageRotate ?? 0) + 90) % 360 })}       style={btnStyle()} title="Rotate right"><RotateCw  style={{ width: 12, height: 12 }} /></button>
          {sep}
          {(['left','center','right'] as const).map(a => {
            const Icon = a === 'left' ? AlignLeft : a === 'center' ? AlignCenter : AlignRight
            return <button key={a} onClick={() => onChange({ align: a })} style={btnStyle((block.align ?? 'center') === a)}><Icon style={{ width: 12, height: 12 }} /></button>
          })}
        </div>
      )}

      {/* Selection / drop-target border */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10,
        border: selected ? `2px solid ${primary}` : isDropTarget ? `2px dashed ${primary}66` : '2px solid transparent',
        borderRadius: 4, transition: 'border-color 0.1s',
      }} />

      {/* Drag + delete controls */}
      <div style={{ position: 'absolute', top: 4, right: 4, zIndex: 20, display: 'flex', gap: 4, opacity: selected ? 1 : 0, transition: 'opacity 0.15s' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
        onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLElement).style.opacity = '0' }}
      >
        <button {...attributes} {...listeners} onClick={e => e.stopPropagation()}
          style={{ width: 26, height: 26, borderRadius: 6, background: '#fff', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'grab', color: '#6b7280', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
          title="Drag to reorder">
          <GripVertical style={{ width: 13, height: 13 }} />
        </button>
        <button onClick={e => { e.stopPropagation(); onDelete() }}
          style={{ width: 26, height: 26, borderRadius: 6, background: '#fff', border: '1px solid #fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
          title="Delete block">
          <Trash2 style={{ width: 12, height: 12 }} />
        </button>
      </div>

      {/* Block content */}
      {block.type === 'columns' ? (
        <ColumnsBlockCanvas
          block={block} primary={primary}
          selectedSubPath={selectedSubPath} onSelectSub={onSelectSub}
          onUpdateSub={updateSubBlock} onUpdateBlock={onChange}
        />
      ) : block.type === 'image' ? (
        <div style={{ padding: (block.align ?? 'center') === 'center' ? '12px 0' : '12px 32px', textAlign: block.align ?? 'center' }}>
          <div ref={imgWrapRef} style={{ position: 'relative', display: 'inline-block', width: block.imageWidth ?? '100%', maxWidth: '100%' }}>
            {block.url
              ? <img src={block.url} alt={block.alt ?? ''} style={{ width: '100%', borderRadius: 8, display: 'block', transform: block.imageRotate ? `rotate(${block.imageRotate}deg)` : undefined }} />
              : <div style={{ width: '100%', height: 180, background: '#f3f4f6', border: '2px dashed #d1d5db', borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <ImageIcon style={{ width: 28, height: 28, color: '#d1d5db' }} />
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>No image — set URL in properties or Brand Assets →</span>
                </div>
            }
            {/* 4-corner resize handles */}
            {selected && IMG_CORNERS.map(c => (
              <div key={c.key} onMouseDown={e => startImgResize(e, c.sign)}
                style={{ position: 'absolute', ...c.style, cursor: c.cursor, zIndex: 25, width: 10, height: 10, background: '#fff', border: `2px solid ${primary}`, borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
              />
            ))}
            {/* Width badge while resizing */}
            {imgResizing && imgLiveWidth !== null && (
              <div style={{ position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)', background: '#1f2937', color: '#fff', fontSize: 9, fontFamily: 'monospace', padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap', zIndex: 30 }}>
                {imgLiveWidth}%
              </div>
            )}
          </div>
        </div>
      ) : selected && isTextType ? (
        <InlineTextEditor block={block} onChange={onChange} />
      ) : (
        <BlockVisual block={block} primary={primary} />
      )}
    </div>
  )
}

// ── Draggable palette item ─────────────────────────────────────────────────────

function PaletteItem({ id, label, icon: Icon }: { id: string; label: string; icon?: React.ElementType }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ opacity: isDragging ? 0.4 : 1, touchAction: 'none' }}
      className="flex flex-col items-center gap-1 py-2 px-1 rounded-lg border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-100 dark:hover:bg-white/10 transition-all cursor-grab active:cursor-grabbing group"
    >
      {Icon ? <Icon className="w-4 h-4 text-gray-400 group-hover:text-gray-700 transition-colors" />
             : <Columns className="w-4 h-4 text-gray-400 group-hover:text-gray-700 transition-colors" />}
      <span className="text-[9px] font-semibold text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 text-center leading-tight">{label}</span>
    </div>
  )
}

// ── Block property editor ─────────────────────────────────────────────────────

function AlignButtons({ value, onChange, primary }: {
  value?: string; onChange: (v: 'left' | 'center' | 'right') => void; primary: string
}) {
  return (
    <div className="flex gap-1">
      {(['left', 'center', 'right'] as const).map(a => {
        const Icon   = a === 'left' ? AlignLeft : a === 'center' ? AlignCenter : AlignRight
        const active = (value ?? 'left') === a
        return (
          <button key={a} onClick={() => onChange(a)}
            className="flex-1 py-1.5 flex items-center justify-center rounded-lg border transition-colors"
            style={active ? { borderColor: primary, background: `${primary}15`, color: primary } : {}}>
            <Icon className="w-3.5 h-3.5" style={active ? { color: primary } : { color: '#9ca3af' }} />
          </button>
        )
      })}
    </div>
  )
}

// ── Inline text format toolbar (shown above selected text blocks) ─────────────

function TextFormatToolbar({
  block,
  onChange,
  primary,
}: {
  block:    ContentBlock
  onChange: (patch: Partial<ContentBlock>) => void
  primary:  string
}) {
  const bold      = block.bold      ?? false
  const italic    = block.italic    ?? false
  const underline = block.underline ?? false
  const textColor = block.textColor ?? '#111827'
  const align     = block.align     ?? 'left'

  const btn = (active: boolean, extra?: React.CSSProperties): React.CSSProperties => ({
    width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 4, border: 'none', cursor: 'pointer', padding: 0,
    background: active ? `${primary}22` : 'transparent',
    color: active ? primary : '#6b7280',
    fontSize: 11, fontWeight: 700,
    ...extra,
  })
  const sep = <div style={{ width: 1, height: 14, background: '#e5e7eb', margin: '0 2px', flexShrink: 0 }} />

  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{
        position: 'absolute', top: -38, left: '50%', transform: 'translateX(-50%)', zIndex: 30,
        display: 'flex', alignItems: 'center', gap: 1,
        background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
        padding: '3px 6px', boxShadow: '0 2px 10px rgba(0,0,0,0.13)',
        whiteSpace: 'nowrap',
      }}
    >
      <button onClick={() => onChange({ bold: !bold })} style={btn(bold)}>B</button>
      <button onClick={() => onChange({ italic: !italic })} style={btn(italic, { fontStyle: 'italic' })}>I</button>
      <button onClick={() => onChange({ underline: !underline })} style={btn(underline, { textDecoration: 'underline' })}>U</button>
      <label style={{ position: 'relative', width: 16, height: 16, cursor: 'pointer', borderRadius: 3, border: '1px solid #e5e7eb', overflow: 'hidden', flexShrink: 0, display: 'block' }} title="Text colour">
        <div style={{ position: 'absolute', inset: 0, background: textColor }} />
        <input type="color" value={textColor} onChange={e => onChange({ textColor: e.target.value })} style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
      </label>
      {sep}
      <button onClick={() => onChange({ align: 'left' })}   style={btn(align === 'left')}  ><AlignLeft   style={{ width: 12, height: 12 }} /></button>
      <button onClick={() => onChange({ align: 'center' })} style={btn(align === 'center')}><AlignCenter style={{ width: 12, height: 12 }} /></button>
      <button onClick={() => onChange({ align: 'right' })}  style={btn(align === 'right')} ><AlignRight  style={{ width: 12, height: 12 }} /></button>
    </div>
  )
}

// ── Inline text editor (replaces BlockVisual when block is selected) ───────────

function InlineTextEditor({
  block,
  onChange,
}: {
  block:    ContentBlock
  onChange: (patch: Partial<ContentBlock>) => void
}) {
  const bold      = block.bold      ?? false
  const italic    = block.italic    ?? false
  const underline = block.underline ?? false

  const base: React.CSSProperties = {
    fontStyle:      italic    ? 'italic'    : 'normal',
    textDecoration: underline ? 'underline' : 'none',
    fontFamily:     block.fontFamily ?? undefined,
    textAlign:      (block.align ?? 'left') as React.CSSProperties['textAlign'],
    background:     'transparent',
    border:         'none',
    outline:        'none',
    resize:         'none',
    width:          '100%',
    padding:        0,
    display:        'block',
  }

  if (block.type === 'headline') {
    return (
      <div style={{ padding: '20px 32px 8px' }}>
        <textarea
          value={block.text ?? ''}
          onChange={e => onChange({ text: e.target.value })}
          onClick={e => e.stopPropagation()}
          rows={2}
          style={{ ...base, fontSize: block.fontSize ?? 26, fontWeight: 700, color: block.textColor ?? '#111827', lineHeight: 1.3 } as React.CSSProperties}
        />
      </div>
    )
  }

  if (block.type === 'text') {
    return (
      <div style={{ padding: '8px 32px' }}>
        <textarea
          value={block.text ?? ''}
          onChange={e => onChange({ text: e.target.value })}
          onClick={e => e.stopPropagation()}
          rows={4}
          style={{ ...base, fontSize: block.fontSize ?? 14, fontWeight: bold ? 700 : 400, color: block.textColor ?? '#374151', lineHeight: 1.75 } as React.CSSProperties}
        />
      </div>
    )
  }

  if (block.type === 'button') {
    const justifyMap = { left: 'flex-start', center: 'center', right: 'flex-end' } as const
    const align = block.align ?? 'center'
    return (
      <div style={{ padding: '12px 32px', display: 'flex', justifyContent: justifyMap[align] }}>
        <div style={{ background: block.bgColor ?? '#6366f1', borderRadius: 7 }}>
          <input
            value={block.text ?? ''}
            onChange={e => onChange({ text: e.target.value })}
            onClick={e => e.stopPropagation()}
            style={{ ...base, fontSize: block.fontSize ?? 14, fontWeight: bold ? 700 : 600, color: block.textColor ?? '#fff', padding: '11px 26px', letterSpacing: 0.2, borderRadius: 7, width: 'auto', minWidth: 80 } as React.CSSProperties}
          />
        </div>
      </div>
    )
  }

  return null
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )
}

const inputCls = "w-full text-xs rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 px-3 py-2 text-gray-800 dark:text-gray-200 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400/30"

function BlockPropertyEditor({
  block, onChange, primary,
}: {
  block:    ContentBlock | null
  onChange: (patch: Partial<ContentBlock>) => void
  primary:  string
}) {
  if (!block) return null

  return (
    <div className="px-3 py-3 space-y-4">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{block.type.replace('_', ' ')}</p>

      {block.type === 'logo' && <>
        <Field label="Logo URL">
          <input className={inputCls} type="url" value={block.logoUrl ?? ''} placeholder="https://…"
            onChange={e => onChange({ logoUrl: e.target.value })} />
        </Field>
        <Field label="Alt / Brand name">
          <input className={inputCls} value={block.logoAlt ?? ''} placeholder="Your Brand"
            onChange={e => onChange({ logoAlt: e.target.value })} />
        </Field>
        <Field label="Background">
          <div className="flex gap-2">
            <input type="color" value={block.blockBgColor ?? block.bgColor ?? '#f8f9fa'}
              onChange={e => onChange({ blockBgColor: e.target.value })}
              className="w-8 h-8 rounded border border-gray-200 cursor-pointer p-0.5" />
            <input className={inputCls} value={block.blockBgColor ?? block.bgColor ?? '#f8f9fa'} maxLength={7}
              onChange={e => onChange({ blockBgColor: e.target.value })} />
          </div>
        </Field>
        <Field label="Alignment">
          <AlignButtons value={block.align} onChange={v => onChange({ align: v })} primary={primary} />
        </Field>
      </>}

      {block.type === 'headline' && <>
        <Field label="Text">
          <input className={inputCls} value={block.text ?? ''} placeholder="Your headline"
            onChange={e => onChange({ text: e.target.value })} />
        </Field>
        <Field label="Block background">
          <div className="flex gap-2">
            <input type="color" value={block.blockBgColor ?? '#ffffff'}
              onChange={e => onChange({ blockBgColor: e.target.value })}
              className="w-8 h-8 rounded border border-gray-200 cursor-pointer p-0.5" />
            <input className={inputCls} value={block.blockBgColor ?? ''} placeholder="transparent"
              onChange={e => onChange({ blockBgColor: e.target.value || undefined })} />
          </div>
        </Field>
        <Field label="Alignment">
          <AlignButtons value={block.align} onChange={v => onChange({ align: v })} primary={primary} />
        </Field>
      </>}

      {block.type === 'text' && <>
        <Field label="Text">
          <textarea rows={5} className={inputCls + ' resize-none'} value={block.text ?? ''} placeholder="Your message…"
            onChange={e => onChange({ text: e.target.value })} />
        </Field>
        <Field label="Block background">
          <div className="flex gap-2">
            <input type="color" value={block.blockBgColor ?? '#ffffff'}
              onChange={e => onChange({ blockBgColor: e.target.value })}
              className="w-8 h-8 rounded border border-gray-200 cursor-pointer p-0.5" />
            <input className={inputCls} value={block.blockBgColor ?? ''} placeholder="transparent"
              onChange={e => onChange({ blockBgColor: e.target.value || undefined })} />
          </div>
        </Field>
        <Field label="Alignment">
          <AlignButtons value={block.align} onChange={v => onChange({ align: v })} primary={primary} />
        </Field>
      </>}

      {block.type === 'image' && <>
        <Field label="Image URL">
          <input className={inputCls} type="url" value={block.url ?? ''} placeholder="https://…"
            onChange={e => onChange({ url: e.target.value })} />
        </Field>
        <Field label="Alt text">
          <input className={inputCls} value={block.alt ?? ''} placeholder="Describe the image"
            onChange={e => onChange({ alt: e.target.value })} />
        </Field>
        <Field label="Alignment">
          <AlignButtons value={block.align} onChange={v => onChange({ align: v })} primary={primary} />
        </Field>
      </>}

      {block.type === 'button' && <>
        <Field label="Button text">
          <input className={inputCls} value={block.text ?? ''} placeholder="Get Started"
            onChange={e => onChange({ text: e.target.value })} />
        </Field>
        <Field label="Link URL">
          <input className={inputCls} type="url" value={block.url ?? ''} placeholder="https://…"
            onChange={e => onChange({ url: e.target.value })} />
        </Field>
        <Field label="Alignment">
          <AlignButtons value={block.align} onChange={v => onChange({ align: v })} primary={primary} />
        </Field>
      </>}

      {block.type === 'image' && <>
        {/* block background — useful for image blocks with padding */}
        <Field label="Block background">
          <div className="flex gap-2">
            <input type="color" value={block.blockBgColor ?? '#ffffff'}
              onChange={e => onChange({ blockBgColor: e.target.value })}
              className="w-8 h-8 rounded border border-gray-200 cursor-pointer p-0.5" />
            <input className={inputCls} value={block.blockBgColor ?? ''} placeholder="transparent"
              onChange={e => onChange({ blockBgColor: e.target.value || undefined })} />
          </div>
        </Field>
      </>}

      {block.type === 'spacer' && (
        <Field label={`Height: ${block.height ?? 32}px`}>
          <input type="range" min={8} max={120} step={8} value={block.height ?? 32}
            onChange={e => onChange({ height: Number(e.target.value) })}
            className="w-full accent-gray-700" />
        </Field>
      )}

      {block.type === 'social' && <>
        <p className="text-[10px] text-gray-400">Add platform URL per network.</p>
        {['twitter', 'instagram', 'facebook', 'linkedin', 'youtube', 'tiktok', 'github'].map(p => (
          <Field key={p} label={p.charAt(0).toUpperCase() + p.slice(1)}>
            <input className={inputCls} value={(block.socialLinks ?? {})[p] ?? ''} placeholder="https://…"
              onChange={e => onChange({ socialLinks: { ...(block.socialLinks ?? {}), [p]: e.target.value } })} />
          </Field>
        ))}
      </>}

      {block.type === 'footer_block' && <>
        <Field label="Company name">
          <input className={inputCls} value={block.companyName ?? ''} placeholder="Acme Inc."
            onChange={e => onChange({ companyName: e.target.value })} />
        </Field>
        <Field label="Company URL">
          <input className={inputCls} type="url" value={block.companyUrl ?? ''} placeholder="https://…"
            onChange={e => onChange({ companyUrl: e.target.value })} />
        </Field>
        <Field label="Unsubscribe URL">
          <input className={inputCls} type="url" value={block.unsubscribeUrl ?? ''} placeholder="https://…/unsubscribe"
            onChange={e => onChange({ unsubscribeUrl: e.target.value })} />
        </Field>
        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Social icons</p>
        {['twitter', 'instagram', 'facebook', 'linkedin'].map(p => (
          <Field key={p} label={p.charAt(0).toUpperCase() + p.slice(1)}>
            <input className={inputCls} value={(block.socialLinks ?? {})[p] ?? ''} placeholder="https://…"
              onChange={e => onChange({ socialLinks: { ...(block.socialLinks ?? {}), [p]: e.target.value } })} />
          </Field>
        ))}
      </>}

      {block.type === 'columns' && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-gray-400">Ratio: <strong>{block.ratio ?? '1:1'}</strong></p>
          <p className="text-[10px] text-gray-400">Column content is pre-populated. Drag more blocks from the palette.</p>
        </div>
      )}

      {block.type === 'divider' && (
        <p className="text-xs text-gray-400">Horizontal rule — no properties to edit.</p>
      )}
    </div>
  )
}

// ── Empty canvas drop zone ────────────────────────────────────────────────────

function EmptyDropZone({ primary }: { primary: string }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'canvas-empty' })
  return (
    <div ref={setNodeRef} style={{
      minHeight: 400,
      border:    `2px dashed ${isOver ? primary : '#d1d5db'}`,
      borderRadius: 12,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 10, margin: 24, transition: 'border-color 0.15s',
      background: isOver ? `${primary}08` : 'transparent',
    }}>
      <Plus style={{ width: 32, height: 32, color: isOver ? primary : '#d1d5db' }} />
      <p style={{ fontSize: 13, color: isOver ? primary : '#9ca3af', fontWeight: 500 }}>
        {isOver ? 'Release to add block' : 'Drag blocks here to start building'}
      </p>
    </div>
  )
}

// ── Draggable asset image (right panel) ──────────────────────────────────────
// ID format: "brand-asset::{url}"  or  "brand-logo::{url}"

function DraggableAssetThumb({
  url, role, selectedBlock, onApply,
}: {
  url:           string
  role:          string
  selectedBlock: ContentBlock | null
  onApply:       (url: string) => void
}) {
  const id = `brand-asset::${url}`
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => onApply(url)}
      style={{
        opacity: isDragging ? 0.4 : 1, touchAction: 'none',
        border: '1px solid #e5e7eb', borderRadius: 6, overflow: 'hidden',
        cursor: 'grab', background: '#f9fafb', position: 'relative',
      }}
      title={selectedBlock ? `Drag or click to use in ${selectedBlock.type}` : 'Drag onto an image block'}
    >
      <img
        src={url}
        alt={role}
        style={{ width: '100%', height: 52, objectFit: 'cover', display: 'block', pointerEvents: 'none' }}
      />
    </div>
  )
}

// ── Brand Assets Right Panel ──────────────────────────────────────────────────

function BrandAssetsPanel({
  allProfiles,
  allAssets,
  primary,
  selectedBlock,
  onApplyToBlock,
  activeBrandId,
  onBrandChange,
  subject,
  preheader,
  footerText,
  onMetaChange,
}: {
  allProfiles:     BrandProfile[]
  allAssets:       BrandAsset[]
  primary:         string
  selectedBlock:   ContentBlock | null
  onApplyToBlock:  (patch: Partial<ContentBlock>) => void
  activeBrandId:   string
  onBrandChange:   (id: string) => void
  subject:         string
  preheader:       string
  footerText:      string
  onMetaChange:    (patch: { subject?: string; preheader?: string; footer_text?: string }) => void
}) {
  const [dropOpen,      setDropOpen]      = useState(false)
  const [textColorVal,  setTextColorVal]  = useState('#333333')
  const [bgColorVal,    setBgColorVal]    = useState('#ffffff')
  const [btnColorVal,   setBtnColorVal]   = useState('#111111')
  const [fontSize,      setFontSize]      = useState<number>(16)
  const [fontFamily,    setFontFamily]    = useState<string>('')

  const { brandColor: headerColor } = useUserAvatar()

  const activeBrand  = allProfiles.find(p => p.id === activeBrandId) ?? allProfiles[0]
  const brandAssets  = allAssets.filter(a => a.brand_profile_id === activeBrandId && !a.is_archived)
  const LOGO_ROLES   = ['primary_logo', 'secondary_logo', 'logo_mark']
  const logoAsset    = brandAssets.find(a => LOGO_ROLES.includes(a.asset_role) && a.is_primary)
                    ?? brandAssets.find(a => LOGO_ROLES.includes(a.asset_role))

  // Build color swatches from brand
  const swatches: string[] = []
  if (activeBrand) {
    const roles = ['color_primary', 'color_secondary', 'color_accent', 'color_background', 'color_text'] as const
    for (const r of roles) {
      const v = activeBrand[r]
      if (v && !swatches.includes(v)) swatches.push(v)
    }
    if (activeBrand.brand_palette_json) {
      for (const c of activeBrand.brand_palette_json) {
        if (c.hex && !swatches.includes(c.hex)) swatches.push(c.hex)
      }
    }
  }

  function applyColor(hex: string, as: 'bg' | 'text') {
    if (!selectedBlock) return
    if (as === 'text') onApplyToBlock({ textColor: hex })
    else onApplyToBlock({ blockBgColor: hex })
  }

  function applyLogo(url: string) {
    if (!selectedBlock) return
    if (selectedBlock.type === 'logo') {
      onApplyToBlock({ logoUrl: url, logoAlt: activeBrand?.company_name ?? 'Logo' })
    } else if (selectedBlock.type === 'image') {
      onApplyToBlock({ url, alt: 'Logo' })
    }
  }

  function applyFont(font: string) {
    if (!selectedBlock) return
    const textTypes: ContentBlock['type'][] = ['headline', 'text', 'button']
    if (textTypes.includes(selectedBlock.type)) onApplyToBlock({ fontFamily: font })
  }

  const sectionHead = (label: string) => (
    <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, color: '#9ca3af', textTransform: 'uppercase', margin: '0 0 6px' }}>{label}</p>
  )

  const noBlock = !selectedBlock
  const hint = noBlock
    ? <p style={{ fontSize: 9, color: '#9ca3af', marginTop: 4 }}>Select a block on the canvas first</p>
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Themed header — title only */}
      <div style={{ padding: '10px 12px', flexShrink: 0, background: headerColor }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0, letterSpacing: 0.2 }}>Brand Assets</p>
      </div>

      {/* Brand selector — white strip below header */}
      <div style={{ flexShrink: 0, padding: '8px 12px', borderBottom: `1px solid #f3f4f6`, background: '#fff', position: 'relative' }}>
        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, color: '#9ca3af', textTransform: 'uppercase', margin: '0 0 5px' }}>Brand</p>
        <button
          onClick={() => setDropOpen(v => !v)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: 8, border: `1px solid ${primary}40`, background: '#f9fafb', fontSize: 12, fontWeight: 600, color: '#1f2937', cursor: 'pointer' }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activeBrand?.company_name ?? 'Select brand'}
          </span>
          <ChevronDown style={{ width: 12, height: 12, color: '#6b7280', flexShrink: 0 }} />
        </button>
        {dropOpen && (
          <div style={{ position: 'absolute', top: '100%', left: 12, right: 12, zIndex: 50, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginTop: 2, overflow: 'hidden' }}>
            {allProfiles.map(p => (
              <button
                key={p.id}
                onClick={() => { onBrandChange(p.id); setDropOpen(false) }}
                style={{ width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: 12, fontWeight: activeBrandId === p.id ? 700 : 400, color: activeBrandId === p.id ? primary : '#374151', background: activeBrandId === p.id ? `${primary}08` : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {activeBrandId === p.id && <Check style={{ width: 10, height: 10 }} />}
                {p.company_name ?? '(unnamed)'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Logo */}
        {logoAsset && (
          <div>
            {sectionHead('Logo — drag or click')}
            <DraggableAssetThumb
              url={logoAsset.file_url}
              role="logo"
              selectedBlock={selectedBlock}
              onApply={applyLogo}
            />
            {hint}
          </div>
        )}

        {/* Colors */}
        {swatches.length > 0 && (
          <div>
            {sectionHead('Text color — click swatch')}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
              {swatches.slice(0, 10).map(hex => (
                <button
                  key={`t-${hex}`}
                  onClick={() => applyColor(hex, 'text')}
                  title={noBlock ? 'Select a block first' : `Set text color to ${hex}`}
                  style={{ width: 24, height: 24, borderRadius: '50%', background: hex, border: '2px solid #fff', boxShadow: '0 0 0 1px #e5e7eb', cursor: noBlock ? 'not-allowed' : 'pointer', opacity: noBlock ? 0.4 : 1 }}
                />
              ))}
            </div>
            {/* Custom text color */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
              <input
                type="color"
                value={textColorVal}
                onChange={e => { setTextColorVal(e.target.value); if (selectedBlock) onApplyToBlock({ textColor: e.target.value }) }}
                style={{ width: 24, height: 24, border: 'none', padding: 0, cursor: 'pointer', borderRadius: 4, flexShrink: 0 }}
                title="Custom text color"
              />
              <input
                type="text"
                value={textColorVal}
                onChange={e => {
                  const v = e.target.value
                  setTextColorVal(v)
                  if (/^#[0-9a-fA-F]{6}$/.test(v) && selectedBlock) onApplyToBlock({ textColor: v })
                }}
                style={{ width: 0, flex: 1, fontSize: 10, padding: '3px 6px', borderRadius: 5, border: '1px solid #e5e7eb', color: '#374151', fontFamily: 'monospace', outline: 'none', minWidth: 0 }}
                maxLength={7}
                placeholder="#333333"
              />
              <span style={{ fontSize: 9, color: '#9ca3af', whiteSpace: 'nowrap' }}>Text</span>
            </div>

            {sectionHead('Block bg — click swatch')}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
              {swatches.slice(0, 10).map(hex => (
                <button
                  key={`b-${hex}`}
                  onClick={() => applyColor(hex, 'bg')}
                  title={noBlock ? 'Select a block first' : `Set block background to ${hex}`}
                  style={{ width: 24, height: 24, borderRadius: '50%', background: hex, border: '2px solid #fff', boxShadow: '0 0 0 1px #e5e7eb', cursor: noBlock ? 'not-allowed' : 'pointer', opacity: noBlock ? 0.4 : 1 }}
                />
              ))}
            </div>
            {/* Custom block background */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                type="color"
                value={bgColorVal}
                onChange={e => { setBgColorVal(e.target.value); if (selectedBlock) onApplyToBlock({ blockBgColor: e.target.value }) }}
                style={{ width: 24, height: 24, border: 'none', padding: 0, cursor: 'pointer', borderRadius: 4, flexShrink: 0 }}
                title="Custom block background"
              />
              <input
                type="text"
                value={bgColorVal}
                onChange={e => {
                  const v = e.target.value
                  setBgColorVal(v)
                  if (/^#[0-9a-fA-F]{6}$/.test(v) && selectedBlock) onApplyToBlock({ blockBgColor: v })
                }}
                style={{ width: 0, flex: 1, fontSize: 10, padding: '3px 6px', borderRadius: 5, border: '1px solid #e5e7eb', color: '#374151', fontFamily: 'monospace', outline: 'none', minWidth: 0 }}
                maxLength={7}
                placeholder="#ffffff"
              />
              <span style={{ fontSize: 9, color: '#9ca3af', whiteSpace: 'nowrap' }}>BG</span>
            </div>

            {/* Button color — always visible */}
            <div style={{ marginTop: 10 }}>
              {sectionHead('Button color — click swatch')}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                {swatches.slice(0, 10).map(hex => (
                  <button
                    key={`btn-${hex}`}
                    onClick={() => { setBtnColorVal(hex); onApplyToBlock({ bgColor: hex }) }}
                    title={`Set button color to ${hex}`}
                    style={{ width: 24, height: 24, borderRadius: '50%', background: hex, border: '2px solid #fff', boxShadow: '0 0 0 1px #e5e7eb', cursor: 'pointer' }}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  type="color"
                  value={btnColorVal}
                  onChange={e => { setBtnColorVal(e.target.value); onApplyToBlock({ bgColor: e.target.value }) }}
                  style={{ width: 24, height: 24, border: 'none', padding: 0, cursor: 'pointer', borderRadius: 4, flexShrink: 0 }}
                  title="Custom button color"
                />
                <input
                  type="text"
                  value={btnColorVal}
                  onChange={e => {
                    const v = e.target.value
                    setBtnColorVal(v)
                    if (/^#[0-9a-fA-F]{6}$/.test(v)) onApplyToBlock({ bgColor: v })
                  }}
                  style={{ width: 0, flex: 1, fontSize: 10, padding: '3px 6px', borderRadius: 5, border: '1px solid #e5e7eb', color: '#374151', fontFamily: 'monospace', outline: 'none', minWidth: 0 }}
                  maxLength={7}
                  placeholder="#111111"
                />
                <span style={{ fontSize: 9, color: '#9ca3af', whiteSpace: 'nowrap' }}>Button</span>
              </div>
            </div>
            {hint}
          </div>
        )}

        {/* Fonts */}
        <div>
          {sectionHead('Fonts — click to apply')}
          {(activeBrand?.font_heading || activeBrand?.font_body) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
              {activeBrand.font_heading && (
                <button onClick={() => applyFont(activeBrand.font_heading!)} disabled={noBlock}
                  style={{ padding: '6px 8px', borderRadius: 6, background: '#f9fafb', border: `1px solid ${noBlock ? '#f3f4f6' : primary + '40'}`, cursor: noBlock ? 'not-allowed' : 'pointer', textAlign: 'left', opacity: noBlock ? 0.6 : 1 }}>
                  <p style={{ fontSize: 9, color: '#9ca3af', margin: '0 0 2px' }}>Heading</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#1f2937', margin: 0, fontFamily: activeBrand.font_heading }}>{activeBrand.font_heading}</p>
                </button>
              )}
              {activeBrand.font_heading_sub && (
                <button onClick={() => applyFont(activeBrand.font_heading_sub!)} disabled={noBlock}
                  style={{ padding: '6px 8px', borderRadius: 6, background: '#f9fafb', border: `1px solid ${noBlock ? '#f3f4f6' : primary + '40'}`, cursor: noBlock ? 'not-allowed' : 'pointer', textAlign: 'left', opacity: noBlock ? 0.6 : 1 }}>
                  <p style={{ fontSize: 9, color: '#9ca3af', margin: '0 0 2px' }}>Subheading</p>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', margin: 0, fontFamily: activeBrand.font_heading_sub }}>{activeBrand.font_heading_sub}</p>
                </button>
              )}
              {activeBrand.font_body && (
                <button onClick={() => applyFont(activeBrand.font_body!)} disabled={noBlock}
                  style={{ padding: '6px 8px', borderRadius: 6, background: '#f9fafb', border: `1px solid ${noBlock ? '#f3f4f6' : primary + '40'}`, cursor: noBlock ? 'not-allowed' : 'pointer', textAlign: 'left', opacity: noBlock ? 0.6 : 1 }}>
                  <p style={{ fontSize: 9, color: '#9ca3af', margin: '0 0 2px' }}>Body</p>
                  <p style={{ fontSize: 12, color: '#374151', margin: 0, fontFamily: activeBrand.font_body }}>{activeBrand.font_body}</p>
                </button>
              )}
            </div>
          )}

          {/* Font size — no Apply button */}
          <div style={{ marginBottom: 8 }}>
            <p style={{ fontSize: 9, color: '#6b7280', margin: '0 0 4px', fontWeight: 600 }}>Font Size (px)</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                onClick={() => { const v = Math.max(8, fontSize - 1); setFontSize(v); if (selectedBlock) onApplyToBlock({ fontSize: v }) }}
                style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #e5e7eb', background: '#f9fafb', fontSize: 14, fontWeight: 700, cursor: 'pointer', color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >−</button>
              <input
                type="number"
                min={8} max={96}
                value={fontSize}
                onChange={e => {
                  const v = Math.min(96, Math.max(8, parseInt(e.target.value) || 8))
                  setFontSize(v)
                  if (selectedBlock) onApplyToBlock({ fontSize: v })
                }}
                style={{ width: 48, textAlign: 'center', fontSize: 12, padding: '3px 4px', borderRadius: 6, border: '1px solid #e5e7eb', color: '#1f2937', outline: 'none' }}
              />
              <button
                onClick={() => { const v = Math.min(96, fontSize + 1); setFontSize(v); if (selectedBlock) onApplyToBlock({ fontSize: v }) }}
                style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #e5e7eb', background: '#f9fafb', fontSize: 14, fontWeight: 700, cursor: 'pointer', color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >+</button>
            </div>
          </div>

          {/* Font family — instant apply, no Apply button */}
          <div style={{ marginBottom: 10 }}>
            <p style={{ fontSize: 9, color: '#6b7280', margin: '0 0 4px', fontWeight: 600 }}>Font Family</p>
            <select
              value={fontFamily}
              onChange={e => {
                const f = e.target.value
                setFontFamily(f)
                if (selectedBlock && f) onApplyToBlock({ fontFamily: f })
              }}
              style={{ width: '100%', fontSize: 11, padding: '5px 8px', borderRadius: 6, border: '1px solid #e5e7eb', color: '#1f2937', background: '#fff', outline: 'none' }}
            >
              <option value="">— select font —</option>
              {[
                'Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Courier New',
                'Trebuchet MS', 'Verdana', 'Impact', 'Tahoma', 'Palatino',
                'Garamond', 'Century Gothic', 'Gill Sans', 'Optima', 'Rockwell',
                'Baskerville', 'Didot', 'Avenir', 'Open Sans', 'Lato',
                'Montserrat', 'Raleway', 'Oswald', 'Playfair Display', 'Source Sans Pro',
              ].map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {/* Email settings — below font family */}
          {sectionHead('Email settings')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {([
              { key: 'subject'     as const, label: 'Subject',    ph: 'e.g. Our latest news',          val: subject     },
              { key: 'preheader'   as const, label: 'Preheader',  ph: 'Preview text after subject',    val: preheader   },
              { key: 'footer_text' as const, label: 'Footer tag', ph: '{{company_name}} · Unsubscribe', val: footerText  },
            ] as const).map(f => (
              <div key={f.key}>
                <p style={{ fontSize: 9, color: '#6b7280', margin: '0 0 3px', fontWeight: 600 }}>{f.label}</p>
                <input
                  type="text"
                  value={f.val}
                  placeholder={f.ph}
                  onChange={e => onMetaChange({ [f.key]: e.target.value })}
                  style={{ width: '100%', fontSize: 10, padding: '4px 7px', borderRadius: 5, border: '1px solid #e5e7eb', color: '#374151', outline: 'none' }}
                />
              </div>
            ))}
          </div>

          {hint}
        </div>

        {/* Empty state — no brands */}
        {!activeBrand && (
          <div style={{ textAlign: 'center', padding: '24px 12px' }}>
            <Palette style={{ width: 24, height: 24, color: '#d1d5db', margin: '0 auto 8px' }} />
            <p style={{ fontSize: 11, color: '#9ca3af' }}>No brands found. Create a brand profile in the Identity tab first.</p>
          </div>
        )}

        {/* No block selected hint */}
        {noBlock && activeBrand && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '20px 16px', background: '#fafafa', borderRadius: 10, border: '1px dashed #e5e7eb' }}>
            <MousePointerClick style={{ width: 20, height: 20, color: '#d1d5db' }} />
            <p style={{ fontSize: 10, color: '#9ca3af', textAlign: 'center', margin: 0, lineHeight: 1.4 }}>Click a block on the canvas to edit its properties</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main exported component ───────────────────────────────────────────────────

export function EmailBuilderCanvas({
  blocks,
  onChange,
  subject,
  preheader,
  footerText,
  onMetaChange,
  defaults,
  allProfiles  = [],
  allAssets    = [],
  onBack,
  templateName,
  onNameChange,
  onSave,
  saving,
  saved,
}: {
  blocks:        ContentBlock[]
  onChange:      (blocks: ContentBlock[]) => void
  subject:       string
  preheader:     string
  footerText:    string
  onMetaChange:  (patch: { subject?: string; preheader?: string; footer_text?: string }) => void
  defaults:      AssetDefaults
  allProfiles?:  BrandProfile[]
  allAssets?:    BrandAsset[]
  onBack?:       () => void
  templateName?: string
  onNameChange?: (v: string) => void
  onSave?:       () => void
  saving?:       boolean
  saved?:        boolean
}) {
  const [selectedId,      setSelectedId]      = useState<string | null>(null)
  const [selectedSubPath, setSelectedSubPath] = useState<SubPath | null>(null)
  const [dragActiveId,    setDragActiveId]    = useState<string | null>(null)
  const [dropTargetId,    setDropTargetId]    = useState<string | null>(null)
  const [showMoreBlocks,  setShowMoreBlocks]  = useState(false)
  const [showColumns,     setShowColumns]     = useState(false)
  const [showPreview,     setShowPreview]     = useState(false)
  // Brand + upload state shared between left (images) and right (colors/fonts) panels
  const [activeBrandId,   setActiveBrandId]   = useState<string>(allProfiles[0]?.id ?? '')
  const [extraAssets,     setExtraAssets]     = useState<BrandAsset[]>([])
  const [uploading,       setUploading]       = useState(false)
  const [uploadDone,      setUploadDone]      = useState(false)
  const leftFileRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  const primary = defaults.primaryColor
  const { brandColor: workspaceBrandColor } = useUserAvatar()
  const headerColor = workspaceBrandColor

  const previewDoc = useMemo(() => {
    try {
      return renderEmailHtml(
        'newsletter',
        { subject, preheader, footer_text: footerText, blocks },
        {
          company_name: defaults.companyName ?? null,
          tagline:      null,
          logo_url:     defaults.logoUrl ?? null,
          favicon_url:  null,
          colors:       { primary: defaults.primaryColor, secondary: null, accent: null, background: null, text: null },
          palette:      [],
          fonts:        { heading: null, body: null },
          brand_tone:   null,
          brand_style:  null,
          cta_style:    null,
          assets:       [],
        }
      )
    } catch (e) {
      console.error('[EmailBuilderCanvas] renderEmailHtml failed:', e)
      return '<html><body style="font-family:sans-serif;padding:32px;color:#6b7280">Preview unavailable — check console for details.</body></html>'
    }
  }, [showPreview, blocks, subject, preheader, footerText, defaults])

  const isDraggingFromPalette = dragActiveId?.startsWith('new::') ?? false
  const draggingCanvasBlock   = dragActiveId && !isDraggingFromPalette
    ? blocks.find(b => b.id === dragActiveId) ?? null
    : null

  function handleDragStart({ active }: DragStartEvent) {
    setDragActiveId(active.id as string)
  }

  function handleDragOver({ over }: DragOverEvent) {
    setDropTargetId(over?.id as string ?? null)
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    // Capture before clearing — DragOverEvent correctly tracks nested drop zones;
    // DragEndEvent's `over` can miss them if the outer sortable block wins collision.
    const lastDragOverTarget = dropTargetId
    setDragActiveId(null)
    setDropTargetId(null)
    if (!over) return

    const activeId = active.id as string
    // For palette drops, prefer the last drag-over target when it was a colcell zone
    const overId = (
      activeId.startsWith('new::') && lastDragOverTarget?.startsWith('colcell::')
    ) ? lastDragOverTarget : (over.id as string)

    if (activeId.startsWith('brand-asset::')) {
      // Right-panel image dragged onto a canvas block — search top-level AND inside columns
      const assetUrl = activeId.slice('brand-asset::'.length)

      // Helper: find a block by id in top-level and inside columns
      type Found = { block: ContentBlock; path?: SubPath }
      function findBlockInAll(id: string): Found | null {
        const top = blocks.find(b => b.id === id)
        if (top) return { block: top }
        for (const outer of blocks) {
          if (outer.type !== 'columns' || !outer.columns) continue
          for (let ci = 0; ci < outer.columns.length; ci++) {
            for (let si = 0; si < outer.columns[ci].length; si++) {
              if (outer.columns[ci][si].id === id) {
                return { block: outer.columns[ci][si], path: { outerBlockId: outer.id, colIdx: ci, subIdx: si } }
              }
            }
          }
        }
        return null
      }

      const found = findBlockInAll(overId)
      if (found) {
        const { block: overBlock, path } = found
        const patch: Partial<ContentBlock> =
          overBlock.type === 'image' ? { url: assetUrl } :
          overBlock.type === 'logo'  ? { logoUrl: assetUrl } : {}

        if (Object.keys(patch).length > 0) {
          if (path) {
            // Nested sub-block inside a columns block
            onChange(blocks.map(b => {
              if (b.id !== path.outerBlockId) return b
              const cols = b.columns!.map(c => [...c])
              cols[path.colIdx][path.subIdx] = { ...cols[path.colIdx][path.subIdx], ...patch }
              return { ...b, columns: cols }
            }))
            setSelectedId(path.outerBlockId)
            setSelectedSubPath(path)
          } else {
            onChange(blocks.map(b => b.id === overId ? { ...b, ...patch } : b))
            setSelectedId(overId)
            setSelectedSubPath(null)
          }
        }
      } else if (overId === 'canvas-empty') {
        const newBlock = makeBlock('new::image', defaults)
        onChange([...blocks, { ...newBlock, url: assetUrl }])
      }
    } else if (activeId.startsWith('new::')) {
      const newBlock = makeBlock(activeId, defaults)

      if (overId === 'canvas-empty') {
        onChange([...blocks, newBlock])
        setSelectedId(newBlock.id)
        setSelectedSubPath(null)
      } else if (overId.startsWith('colcell::')) {
        // Dropped onto a column cell drop zone: colcell::{outerBlockId}::{colIdx}
        const [, outerBlockId, colIdxStr] = overId.split('::')
        const colIdx = parseInt(colIdxStr)
        let newSubIdx = 0
        const next = blocks.map(b => {
          if (b.id !== outerBlockId) return b
          const cols = (b.columns ?? []).map(c => [...c])
          if (!cols[colIdx]) cols[colIdx] = []
          cols[colIdx] = [...cols[colIdx], { ...newBlock }]
          newSubIdx = cols[colIdx].length - 1
          return { ...b, columns: cols }
        })
        onChange(next)
        setSelectedId(outerBlockId)
        setSelectedSubPath({ outerBlockId, colIdx, subIdx: newSubIdx })
      } else {
        // Check if overId is a sub-block inside a column → insert after it
        let foundInColumn: SubPath | null = null
        const colNext = blocks.map(b => {
          if (b.type !== 'columns' || !b.columns) return b
          for (let ci = 0; ci < b.columns.length; ci++) {
            const si = b.columns[ci].findIndex(sub => sub.id === overId)
            if (si >= 0) {
              const cols = b.columns.map(c => [...c])
              cols[ci].splice(si + 1, 0, { ...newBlock })
              foundInColumn = { outerBlockId: b.id, colIdx: ci, subIdx: si + 1 }
              return { ...b, columns: cols }
            }
          }
          return b
        })

        if (foundInColumn) {
          onChange(colNext)
          setSelectedId((foundInColumn as SubPath).outerBlockId)
          setSelectedSubPath(foundInColumn)
        } else {
          // Top-level insertion — insert after the hovered block
          const overIndex = blocks.findIndex(b => b.id === overId)
          const next = [...blocks]
          if (overIndex >= 0) next.splice(overIndex + 1, 0, newBlock)
          else next.push(newBlock)
          onChange(next)
          setSelectedId(newBlock.id)
          setSelectedSubPath(null)
        }
      }
    } else {
      if (activeId !== overId) {
        const from = blocks.findIndex(b => b.id === activeId)
        const to   = blocks.findIndex(b => b.id === overId)
        if (from >= 0 && to >= 0) onChange(arrayMove(blocks, from, to))
      }
    }
  }

  // ── Brand image assets (shared across left upload + right panel) ─────────────
  const LOGO_ROLES_MAIN = ['primary_logo', 'secondary_logo', 'logo_mark']
  const brandAssets  = allAssets.filter(a => a.brand_profile_id === activeBrandId && !a.is_archived)
  const imageAssets  = [
    ...brandAssets.filter(a => !LOGO_ROLES_MAIN.includes(a.asset_role)),
    ...extraAssets.filter(a => a.brand_profile_id === activeBrandId),
  ]

  async function handleUpload(file: File) {
    setUploading(true)
    setUploadDone(false)
    try {
      const { signedUrl, publicUrl, path } = await getBrandAssetUploadUrl({
        fileName:  file.name,
        mimeType:  file.type,
        assetRole: 'general',
      })
      await fetch(signedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
      if (activeBrandId) {
        await registerBrandAsset({
          brandProfileId: activeBrandId,
          assetType:      'image',
          assetRole:      'general',
          source:         'upload',
          fileUrl:        publicUrl,
          storagePath:    path,
          fileName:       file.name,
          fileSize:       file.size,
          mimeType:       file.type,
        })
      }
      setExtraAssets(prev => [...prev, {
        id: `local-${Date.now()}`, brand_profile_id: activeBrandId,
        asset_role: 'general', file_url: publicUrl,
        is_approved: true, is_primary: false, is_archived: false,
      }])
      setUploadDone(true)
      setTimeout(() => setUploadDone(false), 2500)
    } catch (err) {
      console.error('[EmailBuilderCanvas] upload failed', err)
    } finally {
      setUploading(false)
    }
  }

  function applyImageToBlock(url: string) {
    const eb = editingBlock
    if (!eb) return
    if (eb.type === 'image') updateSelected({ url })
    else if (eb.type === 'logo') updateSelected({ logoUrl: url })
  }

  const selectedBlock = blocks.find(b => b.id === selectedId) ?? null

  // Determine what the property editor shows (sub-block takes priority)
  const editingBlock: ContentBlock | null = (() => {
    if (selectedSubPath) {
      const outer = blocks.find(b => b.id === selectedSubPath.outerBlockId)
      return outer?.columns?.[selectedSubPath.colIdx]?.[selectedSubPath.subIdx] ?? null
    }
    return selectedBlock
  })()

  function updateSelected(patch: Partial<ContentBlock>) {
    if (selectedSubPath) {
      // Patch the sub-block inside a columns block
      onChange(blocks.map(b => {
        if (b.id !== selectedSubPath.outerBlockId) return b
        const cols = (b.columns ?? []).map(c => [...c])
        const col  = cols[selectedSubPath.colIdx]
        if (!col) return b
        col[selectedSubPath.subIdx] = { ...col[selectedSubPath.subIdx], ...patch }
        return { ...b, columns: cols }
      }))
    } else {
      onChange(blocks.map(b => b.id === selectedId ? { ...b, ...patch } : b))
    }
  }

  function deleteBlock(id: string) {
    onChange(blocks.filter(b => b.id !== id))
    if (selectedId === id) { setSelectedId(null); setSelectedSubPath(null) }
  }

  function quickAdd(paletteId: string) {
    const newBlock = makeBlock(paletteId, defaults)
    onChange([...blocks, newBlock])
    setSelectedId(newBlock.id)
    setSelectedSubPath(null)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => { setDragActiveId(null); setDropTargetId(null) }}
    >
      {/* Outer flex-col to hold the slim top bar + 3-panel */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#e8eaed' }}>

        {/* ── Slim save / back strip (above the panels) ─────────────── */}
        {onBack && (
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '6px 12px', background: '#e8eaed' }}>
            <button
              onClick={onBack}
              style={{ fontSize: 11, fontWeight: 700, color: primary, background: '#fff', border: `1.5px solid ${primary}`, borderRadius: 6, padding: '4px 14px', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              ← Back
            </button>
            <input
              value={templateName ?? ''}
              onChange={e => onNameChange?.(e.target.value)}
              placeholder="Template name…"
              style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#1f2937', outline: 'none', width: 200 }}
            />
            <button
              onClick={() => setShowPreview(true)}
              style={{ fontSize: 11, fontWeight: 700, color: primary, background: '#fff', border: `1.5px solid ${primary}`, borderRadius: 6, padding: '4px 14px', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              Preview
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: primary, padding: '4px 14px', borderRadius: 6, border: 'none', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.6 : 1, whiteSpace: 'nowrap' }}
            >
              {saving ? '…' : saved ? '✓ Saved' : 'Save'}
            </button>
          </div>
        )}

        {/* ── 3-panel floating layout ────────────────────────────────── */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0, gap: 10, padding: '8px 10px 10px', overflow: 'hidden', boxSizing: 'border-box' }}>

        {/* ── LEFT panel — palette + settings + properties ─────────── */}
        <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden' }}>

          {/* Block palette */}
          <div style={{ flexShrink: 0, borderBottom: '1px solid #f3f4f6', padding: '10px 10px 8px' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', background: headerColor, textTransform: 'none', letterSpacing: 0.2, margin: '-10px -10px 8px', padding: '10px 12px' }}>Blocks</p>

            {/* Core blocks — always show first 2 rows (6 items), chevron for 3rd */}
            <div className="grid grid-cols-3 gap-1.5 mb-1">
              {CORE_PALETTE.slice(0, 6).map(p => (
                <div key={p.id} onClick={() => quickAdd(p.id)} className="cursor-pointer">
                  <PaletteItem id={p.id} label={p.label} icon={p.icon} />
                </div>
              ))}
            </div>
            {showMoreBlocks && (
              <div className="grid grid-cols-3 gap-1.5 mb-1">
                {CORE_PALETTE.slice(6).map(p => (
                  <div key={p.id} onClick={() => quickAdd(p.id)} className="cursor-pointer">
                    <PaletteItem id={p.id} label={p.label} icon={p.icon} />
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowMoreBlocks(v => !v)}
              className="w-full flex items-center justify-end py-0.5 text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ChevronDown className={`w-3 h-3 transition-transform ${showMoreBlocks ? 'rotate-180' : ''}`} />
            </button>

            {/* Columns — always show first 2 rows (6 items), chevron for rest */}
            <button
              onClick={() => setShowColumns(v => !v)}
              className="w-full flex items-center justify-between py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
            >
              <span>Columns</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showColumns ? 'rotate-180' : ''}`} />
            </button>
            <div className="grid grid-cols-3 gap-1.5">
              {COLUMN_PALETTE.slice(0, 6).map(p => (
                <div key={p.id} onClick={() => quickAdd(p.id)} className="cursor-pointer">
                  <PaletteItem id={p.id} label={p.label} />
                </div>
              ))}
            </div>
            {showColumns && COLUMN_PALETTE.length > 6 && (
              <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                {COLUMN_PALETTE.slice(6).map(p => (
                  <div key={p.id} onClick={() => quickAdd(p.id)} className="cursor-pointer">
                    <PaletteItem id={p.id} label={p.label} />
                  </div>
                ))}
              </div>
            )}

            {/* Brand images + upload — right under columns */}
            {allProfiles.length > 0 && (
              <div style={{ marginTop: 8, borderTop: '1px solid #f3f4f6', paddingTop: 8 }}>
                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, color: '#9ca3af', textTransform: 'uppercase', margin: '0 0 6px' }}>Images — drag or click</p>
                {imageAssets.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 6 }}>
                    {imageAssets.map(a => (
                      <DraggableAssetThumb
                        key={a.id}
                        url={a.file_url}
                        role={a.asset_role}
                        selectedBlock={editingBlock}
                        onApply={applyImageToBlock}
                      />
                    ))}
                  </div>
                )}
                <input
                  ref={leftFileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f) }}
                />
                <button
                  onClick={() => leftFileRef.current?.click()}
                  disabled={uploading}
                  style={{
                    width: '100%', padding: '7px 10px',
                    border: `1.5px dashed ${primary}66`,
                  borderRadius: 8, background: `${primary}06`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  cursor: uploading ? 'wait' : 'pointer',
                  fontSize: 11, fontWeight: 600, color: primary,
                }}
              >
                <Upload style={{ width: 12, height: 12 }} />
                {uploading ? 'Uploading…' : uploadDone ? 'Done!' : 'Upload image'}
              </button>
            </div>
          )}
          </div>{/* end palette section */}

          {/* Block properties — shows sub-block when one is selected */}
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {selectedSubPath && (
              <div style={{ padding: '6px 10px', background: `${primary}10`, borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: primary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Editing sub-block · col {selectedSubPath.colIdx + 1}
                </span>
                <button
                  onClick={() => setSelectedSubPath(null)}
                  style={{ fontSize: 9, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  ✕ exit
                </button>
              </div>
            )}
            <BlockPropertyEditor block={editingBlock} onChange={updateSelected} primary={primary} />
          </div>

        </div>{/* end left panel */}

        {/* ── CENTER — A4 canvas ────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', minWidth: 0, borderRadius: 12 }}>
          <div
            style={{ margin: '0 auto', background: '#fff', width: '100%', maxWidth: 600, minHeight: 800, borderRadius: 4, boxShadow: '0 4px 24px rgba(0,0,0,0.10)' }}
            onClick={e => { if (e.target === e.currentTarget) { setSelectedId(null); setSelectedSubPath(null) } }}
          >
            {blocks.length === 0
              ? <EmptyDropZone primary={primary} />
              : (
                <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                  {blocks.map(block => (
                    <CanvasBlock
                      key={block.id}
                      block={block}
                      selected={selectedId === block.id}
                      isDropTarget={isDraggingFromPalette && dropTargetId === block.id}
                      onSelect={() => { setSelectedId(block.id); setSelectedSubPath(null) }}
                      onDelete={() => deleteBlock(block.id)}
                      onChange={patch => { setSelectedId(block.id); updateSelected(patch) }}
                      primary={primary}
                      selectedSubPath={selectedId === block.id ? selectedSubPath : null}
                      onSelectSub={p => { setSelectedId(block.id); setSelectedSubPath(p) }}
                    />
                  ))}
                </SortableContext>
              )
            }
          </div>
        </div>

        {/* ── RIGHT panel — brand assets ────────────────────────────── */}
        {allProfiles.length > 0 && (
          <div style={{ width: 220, flexShrink: 0, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* BrandAssetsPanel owns the themed header — no duplicate heading here */}
            <BrandAssetsPanel
              allProfiles={allProfiles}
              allAssets={allAssets}
              primary={primary}
              selectedBlock={editingBlock}
              onApplyToBlock={updateSelected}
              activeBrandId={activeBrandId}
              onBrandChange={setActiveBrandId}
              subject={subject}
              preheader={preheader}
              footerText={footerText}
              onMetaChange={onMetaChange}
            />
          </div>
        )}
        </div>{/* closes 3-panel layout */}
      </div>{/* closes outer flex-col */}

      {/* ── Full-page email preview modal ────────────────────────────── */}
      {showPreview && (
        <div
          onClick={() => setShowPreview(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            overflowY: 'auto', padding: '32px 16px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 12, boxShadow: '0 24px 80px rgba(0,0,0,0.3)', maxWidth: 640, width: '100%', overflow: 'hidden', position: 'relative' }}
          >
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1f2937', margin: 0 }}>Email Preview</p>
              <button
                onClick={() => setShowPreview(false)}
                style={{ fontSize: 13, fontWeight: 700, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}
              >✕</button>
            </div>
            {/* Rendered email HTML */}
            <iframe
              srcDoc={previewDoc}
              style={{ width: '100%', height: '80vh', border: 'none', display: 'block' }}
              title="Email Preview"
            />
          </div>
        </div>
      )}

      {/* ── Drag overlay (renders outside overflow) ──────────────────── */}
      <DragOverlay dropAnimation={null}>
        {isDraggingFromPalette && dragActiveId ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-400 bg-white shadow-xl text-xs font-semibold text-gray-700" style={{ minWidth: 120 }}>
            <Plus className="w-3.5 h-3.5" />
            {CORE_PALETTE.find(p => p.id === dragActiveId)?.label
              ?? COLUMN_PALETTE.find(p => p.id === dragActiveId)?.label
              ?? 'Block'}
          </div>
        ) : draggingCanvasBlock ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-400 bg-white shadow-xl text-xs font-semibold text-gray-600">
            <GripVertical className="w-3.5 h-3.5 text-gray-400" />
            {draggingCanvasBlock.type.replace('_', ' ')}
            {draggingCanvasBlock.text ? ` — ${draggingCanvasBlock.text.slice(0, 24)}` : ''}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
