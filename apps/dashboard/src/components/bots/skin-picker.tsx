'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { SKINS } from '@/lib/skins'
import type { Skin } from '@/lib/skins'

// ── Types ──────────────────────────────────────────────────────────────────

interface CustomSkinSlot {
  id: 'custom'
  name: string
  description: string
}

type SkinEntry = Skin | CustomSkinSlot

const ALL_ENTRIES: SkinEntry[] = [
  ...SKINS,
  { id: 'custom', name: 'Custom', description: 'Pick your own brand colours' },
]

// ── Props ──────────────────────────────────────────────────────────────────

interface SkinPickerProps {
  defaultSkin:        string
  defaultAccentColor: string
  defaultHeaderColor: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

function isRealSkin(entry: SkinEntry): entry is Skin {
  return entry.id !== 'custom'
}

function getPreviewVars(entry: SkinEntry, accentColor: string, headerColor: string) {
  if (isRealSkin(entry)) {
    return entry.preview
  }
  // Custom: derive from light skin + overrides
  return {
    headerBg:   headerColor || '#1a1a1a',
    chatBg:     '#ffffff',
    accent:     accentColor || '#ec732e',
    userBubble: accentColor || '#ec732e',
    botBubble:  '#f3f4f6',
    text:       '#111827',
  }
}

// ── Widget Preview ─────────────────────────────────────────────────────────

function WidgetPreview({
  headerBg,
  chatBg,
  accent,
  userBubble,
  botBubble,
  text,
}: {
  headerBg:   string
  chatBg:     string
  accent:     string
  userBubble: string
  botBubble:  string
  text:       string
}) {
  // Determine text colour on header (light vs dark)
  const headerText = isLight(headerBg) ? '#111827' : '#f9fafb'
  const userText   = isLight(userBubble) ? '#111827' : '#ffffff'
  const botText    = text

  return (
    <div
      className="w-full rounded-2xl overflow-hidden shadow-lg border"
      style={{ borderColor: isLight(chatBg) ? '#e5e7eb' : '#3a3a3a' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-b"
        style={{
          background:   headerBg,
          borderColor:  isLight(headerBg) ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
        }}
      >
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: accent }} />
        <span className="text-xs font-semibold flex-1" style={{ color: headerText }}>
          Bot · Online
        </span>
        {/* Window controls */}
        <div className="flex gap-1.5">
          {['⧉', '–', '×'].map((icon) => (
            <div
              key={icon}
              className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold"
              style={{ color: headerText, opacity: 0.5, background: 'rgba(128,128,128,0.15)' }}
            >
              {icon}
            </div>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="px-4 py-4 space-y-3" style={{ background: chatBg }}>
        {/* Bot bubble */}
        <div className="flex items-end gap-2">
          <div
            className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold"
            style={{ background: accent, color: isLight(accent) ? '#111' : '#fff' }}
          >
            AI
          </div>
          <div
            className="rounded-2xl rounded-bl-sm px-3 py-2 text-xs leading-relaxed max-w-[75%]"
            style={{ background: botBubble, color: botText }}
          >
            Hi there! How can I help you today?
          </div>
        </div>

        {/* User bubble */}
        <div className="flex justify-end">
          <div
            className="rounded-2xl rounded-br-sm px-3 py-2 text-xs leading-relaxed max-w-[65%]"
            style={{ background: userBubble, color: userText }}
          >
            I have a question about pricing.
          </div>
        </div>

        {/* Bot bubble 2 */}
        <div className="flex items-end gap-2">
          <div
            className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold"
            style={{ background: accent, color: isLight(accent) ? '#111' : '#fff' }}
          >
            AI
          </div>
          <div
            className="rounded-2xl rounded-bl-sm px-3 py-2 text-xs leading-relaxed max-w-[75%]"
            style={{ background: botBubble, color: botText }}
          >
            Sure! Our plans start from $29/month. What are you looking for?
          </div>
        </div>
      </div>

      {/* Input bar */}
      <div
        className="flex items-center gap-2 px-3 py-3 border-t"
        style={{
          background:  chatBg,
          borderColor: isLight(chatBg) ? '#e5e7eb' : '#3a3a3a',
        }}
      >
        <div
          className="flex-1 rounded-lg px-3 py-2 text-xs"
          style={{
            background:  isLight(chatBg) ? '#f9fafb' : 'rgba(255,255,255,0.06)',
            border:      `1px solid ${isLight(chatBg) ? '#d1d5db' : 'rgba(255,255,255,0.1)'}`,
            color:       isLight(chatBg) ? '#9ca3af' : 'rgba(255,255,255,0.3)',
          }}
        >
          Ask anything…
        </div>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: accent }}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke={isLight(accent) ? '#111' : '#fff'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </div>
      </div>
    </div>
  )
}

// ── Luminance helper ───────────────────────────────────────────────────────

function isLight(hex: string): boolean {
  if (!hex || !hex.startsWith('#')) return true
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 128
}

// ── Main component ─────────────────────────────────────────────────────────

export function SkinPicker({ defaultSkin, defaultAccentColor, defaultHeaderColor }: SkinPickerProps) {
  const defaultIdx = Math.max(
    0,
    ALL_ENTRIES.findIndex((s) => s.id === defaultSkin),
  )

  const [idx,         setIdx]         = useState(defaultIdx)
  const [accentColor, setAccentColor] = useState(defaultAccentColor || '#ec732e')
  const [headerColor, setHeaderColor] = useState(defaultHeaderColor || '#1a1a1a')

  const current  = ALL_ENTRIES[idx]
  const isCustom = current.id === 'custom'
  const prev     = () => setIdx((i) => (i - 1 + ALL_ENTRIES.length) % ALL_ENTRIES.length)
  const next     = () => setIdx((i) => (i + 1) % ALL_ENTRIES.length)

  const pv = getPreviewVars(current, accentColor, headerColor)

  return (
    <div className="space-y-4">
      {/* Carousel */}
      <div className="flex items-center gap-4">
        {/* Prev arrow */}
        <button
          type="button"
          onClick={prev}
          className="flex-shrink-0 w-9 h-9 rounded-full border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 flex items-center justify-center transition-colors"
          aria-label="Previous skin"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>

        {/* Preview */}
        <div className="flex-1">
          <WidgetPreview
            headerBg={pv.headerBg}
            chatBg={pv.chatBg}
            accent={pv.accent}
            userBubble={pv.userBubble}
            botBubble={pv.botBubble}
            text={pv.text}
          />
        </div>

        {/* Next arrow */}
        <button
          type="button"
          onClick={next}
          className="flex-shrink-0 w-9 h-9 rounded-full border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 flex items-center justify-center transition-colors"
          aria-label="Next skin"
        >
          <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Skin name + dots indicator */}
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{current.name}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {isRealSkin(current) ? current.description : 'Pick your own brand colours below'}
        </p>
        <div className="flex gap-1.5 mt-1">
          {ALL_ENTRIES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setIdx(i)}
              className="rounded-full transition-all"
              style={{
                width:      i === idx ? 20 : 8,
                height:     8,
                background: i === idx ? '#ec732e' : '#d1d5db',
              }}
              aria-label={s.name}
            />
          ))}
        </div>
      </div>

      {/* Custom colour pickers */}
      {isCustom && (
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Accent colour
              <span className="block text-gray-400 font-normal">Launcher, send button, user bubbles</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-gray-300 dark:border-white/10 cursor-pointer p-0.5 bg-transparent"
              />
              <span className="text-sm font-mono text-gray-600 dark:text-gray-400">{accentColor}</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Header colour
              <span className="block text-gray-400 font-normal">Widget header background</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={headerColor}
                onChange={(e) => setHeaderColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-gray-300 dark:border-white/10 cursor-pointer p-0.5 bg-transparent"
              />
              <span className="text-sm font-mono text-gray-600 dark:text-gray-400">{headerColor}</span>
            </div>
          </div>
        </div>
      )}

      {/* Hidden form inputs */}
      <input type="hidden" name="widget_skin"         value={current.id} />
      <input type="hidden" name="widget_accent_color" value={isCustom ? accentColor : ''} />
      <input type="hidden" name="widget_header_color"  value={isCustom ? headerColor : ''} />
    </div>
  )
}
