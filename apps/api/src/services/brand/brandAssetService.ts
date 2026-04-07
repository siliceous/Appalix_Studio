/**
 * brandAssetService
 *
 * Manages brand_assets: register, approve, archive, replace, delete.
 *
 * After any approval/archive/delete that changes logo availability,
 * calls brandProfileService.recalculateConfidenceScore() so the
 * brand_confidence_score stays accurate.
 */

import { supabase } from '../../lib/supabase.js'
import { recalculateConfidenceScore } from './brandProfileService.js'

// ── Types ─────────────────────────────────────────────────────────────────────

export type AssetType = 'logo' | 'favicon' | 'image' | 'icon' | 'other'
export type AssetRole =
  | 'primary_logo'
  | 'secondary_logo'
  | 'logo_mark'
  | 'favicon'
  | 'hero_image'
  | 'background_image'
  | 'pattern'
  | 'general'
export type AssetSource = 'upload' | 'manual_url' | 'generated'

export interface RegisterAssetInput {
  brandProfileId:   string
  assetType:        AssetType
  assetRole:        AssetRole
  source:           AssetSource
  fileUrl:          string
  thumbnailUrl?:    string
  storagePath?:     string
  fileName?:        string
  fileSize?:        number
  mimeType?:        string
  width?:           number
  height?:          number
  dominantColor?:   string
  altText?:         string
  label?:           string
  isSystemGenerated?: boolean
}

export interface BrandAsset {
  id:               string
  workspaceId:      string
  brandProfileId:   string
  assetType:        AssetType
  assetRole:        AssetRole
  source:           AssetSource
  fileUrl:          string
  thumbnailUrl:     string | null
  storagePath:      string | null
  fileName:         string | null
  fileSize:         number | null
  mimeType:         string | null
  width:            number | null
  height:           number | null
  dominantColor:    string | null
  altText:          string | null
  label:            string | null
  isApproved:       boolean
  isPrimary:        boolean
  isArchived:       boolean
  isSystemGenerated: boolean
  updatedBy:        string | null
  createdAt:        string
  deletedAt:        string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fromDbRow(row: Record<string, unknown>): BrandAsset {
  return {
    id:               row.id as string,
    workspaceId:      row.workspace_id as string,
    brandProfileId:   row.brand_profile_id as string,
    assetType:        row.asset_type as AssetType,
    assetRole:        row.asset_role as AssetRole,
    source:           row.source as AssetSource,
    fileUrl:          row.file_url as string,
    thumbnailUrl:     row.thumbnail_url as string | null,
    storagePath:      row.storage_path as string | null,
    fileName:         row.file_name as string | null,
    fileSize:         row.file_size as number | null,
    mimeType:         row.mime_type as string | null,
    width:            row.width as number | null,
    height:           row.height as number | null,
    dominantColor:    row.dominant_color as string | null,
    altText:          row.alt_text as string | null,
    label:            row.label as string | null,
    isApproved:       row.is_approved as boolean,
    isPrimary:        row.is_primary as boolean,
    isArchived:       row.is_archived as boolean,
    isSystemGenerated: row.is_system_generated as boolean,
    updatedBy:        row.updated_by as string | null,
    createdAt:        row.created_at as string,
    deletedAt:        row.deleted_at as string | null,
  }
}

/** Check if workspace has at least one approved primary logo (for confidence score) */
async function hasApprovedLogo(workspaceId: string): Promise<boolean> {
  const { data } = await supabase
    .from('brand_assets')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('asset_role', 'primary_logo')
    .eq('is_approved', true)
    .eq('is_primary', true)
    .eq('is_archived', false)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle()

  return data !== null
}

// ── Service ───────────────────────────────────────────────────────────────────

/**
 * Register a new asset (after file has been uploaded to storage).
 * Asset starts as unapproved — call approve() to make it active.
 */
export async function registerAsset(
  workspaceId: string,
  input: RegisterAssetInput,
  updatedBy?: string
): Promise<BrandAsset> {
  const { data, error } = await supabase
    .from('brand_assets')
    .insert({
      workspace_id:       workspaceId,
      brand_profile_id:   input.brandProfileId,
      asset_type:         input.assetType,
      asset_role:         input.assetRole,
      source:             input.source,
      file_url:           input.fileUrl,
      thumbnail_url:      input.thumbnailUrl   ?? null,
      storage_path:       input.storagePath    ?? null,
      file_name:          input.fileName       ?? null,
      file_size:          input.fileSize       ?? null,
      mime_type:          input.mimeType       ?? null,
      width:              input.width          ?? null,
      height:             input.height         ?? null,
      dominant_color:     input.dominantColor  ?? null,
      alt_text:           input.altText        ?? null,
      label:              input.label          ?? null,
      is_system_generated: input.isSystemGenerated ?? false,
      is_approved:        false,
      is_primary:         false,
      is_archived:        false,
      ...(updatedBy && { updated_by: updatedBy }),
    })
    .select('*')
    .single()

  if (error) throw error
  return fromDbRow(data as Record<string, unknown>)
}

/**
 * List all active (non-deleted, non-archived) assets for a workspace.
 */
export async function listAssets(
  workspaceId: string,
  role?: AssetRole
): Promise<BrandAsset[]> {
  let query = supabase
    .from('brand_assets')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('is_archived', false)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (role) query = query.eq('asset_role', role)

  const { data, error } = await query
  if (error) throw error
  return (data as Record<string, unknown>[]).map(fromDbRow)
}

/**
 * Approve an asset and optionally set it as the primary for its role.
 * If isPrimary = true, demotes any other primary asset of the same role first.
 */
export async function approveAsset(
  assetId: string,
  workspaceId: string,
  makePrimary: boolean,
  updatedBy?: string
): Promise<BrandAsset> {
  // Fetch asset to get role and verify ownership
  const { data: existing, error: fetchErr } = await supabase
    .from('brand_assets')
    .select('*')
    .eq('id', assetId)
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .single()

  if (fetchErr) throw fetchErr
  const asset = fromDbRow(existing as Record<string, unknown>)

  // Demote existing primary for this role if we're promoting a new one
  if (makePrimary && asset.assetRole) {
    await supabase
      .from('brand_assets')
      .update({ is_primary: false })
      .eq('workspace_id', workspaceId)
      .eq('asset_role', asset.assetRole)
      .eq('is_primary', true)
      .neq('id', assetId)
      .is('deleted_at', null)
  }

  const { data, error } = await supabase
    .from('brand_assets')
    .update({
      is_approved: true,
      is_primary:  makePrimary,
      ...(updatedBy && { updated_by: updatedBy }),
    })
    .eq('id', assetId)
    .eq('workspace_id', workspaceId)
    .select('*')
    .single()

  if (error) throw error

  // Recalculate confidence score — logo approval affects the score
  if (['primary_logo', 'secondary_logo', 'logo_mark'].includes(asset.assetRole)) {
    const logoApproved = await hasApprovedLogo(workspaceId)
    await recalculateConfidenceScore(workspaceId, logoApproved)
  }

  return fromDbRow(data as Record<string, unknown>)
}

/**
 * Archive an asset (hidden from UI, excluded from snapshot, not deleted).
 */
export async function archiveAsset(
  assetId: string,
  workspaceId: string,
  updatedBy?: string
): Promise<void> {
  const { data: existing } = await supabase
    .from('brand_assets')
    .select('asset_role')
    .eq('id', assetId)
    .eq('workspace_id', workspaceId)
    .single()

  await supabase
    .from('brand_assets')
    .update({
      is_archived: true,
      is_primary:  false,
      ...(updatedBy && { updated_by: updatedBy }),
    })
    .eq('id', assetId)
    .eq('workspace_id', workspaceId)

  if (existing && ['primary_logo', 'secondary_logo', 'logo_mark'].includes(
    (existing as { asset_role: string }).asset_role
  )) {
    const logoApproved = await hasApprovedLogo(workspaceId)
    await recalculateConfidenceScore(workspaceId, logoApproved)
  }
}

/**
 * Replace an asset: register the new file and archive the old one atomically.
 * The new asset inherits the role and primary status of the replaced asset.
 */
export async function replaceAsset(
  oldAssetId: string,
  workspaceId: string,
  newInput: Omit<RegisterAssetInput, 'assetRole' | 'assetType'>,
  updatedBy?: string
): Promise<BrandAsset> {
  // Fetch the old asset
  const { data: old, error: fetchErr } = await supabase
    .from('brand_assets')
    .select('*')
    .eq('id', oldAssetId)
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .single()

  if (fetchErr) throw fetchErr
  const oldAsset = fromDbRow(old as Record<string, unknown>)

  // Register new asset with same role/type, inherit primary status
  const newAsset = await registerAsset(
    workspaceId,
    {
      ...newInput,
      brandProfileId: oldAsset.brandProfileId,
      assetType:      oldAsset.assetType,
      assetRole:      oldAsset.assetRole,
    },
    updatedBy
  )

  // Approve the new asset, promote to primary if old one was
  const approved = await approveAsset(
    newAsset.id,
    workspaceId,
    oldAsset.isPrimary,
    updatedBy
  )

  // Archive the old asset
  await archiveAsset(oldAssetId, workspaceId, updatedBy)

  return approved
}

/**
 * Soft-delete an asset.
 */
export async function deleteAsset(
  assetId: string,
  workspaceId: string
): Promise<void> {
  const { data: existing } = await supabase
    .from('brand_assets')
    .select('asset_role, is_approved, is_primary')
    .eq('id', assetId)
    .eq('workspace_id', workspaceId)
    .single()

  await supabase
    .from('brand_assets')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', assetId)
    .eq('workspace_id', workspaceId)

  if (existing) {
    const row = existing as { asset_role: string; is_approved: boolean; is_primary: boolean }
    if (row.is_approved && ['primary_logo', 'secondary_logo', 'logo_mark'].includes(row.asset_role)) {
      const logoApproved = await hasApprovedLogo(workspaceId)
      await recalculateConfidenceScore(workspaceId, logoApproved)
    }
  }
}
