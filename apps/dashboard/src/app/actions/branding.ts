'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
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

async function recomputeScore(admin: ReturnType<typeof createAdminClient>, profileId: string, workspaceId: string) {
  const { data: p } = await admin.from('brand_profiles')
    .select('id, company_name, color_primary, brand_tone, footer_text, font_heading, font_body, contact_details_json')
    .eq('id', profileId).eq('workspace_id', workspaceId).maybeSingle()
  if (!p) return
  // Any non-archived approved logo counts (no need for is_primary)
  const { data: logoCheck } = await admin.from('brand_assets')
    .select('id')
    .eq('brand_profile_id', profileId)
    .in('asset_role', ['primary_logo', 'secondary_logo', 'logo_mark'])
    .eq('is_approved', true).eq('is_archived', false).is('deleted_at', null)
    .limit(1).maybeSingle()
  const newScore = computeConfidenceScore(p as Record<string, unknown>, logoCheck !== null)
  await admin.from('brand_profiles')
    .update({ brand_confidence_score: newScore })
    .eq('id', profileId).eq('workspace_id', workspaceId)
}

/** Strip tracking params and normalize a URL for dedup */
function normalizeUrl(u: string): string {
  try {
    const parsed = new URL(u)
    parsed.search = ''
    parsed.hash   = ''
    return parsed.href.toLowerCase()
  } catch {
    return u.toLowerCase().split('?')[0]
  }
}

// ── Public types ──────────────────────────────────────────────────────────────

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

export interface ScanSessionRow {
  id:              string
  brand_profile_id: string
  website_url:     string
  status:          string
  is_ecommerce:    boolean
  new_asset_count: number
  scan_summary: {
    fonts?:        { heading?: string; headingSub?: string; body?: string }
    allImageUrls?: Array<{ url: string; role: string; label: string }>
    shownImageCount?: number
    colorCount?:   number
    logoCount?:    number
    imageCount?:   number
    ecommerceSignals?: string[]
  }
  created_at:  string
  completed_at: string | null
}

export interface CandidateRow {
  id:               string
  brand_profile_id: string
  scan_session_id:  string
  asset_type:       'logo' | 'favicon' | 'image' | 'product_image' | 'color'
  asset_role:       string | null
  title:            string | null
  value:            string | null
  source_url:       string | null
  metadata:         Record<string, unknown>
  status:           'candidate' | 'saved' | 'ignored'
  created_at:       string
}

// ── Brand Profile CRUD ────────────────────────────────────────────────────────

export async function saveBrandProfile(formData: BrandProfileFormData, profileId?: string) {
  const { supabase, userId, workspaceId } = await getSession()

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
    'font_heading', 'font_heading_sub', 'font_body', 'brand_palette_json', 'brand_tone',
    'brand_style', 'cta_style', 'brand_voice_notes', 'social_links_json', 'contact_details_json',
  ])

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

export async function createPrimaryBrandProfile(): Promise<string> {
  const { userId, workspaceId } = await getSession()
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('brand_profiles')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('brand_type', 'workspace')
    .is('deleted_at', null)
    .maybeSingle()
  if (existing) throw new Error('A primary brand profile already exists')

  const { data, error } = await admin
    .from('brand_profiles')
    .insert({
      workspace_id:           workspaceId,
      brand_type:             'workspace',
      name:                   'My Brand',
      brand_version:          1,
      brand_confidence_score: 0,
      updated_by:             userId,
    })
    .select('id')
    .single()

  if (error) throw error
  revalidatePath('/sage/branding')
  return (data as { id: string }).id
}

export async function createClientBrandProfile(input: {
  name:         string
  companyName?: string
}): Promise<string> {
  const { userId, workspaceId } = await getSession()
  const admin = createAdminClient()

  const initialScore = input.companyName ? 1 : 0

  const { data, error } = await admin
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

export async function renameBrandProfile(profileId: string, name: string) {
  const { userId, workspaceId } = await getSession()
  const admin = createAdminClient()

  const { error } = await admin
    .from('brand_profiles')
    .update({ name: name.trim(), updated_by: userId, updated_at: new Date().toISOString() })
    .eq('id', profileId)
    .eq('workspace_id', workspaceId)

  if (error) throw error
  revalidatePath('/sage/branding')
}

export async function deleteClientBrandProfile(profileId: string) {
  const { workspaceId } = await getSession()
  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('brand_profiles')
    .select('id, brand_type')
    .eq('id', profileId)
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .single()

  if (!profile) throw new Error('Profile not found')
  if ((profile as { brand_type: string }).brand_type === 'workspace') {
    throw new Error('Primary brand cannot be deleted')
  }

  const { error } = await admin
    .from('brand_profiles')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', profileId)
    .eq('workspace_id', workspaceId)

  if (error) throw error
  revalidatePath('/sage/branding')
}

// ── Colour palette management ─────────────────────────────────────────────────

export async function deleteColor(profileId: string, hex: string): Promise<void> {
  const { workspaceId } = await getSession()
  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('brand_profiles')
    .select('brand_palette_json')
    .eq('id', profileId)
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .single()
  if (!profile) throw new Error('Profile not found')

  const existing = ((profile as { brand_palette_json?: Array<{ hex: string; uses: number; roles: string }> })
    .brand_palette_json ?? [])
  const updated = existing.filter(c => c.hex.toLowerCase() !== hex.toLowerCase())

  await admin
    .from('brand_profiles')
    .update({ brand_palette_json: updated, updated_at: new Date().toISOString() })
    .eq('id', profileId)

  revalidatePath('/sage/branding')
}

// ── Font management ───────────────────────────────────────────────────────────

export async function saveFonts(
  profileId: string,
  fonts: { heading?: string; headingSub?: string; body?: string },
): Promise<void> {
  const { userId, workspaceId } = await getSession()
  const admin = createAdminClient()

  const patch: Record<string, string | null> = {
    updated_by: userId,
    updated_at: new Date().toISOString(),
  }
  if (fonts.heading    !== undefined) patch.font_heading     = fonts.heading    || null
  if (fonts.headingSub !== undefined) patch.font_heading_sub = fonts.headingSub || null
  if (fonts.body       !== undefined) patch.font_body        = fonts.body       || null

  const { error } = await admin
    .from('brand_profiles')
    .update(patch)
    .eq('id', profileId)
    .eq('workspace_id', workspaceId)
  if (error) throw error
  await recomputeScore(admin, profileId, workspaceId)
  revalidatePath('/sage/branding')
}

// ── Scan session + candidates ─────────────────────────────────────────────────

export async function startBrandScan(
  profileId: string,
  url:        string,
): Promise<{
  sessionId:  string
  newCount:   number
  colorCount: number
  logoCount:  number
  imageCount: number
  isEcommerce: boolean
  fonts: { heading?: string; headingSub?: string; body?: string }
  message: string
}> {
  const { workspaceId } = await getSession()
  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('brand_profiles')
    .select('id, brand_palette_json')
    .eq('id', profileId)
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .single()
  if (!profile) throw new Error('Profile not found')

  const { data: sessionRow } = await admin
    .from('brand_scan_sessions')
    .insert({
      workspace_id:     workspaceId,
      brand_profile_id: profileId,
      website_url:      url,
      status:           'running',
    })
    .select('id')
    .single()
  if (!sessionRow) throw new Error('Failed to create scan session')
  const sessionId = (sessionRow as { id: string }).id

  try {
    // Run the website scan (calls Claude)
    const scanResult = await scanWebsiteForBrand(url)
    if ('error' in scanResult) {
      await admin.from('brand_scan_sessions')
        .update({ status: 'failed', completed_at: new Date().toISOString() })
        .eq('id', sessionId)
      throw new Error(scanResult.error)
    }

    // Retire previous candidates for this profile (superseded by new scan)
    await admin.from('brand_asset_candidates')
      .update({ status: 'ignored' })
      .eq('brand_profile_id', profileId)
      .eq('workspace_id', workspaceId)
      .eq('status', 'candidate')

    // Saved state for dedup — use source_url only (file_url is a storage URL, never matches scan URLs)
    const [{ data: savedAssets }, { data: savedCandidates }] = await Promise.all([
      admin.from('brand_assets')
        .select('source_url, asset_role')
        .eq('brand_profile_id', profileId)
        .eq('is_archived', false)
        .is('deleted_at', null),
      admin.from('brand_asset_candidates')
        .select('source_url, asset_role')
        .eq('brand_profile_id', profileId)
        .eq('workspace_id', workspaceId)
        .eq('status', 'saved'),
    ])
    type AssetUrlRow = { source_url?: string | null; asset_role?: string | null }
    const toNormUrl = (a: AssetUrlRow) => a.source_url ? normalizeUrl(a.source_url) : null
    const savedUrls = new Set<string>([
      ...(savedAssets    ?? []).map(toNormUrl).filter((u): u is string => !!u),
      ...(savedCandidates ?? []).map(toNormUrl).filter((u): u is string => !!u),
    ])
    // Role-based dedup: if a logo role already exists, don't re-suggest it
    const savedLogoRolesSet = new Set<string>(
      [...(savedAssets ?? []), ...(savedCandidates ?? [])]
        .map(a => (a as AssetUrlRow).asset_role)
        .filter((r): r is string => !!r)
    )

    const savedPalette = new Set(
      ((profile as { brand_palette_json?: Array<{ hex: string }> }).brand_palette_json ?? [])
        .map(c => c.hex.toLowerCase())
    )

    // ── Color candidates ──────────────────────────────────────────────────
    const rawColors: string[] = [
      ...(scanResult.color_palette ?? []).map(c => c.hex),
      scanResult.color_primary,
      scanResult.color_secondary,
      scanResult.color_accent,
      scanResult.color_background,
      scanResult.color_text,
    ].filter((c): c is string => typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c))

    const uniqueNewColors = [...new Set(rawColors.map(c => c.toLowerCase()))]
      .filter(c => !savedPalette.has(c))
      .slice(0, 15)

    // ── Logo / favicon candidates ─────────────────────────────────────────
    const logoRoles = new Set(['primary_logo', 'secondary_logo', 'logo_mark', 'favicon'])
    const newLogos = scanResult.discoveredAssets
      .filter(a => logoRoles.has(a.role))
      .filter(a => !savedUrls.has(normalizeUrl(a.url)))
      .filter(a => !savedLogoRolesSet.has(a.role))

    // ── Image candidates (show first 20, store rest for "collect more") ───
    const allNewImages = scanResult.discoveredAssets
      .filter(a => !logoRoles.has(a.role))
      .filter(a => !savedUrls.has(normalizeUrl(a.url)))
    const shownImages = allNewImages.slice(0, 20)

    // Ecommerce detection (basic HTML signals)
    const isEcommerce = false  // TODO: pass HTML signals from scan if needed

    // ── Insert candidates ─────────────────────────────────────────────────
    type CandidateInsert = {
      workspace_id: string; brand_profile_id: string; scan_session_id: string
      asset_type: string; asset_role?: string; title?: string; value?: string
      source_url?: string; status: string
    }
    const rows: CandidateInsert[] = [
      ...uniqueNewColors.map(hex => ({
        workspace_id: workspaceId, brand_profile_id: profileId, scan_session_id: sessionId,
        asset_type: 'color', title: hex, value: hex, status: 'candidate',
      })),
      ...newLogos.map(a => ({
        workspace_id: workspaceId, brand_profile_id: profileId, scan_session_id: sessionId,
        asset_type: a.role === 'favicon' ? 'favicon' : 'logo',
        asset_role: a.role, title: a.label, value: a.url, source_url: a.url, status: 'candidate',
      })),
      ...shownImages.map(a => ({
        workspace_id: workspaceId, brand_profile_id: profileId, scan_session_id: sessionId,
        asset_type: 'image', asset_role: a.role, title: a.label,
        value: a.url, source_url: a.url, status: 'candidate',
      })),
    ]
    if (rows.length > 0) {
      await admin.from('brand_asset_candidates').insert(rows)
    }

    const colorCount = uniqueNewColors.length
    const logoCount  = newLogos.length
    const imageCount = shownImages.length
    const newCount   = colorCount + logoCount + imageCount

    const fonts = {
      heading:    scanResult.font_heading     ?? undefined,
      headingSub: scanResult.font_heading_sub ?? undefined,
      body:       scanResult.font_body        ?? undefined,
    }

    await admin.from('brand_scan_sessions').update({
      status:          'completed',
      is_ecommerce:    isEcommerce,
      new_asset_count: newCount,
      scan_summary: {
        fonts,
        allImageUrls:    allNewImages.slice(20).map(a => ({ url: a.url, role: a.role, label: a.label })),
        shownImageCount: imageCount,
        colorCount, logoCount, imageCount,
        ecommerceSignals: [],
      },
      completed_at: new Date().toISOString(),
    }).eq('id', sessionId)

    revalidatePath('/sage/branding')
    return {
      sessionId, newCount, colorCount, logoCount, imageCount,
      isEcommerce, fonts,
      message: newCount > 0
        ? `Scan complete. Found ${newCount} new asset${newCount === 1 ? '' : 's'}.`
        : 'No new assets found. Your saved assets are already up to date.',
    }
  } catch (err) {
    await admin.from('brand_scan_sessions')
      .update({ status: 'failed', completed_at: new Date().toISOString() })
      .eq('id', sessionId)
    throw err
  }
}

export async function collectMoreImages(sessionId: string, profileId: string): Promise<{ count: number }> {
  const { workspaceId } = await getSession()
  const admin = createAdminClient()

  const { data: sessionRow } = await admin
    .from('brand_scan_sessions')
    .select('scan_summary')
    .eq('id', sessionId)
    .eq('workspace_id', workspaceId)
    .single()
  if (!sessionRow) throw new Error('Session not found')

  type SummaryRow = { scan_summary: { allImageUrls?: Array<{ url: string; role: string; label: string }>; shownImageCount?: number } }
  const summary = (sessionRow as SummaryRow).scan_summary
  const remaining = summary?.allImageUrls ?? []
  if (remaining.length === 0) return { count: 0 }

  const nextBatch = remaining.slice(0, 12)
  const rows = nextBatch.map(a => ({
    workspace_id: workspaceId, brand_profile_id: profileId, scan_session_id: sessionId,
    asset_type: 'image', asset_role: a.role, title: a.label,
    value: a.url, source_url: a.url, status: 'candidate',
  }))
  await admin.from('brand_asset_candidates').insert(rows)

  // Trim the shown ones from allImageUrls
  await admin.from('brand_scan_sessions').update({
    scan_summary: {
      ...summary,
      allImageUrls:    remaining.slice(12),
      shownImageCount: (summary?.shownImageCount ?? 0) + nextBatch.length,
    },
  }).eq('id', sessionId)

  revalidatePath('/sage/branding')
  return { count: nextBatch.length }
}

// ── Candidate management ──────────────────────────────────────────────────────

export async function saveCandidateAsset(candidateId: string): Promise<string> {
  const { workspaceId } = await getSession()
  const admin = createAdminClient()

  const { data: row } = await admin
    .from('brand_asset_candidates')
    .select('id, brand_profile_id, asset_type, asset_role, title, value, source_url')
    .eq('id', candidateId)
    .eq('workspace_id', workspaceId)
    .single()
  if (!row) throw new Error('Candidate not found')

  type Row = { id: string; brand_profile_id: string; asset_type: string; asset_role: string | null; title: string | null; value: string | null; source_url: string | null }
  const c = row as Row
  const sourceUrl = c.source_url ?? c.value
  if (!sourceUrl) throw new Error('No source URL')

  const assetId = await registerScannedAsset({
    brandProfileId: c.brand_profile_id,
    sourceUrl,
    assetRole:      c.asset_role ?? c.asset_type,
    label:          c.title ?? c.asset_type,
  })

  await admin.from('brand_asset_candidates')
    .update({ status: 'saved' })
    .eq('id', candidateId)

  // Recalculate confidence score when a logo is saved
  if (['logo', 'favicon'].includes(c.asset_type)) {
    await recomputeScore(admin, c.brand_profile_id, workspaceId)
  }

  revalidatePath('/sage/branding')
  return assetId
}

export async function saveColorCandidate(candidateId: string): Promise<void> {
  const { workspaceId } = await getSession()
  const admin = createAdminClient()

  const { data: row } = await admin
    .from('brand_asset_candidates')
    .select('id, brand_profile_id, value')
    .eq('id', candidateId)
    .eq('workspace_id', workspaceId)
    .single()
  if (!row) throw new Error('Candidate not found')

  const c = row as { id: string; brand_profile_id: string; value: string | null }
  const hex = c.value
  if (!hex) throw new Error('No hex value')

  const { data: profileRow } = await admin
    .from('brand_profiles')
    .select('brand_palette_json')
    .eq('id', c.brand_profile_id)
    .single()

  type PaletteEntry = { hex: string; uses: number; roles: string }
  const existing: PaletteEntry[] = ((profileRow as { brand_palette_json?: PaletteEntry[] } | null)?.brand_palette_json ?? [])
  if (!existing.some(e => e.hex.toLowerCase() === hex.toLowerCase())) {
    await admin.from('brand_profiles').update({
      brand_palette_json: [...existing, { hex, uses: 1, roles: 'scan' }],
      updated_at: new Date().toISOString(),
    }).eq('id', c.brand_profile_id)
  }

  await admin.from('brand_asset_candidates')
    .update({ status: 'saved' })
    .eq('id', candidateId)

  revalidatePath('/sage/branding')
}

export async function saveAllColorCandidates(profileId: string): Promise<void> {
  const { workspaceId } = await getSession()
  const admin = createAdminClient()

  const { data: colorRows } = await admin
    .from('brand_asset_candidates')
    .select('id, value')
    .eq('brand_profile_id', profileId)
    .eq('workspace_id', workspaceId)
    .eq('asset_type', 'color')
    .eq('status', 'candidate')
  if (!colorRows?.length) return

  const { data: profileRow } = await admin
    .from('brand_profiles')
    .select('brand_palette_json')
    .eq('id', profileId)
    .single()

  type PaletteEntry = { hex: string; uses: number; roles: string }
  const existing: PaletteEntry[] = ((profileRow as { brand_palette_json?: PaletteEntry[] } | null)?.brand_palette_json ?? [])
  const existingHexes = new Set(existing.map(e => e.hex.toLowerCase()))

  const newEntries: PaletteEntry[] = (colorRows as { id: string; value: string | null }[])
    .filter(r => r.value && !existingHexes.has(r.value.toLowerCase()))
    .map(r => ({ hex: r.value!, uses: 1, roles: 'scan' }))

  if (newEntries.length > 0) {
    await admin.from('brand_profiles').update({
      brand_palette_json: [...existing, ...newEntries].slice(0, 20),
      updated_at: new Date().toISOString(),
    }).eq('id', profileId)
  }

  await admin.from('brand_asset_candidates')
    .update({ status: 'saved' })
    .in('id', colorRows.map(r => r.id))

  revalidatePath('/sage/branding')
}

export async function ignoreCandidate(candidateId: string): Promise<void> {
  const { workspaceId } = await getSession()
  const admin = createAdminClient()
  await admin.from('brand_asset_candidates')
    .update({ status: 'ignored' })
    .eq('id', candidateId)
    .eq('workspace_id', workspaceId)
  revalidatePath('/sage/branding')
}

export async function ignoreCandidates(candidateIds: string[]): Promise<void> {
  if (!candidateIds.length) return
  const { workspaceId } = await getSession()
  const admin = createAdminClient()
  await admin.from('brand_asset_candidates')
    .update({ status: 'ignored' })
    .in('id', candidateIds)
    .eq('workspace_id', workspaceId)
  revalidatePath('/sage/branding')
}

// ── Brand Assets ──────────────────────────────────────────────────────────────

export async function registerBrandAsset(input: {
  brandProfileId:     string
  assetType:          string
  assetRole:          string
  source:             string
  fileUrl:            string
  storagePath:        string
  fileName:           string
  fileSize?:          number
  mimeType?:          string
  width?:             number
  height?:            number
  altText?:           string
  label?:             string
  isSystemGenerated?: boolean
}) {
  const { userId, workspaceId } = await getSession()
  const admin = createAdminClient()

  const { data, error } = await admin
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
      is_approved:         true,
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
  const { userId, workspaceId } = await getSession()
  const admin = createAdminClient()

  const { data: asset } = await admin
    .from('brand_assets')
    .select('asset_role, brand_profile_id')
    .eq('id', assetId)
    .eq('workspace_id', workspaceId)
    .single()

  if (!asset) throw new Error('Asset not found')
  const { asset_role: role, brand_profile_id: profileId } = asset as { asset_role: string; brand_profile_id: string }

  if (makePrimary) {
    await admin.from('brand_assets')
      .update({ is_primary: false })
      .eq('brand_profile_id', profileId)
      .eq('asset_role', role)
      .eq('is_primary', true)
      .neq('id', assetId)
  }

  const { error } = await admin.from('brand_assets')
    .update({ is_approved: true, is_primary: makePrimary, updated_by: userId })
    .eq('id', assetId)
    .eq('workspace_id', workspaceId)
  if (error) throw error

  if (['primary_logo', 'secondary_logo', 'logo_mark'].includes(role)) {
    await recomputeScore(admin, profileId, workspaceId)
  }

  revalidatePath('/sage/branding')
}

export async function archiveAsset(assetId: string) {
  const { userId, workspaceId } = await getSession()
  const admin = createAdminClient()
  const { error } = await admin.from('brand_assets')
    .update({ is_archived: true, is_primary: false, updated_by: userId })
    .eq('id', assetId).eq('workspace_id', workspaceId)
  if (error) throw error
  revalidatePath('/sage/branding')
}

export async function deleteAsset(assetId: string) {
  const { workspaceId } = await getSession()
  const admin = createAdminClient()
  const { error } = await admin.from('brand_assets')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', assetId).eq('workspace_id', workspaceId)
  if (error) throw error
  revalidatePath('/sage/branding')
}

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
  const { data: { publicUrl } } = supabase.storage.from('workspace-assets').getPublicUrl(path)
  return { signedUrl: data.signedUrl, path, token: data.token, publicUrl }
}

// ── Website scanner (kept for direct use; startBrandScan wraps this) ──────────

export interface ScanResult {
  company_name?:      string
  tagline?:           string
  footer_text?:       string
  brand_tone?:        string
  brand_style?:       string
  brand_voice_notes?: string
  color_primary?:     string
  color_secondary?:   string
  color_accent?:      string
  color_background?:  string
  color_text?:        string
  color_button?:      string
  color_palette?: Array<{ hex: string; uses: number; roles: string }>
  font_heading?:      string
  font_heading_sub?:  string
  font_body?:         string
  discoveredAssets: Array<{
    url:       string
    role:      'primary_logo' | 'secondary_logo' | 'favicon' | 'hero_image' | 'general'
    label:     string
    mimeType?: string
  }>
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

function normalizeColor(raw: string): string | null {
  const s = raw.trim().toLowerCase()
  if (s === 'transparent' || s === 'inherit' || s === 'currentcolor' || s === 'none') return null
  const h6 = s.match(/^#([0-9a-f]{6})$/);  if (h6) return `#${h6[1]}`
  const h8 = s.match(/^#([0-9a-f]{6})[0-9a-f]{2}$/); if (h8) return `#${h8[1]}`
  const h3 = s.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/)
  if (h3) return `#${h3[1]}${h3[1]}${h3[2]}${h3[2]}${h3[3]}${h3[3]}`
  const rgb = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/)
  if (rgb) return toHex(+rgb[1], +rgb[2], +rgb[3])
  const rgb2 = s.match(/^rgba?\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/)
  if (rgb2) return toHex(+rgb2[1], +rgb2[2], +rgb2[3])
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

function isTrivialColor(hex: string) {
  return ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff'].includes(hex)
}

interface ColorEntry { count: number; props: Record<string, number>; selectors: string[] }

function extractColorFrequencies(css: string): Map<string, ColorEntry> {
  const map = new Map<string, ColorEntry>()
  const COLOR_RE = /#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)/g
  const ruleRe = /([^{}@][^{}]*)\{([^{}]*)\}/g
  let rm: RegExpExecArray | null
  while ((rm = ruleRe.exec(css)) !== null) {
    const selector = rm[1].trim()
    const decls    = rm[2]
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

export async function scanWebsiteForBrand(url: string): Promise<ScanResult | { error: string }> {
  let html: string
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Appalix/1.0; +https://appalix.com)', 'Accept': 'text/html,application/xhtml+xml' },
      signal: AbortSignal.timeout(12_000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    html = await res.text()
  } catch (err) {
    return { error: `Could not fetch that URL: ${(err as Error).message}` }
  }

  const base = new URL(url)
  let m: RegExpExecArray | null
  const imgUrls: string[] = []

  const imgSrcRe = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
  while ((m = imgSrcRe.exec(html)) !== null) imgUrls.push(m[1])
  const imgDataSrcRe = /<img[^>]+data-(?:lazy-)?src=["']([^"']+)["'][^>]*>/gi
  while ((m = imgDataSrcRe.exec(html)) !== null) imgUrls.push(m[1])
  const srcsetRe = /srcset=["']([^"']+)["']/gi
  while ((m = srcsetRe.exec(html)) !== null) {
    const first = m[1].trim().split(/,\s*/)[0].trim().split(/\s+/)[0]
    if (first) imgUrls.push(first)
  }
  const sourceRe = /<source[^>]+srcset=["']([^"']+)["'][^>]*>/gi
  while ((m = sourceRe.exec(html)) !== null) {
    const first = m[1].trim().split(/,\s*/)[0].trim().split(/\s+/)[0]
    if (first) imgUrls.push(first)
  }
  const linkIconRe = /<link[^>]+(?:rel=["'][^"']*(?:icon|apple-touch-icon|shortcut)[^"']*["'])[^>]+href=["']([^"']+)["'][^>]*>/gi
  while ((m = linkIconRe.exec(html)) !== null) imgUrls.push(m[1])
  const linkIconRe2 = /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*(?:icon|apple-touch-icon|shortcut)[^"']*["'][^>]*>/gi
  while ((m = linkIconRe2.exec(html)) !== null) imgUrls.push(m[1])
  const bgInlineRe = /background(?:-image)?\s*:\s*url\(['"]?([^'"()]+\.(?:png|jpg|jpeg|gif|svg|webp)[^'"()]*?)['"]?\)/gi
  while ((m = bgInlineRe.exec(html)) !== null) imgUrls.push(m[1])

  const metaImgUrls: string[] = []
  const ogImgRe = /<meta[^>]+(?:property=["']og:image["']|name=["']twitter:image["'])[^>]+content=["']([^"']+)["'][^>]*>/gi
  while ((m = ogImgRe.exec(html)) !== null) { metaImgUrls.push(m[1]); imgUrls.push(m[1]) }
  const ogImgRe2 = /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property=["']og:image["']|name=["']twitter:image["'])[^>]*>/gi
  while ((m = ogImgRe2.exec(html)) !== null) { metaImgUrls.push(m[1]); imgUrls.push(m[1]) }

  function resolve(u: string) { try { return new URL(u, base).href } catch { return null } }
  const metaImgResolved = new Set(metaImgUrls.map(resolve).filter((u): u is string => !!u))

  const resolvedImgs = [...new Set(imgUrls)]
    .map(resolve)
    .filter((u): u is string => {
      if (!u) return false
      if (metaImgResolved.has(u)) return true
      if (/\.(png|jpg|jpeg|gif|svg|webp|ico)(\?|$)/i.test(u)) return true
      if (/\/_next\/image\?|\/image\?|\/images\/|\/img\/|\/media\/|\/assets\//i.test(u)) return true
      if (/cloudinary\.com|imgix\.net|imagekit\.io|amazonaws\.com\/.*\/(image|media|upload)\//i.test(u)) return true
      if (/cdn\.[^/]+\/.*(?:image|photo|media|banner|hero)/i.test(u)) return true
      return false
    })
    .slice(0, 60)

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 10_000)

  const styleBlocks: string[] = []
  const styleRe = /<style[^>]*>([\s\S]*?)<\/style>/gi
  while ((m = styleRe.exec(html)) !== null) styleBlocks.push(m[1])
  const inlineCss = styleBlocks.join('\n')

  const SKIP_DOMAINS = /fonts\.googleapis|fonts\.gstatic|cdn\.jsdelivr|unpkg\.com|cdnjs\.cloudflare|bootstrap\.min|fontawesome/i
  const cssLinkRe = /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["'][^>]*>/gi
  const externalCssUrls: string[] = []
  while ((m = cssLinkRe.exec(html)) !== null) {
    try { const href = new URL(m[1], base).href; if (!SKIP_DOMAINS.test(href)) externalCssUrls.push(href) } catch { /* skip */ }
  }
  const cssLinkRe2 = /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']stylesheet["'][^>]*>/gi
  while ((m = cssLinkRe2.exec(html)) !== null) {
    try { const href = new URL(m[1], base).href; if (!SKIP_DOMAINS.test(href) && !externalCssUrls.includes(href)) externalCssUrls.push(href) } catch { /* skip */ }
  }

  const prioritised = [
    ...externalCssUrls.filter(u => /style|main|app|global|theme|custom/i.test(u)),
    ...externalCssUrls.filter(u => !/style|main|app|global|theme|custom/i.test(u)),
  ].slice(0, 4)

  const fetchedCss: string[] = []
  await Promise.all(prioritised.map(async cssUrl => {
    try {
      const r = await fetch(cssUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Appalix/1.0)' }, signal: AbortSignal.timeout(6_000) })
      if (!r.ok) return
      fetchedCss.push((await r.text()).slice(0, 80_000))
    } catch { /* skip */ }
  }))

  const allCss = [inlineCss, ...fetchedCss].join('\n')

  const cssImgRe = /url\(['"]?([^'"()]+\.(?:png|jpg|jpeg|gif|svg|webp)[^'"()]{0,60}?)['"]?\)/gi
  let cssImgM: RegExpExecArray | null
  const cssImgExtras: string[] = []
  while ((cssImgM = cssImgRe.exec(allCss)) !== null) {
    const r = resolve(cssImgM[1]); if (r && !resolvedImgs.includes(r)) cssImgExtras.push(r)
  }
  const hasFaviconInList = resolvedImgs.some(u => /favicon/i.test(u) || /\.ico(\?|$)/i.test(u))
  if (!hasFaviconInList) cssImgExtras.push(new URL('/favicon.ico', base).href)
  resolvedImgs.push(...[...new Set(cssImgExtras)].slice(0, 80 - resolvedImgs.length))

  const colorFreqMap = extractColorFrequencies(allCss)
  const rankedColors = [...colorFreqMap.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 20)
  const paletteColors = rankedColors.slice(0, 10).map(([hex, e]) => ({
    hex, uses: e.count,
    roles: Object.entries(e.props).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}(${v})`).join(', '),
  }))

  const cssVarLines: string[] = []
  const fontVarMap: Record<string, string> = {}
  const rootRe2 = /:root\s*\{([^}]*)\}/gi
  let rootM: RegExpExecArray | null
  while ((rootM = rootRe2.exec(allCss)) !== null) {
    const varRe = /(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\))/g
    let v: RegExpExecArray | null
    while ((v = varRe.exec(rootM[1])) !== null) {
      const hex = normalizeColor(v[2]); cssVarLines.push(`${v[1]}: ${hex ?? v[2]}`)
    }
    const fontVarRe = /(--[\w-]*(?:font|heading|body|display|typeface)[\w-]*)\s*:\s*['"]?([A-Z][A-Za-z0-9 +-]{1,40})['"]?/g
    let fv: RegExpExecArray | null
    while ((fv = fontVarRe.exec(rootM[1])) !== null) {
      const name = fv[2].trim().replace(/,.*$/, '').trim()
      if (!/^(sans-serif|serif|monospace|inherit|initial|system-ui|ui-sans|ui-serif|Arial|Helvetica|Georgia|Times|Courier)$/i.test(name)) fontVarMap[fv[1]] = name
    }
  }

  const buttonColors: string[] = []
  const btnRe = /(?:button|\.btn|input\[type=["']?(?:submit|button)["']?])[^{}]*\{([^{}]*)\}/gi
  let btnM: RegExpExecArray | null
  while ((btnM = btnRe.exec(allCss)) !== null) {
    const colorRe = /(?:background(?:-color)?|color)\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\))/gi
    let cv: RegExpExecArray | null
    while ((cv = colorRe.exec(btnM[1])) !== null) {
      const hex = normalizeColor(cv[1]); if (hex && !isTrivialColor(hex)) buttonColors.push(hex)
    }
  }

  const themeColorRe = /<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)["'][^>]*>/i
  const metaThemeColor = themeColorRe.exec(html)?.[1] ?? null
  const ogImageTagRe = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i
  const ogImage = ogImageTagRe.exec(html)?.[1] ?? null

  const googleFonts: string[] = []
  function extractGoogleFontFamilies(urlStr: string) {
    try {
      // Decode HTML entities before parsing — &amp; in href attributes breaks URLSearchParams
      const decoded = urlStr.replace(/&amp;/g, '&').replace(/&#38;/g, '&')
      const u = new URL(decoded)
      const families = u.searchParams.getAll('family')
      if (families.length) {
        families.forEach(f => {
          f.split('|').forEach(fam => { const name = fam.split(':')[0].replace(/\+/g, ' ').trim(); if (name) googleFonts.push(name) })
        })
        return
      }
      const legacy = u.searchParams.get('families') ?? u.searchParams.get('family')
      if (legacy) legacy.split('|').forEach(f => googleFonts.push(f.split(':')[0].replace(/\+/g, ' ').trim()))
    } catch { /* skip */ }
  }
  const gfLinkRe = /<link[^>]+href=["']([^"']*fonts\.googleapis\.com[^"']*)["'][^>]*>/gi
  while ((m = gfLinkRe.exec(html)) !== null) extractGoogleFontFamilies(m[1])
  const gfLinkRe2 = /<link[^>]+href=["']([^"']*fonts\.googleapis\.com[^"']*)["'][^>]+rel=["']stylesheet["'][^>]*>/gi
  while ((m = gfLinkRe2.exec(html)) !== null) extractGoogleFontFamilies(m[1])
  const gfImportRe = /@import\s+url\(['"]?([^'"()]*fonts\.googleapis\.com[^'"()]*)['"]?\)/gi
  while ((m = gfImportRe.exec(allCss)) !== null) extractGoogleFontFamilies(m[1])
  const uniqueFonts = [...new Set(googleFonts)]

  const selfHostedFonts: string[] = []
  const fontFaceRe = /@font-face\s*\{([^}]*)\}/gi
  let ffM: RegExpExecArray | null
  while ((ffM = fontFaceRe.exec(allCss)) !== null) {
    const famMatch = /font-family\s*:\s*['"]?([^'";,\n]+?)['"]?\s*[;,\n]/i.exec(ffM[1])
    if (famMatch) { const name = famMatch[1].trim(); if (!/^(inherit|initial|unset|revert)$/i.test(name)) selfHostedFonts.push(name) }
  }
  const uniqueSelfHosted = [...new Set(selfHostedFonts)]

  const genericFamilies = /^(sans-serif|serif|monospace|inherit|initial|unset|revert|system-ui|ui-sans-serif|ui-serif|ui-monospace|-apple-system|BlinkMacSystemFont|cursive|fantasy)$/i
  function resolveFontStack(raw: string): string {
    // Resolve CSS variable if present
    const varRef = /^var\((--[\w-]+)\)/.exec(raw.trim())
    const resolved = varRef && fontVarMap[varRef[1]] ? fontVarMap[varRef[1]] : raw
    // Extract all named (non-generic) fonts from the stack
    const fonts = resolved
      .replace(/['"]/g, '')
      .split(',')
      .map(f => f.trim())
      .filter(f => f && !genericFamilies.test(f))
    return fonts.join(', ')
  }
  const headingFontRules: string[] = []
  const hFontRe = /([a-z.#][^{]*?)\s*\{[^}]*font-family\s*:\s*([^;}]+)/gi
  while ((m = hFontRe.exec(allCss)) !== null) {
    const selector = m[1].trim()
    if (!/(?:^|\s|,)(html|body|h[1-6]|p|li|\.[\w-]*(?:heading|title|display|body|text|font|content|copy|prose|para)[\w-]*)(?:\s|,|$)/i.test(selector)) continue
    const resolved = resolveFontStack(m[2])
    if (resolved) headingFontRules.push(`${selector}: ${resolved}`)
  }

  const footerRe = /<footer[^>]*>([\s\S]*?)<\/footer>/i
  const footerHtml = footerRe.exec(html)?.[1] ?? ''
  const footerText = footerHtml
    .replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500)

  const paletteLines = rankedColors.map(([hex, e], i) => {
    const propSummary = Object.entries(e.props).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}×${v}`).join(', ')
    return `${i + 1}. ${hex}  (${e.count} uses: ${propSummary})  — seen on: ${e.selectors.slice(0, 2).join(' | ')}`
  }).join('\n')

  const colorSignals = [
    metaThemeColor ? `meta theme-color: ${metaThemeColor}` : null,
    cssVarLines.length ? `Named design tokens in :root (most authoritative):\n${cssVarLines.slice(0, 40).join('\n')}` : null,
    buttonColors.length ? `Button/CTA colors (explicit): ${[...new Set(buttonColors)].join(', ')}` : null,
    rankedColors.length ? `All colors ranked by frequency across ${fetchedCss.length + 1} CSS files:\n${paletteLines}` : '(no colors found in CSS)',
  ].filter(Boolean).join('\n\n')

  const fontNote = [
    uniqueFonts.length > 0
      ? `Google Fonts explicitly loaded on this page (EVERY font listed here is actively used — you MUST assign each one to a field): ${uniqueFonts.map(f => `"${f}"`).join(', ')}.`
      : null,
    uniqueSelfHosted.length > 0 ? `Self-hosted / @font-face fonts (also actively used): ${[...new Set(uniqueSelfHosted)].map(f => `"${f}"`).join(', ')}.` : null,
    Object.keys(fontVarMap).length > 0 ? `Font CSS variables (from :root):\n${Object.entries(fontVarMap).map(([k, v]) => `  ${k}: "${v}"`).join('\n')}` : null,
    headingFontRules.length > 0 ? `CSS font-family rules — each value shows the full stack including fallbacks (first font is primary, others are fallbacks that are also loaded):\n${headingFontRules.slice(0, 20).join('\n')}` : null,
    (uniqueFonts.length === 0 && uniqueSelfHosted.length === 0 && Object.keys(fontVarMap).length === 0 && headingFontRules.length === 0) ? 'No fonts detected in CSS. Use null for all font fields.' : null,
  ].filter(Boolean).join('\n')

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
  "image_urls": ["up to 30 varied image URLs from the page — hero, product, feature, team, background images. Pick the best quality and most representative. No duplicates of logo/favicon."]
}

Color assignment rules (strict — do not guess):
1. Use named design tokens first.
2. Use button/CTA colors for color_button and color_accent.
3. Use frequency-ranked list: highest-frequency bg color → color_background. Highest-frequency text color → color_text.
4. If meta theme-color is present and no CSS var covers primary, use it for color_primary.
5. Return hex only (#rrggbb). Return null if uncertain.

Font rules:
- Return just the font name (e.g. "Inter", "Lato"). Never null if fonts were detected.
- CRITICAL: If multiple Google Fonts are listed above, EVERY single one must appear in at least one of the three font fields. Do not ignore any loaded font.
- font_heading: the primary display/heading font (dominant font for h1/h2 or the heavier/display weight).
- font_body: the body/paragraph font (used for p, li, small text — often a different, lighter font from font_heading).
- font_heading_sub: the secondary font. If font_heading ≠ font_body, set this to the same value as font_body. If there are 3 distinct fonts, use the third here. If only one font exists site-wide, copy it to all three fields.
- When CSS stack shows multiple fonts (e.g. "Montserrat, Lato"): the first is primary for that element; treat later loaded fonts as used for other element types — assign them to the appropriate field.

Logo rules: Only pick URLs from the provided image list. Prefer SVG or PNG with "logo" in the path.`

  console.log('[BrandScan] uniqueFonts:', uniqueFonts)
  console.log('[BrandScan] uniqueSelfHosted:', uniqueSelfHosted)
  console.log('[BrandScan] headingFontRules:', headingFontRules.slice(0, 8))

  let parsed: Record<string, unknown>
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001', max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    })
    const raw   = response.content.find(b => b.type === 'text')?.text ?? ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return { error: 'AI could not extract brand data from that page.' }
    parsed = JSON.parse(match[0])
  } catch (err) {
    return { error: `AI extraction failed: ${(err as Error).message}` }
  }

  console.log('[BrandScan] AI fonts raw:', { font_heading: parsed.font_heading, font_heading_sub: parsed.font_heading_sub, font_body: parsed.font_body })

  const resolvedSet = new Set(resolvedImgs)
  function validAssetUrl(v: unknown): string | null {
    if (typeof v !== 'string' || !v.trim()) return null
    const resolved = resolve(v)
    if (resolved && (resolvedSet.has(resolved) || /^https?:\/\//i.test(v))) return resolved
    return null
  }

  const discoveredAssets: ScanResult['discoveredAssets'] = []
  const logoUrl  = validAssetUrl(parsed.logo_url)
  const logoUrl2 = validAssetUrl(parsed.logo_url_2)
  const favUrl   = validAssetUrl(parsed.favicon_url)
  const heroUrl  = validAssetUrl(parsed.hero_image_url)

  if (logoUrl)  discoveredAssets.push({ url: logoUrl,  role: 'primary_logo',  label: 'Primary Logo' })
  if (logoUrl2) discoveredAssets.push({ url: logoUrl2, role: 'secondary_logo', label: 'Logo Variant' })
  if (favUrl && favUrl !== logoUrl) discoveredAssets.push({ url: favUrl, role: 'favicon', label: 'Favicon' })
  if (heroUrl)  discoveredAssets.push({ url: heroUrl,  role: 'hero_image',     label: 'Hero Image' })

  const usedUrls = new Set([logoUrl, logoUrl2, favUrl, heroUrl].filter(Boolean))
  const imageUrls = Array.isArray(parsed.image_urls) ? parsed.image_urls : []
  let imgCount = 0
  for (const raw of imageUrls) {
    if (imgCount >= 30) break
    const url = validAssetUrl(raw)
    if (!url || usedUrls.has(url)) continue
    usedUrls.add(url)
    imgCount++
    discoveredAssets.push({ url, role: 'general', label: `Image ${imgCount}` })
  }

  // Font fallback: if the AI missed any detected font, assign it to the first empty slot
  const allDetectedFonts = [...new Set([...uniqueFonts, ...uniqueSelfHosted])]
  if (allDetectedFonts.length > 0) {
    const assignedLower = new Set(
      [parsed.font_heading, parsed.font_heading_sub, parsed.font_body]
        .filter((f): f is string => typeof f === 'string' && !!f.trim())
        .map(f => f.toLowerCase())
    )
    for (const font of allDetectedFonts) {
      if (assignedLower.has(font.toLowerCase())) continue
      // Assign to first empty slot
      if (!parsed.font_heading)     { parsed.font_heading     = font; assignedLower.add(font.toLowerCase()); continue }
      if (!parsed.font_heading_sub) { parsed.font_heading_sub = font; assignedLower.add(font.toLowerCase()); continue }
      if (!parsed.font_body)        { parsed.font_body        = font; assignedLower.add(font.toLowerCase()); continue }
    }
    // If font_heading_sub is still empty and we have ≥2 distinct fonts, mirror font_body there
    if (!parsed.font_heading_sub && parsed.font_body && parsed.font_body !== parsed.font_heading) {
      parsed.font_heading_sub = parsed.font_body
    }
  }
  console.log('[BrandScan] Final fonts:', { font_heading: parsed.font_heading, font_heading_sub: parsed.font_heading_sub, font_body: parsed.font_body })

  return {
    company_name: str(parsed.company_name), tagline: str(parsed.tagline),
    footer_text: str(parsed.footer_text), brand_tone: str(parsed.brand_tone),
    brand_style: str(parsed.brand_style), brand_voice_notes: str(parsed.brand_voice_notes),
    color_primary: str(parsed.color_primary), color_secondary: str(parsed.color_secondary),
    color_accent: str(parsed.color_accent), color_background: str(parsed.color_background),
    color_text: str(parsed.color_text), color_button: str(parsed.color_button),
    font_heading: str(parsed.font_heading), font_heading_sub: str(parsed.font_heading_sub),
    font_body: str(parsed.font_body),
    social_links: typeof parsed.social_links === 'object' && parsed.social_links !== null
      ? parsed.social_links as Record<string, string> : undefined,
    color_palette: paletteColors, discoveredAssets,
  }
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}

// ── Register scanned asset (server-side download + storage upload) ─────────────

export async function registerScannedAsset(input: {
  brandProfileId: string
  sourceUrl:      string
  assetRole:      string
  label:          string
}) {
  const { userId, workspaceId } = await getSession()
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('brand_assets')
    .select('id')
    .eq('brand_profile_id', input.brandProfileId)
    .eq('source_url', input.sourceUrl)
    .eq('is_archived', false)
    .is('deleted_at', null)
    .maybeSingle()
  if (existing) return (existing as { id: string }).id

  let buffer: Buffer | null = null
  let mimeType = 'image/png'
  let fileName = input.label.replace(/\s+/g, '-').toLowerCase() + '.png'
  let storagePath: string | null = null
  let publicUrl = input.sourceUrl  // fallback: link to source directly

  try {
    const res = await fetch(input.sourceUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Appalix/1.0)', 'Referer': new URL(input.sourceUrl).origin },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    mimeType = res.headers.get('content-type')?.split(';')[0] ?? mimeType
    const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg').replace('svg+xml', 'svg') ?? 'png'
    fileName  = input.label.replace(/\s+/g, '-').toLowerCase() + '.' + ext
    buffer    = Buffer.from(await res.arrayBuffer())
  } catch {
    // Download failed — save with source URL as file_url; no local copy
  }

  if (buffer !== null) {
    const path = `brand-assets/${workspaceId}/${input.assetRole}/${Date.now()}-${fileName}`
    const { error: uploadErr } = await admin.storage
      .from('workspace-assets')
      .upload(path, buffer, { contentType: mimeType, upsert: false })
    if (!uploadErr) {
      storagePath = path
      publicUrl   = admin.storage.from('workspace-assets').getPublicUrl(path).data.publicUrl
    }
  }

  const { data, error } = await admin.from('brand_assets').insert({
    workspace_id:        workspaceId,
    brand_profile_id:    input.brandProfileId,
    asset_type:          ['primary_logo', 'secondary_logo', 'logo_mark'].includes(input.assetRole) ? 'logo'
                       : input.assetRole === 'favicon' ? 'favicon'
                       : mimeType.startsWith('image/') ? 'image' : 'other',
    asset_role:          input.assetRole,
    source:              'manual_url',
    file_url:            publicUrl,
    storage_path:        storagePath,
    file_name:           fileName,
    file_size:           buffer?.length ?? null,
    mime_type:           mimeType,
    label:               input.label,
    source_url:          input.sourceUrl,
    is_approved:         true,
    is_primary:          false,
    is_archived:         false,
    is_system_generated: true,
    updated_by:          userId,
  }).select('id').single()

  if (error) throw error
  revalidatePath('/sage/branding')
  return (data as { id: string }).id
}
