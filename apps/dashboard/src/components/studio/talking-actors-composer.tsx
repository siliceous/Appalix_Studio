'use client'

import { ArrowRight, Zap, X, Plus } from 'lucide-react'
import { useState } from 'react'
import type { StudioMode } from './studio-layout'

interface Actor {
  id: string
  name: string
  image: string
}

interface SelectedActor extends Actor {
  emotion: string
}

interface TalkingActorsComposerProps {
  onGenerate: (data: any) => void
  isGenerating: boolean
  walletBalance: number
  estimatedCost: number
  onModeChange?: (mode: StudioMode) => void
}

const AVAILABLE_ACTORS: Actor[] = [
  { id: '1', name: 'Charlotte', image: '👩‍🦰' },
  { id: '2', name: 'Emma', image: '👩‍🦱' },
  { id: '3', name: 'Sophia', image: '👩' },
  { id: '4', name: 'James', image: '👨‍🦱' },
  { id: '5', name: 'Michael', image: '👨' },
  { id: '6', name: 'David', image: '👨‍🔦' },
]

const EMOTIONS = ['Neutral', 'Happy', 'Sad', 'Angry', 'Excited', 'Calm']
const MODELS = [
  'Arcads 1.0',
  'Kling 3.0',
  'Runway Gen 3',
  'Sora 2.0',
  'Seedence 2.0',
  'Synthesia 2',
  'Descript Studio',
]
const AUDIO_OPTIONS = ['Text to Speech', 'Natural Voice', 'Premium Voice']

const MODES: { id: StudioMode; label: string; icon: string }[] = [
  { id: 'talking_actors', label: 'Talking Actors', icon: '🎭' },
  { id: 'video', label: 'Video', icon: '🎬' },
  { id: 'image', label: 'Image', icon: '🖼️' },
  { id: 'voice', label: 'Voice', icon: '🎙️' },
  { id: 'more', label: 'More', icon: '⚡' },
]

export function TalkingActorsComposer({
  onGenerate,
  isGenerating,
  walletBalance,
  estimatedCost,
  onModeChange,
}: TalkingActorsComposerProps) {
  const [script, setScript] = useState('')
  const [selectedActors, setSelectedActors] = useState<SelectedActor[]>([])
  const [showActorPicker, setShowActorPicker] = useState(false)
  const [model, setModel] = useState('Arcads 1.0')
  const [audio, setAudio] = useState('Text to Speech')
  const [emotion, setEmotion] = useState('Neutral')

  const canGenerate =
    walletBalance >= estimatedCost &&
    script.trim().length > 0 &&
    selectedActors.length > 0 &&
    !isGenerating

  const addActor = (actor: Actor) => {
    if (!selectedActors.some(a => a.id === actor.id)) {
      setSelectedActors([...selectedActors, { ...actor, emotion: 'Neutral' }])
    }
    setShowActorPicker(false)
  }

  const removeActor = (actorId: string) => {
    setSelectedActors(selectedActors.filter(a => a.id !== actorId))
  }

  const handleGenerate = () => {
    if (canGenerate) {
      onGenerate({
        mode: 'talking_actors',
        script,
        selectedActors,
        model,
        audio,
        emotion,
        timestamp: new Date(),
      })
      setScript('')
      setSelectedActors([])
      setShowActorPicker(false)
    }
  }

  return (
    <div className="border-t border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 backdrop-blur-sm">
      {/* Mode Tabs */}
      <div className="px-8 py-3 flex items-center gap-2 overflow-x-auto border-b border-gray-200 dark:border-white/10">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => onModeChange?.(m.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all text-sm font-medium ${
              m.id === 'talking_actors'
                ? 'bg-black text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
            }`}
          >
            <span>{m.icon}</span>
            {m.label}
          </button>
        ))}
      </div>

      {/* Main Content - Script Left, Settings Right (Floating Panel Style) */}
      <div className="px-8 py-6 flex gap-6 relative">
        {/* Left: Script and Actors */}
        <div className="flex-1 space-y-4">
          {/* Script Input */}
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder="Attention is the new currency in business. AI video ads help you stop the scroll..."
            disabled={isGenerating}
            rows={4}
            className="w-full px-4 py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {script.length} / 1,500
          </p>

          {/* Actors Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {selectedActors.length} Actor{selectedActors.length !== 1 ? 's' : ''}
                </span>
                {selectedActors.length > 0 && (
                  <button className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded transition-colors">
                    ✎ Add emotions
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowActorPicker(!showActorPicker)}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded transition-colors"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {/* Selected Actors Display */}
            {selectedActors.length > 0 && (
              <div className="space-y-1.5">
                {selectedActors.map(actor => (
                  <div
                    key={actor.id}
                    className="flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10"
                  >
                    <span className="text-2xl">{actor.image}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {actor.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400 w-16">
                          {actor.emotion}
                        </span>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          className="h-1.5 w-24 rounded-lg appearance-none cursor-pointer bg-gray-200 dark:bg-white/10"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => removeActor(actor.id)}
                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                    >
                      <svg className="w-4 h-4 text-gray-400 hover:text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Actor Picker */}
            {showActorPicker && (
              <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
                {AVAILABLE_ACTORS.map(actor => (
                  <button
                    key={actor.id}
                    onClick={() => addActor(actor)}
                    disabled={selectedActors.some(a => a.id === actor.id)}
                    className={`p-3 rounded-lg transition-all text-center text-sm ${
                      selectedActors.some(a => a.id === actor.id)
                        ? 'bg-gray-200 dark:bg-white/10 border border-gray-300 dark:border-white/20 opacity-50'
                        : 'bg-white dark:bg-white/10 hover:bg-gray-100 dark:hover:bg-white/20 border border-gray-200 dark:border-white/10'
                    }`}
                  >
                    <div className="text-2xl mb-1">{actor.image}</div>
                    <div className="text-xs font-medium text-gray-900 dark:text-gray-100">
                      {actor.name}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Floating Audio Settings Panel */}
        {selectedActors.length > 0 && (
          <div className="w-96 bg-white dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10 shadow-lg p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Audio Settings
              </h3>
              <button className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Selected Actor Preview */}
            {selectedActors.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg bg-gray-200 dark:bg-white/10 flex items-center justify-center text-3xl">
                    {selectedActors[0].image}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {selectedActors[0].name}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">0:43</p>
                  </div>
                  <button className="p-2 bg-black hover:bg-gray-900 text-white rounded-lg transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Voice-over Setting */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Voice-over
              </label>
              <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10">
                <span className="text-sm text-gray-900 dark:text-gray-100">
                  {selectedActors[0]?.name} - Default
                </span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Speed Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Speed
                </label>
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                  1.10X
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                defaultValue="1.1"
                className="w-full h-2 bg-gray-900 dark:bg-black rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Stability Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Stability
                </label>
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                  0.50X
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                defaultValue="0.5"
                className="w-full h-2 bg-gray-900 dark:bg-black rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Similarity Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Similarity
                </label>
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                  0.75X
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                defaultValue="0.75"
                className="w-full h-2 bg-gray-900 dark:bg-black rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Style Exaggeration Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Style exaggeration
                </label>
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                  0.00X
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                defaultValue="0"
                className="w-full h-2 bg-gray-900 dark:bg-black rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      {/* Character Count and Generate Button */}
      <div className="px-8 py-4 border-t border-gray-200 dark:border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span>{script.length} / 1,500</span>
          <span>✓ 1 Actor</span>
        </div>
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className={`px-8 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all whitespace-nowrap text-sm ${
            canGenerate
              ? 'bg-black hover:bg-gray-900 text-white'
              : 'bg-gray-200 dark:bg-white/5 text-gray-500 dark:text-gray-600 cursor-not-allowed'
          }`}
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating...
            </>
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
