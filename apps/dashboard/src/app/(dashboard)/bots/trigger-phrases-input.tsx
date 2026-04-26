'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { X, Sparkles, Loader2 } from 'lucide-react'

export function TriggerPhrasesInput({
  defaultPhrases = [],
  contextPhrase = '',
}: {
  defaultPhrases?: string[]
  contextPhrase?: string
}) {
  const [phrases, setPhrases] = useState<string[]>(defaultPhrases)
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function add(value: string) {
    const trimmed = value.trim()
    if (trimmed && !phrases.includes(trimmed)) {
      setPhrases(prev => [...prev, trimmed])
    }
    setInput('')
  }

  function remove(phrase: string) {
    setPhrases(prev => prev.filter(p => p !== phrase))
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add(input)
    } else if (e.key === 'Backspace' && input === '' && phrases.length > 0) {
      setPhrases(prev => prev.slice(0, -1))
    }
  }

  async function suggestMore() {
    const context = [...phrases, contextPhrase].filter(Boolean).join(', ')
    if (!context || loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/ai/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: context, fieldType: 'trigger_phrases' }),
      })
      const data = await res.json() as { suggestions?: string[] }
      if (data.suggestions?.length) {
        setPhrases(prev => {
          const next = [...prev]
          for (const s of data.suggestions!) {
            const t = s.trim()
            if (t && !next.includes(t)) next.push(t)
          }
          return next
        })
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
          Trigger phrases
        </label>
        <button
          type="button"
          onClick={suggestMore}
          disabled={loading || (phrases.length === 0 && !contextPhrase)}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : <Sparkles className="w-3 h-3" />}
          Suggest more
        </button>
      </div>

      {/* hidden field carries comma-separated value to the server action */}
      <input type="hidden" name="trigger_phrases" value={phrases.join(',')} />

      <div
        className="flex flex-wrap gap-1.5 min-h-[38px] px-2 py-1.5 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-[#252525] cursor-text focus-within:ring-1 focus-within:ring-[#15A4AE]"
        onClick={() => inputRef.current?.focus()}
      >
        {phrases.map(phrase => (
          <span
            key={phrase}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#15A4AE]/10 text-[#15A4AE] text-[11px] font-medium"
          >
            {phrase}
            <button
              type="button"
              onClick={() => remove(phrase)}
              className="hover:text-red-500 transition-colors"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => add(input)}
          placeholder={phrases.length === 0 ? 'Type a phrase and press Enter or comma…' : ''}
          className="flex-1 min-w-[140px] text-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 bg-transparent focus:outline-none"
        />
      </div>
      <p className="text-[10px] text-gray-400 mt-1">Press Enter or comma to add. Backspace removes the last one.</p>
    </div>
  )
}
