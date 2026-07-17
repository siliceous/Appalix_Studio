'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ExternalLink, Loader2, CheckCircle2, FileText } from 'lucide-react'
import { selectGoogleForm } from './actions'

type DriveFile = {
  id:           string
  name:         string
  webViewLink?: string
  modifiedTime: string
}

interface Props {
  forms:       DriveFile[]
  workspaceId: string
  userId:      string
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function FormsPickerClient({ forms, workspaceId, userId }: Props) {
  const [query,      setQuery]      = useState('')
  const [selected,   setSelected]   = useState<string | null>(null)
  const [isPending,  startTransition] = useTransition()
  const [error,      setError]      = useState<string | null>(null)
  const router = useRouter()

  const filtered = query.trim()
    ? forms.filter(f => f.name.toLowerCase().includes(query.toLowerCase()))
    : forms

  function handleSelect(form: DriveFile) {
    if (isPending) return
    setSelected(form.id)
    setError(null)
    startTransition(async () => {
      const result = await selectGoogleForm({
        workspaceId,
        userId,
        formId:    form.id,
        formTitle: form.name,
      })
      if (result?.error) {
        setError(result.error)
        setSelected(null)
      } else {
        router.push('/integrations?gforms=connected')
      }
    })
  }

  if (forms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-[#232323] rounded-2xl border border-gray-100 dark:border-white/8">
        <FileText className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-4" />
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No Google Forms found</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs">
          Create a form in Google Forms first, then come back to connect it.
        </p>
        <a
          href="https://forms.google.com"
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#15A4AE] text-white hover:bg-[#0e8b94] transition-colors"
        >
          Open Google Forms
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    )
  }

  return (
    <div>
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search forms…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#232323] text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]"
        />
      </div>

      {error && (
        <p className="mb-4 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 text-xs rounded-xl">
          {error}
        </p>
      )}

      {/* Form list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No forms match your search.</p>
        ) : filtered.map(form => {
          const isSelecting = isPending && selected === form.id
          return (
            <div
              key={form.id}
              className="flex items-center gap-4 bg-white dark:bg-[#232323] rounded-xl border border-gray-100 dark:border-white/8 px-4 py-3.5 hover:border-[#15A4AE]/40 hover:shadow-sm transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-[#15A4AE]/10 flex items-center justify-center shrink-0">
                <img src="/integrations/google-forms.png" alt="" className="w-5 h-5 object-contain" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{form.name}</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                  Last modified {fmtDate(form.modifiedTime)}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {form.webViewLink && (
                  <a
                    href={form.webViewLink}
                    target="_blank"
                    rel="noreferrer"
                    title="Open in Google Forms"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors"
                    onClick={e => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                <button
                  onClick={() => handleSelect(form)}
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#15A4AE] hover:bg-[#0e8b94] text-white transition-colors disabled:opacity-60"
                >
                  {isSelecting
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Connecting…</>
                    : <><CheckCircle2 className="w-3.5 h-3.5" /> Connect</>
                  }
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-5 text-center text-xs text-gray-400 dark:text-gray-500">
        {filtered.length} form{filtered.length !== 1 ? 's' : ''} found
        {query && ` matching "${query}"`}
      </p>
    </div>
  )
}
