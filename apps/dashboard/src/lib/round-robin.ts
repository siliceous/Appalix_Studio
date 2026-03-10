import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Pick the next workspace member for round-robin lead assignment.
 *
 * - Returns null if rr_enabled is false, or there are no accepted members.
 * - Atomically increments rr_index on the workspace row so the next call
 *   gets the following member in rotation.
 * - Members are ordered by created_at (join order) for a stable sequence.
 */
export async function getRoundRobinAssignee(
  workspaceId: string,
  admin: SupabaseClient,
): Promise<string | null> {
  // 1. Check rr_enabled + current rr_index
  const { data: ws } = await admin
    .from('workspaces')
    .select('rr_enabled, rr_index')
    .eq('id', workspaceId)
    .single()

  if (!ws?.rr_enabled) return null

  // 2. Fetch accepted members in stable join order
  const { data: members } = await admin
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', workspaceId)
    .not('accepted_at', 'is', null)
    .order('created_at', { ascending: true })

  if (!members || members.length === 0) return null

  const currentIndex = (ws.rr_index ?? 0) % members.length
  const assignee = (members as { user_id: string }[])[currentIndex].user_id

  // 3. Advance index (keep accumulating — always mod at read time)
  await admin
    .from('workspaces')
    .update({ rr_index: (ws.rr_index ?? 0) + 1 })
    .eq('id', workspaceId)

  return assignee
}
