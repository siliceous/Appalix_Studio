'use client'

import { useState } from 'react'
import { Plus, Upload, Trash2, Eye } from 'lucide-react'

interface Actor {
  id: string
  name: string
  image: string
  type: string
  category: string
  imageUrl?: string
  videoUrl?: string
  uploadDate?: Date
}

interface ActorsClientProps {
  workspaceId: string
}

export function ActorsClient({ workspaceId }: ActorsClientProps) {
  const [actors, setActors] = useState<Actor[]>([])
  const [loading, setLoading] = useState(false)

  return (
    <div className="flex flex-col h-full">
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
          <button className="flex items-center gap-2 px-4 py-2.5 bg-black hover:bg-gray-900 text-white rounded-lg font-medium transition-colors">
            <Plus className="w-5 h-5" />
            Upload Actor
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {actors.length === 0 ? (
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
                  Upload images or videos to create your custom talking actors.
                </p>
              </div>
              <button className="px-6 py-2.5 bg-black hover:bg-gray-900 text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Upload Your First Actor
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Actor cards will go here */}
          </div>
        )}
      </div>
    </div>
  )
}
