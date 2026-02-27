import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { updateSource } from '@/app/actions/source'
import type { Metadata } from 'next'
import type { Source } from '@/lib/types'

export const metadata: Metadata = { title: 'Edit source' }

const TYPE_LABEL: Record<string, string> = {
  url:          'Website URL',
  sitemap:      'Sitemap URL',
  text:         'Plain text',
  file:         'File',
  notion:       'Notion',
  gitbook:      'GitBook',
  google_drive: 'Google Drive',
  dropbox:      'Dropbox',
  onedrive:     'OneDrive',
  sharepoint:   'SharePoint',
}

export default async function EditSourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: raw } = await supabase.from('sources').select('*').eq('id', id).single()
  const source = raw as Source | null
  if (!source) notFound()

  const action = updateSource.bind(null, id)
  const meta   = (source.metadata ?? {}) as Record<string, string>
  const typeLabel = TYPE_LABEL[source.type] ?? source.type

  return (
    <div className="max-w-2xl">
      <Header
        title={`Edit source — ${source.name}`}
        description={`Fix the ${typeLabel} source configuration and re-index`}
      />

      <form action={action} className="space-y-5">

        {/* Name */}
        <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Source name</p>
          <input
            type="text"
            name="name"
            defaultValue={source.name}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-transparent dark:text-gray-100"
          />
        </div>

        {/* Error banner — shown only when failed */}
        {source.status === 'failed' && source.error_message && (
          <div className="flex items-start gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
            <span className="font-semibold shrink-0">Error:</span>
            <span>{source.error_message}</span>
          </div>
        )}

        {/* URL-based sources */}
        {(source.type === 'url' || source.type === 'sitemap') && (
          <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-5 space-y-3">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">URL</p>
            <input
              type="url"
              name="url"
              defaultValue={source.url ?? ''}
              placeholder="https://example.com/page"
              className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-transparent dark:text-gray-100"
            />
          </div>
        )}

        {/* Text */}
        {source.type === 'text' && (
          <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-5 space-y-3">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Text content</p>
            <textarea
              name="text"
              rows={10}
              defaultValue={meta.raw_text ?? ''}
              className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y font-mono dark:bg-transparent dark:text-gray-100"
            />
          </div>
        )}

        {/* File — read-only, resync only */}
        {source.type === 'file' && (
          <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-5 space-y-2">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">File</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {meta.original_name ?? source.file_path ?? 'Unknown file'}
            </p>
            <p className="text-xs text-gray-400">File content cannot be changed — saving will re-index the existing file.</p>
          </div>
        )}

        {/* Notion */}
        {source.type === 'notion' && (
          <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-5 space-y-4">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notion settings</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Page URL</label>
              <input type="url" name="url" defaultValue={source.url ?? ''} className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-transparent dark:text-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Integration token</label>
              <input type="password" name="notion_token" placeholder="Leave blank to keep existing token" className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-transparent dark:text-gray-100" />
            </div>
          </div>
        )}

        {/* GitBook */}
        {source.type === 'gitbook' && (
          <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-5 space-y-4">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">GitBook settings</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Space URL</label>
              <input type="url" name="url" defaultValue={source.url ?? ''} className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-transparent dark:text-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">API token</label>
              <input type="password" name="gitbook_token" placeholder="Leave blank to keep existing token" className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-transparent dark:text-gray-100" />
            </div>
          </div>
        )}

        {/* Google Drive */}
        {source.type === 'google_drive' && (
          <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-5 space-y-4">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Google Drive settings</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">File / folder URL</label>
              <input type="url" name="url" defaultValue={source.url ?? ''} className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-transparent dark:text-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Access token</label>
              <input type="password" name="google_access_token" placeholder="Leave blank to keep existing token" className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-transparent dark:text-gray-100" />
            </div>
          </div>
        )}

        {/* Dropbox */}
        {source.type === 'dropbox' && (
          <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-5 space-y-4">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Dropbox settings</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">File path</label>
              <input type="url" name="url" defaultValue={source.url ?? ''} placeholder="/path/to/file.pdf" className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-transparent dark:text-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Access token</label>
              <input type="password" name="dropbox_token" placeholder="Leave blank to keep existing token" className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-transparent dark:text-gray-100" />
            </div>
          </div>
        )}

        {/* OneDrive */}
        {source.type === 'onedrive' && (
          <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-5 space-y-4">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">OneDrive settings</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">File URL</label>
              <input type="url" name="url" defaultValue={source.url ?? ''} className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-transparent dark:text-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Access token</label>
              <input type="password" name="ms_access_token" placeholder="Leave blank to keep existing token" className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-transparent dark:text-gray-100" />
            </div>
          </div>
        )}

        {/* SharePoint */}
        {source.type === 'sharepoint' && (
          <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-5 space-y-4">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">SharePoint settings</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">File URL</label>
              <input type="url" name="url" defaultValue={source.url ?? ''} className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-transparent dark:text-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Access token</label>
              <input type="password" name="ms_access_token" placeholder="Leave blank to keep existing token" className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-transparent dark:text-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Site ID <span className="text-gray-400 font-normal">(optional)</span></label>
              <input type="text" name="sharepoint_site_id" defaultValue={meta.sharepoint_site_id ?? ''} className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-transparent dark:text-gray-100" />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Save &amp; re-index
          </button>
          <a href="/sources" className="px-5 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors">
            Cancel
          </a>
        </div>
      </form>
    </div>
  )
}
