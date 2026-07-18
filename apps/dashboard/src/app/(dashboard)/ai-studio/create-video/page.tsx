'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, Download, Trash2, Film, X, ArrowLeft, ChevronLeft } from 'lucide-react'
import { SageToolbar } from '@/components/dashboard/sage-toolbar'

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
          // Don't set prompt - user can enter their own description for the video
          sessionStorage.removeItem('importedImage')
        } catch (e) {
          console.error('Error loading imported image:', e)
        }
      }
    }

    if (wId) {
      setWorkspaceId(wId)
      fetchVideos()
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
      
      // Poll for video updates every 2 seconds
      const pollInterval = setInterval(fetchVideos, 2000)
      return () => clearInterval(pollInterval)
    }
  }, [workspaceId])

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


  const fetchVideos = async () => {
    if (!workspaceId) return
    try {
      const response = await fetch('/api/ai-studio/videos', {
        headers: { 'x-workspace-id': workspaceId }
      })
      if (response.ok) {
        const data = await response.json()
        const videoList = (data.videos || []).map((v: any) => ({
          id: v.id,
          status: v.status,
          title: v.title,
          output_url: v.output_url,
          ...v
        }))
        setVideos(videoList)
      }
    } catch (error) {
      console.error('Error fetching videos:', error)
    }
  }

  const handleGenerate = async () => {
    if (!workspaceId) {
      alert('Missing workspace ID')
      return
    }

    if (!prompt.trim()) {
      alert('Please enter a prompt for the video')
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
          start_image: startImage,
          end_image: endImage,
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
      setVideos([{ id: data.video_id, status: 'generating', ...data }, ...videos])
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
    <div className="-m-8 flex flex-col h-screen overflow-hidden" suppressHydrationWarning>
      <SageToolbar pageKey="email" />

      {/* Page Title */}
      <div className="pb-0 shrink-0 relative z-10" style={{ marginLeft: 'calc(20rem + 1.5rem + 0.75rem)', paddingTop: '1rem', paddingBottom: '0.25rem', marginTop: '5px', marginBottom: '5px' }}>
        <h1 className="text-lg font-bold text-gray-900">Video Generator</h1>
        <p className="text-gray-600 text-xs mt-0.5 mb-0">Create stunning AI-powered videos with professional settings</p>
      </div>

      <div className="flex flex-1 overflow-hidden gap-3 -mt-20">
        {/* Left Panel - Settings */}
        <div className="w-72 flex flex-col rounded-2xl shadow-lg bg-white overflow-hidden m-3 mt-24 flex-shrink-0">
          <div className="bg-black text-white px-4 py-3 h-12 flex items-center justify-between flex-shrink-0">
            <h2 className="text-sm font-semibold">Video Generator</h2>
            <button
              onClick={() => router.push("/ai-studio")}
              className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
              title="Back to AI Studio"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-scroll px-3 py-3 pr-2 pb-20 space-y-3 flex flex-col text-xs">
            {/* Start and End Images - Side by Side */}
            <div>
              <label className="text-xs font-semibold text-black uppercase tracking-widest mb-2 block">Key Frames</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <button
                    onClick={() => setShowStartImageModal(true)}
                    className="w-full h-16 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center justify-center text-gray-600 hover:text-blue-600 relative"
                  >
                    {startImage ? (
                      <div className="relative w-full h-full">
                        <img src={startImage} alt="Start" className="w-full h-full object-cover rounded-md" />
                        <div
                          onClick={(e) => {
                            e.stopPropagation()
                            setStartImage(null)
                          }}
                          className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/70 rounded-full cursor-pointer"
                        >
                          <X className="w-3 h-3 text-white" />
                        </div>
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
                    className="w-full h-16 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-all flex items-center justify-center text-gray-600 hover:text-green-600 relative"
                  >
                    {endImage ? (
                      <div className="relative w-full h-full">
                        <img src={endImage} alt="End" className="w-full h-full object-cover rounded-md" />
                        <div
                          onClick={(e) => {
                            e.stopPropagation()
                            setEndImage(null)
                          }}
                          className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/70 rounded-full cursor-pointer"
                        >
                          <X className="w-3 h-3 text-white" />
                        </div>
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
        <div className="flex-1 flex flex-col rounded-2xl shadow-lg bg-white overflow-hidden relative m-3 mt-24 mb-3">
          <div className="bg-black text-white px-4 py-3 rounded-t-2xl h-12 flex items-center justify-between flex-shrink-0">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1 px-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-white" />
              <span className="text-xs font-medium text-white">Back</span>
            </button>
            <div className="flex-1 flex items-center justify-center gap-6">
              <button onClick={() => router.push('/ai-studio/create-image')} className="text-xs font-medium text-gray-100 hover:text-white transition-colors">
                Create Image
              </button>
              <button className="text-xs font-bold text-white hover:text-blue-400 transition-colors">
                Create Video
              </button>
              <button onClick={() => router.push('/ai-studio/product-ads')} className="text-xs font-medium text-gray-100 hover:text-white transition-colors">
                Product Ads
              </button>
              <button onClick={() => router.push('/studio/talking-actors')} className="text-xs font-medium text-gray-100 hover:text-white transition-colors">
                Talking Actors
              </button>
            </div>
            <div className="flex items-center gap-4">
              <button className="text-xs font-medium text-gray-100 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/10">
                🤖 AI
              </button>
              <div className="text-xs font-semibold text-white">
                {credits} Credits
              </div>
            </div>
          </div>

          <div className="flex flex-col overflow-hidden h-full items-center p-4">
            {/* Preview Area - Grows/shrinks with aspect ratio */}
            <div className="flex-1 flex items-center justify-center w-full">
              <div className={`overflow-hidden flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg shadow-md ${
                aspectRatio === '9:16' ? 'aspect-[9/16] h-[480px]' :
                aspectRatio === '16:9' ? 'aspect-video h-96' :
                aspectRatio === '4:3' ? 'aspect-[4/3] h-96' :
                'aspect-square h-96'
              }`}>
                {isGenerating || videos.some(v => v.status === 'generating') ? (
                  <div className="text-center text-gray-400 flex flex-col items-center justify-center h-full animate-pulse">
                    <div className="inline-flex items-center justify-center mb-4">
                      <div className="w-16 h-16 rounded-full border-4 border-gray-300 border-t-blue-500 animate-spin" />
                    </div>
                    <p className="text-sm font-semibold">Rendering Video...</p>
                    <p className="text-xs mt-2 text-gray-500">This typically takes 2-5 minutes</p>
                  </div>
                ) : (
                  <div className="text-center text-gray-400 flex flex-col items-center justify-center h-full">
                    <Film className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-xs">Select image</p>
                  </div>
                )}
              </div>
            </div>
            {startImage && (
              <div className="text-center flex-shrink-0 p-3">
                {prompt && <p className="text-sm text-gray-700 font-medium">{prompt}</p>}
                <p className="text-xs text-gray-500 mt-2">Duration: {duration}s | Quality: {qualityMode.replace('_', ' ')} | Ratio: {aspectRatio}</p>
              </div>
            )}

            {/* Prompt Bar - Fixed at bottom */}
            <div className="bg-white rounded-lg border border-gray-300 flex flex-col overflow-hidden relative w-full mt-[25px] flex-shrink-0">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what you want to create..."
                rows={6}
                maxLength={10000}
                className="flex-1 w-full px-4 py-3 text-black placeholder-gray-500 bg-white border-none resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <div className="flex gap-2 items-center justify-between px-3 py-3 bg-gray-50 border-t border-gray-300">
                <span className="text-xs text-gray-500">{prompt.length} / 10000</span>
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || isGenerating}
                  className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors whitespace-nowrap flex-shrink-0"
                >
                  {isGenerating ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Generated Videos */}
        <div className="w-72 flex flex-col rounded-2xl shadow-lg bg-white overflow-hidden m-3 mt-24 flex-shrink-0">
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
                      <p className="text-xs font-medium text-gray-900 truncate">Video {(video.id || video.provider_job_id || 'unknown').slice(0, 8)}</p>
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
