'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Trash2, Loader2, Check, ChevronLeft,
  RefreshCw, Mail, ChevronDown, Megaphone,
  Rocket, Tag, Newspaper, Bell, Sparkles,
  GripVertical, AlignLeft, ImageIcon as ImgIcon,
  MousePointerClick, Minus, Space, Heading1,
} from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  listEmailTemplates,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  renderTemplatePreview,
  type EmailTemplateRow,
} from '@/app/actions/email-templates'
import { TEMPLATE_PRESETS, type TemplateStyle } from '@/lib/email-templates/presets'
import { recommendTemplates } from '@/lib/email-templates/recommender'
import {
  generateVariations,
  recommendVariationIndex,
  isDark,
  type CampaignIntent,
  type VariationConfig,
} from '@/lib/email-templates/variations'
import {
  DEFAULT_STYLE_OPTIONS,
  type TemplateContent,
  type StyleOptions,
  type ContentBlock,
  type BlockType,
} from '@/lib/email-templates/html-renderer'
import {
  EmailBuilderCanvas,
  makeHybridNewsletterBlocks,
  type AssetDefaults,
} from './email-builder-canvas'

// ── Types ─────────────────────────────────────────────────────────────────────

interface BrandProfileRow {
  id:            string
  company_name:  string | null
  brand_tone:    string | null
  brand_style:   string | null
  cta_style:     string | null
  brand_version: number
  color_primary?:     string | null
  color_secondary?:   string | null
  color_accent?:      string | null
  color_background?:  string | null
  color_text?:        string | null
  brand_palette_json?: Array<{ hex: string }> | null
  website_url?:        string | null
  footer_text?:        string | null
  social_links_json?:  Record<string, string> | null
}

interface BrandAssetRow {
  id:               string
  brand_profile_id: string
  asset_role:       string
  file_url:         string
  is_approved:      boolean
  is_primary:       boolean
  is_archived:      boolean
}

interface Props {
  profile:     BrandProfileRow | null
  assets:      BrandAssetRow[]
  allProfiles: BrandProfileRow[]
  allAssets:   BrandAssetRow[]
}

type FlowStep = 'gallery' | 'intent' | 'style-pick' | 'variations' | 'edit' | 'view-saved'
type EditTab   = 'content' | 'styles'

// ── Block utilities ───────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9)

function makeBlock(type: BlockType): ContentBlock {
  switch (type) {
    case 'headline':     return { id: uid(), type, text: 'Your headline here', align: 'center' }
    case 'text':         return { id: uid(), type, text: 'Add your message here.', align: 'left' }
    case 'image':        return { id: uid(), type, url: '', alt: '', align: 'center' }
    case 'button':       return { id: uid(), type, text: 'Get Started', url: '', align: 'center' }
    case 'divider':      return { id: uid(), type }
    case 'spacer':       return { id: uid(), type, height: 32 }
    case 'logo':         return { id: uid(), type, align: 'left', bgColor: '#f8f9fa' }
    case 'social':       return { id: uid(), type, socialLinks: {}, align: 'center' }
    case 'footer_block': return { id: uid(), type, companyName: '', companyUrl: '', unsubscribeUrl: '' }
    case 'columns':      return { id: uid(), type, ratio: '1:1', columns: [[], []] }
  }
}

function defaultBlocks(): ContentBlock[] {
  return [
    makeBlock('headline'),
    makeBlock('text'),
    makeBlock('button'),
  ]
}

const BLOCK_PALETTE: { type: BlockType; label: string; icon: React.ElementType }[] = [
  { type: 'headline', label: 'Headline',  icon: Heading1          },
  { type: 'text',     label: 'Text',      icon: AlignLeft         },
  { type: 'image',    label: 'Image',     icon: ImgIcon           },
  { type: 'button',   label: 'Button',    icon: MousePointerClick },
  { type: 'divider',  label: 'Divider',   icon: Minus             },
  { type: 'spacer',   label: 'Spacer',    icon: Space             },
]

const EMPTY_CONTENT: TemplateContent = {
  subject: '', preheader: '', footer_text: '',
  blocks: defaultBlocks(),
}

// ── Intent definitions ────────────────────────────────────────────────────────

const INTENTS: { key: CampaignIntent; label: string; description: string; icon: React.ElementType }[] = [
  { key: 'product_launch', label: 'Product Launch',      description: 'Announce a new product or feature',    icon: Rocket    },
  { key: 'promotion',      label: 'Promotion / Offer',   description: 'Drive conversions with a deal',         icon: Tag       },
  { key: 'newsletter',     label: 'Newsletter',          description: 'Regular updates and content digests',   icon: Newspaper },
  { key: 'announcement',   label: 'Announcement',        description: 'Share news, events or milestones',      icon: Bell      },
  { key: 'other',          label: 'Other',               description: 'General or custom communication',       icon: Megaphone },
]

// ── Sidebar / gallery ─────────────────────────────────────────────────────────

type SidebarItem =
  | { kind: 'heading'; label: string }
  | { kind: 'all' }
  | { kind: 'style'; style: TemplateStyle; label: string }

const SIDEBAR_ITEMS: SidebarItem[] = [
  { kind: 'all' },
  { kind: 'heading', label: 'Basic layouts' },
  { kind: 'style', style: 'basic',        label: 'Basic' },
  { kind: 'heading', label: 'Fully designed' },
  { kind: 'style', style: 'newsletter',   label: 'Newsletter' },
  { kind: 'style', style: 'announcement', label: 'Announce' },
  { kind: 'style', style: 'promotional',  label: 'Promotional' },
  { kind: 'style', style: 'offer',        label: 'Offer' },
  { kind: 'style', style: 'minimalist',   label: 'Minimalist' },
  { kind: 'heading', label: 'Other' },
  { kind: 'style', style: 'custom',       label: 'Custom' },
]

const GALLERY_SECTIONS: { style: TemplateStyle; label: string }[] = [
  { style: 'basic',        label: 'Basic'        },
  { style: 'newsletter',   label: 'Newsletter'   },
  { style: 'announcement', label: 'Announce'     },
  { style: 'promotional',  label: 'Promotional'  },
  { style: 'offer',        label: 'Offer'        },
  { style: 'minimalist',   label: 'Minimalist'   },
  { style: 'custom',       label: 'Custom'       },
]

// ── Variation card thumbnail (CSS-only, instant) ──────────────────────────────

function VariationThumbnail({ style, variation, logoUrl }: {
  style:     TemplateStyle
  variation: VariationConfig
  logoUrl?:  string | null
}) {
  const so  = variation.style_options
  const headerBg = so.header_bg  || so.wrapper_bg || '#f8f9fa'
  const bodyBg   = so.body_bg    || '#ffffff'
  const headCol  = so.heading_color || '#111827'
  const ctaCol   = so.link_color    || '#7c3aed'
  const darkMode = isDark(bodyBg)

  const logoEl = logoUrl
    ? <img src={logoUrl} alt="" style={{ maxHeight: 12, maxWidth: 48, objectFit: 'contain' as const }} />
    : <div style={{ height: 4, width: 28, borderRadius: 2, background: isDark(headerBg) ? 'rgba(255,255,255,0.55)' : '#d1d5db' }} />

  const line = (w: string, opacity = 0.15) => (
    <div style={{ height: 4, borderRadius: 2, marginBottom: 3,
      background: darkMode ? `rgba(255,255,255,${opacity})` : `rgba(0,0,0,${opacity})`,
      width: w }} />
  )
  const btn = (
    <div style={{ height: 12, borderRadius: 4, background: ctaCol, width: '45%', margin: '7px 0 0' }} />
  )

  const headerStyle = {
    background: headerBg,
    padding:    '7px 10px',
    borderBottom: `1px solid ${isDark(headerBg) ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}`,
    display:    'flex' as const,
    alignItems: 'center' as const,
    justifyContent: style === 'promotional' || style === 'announcement' ? 'center' as const : 'flex-start' as const,
  }

  if (style === 'announcement') {
    return (
      <div style={{ width: '100%', height: '100%', background: headerBg, display: 'flex', flexDirection: 'column' as const, padding: '10px 10px 8px' }}>
        <div>{logoEl}</div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <div style={{ height: 7, borderRadius: 3, background: isDark(headerBg) ? 'rgba(255,255,255,.88)' : headCol, width: '68%' }} />
          <div style={{ height: 5, borderRadius: 3, background: isDark(headerBg) ? 'rgba(255,255,255,.5)' : headCol + '80', width: '52%' }} />
        </div>
        <div style={{ background: bodyBg, borderRadius: 4, padding: '6px 8px', margin: '6px 0 0' }}>
          {line('90%')}{line('75%')}
          {btn}
        </div>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', background: so.wrapper_bg || '#f8f9fa', display: 'flex', flexDirection: 'column' as const }}>
      <div style={headerStyle}>{logoEl}</div>
      <div style={{ flex: 1, background: bodyBg, padding: '8px 10px' }}>
        <div style={{ height: 6, borderRadius: 3, background: headCol, width: '72%', marginBottom: 7 }} />
        {line('90%')}{line('80%')}{line('65%')}
        {btn}
      </div>
      {so.show_social_icons && style === 'basic' && (
        <div style={{ background: bodyBg, padding: '4px 0', display: 'flex', justifyContent: 'center', gap: 4, borderTop: '1px solid rgba(0,0,0,.06)' }}>
          {[0,1,2].map(i => <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: ctaCol }} />)}
        </div>
      )}
      {so.show_border && (
        <div style={{ position: 'absolute' as const, inset: 0, borderRadius: 8, border: `1.5px solid ${so.border_color || ctaCol}`, pointerEvents: 'none' as const }} />
      )}
    </div>
  )
}

// ── Gallery template card ─────────────────────────────────────────────────────

function GalleryCard({ style, name, isSaved, primary, logoUrl, onClick, onEdit, onDelete }: {
  style: TemplateStyle; name: string; isSaved?: boolean
  primary: string; logoUrl?: string | null
  onClick: () => void; onEdit?: () => void; onDelete?: () => void
}) {
  const [hover, setHover] = useState(false)
  const fakeVariation: VariationConfig = {
    index: 1, name: '', tagline: '',
    style_options: { ...DEFAULT_STYLE_OPTIONS, heading_color: primary, link_color: primary },
  }
  return (
    <div className="flex flex-col cursor-pointer" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onClick={onClick}>
      <div className="relative rounded-xl overflow-hidden transition-all"
        style={{ aspectRatio: '3/4',
          border: `2px solid ${hover ? primary : 'transparent'}`,
          boxShadow: hover ? `0 0 0 1px ${primary}25,0 4px 14px rgba(0,0,0,.10)` : '0 1px 4px rgba(0,0,0,.08)' }}>
        <VariationThumbnail style={style} variation={fakeVariation} logoUrl={logoUrl} />
        {hover && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2"
            style={{ background: 'rgba(0,0,0,0.14)', backdropFilter: 'blur(1px)' }}>
            {isSaved && onEdit && (
              <button onClick={e => { e.stopPropagation(); onEdit() }}
                className="text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow"
                style={{ background: primary }}>Edit</button>
            )}
            <button className="text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow"
              style={{ background: isSaved ? 'rgba(0,0,0,0.4)' : primary }}>{isSaved ? 'Preview' : 'Use'}</button>
            {isSaved && onDelete && (
              <button onClick={e => { e.stopPropagation(); onDelete() }}
                className="text-white/80 hover:text-white text-[10px] flex items-center gap-1">
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            )}
          </div>
        )}
        {isSaved && (
          <div className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/90 shadow-sm"
            style={{ color: primary }}>SAVED</div>
        )}
      </div>
      <p className="mt-2 text-xs font-medium text-gray-700 dark:text-gray-200 truncate">{name}</p>
      {!isSaved && <p className="text-[10px] font-semibold text-gray-400">FREE</p>}
    </div>
  )
}

// ── Accordion ─────────────────────────────────────────────────────────────────

function Accordion({ label, children, defaultOpen }: { label: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false)
  return (
    <div className="border-b border-gray-100 dark:border-white/10">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5">
        {label}
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  )
}

// ── Style controls ────────────────────────────────────────────────────────────

function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-gray-600 dark:text-gray-400">{label}</span>
      <div className="flex items-center gap-1.5">
        <input type="color" value={value || '#ffffff'} onChange={e => onChange(e.target.value)}
          className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0" />
        <input type="text" value={value} onChange={e => onChange(e.target.value)} maxLength={7}
          className="w-16 text-[10px] font-mono rounded border border-gray-200 dark:border-white/10 bg-transparent px-1.5 py-1 text-gray-700 dark:text-gray-300 focus:outline-none" />
      </div>
    </div>
  )
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-gray-600 dark:text-gray-400">{label}</span>
      <button onClick={() => onChange(!value)}
        className={`relative w-9 h-5 rounded-full transition-colors ${value ? 'bg-violet-500' : 'bg-gray-200 dark:bg-gray-700'}`}>
        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </button>
    </div>
  )
}

function StylesPanel({ so, onUpdate, style }: { so: StyleOptions; onUpdate: (p: Partial<StyleOptions>) => void; style: TemplateStyle }) {
  return (
    <div className="overflow-y-auto">
      <Accordion label="Visibility" defaultOpen>
        <Toggle label="Show header logo"    value={so.show_header_logo}    onChange={v => onUpdate({ show_header_logo: v })} />
        {style === 'basic' && <>
          <Toggle label="Show social icons"   value={so.show_social_icons}   onChange={v => onUpdate({ show_social_icons: v })} />
          <Toggle label="Show footer address" value={so.show_footer_address} onChange={v => onUpdate({ show_footer_address: v })} />
        </>}
      </Accordion>
      <Accordion label="Section Backgrounds">
        <ColorPicker label="Page"   value={so.wrapper_bg}             onChange={v => onUpdate({ wrapper_bg: v })} />
        <ColorPicker label="Header" value={so.header_bg || '#ffffff'} onChange={v => onUpdate({ header_bg: v })} />
        <ColorPicker label="Body"   value={so.body_bg}                onChange={v => onUpdate({ body_bg: v })} />
        <ColorPicker label="Footer" value={so.footer_bg}              onChange={v => onUpdate({ footer_bg: v })} />
      </Accordion>
      <Accordion label="Text">
        <ColorPicker label="Heading color"   value={so.heading_color || '#111111'} onChange={v => onUpdate({ heading_color: v })} />
        <ColorPicker label="Body text color" value={so.body_color    || '#333333'} onChange={v => onUpdate({ body_color: v })} />
        <div className="space-y-1.5">
          <span className="text-[11px] text-gray-600 dark:text-gray-400">Heading size</span>
          <div className="flex gap-2">
            {(['sm', 'md', 'lg'] as const).map(s => (
              <button key={s} onClick={() => onUpdate({ heading_size: s })}
                className={`flex-1 py-1 text-[10px] font-semibold rounded-lg border uppercase transition-colors ${
                  so.heading_size === s
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30 text-violet-600'
                    : 'border-gray-200 dark:border-white/10 text-gray-500 hover:border-gray-300'
                }`}>{s}</button>
            ))}
          </div>
        </div>
      </Accordion>
      <Accordion label="Link">
        <ColorPicker label="Link / button color" value={so.link_color || '#7c3aed'} onChange={v => onUpdate({ link_color: v })} />
      </Accordion>
      <Accordion label="Padding">
        <div className="flex gap-2">
          {(['compact', 'normal', 'relaxed'] as const).map(p => (
            <button key={p} onClick={() => onUpdate({ section_padding: p })}
              className={`flex-1 py-1 text-[10px] font-semibold rounded-lg border capitalize transition-colors ${
                so.section_padding === p
                  ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30 text-violet-600'
                  : 'border-gray-200 dark:border-white/10 text-gray-500 hover:border-gray-300'
              }`}>{p}</button>
          ))}
        </div>
      </Accordion>
      <Accordion label="Border">
        <div className="space-y-1.5">
          <span className="text-[11px] text-gray-600 dark:text-gray-400">Corner radius: {so.card_radius}px</span>
          <input type="range" min={0} max={24} value={so.card_radius}
            onChange={e => onUpdate({ card_radius: Number(e.target.value) })}
            className="w-full accent-violet-500" />
        </div>
        <Toggle label="Show card border" value={so.show_border} onChange={v => onUpdate({ show_border: v })} />
        {so.show_border && (
          <ColorPicker label="Border color" value={so.border_color} onChange={v => onUpdate({ border_color: v })} />
        )}
      </Accordion>
    </div>
  )
}

// ── Content form ──────────────────────────────────────────────────────────────

// ── Block editor components ───────────────────────────────────────────────────

const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  headline: 'Headline', text: 'Text', image: 'Image',
  button: 'Button', divider: 'Divider', spacer: 'Spacer',
  logo: 'Logo', social: 'Social', footer_block: 'Footer', columns: 'Columns',
}
const BLOCK_TYPE_ICONS: Record<BlockType, React.ElementType> = {
  headline: Heading1, text: AlignLeft, image: ImgIcon,
  button: MousePointerClick, divider: Minus, spacer: Space,
  logo: AlignLeft, social: AlignLeft, footer_block: Mail, columns: Minus,
}

function SortableBlockRow({ block, selected, onSelect, onDelete }: {
  block: ContentBlock; selected: boolean
  onSelect: () => void; onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id })
  const Icon = BLOCK_TYPE_ICONS[block.type]
  return (
    <div ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      onClick={onSelect}
      className={`group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer border transition-all ${
        selected
          ? 'border-violet-400 bg-violet-50 dark:bg-violet-900/20'
          : 'border-transparent hover:border-gray-200 dark:hover:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
      }`}>
      <button {...attributes} {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 shrink-0 touch-none"
        onClick={e => e.stopPropagation()}>
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      <Icon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
      <span className="text-xs text-gray-600 dark:text-gray-300 truncate flex-1">
        {block.type === 'headline' || block.type === 'text' || block.type === 'button'
          ? (block.text?.slice(0, 28) || BLOCK_TYPE_LABELS[block.type])
          : BLOCK_TYPE_LABELS[block.type]}
      </span>
      <button onClick={e => { e.stopPropagation(); onDelete() }}
        className="opacity-0 group-hover:opacity-100 shrink-0 text-gray-300 hover:text-red-500 transition-opacity">
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  )
}

function BlockPropsEditor({ block, onChange }: {
  block: ContentBlock; onChange: (patch: Partial<ContentBlock>) => void
}) {
  const inp = (label: string, key: keyof ContentBlock, ph: string, multi?: boolean, type?: string) => (
    <div className="space-y-1">
      <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</label>
      {multi ? (
        <textarea rows={4} value={(block[key] as string) ?? ''} placeholder={ph}
          className="w-full text-xs rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 px-3 py-2 text-gray-800 dark:text-gray-200 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500/40 resize-none"
          onChange={e => onChange({ [key]: e.target.value })} />
      ) : (
        <input type={type ?? 'text'} value={(block[key] as string) ?? ''} placeholder={ph}
          className="w-full text-xs rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 px-3 py-2 text-gray-800 dark:text-gray-200 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
          onChange={e => onChange({ [key]: e.target.value })} />
      )}
    </div>
  )

  const alignPicker = (
    <div className="space-y-1">
      <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Align</label>
      <div className="flex gap-1.5">
        {(['left', 'center', 'right'] as const).map(a => (
          <button key={a} onClick={() => onChange({ align: a })}
            className={`flex-1 py-1 text-[10px] font-semibold rounded-lg border capitalize transition-colors ${
              (block.align ?? 'left') === a
                ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30 text-violet-600'
                : 'border-gray-200 dark:border-white/10 text-gray-500 hover:border-gray-300'
            }`}>{a}</button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-3 px-3 py-3">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
        {(() => { const Icon = BLOCK_TYPE_ICONS[block.type]; return <Icon className="w-3 h-3" /> })()}
        {BLOCK_TYPE_LABELS[block.type]}
      </p>
      {block.type === 'headline' && <>{inp('Text', 'text', 'Your headline…')}{alignPicker}</>}
      {block.type === 'text'     && <>{inp('Text', 'text', 'Your message…', true)}{alignPicker}</>}
      {block.type === 'image'    && <>{inp('Image URL', 'url', 'https://…', false, 'url')}{inp('Alt text', 'alt', 'Describe the image')}{alignPicker}</>}
      {block.type === 'button'   && <>{inp('Button text', 'text', 'Get Started')}{inp('URL', 'url', 'https://…', false, 'url')}{alignPicker}</>}
      {block.type === 'spacer'   && (
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Height: {block.height ?? 32}px</label>
          <input type="range" min={8} max={96} step={8} value={block.height ?? 32}
            onChange={e => onChange({ height: Number(e.target.value) })}
            className="w-full accent-violet-500" />
        </div>
      )}
      {(block.type === 'divider') && (
        <p className="text-xs text-gray-400">Horizontal rule — no properties to edit.</p>
      )}
    </div>
  )
}

function BlockEditorPanel({ content, onChange }: {
  content: TemplateContent; onChange: (c: TemplateContent) => void
}) {
  const [selectedId, setSelectedId] = useState<string | null>(content.blocks[0]?.id ?? null)
  const [activeId,   setActiveId]   = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))
  const blocks = content.blocks

  function addBlock(type: BlockType) {
    const nb = makeBlock(type)
    onChange({ ...content, blocks: [...blocks, nb] })
    setSelectedId(nb.id)
  }
  function deleteBlock(id: string) {
    const next = blocks.filter(b => b.id !== id)
    onChange({ ...content, blocks: next })
    setSelectedId(next[0]?.id ?? null)
  }
  function updateBlock(id: string, patch: Partial<ContentBlock>) {
    onChange({ ...content, blocks: blocks.map(b => b.id === id ? { ...b, ...patch } : b) })
  }
  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string)
  }
  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const { active, over } = e
    if (over && active.id !== over.id) {
      const from = blocks.findIndex(b => b.id === active.id)
      const to   = blocks.findIndex(b => b.id === over.id)
      onChange({ ...content, blocks: arrayMove(blocks, from, to) })
    }
  }

  const selected     = blocks.find(b => b.id === selectedId) ?? null
  const activeBlock  = activeId ? blocks.find(b => b.id === activeId) ?? null : null

  return (
    // DndContext at the outermost level — outside all overflow containers
    // so DragOverlay is never clipped
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex flex-col h-full">
        {/* Add block palette */}
        <div className="shrink-0 px-3 pt-3 pb-2 border-b border-gray-100 dark:border-white/10">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Add block</p>
          <div className="grid grid-cols-3 gap-1.5">
            {BLOCK_PALETTE.map(({ type, label, icon: Icon }) => (
              <button key={type} onClick={() => addBlock(type)}
                className="flex flex-col items-center gap-1 py-2 px-1 rounded-lg border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:border-violet-300 dark:hover:border-violet-700 hover:bg-violet-50/60 dark:hover:bg-violet-900/10 transition-all group">
                <Icon className="w-4 h-4 text-gray-400 group-hover:text-violet-500 transition-colors" />
                <span className="text-[9px] font-semibold text-gray-500 dark:text-gray-400 group-hover:text-violet-600 dark:group-hover:text-violet-400">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Block list — SortableContext here, DragOverlay handles the floating preview */}
        <div className="shrink-0 max-h-48 overflow-y-auto px-2 py-2 border-b border-gray-100 dark:border-white/10">
          {blocks.length === 0 && (
            <p className="text-[11px] text-gray-400 text-center py-4">No blocks yet — add one above</p>
          )}
          <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
            {blocks.map(b => (
              <SortableBlockRow key={b.id} block={b}
                selected={selectedId === b.id && activeId !== b.id}
                onSelect={() => { if (!activeId) setSelectedId(b.id) }}
                onDelete={() => deleteBlock(b.id)} />
            ))}
          </SortableContext>
        </div>

        {/* Selected block properties */}
        <div className="flex-1 overflow-y-auto">
          {selected
            ? <BlockPropsEditor block={selected} onChange={p => updateBlock(selected.id, p)} />
            : <p className="text-xs text-gray-400 text-center py-8">Select a block to edit</p>
          }
        </div>

        {/* Subject / Preheader / Footer — email meta */}
        <div className="shrink-0 border-t border-gray-100 dark:border-white/10 px-3 py-3 space-y-2">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Email settings</p>
          {[
            { key: 'subject'     as const, label: 'Subject',   ph: 'e.g. Exciting news from us' },
            { key: 'preheader'   as const, label: 'Preheader', ph: 'Preview text after subject' },
            { key: 'footer_text' as const, label: 'Footer',    ph: '{{company_name}} · Unsubscribe' },
          ].map(f => (
            <div key={f.key} className="space-y-0.5">
              <label className="text-[10px] text-gray-400">{f.label}</label>
              <input type="text" value={content[f.key]} placeholder={f.ph}
                className="w-full text-xs rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-gray-800 dark:text-gray-200 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                onChange={e => onChange({ ...content, [f.key]: e.target.value })} />
            </div>
          ))}
        </div>
      </div>

      {/* DragOverlay — rendered via portal, never clipped by overflow */}
      <DragOverlay dropAnimation={null}>
        {activeBlock ? (
          <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-violet-400 bg-white dark:bg-gray-900 shadow-xl opacity-95 w-64">
            <GripVertical className="w-3.5 h-3.5 text-violet-400 shrink-0" />
            {(() => { const Icon = BLOCK_TYPE_ICONS[activeBlock.type]; return <Icon className="w-3.5 h-3.5 text-violet-500 shrink-0" /> })()}
            <span className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">
              {activeBlock.type === 'headline' || activeBlock.type === 'text' || activeBlock.type === 'button'
                ? (activeBlock.text?.slice(0, 28) || BLOCK_TYPE_LABELS[activeBlock.type])
                : BLOCK_TYPE_LABELS[activeBlock.type]}
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

// ── Preview shell ─────────────────────────────────────────────────────────────

function PreviewShell({ html, loading, onBack, backLabel, children }: {
  html: string; loading: boolean; onBack: () => void; backLabel: string; children: React.ReactNode
}) {
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 dark:border-white/10 bg-white dark:bg-gray-950">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
          <ChevronLeft className="w-3.5 h-3.5" /> {backLabel}
        </button>
      </div>
      <div className="flex-1 flex overflow-hidden min-h-0">
        <div className="flex-1 overflow-auto bg-[#f0f0f2] dark:bg-gray-950 p-6 min-w-0">
          <div className="mx-auto w-full" style={{ maxWidth: 520 }}>
            <div className="relative rounded-2xl overflow-hidden shadow-lg bg-white" style={{ aspectRatio: '1/1.5' }}>
              {loading && <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/80"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>}
              {html
                ? <iframe srcDoc={html} title="Email preview" className="w-full h-full border-0" sandbox="allow-same-origin" />
                : <div className="flex flex-col items-center justify-center h-full gap-2"><Mail className="w-8 h-8 text-gray-200" /><p className="text-xs text-gray-400">Preview loading…</p></div>
              }
            </div>
          </div>
        </div>
        <div className="w-64 shrink-0 border-l border-gray-100 dark:border-white/10 overflow-y-auto bg-white dark:bg-gray-950">
          {children}
        </div>
      </div>
    </div>
  )
}

// ── Progress indicator ────────────────────────────────────────────────────────

const STEPS = ['Intent', 'Style', 'Variations', 'Content', 'Save']

function FlowProgress({ current }: { current: 0 | 1 | 2 | 3 | 4 }) {
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-1">
          <div className={`flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold transition-colors ${
            i < current  ? 'bg-violet-500 text-white' :
            i === current ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 ring-1 ring-violet-400' :
            'bg-gray-100 dark:bg-white/10 text-gray-400'
          }`}>{i < current ? <Check className="w-2.5 h-2.5" /> : i + 1}</div>
          <span className={`text-[10px] hidden sm:block ${i === current ? 'text-gray-700 dark:text-gray-200 font-semibold' : 'text-gray-400'}`}>{label}</span>
          {i < STEPS.length - 1 && <div className={`w-4 h-px ${i < current ? 'bg-violet-400' : 'bg-gray-200 dark:bg-white/10'}`} />}
        </div>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function EmailTemplatesTab({ profile, assets, allProfiles, allAssets }: Props) {
  const router = useRouter()
  const [step,           setStep]           = useState<FlowStep>('gallery')
  const [sidebarFilter,  setSidebarFilter]  = useState<TemplateStyle | 'all'>('all')
  const [templates,      setTemplates]      = useState<EmailTemplateRow[]>([])
  const [loadingList,    setLoadingList]    = useState(false)

  // Creation flow state
  const [campaignIntent, setCampaignIntent] = useState<CampaignIntent | null>(null)
  const [selectedStyle,  setStyle]          = useState<TemplateStyle>('minimalist')
  const [variations,     setVariations]     = useState<VariationConfig[]>([])
  const [selectedVar,    setSelectedVar]    = useState<VariationConfig | null>(null)
  const [templateName,   setName]           = useState('')
  const [content,        setContent]        = useState<TemplateContent>(EMPTY_CONTENT)
  const [styleOpts,      setStyleOpts]      = useState<StyleOptions>({ ...DEFAULT_STYLE_OPTIONS })

  // Preview
  const [previewHtml,    setPreviewHtml]    = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [viewTemplate,   setViewTemplate]   = useState<EmailTemplateRow | null>(null)
  const [editingId,      setEditingId]      = useState<string | null>(null)

  // Save
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [, startTransition] = useTransition()
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const primary   = profile?.color_primary   ?? '#111827'
  const secondary = profile?.color_secondary ?? '#374151'
  const palette   = profile?.brand_palette_json?.map(c => c.hex) ?? []
  const logoAsset = assets.find(
    a => a.brand_profile_id === profile?.id &&
         (a.asset_role === 'primary_logo' || a.asset_role === 'logo_mark') &&
         a.is_approved && !a.is_archived,
  )

  // Asset defaults for the visual canvas (logo, social, brand colors)
  const assetDefaults: AssetDefaults = {
    profileId:    profile?.id,
    logoUrl:      logoAsset?.file_url,
    logoAlt:      profile?.company_name ?? 'Logo',
    companyName:  profile?.company_name ?? 'Your Company',
    companyUrl:   profile?.website_url  ?? '',
    footerText:   profile?.footer_text  ?? '',
    socialLinks:  profile?.social_links_json ?? {},
    primaryColor: primary,
  }

  useEffect(() => {
    if (!profile) { setTemplates([]); return }
    setLoadingList(true)
    listEmailTemplates(profile.id)
      .then(setTemplates).catch(() => setTemplates([]))
      .finally(() => setLoadingList(false))
    setStep('gallery')
    setViewTemplate(null)
  }, [profile?.id])

  // Debounced preview for edit step
  useEffect(() => {
    if (step !== 'edit' || !profile) return
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => {
      setPreviewLoading(true)
      renderTemplatePreview({
        style: selectedStyle,
        content: { ...content, style_options: styleOpts },
        brandProfileId: profile.id,
      }).then(setPreviewHtml).catch(() => setPreviewHtml(''))
        .finally(() => setPreviewLoading(false))
    }, 400)
    return () => { if (debounce.current) clearTimeout(debounce.current) }
  }, [step, selectedStyle, content, styleOpts, profile?.id])

  // Render selected variation in variations step
  useEffect(() => {
    if (step !== 'variations' || !selectedVar || !profile) return
    setPreviewLoading(true)
    renderTemplatePreview({
      style: selectedStyle,
      content: { ...content, style_options: selectedVar.style_options },
      brandProfileId: profile.id,
    }).then(setPreviewHtml).catch(() => setPreviewHtml(''))
      .finally(() => setPreviewLoading(false))
  }, [step, selectedVar?.index, selectedStyle, profile?.id])

  // Render saved template from snapshot
  useEffect(() => {
    if (step !== 'view-saved' || !viewTemplate) return
    setPreviewLoading(true)
    Promise.all([import('@/lib/email-templates/html-renderer'), import('@/lib/brand/resolve-brand-assets')])
      .then(([{ renderEmailHtml }, { resolveBrandAssets }]) => {
        const snap = viewTemplate.asset_snapshot_json as Record<string, unknown>
        const colors = (snap.colors ?? {}) as Record<string, string | null>
        const fonts  = (snap.fonts  ?? {}) as Record<string, string | null>
        const fp = {
          id: viewTemplate.brand_profile_id, company_name: (snap.company_name as string) ?? null,
          tagline: (snap.tagline as string) ?? null, color_primary: colors.primary ?? null,
          color_secondary: colors.secondary ?? null, color_accent: colors.accent ?? null,
          color_background: colors.background ?? null, color_text: colors.text ?? null,
          font_heading: fonts.heading ?? null, font_body: fonts.body ?? null,
          brand_palette_json: (snap.palette as string[] | undefined)?.map(hex => ({ hex })) ?? null,
          brand_tone: null, brand_style: null, cta_style: null, brand_version: 1,
        }
        const fa = snap.logo_url ? [{ id: 'snap', brand_profile_id: viewTemplate.brand_profile_id,
          asset_role: 'primary_logo', file_url: snap.logo_url as string,
          label: null, mime_type: null, is_approved: true, is_primary: true, is_archived: false }] : []
        setPreviewHtml(renderEmailHtml(viewTemplate.template_style, viewTemplate.content_json, resolveBrandAssets(fp, fa)))
        setPreviewLoading(false)
      })
  }, [step, viewTemplate])

  // Build recommendation from brand + intent
  const fakeSnap = {
    company_name: profile?.company_name ?? null,
    tagline: null, logo_url: logoAsset?.file_url ?? null, favicon_url: null,
    colors: {
      primary: profile?.color_primary ?? null, secondary: profile?.color_secondary ?? null,
      accent: profile?.color_accent ?? null, background: profile?.color_background ?? null,
      text: profile?.color_text ?? null,
    },
    palette, fonts: { heading: null, body: null },
    brand_tone: profile?.brand_tone ?? null, brand_style: profile?.brand_style ?? null,
    cta_style: profile?.cta_style ?? null, assets: [],
  }

  const recommendation = recommendTemplates({
    brand_tone: profile?.brand_tone ?? null, brand_style: profile?.brand_style ?? null,
    cta_style: profile?.cta_style ?? null, has_logo: !!logoAsset,
    has_colors: !!profile?.color_primary, campaign_intent: campaignIntent ?? undefined,
  })

  // ── Flow helpers ────────────────────────────────────────────────────────────

  /** Re-open a saved template in the canvas for editing */
  function openSavedForEdit(t: EmailTemplateRow) {
    const c = t.content_json as TemplateContent
    setName(t.name)
    setEditingId(t.id)
    setContent({
      subject:       c.subject     ?? '',
      preheader:     c.preheader   ?? '',
      footer_text:   c.footer_text ?? '',
      blocks:        Array.isArray(c.blocks) ? c.blocks : defaultBlocks(),
      style_options: c.style_options,
    })
    setStyle(t.template_style as TemplateStyle)
    setStyleOpts(c.style_options ? { ...DEFAULT_STYLE_OPTIONS, ...c.style_options } : { ...DEFAULT_STYLE_OPTIONS })
    setSelectedVar(null)
    setPreviewHtml('')
    setStep('edit')
  }

  /** Direct path: opens the hybrid Basic+Newsletter canvas immediately */
  function openHybridTemplate() {
    const blocks = makeHybridNewsletterBlocks(assetDefaults)
    setName('')
    setEditingId(null)
    setContent({
      subject:     '',
      preheader:   '',
      footer_text: assetDefaults.footerText ?? '',
      blocks,
    })
    setStyle('basic')
    setStyleOpts({ ...DEFAULT_STYLE_OPTIONS })
    setPreviewHtml('')
    setStep('edit')
  }

  function startNewTemplate() {
    setCampaignIntent(null)
    setStyle(recommendation.topStyle)
    setVariations([])
    setSelectedVar(null)
    setName('')
    setEditingId(null)
    setContent(EMPTY_CONTENT)
    setStyleOpts({ ...DEFAULT_STYLE_OPTIONS })
    setPreviewHtml('')
    setStep('intent')
  }

  function onIntentSelected(intent: CampaignIntent) {
    setCampaignIntent(intent)
    setStep('style-pick')
  }

  function onStyleConfirmed(style: TemplateStyle) {
    const preset = TEMPLATE_PRESETS.find(p => p.id === style)!
    setStyle(style)
    const d = preset.defaults
    const blocks: ContentBlock[] = [
      { id: uid(), type: 'headline', text: d.headline, align: 'center' },
      { id: uid(), type: 'text',     text: d.body_text, align: 'left' },
      { id: uid(), type: 'button',   text: d.cta_text,  url: '',       align: 'center' },
    ]
    setContent({ subject: d.subject, preheader: d.preheader, footer_text: d.footer_text, blocks })
    const vars = generateVariations(fakeSnap, style)
    setVariations(vars)
    const recIdx = campaignIntent ? recommendVariationIndex(campaignIntent) : 1
    setSelectedVar(vars.find(v => v.index === recIdx) ?? vars[0])
    setPreviewHtml('')
    setStep('variations')
  }

  function onVariationSelected(v: VariationConfig) {
    setSelectedVar(v)
    setStyleOpts({ ...v.style_options })
  }

  function onVariationConfirmed() {
    if (!selectedVar) return
    setStyleOpts({ ...selectedVar.style_options })
    setPreviewHtml('')
    setStep('edit')
  }

  async function handleSave() {
    if (!profile) return
    setSaving(true)
    try {
      const name = templateName.trim() || `${TEMPLATE_PRESETS.find(p => p.id === selectedStyle)?.label ?? 'Template'} — ${selectedVar?.name ?? new Date().toLocaleDateString()}`.trim()
      if (editingId) {
        await updateEmailTemplate({
          templateId: editingId,
          name,
          content: { ...content, style_options: styleOpts },
        })
      } else {
        await createEmailTemplate({
          brandProfileId: profile.id,
          name,
          style: selectedStyle,
          content: { ...content, style_options: styleOpts },
          campaignIntent: campaignIntent ?? undefined,
          variationName:  selectedVar?.name,
          variationIndex: selectedVar?.index,
        })
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      const updated = await listEmailTemplates(profile.id)
      setTemplates(updated)
      setStep('gallery')
      startTransition(() => router.refresh())
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    await deleteEmailTemplate(id)
    setTemplates(t => t.filter(x => x.id !== id))
    if (viewTemplate?.id === id) { setViewTemplate(null); setStep('gallery') }
    startTransition(() => router.refresh())
  }

  async function handleRefreshSnapshot() {
    if (!viewTemplate || !profile) return
    setSaving(true)
    try {
      await updateEmailTemplate({ templateId: viewTemplate.id, refreshSnapshot: true })
      const updated = await listEmailTemplates(profile.id)
      setTemplates(updated)
      const refreshed = updated.find(t => t.id === viewTemplate.id)
      if (refreshed) { setViewTemplate(refreshed); setPreviewHtml('') }
    } finally { setSaving(false) }
  }

  // ── No profile ──────────────────────────────────────────────────────────────

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3 py-20 text-center px-6">
        <Mail className="w-10 h-10 text-gray-200 dark:text-white/10" />
        <p className="text-sm font-semibold text-gray-400">Select a Brand ID to manage email templates</p>
        <p className="text-xs text-gray-300 dark:text-gray-600">Templates are scoped to a brand profile — colors, logo and fonts apply automatically.</p>
      </div>
    )
  }

  // ── View saved template ─────────────────────────────────────────────────────

  if (step === 'view-saved' && viewTemplate) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#fff', display: 'flex', flexDirection: 'column' }}>
      <PreviewShell html={previewHtml} loading={previewLoading}
        onBack={() => { setViewTemplate(null); setStep('gallery') }} backLabel="All Templates">
        <div className="p-4 space-y-5">
          <div>
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">{viewTemplate.name}</h3>
            <p className="text-[11px] text-gray-400 mt-0.5 capitalize">{viewTemplate.template_style} · {new Date(viewTemplate.created_at).toLocaleDateString()}</p>
            {viewTemplate.variation_name && (
              <span className="inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400">
                {viewTemplate.variation_name}
              </span>
            )}
            {viewTemplate.campaign_intent && (
              <span className="inline-block ml-1.5 mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 capitalize">
                {viewTemplate.campaign_intent.replace('_', ' ')}
              </span>
            )}
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Subject</p>
            <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5">{viewTemplate.content_json.subject || '—'}</p>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mt-3">Preheader</p>
            <p className="text-xs text-gray-500 mt-0.5">{viewTemplate.content_json.preheader || '—'}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Brand applied</p>
            <div className="flex gap-1.5 flex-wrap">
              {[primary, secondary, ...palette.slice(0, 3)].filter(Boolean).map((c, i) => (
                <div key={i} className="w-5 h-5 rounded-full border border-white dark:border-gray-800 shadow-sm" style={{ background: c }} />
              ))}
            </div>
          </div>
          <div className="space-y-2 pt-1">
            <button
              onClick={() => openSavedForEdit(viewTemplate)}
              className="w-full flex items-center justify-center gap-2 text-xs font-bold text-white rounded-lg py-2"
              style={{ background: primary }}>
              Edit in canvas
            </button>
            <button onClick={handleRefreshSnapshot} disabled={saving}
              className="w-full flex items-center justify-center gap-2 text-xs font-semibold border border-gray-200 dark:border-white/10 rounded-lg py-2 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Refresh brand snapshot
            </button>
            <button onClick={() => handleDelete(viewTemplate.id)}
              className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-red-500 border border-red-100 dark:border-red-900/40 rounded-lg py-2 hover:bg-red-50 dark:hover:bg-red-900/20">
              <Trash2 className="w-3.5 h-3.5" /> Delete template
            </button>
          </div>
        </div>
      </PreviewShell>
      </div>
    )
  }

  // ── Step 1: Campaign intent ─────────────────────────────────────────────────

  if (step === 'intent') {
    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-white/10 bg-white dark:bg-gray-950">
          <button onClick={() => setStep('gallery')} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
            <ChevronLeft className="w-3.5 h-3.5" /> Gallery
          </button>
          <FlowProgress current={0} />
          <div className="w-16" />
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-lg mx-auto">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">What's the goal of this email?</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">This helps recommend the right template style and design variation.</p>
            <div className="grid grid-cols-1 gap-3">
              {INTENTS.map(intent => {
                const Icon = intent.icon
                return (
                  <button key={intent.key} onClick={() => onIntentSelected(intent.key)}
                    className="flex items-center gap-4 p-4 rounded-xl border-2 border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 hover:border-violet-300 dark:hover:border-violet-700 hover:bg-violet-50/40 dark:hover:bg-violet-900/10 text-left transition-all group">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gray-50 dark:bg-white/5 group-hover:bg-violet-100 dark:group-hover:bg-violet-900/30 transition-colors">
                      <Icon className="w-5 h-5 text-gray-400 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{intent.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{intent.description}</p>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-gray-300 rotate-180 ml-auto shrink-0" />
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Step 2: Style selection ─────────────────────────────────────────────────

  if (step === 'style-pick') {
    const intentLabel = INTENTS.find(i => i.key === campaignIntent)?.label ?? ''
    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-white/10 bg-white dark:bg-gray-950">
          <button onClick={() => setStep('intent')} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </button>
          <FlowProgress current={1} />
          <div className="w-16" />
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="max-w-lg mx-auto">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">Choose a template style</h2>
            {intentLabel && (
              <p className="text-xs text-gray-500 mb-4">
                For <span className="font-semibold text-violet-600 dark:text-violet-400">{intentLabel}</span> —
                {' '}<span className="text-gray-400">recommended style highlighted</span>
              </p>
            )}
            <div className="space-y-2">
              {recommendation.rankedStyles.map(({ preset, reason }) => {
                const isRec = preset.id === recommendation.topStyle
                return (
                  <button key={preset.id} onClick={() => onStyleConfirmed(preset.id)}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${
                      isRec
                        ? 'border-violet-400 bg-violet-50/60 dark:bg-violet-900/20 dark:border-violet-700'
                        : 'border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 hover:border-violet-200 dark:hover:border-violet-800'
                    }`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-800 dark:text-gray-100">{preset.label}</span>
                        {isRec && (
                          <span className="flex items-center gap-0.5 text-[10px] font-semibold text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/40 px-1.5 py-0.5 rounded-full">
                            <Sparkles className="w-2.5 h-2.5" /> Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{preset.description}</p>
                      {reason && reason !== 'general use' && (
                        <p className="text-[10px] text-violet-500 dark:text-violet-500 mt-1">Why: {reason}</p>
                      )}
                    </div>
                    <ChevronLeft className="w-4 h-4 text-gray-300 rotate-180 shrink-0" />
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Step 3: 4 variations ────────────────────────────────────────────────────

  if (step === 'variations') {
    const recIdx = campaignIntent ? recommendVariationIndex(campaignIntent) : 1
    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-white/10 bg-white dark:bg-gray-950">
          <button onClick={() => setStep('style-pick')} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
            <ChevronLeft className="w-3.5 h-3.5" /> Style
          </button>
          <FlowProgress current={2} />
          <div className="w-16" />
        </div>
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Left: 2×2 variation grid */}
          <div className="w-64 shrink-0 overflow-y-auto p-4 border-r border-gray-100 dark:border-white/10 bg-white dark:bg-gray-950">
            <p className="text-xs font-bold text-gray-800 dark:text-gray-100 mb-1">Choose a design skin</p>
            <p className="text-[11px] text-gray-400 mb-4">Same layout, 4 intentional styles.</p>
            <div className="grid grid-cols-2 gap-3">
              {variations.map(v => {
                const isSelected = selectedVar?.index === v.index
                const isRec      = v.index === recIdx
                return (
                  <button key={v.index} onClick={() => onVariationSelected(v)}
                    className={`flex flex-col rounded-xl overflow-hidden transition-all border-2 ${
                      isSelected
                        ? 'border-violet-500 shadow-md shadow-violet-200/50 dark:shadow-violet-900/30'
                        : 'border-gray-100 dark:border-white/10 hover:border-violet-300 dark:hover:border-violet-700'
                    }`}>
                    <div className="relative" style={{ aspectRatio: '3/4' }}>
                      <VariationThumbnail style={selectedStyle} variation={v} logoUrl={logoAsset?.file_url} />
                      {isRec && (
                        <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-500 text-white">
                          <Sparkles className="w-2 h-2" /> Pick
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute bottom-1.5 right-1.5 w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="px-2 py-1.5 bg-white dark:bg-gray-950">
                      <p className="text-[10px] font-bold text-gray-700 dark:text-gray-200 leading-tight">{v.name}</p>
                      <p className="text-[9px] text-gray-400 leading-tight">{v.tagline}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Right: iframe preview of selected */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#f0f0f2] dark:bg-gray-950">
            <div className="flex-1 overflow-auto p-5">
              {selectedVar && (
                <div className="mx-auto w-full" style={{ maxWidth: 480 }}>
                  <div className="relative rounded-2xl overflow-hidden shadow-lg bg-white" style={{ aspectRatio: '1/1.5' }}>
                    {previewLoading && (
                      <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/80">
                        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                      </div>
                    )}
                    {previewHtml
                      ? <iframe srcDoc={previewHtml} title="Variation preview" className="w-full h-full border-0" sandbox="allow-same-origin" />
                      : <div className="flex flex-col items-center justify-center h-full gap-2">
                          <Mail className="w-8 h-8 text-gray-200" />
                          <p className="text-xs text-gray-400">Select a variation</p>
                        </div>
                    }
                  </div>
                  {selectedVar && (
                    <div className="mt-4 text-center">
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{selectedVar.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{selectedVar.tagline}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="shrink-0 flex items-center justify-between px-5 py-4 border-t border-gray-200 dark:border-white/10 bg-white dark:bg-gray-950">
              <p className="text-xs text-gray-500">
                {selectedVar?.name ?? 'Select a variation to continue'}
              </p>
              <button onClick={onVariationConfirmed} disabled={!selectedVar}
                className="flex items-center gap-1.5 text-sm font-bold text-white px-5 py-2 rounded-xl disabled:opacity-40 transition-opacity"
                style={{ background: primary }}>
                Use this variation →
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Edit: visual drag-and-drop canvas ─────────────────────────────────────

  if (step === 'edit') {
    const backStep = selectedVar ? 'variations' : 'gallery'
    return (
      // flex flex-col so the canvas gets flex: 1 height from its parent
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <EmailBuilderCanvas
          blocks={content.blocks}
          onChange={blocks => setContent(c => ({ ...c, blocks }))}
          subject={content.subject}
          preheader={content.preheader}
          footerText={content.footer_text}
          onMetaChange={patch => setContent(c => ({ ...c, ...patch }))}
          defaults={assetDefaults}
          allProfiles={allProfiles}
          allAssets={allAssets}
          onBack={() => setStep(backStep)}
          templateName={templateName}
          onNameChange={setName}
          onSave={handleSave}
          saving={saving}
          saved={saved}
        />
      </div>
    )
  }

  // ── Gallery ─────────────────────────────────────────────────────────────────

  const visibleSections = sidebarFilter === 'all' ? GALLERY_SECTIONS : GALLERY_SECTIONS.filter(s => s.style === sidebarFilter)

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Sidebar */}
      <div className="w-40 shrink-0 border-r border-gray-100 dark:border-white/10 overflow-y-auto bg-white dark:bg-gray-950 py-4">
        {SIDEBAR_ITEMS.map((item, i) => {
          if (item.kind === 'heading') {
            return <p key={i} className="px-4 pt-4 pb-1 text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wide">{item.label}</p>
          }
          const active = item.kind === 'all' ? sidebarFilter === 'all' : sidebarFilter === item.style
          const label  = item.kind === 'all' ? 'All templates' : item.label
          return (
            <button key={i}
              onClick={() => setSidebarFilter(item.kind === 'all' ? 'all' : item.style)}
              className="w-full text-left py-1.5 text-xs font-medium transition-colors"
              style={active
                ? { background: primary, color: '#fff', paddingLeft: 16, borderRadius: 8, width: 'calc(100% - 16px)', marginLeft: 8 }
                : { paddingLeft: 16, color: '' }}>
              <span className={active ? '' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}>{label}</span>
            </button>
          )
        })}
        <div className="px-3 mt-6 pt-4 border-t border-gray-100 dark:border-white/10">
          <button onClick={startNewTemplate}
            className="w-full text-[11px] font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-left">
            Start from scratch
          </button>
        </div>
      </div>

      {/* Main gallery */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-100 dark:border-white/10 bg-white dark:bg-gray-950">
          {/* "All Templates" theme-colored tag */}
          <div className="flex items-center gap-2">
            <span
              className="text-[11px] font-bold px-2.5 py-1 rounded-full"
              style={{ background: `${primary}18`, color: primary }}
            >
              All Templates
            </span>
            {templates.length > 0 && (
              <span className="text-[11px] text-gray-400">{templates.length} saved</span>
            )}
          </div>
          <button onClick={startNewTemplate}
            className="flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-1.5 rounded-lg"
            style={{ background: primary }}>
            <Plus className="w-3.5 h-3.5" /> New Template
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-8">

          {/* ── My Saved Templates — always visible, filtered by style ── */}
          {(() => {
            const myTemplates = sidebarFilter === 'all'
              ? templates
              : templates.filter(t => t.template_style === sidebarFilter)
            if (myTemplates.length === 0) return null
            return (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">My Templates</h2>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${primary}15`, color: primary }}>
                    {myTemplates.length} saved
                  </span>
                </div>
                {loadingList
                  ? <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>
                  : <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                      {myTemplates.map(t => (
                        <GalleryCard key={t.id} style={t.template_style} name={t.name} isSaved
                          primary={primary} logoUrl={logoAsset?.file_url}
                          onClick={() => { setViewTemplate(t); setPreviewHtml(''); setStep('view-saved') }}
                          onEdit={() => openSavedForEdit(t)}
                          onDelete={() => handleDelete(t.id)} />
                      ))}
                    </div>
                }
              </section>
            )
          })()}

          {/* ── Basic Layouts — direct canvas entry ─────────────────── */}
          {(sidebarFilter === 'all' || sidebarFilter === 'basic') && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Basic Layouts</h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${primary}15`, color: primary }}>
                  Drag &amp; drop editor
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                {/* Basic Newsletter — opens visual canvas directly */}
                <div className="flex flex-col gap-2">
                  <div
                    className="relative rounded-xl overflow-hidden cursor-pointer transition-all"
                    style={{ aspectRatio: '3/4', border: `2px solid ${primary}30`, boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}
                    onClick={openHybridTemplate}
                  >
                    {/* Mini preview thumbnail */}
                    <div className="w-full h-full flex flex-col" style={{ background: '#f8f9fa' }}>
                      {/* Header bar */}
                      <div style={{ height: '14%', background: '#f1f3f5', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', padding: '0 10px' }}>
                        <div style={{ width: 32, height: 8, borderRadius: 3, background: primary + '60' }} />
                      </div>
                      {/* Body */}
                      <div style={{ flex: 1, background: '#fff', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <div style={{ height: 7, borderRadius: 2, background: '#111827', width: '80%', alignSelf: 'center' }} />
                        <div style={{ height: 4, borderRadius: 2, background: '#e5e7eb', width: '65%', alignSelf: 'center' }} />
                        <div style={{ height: 30, borderRadius: 4, background: '#f3f4f6', border: '1px dashed #d1d5db', marginTop: 4 }} />
                        <div style={{ height: 14, borderRadius: 4, background: primary, width: '50%', alignSelf: 'center', marginTop: 4 }} />
                        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                          <div style={{ flex: 1, height: 24, borderRadius: 4, background: '#f3f4f6' }} />
                          <div style={{ flex: 1, height: 24, borderRadius: 4, background: '#f3f4f6' }} />
                        </div>
                      </div>
                      {/* Footer */}
                      <div style={{ height: '10%', background: '#f9fafb', borderTop: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        {[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: primary + '80' }} />)}
                      </div>
                    </div>
                    {/* Hover overlay */}
                    <div className="absolute inset-0 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity"
                      style={{ background: 'rgba(0,0,0,0.12)', backdropFilter: 'blur(1px)' }}>
                      <button className="text-white text-xs font-bold px-4 py-1.5 rounded-full shadow"
                        style={{ background: primary }}>Use</button>
                    </div>
                  </div>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-200">Basic Newsletter</p>
                  <p className="text-[10px] text-gray-400">Hybrid layout · drag &amp; drop</p>
                </div>
              </div>
            </section>
          )}


          {/* Style sections */}
          {visibleSections.map(section => {
            const savedHere = templates.filter(t => t.template_style === section.style)
            const variants  = [
              { key: 'primary', p: primary    },
              ...(palette.length > 0 ? [{ key: 'palette', p: palette[0] }] : []),
              { key: 'dark',    p: '#111827'  },
              { key: 'muted',   p: secondary  },
            ]
            return (
              <section key={section.style}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">{section.label}</h2>
                  <button onClick={() => setSidebarFilter(section.style)}
                    className="text-[11px] font-semibold hover:underline" style={{ color: primary }}>
                    See all →
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                  {savedHere.slice(0, 1).map(t => (
                    <GalleryCard key={t.id} style={t.template_style} name={t.name} isSaved
                      primary={primary} logoUrl={logoAsset?.file_url}
                      onClick={() => { setViewTemplate(t); setPreviewHtml(''); setStep('view-saved') }}
                      onDelete={() => handleDelete(t.id)} />
                  ))}
                  {variants.slice(0, savedHere.length > 0 ? 3 : 4).map(v => (
                    <GalleryCard key={v.key} style={section.style}
                      name={`${section.label}${v.key === 'dark' ? ' — Dark' : v.key === 'palette' ? ' — Palette' : v.key === 'muted' ? ' — Muted' : ''}`}
                      primary={v.p} logoUrl={logoAsset?.file_url}
                      onClick={startNewTemplate} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
