'use client'

import { useEffect, useState } from 'react'
import { Download, Trash2, Copy, Search, Image as ImageIcon, Video } from 'lucide-react'
import { GenerationLayout } from '@/components/ai-studio/generation-layout'

interface Asset {
  id: string
  type: 'image' | 'video'
  name: string
  url: string
  thumbnail: string
  createdAt: Date
  model: string
  credits: number
  status: 'completed' | 'processing' | 'failed'
}

export default function AIStudioLibrary() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video'>('all')
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    const fetchGeneratedImages = async () => {
      try {
        const workspaceId = localStorage.getItem('workspaceId')
        if (!workspaceId) {
          setLoading(false)
          return
        }

        const response = await fetch('/api/ai-studio/generations/images', {
          headers: {
            'x-workspace-id': workspaceId,
          },
        })

        if (!response.ok) {
          console.error('Failed to fetch generated images')
          setLoading(false)
          return
        }

        const data = await response.json()
        setAssets(data.assets || [])
      } catch (error) {
        console.error('Error fetching images:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchGeneratedImages()
  }, [])

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = filterType === 'all' || asset.type === filterType
    return matchesSearch && matchesType
  })

  const handleCopyUrl = (assetId: string, url: string) => {
    navigator.clipboard.writeText(url)
    setCopiedId(assetId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleDelete = (assetId: string) => {
    setAssets(assets.filter((a) => a.id !== assetId))
  }

  return (
    <GenerationLayout title="Asset Library" subtitle="All your AI-generated images and videos">
      <div className="flex-1 flex flex-col bg-white min-w-0">
        {/* Search and Filter Bar */}
        <div className="border-b border-gray-300 px-8 py-4 bg-white">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 bg-gray-50 text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'image' | 'video')}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="image">Images</option>
              <option value="video">Videos</option>
            </select>
          </div>
        </div>

        {/* Assets Grid */}
        <div className="flex-1 overflow-auto p-8">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-gray-400 mb-2">Loading assets...</div>
              </div>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="text-2xl font-bold text-black mb-2">No assets found</div>
                <p className="text-gray-600">
                  {searchQuery || filterType !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Start generating images or videos to build your library'}
                </p>
              </div>
            </div>
          ) : (
            <div style={{ columnCount: 'auto', columnWidth: '280px', columnGap: '24px' }}>
              {filteredAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="relative rounded-xl overflow-hidden border border-gray-300 hover:shadow-lg transition-shadow duration-300 group mb-6"
                  style={{
                    breakInside: 'avoid',
                    display: 'block',
                  }}
                >
                  {/* Asset Preview */}
                  <div className="relative bg-gray-100 overflow-hidden">
                    <img
                      src={asset.thumbnail}
                      alt={asset.name}
                      className="w-full h-auto display-block"
                    />

                    {/* Hover Overlay with Text */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all duration-300 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 p-4">
                      <div className="text-center space-y-3">
                        <h3 className="font-semibold text-white text-sm line-clamp-2">{asset.name}</h3>
                        <div className="text-xs text-gray-200 space-y-1">
                          <p>Model: {asset.model}</p>
                          {(asset as any).aspect_ratio && <p>Ratio: {(asset as any).aspect_ratio}</p>}
                          <p>Credits: {asset.credits}</p>
                          <p>Created: {new Date(asset.createdAt).toLocaleDateString()}</p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 justify-center pt-2">
                          <button className="p-2 bg-white/90 hover:bg-white rounded-lg transition-colors" title="Download">
                            <Download className="w-4 h-4 text-gray-900" />
                          </button>
                          <button
                            onClick={() => handleCopyUrl(asset.id, asset.url)}
                            className="p-2 bg-white/90 hover:bg-white rounded-lg transition-colors"
                            title="Copy URL"
                          >
                            <Copy className="w-4 h-4 text-gray-900" />
                          </button>
                          <button
                            onClick={() => handleDelete(asset.id)}
                            className="p-2 bg-white/90 hover:bg-red-100 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>

                        {/* Copy Confirmation */}
                        {copiedId === asset.id && (
                          <div className="text-green-300 text-xs font-medium">
                            ✓ URL copied!
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Type Badge */}
                    <div className="absolute top-2 left-2 flex gap-2 opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                      <span className="px-2 py-1 bg-black/70 text-white text-xs rounded-full font-semibold">
                        {asset.type === 'image' ? '🖼️ Image' : '🎬 Video'}
                      </span>
                      {asset.status === 'processing' && (
                        <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded-full font-semibold">
                          Processing
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </GenerationLayout>
  )
}
