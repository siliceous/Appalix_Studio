'use client'

import { useState } from 'react'
import { Plus, Download, Copy, MoreHorizontal, Loader2 } from 'lucide-react'
import type { TalkingActorGeneration, AspectRatio, OutputQuality, CameraStyle, Emotion } from './types'
import { ACTORS, BACKGROUNDS, VOICES, EMOTIONS, ASPECT_RATIOS, OUTPUT_QUALITIES, CAMERA_STYLES } from './data'
import { TalkingActorComposer } from './composer'
import { TalkingActorLibrary } from './library'

interface TalkingActorsStudioProps {
  walletBalance: number
  estimatedCost: number
}

export function TalkingActorsStudio({ walletBalance, estimatedCost }: TalkingActorsStudioProps) {
  const [generations, setGenerations] = useState<TalkingActorGeneration[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async (data: any) => {
    setIsGenerating(true)
    try {
      const newGeneration: TalkingActorGeneration = {
        id: Date.now().toString(),
        script: data.script,
        actor: data.actor,
        background: data.background,
        voice: data.voice,
        emotion: data.emotion,
        aspectRatio: data.aspectRatio,
        quality: data.quality,
        cameraStyle: data.cameraStyle,
        lipSyncEnabled: data.lipSyncEnabled,
        speed: data.speed,
        energy: data.energy,
        confidence: data.confidence,
        status: 'generating',
        duration: Math.ceil(data.script.split(' ').length / 150),
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      setGenerations([newGeneration, ...generations])

      // Simulate generation completion
      setTimeout(() => {
        setGenerations(prev =>
          prev.map(g =>
            g.id === newGeneration.id
              ? {
                  ...g,
                  status: 'completed' as const,
                  videoUrl: 'https://example.com/video.mp4',
                  updatedAt: new Date(),
                }
              : g
          )
        )
      }, 3000)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Main Workspace */}
      <div className="flex-1 overflow-y-auto">
        {generations.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="p-8 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Generated Videos ({generations.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {generations.map(generation => (
                <VideoCard key={generation.id} generation={generation} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Composer */}
      <TalkingActorComposer
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
        walletBalance={walletBalance}
        estimatedCost={estimatedCost}
      />
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900/20 dark:to-blue-900/20 flex items-center justify-center mx-auto">
          <svg className="w-10 h-10 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Create Your First Talking Actor Video
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
          Select an actor, write a script, choose a background and voice, then generate your video below.
        </p>
      </div>
    </div>
  )
}

interface VideoCardProps {
  generation: TalkingActorGeneration
}

function VideoCard({ generation }: VideoCardProps) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden hover:shadow-lg dark:hover:shadow-black/20 transition-shadow">
      {/* Preview */}
      <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-50 dark:from-white/5 dark:to-white/10 flex items-center justify-center overflow-hidden group">
        <div className="text-6xl">{generation.actor.image}</div>

        {generation.status === 'generating' && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        )}

        {generation.status === 'completed' && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button className="p-3 bg-white rounded-full hover:bg-gray-100 transition-colors">
              <svg className="w-6 h-6 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
            {generation.script}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {generation.actor.name} • {generation.duration}s
          </p>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                generation.status === 'generating'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
              }`}
            >
              {generation.status === 'generating' ? 'Generating' : 'Ready'}
            </span>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors"
            >
              <MoreHorizontal className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-8 z-10 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/20 rounded-lg shadow-lg min-w-40">
                <div className="p-1 space-y-1">
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors flex items-center gap-2">
                    <Copy className="w-4 h-4" />
                    Duplicate
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Download
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
      </div>
    </div>
  )
}

export default TalkingActorsStudio
