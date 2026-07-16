'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { Download, Trash2, Search, Loader2, X, ChevronLeft, ChevronRight, Plus, ImagePlay, Eye, Save } from 'lucide-react'
import { SageToolbar } from '@/components/dashboard/sage-toolbar'

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
  const imageContainerRef = useRef<HTMLDivElement>(null)
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
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())
  const searchParams = useSearchParams()
  const importMode = searchParams.get("import") === "true"

  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [selectedMediaType, setSelectedMediaType] = useState<string | null>(null)
  const [selectedGender, setSelectedGender] = useState<string | null>(null)
  const [selectedDateRange, setSelectedDateRange] = useState<string | null>(null)
  const [credits, setCredits] = useState(0)
  const [imageZoom, setImageZoom] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [showTrash, setShowTrash] = useState(false)


  useEffect(() => {
    const wId = typeof window !== 'undefined' ? localStorage.getItem('workspaceId') || '' : ''
    setWorkspaceId(wId)

    const fetchImages = async () => {
      try {
        setLoading(true)
        let allImages: GeneratedImage[] = []
        let serverDeletedIds = new Set<string>()

        // Fetch server-side deleted image IDs
        if (wId) {
          try {
            const response = await fetch('/api/ai-studio/deleted-images', {
              headers: { 'x-workspace-id': wId }
            })

            if (response.ok) {
              const data = await response.json()
              serverDeletedIds = new Set(data.deleted_image_ids || [])
              console.log('Loaded deleted images from server:', serverDeletedIds.size)
            }
          } catch (e) {
            console.error('Error fetching deleted images from server:', e)
          }
        }

        // Get Supabase images
        if (wId) {
          try {
            const response = await fetch('/api/ai-studio/all-images', {
              headers: { 'x-workspace-id': wId }
            })

            if (response.ok) {
              const data = await response.json()
              const supabaseImages = (data.images || []).map((img: any) => ({
                id: img.id,
                image: img.output_url || '',
                prompt: img.prompt || '',
                timestamp: new Date(img.created_at).getTime(),
                aspectRatio: img.aspect_ratio,
                deletedAt: serverDeletedIds.has(img.id) ? Date.now() : undefined,
              })).filter((img: any) => img.image)

              allImages = allImages.concat(supabaseImages)
              console.log('Loaded from Supabase:', supabaseImages.length)
            }
          } catch (e) {
            console.error('Error fetching from Supabase:', e)
          }
        }

        // Also load localStorage (for recently generated images not yet in Supabase)
        const savedHistory = localStorage.getItem('imageGenerationHistory')
        console.log('localStorage history exists:', !!savedHistory, 'size:', savedHistory?.length || 0)

        if (savedHistory) {
          try {
            const parsed = JSON.parse(savedHistory)
            console.log('Parsed localStorage history:', parsed.length, 'items')

            const historyWithIds = parsed
              .filter((img: any) => img && img.image && typeof img.image === 'string' && img.image.length > 0)
              .map((img: any, idx: number) => ({
                ...img,
                id: img.id || `legacy-${img.timestamp || idx}`,
              }))
            console.log('After filtering by image:', historyWithIds.length, 'items')

            // Merge localStorage deletions with server deletions
            const combinedDeletedIds = new Set(serverDeletedIds)
            historyWithIds.forEach((img: any) => {
              if (img.deletedAt) {
                combinedDeletedIds.add(img.id)
              }
            })

            const activeImages = historyWithIds.filter((img: any) => !img.deletedAt && !combinedDeletedIds.has(img.id))
            const deletedImages = historyWithIds.filter((img: any) => img.deletedAt || combinedDeletedIds.has(img.id))
            console.log('Active images (not deleted):', activeImages.length, 'Deleted:', deletedImages.length)

            // Merge: add localStorage images that aren't already in Supabase (deduplicate by ID and URL)
            const supabaseIds = new Set(allImages.map(img => img.id))
            const supabaseUrls = new Set(allImages.map(img => img.image))
            const newFromLocalStorage = activeImages.filter((img: any) => !supabaseIds.has(img.id) && !supabaseUrls.has(img.image))
            allImages = allImages.concat(newFromLocalStorage)
            console.log('Loaded from localStorage:', newFromLocalStorage.length, 'Total:', allImages.length)
          } catch (e) {
            console.error('Error loading localStorage:', e)
          }
        } else {
          console.log('No localStorage history found')
        }

        // Sort all by timestamp (newest first)
        if (allImages.length > 0) {
          allImages.sort((a: any, b: any) => b.timestamp - a.timestamp)
        }

        console.log('Setting images:', allImages.length)
        setImages(allImages)
        setLoading(false)
      } catch (error) {
        console.error('Error loading images:', error)
        setLoading(false)
      }
    }

    fetchImages()

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

  const deletedImages = images.filter((img) => img.deletedAt)

  const filteredImages = images.filter((img) => {
    if (img.deletedAt) return false
    const matchesSearch = !searchQuery || img.prompt.toLowerCase().includes(searchQuery.toLowerCase())
    // Project filter: only apply if a project is selected AND image has projectId
    const matchesProject = !selectedProjectId || img.projectId === selectedProjectId || !img.projectId
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

  const handleDownload = async (imageId: string, imageData: string) => {
    try {
      // If it's a data URL, download directly
      if (imageData.startsWith('data:')) {
        const link = document.createElement('a')
        link.href = imageData
        link.download = `appalix-image-${imageId}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        return
      }

      // For Supabase URLs, fetch and convert to blob
      const response = await fetch(imageData)
      if (!response.ok) throw new Error('Failed to fetch image')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `appalix-image-${imageId}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
      alert('Failed to download image')
    }
  }

  const handleDelete = async (imageId: string) => {
    setImages(images.map(img => img.id === imageId ? { ...img, deletedAt: Date.now() } : img))
    const remaining = images.filter(img => img.id !== imageId)
    localStorage.setItem('imageGenerationHistory', JSON.stringify(remaining))

    // Sync deletion to server
    try {
      await fetch('/api/ai-studio/trash-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': workspaceId,
        },
        body: JSON.stringify({ image_id: imageId }),
      })
      console.log('Image deletion synced to server:', imageId)
    } catch (e) {
      console.error('Error syncing image deletion to server:', e)
    }
  }

  const handleRestore = async (imageId: string) => {
    setImages(images.map(img => img.id === imageId ? { ...img, deletedAt: undefined } : img))
    const updated = images.map(img => img.id === imageId ? { ...img, deletedAt: undefined } : img)
    localStorage.setItem('imageGenerationHistory', JSON.stringify(updated))

    // Sync restoration to server
    try {
      await fetch('/api/ai-studio/restore-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': workspaceId,
        },
        body: JSON.stringify({ image_id: imageId }),
      })
      console.log('Image restoration synced to server:', imageId)
    } catch (e) {
      console.error('Error syncing image restoration to server:', e)
    }
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
        setImageZoom(1)
      } else if (e.key === 'ArrowRight' && fullscreenImageIndex < filteredImages.length - 1) {
        const newIdx = fullscreenImageIndex + 1
        setFullscreenImageIndex(newIdx)
        setFullscreenImage(filteredImages[newIdx])
        setImageZoom(1)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [fullscreenImage, fullscreenImageIndex, filteredImages])

  return (
    <div className="-m-8 flex flex-col h-screen overflow-hidden" suppressHydrationWarning>
      <SageToolbar pageKey="email" />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden bg-[#f5f4f1] flex flex-col">
          <div className="px-4 ml-3 mr-4 pt-8 pb-0 shrink-0">
            <div className="mb-5">
              <h1 className="text-xl font-bold text-gray-900">AI Studio</h1>
              <p className="text-gray-500 text-sm mt-0.5">Create, manage, and explore your AI-generated images and videos</p>
            </div>

            <nav className="mb-5 border border-white/10 bg-[#141c2b] rounded-xl shadow-lg flex items-center shrink-0 gap-x-2 min-h-[52px] p-4">
              <button onClick={() => router.push('/ai-studio/create-image')} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg text-white hover:bg-white/10 transition-colors">Create Image</button>
              <button onClick={() => router.push('/studio/talking-actors')} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg text-white hover:bg-white/10 transition-colors">Talking Actors</button>
              <button onClick={() => router.push('/ai-studio/create-video')} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg text-white hover:bg-white/10 transition-colors">Create Video</button>
              <button onClick={() => router.push('/ai-studio/product-ads')} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg text-white hover:bg-white/10 transition-colors">Product Ads</button>
              <div className="flex-1" />
              <div className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg text-white bg-white/10 border border-white/20">{credits} Credits</div>
            </nav>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col px-4 ml-3 mr-4 pb-4">
            <div className="bg-[#141c2b] rounded-t-xl border border-white/10 border-b-0 shadow-lg p-4 shrink-0">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  <input type="text" placeholder="Search…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-8 pr-3 py-2 text-sm border border-white/20 rounded-lg !bg-[#f5f4f1] !text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40" />
                </div>
                <div className="relative">
                  <select value={selectedProjectId || ''} onChange={(e) => setSelectedProjectId(e.target.value || null)} className="appearance-none pl-3 pr-7 py-2 text-sm border border-white/20 rounded-lg bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 cursor-pointer">
                    <option value="">Projects</option>
                    {projects.map((proj) => <option key={proj.id} value={proj.id}>{proj.name}</option>)}
                  </select>
                </div>
                <button onClick={() => setShowCreateProjectDialog(true)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-white/10 text-white hover:bg-white/10 transition-colors"><Plus className="w-4 h-4" />Add New</button>
                <div className="relative">
                  <select value={selectedMediaType || ''} onChange={(e) => setSelectedMediaType(e.target.value || null)} className="appearance-none pl-3 pr-7 py-2 text-sm border border-white/20 rounded-lg bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 cursor-pointer">
                    <option value="">All Media</option>
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                  </select>
                </div>
                <div className="relative">
                  <select value={selectedGender || ''} onChange={(e) => setSelectedGender(e.target.value || null)} className="appearance-none pl-3 pr-7 py-2 text-sm border border-white/20 rounded-lg bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 cursor-pointer">
                    <option value="">All Genders</option>
                    <option value="man">Man</option>
                    <option value="woman">Woman</option>
                    <option value="neutral">Neutral</option>
                  </select>
                </div>
                <div className="relative">
                  <select value={selectedDateRange || ''} onChange={(e) => setSelectedDateRange(e.target.value || null)} className="appearance-none pl-3 pr-7 py-2 text-sm border border-white/20 rounded-lg bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 cursor-pointer">
                    <option value="">All Times</option>
                    <option value="today">Today</option>
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                    <option value="year">Year</option>
                  </select>
                </div>
                {(selectedProjectId || selectedMediaType || selectedGender || selectedDateRange) && <button onClick={() => { setSelectedProjectId(null); setSelectedMediaType(null); setSelectedGender(null); setSelectedDateRange(null) }} className="px-3 py-2 text-sm font-medium rounded-lg border border-white/10 text-white hover:bg-white/10 transition-colors">Clear</button>}
                <button
                  onClick={() => {
                    const params = new URLSearchParams(window.location.search)
                    if (importMode) {
                      params.delete('import')
                    } else {
                      params.set('import', 'true')
                    }
                    router.push(`?${params.toString()}`)
                  }}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors text-white ${
                    importMode
                      ? 'bg-blue-600 border border-blue-500'
                      : 'bg-gray-700 border border-gray-600 hover:bg-gray-600'
                  }`}
                >
                  {importMode ? '✓ Select Mode' : 'Import Mode'}
                </button>
                <button
                  onClick={() => setShowTrash(!showTrash)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors text-white ${
                    showTrash
                      ? 'bg-red-600 border border-red-500'
                      : deletedImages.length > 0
                      ? 'bg-red-900/40 border border-red-500/50 hover:bg-red-900/60'
                      : 'bg-gray-700 border border-gray-600 hover:bg-gray-600'
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                  Trash ({deletedImages.length})
                </button>
                {importMode && (
                  <>
                    <button
                      onClick={() => {
                        if (selectedImages.size === 0) {
                          setSelectedImages(new Set(images.map(img => img.id)))
                        } else {
                          setSelectedImages(new Set())
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-gray-700 border border-gray-600 text-white hover:bg-gray-600 transition-colors"
                    >
                      {selectedImages.size === 0 ? 'Select All' : `Unselect All (${selectedImages.size})`}
                    </button>
                    <button
                      onClick={() => {
                        if (selectedImages.size === 0) {
                          alert("Please select at least one image")
                          return
                        }
                        const imagesToImport = images.filter(img => selectedImages.has(img.id) && !img.deletedAt)
                        console.log('[Import] Selected:', selectedImages.size, 'Found to import:', imagesToImport.length)

                        // Get existing pending imports and append to them
                        const existingPending = sessionStorage.getItem("pendingImports")
                        let allImagesToImport = imagesToImport
                        if (existingPending) {
                          try {
                            const existing = JSON.parse(existingPending)
                            allImagesToImport = [...existing, ...imagesToImport]
                          } catch (e) {
                            console.error("[Import] Failed to parse existing pending imports:", e)
                          }
                        }

                        console.log('[Import] Setting sessionStorage with', allImagesToImport.length, 'images')
                        sessionStorage.setItem("pendingImports", JSON.stringify(allImagesToImport))
                        const verify = sessionStorage.getItem("pendingImports")
                        console.log('[Import] Verified sessionStorage set:', verify ? 'SUCCESS' : 'FAILED')
                        console.log('[Import] Navigating to talking-actors via router.push')
                        router.push("/studio/talking-actors")
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 border border-blue-500 text-white hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Import ({selectedImages.size})
                    </button>
                  </>
                )}

              </div>
            </div>

            <div className="flex-1 overflow-hidden bg-slate-900 rounded-b-xl border border-white/10 border-t-0 shadow-lg">
              <div className="h-full overflow-y-auto p-6 flex flex-col">
                {showTrash && (
                  <div className="mb-4 flex items-center gap-3">
                    <button
                      onClick={() => setShowTrash(false)}
                      className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                      title="Back to gallery"
                    >
                      <ChevronLeft className="w-5 h-5 text-white" />
                    </button>
                    <h2 className="text-lg font-semibold text-white">Trash ({deletedImages.length})</h2>
                  </div>
                )}
                <div className={showTrash ? 'flex-1 overflow-y-auto' : ''}>
                  {showTrash ? (
                    // Trash view
                    deletedImages.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <p className="text-gray-300 font-medium">Trash is empty</p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-1.5 auto-rows-max">
                        {deletedImages.map((image) => (
                          <div
                            key={image.id}
                            className="group relative rounded-lg overflow-hidden bg-gray-200 border border-gray-600 cursor-pointer hover:border-gray-500 transition-all"
                          >
                            <img
                              src={image.image}
                              alt={image.prompt}
                              className={`w-full h-full object-cover ${getAspectRatioPadding(image.aspectRatio)} opacity-50`}
                              onError={(e) => {
                                ;(e.target as HTMLImageElement).style.opacity = '0'
                              }}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleRestore(image.id)
                                }}
                                className="p-2 bg-white rounded-full hover:bg-gray-200 transition-colors"
                                title="Restore"
                              >
                                <ChevronLeft className="w-4 h-4 text-gray-700" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  ) : loading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                  ) : filteredImages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <p className="text-gray-300 font-medium">No assets found</p>
                        <p className="text-gray-400 text-sm">Try adjusting your filters</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-1.5 auto-rows-max">
                    {filteredImages.map((image, idx) => {
                      const getAspectRatio = (ratio?: string) => {
                        const ratios: Record<string, string> = {
                          '1:1': 'aspect-square',
                          '16:9': 'aspect-video',
                          '9:16': 'aspect-[9/16]',
                          '3:4': 'aspect-[3/4]',
                          '4:3': 'aspect-[4/3]',
                          '21:9': 'aspect-[21/9]',
                          '2:3': 'aspect-[2/3]',
                        }
                        return ratios[ratio || '1:1'] || 'aspect-square'
                      }

                      return (
                        <div
                          key={image.id}
                          className={`group relative rounded-lg overflow-hidden border-2 transition-all block w-full cursor-pointer bg-gray-200 ${
                            image.id === fullscreenImage?.id
                              ? 'border-blue-500 shadow-lg shadow-blue-500/50'
                              : 'border-gray-600 hover:border-gray-500 shadow-md'
                          }`}
                          onClick={() => { if (importMode) { const newSelected = new Set(selectedImages); newSelected.has(image.id) ? newSelected.delete(image.id) : newSelected.add(image.id); setSelectedImages(newSelected); } else { setFullscreenImage(image); setFullscreenImageIndex(idx); setImageZoom(1); } }}
                        >
                          <img
                            src={image.image}
                            alt={image.prompt}
                            className={`w-full h-full object-cover ${getAspectRatio(image.aspectRatio)}`}
                            onError={(e) => {
                              ;(e.target as HTMLImageElement).style.opacity = '0'
                            }}
                          />

                          {importMode && (
                            <div className="absolute top-2 right-2 z-10">
                              <input
                                type="checkbox"
                                checked={selectedImages.has(image.id)}
                                onChange={(e) => {
                                  e.stopPropagation()
                                  const newSelected = new Set(selectedImages)
                                  if (newSelected.has(image.id)) {
                                    newSelected.delete(image.id)
                                  } else {
                                    newSelected.add(image.id)
                                  }
                                  setSelectedImages(newSelected)
                                }}
                                className="w-5 h-5 cursor-pointer"
                              />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto z-10">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                sessionStorage.setItem('importedImage', JSON.stringify(image))
                                router.push('/ai-studio/create-video')
                              }}
                              className="p-3 bg-blue-600 rounded-full hover:bg-blue-700 transition-colors shadow-lg"
                              title="Create Video"
                            >
                              <Plus className="w-5 h-5 text-white" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDownload(image.id, image.image)
                              }}
                              className="p-3 bg-white rounded-full hover:bg-gray-200 transition-colors shadow-lg"
                              title="Download"
                            >
                              <Download className="w-5 h-5 text-gray-700" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(image.id)
                              }}
                              className="p-3 bg-white rounded-full hover:bg-gray-200 transition-colors shadow-lg"
                              title="Delete"
                            >
                              <Trash2 className="w-5 h-5 text-gray-700" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {fullscreenImage && (
        <div className="fixed inset-0 bg-black/90 z-50 flex" onClick={() => { setFullscreenImage(null); setImageZoom(1) }}>
          <div className="flex-1 flex items-center justify-center overflow-hidden p-4 relative" ref={imageContainerRef} onWheel={(e) => { e.preventDefault(); setImageZoom(Math.max(0.5, Math.min(50, imageZoom + e.deltaY * 0.001))) }} onClick={(e) => e.stopPropagation()}>
            <div
              className="overflow-auto scrollbar-hide"
              style={{ userSelect: 'none', cursor: isDragging ? 'grabbing' : 'grab', width: '100%', height: '100%' }}
              onMouseDown={(e) => {
                setIsDragging(true)
                setDragStart({ x: e.clientX, y: e.clientY })
              }}
              onMouseMove={(e) => {
                if (isDragging) {
                  const deltaX = e.clientX - dragStart.x
                  const deltaY = e.clientY - dragStart.y
                  const container = e.currentTarget
                  container.scrollLeft -= deltaX
                  container.scrollTop -= deltaY
                  setDragStart({ x: e.clientX, y: e.clientY })
                }
              }}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '100%', minHeight: '100%' }}>
                <img src={fullscreenImage.image} alt={fullscreenImage.prompt} style={{ width: `${imageZoom * 100}%`, height: 'auto', flexShrink: 0 }} className="object-contain pointer-events-none" />
              </div>
            </div>
            {fullscreenImageIndex > 0 && <button onClick={(e) => { e.stopPropagation(); const newIdx = fullscreenImageIndex - 1; setFullscreenImageIndex(newIdx); setFullscreenImage(filteredImages[newIdx]); setImageZoom(1) }} className="absolute left-4 top-1/2 transform -translate-y-1/2 p-3 bg-white/20 hover:bg-white/30 rounded-full shadow-lg transition-all z-10"><ChevronLeft className="w-8 h-8 text-white" /></button>}
            {fullscreenImageIndex < filteredImages.length - 1 && <button onClick={(e) => { e.stopPropagation(); const newIdx = fullscreenImageIndex + 1; setFullscreenImageIndex(newIdx); setFullscreenImage(filteredImages[newIdx]); setImageZoom(1) }} className="absolute right-4 top-1/2 transform -translate-y-1/2 p-3 bg-white/20 hover:bg-white/30 rounded-full shadow-lg transition-all z-10"><ChevronRight className="w-8 h-8 text-white" /></button>}
          </div>

          <div className="w-96 bg-black/95 border-l border-gray-700 p-6 flex flex-col gap-4 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between flex-shrink-0">
              <div className="text-sm text-white font-medium">{fullscreenImageIndex + 1} of {filteredImages.length}</div>
              <button onClick={() => { setFullscreenImage(null); setImageZoom(1) }} className="p-2 hover:bg-gray-700 rounded-lg transition-colors"><X className="w-5 h-5 text-white" /></button>
            </div>

            <div className="text-xs text-white bg-gray-900 rounded-lg p-2 border border-gray-700 flex-shrink-0">Scroll to zoom (50% - 5000%) | Current: {Math.round(imageZoom * 100)}%</div>

            <div className="flex flex-col gap-2 flex-1 min-h-0">
              <p className="text-xs text-white uppercase font-semibold flex-shrink-0">Prompt</p>
              <div className="text-white text-sm break-words bg-gray-900 rounded-lg p-3 border border-gray-700 overflow-y-auto flex-1 whitespace-pre-wrap">{fullscreenImage?.prompt && fullscreenImage.prompt.trim().length > 0 ? fullscreenImage.prompt : '(No prompt saved for this image)'}</div>
            </div>

            <div className="flex flex-col gap-2 pt-4 border-t border-gray-700 flex-shrink-0">
              <button onClick={() => handleDownload(fullscreenImage.id, fullscreenImage.image)} className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50" disabled={loading}><Download className="w-4 h-4" /> Download</button>
              <button onClick={() => {
                if (fullscreenImage) {
                  sessionStorage.setItem('importedImage', JSON.stringify(fullscreenImage))
                }
                router.push('/ai-studio/create-video')
              }} className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"><ImagePlay className="w-4 h-4" /> Create a Video</button>
              <button onClick={() => { handleDelete(fullscreenImage.id); setFullscreenImage(null); setImageZoom(1) }} className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"><Trash2 className="w-4 h-4" /> Delete</button>
            </div>
          </div>
        </div>
      )}

      {showCreateProjectDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">New Project</h2>
            <input type="text" placeholder="Project name..." value={createProjectName} onChange={(e) => setCreateProjectName(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" onKeyPress={(e) => { if (e.key === 'Enter') handleCreateProject() }} />
            <div className="flex gap-2 justify-end pt-4 border-t">
              <button onClick={() => { setShowCreateProjectDialog(false); setCreateProjectName('') }} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors">Cancel</button>
              <button onClick={handleCreateProject} disabled={!createProjectName.trim() || isCreatingProject} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">{isCreatingProject ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating</> : <><Plus className="w-4 h-4" /> Create</>}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
