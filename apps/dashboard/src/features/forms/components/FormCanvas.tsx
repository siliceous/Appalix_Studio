'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  Trash2, ChevronUp, ChevronDown, X,
  GripVertical, Plus, AlignLeft, AlignCenter, AlignRight,
  RotateCcw, RotateCw,
  Mail, Phone, Type, MousePointerClick, Image as ImageIcon, Minus,
} from 'lucide-react'
import { nanoid } from 'nanoid'
import { cn } from '@/lib/utils'
import type { FormBlock, FormTheme, FormType, ColumnRatio, BlockType } from '@/features/forms/types'

// ── Inline editable text ──────────────────────────────────────────────────────

function EditableText({
  value,
  placeholder = 'Click to edit',
  onCommit,
  className,
  style,
}: {
  value:       string
  placeholder?: string
  onCommit:    (v: string) => void
  className?:  string
  style?:      React.CSSProperties
}) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(value)

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => { onCommit(draft); setEditing(false) }}
        onKeyDown={e => {
          if (e.key === 'Enter')  { onCommit(draft); setEditing(false) }
          if (e.key === 'Escape') { setDraft(value); setEditing(false) }
        }}
        className={`focus:ring-0 focus:outline-none ${className ?? ''}`}
        style={{ ...style, background: 'transparent', outline: 'none', border: 'none', boxShadow: 'none', padding: '0', minWidth: 40, WebkitAppearance: 'none' } as React.CSSProperties}
      />
    )
  }

  return (
    <span
      title="Click to edit"
      onClick={e => { e.stopPropagation(); setDraft(value); setEditing(true) }}
      className={`cursor-text ${className ?? ''}`}
      style={style}
    >
      {value || <span style={{ opacity: 0.4, fontStyle: 'italic', fontWeight: 'normal' }}>{placeholder}</span>}
    </span>
  )
}

// ── Inline options editor (dropdown / radio / wheel) ──────────────────────────

function OptionsEditor({
  options,
  onChange,
  placeholder = 'Add option…',
}: {
  options:     string[]
  onChange:    (opts: string[]) => void
  placeholder?: string
}) {
  const [draft, setDraft] = useState('')

  function commit() {
    const v = draft.trim() || 'New option'
    onChange([...options, v])
    setDraft('')
  }

  return (
    <div className="mt-1.5 space-y-1" onClick={e => e.stopPropagation()}>
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-1">
          <input
            value={opt}
            onChange={e => { const u = [...options]; u[i] = e.target.value; onChange(u) }}
            className="flex-1 text-[11px] px-2 py-1 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-brand-400"
          />
          <button
            onClick={() => onChange(options.filter((_, j) => j !== i))}
            className="p-0.5 text-gray-300 hover:text-red-400 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-1">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') commit() }}
          placeholder={placeholder}
          className="flex-1 text-[11px] px-2 py-1 border border-dashed border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-500 placeholder:text-gray-300 focus:outline-none focus:border-brand-400"
        />
        <button onClick={commit} className="p-0.5 text-brand-400 hover:text-brand-600 transition-colors">
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

// ── Wheel of Fortune SVG preview ──────────────────────────────────────────────

const WHEEL_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#06b6d4']

function WheelPreview({ options }: { options: string[] }) {
  const n = options.length
  if (n < 2) return (
    <div className="flex items-center justify-center h-32 text-xs text-gray-400">Add at least 2 options</div>
  )

  const size = 160
  const cx = size / 2
  const cy = size / 2
  const r  = size / 2 - 6
  const sliceAngle = (2 * Math.PI) / n

  const round = (n: number) => Math.round(n * 1000) / 1000

  const slices = options.map((opt, i) => {
    const start = i * sliceAngle - Math.PI / 2
    const end   = start + sliceAngle
    const x1 = round(cx + r * Math.cos(start))
    const y1 = round(cy + r * Math.sin(start))
    const x2 = round(cx + r * Math.cos(end))
    const y2 = round(cy + r * Math.sin(end))
    const mid = start + sliceAngle / 2
    const tr  = r * 0.62
    return {
      d:     `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${sliceAngle > Math.PI ? 1 : 0} 1 ${x2} ${y2} Z`,
      color: WHEEL_COLORS[i % WHEEL_COLORS.length],
      text:  opt.length > 9 ? opt.slice(0, 8) + '…' : opt,
      tx:    round(cx + tr * Math.cos(mid)),
      ty:    round(cy + tr * Math.sin(mid)),
      rot:   round(mid * 180 / Math.PI),
    }
  })

  return (
    <div className="flex justify-center py-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((s, i) => (
          <g key={i}>
            <path d={s.d} fill={s.color} stroke="white" strokeWidth="1.5" />
            <text
              x={s.tx} y={s.ty}
              textAnchor="middle" dominantBaseline="middle"
              fill="white" fontSize="8" fontWeight="600"
              transform={`rotate(${s.rot}, ${s.tx}, ${s.ty})`}
            >
              {s.text}
            </text>
          </g>
        ))}
        {/* pointer */}
        <polygon points={`${cx},${cy - r - 2} ${cx - 7},${cy - r + 10} ${cx + 7},${cy - r + 10}`} fill="#1f2937" />
        <circle cx={cx} cy={cy} r={10} fill="white" stroke="#e5e7eb" strokeWidth="2" />
      </svg>
    </div>
  )
}

// ── Shared block content renderer ─────────────────────────────────────────────

function BlockContent({
  block,
  theme,
  isSelected,
  onUpdateProps,
}: {
  block:         FormBlock
  theme:         FormTheme
  isSelected?:   boolean
  onUpdateProps: (props: Partial<FormBlock['props']>) => void
}) {
  const [textEditing,  setTextEditing]  = useState(false)
  const [textDraft,    setTextDraft]    = useState('')
  const [inputVal,     setInputVal]     = useState('')
  const [textareaVal,  setTextareaVal]  = useState('')
  const [checked,      setChecked]      = useState(false)

  const primary        = theme.colors?.primary      ?? '#6366f1'
  const textCol        = theme.colors?.text         ?? '#111827'
  const mutedCol       = theme.colors?.muted        ?? '#6b7280'
  const fieldText      = theme.colors?.fieldText    ?? '#111827'
  const fRadius        = theme.fields?.radius       ?? '6px'
  const bRadius        = theme.buttons?.radius      ?? '8px'
  const fBorder        = theme.fields?.borderColor  ?? '#d1d5db'
  const fontFam        = theme.typography?.fontFamily        ?? 'Inter'
  const headingFontFam = theme.typography?.headingFontFamily ?? fontFam
  const headingSize    = theme.typography?.headingSize       ?? '24px'
  const bodySize       = theme.typography?.bodySize          ?? '14px'

  // Per-block text formatting (shared across all block types)
  const bold       = (block.props.bold      as boolean | undefined) ?? false
  const italic     = (block.props.italic    as boolean | undefined) ?? false
  const underline  = (block.props.underline as boolean | undefined) ?? false
  const blockColor = (block.props.textColor as string  | undefined) ?? textCol

  const variantStyle: React.CSSProperties =
    block.props.variant === 'heading' ? { fontSize: headingSize, fontWeight: 700, lineHeight: 1.3, fontFamily: `"${headingFontFam}", sans-serif` } :
    block.props.variant === 'legal'   ? { fontSize: '0.7rem', opacity: 0.5 } :
    block.props.variant === 'link'    ? { fontSize: bodySize, textDecoration: 'underline' } :
    { fontSize: bodySize, lineHeight: 1.6 }

  const labelStyle: React.CSSProperties = {
    color:          blockColor,
    fontFamily:     `"${fontFam}", sans-serif`,
    fontSize:       '0.75rem',
    fontWeight:     bold      ? 700         : 500,
    fontStyle:      italic    ? 'italic'    : 'normal',
    textDecoration: underline ? 'underline' : 'none',
  }

  // ── TEXT BLOCK ─────────────────────────────────────────────────────────────
  if (block.type === 'text') {
    const align       = (block.props.textAlign as 'left' | 'center' | 'right') ?? 'left'
    const formatStyle: React.CSSProperties = {
      fontWeight:     bold      ? 700         : (variantStyle.fontWeight ?? 400),
      fontStyle:      italic    ? 'italic'    : 'normal',
      textDecoration: underline ? 'underline' : 'none',
    }
    return (
      <div className="py-1">
        {textEditing ? (
          <textarea
            autoFocus
            value={textDraft}
            rows={1}
            ref={el => {
              if (!el) return
              el.style.height = 'auto'
              el.style.height = el.scrollHeight + 'px'
            }}
            onChange={e => setTextDraft(e.target.value)}
            onInput={e => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = el.scrollHeight + 'px'
            }}
            onBlur={() => { onUpdateProps({ content: textDraft }); setTextEditing(false) }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onUpdateProps({ content: textDraft }); setTextEditing(false) }
              if (e.key === 'Escape') { onUpdateProps({ content: textDraft }); setTextEditing(false) }
            }}
            className="focus:ring-0 focus:outline-none w-full block overflow-hidden"
            style={{
              fontFamily:       `"${fontFam}", sans-serif`,
              color:            blockColor,
              textAlign:        align,
              background:       'transparent',
              border:           'none',
              boxShadow:        'none',
              padding:          '0',
              margin:           '0',
              resize:           'none',
              outline:          'none',
              WebkitAppearance: 'none',
              ...variantStyle,
              ...formatStyle,
            } as React.CSSProperties}
          />
        ) : (
          <div
            onClick={e => { e.stopPropagation(); setTextDraft(block.props.content ?? ''); setTextEditing(true) }}
            className="cursor-text select-none"
            style={{ fontFamily: `"${fontFam}", sans-serif`, color: blockColor, textAlign: align, ...variantStyle, ...formatStyle }}

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
        <div className="flex items-center gap-0.5">
          <EditableText
            value={block.props.label ?? ''}
            placeholder="Field label"
            onCommit={v => onUpdateProps({ label: v })}
            style={labelStyle}
          />
          {block.props.required && <span className="text-red-500 ml-0.5">*</span>}
        </div>
        <div className="border" style={{ borderRadius: fRadius, borderColor: fBorder, background: '#fafafa' }}>
          <input
            type={block.type === 'email' ? 'email' : block.type === 'phone' ? 'tel' : 'text'}
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onClick={e => e.stopPropagation()}
            placeholder={block.props.placeholder as string || 'Type here…'}
            className="w-full px-3 py-2.5 bg-transparent border-0 focus:outline-none focus:ring-0 text-sm"
            style={{ color: fieldText, fontFamily: `"${fontFam}", sans-serif`, caretColor: primary }}
          />
        </div>
      </div>
    )
  }

  // ── TEXTAREA ───────────────────────────────────────────────────────────────
  if (block.type === 'textarea') {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-0.5">
          <EditableText
            value={block.props.label ?? ''}
            placeholder="Field label"
            onCommit={v => onUpdateProps({ label: v })}
            style={labelStyle}
          />
          {block.props.required && <span className="text-red-500 ml-0.5">*</span>}
        </div>
        <div className="border" style={{ borderRadius: fRadius, borderColor: fBorder, background: '#fafafa' }}>
          <textarea
            value={textareaVal}
            onChange={e => setTextareaVal(e.target.value)}
            onClick={e => e.stopPropagation()}
            placeholder={block.props.placeholder as string || 'Tell us more…'}
            rows={3}
            className="w-full px-3 py-2 bg-transparent border-0 focus:outline-none focus:ring-0 text-sm resize-none"
            style={{ color: fieldText, fontFamily: `"${fontFam}", sans-serif`, caretColor: primary }}
          />
        </div>
      </div>
    )
  }

  // ── BUTTON ─────────────────────────────────────────────────────────────────
  if (block.type === 'button') {
    return (
      <div
        className="w-full text-center py-2.5 text-sm font-semibold text-white cursor-text"
        style={{ background: primary, borderRadius: bRadius, fontFamily: `"${fontFam}", sans-serif` }}
        onClick={e => e.stopPropagation()}
      >
        <EditableText
          value={block.props.label ?? 'Submit'}
          placeholder="Button label"
          onCommit={v => onUpdateProps({ label: v })}
          style={{ color: 'white', fontWeight: 600, fontSize: '0.875rem' }}
        />
      </div>
    )
  }

  // ── CHECKBOX ───────────────────────────────────────────────────────────────
  if (block.type === 'checkbox') {
    return (
      <div className="flex items-start gap-2">
        <div
          onClick={e => { e.stopPropagation(); setChecked(v => !v) }}
          className="w-4 h-4 border-2 rounded shrink-0 mt-0.5 cursor-pointer flex items-center justify-center transition-colors"
          style={{ borderColor: checked ? primary : fBorder, background: checked ? primary : 'transparent' }}
        >
          {checked && (
            <svg viewBox="0 0 10 8" width="10" height="8" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 4l3 3 5-6" />
            </svg>
          )}
        </div>
        <EditableText
          value={block.props.label ?? 'Checkbox'}
          placeholder="Checkbox label"
          onCommit={v => onUpdateProps({ label: v })}
          style={labelStyle}
        />
      </div>
    )
  }

  // ── DROPDOWN ───────────────────────────────────────────────────────────────
  if (block.type === 'dropdown') {
    const options = (block.props.options as string[] | undefined) ?? []
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-0.5">
          <EditableText
            value={block.props.label ?? 'Select an option'}
            placeholder="Field label"
            onCommit={v => onUpdateProps({ label: v })}
            style={labelStyle}
          />
          {block.props.required && <span className="text-red-500 ml-0.5">*</span>}
        </div>
        <div className="flex items-center justify-between px-3 py-2.5 border text-sm text-gray-400" style={{ borderRadius: fRadius, borderColor: fBorder, background: '#fafafa', fontFamily: `"${fontFam}", sans-serif` }}>
          <span>{options[0] ?? 'Select…'}</span>
          <span className="text-gray-300">▾</span>
        </div>
        <OptionsEditor
          options={options}
          onChange={opts => onUpdateProps({ options: opts })}
        />
      </div>
    )
  }

  // ── RADIO ──────────────────────────────────────────────────────────────────
  if (block.type === 'radio') {
    const options = (block.props.options as string[] | undefined) ?? []
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-0.5">
          <EditableText
            value={block.props.label ?? 'Choose one'}
            placeholder="Question label"
            onCommit={v => onUpdateProps({ label: v })}
            style={labelStyle}
          />
          {block.props.required && <span className="text-red-500 ml-0.5">*</span>}
        </div>
        <div className="flex flex-col gap-1.5 pl-1">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2 text-sm" style={{ color: blockColor, fontFamily: `"${fontFam}", sans-serif` }}>
              <div className="w-3.5 h-3.5 rounded-full border-2 shrink-0" style={{ borderColor: fBorder }} />
              <span>{opt}</span>
            </div>
          ))}
          {options.length === 0 && <p className="text-xs text-gray-300 italic">No options yet</p>}
        </div>
        <OptionsEditor
          options={options}
          onChange={opts => onUpdateProps({ options: opts })}
          placeholder="Add radio option…"
        />
      </div>
    )
  }

  // ── DIVIDER ────────────────────────────────────────────────────────────────
  if (block.type === 'divider') {
    return <div className="py-2"><div className="h-px w-full bg-gray-200 dark:bg-gray-700" /></div>
  }

  // ── IMAGE ──────────────────────────────────────────────────────────────────
  if (block.type === 'image') {
    const [imgDragOver, setImgDragOver] = useState(false)
    const [resizing,    setResizing]    = useState(false)
    const [liveWidth,   setLiveWidth]   = useState<number | null>(null)
    const imgWrapRef = useRef<HTMLDivElement>(null)

    const imgWidth  = (block.props.imageWidth  as string | undefined) ?? '100%'
    const imgRotate = (block.props.imageRotate as number | undefined) ?? 0

    function handleImgDrop(e: React.DragEvent) {
      e.preventDefault()
      setImgDragOver(false)
      try {
        const raw = e.dataTransfer.getData('text/plain')
        const p = JSON.parse(raw)
        const src = p.src ?? p.props?.src ?? null
        if (src) {
          e.stopPropagation()
          onUpdateProps({ src })
        }
        // If no src found, let event bubble so block reorder can handle it
      } catch {}
    }

    function startResize(e: React.MouseEvent, sign: number) {
      e.preventDefault(); e.stopPropagation()
      const startX      = e.clientX
      const parentWidth = imgWrapRef.current?.parentElement?.offsetWidth ?? 400
      const startPct    = parseFloat(imgWidth)
      const startPx     = (startPct / 100) * parentWidth
      setResizing(true)
      function onMove(ev: MouseEvent) {
        const newPx = Math.max(40, Math.min(parentWidth, startPx + (ev.clientX - startX) * sign))
        const pct   = Math.round((newPx / parentWidth) * 100)
        setLiveWidth(pct)
        onUpdateProps({ imageWidth: `${pct}%` })
      }
      function onUp() {
        setResizing(false); setLiveWidth(null)
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    }

    const CORNERS: { key: string; style: React.CSSProperties; cursor: string; sign: number }[] = [
      { key: 'tl', style: { top: -5, left: -5 },     cursor: 'nwse-resize', sign: -1 },
      { key: 'tr', style: { top: -5, right: -5 },    cursor: 'nesw-resize', sign: 1  },
      { key: 'bl', style: { bottom: -5, left: -5 },  cursor: 'nesw-resize', sign: -1 },
      { key: 'br', style: { bottom: -5, right: -5 }, cursor: 'nwse-resize', sign: 1  },
    ]

    return (
      <div ref={imgWrapRef} style={{ width: imgWidth, margin: '0 auto', position: 'relative' }}>
        {block.props.src ? (
          <div
            onDragOver={e => { e.preventDefault(); setImgDragOver(true) }}
            onDragLeave={() => setImgDragOver(false)}
            onDrop={handleImgDrop}
            className={cn('relative rounded-lg overflow-hidden transition-all', imgDragOver && 'ring-2 ring-brand-400')}
          >
            <img
              src={block.props.src as string}
              alt={(block.props.alt as string) ?? ''}
              draggable={false}
              className="w-full block"
              style={{ transform: imgRotate ? `rotate(${imgRotate}deg)` : undefined }}
            />
            {imgDragOver && (
              <div className="absolute inset-0 bg-brand-500/20 flex items-center justify-center text-xs text-brand-700 font-medium">
                Drop to replace
              </div>
            )}
          </div>
        ) : (
          <div
            onDragOver={e => { e.preventDefault(); setImgDragOver(true) }}
            onDragLeave={() => setImgDragOver(false)}
            onDrop={handleImgDrop}
            className={cn(
              'flex items-center justify-center h-24 rounded-lg border-2 border-dashed text-xs transition-colors',
              imgDragOver
                ? 'border-brand-400 bg-brand-50/40 text-brand-500'
                : 'border-gray-200 dark:border-gray-700 text-gray-300',
            )}
          >
            {imgDragOver ? 'Drop image here' : 'Drag image here or use Images panel'}
          </div>
        )}

        {/* 4-corner resize handles */}
        {isSelected && CORNERS.map(c => (
          <div
            key={c.key}
            onMouseDown={e => startResize(e, c.sign)}
            style={{ position: 'absolute', ...c.style, cursor: c.cursor, zIndex: 30, width: 10, height: 10 }}
            className="bg-white border-2 border-brand-400 rounded-sm shadow"
          />
        ))}

        {/* Width badge while dragging */}
        {resizing && liveWidth !== null && (
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] font-mono px-1.5 py-0.5 rounded pointer-events-none whitespace-nowrap">
            {liveWidth}%
          </div>
        )}
      </div>
    )
  }

  // ── WHEEL OF FORTUNE ───────────────────────────────────────────────────────
  if (block.type === 'wheel_of_fortune') {
    const options = (block.props.options as string[] | undefined) ?? []
    return (
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-0.5" style={labelStyle}>
          <EditableText
            value={block.props.label ?? 'Spin to win!'}
            placeholder="Wheel heading"
            onCommit={v => onUpdateProps({ label: v })}
            style={{ ...labelStyle, fontWeight: 600, fontSize: '0.875rem' }}
          />
        </label>
        <WheelPreview options={options} />
        <OptionsEditor
          options={options}
          onChange={opts => onUpdateProps({ options: opts })}
          placeholder="Add new option…"
        />
      </div>
    )
  }

  // ── COUNTDOWN TIMER ────────────────────────────────────────────────────────
  if (block.type === 'countdown_timer') {
    return (
      <div className="flex flex-col items-center gap-2 py-1">
        <EditableText
          value={block.props.timerLabel ?? 'Offer ends in:'}
          placeholder="Timer label"
          onCommit={v => onUpdateProps({ timerLabel: v })}
          style={{ ...labelStyle, fontSize: '0.875rem', textAlign: 'center', display: 'block' }}
        />
        <div className="flex items-end gap-1.5">
          {(['Days', 'Hours', 'Mins', 'Secs'] as const).map((unit, i) => (
            <React.Fragment key={unit}>
              {i > 0 && <span className="text-xl font-bold mb-3" style={{ color: mutedCol }}>:</span>}
              <div className="flex flex-col items-center gap-1">
                <div className="w-12 h-11 rounded-lg flex items-center justify-center text-lg font-mono font-bold text-white" style={{ background: primary }}>
                  00
                </div>
                <span className="text-[9px] uppercase tracking-wider" style={{ color: mutedCol }}>{unit}</span>
              </div>
            </React.Fragment>
          ))}
        </div>
        <div className="flex flex-col gap-1 w-full mt-1" onClick={e => e.stopPropagation()}>
          <label className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: mutedCol }}>Target date &amp; time</label>
          <input
            type="datetime-local"
            value={(block.props.timerTarget as string) ?? ''}
            onChange={e => onUpdateProps({ timerTarget: e.target.value })}
            style={{ color: textCol, fontFamily: `"${fontFam}", sans-serif` }}
            className="text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-gray-50 dark:bg-white/[0.04] focus:outline-none focus:border-brand-400 w-full"
          />
        </div>
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


const FORM_QUICK_ADD: { type: BlockType; label: string; icon: React.ElementType; defaultProps: FormBlock['props'] }[] = [
  { type: 'text',       label: 'Text',    icon: Type,              defaultProps: { content: 'Add your text here', variant: 'body' } },
  { type: 'email',      label: 'Email',   icon: Mail,              defaultProps: { label: 'Email address', placeholder: 'Enter your email', required: true } },
  { type: 'phone',      label: 'Phone',   icon: Phone,             defaultProps: { label: 'Phone number', placeholder: '+1 555 000 0000', required: false } },
  { type: 'text_input', label: 'Input',   icon: Type,              defaultProps: { label: 'Your answer', placeholder: 'Type here…', required: false } },
  { type: 'button',     label: 'Button',  icon: MousePointerClick, defaultProps: { label: 'Submit', action: 'submit' } },
  { type: 'image',      label: 'Image',   icon: ImageIcon,         defaultProps: { src: '', alt: '' } },
  { type: 'divider',    label: 'Divider', icon: Minus,             defaultProps: {} },
]

// ── Sub-block inside a column cell ────────────────────────────────────────────

function SubBlockPreview({
  subBlock, theme, isSelected, onSelect, onMoveUp, onMoveDown, onDelete, onUpdateProps, onAddBelow,
}: {
  subBlock:      FormBlock
  theme:         FormTheme
  isSelected:    boolean
  onSelect:      () => void
  onMoveUp:      () => void
  onMoveDown:    () => void
  onDelete:      () => void
  onUpdateProps: (props: Partial<FormBlock['props']>) => void
  onAddBelow:    (type: BlockType, defaultProps: FormBlock['props']) => void
}) {
  const [showAddMenu, setShowAddMenu] = useState(false)
  useEffect(() => { if (!isSelected) setShowAddMenu(false) }, [isSelected])

  return (
    <div
      onClick={e => { e.stopPropagation(); onSelect(); setShowAddMenu(false) }}
      className={cn(
        'relative group/sub rounded transition-all',
        isSelected ? 'ring-2 ring-brand-400 dark:ring-brand-500' : 'hover:ring-1 hover:ring-gray-300 dark:hover:ring-gray-600',
      )}
    >
      <BlockContent block={subBlock} theme={theme} isSelected={isSelected} onUpdateProps={onUpdateProps} />

      {/* Hover-only delete (not selected) */}
      {!isSelected && (
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          className="absolute top-0.5 right-0.5 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover/sub:opacity-100 transition-opacity text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
          title="Delete"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}

      {isSelected && (
        <div
          className="absolute -top-3 right-0 flex items-center gap-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm px-1 py-0.5 z-10"
          onClick={e => e.stopPropagation()}
        >
          <button onClick={onMoveUp}   className="p-1 text-gray-400 hover:text-gray-600 rounded"><ChevronUp   className="w-3 h-3" /></button>
          <button onClick={onMoveDown} className="p-1 text-gray-400 hover:text-gray-600 rounded"><ChevronDown className="w-3 h-3" /></button>
          <button onClick={onDelete}   className="p-1 text-gray-400 hover:text-red-500 rounded"><Trash2 className="w-3 h-3" /></button>
        </div>
      )}

      {/* Add block below (inside column) */}
      <div
        className={cn('absolute -bottom-3.5 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center transition-opacity', isSelected ? 'opacity-100' : 'opacity-0 group-hover/sub:opacity-100')}
        onClick={e => e.stopPropagation()}
      >
        {showAddMenu && (
          <div className="absolute bottom-7 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-1.5 grid grid-cols-4 gap-1 w-48 whitespace-nowrap">
            {FORM_QUICK_ADD.map(item => (
              <button
                key={item.type + item.label}
                onClick={() => { onAddBelow(item.type, item.defaultProps); setShowAddMenu(false) }}
                className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-500/10 hover:text-brand-600 dark:hover:text-brand-400 text-gray-500 dark:text-gray-400 transition-colors"
              >
                <item.icon className="w-3.5 h-3.5" />
                <span className="text-[9px] font-semibold leading-tight">{item.label}</span>
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => setShowAddMenu(v => !v)}
          className={cn('w-6 h-6 rounded-full border-2 border-white flex items-center justify-center shadow-md transition-colors', showAddMenu ? 'bg-brand-500 text-white' : 'bg-white dark:bg-gray-800 text-brand-500 dark:text-brand-400 ring-1 ring-brand-300')}
          title="Add block below"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
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
  const ratio         = (block.props.ratio as ColumnRatio) ?? '1:1'
  const fracs         = RATIO_FRACS[ratio] ?? [1, 1]
  const total         = fracs.reduce((a, b) => a + b, 0)
  const columns       = (block.props.columns as FormBlock[][] | undefined) ?? fracs.map(() => [])
  const isSelected    = selectedBlockId === block.id
  const [dragOverCol, setDragOverCol] = useState<number | null>(null)
  const containerRef  = useRef<HTMLDivElement>(null)
  const divDragRef    = useRef<{ divIdx: number; startX: number; startWidths: number[]; containerW: number } | null>(null)

  // Use stored custom widths (flex-grow units) or derive from ratio
  const storedWidths  = block.props.columnWidths as number[] | undefined
  const colWidths     = storedWidths ?? fracs.map(f => Math.round((f / total) * 100))

  function handleDrop(e: React.DragEvent, colIdx: number) {
    e.preventDefault()
    setDragOverCol(null)
    try {
      const raw = e.dataTransfer.getData('text/plain')
      if (!raw) return
      const data = JSON.parse(raw) as { type?: BlockType; props?: FormBlock['props'] }
      if (data.type && data.type !== 'columns' && data.props) {
        e.stopPropagation()
        onAddToColumn(block.id, colIdx, { id: `b_${nanoid(8)}`, stepId: block.stepId, type: data.type, props: { ...data.props } })
      }
    } catch { /* not JSON (e.g. block reorder) — let event bubble */ }
  }

  function onDividerDown(e: React.PointerEvent<HTMLDivElement>, divIdx: number) {
    e.preventDefault(); e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    divDragRef.current = {
      divIdx,
      startX:      e.clientX,
      startWidths: [...colWidths],
      containerW:  containerRef.current?.offsetWidth ?? 400,
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
    onUpdateBlock(block.id, { columnWidths: next })
  }

  function onDividerUp(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.releasePointerCapture(e.pointerId)
    divDragRef.current = null
  }

  return (
    <div
      onClick={e => { e.stopPropagation(); onSelectBlock(block.id) }}
      className={cn(
        'relative group rounded-lg transition-all',
        isSelected ? 'ring-2 ring-brand-400 dark:ring-brand-500' : 'hover:ring-1 hover:ring-gray-300 dark:hover:ring-gray-600',
      )}
    >
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

      <div ref={containerRef} className="flex">
        {colWidths.map((w, colIdx) => {
          const colBlocks  = columns[colIdx] ?? []
          const isDropOver = dragOverCol === colIdx
          return (
            <React.Fragment key={colIdx}>
              {/* Draggable divider between columns */}
              {colIdx > 0 && (
                <div
                  onPointerDown={e => onDividerDown(e, colIdx - 1)}
                  onPointerMove={onDividerMove}
                  onPointerUp={onDividerUp}
                  onClick={e => e.stopPropagation()}
                  className="w-3 shrink-0 self-stretch flex items-center justify-center cursor-col-resize group/div z-10 touch-none select-none"
                >
                  <div className="w-1 h-8 rounded-full bg-gray-300 dark:bg-gray-600 group-hover/div:bg-brand-400 transition-colors" />
                </div>
              )}

              <div
                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setDragOverCol(colIdx) }}
                onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverCol(null) }}
                onDrop={e => handleDrop(e, colIdx)}
                className={cn(
                  'min-h-[80px] rounded-lg border border-dashed flex flex-col gap-2 p-2 transition-colors min-w-0',
                  isDropOver
                    ? 'border-brand-400 bg-brand-50/40 dark:border-brand-500/60 dark:bg-brand-500/5'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
                )}
                style={{ flex: `${w} 1 0%` }}
              >
                {colBlocks.length === 0 && !isDropOver && (
                  <div className="flex-1 flex items-center justify-center text-[10px] text-gray-300 dark:text-gray-600 select-none pointer-events-none">
                    Drop here
                  </div>
                )}

                {colBlocks.map((subBlock, sbIdx) => (
                  <SubBlockPreview
                    key={subBlock.id}
                    subBlock={subBlock}
                    theme={theme}
                    isSelected={selectedBlockId === subBlock.id}
                    onSelect={() => onSelectBlock(subBlock.id)}
                    onMoveUp={() => {
                      const updated = [...colBlocks]
                      if (sbIdx > 0) { [updated[sbIdx - 1], updated[sbIdx]] = [updated[sbIdx], updated[sbIdx - 1]] }
                      const newCols = [...columns]; newCols[colIdx] = updated
                      onUpdateBlock(block.id, { columns: newCols })
                    }}
                    onMoveDown={() => {
                      const updated = [...colBlocks]
                      if (sbIdx < updated.length - 1) { [updated[sbIdx], updated[sbIdx + 1]] = [updated[sbIdx + 1], updated[sbIdx]] }
                      const newCols = [...columns]; newCols[colIdx] = updated
                      onUpdateBlock(block.id, { columns: newCols })
                    }}
                    onDelete={() => {
                      const newCols = [...columns]
                      newCols[colIdx] = colBlocks.filter(b => b.id !== subBlock.id)
                      onUpdateBlock(block.id, { columns: newCols })
                    }}
                    onUpdateProps={props => onUpdateBlock(subBlock.id, props)}
                    onAddBelow={(type, defaultProps) => {
                      const newBlock: FormBlock = { id: `b_${nanoid(8)}`, stepId: block.stepId, type, props: { ...defaultProps } }
                      const updated = [...colBlocks]
                      updated.splice(sbIdx + 1, 0, newBlock)
                      const newCols = [...columns]; newCols[colIdx] = updated
                      onUpdateBlock(block.id, { columns: newCols })
                      onSelectBlock(newBlock.id)
                    }}
                  />
                ))}
              </div>
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

// ── Block wrapper (top-level, non-column) ─────────────────────────────────────

function BlockPreview({
  block, theme, isSelected, isDragging, onClick, onDelete, onMoveUp, onMoveDown,
  onUpdateProps, onAddBelow, onDragStart, onDragEnd, onDragOver, onDrop,
}: {
  block:         FormBlock
  theme:         FormTheme
  isSelected:    boolean
  isDragging:    boolean
  onClick:       () => void
  onDelete:      () => void
  onMoveUp:      () => void
  onMoveDown:    () => void
  onUpdateProps: (props: Partial<FormBlock['props']>) => void
  onAddBelow:    (type: BlockType, defaultProps: FormBlock['props']) => void
  onDragStart:   () => void
  onDragEnd:     () => void
  onDragOver:    (e: React.DragEvent) => void
  onDrop:        () => void
}) {
  const fontFam = theme.typography?.fontFamily ?? 'Inter'
  const [showAddMenu, setShowAddMenu] = useState(false)

  useEffect(() => { if (!isSelected) setShowAddMenu(false) }, [isSelected])

  return (
    <div
      draggable
      onClick={() => { onClick(); setShowAddMenu(false) }}
      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', block.id); onDragStart() }}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={e => { e.preventDefault(); onDrop() }}
      className={cn(
        'relative group rounded-lg transition-all',
        isSelected ? 'ring-2 ring-brand-400 dark:ring-brand-500' : 'hover:ring-1 hover:ring-gray-300 dark:hover:ring-gray-600',
        isDragging && 'opacity-30',
      )}
    >
      <div
        className={cn('absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing', isSelected && 'opacity-100')}
      >
        <GripVertical className="w-3 h-3 text-gray-300" />
      </div>

      <div style={{ fontFamily: `"${fontFam}", sans-serif` }}>
        <BlockContent block={block} theme={theme} isSelected={isSelected} onUpdateProps={onUpdateProps} />
      </div>

      {/* Hover-only delete icon (not selected state) */}
      {!isSelected && (
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          className="absolute top-0.5 right-0.5 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
          title="Delete block"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}

      {isSelected && (
        <div
          className="absolute -top-3 right-0 flex items-center gap-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm px-1 py-0.5"
          onClick={e => e.stopPropagation()}
        >
          {!(['image', 'divider', 'columns'] as string[]).includes(block.type) && (() => {
            const bold      = (block.props.bold      as boolean | undefined) ?? false
            const italic    = (block.props.italic    as boolean | undefined) ?? false
            const underline = (block.props.underline as boolean | undefined) ?? false
            const blockCol  = (block.props.textColor as string  | undefined) ?? (theme.colors?.text ?? '#111827')
            return (
              <>
                <button onClick={() => onUpdateProps({ bold: !bold })}           className={`p-1 rounded text-xs font-bold w-5 h-5 flex items-center justify-center ${bold      ? 'text-brand-500' : 'text-gray-400 hover:text-gray-600'}`}>B</button>
                <button onClick={() => onUpdateProps({ italic: !italic })}       className={`p-1 rounded text-xs italic  w-5 h-5 flex items-center justify-center ${italic    ? 'text-brand-500' : 'text-gray-400 hover:text-gray-600'}`}>I</button>
                <button onClick={() => onUpdateProps({ underline: !underline })} className={`p-1 rounded text-xs underline w-5 h-5 flex items-center justify-center ${underline ? 'text-brand-500' : 'text-gray-400 hover:text-gray-600'}`}>U</button>
                <label className="relative w-4 h-4 rounded-full border border-white dark:border-gray-700 overflow-hidden cursor-pointer shrink-0 shadow ring-1 ring-gray-200 dark:ring-gray-600" title="Text colour">
                  <div className="absolute inset-0" style={{ background: blockCol }} />
                  <input type="color" value={blockCol} onChange={e => onUpdateProps({ textColor: e.target.value })} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                </label>
                <div className="w-px h-3 bg-gray-200 dark:bg-gray-600 mx-0.5" />
              </>
            )
          })()}
          {block.type === 'text' && (() => {
            const align = (block.props.textAlign as 'left' | 'center' | 'right') ?? 'left'
            return (
              <>
                <button onClick={() => onUpdateProps({ textAlign: 'left' })}   className={`p-1 rounded ${align === 'left'   ? 'text-brand-500' : 'text-gray-400 hover:text-gray-600'}`}><AlignLeft   className="w-3 h-3" /></button>
                <button onClick={() => onUpdateProps({ textAlign: 'center' })} className={`p-1 rounded ${align === 'center' ? 'text-brand-500' : 'text-gray-400 hover:text-gray-600'}`}><AlignCenter className="w-3 h-3" /></button>
                <button onClick={() => onUpdateProps({ textAlign: 'right' })}  className={`p-1 rounded ${align === 'right'  ? 'text-brand-500' : 'text-gray-400 hover:text-gray-600'}`}><AlignRight  className="w-3 h-3" /></button>
                <div className="w-px h-3 bg-gray-200 dark:bg-gray-600 mx-0.5" />
              </>
            )
          })()}
          {block.type === 'image' && (() => {
            const rot = (block.props.imageRotate as number | undefined) ?? 0
            return (
              <>
                <button onClick={() => onUpdateProps({ imageRotate: (rot - 90 + 360) % 360 })} className="p-1 text-gray-400 hover:text-gray-600 rounded" title="Rotate left"><RotateCcw className="w-3 h-3" /></button>
                <button onClick={() => onUpdateProps({ imageRotate: (rot + 90) % 360 })}       className="p-1 text-gray-400 hover:text-gray-600 rounded" title="Rotate right"><RotateCw  className="w-3 h-3" /></button>
                <div className="w-px h-3 bg-gray-200 dark:bg-gray-600 mx-0.5" />
              </>
            )
          })()}
          <button onClick={onMoveUp}   className="p-1 text-gray-400 hover:text-gray-600 rounded"><ChevronUp   className="w-3 h-3" /></button>
          <button onClick={onMoveDown} className="p-1 text-gray-400 hover:text-gray-600 rounded"><ChevronDown className="w-3 h-3" /></button>
          <button onClick={onDelete}   className="p-1 text-gray-400 hover:text-red-500 rounded"><Trash2 className="w-3 h-3" /></button>
        </div>
      )}

      {/* ── Add block below ── */}
      <div
        className={cn('absolute -bottom-3.5 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center transition-opacity', (isSelected) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}
        onClick={e => e.stopPropagation()}
      >
        {showAddMenu && (
          <div className="absolute bottom-7 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-1.5 grid grid-cols-4 gap-1 w-48 whitespace-nowrap">
            {FORM_QUICK_ADD.map(item => (
              <button
                key={item.type + item.label}
                onClick={() => { onAddBelow(item.type, item.defaultProps); setShowAddMenu(false) }}
                className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-500/10 hover:text-brand-600 dark:hover:text-brand-400 text-gray-500 dark:text-gray-400 transition-colors"
              >
                <item.icon className="w-3.5 h-3.5" />
                <span className="text-[9px] font-semibold leading-tight">{item.label}</span>
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => setShowAddMenu(v => !v)}
          className={cn('w-6 h-6 rounded-full border-2 border-white flex items-center justify-center shadow-md transition-colors', showAddMenu ? 'bg-brand-500 text-white' : 'bg-white dark:bg-gray-800 text-brand-500 dark:text-brand-400 ring-1 ring-brand-300')}
          title="Add block below"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
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
  onReorderBlock:  (draggedId: string, insertBeforeId: string | null) => void
  onAddToColumn:   (columnBlockId: string, colIdx: number, block: FormBlock) => void
  onAddBelow:      (afterBlockId: string, type: BlockType, defaultProps: FormBlock['props']) => void
  theme:           FormTheme
  formType:        FormType
  previewDevice:   'desktop' | 'mobile'
}

const SYSTEM_FONTS = new Set(['Inter', 'Georgia'])

export function FormCanvas({
  blocks, selectedBlockId, onSelectBlock, onUpdateBlock, onDeleteBlock, onMoveBlock,
  onReorderBlock, onAddToColumn, onAddBelow, theme, formType, previewDevice,
}: Props) {
  const bg             = theme.colors?.background      ?? '#ffffff'
  const bgImage        = theme.colors?.backgroundImage ?? ''
  const radius         = theme.modal?.radius            ?? '8px'
  const fontFam        = theme.typography?.fontFamily        ?? 'Inter'
  const headingFontFam = theme.typography?.headingFontFamily ?? fontFam
  const themeImgPos    = theme.imagePosition           ?? 'top'
  const imgPos         = previewDevice === 'mobile' ? 'top' : themeImgPos
  const themeWidth     = theme.modal?.width            ?? '520px'
  const width          = previewDevice === 'mobile' ? '360px' : themeWidth

  useEffect(() => {
    const fontsToLoad = [...new Set([fontFam, headingFontFam])]
    fontsToLoad.forEach(font => {
      if (SYSTEM_FONTS.has(font)) return
      const id = `gfont-${font.replace(/\s+/g, '-')}`
      if (document.getElementById(id)) return
      const link = document.createElement('link')
      link.id   = id
      link.rel  = 'stylesheet'
      link.href = `https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}:wght@400;500;600;700&display=swap`
      document.head.appendChild(link)
    })
  }, [fontFam, headingFontFam])

  // Extract layout image block (the first image block with a src) for non-stacked layouts
  const layoutImgIdx   = blocks.findIndex(b => b.type === 'image' && b.props.src)
  const layoutImgBlock = layoutImgIdx >= 0 ? blocks[layoutImgIdx] : null
  const layoutImgSrc   = layoutImgBlock ? (layoutImgBlock.props.src as string) : null
  // Content blocks = everything except the layout image
  const contentBlocks  = layoutImgBlock ? blocks.filter((_, i) => i !== layoutImgIdx) : blocks
  const isImgSel       = layoutImgBlock ? selectedBlockId === layoutImgBlock.id : false

  // ── Block reorder drag state ──────────────────────────────────────────────
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null)
  const [insertBefore,    setInsertBefore]    = useState<string | null>(null) // null = end

  function handleBlockDragStart(id: string) {
    setDraggingBlockId(id)
  }
  function handleBlockDragEnd() {
    setDraggingBlockId(null)
    setInsertBefore(null)
  }
  function handleBlockDragOver(blockId: string, e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    if (e.clientY < rect.top + rect.height / 2) {
      setInsertBefore(blockId)
    } else {
      const idx  = contentBlocks.findIndex(b => b.id === blockId)
      const next = contentBlocks[idx + 1]
      setInsertBefore(next?.id ?? null)
    }
  }
  function handleBlockDrop() {
    if (draggingBlockId !== null) onReorderBlock(draggingBlockId, insertBefore)
    setDraggingBlockId(null)
    setInsertBefore(null)
  }

  // ── Drag-to-reposition for side image panels ──────────────────────────────
  const [dragOverLayout, setDragOverLayout] = useState(false)

  function extractDropUrl(e: React.DragEvent): string | null {
    try {
      const raw = e.dataTransfer.getData('text/plain')
      const p = JSON.parse(raw)
      return p.src ?? p.props?.src ?? null
    } catch { return null }
  }

  function handleLayoutDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOverLayout(false)
    const url = extractDropUrl(e)
    if (url && layoutImgBlock) onUpdateBlock(layoutImgBlock.id, { src: url })
  }

  const imgPanelRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragState = useRef<{
    startX: number; startY: number
    startObjX: number; startObjY: number
    containerW: number; containerH: number
  } | null>(null)

  const desktopObjPos = (layoutImgBlock?.props.objectPosition       as string | undefined)
    ?? theme.imageObjectPosition
    ?? 'center top'
  const mobileObjPos  = (layoutImgBlock?.props.objectPositionMobile as string | undefined)
    ?? 'center top'
  const isMobilePreview = previewDevice === 'mobile'
  const storedObjPos    = isMobilePreview ? mobileObjPos : desktopObjPos
  const objPosField     = isMobilePreview ? 'objectPositionMobile' : 'objectPosition'

  // Parse "55% 20%" → [55, 20]; handle keywords like "center top"
  function parseObjPos(pos: string): [number, number] {
    const kw: Record<string, number> = { left: 0, center: 50, right: 100, top: 0, bottom: 100 }
    const parts = pos.trim().split(/\s+/)
    const px = parseFloat(parts[0]); const py = parts[1] !== undefined ? parseFloat(parts[1]) : NaN
    const x = parts[0] in kw ? kw[parts[0]] : (isNaN(px) ? 50 : px)
    const y = parts[1] !== undefined
      ? (parts[1] in kw ? kw[parts[1]] : (isNaN(py) ? 50 : py))
      : 50
    return [x, y]
  }


  function onImgPanelMouseDown(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    onSelectBlock(layoutImgBlock!.id)
    const [ox, oy] = parseObjPos(storedObjPos)
    dragState.current = {
      startX: e.clientX, startY: e.clientY,
      startObjX: ox, startObjY: oy,
      containerW: imgPanelRef.current?.offsetWidth  || 200,
      containerH: imgPanelRef.current?.offsetHeight || 400,
    }
    setIsDragging(true)
  }

  useEffect(() => {
    if (!isDragging || !dragState.current || !layoutImgBlock) return
    function onMove(e: MouseEvent) {
      if (!dragState.current) return
      const { startX, startY, startObjX, startObjY, containerW, containerH } = dragState.current
      // Dragging right reveals the left portion → subtract from X
      const newX = Math.max(0, Math.min(100, startObjX - ((e.clientX - startX) / containerW) * 100))
      const newY = Math.max(0, Math.min(100, startObjY - ((e.clientY - startY) / containerH) * 100))
      if (layoutImgBlock) onUpdateBlock(layoutImgBlock.id, { [objPosField]: `${Math.round(newX)}% ${Math.round(newY)}%` })
    }
    function onUp() {
      setIsDragging(false)
      dragState.current = null
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [isDragging, layoutImgBlock, onUpdateBlock])

  function renderBlock(block: FormBlock) {
    return block.type === 'columns' ? (
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
      <React.Fragment key={block.id}>
        {draggingBlockId && draggingBlockId !== block.id && insertBefore === block.id && (
          <div className="h-[3px] bg-brand-400 rounded-full mx-1 my-0.5 pointer-events-none" />
        )}
        <BlockPreview
          block={block}
          theme={theme}
          isSelected={selectedBlockId === block.id}
          isDragging={draggingBlockId === block.id}
          onClick={() => onSelectBlock(block.id)}
          onDelete={() => onDeleteBlock(block.id)}
          onMoveUp={() => onMoveBlock(block.id, 'up')}
          onMoveDown={() => onMoveBlock(block.id, 'down')}
          onUpdateProps={props => onUpdateBlock(block.id, props)}
          onAddBelow={(type, defaultProps) => onAddBelow(block.id, type, defaultProps)}
          onDragStart={() => handleBlockDragStart(block.id)}
          onDragEnd={handleBlockDragEnd}
          onDragOver={e => handleBlockDragOver(block.id, e)}
          onDrop={handleBlockDrop}
        />
      </React.Fragment>
    )
  }

  // × button rendered OUTSIDE the card (above overflow-hidden boundary)
  const closeBtn = (formType === 'popup' || formType === 'flyout') ? (
    <button className="absolute -top-3.5 -right-3.5 z-40 w-7 h-7 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-md flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm font-bold transition-colors">
      ×
    </button>
  ) : null

  const emptyState = (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="w-10 h-10 rounded-full border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center">
        <Plus className="w-4 h-4 text-gray-300" />
      </div>
      <p className="text-sm text-gray-400">Click an item in the left panel to add it here</p>
    </div>
  )

  const outerCls = "flex-1 overflow-auto [&::-webkit-scrollbar]:hidden flex flex-col px-6 pt-8 pb-[25%]"
  const SHADOW_MAP: Record<string, string> = {
    none:   'none',
    small:  '0 2px 8px rgba(0,0,0,0.08)',
    medium: '0 8px 30px rgba(0,0,0,0.14)',
    large:  '0 20px 60px rgba(0,0,0,0.22)',
  }
  const shadowVal = SHADOW_MAP[theme.modal?.shadow ?? 'medium'] ?? SHADOW_MAP.medium
  const cardBase: React.CSSProperties = { borderRadius: radius, boxShadow: shadowVal }

  // ── BACKGROUND layout ──────────────────────────────────────────────────────
  if (imgPos === 'background' && layoutImgSrc) {
    return (
      <div className={outerCls} onClick={() => onSelectBlock(null)}>
        <div className="relative" style={{ width, margin: 'auto', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          {closeBtn}
          <div className="w-full shadow-xl relative overflow-hidden" style={cardBase}>
          <img src={layoutImgSrc} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.42)' }} />
          {/* Clickable + droppable overlay to select / replace the background image block */}
          <div
            onClick={e => { e.stopPropagation(); onSelectBlock(layoutImgBlock!.id) }}
            onDragOver={e => { e.preventDefault(); setDragOverLayout(true) }}
            onDragLeave={() => setDragOverLayout(false)}
            onDrop={handleLayoutDrop}
            className={cn('absolute inset-0 z-10 cursor-pointer transition-all', isImgSel ? 'ring-2 ring-inset ring-brand-400' : 'hover:bg-white/5', dragOverLayout && 'ring-2 ring-inset ring-brand-400 bg-brand-500/10')}
            title="Drop image to replace · Click to select"
          >
            {dragOverLayout && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="bg-brand-600 text-white text-xs font-semibold px-3 py-1 rounded-full shadow">Drop to replace</span>
              </div>
            )}
          </div>
          {isImgSel && (
            <button
              onClick={e => { e.stopPropagation(); onDeleteBlock(layoutImgBlock!.id) }}
              className="absolute top-10 right-3 z-20 w-6 h-6 rounded bg-white/90 flex items-center justify-center text-red-400 hover:text-red-600 shadow"
              title="Remove background image"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
          <div className="relative z-20 px-6 py-6 space-y-3" style={{ backgroundColor: bg }}>
            {contentBlocks.length === 0 ? emptyState : contentBlocks.map(renderBlock)}
          </div>
          </div>{/* end card */}
        </div>{/* end wrapper */}
      </div>
    )
  }

  // ── LEFT / RIGHT layout ────────────────────────────────────────────────────
  if ((imgPos === 'left' || imgPos === 'right') && layoutImgSrc) {
    const imgPanel = (
      <div
        ref={imgPanelRef}
        className={cn(
          'w-[40%] shrink-0 relative self-stretch overflow-hidden select-none',
          isDragging ? 'cursor-grabbing' : 'cursor-grab',
          isImgSel && 'ring-2 ring-inset ring-brand-400',
          dragOverLayout && 'ring-2 ring-inset ring-brand-400',
        )}
        onMouseDown={onImgPanelMouseDown}
        onDragOver={e => { e.preventDefault(); setDragOverLayout(true) }}
        onDragLeave={() => setDragOverLayout(false)}
        onDrop={handleLayoutDrop}
        title="Drop image to replace · Drag to reposition"
      >
        <img
          src={layoutImgSrc}
          alt=""
          draggable={false}
          className="w-full h-full object-cover pointer-events-none"
          style={{ objectPosition: storedObjPos }}
        />
        {isImgSel && !isDragging && (
          <div className="absolute inset-0 bg-brand-500/5 pointer-events-none" />
        )}
        {/* Hint label */}
        {!isDragging && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/55 text-white text-[10px] font-medium px-2.5 py-1 rounded-full pointer-events-none whitespace-nowrap opacity-0 group-hover/img:opacity-100 transition-opacity">
            Drag to reposition
          </div>
        )}
        {isDragging && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[10px] font-medium px-2.5 py-1 rounded-full pointer-events-none whitespace-nowrap">
            {storedObjPos}
          </div>
        )}
        {dragOverLayout && !isDragging && (
          <div className="absolute inset-0 bg-brand-500/20 flex items-center justify-center pointer-events-none">
            <span className="bg-brand-600 text-white text-xs font-semibold px-3 py-1 rounded-full shadow">Drop to replace</span>
          </div>
        )}
      </div>
    )

    const formPanel = (
      <div className="w-[60%] shrink-0 px-6 py-6 space-y-3 min-w-0 relative overflow-y-auto" style={{ backgroundColor: bg }}>
        {contentBlocks.length === 0 ? emptyState : contentBlocks.map(renderBlock)}
      </div>
    )

    return (
      <div className={outerCls} onClick={() => onSelectBlock(null)}>
        <div className="relative" style={{ width, margin: 'auto', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          {closeBtn}
          <div className="group/img w-full shadow-xl overflow-hidden flex" style={cardBase}>
            {imgPos === 'left'  && imgPanel}
            {formPanel}
            {imgPos === 'right' && imgPanel}
          </div>
        </div>
      </div>
    )
  }

  // ── TOP layout (default) ───────────────────────────────────────────────────
  // Render the first image with a src as a full-bleed header, remaining blocks below
  return (
    <div className={outerCls} onClick={() => onSelectBlock(null)}>
      <div className="relative" style={{ width, margin: 'auto', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
        {closeBtn}
        <div
          className="w-full shadow-xl relative overflow-hidden"
          style={{
            ...cardBase,
            backgroundColor:    bg,
            backgroundImage:    bgImage ? `url(${bgImage})` : undefined,
            backgroundSize:     'cover',
            backgroundPosition: theme.colors?.backgroundImagePosition ?? 'center center',
          }}
        >

        {/* Full-bleed top image */}
        {layoutImgSrc && (
          <div
            ref={imgPanelRef}
            className={cn('group/img relative overflow-hidden', isImgSel && 'ring-2 ring-inset ring-brand-400', dragOverLayout && 'ring-2 ring-inset ring-brand-400', isDragging ? 'cursor-grabbing' : 'cursor-grab')}
            style={{ height: 200 }}
            onClick={e => { e.stopPropagation(); onSelectBlock(layoutImgBlock!.id) }}
            onMouseDown={onImgPanelMouseDown}
            onDragOver={e => { e.preventDefault(); setDragOverLayout(true) }}
            onDragLeave={() => setDragOverLayout(false)}
            onDrop={handleLayoutDrop}
            title="Drag to reposition · Drop image to replace"
          >
            <img src={layoutImgSrc} alt="" draggable={false} className="w-full h-full object-cover pointer-events-none" style={{ objectPosition: storedObjPos }} />
            {isImgSel && <div className="absolute inset-0 bg-brand-500/10 pointer-events-none" />}
            {!isDragging && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/55 text-white text-[10px] font-medium px-2.5 py-1 rounded-full pointer-events-none whitespace-nowrap opacity-0 group-hover/img:opacity-100 transition-opacity">
                {isMobilePreview ? 'Drag to reposition (mobile)' : 'Drag to reposition'}
              </div>
            )}
            {isDragging && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[10px] font-medium px-2.5 py-1 rounded-full pointer-events-none whitespace-nowrap">
                {storedObjPos}
              </div>
            )}
            {dragOverLayout && (
              <div className="absolute inset-0 bg-brand-500/20 flex items-center justify-center pointer-events-none">
                <span className="bg-brand-600 text-white text-xs font-semibold px-3 py-1 rounded-full shadow">Drop to replace</span>
              </div>
            )}
            {isImgSel && (
              <button
                onClick={e => { e.stopPropagation(); onDeleteBlock(layoutImgBlock!.id) }}
                className="absolute top-2 right-2 z-10 w-6 h-6 rounded bg-white/90 flex items-center justify-center text-red-400 hover:text-red-600 shadow"
                title="Remove image"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        <div className="px-6 py-6 space-y-3" style={{ backgroundColor: bg }}>
          {blocks.length === 0
            ? emptyState
            : contentBlocks.map(renderBlock)
          }
        </div>
        </div>{/* end card */}
      </div>{/* end wrapper */}
    </div>
  )
}
