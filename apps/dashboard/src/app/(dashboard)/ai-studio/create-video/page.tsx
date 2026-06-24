'use client'

import { useEffect, useState } from 'react'
import { Wand2, Zap, Download, RefreshCw, Library } from 'lucide-react'
import { GenerationLayout } from '@/components/ai-studio/generation-layout'
import { aiStudioAPI } from '@/lib/api/ai-studio'
import type { AspectRatio, AIModel } from '@/lib/types/ai-studio'

const MODELS = [
  'Video',
  'Dream Machine',
  'Motion',
  'Cinematic',
  'Flow',
  'Sync',
]
const ASPECT_RATIOS: AspectRatio[] = ['1:1', '4:5', '16:9', '9:16']
const DURATIONS = [5, 10, 15, 20, 25, 30]

interface LibraryImage {
  id: string
  name: string
  thumbnail: string
}

export default function CreateVideoPage() {
  const [tab, setTab] = useState<'image-to-video' | 'text-to-video'>('text-to-video')
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState(MODELS[0])
  const [duration, setDuration] = useState(15)
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'queued' | 'processing' | 'completed' | 'failed'>('idle')
  const [results, setResults] = useState<Array<{ id: string; url: string; status: string }>>([])
  const [loadingModels, setLoadingModels] = useState(true)
  const [models, setModels] = useState<AIModel[]>([])

  // Image to video states
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [showLibrary, setShowLibrary] = useState(false)
  const [libraryImages, setLibraryImages] = useState<LibraryImage[]>([])
  const [dragActive, setDragActive] = useState(false)

  useEffect(() => {
    const fetchModels = async () => {
      const fetchedModels = await aiStudioAPI.getImageModels()
      setModels(fetchedModels)
      if (fetchedModels.length > 0) {
        setModel(fetchedModels[0].id)
      }
      setLoadingModels(false)
    }
    fetchModels()
  }, [])

  // Mock library images
  useEffect(() => {
    setLibraryImages(
      Array.from({ length: 8 }, (_, i) => ({
        id: `lib-${i}`,
        name: `Library Image ${i + 1}`,
        thumbnail: `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23${['FF9500', '9B59B6', '1E3A8A', '059669'][i % 4]}" width="100" height="100"/%3E%3C/svg%3E`,
      }))
    )
  }, [])

  const handleImageSelect = (file: File) => {
    if (file.type.startsWith('image/')) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      handleImageSelect(files[0])
    }
  }

  const handleGenerate = async () => {
    if (tab === 'text-to-video' && !prompt.trim()) {
      alert('Please enter a prompt')
      return
    }

    if (tab === 'image-to-video' && !imageFile) {
      alert('Please select an image')
      return
    }

    setLoading(true)
    try {
      const result = {
        id: `video_${Date.now()}`,
        status: 'processing',
        outputUrl: '',
      }

      setStatus('processing')
      setResults([{ id: result.id, url: '', status: 'processing' }])

      // Simulate processing
      setTimeout(() => {
        setStatus('completed')
        setResults([{ id: result.id, url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%231E3A8A" width="400" height="300"/%3E%3C/svg%3E', status: 'completed' }])
      }, 3000)
    } catch (error) {
      console.error('Generation failed:', error)
      setStatus('failed')
    } finally {
      setLoading(false)
    }
  }

  const aspectRatioLabels: Record<AspectRatio, string> = {
    '1:1': '1:1',
    '4:5': '4:5',
    '16:9': '16:9',
    '9:16': '9:16',
  }

  return (
    <GenerationLayout
      title="Create Video"
      subtitle="Generate stunning AI videos from text or images"
    >
      {/* Left Panel - Specifications */}
      <div className="w-80 border-r border-gray-300 bg-white flex flex-col flex-shrink-0">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* Tab Selector */}
            <div className="flex gap-2 border-b border-gray-300">
              <button
                onClick={() => setTab('text-to-video')}
                className={`px-3 py-2 text-xs font-semibold uppercase tracking-widest border-b-2 transition-colors ${
                  tab === 'text-to-video'
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-600 hover:text-black'
                }`}
              >
                Text
              </button>
              <button
                onClick={() => setTab('image-to-video')}
                className={`px-3 py-2 text-xs font-semibold uppercase tracking-widest border-b-2 transition-colors ${
                  tab === 'image-to-video'
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-600 hover:text-black'
                }`}
              >
                Image
              </button>
            </div>

            {/* Model Selector Card */}
            <div className="bg-gray-100 border border-gray-300 rounded-xl p-4 hover:border-gray-400 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold text-black uppercase tracking-widest">Model</label>
                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">Pro</span>
              </div>
              {loadingModels ? (
                <div className="w-full px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-600 text-sm font-medium">
                  Loading models...
                </div>
              ) : (
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-black text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer font-medium"
                >
                  {MODELS.map((m) => (
                    <option key={m} value={m} className="bg-white text-black">
                      {m}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-xs text-gray-600 mt-2">Professional video generation</p>
            </div>

            {/* Duration Slider */}
            <div>
              <label className="block text-xs font-semibold text-black uppercase tracking-widest mb-3">
                Duration: <span className="text-blue-600">{duration}s</span>
              </label>
              <div className="relative pt-2">
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="1"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-600 slider"
                  style={{
                    background: `linear-gradient(to right, #2563eb 0%, #2563eb ${((duration - 5) / 25) * 100}%, #d1d5db ${((duration - 5) / 25) * 100}%, #d1d5db 100%)`
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-600 mt-2">
                <span>5s</span>
                <span>30s</span>
              </div>
            </div>

            {/* Aspect Ratio */}
            <div>
              <label className="block text-xs font-semibold text-black uppercase tracking-widest mb-3">
                Aspect Ratio
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ASPECT_RATIOS.map((ar) => (
                  <button
                    key={ar}
                    onClick={() => setAspectRatio(ar)}
                    className={`py-2.5 px-3 rounded-lg text-xs font-semibold transition-all duration-200 ${
                      aspectRatio === ar
                        ? 'bg-blue-500 text-white border border-blue-600 shadow-lg'
                        : 'border border-gray-300 bg-gray-100 hover:bg-gray-200 text-black hover:text-black'
                    }`}
                  >
                    {aspectRatioLabels[ar]}
                  </button>
                ))}
              </div>
            </div>

            {/* Credits Info */}
            <div className="p-3 rounded-lg bg-gray-100 border border-gray-300">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-700">Credits per video:</span>
                <span className="text-sm font-bold text-black">50</span>
              </div>
              <div className="text-xs text-gray-600 mt-2">You have 658 credits remaining</div>
            </div>
          </div>

          {/* Status Panel */}
          {status !== 'idle' && (
            <div className="border-t border-gray-300 px-6 py-6 flex-shrink-0 bg-white">
              <div className="p-4 rounded-lg border border-gray-300 bg-gray-50 space-y-3">
                <div className="flex items-center gap-2">
                  {status === 'processing' && <Zap className="w-4 h-4 animate-spin text-blue-600" />}
                  <span className="text-xs font-bold text-black uppercase tracking-wider">
                    {status === 'queued' && '📋 Queued'}
                    {status === 'processing' && '⏳ Processing'}
                    {status === 'completed' && '✨ Complete'}
                    {status === 'failed' && '❌ Failed'}
                  </span>
                </div>
                {status === 'processing' && (
                  <div className="w-full h-1 bg-gray-300 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 animate-pulse" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Generation Results */}
      <div className="flex-1 flex flex-col bg-white min-w-0">
        {/* Gallery Area - takes 85% of the space */}
        <div className="flex-[0.85] overflow-auto p-8">
          {results.length > 0 ? (
            <div>
              <h3 className="text-sm font-semibold text-black uppercase tracking-wider mb-6">Generated Videos</h3>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                {results.map((result) => (
                  <div
                    key={result.id}
                    className="group rounded-xl overflow-hidden border border-gray-300 hover:border-gray-400 transition-all duration-300 hover:shadow-lg"
                  >
                    <div className="relative aspect-video bg-gradient-to-br from-gray-100 via-gray-50 to-white">
                      {result.url ? (
                        <>
                          <img src={result.url} alt={result.id} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100 gap-3">
                            <button className="p-3 bg-white/95 hover:bg-white rounded-full transition-all duration-200 shadow-lg hover:shadow-xl">
                              <Download className="w-5 h-5 text-gray-900" />
                            </button>
                            <button className="p-3 bg-white/95 hover:bg-white rounded-full transition-all duration-200 shadow-lg hover:shadow-xl">
                              <RefreshCw className="w-5 h-5 text-gray-900" />
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center space-y-3">
                            <div className="inline-block">
                              <div className="animate-spin">
                                <Zap className="w-8 h-8 text-blue-500" />
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 font-medium">Generating...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-6 max-w-md">
                <div className="w-24 h-24 rounded-2xl bg-gray-200 border border-gray-300 flex items-center justify-center mx-auto">
                  <Wand2 className="w-12 h-12 text-gray-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-black">Ready to Create</h3>
                  <p className="text-sm text-gray-600">
                    {tab === 'text-to-video'
                      ? 'Enter a description and click Generate'
                      : 'Select an image and click Generate'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area - Fixed at Bottom */}
        <div className="border-t border-gray-300 px-6 py-3 bg-white flex gap-3 items-center justify-between">
          {tab === 'text-to-video' ? (
            <>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the video you want to create..."
                rows={3}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 bg-gray-50 hover:bg-white text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200 text-xs resize-none"
              />
              <button
                onClick={handleGenerate}
                disabled={loading || !prompt.trim()}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-lg font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-1 shadow-lg hover:shadow-blue-500/50 text-sm flex-shrink-0"
              >
                <Zap className="w-4 h-4" />
                {loading ? 'Gen...' : 'Gen'}
              </button>
            </>
          ) : (
            <>
              <div
                className="flex-1 relative"
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {imagePreview ? (
                  <div className="flex items-center gap-3 justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-300 flex-shrink-0">
                        <img src={imagePreview} alt="Selected" className="w-full h-full object-cover" />
                      </div>
                      <div className="text-sm text-black">
                        <p className="font-semibold">Image Selected</p>
                        <p className="text-xs text-gray-600">Ready to generate</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setImagePreview('')
                        setImageFile(null)
                      }}
                      className="px-3 py-1 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label
                    className={`w-full flex flex-col items-center justify-center gap-3 px-4 py-4 border-2 border-dashed rounded-lg font-semibold cursor-pointer transition-all ${
                      dragActive
                        ? 'border-blue-500 bg-blue-50 text-blue-600'
                        : 'border-gray-300 text-gray-600 hover:border-blue-500 hover:bg-blue-50'
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleImageSelect(e.target.files[0])
                        }
                      }}
                      className="hidden"
                    />
                    <div className="text-center">
                      <div className="mb-2">📤</div>
                      <p className="text-sm font-semibold">Drag & drop or click to select</p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          setShowLibrary(true)
                        }}
                        className="text-xs text-blue-600 hover:text-blue-700 font-semibold mt-2 underline"
                      >
                        or browse library
                      </button>
                    </div>
                  </label>
                )}
              </div>
              <button
                onClick={handleGenerate}
                disabled={loading || !imageFile}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-lg font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-1 shadow-lg hover:shadow-blue-500/50 text-sm flex-shrink-0"
              >
                <Zap className="w-4 h-4" />
                {loading ? 'Gen...' : 'Gen'}
              </button>
            </>
          )}
        </div>

        {/* Library Modal */}
        {showLibrary && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[80vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-300 p-6 flex items-center justify-between">
                <h2 className="text-xl font-bold text-black">Select Image from Library</h2>
                <button onClick={() => setShowLibrary(false)} className="text-gray-500 hover:text-gray-700 text-2xl">
                  ×
                </button>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {libraryImages.map((img) => (
                    <button
                      key={img.id}
                      onClick={() => {
                        setImagePreview(img.thumbnail)
                        setImageFile(new File([], img.name))
                        setShowLibrary(false)
                      }}
                      className="group relative rounded-lg overflow-hidden border-2 border-gray-300 hover:border-blue-500 transition-all cursor-pointer"
                    >
                      <img src={img.thumbnail} alt={img.name} className="w-full h-24 object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <span className="text-white font-semibold text-sm">Select</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </GenerationLayout>
  )
}
