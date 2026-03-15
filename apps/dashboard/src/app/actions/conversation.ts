'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'

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

  const { error } = await supabase
    .from('conversations')
    .update({ ai_priority: priority } as never)
    .eq('id', conversationId)
    .eq('workspace_id', membership.workspace_id)

  if (error) return { error: error.message }
  void logConversationActivity(membership.workspace_id, user.id, conversationId, 'priority_changed', { priority })
  return {}
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

  const { error } = await supabase
    .from('conversations')
    .update({ title: title.trim() || null } as never)
    .eq('id', conversationId)
    .eq('workspace_id', membership.workspace_id)

  if (error) throw new Error(error.message)
  void logConversationActivity(membership.workspace_id, user.id, conversationId, 'conversation_renamed', { title: title.trim() || null })
}
