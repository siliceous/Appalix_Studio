'use client'

import { useState } from 'react'
import {
  Trash2, ChevronUp, ChevronDown, Check, X,
  GripVertical, Plus,
} from 'lucide-react'
import { nanoid } from 'nanoid'
import { cn } from '@/lib/utils'
import type { FormBlock, FormTheme, FormType, ColumnRatio } from '@/features/forms/types'

// ── Shared block content renderer ─────────────────────────────────────────────

function BlockContent({
  block,
  theme,
  onUpdateProps,
}: {
  block:         FormBlock
  theme:         FormTheme
  onUpdateProps: (props: Partial<FormBlock['props']>) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState('')

  const primary  = theme.colors?.primary      ?? '#6366f1'
  const textCol  = theme.colors?.text         ?? '#111827'
  const fRadius  = theme.fields?.radius       ?? '6px'
  const bRadius  = theme.buttons?.radius      ?? '8px'
  const fBorder  = theme.fields?.borderColor  ?? '#d1d5db'
  const fontFam  = theme.typography?.fontFamily ?? 'Inter'

  // ── Text variant styles (shared between display and edit) ──────────────────
  const variantStyle: React.CSSProperties =
    block.props.variant === 'heading' ? { fontSize: '1.2rem', fontWeight: 700, lineHeight: 1.3 } :
    block.props.variant === 'legal'   ? { fontSize: '0.7rem', opacity: 0.5 } :
    block.props.variant === 'link'    ? { fontSize: '0.875rem', textDecoration: 'underline' } :
    { fontSize: '0.875rem', lineHeight: 1.6 }

  // ── TEXT BLOCK ─────────────────────────────────────────────────────────────
  if (block.type === 'text') {
    return (
      <div className="py-1">
        {editing ? (
          <div className="flex items-start gap-1">
            <textarea
              autoFocus
              value={draft}
              rows={3}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onUpdateProps({ content: draft }); setEditing(false) }
                if (e.key === 'Escape') setEditing(false)
              }}
              // Same appearance as display — no visual jump
              style={{
                fontFamily: `"${fontFam}", sans-serif`,
                color:      textCol,
                background: 'transparent',
                border:     '1px solid #6366f1',
                borderRadius: '4px',
                padding:    '2px 4px',
                resize:     'none',
                outline:    'none',
                width:      '100%',
                ...variantStyle,
              }}
            />
            <div className="flex flex-col gap-0.5 shrink-0">
              <button onClick={() => { onUpdateProps({ content: draft }); setEditing(false) }} className="p-1 text-green-500 hover:bg-green-50 rounded"><Check className="w-3 h-3" /></button>
              <button onClick={() => setEditing(false)} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X className="w-3 h-3" /></button>
            </div>
          </div>
        ) : (
          <div
            onClick={e => { e.stopPropagation(); setDraft(block.props.content ?? ''); setEditing(true) }}
            className="cursor-text select-none"
            style={{ fontFamily: `"${fontFam}", sans-serif`, color: textCol, ...variantStyle }}
          >
            {block.props.content || <span style={{ opacity: 0.35, fontStyle: 'italic' }}>Click to edit text</span>}
          </div>
        )}
      </div>
    )
  }

  // ── EMAIL / PHONE / TEXT_INPUT ─────────────────────────────────────────────
  if (block.type === 'email' || block.type === 'phone' || block.type === 'text_input') {
    return (
      <div className="flex flex-col gap-1">
        {block.props.label && (
          <label className="text-xs font-medium" style={{ color: textCol, fontFamily: `"${fontFam}", sans-serif` }}>
            {block.props.label}{block.props.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}
        <div className="px-3 py-2.5 border text-sm text-gray-400" style={{ borderRadius: fRadius, borderColor: fBorder, background: '#fafafa', fontFamily: `"${fontFam}", sans-serif` }}>
          {block.props.placeholder || 'Input field'}
        </div>
      </div>
    )
  }

  // ── TEXTAREA ───────────────────────────────────────────────────────────────
  if (block.type === 'textarea') {
    return (
      <div className="flex flex-col gap-1">
        {block.props.label && (
          <label className="text-xs font-medium" style={{ color: textCol, fontFamily: `"${fontFam}", sans-serif` }}>
            {block.props.label}{block.props.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}
        <div className="px-3 py-2 border text-sm text-gray-400" style={{ borderRadius: fRadius, borderColor: fBorder, background: '#fafafa', minHeight: '72px', fontFamily: `"${fontFam}", sans-serif` }}>
          {block.props.placeholder || 'Text area'}
        </div>
      </div>
    )
  }

  // ── BUTTON ─────────────────────────────────────────────────────────────────
  if (block.type === 'button') {
    return (
      <div className="w-full text-center py-2.5 text-sm font-semibold text-white" style={{ background: primary, borderRadius: bRadius, fontFamily: `"${fontFam}", sans-serif` }}>
        {block.props.label || 'Submit'}
      </div>
    )
  }

  // ── CHECKBOX ───────────────────────────────────────────────────────────────
  if (block.type === 'checkbox') {
    return (
      <label className="flex items-start gap-2 cursor-pointer">
        <div className="w-4 h-4 border-2 rounded shrink-0 mt-0.5" style={{ borderColor: fBorder }} />
        <span className="text-xs text-gray-600 dark:text-gray-400" style={{ fontFamily: `"${fontFam}", sans-serif` }}>{block.props.label || 'Checkbox'}</span>
      </label>
    )
  }

  // ── DROPDOWN ───────────────────────────────────────────────────────────────
  if (block.type === 'dropdown') {
    return (
      <div className="flex flex-col gap-1">
        {block.props.label && <label className="text-xs font-medium" style={{ color: textCol, fontFamily: `"${fontFam}", sans-serif` }}>{block.props.label}</label>}
        <div className="flex items-center justify-between px-3 py-2.5 border text-sm text-gray-400" style={{ borderRadius: fRadius, borderColor: fBorder, background: '#fafafa', fontFamily: `"${fontFam}", sans-serif` }}>
          <span>{(block.props.options as string[] | undefined)?.[0] ?? 'Select…'}</span>
          <span className="text-gray-300">▾</span>
        </div>
      </div>
    )
  }

  // ── DIVIDER ────────────────────────────────────────────────────────────────
  if (block.type === 'divider') {
    return <div className="py-2"><div className="h-px w-full bg-gray-200 dark:bg-gray-700" /></div>
  }

  // ── IMAGE ──────────────────────────────────────────────────────────────────
  if (block.type === 'image') {
    if (block.props.src) {
      return <img src={block.props.src as string} alt={(block.props.alt as string) ?? ''} className="w-full rounded-lg" />
    }
    return (
      <div className="flex items-center justify-center h-24 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-300 text-xs">
        Click to add image
      </div>
    )
  }

  return null
}

// ── Column block ──────────────────────────────────────────────────────────────

const RATIO_FRACS: Record<ColumnRatio, number[]> = {
  '1:1':   [1, 1],
  '2:1':   [2, 1],
  '1:2':   [1, 2],
  '1:1:1': [1, 1, 1],
}

function ColumnBlock({
  block,
  theme,
  selectedBlockId,
  onSelectBlock,
  onUpdateBlock,
  onDeleteBlock,
  onMoveBlock,
  onAddToColumn,
}: {
  block:           FormBlock
  theme:           FormTheme
  selectedBlockId: string | null
  onSelectBlock:   (id: string | null) => void
  onUpdateBlock:   (id: string, props: Partial<FormBlock['props']>) => void
  onDeleteBlock:   (id: string) => void
  onMoveBlock:     (id: string, dir: 'up' | 'down') => void
  onAddToColumn:   (columnBlockId: string, colIdx: number, block: FormBlock) => void
}) {
  const ratio   = (block.props.ratio as ColumnRatio) ?? '1:1'
  const fracs   = RATIO_FRACS[ratio] ?? [1, 1]
  const total   = fracs.reduce((a, b) => a + b, 0)
  const columns = (block.props.columns as FormBlock[][] | undefined) ?? fracs.map(() => [])
  const isSelected = selectedBlockId === block.id

  return (
    <div
      onClick={e => { e.stopPropagation(); onSelectBlock(block.id) }}
      className={cn(
        'relative group rounded-lg transition-all',
        isSelected ? 'ring-2 ring-brand-400 dark:ring-brand-500' : 'hover:ring-1 hover:ring-gray-300 dark:hover:ring-gray-600',
      )}
    >
      {/* Column controls */}
      {isSelected && (
        <div
          className="absolute -top-3 right-0 flex items-center gap-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm px-1 py-0.5 z-10"
          onClick={e => e.stopPropagation()}
        >
          <button onClick={() => onMoveBlock(block.id, 'up')}   className="p-1 text-gray-400 hover:text-gray-600 rounded"><ChevronUp   className="w-3 h-3" /></button>
          <button onClick={() => onMoveBlock(block.id, 'down')} className="p-1 text-gray-400 hover:text-gray-600 rounded"><ChevronDown className="w-3 h-3" /></button>
          <button onClick={() => onDeleteBlock(block.id)}       className="p-1 text-gray-400 hover:text-red-500 rounded"><Trash2 className="w-3 h-3" /></button>
        </div>
      )}

      <div className="flex gap-2">
        {fracs.map((frac, colIdx) => {
          const colBlocks = columns[colIdx] ?? []
          return (
            <div
              key={colIdx}
              className="min-h-[80px] rounded-lg border border-dashed border-gray-200 dark:border-gray-700 flex flex-col gap-2 p-2 transition-colors hover:border-gray-300 dark:hover:border-gray-600"
              style={{ flex: `${(frac / total) * 100}%` }}
            >
              {/* Sub-blocks inside this column */}
              {colBlocks.map((subBlock, sbIdx) => (
                <div
                  key={subBlock.id}
                  onClick={e => { e.stopPropagation(); onSelectBlock(subBlock.id) }}
                  className={cn(
                    'relative group/sub rounded transition-all',
                    selectedBlockId === subBlock.id
                      ? 'ring-2 ring-brand-400 dark:ring-brand-500'
                      : 'hover:ring-1 hover:ring-gray-300 dark:hover:ring-gray-600',
                  )}
                >
                  <BlockContent
                    block={subBlock}
                    theme={theme}
                    onUpdateProps={props => onUpdateBlock(subBlock.id, props)}
                  />
                  {/* Sub-block controls */}
                  {selectedBlockId === subBlock.id && (
                    <div
                      className="absolute -top-3 right-0 flex items-center gap-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm px-1 py-0.5 z-10"
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        onClick={() => {
                          const updated = [...colBlocks]
                          if (sbIdx > 0) { [updated[sbIdx - 1], updated[sbIdx]] = [updated[sbIdx], updated[sbIdx - 1]] }
                          const newCols = [...columns]; newCols[colIdx] = updated
                          onUpdateBlock(block.id, { columns: newCols })
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded"
                      ><ChevronUp className="w-3 h-3" /></button>
                      <button
                        onClick={() => {
                          const updated = [...colBlocks]
                          if (sbIdx < updated.length - 1) { [updated[sbIdx], updated[sbIdx + 1]] = [updated[sbIdx + 1], updated[sbIdx]] }
                          const newCols = [...columns]; newCols[colIdx] = updated
                          onUpdateBlock(block.id, { columns: newCols })
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded"
                      ><ChevronDown className="w-3 h-3" /></button>
                      <button
                        onClick={() => {
                          const newCols = [...columns]
                          newCols[colIdx] = colBlocks.filter(b => b.id !== subBlock.id)
                          onUpdateBlock(block.id, { columns: newCols })
                        }}
                        className="p-1 text-gray-400 hover:text-red-500 rounded"
                      ><Trash2 className="w-3 h-3" /></button>
                    </div>
                  )}
                </div>
              ))}

              {/* Add block to this column */}
              <AddToColumnButton
                onAdd={type => {
                  const newBlock: FormBlock = {
                    id:     `b_${nanoid(8)}`,
                    stepId: block.stepId,
                    type,
                    props:  COLUMN_BLOCK_DEFAULTS[type] ?? {},
                  }
                  onAddToColumn(block.id, colIdx, newBlock)
                }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Quick-add popover for column cells ────────────────────────────────────────

import type { BlockType } from '@/features/forms/types'
import {
  Mail, Phone, Type, MousePointerClick, Image as ImageIcon,
  Minus, AlignLeft, CheckSquare, ChevronDown as DropIcon,
} from 'lucide-react'

const COLUMN_BLOCK_OPTIONS: { type: BlockType; label: string; icon: React.ElementType }[] = [
  { type: 'text',       label: 'Text',     icon: Type            },
  { type: 'image',      label: 'Image',    icon: ImageIcon       },
  { type: 'email',      label: 'Email',    icon: Mail            },
  { type: 'phone',      label: 'Phone',    icon: Phone           },
  { type: 'text_input', label: 'Input',    icon: Type            },
  { type: 'textarea',   label: 'Textarea', icon: AlignLeft       },
  { type: 'button',     label: 'Button',   icon: MousePointerClick },
  { type: 'checkbox',   label: 'Checkbox', icon: CheckSquare     },
  { type: 'dropdown',   label: 'Dropdown', icon: DropIcon        },
  { type: 'divider',    label: 'Divider',  icon: Minus           },
]

const COLUMN_BLOCK_DEFAULTS: Partial<Record<BlockType, FormBlock['props']>> = {
  text:       { content: 'Add text here', variant: 'body' },
  image:      { src: '', alt: '' },
  email:      { label: 'Email', placeholder: 'Enter your email', required: false },
  phone:      { label: 'Phone', placeholder: '+1 555 000 0000', required: false },
  text_input: { label: 'Input', placeholder: 'Type here…', required: false },
  textarea:   { label: 'Message', placeholder: 'Tell us more…', required: false },
  button:     { label: 'Click here', action: 'url' },
  checkbox:   { label: 'I agree', required: false },
  dropdown:   { label: 'Select', options: ['Option 1', 'Option 2'], required: false },
  divider:    {},
}

function AddToColumnButton({ onAdd }: { onAdd: (type: BlockType) => void }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
        className="w-full flex items-center justify-center gap-1 py-1.5 text-[10px] text-gray-300 hover:text-brand-500 hover:bg-brand-50/40 dark:hover:bg-brand-500/5 rounded-md border border-dashed border-gray-200 dark:border-gray-700 hover:border-brand-300 transition-colors"
      >
        <Plus className="w-3 h-3" />Add
      </button>
      {open && (
        <div
          className="absolute top-full left-0 z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1 w-36"
          onClick={e => e.stopPropagation()}
        >
          {COLUMN_BLOCK_OPTIONS.map(opt => (
            <button
              key={opt.type}
              onClick={() => { onAdd(opt.type); setOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              <opt.icon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Block wrapper (top-level, non-column) ─────────────────────────────────────

function BlockPreview({
  block, theme, isSelected, onClick, onDelete, onMoveUp, onMoveDown, onUpdateProps,
}: {
  block:         FormBlock
  theme:         FormTheme
  isSelected:    boolean
  onClick:       () => void
  onDelete:      () => void
  onMoveUp:      () => void
  onMoveDown:    () => void
  onUpdateProps: (props: Partial<FormBlock['props']>) => void
}) {
  const fontFam = theme.typography?.fontFamily ?? 'Inter'

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative group rounded-lg transition-all',
        isSelected ? 'ring-2 ring-brand-400 dark:ring-brand-500' : 'hover:ring-1 hover:ring-gray-300 dark:hover:ring-gray-600',
      )}
    >
      <div className={cn('absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab', isSelected && 'opacity-100')}>
        <GripVertical className="w-3 h-3 text-gray-300" />
      </div>

      <div style={{ fontFamily: `"${fontFam}", sans-serif` }}>
        <BlockContent block={block} theme={theme} onUpdateProps={onUpdateProps} />
      </div>

      {isSelected && (
        <div
          className="absolute -top-3 right-0 flex items-center gap-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm px-1 py-0.5"
          onClick={e => e.stopPropagation()}
        >
          <button onClick={onMoveUp}   className="p-1 text-gray-400 hover:text-gray-600 rounded"><ChevronUp   className="w-3 h-3" /></button>
          <button onClick={onMoveDown} className="p-1 text-gray-400 hover:text-gray-600 rounded"><ChevronDown className="w-3 h-3" /></button>
          <button onClick={onDelete}   className="p-1 text-gray-400 hover:text-red-500 rounded"><Trash2 className="w-3 h-3" /></button>
        </div>
      )}
    </div>
  )
}

// ── Canvas ────────────────────────────────────────────────────────────────────

interface Props {
  blocks:          FormBlock[]
  selectedBlockId: string | null
  onSelectBlock:   (id: string | null) => void
  onUpdateBlock:   (id: string, props: Partial<FormBlock['props']>) => void
  onDeleteBlock:   (id: string) => void
  onMoveBlock:     (id: string, dir: 'up' | 'down') => void
  onAddToColumn:   (columnBlockId: string, colIdx: number, block: FormBlock) => void
  theme:           FormTheme
  formType:        FormType
  previewDevice:   'desktop' | 'mobile'
}

export function FormCanvas({
  blocks, selectedBlockId, onSelectBlock, onUpdateBlock, onDeleteBlock, onMoveBlock,
  onAddToColumn, theme, formType, previewDevice,
}: Props) {
  const bg     = theme.colors?.background ?? '#ffffff'
  const radius = theme.modal?.radius      ?? '8px'
  const width  = previewDevice === 'mobile' ? '360px' : (theme.modal?.width ?? '520px')

  return (
    <div
      className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden flex items-start justify-center p-8"
      onClick={() => onSelectBlock(null)}
    >
      <div
        className="w-full shadow-xl relative overflow-hidden"
        style={{ maxWidth: width, background: bg, borderRadius: radius, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
        onClick={e => e.stopPropagation()}
      >
        {(formType === 'popup' || formType === 'flyout') && (
          <button className="absolute top-3 right-3 w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 text-xs font-bold z-10">×</button>
        )}

        <div className="px-6 py-6 space-y-3">
          {blocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <div className="w-10 h-10 rounded-full border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center">
                <Plus className="w-4 h-4 text-gray-300" />
              </div>
              <p className="text-sm text-gray-400">Click an item in the left panel to add it here</p>
            </div>
          ) : (
            blocks.map(block =>
              block.type === 'columns' ? (
                <ColumnBlock
                  key={block.id}
                  block={block}
                  theme={theme}
                  selectedBlockId={selectedBlockId}
                  onSelectBlock={onSelectBlock}
                  onUpdateBlock={onUpdateBlock}
                  onDeleteBlock={onDeleteBlock}
                  onMoveBlock={onMoveBlock}
                  onAddToColumn={onAddToColumn}
                />
              ) : (
                <BlockPreview
                  key={block.id}
                  block={block}
                  theme={theme}
                  isSelected={selectedBlockId === block.id}
                  onClick={() => onSelectBlock(block.id)}
                  onDelete={() => onDeleteBlock(block.id)}
                  onMoveUp={() => onMoveBlock(block.id, 'up')}
                  onMoveDown={() => onMoveBlock(block.id, 'down')}
                  onUpdateProps={props => onUpdateBlock(block.id, props)}
                />
              )
            )
          )}
        </div>
      </div>
    </div>
  )
}
