import Link from 'next/link'
import { Plus, Film, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata = { title: 'Video Generator' }

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300',
  queued: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  generating: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  ready: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  draft: <Clock className="w-3 h-3" />,
  queued: <Clock className="w-3 h-3" />,
  generating: <Loader2 className="w-3 h-3 animate-spin" />,
  ready: <CheckCircle2 className="w-3 h-3" />,
  failed: <XCircle className="w-3 h-3" />,
}

export default async function VideosPage() {
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

  const { data: workspaceData } = await supabase
    .from('workspaces')
    .select('plan')
    .eq('id', typedWorkspaceMember.workspace_id)
    .single()

  const typedWorkspace = workspaceData as any
  const isPro = typedWorkspace?.plan && ['pro', 'team', 'enterprise'].includes((typedWorkspace.plan as string).toLowerCase())

  if (!isPro) {
    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="p-8 flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            <div className="bg-white dark:bg-[#2a2a2a] border dark:border-white/10 rounded-xl p-16 text-center">
              <Film className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Video Generation - Pro+ Feature</p>
              <p className="text-xs text-gray-400 mt-1 mb-4">
                Upgrade to Pro plan or higher to start creating AI videos.
              </p>
              <Link
                href="/settings/upgrade"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#15A4AE] text-white text-sm font-medium rounded-lg hover:bg-[#0f8a93] transition-colors"
              >
                Upgrade Plan
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const { data: videos } = await supabase
    .from('video_generations')
    .select('*')
    .eq('workspace_id', typedWorkspaceMember.workspace_id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="p-8 flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Video Generator</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Create AI videos from text or images using Kling.
              </p>
            </div>
            <Link
              href="/videos/new"
              className="flex items-center gap-2 px-4 py-2 bg-[#15A4AE] hover:bg-[#0f8a93] text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Video
            </Link>
          </div>

          {!videos || videos.length === 0 ? (
            <div className="bg-white dark:bg-[#2a2a2a] border dark:border-white/10 rounded-xl p-16 text-center">
              <Film className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No videos yet</p>
              <p className="text-xs text-gray-400 mt-1 mb-4">Create your first video to get started.</p>
              <Link
                href="/videos/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#15A4AE] text-white text-sm font-medium rounded-lg hover:bg-[#0f8a93] transition-colors"
              >
                <Plus className="w-4 h-4" /> Create Video
              </Link>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#2a2a2a] border dark:border-white/10 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-white/10 bg-gray-50 dark:bg-white/5">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Title
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Type
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Status
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Cost
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {videos.map((video: any) => (
                    <tr
                      key={video.id}
                      className="border-b dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <Link
                          href={`/videos/${video.id}`}
                          className="font-medium text-[#15A4AE] hover:underline"
                        >
                          {video.title || video.prompt.substring(0, 60)}
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-500 dark:text-gray-400">
                        {video.video_type.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLE[video.status]}`}>
                          {STATUS_ICON[video.status]}
                          {video.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right text-gray-900 dark:text-gray-100">
                        ${video.actual_cost_usd ? video.actual_cost_usd.toFixed(2) : '—'}
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-500 dark:text-gray-400">
                        {new Date(video.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
