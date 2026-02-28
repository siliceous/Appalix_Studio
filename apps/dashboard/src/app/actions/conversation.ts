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

export async function renameConversation(conversationId: string, title: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
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
