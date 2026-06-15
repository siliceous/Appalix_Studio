import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { VideoGenerationForm } from '@/components/videos/video-generation-form'

export const metadata = { title: 'Create Video (Classic)' }

export default async function ClassicVideoPage() {
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
  const typedUser = user as any

  // Fetch wallet balance
  const { data: wallet } = await supabase
    .from('wallet_accounts')
    .select('balance')
    .eq('workspace_id', typedWorkspaceMember.workspace_id)
    .single()

  // Fetch templates
  const { data: templates } = await supabase
    .from('video_provider_templates')
    .select('*')
    .or('is_system.eq.true,created_by.eq.' + (typedUser.id || ''))
    .order('created_at', { ascending: false })

  const typedWallet = wallet as any

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="p-8 flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Create AI Video</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Generate high-quality videos using AI. Powered by Kling.
            </p>
          </div>

          <VideoGenerationForm
            workspaceId={typedWorkspaceMember.workspace_id}
            walletBalance={typedWallet?.balance || 0}
            templates={templates || []}
          />
        </div>
      </div>
    </div>
  )
}
