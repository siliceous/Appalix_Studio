'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Loader2, Trash2, Search } from 'lucide-react'
import { SageToolbar } from '@/components/dashboard/sage-toolbar'

interface GeneratedImage {
  id: string
  image: string
  prompt: string
  timestamp: number
  deletedAt?: number
  aspectRatio?: string
}

const PRODUCTS = ['Electronics', 'Fashion', 'Home & Kitchen', 'Beauty', 'Toys', 'Sports', 'Food', 'Furniture']
const STYLES = ['Minimalist', 'Luxury', 'Professional', 'Casual', 'Vibrant', 'Elegant']
const BACKGROUNDS = ['White', 'Gradient', 'Natural', 'Studio', 'Lifestyle', 'Abstract']

export default function ProductAdsPage() {
  const router = useRouter()
  const [images, setImages] = useState<GeneratedImage[]>([])
  const [loading, setLoading] = useState(true)
  const [workspaceId, setWorkspaceId] = useState('')
  const [credits, setCredits] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [selectedStyles, setSelectedStyles] = useState<string[]>([])
  const [selectedBackgrounds, setSelectedBackgrounds] = useState<string[]>([])
  const [adTitle, setAdTitle] = useState('')
  const [showTrash, setShowTrash] = useState(false)

  useEffect(() => {
    const wId = typeof window !== 'undefined' ? localStorage.getItem('workspaceId') || '' : ''
    setWorkspaceId(wId)

    const fetchImages = async () => {
      try {
        setLoading(true)
        setImages([])
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

  const filteredImages = images.filter((img) => {
    if (img.deletedAt) return false
    const promptLower = img.prompt.toLowerCase()
    const matchesSearch = !searchQuery || promptLower.includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  return (
    <div className="-m-8 flex flex-col h-screen overflow-hidden" suppressHydrationWarning>
      <SageToolbar pageKey="email" />

      <div className="flex flex-1 overflow-hidden gap-3">
        {/* Left Panel - Product Ad Settings */}
        <div className="w-80 flex flex-col rounded-2xl shadow-lg bg-white overflow-hidden m-3 mt-24 flex-shrink-0">
          <div className="bg-black text-white px-4 py-3 h-12 flex items-center justify-between flex-shrink-0">
            <h2 className="text-sm font-semibold">Create Ad</h2>
            <button
              onClick={() => router.push("/ai-studio")}
              className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
              title="Back to AI Studio"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide px-3 py-3 pr-2 space-y-4 text-xs">
            {/* Ad Title */}
            <div>
              <label className="text-xs font-semibold text-black uppercase tracking-widest mb-2 block">Ad Title</label>
              <input type="text" value={adTitle} onChange={(e) => setAdTitle(e.target.value)} placeholder="Give your ad a name..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* Product Category */}
            <div>
              <label className="text-xs font-semibold text-black uppercase tracking-widest mb-2 block">Product Category</label>
              <div className="flex flex-wrap gap-2">
                {PRODUCTS.map(p => (
                  <button key={p} onClick={() => setSelectedProducts(selectedProducts.includes(p) ? selectedProducts.filter(x => x !== p) : [...selectedProducts, p])} className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${selectedProducts.includes(p) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{p}</button>
                ))}
              </div>
            </div>

            {/* Style */}
            <div>
              <label className="text-xs font-semibold text-black uppercase tracking-widest mb-2 block">Style</label>
              <div className="flex flex-wrap gap-2">
                {STYLES.map(s => (
                  <button key={s} onClick={() => setSelectedStyles(selectedStyles.includes(s) ? selectedStyles.filter(x => x !== s) : [...selectedStyles, s])} className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${selectedStyles.includes(s) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{s}</button>
                ))}
              </div>
            </div>

            {/* Background */}
            <div>
              <label className="text-xs font-semibold text-black uppercase tracking-widest mb-2 block">Background</label>
              <div className="flex flex-wrap gap-2">
                {BACKGROUNDS.map(b => (
                  <button key={b} onClick={() => setSelectedBackgrounds(selectedBackgrounds.includes(b) ? selectedBackgrounds.filter(x => x !== b) : [...selectedBackgrounds, b])} className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${selectedBackgrounds.includes(b) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{b}</button>
                ))}
              </div>
            </div>

            {/* Clear All Filters Button */}
            {(selectedProducts.length > 0 || selectedStyles.length > 0 || selectedBackgrounds.length > 0) && (
              <button
                onClick={() => {
                  setSelectedProducts([])
                  setSelectedStyles([])
                  setSelectedBackgrounds([])
                }}
                className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors mt-4"
              >
                Clear All Filters
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-hidden bg-[#f5f4f1] flex flex-col mr-3">
          <div className="px-4 pt-8 pb-0 shrink-0">
            <div className="mb-5">
              <h1 className="text-xl font-bold text-gray-900">Product Ads</h1>
              <p className="text-gray-500 text-sm mt-0.5">Create and manage your product advertisement images</p>
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col px-4 pb-4 min-h-0">
            <div className="bg-[#141c2b] rounded-t-xl border border-white/10 border-b-0 shadow-lg p-4 shrink-0">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  <input type="text" placeholder="Search…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-8 pr-3 py-2 text-sm border border-white/20 rounded-lg !bg-[#f5f4f1] !text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40" />
                </div>
                <button
                  onClick={() => setShowTrash(!showTrash)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors text-white bg-gray-700 border border-gray-600 hover:bg-gray-600`}
                >
                  <Trash2 className="w-4 h-4" />
                  Trash (0)
                </button>
                <div className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg text-white bg-white/10 border border-white/20">{credits} Credits</div>
              </div>
            </div>

            <div className="flex-1 overflow-hidden bg-slate-900 rounded-b-xl border border-white/10 border-t-0 shadow-lg min-h-0">
              <div className="h-full overflow-y-auto p-6 flex flex-col scrollbar-hide">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                  </div>
                ) : filteredImages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <p className="text-gray-300 font-medium">Your gallery is empty</p>
                      <p className="text-gray-400 text-sm">Generate product ads to get started</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-5 gap-3">
                    {filteredImages.map((image) => (
                      <div
                        key={image.id}
                        className="group relative rounded-lg overflow-hidden border-2 border-gray-600 hover:border-gray-500 shadow-md bg-gray-200 cursor-pointer aspect-square"
                      >
                        <img
                          src={image.image}
                          alt={image.prompt}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).style.opacity = '0'
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
