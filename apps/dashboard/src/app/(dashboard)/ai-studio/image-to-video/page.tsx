'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Film, Loader, AlertCircle, CheckCircle } from 'lucide-react'

interface GeneratedImage {
  id: string
  image: string
  prompt: string
  timestamp: number
  aspectRatio?: string
}

const QUALITY_MODES = [
  { value: 'fast', label: 'Fast', description: '720p - 6 credits/sec', creditsPerSecond: 6 },
  { value: 'pro_cinematic', label: 'Pro Cinematic', description: '1080p - 12 credits/sec', creditsPerSecond: 12 },
  { value: 'ultra_realistic', label: 'Ultra Realistic', description: '4K - 18 credits/sec', creditsPerSecond: 18 },
]

const DURATIONS = [5, 10, 15, 20, 30]

export default function ImageToVideoPage() {
  const router = useRouter()
  const [images, setImages] = useState<GeneratedImage[]>([])
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null)
  const [prompt, setPrompt] = useState('')
  const [duration, setDuration] = useState(10)
  const [qualityMode, setQualityMode] = useState<'fast' | 'pro_cinematic' | 'ultra_realistic'>('fast')
  const [aspectRatio, setAspectRatio] = useState('9:16')
  const [isGenerating, setIsGenerating] = useState(false)
  const [workspaceId, setWorkspaceId] = useState('')
  const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message?: string }>({ type: 'idle' })

  // Load images from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const wId = localStorage.getItem('workspaceId') || ''
      setWorkspaceId(wId)

      const savedHistory = localStorage.getItem('imageGenerationHistory')
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory)
        if (Array.isArray(parsed)) {
          setImages(parsed.filter((img: any) => img && img.image))
        }
      }
    } catch (error) {
      console.error('Error loading images:', error)
    }
  }, [])

  // Calculate credits
  const creditsPerSecond = QUALITY_MODES.find(m => m.value === qualityMode)?.creditsPerSecond || 6
  const estimatedCredits = creditsPerSecond * duration
  const estimatedCost = (estimatedCredits * 0.08).toFixed(2)

  const handleGenerate = async () => {
    if (!selectedImage || !prompt.trim() || !workspaceId) {
      setStatus({ type: 'error', message: 'Select an image and enter a prompt' })
      return
    }

    setIsGenerating(true)
    setStatus({ type: 'loading', message: 'Generating video...' })

    try {
      const response = await fetch('/api/videos/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': workspaceId,
        },
        body: JSON.stringify({
          prompt,
          video_type: 'image_to_video',
          source_image_url: selectedImage.image,
          aspect_ratio: aspectRatio || selectedImage.aspectRatio || '9:16',
          duration_seconds: duration,
          quality_mode: qualityMode,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate video')
      }

      const data = await response.json()
      setStatus({ type: 'success', message: 'Video generation started! Check your library.' })

      // Reset form
      setTimeout(() => {
        setPrompt('')
        setSelectedImage(null)
        setStatus({ type: 'idle' })
      }, 2000)
    } catch (error) {
      setStatus({ type: 'error', message: error instanceof Error ? error.message : 'Error generating video' })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 bg-white border-b border-gray-200">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Image to Video</h1>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-6 p-6 overflow-hidden">
        {/* Left: Image Selection */}
        <div className="w-80 flex flex-col bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900">Select Image</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {images.length === 0 ? (
              <p className="text-sm text-gray-600 text-center py-8">No images found. Generate images first.</p>
            ) : (
              images.map((img) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(img)}
                  className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                    selectedImage?.id === img.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex gap-3">
                    <img src={img.image} alt="thumbnail" className="w-12 h-12 rounded object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-900 font-medium truncate">{img.prompt.substring(0, 30)}...</p>
                      <p className="text-xs text-gray-500 mt-1">{img.aspectRatio || '1:1'}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: Video Settings & Preview */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Selected Image Preview */}
          {selectedImage && (
            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                <img src={selectedImage.image} alt="selected" className="w-full h-full object-cover" />
              </div>
              <p className="text-sm text-gray-700 mt-3">{selectedImage.prompt}</p>
            </div>
          )}

          {/* Settings Panel */}
          <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
            {/* Prompt */}
            <div>
              <label className="text-sm font-semibold text-gray-900 block mb-2">Motion Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the motion for the video (e.g., 'camera pans right', 'zoom in slowly')"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">{prompt.length}/500</p>
            </div>

            {/* Quality Mode */}
            <div>
              <label className="text-sm font-semibold text-gray-900 block mb-2">Quality</label>
              <div className="grid grid-cols-3 gap-2">
                {QUALITY_MODES.map((mode) => (
                  <button
                    key={mode.value}
                    onClick={() => setQualityMode(mode.value as any)}
                    className={`p-3 rounded-lg border-2 transition-all text-center ${
                      qualityMode === mode.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <p className="text-xs font-semibold text-gray-900">{mode.label}</p>
                    <p className="text-xs text-gray-600 mt-1">{mode.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="text-sm font-semibold text-gray-900 block mb-2">Duration</label>
              <div className="grid grid-cols-5 gap-2">
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                      duration === d
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {d}s
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio */}
            <div>
              <label className="text-sm font-semibold text-gray-900 block mb-2">Aspect Ratio</label>
              <div className="grid grid-cols-4 gap-2">
                {['9:16', '16:9', '1:1', '4:3'].map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                      aspectRatio === ratio
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            {/* Cost Estimate */}
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-600">
                Estimated cost: <span className="font-semibold text-gray-900">${estimatedCost}</span> ({estimatedCredits} credits)
              </p>
            </div>

            {/* Status */}
            {status.type !== 'idle' && (
              <div
                className={`rounded-lg p-3 flex items-center gap-2 text-sm ${
                  status.type === 'error'
                    ? 'bg-red-50 text-red-900'
                    : status.type === 'success'
                      ? 'bg-green-50 text-green-900'
                      : 'bg-blue-50 text-blue-900'
                }`}
              >
                {status.type === 'error' && <AlertCircle className="w-4 h-4" />}
                {status.type === 'success' && <CheckCircle className="w-4 h-4" />}
                {status.type === 'loading' && <Loader className="w-4 h-4 animate-spin" />}
                {status.message}
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!selectedImage || !prompt.trim() || isGenerating}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Film className="w-4 h-4" />
                  Generate Video
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
