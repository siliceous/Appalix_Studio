'use client'

import React, { useState, useRef, useTransition } from 'react'
import Link       from 'next/link'
import Image      from 'next/image'
import { Header } from '@/components/layout/header'
import { cn }     from '@/lib/utils'
import {
  Upload, Palette, Globe, Eye, EyeOff, CheckCircle2, AlertCircle, X, ChevronLeft,
} from 'lucide-react'
import { type WorkspaceBranding, updateBranding, uploadBrandingLogo } from '@/app/actions/workspace-branding'

interface Props {
  initialBranding: WorkspaceBranding | null
  isAdmin:         boolean
}

const PRESET_COLORS = [
  '#61c2ad', '#3b82f6', '#8b5cf6', '#ec4899',
  '#f97316', '#22c55e', '#ef4444', '#14b8a6',
  '#6366f1', '#f59e0b', '#1e293b', '#64748b',
]

function ColorSwatch({ color, selected, onClick }: { color: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-7 h-7 rounded-full transition-transform hover:scale-110',
        selected && 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-[#2a2a2a]',
      )}
      style={{ backgroundColor: color }}
      title={color}
    />
  )
}

export function BrandingForm({ initialBranding, isAdmin }: Props) {
  const defaults = initialBranding ?? {
    workspace_id:    '',
    brand_name:      null,
    logo_url:        null,
    favicon_url:     null,
    primary_color:   '#61c2ad',
    hide_powered_by: false,
    welcome_message: null,
  }

  const [brandName,      setBrandName]      = useState(defaults.brand_name      ?? '')
  const [primaryColor,   setPrimaryColor]   = useState(defaults.primary_color   ?? '#61c2ad')
  const [hidePoweredBy,  setHidePoweredBy]  = useState(defaults.hide_powered_by ?? false)
  const [welcomeMessage, setWelcomeMessage] = useState(defaults.welcome_message ?? '')
  const [logoUrl,        setLogoUrl]        = useState(defaults.logo_url        ?? null)
  const [logoUploading,  setLogoUploading]  = useState(false)
  const [saving,         startSave]         = useTransition()
  const [status,         setStatus]         = useState<'idle' | 'saved' | 'error'>('idle')
  const [errorMsg,       setErrorMsg]       = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const result = await uploadBrandingLogo(fd)
    setLogoUploading(false)
    if (result.ok && result.url) {
      setLogoUrl(result.url)
    } else {
      setErrorMsg(result.error ?? 'Upload failed')
    }
  }

  function handleSave() {
    setStatus('idle')
    setErrorMsg(null)
    startSave(async () => {
      const result = await updateBranding({
        brand_name:      brandName.trim() || null,
        primary_color:   primaryColor,
        hide_powered_by: hidePoweredBy,
        welcome_message: welcomeMessage.trim() || null,
        logo_url:        logoUrl,
      })
      if (result.ok) {
        setStatus('saved')
        setTimeout(() => setStatus('idle'), 3000)
      } else {
        setStatus('error')
        setErrorMsg(result.error ?? 'Save failed')
      }
    })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/settings" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
        <ChevronLeft className="w-3.5 h-3.5" />
        Back to Settings
      </Link>
      <Header
        title="Branding & White-label"
        description="Customise the dashboard with your own logo, name, and brand colour. Ideal for agencies and resellers."
      />

      {!isAdmin && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-xs text-amber-700 dark:text-amber-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Only workspace owners and admins can change branding settings.
        </div>
      )}

      {/* Logo */}
      <section className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-6">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Logo</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Replaces the Appalix logo in the sidebar. PNG or SVG, max 2 MB.
        </p>
        <div className="flex items-center gap-4">
          {/* Preview */}
          <div className="w-20 h-10 rounded-lg border dark:border-white/10 bg-gray-50 dark:bg-white/5 flex items-center justify-center overflow-hidden shrink-0">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt="Brand logo"
                width={80}
                height={40}
                className="object-contain w-full h-full p-1"
              />
            ) : (
              <span className="text-[10px] text-gray-400">No logo</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={!isAdmin || logoUploading}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Upload className="w-3.5 h-3.5" />
              {logoUploading ? 'Uploading…' : 'Upload logo'}
            </button>
            {logoUrl && (
              <button
                type="button"
                onClick={() => setLogoUrl(null)}
                disabled={!isAdmin}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                title="Remove logo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoUpload}
          />
        </div>
      </section>

      {/* Brand name */}
      <section className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-6">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Brand name</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Shown next to the logo. Leave blank to keep "Appalix".
        </p>
        <input
          type="text"
          value={brandName}
          onChange={e => setBrandName(e.target.value)}
          disabled={!isAdmin}
          placeholder="Your agency or client name"
          maxLength={60}
          className="w-full text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
        />
      </section>

      {/* Primary color */}
      <section className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-6">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
          <Palette className="w-4 h-4 text-gray-400" />
          Primary colour
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Used for active nav items, buttons, and accent elements.
        </p>
        <div className="flex items-center gap-3 flex-wrap mb-3">
          {PRESET_COLORS.map(c => (
            <ColorSwatch
              key={c}
              color={c}
              selected={primaryColor.toLowerCase() === c.toLowerCase()}
              onClick={() => isAdmin && setPrimaryColor(c)}
            />
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-2 border-gray-200 dark:border-white/20 shrink-0"
            style={{ backgroundColor: primaryColor }}
          />
          <input
            type="text"
            value={primaryColor}
            onChange={e => {
              const v = e.target.value
              if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setPrimaryColor(v)
            }}
            disabled={!isAdmin}
            maxLength={7}
            placeholder="#61c2ad"
            className="w-28 text-sm font-mono rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
          />
        </div>
      </section>

      {/* Powered-by toggle */}
      <section className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
              {hidePoweredBy ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
              Hide "Powered by Appalix"
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Remove the Appalix brand mark from the sidebar for a fully white-labelled experience.
            </p>
          </div>
          <button
            type="button"
            onClick={() => isAdmin && setHidePoweredBy(v => !v)}
            disabled={!isAdmin}
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed',
              hidePoweredBy ? 'bg-brand-600 dark:bg-[#61c2ad]' : 'bg-gray-200 dark:bg-white/10',
            )}
          >
            <span className={cn(
              'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
              hidePoweredBy ? 'translate-x-6' : 'translate-x-1',
            )} />
          </button>
        </div>
      </section>

      {/* Welcome message */}
      <section className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-6">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Welcome message</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Overrides the "Good morning / afternoon" greeting on the Sage dashboard.
        </p>
        <input
          type="text"
          value={welcomeMessage}
          onChange={e => setWelcomeMessage(e.target.value)}
          disabled={!isAdmin}
          placeholder="e.g. Welcome to Acme CRM"
          maxLength={120}
          className="w-full text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
        />
      </section>

      {/* Custom domain (info only) */}
      <section className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-6">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
          <Globe className="w-4 h-4 text-gray-400" />
          Custom domain
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Serve the dashboard at your own domain (e.g. <span className="font-mono">app.yourcompany.com</span>).
          Contact support to enable custom domain routing for your plan.
        </p>
        <a
          href="mailto:support@appalix.com?subject=Custom domain setup"
          className="inline-flex items-center gap-2 text-xs text-brand-600 dark:text-[#61c2ad] hover:underline"
        >
          Contact support to set up →
        </a>
      </section>

      {/* Save */}
      {isAdmin && (
        <div className="flex items-center justify-between gap-4 pb-8">
          {status === 'saved' && (
            <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
              <CheckCircle2 className="w-4 h-4" /> Branding saved
            </div>
          )}
          {status === 'error' && (
            <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4" /> {errorMsg ?? 'Save failed'}
            </div>
          )}
          {status === 'idle' && <div />}

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save branding'}
          </button>
        </div>
      )}
    </div>
  )
}
