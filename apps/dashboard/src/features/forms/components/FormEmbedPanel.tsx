'use client'

import { useState } from 'react'
import { Check, Copy, ExternalLink } from 'lucide-react'
import type { Form } from '@/features/forms/types'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="shrink-0 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8 transition-colors"
      title="Copy"
    >
      {copied
        ? <Check  className="w-3.5 h-3.5 text-emerald-500" />
        : <Copy   className="w-3.5 h-3.5 text-gray-400" />
      }
    </button>
  )
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative rounded-lg bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.02]">
        <span className="text-[10px] font-mono font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">HTML</span>
        <CopyButton text={code} />
      </div>
      <pre className="px-3 py-3 text-[11px] font-mono text-gray-800 dark:text-gray-200 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
        {code}
      </pre>
    </div>
  )
}

interface Props { form: Form }

export function FormEmbedPanel({ form }: Props) {
  const isPublished = form.status === 'published' && form.public_slug

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://app.appalix.ai'
  const formUrl = form.public_slug ? `${origin}/f/${form.public_slug}` : null

  const universalCode = form.embed_key
    ? `<script\n  src="${origin}/embed.js"\n  data-form-key="${form.embed_key}"\n  async\n></script>`
    : ''

  if (!isPublished) {
    return (
      <div className="px-4 py-8 flex flex-col items-center text-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/8 flex items-center justify-center">
          <ExternalLink className="w-4 h-4 text-gray-400" />
        </div>
        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Publish to get embed code</p>
        <p className="text-[11px] text-gray-400 leading-relaxed">
          Enable the form first — the embed snippet and shareable link will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="px-4 py-4 space-y-5">

      {/* Direct link */}
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Shareable link</p>
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-white/[0.03] overflow-hidden">
          <p className="flex-1 px-2.5 py-1.5 text-[11px] font-mono text-gray-600 dark:text-gray-300 truncate">
            {formUrl}
          </p>
          <CopyButton text={formUrl!} />
          <a
            href={formUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 p-1.5 mr-0.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8 transition-colors"
            title="Open"
          >
            <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
          </a>
        </div>
      </div>

      {/* Embed key — for plugins/snippets that ask for just the key */}
      {form.embed_key && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Embed key</p>
          <p className="text-[11px] text-gray-400 mb-2 leading-relaxed">
            Paste this into the WordPress plugin settings or Shopify snippet.
          </p>
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-white/[0.03] overflow-hidden">
            <p className="flex-1 px-2.5 py-1.5 text-[11px] font-mono text-gray-700 dark:text-gray-200 truncate">
              {form.embed_key}
            </p>
            <CopyButton text={form.embed_key} />
          </div>
        </div>
      )}

      {/* Universal embed — one snippet handles inline / popup / flyout based on form type */}
      {form.embed_key && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Embed snippet</p>
          <p className="text-[11px] text-gray-400 mb-2 leading-relaxed">
            One tag for everything — paste into your site. Inline forms render where the script is placed; popups & fly-outs use the trigger you set under Behaviour.
          </p>
          <CodeBlock code={universalCode} />
        </div>
      )}

      {/* Platform plugins */}
      {form.embed_key && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Easier install</p>
          <p className="text-[11px] text-gray-400 mb-2 leading-relaxed">
            Many CMSs strip <code className="text-gray-500">&lt;script&gt;</code> from regular HTML blocks. Use the right widget below.
          </p>
          <div className="space-y-1.5">
            <a
              href={`${origin}/integrations/appalix-forms-wordpress.zip`}
              download
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.04] hover:border-brand-300 dark:hover:border-brand-500/40 hover:bg-white dark:hover:bg-white/[0.06] transition-colors group"
            >
              <div className="flex flex-col">
                <span className="text-[12px] font-semibold text-gray-700 dark:text-gray-200">WordPress plugin</span>
                <span className="text-[10px] text-gray-400">Download ZIP · upload via Plugins → Add New</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-brand-500" />
            </a>
            <a
              href="https://github.com/siliceous/appalix/blob/main/integrations/shopify/INSTALL.md"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.04] hover:border-brand-300 dark:hover:border-brand-500/40 hover:bg-white dark:hover:bg-white/[0.06] transition-colors group"
            >
              <div className="flex flex-col">
                <span className="text-[12px] font-semibold text-gray-700 dark:text-gray-200">Shopify install guide</span>
                <span className="text-[10px] text-gray-400">5-minute theme.liquid snippet</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-brand-500" />
            </a>
          </div>
        </div>
      )}

    </div>
  )
}
