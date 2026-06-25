'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle, AlertCircle, Loader } from 'lucide-react'

interface RestoredImage {
  id: string
  image: string
  prompt: string
  timestamp: number
  aspectRatio?: string
}

export default function RestoreImagesPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [restoredCount, setRestoredCount] = useState(0)
  const [message, setMessage] = useState('')
  const [workspaceId, setWorkspaceId] = useState('')

  useEffect(() => {
    const wId = typeof window !== 'undefined' ? localStorage.getItem('workspaceId') || '' : ''
    setWorkspaceId(wId)
  }, [])

  useEffect(() => {
    if (!workspaceId) return

    const restoreImages = async () => {
      try {
        setMessage('Fetching images from database...')

        // Fetch completed images from database
        const response = await fetch('/api/ai-studio/all-images', {
          headers: {
            'x-workspace-id': workspaceId,
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch images: ${response.status}`)
        }

        const data = await response.json()
        const images = data.images || []

        if (images.length === 0) {
          setStatus('error')
          setMessage('No images found in database')
          return
        }

        setMessage(`Found ${images.length} images. Converting to localStorage format...`)

        // Convert database format to localStorage format
        const restoredImages: RestoredImage[] = images
          .filter((img: any) => img.output_url || img.output_urls)
          .slice(0, 50)
          .map((img: any) => {
            const imageUrl = img.output_urls
              ? JSON.parse(img.output_urls)[0]
              : img.output_url

            return {
              id: img.id,
              image: imageUrl,
              prompt: img.prompt || 'Generated image',
              timestamp: new Date(img.created_at).getTime(),
              aspectRatio: img.aspect_ratio || '1:1', // Store aspect ratio from database
            }
          })

        setMessage(`Saving ${restoredImages.length} images to browser storage...`)

        // Save to localStorage
        localStorage.setItem('imageGenerationHistory', JSON.stringify(restoredImages))

        setRestoredCount(restoredImages.length)
        setStatus('success')
        setMessage(`✅ Successfully restored ${restoredImages.length} images!`)

        // Redirect back after 2 seconds
        setTimeout(() => {
          router.push('/dashboard/ai-studio/create-image')
        }, 2000)
      } catch (error) {
        console.error('Restore error:', error)
        setStatus('error')
        setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    restoreImages()
  }, [workspaceId, router])

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
          <h1 className="text-lg font-semibold text-gray-900">Restore Images</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          {status === 'loading' && (
            <div className="text-center">
              <Loader className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-600" />
              <p className="text-gray-600 text-sm">{message}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-600" />
              <p className="text-gray-900 font-semibold mb-2">{message}</p>
              <p className="text-gray-600 text-sm">
                Redirecting to image generator in 2 seconds...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-600" />
              <p className="text-gray-900 font-semibold mb-2">Restore Failed</p>
              <p className="text-gray-600 text-sm mb-6">{message}</p>
              <button
                onClick={() => router.push('/dashboard/ai-studio/create-image')}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Go Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
