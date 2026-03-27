'use client'

import { useState } from 'react'

interface Props {
  email?: string
  label?: string
  className?: string
}

export function ContactSalesButton({
  email = 'sales@appalix.ai',
  label = 'Contact Enterprise sales',
  className,
}: Props) {
  const [copied, setCopied] = useState(false)

  const handleClick = () => {
    navigator.clipboard.writeText(email).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <button
      onClick={handleClick}
      className={className ?? 'inline-flex items-center gap-2 px-6 py-3 border border-white/20 hover:border-white/40 text-white/80 hover:text-white font-medium rounded-xl transition-colors text-sm'}
    >
      {copied ? (
        <>
          <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-400">Email copied!</span>
        </>
      ) : (
        label
      )}
    </button>
  )
}
