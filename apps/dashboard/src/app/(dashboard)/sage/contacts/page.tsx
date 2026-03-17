import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ContactsClient } from './contacts-client'
import { getUserPermissions } from '@/lib/permissions'
import type { Metadata } from 'next'
import type { WorkspaceMember, SageContact, WorkspaceMemberSummary, WorkspaceMemberRole } from '@/lib/types'
import { ROLE_RANK } from '@/lib/types'

export const metadata: Metadata = { title: 'Contacts · Sage' }

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ viewAs?: string }>
}) {
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

  type MembershipRow = Pick<WorkspaceMember, 'workspace_id' | 'role'>
  const membership  = membershipRaw as MembershipRow | null
  if (!membership) redirect('/login')

  const perms = await getUserPermissions(user.id, membership.workspace_id, membership.role as WorkspaceMemberRole)
  if (!perms.can_view_contacts) redirect('/dashboard')

  const callerRank = ROLE_RANK[membership.role as WorkspaceMemberRole] ?? 0
  const isManager  = callerRank >= ROLE_RANK.manager
  const admin      = createAdminClient()

  // Resolve viewAs param (managers+ only, must be a lower-rank member)
  const { viewAs } = await searchParams
  let viewAsUserId: string | null = null
  if (viewAs && isManager) {
    const { data: targetRaw } = await admin
      .from('workspace_members')
      .select('user_id, role')
      .eq('workspace_id', membership.workspace_id)
      .eq('user_id', viewAs)
      .single()
    type TR = { user_id: string; role: WorkspaceMemberRole }
    const target = targetRaw as TR | null
    if (target && (ROLE_RANK[target.role] ?? 0) < callerRank) {
      viewAsUserId = target.user_id
    }
  }

  // Build contacts query based on role / viewAs
  // All roles see own + unassigned contacts; contacts assigned to others are hidden until
  // the manager uses "My view" picker to browse that team member's contacts.
  let contactsQuery = supabase.from('sage_contacts').select('*').eq('workspace_id', membership.workspace_id)
  if (viewAsUserId) {
    contactsQuery = contactsQuery.eq('assigned_to', viewAsUserId)
  } else {
    contactsQuery = contactsQuery.or(`assigned_to.eq.${user.id},assigned_to.is.null`)
  }
  contactsQuery = contactsQuery.order('created_at', { ascending: false })

  const [{ data: contactsRaw }, { data: dealsRaw }, { data: membersRaw }] = await Promise.all([
    contactsQuery,
    supabase
      .from('sage_deals')
      .select('contact_id, value')
      .eq('workspace_id', membership.workspace_id)
      .eq('status', 'open')
      .not('contact_id', 'is', null),
    admin
      .from('workspace_members')
      .select('user_id, role')
      .eq('workspace_id', membership.workspace_id)
      .not('accepted_at', 'is', null),
  ])

  // Resolve member names + emails
  const memberUserIds = (membersRaw ?? []).map((m: { user_id: string; role: string }) => m.user_id)
  let members: WorkspaceMemberSummary[] = []
  if (memberUserIds.length > 0) {
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

  // Team members below caller's rank for the picker
  const teamMembers = isManager
    ? members.filter(m => (ROLE_RANK[m.role] ?? 0) < callerRank && m.user_id !== user.id)
    : []

  // Sum open deal values per contact
  const dealValueMap = new Map<string, number>()
  for (const d of (dealsRaw ?? []) as { contact_id: string; value: number | null }[]) {
    if (d.contact_id && d.value) {
      dealValueMap.set(d.contact_id, (dealValueMap.get(d.contact_id) ?? 0) + d.value)
    }
  }

  const contacts = ((contactsRaw ?? []) as SageContact[]).map(c => ({
    ...c,
    deal_value: dealValueMap.get(c.id) ?? null,
  }))

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        <ContactsClient
          contacts={contacts}
          members={members}
          callerRole={membership.role as WorkspaceMemberSummary['role']}
          teamMembers={teamMembers}
          viewAsUserId={viewAsUserId}
        />
      </div>
    </div>
  )
}
