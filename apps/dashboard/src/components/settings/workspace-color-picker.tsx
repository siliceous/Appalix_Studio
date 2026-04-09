'use client'

import { useState, useTransition } from 'react'
import { updateBranding } from '@/app/actions/workspace-branding'

const ACCENT_PRESETS = [
  { label: 'Light',    hex: '#141C2B' },
  { label: 'Happy',    hex: '#6b4aad' },
  { label: 'Indigo',   hex: '#4338ca' },
  { label: 'Blue',     hex: '#1d4ed8' },
  { label: 'Teal',     hex: '#0d9488' },
  { label: 'Emerald',  hex: '#059669' },
  { label: 'Rose',     hex: '#e11d48' },
  { label: 'Orange',   hex: '#ea580c' },
  { label: 'Slate',    hex: '#475569' },
  { label: 'Black',    hex: '#111111' },
]

const CARD_PRESETS = [
  { label: 'Default (Light & Happy)', hex: '#ffffff' },
  { label: 'Warm White',    hex: '#fafaf8' },
  { label: 'Soft Gray',     hex: '#f9fafb' },
  { label: 'Cream',         hex: '#fefce8' },
  { label: 'Pale Blue',     hex: '#f0f7ff' },
  { label: 'Pale Lavender', hex: '#f5f3ff' },
  { label: 'Pale Green',    hex: '#f0fdf4' },
  { label: 'Pale Rose',     hex: '#fff1f2' },
  { label: 'Slate 50',      hex: '#f8fafc' },
  { label: 'Stone 50',      hex: '#fafaf9' },
]

const BG_PRESETS = [
  { label: 'Default (Light & Happy)', hex: '#f5f4f1' },
  { label: 'Light Blue',    hex: '#e8f0fe' },
  { label: 'Soft Lavender', hex: '#f0ebff' },
  { label: 'Mint',          hex: '#e6f7f1' },
  { label: 'Blush',         hex: '#fdf0f0' },
  { label: 'Warm White',    hex: '#fafaf8' },
  { label: 'Cool Gray',     hex: '#f1f5f9' },
  { label: 'Light Yellow',  hex: '#fffbeb' },
  { label: 'White',         hex: '#ffffff' },
  { label: 'Dark',          hex: '#1c1c1c' },
]

function applyCssVar(cssVar: string | undefined, color: string | null) {
  if (!cssVar) return
  if (color && /^#[0-9a-fA-F]{6}$/.test(color)) {
    document.documentElement.style.setProperty(cssVar, color)
  } else {
    document.documentElement.style.removeProperty(cssVar)
  }
}

function ColorRow({
  label,
  description,
  presets,
  initial,
  nullable,
  cssVar,
  onSave,
}: {
  label:       string
  description: string
  presets:     { label: string; hex: string }[]
  initial:     string
  nullable?:   boolean
  cssVar?:     string
  onSave:      (color: string | null) => Promise<{ ok: boolean }>
}) {
  const [color,   setColor]   = useState(initial)
  const [hex,     setHex]     = useState(initial)
  const [status,  setStatus]  = useState<'idle' | 'saved' | 'error'>('idle')
  const [pending, startTransition] = useTransition()

  function pick(value: string) {
    setColor(value)
    setHex(value)
  }

  function handleHexChange(value: string) {
    setHex(value)
    if (/^#[0-9a-fA-F]{6}$/.test(value)) setColor(value)
  }

  function save() {
    startTransition(async () => {
      const result = await onSave(color)
      if (result.ok) {
        applyCssVar(cssVar, color)
        setStatus('saved')
        setTimeout(() => setStatus('idle'), 2000)
      } else {
        setStatus('error')
      }
    })
  }

  function reset() {
    const resetColor = null
    setColor('#f5f4f1')
    setHex('#f5f4f1')
    startTransition(async () => {
      const result = await onSave(resetColor)
      if (result.ok) {
        applyCssVar(cssVar, resetColor)
        setStatus('saved')
        setTimeout(() => setStatus('idle'), 2000)
      } else {
        setStatus('error')
      }
    })
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>

      <div className="flex flex-wrap gap-2">
        {presets.map(p => {
          const isActive = color.toLowerCase() === p.hex.toLowerCase()
          const isLight  = ['#ffffff', '#fafaf8', '#fafaf9', '#f9fafb', '#f8fafc', '#fafaf7'].includes(p.hex.toLowerCase())
          return (
            <button
              key={p.hex}
              title={p.label}
              onClick={() => pick(p.hex)}
              style={{ background: p.hex, outline: isActive ? '2px solid #6b7280' : undefined, outlineOffset: isActive ? '2px' : undefined }}
              className={`relative w-7 h-7 rounded-full transition-all ${
                isActive ? 'scale-110' : 'hover:scale-105'
              } ${isLight ? 'border border-gray-200 dark:border-white/20' : ''}`}
            >
              {isActive && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke={isLight ? '#374151' : '#ffffff'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full border border-gray-200 dark:border-white/10 shrink-0" style={{ background: color }} />
        <input
          type="text"
          value={hex}
          onChange={e => handleHexChange(e.target.value)}
          maxLength={7}
          placeholder="#f5f4f1"
          className="w-28 px-2.5 py-1.5 text-xs font-mono border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-[#1c1c1c] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          onClick={save}
          disabled={pending}
          className="px-3 py-1.5 text-xs font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:opacity-80 transition-opacity disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Save'}
        </button>
        {nullable && (
          <button onClick={reset} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
            Reset
          </button>
        )}
        {status === 'saved' && (
          <span className="text-xs text-emerald-600 dark:text-emerald-400">Saved ✓</span>
        )}
        {status === 'error' && (
          <span className="text-xs text-red-500">Failed to save</span>
        )}
      </div>
    </div>
  )
}

export function WorkspaceColorPicker({
  initialColor,
  initialBgColor,
  initialCardColor,
}: {
  initialColor:     string
  initialBgColor:   string | null
  initialCardColor: string | null
}) {
  return (
    <div className="space-y-5">
      <ColorRow
        label="Workspace accent colour"
        description="Used for header bars in Sage Branding, Brand IDs, and the email builder."
        presets={ACCENT_PRESETS}
        initial={initialColor || '#141C2B'}
        onSave={color => updateBranding({ primary_color: color ?? '#141C2B' })}
      />
      <div className="border-t dark:border-white/10" />
      <ColorRow
        label="Dashboard background colour"
        description="The background colour of the main dashboard area."
        presets={BG_PRESETS}
        initial={initialBgColor || '#f5f4f1'}
        nullable
        cssVar="--ws-bg"
        onSave={color => updateBranding({ background_color: color })}
      />
      <div className="border-t dark:border-white/10" />
      <ColorRow
        label="Card background colour"
        description="The background colour of panels and cards throughout the dashboard."
        presets={CARD_PRESETS}
        initial={initialCardColor || '#ffffff'}
        nullable
        cssVar="--ws-card"
        onSave={color => updateBranding({ card_color: color })}
      />
    </div>
  )
}
