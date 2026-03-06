import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ContactsClient } from './contacts-client'
import type { Metadata } from 'next'
import type { WorkspaceMember, SageContact } from '@/lib/types'

export const metadata: Metadata = { title: 'Contacts · Sage' }

export default async function ContactsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  const membership  = membershipRaw as Pick<WorkspaceMember, 'workspace_id'> | null
  if (!membership) redirect('/login')

  const [{ data: contactsRaw }, { data: dealsRaw }] = await Promise.all([
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
  ])

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

  return <ContactsClient contacts={contacts} />
}
