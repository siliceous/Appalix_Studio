'use client'

import { useRef, useState } from 'react'
import { Upload, Loader2, X, CheckCircle, AlertCircle } from 'lucide-react'
import type { ImportResult } from '@/app/actions/csv-import'

interface CsvImportButtonProps {
  /** Server action that accepts parsed rows and returns ImportResult */
  action: (rows: Record<string, string>[]) => Promise<ImportResult>
  label?:     string
  className?: string
  onSuccess?: () => void
}

/** Minimal CSV parser — handles quoted fields with embedded commas/newlines. */
function parseCsv(text: string): Record<string, string>[] {
  const lines: string[][] = []
  let   cur   = ''
  let   inQ   = false
  let   row:  string[] = []

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQ) {
      if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++ }
      else if (ch === '"')                    inQ = false
      else                                    cur += ch
    } else {
      if      (ch === '"')                    inQ = true
      else if (ch === ',')                    { row.push(cur); cur = '' }
      else if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) {
        if (ch === '\r') i++
        row.push(cur); cur = ''
        lines.push(row); row = []
      } else                                  cur += ch
    }
  }
  if (cur || row.length) { row.push(cur); lines.push(row) }

  if (lines.length < 2) return []

  const headers = lines[0].map(h => h.trim())
  return lines.slice(1)
    .filter(r => r.some(c => c.trim()))
    .map(r => Object.fromEntries(headers.map((h, i) => [h, r[i]?.trim() ?? ''])))
}

export function CsvImportButton({ action, label = 'Import CSV', className, onSuccess }: CsvImportButtonProps) {
  const inputRef               = useRef<HTMLInputElement>(null)
  const [loading,  setLoading] = useState(false)
  const [result,   setResult]  = useState<ImportResult | null>(null)
  const [showPanel,setPanel]   = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setLoading(true)
    setResult(null)
    setPanel(true)

    try {
      const text = await file.text()
      const rows = parseCsv(text)
      if (rows.length === 0) {
        setResult({ imported: 0, skipped: 0, errors: ['No valid rows found in the CSV file.'] })
        return
      }
      const res = await action(rows)
      setResult(res)
      if (res.imported > 0 && res.errors.length === 0) onSuccess?.()
    } catch (e) {
      setResult({ imported: 0, skipped: 0, errors: [(e as Error).message] })
    } finally {
      setLoading(false)
    }
  }

  const hasError = (result?.errors.length ?? 0) > 0

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleFile}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className={className ?? 'flex items-center gap-1.5 px-3 py-2 text-sm border dark:border-white/10 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50'}
      >
        {loading
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <Upload className="w-3.5 h-3.5" />}
        {label}
      </button>

      {/* Result panel */}
      {showPanel && result && (
        <div className="absolute top-full mt-2 right-0 z-30 w-80 bg-white dark:bg-[#232323] border dark:border-white/10 rounded-xl shadow-xl p-4 text-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-gray-900 dark:text-gray-100">Import complete</span>
            <button onClick={() => setPanel(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1 mb-3">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{result.imported} row{result.imported !== 1 ? 's' : ''} imported</span>
            </div>
            {result.skipped > 0 && (
              <div className="flex items-center gap-2 text-gray-400">
                <span className="w-3.5 h-3.5 shrink-0" />
                <span>{result.skipped} row{result.skipped !== 1 ? 's' : ''} skipped (missing required fields)</span>
              </div>
            )}
          </div>
          {hasError && (
            <div className="border-t dark:border-white/8 pt-3 space-y-1 max-h-40 overflow-y-auto">
              {result.errors.map((err, i) => (
                <div key={i} className="flex items-start gap-1.5 text-red-500 text-xs">
                  <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                  <span>{err}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
