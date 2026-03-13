import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import type { Metadata } from 'next'
import type { WorkspaceMember, WorkspaceMemberRole } from '@/lib/types'
import { ROLE_RANK } from '@/lib/types'
import { SageDashboardClient } from '@/app/(dashboard)/sage/dashboard/dashboard-client'
import { getActivityFeed, resolveViewingAs } from '@/app/actions/activity-feed'
import { TeamMemberBanner } from '@/components/team/team-member-banner'

export const metadata: Metadata = { title: 'Overview' }

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ viewAs?: string; activityDate?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id, role, user_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  type MRow = Pick<WorkspaceMember, 'workspace_id' | 'role'> & { user_id: string }
  const membership = membershipRaw as MRow | null
  if (!membership) redirect('/login')

  const { viewAs, activityDate } = await searchParams
  const callerRank = ROLE_RANK[membership.role as WorkspaceMemberRole] ?? 0

  // Check if user has a connected email integration
  const { data: emailIntegrationRaw } = await supabase
    .from('sage_integrations')
    .select('id')
    .eq('workspace_id', membership.workspace_id)
    .eq('user_id', user.id)
    .in('provider', ['gmail', 'microsoft'])
    .eq('status', 'connected')
    .limit(1)
    .maybeSingle()
  const emailConnected = !!emailIntegrationRaw

  // Detect provider from email domain for banner link
  const emailDomain = user.email?.split('@')[1]?.toLowerCase() ?? ''
  const microsoftDomains = ['outlook.com', 'hotmail.com', 'live.com', 'microsoft.com', 'msn.com']
  const gmailDomains = ['gmail.com', 'googlemail.com']
  const connectProvider = gmailDomains.includes(emailDomain) ? 'gmail'
    : microsoftDomains.includes(emailDomain) ? 'microsoft'
    : null

  // Fetch current user's first name for the greeting
  const { data: profileRaw } = await supabase
    .from('user_profiles')
    .select('first_name')
    .eq('user_id', user.id)
    .maybeSingle()
  const firstName = (profileRaw as { first_name: string } | null)?.first_name ?? null

  // Resolve viewAs — validate caller outranks the target
  let viewAsUserId: string | null = null
  let viewAsName: string | null = null
  if (viewAs && callerRank >= ROLE_RANK.manager) {
    const admin = createAdminClient()
    const { data: targetRaw } = await admin
      .from('workspace_members')
      .select('user_id, role')
      .eq('workspace_id', membership.workspace_id)
      .eq('user_id', viewAs)
      .single()
    type TRow = { user_id: string; role: WorkspaceMemberRole }
    const target = targetRaw as TRow | null
    if (target && ROLE_RANK[target.role] < callerRank) {
      viewAsUserId = target.user_id
      // Fetch name
      const { data: profiles } = await admin
        .from('user_profiles')
        .select('first_name, last_name')
        .eq('user_id', target.user_id)
        .single()
      type PRow = { first_name: string; last_name: string | null }
      const p = profiles as PRow | null
      viewAsName = p ? [p.first_name, p.last_name].filter(Boolean).join(' ') || viewAs : viewAs
    }
  }

  // Fetch team members for the "View as" picker (only roles below caller)
  let teamMembers: { user_id: string; name: string; role: WorkspaceMemberRole }[] = []
  if (callerRank >= ROLE_RANK.manager) {
    const admin = createAdminClient()
    const { data: rawTeam } = await admin
      .from('workspace_members')
      .select('user_id, role')
      .eq('workspace_id', membership.workspace_id)
      .neq('user_id', user.id)
    const { data: profiles } = await admin
      .from('user_profiles')
      .select('user_id, first_name, last_name')
    type PRow = { user_id: string; first_name: string; last_name: string | null }
    const pMap: Record<string, PRow> = {}
    for (const p of (profiles ?? []) as PRow[]) pMap[p.user_id] = p

    // Fetch emails as fallback display name
    const { data: { users: authUsers } } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const emailMap: Record<string, string> = {}
    for (const u of authUsers) emailMap[u.id] = u.email ?? ''

    teamMembers = ((rawTeam ?? []) as TRowArr[])
      .filter((m) => (ROLE_RANK[m.role as WorkspaceMemberRole] ?? 0) < callerRank)
      .map((m) => {
        const p = pMap[m.user_id]
        const fullName = p ? [p.first_name, p.last_name].filter(Boolean).join(' ') : ''
        const email = emailMap[m.user_id] ?? ''
        return {
          user_id: m.user_id,
          role: m.role as WorkspaceMemberRole,
          name: fullName || email || m.user_id,
        }
      })
  }

  const overviewActivityDate = activityDate ?? new Date().toISOString().slice(0, 10)
  const [overviewActivity, viewingAs] = viewAsUserId
    ? await Promise.all([
        getActivityFeed(viewAsUserId, membership.workspace_id, overviewActivityDate),
        resolveViewingAs(viewAs, membership.workspace_id),
      ])
    : [null, null]

  return (
    <>
      {viewAsUserId && overviewActivity && (
        <div className="-m-8 mb-0">
          <TeamMemberBanner activity={overviewActivity} date={overviewActivityDate} currentPath="/dashboard" viewingAs={viewingAs} selectedDate={activityDate} />
        </div>
      )}
      <SageDashboardClient
        workspaceId={membership.workspace_id}
        callerRole={membership.role as WorkspaceMemberRole}
        currentUserId={user.id}
        viewAsUserId={viewAsUserId}
        viewAsName={viewAsName}
        teamMembers={teamMembers}
        userName={firstName}
        emailConnected={emailConnected}
        connectProvider={connectProvider}
      />
    </>
  )
}

type TRowArr = { user_id: string; role: string }
