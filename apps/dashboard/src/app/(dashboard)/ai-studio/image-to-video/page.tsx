'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Film, Loader2, AlertCircle, CheckCircle } from 'lucide-react'

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
const ASPECT_RATIOS = ['9:16', '16:9', '1:1', '4:3']

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
  const [videos, setVideos] = useState<any[]>([])

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
          if (parsed.length > 0 && !selectedImage) {
            setSelectedImage(parsed[0])
          }
        }
      }
    } catch (error) {
      console.error('Error loading images:', error)
    }
  }, [])

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
      setStatus({ type: 'success', message: 'Video generation started!' })
      setVideos([data, ...videos])

      setTimeout(() => {
        setPrompt('')
        setStatus({ type: 'idle' })
      }, 2000)
    } catch (error) {
      setStatus({ type: 'error', message: error instanceof Error ? error.message : 'Error generating video' })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      <div className="flex-1 flex gap-3 px-3 py-0 pb-3 overflow-hidden">
        {/* Left Panel - Settings */}
        <div className="w-72 flex flex-col rounded-2xl shadow-lg bg-white overflow-hidden">
          <div className="bg-black text-white px-4 py-3 rounded-t-2xl h-12 flex items-center flex-shrink-0">
            <h2 className="text-sm font-semibold">Settings</h2>
          </div>

          <div className="flex-1 min-h-0 overflow-y-scroll px-3 py-3 pr-2 pb-20 space-y-3 flex flex-col text-xs">
            {/* Select Image */}
            <div>
              <label className="text-xs font-semibold text-black uppercase tracking-widest mb-2 block">
                Source Image
              </label>
              <select
                value={selectedImage?.id || ''}
                onChange={(e) => {
                  const img = images.find(i => i.id === e.target.value)
                  if (img) setSelectedImage(img)
                }}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-black text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Choose an image...</option>
                {images.map((img) => (
                  <option key={img.id} value={img.id}>
                    {img.prompt.substring(0, 40)}... ({img.aspectRatio || '1:1'})
                  </option>
                ))}
              </select>
            </div>

            {/* Motion Prompt */}
            <div>
              <label className="text-xs font-semibold text-black uppercase tracking-widest mb-2 block">
                Motion Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the motion (e.g., 'camera pans right', 'zoom in slowly')"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white text-black focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                rows={4}
              />
              <p className="text-xs text-gray-500 mt-1">{prompt.length}/500</p>
            </div>

            {/* Quality Mode */}
            <div>
              <label className="text-xs font-semibold text-black uppercase tracking-widest mb-2 block">Quality</label>
              <div className="space-y-2">
                {QUALITY_MODES.map((mode) => (
                  <button
                    key={mode.value}
                    onClick={() => setQualityMode(mode.value as any)}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-semibold transition-all border ${
                      qualityMode === mode.value
                        ? 'bg-blue-600 text-white border-blue-700 shadow-md'
                        : 'bg-white text-gray-700 border-gray-200 hover:shadow-md'
                    }`}
                  >
                    {mode.label} - {mode.description}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="text-xs font-semibold text-black uppercase tracking-widest mb-2 block">Duration (seconds)</label>
              <div className="grid grid-cols-5 gap-2">
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`py-2 rounded-lg text-xs font-semibold transition-all border ${
                      duration === d
                        ? 'bg-blue-600 text-white border-blue-700 shadow-md'
                        : 'bg-white text-gray-700 border-gray-200 hover:shadow-md'
                    }`}
                  >
                    {d}s
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio */}
            <div>
              <label className="text-xs font-semibold text-black uppercase tracking-widest mb-2 block">Aspect Ratio</label>
              <div className="grid grid-cols-2 gap-2">
                {ASPECT_RATIOS.map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`py-2 rounded-lg text-xs font-semibold transition-all border ${
                      aspectRatio === ratio
                        ? 'bg-blue-600 text-white border-blue-700 shadow-md'
                        : 'bg-white text-gray-700 border-gray-200 hover:shadow-md'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            {/* Cost Estimate */}
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <p className="text-xs text-gray-700">
                <span className="font-semibold">Estimated: </span>${estimatedCost} ({estimatedCredits} credits)
              </p>
            </div>

            {/* Status */}
            {status.type !== 'idle' && (
              <div className={`p-3 rounded-lg flex gap-2 items-start ${
                status.type === 'loading' ? 'bg-blue-50 border border-blue-200' :
                status.type === 'success' ? 'bg-green-50 border border-green-200' :
                'bg-red-50 border border-red-200'
              }`}>
                {status.type === 'loading' && <Loader2 className="w-4 h-4 animate-spin text-blue-600 flex-shrink-0 mt-0.5" />}
                {status.type === 'success' && <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />}
                {status.type === 'error' && <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />}
                <p className={`text-xs ${
                  status.type === 'loading' ? 'text-blue-700' :
                  status.type === 'success' ? 'text-green-700' :
                  'text-red-700'
                }`}>
                  {status.message}
                </p>
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !selectedImage}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 mt-auto"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
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

        {/* Middle - Canvas Preview */}
        <div className="flex-1 flex flex-col rounded-2xl shadow-lg bg-white overflow-hidden">
          <div className="bg-black text-white px-4 py-3 rounded-t-2xl h-12 flex items-center flex-shrink-0">
            <h2 className="text-sm font-semibold">Canvas</h2>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden p-6 flex items-center justify-center bg-gray-50">
            {selectedImage ? (
              <div className="flex flex-col items-center gap-4 w-full h-full">
                <div className={`flex-1 rounded-lg overflow-hidden border-2 border-gray-200 flex items-center justify-center ${
                  aspectRatio === '9:16' ? 'aspect-[9/16] w-48' :
                  aspectRatio === '16:9' ? 'aspect-video w-96' :
                  aspectRatio === '4:3' ? 'aspect-[4/3] w-80' :
                  'aspect-square w-80'
                }`}>
                  <img src={selectedImage.image} alt="preview" className="w-full h-full object-cover" />
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Motion: {prompt || 'Enter prompt above'}</p>
                  <p className="text-xs text-gray-500 mt-1">Duration: {duration}s | Quality: {qualityMode.replace('_', ' ')}</p>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400">
                <Film className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Select an image to start</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Generated Videos */}
        <div className="w-80 flex flex-col rounded-2xl shadow-lg bg-white overflow-hidden">
          <div className="bg-black text-white px-4 py-3 rounded-t-2xl h-12 flex items-center flex-shrink-0">
            <h2 className="text-sm font-semibold">Generated Videos</h2>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
            {videos.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <Film className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No videos yet</p>
              </div>
            ) : (
              videos.map((video) => (
                <div key={video.id} className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-all">
                  <div className="flex gap-2 items-start">
                    <div className="w-12 h-12 rounded bg-gray-100 flex-shrink-0 flex items-center justify-center">
                      <Film className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">Video {video.id.slice(0, 8)}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {video.status === 'generating' ? '⏳ Generating...' :
                         video.status === 'ready' ? '✓ Ready' :
                         video.status === 'failed' ? '✗ Failed' : video.status}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
