'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plug } from 'lucide-react'
import { disconnectSageIntegration } from '@/app/actions/sage'

interface Props {
  id:               string
  name:             string
  desc:             string
  logo:             string
  connectHref:      string
  isConnected:      boolean
  connectedByName?: string
  /** Set for Google Chat — uses platform integrations, no sage disconnect */
  noDisconnect?:    boolean
}

export function GoogleWorkspaceCard({
  id, name, desc, logo, connectHref, isConnected, connectedByName, noDisconnect,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleDisconnect() {
    if (!window.confirm(`Disconnect ${name}? You can reconnect at any time.`)) return
    startTransition(async () => {
      await disconnectSageIntegration(id)
      router.refresh()
    })
  }

  return (
    <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border border-[#15A4AE]/30 p-4 flex items-start gap-3">
      <div className="w-12 h-12 rounded-xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 shadow-sm flex items-center justify-center shrink-0 overflow-hidden p-2">
        <img src={logo} alt={name} className="w-full h-full object-contain" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{name}</p>
          {isConnected && (
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">Connected</span>
          )}
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
        {isConnected && connectedByName && (
          <p className="text-[11px] text-gray-400 mt-0.5">Connected by {connectedByName}</p>
        )}
        <div className="mt-2 flex items-center gap-2">
          {isConnected && !noDisconnect ? (
            <>
              <button
                onClick={handleDisconnect}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                Disconnect
              </button>
              <a
                href={connectHref}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                Reconnect
              </a>
            </>
          ) : (
            <a
              href={connectHref}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                isConnected
                  ? 'bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/12'
                  : 'bg-brand-600 hover:bg-brand-700 text-white'
              }`}
            >
              <Plug className="w-3 h-3" />
              {isConnected ? 'Reconnect' : id === 'google_chat' ? 'Set up' : 'Connect'}
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
