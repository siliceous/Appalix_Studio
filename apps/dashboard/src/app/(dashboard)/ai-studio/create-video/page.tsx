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
  ChevronLeft,
  Loader,
  Zap,
  Music,
  Edit3,
  Mic,
  FileVideo,
  Volume2,
  Image as ImageIcon,
  Grid3x3,
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

const QUALITY_MODES = [
  { id: 'fast', label: 'Fast', resolution: '720p', creditsPerSec: 6 },
  { id: 'pro', label: 'Pro Cinematic', resolution: '1080p', creditsPerSec: 12 },
  { id: 'ultra', label: 'Ultra Realistic', resolution: '4K', creditsPerSec: 18 },
]

const DURATIONS = [5, 10, 15, 20, 30]
const ASPECT_RATIOS = ['9:16', '16:9', '1:1', '4:3']

export default function CreateVideoPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const [workspaceId, setWorkspaceId] = useState('')
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null)
  const [showImageLibrary, setShowImageLibrary] = useState(false)
  const [libraryImages, setLibraryImages] = useState<GeneratedImage[]>([])
  const [loadingLibrary, setLoadingLibrary] = useState(false)
  const [viewMode, setViewMode] = useState<'library' | 'projects'>('library')

  const [quality, setQuality] = useState('fast')
  const [duration, setDuration] = useState(15)
  const [aspectRatio, setAspectRatio] = useState('9:16')

  const [prompt, setPrompt] = useState('')
  const [script, setScript] = useState('')
  const [voiceId, setVoiceId] = useState('')
  const [selectedAudio, setSelectedAudio] = useState<AudioAsset | null>(null)

  const [showScriptEditor, setShowScriptEditor] = useState(false)
  const [showVoiceLibrary, setShowVoiceLibrary] = useState(false)
  const [showTextToVoice, setShowTextToVoice] = useState(false)
  const [showAudioUpload, setShowAudioUpload] = useState(false)
  const [showVideoToAudio, setShowVideoToAudio] = useState(false)

  const [voices, setVoices] = useState<Voice[]>([])
  const [loadingVoices, setLoadingVoices] = useState(false)
  const [ttsText, setTtsText] = useState('')
  const [isConvertingTts, setIsConvertingTts] = useState(false)

  const [isGenerating, setIsGenerating] = useState(false)
  const [generation, setGeneration] = useState<VideoGeneration | null>(null)
  const [history, setHistory] = useState<VideoGeneration[]>([])

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
      setVoices([
        { id: 'en-us-male-1', name: 'Alex', gender: 'male', accent: 'US', language: 'English', style: 'Natural' },
        { id: 'en-us-female-1', name: 'Victoria', gender: 'female', accent: 'US', language: 'English', style: 'Professional' },
      ])
    } finally {
      setLoadingVoices(false)
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
          modelKey: 'kling-standard',
          duration,
          aspectRatio,
          resolution: QUALITY_MODES.find((q) => q.id === quality)?.resolution || '1080p',
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
        setShowTextToVoice(false)
      }
    } catch (error) {
      console.error('TTS failed:', error)
    } finally {
      setIsConvertingTts(false)
    }
  }

  const qualityMode = QUALITY_MODES.find((q) => q.id === quality)
  const estimatedCredits = Math.round((qualityMode?.creditsPerSec || 6) * duration)

  return (
    <div className="flex h-screen bg-white text-gray-900 overflow-hidden">
      {/* Left Sidebar - Settings */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <ChevronLeft className="w-4 h-4 cursor-pointer" onClick={() => router.back()} />
            <h2 className="text-sm font-bold">Video Generator</h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Key Frames */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-4">Key Frames</h3>
            <div className="flex gap-3">
              <div className="flex-1 aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2">
                <Plus className="w-6 h-6 text-gray-400" />
                <span className="text-xs font-medium text-gray-600">Start</span>
              </div>
              <div className="flex-1 aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2">
                <Plus className="w-6 h-6 text-gray-400" />
                <span className="text-xs font-medium text-gray-600">End</span>
              </div>
            </div>
          </div>

          {/* Quality */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-3">Quality</h3>
            <div className="space-y-2">
              {QUALITY_MODES.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setQuality(mode.id)}
                  className={`w-full px-4 py-3 rounded-lg text-sm font-medium transition-all border ${
                    quality === mode.id
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-gray-50 text-gray-900 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-left">
                    <p className="font-semibold">{mode.label}</p>
                    <p className="text-xs opacity-75">{mode.resolution} · {mode.creditsPerSec} credits/sec</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-3">Duration (Seconds)</h3>
            <div className="flex gap-2 flex-wrap">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                    duration === d
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-3">Aspect Ratio</h3>
            <div className="grid grid-cols-2 gap-2">
              {ASPECT_RATIOS.map((ratio) => (
                <button
                  key={ratio}
                  onClick={() => setAspectRatio(ratio)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                    aspectRatio === ratio
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </div>

          {/* Credits */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-xs text-gray-600 mb-1">Estimated: ${(estimatedCredits * 0.08).toFixed(2)} ({estimatedCredits} credits)</p>
            <p className="text-xs text-gray-600">Balance: 0 credits</p>
          </div>
        </div>
      </div>

      {/* Center Workspace */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <ChevronLeft className="w-5 h-5 cursor-pointer" onClick={() => router.back()} />
              <div className="flex gap-6">
                <button className="text-sm font-medium text-gray-600 hover:text-gray-900">Create Image</button>
                <button className="text-sm font-semibold text-blue-600">Create Video</button>
                <button className="text-sm font-medium text-gray-600 hover:text-gray-900">Product Ads</button>
                <button className="text-sm font-medium text-gray-600 hover:text-gray-900">Talking Actors</button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button className="text-sm font-medium text-gray-600">🤖 AI</button>
              <span className="text-sm font-semibold">0 Credits</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center">
          {!selectedImage ? (
            <div className="w-full max-w-2xl">
              <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
                <ImageIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h2 className="text-lg font-semibold mb-2">Select image</h2>
                <p className="text-sm text-gray-600 mb-6">Choose a starting image for your video</p>

                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-all"
                  >
                    Import Image
                  </button>
                  <button
                    onClick={() => {
                      loadLibraryImages()
                      setShowImageLibrary(true)
                    }}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all"
                  >
                    Choose from Library
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-2xl space-y-6">
              {/* Image Preview */}
              <div className="bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                <div className="aspect-video bg-gray-100 flex items-center justify-center">
                  <img
                    src={selectedImage.image}
                    alt="Selected"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              {/* Prompt Input */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm space-y-4">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe what you want to create..."
                  rows={6}
                  maxLength={10000}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">{prompt.length} / 10000</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        loadVoices()
                        setShowVoiceLibrary(true)
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                        voiceId
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      Voice {voiceId && '✓'}
                    </button>
                    <button
                      onClick={() => setShowScriptEditor(true)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                        script
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      Script {script && '✓'}
                    </button>
                    <button
                      onClick={() => setShowAudioUpload(true)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                        selectedAudio
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      Audio {selectedAudio && '✓'}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg text-sm font-medium transition-all"
                  >
                    Change Image
                  </button>
                  <button
                    onClick={handleGenerateVideo}
                    disabled={isGenerating || !prompt}
                    className="ml-auto px-8 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all"
                  >
                    Generate
                  </button>
                </div>
              </div>

              {/* Generation Status */}
              {generation && (
                <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                  <h3 className="font-semibold mb-4">Generation Status</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Status: <span className="font-semibold capitalize">{generation.status}</span>
                  </p>
                  {generation.status === 'completed' && generation.outputUrl && (
                    <div className="space-y-4">
                      <video
                        src={generation.outputUrl}
                        controls
                        className="w-full rounded-lg bg-gray-900"
                      />
                      <div className="flex gap-3">
                        <button className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all">
                          Download
                        </button>
                        <button className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg text-sm font-medium transition-all">
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

      {/* Right Sidebar - Library */}
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="font-bold text-sm">Library</h3>
          <p className="text-xs text-gray-600 mt-1">Projects</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {history.length === 0 ? (
            <div className="text-center text-gray-500">
              <Grid3x3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No videos yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {history.map((video) => (
                <div
                  key={video.id}
                  className="aspect-video bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center cursor-pointer hover:border-gray-300 transition-all"
                >
                  {video.outputUrl ? (
                    <video
                      src={video.outputUrl}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <Loader className="w-6 h-6 text-gray-400 animate-spin" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 p-6 flex gap-2">
          <button className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-all">
            Library
          </button>
          <button className="flex-1 px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg text-xs font-medium transition-all">
            Projects
          </button>
          <button className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg text-xs font-medium transition-all">
            Trash
          </button>
        </div>
      </div>

      {/* Script Editor Modal */}
      {showScriptEditor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full border border-gray-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold">Script Editor</h2>
              <button
                onClick={() => setShowScriptEditor(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="Type exactly what the actor should say…"
                rows={8}
                maxLength={2000}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
              />
              <p className="text-xs text-gray-500">{script.length} / 2,000 characters</p>
            </div>

            <div className="border-t border-gray-200 p-6 flex justify-end gap-2">
              <button
                onClick={() => setShowScriptEditor(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg text-sm font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowScriptEditor(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voice Library Modal */}
      {showVoiceLibrary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col border border-gray-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold">Select Voice</h2>
              <button
                onClick={() => setShowVoiceLibrary(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingVoices ? (
                <div className="flex items-center justify-center h-48">
                  <Loader className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="space-y-3">
                  {voices.map((voice) => (
                    <button
                      key={voice.id}
                      onClick={() => {
                        setVoiceId(voice.id)
                        setShowVoiceLibrary(false)
                      }}
                      className={`w-full p-4 rounded-lg border text-left transition-all ${
                        voiceId === voice.id
                          ? 'bg-blue-50 border-blue-300'
                          : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-semibold text-sm">{voice.name}</p>
                      <p className="text-xs text-gray-600">{voice.gender} • {voice.accent} • {voice.style}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 p-6 flex justify-end gap-2">
              <button
                onClick={() => setShowVoiceLibrary(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg text-sm font-medium transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Text to Voice Modal */}
      {showTextToVoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full border border-gray-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold">Text to Voice</h2>
              <button
                onClick={() => setShowTextToVoice(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <textarea
                value={ttsText}
                onChange={(e) => setTtsText(e.target.value)}
                placeholder="Enter text to convert to speech…"
                rows={6}
                maxLength={1000}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
              />
              <p className="text-xs text-gray-500">{ttsText.length} / 1,000 characters</p>
            </div>

            <div className="border-t border-gray-200 p-6 flex justify-end gap-2">
              <button
                onClick={() => setShowTextToVoice(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg text-sm font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleTtsGeneration}
                disabled={isConvertingTts || !ttsText || !voiceId}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-all"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audio Upload Modal */}
      {showAudioUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full border border-gray-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold">Add Audio</h2>
              <button
                onClick={() => setShowAudioUpload(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <button
                onClick={() => audioInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
              >
                <Music className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="font-semibold text-sm mb-1">Upload Audio</p>
                <p className="text-xs text-gray-600">MP3, WAV, M4A</p>
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="px-2 bg-white text-xs text-gray-500">or</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowAudioUpload(false)
                  setShowVideoToAudio(true)
                }}
                className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-sm font-medium transition-all"
              >
                Extract from Video
              </button>

              <button
                onClick={() => {
                  setShowAudioUpload(false)
                  setShowTextToVoice(true)
                }}
                className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-sm font-medium transition-all"
              >
                Generate from Text
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video to Audio Modal */}
      {showVideoToAudio && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full border border-gray-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold">Extract Audio from Video</h2>
              <button
                onClick={() => setShowVideoToAudio(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <button
                onClick={() => videoInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
              >
                <FileVideo className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="font-semibold text-sm mb-1">Upload Video</p>
                <p className="text-xs text-gray-600">MP4, MOV, WEBM</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Library Modal */}
      {showImageLibrary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] flex flex-col border border-gray-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold">Select an Image</h2>
              <button
                onClick={() => setShowImageLibrary(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingLibrary ? (
                <div className="flex items-center justify-center h-48">
                  <Loader className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : libraryImages.length === 0 ? (
                <div className="text-center text-gray-500">
                  <p className="text-sm">No images found</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-4">
                  {libraryImages.map((image) => (
                    <button
                      key={image.id}
                      onClick={() => handleImageSelect(image)}
                      className="aspect-square rounded-lg overflow-hidden border border-gray-200 hover:border-blue-300 transition-all group"
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

            <div className="border-t border-gray-200 p-6 flex justify-end gap-2">
              <button
                onClick={() => setShowImageLibrary(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg text-sm font-medium transition-all"
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
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
      />
    </div>
  )
}
