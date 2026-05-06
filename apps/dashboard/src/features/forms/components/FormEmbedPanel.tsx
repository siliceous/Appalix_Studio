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
    <div className="relative rounded-lg bg-gray-900 dark:bg-black/40 border border-gray-700 dark:border-white/10 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 dark:border-white/10">
        <span className="text-[10px] font-mono text-gray-500">HTML</span>
        <CopyButton text={code} />
      </div>
      <pre className="px-3 py-3 text-[11px] font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
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

  const iframeCode = formUrl
    ? `<iframe\n  src="${formUrl}"\n  width="100%"\n  height="600"\n  style="border:none;border-radius:12px;"\n  loading="lazy"\n></iframe>`
    : ''

  const scriptCode = form.embed_key
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

      {/* Iframe embed */}
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Inline embed</p>
        <p className="text-[11px] text-gray-400 mb-2 leading-relaxed">
          Paste this into any webpage to embed the form directly.
        </p>
        <CodeBlock code={iframeCode} />
      </div>

      {/* Popup / script embed */}
      {form.embed_key && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Popup trigger</p>
          <p className="text-[11px] text-gray-400 mb-2 leading-relaxed">
            Add to your site's <code className="text-brand-400">&lt;head&gt;</code> to show the form as a popup.
          </p>
          <CodeBlock code={scriptCode} />
        </div>
      )}

    </div>
  )
}
