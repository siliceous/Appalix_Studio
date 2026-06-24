'use client'

import { useState, useEffect } from 'react'
import { ArrowRight, Zap, Wand2, Plus } from 'lucide-react'
import type { TalkingActorGeneration, Actor } from './types'
import { ACTORS, BACKGROUNDS, VOICES, EMOTIONS, ASPECT_RATIOS, OUTPUT_QUALITIES, CAMERA_STYLES } from './data'
import { UGCUploadDialog } from './ugc-upload'

interface Voice {
  id: string
  name: string
  accent?: string
  voice_name?: string
  language_code?: string
}

interface TalkingActorComposerProps {
  onGenerate: (data: any) => void
  isGenerating: boolean
  walletBalance: number
  estimatedCost: number
  workspaceId?: string
}

export function TalkingActorComposer({
  onGenerate,
  isGenerating,
  walletBalance,
  estimatedCost,
  workspaceId,
}: TalkingActorComposerProps) {
  const [script, setScript] = useState('')
  const [selectedActor, setSelectedActor] = useState(ACTORS[0])
  const [selectedBackground, setSelectedBackground] = useState(BACKGROUNDS[0])
  const [selectedVoice, setSelectedVoice] = useState<Voice>(VOICES[0])
  const [selectedEmotion, setSelectedEmotion] = useState(EMOTIONS[0])
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1' | '4:5'>('16:9')
  const [quality, setQuality] = useState<'standard' | 'hd' | 'full_hd' | '4k'>('hd')
  const [cameraStyle, setCameraStyle] = useState<'static' | 'zoom_in' | 'zoom_out' | 'dynamic' | 'pan' | 'cinematic'>('static')
  const [speed, setSpeed] = useState(1.0)
  const [energy, setEnergy] = useState(0.75)
  const [confidence, setConfidence] = useState(0.85)
  const [showUGCDialog, setShowUGCDialog] = useState(false)
  const [actors, setActors] = useState(ACTORS)
  const [voices, setVoices] = useState<Voice[]>(VOICES)
  const [loadingVoices, setLoadingVoices] = useState(false)

  // Fetch Gemini voices on mount
  useEffect(() => {
    async function fetchGeminiVoices() {
      if (!workspaceId) return

      try {
        setLoadingVoices(true)
        const response = await fetch(`/api/gemini-voice/voices/all`)

        if (!response.ok) {
          console.error('Failed to fetch Gemini voices')
          return
        }

        const { voices: geminiVoices } = await response.json()

        // Map Gemini voices to our Voice interface and combine with built-in voices
        const mappedGeminiVoices: Voice[] = geminiVoices.map((v: any) => ({
          id: v.id,
          name: v.voice_name,
          accent: v.language_code,
          voice_name: v.voice_name,
          language_code: v.language_code,
        }))

        // Combine built-in voices with Gemini voices
        setVoices([...VOICES, ...mappedGeminiVoices])
      } catch (error) {
        console.error('Error fetching Gemini voices:', error)
        // Fall back to built-in voices only
        setVoices(VOICES)
      } finally {
        setLoadingVoices(false)
      }
    }

    fetchGeminiVoices()
  }, [workspaceId])

  const canGenerate =
    walletBalance >= estimatedCost &&
    script.trim().length > 0 &&
    !isGenerating

  const handleGenerate = () => {
    if (canGenerate) {
      onGenerate({
        script,
        actor: selectedActor,
        background: selectedBackground,
        voice: selectedVoice,
        emotion: selectedEmotion,
        aspectRatio,
        quality,
        cameraStyle,
        speed,
        energy,
        confidence,
        lipSyncEnabled: true,
      })
      setScript('')
    }
  }

  return (
    <div className="border-t border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 backdrop-blur-sm">
      {/* Main Content - Two Column Layout */}
      <div className="px-8 py-6 flex gap-6">
        {/* Left: Script Input */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Script
            </label>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span>{script.length} / 5,000</span>
            </div>
          </div>

          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder="Enter your script here or use AI to generate one..."
            disabled={isGenerating}
            rows={4}
            className="w-full px-4 py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
          />

          {/* Quick Script Tools */}
          <div className="grid grid-cols-2 gap-2">
            <button className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">
              <Wand2 className="w-3.5 h-3.5" />
              Generate Script
            </button>
            <button className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">
              <Wand2 className="w-3.5 h-3.5" />
              Improve Script
            </button>
            <button className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">
              Shorten
            </button>
            <button className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">
              Expand
            </button>
          </div>
        </div>

        {/* Right: Settings */}
        <div className="w-96 space-y-4 bg-gray-50 dark:bg-white/5 rounded-xl p-4">
          {/* Actor Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Actor
              </label>
              <button
                onClick={() => setShowUGCDialog(true)}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 rounded transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Custom
              </button>
            </div>
            <select
              value={selectedActor.id}
              onChange={(e) => setSelectedActor(actors.find(a => a.id === e.target.value) || actors[0])}
              className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {actors.map(actor => (
                <option key={actor.id} value={actor.id}>
                  {actor.image} {actor.name} {actor.type !== 'builtin' ? '(Custom)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Background Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Background
            </label>
            <select
              value={selectedBackground.id}
              onChange={(e) => setSelectedBackground(BACKGROUNDS.find(b => b.id === e.target.value) || BACKGROUNDS[0])}
              className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {BACKGROUNDS.map(bg => (
                <option key={bg.id} value={bg.id}>
                  {bg.image} {bg.name}
                </option>
              ))}
            </select>
          </div>

          {/* Voice Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Voice {loadingVoices && <span className="text-gray-500 text-xs">(loading...)</span>}
            </label>
            <select
              value={selectedVoice.id}
              onChange={(e) => setSelectedVoice(voices.find(v => v.id === e.target.value) || voices[0])}
              disabled={loadingVoices}
              className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
            >
              <optgroup label="Built-in Voices">
                {VOICES.map(voice => (
                  <option key={voice.id} value={voice.id}>
                    {voice.name} - {voice.accent}
                  </option>
                ))}
              </optgroup>
              {voices.filter(v => !VOICES.find(bv => bv.id === v.id)).length > 0 && (
                <optgroup label="Gemini Voices">
                  {voices.filter(v => !VOICES.find(bv => bv.id === v.id)).map(voice => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name} - {voice.accent || 'Multi'}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Emotion Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Emotion
            </label>
            <select
              value={selectedEmotion}
              onChange={(e) => setSelectedEmotion(e.target.value as any)}
              className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {EMOTIONS.map(emotion => (
                <option key={emotion} value={emotion}>
                  {emotion}
                </option>
              ))}
            </select>
          </div>

          {/* Aspect Ratio */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Format
            </label>
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as any)}
              className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {ASPECT_RATIOS.map(ratio => (
                <option key={ratio.value} value={ratio.value}>
                  {ratio.label}
                </option>
              ))}
            </select>
          </div>

          {/* Quality */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Quality
            </label>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value as any)}
              className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {OUTPUT_QUALITIES.map(q => (
                <option key={q.value} value={q.value}>
                  {q.label} - {q.description}
                </option>
              ))}
            </select>
          </div>

          {/* Camera Style */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Camera
            </label>
            <select
              value={cameraStyle}
              onChange={(e) => setCameraStyle(e.target.value as any)}
              className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {CAMERA_STYLES.map(style => (
                <option key={style.value} value={style.value}>
                  {style.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Bottom: Action Bar */}
      <div className="px-8 py-4 border-t border-gray-200 dark:border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400">
            <Zap className="w-4 h-4" />
            <span className="font-medium">${estimatedCost.toFixed(2)}</span>
          </div>
          {script.length > 0 && (
            <span className="text-gray-500 dark:text-gray-400">
              ~{Math.ceil(script.split(' ').length / 150)}s video
            </span>
          )}
        </div>

        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className={`px-8 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all text-sm ${
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
              Generate Video
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* UGC Upload Dialog */}
      <UGCUploadDialog
        isOpen={showUGCDialog}
        onClose={() => setShowUGCDialog(false)}
        onActorAdded={(newActor: Actor) => {
          setActors([...actors, newActor])
          setSelectedActor(newActor)
        }}
      />
    </div>
  )
}
