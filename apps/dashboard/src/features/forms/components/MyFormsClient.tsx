'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Pencil, ExternalLink, Trash2, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { archiveForm, bulkArchiveDrafts } from '@/app/actions/forms'
import { FormRenderer } from '@/app/f/[slug]/form-renderer'
import type { Form, FormStatus, FormType } from '@/features/forms/types'

const STATUS_STYLES: Record<FormStatus, string> = {
  draft:     'bg-gray-100  dark:bg-white/8  text-gray-500  dark:text-gray-400',
  published: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  paused:    'bg-amber-100  dark:bg-amber-500/15  text-amber-700  dark:text-amber-300',
  archived:  'bg-red-100   dark:bg-red-500/15   text-red-600   dark:text-red-400',
}

const TYPE_COLOURS: Record<FormType, string> = {
  popup:        'bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300',
  embedded:     'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300',
  landing_page: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  flyout:       'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300',
}

/**
 * Force the form to render immediately (skip delay/exit-intent triggers) and
 * pin the targeting/scheduling so the preview always paints in this list.
 */
function previewifyForm(f: Form): Form {
  return {
    ...f,
    behaviour: {
      ...f.behaviour,
      display:    { ...(f.behaviour?.display ?? {}), trigger: 'immediate' },
      scheduling: { mode: 'always', startAt: null, endAt: null },
      targeting:  { ...(f.behaviour?.targeting ?? {}), devices: ['desktop', 'mobile', 'tablet'] },
      frequency:  { mode: 'always' },
    },
  }
}

interface Props { initialForms: Form[] }

export function MyFormsClient({ initialForms }: Props) {
  const router = useRouter()
  const [forms, setForms] = useState<Form[]>(initialForms)
  const [cleaning, setCleaning] = useState(false)

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone from the UI.`)) return
    const original = forms
    setForms(prev => prev.filter(f => f.id !== id))
    archiveForm(id).then(r => {
      if (r.error) { alert(`Couldn't delete: ${r.error}`); setForms(original) }
    })
  }

  async function handleCleanupDrafts() {
    const drafts = forms.filter(f => f.status === 'draft')
    if (drafts.length === 0) { alert('No draft forms to clean up.'); return }
    if (!confirm(`Delete all ${drafts.length} draft form${drafts.length === 1 ? '' : 's'}? Published and paused forms are kept.`)) return
    const original = forms
    setCleaning(true)
    setForms(prev => prev.filter(f => f.status !== 'draft'))
    const res = await bulkArchiveDrafts()
    setCleaning(false)
    if (res.error) { alert(`Cleanup failed: ${res.error}`); setForms(original) }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#f0f0f2] dark:bg-gray-950">

      {/* Top bar */}
      <div className="shrink-0 px-6 py-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
        <button
          onClick={() => router.push('/dashboard/forms/templates')}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-white/8 hover:bg-gray-200 dark:hover:bg-white/12 rounded-full transition-colors shrink-0"
        >
          <ArrowLeft className="w-3 h-3" />
          All templates
        </button>
        <div className="ml-1">
          <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            My Forms
            <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 align-middle">{forms.length}</span>
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Every form you've built — preview, edit, share or delete.</p>
        </div>
        {forms.some(f => f.status === 'draft') && (
          <button
            onClick={handleCleanupDrafts}
            disabled={cleaning}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors disabled:opacity-60"
          >
            {cleaning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Clean up drafts
          </button>
        )}
      </div>

      {/* Body */}
      {forms.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6 py-16">
          <p className="text-base font-medium text-gray-700 dark:text-gray-200">No forms yet</p>
          <p className="text-sm text-gray-400 max-w-xs">Pick a template to create your first form.</p>
          <button
            onClick={() => router.push('/dashboard/forms/templates')}
            className="mt-2 px-3 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors"
          >
            Browse templates
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden px-6 py-6 grid grid-cols-1 lg:grid-cols-2 gap-5 content-start">
          {forms.map(form => (
            <div
              key={form.id}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Card header — meta + actions */}
              <div className="flex items-start gap-3 px-5 py-3 border-b border-gray-100 dark:border-gray-700/60">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{form.name}</p>
                  <div className="flex items-center gap-1.5 flex-wrap mt-1">
                    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-md capitalize', STATUS_STYLES[form.status])}>
                      {form.status}
                    </span>
                    <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-md capitalize', TYPE_COLOURS[form.type])}>
                      {form.type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      Updated {new Date(form.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => router.push(`/dashboard/forms/${form.id}/edit`)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8 transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </button>
                  {form.status === 'published' && form.public_slug && (
                    <a
                      href={`/f/${form.public_slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Public link
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(form.id, form.name)}
                    title="Delete form"
                    className="flex items-center justify-center w-7 h-7 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Form-format preview — actual FormRenderer in pointer-events-none mode */}
              <div className="px-6 py-6 bg-[#f5f4f1] dark:bg-gray-950/40">
                <div className="pointer-events-none select-none">
                  <FormRenderer form={previewifyForm(form)} sourceUrl="" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
