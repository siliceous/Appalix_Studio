'use client'

import { useState } from 'react'
import { RefreshCw, CheckCircle2, XCircle } from 'lucide-react'
import { resubscribeInstagramWebhooks } from '@/app/actions/instagram-resubscribe'

export function InstagramResubscribeButton({ integrationId }: { integrationId: string }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState<{ ok: boolean; message: string } | null>(null)

  async function handleClick() {
    setLoading(true)
    setResult(null)
    const res = await resubscribeInstagramWebhooks(integrationId)
    setResult(res)
    setLoading(false)
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
      >
        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'Resubscribing…' : 'Resubscribe Webhooks'}
      </button>

      {result && (
        <div className={`flex items-start gap-2 text-xs rounded-lg p-3 ${result.ok ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400'}`}>
          {result.ok
            ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            : <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
          <span>{result.message}</span>
        </div>
      )}
    </div>
  )
}
