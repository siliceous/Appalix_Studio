'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { triageCreateLead, triageCreateTicket } from './sage-triage'
import type { ConvRow } from '@/app/(dashboard)/conversations/page'

async function logConversationActivity(
  workspaceId: string, userId: string, conversationId: string,
  eventType: string, payload: Record<string, unknown> = {},
) {
  const admin = createAdminClient()
  await admin.from('sage_activity_log').insert({
    workspace_id: workspaceId,
    entity_type:  'conversation',
    entity_id:    conversationId,
    event_type:   eventType,
    payload,
    user_id:      userId,
  })
}

export async function deleteConversation(conversationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  const membership = membershipRaw as { workspace_id: string } | null
  if (!membership) throw new Error('Unauthorized')

  const admin = createAdminClient()
  const { error } = await admin
    .from('conversations')
    .delete()
    .eq('id', conversationId)
    .eq('workspace_id', membership.workspace_id)

  if (error) throw new Error(error.message)
}

export async function assignConversation(conversationId: string, assignedTo: string | null): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  const membership = membershipRaw as { workspace_id: string; role: string } | null
  if (!membership) return { error: 'Unauthorized' }

  // Only managers and above can assign conversations
  const { ROLE_RANK } = await import('@/lib/types')
  const callerRank = ROLE_RANK[membership.role as import('@/lib/types').WorkspaceMemberRole] ?? 0
  if (callerRank < ROLE_RANK.manager) return { error: 'Insufficient permissions' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('conversations')
    .update({ assigned_to: assignedTo } as never)
    .eq('id', conversationId)
    .eq('workspace_id', membership.workspace_id)

  if (error) return { error: error.message }
  void logConversationActivity(membership.workspace_id, user.id, conversationId, 'conversation_assigned', { assigned_to: assignedTo })
  return {}
}

export async function updateConversationStatus(conversationId: string, status: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  const membership = membershipRaw as { workspace_id: string } | null
  if (!membership) return { error: 'Unauthorized' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('conversations')
    .update({ status } as never)
    .eq('id', conversationId)
    .eq('workspace_id', membership.workspace_id)

  if (error) return { error: error.message }
  void logConversationActivity(membership.workspace_id, user.id, conversationId, 'status_changed', { to: status })
  return {}
}

export async function updateConversationPriority(conversationId: string, priority: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  const membership = membershipRaw as { workspace_id: string } | null
  if (!membership) return { error: 'Unauthorized' }

  const admin = createAdminClient()
  const { data: convRow } = await (admin as any)
    .from('conversations')
    .select('title, ai_priority')
    .eq('id', conversationId)
    .eq('workspace_id', membership.workspace_id)
    .single()
  const convName    = (convRow as { title?: string | null; ai_priority?: string | null } | null)?.title ?? null
  const oldPriority = (convRow as { title?: string | null; ai_priority?: string | null } | null)?.ai_priority ?? null

  const { error } = await admin
    .from('conversations')
    .update({ ai_priority: priority } as never)
    .eq('id', conversationId)
    .eq('workspace_id', membership.workspace_id)

  if (error) return { error: error.message }

  void logConversationActivity(membership.workspace_id, user.id, conversationId, 'priority_changed', { from: oldPriority, to: priority, name: convName })
  return {}
}

export async function getConversationMessages(conversationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('messages')
    .select('id, role, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  return data as { id: string; role: string; content: string; created_at: string }[] | null
}

export async function renameConversation(conversationId: string, title: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  const membership = membershipRaw as { workspace_id: string } | null
  if (!membership) throw new Error('Unauthorized')

  const admin = createAdminClient()
  const { error } = await admin
    .from('conversations')
    .update({ title: title.trim() || null } as never)
    .eq('id', conversationId)
    .eq('workspace_id', membership.workspace_id)

  if (error) throw new Error(error.message)
  void logConversationActivity(membership.workspace_id, user.id, conversationId, 'conversation_renamed', { title: title.trim() || null })
}


export async function conversationCreateDeal(conv: ConvRow): Promise<{ error?: string }> {
  const name    = conv.ai_entities?.name  ?? conv.title ?? 'Unknown'
  const email   = conv.ai_entities?.email ?? ''
  const phone   = conv.ai_entities?.phone ?? undefined
  const company = conv.ai_entities?.company ?? undefined
  const result  = await triageCreateLead({
    name,
    email,
    phone,
    company,
    dealTitle: conv.title ? `${conv.title} — Chat` : 'Chat Inquiry',
    notes: conv.ai_summary ?? undefined,
    conversationId: conv.id,
    source: 'chat',
    productInterest: conv.ai_entities?.product_interest ?? undefined,
  })
  return result.error ? { error: result.error } : {}
}

export async function conversationCreateTicket(conv: ConvRow): Promise<{ error?: string }> {
  const name  = conv.ai_entities?.name  ?? conv.title ?? 'Unknown'
  const email = conv.ai_entities?.email ?? ''
  const result = await triageCreateTicket({
    title:        conv.title ? `Support: ${conv.title}` : 'Support Request',
    description:  conv.ai_summary ?? 'No details provided',
    contactEmail: email,
    contactName:  name,
    priority:     (conv.ai_priority as 'low' | 'medium' | 'high') ?? 'medium',
  })
  return result.error ? { error: result.error } : {}
}
