import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { deleteSource, resyncSource } from '@/app/actions/source'
import { formatDateTime } from '@/lib/utils'
import { BookOpen, Plus, RefreshCw, Trash2, Pencil, CheckCircle2, Clock, AlertCircle, Loader2, Link, FileText, AlignLeft, Cloud, HardDrive } from 'lucide-react'
import { SourcesPoller } from './sources-poller'
import { IconSubmitButton } from '@/components/ui/submit-button'
import type { Metadata } from 'next'
import type { Source } from '@/lib/types'
import { SageToolbar } from '@/components/dashboard/sage-toolbar'

export const metadata: Metadata = { title: 'Knowledge Base' }

const TYPE_ICON: Record<string, React.ReactNode> = {
  url:          <Link className="w-4 h-4 text-brand-600" />,
  sitemap:      <Link className="w-4 h-4 text-brand-600" />,
  text:         <AlignLeft className="w-4 h-4 text-brand-600" />,
  file:         <FileText className="w-4 h-4 text-brand-600" />,
  excel:        <FileText className="w-4 h-4 text-green-600" />,
  csv:          <FileText className="w-4 h-4 text-blue-500" />,
  notion:       <BookOpen className="w-4 h-4 text-brand-600" />,
  gitbook:      <BookOpen className="w-4 h-4 text-brand-600" />,
  google_drive: <Cloud className="w-4 h-4 text-brand-600" />,
  dropbox:      <Cloud className="w-4 h-4 text-brand-600" />,
  onedrive:     <HardDrive className="w-4 h-4 text-brand-600" />,
  sharepoint:   <HardDrive className="w-4 h-4 text-brand-600" />,
}

const STATUS_META: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  pending:    { label: 'Pending',    className: 'bg-gray-100 text-gray-600',   icon: <Clock className="w-3 h-3" /> },
  processing: { label: 'Processing', className: 'bg-blue-100 text-blue-700',   icon: <Loader2 className="w-3 h-3 animate-spin" /> },
  ready:      { label: 'Ready',      className: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="w-3 h-3" /> },
  failed:     { label: 'Failed',     className: 'bg-red-100 text-red-700',     icon: <AlertCircle className="w-3 h-3" /> },
  outdated:   { label: 'Outdated',   className: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-3 h-3" /> },
}

export default async function SourcesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user.id).order('created_at', { ascending: true }).limit(1).single()
  const membership = membershipRaw as { workspace_id: string } | null
  if (!membership) redirect('/login')

  const { data: rawSources } = await supabase
    .from('sources')
    .select('*')
    .eq('workspace_id', membership.workspace_id)
    .order('created_at', { ascending: false })
  const sources = (rawSources ?? []) as Source[]
  const hasActiveJobs = sources.some((s) => s.status === 'pending' || s.status === 'processing')

  return (
    <div className="-m-8 flex flex-col flex-1">
      <SageToolbar pageKey="sources" />
      <div className="p-8 flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
      {hasActiveJobs && <SourcesPoller />}
      <Header
        title="Knowledge Base"
        description="Add website URLs or text to train your bots with custom knowledge"
        action={
          <a
            href="/sources/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add source
          </a>
        }
      />

      {sources.length === 0 ? (
        <div className="bg-white rounded-xl border flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="w-10 h-10 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-700 mb-1">No sources yet</p>
          <p className="text-xs text-gray-400 mb-5">Add a website URL or text to give your bot custom knowledge.</p>
          <a href="/sources/new" className="px-4 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 transition-colors">
            Add your first source
          </a>
        </div>
      ) : (
        <div className="bg-white rounded-xl border divide-y">
          {sources.map((source) => {
            const status = STATUS_META[source.status] ?? STATUS_META.pending
            return (
              <div key={source.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors">
                {/* Icon */}
                <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                  {TYPE_ICON[source.type] ?? <Link className="w-4 h-4 text-brand-600" />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{source.name}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {source.type === 'text'
                      ? ((source.metadata as Record<string, string>)?.raw_text ?? '').slice(0, 120) || '(no content)'
                      : (source.url ?? source.type)}
                    {source.chunk_count != null && (
                      <span className="ml-2 text-gray-300">·</span>
                    )}
                    {source.chunk_count != null && (
                      <span className="ml-2">{source.chunk_count} chunks</span>
                    )}
                    {(source.last_synced_at ?? source.created_at) && (
                      <>
                        <span className="mx-1 text-gray-300">·</span>
                        {source.last_synced_at ? 'indexed' : 'added'}{' '}
                        {formatDateTime(source.last_synced_at ?? source.created_at)}
                      </>
                    )}
                  </p>
                  {source.error_message && (
                    <p className="text-xs text-red-500 mt-0.5 truncate">{source.error_message}</p>
                  )}
                </div>

                {/* Status badge */}
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${status.className}`}>
                  {status.icon}
                  {status.label}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={`/sources/${source.id}/edit`}
                    title="Edit"
                    className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </a>
                  <form action={resyncSource.bind(null, source.id)}>
                    <IconSubmitButton
                      title="Re-sync"
                      className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors disabled:opacity-40"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </IconSubmitButton>
                  </form>
                  <form action={deleteSource.bind(null, source.id)}>
                    <IconSubmitButton
                      title="Delete"
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </IconSubmitButton>
                  </form>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
    </div>
  </div>
  )
}
