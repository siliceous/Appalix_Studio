'use client'

import { Sparkles } from 'lucide-react'
import { AssetCard } from './asset-card'
import type { StudioMode } from './studio-layout'

interface WorkspaceProps {
  assets: any[]
  mode: StudioMode
}

const EMPTY_STATE_MESSAGES: Record<StudioMode, { title: string; description: string }> = {
  talking_actors: {
    title: 'Create Talking Actor Videos',
    description: 'Write a script, choose an actor, and generate professional videos.',
  },
  video: {
    title: 'Generate Videos',
    description: 'Transform your ideas into stunning AI-generated videos.',
  },
  image: {
    title: 'Generate Images',
    description: 'Create unique images from text descriptions.',
  },
  voice: {
    title: 'Generate Voice',
    description: 'Create professional voiceovers with various accents and emotions.',
  },
  more: {
    title: 'More Features',
    description: 'Explore additional AI generation capabilities.',
  },
}

export function Workspace({ assets, mode }: WorkspaceProps) {
  const emptyState = EMPTY_STATE_MESSAGES[mode]

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
      {assets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900/20 dark:to-blue-900/20 flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 text-center mb-2">
            {emptyState.title}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm">
            {emptyState.description}
          </p>
        </div>
      ) : (
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {assets.map((asset) => (
            <AssetCard key={asset.id} asset={asset} />
          ))}
        </div>
      )}
    </div>
  )
}
