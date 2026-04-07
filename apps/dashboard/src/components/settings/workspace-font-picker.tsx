'use client'

import { useState, useTransition } from 'react'
import { updateBranding } from '@/app/actions/workspace-branding'

const FONTS = [
  { label: 'System Default', value: '',                  sample: 'Aa' },
  { label: 'Inter',          value: 'Inter',             sample: 'Aa' },
  { label: 'Poppins',        value: 'Poppins',           sample: 'Aa' },
  { label: 'Nunito',         value: 'Nunito',            sample: 'Aa' },
  { label: 'Raleway',        value: 'Raleway',           sample: 'Aa' },
  { label: 'Montserrat',     value: 'Montserrat',        sample: 'Aa' },
  { label: 'Lato',           value: 'Lato',              sample: 'Aa' },
  { label: 'DM Sans',        value: 'DM Sans',           sample: 'Aa' },
  { label: 'Plus Jakarta',   value: 'Plus Jakarta Sans', sample: 'Aa' },
  { label: 'Outfit',         value: 'Outfit',            sample: 'Aa' },
  { label: 'Figtree',        value: 'Figtree',           sample: 'Aa' },
]

const SIZES = [
  { label: 'XS',  value: 13 },
  { label: 'S',   value: 14 },
  { label: 'M',   value: 15 },
  { label: 'Default', value: 16 },
  { label: 'L',   value: 17 },
  { label: 'XL',  value: 18 },
]

const GOOGLE_FONTS = [
  'Inter', 'Poppins', 'Nunito', 'Raleway', 'Montserrat',
  'Lato', 'DM Sans', 'Plus Jakarta Sans', 'Outfit', 'Figtree',
]

function loadGoogleFont(family: string) {
  if (!family || !GOOGLE_FONTS.includes(family)) return
  const id = `gf-preview-${family.replace(/\s/g, '-')}`
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id   = id
  link.rel  = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;600&display=swap`
  document.head.appendChild(link)
}

export function WorkspaceFontPicker({
  initialFont,
  initialSize,
}: {
  initialFont: string | null
  initialSize: number | null
}) {
  const [font,    setFont]    = useState(initialFont ?? '')
  const [size,    setSize]    = useState(initialSize ?? 16)
  const [status,  setStatus]  = useState<'idle' | 'saved' | 'error'>('idle')
  const [pending, startTransition] = useTransition()

  function pickFont(value: string) {
    setFont(value)
    if (value) loadGoogleFont(value)
  }

  function save() {
    startTransition(async () => {
      const result = await updateBranding({
        font_family: font || null,
        font_size:   size === 16 ? null : size,
      })
      if (result.ok) {
        // Apply immediately without reload
        if (font) {
          document.documentElement.style.setProperty('--ws-font', `'${font}', sans-serif`)
          loadGoogleFont(font)
        } else {
          document.documentElement.style.removeProperty('--ws-font')
        }
        if (size !== 16) {
          document.documentElement.style.fontSize = `${size}px`
        } else {
          document.documentElement.style.fontSize = ''
        }
        setStatus('saved')
        setTimeout(() => setStatus('idle'), 2000)
      } else {
        setStatus('error')
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Font family */}
      <div>
        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Font family</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Applied across the entire dashboard.</p>
        <div className="grid grid-cols-3 gap-1.5">
          {FONTS.map(f => (
            <button
              key={f.value}
              onClick={() => pickFont(f.value)}
              onMouseEnter={() => f.value && loadGoogleFont(f.value)}
              style={f.value ? { fontFamily: `'${f.value}', sans-serif` } : undefined}
              className={`relative px-2 py-2 rounded-lg border text-xs text-left transition-all ${
                font === f.value
                  ? 'border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold ring-2 ring-gray-900 dark:ring-white ring-offset-1'
                  : 'border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-white/30'
              }`}
            >
              <span className="block text-base leading-none mb-0.5">{f.sample}</span>
              <span className="block text-[10px] opacity-70">{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Font size */}
      <div>
        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Base font size</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Scales all text proportionally.</p>
        <div className="flex gap-1.5">
          {SIZES.map(s => (
            <button
              key={s.value}
              onClick={() => setSize(s.value)}
              className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                size === s.value
                  ? 'border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-white/30'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={save}
          disabled={pending}
          className="px-3 py-1.5 text-xs font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:opacity-80 transition-opacity disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={() => { setFont(''); setSize(16) }}
          className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          Reset
        </button>
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
