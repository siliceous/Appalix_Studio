'use client'

import { useState } from 'react'
import { Zap } from 'lucide-react'
import { Sidebar } from './sidebar'
import { Workspace } from './workspace'
import { FloatingComposer } from './floating-composer'
import { TalkingActorsStudio } from './talking-actors'
import { SettingsPanel } from './settings-panel'

export type StudioMode = 'talking_actors' | 'video' | 'image' | 'voice' | 'more'

interface StudioLayoutProps {
  workspaceId: string
  walletBalance: number
  templates: any[]
}

export function StudioLayout({ workspaceId, walletBalance, templates }: StudioLayoutProps) {
  const [mode, setMode] = useState<StudioMode>('talking_actors')
  const [generatedAssets, setGeneratedAssets] = useState<any[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  const estimatedCost = mode === 'talking_actors' ? 2.5 : mode === 'video' ? 1.5 : mode === 'image' ? 0.5 : 0.1

  const handleGenerate = async (data: any) => {
    setIsGenerating(true)
    try {
      // TODO: Call API based on mode
      // For now, add dummy asset
      const newAsset = {
        id: Date.now().toString(),
        mode,
        preview: mode === 'talking_actors' ? '🎭' : mode === 'video' ? '🎬' : mode === 'image' ? '🖼️' : '🎙️',
        title: data.script || data.prompt || 'Untitled',
        model: mode === 'talking_actors' ? data.model : 'Kling',
        status: 'generating',
        timestamp: new Date(),
      }
      setGeneratedAssets([newAsset, ...generatedAssets])
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="flex h-screen bg-white dark:bg-[#1a1a1a] overflow-hidden">
      {/* Main workspace - full width */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-white/10 px-8 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">AI Studio</h1>
          <div className="flex items-center gap-8">
            {/* Cost Display */}
            {mode !== 'more' && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg border border-cyan-200 dark:border-cyan-800">
                <Zap className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span className="text-xs font-medium text-cyan-700 dark:text-cyan-300">
                  Cost:
                </span>
                <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400">
                  ${estimatedCost.toFixed(2)}
                </span>
              </div>
            )}

            {/* Wallet Balance */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400">Balance</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  ${walletBalance.toFixed(2)}
                </p>
              </div>
              <button className="px-3 py-1.5 text-xs font-medium bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors">
                Add Credits
              </button>
            </div>
          </div>
        </div>

        {/* Workspace content - full width */}
        <div className="flex-1 flex min-h-0">
          <Workspace assets={generatedAssets} mode={mode} />
        </div>

        {/* Mode-specific content */}
        {mode === 'talking_actors' ? (
          <TalkingActorsStudio
            workspaceId={workspaceId}
            walletBalance={walletBalance}
            estimatedCost={estimatedCost}
          />
        ) : (
          <FloatingComposer
            mode={mode}
            onModeChange={setMode}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            walletBalance={walletBalance}
          />
        )}
      </div>
    </div>
  )
}
