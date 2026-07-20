'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  UploadCloud,
  Library,
  Settings,
  Play,
  Download,
  Save,
  Trash2,
  X,
  Video,
  Users,
  Sparkles,
  Wand2,
  Volume2,
  FileVideo,
  Loader,
  Zap,
  ChevronRight,
  Mic,
  Music,
  Edit3,
  Pause,
  SkipBack,
  SkipForward,
  Eye,
  Copy,
} from 'lucide-react'

interface GeneratedImage {
  id: string
  image: string
  prompt: string
  timestamp: number
  aspectRatio?: string
  workspaceId: string
}

interface VideoGeneration {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  prompt: string
  sourceImageId?: string
  script?: string
  voiceId?: string
  audioAssetId?: string
  referenceVideoId?: string
  duration: number
  aspectRatio: string
  resolution: string
  cameraMovement?: string
  motionStrength?: number
  createdAt: number
  outputUrl?: string
  providerJobId?: string
  workspaceId: string
}

interface Voice {
  id: string
  name: string
  gender: 'male' | 'female'
  accent: string
  language: string
  style: string
  preview?: string
}

interface AudioAsset {
  id: string
  waveform?: number[]
  duration: number
  url: string
}

const VIDEO_TOOLS = [
  { id: 'image-to-video', icon: Video, label: 'Image to Video' },
  { id: 'text-to-video', icon: Sparkles, label: 'Text to Video' },
  { id: 'reference', icon: FileVideo, label: 'Video Reference' },
  { id: 'motion-control', icon: Zap, label: 'Motion Control' },
  { id: 'digital-human', icon: Users, label: 'Digital Human', badge: 'NEW' },
  { id: 'lip-sync', icon: Volume2, label: 'Lip Sync' },
]

const DURATIONS = [5, 10]
const ASPECT_RATIOS = ['9:16', '16:9', '1:1', '4:5', '3:4']
const RESOLUTIONS = ['720p', '1080p']
const CAMERA_MOVEMENTS = [
  'None',
  'Push In',
  'Pull Out',
  'Pan Left',
  'Pan Right',
  'Handheld',
]

export default function CreateVideoPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [activeTool, setActiveTool] = useState('image-to-video')
  const [workspaceId, setWorkspaceId] = useState('')
  const [credits, setCredits] = useState(100)
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null)
  const [showImageLibrary, setShowImageLibrary] = useState(false)
  const [libraryImages, setLibraryImages] = useState<GeneratedImage[]>([])
  const [loadingLibrary, setLoadingLibrary] = useState(false)

  const [prompt, setPrompt] = useState('')
  const [script, setScript] = useState('')
  const [voiceId, setVoiceId] = useState('')
  const [audioAssetId, setAudioAssetId] = useState('')
  const [referenceVideoId, setReferenceVideoId] = useState('')

  const [duration, setDuration] = useState(5)
  const [aspectRatio, setAspectRatio] = useState('9:16')
  const [resolution, setResolution] = useState('1080p')
  const [cameraMovement, setCameraMovement] = useState('None')
  const [motionStrength, setMotionStrength] = useState(50)

  const [isGenerating, setIsGenerating] = useState(false)
  const [generation, setGeneration] = useState<VideoGeneration | null>(null)
  const [history, setHistory] = useState<VideoGeneration[]>([])

  // Phase 2 - Script, Voice, Audio
  const [showScriptEditor, setShowScriptEditor] = useState(false)
  const [showVoiceLibrary, setShowVoiceLibrary] = useState(false)
  const [showTextToVoice, setShowTextToVoice] = useState(false)
  const [showAudioUpload, setShowAudioUpload] = useState(false)
  const [showVideoToAudio, setShowVideoToAudio] = useState(false)
  const [voices, setVoices] = useState<Voice[]>([])
  const [loadingVoices, setLoadingVoices] = useState(false)
  const [selectedAudio, setSelectedAudio] = useState<AudioAsset | null>(null)
  const [ttsText, setTtsText] = useState('')
  const [audioInputRef] = useState<React.RefObject<HTMLInputElement>>(useRef(null))
  const [videoInputRef] = useState<React.RefObject<HTMLInputElement>>(useRef(null))
  const [isConvertingTts, setIsConvertingTts] = useState(false)

  useEffect(() => {
    const wId = typeof window !== 'undefined' ? localStorage.getItem('workspaceId') : ''
    if (wId) {
      setWorkspaceId(wId)
      loadHistory(wId)
    }
  }, [])

  const loadHistory = async (wId: string) => {
    try {
      const response = await fetch('/api/ai-studio/video/history', {
        headers: { 'x-workspace-id': wId },
      })
      if (response.ok) {
        const data = await response.json()
        setHistory(data.generations || [])
      }
    } catch (error) {
      console.error('Failed to load history:', error)
    }
  }

  const loadLibraryImages = async () => {
    if (!workspaceId) return
    setLoadingLibrary(true)
    try {
      const response = await fetch('/api/ai-studio/all-images', {
        headers: { 'x-workspace-id': workspaceId },
      })
      if (response.ok) {
        const data = await response.json()
        setLibraryImages(data.images || [])
      }
    } catch (error) {
      console.error('Failed to load library:', error)
    } finally {
      setLoadingLibrary(false)
    }
  }

  const handleImageSelect = (image: GeneratedImage) => {
    setSelectedImage(image)
    setShowImageLibrary(false)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !workspaceId) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/ai-studio/video/upload', {
        method: 'POST',
        headers: { 'x-workspace-id': workspaceId },
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setSelectedImage(data.image)
      }
    } catch (error) {
      console.error('Upload failed:', error)
    }
  }

  const handleGenerateVideo = async () => {
    if (!selectedImage || !prompt || !workspaceId) return

    setIsGenerating(true)
    try {
      const response = await fetch('/api/ai-studio/video/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': workspaceId,
        },
        body: JSON.stringify({
          generationMode: 'image-to-video',
          sourceImageAssetId: selectedImage.id,
          prompt,
          script: script || undefined,
          voiceId: voiceId || undefined,
          audioAssetId: audioAssetId || undefined,
          referenceVideoAssetId: referenceVideoId || undefined,
          modelKey: 'kling-standard',
          duration,
          aspectRatio,
          resolution,
          cameraMovement: cameraMovement !== 'None' ? cameraMovement : undefined,
          motionStrength,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setGeneration(data.generation)
      }
    } catch (error) {
      console.error('Generation failed:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const loadVoices = async () => {
    if (voices.length > 0) return
    setLoadingVoices(true)
    try {
      const response = await fetch('/api/ai-studio/voices', {
        headers: { 'x-workspace-id': workspaceId },
      })
      if (response.ok) {
        const data = await response.json()
        setVoices(data.voices || [])
      }
    } catch (error) {
      console.error('Failed to load voices:', error)
      setVoices([
        { id: 'en-us-male-1', name: 'Alex', gender: 'male', accent: 'US', language: 'English', style: 'Natural' },
        { id: 'en-us-female-1', name: 'Victoria', gender: 'female', accent: 'US', language: 'English', style: 'Professional' },
        { id: 'en-us-female-2', name: 'Elena', gender: 'female', accent: 'US', language: 'English', style: 'Friendly' },
      ])
    } finally {
      setLoadingVoices(false)
    }
  }

  const handleTtsGeneration = async () => {
    if (!ttsText || !voiceId || !workspaceId) return
    setIsConvertingTts(true)
    try {
      const response = await fetch('/api/ai-studio/audio/text-to-voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': workspaceId,
        },
        body: JSON.stringify({
          text: ttsText,
          voiceId,
          language: 'en',
        }),
      })
      if (response.ok) {
        const data = await response.json()
        setSelectedAudio(data.audio)
        setAudioAssetId(data.audio.id)
        setShowTextToVoice(false)
      }
    } catch (error) {
      console.error('TTS failed:', error)
    } finally {
      setIsConvertingTts(false)
    }
  }

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !workspaceId) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/ai-studio/audio/upload', {
        method: 'POST',
        headers: { 'x-workspace-id': workspaceId },
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setSelectedAudio(data.audio)
        setAudioAssetId(data.audio.id)
        setShowAudioUpload(false)
      }
    } catch (error) {
      console.error('Audio upload failed:', error)
    }
  }

  const handleVideoToAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !workspaceId) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/ai-studio/audio/extract', {
        method: 'POST',
        headers: { 'x-workspace-id': workspaceId },
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setSelectedAudio(data.audio)
        setAudioAssetId(data.audio.id)
        setShowVideoToAudio(false)
      }
    } catch (error) {
      console.error('Video to audio failed:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white p-6 flex flex-col">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Video Generator</h1>
        <p className="text-gray-400 text-sm">Create stunning AI-powered videos with professional settings</p>
      </div>

      {/* Floating Panels */}
      <div className="flex gap-6 flex-1 min-h-0 overflow-hidden">
      {/* Left Sidebar - Video Tools */}
      <div className="w-72 flex flex-col">
        <div className="bg-gray-900 rounded-t-3xl px-6 py-4 border-b border-gray-800">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">
            Video Generation
          </h2>
        </div>
        <div className="bg-gray-900 rounded-b-3xl border border-gray-800 border-t-0 shadow-lg flex-1 overflow-y-auto p-6">

        <div className="space-y-2">
          {VIDEO_TOOLS.map((tool) => {
            const Icon = tool.icon
            const isActive = activeTool === tool.id
            return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`w-full px-4 py-3 rounded-lg flex items-center gap-3 transition-all border ${
                  isActive
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium text-left flex-1">{tool.label}</span>
                {tool.badge && (
                  <span className="text-xs bg-yellow-500 text-gray-900 px-2 py-0.5 rounded font-bold">
                    {tool.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Center Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="bg-gray-900 rounded-t-3xl px-8 py-6 border-b border-gray-800">
          <div className="flex items-center justify-between gap-8">
            <div className="flex items-center gap-4">
              <ChevronLeft className="w-4 h-4 cursor-pointer" />
              <div className="flex gap-6">
                <button className="text-sm font-medium text-gray-400 hover:text-white">Create Image</button>
                <button className="text-sm font-semibold text-blue-400">Create Video</button>
                <button className="text-sm font-medium text-gray-400 hover:text-white">Product Ads</button>
                <button className="text-sm font-medium text-gray-400 hover:text-white">Talking Actors</button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm">🤖 AI</span>
              <span className="text-sm font-semibold">0 Credits</span>
            </div>
          </div>
        </div>
        <div className="bg-gray-900 rounded-b-3xl border border-gray-800 border-t-0 shadow-lg flex-1 overflow-hidden">

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-8">
          {!selectedImage ? (
            // Empty State
            <div className="flex flex-col items-center justify-center h-full gap-8">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-800 flex items-center justify-center border-2 border-dashed border-gray-700">
                  <Plus className="w-12 h-12 text-gray-600" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Start with an image</h2>
                <p className="text-gray-400 mb-8">
                  Upload an image or select one from your AI Studio library.
                </p>

                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => {
                      loadLibraryImages()
                      setShowImageLibrary(true)
                    }}
                    className="px-6 py-3 bg-gray-800 border border-gray-700 rounded-lg hover:border-gray-600 transition-all flex items-center gap-2"
                  >
                    <Library className="w-5 h-5" />
                    Choose from Library
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-all flex items-center gap-2"
                  >
                    <UploadCloud className="w-5 h-5" />
                    Upload from Desktop
                  </button>
                </div>

                <p className="text-xs text-gray-500 mt-8">
                  Maximum file size: 20 MB (PNG, JPG, JPEG, WEBP)
                </p>
              </div>
            </div>
          ) : (
            // Image Selected - Prompt Composer
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Image Preview */}
              <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center border border-gray-700">
                <img
                  src={selectedImage.image}
                  alt="Selected"
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Prompt Composer */}
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <div className="flex gap-4 mb-4">
                  <img
                    src={selectedImage.image}
                    alt="Thumbnail"
                    className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                  />
                  <div className="flex-1">
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Describe how you want the image to move, speak or behave…"
                      rows={4}
                      maxLength={2000}
                      className="w-full bg-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-3 border border-gray-600 focus:border-blue-500 focus:outline-none resize-none text-sm"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs text-gray-400">
                    {prompt.length} / 2,000 characters
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      loadVoices()
                      setShowVoiceLibrary(true)
                    }}
                    className={`px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-2 border ${
                      voiceId ? 'bg-blue-600 border-blue-500' : 'bg-gray-700 hover:bg-gray-600 border-gray-600'
                    }`}
                  >
                    <Volume2 className="w-4 h-4" />
                    Voice {voiceId && '✓'}
                  </button>
                  <button
                    onClick={() => setShowScriptEditor(true)}
                    className={`px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-2 border ${
                      script ? 'bg-blue-600 border-blue-500' : 'bg-gray-700 hover:bg-gray-600 border-gray-600'
                    }`}
                  >
                    <Edit3 className="w-4 h-4" />
                    Script {script && '✓'}
                  </button>
                  <button
                    onClick={() => setShowAudioUpload(true)}
                    className={`px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-2 border ${
                      selectedAudio ? 'bg-blue-600 border-blue-500' : 'bg-gray-700 hover:bg-gray-600 border-gray-600'
                    }`}
                  >
                    <Music className="w-4 h-4" />
                    Audio {selectedAudio && '✓'}
                  </button>
                  <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-all border border-gray-600">
                    Reference Video
                  </button>

                  <button
                    onClick={handleGenerateVideo}
                    disabled={isGenerating || !prompt}
                    className="ml-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-all flex items-center gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Generate Video
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Generation Status */}
              {generation && (
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                  <h3 className="text-lg font-bold mb-4">Generation Status</h3>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-400">
                      Status: <span className="capitalize font-medium text-white">{generation.status}</span>
                    </p>
                    <p className="text-sm text-gray-400">
                      ID: <span className="font-mono text-gray-300">{generation.id.substring(0, 8)}</span>
                    </p>
                  </div>

                  {generation.status === 'completed' && generation.outputUrl && (
                    <div className="mt-6 space-y-4">
                      <video
                        src={generation.outputUrl}
                        controls
                        className="w-full rounded-lg bg-black"
                      />
                      <div className="flex gap-2">
                        <button className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-all flex items-center justify-center gap-2">
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                        <button className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-all flex items-center justify-center gap-2">
                          <Save className="w-4 h-4" />
                          Save
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-80 flex flex-col">
        <div className="bg-gray-900 rounded-t-3xl px-6 py-4 border-b border-gray-800">
          <h3 className="font-bold text-sm uppercase tracking-wider text-gray-400 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </h3>
        </div>

        <div className="bg-gray-900 rounded-b-3xl border border-gray-800 border-t-0 shadow-lg flex-1 overflow-y-auto p-6 space-y-6">
          {/* Model */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase mb-2 block">
              Model
            </label>
            <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm">
              Kling Standard
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase mb-2 block">
              Duration
            </label>
            <div className="flex gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm transition-all border ${
                    duration === d
                      ? 'bg-blue-600 border-blue-500'
                      : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                  }`}
                >
                  {d}s
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">~ 10 credits</p>
          </div>

          {/* Aspect Ratio */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase mb-2 block">
              Aspect Ratio
            </label>
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none text-white"
            >
              {ASPECT_RATIOS.map((ratio) => (
                <option key={ratio} value={ratio}>
                  {ratio}
                </option>
              ))}
            </select>
          </div>

          {/* Resolution */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase mb-2 block">
              Resolution
            </label>
            <div className="flex gap-2">
              {RESOLUTIONS.map((res) => (
                <button
                  key={res}
                  onClick={() => setResolution(res)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm transition-all border ${
                    resolution === res
                      ? 'bg-blue-600 border-blue-500'
                      : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                  }`}
                >
                  {res}
                </button>
              ))}
            </div>
          </div>

          {/* Camera Movement */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase mb-2 block">
              Camera Movement
            </label>
            <select
              value={cameraMovement}
              onChange={(e) => setCameraMovement(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none text-white"
            >
              {CAMERA_MOVEMENTS.map((movement) => (
                <option key={movement} value={movement}>
                  {movement}
                </option>
              ))}
            </select>
          </div>

          {/* Motion Strength */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase mb-2 block">
              Motion Strength
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={motionStrength}
              onChange={(e) => setMotionStrength(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>Subtle</span>
              <span>Natural</span>
              <span>Dynamic</span>
            </div>
          </div>

          {/* Credits */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-1">Estimated Credits</p>
            <p className="text-xl font-bold flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              ~40 credits
            </p>
          </div>
        </div>
      </div>

      {/* Image Library Modal */}
      {showImageLibrary && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col border border-gray-800">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h2 className="text-xl font-bold">Select an Image</h2>
              <button
                onClick={() => setShowImageLibrary(false)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingLibrary ? (
                <div className="flex items-center justify-center h-48">
                  <Loader className="w-8 h-8 animate-spin text-gray-600" />
                </div>
              ) : libraryImages.length === 0 ? (
                <div className="text-center text-gray-400 py-12">
                  No images found in your library
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-4">
                  {libraryImages.map((image) => (
                    <button
                      key={image.id}
                      onClick={() => handleImageSelect(image)}
                      className="aspect-square rounded-lg overflow-hidden border border-gray-700 hover:border-blue-500 transition-all group"
                    >
                      <img
                        src={image.image}
                        alt="Library"
                        className="w-full h-full object-cover group-hover:brightness-110 transition-all"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-gray-800 p-6 flex justify-end gap-2">
              <button
                onClick={() => setShowImageLibrary(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowImageLibrary(false)}
                disabled={!selectedImage}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-medium transition-all"
              >
                Use Selected Image
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Script Editor Modal */}
      {showScriptEditor && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg max-w-2xl w-full border border-gray-800">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h2 className="text-xl font-bold">Script Editor</h2>
              <button
                onClick={() => setShowScriptEditor(false)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-400 mb-2 block">Spoken Script</label>
                <textarea
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  placeholder="Type exactly what the actor should say…"
                  rows={8}
                  maxLength={2000}
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:outline-none resize-none"
                />
                <p className="text-xs text-gray-400 mt-2">{script.length} / 2,000 characters</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-400 mb-2 block">Tone</label>
                  <select className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                    <option>Natural</option>
                    <option>Professional</option>
                    <option>Friendly</option>
                    <option>Energetic</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 mb-2 block">Speed</label>
                  <input type="range" min="0.5" max="2" step="0.1" defaultValue="1" className="w-full" />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-800 p-6 flex justify-end gap-2">
              <button
                onClick={() => setShowScriptEditor(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowScriptEditor(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-all"
              >
                Save Script
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voice Library Modal */}
      {showVoiceLibrary && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col border border-gray-800">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h2 className="text-xl font-bold">Voice Library</h2>
              <button
                onClick={() => setShowVoiceLibrary(false)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingVoices ? (
                <div className="flex items-center justify-center h-48">
                  <Loader className="w-8 h-8 animate-spin text-gray-600" />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {voices.map((voice) => (
                    <button
                      key={voice.id}
                      onClick={() => {
                        setVoiceId(voice.id)
                        setShowVoiceLibrary(false)
                      }}
                      className={`p-4 rounded-lg border transition-all text-left flex items-center justify-between ${
                        voiceId === voice.id
                          ? 'bg-blue-600 border-blue-500'
                          : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div>
                        <p className="font-semibold">{voice.name}</p>
                        <p className="text-xs text-gray-300">
                          {voice.gender} • {voice.accent} • {voice.style}
                        </p>
                      </div>
                      {voice.preview && (
                        <button className="p-2 bg-white/20 rounded-full hover:bg-white/30">
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-gray-800 p-6 flex justify-end gap-2">
              <button
                onClick={() => setShowVoiceLibrary(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowVoiceLibrary(false)
                  setShowTextToVoice(true)
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-all"
              >
                Generate Text to Voice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Text to Voice Modal */}
      {showTextToVoice && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg max-w-2xl w-full border border-gray-800">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h2 className="text-xl font-bold">Text to Voice</h2>
              <button
                onClick={() => setShowTextToVoice(false)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-400 mb-2 block">Text to Convert</label>
                <textarea
                  value={ttsText}
                  onChange={(e) => setTtsText(e.target.value)}
                  placeholder="Enter text to convert to speech…"
                  rows={6}
                  maxLength={1000}
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:outline-none resize-none"
                />
                <p className="text-xs text-gray-400 mt-2">{ttsText.length} / 1,000 characters</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 mb-2 block">Selected Voice</label>
                <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm">
                  {voices.find((v) => v.id === voiceId)?.name || 'No voice selected'}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-800 p-6 flex justify-end gap-2">
              <button
                onClick={() => setShowTextToVoice(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleTtsGeneration}
                disabled={isConvertingTts || !ttsText || !voiceId}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-medium transition-all flex items-center gap-2"
              >
                {isConvertingTts ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Converting...
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    Generate Audio
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audio Upload Modal */}
      {showAudioUpload && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg max-w-2xl w-full border border-gray-800">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h2 className="text-xl font-bold">Add Audio</h2>
              <button
                onClick={() => setShowAudioUpload(false)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center cursor-pointer hover:border-gray-600 transition-colors">
                <Music className="w-12 h-12 mx-auto mb-3 text-gray-500" />
                <p className="font-semibold mb-1">Upload Audio File</p>
                <p className="text-xs text-gray-400 mb-4">MP3, WAV, M4A, AAC</p>
                <button
                  onClick={() => audioInputRef?.current?.click()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium"
                >
                  Choose File
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-900 text-gray-400">or</span>
                </div>
              </div>

              <button
                onClick={() => setShowVideoToAudio(true)}
                className="w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm font-medium transition-all"
              >
                Extract from Video
              </button>

              <button
                onClick={() => {
                  setShowAudioUpload(false)
                  setShowTextToVoice(true)
                }}
                className="w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm font-medium transition-all"
              >
                Generate from Text
              </button>
            </div>

            <div className="border-t border-gray-800 p-6 flex justify-end gap-2">
              <button
                onClick={() => setShowAudioUpload(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video to Audio Modal */}
      {showVideoToAudio && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg max-w-2xl w-full border border-gray-800">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h2 className="text-xl font-bold">Extract Audio from Video</h2>
              <button
                onClick={() => setShowVideoToAudio(false)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center cursor-pointer hover:border-gray-600 transition-colors">
                <FileVideo className="w-12 h-12 mx-auto mb-3 text-gray-500" />
                <p className="font-semibold mb-1">Upload Video</p>
                <p className="text-xs text-gray-400 mb-4">MP4, MOV, WEBM</p>
                <button
                  onClick={() => videoInputRef?.current?.click()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium"
                >
                  Choose File
                </button>
              </div>
            </div>

            <div className="border-t border-gray-800 p-6 flex justify-end gap-2">
              <button
                onClick={() => setShowVideoToAudio(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
      <input
        ref={audioInputRef as any}
        type="file"
        accept="audio/*"
        onChange={handleAudioUpload}
        className="hidden"
      />
      <input
        ref={videoInputRef as any}
        type="file"
        accept="video/*"
        onChange={handleVideoToAudioUpload}
        className="hidden"
      />
    </div>
  )
}
