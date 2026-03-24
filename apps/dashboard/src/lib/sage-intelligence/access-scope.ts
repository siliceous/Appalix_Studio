'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { ROLE_RANK } from '@/lib/types'
import type { WorkspaceMemberRole } from '@/lib/types'
import type { SageAccessScope } from './types'

/**
 * Compute what data this user can see in Sage queries.
 *
 * Hierarchy rules:
 *   owner / admin  (rank 4-5): see ALL workspace data
 *   manager        (rank 3):   see own + employees' data (rank < 3 assigned to them)
 *   employee/member (rank 2):  see only data assigned to themselves + visibility='everyone'
 *   viewer         (rank 1):   read-only, visibility='everyone' only
 */
export async function computeAccessScope(workspaceId: string): Promise<SageAccessScope | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: memberRaw } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  const role = (memberRaw as { role: WorkspaceMemberRole } | null)?.role ?? 'viewer'
  const rank = ROLE_RANK[role] ?? 1

  const canSeeAll  = rank >= 4  // owner, admin
  const canSeeTeam = rank >= 3  // manager+

  let visibleUserIds: string[] = [user.id]
  let assignedToFilter: string[] | null = [user.id]

  if (canSeeAll) {
    // Fetch all workspace member IDs
    const admin = createAdminClient()
    const { data: members } = await admin
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', workspaceId)
      .not('accepted_at', 'is', null)
    visibleUserIds    = (members ?? []).map((m: { user_id: string }) => m.user_id)
    assignedToFilter  = null // no filter
  } else if (canSeeTeam) {
    // Manager sees employees (rank < 3)
    const admin = createAdminClient()
    const { data: members } = await admin
      .from('workspace_members')
      .select('user_id, role')
      .eq('workspace_id', workspaceId)
      .not('accepted_at', 'is', null)
    const lowerMembers = (members ?? [])
      .filter((m: { user_id: string; role: WorkspaceMemberRole }) =>
        (ROLE_RANK[m.role] ?? 1) < rank
      )
      .map((m: { user_id: string }) => m.user_id)
    visibleUserIds   = [user.id, ...lowerMembers]
    assignedToFilter = [user.id, ...lowerMembers]
  }

  return {
    userId:           user.id,
    workspaceId,
    role,
    rank,
    canSeeAll,
    canSeeTeam,
    assignedToFilter,
    visibleUserIds,
  }
}
