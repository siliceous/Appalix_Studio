import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getTicketActivities } from '@/app/actions/sage-tickets'
import { getAutoSettings } from '@/app/actions/sage-auto-settings'
import { TicketDetailClient } from './ticket-detail-client'
import { SubpageToolbar } from '@/components/dashboard/subpage-toolbar'
import type { WorkspaceMember, WorkspaceMemberRole, WorkspaceMemberSummary, SageTicket, SageContact } from '@/lib/types'
import { ROLE_RANK } from '@/lib/types'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Ticket Detail · Sage' }

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

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

  // Fetch the specific ticket
  const { data: ticketRaw } = await admin
    .from('sage_tickets')
    .select('id, title, name, email, phone, occurred_at, description, status, priority, contact_method, created_at, updated_at, contact_id, deal_id, owner_id, related_url, external_provider, external_id, external_url, contact:sage_contacts(id, name, email)')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .single()

  if (!ticketRaw) notFound()

  // Fetch all tickets for left panel (same list as tickets page)
  const { data: allTicketsRaw } = await admin
    .from('sage_tickets')
    .select('id, title, name, email, status, priority, created_at, contact:sage_contacts(id, name, email)')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  // Fetch activities and auto settings
  const [activities, autoSettings] = await Promise.all([
    getTicketActivities(id),
    getAutoSettings(),
  ])

  // Resolve assignable members
  let assignableMembers: WorkspaceMemberSummary[] = []
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
      assignableMembers = rawMembers
        .filter(m => (ROLE_RANK[m.role as WorkspaceMemberRole] ?? 0) < callerRank && m.user_id !== user.id)
        .map(m => {
          const authUser = users.find(u => u.id === m.user_id)
          const profile  = profileMap.get(m.user_id)
          const fullName = profile ? `${profile.first_name}${profile.last_name ? ' ' + profile.last_name : ''}`.trim() : ''
          return { user_id: m.user_id, name: fullName || authUser?.email || m.user_id, email: authUser?.email ?? '', role: m.role as WorkspaceMemberSummary['role'] }
        })
    }
  }

  type TicketWithContact = SageTicket & { contact: Pick<SageContact, 'id' | 'name' | 'email'> | null }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <SubpageToolbar sourceKey="tickets" preset="all" autoEnabled={autoSettings.tickets_auto_enabled} />
      <div className="flex-1 overflow-hidden">
        <TicketDetailClient
          ticket={ticketRaw as unknown as TicketWithContact}
          allTickets={(allTicketsRaw ?? []) as unknown as TicketWithContact[]}
          activities={activities}
          callerRole={membership.role as WorkspaceMember['role']}
          members={assignableMembers}
        />
      </div>
    </div>
  )
}
