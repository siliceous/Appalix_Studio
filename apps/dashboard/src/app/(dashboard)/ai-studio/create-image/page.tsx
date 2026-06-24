'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Sparkles, Download, Trash2, Heart, Loader } from 'lucide-react'
import Image from 'next/image'

const QUALITY_PRESETS = [
  { id: 'fast', label: 'Fast' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'quality', label: 'Quality' },
]

const RESOLUTIONS = [
  { id: '720', label: '720' },
  { id: '1080', label: '1080' },
  { id: '2k', label: '2K' },
  { id: '4k', label: '4K' },
]

const STYLES = [
  'Photorealistic',
  'Cinematic',
  'Anime',
  'Illustration',
  'Oil Painting',
  'Abstract',
  'Watercolor',
]

const LIGHTING_OPTIONS = [
  { id: 'daylight', label: 'Daylight' },
  { id: 'sunset', label: 'Sunset' },
  { id: 'dramatic', label: 'Dramatic' },
  { id: 'studio', label: 'Studio' },
  { id: 'neon', label: 'Neon' },
  { id: 'soft', label: 'Soft' },
]

const ASPECT_RATIOS = ['16:9', '9:16', '3:4', '1:1']

const aspectRatioLabels: Record<string, string> = {
  '16:9': '16:9',
  '9:16': '9:16',
  '3:4': '3:4',
  '1:1': '1:1',
}

export default function CreateImagePage() {
  const router = useRouter()

  const [model, setModel] = useState('nano-banana-pro')
  const [models, setModels] = useState<any[]>([])
  const [loadingModels, setLoadingModels] = useState(true)
  const [qualityPreset, setQualityPreset] = useState('balanced')
  const [resolution, setResolution] = useState('1080')
  const [temperature, setTemperature] = useState(1.0)
  const [style, setStyle] = useState('Photorealistic')
  const [lighting, setLighting] = useState<string[]>(['Daylight'])
  const [aspectRatio, setAspectRatio] = useState('9:16')
  const [quantity, setQuantity] = useState(1)

  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<string[]>([])
  const [credits, setCredits] = useState(100)
  const [workspaceId, setWorkspaceId] = useState<string>('')
  const [generationHistory, setGenerationHistory] = useState<Array<{ image: string; prompt: string }>>([])
  const [currentImageIndex, setCurrentImageIndex] = useState<number | null>(null)
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null)

  useEffect(() => {
    // Get workspace ID from localStorage
    const wId = typeof window !== 'undefined' ? localStorage.getItem('workspaceId') || '' : ''
    setWorkspaceId(wId)

    const fetchModels = async () => {
      try {
        const response = await fetch('/api/ai-studio/models/image')
        if (!response.ok) throw new Error('Failed to fetch')
        const data = await response.json()
        if (data.models) {
          setModels(data.models)
        }
      } catch (error) {
        console.error('Failed to fetch models:', error)
        setModels([
          { id: 'nano-banana', name: 'Nano Banana' },
          { id: 'nano-banana-2', name: 'Banana 2' },
          { id: 'nano-banana-pro', name: 'Banana Pro' },
        ])
      } finally {
        setLoadingModels(false)
      }
    }

    fetchModels()
  }, [])

  const handleGenerate = async () => {
    if (!prompt.trim() || !workspaceId) {
      console.log('Missing prompt or workspace:', { prompt: !!prompt.trim(), workspaceId })
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch('/api/ai-studio/generate/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': workspaceId,
        },
        body: JSON.stringify({
          prompt,
          model,
          qualityPreset,
          resolution,
          temperature,
          style,
          lighting: lighting.join(','),
          aspectRatio,
          quantity,
        }),
      })

      const data = await response.json()
      console.log('Generation response:', data)

      if (data.error) {
        console.error('Generation error:', data.error)
        setIsGenerating(false)
        return
      }

      // Generation is async - we have an ID to poll
      const generationId = data.id
      console.log('Generation started:', generationId)

      // Poll for completion
      let isComplete = false
      let attempts = 0
      const maxAttempts = 120 // 2 minutes with 1 second intervals

      while (!isComplete && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        attempts++

        try {
          const statusResponse = await fetch(`/api/ai-studio/generations/${generationId}`, {
            headers: {
              'x-workspace-id': workspaceId,
            },
          })

          const statusData = await statusResponse.json()
          console.log(`Poll attempt ${attempts}:`, statusData.status)

          if (statusData.status === 'completed') {
            if (statusData.imageUrls && statusData.imageUrls.length > 0) {
              const newImages = [...generatedImages, ...statusData.imageUrls]
              setGeneratedImages(newImages)
              // Store generation history with prompt
              const newHistory = statusData.imageUrls.map((img: string) => ({ image: img, prompt }))
              setGenerationHistory([...generationHistory, ...newHistory])
              console.log('Images received:', statusData.imageUrls.length)
            }
            isComplete = true
          } else if (statusData.status === 'failed') {
            console.error('Generation failed')
            isComplete = true
          }
        } catch (pollError) {
          console.error('Poll error:', pollError)
        }
      }

      if (!isComplete) {
        console.log('Generation timeout after', attempts, 'attempts')
      }
    } catch (error) {
      console.error('Generation failed:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const getCanvasClass = () => {
    switch (aspectRatio) {
      case '16:9':
        return 'aspect-video'
      case '9:16':
        return 'aspect-[9/16]'
      case '3:4':
        return 'aspect-[3/4]'
      case '1:1':
      default:
        return 'aspect-square'
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Create Image</h1>
        </div>
        <div className="text-sm text-gray-600">
          Credits: <span className="font-semibold text-gray-900">{credits}</span>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* Left Panel - Controls */}
        <div className="w-72 overflow-y-auto">
          <div className="flex-1 overflow-hidden px-4 py-4 space-y-2.5 flex flex-col text-sm">
            {/* Model Selector Card */}
            <div className="bg-gray-100 border border-gray-300 rounded-lg p-3 hover:border-gray-400 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-black uppercase tracking-widest">Model</label>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">Pro</span>
              </div>
              {loadingModels ? (
                <div className="w-full px-2 py-2 rounded-lg border border-gray-300 bg-white text-gray-600 text-xs font-medium">
                  Loading models...
                </div>
              ) : (
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-2 py-2 rounded-lg border border-gray-300 bg-white text-black text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer font-medium"
                >
                  {models.map((m) => (
                    <option key={m.id} value={m.id} className="bg-white text-black">
                      {m.name}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-xs text-gray-600 mt-1.5">Powered by Leonardo AI</p>
            </div>

            {/* Quality Preset */}
            <div>
              <label className="block text-xs font-semibold text-black uppercase tracking-widest mb-2">Quality</label>
              <div className="grid grid-cols-3 gap-2">
                {QUALITY_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setQualityPreset(preset.id)}
                    className={`py-2.5 px-2.5 rounded-lg text-xs font-bold transition-all duration-200 border ${
                      qualityPreset === preset.id
                        ? 'bg-blue-600 text-white border-blue-700 shadow-lg shadow-blue-600/40 hover:shadow-blue-600/50'
                        : 'bg-white text-gray-700 border-gray-200 shadow-md hover:shadow-lg hover:border-gray-300'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Resolution Selector */}
            <div>
              <label className="block text-xs font-semibold text-black uppercase tracking-widest mb-2">
                Resolution
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {RESOLUTIONS.map((res) => (
                  <button
                    key={res.id}
                    onClick={() => setResolution(res.id)}
                    className={`py-1.5 px-1 rounded-lg text-center transition-all duration-200 border shadow-md text-xs font-semibold ${
                      resolution === res.id
                        ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-600/40'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:shadow-lg'
                    }`}
                  >
                    {res.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Creativity Slider */}
            <div>
              <label className="block text-xs font-semibold text-black uppercase tracking-widest mb-2">
                Creativity: <span className="text-blue-600 text-xs">{temperature.toFixed(1)}</span>
              </label>
              <div className="relative pt-1">
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  style={{
                    background: `linear-gradient(to right, #2563eb 0%, #2563eb ${(temperature / 2) * 100}%, #d1d5db ${(temperature / 2) * 100}%, #d1d5db 100%)`
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-600 mt-1.5">
                <span>Consistent</span>
                <span>Creative</span>
              </div>
            </div>

            {/* Style Selector */}
            <div>
              <label className="block text-xs font-semibold text-black uppercase tracking-widest mb-2">
                Style
              </label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-black text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer shadow-md hover:shadow-lg transition-all"
              >
                {STYLES.map((s) => (
                  <option key={s} value={s} className="bg-white text-black">
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Lighting Effects */}
            <div>
              <label className="block text-xs font-semibold text-black uppercase tracking-widest mb-2">
                Lighting
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {LIGHTING_OPTIONS.map((light) => (
                  <button
                    key={light.id}
                    onClick={() => {
                      setLighting(prev =>
                        prev.includes(light.label)
                          ? prev.filter(l => l !== light.label)
                          : [...prev, light.label]
                      )
                    }}
                    className={`py-2 px-2 rounded-lg text-center transition-all duration-200 border text-xs font-semibold shadow-md ${
                      lighting.includes(light.label)
                        ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-600/40'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:shadow-lg'
                    }`}
                  >
                    {light.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Size (Aspect Ratio) */}
            <div>
              <label className="block text-xs font-semibold text-black uppercase tracking-widest mb-2">
                Size
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {ASPECT_RATIOS.map((ar) => (
                  <button
                    key={ar}
                    onClick={() => setAspectRatio(ar)}
                    className={`py-1.5 px-1 rounded-lg text-xs font-bold transition-all duration-200 border shadow-md ${
                      aspectRatio === ar
                        ? 'bg-blue-600 text-white border-blue-700 shadow-lg shadow-blue-600/40'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:shadow-lg'
                    }`}
                  >
                    {aspectRatioLabels[ar]}
                  </button>
                ))}
              </div>
            </div>

            {/* Qty */}
            <div>
              <label className="block text-xs font-semibold text-black uppercase tracking-widest mb-2">
                Qty: <span className="text-blue-600">{quantity}</span>
              </label>
              <div className="relative pt-1">
                <input
                  type="range"
                  min="1"
                  max="12"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  style={{
                    background: `linear-gradient(to right, #2563eb 0%, #2563eb ${((quantity - 1) / 11) * 100}%, #d1d5db ${((quantity - 1) / 11) * 100}%, #d1d5db 100%)`
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Center Panel - Canvas & Prompt */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* Canvas Preview - Show template in selected aspect ratio */}
          <div className="flex-1 bg-white rounded-xl shadow-lg p-8 flex items-center justify-center overflow-hidden">
            <div
              className={`relative bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden cursor-pointer hover:shadow-lg transition-shadow`}
              style={{
                width: aspectRatio === '16:9' ? '100%' : aspectRatio === '9:16' ? '60%' : aspectRatio === '3:4' ? '70%' : '80%',
                aspectRatio: aspectRatio === '16:9' ? '16/9' : aspectRatio === '9:16' ? '9/16' : aspectRatio === '3:4' ? '3/4' : '1/1',
              }}
            >
              {currentImageIndex !== null && generationHistory[currentImageIndex] ? (
                <Image
                  src={generationHistory[currentImageIndex].image}
                  alt="Generated"
                  fill
                  className="object-cover rounded-lg"
                />
              ) : generatedImages.length > 0 ? (
                <Image
                  src={generatedImages[generatedImages.length - 1]}
                  alt="Generated"
                  fill
                  className="object-cover rounded-lg"
                />
              ) : isGenerating ? (
                <div className="text-center">
                  <Loader className="w-12 h-12 mx-auto mb-2 animate-spin text-gray-400" />
                  <p className="text-sm text-gray-500">Generating...</p>
                </div>
              ) : (
                <div className="text-center">
                  <Sparkles className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm text-gray-500">{aspectRatioLabels[aspectRatio]}</p>
                </div>
              )}
            </div>
          </div>

          {/* Prompt Bar */}
          <div className="bg-white rounded-xl shadow-2xl p-4 border border-gray-300">
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what you want to create..."
                rows={3}
                maxLength={2000}
                className="w-full px-4 py-3 pr-16 text-black placeholder-gray-500 bg-white border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating || credits < quantity}
                className="absolute bottom-2 right-2 px-4 py-2 bg-black text-white text-xs font-medium rounded hover:bg-gray-800 disabled:bg-gray-400 transition-colors"
              >
                {isGenerating ? '...' : '→'}
              </button>
            </div>
            <div className="flex justify-end mt-2">
              <span className="text-xs text-gray-500">
                {prompt.length}/2000
              </span>
            </div>
          </div>
        </div>

        {/* Right Panel - Gallery */}
        <div className="w-72 flex flex-col bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900">
              Generated Images
            </h2>
            <p className="text-xs text-gray-600 mt-1">
              {generatedImages.length} image{generatedImages.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Image Grid */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {generatedImages.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
                No images yet
              </div>
            ) : (
              [...generationHistory].reverse().map((item, idx) => {
                const actualIdx = generationHistory.length - 1 - idx
                return (
                  <div
                    key={actualIdx}
                    onClick={() => {
                      setCurrentImageIndex(actualIdx)
                      setPrompt(item.prompt)
                      setFullscreenImage(item.image)
                    }}
                    className={`group relative bg-gray-100 rounded-lg overflow-hidden aspect-square cursor-pointer transition-all ${
                      currentImageIndex === actualIdx ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    <Image
                      src={item.image}
                      alt={`Generated ${actualIdx + 1}`}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 pointer-events-none">
                      <button className="p-2 bg-white rounded-full hover:bg-gray-200 transition-colors pointer-events-auto">
                        <Download className="w-4 h-4 text-gray-700" />
                      </button>
                      <button className="p-2 bg-white rounded-full hover:bg-gray-200 transition-colors pointer-events-auto">
                        <Heart className="w-4 h-4 text-gray-700" />
                      </button>
                      <button className="p-2 bg-white rounded-full hover:bg-gray-200 transition-colors pointer-events-auto">
                        <Trash2 className="w-4 h-4 text-gray-700" />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Modal */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setFullscreenImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] w-full h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={fullscreenImage}
              alt="Fullscreen"
              fill
              className="object-contain"
            />
            <button
              onClick={() => setFullscreenImage(null)}
              className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-gray-200 transition-colors"
            >
              <span className="text-gray-700 text-xl">×</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
