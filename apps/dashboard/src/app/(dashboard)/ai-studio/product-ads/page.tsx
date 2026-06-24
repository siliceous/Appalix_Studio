'use client'

import { useState } from 'react'
import { ShoppingBag, Zap } from 'lucide-react'
import { AIStudioLayout } from '@/components/ai-studio/ai-studio-layout'
import {
  UploadBox,
  GenerationPanel,
  VideoPreviewCard,
  CreditUsageCard,
} from '@/components/ai-studio/components'
import { aiStudioAPI } from '@/lib/api/ai-studio'
import type { Platform, CreditUsage } from '@/lib/types/ai-studio'

const PLATFORMS: Platform[] = ['tiktok', 'instagram', 'facebook', 'linkedin', 'google-ads']
const OUTPUT_TYPES = ['video', 'cinematic', 'usage', 'holding', 'lifestyle']
const SCENE_STYLES = ['Minimalist', 'Luxury', 'Casual', 'Professional', 'Energetic']
const BRAND_TONES = ['Professional', 'Friendly', 'Luxury', 'Educational', 'Humorous']

export default function ProductAdsPage() {
  const [productImage, setProductImage] = useState<File | null>(null)
  const [productImagePreview, setProductImagePreview] = useState<string>('')
  const [productName, setProductName] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [offer, setOffer] = useState('')
  const [cta, setCta] = useState('Shop Now')
  const [platform, setPlatform] = useState<Platform>('instagram')
  const [outputType, setOutputType] = useState(OUTPUT_TYPES[0])
  const [sceneStyle, setSceneStyle] = useState(SCENE_STYLES[0])
  const [brandTone, setBrandTone] = useState(BRAND_TONES[0])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'queued' | 'processing' | 'completed' | 'failed'>('idle')
  const [videoUrl, setVideoUrl] = useState<string>('')
  const [credits, setCredits] = useState<CreditUsage | null>(null)

  const handleProductImageSelect = (file: File) => {
    setProductImage(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      setProductImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleGenerate = async () => {
    if (!productName.trim() || !targetAudience.trim() || !offer.trim()) {
      alert('Please fill in product name, target audience, and offer')
      return
    }

    setLoading(true)
    try {
      const result = await aiStudioAPI.generateProductAd({
        productImage: productImagePreview,
        productName,
        targetAudience,
        offer,
        cta,
        platform,
        outputType: outputType as any,
        sceneStyle,
        brandTone,
      })

      setStatus(result.status)

      // Poll for completion
      const completed = await aiStudioAPI.pollGeneration(result.id)
      setStatus(completed.status)
      if (completed.status === 'completed' && completed.outputUrl) {
        setVideoUrl(completed.outputUrl)
      }
    } catch (error) {
      console.error('Generation failed:', error)
      setStatus('failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AIStudioLayout>
      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-blue-500" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Product Ads</h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Auto-generate professional product ads optimized for different platforms
            </p>
          </div>

          <div className="grid grid-cols-3 gap-8">
            {/* Form */}
            <div className="col-span-2 space-y-6">
              {/* Product Image */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Product Image
                </label>
                <UploadBox
                  onFileSelect={handleProductImageSelect}
                  accept="image/*"
                  label={productImage ? productImage.name : 'Upload your product image'}
                />
                {productImagePreview && (
                  <div className="mt-4">
                    <img
                      src={productImagePreview}
                      alt="Product preview"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  </div>
                )}
              </div>

              {/* Product Details */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    Product Name
                  </label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="e.g., Premium Wireless Headphones"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    Target Audience
                  </label>
                  <input
                    type="text"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="e.g., Tech-savvy professionals, ages 25-40"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    Special Offer
                  </label>
                  <input
                    type="text"
                    value={offer}
                    onChange={(e) => setOffer(e.target.value)}
                    placeholder="e.g., 30% off today only"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    Call to Action
                  </label>
                  <input
                    type="text"
                    value={cta}
                    onChange={(e) => setCta(e.target.value)}
                    placeholder="e.g., Shop Now"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Ad Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    Platform
                  </label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value as Platform)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p} value={p}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    Ad Type
                  </label>
                  <select
                    value={outputType}
                    onChange={(e) => setOutputType(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {OUTPUT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    Scene Style
                  </label>
                  <select
                    value={sceneStyle}
                    onChange={(e) => setSceneStyle(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {SCENE_STYLES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    Brand Tone
                  </label>
                  <select
                    value={brandTone}
                    onChange={(e) => setBrandTone(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {BRAND_TONES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status */}
              {status !== 'idle' && (
                <GenerationPanel
                  status={status as any}
                  estimatedTime={status === 'processing' ? '~5 minutes' : undefined}
                  creditsUsed={75}
                />
              )}

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={loading || !productName.trim() || !targetAudience.trim() || !offer.trim()}
                className="w-full py-3 px-4 bg-black dark:bg-white text-white dark:text-black rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-5 h-5" />
                Generate Product Ad
              </button>
            </div>

            {/* Right Column - Results and Credits */}
            <div className="space-y-6">
              {/* Credit Usage */}
              {credits && <CreditUsageCard usage={credits} />}

              {/* Video Result */}
              {videoUrl && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Generated Ad</h3>
                  <VideoPreviewCard
                    videoUrl={videoUrl}
                    title={`${productName} Ad`}
                    duration="30s"
                    onDownload={() => console.log('Download ad')}
                    onSave={() => console.log('Save to project')}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AIStudioLayout>
  )
}
