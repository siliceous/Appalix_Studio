'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { registerShopifyScriptTag } from '@/app/actions/integration'

export function ShopifyInjectButton({ integrationId }: { integrationId: string }) {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleInject() {
    setState('loading')
    try {
      const result = await registerShopifyScriptTag(integrationId)
      if (result.ok) {
        router.refresh()
      } else {
        setErrorMsg(result.error ?? 'Failed to inject script tag')
        setState('error')
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error')
      setState('error')
    }
  }

  return (
    <div className="mt-3 space-y-2">
      <button
        onClick={handleInject}
        disabled={state === 'loading'}
        className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
      >
        {state === 'loading' ? 'Injecting…' : 'Inject widget into store'}
      </button>
      {state === 'error' && (
        <p className="text-xs text-red-500">{errorMsg}</p>
      )}
    </div>
  )
}
