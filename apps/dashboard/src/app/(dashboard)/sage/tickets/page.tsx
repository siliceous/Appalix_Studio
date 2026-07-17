import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TicketsClient } from './tickets-client'
import { SageToolbar, type TriagePreset } from '@/components/dashboard/sage-toolbar'
import { getAutoSettings } from '@/app/actions/sage-auto-settings'
import { getActivityFeed, resolveViewingAs } from '@/app/actions/activity-feed'
import { getActiveAutomationStates } from '@/app/actions/automation-executions'
import { ActivitySidebar } from '@/components/team/activity-sidebar'

import type { Metadata } from 'next'
import type { WorkspaceMember, WorkspaceMemberSummary, WorkspaceMemberRole, SageTicket, SageContact } from '@/lib/types'
import { ROLE_RANK } from '@/lib/types'

function getDateRange(preset: TriagePreset, customFrom?: string, customTo?: string): { from: string | null; to: string | null } {
  if (preset === 'custom') {
    return {
      from: customFrom ? new Date(customFrom).toISOString() : null,
      to:   customTo   ? new Date(customTo + 'T23:59:59').toISOString() : null,
    }
  }
  const now = new Date()
  if (preset === 'today') { const f = new Date(now); f.setHours(0,0,0,0); return { from: f.toISOString(), to: null } }
  if (preset === 'yesterday') { const f = new Date(now); f.setDate(f.getDate()-1); f.setHours(0,0,0,0); const t = new Date(now); t.setHours(0,0,0,0); return { from: f.toISOString(), to: t.toISOString() } }
  if (preset === '7d')  { const f = new Date(now); f.setDate(f.getDate()-7);  return { from: f.toISOString(), to: null } }
  if (preset === '30d') { const f = new Date(now); f.setDate(f.getDate()-30); return { from: f.toISOString(), to: null } }
  return { from: null, to: null }
}

export const metadata: Metadata = { title: 'Tickets · Sage' }

export default async function TicketsPage({ searchParams }: { searchParams: Promise<{ preset?: string; from?: string; to?: string; activityDate?: string }> }) {
  const [params, autoSettings] = await Promise.all([searchParams, getAutoSettings()])
  const preset = (['today','yesterday','7d','30d','custom'].includes(params.preset ?? '') ? params.preset : 'all') as TriagePreset
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

  const membership  = membershipRaw as Pick<WorkspaceMember, 'workspace_id' | 'role'> | null
  if (!membership) redirect('/login')
  const workspaceId = membership.workspace_id
  const callerRank  = ROLE_RANK[membership.role as WorkspaceMemberRole] ?? 0
  const isManager   = callerRank >= ROLE_RANK.manager
  const admin       = createAdminClient()

  const isEmployee = callerRank < ROLE_RANK.manager

  let ticketsQuery = supabase
    .from('sage_tickets')
    .select('id, title, name, email, phone, occurred_at, description, status, priority, contact_method, created_at, updated_at, contact_id, deal_id, owner_id, related_url, external_provider, external_id, external_url, contact:sage_contacts(id, name, email)')
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)

  if (isEmployee) ticketsQuery = (ticketsQuery as any).eq('owner_id', user.id)
  if (dateFrom) ticketsQuery = ticketsQuery.gte('created_at', dateFrom)
  if (dateTo)   ticketsQuery = ticketsQuery.lt('created_at', dateTo)
  ticketsQuery = ticketsQuery.order('created_at', { ascending: false })

  const [{ data: ticketsRaw }, { data: contactsRaw }, { data: membersRaw }] = await Promise.all([
    ticketsQuery,
    supabase.from('sage_contacts').select('id, name').eq('workspace_id', workspaceId).order('name'),
    admin.from('workspace_members').select('user_id, role').eq('workspace_id', workspaceId).not('accepted_at', 'is', null),
  ])

  const tickets  = (ticketsRaw  ?? []) as (SageTicket & { contact: Pick<SageContact, 'id' | 'name' | 'email'> | null })[]
  const contacts = (contactsRaw ?? []) as Pick<SageContact, 'id' | 'name'>[]

  // Resolve assignable member names (below caller's rank, excluding self)
  const rawMembers = (membersRaw ?? []) as { user_id: string; role: string }[]
  let assignableMembers: WorkspaceMemberSummary[] = []
  if (isManager && rawMembers.length > 0) {
    const memberUserIds = rawMembers.map(m => m.user_id)
    const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const { data: profiles } = await admin
      .from('user_profiles')
      .select('user_id, first_name, last_name')
      .in('user_id', memberUserIds)
    const profileMap = new Map((profiles ?? []).map((p: { user_id: string; first_name: string; last_name: string | null }) => [p.user_id, p]))
    assignableMembers = rawMembers
      .filter(m => (ROLE_RANK[m.role as WorkspaceMemberRole] ?? 0) < callerRank && m.user_id !== user.id)
      .map(m => {
        const authUser = users.find(u => u.id === m.user_id)
        const profile  = profileMap.get(m.user_id)
        const fullName = profile ? `${profile.first_name}${profile.last_name ? ' ' + profile.last_name : ''}`.trim() : ''
        return { user_id: m.user_id, name: fullName || authUser?.email || m.user_id, email: authUser?.email ?? '', role: m.role as WorkspaceMemberSummary['role'] }
      })
  }

  const activityDate = params.activityDate ?? new Date().toISOString().slice(0, 10)
  const [activity, viewingAs, automationStates] = await Promise.all([
    getActivityFeed(user.id, workspaceId, activityDate),
    resolveViewingAs(undefined, workspaceId),
    getActiveAutomationStates(),
  ])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <SageToolbar pageKey="tickets" preset={preset} customFrom={params.from} customTo={params.to} autoEnabled={autoSettings.tickets_auto_enabled} />
      <div className="flex flex-1 overflow-hidden min-h-0">
          <TicketsClient
            tickets={tickets}
            contacts={contacts}
            callerRole={membership.role as WorkspaceMember['role']}
            members={assignableMembers}
            initialAutomationStates={automationStates}
          />
        <ActivitySidebar
          activity={activity}
          date={activityDate}
          currentPath="/sage/tickets"
          viewingAs={viewingAs}
        />
      </div>
    </div>
  )
}
