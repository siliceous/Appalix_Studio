/**
 * Tenant-Safe Repository Functions
 *
 * These functions provide workspace-scoped data access.
 * EVERY query MUST filter by workspaceId to prevent cross-tenant data leakage.
 *
 * Pattern: Never use findMany() without workspace filter.
 * Always: where: { workspaceId: context.workspaceId, ... }
 */

import { createClient } from '@supabase/supabase-js'
import type { WorkspaceContext } from './workspace-context.js'
import { MASTER_WORKSPACE_ID } from './workspace-context.js'

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )
}

/**
 * Get master workspace ID dynamically by looking up info@gorank.com.au workspace
 * Fallback to MASTER_WORKSPACE_ID env var if available
 */
export async function getMasterWorkspaceId(): Promise<string> {
  if (MASTER_WORKSPACE_ID) {
    return MASTER_WORKSPACE_ID
  }

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_email', 'info@gorank.com.au')
    .single()

  if (error || !data) {
    console.error('[getMasterWorkspaceId] Failed to find master workspace:', error)
    return ''
  }

  return data.id
}

/**
 * Get all master workspace IDs (info@gorank.com.au and sales@appalix.ai)
 * These workspaces can publish global actors
 */
export async function getMasterWorkspaceIds(): Promise<string[]> {
  const supabase = getSupabase()

  try {
    // Get all workspace owners
    const { data: owners, error: ownersError } = await supabase
      .from('workspace_members')
      .select('workspace_id, user_id')
      .eq('role', 'owner')

    if (ownersError) {
      console.error('[getMasterWorkspaceIds] Error fetching owners:', ownersError)
      return []
    }

    if (!owners || owners.length === 0) {
      console.warn('[getMasterWorkspaceIds] No workspace owners found')
      return []
    }

    // Filter for master accounts by checking email
    const masterWorkspaceIds: string[] = []
    for (const owner of owners) {
      try {
        const { data: { user } } = await supabase.auth.admin.getUserById(owner.user_id)
        if (user && (user.email === 'info@gorank.com.au' || user.email === 'sales@appalix.ai')) {
          masterWorkspaceIds.push(owner.workspace_id)
          console.log('[getMasterWorkspaceIds] Found master workspace:', owner.workspace_id, 'owner:', user.email)
        }
      } catch (e) {
        console.error('[getMasterWorkspaceIds] Error checking user:', owner.user_id, e)
      }
    }

    console.log('[getMasterWorkspaceIds] Found', masterWorkspaceIds.length, 'master workspaces:', masterWorkspaceIds)
    return masterWorkspaceIds
  } catch (e) {
    console.error('[getMasterWorkspaceIds] Unexpected error:', e)
    return []
  }
}

// ============================================================================
// Assets & Media
// ============================================================================

export async function getWorkspaceAssets(
  context: WorkspaceContext,
  filters?: {
    type?: string
    projectId?: string
    limit?: number
    offset?: number
  }
) {
  const supabase = getSupabase()

  let query = supabase
    .from('asset')
    .select('*', { count: 'exact' })
    .eq('workspace_id', context.workspaceId)

  if (filters?.type) {
    query = query.eq('type', filters.type)
  }

  if (filters?.projectId) {
    query = query.eq('project_id', filters.projectId)
  }

  query = query
    .order('created_at', { ascending: false })
    .limit(filters?.limit || 100)
    .offset(filters?.offset || 0)

  const { data, error, count } = await query

  if (error) throw error

  return {
    assets: data || [],
    total: count || 0,
  }
}

export async function getAsset(context: WorkspaceContext, assetId: string) {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('asset')
    .select('*')
    .eq('id', assetId)
    .eq('workspace_id', context.workspaceId)
    .single()

  if (error) throw new Error(`Asset not found: ${assetId}`)
  return data
}

export async function deleteAsset(context: WorkspaceContext, assetId: string) {
  const supabase = getSupabase()

  // Verify asset belongs to user's workspace
  const asset = await getAsset(context, assetId)

  // Delete from storage if path exists
  if (asset.storage_key) {
    await supabase.storage.from('workspace-assets').remove([asset.storage_key])
  }

  // Delete database record
  const { error } = await supabase
    .from('asset')
    .delete()
    .eq('id', assetId)
    .eq('workspace_id', context.workspaceId)

  if (error) throw error
}

// ============================================================================
// Projects
// ============================================================================

export async function getWorkspaceProjects(
  context: WorkspaceContext,
  filters?: {
    limit?: number
    offset?: number
  }
) {
  const supabase = getSupabase()

  const { data, error, count } = await supabase
    .from('project')
    .select('*', { count: 'exact' })
    .eq('workspace_id', context.workspaceId)
    .order('created_at', { ascending: false })
    .limit(filters?.limit || 100)
    .offset(filters?.offset || 0)

  if (error) throw error

  return {
    projects: data || [],
    total: count || 0,
  }
}

export async function getProject(context: WorkspaceContext, projectId: string) {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('project')
    .select('*')
    .eq('id', projectId)
    .eq('workspace_id', context.workspaceId)
    .single()

  if (error) throw new Error(`Project not found: ${projectId}`)
  return data
}

// ============================================================================
// Generations (Image & Video)
// ============================================================================

export async function getGenerations(
  context: WorkspaceContext,
  filters?: {
    type?: 'image' | 'video'
    projectId?: string
    limit?: number
    offset?: number
  }
) {
  const supabase = getSupabase()

  let query = supabase
    .from('generation')
    .select('*', { count: 'exact' })
    .eq('workspace_id', context.workspaceId)

  if (filters?.type) {
    query = query.eq('type', filters.type)
  }

  if (filters?.projectId) {
    query = query.eq('project_id', filters.projectId)
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .limit(filters?.limit || 100)
    .offset(filters?.offset || 0)

  if (error) throw error

  return {
    generations: data || [],
    total: count || 0,
  }
}

// ============================================================================
// Talking Actors
// ============================================================================

export async function getWorkspaceActors(context: WorkspaceContext) {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('talking_actors')
    .select('*')
    .eq('workspace_id', context.workspaceId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) throw error

  return data || []
}

/**
 * Get actors available to a workspace:
 * - Private actors from current workspace
 * - Global actors from master workspace
 */
export async function getAvailableActors(context: WorkspaceContext) {
  const supabase = getSupabase()
  const masterWorkspaceIds = await getMasterWorkspaceIds()

  // Fetch private actors from current workspace
  const { data: privateActors, error: privateError } = await supabase
    .from('talking_actors')
    .select('*')
    .eq('workspace_id', context.workspaceId)
    .eq('is_global', false)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (privateError) throw privateError

  // Fetch global actors from all master workspaces
  const { data: globalActors, error: globalError } = await supabase
    .from('talking_actors')
    .select('*')
    .in('workspace_id', masterWorkspaceIds)
    .eq('is_global', true)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (globalError) throw globalError

  // Combine and sort: global actors first, then by creation date
  const allActors = [...(globalActors || []), ...(privateActors || [])]
  return allActors
}

/**
 * Get global actors (master workspace only)
 */
export async function getGlobalActors() {
  const supabase = getSupabase()
  const masterWorkspaceIds = await getMasterWorkspaceIds()

  const { data, error } = await supabase
    .from('talking_actors')
    .select('*')
    .in('workspace_id', masterWorkspaceIds)
    .eq('is_global', true)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) throw error

  return data || []
}

export async function getActor(context: WorkspaceContext, actorId: string) {
  const supabase = getSupabase()
  const masterWorkspaceIds = await getMasterWorkspaceIds()

  // First try user's own workspace (private actors)
  const { data: ownActor, error: ownError } = await supabase
    .from('talking_actors')
    .select('*')
    .eq('id', actorId)
    .eq('workspace_id', context.workspaceId)
    .single()

  if (ownActor) return ownActor

  // If not found, try master workspaces (global actors)
  const { data: globalActor, error: globalError } = await supabase
    .from('talking_actors')
    .select('*')
    .eq('id', actorId)
    .eq('is_global', true)
    .in('workspace_id', masterWorkspaceIds)
    .single()

  if (globalActor) return globalActor

  throw new Error(`Actor not found: ${actorId}`)
}

// ============================================================================
// Brand Assets
// ============================================================================

export async function getBrandProfile(context: WorkspaceContext) {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('brand_profiles')
    .select('*')
    .eq('workspace_id', context.workspaceId)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned
    throw error
  }

  return data || null
}

export async function getBrandAssets(context: WorkspaceContext) {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('brand_assets')
    .select('*')
    .eq('workspace_id', context.workspaceId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return data || []
}

// ============================================================================
// Forms & Submissions
// ============================================================================

export async function getWorkspaceForms(context: WorkspaceContext) {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('brand_forms')
    .select('*')
    .eq('workspace_id', context.workspaceId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return data || []
}

export async function getFormSubmissions(
  context: WorkspaceContext,
  formId: string,
  filters?: {
    limit?: number
    offset?: number
  }
) {
  const supabase = getSupabase()

  const { data, error, count } = await supabase
    .from('sage_form_submissions')
    .select('*', { count: 'exact' })
    .eq('workspace_id', context.workspaceId)
    .eq('form_id', formId)
    .order('created_at', { ascending: false })
    .limit(filters?.limit || 100)
    .offset(filters?.offset || 0)

  if (error) throw error

  return {
    submissions: data || [],
    total: count || 0,
  }
}

// ============================================================================
// Count Functions (for analytics, rate limiting, etc)
// ============================================================================

export async function countWorkspaceAssets(
  context: WorkspaceContext,
  type?: string
) {
  const supabase = getSupabase()

  let query = supabase
    .from('asset')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', context.workspaceId)

  if (type) {
    query = query.eq('type', type)
  }

  const { count, error } = await query

  if (error) throw error
  return count || 0
}

export async function countGenerations(
  context: WorkspaceContext,
  type?: 'image' | 'video'
) {
  const supabase = getSupabase()

  let query = supabase
    .from('generation')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', context.workspaceId)

  if (type) {
    query = query.eq('type', type)
  }

  const { count, error } = await query

  if (error) throw error
  return count || 0
}
