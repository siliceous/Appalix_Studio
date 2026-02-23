'use client'

import { useState, useRef } from 'react'
import { Header } from '@/components/layout/header'
import { createSource } from '@/app/actions/source'
import { Link2, FileText, AlignLeft, Upload, X } from 'lucide-react'

type SourceType = 'url' | 'text' | 'file'

const TYPES: { value: SourceType; label: string; desc: string; icon: React.ReactNode }[] = [
  { value: 'url',  label: 'Website URL', desc: 'Scrape and index any webpage',              icon: <Link2 className="w-4 h-4" /> },
  { value: 'text', label: 'Plain text',  desc: 'Paste FAQs, docs, or custom knowledge',     icon: <AlignLeft className="w-4 h-4" /> },
  { value: 'file', label: 'PDF / Image', desc: 'Upload a PDF or image file (up to 50 MB)', icon: <FileText className="w-4 h-4" /> },
]

export default function NewSourcePage() {
  const [type, setType]         = useState<SourceType>('url')
  const [fileName, setFileName] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setFileName(e.target.files?.[0]?.name ?? null)
  }

  function clearFile() {
    setFileName(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="max-w-2xl">
      <Header
        title="Add source"
        description="Train your bot with a website, document, or custom text"
      />

      <form action={createSource} className="space-y-6">
        {/* Hidden type — kept in sync with state */}
        <input type="hidden" name="type" value={type} />

        {/* Type selector */}
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm font-semibold text-gray-900 mb-3">Source type</p>
          <div className="grid grid-cols-3 gap-3">
            {TYPES.map(({ value, label, desc, icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => { setType(value); clearFile() }}
                className={`flex flex-col items-start gap-2 p-3 rounded-lg border text-left transition-colors ${
                  type === value
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span className={type === value ? 'text-brand-600' : 'text-gray-400'}>{icon}</span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Fields */}
        <div className="bg-white rounded-xl border p-5 space-y-4">
          {/* Common: name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Source name</label>
            <input
              type="text"
              name="name"
              required
              placeholder="e.g. Appalix homepage, Product FAQ, Pricing guide"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* URL */}
          {type === 'url' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Page URL</label>
              <input
                type="url"
                name="url"
                required
                placeholder="https://yoursite.com/about"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          )}

          {/* Text */}
          {type === 'text' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Content</label>
              <textarea
                name="text"
                required
                rows={10}
                placeholder="Paste your FAQs, product documentation, pricing info, or any knowledge you want the bot to use..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
              />
            </div>
          )}

          {/* File upload */}
          {type === 'file' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">File</label>
              {fileName ? (
                <div className="flex items-center gap-3 px-3 py-2.5 border border-brand-300 bg-brand-50 rounded-lg">
                  <FileText className="w-4 h-4 text-brand-600 shrink-0" />
                  <span className="text-sm text-gray-800 truncate flex-1">{fileName}</span>
                  <button type="button" onClick={clearFile} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-colors">
                  <Upload className="w-6 h-6 text-gray-400" />
                  <span className="text-sm text-gray-600">Click to upload a PDF or image</span>
                  <span className="text-xs text-gray-400">PDF, JPG, PNG, WebP — up to 50 MB</span>
                  <input
                    ref={fileRef}
                    type="file"
                    name="file"
                    accept=".pdf,image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleFile}
                    className="sr-only"
                  />
                </label>
              )}
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
          After adding, your source is processed and indexed automatically.
          Once <strong>Ready</strong>, bots with RAG enabled will use it to answer questions.
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Add &amp; index source
          </button>
          <a href="/sources" className="px-5 py-2.5 text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Cancel
          </a>
        </div>
      </form>
    </div>
  )
}
