'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Download, Heart, Edit2, Trash2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'

interface GeneratedImage {
  id: string
  image: string
  prompt: string
  timestamp: number
  aspectRatio?: string
}

interface ImageViewerModalProps {
  image: GeneratedImage | null
  isOpen: boolean
  onClose: () => void
  onDownload?: (image: GeneratedImage) => void
  onDelete?: (imageId: string) => void
  onEdit?: (image: GeneratedImage) => void
  onSave?: (image: GeneratedImage) => void
  onPrevious?: () => void
  onNext?: () => void
  hasPrevious?: boolean
  hasNext?: boolean
  allowZoom?: boolean
  allowPan?: boolean
  allowDownload?: boolean
  allowDelete?: boolean
  allowEdit?: boolean
  allowSave?: boolean
}

export default function ImageViewerModal({
  image,
  isOpen,
  onClose,
  onDownload,
  onDelete,
  onEdit,
  onSave,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  allowZoom = true,
  allowPan = true,
  allowDownload = true,
  allowDelete = true,
  allowEdit = true,
  allowSave = true,
}: ImageViewerModalProps) {
  const [zoom, setZoom] = useState(100)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)

  if (!isOpen || !image) return null

  // Handle wheel zoom
  useEffect(() => {
    const container = containerRef.current
    if (!container || !allowZoom) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -50 : 50
      setZoom(prev => {
        const newZoom = Math.max(100, Math.min(1000, prev + delta))
        console.log('[Zoom] Updated to:', newZoom + '%')
        return newZoom
      })
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [allowZoom])

  // Handle keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Handle mouse drag for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!allowPan || zoom <= 100) return
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !allowPan) return
    const deltaX = e.clientX - dragStart.x
    const deltaY = e.clientY - dragStart.y
    setPan(prev => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY,
    }))
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const zoomIn = () => {
    setZoom(prev => Math.min(1000, prev + 100))
  }
  const zoomOut = () => {
    const newZoom = Math.max(100, zoom - 100)
    setZoom(newZoom)
    if (newZoom === 100) {
      setPan({ x: 0, y: 0 })
    }
  }
  const resetZoom = () => {
    setZoom(100)
    setPan({ x: 0, y: 0 })
  }

  return (
    <div
      className="fixed inset-0 bg-black/95 z-[9999] flex flex-col"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            title="Back"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <div className="text-white">
            <div className="text-sm font-medium">Image {image.id.substring(0, 8)}</div>
            {image.aspectRatio && (
              <div className="text-xs text-gray-400">{image.aspectRatio}</div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {allowSave && onSave && (
            <button
              onClick={() => onSave(image)}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              title="Save"
            >
              <Heart className="w-5 h-5 text-red-400" />
            </button>
          )}
          {allowEdit && onEdit && (
            <button
              onClick={() => onEdit(image)}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              title="Edit"
            >
              <Edit2 className="w-5 h-5 text-white" />
            </button>
          )}
          {allowDownload && onDownload && (
            <button
              onClick={() => onDownload(image)}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              title="Download"
            >
              <Download className="w-5 h-5 text-white" />
            </button>
          )}
          {allowDelete && onDelete && (
            <button
              onClick={() => {
                onDelete(image.id)
                onClose()
              }}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 className="w-5 h-5 text-red-400" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Image Container */}
      <div 
        className="flex-1 flex items-center justify-center overflow-hidden relative bg-black" 
        ref={containerRef}
        style={{ userSelect: 'none' }}
      >
        <div
          className="relative cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px)`,
          }}
        >
          <div
            ref={imageRef}
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'center',
              transition: isDragging ? 'none' : 'transform 0.2s ease-out',
            }}
          >
            <img
              src={image.image}
              alt="Image viewer"
              className="object-contain pointer-events-none select-none"
              style={{
                maxHeight: '90vh',
                maxWidth: '90vw',
                height: 'auto',
                width: 'auto',
              }}
              draggable={false}
            />
          </div>
        </div>

        {/* Navigation Buttons */}
        {hasPrevious && onPrevious && (
          <button
            onClick={onPrevious}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 p-3 bg-white/20 hover:bg-white/30 rounded-full shadow-lg transition-all z-10"
          >
            <ChevronLeft className="w-8 h-8 text-white" />
          </button>
        )}
        {hasNext && onNext && (
          <button
            onClick={onNext}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 p-3 bg-white/20 hover:bg-white/30 rounded-full shadow-lg transition-all z-10"
          >
            <ChevronRight className="w-8 h-8 text-white" />
          </button>
        )}
      </div>

      {/* Bottom Zoom Controls */}
      {allowZoom && (
        <div className="flex items-center justify-center gap-4 px-6 py-4 border-t border-gray-700 flex-shrink-0 bg-gray-900/50">
          <button
            onClick={zoomOut}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-5 h-5 text-white" />
          </button>
          <div className="text-white text-sm font-medium min-w-[80px] text-center">
            {zoom}%
          </div>
          <button
            onClick={zoomIn}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-5 h-5 text-white" />
          </button>
          <div className="w-px h-6 bg-gray-700" />
          <button
            onClick={resetZoom}
            className="px-3 py-2 hover:bg-gray-700 rounded-lg transition-colors text-white text-sm"
            title="Reset Zoom"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  )
}
