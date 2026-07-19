/**
 * Storage Isolation Service
 *
 * Enforces workspace-scoped storage access control at the API layer.
 * Works in conjunction with Supabase Storage bucket structure:
 *   - Public bucket for permanent images: workspaces/{workspaceId}/...
 *   - Signed URLs for private content when needed
 *
 * SECURITY: All storage operations must be validated against user's workspace context
 */

import { createClient } from '@supabase/supabase-js'
import type { WorkspaceContext } from './workspace-context.js'

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )
}

/**
 * Storage path patterns by workspace
 */
export const STORAGE_PATHS = {
  // Image generation outputs (workspace-scoped, public)
  imageGenerations: (workspaceId: string) => `workspaces/${workspaceId}/images/generations`,

  // Video generation outputs (workspace-scoped, public)
  videoGenerations: (workspaceId: string) => `workspaces/${workspaceId}/videos/generations`,

  // Actor uploads (workspace-scoped)
  actorUploads: (workspaceId: string) => `workspaces/${workspaceId}/actors`,

  // Brand assets (workspace-scoped)
  brandAssets: (workspaceId: string) => `workspaces/${workspaceId}/brand`,

  // User uploads (workspace-scoped)
  userUploads: (workspaceId: string) => `workspaces/${workspaceId}/uploads`,

  // Temporary/scratch files (workspace-scoped, auto-deleted)
  temp: (workspaceId: string) => `workspaces/${workspaceId}/temp`,
}

/**
 * Validate that a storage path belongs to a workspace
 *
 * @param storagePath - Full path in storage bucket (e.g., "workspaces/abc123/images/...")
 * @param workspaceId - Workspace the user belongs to
 * @returns true if path belongs to the workspace
 */
export function isPathInWorkspace(storagePath: string, workspaceId: string): boolean {
  const workspacePrefix = `workspaces/${workspaceId}/`
  return storagePath.startsWith(workspacePrefix)
}

/**
 * Validate that multiple storage paths all belong to a workspace
 */
export function allPathsInWorkspace(storagePaths: string[], workspaceId: string): boolean {
  return storagePaths.every(path => isPathInWorkspace(path, workspaceId))
}

/**
 * Extract workspace ID from a storage path
 *
 * @param storagePath - Full path in storage bucket
 * @returns workspace ID or null if path format invalid
 */
export function getWorkspaceIdFromPath(storagePath: string): string | null {
  const match = storagePath.match(/^workspaces\/([^\/]+)\//)
  return match ? match[1] : null
}

/**
 * Generate a signed URL for accessing private storage objects
 * Signed URLs are time-limited and can be revoked
 *
 * @param context - User's workspace context
 * @param bucket - Storage bucket name
 * @param storagePath - Full path in bucket
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns Signed URL that expires after expiresIn seconds
 */
export async function generateSignedUrl(
  context: WorkspaceContext,
  bucket: string,
  storagePath: string,
  expiresIn: number = 3600
): Promise<string> {
  // SECURITY: Verify path belongs to user's workspace
  if (!isPathInWorkspace(storagePath, context.workspaceId)) {
    throw new Error(`Storage path does not belong to workspace: ${context.workspaceId}`)
  }

  const supabase = getSupabase()

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, expiresIn)

  if (error) {
    throw new Error(`Failed to generate signed URL: ${error.message}`)
  }

  return data.signedUrl
}

/**
 * Generate signed URLs for multiple objects (batch operation)
 */
export async function generateSignedUrls(
  context: WorkspaceContext,
  bucket: string,
  storagePaths: string[],
  expiresIn: number = 3600
): Promise<Map<string, string>> {
  // SECURITY: Verify all paths belong to user's workspace
  if (!allPathsInWorkspace(storagePaths, context.workspaceId)) {
    throw new Error('Not all storage paths belong to this workspace')
  }

  const supabase = getSupabase()
  const urls = new Map<string, string>()

  for (const path of storagePaths) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn)

    if (!error && data) {
      urls.set(path, data.signedUrl)
    }
  }

  return urls
}

/**
 * Delete storage objects (with workspace validation)
 */
export async function deleteStorageObject(
  context: WorkspaceContext,
  bucket: string,
  storagePath: string
): Promise<void> {
  // SECURITY: Verify path belongs to user's workspace
  if (!isPathInWorkspace(storagePath, context.workspaceId)) {
    throw new Error(`Cannot delete object outside workspace: ${context.workspaceId}`)
  }

  const supabase = getSupabase()

  const { error } = await supabase.storage
    .from(bucket)
    .remove([storagePath])

  if (error) {
    throw new Error(`Failed to delete storage object: ${error.message}`)
  }
}

/**
 * Batch delete storage objects (with workspace validation)
 */
export async function deleteStorageObjects(
  context: WorkspaceContext,
  bucket: string,
  storagePaths: string[]
): Promise<void> {
  // SECURITY: Verify all paths belong to user's workspace
  if (!allPathsInWorkspace(storagePaths, context.workspaceId)) {
    throw new Error('Not all storage paths belong to this workspace')
  }

  const supabase = getSupabase()

  const { error } = await supabase.storage
    .from(bucket)
    .remove(storagePaths)

  if (error) {
    throw new Error(`Failed to delete storage objects: ${error.message}`)
  }
}

/**
 * List files in a workspace storage directory
 */
export async function listStorageObjects(
  context: WorkspaceContext,
  bucket: string,
  prefix: string = ''
): Promise<Array<{ name: string; id: string; updated_at: string; metadata?: Record<string, any> }>> {
  // SECURITY: Verify prefix is within workspace path
  const workspacePath = `workspaces/${context.workspaceId}`
  const fullPrefix = prefix ? `${workspacePath}/${prefix}` : workspacePath

  if (!fullPrefix.startsWith(workspacePath)) {
    throw new Error(`Cannot list outside workspace: ${context.workspaceId}`)
  }

  const supabase = getSupabase()

  const { data, error } = await supabase.storage
    .from(bucket)
    .list(fullPrefix)

  if (error) {
    throw new Error(`Failed to list storage objects: ${error.message}`)
  }

  return data || []
}

/**
 * Get file metadata (size, last modified) with workspace validation
 */
export async function getStorageObjectMetadata(
  context: WorkspaceContext,
  bucket: string,
  storagePath: string
): Promise<{ size: number; updated_at: string; metadata?: Record<string, any> } | null> {
  // SECURITY: Verify path belongs to user's workspace
  if (!isPathInWorkspace(storagePath, context.workspaceId)) {
    throw new Error(`Cannot access storage object outside workspace: ${context.workspaceId}`)
  }

  const supabase = getSupabase()

  const { data, error } = await supabase.storage
    .from(bucket)
    .info()

  if (error) {
    console.error('Failed to get storage info:', error)
    return null
  }

  // Note: Supabase Storage API limitations mean we'd need to use object metadata
  // For now, this is a placeholder for future implementation
  // Real implementation would check file existence and size

  return {
    size: 0,
    updated_at: new Date().toISOString(),
  }
}

/**
 * Download file from storage (with workspace validation)
 * Returns buffer of file contents
 */
export async function downloadStorageObject(
  context: WorkspaceContext,
  bucket: string,
  storagePath: string
): Promise<Uint8Array> {
  // SECURITY: Verify path belongs to user's workspace
  if (!isPathInWorkspace(storagePath, context.workspaceId)) {
    throw new Error(`Cannot download from outside workspace: ${context.workspaceId}`)
  }

  const supabase = getSupabase()

  const { data, error } = await supabase.storage
    .from(bucket)
    .download(storagePath)

  if (error) {
    throw new Error(`Failed to download storage object: ${error.message}`)
  }

  return data
}

/**
 * Copy file within same workspace (for duplicating assets)
 */
export async function copyStorageObject(
  context: WorkspaceContext,
  bucket: string,
  sourceStoragePath: string,
  destStoragePath: string
): Promise<void> {
  // SECURITY: Verify both paths belong to user's workspace
  if (!isPathInWorkspace(sourceStoragePath, context.workspaceId)) {
    throw new Error(`Source path outside workspace: ${context.workspaceId}`)
  }

  if (!isPathInWorkspace(destStoragePath, context.workspaceId)) {
    throw new Error(`Destination path outside workspace: ${context.workspaceId}`)
  }

  const supabase = getSupabase()

  // Download source
  const { data: fileData, error: downloadError } = await supabase.storage
    .from(bucket)
    .download(sourceStoragePath)

  if (downloadError) {
    throw new Error(`Failed to download source: ${downloadError.message}`)
  }

  // Upload to destination
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(destStoragePath, fileData, { upsert: false })

  if (uploadError) {
    throw new Error(`Failed to upload to destination: ${uploadError.message}`)
  }
}

/**
 * Move file within same workspace (copy + delete)
 */
export async function moveStorageObject(
  context: WorkspaceContext,
  bucket: string,
  sourceStoragePath: string,
  destStoragePath: string
): Promise<void> {
  // Copy to destination
  await copyStorageObject(context, bucket, sourceStoragePath, destStoragePath)

  // Delete source
  await deleteStorageObject(context, bucket, sourceStoragePath)
}

/**
 * Generate public URL for workspace-scoped permanent files
 * (Does not require signing, works for public buckets)
 */
export function generatePublicUrl(
  workspaceId: string,
  bucket: string,
  storagePath: string
): string {
  // Verify path format before generating URL
  if (!isPathInWorkspace(storagePath, workspaceId)) {
    throw new Error(`Storage path does not belong to workspace: ${workspaceId}`)
  }

  const supabaseUrl = process.env.SUPABASE_URL
  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL environment variable not set')
  }

  // Extract project ID from Supabase URL (https://projectid.supabase.co)
  const projectId = supabaseUrl.split('//')[1].split('.')[0]

  return `https://${projectId}.supabase.co/storage/v1/object/public/${bucket}/${storagePath}`
}

/**
 * Validate that a public URL belongs to the user's workspace
 */
export function isPublicUrlFromWorkspace(url: string, workspaceId: string): boolean {
  const supabaseUrl = process.env.SUPABASE_URL
  if (!supabaseUrl) return false

  const projectId = supabaseUrl.split('//')[1].split('.')[0]
  const expectedPrefix = `https://${projectId}.supabase.co/storage/v1/object/public/`

  if (!url.startsWith(expectedPrefix)) return false

  // Extract storage path from URL
  const pathPart = url.substring(expectedPrefix.length)
  // Format: bucket/workspaces/{workspaceId}/...
  const workspacePath = `workspaces/${workspaceId}/`

  return pathPart.includes(workspacePath)
}
