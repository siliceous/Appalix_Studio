'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { SageTicketActivity } from '@/lib/types'

async function getWorkspaceId(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (!data) redirect('/login')
  return (data as { workspace_id: string }).workspace_id
}

export type TicketActivityType = 'note' | 'call' | 'meeting' | 'task'

export async function addTicketActivity(
  ticketId: string,
  type:     TicketActivityType,
  title?:   string,
  body?:    string,
  dueAt?:   string,
): Promise<{ error?: string }> {
  const workspaceId = await getWorkspaceId()
  const supabase    = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = createAdminClient()

  const { error } = await admin
    .from('sage_ticket_activities')
    .insert({
      workspace_id: workspaceId,
      ticket_id:    ticketId,
      type,
      title:        title?.trim() || null,
      body:         body?.trim()  || null,
      due_at:       dueAt         || null,
      created_by:   user?.id      ?? null,
    })

  if (error) return { error: error.message }

  // Also log to the activity audit log
  await admin.from('sage_activity_log').insert({
    workspace_id: workspaceId,
    entity_type:  'ticket',
    entity_id:    ticketId,
    event_type:   `${type}_added`,
    payload:      { type, title: title?.trim() || null, body: body?.trim() || null },
    user_id:      user?.id ?? null,
  })

  revalidatePath('/dashboard/tickets')
  revalidatePath('/sage/tickets')
  return {}
}

export async function getTicketActivities(ticketId: string): Promise<SageTicketActivity[]> {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  const { data } = await admin
    .from('sage_ticket_activities')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: false })

  return (data ?? []) as SageTicketActivity[]
}

export async function completeTicketTask(activityId: string): Promise<void> {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  await admin
    .from('sage_ticket_activities')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', activityId)
    .eq('workspace_id', workspaceId)

  revalidatePath('/dashboard/tickets')
}
