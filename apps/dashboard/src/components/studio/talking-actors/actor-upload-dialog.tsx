'use client'

import { useState, useRef } from 'react'
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react'
import type { Actor } from './types'

interface ActorUploadDialogProps {
  isOpen: boolean
  onClose: () => void
  onActorAdded: (actor: Actor) => void
  workspaceId: string
}

type UploadType = 'image' | 'video' | 'voice'

export function ActorUploadDialog({
  isOpen,
  onClose,
  onActorAdded,
  workspaceId,
}: ActorUploadDialogProps) {
  const [uploadType, setUploadType] = useState<UploadType>('image')
  const [actorName, setActorName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setError('')
    setSuccess(false)

    // Validate file type and size
    const maxSize =
      uploadType === 'image' ? 10 * 1024 * 1024 : uploadType === 'video' ? 100 * 1024 * 1024 : 5 * 1024 * 1024

    if (selectedFile.size > maxSize) {
      setError(
        `File too large. Max ${uploadType === 'image' ? '10MB' : uploadType === 'video' ? '100MB' : '5MB'}`
      )
      return
    }

    const validTypes =
      uploadType === 'image'
        ? ['image/jpeg', 'image/png', 'image/webp']
        : uploadType === 'video'
          ? ['video/mp4', 'video/quicktime', 'video/webm']
          : ['audio/mpeg', 'audio/wav', 'audio/webm']

    if (!validTypes.includes(selectedFile.type)) {
      setError(`Invalid ${uploadType} format`)
      return
    }

    setFile(selectedFile)

    // Create preview
    const reader = new FileReader()
    reader.onload = e => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(selectedFile)
  }

  const handleUpload = async () => {
    if (!file || !actorName.trim()) {
      setError('Please provide actor name and select a file')
      return
    }

    setUploading(true)
    setError('')

    try {
      // Create FormData for file upload
      const formData = new FormData()
      formData.append('file', file)
      formData.append('workspaceId', workspaceId)
      formData.append('actorName', actorName)
      formData.append('uploadType', uploadType)

      const response = await fetch('/api/talking-actors/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const { error } = await response.json()
        throw new Error(error)
      }

      const { actor } = await response.json()

      // Convert API response to Actor type
      const newActor: Actor = {
        id: actor.id,
        name: actor.actor_name,
        image: '👤',
        type: 'custom',
        category: 'custom',
        description: `Custom actor uploaded from ${uploadType}`,
        uploadDate: new Date(actor.created_at),
      }

      onActorAdded(newActor)
      setSuccess(true)

      // Reset after success
      setTimeout(() => {
        setActorName('')
        setFile(null)
        setPreview('')
        setSuccess(false)
        onClose()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) {
      const input = fileInputRef.current
      if (input) {
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(droppedFile)
        input.files = dataTransfer.files
        handleFileSelect({ target: input } as React.ChangeEvent<HTMLInputElement>)
      }
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-white/10 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 border-b border-gray-200 dark:border-white/10 px-6 py-4 flex items-center justify-between bg-white dark:bg-white/5">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Upload Actor
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Tabs */}
          <div className="flex gap-2 border-b border-gray-200 dark:border-white/10">
            {(['image', 'video'] as const).map(type => (
              <button
                key={type}
                onClick={() => {
                  setUploadType(type)
                  setFile(null)
                  setPreview('')
                  setError('')
                }}
                className={`px-4 py-2 font-medium border-b-2 transition-colors capitalize ${
                  uploadType === type
                    ? 'text-black dark:text-white border-black dark:border-white'
                    : 'text-gray-500 dark:text-gray-400 border-transparent'
                }`}
              >
                {type === 'image' ? '📸 Image' : '🎬 Video'}
              </button>
            ))}
          </div>

          {/* Actor Name */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900 dark:text-white">
              Actor Name
            </label>
            <input
              type="text"
              value={actorName}
              onChange={e => setActorName(e.target.value)}
              placeholder="e.g., John Smith, Professional Woman"
              className="w-full px-4 py-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
            />
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900 dark:text-white">
              {uploadType === 'image' ? 'Upload Image' : 'Upload Video'}
            </label>

            <div
              className="border-2 border-dashed border-gray-300 dark:border-white/20 rounded-lg p-8 text-center transition-colors hover:border-gray-400 dark:hover:border-white/30"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={
                  uploadType === 'image'
                    ? 'image/jpeg,image/png,image/webp'
                    : 'video/mp4,video/quicktime,video/webm'
                }
                onChange={handleFileSelect}
                className="hidden"
              />

              {preview ? (
                <div className="space-y-3">
                  {uploadType === 'image' ? (
                    <img
                      src={preview}
                      alt="Preview"
                      className="max-h-40 mx-auto rounded"
                    />
                  ) : (
                    <video
                      src={preview}
                      className="max-h-40 mx-auto rounded"
                      controls
                    />
                  )}
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {file?.name}
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Change file
                  </button>
                </div>
              ) : (
                <div
                  className="space-y-3 cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-10 h-10 text-gray-400 mx-auto" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Drag and drop your {uploadType}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      or click to browse
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Max {uploadType === 'image' ? '10MB' : '100MB'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="flex gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700 dark:text-green-300">
                Actor created successfully!
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-white/10">
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-gray-900 dark:text-white rounded-lg font-medium transition-colors flex-1"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!file || !actorName.trim() || uploading}
              className="px-4 py-2.5 bg-black hover:bg-gray-900 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors flex-1 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Uploading...
                </>
              ) : (
                'Create Actor'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
