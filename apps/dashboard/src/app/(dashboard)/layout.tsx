import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { UserAvatarProvider } from '@/contexts/user-avatar-context'
import { SageRightPanel } from '@/components/sage/sage-right-panel'
import { ReminderWatcher } from '@/components/reminder-watcher'
import { createWorkspace } from '@/app/actions/workspace'
import { getUserPermissions } from '@/lib/permissions'
import { getBranding } from '@/app/actions/workspace-branding'
import { WelcomeModal } from '@/components/onboarding/welcome-modal'
import { TrialBanner } from '@/components/layout/trial-banner'
import { BodyScrollLock } from '@/components/layout/body-scroll-lock'
import type { Workspace, WorkspaceMemberRole } from '@/lib/types'

// All dashboard pages are user-specific and require live DB access — never statically render.
export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
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

  const branding = workspace ? await getBranding() : null

  // Fetch user's display name + avatar for the sidebar account identity
  const { data: profileRaw } = await supabase
    .from('user_profiles')
    .select('first_name, last_name, avatar_url, sage_voice_config')
    .eq('user_id', user.id)
    .maybeSingle()
  type ProfileRow = { first_name: string; last_name: string | null; avatar_url: string | null; sage_voice_config: Record<string, unknown> | null }
  const profile = profileRaw as ProfileRow | null
  const userName        = profile ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') : null
  const userEmail       = user.email ?? null
  const userAvatar      = profile?.avatar_url ?? null
  const wakeWordEnabled = profile?.sage_voice_config?.wake_word_enabled !== false

  if (!workspace) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Set up your workspace</h2>
          <p className="text-sm text-gray-500 mb-6">
            Create a workspace to start building your AI chatbots.
          </p>
          <form action={createWorkspace} className="flex flex-col gap-3">
            <input
              name="name"
              type="text"
              defaultValue="My Workspace"
              className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-900"
              required
            />
            <button
              type="submit"
              className="bg-gray-900 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              Create workspace
            </button>
          </form>
        </div>
      </div>
    )
  }

  const isOnTrial = workspace.subscription_status === 'trialing'
    && workspace.trial_ends_at != null
    && new Date(workspace.trial_ends_at) > new Date()

  // Detect completed onboarding steps from DB to pre-populate the welcome modal
  const wsId = raw?.workspace_id ?? workspace.id
  const [{ count: botCount }, { count: integrationCount }, { count: sourceCount }] = await Promise.all([
    supabase.from('bots').select('id', { count: 'exact', head: true }).eq('workspace_id', wsId),
    supabase.from('integrations').select('id', { count: 'exact', head: true }).eq('workspace_id', wsId),
    supabase.from('sources').select('id', { count: 'exact', head: true }).eq('workspace_id', wsId),
  ])
  const serverCompleted: string[] = [
    ...((botCount ?? 0) > 0         ? ['bot']          : []),
    ...((integrationCount ?? 0) > 0 ? ['integrations'] : []),
    ...((sourceCount ?? 0) > 0      ? ['knowledge']    : []),
  ]

  return (
    <UserAvatarProvider
      initialUrl={userAvatar}
      userName={userName}
      plan={workspace.plan}
      brandColor={branding?.primary_color ?? '#15A4AE'}
    >
    <div className="flex h-screen overflow-hidden bg-[#f5f4f1] dark:bg-[#1c1c1c] relative">
      {/* Subtle green ambient glow in dark mode */}
      <div className="pointer-events-none fixed top-0 left-[204px] right-0 h-[300px] dark:bg-[#15A4AE]/[0.03] blur-[80px] hidden dark:block" />
      <Sidebar
        workspace={workspace}
        callerRole={callerRole}
        userPermissions={userPermissions ?? undefined}
        userName={userName}
        userEmail={userEmail}
        branding={branding}
      />
      <div className="flex-1 flex flex-col overflow-hidden pl-20">
        {isOnTrial && workspace.trial_ends_at && (
          <TrialBanner trialEndsAt={workspace.trial_ends_at} />
        )}
        <main className="flex-1 p-8 overflow-hidden flex flex-col bg-[#f5f4f1] dark:bg-[#1c1c1c]">
          {children}
        </main>
      </div>
      <SageRightPanel
        workspaceId={workspace.id}
        plan={workspace.plan}
        trialEndsAt={workspace.trial_ends_at}
        wakeWordEnabled={wakeWordEnabled}
      />
      <WelcomeModal
        userName={userName}
        plan={workspace.plan}
        trialEndsAt={workspace.trial_ends_at}
        serverCompleted={serverCompleted}
      />
      <ReminderWatcher />
      <BodyScrollLock />
    </div>
    </UserAvatarProvider>
  )
}
