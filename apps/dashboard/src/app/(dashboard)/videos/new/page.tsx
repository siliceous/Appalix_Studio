import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StudioLayout } from '@/components/studio/studio-layout'

export const metadata = { title: 'AI Studio' }

export default async function NewVideoPage() {
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
    <StudioLayout
      workspaceId={typedWorkspaceMember.workspace_id}
      walletBalance={typedWallet?.balance || 0}
      templates={templates || []}
    />
  )
}
