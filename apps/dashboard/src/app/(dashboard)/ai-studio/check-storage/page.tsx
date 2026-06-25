'use client'

import { useEffect, useState } from 'react'

export default function CheckStoragePage() {
  const [status, setStatus] = useState('Loading...')
  const [count, setCount] = useState(0)
  const [size, setSize] = useState('0 KB')
  const [sample, setSample] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const data = localStorage.getItem('imageGenerationHistory')

      if (!data) {
        setStatus('❌ NO DATA in localStorage')
        setCount(0)
        return
      }

      const parsed = JSON.parse(data)
      const count = Array.isArray(parsed) ? parsed.length : 0
      const sizeKB = (data.length / 1024).toFixed(2)

      setStatus('✅ Data found in localStorage')
      setCount(count)
      setSize(`${sizeKB} KB`)

      // Show first 200 chars
      setSample(data.substring(0, 200))
    } catch (error) {
      setStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">localStorage Status</h1>

        {/* Status */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border-l-4 border-blue-500">
          <p className="text-lg font-semibold text-gray-900 mb-4">{status}</p>
          <div className="space-y-3 text-sm">
            <p className="text-gray-700">
              <span className="font-semibold text-gray-900">Images count:</span>
              <span className="ml-3 text-xl font-bold text-blue-600">{count}</span>
            </p>
            <p className="text-gray-700">
              <span className="font-semibold text-gray-900">Data size:</span>
              <span className="ml-3 font-mono text-gray-600">{size}</span>
            </p>
          </div>
        </div>

        {/* Sample */}
        {sample && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Data Sample</h2>
            <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-40 text-gray-800 font-mono">
              {sample}...
            </pre>
          </div>
        )}

        {/* Next Steps */}
        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">Next Steps:</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• If count = 0: Images aren't being saved to localStorage</li>
            <li>• If count > 0: Images are saved, but library page can't load them</li>
            <li>• Go to <a href="/dashboard/ai-studio/library" className="underline font-semibold">/library</a> to see if images appear</li>
            <li>• Go to <a href="/dashboard/ai-studio/create-image" className="underline font-semibold">/create-image</a> to generate more</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
