'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Download, Trash2, Copy, Search, Loader } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface GeneratedImage {
  id: string
  image: string
  prompt: string
  timestamp: number
  deletedAt?: number
}

export default function AIStudioLibrary() {
  const router = useRouter()
  const [images, setImages] = useState<GeneratedImage[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    // Load images from localStorage
    try {
      const savedHistory = localStorage.getItem('imageGenerationHistory')
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory)
        // Ensure all images have IDs
        const historyWithIds = parsed.map((img: any, idx: number) => ({
          ...img,
          id: img.id || `legacy-${img.timestamp || idx}`,
        }))
        // Filter out deleted images
        const activeImages = historyWithIds.filter((img: any) => !img.deletedAt)
        // Sort by timestamp, newest first
        activeImages.sort((a: any, b: any) => b.timestamp - a.timestamp)
        setImages(activeImages)
      }
      setLoading(false)
    } catch (error) {
      console.error('Error loading images from localStorage:', error)
      setLoading(false)
    }
  }, [])

  const filteredImages = images.filter((img) =>
    img.prompt.toLowerCase().includes(searchQuery.toLowerCase())
  )

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

      {/* Search Bar */}
      <div className="border-b border-gray-300 px-6 py-4 bg-white">
        <div className="flex gap-4 items-center">
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredImages.map((image) => (
              <div
                key={image.id}
                className="group relative rounded-lg overflow-hidden border border-gray-300 hover:shadow-lg transition-all duration-300 bg-gray-100 aspect-square"
              >
                <img
                  src={image.image}
                  alt={image.prompt}
                  className="w-full h-full object-cover"
                />

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors duration-300 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 p-3">
                  <div className="space-y-2 w-full">
                    {/* Prompt Preview */}
                    <p className="text-white text-xs text-center line-clamp-2 mb-3">
                      {image.prompt}
                    </p>

                    {/* Action Buttons */}
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => handleDownload(image.id, image.image)}
                        className="p-2 bg-white/90 hover:bg-white rounded-lg transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4 text-gray-900" />
                      </button>
                      <button
                        onClick={() => handleCopyUrl(image.id, image.image)}
                        className="p-2 bg-white/90 hover:bg-white rounded-lg transition-colors"
                        title="Copy"
                      >
                        <Copy className="w-4 h-4 text-gray-900" />
                      </button>
                      <button
                        onClick={() => handleDelete(image.id)}
                        className="p-2 bg-white/90 hover:bg-red-100 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>

                    {/* Copy Confirmation */}
                    {copiedId === image.id && (
                      <div className="text-green-300 text-xs font-medium text-center">
                        ✓ Copied!
                      </div>
                    )}
                  </div>
                </div>

                {/* Created Date */}
                <div className="absolute bottom-2 left-2 text-xs text-white bg-black/50 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  {new Date(image.timestamp).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
