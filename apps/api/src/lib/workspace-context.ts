/**
 * Workspace Context Helper
 *
 * Provides secure, tenant-aware access to the current user's workspace context.
 * This is the ONLY source of truth for workspace identity.
 *
 * CRITICAL: Never trust workspace ID from frontend/request body alone.
 * Always resolve from authenticated session + workspace membership.
 */

import type { FastifyRequest } from 'fastify'
import { createClient } from '@supabase/supabase-js'

export const MASTER_WORKSPACE_ID = process.env.MASTER_WORKSPACE_ID || ''
export const MASTER_ADMIN_EMAIL = process.env.MASTER_ADMIN_EMAIL || 'info@gorank.com.au'

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer'

export interface WorkspaceContext {
  userId: string
  workspaceId: string
  role: WorkspaceRole
  isMasterWorkspace: boolean
  isAdmin: boolean
}

/**
 * Get current workspace context from authenticated request
 *
 * SECURITY: This validates workspace membership from database,
 * ensuring user actually has access to the workspace.
 *
 * @param request - FastifyRequest with auth session
 * @returns WorkspaceContext with validated workspace access
 * @throws UnauthorizedError if user not authenticated or not member of workspace
 */
export async function getCurrentWorkspaceContext(
  request: FastifyRequest
): Promise<WorkspaceContext> {
  try {
    // Get user from Supabase auth (via JWT token)
    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Missing or invalid authorization header')
    }

    const token = authHeader.substring(7)

    // Verify token and extract user ID
    const supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      throw new Error('Invalid or expired token')
    }

    // Get workspace ID from header (this is a hint, not authoritative)
    const workspaceId = request.headers['x-workspace-id'] as string
    if (!workspaceId) {
      throw new Error('Missing x-workspace-id header')
    }

    // CRITICAL: Verify user is actually a member of this workspace
    const { data: membership, error: memberError } = await supabase
      .from('workspace_members')
      .select('role, user_id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single()

    if (memberError || !membership) {
      throw new Error('User is not a member of this workspace')
    }

    const role = (membership.role as WorkspaceRole) || 'member'
    const isAdmin = role === 'admin' || role === 'owner'

    // Check if workspace owner is a master workspace account
    let isMasterWorkspace = false
    const { data: owner } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', workspaceId)
      .eq('role', 'owner')
      .single()

    if (owner?.user_id) {
      const { data: { user: ownerUser } } = await supabase.auth.admin.getUserById(owner.user_id)
      if (ownerUser && (ownerUser.email === 'info@gorank.com.au' || ownerUser.email === 'sales@appalix.ai')) {
        isMasterWorkspace = true
      }
    }

    return {
      userId: user.id,
      workspaceId,
      role,
      isMasterWorkspace,
      isAdmin,
    }
  } catch (error) {
    console.error('[WorkspaceContext] Error resolving context:', error)
    throw new Error(`Unauthorized: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get workspace by ID (admin use only)
 *
 * Used by admin functions to fetch workspace metadata
 */
export async function getWorkspaceById(workspaceId: string) {
  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )

  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', workspaceId)
    .single()

  if (error || !data) {
    throw new Error(`Workspace not found: ${workspaceId}`)
  }

  return data
}

/**
 * Check if workspace is the master workspace
 */
export function isMasterWorkspace(workspaceId: string): boolean {
  return workspaceId === MASTER_WORKSPACE_ID
}

/**
 * Check if user has admin-level access in a workspace
 */
export function hasAdminAccess(context: WorkspaceContext): boolean {
  return context.isAdmin
}

/**
 * Check if user can perform master-only operations
 * (e.g., publish global actors)
 */
export function canPerformMasterOperation(context: WorkspaceContext): boolean {
  return context.isMasterWorkspace && context.isAdmin
}

/**
 * Assert user has required role in current workspace
 */
export function assertRole(context: WorkspaceContext, requiredRole: WorkspaceRole) {
  const roleHierarchy: Record<WorkspaceRole, number> = {
    owner: 4,
    admin: 3,
    member: 2,
    viewer: 1,
  }

  if (roleHierarchy[context.role] < roleHierarchy[requiredRole]) {
    throw new Error(
      `Insufficient permissions. Required: ${requiredRole}, Got: ${context.role}`
    )
  }
}
