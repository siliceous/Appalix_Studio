/**
 * brandPageService
 *
 * Storage and lifecycle for brand_pages.
 *
 * Generation flow (callers must follow this order):
 *   1. getSnapshotOrThrow(workspaceId)           → BrandSnapshot
 *   2. buildStrategy({ goal, snapshot, ... })    → WebsiteStrategy
 *   3. generatePage(strategy, snapshot)          → PageLayout
 *   4. generateSeo(strategy, snapshot)           → SeoData
 *   5. createPage({ workspaceId, snapshot, ... }) → BrandPage (saved)
 *
 * Sync model (hybrid):
 *   - brand_snapshot is frozen at creation time
 *   - user can trigger syncToBrand() to re-snapshot without regenerating copy
 *   - brand_version_at_last_sync tracks staleness for UI indicators
 */

import { supabase } from '../../lib/supabase.js'
import type { BrandSnapshot } from './brandSnapshotService.js'
import type { PageLayout, TrackerBootstrap } from './websiteGeneratorService.js'
import type { SeoData } from './seoService.js'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CreatePageInput {
  name:             string
  slug?:            string
  pageType?:        string
  usageContext?:    string[]
  isSystemGenerated?: boolean
  brandProfileId?:  string
  updatedBy?:       string
}

export interface BrandPage {
  id:                       string
  workspaceId:              string
  brandProfileId:           string | null
  name:                     string
  slug:                     string | null
  pageType:                 string | null
  brandSnapshot:            BrandSnapshot
  brandVersion:             number
  lastSyncedFromBrandAt:    string | null
  brandVersionAtLastSync:   number | null
  blocks:                   PageLayout['blocks']
  tracking:                 TrackerBootstrap
  seoJson:                  SeoData
  usageContext:             string[]
  isSystemGenerated:        boolean
  status:                   'draft' | 'published' | 'archived'
  updatedBy:                string | null
  createdAt:                string
  updatedAt:                string
  deletedAt:                string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fromDbRow(row: Record<string, unknown>): BrandPage {
  return {
    id:                     row.id as string,
    workspaceId:            row.workspace_id as string,
    brandProfileId:         row.brand_profile_id as string | null,
    name:                   row.name as string,
    slug:                   row.slug as string | null,
    pageType:               row.page_type as string | null,
    brandSnapshot:          row.brand_snapshot as BrandSnapshot,
    brandVersion:           row.brand_version as number,
    lastSyncedFromBrandAt:  row.last_synced_from_brand_at as string | null,
    brandVersionAtLastSync: row.brand_version_at_last_sync as number | null,
    blocks:                 row.blocks as PageLayout['blocks'],
    tracking:               { workspaceId: row.workspace_id as string, entityType: 'brand_page' as const, entityId: row.id as string },
    seoJson:                row.seo_json as SeoData,
    usageContext:           row.usage_context as string[],
    isSystemGenerated:      row.is_system_generated as boolean,
    status:                 row.status as BrandPage['status'],
    updatedBy:              row.updated_by as string | null,
    createdAt:              row.created_at as string,
    updatedAt:              row.updated_at as string,
    deletedAt:              row.deleted_at as string | null,
  }
}

// ── Service ───────────────────────────────────────────────────────────────────

/**
 * Persist a newly generated page (draft status).
 */
export async function createPage(
  workspaceId: string,
  snapshot: BrandSnapshot,
  layout: PageLayout,
  seoData: SeoData,
  input: CreatePageInput
): Promise<BrandPage> {
  const { data, error } = await supabase
    .from('brand_pages')
    .insert({
      workspace_id:             workspaceId,
      brand_profile_id:         input.brandProfileId             ?? null,
      name:                     input.name,
      slug:                     input.slug                       ?? null,
      page_type:                input.pageType                   ?? null,
      brand_snapshot:           snapshot,
      brand_version:            snapshot.brandVersion,
      last_synced_from_brand_at: null,
      brand_version_at_last_sync: null,
      blocks:                   layout.blocks,
      seo_json:                 seoData,
      usage_context:            input.usageContext               ?? [],
      is_system_generated:      input.isSystemGenerated          ?? true,
      status:                   'draft',
      updated_by:               input.updatedBy                  ?? null,
    })
    .select('*')
    .single()

  if (error) throw error
  return fromDbRow(data as Record<string, unknown>)
}

/**
 * Get a single page by ID.
 */
export async function getPage(pageId: string, workspaceId: string): Promise<BrandPage | null> {
  const { data, error } = await supabase
    .from('brand_pages')
    .select('*')
    .eq('id', pageId)
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw error
  if (!data)  return null
  return fromDbRow(data as Record<string, unknown>)
}

/**
 * List all active pages for a workspace.
 */
export async function listPages(
  workspaceId: string,
  usageContext?: string
): Promise<BrandPage[]> {
  let query = supabase
    .from('brand_pages')
    .select('*')
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (usageContext) {
    query = query.contains('usage_context', [usageContext])
  }

  const { data, error } = await query
  if (error) throw error
  return (data as Record<string, unknown>[]).map(fromDbRow)
}

/**
 * Update page blocks and/or SEO (user edits after generation).
 * Does not touch brand_snapshot — snapshot is only updated via syncToBrand().
 */
export async function updatePageContent(
  pageId: string,
  workspaceId: string,
  updates: {
    name?:         string
    blocks?:       PageLayout['blocks']
    seoJson?:      SeoData
    status?:       BrandPage['status']
    usageContext?: string[]
    updatedBy?:    string
  }
): Promise<BrandPage> {
  const { data, error } = await supabase
    .from('brand_pages')
    .update({
      ...(updates.name         !== undefined && { name:          updates.name }),
      ...(updates.blocks       !== undefined && { blocks:        updates.blocks }),
      ...(updates.seoJson      !== undefined && { seo_json:      updates.seoJson }),
      ...(updates.status       !== undefined && { status:        updates.status }),
      ...(updates.usageContext !== undefined && { usage_context: updates.usageContext }),
      ...(updates.updatedBy    !== undefined && { updated_by:    updates.updatedBy }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', pageId)
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .select('*')
    .single()

  if (error) throw error
  return fromDbRow(data as Record<string, unknown>)
}

/**
 * Sync the page's brand snapshot to the current brand state.
 * Updates brand_snapshot + brand_version + sync timestamp.
 * Does NOT regenerate blocks or SEO — that requires a full re-generation call.
 *
 * Used when user clicks "Sync to current brand" in the UI.
 */
export async function syncToBrand(
  pageId: string,
  workspaceId: string,
  freshSnapshot: BrandSnapshot,
  updatedBy?: string
): Promise<BrandPage> {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('brand_pages')
    .update({
      brand_snapshot:            freshSnapshot,
      brand_version:             freshSnapshot.brandVersion,
      last_synced_from_brand_at: now,
      brand_version_at_last_sync: freshSnapshot.brandVersion,
      updated_at:                now,
      ...(updatedBy && { updated_by: updatedBy }),
    })
    .eq('id', pageId)
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .select('*')
    .single()

  if (error) throw error
  return fromDbRow(data as Record<string, unknown>)
}

/**
 * Soft-delete a page.
 */
export async function deletePage(pageId: string, workspaceId: string): Promise<void> {
  const { error } = await supabase
    .from('brand_pages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', pageId)
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)

  if (error) throw error
}
