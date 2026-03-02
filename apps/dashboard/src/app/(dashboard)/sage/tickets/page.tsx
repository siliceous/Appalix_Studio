import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TicketsClient } from './tickets-client'
import type { Metadata } from 'next'
import type { WorkspaceMember, SageTicket, SageContact } from '@/lib/types'

export const metadata: Metadata = { title: 'Tickets · Sage' }

export default async function TicketsPage() {
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
  const workspaceId = membership.workspace_id

  const [{ data: ticketsRaw }, { data: contactsRaw }] = await Promise.all([
    supabase
      .from('sage_tickets')
      .select('id, title, description, status, priority, created_at, contact:sage_contacts(id, name, email)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false }),
    supabase
      .from('sage_contacts')
      .select('id, name')
      .eq('workspace_id', workspaceId)
      .order('name'),
  ])

  const tickets  = (ticketsRaw  ?? []) as (SageTicket & { contact: Pick<SageContact, 'id' | 'name' | 'email'> | null })[]
  const contacts = (contactsRaw ?? []) as Pick<SageContact, 'id' | 'name'>[]

  return <TicketsClient tickets={tickets} contacts={contacts} />
}
