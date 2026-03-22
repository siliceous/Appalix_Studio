import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SageDashboardClient } from './dashboard-client'
import { UpcomingPanel } from '@/components/sage/upcoming-panel'
import type { WorkspaceMember, WorkspaceMemberSummary, WorkspaceMemberRole } from '@/lib/types'
import { ROLE_RANK } from '@/lib/types'

export default async function SageDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ viewAs?: string }>
}) {
  const { viewAs } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  const membership = membershipRaw as Pick<WorkspaceMember, 'workspace_id' | 'role'> | null
  if (!membership) redirect('/login')

  const workspaceId = membership.workspace_id
  const callerRank  = ROLE_RANK[membership.role as WorkspaceMemberRole] ?? 0
  const isManager   = callerRank >= ROLE_RANK.manager
  const admin       = createAdminClient()

  // viewAs resolution (managers+ only)
  let viewAsUserId: string | null = null
  if (viewAs && isManager) {
    const { data: targetRaw } = await admin
      .from('workspace_members')
      .select('user_id, role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', viewAs)
      .single()
    type TR = { user_id: string; role: WorkspaceMemberRole }
    const target = targetRaw as TR | null
    if (target && (ROLE_RANK[target.role] ?? 0) < callerRank) {
      viewAsUserId = target.user_id
    }
  }

  // Resolve caller name
  const { data: profileRaw } = await supabase
    .from('user_profiles')
    .select('first_name, last_name')
    .eq('user_id', user.id)
    .single()
  const p = profileRaw as { first_name: string; last_name: string | null } | null
  const userName = p ? `${p.first_name}${p.last_name ? ' ' + p.last_name : ''}`.trim() : (user.email ?? null)

  // Team members for view-as picker (managers+ only)
  let teamMembers: Pick<WorkspaceMemberSummary, 'user_id' | 'name' | 'email' | 'role'>[] = []
  if (isManager) {
    const { data: membersRaw } = await admin
      .from('workspace_members')
      .select('user_id, role')
      .eq('workspace_id', workspaceId)
      .not('accepted_at', 'is', null)
    const rawMembers = (membersRaw ?? []) as { user_id: string; role: string }[]
    if (rawMembers.length > 0) {
      const memberUserIds = rawMembers.map(m => m.user_id)
      const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
      const { data: profiles } = await admin
        .from('user_profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', memberUserIds)
      const profileMap = new Map((profiles ?? []).map((p: { user_id: string; first_name: string; last_name: string | null }) => [p.user_id, p]))
      teamMembers = rawMembers
        .filter(m => (ROLE_RANK[m.role as WorkspaceMemberRole] ?? 0) < callerRank && m.user_id !== user.id)
        .map(m => {
          const authUser = users.find(u => u.id === m.user_id)
          const profile  = profileMap.get(m.user_id)
          const fullName = profile ? `${profile.first_name}${profile.last_name ? ' ' + profile.last_name : ''}`.trim() : ''
          return { user_id: m.user_id, name: fullName || authUser?.email || m.user_id, email: authUser?.email ?? '', role: m.role as WorkspaceMemberRole }
        })
    }
  }

  // Email connection check
  const { data: integrationRaw } = await supabase
    .from('sage_integrations')
    .select('provider')
    .eq('workspace_id', workspaceId)
    .in('provider', ['gmail', 'outlook'])
    .limit(1)
    .single()
  const emailConnected   = !!integrationRaw
  const connectProvider  = (integrationRaw as { provider: string } | null)?.provider ?? null

  return (
    <div className="flex flex-col xl:flex-row gap-6 p-4 sm:p-6 min-h-full">
      {/* Upcoming panel — top on mobile/tablet, right sidebar on xl+ */}
      <div className="xl:order-2 xl:w-80 xl:shrink-0">
        <UpcomingPanel workspaceId={workspaceId} userId={user.id} />
      </div>

      {/* Main dashboard feed */}
      <div className="flex-1 min-w-0 xl:order-1">
        <SageDashboardClient
          workspaceId={workspaceId}
          callerRole={membership.role as WorkspaceMemberRole}
          currentUserId={user.id}
          viewAsUserId={viewAsUserId}
          teamMembers={teamMembers}
          userName={userName}
          emailConnected={emailConnected}
          connectProvider={connectProvider}
        />
      </div>
    </div>
  )
}
