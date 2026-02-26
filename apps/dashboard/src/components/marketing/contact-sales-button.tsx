'use client'

import { useState } from 'react'

interface Props {
  email?: string
  subject?: string
  body?: string
  label?: string
  className?: string
}

export function ContactSalesButton({
  email = 'sales@appalix.ai',
  subject = 'Enterprise Plan Enquiry',
  body = 'Hi,\n\nI\'m interested in the Enterprise plan for Appalix. Please get in touch to discuss our requirements.\n\nThanks',
  label = 'Contact Enterprise sales',
  className,
}: Props) {
  const [copied, setCopied] = useState(false)

  const mailto = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

  const handleCopy = () => {
    navigator.clipboard.writeText(email).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <a
        href={mailto}
        className={className ?? 'inline-flex items-center gap-2 px-6 py-3 border border-white/20 hover:border-white/40 text-gray-300 hover:text-white font-medium rounded-xl transition-colors text-sm'}
      >
        {label}
      </a>

      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span>or copy:</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 hover:text-gray-300 transition-colors font-mono"
        >
          {copied ? (
            <>
              <svg className="w-3 h-3 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {email}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
