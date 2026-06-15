'use client'

import { Download, Copy, MoreHorizontal, Loader2 } from 'lucide-react'
import { useState } from 'react'

interface AssetCardProps {
  asset: {
    id: string
    mode: string
    preview: string
    title: string
    model: string
    status: 'generating' | 'ready' | 'failed'
    timestamp: Date
  }
}

export function AssetCard({ asset }: AssetCardProps) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden hover:shadow-lg dark:hover:shadow-black/20 transition-shadow">
      {/* Preview */}
      <div className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-50 dark:from-white/5 dark:to-white/10 flex items-center justify-center overflow-hidden group">
        <div className="text-6xl">{asset.preview}</div>

        {/* Status overlay */}
        {asset.status === 'generating' && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
        )}

        {/* Hover actions */}
        {asset.status === 'ready' && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors">
              <Download className="w-5 h-5 text-gray-900" />
            </button>
            <button className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors">
              <Copy className="w-5 h-5 text-gray-900" />
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {asset.title}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {asset.model}
            </p>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors flex-shrink-0"
            >
              <MoreHorizontal className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-8 z-10 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/20 rounded-lg shadow-lg min-w-48">
                <div className="p-1 space-y-1">
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors">
                    Duplicate
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors">
                    Send to Video
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors">
                    Add Voice
                  </button>
                  <div className="h-px bg-gray-200 dark:bg-white/10 my-1" />
                  <button className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between">
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
              asset.status === 'generating'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                : asset.status === 'ready'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${
              asset.status === 'generating'
                ? 'bg-blue-500 animate-pulse'
                : asset.status === 'ready'
                  ? 'bg-green-500'
                  : 'bg-red-500'
            }`} />
            {asset.status === 'generating' ? 'Generating' : asset.status === 'ready' ? 'Ready' : 'Failed'}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {new Date(asset.timestamp).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  )
}
