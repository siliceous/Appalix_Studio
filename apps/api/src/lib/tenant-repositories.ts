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
import type { WorkspaceContext } from './workspace-context'
import { MASTER_WORKSPACE_ID } from './workspace-context'

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )
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

  const { data, error } = await supabase
    .from('talking_actors')
    .select('*')
    .eq('is_active', true)
    .or(
      `and(workspace_id.eq.${context.workspaceId},is_global.eq.false),and(workspace_id.eq.${MASTER_WORKSPACE_ID},is_global.eq.true)`
    )
    .order('is_global', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error

  return data || []
}

/**
 * Get global actors (master workspace only)
 */
export async function getGlobalActors() {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('talking_actors')
    .select('*')
    .eq('workspace_id', MASTER_WORKSPACE_ID)
    .eq('is_global', true)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) throw error

  return data || []
}

export async function getActor(context: WorkspaceContext, actorId: string) {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('talking_actors')
    .select('*')
    .eq('id', actorId)
    .or(
      `and(workspace_id.eq.${context.workspaceId}),and(workspace_id.eq.${MASTER_WORKSPACE_ID},is_global.eq.true)`
    )
    .single()

  if (error) throw new Error(`Actor not found: ${actorId}`)
  return data
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
