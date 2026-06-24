'use client'

import { useState } from 'react'
import { Mic, Zap } from 'lucide-react'
import { AIStudioLayout } from '@/components/ai-studio/ai-studio-layout'
import {
  UploadBox,
  GenerationPanel,
  VideoPreviewCard,
  CreditUsageCard,
} from '@/components/ai-studio/components'
import { aiStudioAPI } from '@/lib/api/ai-studio'
import type { CreditUsage } from '@/lib/types/ai-studio'

const SAMPLE_AVATARS = [
  { id: 'avatar-1', name: 'Alex', emoji: '👨' },
  { id: 'avatar-2', name: 'Jordan', emoji: '👩' },
  { id: 'avatar-3', name: 'Morgan', emoji: '🧑' },
  { id: 'avatar-4', name: 'Casey', emoji: '👔' },
]

const VOICES = ['Natural', 'Energetic', 'Calm', 'Professional', 'Friendly']
const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese']
const BACKGROUNDS = ['Studio', 'Office', 'Outdoors', 'Home', 'Abstract']

export default function TalkingAdPage() {
  const [avatarId, setAvatarId] = useState(SAMPLE_AVATARS[0].id)
  const [script, setScript] = useState('')
  const [voiceId, setVoiceId] = useState(VOICES[0])
  const [language, setLanguage] = useState(LANGUAGES[0])
  const [backgroundId, setBackgroundId] = useState(BACKGROUNDS[0])
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>('')
  const [showCaptions, setShowCaptions] = useState(true)
  const [ctaText, setCtaText] = useState('Learn More')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'queued' | 'processing' | 'completed' | 'failed'>('idle')
  const [videoUrl, setVideoUrl] = useState<string>('')
  const [credits, setCredits] = useState<CreditUsage | null>(null)

  const handleLogoSelect = (file: File) => {
    setLogoFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      setLogoPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleGenerate = async () => {
    if (!script.trim()) {
      alert('Please enter a script')
      return
    }

    setLoading(true)
    try {
      const result = await aiStudioAPI.generateTalkingAd({
        avatarId,
        script,
        voiceId,
        language,
        backgroundId,
        logoUrl: logoPreview,
        showCaptions,
        ctaText: ctaText || undefined,
      })

      setStatus(result.status)

      // Poll for completion
      const completed = await aiStudioAPI.pollGeneration(result.id)
      setStatus(completed.status)
      if (completed.status === 'completed' && completed.outputUrl) {
        setVideoUrl(completed.outputUrl)
      }
    } catch (error) {
      console.error('Generation failed:', error)
      setStatus('failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AIStudioLayout>
      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Mic className="w-6 h-6 text-blue-500" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Talking Ad</h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Create AI talking avatar videos with custom scripts and voices
            </p>
          </div>

          <div className="grid grid-cols-3 gap-8">
            {/* Form */}
            <div className="col-span-2 space-y-6">
              {/* Avatar Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Select Avatar
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {SAMPLE_AVATARS.map((avatar) => (
                    <button
                      key={avatar.id}
                      onClick={() => setAvatarId(avatar.id)}
                      className={`p-4 rounded-lg border-2 transition-all text-center ${
                        avatarId === avatar.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                      }`}
                    >
                      <div className="text-4xl mb-2">{avatar.emoji}</div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{avatar.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Script */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Script
                </label>
                <textarea
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  placeholder="Write what your avatar should say..."
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={5}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Character count: {script.length}
                </p>
              </div>

              {/* Voice & Language */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    Voice
                  </label>
                  <select
                    value={voiceId}
                    onChange={(e) => setVoiceId(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {VOICES.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang} value={lang}>
                        {lang}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Background */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Background
                </label>
                <select
                  value={backgroundId}
                  onChange={(e) => setBackgroundId(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {BACKGROUNDS.map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Brand Logo (Optional)
                </label>
                <UploadBox
                  onFileSelect={handleLogoSelect}
                  accept="image/*"
                  label={logoFile ? logoFile.name : 'Upload your brand logo'}
                />
                {logoPreview && (
                  <div className="mt-3">
                    <img src={logoPreview} alt="Logo" className="w-24 h-24 object-contain rounded" />
                  </div>
                )}
              </div>

              {/* Additional Options */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showCaptions}
                    onChange={(e) => setShowCaptions(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-white/20 text-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Show captions</span>
                </label>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    Call to Action
                  </label>
                  <input
                    type="text"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    placeholder="e.g., Learn More"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Status */}
              {status !== 'idle' && (
                <GenerationPanel
                  status={status as any}
                  estimatedTime={status === 'processing' ? '~10 minutes' : undefined}
                  creditsUsed={100}
                />
              )}

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={loading || !script.trim()}
                className="w-full py-3 px-4 bg-black dark:bg-white text-white dark:text-black rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
              >
                <Mic className="w-5 h-5" />
                Generate Talking Ad
              </button>
            </div>

            {/* Right Column - Results and Credits */}
            <div className="space-y-6">
              {/* Credit Usage */}
              {credits && <CreditUsageCard usage={credits} />}

              {/* Video Result */}
              {videoUrl && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Generated Video</h3>
                  <VideoPreviewCard
                    videoUrl={videoUrl}
                    title="Talking Ad Video"
                    duration="60s"
                    onDownload={() => console.log('Download video')}
                    onSave={() => console.log('Save to project')}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AIStudioLayout>
  )
}
