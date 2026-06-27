'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Trash2, Search, Loader, Loader2, X, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import Masonry from 'react-masonry-css'
import './library/masonry.css'

interface GeneratedImage {
  id: string
  image: string
  prompt: string
  timestamp: number
  deletedAt?: number
  aspectRatio?: string
  projectId?: string
  projectName?: string
}

interface Project {
  id: string
  name: string
}

export default function AIStudio() {
  const router = useRouter()
  const [images, setImages] = useState<GeneratedImage[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [workspaceId, setWorkspaceId] = useState('')
  const [fullscreenImage, setFullscreenImage] = useState<GeneratedImage | null>(null)
  const [fullscreenImageIndex, setFullscreenImageIndex] = useState(0)
  const [showCreateProjectDialog, setShowCreateProjectDialog] = useState(false)
  const [createProjectName, setCreateProjectName] = useState('')
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [selectedMediaType, setSelectedMediaType] = useState<string | null>(null)
  const [selectedGender, setSelectedGender] = useState<string | null>(null)
  const [selectedDateRange, setSelectedDateRange] = useState<string | null>(null)
  const [credits, setCredits] = useState(0)

  useEffect(() => {
    const wId = typeof window !== 'undefined' ? localStorage.getItem('workspaceId') || '' : ''
    setWorkspaceId(wId)

    try {
      const savedHistory = localStorage.getItem('imageGenerationHistory')
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory)
        const historyWithIds = parsed
          .filter((img: any) => img && img.image && typeof img.image === 'string' && img.image.length > 0)
          .map((img: any, idx: number) => ({
            ...img,
            id: img.id || `legacy-${img.timestamp || idx}`,
          }))
        const activeImages = historyWithIds.filter((img: any) => !img.deletedAt)
        activeImages.sort((a: any, b: any) => b.timestamp - a.timestamp)
        setImages(activeImages)
      }
      setLoading(false)
    } catch (error) {
      console.error('Error loading images:', error)
      setLoading(false)
    }

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
    if (wId) fetchCredits()
  }, [])

  useEffect(() => {
    if (!workspaceId) return
    const fetchProjects = async () => {
      try {
        const response = await fetch('/api/projects', { headers: { 'x-workspace-id': workspaceId } })
        if (response.ok) {
          const data = await response.json()
          setProjects(data.projects || [])
        }
      } catch (error) {
        console.error('Error loading projects:', error)
      }
    }
    fetchProjects()
  }, [workspaceId])

  const filteredImages = images.filter((img) => {
    const matchesSearch = img.prompt.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesProject = !selectedProjectId || img.projectId === selectedProjectId
    const matchesGender = !selectedGender ||
      (selectedGender === 'man' && (img.prompt.toLowerCase().includes('man') || img.prompt.toLowerCase().includes('male'))) ||
      (selectedGender === 'woman' && (img.prompt.toLowerCase().includes('woman') || img.prompt.toLowerCase().includes('female'))) ||
      (selectedGender === 'neutral' && !img.prompt.toLowerCase().includes('man') && !img.prompt.toLowerCase().includes('woman'))
    const matchesMediaType = !selectedMediaType || selectedMediaType === 'image'
    let matchesDate = true
    if (selectedDateRange) {
      const now = Date.now()
      const diffDays = (now - img.timestamp) / (1000 * 60 * 60 * 24)
      if (selectedDateRange === 'today') matchesDate = diffDays < 1
      else if (selectedDateRange === 'week') matchesDate = diffDays < 7
      else if (selectedDateRange === 'month') matchesDate = diffDays < 30
      else if (selectedDateRange === 'year') matchesDate = diffDays < 365
    }
    return matchesSearch && matchesProject && matchesGender && matchesMediaType && matchesDate
  })

  const handleCreateProject = async () => {
    if (!createProjectName.trim() || !workspaceId) return
    setIsCreatingProject(true)
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-workspace-id': workspaceId },
        body: JSON.stringify({ name: createProjectName, description: 'Created from library' }),
      })
      if (response.ok) {
        const newProject = await response.json()
        setProjects([...projects, newProject])
        setCreateProjectName('')
        setShowCreateProjectDialog(false)
      }
    } catch (error) {
      console.error('Error creating project:', error)
    } finally {
      setIsCreatingProject(false)
    }
  }

  const handleDownload = (imageId: string, imageData: string) => {
    const link = document.createElement('a')
    link.href = imageData
    link.download = `appalix-image-${imageId}.png`
    link.click()
  }

  const handleDelete = (imageId: string) => {
    setImages(images.map(img => img.id === imageId ? { ...img, deletedAt: Date.now() } : img))
    const remaining = images.filter(img => img.id !== imageId)
    localStorage.setItem('imageGenerationHistory', JSON.stringify(remaining))
  }

  const getAspectRatioPadding = (ratio?: string): string => {
    switch (ratio) {
      case '16:9': return 'aspect-video'
      case '9:16': return 'aspect-[9/16]'
      case '3:4': return 'aspect-[3/4]'
      case '4:3': return 'aspect-[4/3]'
      case '1:1': return 'aspect-square'
      default: return 'aspect-square'
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!fullscreenImage) return
      if (e.key === 'Escape') setFullscreenImage(null)
      else if (e.key === 'ArrowLeft' && fullscreenImageIndex > 0) {
        const newIdx = fullscreenImageIndex - 1
        setFullscreenImageIndex(newIdx)
        setFullscreenImage(filteredImages[newIdx])
      } else if (e.key === 'ArrowRight' && fullscreenImageIndex < filteredImages.length - 1) {
        const newIdx = fullscreenImageIndex + 1
        setFullscreenImageIndex(newIdx)
        setFullscreenImage(filteredImages[newIdx])
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [fullscreenImage, fullscreenImageIndex, filteredImages])

  return (
    <div className="-m-8 flex flex-col h-screen overflow-hidden bg-[#141c2b]">
      {/* Top Buttons Bar */}
      <div className="px-4 ml-3 mr-4 flex items-center gap-2 min-h-[52px] pb-2 pt-3 shrink-0">
        <button
          onClick={() => router.push('/ai-studio/create-image')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl border border-transparent text-white hover:bg-white/10 transition-colors whitespace-nowrap"
        >
          Create Image
        </button>
        <button
          onClick={() => router.push('/ai-studio/create-video')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl border border-transparent text-white hover:bg-white/10 transition-colors whitespace-nowrap"
        >
          Create Video
        </button>
        <button
          onClick={() => router.push('/ai-studio/product-ads')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl border border-transparent text-white hover:bg-white/10 transition-colors whitespace-nowrap"
        >
          Product Ads
        </button>
        <button
          onClick={() => router.push('/ai-studio/talking-ad')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl border border-transparent text-white hover:bg-white/10 transition-colors whitespace-nowrap"
        >
          Talking Ads
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl border border-white/20 text-white bg-white/5">
          {credits} Credits
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-white/10" />

      {/* Search & Filters Bar */}
      <nav className="px-4 ml-3 mr-4 border-b border-white/10 bg-[#141c2b] rounded-b-2xl shadow-lg flex items-center shrink-0 gap-x-3 min-h-[52px] pb-2 pt-2">
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white/20 text-sm"
          />
          <span className="text-xs text-gray-400 shrink-0">{filteredImages.length}</span>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-white/15 shrink-0" />

        <select
          value={selectedProjectId || ''}
          onChange={(e) => setSelectedProjectId(e.target.value || null)}
          className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-white/20 shrink-0"
        >
          <option value="">Projects</option>
          {projects.map((proj) => (
            <option key={proj.id} value={proj.id}>{proj.name}</option>
          ))}
        </select>

        <button
          onClick={() => setShowCreateProjectDialog(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl border border-white/10 text-white hover:bg-white/10 transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Add New
        </button>

        <select
          value={selectedMediaType || ''}
          onChange={(e) => setSelectedMediaType(e.target.value || null)}
          className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-white/20 shrink-0"
        >
          <option value="">All Media</option>
          <option value="image">Image</option>
          <option value="video">Video</option>
        </select>

        <select
          value={selectedGender || ''}
          onChange={(e) => setSelectedGender(e.target.value || null)}
          className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-white/20 shrink-0"
        >
          <option value="">All Genders</option>
          <option value="man">Man</option>
          <option value="woman">Woman</option>
          <option value="neutral">Neutral</option>
        </select>

        <select
          value={selectedDateRange || ''}
          onChange={(e) => setSelectedDateRange(e.target.value || null)}
          className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-white/20 shrink-0"
        >
          <option value="">All Times</option>
          <option value="today">Today</option>
          <option value="week">Week</option>
          <option value="month">Month</option>
          <option value="year">Year</option>
        </select>

        {(selectedProjectId || selectedMediaType || selectedGender || selectedDateRange) && (
          <button
            onClick={() => {
              setSelectedProjectId(null)
              setSelectedMediaType(null)
              setSelectedGender(null)
              setSelectedDateRange(null)
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl border border-white/10 text-white hover:bg-white/10 transition-colors shrink-0"
          >
            Clear
          </button>
        )}
      </nav>

      {/* Asset Library Grid */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-white/40" />
          </div>
        ) : filteredImages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-white/70 font-medium mb-2">No assets yet</p>
              <p className="text-white/50 text-sm">{searchQuery ? 'Try adjusting your search' : 'Create your first image'}</p>
            </div>
          </div>
        ) : (
          <Masonry
            breakpointCols={{ default: 4, 1536: 4, 1280: 3, 1024: 3, 768: 2, 640: 2 }}
            className="masonry-grid"
            columnClassName="masonry-grid-column"
          >
            {filteredImages.map((image, idx) => (
              <div
                key={image.id}
                className={`relative rounded-lg overflow-hidden border border-white/10 hover:border-white/20 hover:shadow-lg transition-all duration-300 bg-white/5 break-inside-avoid cursor-pointer ${getAspectRatioPadding(image.aspectRatio)}`}
                onClick={() => {
                  setFullscreenImage(image)
                  setFullscreenImageIndex(idx)
                }}
              >
                <img src={image.image} alt={image.prompt} className="absolute inset-0 w-full h-full object-cover" />
                {image.projectName && (
                  <div className="absolute top-2 left-2 bg-white/20 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium text-white">
                    {image.projectName}
                  </div>
                )}
              </div>
            ))}
          </Masonry>
        )}
      </div>

      {/* Fullscreen Modal */}
      {fullscreenImage && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div className="text-sm text-white/60">
              {fullscreenImageIndex + 1} of {filteredImages.length}
            </div>
            <button onClick={() => setFullscreenImage(null)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-5 h-5 text-white/60" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center overflow-auto p-6 relative">
            {fullscreenImageIndex > 0 && (
              <button
                onClick={() => {
                  const newIdx = fullscreenImageIndex - 1
                  setFullscreenImageIndex(newIdx)
                  setFullscreenImage(filteredImages[newIdx])
                }}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
            )}
            <div className="max-w-4xl max-h-full flex items-center justify-center">
              <img src={fullscreenImage.image} alt={fullscreenImage.prompt} className="max-w-full max-h-full object-contain rounded" />
            </div>
            {fullscreenImageIndex < filteredImages.length - 1 && (
              <button
                onClick={() => {
                  const newIdx = fullscreenImageIndex + 1
                  setFullscreenImageIndex(newIdx)
                  setFullscreenImage(filteredImages[newIdx])
                }}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            )}
          </div>
          <div className="border-t border-white/10 px-6 py-4 space-y-4">
            <div>
              <p className="text-xs text-white/40 mb-1">Prompt</p>
              <p className="text-white/80 text-sm">{fullscreenImage.prompt}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { handleDownload(fullscreenImage.id, fullscreenImage.image); setFullscreenImage(null) }} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded text-sm font-medium transition-colors flex items-center gap-2 border border-white/10">
                <Download className="w-4 h-4" /> Download
              </button>
              <button onClick={() => { handleDelete(fullscreenImage.id); setFullscreenImage(null) }} className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded text-sm font-medium transition-colors flex items-center gap-2 border border-red-500/20">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Project Dialog */}
      {showCreateProjectDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e2535] rounded-2xl border border-white/12 max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-white">New Project</h2>
            <input
              type="text"
              placeholder="Project name..."
              value={createProjectName}
              onChange={(e) => setCreateProjectName(e.target.value)}
              className="w-full px-4 py-2 border border-white/10 rounded-lg bg-white/5 text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-white/20 text-sm"
              onKeyPress={(e) => { if (e.key === 'Enter') handleCreateProject() }}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowCreateProjectDialog(false); setCreateProjectName('') }} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors border border-white/10">
                Cancel
              </button>
              <button onClick={handleCreateProject} disabled={!createProjectName.trim() || isCreatingProject} className="px-4 py-2 bg-white/20 hover:bg-white/30 disabled:bg-white/5 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 border border-white/20">
                {isCreatingProject ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating</> : <><Plus className="w-4 h-4" /> Create</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
