'use client'

import { useState, useEffect } from 'react'
import { Plus, Upload, Trash2, Edit2, Eye } from 'lucide-react'
import { ActorUploadDialog } from '@/components/studio/talking-actors/actor-upload-dialog'
import type { Actor } from '@/components/studio/talking-actors/types'

interface ActorWithDetails extends Actor {
  id: string
  uploadedBy?: string
  uploadDate?: Date
  imageUrl?: string
  videoUrl?: string
}

interface ActorsClientProps {
  workspaceId: string
}

export function ActorsClient({ workspaceId }: ActorsClientProps) {
  const [actors, setActors] = useState<ActorWithDetails[]>([])
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedActor, setSelectedActor] = useState<ActorWithDetails | null>(null)

  useEffect(() => {
    fetchActors()
  }, [workspaceId])

  const fetchActors = async () => {
    try {
      setLoading(true)

      const response = await fetch(`/api/talking-actors/workspace/${workspaceId}`)

      if (!response.ok) {
        throw new Error('Failed to fetch actors')
      }

      const { actors: rawActors } = await response.json()

      // Convert API response to Actor type
      const convertedActors = rawActors.map((actor: any) => ({
        id: actor.id,
        name: actor.actor_name,
        image: '👤',
        type: actor.type,
        category: 'custom',
        description: `Uploaded ${new Date(actor.created_at).toLocaleDateString()}`,
        uploadDate: new Date(actor.created_at),
        imageUrl: actor.image_url,
        videoUrl: actor.video_url,
      }))

      setActors(convertedActors)
    } catch (error) {
      console.error('Failed to fetch actors:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleActorAdded = (newActor: ActorWithDetails) => {
    setActors([...actors, newActor])
  }

  const handleDeleteActor = async (actorId: string) => {
    if (!confirm('Are you sure you want to delete this actor?')) return

    try {
      const response = await fetch(`/api/talking-actors/${actorId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete actor')
      }

      setActors(actors.filter(a => a.id !== actorId))
    } catch (error) {
      console.error('Failed to delete actor:', error)
      alert('Failed to delete actor')
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-white/10 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              My Talking Actors
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Upload and manage custom actor avatars for your videos
            </p>
          </div>

          <button
            onClick={() => setShowUploadDialog(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-black hover:bg-gray-900 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            Upload Actor
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 border-2 border-gray-200 dark:border-white/10 border-t-black dark:border-t-white rounded-full animate-spin mx-auto" />
              <p className="text-gray-500 dark:text-gray-400">Loading actors...</p>
            </div>
          </div>
        ) : actors.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-6 max-w-md">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 flex items-center justify-center mx-auto">
                <Upload className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  No Actors Yet
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Upload images or videos to create your custom talking actors. You can use them in your videos with any of our voices.
                </p>
              </div>

              <button
                onClick={() => setShowUploadDialog(true)}
                className="px-6 py-2.5 bg-black hover:bg-gray-900 text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Upload Your First Actor
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {actors.length} actor{actors.length !== 1 ? 's' : ''} uploaded
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {actors.map(actor => (
                <ActorCard
                  key={actor.id}
                  actor={actor}
                  onDelete={handleDeleteActor}
                  onSelect={() => setSelectedActor(actor)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <ActorUploadDialog
        isOpen={showUploadDialog}
        onClose={() => setShowUploadDialog(false)}
        onActorAdded={handleActorAdded}
        workspaceId={workspaceId}
      />

      {/* Actor Detail Modal */}
      {selectedActor && (
        <ActorDetailModal
          actor={selectedActor}
          onClose={() => setSelectedActor(null)}
        />
      )}
    </div>
  )
}

interface ActorCardProps {
  actor: ActorWithDetails
  onDelete: (id: string) => void
  onSelect: () => void
}

function ActorCard({ actor, onDelete, onSelect }: ActorCardProps) {
  return (
    <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden hover:shadow-lg dark:hover:shadow-black/20 transition-all group">
      {/* Preview */}
      <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-50 dark:from-white/5 dark:to-white/10 flex items-center justify-center overflow-hidden">
        {actor.imageUrl ? (
          <img
            src={actor.imageUrl}
            alt={actor.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-6xl">{actor.image}</div>
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={onSelect}
            className="p-3 bg-white rounded-full hover:bg-gray-100 transition-colors"
            title="View details"
          >
            <Eye className="w-5 h-5 text-gray-900" />
          </button>
          <button
            onClick={() => onDelete(actor.id)}
            className="p-3 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
            title="Delete actor"
          >
            <Trash2 className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {actor.name}
          </h3>
          {actor.uploadDate && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Uploaded {new Date(actor.uploadDate).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-white/10">
          <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            {actor.type === 'custom' ? 'Custom' : 'Built-in'}
          </span>
          {actor.videoUrl && (
            <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
              Video
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

interface ActorDetailModalProps {
  actor: ActorWithDetails
  onClose: () => void
}

function ActorDetailModal({ actor, onClose }: ActorDetailModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-white/10 rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 border-b border-gray-200 dark:border-white/10 px-6 py-4 flex items-center justify-between bg-white dark:bg-white/5">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {actor.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Preview */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Preview
            </h3>
            <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-50 dark:from-white/5 dark:to-white/10 rounded-lg flex items-center justify-center">
              {actor.imageUrl ? (
                <img
                  src={actor.imageUrl}
                  alt={actor.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <div className="text-8xl">{actor.image}</div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Type
              </p>
              <p className="mt-1 text-sm text-gray-900 dark:text-white capitalize">
                {actor.type}
              </p>
            </div>

            {actor.uploadDate && (
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Uploaded
                </p>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">
                  {new Date(actor.uploadDate).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-white/10">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-gray-900 dark:text-white rounded-lg font-medium transition-colors flex-1"
            >
              Close
            </button>
            <button className="px-4 py-2 bg-black hover:bg-gray-900 text-white rounded-lg font-medium transition-colors flex-1">
              Use in Video
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
