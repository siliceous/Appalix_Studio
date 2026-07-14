'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Mic, Trash2, Download, ArrowLeft, Film } from 'lucide-react'

interface GeneratedVideo {
  id: string
  video: string
  prompt: string
  timestamp: number
  deletedAt?: number
}

export default function TalkingAdPage() {
  const router = useRouter()
  const [history, setHistory] = useState<GeneratedVideo[]>([])
  const [selectedVideo, setSelectedVideo] = useState<GeneratedVideo | null>(null)
  const [script, setScript] = useState('')
  const [avatar, setAvatar] = useState('avatar-1')
  const [voice, setVoice] = useState('natural')
  const [language, setLanguage] = useState('english')
  const [background, setBackground] = useState('studio')
  const [showCaptions, setShowCaptions] = useState(true)
  const [ctaText, setCtaText] = useState('Learn More')
  const [isGenerating, setIsGenerating] = useState(false)
  const [credits, setCredits] = useState(100)
  const [workspaceId, setWorkspaceId] = useState('')

  const AVATARS = [
    { id: 'avatar-1', name: 'Alex', emoji: '👨' },
    { id: 'avatar-2', name: 'Jordan', emoji: '👩' },
    { id: 'avatar-3', name: 'Morgan', emoji: '🧑' },
    { id: 'avatar-4', name: 'Casey', emoji: '👔' },
  ]

  const VOICES = ['natural', 'energetic', 'calm', 'professional', 'friendly']
  const LANGUAGES = ['english', 'spanish', 'french', 'german', 'chinese', 'japanese']
  const BACKGROUNDS = ['studio', 'office', 'outdoors', 'home', 'abstract']

  useEffect(() => {
    const wId = typeof window !== 'undefined' ? localStorage.getItem('workspaceId') || '' : ''
    setWorkspaceId(wId)

    const savedHistory = localStorage.getItem('talkingAdHistory')
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory))
    }
  }, [])

  const handleGenerateVideo = async () => {
    if (!script.trim()) {
      alert('Please enter a script')
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
          prompt: script,
          avatar,
          voice,
          language,
          background,
          showCaptions,
          ctaText,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate video')
      }

      const data = await response.json()
      const newVideo: GeneratedVideo = {
        id: data.id,
        video: data.videoUrl || '',
        prompt: script,
        timestamp: Date.now(),
      }

      const updatedHistory = [newVideo, ...history]
      setHistory(updatedHistory)
      localStorage.setItem('talkingAdHistory', JSON.stringify(updatedHistory))
      setSelectedVideo(newVideo)
      alert('Video generated successfully!')
    } catch (error) {
      console.error('Generation failed:', error)
      alert('Failed to generate video. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDeleteVideo = (videoId: string) => {
    setHistory(prev => prev.map(v => v.id === videoId ? { ...v, deletedAt: Date.now() } : v))
    if (selectedVideo?.id === videoId) {
      setSelectedVideo(null)
    }
  }

  const handleDownloadVideo = async (video: GeneratedVideo) => {
    if (!video.video) return
    try {
      const link = document.createElement('a')
      link.href = video.video
      link.download = `talking-ad-${video.id}.mp4`
      link.click()
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  const activeVideos = history.filter(v => !v.deletedAt)

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Left Panel - Settings */}
      <div className="w-72 flex flex-col rounded-2xl shadow-lg bg-white overflow-hidden m-3">
        <div className="bg-black text-white px-4 py-3 h-12 flex items-center flex-shrink-0">
          <h2 className="text-sm font-semibold">Settings</h2>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 pr-2 pb-20 space-y-3 flex flex-col text-xs">
          {/* Avatar Selection */}
          <div>
            <label className="text-xs font-semibold text-black uppercase tracking-widest mb-2 block">Avatar</label>
            <div className="grid grid-cols-2 gap-2">
              {AVATARS.map(av => (
                <button
                  key={av.id}
                  onClick={() => setAvatar(av.id)}
                  className={`p-3 rounded-lg text-center transition-all ${
                    avatar === av.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div className="text-2xl mb-1">{av.emoji}</div>
                  <p className="text-xs font-medium">{av.name}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Voice */}
          <div>
            <label className="text-xs font-semibold text-black uppercase tracking-widest mb-2 block">Voice</label>
            <select value={voice} onChange={(e) => setVoice(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black">
              {VOICES.map(v => (
                <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Language */}
          <div>
            <label className="text-xs font-semibold text-black uppercase tracking-widest mb-2 block">Language</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black">
              {LANGUAGES.map(l => (
                <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Background */}
          <div>
            <label className="text-xs font-semibold text-black uppercase tracking-widest mb-2 block">Background</label>
            <select value={background} onChange={(e) => setBackground(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black">
              {BACKGROUNDS.map(b => (
                <option key={b} value={b}>{b.charAt(0).toUpperCase() + b.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showCaptions} onChange={(e) => setShowCaptions(e.target.checked)} />
              <span className="text-xs font-medium">Show captions</span>
            </label>
            <div>
              <label className="text-xs font-semibold text-black uppercase tracking-widest mb-1 block">CTA Text</label>
              <input type="text" value={ctaText} onChange={(e) => setCtaText(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black" />
            </div>
          </div>

          {/* Credits */}
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <p className="text-xs text-gray-700"><span className="font-semibold">Credits: </span>{credits}</p>
          </div>
        </div>
      </div>

      {/* Center Panel - Canvas & Prompt */}
      <div className="flex-1 flex flex-col overflow-hidden rounded-2xl shadow-lg bg-white m-3">
        <div className="bg-black text-white px-4 py-3 h-12 flex items-center justify-between flex-shrink-0">
          <button onClick={() => router.back()} className="flex items-center gap-1 px-2 hover:bg-white/10 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs font-medium">Back</span>
          </button>
          <div className="flex-1 flex items-center justify-center gap-6">
            <button onClick={() => router.push('/ai-studio/create-image')} className="text-xs font-medium text-gray-100 hover:text-white">Create Image</button>
            <button onClick={() => router.push('/ai-studio/create-video')} className="text-xs font-medium text-gray-100 hover:text-white">Create Video</button>
            <button className="text-xs font-bold text-white">Talking Ads</button>
          </div>
          <div className="text-xs font-semibold text-white">{credits} Credits</div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col p-4 gap-4">
          {/* Script Input */}
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder="Write your script here..."
            maxLength={2000}
            className="flex-1 p-4 border border-gray-300 rounded-lg text-black resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Generate Button */}
          <button
            onClick={handleGenerateVideo}
            disabled={isGenerating || !script.trim()}
            className="px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Mic className="w-4 h-4" />
            {isGenerating ? 'Generating...' : 'Generate Talking Ad'}
          </button>
        </div>
      </div>

      {/* Right Panel - Generated Videos */}
      <div className="w-72 flex flex-col rounded-2xl shadow-lg bg-white overflow-hidden m-3">
        <div className="bg-black text-white px-4 py-3 h-12 flex items-center justify-between flex-shrink-0">
          <h2 className="text-sm font-semibold">Generated Videos</h2>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
          {activeVideos.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
              No videos yet
            </div>
          ) : (
            activeVideos.map((video) => (
              <div
                key={video.id}
                className={`group relative bg-gray-100 rounded-lg overflow-hidden aspect-video cursor-pointer transition-all ${
                  selectedVideo?.id === video.id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => setSelectedVideo(video)}
              >
                <div className="w-full h-full flex items-center justify-center bg-gray-200">
                  <Film className="w-6 h-6 text-gray-400" />
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDownloadVideo(video)
                    }}
                    className="p-2 bg-white rounded-full hover:bg-gray-200 transition-colors"
                  >
                    <Download className="w-4 h-4 text-gray-700" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteVideo(video.id)
                    }}
                    className="p-2 bg-white rounded-full hover:bg-gray-200 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-gray-700" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
