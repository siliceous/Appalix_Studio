/**
 * Resolves brand assets and identity for a given profile.
 * Used by Email Templates, Form Templates, and any future brand-driven feature.
 *
 * Accepts raw DB rows (no DB call inside — callers pass their already-fetched data).
 */

export interface ResolvedBrandAsset {
  id:       string
  file_url: string
  asset_role: string
  label:    string | null
  mime_type: string | null
}

export interface ResolvedBrandSnapshot {
  company_name: string | null
  tagline:      string | null
  logo_url:     string | null   // primary_logo first, else logo_mark, else null
  favicon_url:  string | null
  colors: {
    primary:    string | null
    secondary:  string | null
    accent:     string | null
    background: string | null
    text:       string | null
  }
  palette:   string[]           // up to 10 ranked hex strings from brand_palette_json
  fonts: {
    heading: string | null
    body:    string | null
  }
  brand_tone:  string | null
  brand_style: string | null
  cta_style:   string | null
  // All approved, non-archived assets for this profile
  assets: ResolvedBrandAsset[]
}

interface BrandProfileRow {
  id:                  string
  company_name:        string | null
  tagline:             string | null
  color_primary:       string | null
  color_secondary:     string | null
  color_accent:        string | null
  color_background:    string | null
  color_text:          string | null
  font_heading:        string | null
  font_body:           string | null
  brand_palette_json:  Array<{ hex: string; uses?: number }> | null
  brand_tone:          string | null
  brand_style:         string | null
  cta_style:           string | null
  brand_version:       number
}

interface BrandAssetRow {
  id:               string
  brand_profile_id: string
  asset_role:       string
  file_url:         string
  label:            string | null
  mime_type:        string | null
  is_approved:      boolean
  is_primary:       boolean
  is_archived:      boolean
}

export function resolveBrandAssets(
  profile: BrandProfileRow,
  allAssets: BrandAssetRow[],
): ResolvedBrandSnapshot {
  const profileAssets = allAssets.filter(
    a => a.brand_profile_id === profile.id && !a.is_archived,
  )

  const approved = profileAssets.filter(a => a.is_approved)

  // Prefer primary-flagged primary_logo, then any primary_logo, then logo_mark
  const logoAsset =
    approved.find(a => a.asset_role === 'primary_logo' && a.is_primary) ??
    approved.find(a => a.asset_role === 'primary_logo') ??
    approved.find(a => a.asset_role === 'logo_mark') ??
    null

  const faviconAsset =
    approved.find(a => a.asset_role === 'favicon') ?? null

  const palette: string[] =
    (profile.brand_palette_json ?? []).map(c => c.hex).filter(Boolean).slice(0, 10)

  return {
    company_name: profile.company_name,
    tagline:      profile.tagline,
    logo_url:     logoAsset?.file_url ?? null,
    favicon_url:  faviconAsset?.file_url ?? null,
    colors: {
      primary:    profile.color_primary,
      secondary:  profile.color_secondary,
      accent:     profile.color_accent,
      background: profile.color_background,
      text:       profile.color_text,
    },
    palette,
    fonts: {
      heading: profile.font_heading,
      body:    profile.font_body,
    },
    brand_tone:  profile.brand_tone,
    brand_style: profile.brand_style,
    cta_style:   profile.cta_style,
    assets:      profileAssets.map(a => ({
      id:         a.id,
      file_url:   a.file_url,
      asset_role: a.asset_role,
      label:      a.label,
      mime_type:  a.mime_type,
    })),
  }
}
