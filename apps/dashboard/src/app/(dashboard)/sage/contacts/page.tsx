import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ContactsClient } from './contacts-client'
import { getUserPermissions } from '@/lib/permissions'
import type { Metadata } from 'next'
import type { WorkspaceMember, SageContact, WorkspaceMemberSummary } from '@/lib/types'

export const metadata: Metadata = { title: 'Contacts · Sage' }

export default async function ContactsPage() {
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

  const perms = await getUserPermissions(user.id, membership.workspace_id, membership.role as import('@/lib/types').WorkspaceMemberRole)
  if (!perms.can_view_contacts) redirect('/dashboard')

  const admin = createAdminClient()

  const [{ data: contactsRaw }, { data: dealsRaw }, { data: membersRaw }] = await Promise.all([
    supabase
      .from('sage_contacts')
      .select('*')
      .eq('workspace_id', membership.workspace_id)
      .order('created_at', { ascending: false }),
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
      const name     = profile ? `${profile.first_name}${profile.last_name ? ' ' + profile.last_name : ''}`.trim() : ''
      return { user_id: m.user_id, name, email: authUser?.email ?? '', role: m.role as WorkspaceMemberSummary['role'] }
    })
  }

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

  return <ContactsClient contacts={contacts} members={members} callerRole={membership.role as WorkspaceMemberSummary['role']} />
}
