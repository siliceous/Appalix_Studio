import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import type { Metadata } from 'next'
import type { WorkspaceMember, SageTicket, SageContact, WorkspaceMemberRole } from '@/lib/types'
import { ROLE_RANK } from '@/lib/types'
import { TicketsClient } from '@/app/(dashboard)/sage/tickets/tickets-client'
import { SubpageToolbar, type SubpagePreset } from '@/components/dashboard/subpage-toolbar'
import { getAutoSettings } from '@/app/actions/sage-auto-settings'
import { getTeamMemberProfile } from '@/app/actions/team-member-profile'
import { TeamMemberBanner } from '@/components/team/team-member-banner'

export const metadata: Metadata = { title: 'Tickets' }

function getDateRange(preset: SubpagePreset, customFrom?: string, customTo?: string): { from: string | null; to: string | null } {
  if (preset === 'custom') {
    return {
      from: customFrom ? new Date(customFrom).toISOString() : null,
      to:   customTo   ? new Date(customTo + 'T23:59:59').toISOString() : null,
    }
  }
  const now = new Date()
  if (preset === 'today') {
    const from = new Date(now); from.setHours(0, 0, 0, 0)
    return { from: from.toISOString(), to: null }
  }
  if (preset === 'yesterday') {
    const from = new Date(now); from.setDate(from.getDate() - 1); from.setHours(0, 0, 0, 0)
    const to   = new Date(now); to.setHours(0, 0, 0, 0)
    return { from: from.toISOString(), to: to.toISOString() }
  }
  if (preset === '7d') {
    const from = new Date(now); from.setDate(from.getDate() - 7)
    return { from: from.toISOString(), to: null }
  }
  if (preset === '30d') {
    const from = new Date(now); from.setDate(from.getDate() - 30)
    return { from: from.toISOString(), to: null }
  }
  return { from: null, to: null }
}

export default async function TicketsPage({ searchParams }: { searchParams: Promise<{ preset?: string; from?: string; to?: string; viewAs?: string; activityDate?: string }> }) {
  const [params, autoSettings] = await Promise.all([searchParams, getAutoSettings()])
  const preset = (['today','yesterday','7d','30d','custom'].includes(params.preset ?? '') ? params.preset : 'all') as SubpagePreset
  const { from: dateFrom, to: dateTo } = getDateRange(preset, params.from, params.to)
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

  const callerRank   = ROLE_RANK[(membership.role ?? 'viewer') as WorkspaceMemberRole] ?? 1

  // viewAs: manager+ can browse a team member's tickets
  const viewAsUserId = (params.viewAs && callerRank >= ROLE_RANK.manager) ? params.viewAs : null

  const isRestricted = viewAsUserId ? true : callerRank < ROLE_RANK.admin

  // For restricted roles, scope to visible user IDs (own + employees for managers)
  let visibleOwnerIds: string[] = []
  if (viewAsUserId) {
    visibleOwnerIds = [viewAsUserId]
  } else if (isRestricted) {
    visibleOwnerIds = [user.id]
    if (callerRank >= ROLE_RANK.manager) {
      // Fetch employee user IDs in this workspace
      const { data: belowMembers } = await supabase
        .from('workspace_members')
        .select('user_id, role')
        .eq('workspace_id', workspaceId)
      const below = (belowMembers ?? []) as { user_id: string; role: WorkspaceMemberRole }[]
      const employeeIds = below
        .filter(m => ROLE_RANK[m.role] < ROLE_RANK.manager && m.user_id !== user.id)
        .map(m => m.user_id)
      visibleOwnerIds = [user.id, ...employeeIds]
    }
  }

  let ticketsQuery = supabase
    .from('sage_tickets')
    .select('id, title, name, email, phone, occurred_at, description, status, priority, contact_method, created_at, updated_at, contact_id, deal_id, owner_id, related_url, external_provider, external_id, external_url, contact:sage_contacts(id, name, email)')
    .eq('workspace_id', workspaceId)
  if (visibleOwnerIds.length === 1) ticketsQuery = (ticketsQuery as any).eq('owner_id', visibleOwnerIds[0])
  else if (visibleOwnerIds.length > 1) ticketsQuery = (ticketsQuery as any).in('owner_id', visibleOwnerIds)
  if (dateFrom) ticketsQuery = ticketsQuery.gte('created_at', dateFrom)
  if (dateTo)   ticketsQuery = ticketsQuery.lt('created_at', dateTo)
  ticketsQuery = ticketsQuery.order('created_at', { ascending: false })

  const [{ data }, { data: contactsRaw }] = await Promise.all([
    ticketsQuery,
    supabase.from('sage_contacts').select('id, name').eq('workspace_id', workspaceId).order('name'),
  ])
  const tickets  = (data ?? []) as (SageTicket & { contact: Pick<SageContact, 'id' | 'name' | 'email'> | null })[]
  const contacts = (contactsRaw ?? []) as Pick<SageContact, 'id' | 'name'>[]

  const profileData = viewAsUserId
    ? await getTeamMemberProfile(viewAsUserId, params.activityDate)
    : null
  const profile = profileData && !('error' in profileData) ? profileData : null

  return (
    <div className="-m-8 flex flex-col h-screen overflow-hidden">
      <SubpageToolbar sourceKey="tickets" preset={preset} customFrom={params.from} customTo={params.to} autoEnabled={autoSettings.tickets_auto_enabled} />
      {profile && (
        <TeamMemberBanner profile={profile} currentPath="/dashboard/tickets" selectedDate={params.activityDate} />
      )}
      <div className="flex-1 overflow-y-auto">
        <TicketsClient tickets={tickets} contacts={contacts} readonly={!!viewAsUserId} />
      </div>
    </div>
  )
}
