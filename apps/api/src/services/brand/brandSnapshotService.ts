/**
 * brandSnapshotService
 *
 * The ONLY interface between the brand system and all downstream builders
 * (email templates, forms, website pages).
 *
 * Rules:
 *   - No builder reads raw brand_profiles or brand_assets tables directly.
 *   - All builders call getSnapshot(workspaceId) and embed the result as
 *     brand_snapshot jsonb at generation time.
 *   - snapshotSchemaVersion is separate from brandVersion:
 *       brandVersion         = which version of the user's brand data was used
 *       snapshotSchemaVersion = which version of the snapshot shape/structure
 *     When the BrandSnapshot type gains new fields in a future migration,
 *     increment SNAPSHOT_SCHEMA_VERSION so old stored snapshots are identifiable.
 */

import { supabase } from '../../lib/supabase.js'

// ── Snapshot schema version ───────────────────────────────────────────────────
// Increment this when the BrandSnapshot shape changes (new fields, renames).
// Never decrement. Stored snapshots carry the version at which they were frozen.
export const SNAPSHOT_SCHEMA_VERSION = 1 as const

// ── BrandSnapshot type ────────────────────────────────────────────────────────

export interface BrandSnapshot {
  snapshotSchemaVersion: typeof SNAPSHOT_SCHEMA_VERSION
  brandVersion: number

  companyName?: string
  tagline?: string
  websiteUrl?: string

  colors: {
    primary?: string
    secondary?: string
    accent?: string
    background?: string
    text?: string
  }

  typography: {
    fontHeading?: string
    fontBody?: string
  }

  voice: {
    tone?: string
    style?: string
    ctaStyle?: string
    notes?: string
  }

  assets: {
    primaryLogoUrl?: string
    secondaryLogoUrl?: string
    faviconUrl?: string
  }

  identity: {
    footerText?: string
    socialLinks?: Record<string, string>
    contactDetails?: Record<string, string>
  }
}

// ── Row types (minimal projections) ──────────────────────────────────────────

interface BrandProfileRow {
  brand_version:        number
  company_name:         string | null
  tagline:              string | null
  website_url:          string | null
  color_primary:        string | null
  color_secondary:      string | null
  color_accent:         string | null
  color_background:     string | null
  color_text:           string | null
  font_heading:         string | null
  font_body:            string | null
  brand_tone:           string | null
  brand_style:          string | null
  cta_style:            string | null
  brand_voice_notes:    string | null
  footer_text:          string | null
  social_links_json:    Record<string, string> | null
  contact_details_json: Record<string, string> | null
}

interface BrandAssetRow {
  asset_role: string
  file_url:   string
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Assemble a frozen BrandSnapshot for a given workspace.
 *
 * Returns null if no active brand profile exists for the workspace.
 * Callers (generators) should check for null and refuse generation without
 * a valid snapshot — never fall back to hardcoded brand values.
 */
export async function getSnapshot(workspaceId: string): Promise<BrandSnapshot | null> {
  // 1. Fetch the active brand profile
  const { data: profile, error: profileError } = await supabase
    .from('brand_profiles')
    .select([
      'brand_version',
      'company_name', 'tagline', 'website_url',
      'color_primary', 'color_secondary', 'color_accent', 'color_background', 'color_text',
      'font_heading', 'font_body',
      'brand_tone', 'brand_style', 'cta_style', 'brand_voice_notes',
      'footer_text', 'social_links_json', 'contact_details_json',
    ].join(', '))
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .maybeSingle()

  if (profileError) {
    console.error('[brandSnapshotService] profile fetch error', profileError)
    throw profileError
  }

  if (!profile) return null

  const p = profile as unknown as BrandProfileRow

  // 2. Fetch approved primary assets (logos, favicon)
  const { data: assets, error: assetsError } = await supabase
    .from('brand_assets')
    .select('asset_role, file_url')
    .eq('workspace_id', workspaceId)
    .in('asset_role', ['primary_logo', 'secondary_logo', 'favicon'])
    .eq('is_approved', true)
    .eq('is_primary', true)
    .eq('is_archived', false)
    .is('deleted_at', null)

  if (assetsError) {
    console.error('[brandSnapshotService] assets fetch error', assetsError)
    throw assetsError
  }

  const assetMap = new Map<string, string>(
    (assets as BrandAssetRow[]).map(a => [a.asset_role, a.file_url])
  )

  // 3. Assemble snapshot — every field is optional; absent data becomes undefined
  const snapshot: BrandSnapshot = {
    snapshotSchemaVersion: SNAPSHOT_SCHEMA_VERSION,
    brandVersion: p.brand_version,

    ...(p.company_name  && { companyName:  p.company_name }),
    ...(p.tagline       && { tagline:       p.tagline }),
    ...(p.website_url   && { websiteUrl:    p.website_url }),

    colors: {
      ...(p.color_primary    && { primary:    p.color_primary }),
      ...(p.color_secondary  && { secondary:  p.color_secondary }),
      ...(p.color_accent     && { accent:     p.color_accent }),
      ...(p.color_background && { background: p.color_background }),
      ...(p.color_text       && { text:       p.color_text }),
    },

    typography: {
      ...(p.font_heading && { fontHeading: p.font_heading }),
      ...(p.font_body    && { fontBody:    p.font_body }),
    },

    voice: {
      ...(p.brand_tone       && { tone:    p.brand_tone }),
      ...(p.brand_style      && { style:   p.brand_style }),
      ...(p.cta_style        && { ctaStyle: p.cta_style }),
      ...(p.brand_voice_notes && { notes:  p.brand_voice_notes }),
    },

    assets: {
      ...(assetMap.get('primary_logo')   && { primaryLogoUrl:   assetMap.get('primary_logo') }),
      ...(assetMap.get('secondary_logo') && { secondaryLogoUrl: assetMap.get('secondary_logo') }),
      ...(assetMap.get('favicon')        && { faviconUrl:        assetMap.get('favicon') }),
    },

    identity: {
      ...(p.footer_text            && { footerText:      p.footer_text }),
      ...(p.social_links_json      && Object.keys(p.social_links_json).length > 0
                                    && { socialLinks:    p.social_links_json }),
      ...(p.contact_details_json   && Object.keys(p.contact_details_json).length > 0
                                    && { contactDetails: p.contact_details_json }),
    },
  }

  return snapshot
}

/**
 * Convenience: get snapshot or throw with a clear message.
 * Use this in generators that cannot proceed without brand data.
 */
export async function getSnapshotOrThrow(workspaceId: string): Promise<BrandSnapshot> {
  const snapshot = await getSnapshot(workspaceId)
  if (!snapshot) {
    throw new Error(
      `[brandSnapshotService] No active brand profile found for workspace ${workspaceId}. ` +
      'Complete the Assets tab before generating branded content.'
    )
  }
  return snapshot
}
