'use client'

import { useState } from 'react'
import { Copy, Check, Eye, EyeOff } from 'lucide-react'

interface CopyFieldProps {
  value: string
  secret?: boolean
  multiline?: boolean
}

export function CopyField({ value, secret = false, multiline = false }: CopyFieldProps) {
  const [copied, setCopied] = useState(false)
  const [revealed, setRevealed] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const displayValue = secret && !revealed ? '•'.repeat(Math.min(value.length, 32)) : value

  return (
    <div className={`flex gap-2 ${multiline ? 'items-start' : 'items-center'}`}>
      {multiline ? (
        <pre className="flex-1 px-3 py-2.5 bg-gray-50 dark:bg-[#1c1c1c] border border-gray-200 dark:border-white/10 rounded-lg text-xs text-gray-800 dark:text-gray-200 font-mono overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
          {displayValue}
        </pre>
      ) : (
        <input
          type={secret && !revealed ? 'password' : 'text'}
          readOnly
          value={displayValue}
          className="flex-1 px-3 py-2 bg-gray-50 dark:bg-[#1c1c1c] border border-gray-200 dark:border-white/10 rounded-lg text-sm font-mono text-gray-800 dark:text-gray-200 focus:outline-none"
        />
      )}
      <div className="flex items-center gap-1 shrink-0">
        {secret && (
          <button
            onClick={() => setRevealed((r) => !r)}
            className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            title={revealed ? 'Hide' : 'Reveal'}
          >
            {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
        <button
          onClick={handleCopy}
          className="p-2 text-gray-400 hover:text-brand-600 rounded-lg hover:bg-brand-50 dark:hover:bg-[#15A4AE]/10 dark:hover:text-[#15A4AE] transition-colors"
          title="Copy"
        >
          {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}
