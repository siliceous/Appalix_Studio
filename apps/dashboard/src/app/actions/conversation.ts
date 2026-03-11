'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'

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
}
