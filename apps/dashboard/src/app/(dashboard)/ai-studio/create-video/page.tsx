'use client'

import { useEffect, useState } from 'react'
import { Loader2, Plus, Download, Trash2, Film } from 'lucide-react'

const QUALITY_MODES = [
  { value: 'fast', label: 'Fast', description: '720p - 6 credits/sec', creditsPerSecond: 6 },
  { value: 'pro_cinematic', label: 'Pro Cinematic', description: '1080p - 12 credits/sec', creditsPerSecond: 12 },
  { value: 'ultra_realistic', label: 'Ultra Realistic', description: '4K - 18 credits/sec', creditsPerSecond: 18 },
]

const DURATIONS = [5, 10, 15, 20, 30]
const ASPECT_RATIOS = ['9:16', '16:9', '1:1', '4:3']

export default function CreateVideoPage() {
  const [prompt, setPrompt] = useState('')
  const [qualityMode, setQualityMode] = useState<'fast' | 'pro_cinematic' | 'ultra_realistic'>('fast')
  const [duration, setDuration] = useState(15)
  const [aspectRatio, setAspectRatio] = useState('9:16')
  const [isGenerating, setIsGenerating] = useState(false)
  const [workspaceId, setWorkspaceId] = useState('')
  const [videos, setVideos] = useState<any[]>([])
  const [credits, setCredits] = useState(0)

  useEffect(() => {
    const wId = typeof window !== 'undefined' ? localStorage.getItem('workspaceId') || '' : ''
    setWorkspaceId(wId)

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
      <div className="flex-1 flex gap-3 px-3 py-0 pb-3 overflow-hidden relative">
        {/* Left Panel - Settings */}
        <div className="w-72 flex flex-col rounded-2xl shadow-lg bg-white overflow-hidden">
          <div className="bg-black text-white px-4 py-3 rounded-t-2xl h-12 flex items-center flex-shrink-0">
            <h2 className="text-sm font-semibold">Settings</h2>
          </div>

          <div className="flex-1 min-h-0 overflow-y-scroll px-3 py-3 pr-2 pb-20 space-y-3 flex flex-col text-xs">
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
          <div className="bg-black text-white px-4 py-3 rounded-t-2xl h-12 flex items-center flex-shrink-0">
            <h2 className="text-sm font-semibold">Canvas</h2>
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

          {/* Floating Prompt Bar */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-[calc(100%-32px)] max-w-2xl">
            <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-4 flex gap-3 items-end">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the video you want to create..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-sm bg-white text-black placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none max-h-24"
                rows={2}
              />
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 flex-shrink-0 h-fit"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </>
                ) : (
                  <>
                    <Film className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
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
                      <div className="flex gap-1 mt-2">
                        <button className="p-1.5 hover:bg-gray-100 rounded transition-colors">
                          <Download className="w-3 h-3 text-gray-600" />
                        </button>
                        <button className="p-1.5 hover:bg-gray-100 rounded transition-colors">
                          <Trash2 className="w-3 h-3 text-gray-600" />
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
    </div>
  )
}
