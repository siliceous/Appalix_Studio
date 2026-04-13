'use client'

import React, { useState, useRef } from 'react'
import { Upload, X, AlertCircle } from 'lucide-react'
import { AvatarCropModal } from '@/components/settings/avatar-crop-modal'
import { uploadBotAvatar } from '@/app/actions/bot'

interface Props {
  botId:           string
  defaultAvatarUrl: string
  botName:         string
}

export function BotAvatarUploader({ botId, defaultAvatarUrl, botName }: Props) {
  const [avatarUrl, setAvatarUrl] = useState(defaultAvatarUrl)
  const [cropSrc,   setCropSrc]   = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const initial = botName.charAt(0).toUpperCase() || 'B'

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    if (!file.type.startsWith('image/')) { setError('File must be an image'); return }
    setError(null)
    const reader = new FileReader()
    reader.onload = () => setCropSrc(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function handleCropConfirm(previewUrl: string, base64: string) {
    setCropSrc(null)
    setError(null)
    setUploading(true)
    setAvatarUrl(previewUrl)
    const result = await uploadBotAvatar(botId, base64)
    setUploading(false)
    if (!result.ok) {
      setAvatarUrl(defaultAvatarUrl)
      setError(result.error ?? 'Upload failed')
    } else if (result.url) {
      setAvatarUrl(result.url)
    }
  }

  return (
    <>
      {cropSrc && (
        <AvatarCropModal
          imageSrc={cropSrc}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropSrc(null)}
        />
      )}

      {/* Hidden input carries the URL into the server-action form */}
      <input type="hidden" name="widget_avatar_url" value={avatarUrl} />

      <div className="flex items-center gap-4">
        {/* Circular preview */}
        <div className="relative shrink-0">
          <div className="relative w-14 h-14 rounded-full overflow-hidden bg-[#15A4AE] flex items-center justify-center">
            <span className="text-white text-lg font-bold select-none">{initial}</span>
            {avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover z-10"
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
              />
            )}
          </div>
          {/* Upload badge — hidden once an image is set */}
          {!avatarUrl && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              title="Upload photo"
              className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-[#15A4AE] hover:bg-[#0e8f99] border-2 border-white dark:border-[#2a2a2a] flex items-center justify-center transition-colors disabled:opacity-50"
            >
              <Upload className="w-3 h-3 text-white" />
            </button>
          )}
          {/* Remove badge — top-right when image is set */}
          {avatarUrl && (
            <button
              type="button"
              onClick={() => setAvatarUrl('')}
              title="Remove avatar"
              className="absolute -top-0.5 -right-0.5 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 border-2 border-white dark:border-[#2a2a2a] flex items-center justify-center transition-colors"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          )}
          {/* Remove badge — bottom-right when image is set */}
          {avatarUrl && (
            <button
              type="button"
              onClick={() => setAvatarUrl('')}
              title="Remove avatar"
              className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 border-2 border-white dark:border-[#2a2a2a] flex items-center justify-center transition-colors"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Upload className="w-3.5 h-3.5" />
              {uploading ? 'Uploading…' : 'Upload image'}
            </button>
          </div>
          {error ? (
            <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
            </div>
          ) : (
            <p className="text-xs text-gray-400">
              {avatarUrl ? 'Circular photo shown in the widget header.' : 'Leave blank to use the bot\u2019s initial letter.'}
            </p>
          )}
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
    </>
  )
}
