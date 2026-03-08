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
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  const membership  = membershipRaw as Pick<WorkspaceMember, 'workspace_id'> | null
  if (!membership) redirect('/login')
  const workspaceId = membership.workspace_id

  const [{ data: ticketsRaw }, { data: contactsRaw }] = await Promise.all([
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
  ])

  const tickets  = (ticketsRaw  ?? []) as (SageTicket & { contact: Pick<SageContact, 'id' | 'name' | 'email'> | null })[]
  const contacts = (contactsRaw ?? []) as Pick<SageContact, 'id' | 'name'>[]

  return <TicketsClient tickets={tickets} contacts={contacts} />
}
