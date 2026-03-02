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
    .limit(1)
    .single()

  const membership  = membershipRaw as Pick<WorkspaceMember, 'workspace_id'> | null
  if (!membership) redirect('/login')

  const { data: contactsRaw } = await supabase
    .from('sage_contacts')
    .select('*')
    .eq('workspace_id', membership.workspace_id)
    .order('created_at', { ascending: false })

  const contacts = (contactsRaw ?? []) as SageContact[]

  return <ContactsClient contacts={contacts} />
}
