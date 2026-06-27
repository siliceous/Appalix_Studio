'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Download, Trash2, Copy, Search, Loader, Filter, X, Edit2, Send, FolderPlus, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Masonry from 'react-masonry-css'
import './masonry.css'

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

export default function AIStudioLibrary() {
  const router = useRouter()
  const [images, setImages] = useState<GeneratedImage[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [workspaceId, setWorkspaceId] = useState('')
  const [fullscreenImage, setFullscreenImage] = useState<GeneratedImage | null>(null)
  const [fullscreenImageIndex, setFullscreenImageIndex] = useState(0)
  const [newProjectName, setNewProjectName] = useState('')
  const [isSavingProject, setIsSavingProject] = useState(false)
  const [showCreateProjectDialog, setShowCreateProjectDialog] = useState(false)
  const [createProjectName, setCreateProjectName] = useState('')
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [selectedMediaType, setSelectedMediaType] = useState<string | null>(null)
  const [selectedGender, setSelectedGender] = useState<string | null>(null)
  const [selectedDateRange, setSelectedDateRange] = useState<string | null>(null)

  useEffect(() => {
    // Load workspace ID
    const wId = typeof window !== 'undefined' ? localStorage.getItem('workspaceId') || '' : ''
    setWorkspaceId(wId)

    // Load images from localStorage
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
      console.error('Error loading images from localStorage:', error)
      localStorage.removeItem('imageGenerationHistory')
      setLoading(false)
    }
  }, [])

  // Load projects from API
  useEffect(() => {
    if (!workspaceId) return

    const fetchProjects = async () => {
      try {
        const response = await fetch('/api/projects', {
          headers: { 'x-workspace-id': workspaceId },
        })
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

  // Filter images by search and project
  const filteredImages = images.filter((img) => {
    const matchesSearch = img.prompt.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesProject = !selectedProjectId || img.projectId === selectedProjectId

    // Gender filter - search in prompt
    const matchesGender = !selectedGender ||
      (selectedGender === 'man' && (img.prompt.toLowerCase().includes('man') || img.prompt.toLowerCase().includes('male') || img.prompt.toLowerCase().includes('boy'))) ||
      (selectedGender === 'woman' && (img.prompt.toLowerCase().includes('woman') || img.prompt.toLowerCase().includes('female') || img.prompt.toLowerCase().includes('girl'))) ||
      (selectedGender === 'neutral' && !img.prompt.toLowerCase().includes('man') && !img.prompt.toLowerCase().includes('woman'))

    // Media type filter - always image since these are generated images
    const matchesMediaType = !selectedMediaType || selectedMediaType === 'image'

    // Date filter
    let matchesDate = true
    if (selectedDateRange) {
      const now = Date.now()
      const imgTime = img.timestamp
      const diffMs = now - imgTime
      const diffDays = diffMs / (1000 * 60 * 60 * 24)

      if (selectedDateRange === 'today') matchesDate = diffDays < 1
      else if (selectedDateRange === 'week') matchesDate = diffDays < 7
      else if (selectedDateRange === 'month') matchesDate = diffDays < 30
      else if (selectedDateRange === 'year') matchesDate = diffDays < 365
    }

    return matchesSearch && matchesProject && matchesGender && matchesMediaType && matchesDate
  })

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!fullscreenImage) return

      if (e.key === 'Escape') {
        setFullscreenImage(null)
      } else if (e.key === 'ArrowLeft') {
        if (fullscreenImageIndex > 0) {
          const newIdx = fullscreenImageIndex - 1
          setFullscreenImageIndex(newIdx)
          setFullscreenImage(filteredImages[newIdx])
        }
      } else if (e.key === 'ArrowRight') {
        if (fullscreenImageIndex < filteredImages.length - 1) {
          const newIdx = fullscreenImageIndex + 1
          setFullscreenImageIndex(newIdx)
          setFullscreenImage(filteredImages[newIdx])
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [fullscreenImage, fullscreenImageIndex, filteredImages])

  const handleCopyUrl = (imageId: string, imageData: string) => {
    navigator.clipboard.writeText(imageData)
    setCopiedId(imageId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleDownload = (imageId: string, imageData: string) => {
    const link = document.createElement('a')
    link.href = imageData
    link.download = `appalix-image-${imageId}.png`
    link.click()
  }

  const handleDelete = (imageId: string) => {
    setImages(images.map(img =>
      img.id === imageId ? { ...img, deletedAt: Date.now() } : img
    ))
    // Update localStorage
    const remaining = images.filter(img => img.id !== imageId)
    localStorage.setItem('imageGenerationHistory', JSON.stringify(remaining))
  }

  const handleCreateProject = async () => {
    if (!createProjectName.trim() || !workspaceId) return

    setIsCreatingProject(true)
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': workspaceId,
        },
        body: JSON.stringify({
          name: createProjectName,
          description: 'Created from library',
        }),
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

  const getAspectRatioPadding = (ratio?: string): string => {
    if (!ratio) return 'aspect-square' // Default 1:1

    switch (ratio) {
      case '16:9':
        return 'aspect-video' // 16:9
      case '9:16':
        return 'aspect-[9/16]' // 9:16
      case '3:4':
        return 'aspect-[3/4]' // 3:4
      case '4:3':
        return 'aspect-[4/3]' // 4:3
      case '1:1':
      default:
        return 'aspect-square' // 1:1
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
          <h1 className="text-2xl font-bold text-gray-900">Image Library</h1>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="border-b border-gray-300 px-6 py-4 bg-white space-y-3">
        {/* Search Bar */}
        <div className="flex gap-4 items-center flex-wrap">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by prompt..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 bg-gray-50 text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <span className="text-sm text-gray-600 whitespace-nowrap">
            {filteredImages.length} image{filteredImages.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Filter Options */}
        <div className="flex gap-3 items-center flex-wrap">
          {/* Projects */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-600" />
            <select
              value={selectedProjectId || ''}
              onChange={(e) => setSelectedProjectId(e.target.value || null)}
              className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Projects</option>
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  {proj.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowCreateProjectDialog(true)}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
              title="Create new project"
            >
              <Plus className="w-4 h-4" />
              New
            </button>
            {selectedProjectId && (
              <button
                onClick={() => setSelectedProjectId(null)}
                className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
                title="Clear project filter"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Media Type Filter */}
          <select
            value={selectedMediaType || ''}
            onChange={(e) => setSelectedMediaType(e.target.value || null)}
            className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Media</option>
            <option value="image">Image</option>
            <option value="video">Video</option>
          </select>

          {/* Gender Filter */}
          <select
            value={selectedGender || ''}
            onChange={(e) => setSelectedGender(e.target.value || null)}
            className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Genders</option>
            <option value="man">Man</option>
            <option value="woman">Woman</option>
            <option value="neutral">Neutral</option>
          </select>

          {/* Date Filter */}
          <select
            value={selectedDateRange || ''}
            onChange={(e) => setSelectedDateRange(e.target.value || null)}
            className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>

          {/* Clear Filters */}
          {(selectedProjectId || selectedMediaType || selectedGender || selectedDateRange) && (
            <button
              onClick={() => {
                setSelectedProjectId(null)
                setSelectedMediaType(null)
                setSelectedGender(null)
                setSelectedDateRange(null)
              }}
              className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg text-sm font-medium transition-colors"
            >
              Clear All Filters
            </button>
          )}
        </div>
      </div>

      {/* Images Grid */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Loading images...</p>
            </div>
          </div>
        ) : filteredImages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <p className="text-lg font-semibold text-gray-900 mb-2">No images found</p>
              <p className="text-gray-600">
                {searchQuery
                  ? 'Try adjusting your search'
                  : 'Generate images in the AI Studio to see them here'}
              </p>
            </div>
          </div>
        ) : (
          <Masonry
            breakpointCols={{
              default: 4,
              1536: 4,
              1280: 3,
              1024: 3,
              768: 2,
              640: 2,
            }}
            className="masonry-grid"
            columnClassName="masonry-grid-column"
          >
            {filteredImages.map((image, idx) => (
              <div
                key={image.id}
                className={`relative rounded-lg overflow-hidden border border-gray-300 hover:shadow-lg transition-all duration-300 bg-gray-100 break-inside-avoid cursor-pointer ${getAspectRatioPadding(image.aspectRatio)}`}
                onClick={() => {
                  setFullscreenImage(image)
                  setFullscreenImageIndex(idx)
                }}
              >
                <img
                  src={image.image}
                  alt={image.prompt}
                  className="absolute inset-0 w-full h-full object-cover"
                />

                {/* Project Badge */}
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

      {/* Fullscreen Image Modal */}
      {fullscreenImage && (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-black/60 border-b border-gray-700">
            <h2 className="text-white font-semibold">Image Preview</h2>
            <button
              onClick={() => setFullscreenImage(null)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Image Container with Navigation */}
          <div className="flex-1 flex items-center justify-center overflow-auto p-6 relative">
            {/* Previous Button */}
            {fullscreenImageIndex > 0 && (
              <button
                onClick={() => {
                  const newIdx = fullscreenImageIndex - 1
                  setFullscreenImageIndex(newIdx)
                  setFullscreenImage(filteredImages[newIdx])
                }}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors z-10"
                title="Previous image"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
            )}

            <div className="max-w-4xl max-h-full flex items-center justify-center">
              <img
                src={fullscreenImage.image}
                alt={fullscreenImage.prompt}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            </div>

            {/* Next Button */}
            {fullscreenImageIndex < filteredImages.length - 1 && (
              <button
                onClick={() => {
                  const newIdx = fullscreenImageIndex + 1
                  setFullscreenImageIndex(newIdx)
                  setFullscreenImage(filteredImages[newIdx])
                }}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors z-10"
                title="Next image"
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            )}

            {/* Image Counter */}
            <div className="absolute top-4 right-4 bg-black/60 px-3 py-1 rounded-full text-white text-sm">
              {fullscreenImageIndex + 1} / {filteredImages.length}
            </div>
          </div>

          {/* Bottom Panel - Prompt & Actions */}
          <div className="bg-black/60 border-t border-gray-700 px-6 py-4 space-y-4">
            {/* Prompt Display */}
            <div>
              <p className="text-xs text-gray-400 mb-1">Prompt</p>
              <p className="text-white text-sm">{fullscreenImage.prompt}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 flex-wrap">
              {/* Open in Canvas */}
              <button
                onClick={() => {
                  // Copy prompt to clipboard for now, will improve later
                  router.push(`/dashboard/ai-studio/create-image?prompt=${encodeURIComponent(fullscreenImage.prompt)}`)
                  setFullscreenImage(null)
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Open in Canvas
              </button>

              {/* Save to Project */}
              <button
                onClick={() => {
                  // This will show the save dialog
                  setFullscreenImage(null)
                  // TODO: Open save dialog for this image
                }}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <FolderPlus className="w-4 h-4" />
                Save to Project
              </button>

              {/* Download */}
              <button
                onClick={() => {
                  handleDownload(fullscreenImage.id, fullscreenImage.image)
                  setFullscreenImage(null)
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </button>

              {/* Delete */}
              <button
                onClick={() => {
                  handleDelete(fullscreenImage.id)
                  setFullscreenImage(null)
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Project Dialog */}
      {showCreateProjectDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Create New Project</h2>

            <input
              type="text"
              placeholder="Project name..."
              value={createProjectName}
              onChange={(e) => setCreateProjectName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleCreateProject()
                }
              }}
            />

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowCreateProjectDialog(false)
                  setCreateProjectName('')
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                disabled={!createProjectName.trim() || isCreatingProject}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {isCreatingProject ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
