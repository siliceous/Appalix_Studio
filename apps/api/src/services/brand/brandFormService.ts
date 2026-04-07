/**
 * brandFormService
 *
 * Storage and lifecycle for brand_forms.
 *
 * Generation flow (callers must follow this order):
 *   1. getSnapshotOrThrow(workspaceId)                  → BrandSnapshot
 *   2. buildFormStrategy({ goal, snapshot, ... })       → FormStrategy
 *   3. generateForm({ strategy, snapshot, ... })        → FormConfig
 *   4. createForm({ workspaceId, snapshot, config, ... }) → BrandForm (saved)
 *
 * Sync model (hybrid):
 *   - brand_snapshot is frozen at creation time
 *   - user triggers syncToBrand() to re-snapshot without regenerating the form
 *   - brand_version_at_last_sync tracks staleness for UI indicators
 *
 * Lead integration (Phase 3):
 *   Form submissions → existing lead dedup path (email → name → phone).
 *   source_form_id will be added to the leads intake table in a future migration.
 *   See supabase/migrations/00116_brand_outputs.sql Phase 3 comment.
 */

import { supabase } from '../../lib/supabase.js'
import type { BrandSnapshot } from './brandSnapshotService.js'
import type { FormConfig, FormSettings } from './formGeneratorService.js'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CreateFormInput {
  name:              string
  formType?:         string
  usageContext?:     string[]
  isSystemGenerated?: boolean
  brandProfileId?:   string
  embedType?:        FormSettings['embedType']
  updatedBy?:        string
}

export interface BrandForm {
  id:                       string
  workspaceId:              string
  brandProfileId:           string | null
  name:                     string
  formType:                 string | null
  brandSnapshot:            BrandSnapshot
  brandVersion:             number
  lastSyncedFromBrandAt:    string | null
  brandVersionAtLastSync:   number | null
  configJson:               FormConfig
  usageContext:             string[]
  isSystemGenerated:        boolean
  status:                   'draft' | 'published' | 'archived'
  updatedBy:                string | null
  createdAt:                string
  updatedAt:                string
  deletedAt:                string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fromDbRow(row: Record<string, unknown>): BrandForm {
  return {
    id:                     row.id as string,
    workspaceId:            row.workspace_id as string,
    brandProfileId:         row.brand_profile_id as string | null,
    name:                   row.name as string,
    formType:               row.form_type as string | null,
    brandSnapshot:          row.brand_snapshot as BrandSnapshot,
    brandVersion:           row.brand_version as number,
    lastSyncedFromBrandAt:  row.last_synced_from_brand_at as string | null,
    brandVersionAtLastSync: row.brand_version_at_last_sync as number | null,
    configJson:             row.config_json as FormConfig,
    usageContext:           row.usage_context as string[],
    isSystemGenerated:      row.is_system_generated as boolean,
    status:                 row.status as BrandForm['status'],
    updatedBy:              row.updated_by as string | null,
    createdAt:              row.created_at as string,
    updatedAt:              row.updated_at as string,
    deletedAt:              row.deleted_at as string | null,
  }
}

// ── Service ───────────────────────────────────────────────────────────────────

/**
 * Persist a newly generated form (draft status).
 */
export async function createForm(
  workspaceId: string,
  snapshot: BrandSnapshot,
  config: FormConfig,
  input: CreateFormInput
): Promise<BrandForm> {
  const { data, error } = await supabase
    .from('brand_forms')
    .insert({
      workspace_id:             workspaceId,
      brand_profile_id:         input.brandProfileId             ?? null,
      name:                     input.name,
      form_type:                input.formType                   ?? null,
      brand_snapshot:           snapshot,
      brand_version:            snapshot.brandVersion,
      last_synced_from_brand_at: null,
      brand_version_at_last_sync: null,
      config_json:              config,
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
 * Get a single form by ID.
 */
export async function getForm(formId: string, workspaceId: string): Promise<BrandForm | null> {
  const { data, error } = await supabase
    .from('brand_forms')
    .select('*')
    .eq('id', formId)
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw error
  if (!data)  return null
  return fromDbRow(data as Record<string, unknown>)
}

/**
 * List all active forms for a workspace.
 */
export async function listForms(
  workspaceId: string,
  usageContext?: string
): Promise<BrandForm[]> {
  let query = supabase
    .from('brand_forms')
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
 * Update form config (user edits after generation).
 * Does not touch brand_snapshot — use syncToBrand() for that.
 */
export async function updateFormContent(
  formId: string,
  workspaceId: string,
  updates: {
    name?:         string
    configJson?:   FormConfig
    status?:       BrandForm['status']
    usageContext?: string[]
    updatedBy?:    string
  }
): Promise<BrandForm> {
  const { data, error } = await supabase
    .from('brand_forms')
    .update({
      ...(updates.name         !== undefined && { name:          updates.name }),
      ...(updates.configJson   !== undefined && { config_json:   updates.configJson }),
      ...(updates.status       !== undefined && { status:        updates.status }),
      ...(updates.usageContext !== undefined && { usage_context: updates.usageContext }),
      ...(updates.updatedBy    !== undefined && { updated_by:    updates.updatedBy }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', formId)
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .select('*')
    .single()

  if (error) throw error
  return fromDbRow(data as Record<string, unknown>)
}

/**
 * Sync the form's brand snapshot to the current brand state.
 * Updates brand_snapshot + brand_version + sync timestamps.
 * Does NOT regenerate fields or style — that requires a full re-generation call.
 *
 * Note: after syncing, the form's style will reflect the new brand colors/fonts
 * on next render if the renderer reads from configJson.style. To fully re-render
 * style from new brand data, call generateForm() again and updateFormContent().
 */
export async function syncToBrand(
  formId: string,
  workspaceId: string,
  freshSnapshot: BrandSnapshot,
  updatedBy?: string
): Promise<BrandForm> {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('brand_forms')
    .update({
      brand_snapshot:             freshSnapshot,
      brand_version:              freshSnapshot.brandVersion,
      last_synced_from_brand_at:  now,
      brand_version_at_last_sync: freshSnapshot.brandVersion,
      updated_at:                 now,
      ...(updatedBy && { updated_by: updatedBy }),
    })
    .eq('id', formId)
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .select('*')
    .single()

  if (error) throw error
  return fromDbRow(data as Record<string, unknown>)
}

/**
 * Soft-delete a form.
 */
export async function deleteForm(formId: string, workspaceId: string): Promise<void> {
  const { error } = await supabase
    .from('brand_forms')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', formId)
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)

  if (error) throw error
}
