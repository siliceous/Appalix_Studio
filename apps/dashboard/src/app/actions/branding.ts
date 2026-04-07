'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getSession() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (!data) redirect('/login')
  return { supabase, userId: user.id, workspaceId: (data as { workspace_id: string }).workspace_id }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (supabase: any) => supabase as any

function computeConfidenceScore(profile: Record<string, unknown>, hasApprovedLogo: boolean): number {
  let score = 0
  if (profile.company_name)  score++
  if (profile.color_primary) score++
  if (profile.brand_tone)    score++
  const hasIdentity =
    (profile.footer_text && (profile.footer_text as string).trim().length > 0) ||
    (profile.contact_details_json && Object.keys(profile.contact_details_json as object).length > 0)
  if (hasIdentity) score++
  if (profile.font_heading || profile.font_body) score++
  if (hasApprovedLogo) score++
  return score
}

// ── Brand Profile ─────────────────────────────────────────────────────────────

export interface BrandProfileFormData {
  company_name?:         string
  tagline?:              string
  website_url?:          string
  footer_text?:          string
  color_primary?:        string
  color_secondary?:      string
  color_accent?:         string
  color_background?:     string
  color_text?:           string
  font_heading?:         string
  font_heading_sub?:     string
  font_body?:            string
  brand_palette_json?:   Array<{ hex: string; uses: number; roles: string }>
  brand_tone?:           string
  brand_style?:          string
  cta_style?:            string
  brand_voice_notes?:    string
  social_links_json?:    Record<string, string>
  contact_details_json?: Record<string, string>
}

export async function saveBrandProfile(formData: BrandProfileFormData, profileId?: string) {
  const { supabase, userId, workspaceId } = await getSession()

  // Find the profile to update:
  // - If profileId provided → update that specific profile (any type)
  // - Otherwise → find/create the workspace-level brand (legacy single-brand path)
  let existingQuery = db(supabase)
    .from('brand_profiles')
    .select('id, brand_version, brand_type, color_primary, company_name, brand_tone, footer_text, font_heading, font_body, contact_details_json')
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)

  if (profileId) {
    existingQuery = existingQuery.eq('id', profileId)
  } else {
    existingQuery = existingQuery.eq('brand_type', 'workspace')
  }

  const { data: existing } = await existingQuery.maybeSingle()

  const lookupId = existing?.id ?? profileId
  const { data: logoAsset } = await db(supabase)
    .from('brand_assets')
    .select('id')
    .eq('brand_profile_id', lookupId ?? 'none')
    .eq('asset_role', 'primary_logo')
    .eq('is_approved', true)
    .eq('is_primary', true)
    .eq('is_archived', false)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle()

  const hasApprovedLogo = logoAsset !== null

  const merged = {
    company_name:         formData.company_name         ?? existing?.company_name,
    color_primary:        formData.color_primary        ?? existing?.color_primary,
    brand_tone:           formData.brand_tone           ?? existing?.brand_tone,
    footer_text:          formData.footer_text          ?? existing?.footer_text,
    contact_details_json: formData.contact_details_json ?? existing?.contact_details_json,
    font_heading:         formData.font_heading         ?? existing?.font_heading,
    font_body:            formData.font_body            ?? existing?.font_body,
  }

  const newScore = computeConfidenceScore(merged as Record<string, unknown>, hasApprovedLogo)

  const VERSION_FIELDS = new Set([
    'company_name', 'tagline', 'website_url', 'footer_text',
    'color_primary', 'color_secondary', 'color_accent', 'color_background', 'color_text',
    'font_heading', 'font_heading_sub', 'font_body', 'brand_palette_json', 'brand_tone', 'brand_style', 'cta_style', 'brand_voice_notes',
    'social_links_json', 'contact_details_json',
  ])

  // Nullable enum fields must be an exact DB enum value or null
  const VALID_TONES  = new Set(['professional', 'friendly', 'premium', 'direct', 'playful', 'authoritative', 'conversational'])
  const VALID_STYLES = new Set(['minimal', 'corporate', 'bold', 'modern', 'storytelling', 'data-driven'])
  const VALID_CTA    = new Set(['soft', 'consultative', 'assertive'])
  const sanitized = {
    ...formData,
    brand_tone:  formData.brand_tone  && VALID_TONES.has(formData.brand_tone.toLowerCase())   ? formData.brand_tone.toLowerCase()  : null,
    brand_style: formData.brand_style && VALID_STYLES.has(formData.brand_style.toLowerCase()) ? formData.brand_style.toLowerCase() : null,
    cta_style:   formData.cta_style   && VALID_CTA.has(formData.cta_style.toLowerCase())      ? formData.cta_style.toLowerCase()   : null,
  }

  if (existing) {
    const bumpVersion = Object.keys(formData).some(k => VERSION_FIELDS.has(k))
    const { error } = await db(supabase)
      .from('brand_profiles')
      .update({
        ...sanitized,
        brand_version:          bumpVersion ? existing.brand_version + 1 : existing.brand_version,
        brand_confidence_score: newScore,
        updated_by:             userId,
        updated_at:             new Date().toISOString(),
      })
      .eq('id', existing.id)
      .eq('workspace_id', workspaceId)
    if (error) throw error
  } else {
    // No existing profile — only valid for workspace brand (first save)
    const { error } = await db(supabase)
      .from('brand_profiles')
      .insert({
        workspace_id:           workspaceId,
        brand_type:             'workspace',
        ...sanitized,
        brand_version:          1,
        brand_confidence_score: newScore,
        updated_by:             userId,
      })
    if (error) throw error
  }

  revalidatePath('/sage/branding')
}

// ── Create a new client brand profile ────────────────────────────────────────

export async function createClientBrandProfile(input: {
  name:         string
  companyName?: string
}): Promise<string> {
  const { supabase, userId, workspaceId } = await getSession()

  const initialScore = input.companyName ? 1 : 0

  const { data, error } = await db(supabase)
    .from('brand_profiles')
    .insert({
      workspace_id:           workspaceId,
      brand_type:             'client',
      name:                   input.name.trim(),
      company_name:           input.companyName?.trim() || null,
      brand_version:          1,
      brand_confidence_score: initialScore,
      updated_by:             userId,
    })
    .select('id')
    .single()

  if (error) throw error
  revalidatePath('/sage/branding')
  return (data as { id: string }).id
}

// ── Rename a brand profile ────────────────────────────────────────────────────

export async function renameBrandProfile(profileId: string, name: string) {
  const { supabase, userId, workspaceId } = await getSession()

  const { error } = await db(supabase)
    .from('brand_profiles')
    .update({ name: name.trim(), updated_by: userId, updated_at: new Date().toISOString() })
    .eq('id', profileId)
    .eq('workspace_id', workspaceId)

  if (error) throw error
  revalidatePath('/sage/branding')
}

// ── Delete a client brand profile (soft delete) ───────────────────────────────
// Workspace brand cannot be deleted.

export async function deleteClientBrandProfile(profileId: string) {
  const { supabase, workspaceId } = await getSession()

  // Safety check — refuse to delete workspace brand
  const { data: profile } = await db(supabase)
    .from('brand_profiles')
    .select('brand_type')
    .eq('id', profileId)
    .eq('workspace_id', workspaceId)
    .single()

  if (!profile) throw new Error('Profile not found')
  if ((profile as { brand_type: string }).brand_type === 'workspace') {
    throw new Error('Cannot delete the workspace brand')
  }

  const { error } = await db(supabase)
    .from('brand_profiles')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', profileId)
    .eq('workspace_id', workspaceId)

  if (error) throw error
  revalidatePath('/sage/branding')
}

// ── Brand Assets ──────────────────────────────────────────────────────────────

export async function registerBrandAsset(input: {
  brandProfileId:  string
  assetType:       string
  assetRole:       string
  source:          string
  fileUrl:         string
  storagePath:     string
  fileName:        string
  fileSize?:       number
  mimeType?:       string
  width?:          number
  height?:         number
  altText?:        string
  label?:          string
  isSystemGenerated?: boolean
}) {
  const { supabase, userId, workspaceId } = await getSession()

  const { data, error } = await db(supabase)
    .from('brand_assets')
    .insert({
      workspace_id:        workspaceId,
      brand_profile_id:    input.brandProfileId,
      asset_type:          input.assetType,
      asset_role:          input.assetRole,
      source:              input.source,
      file_url:            input.fileUrl,
      storage_path:        input.storagePath,
      file_name:           input.fileName,
      file_size:           input.fileSize          ?? null,
      mime_type:           input.mimeType          ?? null,
      width:               input.width             ?? null,
      height:              input.height            ?? null,
      alt_text:            input.altText           ?? null,
      label:               input.label             ?? null,
      is_approved:         false,
      is_primary:          false,
      is_archived:         false,
      is_system_generated: input.isSystemGenerated ?? false,
      updated_by:          userId,
    })
    .select('id')
    .single()

  if (error) throw error
  revalidatePath('/sage/branding')
  return (data as { id: string }).id
}

export async function approveAsset(assetId: string, makePrimary: boolean) {
  const { supabase, userId, workspaceId } = await getSession()

  const { data: asset } = await db(supabase)
    .from('brand_assets')
    .select('asset_role, brand_profile_id')
    .eq('id', assetId)
    .eq('workspace_id', workspaceId)
    .single()

  if (!asset) throw new Error('Asset not found')
  const { asset_role: role, brand_profile_id: profileId } = asset as { asset_role: string; brand_profile_id: string }

  if (makePrimary) {
    // Demote other primary assets with the same role within the same profile
    await db(supabase)
      .from('brand_assets')
      .update({ is_primary: false })
      .eq('brand_profile_id', profileId)
      .eq('asset_role', role)
      .eq('is_primary', true)
      .neq('id', assetId)
  }

  const { error } = await db(supabase)
    .from('brand_assets')
    .update({ is_approved: true, is_primary: makePrimary, updated_by: userId })
    .eq('id', assetId)
    .eq('workspace_id', workspaceId)
  if (error) throw error

  // Recalculate confidence score for the owning profile
  if (['primary_logo', 'secondary_logo', 'logo_mark'].includes(role)) {
    const { data: profile } = await db(supabase)
      .from('brand_profiles')
      .select('id, company_name, color_primary, brand_tone, footer_text, font_heading, font_body, contact_details_json')
      .eq('id', profileId)
      .eq('workspace_id', workspaceId)
      .maybeSingle()

    if (profile) {
      const { data: logoCheck } = await db(supabase)
        .from('brand_assets')
        .select('id')
        .eq('brand_profile_id', profileId)
        .eq('asset_role', 'primary_logo')
        .eq('is_approved', true)
        .eq('is_primary', true)
        .eq('is_archived', false)
        .is('deleted_at', null)
        .limit(1)
        .maybeSingle()

      const newScore = computeConfidenceScore(profile as Record<string, unknown>, logoCheck !== null)
      await db(supabase)
        .from('brand_profiles')
        .update({ brand_confidence_score: newScore })
        .eq('id', (profile as { id: string }).id)
    }
  }

  revalidatePath('/sage/branding')
}

export async function archiveAsset(assetId: string) {
  const { supabase, userId, workspaceId } = await getSession()
  const { error } = await db(supabase)
    .from('brand_assets')
    .update({ is_archived: true, is_primary: false, updated_by: userId })
    .eq('id', assetId)
    .eq('workspace_id', workspaceId)
  if (error) throw error
  revalidatePath('/sage/branding')
}

export async function deleteAsset(assetId: string) {
  const { supabase, workspaceId } = await getSession()
  const { error } = await db(supabase)
    .from('brand_assets')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', assetId)
    .eq('workspace_id', workspaceId)
  if (error) throw error
  revalidatePath('/sage/branding')
}

// ── Storage: signed upload URL ────────────────────────────────────────────────

export async function getBrandAssetUploadUrl(input: {
  fileName:  string
  mimeType:  string
  assetRole: string
}) {
  const { supabase, workspaceId } = await getSession()
  const ext  = input.fileName.split('.').pop() ?? 'bin'
  const path = `brand-assets/${workspaceId}/${input.assetRole}/${Date.now()}.${ext}`
  const { data, error } = await supabase.storage
    .from('workspace-assets')
    .createSignedUploadUrl(path)
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage
    .from('workspace-assets')
    .getPublicUrl(path)
  return { signedUrl: data.signedUrl, path, token: data.token, publicUrl }
}

// ── Website scanner ───────────────────────────────────────────────────────────

export interface ScanResult {
  // Identity fields — populate brand profile directly
  company_name?:      string
  tagline?:           string
  footer_text?:       string
  brand_tone?:        string
  brand_style?:       string
  brand_voice_notes?: string

  // Colors — assigned roles
  color_primary?:     string
  color_secondary?:   string
  color_accent?:      string
  color_background?:  string
  color_text?:        string
  color_button?:      string

  // Full palette — up to 10 ranked colors from frequency analysis
  color_palette?: Array<{ hex: string; uses: number; roles: string }>

  // Typography
  font_heading?:     string
  font_heading_sub?: string
  font_body?:        string

  // Discovered asset URLs (logos/images found on the page)
  discoveredAssets: Array<{
    url:       string
    role:      'primary_logo' | 'secondary_logo' | 'favicon' | 'hero_image' | 'general'
    label:     string
    mimeType?: string
  }>

  // Social links found
  social_links?: Record<string, string>
}

// ── Color utilities ───────────────────────────────────────────────────────────

function hue2rgb(p: number, q: number, t: number) {
  if (t < 0) t += 1; if (t > 1) t -= 1
  if (t < 1/6) return p + (q - p) * 6 * t
  if (t < 1/2) return q
  if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
  return p
}

function toHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')
}

/** Normalise any CSS color token to #rrggbb, or null if not parseable */
function normalizeColor(raw: string): string | null {
  const s = raw.trim().toLowerCase()
  if (s === 'transparent' || s === 'inherit' || s === 'currentcolor' || s === 'none') return null
  // 6-digit hex
  const h6 = s.match(/^#([0-9a-f]{6})$/)
  if (h6) return `#${h6[1]}`
  // 8-digit hex — strip alpha
  const h8 = s.match(/^#([0-9a-f]{6})[0-9a-f]{2}$/)
  if (h8) return `#${h8[1]}`
  // 3-digit hex
  const h3 = s.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/)
  if (h3) return `#${h3[1]}${h3[1]}${h3[2]}${h3[2]}${h3[3]}${h3[3]}`
  // rgb / rgba
  const rgb = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/)
  if (rgb) return toHex(+rgb[1], +rgb[2], +rgb[3])
  // rgb space-separated (CSS4)
  const rgb2 = s.match(/^rgba?\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/)
  if (rgb2) return toHex(+rgb2[1], +rgb2[2], +rgb2[3])
  // hsl / hsla
  const hsl = s.match(/^hsla?\(\s*([\d.]+)(?:deg)?\s*[, ]\s*([\d.]+)%\s*[, ]\s*([\d.]+)%/)
  if (hsl) {
    const h = +hsl[1] / 360, sat = +hsl[2] / 100, l = +hsl[3] / 100
    if (sat === 0) { const v = Math.round(l * 255); return toHex(v, v, v) }
    const q = l < 0.5 ? l * (1 + sat) : l + sat - l * sat
    const p = 2 * l - q
    return toHex(hue2rgb(p, q, h + 1/3) * 255, hue2rgb(p, q, h) * 255, hue2rgb(p, q, h - 1/3) * 255)
  }
  return null
}

/** Skip pure defaults that are browser-generated, not brand choices */
function isTrivialColor(hex: string) {
  return ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff'].includes(hex)
}

interface ColorEntry { count: number; props: Record<string, number>; selectors: string[] }

/**
 * Extract all color values from CSS, count frequency per normalised hex,
 * and track which CSS properties they appear on (background, color, border, button etc.)
 */
function extractColorFrequencies(css: string): Map<string, ColorEntry> {
  const map = new Map<string, ColorEntry>()

  const COLOR_RE = /#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)/g

  // Parse selector { declarations } blocks (non-nested)
  const ruleRe = /([^{}@][^{}]*)\{([^{}]*)\}/g
  let rm: RegExpExecArray | null
  while ((rm = ruleRe.exec(css)) !== null) {
    const selector = rm[1].trim()
    const decls    = rm[2]

    // Only look at color-bearing properties
    const declRe = /(background(?:-color)?|color|border(?:-\w+)?-color|fill|stroke|outline-color|box-shadow|caret-color)\s*:\s*([^;]+)/gi
    let dr: RegExpExecArray | null
    while ((dr = declRe.exec(decls)) !== null) {
      const prop  = dr[1].toLowerCase().replace(/-color$/, '').replace('background-', 'bg-')
      const value = dr[2]
      let cm: RegExpExecArray | null
      COLOR_RE.lastIndex = 0
      while ((cm = COLOR_RE.exec(value)) !== null) {
        const hex = normalizeColor(cm[0])
        if (!hex || isTrivialColor(hex)) continue
        const entry = map.get(hex) ?? { count: 0, props: {}, selectors: [] }
        entry.count++
        entry.props[prop] = (entry.props[prop] ?? 0) + 1
        if (entry.selectors.length < 4) entry.selectors.push(selector.slice(-60))
        map.set(hex, entry)
      }
    }
  }
  return map
}

/**
 * Fetch a URL, extract HTML, and use Claude to extract brand identity signals.
 * Returns structured data that the client can preview and confirm before saving.
 *
 * Also used by onboarding: when onboarding scrapes a URL, the result is
 * passed to saveBrandProfile to populate the Assets identity fields.
 */
export async function scanWebsiteForBrand(url: string): Promise<ScanResult | { error: string }> {
  // 1. Fetch the page
  let html: string
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Appalix/1.0; +https://appalix.com)',
        'Accept':     'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(12_000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    html = await res.text()
  } catch (err) {
    return { error: `Could not fetch that URL: ${(err as Error).message}` }
  }

  const base = new URL(url)
  let m: RegExpExecArray | null

  // 2. Extract image URLs from ALL common patterns before stripping tags
  const imgUrls: string[] = []

  // <img src="...">
  const imgSrcRe = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
  while ((m = imgSrcRe.exec(html)) !== null) imgUrls.push(m[1])

  // <img data-src="..."> and <img data-lazy-src="..."> (lazy loading)
  const imgDataSrcRe = /<img[^>]+data-(?:lazy-)?src=["']([^"']+)["'][^>]*>/gi
  while ((m = imgDataSrcRe.exec(html)) !== null) imgUrls.push(m[1])

  // srcset="url1 1x, url2 2x" — take the first URL from each srcset
  const srcsetRe = /srcset=["']([^"']+)["']/gi
  while ((m = srcsetRe.exec(html)) !== null) {
    const first = m[1].trim().split(/,\s*/)[0].trim().split(/\s+/)[0]
    if (first) imgUrls.push(first)
  }

  // <source srcset="..."> inside <picture>
  const sourceRe = /<source[^>]+srcset=["']([^"']+)["'][^>]*>/gi
  while ((m = sourceRe.exec(html)) !== null) {
    const first = m[1].trim().split(/,\s*/)[0].trim().split(/\s+/)[0]
    if (first) imgUrls.push(first)
  }

  // <link rel="icon|apple-touch-icon"> favicons
  const linkIconRe = /<link[^>]+(?:rel=["'][^"']*(?:icon|apple-touch-icon)[^"']*["'])[^>]+href=["']([^"']+)["'][^>]*>/gi
  while ((m = linkIconRe.exec(html)) !== null) imgUrls.push(m[1])

  // CSS background-image: url(...) in inline style attributes
  const bgInlineRe = /background(?:-image)?\s*:\s*url\(['"]?([^'"()]+\.(?:png|jpg|jpeg|gif|svg|webp)[^'"()]*?)['"]?\)/gi
  while ((m = bgInlineRe.exec(html)) !== null) imgUrls.push(m[1])

  // og:image and twitter:image meta tags — tracked separately so they bypass the extension filter
  const metaImgUrls: string[] = []
  const ogImgRe = /<meta[^>]+(?:property=["']og:image["']|name=["']twitter:image["'])[^>]+content=["']([^"']+)["'][^>]*>/gi
  while ((m = ogImgRe.exec(html)) !== null) { metaImgUrls.push(m[1]); imgUrls.push(m[1]) }
  // reverse attribute order variant
  const ogImgRe2 = /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property=["']og:image["']|name=["']twitter:image["'])[^>]*>/gi
  while ((m = ogImgRe2.exec(html)) !== null) { metaImgUrls.push(m[1]); imgUrls.push(m[1]) }

  function resolve(u: string) { try { return new URL(u, base).href } catch { return null } }

  const metaImgResolved = new Set(metaImgUrls.map(resolve).filter((u): u is string => !!u))

  const resolvedImgs = [...new Set(imgUrls)]
    .map(resolve)
    .filter((u): u is string => {
      if (!u) return false
      // Always keep og/twitter meta images
      if (metaImgResolved.has(u)) return true
      // Keep URLs with known image extensions
      if (/\.(png|jpg|jpeg|gif|svg|webp|ico)(\?|$)/i.test(u)) return true
      // Keep common image CDN / framework patterns without extensions
      if (/\/_next\/image\?|\/image\?|\/images\/|\/img\/|\/media\/|\/assets\//i.test(u)) return true
      if (/cloudinary\.com|imgix\.net|imagekit\.io|amazonaws\.com\/.*\/(image|media|upload)\//i.test(u)) return true
      if (/cdn\.[^/]+\/.*(?:image|photo|media|banner|hero)/i.test(u)) return true
      return false
    })
    .slice(0, 60)

  // 3. Strip HTML for Claude text analysis
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 10_000)

  // 4. Gather all CSS — inline blocks + external stylesheets (where real brand colors live)

  // 4a. Inline <style> blocks
  const styleBlocks: string[] = []
  const styleRe = /<style[^>]*>([\s\S]*?)<\/style>/gi
  while ((m = styleRe.exec(html)) !== null) styleBlocks.push(m[1])
  const inlineCss = styleBlocks.join('\n')

  // 4b. Collect external stylesheet URLs — prefer first-party, skip CDN/font URLs
  const SKIP_DOMAINS = /fonts\.googleapis|fonts\.gstatic|cdn\.jsdelivr|unpkg\.com|cdnjs\.cloudflare|bootstrap\.min|fontawesome/i
  const cssLinkRe = /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["'][^>]*>/gi
  const externalCssUrls: string[] = []
  while ((m = cssLinkRe.exec(html)) !== null) {
    try {
      const href = new URL(m[1], base).href
      if (!SKIP_DOMAINS.test(href)) externalCssUrls.push(href)
    } catch { /* skip */ }
  }
  // Also check reverse order (href before rel)
  const cssLinkRe2 = /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']stylesheet["'][^>]*>/gi
  while ((m = cssLinkRe2.exec(html)) !== null) {
    try {
      const href = new URL(m[1], base).href
      if (!SKIP_DOMAINS.test(href) && !externalCssUrls.includes(href)) externalCssUrls.push(href)
    } catch { /* skip */ }
  }

  // 4c. Fetch up to 4 external CSS files (largest first by URL heuristic, skip tiny chunks)
  //     Prioritise: files with 'style', 'main', 'app', 'global', 'theme' in the name
  const prioritised = [
    ...externalCssUrls.filter(u => /style|main|app|global|theme|custom/i.test(u)),
    ...externalCssUrls.filter(u => !/style|main|app|global|theme|custom/i.test(u)),
  ].slice(0, 4)

  const fetchedCss: string[] = []
  await Promise.all(prioritised.map(async cssUrl => {
    try {
      const r = await fetch(cssUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Appalix/1.0)' },
        signal: AbortSignal.timeout(6_000),
      })
      if (!r.ok) return
      const text = await r.text()
      // Take up to 80 KB per file — enough for any real stylesheet
      fetchedCss.push(text.slice(0, 80_000))
    } catch { /* skip */ }
  }))

  // Combine all CSS for analysis
  const allCss = [inlineCss, ...fetchedCss].join('\n')

  // 4d. Frequency-based color extraction across ALL CSS
  const colorFreqMap = extractColorFrequencies(allCss)

  // Sort by count desc, pick top 20 candidates
  const rankedColors = [...colorFreqMap.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20)

  // Build the palette (top 10 for display)
  const paletteColors = rankedColors.slice(0, 10).map(([hex, e]) => ({
    hex,
    uses: e.count,
    roles: Object.entries(e.props).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}(${v})`).join(', '),
  }))

  // Also extract :root CSS vars (these are the named design tokens — very authoritative)
  const cssVarLines: string[] = []
  const rootRe2 = /:root\s*\{([^}]*)\}/gi
  let rootM: RegExpExecArray | null
  while ((rootM = rootRe2.exec(allCss)) !== null) {
    const varRe = /(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\))/g
    let v: RegExpExecArray | null
    while ((v = varRe.exec(rootM[1])) !== null) {
      const hex = normalizeColor(v[2])
      cssVarLines.push(`${v[1]}: ${hex ?? v[2]}`)
    }
  }

  // Extract button/CTA colors explicitly — these are high-signal brand colors
  const buttonColors: string[] = []
  const btnRe = /(?:button|\.btn|input\[type=["']?(?:submit|button)["']?])[^{}]*\{([^{}]*)\}/gi
  let btnM: RegExpExecArray | null
  while ((btnM = btnRe.exec(allCss)) !== null) {
    const colorRe = /(?:background(?:-color)?|color)\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\))/gi
    let cv: RegExpExecArray | null
    while ((cv = colorRe.exec(btnM[1])) !== null) {
      const hex = normalizeColor(cv[1])
      if (hex && !isTrivialColor(hex)) buttonColors.push(hex)
    }
  }

  // 4f. meta theme-color
  const themeColorRe = /<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)["'][^>]*>/i
  const metaThemeColor = themeColorRe.exec(html)?.[1] ?? null

  // 4g. Open Graph image
  const ogImageTagRe = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i
  const ogImage = ogImageTagRe.exec(html)?.[1] ?? null

  // 4h. Google Fonts — from HTML and all fetched CSS
  const googleFonts: string[] = []
  function extractGoogleFontFamilies(urlStr: string) {
    try {
      const u = new URL(urlStr)
      const families = u.searchParams.getAll('family')
      if (families.length) {
        families.forEach(f => googleFonts.push(f.split(':')[0].replace(/\+/g, ' ')))
        return
      }
      const legacy = u.searchParams.get('families') ?? u.searchParams.get('family')
      if (legacy) legacy.split('|').forEach(f => googleFonts.push(f.split(':')[0].replace(/\+/g, ' ')))
    } catch { /* skip */ }
  }
  const gfLinkRe = /<link[^>]+href=["']([^"']*fonts\.googleapis\.com[^"']*)["'][^>]*>/gi
  while ((m = gfLinkRe.exec(html)) !== null) extractGoogleFontFamilies(m[1])
  const gfImportRe = /@import\s+url\(['"]?([^'"()]*fonts\.googleapis\.com[^'"()]*)['"]?\)/gi
  while ((m = gfImportRe.exec(allCss)) !== null) extractGoogleFontFamilies(m[1])
  const uniqueFonts = [...new Set(googleFonts)]

  // 4i. CSS font-family rules for h1/h2/h3/body/p
  const headingFontRules: string[] = []
  const hFontRe = /(?:h[1-3]|body|p)\s*\{[^}]*font-family\s*:\s*([^;}]+)/gi
  while ((m = hFontRe.exec(allCss)) !== null) {
    headingFontRules.push(`${m[0].match(/^[^{]+/)?.[0].trim()}: ${m[1].trim()}`)
  }

  // 4j. Footer text
  const footerRe = /<footer[^>]*>([\s\S]*?)<\/footer>/i
  const footerHtml = footerRe.exec(html)?.[1] ?? ''
  const footerText = footerHtml
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500)

  // 5. Build color intelligence for Claude
  const paletteLines = rankedColors
    .map(([hex, e], i) => {
      const propSummary = Object.entries(e.props)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `${k}×${v}`)
        .join(', ')
      return `${i + 1}. ${hex}  (${e.count} uses: ${propSummary})  — seen on: ${e.selectors.slice(0, 2).join(' | ')}`
    })
    .join('\n')

  const colorSignals = [
    metaThemeColor ? `meta theme-color: ${metaThemeColor}` : null,
    cssVarLines.length
      ? `Named design tokens in :root (most authoritative):\n${cssVarLines.slice(0, 40).join('\n')}`
      : null,
    buttonColors.length
      ? `Button/CTA colors (explicit): ${[...new Set(buttonColors)].join(', ')}`
      : null,
    rankedColors.length
      ? `All colors ranked by frequency across ${fetchedCss.length + 1} CSS files:\n${paletteLines}`
      : '(no colors found in CSS)',
  ].filter(Boolean).join('\n\n')

  // 6. Ask Claude to assign roles
  const fontNote = [
    uniqueFonts.length === 0
      ? 'Google Fonts: none detected.'
      : `Google Fonts detected: ${uniqueFonts.map(f => `"${f}"`).join(', ')}.`,
    headingFontRules.length > 0
      ? `CSS font-family rules:\n${headingFontRules.slice(0, 10).join('\n')}`
      : 'No explicit heading/body font-family rules found.',
  ].join('\n')

  const prompt = `You are a brand analyst. Extract brand identity information from a website.

## Page text (stripped HTML):
${text}

## Footer section text:
${footerText || '(no <footer> element found)'}

## Color data extracted from CSS (${fetchedCss.length} external stylesheets fetched):
${colorSignals}

## Google Fonts & CSS font rules:
${fontNote}

## Image URLs found on the page:
${resolvedImgs.map((u, i) => `${i + 1}. ${u}`).join('\n')}
${ogImage ? `\nOpen Graph image: ${ogImage}` : ''}

Return ONLY valid JSON:

{
  "company_name": "string or null",
  "tagline": "short tagline/slogan or null",
  "footer_text": "copyright or footer line or null",
  "brand_tone": "professional|friendly|premium|direct|playful|authoritative|conversational or null",
  "brand_style": "minimal|corporate|bold|modern|storytelling|data-driven or null",
  "brand_voice_notes": "1-2 sentences or null",
  "color_primary": "hex or null",
  "color_secondary": "hex or null",
  "color_accent": "hex or null",
  "color_background": "hex or null",
  "color_text": "hex or null",
  "color_button": "hex or null",
  "font_heading": "primary/display font name or null",
  "font_heading_sub": "sub-heading font name if different, else null",
  "font_body": "body font name or null",
  "social_links": {},
  "logo_url": "from image list or null",
  "logo_url_2": "second logo variant or null",
  "favicon_url": "from image list or null",
  "hero_image_url": "from image list or null",
  "image_urls": ["up to 10 varied image URLs from the page — hero, product, feature, team, background images. Pick the best quality and most representative. No duplicates of logo/favicon."]
}

Color assignment rules (strict — do not guess):
1. Use named design tokens first: --primary/--brand/--color-primary → color_primary. --accent/--cta/--highlight → color_accent. --background/--bg/--surface → color_background. --foreground/--text/--color-text → color_text.
2. Use button/CTA colors for color_button and color_accent.
3. Use the frequency-ranked list: highest-frequency bg color → color_background. Highest-frequency text color → color_text. Most prominent non-bg/non-text brand color → color_primary.
4. If meta theme-color is present and no CSS var covers primary, use it for color_primary.
5. All colors are already normalized to hex in the data — copy them as-is. Return hex only (#rrggbb).
6. If a color role cannot be determined from actual CSS data, return null. Never invent colors.

Font rules: Return just the font name (e.g. "Inter"). font_heading = display/h1 font. font_heading_sub = h2/h3 if different. font_body = body/p font.
Logo rules: Only pick URLs from the provided image list. Prefer SVG or PNG with "logo" in the path.`

  let parsed: Record<string, unknown>
  try {
    const response = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 3000,
      messages:   [{ role: 'user', content: prompt }],
    })
    const raw   = response.content.find(b => b.type === 'text')?.text ?? ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return { error: 'AI could not extract brand data from that page.' }
    parsed = JSON.parse(match[0])
  } catch (err) {
    return { error: `AI extraction failed: ${(err as Error).message}` }
  }

  // 6. Build discovered assets list — validate each URL is in our resolved list
  //    to prevent Claude hallucinating URLs
  const resolvedSet = new Set(resolvedImgs)
  function validAssetUrl(v: unknown): string | null {
    if (typeof v !== 'string' || !v.trim()) return null
    const resolved = resolve(v)
    // Accept if it was in our scraped list OR is an absolute URL that looks real
    if (resolved && (resolvedSet.has(resolved) || /^https?:\/\//i.test(v))) return resolved
    return null
  }

  const discoveredAssets: ScanResult['discoveredAssets'] = []
  const logoUrl  = validAssetUrl(parsed.logo_url)
  const logoUrl2 = validAssetUrl(parsed.logo_url_2)
  const favUrl   = validAssetUrl(parsed.favicon_url)
  const heroUrl  = validAssetUrl(parsed.hero_image_url)

  if (logoUrl)  discoveredAssets.push({ url: logoUrl,  role: 'primary_logo',   label: 'Primary Logo' })
  if (logoUrl2) discoveredAssets.push({ url: logoUrl2, role: 'secondary_logo',  label: 'Logo Variant' })
  if (favUrl && favUrl !== logoUrl)
                discoveredAssets.push({ url: favUrl,   role: 'favicon',         label: 'Favicon' })
  if (heroUrl)  discoveredAssets.push({ url: heroUrl,  role: 'hero_image',      label: 'Hero Image' })

  // Additional images from image_urls array (up to 10)
  const usedUrls = new Set([logoUrl, logoUrl2, favUrl, heroUrl].filter(Boolean))
  const imageUrls = Array.isArray(parsed.image_urls) ? parsed.image_urls : []
  let imgCount = 0
  for (const raw of imageUrls) {
    if (imgCount >= 10) break
    const url = validAssetUrl(raw)
    if (!url || usedUrls.has(url)) continue
    usedUrls.add(url)
    imgCount++
    discoveredAssets.push({ url, role: 'general', label: `Image ${imgCount}` })
  }

  return {
    company_name:      str(parsed.company_name),
    tagline:           str(parsed.tagline),
    footer_text:       str(parsed.footer_text),
    brand_tone:        str(parsed.brand_tone),
    brand_style:       str(parsed.brand_style),
    brand_voice_notes: str(parsed.brand_voice_notes),
    color_primary:     str(parsed.color_primary),
    color_secondary:   str(parsed.color_secondary),
    color_accent:      str(parsed.color_accent),
    color_background:  str(parsed.color_background),
    color_text:        str(parsed.color_text),
    color_button:      str(parsed.color_button),
    font_heading:      str(parsed.font_heading),
    font_heading_sub:  str(parsed.font_heading_sub),
    font_body:         str(parsed.font_body),
    social_links:      typeof parsed.social_links === 'object' && parsed.social_links !== null
                         ? parsed.social_links as Record<string, string>
                         : undefined,
    color_palette:     paletteColors,
    discoveredAssets,
  }
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}

// ── Register scanned asset from URL (server-side download + upload) ───────────
// Downloads the image from the discovered URL and uploads to Supabase Storage,
// then registers the asset row. Called after user confirms scan results.

export async function registerScannedAsset(input: {
  brandProfileId:  string
  sourceUrl:       string
  assetRole:       string
  label:           string
}) {
  const { supabase, userId, workspaceId } = await getSession()

  // Download the image server-side
  let buffer: Buffer
  let mimeType = 'image/png'
  let fileName = input.label.replace(/\s+/g, '-').toLowerCase() + '.png'

  try {
    const res = await fetch(input.sourceUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Appalix/1.0)' },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    mimeType = res.headers.get('content-type')?.split(';')[0] ?? mimeType
    const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg').replace('svg+xml', 'svg') ?? 'png'
    fileName  = input.label.replace(/\s+/g, '-').toLowerCase() + '.' + ext
    buffer    = Buffer.from(await res.arrayBuffer())
  } catch (err) {
    throw new Error(`Could not download asset: ${(err as Error).message}`)
  }

  // Upload to Supabase Storage
  const path = `brand-assets/${workspaceId}/${input.assetRole}/${Date.now()}-${fileName}`
  const { error: uploadErr } = await supabase.storage
    .from('workspace-assets')
    .upload(path, buffer, { contentType: mimeType, upsert: false })

  if (uploadErr) throw uploadErr

  const { data: { publicUrl } } = supabase.storage
    .from('workspace-assets')
    .getPublicUrl(path)

  // Register asset row
  const { data, error } = await db(supabase)
    .from('brand_assets')
    .insert({
      workspace_id:        workspaceId,
      brand_profile_id:    input.brandProfileId,
      asset_type:          ['primary_logo', 'secondary_logo', 'logo_mark'].includes(input.assetRole) ? 'logo'
                         : input.assetRole === 'favicon' ? 'favicon'
                         : mimeType.startsWith('image/') ? 'image' : 'other',
      asset_role:          input.assetRole,
      source:              'manual_url',
      file_url:            publicUrl,
      storage_path:        path,
      file_name:           fileName,
      file_size:           buffer.length,
      mime_type:           mimeType,
      label:               input.label,
      is_approved:         false,
      is_primary:          false,
      is_archived:         false,
      is_system_generated: true,
      updated_by:          userId,
    })
    .select('id')
    .single()

  if (error) throw error
  revalidatePath('/sage/branding')
  return (data as { id: string }).id
}
