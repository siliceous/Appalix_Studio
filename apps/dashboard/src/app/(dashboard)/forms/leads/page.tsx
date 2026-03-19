import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { LeadsClient } from './leads-client'
import { getUserPermissions } from '@/lib/permissions'
import { ROLE_RANK } from '@/lib/types'
import type { WorkspaceMember, Lead, WorkspaceMemberRole } from '@/lib/types'

export default async function AllLeadsPage() {
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

  type MRow = Pick<WorkspaceMember, 'workspace_id' | 'role'>
  const membership = membershipRaw as MRow | null
  if (!membership) redirect('/login')
  const workspaceId = membership.workspace_id
  const callerRole  = membership.role as WorkspaceMemberRole
  const callerRank  = ROLE_RANK[callerRole] ?? 0

  const userPermissions = await getUserPermissions(user.id, workspaceId, callerRole)

  // Role-based scoping: admin/owner see all; manager sees own+employees; employee sees own
  const isRestricted = callerRank < ROLE_RANK.admin
  let visibleAssignees: string[] = []
  if (isRestricted) {
    visibleAssignees = [user.id]
    if (callerRank >= ROLE_RANK.manager) {
      const admin = createAdminClient()
      const { data: belowMembers } = await admin
        .from('workspace_members')
        .select('user_id, role')
        .eq('workspace_id', workspaceId)
      const below = (belowMembers ?? []) as { user_id: string; role: WorkspaceMemberRole }[]
      const employeeIds = below
        .filter(m => (ROLE_RANK[m.role] ?? 0) < ROLE_RANK.manager && m.user_id !== user.id)
        .map(m => m.user_id)
      visibleAssignees = [user.id, ...employeeIds]
    }
  }

  // Use admin client so unassigned leads (e.g. Mailchimp imports) are never filtered by RLS
  const adminForLeads = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let leadsQuery: any = adminForLeads
    .from('leads')
    .select('*, source:lead_ad_sources(id, platform, name)')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (isRestricted) {
    if (visibleAssignees.length === 1) {
      leadsQuery = leadsQuery.eq('assigned_to', visibleAssignees[0])
    } else {
      leadsQuery = leadsQuery.in('assigned_to', visibleAssignees)
    }
  }

  const { data: leadsRaw } = await leadsQuery

  const leads = (leadsRaw ?? []) as Lead[]

  // Fetch team members below caller's rank for the "Assign to" picker
  let teamMembers: { user_id: string; name: string; role: WorkspaceMemberRole }[] = []
  if (userPermissions.can_allocate_leads || callerRank >= ROLE_RANK.manager) {
    const admin = createAdminClient()
    const { data: rawTeam } = await admin
      .from('workspace_members')
      .select('user_id, role')
      .eq('workspace_id', workspaceId)
      .neq('user_id', user.id)
    const { data: profiles } = await admin
      .from('user_profiles')
      .select('user_id, first_name, last_name')
    type PRow = { user_id: string; first_name: string; last_name: string | null }
    const pMap: Record<string, PRow> = {}
    for (const p of (profiles ?? []) as PRow[]) pMap[p.user_id] = p
    teamMembers = ((rawTeam ?? []) as { user_id: string; role: string }[])
      .filter((m) => (ROLE_RANK[m.role as WorkspaceMemberRole] ?? 0) < callerRank)
      .map((m) => {
        const p = pMap[m.user_id]
        return {
          user_id: m.user_id,
          role:    m.role as WorkspaceMemberRole,
          name:    p ? [p.first_name, p.last_name].filter(Boolean).join(' ') || m.user_id : m.user_id,
        }
      })
  }

  // Build a name map for all workspace members (to show assignee names)
  const admin = createAdminClient()
  const { data: allProfiles } = await admin
    .from('user_profiles')
    .select('user_id, first_name, last_name')
  type PRow = { user_id: string; first_name: string; last_name: string | null }
  const memberNameMap: Record<string, string> = {}
  for (const p of (allProfiles ?? []) as PRow[]) {
    memberNameMap[p.user_id] = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.user_id
  }

  return (
    <div className="max-w-5xl mx-auto p-8">
      <Header
        title="All Leads"
        description="Leads captured from connected ad platforms"
        action={
          <Link
            href="/forms/sources"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + Connect Platform
          </Link>
        }
      />

      <LeadsClient
        leads={leads}
        canAllocate={userPermissions.can_allocate_leads || callerRank >= ROLE_RANK.manager}
        teamMembers={teamMembers}
        memberNameMap={memberNameMap}
      />
    </div>
  )
}
