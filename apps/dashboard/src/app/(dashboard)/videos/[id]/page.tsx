import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ArrowLeft, Download, CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react'

export const metadata = { title: 'Video Details' }

const STATUS_BADGE: Record<string, { icon: React.ReactNode; color: string; text: string }> = {
  draft: { icon: <Clock className="w-4 h-4" />, color: 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300', text: 'Draft' },
  queued: { icon: <Clock className="w-4 h-4" />, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', text: 'Queued' },
  generating: { icon: <Loader2 className="w-4 h-4 animate-spin" />, color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300', text: 'Generating' },
  ready: { icon: <CheckCircle2 className="w-4 h-4" />, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', text: 'Ready' },
  failed: { icon: <XCircle className="w-4 h-4" />, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', text: 'Failed' },
}

export default async function VideoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    redirect('/auth/login')
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single()

  if (workspaceError || !workspace) {
    redirect('/onboarding')
  }

  const typedWorkspaceMember = workspace as any

  const { data: video, error: videoError } = await supabase
    .from('video_generations')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', typedWorkspaceMember.workspace_id)
    .is('deleted_at', null)
    .single()

  if (videoError || !video) {
    redirect('/videos')
  }

  const typedVideo = video as any
  const badge = STATUS_BADGE[typedVideo.status]

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="p-8 flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/videos" className="text-[#15A4AE] hover:text-[#0f8a93] transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              {typedVideo.title || 'Untitled Video'}
            </h1>
          </div>

          <div className="grid grid-cols-3 gap-6 mb-6">
            {/* Video Player / Preview */}
            <div className="col-span-2">
              <div className="bg-white dark:bg-[#2a2a2a] border dark:border-white/10 rounded-xl p-4 overflow-hidden">
                {typedVideo.status === 'ready' && typedVideo.output_url ? (
                  <video
                    src={typedVideo.output_url}
                    controls
                    className="w-full h-auto rounded"
                  />
                ) : (
                  <div className="bg-gray-100 dark:bg-white/5 rounded aspect-video flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        Video not yet ready
                      </p>
                      <p className="text-xs text-gray-400">Status: {typedVideo.status}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Metadata Sidebar */}
            <div className="space-y-4">
              {/* Status */}
              <div className="bg-white dark:bg-[#2a2a2a] border dark:border-white/10 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Status
                </p>
                <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${badge.color}`}>
                  {badge.icon}
                  {badge.text}
                </div>
              </div>

              {/* Cost */}
              <div className="bg-white dark:bg-[#2a2a2a] border dark:border-white/10 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Cost
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  ${typedVideo.actual_cost_usd ? typedVideo.actual_cost_usd.toFixed(2) : typedVideo.estimated_cost_usd.toFixed(2)}
                </p>
              </div>

              {/* Details */}
              <div className="bg-white dark:bg-[#2a2a2a] border dark:border-white/10 rounded-xl p-4 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Duration
                  </p>
                  <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                    {typedVideo.video_duration_seconds || typedVideo.duration_seconds || '—'} seconds
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Quality
                  </p>
                  <p className="text-sm text-gray-900 dark:text-gray-100 mt-1 capitalize">
                    {typedVideo.quality_mode?.replace('_', ' ') || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Created
                  </p>
                  <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                    {new Date(typedVideo.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Actions */}
              {typedVideo.status === 'ready' && typedVideo.output_url && (
                <div className="flex gap-2">
                  <a
                    href={typedVideo.output_url}
                    download
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#15A4AE] text-white text-sm font-medium rounded-lg hover:bg-[#0f8a93] transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Prompt */}
          <div className="bg-white dark:bg-[#2a2a2a] border dark:border-white/10 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Prompt</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {typedVideo.prompt}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
