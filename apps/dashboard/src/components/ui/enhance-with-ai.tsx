'use client'

import { useState } from 'react'
import { Sparkles, Loader2, RotateCcw } from 'lucide-react'

async function callEnhance(text: string, fieldType: string) {
  const res = await fetch('/api/ai/enhance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, fieldType }),
  })
  if (!res.ok) throw new Error('enhance failed')
  return res.json() as Promise<{ enhanced: string }>
}

const enhanceBtn =
  'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium ' +
  'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 ' +
  'hover:bg-violet-100 dark:hover:bg-violet-500/20 transition-colors ' +
  'disabled:opacity-40 disabled:cursor-not-allowed'

// ── Textarea ────────────────────────────────────────────────────────────────

interface TextareaProps {
  name: string
  fieldType: string
  rows?: number
  placeholder?: string
  defaultValue?: string
  className?: string
  helperText?: string
}

export function EnhanceableTextarea({
  name, fieldType, rows = 5, placeholder, defaultValue = '', className, helperText,
}: TextareaProps) {
  const [value,    setValue]    = useState(defaultValue)
  const [loading,  setLoading]  = useState(false)
  const [original, setOriginal] = useState<string | null>(null)

  async function enhance() {
    if (!value.trim() || loading) return
    setLoading(true)
    setOriginal(value)
    try {
      const { enhanced } = await callEnhance(value, fieldType)
      if (enhanced) setValue(enhanced)
    } catch {
      setOriginal(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <textarea
        name={name}
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={e => { setValue(e.target.value); setOriginal(null) }}
        className={className}
      />
      <div className="flex items-center justify-between mt-1.5">
        <p className="text-xs text-gray-400">{helperText}</p>
        <div className="flex items-center gap-2">
          {original !== null && original !== value && (
            <button
              type="button"
              onClick={() => { setValue(original); setOriginal(null) }}
              className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />Undo
            </button>
          )}
          <button type="button" onClick={enhance} disabled={loading || !value.trim()} className={enhanceBtn}>
            {loading
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <Sparkles className="w-3 h-3" />}
            Enhance with Sage
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Input ───────────────────────────────────────────────────────────────────

interface InputProps {
  name: string
  fieldType: string
  placeholder?: string
  defaultValue?: string
  className?: string
  required?: boolean
  onChange?: (value: string) => void
}

export function EnhanceableInput({
  name, fieldType, placeholder, defaultValue = '', className, required, onChange,
}: InputProps) {
  const [value,    setValue]    = useState(defaultValue)
  const [loading,  setLoading]  = useState(false)
  const [original, setOriginal] = useState<string | null>(null)

  function update(v: string) {
    setValue(v)
    onChange?.(v)
    setOriginal(null)
  }

  async function enhance() {
    if (!value.trim() || loading) return
    setLoading(true)
    setOriginal(value)
    try {
      const { enhanced } = await callEnhance(value, fieldType)
      if (enhanced) { setValue(enhanced); onChange?.(enhanced) }
    } catch {
      setOriginal(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          name={name}
          placeholder={placeholder}
          value={value}
          required={required}
          onChange={e => update(e.target.value)}
          className={`flex-1 ${className ?? ''}`}
        />
        <button
          type="button"
          onClick={enhance}
          disabled={loading || !value.trim()}
          title="Enhance with Sage"
          className={`${enhanceBtn} shrink-0 px-2.5 py-2`}
        >
          {loading
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Sparkles className="w-3.5 h-3.5" />}
          <span>Sage</span>
        </button>
      </div>
      {original !== null && original !== value && (
        <button
          type="button"
          onClick={() => { setValue(original); onChange?.(original); setOriginal(null) }}
          className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors mt-1"
        >
          <RotateCcw className="w-3 h-3" />Undo
        </button>
      )}
    </div>
  )
}
