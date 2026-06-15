'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, AlertCircle, Check } from 'lucide-react'

interface VideoTemplate {
  id: string
  name: string
  prompt_template: string
  required_variables: string[]
  optional_variables: string[]
  category: string
  suggested_duration_seconds: number
  suggested_quality_mode: string
}

const ASPECT_RATIOS = [
  { value: '9:16', label: 'Vertical (9:16)', icon: '📱' },
  { value: '16:9', label: 'Horizontal (16:9)', icon: '🖥️' },
  { value: '1:1', label: 'Square (1:1)', icon: '⬜' },
  { value: '4:3', label: 'Standard (4:3)', icon: '📺' },
]

const QUALITY_MODES = [
  { value: 'fast', label: 'Fast', description: '720p - 6 credits/sec', creditsPerSecond: 6 },
  { value: 'pro_cinematic', label: 'Pro Cinematic', description: '1080p with audio - 12 credits/sec', creditsPerSecond: 12 },
  { value: 'ultra_realistic', label: 'Ultra Realistic', description: 'Premium - 18 credits/sec', creditsPerSecond: 18 },
]

const CREDIT_RATE = 0.08; // $0.08 per credit

const VIDEO_TYPES = [
  { value: 'text_to_video', label: 'Text to Video' },
  { value: 'image_to_video', label: 'Image to Video' },
]

interface VideoGenerationFormProps {
  workspaceId: string
  walletBalance: number
  templates: VideoTemplate[]
  onSuccess?: (videoId: string) => void
}

export function VideoGenerationForm({
  workspaceId,
  walletBalance,
  templates = [],
  onSuccess,
}: VideoGenerationFormProps) {
  const [videoType, setVideoType] = useState<'text_to_video' | 'image_to_video'>('text_to_video')
  const [prompt, setPrompt] = useState('')
  const [sourceImageUrl, setSourceImageUrl] = useState('')
  const [aspectRatio, setAspectRatio] = useState('9:16')
  const [duration, setDuration] = useState(15)
  const [qualityMode, setQualityMode] = useState<'fast' | 'pro_cinematic' | 'ultra_realistic'>('fast')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [templateVars, setTemplateVars] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Calculate credits needed
  const creditsPerSecond = QUALITY_MODES.find(m => m.value === qualityMode)?.creditsPerSecond || 6
  const estimatedCredits = creditsPerSecond * duration
  const estimatedCostUsd = Math.round(estimatedCredits * CREDIT_RATE * 10000) / 10000
  const canAfford = walletBalance >= estimatedCostUsd

  // Get selected template details
  const template = selectedTemplate
    ? templates.find(t => t.id === selectedTemplate)
    : null

  // Build prompt from template if selected
  const finalPrompt = useMemo(() => {
    if (!template) return prompt

    let builtPrompt = template.prompt_template
    const allVars = [...(template.required_variables || []), ...(template.optional_variables || [])]

    for (const variable of allVars) {
      const value = templateVars[variable]
      if (value) {
        builtPrompt = builtPrompt.replace(`{{${variable}}}`, value)
      }
    }

    return builtPrompt
  }, [template, templateVars, prompt])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setIsLoading(true)

    try {
      if (!finalPrompt.trim()) {
        throw new Error('Prompt is required')
      }

      if (videoType === 'image_to_video' && !sourceImageUrl.trim()) {
        throw new Error('Image URL is required for image-to-video')
      }

      if (!canAfford) {
        throw new Error(`Insufficient credits. Need $${estimatedCostUsd.toFixed(4)}, have $${walletBalance.toFixed(4)}`)
      }

      const response = await fetch('/api/videos/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          prompt: finalPrompt,
          video_type: videoType,
          aspect_ratio: aspectRatio,
          duration_seconds: duration,
          quality_mode: qualityMode,
          source_image_url: sourceImageUrl || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate video')
      }

      const result = await response.json()
      setSuccess(true)
      setPrompt('')
      setSourceImageUrl('')
      setTemplateVars({})
      setSelectedTemplate(null)

      if (onSuccess) {
        setTimeout(() => onSuccess(result.video_id), 1000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate video')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Video Type Selection */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Generation Type
        </label>
        <div className="grid grid-cols-2 gap-3">
          {VIDEO_TYPES.map(type => (
            <button
              key={type.value}
              type="button"
              onClick={() => {
                setVideoType(type.value as 'text_to_video' | 'image_to_video')
                setSourceImageUrl('')
              }}
              className={`px-4 py-3 rounded-lg font-medium text-sm transition-colors ${
                videoType === type.value
                  ? 'bg-[#15A4AE] text-white'
                  : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Template Selection */}
      {templates.length > 0 && (
        <div>
          <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Template (Optional)
          </label>
          <select
            value={selectedTemplate || ''}
            onChange={e => {
              setSelectedTemplate(e.target.value || null)
              setTemplateVars({})
            }}
            className="w-full px-4 py-2 border dark:border-white/10 rounded-lg bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-gray-100"
          >
            <option value="">Custom prompt</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Template Variables */}
      {template && (
        <div className="space-y-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/30 rounded-lg p-4">
          {template.required_variables?.map(variable => (
            <div key={variable}>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {variable.replace('_', ' ')} *
              </label>
              <Input
                type="text"
                value={templateVars[variable] || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTemplateVars({ ...templateVars, [variable]: e.target.value })}
                placeholder={`Enter ${variable}...`}
                className="bg-white dark:bg-white/5"
              />
            </div>
          ))}
          {template.optional_variables?.map(variable => (
            <div key={variable}>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {variable.replace('_', ' ')}
              </label>
              <Input
                type="text"
                value={templateVars[variable] || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTemplateVars({ ...templateVars, [variable]: e.target.value })}
                placeholder={`Enter ${variable} (optional)...`}
                className="bg-white dark:bg-white/5"
              />
            </div>
          ))}
        </div>
      )}

      {/* Prompt */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Prompt
        </label>
        <textarea
          value={finalPrompt}
          onChange={e => {
            setPrompt(e.target.value)
            setSelectedTemplate(null)
          }}
          placeholder="Describe the video you want to create..."
          rows={4}
          className="w-full px-4 py-3 border dark:border-white/10 rounded-lg bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]"
        />
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {finalPrompt.length}/5000
        </p>
      </div>

      {/* Source Image (for image-to-video) */}
      {videoType === 'image_to_video' && (
        <div>
          <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Image URL
          </label>
          <Input
            type="url"
            value={sourceImageUrl}
            onChange={e => setSourceImageUrl(e.target.value)}
            placeholder="https://..."
            className="bg-white dark:bg-[#2a2a2a]"
          />
        </div>
      )}

      {/* Aspect Ratio */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Aspect Ratio
        </label>
        <div className="grid grid-cols-2 gap-2">
          {ASPECT_RATIOS.map(ratio => (
            <button
              key={ratio.value}
              type="button"
              onClick={() => setAspectRatio(ratio.value)}
              className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                aspectRatio === ratio.value
                  ? 'bg-[#15A4AE] text-white'
                  : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'
              }`}
            >
              <span className="mr-1">{ratio.icon}</span>
              {ratio.label}
            </button>
          ))}
        </div>
      </div>

      {/* Duration */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
            Duration
          </label>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {duration}s
          </span>
        </div>
        <input
          type="range"
          min="5"
          max="60"
          value={duration}
          onChange={e => setDuration(parseInt(e.target.value))}
          className="w-full"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          5 - 60 seconds
        </p>
      </div>

      {/* Quality Mode */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Quality Mode
        </label>
        <div className="space-y-2">
          {QUALITY_MODES.map(mode => (
            <button
              key={mode.value}
              type="button"
              onClick={() => setQualityMode(mode.value as any)}
              className={`w-full px-4 py-3 rounded-lg text-left transition-colors ${
                qualityMode === mode.value
                  ? 'bg-[#15A4AE] text-white'
                  : 'bg-gray-100 dark:bg-white/5 border dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'
              }`}
            >
              <div className="font-medium">{mode.label}</div>
              <div className={`text-xs ${qualityMode === mode.value ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                {mode.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Credits Breakdown */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/30 rounded-lg p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-700 dark:text-gray-300">Credits per second:</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">{creditsPerSecond}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-700 dark:text-gray-300">Duration:</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">{duration}s</span>
        </div>
        <div className="pt-2 border-t border-blue-200 dark:border-blue-900/30 flex justify-between">
          <span className="font-semibold text-gray-900 dark:text-gray-100">Credits needed:</span>
          <span className="font-bold text-lg text-[#15A4AE]">{estimatedCredits}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>= ${estimatedCostUsd.toFixed(4)} @ $0.08/credit</span>
        </div>
        <div className="flex justify-between text-xs pt-2">
          <span className="text-gray-600 dark:text-gray-400">Wallet Balance:</span>
          <span className={`font-medium ${canAfford ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            ${walletBalance.toFixed(4)}
          </span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="flex gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/30">
          <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700 dark:text-green-300">Video generation started! Redirecting...</p>
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isLoading || !canAfford || success}
        className={`w-full py-3 font-semibold text-white rounded-lg transition-colors ${
          canAfford && !isLoading && !success
            ? 'bg-[#15A4AE] hover:bg-[#0f8a93]'
            : 'bg-gray-400 cursor-not-allowed'
        }`}
      >
        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />}
        {isLoading ? 'Generating...' : `Generate Video (${estimatedCredits} credits = $${estimatedCostUsd.toFixed(4)})`}
      </Button>

      {!canAfford && (
        <p className="text-sm text-red-600 dark:text-red-400 text-center">
          Insufficient credits. <a href="/settings/wallet" className="font-semibold underline">Add credits</a>
        </p>
      )}
    </form>
  )
}
