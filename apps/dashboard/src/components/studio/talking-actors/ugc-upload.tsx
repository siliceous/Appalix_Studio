'use client'

import { useState } from 'react'
import { Upload, X, Play } from 'lucide-react'
import type { Actor } from './types'

interface UGCUploadProps {
  onActorAdded: (actor: Actor) => void
  isOpen: boolean
  onClose: () => void
}

type UploadTab = 'image' | 'video' | 'clone'

export function UGCUploadDialog({ onActorAdded, isOpen, onClose }: UGCUploadProps) {
  const [tab, setTab] = useState<UploadTab>('image')
  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      const reader = new FileReader()
      reader.onload = (event) => {
        setPreview(event.target?.result as string)
      }
      reader.readAsDataURL(selectedFile)
    }
  }

  const handleUpload = async () => {
    if (!name.trim() || !file) return

    setIsUploading(true)
    try {
      // TODO: Upload to storage backend
      const newActor: Actor = {
        id: `ugc-${Date.now()}`,
        name,
        image: '👤', // Placeholder
        category: 'ugc',
        description: `Custom ${tab} actor`,
        type: 'ugc',
        uploadedBy: 'current-user',
        uploadDate: new Date(),
        videoUrl: preview,
      }
      onActorAdded(newActor)
      resetForm()
      onClose()
    } finally {
      setIsUploading(false)
    }
  }

  const resetForm = () => {
    setName('')
    setFile(null)
    setPreview('')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-white/10 rounded-2xl border border-gray-200 dark:border-white/10 shadow-xl max-w-2xl w-full mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Create Custom Actor
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-white/10">
          <button
            onClick={() => setTab('image')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
              tab === 'image'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            📷 Upload Image
          </button>
          <button
            onClick={() => setTab('video')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
              tab === 'video'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            🎬 Upload Video
          </button>
          <button
            onClick={() => setTab('clone')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
              tab === 'clone'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            🤖 Clone Voice
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Actor Name */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Actor Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., John Smith, Sarah Johnson"
              className="w-full px-4 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Upload Area */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {tab === 'image' ? 'Upload Photo' : tab === 'video' ? 'Upload Video' : 'Record Voice Sample'}
            </label>

            {!preview ? (
              <label className="block p-8 border-2 border-dashed border-gray-300 dark:border-white/20 rounded-lg cursor-pointer hover:border-cyan-500 dark:hover:border-cyan-400 transition-colors">
                <div className="text-center space-y-2">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                  <div className="text-sm">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      Click to upload
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 ml-1">or drag and drop</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {tab === 'image'
                      ? 'PNG, JPG, GIF up to 10MB'
                      : tab === 'video'
                      ? 'MP4, MOV up to 100MB'
                      : 'MP3, WAV up to 5MB'}
                  </p>
                </div>
                <input
                  type="file"
                  onChange={handleFileSelect}
                  accept={
                    tab === 'image'
                      ? 'image/*'
                      : tab === 'video'
                      ? 'video/*'
                      : 'audio/*'
                  }
                  className="hidden"
                />
              </label>
            ) : (
              <div className="space-y-4">
                {/* Preview */}
                <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
                  {tab === 'image' ? (
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video
                      src={preview}
                      className="w-full h-full object-cover"
                      controls
                    />
                  )}
                </div>

                {/* File Info */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-lg">
                  <div className="text-sm">
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {file?.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {(file?.size || 0) / 1024 / 1024 > 1
                        ? `${((file?.size || 0) / 1024 / 1024).toFixed(2)} MB`
                        : `${((file?.size || 0) / 1024).toFixed(2)} KB`}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setFile(null)
                      setPreview('')
                    }}
                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                  >
                    <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Info Message */}
          {tab === 'clone' && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/30 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                💡 Record a 30-second voice sample. We'll clone it for all your videos.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!name.trim() || !file || isUploading}
            className="px-6 py-2 text-sm font-medium bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-300 dark:disabled:bg-white/10 text-white disabled:text-gray-500 dark:disabled:text-gray-600 rounded-lg transition-colors flex items-center gap-2"
          >
            {isUploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating Actor...
              </>
            ) : (
              'Create Actor'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
