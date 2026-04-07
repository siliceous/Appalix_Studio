/**
 * brandProfileService
 *
 * CRUD for brand_profiles.
 *
 * Key invariants:
 *   - brand_version is incremented on every meaningful save. "Meaningful" means
 *     any field that would affect downstream generated outputs (colors, fonts,
 *     voice, identity). Metadata-only changes (e.g. updated_by) do not bump.
 *   - brand_confidence_score is recalculated on every save. It is a deterministic
 *     integer 0–6 based on profile completeness. The +1 for "approved logo exists"
 *     is written by brandAssetService after asset approval — it calls
 *     recalculateConfidenceScore() directly.
 *   - One active profile per workspace (enforced by unique partial index on DB).
 */

import { supabase } from '../../lib/supabase.js'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BrandProfileInput {
  companyName?:       string
  tagline?:           string
  websiteUrl?:        string
  footerText?:        string
  socialLinksJson?:   Record<string, string>
  contactDetailsJson?: Record<string, string>

  colorPrimary?:     string
  colorSecondary?:   string
  colorAccent?:      string
  colorBackground?:  string
  colorText?:        string

  fontHeading?:      string
  fontBody?:         string

  brandTone?:        string
  brandStyle?:       string
  ctaStyle?:         string
  brandVoiceNotes?:  string
}

export interface BrandProfile extends BrandProfileInput {
  id:                   string
  workspaceId:          string
  brandVersion:         number
  brandConfidenceScore: number
  updatedBy:            string | null
  createdAt:            string
  updatedAt:            string
  deletedAt:            string | null
}

// Fields that bump brand_version when changed
const VERSION_FIELDS = new Set([
  'company_name', 'tagline', 'website_url', 'footer_text',
  'social_links_json', 'contact_details_json',
  'color_primary', 'color_secondary', 'color_accent', 'color_background', 'color_text',
  'font_heading', 'font_body',
  'brand_tone', 'brand_style', 'cta_style', 'brand_voice_notes',
])

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDbRow(input: BrandProfileInput): Record<string, unknown> {
  return {
    ...(input.companyName       !== undefined && { company_name:          input.companyName }),
    ...(input.tagline           !== undefined && { tagline:                input.tagline }),
    ...(input.websiteUrl        !== undefined && { website_url:            input.websiteUrl }),
    ...(input.footerText        !== undefined && { footer_text:            input.footerText }),
    ...(input.socialLinksJson   !== undefined && { social_links_json:      input.socialLinksJson }),
    ...(input.contactDetailsJson !== undefined && { contact_details_json:  input.contactDetailsJson }),
    ...(input.colorPrimary      !== undefined && { color_primary:          input.colorPrimary }),
    ...(input.colorSecondary    !== undefined && { color_secondary:        input.colorSecondary }),
    ...(input.colorAccent       !== undefined && { color_accent:           input.colorAccent }),
    ...(input.colorBackground   !== undefined && { color_background:       input.colorBackground }),
    ...(input.colorText         !== undefined && { color_text:             input.colorText }),
    ...(input.fontHeading       !== undefined && { font_heading:           input.fontHeading }),
    ...(input.fontBody          !== undefined && { font_body:              input.fontBody }),
    ...(input.brandTone         !== undefined && { brand_tone:             input.brandTone }),
    ...(input.brandStyle        !== undefined && { brand_style:            input.brandStyle }),
    ...(input.ctaStyle          !== undefined && { cta_style:              input.ctaStyle }),
    ...(input.brandVoiceNotes   !== undefined && { brand_voice_notes:      input.brandVoiceNotes }),
  }
}

function fromDbRow(row: Record<string, unknown>): BrandProfile {
  return {
    id:                   row.id as string,
    workspaceId:          row.workspace_id as string,
    brandVersion:         row.brand_version as number,
    brandConfidenceScore: row.brand_confidence_score as number,
    updatedBy:            row.updated_by as string | null,
    createdAt:            row.created_at as string,
    updatedAt:            row.updated_at as string,
    deletedAt:            row.deleted_at as string | null,
    companyName:          row.company_name as string | undefined,
    tagline:              row.tagline as string | undefined,
    websiteUrl:           row.website_url as string | undefined,
    footerText:           row.footer_text as string | undefined,
    socialLinksJson:      row.social_links_json as Record<string, string> | undefined,
    contactDetailsJson:   row.contact_details_json as Record<string, string> | undefined,
    colorPrimary:         row.color_primary as string | undefined,
    colorSecondary:       row.color_secondary as string | undefined,
    colorAccent:          row.color_accent as string | undefined,
    colorBackground:      row.color_background as string | undefined,
    colorText:            row.color_text as string | undefined,
    fontHeading:          row.font_heading as string | undefined,
    fontBody:             row.font_body as string | undefined,
    brandTone:            row.brand_tone as string | undefined,
    brandStyle:           row.brand_style as string | undefined,
    ctaStyle:             row.cta_style as string | undefined,
    brandVoiceNotes:      row.brand_voice_notes as string | undefined,
  }
}

/**
 * Compute confidence score from current DB row.
 * Score 0–6:
 *   +1  company_name present
 *   +1  color_primary present
 *   +1  brand_tone present
 *   +1  footer_text or contact_details_json non-empty
 *   +1  font_heading or font_body set
 *   +1  at least one approved primary logo asset (passed in from caller)
 */
export function computeConfidenceScore(
  row: Record<string, unknown>,
  hasApprovedLogo: boolean
): number {
  let score = 0
  if (row.company_name)   score++
  if (row.color_primary)  score++
  if (row.brand_tone)     score++

  const hasIdentity =
    (row.footer_text && (row.footer_text as string).trim().length > 0) ||
    (row.contact_details_json &&
      Object.keys(row.contact_details_json as object).length > 0)
  if (hasIdentity) score++

  if (row.font_heading || row.font_body) score++
  if (hasApprovedLogo) score++

  return score
}

function shouldBumpVersion(updates: Record<string, unknown>): boolean {
  return Object.keys(updates).some(k => VERSION_FIELDS.has(k))
}

// ── Service ───────────────────────────────────────────────────────────────────

/**
 * Get the active brand profile for a workspace. Returns null if none exists.
 */
export async function getProfile(workspaceId: string): Promise<BrandProfile | null> {
  const { data, error } = await supabase
    .from('brand_profiles')
    .select('*')
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw error
  if (!data)  return null
  return fromDbRow(data as Record<string, unknown>)
}

/**
 * Create a new brand profile for a workspace.
 * Fails if an active profile already exists (DB unique index).
 */
export async function createProfile(
  workspaceId: string,
  input: BrandProfileInput,
  updatedBy?: string
): Promise<BrandProfile> {
  const dbRow = toDbRow(input)
  const hasApprovedLogo = false // no assets yet on create

  const row = {
    workspace_id:           workspaceId,
    ...dbRow,
    brand_version:          1,
    brand_confidence_score: computeConfidenceScore({ ...dbRow }, hasApprovedLogo),
    ...(updatedBy && { updated_by: updatedBy }),
  }

  const { data, error } = await supabase
    .from('brand_profiles')
    .insert(row)
    .select('*')
    .single()

  if (error) throw error
  return fromDbRow(data as Record<string, unknown>)
}

/**
 * Update an existing brand profile.
 * Increments brand_version if any version-significant field changed.
 * Recalculates confidence score.
 */
export async function updateProfile(
  workspaceId: string,
  input: BrandProfileInput,
  updatedBy?: string
): Promise<BrandProfile> {
  // Fetch current row to compute new version and confidence
  const current = await getProfile(workspaceId)
  if (!current) throw new Error(`No active brand profile for workspace ${workspaceId}`)

  const dbUpdates = toDbRow(input)
  const newVersion = shouldBumpVersion(dbUpdates)
    ? current.brandVersion + 1
    : current.brandVersion

  // For confidence score: merge current + updates to get full picture
  const merged = {
    company_name:          input.companyName       ?? current.companyName,
    color_primary:         input.colorPrimary      ?? current.colorPrimary,
    brand_tone:            input.brandTone         ?? current.brandTone,
    footer_text:           input.footerText        ?? current.footerText,
    contact_details_json:  input.contactDetailsJson ?? current.contactDetailsJson,
    font_heading:          input.fontHeading       ?? current.fontHeading,
    font_body:             input.fontBody          ?? current.fontBody,
  }

  // We don't fetch assets here — preserve current approved logo score by
  // checking if current score's logo point is already earned (score >= threshold).
  // brandAssetService calls recalculateConfidenceScore() when approval changes.
  const logoPointEarned = current.brandConfidenceScore >= 1 &&
    (current.brandConfidenceScore - computeConfidenceScore(merged, false)) >= 0
  const newScore = computeConfidenceScore(merged, logoPointEarned)

  const { data, error } = await supabase
    .from('brand_profiles')
    .update({
      ...dbUpdates,
      brand_version:          newVersion,
      brand_confidence_score: newScore,
      updated_at:             new Date().toISOString(),
      ...(updatedBy && { updated_by: updatedBy }),
    })
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .select('*')
    .single()

  if (error) throw error
  return fromDbRow(data as Record<string, unknown>)
}

/**
 * Recalculate and persist the confidence score.
 * Called by brandAssetService after any approval/archive/delete change.
 */
export async function recalculateConfidenceScore(
  workspaceId: string,
  hasApprovedLogo: boolean
): Promise<void> {
  const current = await getProfile(workspaceId)
  if (!current) return

  const profileFields = {
    company_name:         current.companyName,
    color_primary:        current.colorPrimary,
    brand_tone:           current.brandTone,
    footer_text:          current.footerText,
    contact_details_json: current.contactDetailsJson,
    font_heading:         current.fontHeading,
    font_body:            current.fontBody,
  }

  const newScore = computeConfidenceScore(profileFields, hasApprovedLogo)

  await supabase
    .from('brand_profiles')
    .update({ brand_confidence_score: newScore })
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
}

/**
 * Soft-delete the active brand profile.
 */
export async function deleteProfile(workspaceId: string): Promise<void> {
  const { error } = await supabase
    .from('brand_profiles')
    .update({ deleted_at: new Date().toISOString() })
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)

  if (error) throw error
}
