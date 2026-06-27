'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Trash2, Search, Loader, Filter, X, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
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
    <div className="-m-8 flex flex-col h-screen overflow-hidden bg-black">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 bg-black border-b border-gray-800">
        <div className="flex gap-3 items-center">
          <button onClick={() => router.push('/dashboard/ai-studio/create-image')} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors">
            Create Image
          </button>
          <button onClick={() => router.push('/dashboard/ai-studio/create-video')} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm font-medium transition-colors">
            Create Video
          </button>
          <button onClick={() => router.push('/dashboard/ai-studio/product-ads')} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors">
            Product Ads
          </button>
          <button onClick={() => router.push('/dashboard/ai-studio/talking-ad')} className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm font-medium transition-colors">
            Talking Ads
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="px-3 py-1 bg-gray-900 border border-gray-700 rounded text-sm text-white font-medium">
            {credits} Credits
          </div>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="px-6 py-3 bg-black border-b border-gray-800 space-y-3">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded border border-gray-700 bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <span className="text-sm text-gray-400 whitespace-nowrap">
            {filteredImages.length} assets
          </span>
        </div>

        <div className="flex gap-3 items-center flex-wrap">
          <select
            value={selectedProjectId || ''}
            onChange={(e) => setSelectedProjectId(e.target.value || null)}
            className="px-3 py-2 rounded border border-gray-700 bg-gray-900 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Projects</option>
            {projects.map((proj) => (
              <option key={proj.id} value={proj.id}>{proj.name}</option>
            ))}
          </select>
          <button
            onClick={() => setShowCreateProjectDialog(true)}
            className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded text-sm font-medium transition-colors flex items-center gap-1 border border-gray-700"
            title="Create new project"
          >
            <Plus className="w-4 h-4" />
            Add New
          </button>
          <select
            value={selectedMediaType || ''}
            onChange={(e) => setSelectedMediaType(e.target.value || null)}
            className="px-3 py-2 rounded border border-gray-700 bg-gray-900 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Media</option>
            <option value="image">Image</option>
            <option value="video">Video</option>
          </select>
          <select
            value={selectedGender || ''}
            onChange={(e) => setSelectedGender(e.target.value || null)}
            className="px-3 py-2 rounded border border-gray-700 bg-gray-900 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Genders</option>
            <option value="man">Man</option>
            <option value="woman">Woman</option>
            <option value="neutral">Neutral</option>
          </select>
          <select
            value={selectedDateRange || ''}
            onChange={(e) => setSelectedDateRange(e.target.value || null)}
            className="px-3 py-2 rounded border border-gray-700 bg-gray-900 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded text-sm font-medium transition-colors border border-gray-700"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Asset Library Grid */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader className="w-8 h-8 animate-spin text-gray-500" />
          </div>
        ) : filteredImages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-300 font-medium mb-2">No assets yet</p>
              <p className="text-gray-500 text-sm">{searchQuery ? 'Try adjusting your search' : 'Create your first image'}</p>
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
                className={`relative rounded-lg overflow-hidden border border-gray-700 hover:border-gray-600 hover:shadow-lg transition-all duration-300 bg-gray-900 break-inside-avoid cursor-pointer ${getAspectRatioPadding(image.aspectRatio)}`}
                onClick={() => {
                  setFullscreenImage(image)
                  setFullscreenImageIndex(idx)
                }}
              >
                <img src={image.image} alt={image.prompt} className="absolute inset-0 w-full h-full object-cover" />
                {image.projectName && (
                  <div className="absolute top-2 left-2 bg-blue-600/90 px-2 py-1 rounded text-xs font-medium text-white">
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
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
            <div className="text-sm text-gray-400">
              {fullscreenImageIndex + 1} of {filteredImages.length}
            </div>
            <button onClick={() => setFullscreenImage(null)} className="p-2 hover:bg-gray-900 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-400" />
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
                className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors z-10"
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
                className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors z-10"
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            )}
          </div>
          <div className="border-t border-gray-800 px-6 py-4 space-y-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Prompt</p>
              <p className="text-gray-300 text-sm">{fullscreenImage.prompt}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { handleDownload(fullscreenImage.id, fullscreenImage.image); setFullscreenImage(null) }} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded text-sm font-medium transition-colors flex items-center gap-2 border border-gray-700">
                <Download className="w-4 h-4" /> Download
              </button>
              <button onClick={() => { handleDelete(fullscreenImage.id); setFullscreenImage(null) }} className="px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded text-sm font-medium transition-colors flex items-center gap-2 border border-red-800">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Project Dialog */}
      {showCreateProjectDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-950 rounded border border-gray-800 max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-white">New Project</h2>
            <input
              type="text"
              placeholder="Project name..."
              value={createProjectName}
              onChange={(e) => setCreateProjectName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-700 rounded bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              onKeyPress={(e) => { if (e.key === 'Enter') handleCreateProject() }}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowCreateProjectDialog(false); setCreateProjectName('') }} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-sm font-medium transition-colors border border-gray-700">
                Cancel
              </button>
              <button onClick={handleCreateProject} disabled={!createProjectName.trim() || isCreatingProject} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded text-sm font-medium transition-colors flex items-center gap-2">
                {isCreatingProject ? <><Loader className="w-4 h-4 animate-spin" /> Creating</> : <><Plus className="w-4 h-4" /> Create</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
