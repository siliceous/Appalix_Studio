'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Download, Trash2, Copy, Search, Loader, Filter, X, Edit2, Send, FolderPlus } from 'lucide-react'
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
  const [newProjectName, setNewProjectName] = useState('')
  const [isSavingProject, setIsSavingProject] = useState(false)

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
    return matchesSearch && matchesProject
  })

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
      <div className="border-b border-gray-300 px-6 py-4 bg-white">
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

          {/* Project Filter */}
          {projects.length > 0 && (
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
              {selectedProjectId && (
                <button
                  onClick={() => setSelectedProjectId(null)}
                  className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
                  title="Clear filter"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          <span className="text-sm text-gray-600 whitespace-nowrap">
            {filteredImages.length} image{filteredImages.length !== 1 ? 's' : ''}
          </span>
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
            {filteredImages.map((image) => (
              <div
                key={image.id}
                className={`relative rounded-lg overflow-hidden border border-gray-300 hover:shadow-lg transition-all duration-300 bg-gray-100 break-inside-avoid cursor-pointer ${getAspectRatioPadding(image.aspectRatio)}`}
                onClick={() => setFullscreenImage(image)}
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

          {/* Image Container */}
          <div className="flex-1 flex items-center justify-center overflow-auto p-6">
            <div className="max-w-4xl max-h-full flex items-center justify-center">
              <img
                src={fullscreenImage.image}
                alt={fullscreenImage.prompt}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
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
    </div>
  )
}
