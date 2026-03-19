'use client'

import { useState, useTransition } from 'react'
import { Sparkles, Loader2, RefreshCw } from 'lucide-react'
import { analyzeContact } from '@/app/actions/sage'
import { timeAgo } from '@/lib/utils'

interface Props {
  contactId:     string
  initialSummary: string | null
  analyzedAt:    string | null
}

export function ContactAiAnalysis({ contactId, initialSummary, analyzedAt }: Props) {
  const [summary,    setSummary]    = useState(initialSummary)
  const [analyzedOn, setAnalyzedOn] = useState(analyzedAt)
  const [error,      setError]      = useState<string | null>(null)
  const [pending,    startTransition] = useTransition()

  function handleAnalyze() {
    setError(null)
    startTransition(async () => {
      const res = await analyzeContact(contactId)
      if ('error' in res) {
        setError(res.error)
      } else {
        setSummary(res.summary)
        setAnalyzedOn(new Date().toISOString())
      }
    })
  }

  return (
    <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 mb-6">
      <div className="px-5 py-4 border-b dark:border-white/8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-500 dark:text-[#15A4AE]" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">AI Analysis</h2>
          {analyzedOn && (
            <span className="text-[10px] text-gray-400">· {timeAgo(analyzedOn)}</span>
          )}
        </div>
        <button
          onClick={handleAnalyze}
          disabled={pending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
        >
          {pending
            ? <><Loader2 className="w-3 h-3 animate-spin" /> Analysing…</>
            : summary
              ? <><RefreshCw className="w-3 h-3" /> Re-analyse</>
              : <><Sparkles className="w-3 h-3" /> Generate Analysis</>
          }
        </button>
      </div>

      <div className="px-5 py-4">
        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}
        {!error && !summary && !pending && (
          <p className="text-sm text-gray-400 italic">No analysis yet. Click &quot;Generate Analysis&quot; to have AI analyse this contact.</p>
        )}
        {pending && !summary && (
          <p className="text-sm text-gray-400 italic">Generating analysis…</p>
        )}
        {summary && (
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{summary}</p>
        )}
      </div>
    </div>
  )
}
