'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function DebugImagesPage() {
  const router = useRouter()
  const [storageData, setStorageData] = useState<string>('')
  const [parsed, setParsed] = useState<any>(null)
  const [imageCount, setImageCount] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const data = localStorage.getItem('imageGenerationHistory')
      setStorageData(data || 'No data in localStorage')

      if (data) {
        const parsed = JSON.parse(data)
        setParsed(parsed)
        setImageCount(Array.isArray(parsed) ? parsed.length : 0)
      }
    } catch (error) {
      setStorageData(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [])

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
          <h1 className="text-lg font-semibold text-gray-900">Debug Images Storage</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Summary */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <h2 className="font-semibold text-gray-900 mb-2">Summary</h2>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-gray-600">Images in localStorage:</span>
              <span className="ml-2 font-semibold text-gray-900">{imageCount}</span>
            </p>
            <p>
              <span className="text-gray-600">Raw data size:</span>
              <span className="ml-2 font-semibold text-gray-900">
                {(storageData.length / 1024).toFixed(2)} KB
              </span>
            </p>
          </div>
        </div>

        {/* Parsed Data */}
        {parsed && Array.isArray(parsed) && (
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h2 className="font-semibold text-gray-900 mb-4">Images Details</h2>
            <div className="space-y-4">
              {parsed.map((img: any, idx: number) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-600 mb-2">Image {idx + 1}</p>
                  <div className="space-y-1 text-xs">
                    <p>
                      <span className="text-gray-600">ID:</span>
                      <span className="ml-2 font-mono text-gray-900">{img.id}</span>
                    </p>
                    <p>
                      <span className="text-gray-600">Prompt:</span>
                      <span className="ml-2 text-gray-900">{img.prompt?.substring(0, 50)}...</span>
                    </p>
                    <p>
                      <span className="text-gray-600">Has image:</span>
                      <span className="ml-2 text-gray-900">
                        {img.image ? `Yes (${(img.image.length / 1024).toFixed(2)} KB)` : 'No'}
                      </span>
                    </p>
                    <p>
                      <span className="text-gray-600">Aspect ratio:</span>
                      <span className="ml-2 text-gray-900">{img.aspectRatio || '1:1'}</span>
                    </p>
                    <p>
                      <span className="text-gray-600">Timestamp:</span>
                      <span className="ml-2 text-gray-900">
                        {new Date(img.timestamp).toLocaleString()}
                      </span>
                    </p>
                    <p>
                      <span className="text-gray-600">Deleted:</span>
                      <span className="ml-2 text-gray-900">{img.deletedAt ? 'Yes' : 'No'}</span>
                    </p>
                  </div>

                  {/* Try to display image */}
                  {img.image && (
                    <div className="mt-3">
                      <img
                        src={img.image}
                        alt="stored"
                        className="w-full max-h-32 object-cover rounded"
                        onError={() => console.error('Failed to load image:', img.id)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Raw Data */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <h2 className="font-semibold text-gray-900 mb-2">Raw Storage Data</h2>
          <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-96 text-gray-900">
            {storageData.substring(0, 2000)}
            {storageData.length > 2000 ? '\n... (truncated)' : ''}
          </pre>
        </div>
      </div>
    </div>
  )
}
