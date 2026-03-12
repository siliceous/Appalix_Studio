'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'

interface CsvExportButtonProps {
  /** Server action that returns { csv, filename } or { error } */
  action: () => Promise<{ csv: string; filename: string } | { error: string }>
  label?: string
  className?: string
}

export function CsvExportButton({ action, label = 'Export CSV', className }: CsvExportButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    try {
      const result = await action()
      if ('error' in result) {
        setError(result.error)
        return
      }
      const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = result.filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={loading}
        title={error ?? undefined}
        className={className ?? 'flex items-center gap-1.5 px-3 py-2 text-sm border dark:border-white/10 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50'}
      >
        {loading
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <Download className="w-3.5 h-3.5" />}
        {label}
      </button>
      {error && (
        <p className="absolute top-full mt-1 left-0 text-xs text-red-500 whitespace-nowrap z-10">{error}</p>
      )}
    </div>
  )
}
