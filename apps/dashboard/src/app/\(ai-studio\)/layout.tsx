import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { UserAvatarProvider } from '@/contexts/user-avatar-context'
import { WorkspaceProvider } from '@/components/workspace-provider'
import type { Workspace, WorkspaceMemberRole } from '@/lib/types'
import { getUserPermissions } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export default async function AIStudioLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  // Confirm user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Load the first workspace this user belongs to
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id, role, workspaces(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  const raw = membership as unknown as { workspaces: Workspace; role: string; workspace_id: string } | null
  const workspace = raw?.workspaces ?? null
  const callerRole = (raw?.role ?? 'member') as WorkspaceMemberRole

  const userPermissions = workspace
    ? await getUserPermissions(user.id, raw!.workspace_id ?? workspace.id, callerRole)
    : null

  // Fetch user's display name + avatar
  const { data: profileRaw } = await supabase
    .from('user_profiles')
    .select('first_name, last_name, avatar_url, sage_voice_config')
    .eq('user_id', user.id)
    .maybeSingle()
  type ProfileRow = { first_name: string; last_name: string | null; avatar_url: string | null; sage_voice_config: Record<string, unknown> | null }
  const profile = profileRaw as ProfileRow | null
  const userName = profile ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') : null
  const userAvatar = profile?.avatar_url ?? null

  if (!workspace) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Set up your workspace</h2>
          <p className="text-sm text-gray-500 mb-6">Create a workspace to start using AI Studio.</p>
        </div>
      </div>
    )
  }

  const wsId = raw?.workspace_id ?? workspace.id

  return (
    <UserAvatarProvider
      initialUrl={userAvatar}
      userName={userName}
      plan={workspace.plan}
      brandColor="#141C2B"
      bgColor={null}
      workspaceId={workspace.id}
    >
      <WorkspaceProvider workspaceId={wsId}>
        <div className="min-h-screen bg-[#f5f4f1] dark:bg-[#1c1c1c]">
          <main className="w-full">
            {children}
          </main>
        </div>
      </WorkspaceProvider>
    </UserAvatarProvider>
  )
}
