'use client'

import { Upload, Zap, RefreshCw, Download } from 'lucide-react'
import { AIModel, CreditUsage } from '@/lib/types/ai-studio'

// Tool Card - For dashboard
export function ToolCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group p-6 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 hover:border-gray-300 dark:hover:border-white/20 transition-all text-left"
    >
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-black dark:group-hover:text-white">
        {title}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
    </button>
  )
}

// Project Card
export function ProjectCard({
  name,
  type,
  thumbnail,
  createdAt,
  onClick,
}: {
  name: string
  type: string
  thumbnail: string
  createdAt: Date
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group text-left rounded-lg overflow-hidden border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 transition-all"
    >
      <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-gray-100 to-gray-50 dark:from-white/5 dark:to-white/10">
        <img src={thumbnail} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          </div>
        </div>
      </div>
      <div className="p-3">
        <h4 className="font-medium text-gray-900 dark:text-white truncate">{name}</h4>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded capitalize">
            {type}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {createdAt.toLocaleDateString()}
          </span>
        </div>
      </div>
    </button>
  )
}

// Model Card
export function ModelCard({
  name,
  description,
  icon,
  creditsPerGeneration,
  featured,
  onClick,
}: {
  name: string
  description: string
  icon: string
  creditsPerGeneration: number
  featured: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 text-left transition-all"
    >
      {featured && (
        <span className="inline-block px-2 py-1 text-xs font-semibold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded mb-2">
          Featured
        </span>
      )}
      <div className="text-2xl mb-2">{icon}</div>
      <h4 className="font-semibold text-gray-900 dark:text-white">{name}</h4>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
      <div className="flex items-center gap-1 mt-3 text-sm text-gray-600 dark:text-gray-400">
        <Zap className="w-4 h-4" />
        {creditsPerGeneration} credits
      </div>
    </button>
  )
}

// Upload Box
export function UploadBox({
  onFileSelect,
  accept = 'image/*',
  label = 'Upload image',
}: {
  onFileSelect: (file: File) => void
  accept?: string
  label?: string
}) {
  return (
    <label className="block border-2 border-dashed border-gray-300 dark:border-white/20 rounded-lg p-8 cursor-pointer hover:border-gray-400 dark:hover:border-white/30 transition-colors">
      <input
        type="file"
        accept={accept}
        onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])}
        className="hidden"
      />
      <div className="text-center">
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="font-medium text-gray-900 dark:text-white">{label}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">or drag and drop</p>
      </div>
    </label>
  )
}

// Generation Panel - Status display
export function GenerationPanel({
  status,
  estimatedTime,
  creditsUsed,
}: {
  status: 'queued' | 'processing' | 'completed' | 'failed'
  estimatedTime?: string
  creditsUsed?: number
}) {
  return (
    <div className="p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {status === 'processing' && <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />}
          <span className="font-medium text-gray-900 dark:text-white capitalize">{status}</span>
        </div>
        {estimatedTime && <span className="text-sm text-gray-500 dark:text-gray-400">{estimatedTime}</span>}
      </div>
      {creditsUsed && (
        <div className="flex items-center gap-1 mt-2 text-sm text-gray-600 dark:text-gray-400">
          <Zap className="w-4 h-4" />
          {creditsUsed} credits used
        </div>
      )}
    </div>
  )
}

// Result Gallery
export function ResultGallery({
  items,
  onDownload,
  onRegenerate,
}: {
  items: Array<{ id: string; url: string; status: string }>
  onDownload: (id: string) => void
  onRegenerate: (id: string) => void
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => (
        <div
          key={item.id}
          className="group rounded-lg overflow-hidden border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 transition-all"
        >
          <div className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-50 dark:from-white/5 dark:to-white/10">
            <img src={item.url} alt={item.id} className="w-full h-full object-cover" />
            {item.status !== 'completed' && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-white animate-spin" />
              </div>
            )}
            {item.status === 'completed' && (
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <button
                  onClick={() => onDownload(item.id)}
                  className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
                >
                  <Download className="w-5 h-5 text-gray-900" />
                </button>
                <button
                  onClick={() => onRegenerate(item.id)}
                  className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
                >
                  <RefreshCw className="w-5 h-5 text-gray-900" />
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// Video Preview Card
export function VideoPreviewCard({
  videoUrl,
  title,
  duration,
  onDownload,
  onSave,
}: {
  videoUrl: string
  title: string
  duration: string
  onDownload: () => void
  onSave: () => void
}) {
  return (
    <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-white/10">
      <div className="relative aspect-video bg-black">
        <video src={videoUrl} className="w-full h-full" controls />
        <div className="absolute top-4 right-4 bg-black/60 px-3 py-1 rounded text-sm font-medium text-white">
          {duration}
        </div>
      </div>
      <div className="p-4 bg-white dark:bg-white/5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{title}</h3>
        <div className="flex gap-2">
          <button
            onClick={onDownload}
            className="flex-1 py-2 px-4 bg-black dark:bg-white text-white dark:text-black rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
          <button
            onClick={onSave}
            className="flex-1 py-2 px-4 border border-gray-300 dark:border-white/20 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            Save to Project
          </button>
        </div>
      </div>
    </div>
  )
}

// Credit Usage Card
export function CreditUsageCard({ usage }: { usage: CreditUsage }) {
  const percentage = (usage.usedCredits / usage.totalCredits) * 100

  return (
    <div className="p-6 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Credits</h3>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600 dark:text-gray-400">Used</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {usage.usedCredits} / {usage.totalCredits}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-full transition-all"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        <div className="text-sm">
          <span className="text-gray-600 dark:text-gray-400">Remaining: </span>
          <span className="font-semibold text-gray-900 dark:text-white">{usage.remainingCredits}</span>
        </div>

        <div className="pt-4 border-t border-gray-200 dark:border-white/10 text-xs text-gray-500 dark:text-gray-400">
          Refresh on {usage.refreshDate.toLocaleDateString()}
        </div>
      </div>
    </div>
  )
}
