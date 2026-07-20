'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Download, Heart, Edit2, Trash2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Copy } from 'lucide-react'

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
  const [copied, setCopied] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)

  // Define functions before they're used in useEffect
  const zoomIn = () => {
    setZoom(prev => Math.min(1000, prev + 100))
  }
  const zoomOut = () => {
    const newZoom = Math.max(100, zoom - 100)
    setZoom(newZoom)
    if (newZoom === 100) {
      setPan({ x: 0, y: 0 })
    } else {
      // Reset pan when zooming out to avoid off-screen issues
      setPan({ x: 0, y: 0 })
    }
  }
  const resetZoom = () => {
    setZoom(100)
    setPan({ x: 0, y: 0 })
  }
  const copyPrompt = () => {
    if (image) {
      navigator.clipboard.writeText(image.prompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Handle wheel zoom
  useEffect(() => {
    if (!allowZoom) return
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const increment = e.deltaY > 0 ? -50 : 50
      setZoom(prev => Math.max(100, Math.min(1000, prev + increment)))
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [allowZoom])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault()
        zoomIn()
      } else if (e.key === '-') {
        e.preventDefault()
        zoomOut()
      } else if (e.key === '0' || e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        resetZoom()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, zoom, zoomIn, zoomOut, resetZoom])

  if (!isOpen || !image) return null

  // Handle mouse drag for panning (works at any zoom level)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!allowPan) return
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !allowPan) return
    const deltaX = e.clientX - dragStart.x
    const deltaY = e.clientY - dragStart.y

    // Constrain pan to reasonable bounds based on zoom level
    const maxPan = 200 * (zoom / 100)
    setPan(prev => ({
      x: Math.max(-maxPan, Math.min(maxPan, prev.x + deltaX)),
      y: Math.max(-maxPan, Math.min(maxPan, prev.y + deltaY)),
    }))
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  return (
    <div
      className="fixed inset-0 bg-black/95 z-[9999] flex flex-col"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {/* Top Bar - Just close button */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-700 flex-shrink-0 bg-gray-900">
        <div className="text-white text-sm font-medium">
          Image {image.id.substring(0, 8)} {image.aspectRatio && `• ${image.aspectRatio}`}
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          title="Close (ESC)"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side - Image */}
        <div
          className="flex-1 flex items-center justify-center overflow-hidden relative bg-black"
          ref={containerRef}
          style={{ userSelect: 'none' }}
        >
          <div
            className="relative"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px)`,
              cursor: isDragging ? 'grabbing' : 'grab',
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
                  maxHeight: '85vh',
                  maxWidth: '65vw',
                  height: 'auto',
                  width: 'auto',
                }}
                draggable={false}
              />
            </div>
          </div>

          {/* Navigation Buttons */}
          {hasNext && onNext && (
            <button
              onClick={onNext}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 p-3 bg-white/20 hover:bg-white/30 rounded-full shadow-lg transition-all z-10"
              title="Next (Newer)"
            >
              <ChevronLeft className="w-8 h-8 text-white" />
            </button>
          )}
          {hasPrevious && onPrevious && (
            <button
              onClick={onPrevious}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 p-3 bg-white/20 hover:bg-white/30 rounded-full shadow-lg transition-all z-10"
              title="Previous (Older)"
            >
              <ChevronRight className="w-8 h-8 text-white" />
            </button>
          )}
        </div>

        {/* Right Side - Controls and Prompt */}
        <div className="w-80 flex flex-col border-l border-gray-700 bg-gray-900">
          {/* Scrollable Prompt Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {image.prompt && (
              <div>
                <p className="text-xs text-gray-400 font-semibold mb-2">Prompt:</p>
                <div className="bg-gray-800 rounded-lg p-3">
                  <p className="text-sm text-white">{image.prompt}</p>
                </div>
              </div>
            )}
          </div>

          {/* Zoom Controls and Action Buttons */}
          <div className="border-t border-gray-700 p-4 space-y-3 flex-shrink-0">
            {/* Zoom Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={zoomOut}
                disabled={zoom <= 100}
                className="p-2 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4 text-white" />
              </button>
              <div className="text-white text-xs font-medium flex-1 text-center font-mono bg-gray-700 px-2 py-1 rounded">
                {zoom}%
              </div>
              <button
                onClick={zoomIn}
                disabled={zoom >= 1000}
                className="p-2 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                onClick={copyPrompt}
                className={`w-full p-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${copied ? 'bg-green-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                title="Copy Prompt"
              >
                <Copy className="w-4 h-4 text-white" />
                <span className="text-sm text-white">{copied ? 'Copied!' : 'Copy Prompt'}</span>
              </button>
              {allowDownload && onDownload && (
                <button
                  onClick={() => onDownload(image)}
                  className="w-full p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center justify-center gap-2"
                  title="Download"
                >
                  <Download className="w-4 h-4 text-white" />
                  <span className="text-sm text-white">Download</span>
                </button>
              )}
              {allowDelete && onDelete && (
                <button
                  onClick={() => {
                    onDelete(image.id)
                    onClose()
                  }}
                  className="w-full p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                  <span className="text-sm text-white">Delete</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
