'use client'

import React, { useState, useRef, useTransition } from 'react'
import { Upload, AlertCircle, CheckCircle2 } from 'lucide-react'
import { saveUserName, uploadUserAvatar, removeUserAvatar } from '@/app/actions/user-profile'
import { AvatarCropModal } from '@/components/settings/avatar-crop-modal'

interface Props {
  firstName:  string
  lastName:   string
  email:      string
  avatarUrl:  string | null
}

export function ProfileForm({ firstName, lastName, email, avatarUrl: initialAvatarUrl }: Props) {
  const [avatarUrl,    setAvatarUrl]    = useState(initialAvatarUrl)
  const [cropSrc,      setCropSrc]      = useState<string | null>(null)
  const [uploading,    setUploading]    = useState(false)
  const [removing,     setRemoving]     = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [saved,        setSaved]        = useState(false)
  const [, startSave]                   = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  const initials = [firstName, lastName]
    .filter(Boolean)
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || email[0]?.toUpperCase() || '?'

  // Step 1: file selected → read as data URL → open crop modal
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (!file.type.startsWith('image/')) {
      setError('File must be an image')
      return
    }

    const reader = new FileReader()
    reader.onload = () => setCropSrc(reader.result as string)
    reader.readAsDataURL(file)
  }

  // Step 2: crop confirmed → show preview instantly, upload in background
  async function handleCropConfirm(blob: Blob) {
    setCropSrc(null)
    setError(null)
    setUploading(true)

    // Show cropped image immediately via object URL while uploading
    const previewUrl = URL.createObjectURL(blob)
    setAvatarUrl(previewUrl)

    const fd = new FormData()
    fd.append('file', blob, 'avatar.jpg')
    const result = await uploadUserAvatar(fd)

    URL.revokeObjectURL(previewUrl)
    setUploading(false)

    if (result.ok && result.url) {
      setAvatarUrl(result.url)
    } else {
      setAvatarUrl(initialAvatarUrl) // revert on error
      setError(result.error ?? 'Upload failed')
    }
  }

  async function handleRemove() {
    setError(null)
    setRemoving(true)
    const result = await removeUserAvatar()
    setRemoving(false)
    if (result.ok) setAvatarUrl(null)
    else setError(result.error ?? 'Failed to remove')
  }

  function handleSave(formData: FormData) {
    setSaved(false)
    setError(null)
    startSave(async () => {
      await saveUserName(formData)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  return (
    <>
      {/* Crop modal — shown after file selection, before upload */}
      {cropSrc && (
        <AvatarCropModal
          imageSrc={cropSrc}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropSrc(null)}
        />
      )}

      <section className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10">
        {/* Avatar row */}
        <div className="px-6 pt-6 pb-5 border-b dark:border-white/8 flex items-center gap-5">
          {/* Avatar circle */}
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-[#15A4AE] flex items-center justify-center">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-lg font-bold uppercase select-none">{initials}</span>
              )}
            </div>
            {/* Upload button overlaid bottom-right */}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              title="Upload photo"
              className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-[#15A4AE] hover:bg-[#0e8f99] border-2 border-white dark:border-[#2a2a2a] flex items-center justify-center transition-colors disabled:opacity-50"
            >
              <Upload className="w-3 h-3 text-white" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {[firstName, lastName].filter(Boolean).join(' ') || email}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{email}</p>
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="text-xs text-brand-600 dark:text-[#15A4AE] hover:underline disabled:opacity-50"
              >
                {uploading ? 'Uploading…' : 'Upload photo'}
              </button>
              {avatarUrl && (
                <>
                  <span className="text-gray-300 dark:text-white/20">·</span>
                  <button
                    type="button"
                    onClick={handleRemove}
                    disabled={removing}
                    className="text-xs text-red-500 hover:underline disabled:opacity-50"
                  >
                    {removing ? 'Removing…' : 'Remove'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Name + email fields */}
        <form action={handleSave} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              First name
            </label>
            <input
              name="first_name"
              type="text"
              defaultValue={firstName}
              required
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-[#1c1c1c] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#15A4AE]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Last name
            </label>
            <input
              name="last_name"
              type="text"
              defaultValue={lastName}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-[#1c1c1c] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#15A4AE]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-gray-500 cursor-not-allowed"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
            </div>
          )}
          {saved && (
            <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Changes saved
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Save changes
            </button>
          </div>
        </form>
      </section>
    </>
  )
}
