import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TicketsClient } from './tickets-client'
import type { Metadata } from 'next'
import type { WorkspaceMember, WorkspaceMemberSummary, WorkspaceMemberRole, SageTicket, SageContact } from '@/lib/types'
import { ROLE_RANK } from '@/lib/types'

export const metadata: Metadata = { title: 'Tickets · Sage' }

export default async function TicketsPage() {
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

  const [{ data: ticketsRaw }, { data: contactsRaw }, { data: membersRaw }] = await Promise.all([
    supabase
      .from('sage_tickets')
      .select('id, title, name, email, phone, occurred_at, description, status, priority, contact_method, created_at, updated_at, contact_id, deal_id, owner_id, related_url, external_provider, external_id, external_url, contact:sage_contacts(id, name, email)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false }),
    supabase
      .from('sage_contacts')
      .select('id, name')
      .eq('workspace_id', workspaceId)
      .order('name'),
    admin
      .from('workspace_members')
      .select('user_id, role')
      .eq('workspace_id', workspaceId)
      .not('accepted_at', 'is', null),
  ])

  const tickets  = (ticketsRaw  ?? []) as (SageTicket & { contact: Pick<SageContact, 'id' | 'name' | 'email'> | null })[]
  const contacts = (contactsRaw ?? []) as Pick<SageContact, 'id' | 'name'>[]

  // Resolve member names for assign dropdown
  const memberUserIds = (membersRaw ?? []).map((m: { user_id: string; role: string }) => m.user_id)
  let members: WorkspaceMemberSummary[] = []
  if (isManager && memberUserIds.length > 0) {
    const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const { data: profiles } = await admin
      .from('user_profiles')
      .select('user_id, first_name, last_name')
      .in('user_id', memberUserIds)
    const profileMap = new Map((profiles ?? []).map((p: { user_id: string; first_name: string; last_name: string | null }) => [p.user_id, p]))
    members = (membersRaw ?? []).map((m: { user_id: string; role: string }) => {
      const authUser = users.find(u => u.id === m.user_id)
      const profile  = profileMap.get(m.user_id)
      const fullName = profile ? `${profile.first_name}${profile.last_name ? ' ' + profile.last_name : ''}`.trim() : ''
      return { user_id: m.user_id, name: fullName || authUser?.email || m.user_id, email: authUser?.email ?? '', role: m.role as WorkspaceMemberSummary['role'] }
    })
  }

  return (
    <TicketsClient
      tickets={tickets}
      contacts={contacts}
      callerRole={membership.role as WorkspaceMember['role']}
      members={isManager ? members : []}
    />
  )
}
