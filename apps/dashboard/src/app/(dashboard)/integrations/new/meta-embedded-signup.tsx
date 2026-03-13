'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    FB: any
    fbAsyncInit: () => void
  }
}

interface Props {
  platform: 'facebook_messenger' | 'whatsapp'
  name: string
  botId: string
  appId: string
}

export function MetaEmbeddedSignup({ platform, name, botId, appId }: Props) {
  const router = useRouter()
  const [sdkReady, setSdkReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    function init() {
      // Always reinitialize with the current appId (handles stale cached SDK)
      window.FB.init({ appId, version: 'v18.0', xfbml: false, cookie: true })
      setSdkReady(true)
    }

    if (window.FB) {
      init()
      return
    }

    window.fbAsyncInit = init

    if (!document.getElementById('facebook-jssdk')) {
      const script = document.createElement('script')
      script.id = 'facebook-jssdk'
      script.src = 'https://connect.facebook.net/en_US/sdk.js'
      script.async = true
      document.head.appendChild(script)
    } else {
      // Script tag exists but FB not yet available — wait for fbAsyncInit
    }
  }, [appId])

  function handleConnect() {
    if (!sdkReady || loading) return
    setLoading(true)
    setError('')

    // Verify FB is actually available
    if (!window.FB || typeof window.FB.login !== 'function') {
      setLoading(false)
      setError('Facebook SDK not ready. Please hard-refresh the page (Cmd+Shift+R) and try again.')
      return
    }

    // Reset loading if the popup closes without a callback (e.g. popup blocked)
    const timeout = setTimeout(() => {
      setLoading(false)
      setError('Timed out — popup was blocked or closed. Allow popups for this site and try again.')
    }, 90_000)

    const scope =
      platform === 'facebook_messenger'
        ? 'pages_messaging,pages_read_engagement,pages_manage_metadata,pages_show_list'
        : 'whatsapp_business_messaging,whatsapp_business_management'

    try {
      window.FB.login(
        (res: { authResponse?: { accessToken: string }; status: string }) => {
          clearTimeout(timeout)

          if (!res.authResponse?.accessToken) {
            setLoading(false)
            setError(`Login cancelled (status: ${res.status}). Please try again and complete the Facebook authorisation.`)
            return
          }

          const token = res.authResponse.accessToken
          fetch('/api/oauth/meta/exchange', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, platform, name, botId }),
          })
            .then(r => r.json().then((data: { integrationId?: string; error?: string }) => {
              if (!r.ok) throw new Error(data.error ?? 'Failed to save integration')
              router.push(
                `/integrations/${data.integrationId}?connected=${platform === 'facebook_messenger' ? 'facebook' : 'whatsapp'}`,
              )
            }))
            .catch(err => {
              setError(err instanceof Error ? err.message : 'Unknown error')
              setLoading(false)
            })
        },
        { scope },
      )
    } catch (err) {
      clearTimeout(timeout)
      setLoading(false)
      setError(`FB.login() threw: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const isFB    = platform === 'facebook_messenger'
  const color   = isFB ? '#1877F2' : '#25D366'
  const label   = loading ? 'Connecting…' : isFB ? 'Connect with Facebook' : 'Connect with WhatsApp'
  const enabled = sdkReady && !loading

  return (
    <div>
      <button
        type="button"
        onClick={handleConnect}
        disabled={!enabled}
        style={enabled ? { backgroundColor: color } : undefined}
        className={`inline-flex items-center gap-2.5 px-5 py-2.5 rounded-lg text-sm font-semibold transition-opacity ${
          enabled
            ? 'text-white hover:opacity-90'
            : 'bg-gray-200 dark:bg-white/10 text-gray-400 cursor-not-allowed'
        }`}
      >
        {isFB ? (
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
          </svg>
        )}
        {label}
      </button>
      {!sdkReady && !loading && (
        <p className="text-xs text-gray-400 mt-2">Loading Facebook SDK…</p>
      )}
      {sdkReady && !loading && !error && (
        <p className="text-xs text-gray-400 mt-2">SDK ready</p>
      )}
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  )
}
