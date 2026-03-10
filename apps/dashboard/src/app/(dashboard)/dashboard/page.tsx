import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import type { Metadata } from 'next'
import type { WorkspaceMember, WorkspaceMemberRole } from '@/lib/types'
import { ROLE_RANK } from '@/lib/types'
import { SageDashboardClient } from '@/app/(dashboard)/sage/dashboard/dashboard-client'

export const metadata: Metadata = { title: 'Overview' }

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ viewAs?: string }>
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

  const { viewAs } = await searchParams
  const callerRank = ROLE_RANK[membership.role as WorkspaceMemberRole] ?? 0

  // Resolve viewAs — validate caller outranks the target
  let viewAsUserId: string | null = null
  let viewAsName: string | null = null
  if (viewAs && callerRank >= ROLE_RANK.admin) {
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
    teamMembers = ((rawTeam ?? []) as TRowArr[])
      .filter((m) => (ROLE_RANK[m.role as WorkspaceMemberRole] ?? 0) < callerRank)
      .map((m) => {
        const p = pMap[m.user_id]
        return {
          user_id: m.user_id,
          role: m.role as WorkspaceMemberRole,
          name: p ? [p.first_name, p.last_name].filter(Boolean).join(' ') || m.user_id : m.user_id,
        }
      })
  }

  return (
    <div className="overflow-y-auto">
      <SageDashboardClient
        workspaceId={membership.workspace_id}
        callerRole={membership.role as WorkspaceMemberRole}
        viewAsUserId={viewAsUserId}
        viewAsName={viewAsName}
        teamMembers={teamMembers}
      />
    </div>
  )
}

type TRowArr = { user_id: string; role: string }
