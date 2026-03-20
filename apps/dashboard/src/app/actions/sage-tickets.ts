'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import Anthropic from '@anthropic-ai/sdk'
import type { SageTicket, SageContact, SageTicketActivity } from '@/lib/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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

export async function analyzeTicket(ticketId: string): Promise<{ summary: string } | { error: string }> {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  const { data: raw } = await admin
    .from('sage_tickets')
    .select('*, contact:sage_contacts(id, name, email)')
    .eq('id', ticketId)
    .eq('workspace_id', workspaceId)
    .single()

  if (!raw) return { error: 'Ticket not found' }
  const t = raw as SageTicket & { contact: Pick<SageContact, 'id' | 'name' | 'email'> | null }

  const { data: activitiesRaw } = await admin
    .from('sage_ticket_activities')
    .select('type, title, body, due_at, completed_at, created_at')
    .eq('ticket_id', ticketId)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(10)

  const activities = (activitiesRaw ?? []) as Pick<SageTicketActivity, 'type' | 'title' | 'body' | 'due_at' | 'completed_at' | 'created_at'>[]

  const lines = [
    `Title: ${t.title}`,
    t.description     ? `Description: ${t.description}`            : null,
    `Status: ${t.status}`,
    `Priority: ${t.priority}`,
    (t.name ?? t.contact?.name) ? `Customer: ${t.name ?? t.contact?.name}` : null,
    (t.email ?? t.contact?.email) ? `Email: ${t.email ?? t.contact?.email}` : null,
    t.phone           ? `Phone: ${t.phone}`                        : null,
    t.contact_method  ? `Contact method: ${t.contact_method}`      : null,
    t.occurred_at     ? `Issue occurred: ${new Date(t.occurred_at).toLocaleString()}` : null,
    activities.length ? `\nActivity log (${activities.length} entries):\n` +
      activities.map(a => `- [${a.type}] ${a.title ?? ''} ${a.body ?? ''} ${a.completed_at ? '(done)' : a.due_at ? `(due ${new Date(a.due_at).toLocaleDateString()})` : ''}`.trim()).join('\n')
      : null,
  ].filter(Boolean).join('\n')

  try {
    const response = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{
        role:    'user',
        content: `You are a support team analyst. Based on the ticket details below, write a brief 3–5 sentence AI summary covering:
1. What the customer's issue is and its urgency
2. Current progress based on the activity log
3. Recommended next action for the support agent

Ticket details:
${lines}

Be concise and actionable. No headings, no bullet points — just a short paragraph.`,
      }],
    })

    const summary = (response.content[0] as { type: string; text: string }).text?.trim() ?? ''
    return { summary }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'AI analysis failed' }
  }
}
