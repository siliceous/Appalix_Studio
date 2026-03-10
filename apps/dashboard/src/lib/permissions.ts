import { createAdminClient } from '@/lib/supabase/server'
import type { UserPermissions } from '@/lib/types'
import { DEFAULT_PERMISSIONS, ROLE_RANK } from '@/lib/types'
import type { WorkspaceMemberRole } from '@/lib/types'

/**
 * Returns the effective permissions for a user in a workspace.
 * Owners and admins always get full permissions — no DB lookup needed.
 * For all other roles, looks up workspace_permissions with DEFAULT_PERMISSIONS fallback.
 */
export async function getUserPermissions(
  userId: string,
  workspaceId: string,
  role: WorkspaceMemberRole,
): Promise<UserPermissions> {
  // Owners and admins are never restricted
  if ((ROLE_RANK[role] ?? 0) >= ROLE_RANK.admin) {
    return {
      can_view_contacts:  true,
      can_view_pipelines: true,
      can_view_projects:  true,
      can_view_dashboard: true,
      can_allocate_leads: true,
      can_reassign_leads: true,
      can_edit_deals:     true,
    }
  }

  const admin = createAdminClient()
  const { data } = await admin
    .from('workspace_permissions')
    .select('can_view_contacts, can_view_pipelines, can_view_projects, can_view_dashboard, can_allocate_leads, can_reassign_leads, can_edit_deals')
    .eq('workspace_id', workspaceId)
    .eq('target_user_id', userId)
    .maybeSingle()

  if (!data) return { ...DEFAULT_PERMISSIONS }
  return { ...DEFAULT_PERMISSIONS, ...data } as UserPermissions
}
