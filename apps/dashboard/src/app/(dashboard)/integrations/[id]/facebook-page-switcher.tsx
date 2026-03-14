'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    FB: any
    fbAsyncInit: () => void
  }
}

interface Page { id: string; name: string; access_token: string }

export function FacebookPageSwitcher({
  integrationId,
  appId,
  currentPageName,
  currentPageId,
}: {
  integrationId: string
  appId: string
  currentPageName: string
  currentPageId: string
}) {
  const router = useRouter()
  const [sdkReady, setSdkReady]   = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [pages, setPages]         = useState<Page[]>([])
  const [longToken, setLongToken] = useState('')
  const timeoutRef                = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function init() {
      window.FB.init({ appId, version: 'v18.0', xfbml: false, cookie: true })
      setSdkReady(true)
    }
    if (window.FB) { init(); return }
    window.fbAsyncInit = init
    if (!document.getElementById('facebook-jssdk')) {
      const script = document.createElement('script')
      script.id  = 'facebook-jssdk'
      script.src = 'https://connect.facebook.net/en_US/sdk.js'
      script.async = true
      document.head.appendChild(script)
    }
  }, [appId])

  function cancel() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setLoading(false)
    setError('')
  }

  function handleChangeClick() {
    if (!sdkReady || loading) return
    setLoading(true)
    setError('')

    timeoutRef.current = setTimeout(() => {
      setLoading(false)
      setError('Timed out — popup was blocked or closed. Allow popups and try again.')
    }, 20_000)

    try {
      window.FB.login(
        (res: { authResponse?: { accessToken: string }; status: string }) => {
          if (timeoutRef.current) clearTimeout(timeoutRef.current)
          if (!res.authResponse?.accessToken) {
            setLoading(false)
            setError(`Login cancelled (status: ${res.status}). Please try again.`)
            return
          }
          const token = res.authResponse.accessToken
          fetch('/api/oauth/meta/list-pages', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ token }),
          })
            .then(r => r.json() as Promise<{ pages?: Page[]; longToken?: string; error?: string }>)
            .then(data => {
              if (data.error) throw new Error(data.error)
              if (!data.pages?.length) throw new Error('No Facebook Pages found for this account.')
              setLongToken(data.longToken ?? '')
              if (data.pages.length === 1) {
                connectPage(data.pages[0])
              } else {
                setPages(data.pages)
                setLoading(false)
              }
            })
            .catch(err => {
              setError(err instanceof Error ? err.message : 'Unknown error')
              setLoading(false)
            })
        },
        { scope: 'pages_messaging,pages_manage_metadata,pages_show_list', return_scopes: true },
      )
    } catch (err) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      setLoading(false)
      setError(`FB.login() threw: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  function connectPage(page: Page) {
    setLoading(true)
    setPages([])
    fetch(`/api/integrations/${integrationId}/facebook-page`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        pageId:          page.id,
        pageName:        page.name,
        pageAccessToken: page.access_token || longToken,
      }),
    })
      .then(r => r.json().then((data: { ok?: boolean; error?: string }) => {
        if (!r.ok) throw new Error(data.error ?? 'Failed to update page')
        router.refresh()
      }))
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setLoading(false)
      })
  }

  return (
    <div className="mt-4 space-y-3">
      {pages.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
            Choose which Facebook Page to connect:
          </p>
          <div className="space-y-2">
            {pages.map(page => (
              <button
                key={page.id}
                type="button"
                onClick={() => connectPage(page)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:border-brand-400 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-blue-600" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{page.name}</p>
                  <p className="text-xs text-gray-400">Page ID: {page.id}</p>
                  {page.id === currentPageId && (
                    <p className="text-xs text-brand-600">Currently connected</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {pages.length === 0 && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleChangeClick}
            disabled={!sdkReady || loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-white/10 disabled:opacity-50 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-blue-600" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            {loading ? 'Waiting for popup…' : 'Change connected page'}
          </button>
          {loading && (
            <button
              type="button"
              onClick={cancel}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {!sdkReady && !loading && pages.length === 0 && (
        <p className="text-xs text-gray-400">Loading Facebook SDK…</p>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}

      <p className="text-xs text-gray-400">
        Currently: <span className="font-medium text-gray-600 dark:text-gray-300">{currentPageName || currentPageId || 'Unknown page'}</span>
      </p>
    </div>
  )
}
