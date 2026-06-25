'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Sparkles, Download, Trash2, Heart, Loader, X, Copy } from 'lucide-react'

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
  '3D',
  'Digital Painting',
  'Sketch',
  'Comic Book',
  'Game Art',
  'Pixel Art',
  'Low Poly',
  'Isometric',
  'Cartoon',
  'Storybook',
  'Gothic',
  'Cyberpunk',
  'Steampunk',
  'Art Deco',
  'Retro',
  'Vintage',
  'Renaissance',
  'Baroque',
  'Impressionist',
  'Surreal',
  'Minimalist',
  'Street Art',
  'Graffiti',
  'Marble Sculpture',
  'Paper Cut',
  'Mosaic',
  'Stained Glass',
  'Neon',
  'Holographic',
  'Glamour',
  'Fashion',
  'Anatomical',
  'Blueprint',
  'Technical Drawing',
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

interface GeneratedImage {
  id: string
  image: string
  prompt: string
  timestamp: number
  deletedAt?: number
}

export default function CreateImagePage() {
  const router = useRouter()

  // Generator settings
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

  // State management
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [history, setHistory] = useState<GeneratedImage[]>([])
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null)
  const [credits, setCredits] = useState(100)
  const [workspaceId, setWorkspaceId] = useState<string>('')
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null)
  const [fullscreenImageData, setFullscreenImageData] = useState<GeneratedImage | null>(null)
  const [showTrash, setShowTrash] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [newProjectName, setNewProjectName] = useState('')
  const [isSavingProject, setIsSavingProject] = useState(false)
  const [imageToSave, setImageToSave] = useState<GeneratedImage | null>(null)

  // Load initial data
  useEffect(() => {
    const wId = typeof window !== 'undefined' ? localStorage.getItem('workspaceId') || '' : ''
    setWorkspaceId(wId)

    // Images are kept in memory during this session
    // localStorage is only used for persistence of metadata, not image data

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

  // Load projects after workspace ID is available
  useEffect(() => {
    if (!workspaceId) return

    const fetchProjects = async () => {
      try {
        const response = await fetch('/api/projects', {
          headers: {
            'x-workspace-id': workspaceId,
          },
        })
        if (!response.ok) throw new Error('Failed to fetch')
        const data = await response.json()
        setProjects(data.projects || [])
      } catch (error) {
        console.error('Failed to fetch projects:', error)
      }
    }

    fetchProjects()
  }, [workspaceId])

  // Save history to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && history.length > 0) {
      try {
        // Keep only last 10 images to avoid quota issues
        // Store only IDs and metadata, not full base64 images
        const recentHistory = history.slice(-10).map(img => ({
          id: img.id,
          prompt: img.prompt,
          timestamp: img.timestamp,
          deletedAt: img.deletedAt,
          // Don't store the base64 image data in localStorage
        }))
        localStorage.setItem('imageGenerationHistory', JSON.stringify(recentHistory))
      } catch (error) {
        console.error('Failed to save to localStorage:', error)
      }
    }
  }, [history])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && fullscreenImage) {
        setFullscreenImage(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [fullscreenImage])

  const handleGenerate = async () => {
    if (!prompt.trim() || !workspaceId) {
      console.log('Missing prompt or workspace')
      return
    }

    // Clear canvas and show loading state
    setIsGenerating(true)
    setSelectedImage(null)
    setFullscreenImage(null)

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
      if (data.error) {
        console.error('Generation error:', data.error)
        setIsGenerating(false)
        return
      }

      const generationId = data.id
      console.log('Generation started:', generationId)

      // Poll for completion
      let isComplete = false
      let attempts = 0
      const maxAttempts = 120

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

          if (statusData.status === 'completed') {
            if (statusData.imageUrls && statusData.imageUrls.length > 0) {
              // Add all new images to history
              const newImages = statusData.imageUrls.map((img: string, idx: number) => ({
                id: `${generationId}-${idx}`,
                image: img,
                prompt,
                timestamp: Date.now(),
              }))

              setHistory(prev => [...prev, ...newImages])

              // Select the last generated image
              setSelectedImage(newImages[newImages.length - 1])
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
        console.log('Generation timeout')
      }
    } catch (error) {
      console.error('Generation failed:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDeleteImage = (imageId: string) => {
    // Soft delete: mark with deletedAt timestamp
    setHistory(prev =>
      prev.map(img =>
        img.id === imageId ? { ...img, deletedAt: Date.now() } : img
      )
    )
    if (selectedImage?.id === imageId) {
      setSelectedImage(null)
    }
    // Close fullscreen if open
    if (fullscreenImageData?.id === imageId) {
      setFullscreenImage(null)
      setFullscreenImageData(null)
    }
  }

  const handleRestoreImage = (imageId: string) => {
    // Remove deletedAt to restore
    setHistory(prev =>
      prev.map(img =>
        img.id === imageId ? { ...img, deletedAt: undefined } : img
      )
    )
  }

  const handlePermanentlyDeleteImage = (imageId: string) => {
    // Permanently remove from history
    setHistory(prev => prev.filter(img => img.id !== imageId))
  }

  const handleDownloadImage = (image: GeneratedImage) => {
    const link = document.createElement('a')
    link.href = image.image
    link.download = `appalix-image-${image.id}.png`
    link.click()
  }

  const handleSaveImage = (image: GeneratedImage) => {
    setImageToSave(image)
    setShowSaveDialog(true)
    setSelectedProjectId(projects.length > 0 ? projects[0].id : '')
  }

  const handleSaveToProject = async () => {
    if (!imageToSave || !workspaceId) return

    setIsSavingProject(true)
    try {
      let projectId = selectedProjectId
      let projectName = newProjectName

      // Create new project if needed
      if (newProjectName.trim()) {
        const createResponse = await fetch('/api/projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-workspace-id': workspaceId,
          },
          body: JSON.stringify({
            name: newProjectName,
            description: `Generated images collection`,
          }),
        })

        if (!createResponse.ok) throw new Error('Failed to create project')
        const newProject = await createResponse.json()
        projectId = newProject.id
        projectName = newProject.name

        // Add to projects list
        setProjects([...projects, newProject])
        setNewProjectName('')
      }

      // Save image to project as a document/file
      if (projectId) {
        const saveResponse = await fetch(`/api/projects/${projectId}/images`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-workspace-id': workspaceId,
          },
          body: JSON.stringify({
            imageId: imageToSave.id,
            image: imageToSave.image,
            prompt: imageToSave.prompt,
            timestamp: imageToSave.timestamp,
          }),
        })

        if (!saveResponse.ok) throw new Error('Failed to save image')

        // Show success feedback
        console.log('Image saved to project successfully')
        setShowSaveDialog(false)
        setImageToSave(null)
        setSelectedProjectId('')
      }
    } catch (error) {
      console.error('Failed to save image:', error)
      alert('Failed to save image to project. Please try again.')
    } finally {
      setIsSavingProject(false)
    }
  }

  const handleReusePrompt = (image: GeneratedImage) => {
    setPrompt(image.prompt)
    setSelectedImage(image)
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
          <div className="px-4 py-4 space-y-2.5 flex flex-col text-sm">
            {/* Model Selector */}
            <div className="bg-gray-100 border border-gray-300 rounded-lg p-3">
              <label className="text-xs font-semibold text-black uppercase tracking-widest mb-2 block">
                Model
              </label>
              {loadingModels ? (
                <div className="px-2 py-2 rounded-lg border border-gray-300 bg-white text-gray-600 text-xs">
                  Loading...
                </div>
              ) : (
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-2 py-2 rounded-lg border border-gray-300 bg-white text-black text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Quality Preset */}
            <div>
              <label className="text-xs font-semibold text-black uppercase tracking-widest mb-2 block">
                Quality
              </label>
              <div className="grid grid-cols-3 gap-2">
                {QUALITY_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setQualityPreset(preset.id)}
                    className={`py-2 px-2 rounded-lg text-xs font-bold transition-all border shadow-md ${
                      qualityPreset === preset.id
                        ? 'bg-blue-600 text-white border-blue-700 shadow-lg'
                        : 'bg-white text-gray-700 border-gray-200 hover:shadow-lg'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Resolution */}
            <div>
              <label className="text-xs font-semibold text-black uppercase tracking-widest mb-2 block">
                Resolution
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {RESOLUTIONS.map((res) => (
                  <button
                    key={res.id}
                    onClick={() => setResolution(res.id)}
                    className={`py-1.5 px-1 rounded-lg text-xs font-semibold transition-all border shadow-md ${
                      resolution === res.id
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:shadow-lg'
                    }`}
                  >
                    {res.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Creativity */}
            <div>
              <label className="text-xs font-semibold text-black uppercase tracking-widest mb-2 block">
                Creativity: <span className="text-blue-600">{temperature.toFixed(1)}</span>
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-300 rounded-lg accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-1.5">
                <span>Consistent</span>
                <span>Creative</span>
              </div>
            </div>

            {/* Style */}
            <div>
              <label className="text-xs font-semibold text-black uppercase tracking-widest mb-2 block">
                Style
              </label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-black text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-md"
              >
                {STYLES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Lighting */}
            <div>
              <label className="text-xs font-semibold text-black uppercase tracking-widest mb-2 block">
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
                    className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all border shadow-md ${
                      lighting.includes(light.label)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:shadow-lg'
                    }`}
                  >
                    {light.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Size */}
            <div>
              <label className="text-xs font-semibold text-black uppercase tracking-widest mb-2 block">
                Size
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {ASPECT_RATIOS.map((ar) => (
                  <button
                    key={ar}
                    onClick={() => setAspectRatio(ar)}
                    className={`py-1.5 px-1 rounded-lg text-xs font-bold transition-all border shadow-md ${
                      aspectRatio === ar
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:shadow-lg'
                    }`}
                  >
                    {aspectRatioLabels[ar]}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="text-xs font-semibold text-black uppercase tracking-widest mb-2 block">
                Qty: <span className="text-blue-600">{quantity}</span>
              </label>
              <input
                type="range"
                min="1"
                max="12"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-300 rounded-lg accent-blue-600"
              />
            </div>
          </div>
        </div>

        {/* Center Panel - Canvas */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* Canvas Preview */}
          <div
            className="flex-1 bg-white rounded-xl shadow-lg p-8 flex items-center justify-center overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
            onClick={() => {
              if (selectedImage) {
                setFullscreenImageData(selectedImage)
                setFullscreenImage(selectedImage.image)
              }
            }}
            data-canvas
          >
            {isGenerating ? (
              <div className="text-center">
                <Loader className="w-16 h-16 mx-auto mb-4 animate-spin text-blue-600" />
                <p className="text-sm text-gray-600">Generating image...</p>
              </div>
            ) : selectedImage ? (
              <img
                src={selectedImage.image}
                alt="Generated"
                className="max-w-full max-h-full w-auto h-auto object-contain"
              />
            ) : (
              <div className="text-center">
                <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-30 text-gray-400" />
                <p className="text-sm text-gray-500">{aspectRatioLabels[aspectRatio]}</p>
              </div>
            )}
          </div>

          {/* Prompt Bar */}
          <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-300">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what you want to create..."
              rows={3}
              maxLength={2000}
              className="w-full px-4 py-3 pr-16 text-black placeholder-gray-500 bg-white border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <div className="flex justify-between items-center mt-2">
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating || credits < quantity}
                className="px-6 py-2 bg-black text-white text-sm font-medium rounded hover:bg-gray-800 disabled:bg-gray-400 transition-colors"
              >
                {isGenerating ? 'Generating...' : 'Generate'}
              </button>
              <span className="text-xs text-gray-500">{prompt.length}/2000</span>
            </div>
          </div>
        </div>

        {/* Right Panel - History */}
        <div className="w-72 flex flex-col bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Generated Images</h2>
              <button
                onClick={() => setShowTrash(!showTrash)}
                className="text-xs text-gray-600 hover:text-gray-900 font-medium"
              >
                {showTrash ? '← Back' : 'Trash'}
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {showTrash
                ? `${history.filter(img => img.deletedAt).length} deleted`
                : `${history.filter(img => !img.deletedAt).length} image${history.filter(img => !img.deletedAt).length !== 1 ? 's' : ''}`}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {showTrash ? (
              // Trash view
              history.filter(img => img.deletedAt).length === 0 ? (
                <div key="empty-trash" className="flex items-center justify-center h-32 text-gray-500 text-sm">
                  Trash is empty
                </div>
              ) : (
                [...history].reverse().map((image, idx) => (
                  !image.deletedAt ? null : (
                    <div
                      key={`image-${image.id || image.timestamp}-${idx}`}
                      className="group relative bg-gray-100 rounded-lg overflow-hidden aspect-square cursor-pointer transition-all opacity-60 hover:opacity-100"
                    >
                      <img
                        src={image.image}
                        alt="Deleted"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                        <button
                          className="p-2 bg-white rounded-full hover:bg-gray-200 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRestoreImage(image.id)
                            setShowTrash(false)
                          }}
                          title="Restore"
                        >
                          <X className="w-4 h-4 text-gray-700" />
                        </button>
                        <button
                          className="p-2 bg-red-500 hover:bg-red-600 rounded-full text-white transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                            handlePermanentlyDeleteImage(image.id)
                          }}
                          title="Permanently Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                ))
              )
            ) : (
              // Active images view
              history.filter(img => !img.deletedAt).length === 0 ? (
                <div key="empty" className="flex items-center justify-center h-32 text-gray-500 text-sm">
                  No images yet
                </div>
              ) : (
                [...history].filter(img => !img.deletedAt).reverse().map((image, idx) => (
                  <div
                    key={`image-${image.id || image.timestamp}-${idx}`}
                    className={`group relative bg-gray-100 rounded-lg overflow-hidden aspect-square cursor-pointer transition-all ${
                      selectedImage?.id === image.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => {
                      setSelectedImage(image)
                    }}
                  >
                    <img
                      src={image.image}
                      alt="Generated"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                      <button
                        className="p-2 bg-white rounded-full hover:bg-gray-200 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDownloadImage(image)
                        }}
                        title="Download"
                      >
                        <Download className="w-4 h-4 text-gray-700" />
                      </button>
                      <button
                        className="p-2 bg-white rounded-full hover:bg-gray-200 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSaveImage(image)
                        }}
                        title="Save"
                      >
                        <Heart className="w-4 h-4 text-gray-700" />
                      </button>
                      <button
                        className="p-2 bg-white rounded-full hover:bg-gray-200 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteImage(image.id)
                        }}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-gray-700" />
                      </button>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Modal with Actions */}
      {fullscreenImage && fullscreenImageData && (
        <div
          className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4"
          onClick={() => {
            setFullscreenImage(null)
            setFullscreenImageData(null)
          }}
        >
          <div
            className="relative w-screen h-screen max-w-6xl max-h-screen flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={fullscreenImage}
              alt="Fullscreen"
              className="max-w-[90vw] max-h-[70vh] w-auto h-auto object-contain"
            />

            {/* Action Buttons */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleReusePrompt(fullscreenImageData)
                  setFullscreenImage(null)
                  setFullscreenImageData(null)
                }}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-lg"
              >
                Open in Canvas
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleSaveImage(fullscreenImageData)
                }}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors shadow-lg"
              >
                Save to Project
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteImage(fullscreenImageData.id)
                  setFullscreenImage(null)
                  setFullscreenImageData(null)
                }}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors shadow-lg"
              >
                Delete to Trash
              </button>
            </div>

            <button
              onClick={() => {
                setFullscreenImage(null)
                setFullscreenImageData(null)
              }}
              className="absolute top-4 right-4 p-3 bg-white rounded-full hover:bg-gray-200 transition-colors shadow-lg"
              title="Close (Esc)"
            >
              <X className="w-6 h-6 text-gray-700" />
            </button>
          </div>
        </div>
      )}

      {/* Save to Project Dialog */}
      {showSaveDialog && imageToSave && (
        <div
          className="fixed inset-0 z-[9998] bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowSaveDialog(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Save to Project</h2>

            <div className="space-y-4">
              {/* Select Existing Project */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Project
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => {
                    setSelectedProjectId(e.target.value)
                    setNewProjectName('')
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose a project...</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Or Create New Project */}
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Or Create New Project
                </label>
                <input
                  type="text"
                  placeholder="Project name..."
                  value={newProjectName}
                  onChange={(e) => {
                    setNewProjectName(e.target.value)
                    setSelectedProjectId('')
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
                  disabled={isSavingProject}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveToProject}
                  disabled={isSavingProject || (!selectedProjectId && !newProjectName.trim())}
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSavingProject && <Loader className="w-4 h-4 animate-spin" />}
                  {isSavingProject ? 'Saving...' : 'Save Image'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
