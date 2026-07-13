'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, Download, Trash2, Film, X, ArrowLeft } from 'lucide-react'

const QUALITY_MODES = [
  { value: 'fast', label: 'Fast', description: '720p - 6 credits/sec', creditsPerSecond: 6 },
  { value: 'pro_cinematic', label: 'Pro Cinematic', description: '1080p - 12 credits/sec', creditsPerSecond: 12 },
  { value: 'ultra_realistic', label: 'Ultra Realistic', description: '4K - 18 credits/sec', creditsPerSecond: 18 },
]

const DURATIONS = [5, 10, 15, 20, 30]
const ASPECT_RATIOS = ['9:16', '16:9', '1:1', '4:3']

export default function CreateVideoPage() {
  const router = useRouter()
  const [prompt, setPrompt] = useState('')
  const [qualityMode, setQualityMode] = useState<'fast' | 'pro_cinematic' | 'ultra_realistic'>('fast')
  const [duration, setDuration] = useState(15)
  const [aspectRatio, setAspectRatio] = useState('9:16')
  const [isGenerating, setIsGenerating] = useState(false)
  const [workspaceId, setWorkspaceId] = useState('')
  const [videos, setVideos] = useState<any[]>([])
  const [credits, setCredits] = useState(0)
  const [startImage, setStartImage] = useState<string | null>(null)
  const [endImage, setEndImage] = useState<string | null>(null)
  const [showStartImageModal, setShowStartImageModal] = useState(false)
  const [showEndImageModal, setShowEndImageModal] = useState(false)
  const [showTrash, setShowTrash] = useState(false)
  const startImageInputRef = useRef<HTMLInputElement>(null)
  const endImageInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const wId = typeof window !== 'undefined' ? localStorage.getItem('workspaceId') || '' : ''
    setWorkspaceId(wId)

    // Check for imported image from library
    if (typeof window !== 'undefined') {
      const importedImageStr = sessionStorage.getItem('importedImage')
      if (importedImageStr) {
        try {
          const importedImage = JSON.parse(importedImageStr)
          console.log('[CreateVideo] Imported image:', importedImage)
          setStartImage(importedImage.image)
          const promptText = importedImage.prompt || ''
          console.log('[CreateVideo] Setting prompt:', promptText)
          setPrompt(promptText)
          sessionStorage.removeItem('importedImage')
        } catch (e) {
          console.error('Error loading imported image:', e)
        }
      }
    }

    if (wId) {
      const fetchCredits = async () => {
        try {
          const response = await fetch('/api/wallet/balance', { headers: { 'x-workspace-id': wId } })
          if (response.ok) {
            const data = await response.json()
            setCredits(data.credits || 0)
          }
        } catch (error) {
          console.error('Error loading credits:', error)
        }
      }
      fetchCredits()
    }
  }, [])

  const creditsPerSecond = QUALITY_MODES.find(m => m.value === qualityMode)?.creditsPerSecond || 6
  const estimatedCredits = creditsPerSecond * duration
  const estimatedCost = (estimatedCredits * 0.08).toFixed(2)

  const handleImageSelect = (type: 'start' | 'end', file: File) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageData = e.target?.result as string
        if (type === 'start') {
          setStartImage(imageData)
          setShowStartImageModal(false)
        } else {
          setEndImage(imageData)
          setShowEndImageModal(false)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm('Delete this video?')) return
    try {
      const response = await fetch(`/api/videos/${videoId}`, {
        method: 'DELETE',
        headers: { 'x-workspace-id': workspaceId },
      })
      if (response.ok) {
        setVideos(videos.filter(v => v.id !== videoId))
      }
    } catch (error) {
      console.error('Error deleting video:', error)
    }
  }

  const handleGenerate = async () => {
    if (!prompt.trim() || !workspaceId) {
      alert('Please enter a prompt')
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch('/api/ai-studio/generate/video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': workspaceId,
        },
        body: JSON.stringify({
          prompt,
          duration_seconds: duration,
          quality_mode: qualityMode,
          aspect_ratio: aspectRatio,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate video')
      }

      const data = await response.json()
      setVideos([data, ...videos])
      setPrompt('')
      alert('Video generation started!')
    } catch (error) {
      console.error('Generation failed:', error)
      alert(error instanceof Error ? error.message : 'Failed to generate video')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      <div className="flex-1 flex gap-3 px-3 py-3 pb-3 overflow-hidden relative">
        {/* Left Panel - Settings */}
        <div className="w-72 flex flex-col rounded-2xl shadow-lg bg-white overflow-hidden">
          <div className="bg-black text-white px-4 py-3 rounded-t-2xl h-12 flex items-center flex-shrink-0">
            <h2 className="text-sm font-semibold">Settings</h2>
          </div>

          <div className="flex-1 min-h-0 overflow-y-scroll px-3 py-3 pr-2 pb-20 space-y-3 flex flex-col text-xs">
            {/* Start and End Images - Side by Side */}
            <div>
              <label className="text-xs font-semibold text-black uppercase tracking-widest mb-2 block">Key Frames</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <button
                    onClick={() => setShowStartImageModal(true)}
                    className="w-full h-16 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center justify-center text-gray-600 hover:text-blue-600"
                  >
                    {startImage ? (
                      <div className="relative w-full h-full">
                        <img src={startImage} alt="Start" className="w-full h-full object-cover rounded-md" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setStartImage(null)
                          }}
                          className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/70 rounded-full"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Film className="w-4 h-4 mx-auto mb-1" />
                        <span className="text-xs font-medium">Start</span>
                      </div>
                    )}
                  </button>
                </div>

                <div className="flex-1">
                  <button
                    onClick={() => setShowEndImageModal(true)}
                    className="w-full h-16 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-all flex items-center justify-center text-gray-600 hover:text-green-600"
                  >
                    {endImage ? (
                      <div className="relative w-full h-full">
                        <img src={endImage} alt="End" className="w-full h-full object-cover rounded-md" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setEndImage(null)
                          }}
                          className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/70 rounded-full"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Film className="w-4 h-4 mx-auto mb-1" />
                        <span className="text-xs font-medium">End</span>
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Quality Mode */}
            <div>
              <label className="text-xs font-semibold text-black uppercase tracking-widest mb-2 block">Quality</label>
              <div className="space-y-2">
                {QUALITY_MODES.map((mode) => (
                  <button
                    key={mode.value}
                    onClick={() => setQualityMode(mode.value as any)}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-semibold transition-all border text-center ${
                      qualityMode === mode.value
                        ? 'bg-blue-600 text-white border-blue-700 shadow-md'
                        : 'bg-white text-gray-700 border-gray-200 hover:shadow-md'
                    }`}
                  >
                    {mode.label}
                    <span className="block text-xs opacity-75 mt-0.5">{mode.description}</span>
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
              <p className="text-xs text-gray-600 mt-2">Balance: {credits} credits</p>
            </div>
          </div>
        </div>

        {/* Middle - Canvas Preview */}
        <div className="flex-1 flex flex-col rounded-2xl shadow-lg bg-white overflow-hidden relative">
          <div className="bg-black text-white px-4 py-3 rounded-t-2xl h-12 flex items-center justify-between flex-shrink-0">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1 px-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-white" />
              <span className="text-xs font-medium text-white">Back</span>
            </button>
            <h2 className="text-sm font-semibold flex-1 text-center">Create Video</h2>
            <div className="text-xs font-semibold text-white">
              {credits} Credits
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden p-6 flex items-center justify-center bg-gray-50">
            {prompt ? (
              <div className="flex flex-col items-center gap-4 text-center w-full">
                <div className={`flex-1 rounded-lg overflow-hidden border-2 border-gray-200 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 ${
                  aspectRatio === '9:16' ? 'aspect-[9/16] w-48' :
                  aspectRatio === '16:9' ? 'aspect-video w-96' :
                  aspectRatio === '4:3' ? 'aspect-[4/3] w-80' :
                  'aspect-square w-80'
                }`}>
                  <Film className="w-12 h-12 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-700 font-medium">{prompt}</p>
                  <p className="text-xs text-gray-500 mt-2">Duration: {duration}s | Quality: {qualityMode.replace('_', ' ')} | Ratio: {aspectRatio}</p>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400">
                <Film className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Enter a prompt to preview</p>
              </div>
            )}
          </div>

          {/* Prompt Bar */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 flex flex-col gap-2">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what you want to create..."
              rows={6}
              maxLength={2000}
              className="w-full px-4 py-3 text-black placeholder-gray-500 bg-white border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <div className="flex justify-between items-center gap-2">
              <div className="flex gap-2 flex-1">
                {/* Placeholder for future action buttons */}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{prompt.length}/2000</span>
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || isGenerating}
                  className="px-4 py-2 bg-black text-white text-sm font-medium rounded hover:bg-gray-800 disabled:bg-gray-400 transition-colors whitespace-nowrap"
                >
                  {isGenerating ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Generated Videos */}
        <div className="w-80 flex flex-col rounded-2xl shadow-lg bg-white overflow-hidden">
          <div className="bg-black text-white px-4 py-3 rounded-t-2xl h-12 flex items-center justify-between flex-shrink-0">
            <h2 className="text-sm font-semibold">Generated Videos</h2>
            <button
              onClick={() => setShowTrash(!showTrash)}
              className="text-xs text-white hover:text-gray-200 font-medium"
            >
              {showTrash ? '← Back' : 'Trash'}
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
            {showTrash ? (
              <div className="text-center text-gray-400 py-8">
                <Trash2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">Trash is empty</p>
              </div>
            ) : videos.length === 0 ? (
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
                      <div className="flex gap-1 mt-2">
                        <button className="p-1.5 hover:bg-gray-100 rounded transition-colors">
                          <Download className="w-3 h-3 text-gray-600" />
                        </button>
                        <button
                          onClick={() => handleDeleteVideo(video.id)}
                          className="p-1.5 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-3 h-3 text-red-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Start Image Modal */}
      {showStartImageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-black">Select Start Image</h3>
              <button
                onClick={() => setShowStartImageModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => startImageInputRef.current?.click()}
                className="w-full py-3 px-4 border-2 border-dashed border-blue-300 rounded-lg hover:bg-blue-50 text-blue-600 font-medium transition-colors"
              >
                Upload Image
              </button>
              <input
                ref={startImageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleImageSelect('start', file)
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* End Image Modal */}
      {showEndImageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-black">Select End Image</h3>
              <button
                onClick={() => setShowEndImageModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => endImageInputRef.current?.click()}
                className="w-full py-3 px-4 border-2 border-dashed border-green-300 rounded-lg hover:bg-green-50 text-green-600 font-medium transition-colors"
              >
                Upload Image
              </button>
              <input
                ref={endImageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleImageSelect('end', file)
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
