'use client'

import { ArrowRight, Zap } from 'lucide-react'
import { useState } from 'react'
import type { StudioMode } from './studio-layout'

interface FloatingComposerProps {
  mode: StudioMode
  onModeChange: (mode: StudioMode) => void
  onGenerate: (data: any) => void
  isGenerating: boolean
  walletBalance: number
}

const MODES: { id: StudioMode; label: string; icon: string }[] = [
  { id: 'talking_actors', label: 'Talking Actors', icon: '🎭' },
  { id: 'video', label: 'Video', icon: '🎬' },
  { id: 'image', label: 'Image', icon: '🖼️' },
  { id: 'voice', label: 'Voice', icon: '🎙️' },
  { id: 'more', label: 'More', icon: '⚡' },
]

const PLACEHOLDERS: Record<StudioMode, string> = {
  talking_actors: 'Write a script for your AI actor...',
  video: 'Describe the video you want to create...',
  image: 'Describe the image you want to generate...',
  voice: 'Write the text you want to convert to speech...',
  more: 'Coming soon...',
}

const ESTIMATED_COST: Record<StudioMode, number> = {
  talking_actors: 2.5,
  video: 1.5,
  image: 0.5,
  voice: 0.1,
  more: 0,
}

const MODE_SETTINGS: Record<StudioMode, { label: string; options: string[] }[]> = {
  talking_actors: [],
  video: [
    { label: 'Model', options: ['Sora 2.0', 'Kling 3.0', 'Runway Gen 3', 'Seedence 2.0'] },
    { label: 'Aspect Ratio', options: ['16:9', '9:16', '1:1', '4:3'] },
    { label: 'Duration', options: ['15s', '30s', '45s', '60s'] },
  ],
  image: [
    { label: 'Model', options: ['DALL-E 3', 'Midjourney V6', 'Seedence 2.0', 'Runway'] },
    { label: 'Style', options: ['Realistic', 'Artistic', 'Cartoon', 'Cinematic'] },
    { label: 'Aspect Ratio', options: ['1:1', '16:9', '9:16', '4:3'] },
  ],
  voice: [
    { label: 'Model', options: ['Eleven Labs', 'Google Cloud TTS', 'Azure Cognitive', 'Synthesia'] },
    { label: 'Voice Type', options: ['Natural', 'Premium', 'Expressive', 'Calm'] },
    { label: 'Speed', options: ['Slow', 'Normal', 'Fast', 'Very Fast'] },
  ],
  more: [],
}

export function FloatingComposer({
  mode,
  onModeChange,
  onGenerate,
  isGenerating,
  walletBalance,
}: FloatingComposerProps) {
  const [input, setInput] = useState('')
  const [selectedSettings, setSelectedSettings] = useState<Record<string, string>>({})
  const estimatedCost = ESTIMATED_COST[mode]
  const canGenerate = walletBalance >= estimatedCost && input.trim().length > 0 && !isGenerating
  const settings = MODE_SETTINGS[mode] || []

  const handleGenerate = () => {
    if (canGenerate) {
      onGenerate({
        mode,
        prompt: input,
        script: input,
        settings: selectedSettings,
        timestamp: new Date(),
      })
      setInput('')
      setSelectedSettings({})
    }
  }

  return (
    <div className="border-t border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 backdrop-blur-sm">
      {/* Mode Tabs */}
      <div className="px-8 py-3 flex items-center gap-2 overflow-x-auto border-b border-gray-200 dark:border-white/10">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => onModeChange(m.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all text-sm font-medium ${
              mode === m.id
                ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
            }`}
          >
            <span>{m.icon}</span>
            {m.label}
          </button>
        ))}
      </div>

      {/* Main Content - Input and Settings Side by Side */}
      <div className="px-8 py-6 flex gap-6">
        {/* Left: Input */}
        <div className="flex-1 space-y-2">
          <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {mode === 'voice' ? 'Text' : 'Prompt'}
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={PLACEHOLDERS[mode]}
            disabled={isGenerating}
            rows={3}
            className="w-full px-4 py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {input.length} / 5,000
          </p>
        </div>

        {/* Right: Settings Panel */}
        {settings.length > 0 && (
          <div className="w-64 space-y-4">
            {settings.map((setting) => (
              <div key={setting.label} className="space-y-2">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  {setting.label}
                </label>
                <div className="flex flex-col gap-1.5">
                  {setting.options.map((option) => (
                    <button
                      key={option}
                      onClick={() =>
                        setSelectedSettings({
                          ...selectedSettings,
                          [setting.label]: option,
                        })
                      }
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${
                        selectedSettings[setting.label] === option
                          ? 'bg-cyan-500 text-white'
                          : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            ))}

          </div>
        )}

      </div>

      {/* Bottom: Generate Button */}
      <div className="px-8 py-4 border-t border-gray-200 dark:border-white/10 flex justify-end">
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className={`px-8 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all whitespace-nowrap text-sm ${
            canGenerate
              ? 'bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg hover:shadow-cyan-500/20'
              : 'bg-gray-200 dark:bg-white/5 text-gray-500 dark:text-gray-600 cursor-not-allowed'
          }`}
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating...
            </>
          ) : mode === 'more' ? (
            'Coming Soon'
          ) : (
            <>
              Generate
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
