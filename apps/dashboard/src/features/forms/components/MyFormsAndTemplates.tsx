'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Pencil, ExternalLink, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { archiveForm, bulkArchiveDrafts } from '@/app/actions/forms'
import type { Form, FormTemplate, FormStatus, FormType } from '@/features/forms/types'
import { FormsTemplateGallery } from './FormsTemplateGallery'

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

interface Props {
  templates: FormTemplate[]
  forms:     Form[]
}

export function MyFormsAndTemplates({ templates, forms: initialForms }: Props) {
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
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* My Forms — only shown when there are saved forms */}
      {forms.length > 0 && (
        <div className="shrink-0 px-6 py-5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              My Forms
              <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300">{forms.length}</span>
            </h2>
            {forms.some(f => f.status === 'draft') && (
              <button
                onClick={handleCleanupDrafts}
                disabled={cleaning}
                className="ml-auto flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors disabled:opacity-60"
              >
                {cleaning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                Clean up drafts
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {forms.map(form => (
              <div key={form.id}
                className="flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden hover:border-brand-300 dark:hover:border-brand-600 hover:shadow-sm transition-all"
              >
                <div className="h-1.5 w-full shrink-0" style={{ background: form.theme?.colors?.primary ?? '#6366f1' }} />
                <div className="flex flex-col gap-1.5 p-3 flex-1">
                  <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 leading-snug line-clamp-2">{form.name}</p>
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded-md capitalize', STATUS_STYLES[form.status])}>
                      {form.status}
                    </span>
                    <span className={cn('text-[9px] font-medium px-1.5 py-0.5 rounded-md capitalize', TYPE_COLOURS[form.type])}>
                      {form.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-1 px-2 py-1.5 border-t border-gray-100 dark:border-gray-700/60">
                  <button
                    onClick={() => router.push(`/dashboard/forms/${form.id}/edit`)}
                    className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-white/8 transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </button>
                  {form.status === 'published' && form.public_slug && (
                    <a href={`/f/${form.public_slug}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-gray-500 dark:text-gray-400 rounded-md hover:bg-gray-100 dark:hover:bg-white/8 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Preview
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(form.id, form.name)}
                    title="Delete form"
                    className="ml-auto flex items-center justify-center w-6 h-6 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Templates gallery fills the remaining space */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <FormsTemplateGallery templates={templates} />
      </div>
    </div>
  )
}
