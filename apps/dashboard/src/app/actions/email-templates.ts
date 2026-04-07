'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { resolveBrandAssets } from '@/lib/brand/resolve-brand-assets'
import { renderEmailHtml, type TemplateContent } from '@/lib/email-templates/html-renderer'
import type { TemplateStyle } from '@/lib/email-templates/presets'
import type { CampaignIntent } from '@/lib/email-templates/variations'

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
  return {
    supabase,
    userId:      user.id,
    workspaceId: (data as { workspace_id: string }).workspace_id,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EmailTemplateRow {
  id:                   string
  workspace_id:         string
  brand_profile_id:     string
  name:                 string
  description:          string | null
  template_style:       TemplateStyle
  campaign_intent:      CampaignIntent | null
  variation_name:       string | null
  variation_index:      number | null
  template_source:      'primary' | 'secondary' | null
  content_json:         TemplateContent
  asset_snapshot_json:  Record<string, unknown>
  brand_version:        number | null
  created_by:           string | null
  created_at:           string
  updated_at:           string
}

// ── Actions ───────────────────────────────────────────────────────────────────

export async function listEmailTemplates(brandProfileId: string): Promise<EmailTemplateRow[]> {
  const { supabase, workspaceId } = await getSession()

  const { data, error } = await db(supabase)
    .from('email_templates')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('brand_profile_id', brandProfileId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as EmailTemplateRow[]
}

export async function createEmailTemplate(input: {
  brandProfileId:  string
  name:            string
  style:           TemplateStyle
  content:         TemplateContent
  campaignIntent?: CampaignIntent
  variationName?:  string
  variationIndex?: 1 | 2 | 3 | 4
  templateSource?: 'primary' | 'secondary'
}): Promise<string> {
  const { supabase, userId, workspaceId } = await getSession()

  // Fetch profile + assets to build snapshot
  const { data: profile } = await db(supabase)
    .from('brand_profiles')
    .select('*')
    .eq('id', input.brandProfileId)
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .single()

  if (!profile) throw new Error('Brand profile not found')

  const { data: assets } = await db(supabase)
    .from('brand_assets')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('brand_profile_id', input.brandProfileId)
    .eq('is_archived', false)
    .is('deleted_at', null)

  const snapshot = resolveBrandAssets(profile, assets ?? [])

  const { data: row, error } = await db(supabase)
    .from('email_templates')
    .insert({
      workspace_id:        workspaceId,
      brand_profile_id:    input.brandProfileId,
      name:                input.name.trim() || 'Untitled Template',
      template_style:      input.style,
      content_json:        input.content,
      asset_snapshot_json: snapshot,
      brand_version:       profile.brand_version ?? null,
      created_by:          userId,
      campaign_intent:     input.campaignIntent  ?? null,
      variation_name:      input.variationName   ?? null,
      variation_index:     input.variationIndex  ?? null,
      template_source:     input.templateSource  ?? null,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/sage/branding')
  return (row as { id: string }).id
}

export async function updateEmailTemplate(input: {
  templateId: string
  name?:      string
  content?:   TemplateContent
  refreshSnapshot?: boolean
}): Promise<void> {
  const { supabase, workspaceId } = await getSession()

  // Verify ownership
  const { data: existing } = await db(supabase)
    .from('email_templates')
    .select('id, brand_profile_id, brand_version')
    .eq('id', input.templateId)
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .single()

  if (!existing) throw new Error('Template not found')

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.name    !== undefined) patch.name         = input.name.trim() || 'Untitled Template'
  if (input.content !== undefined) patch.content_json = input.content

  if (input.refreshSnapshot) {
    const { data: profile } = await db(supabase)
      .from('brand_profiles')
      .select('*')
      .eq('id', (existing as { brand_profile_id: string }).brand_profile_id)
      .single()

    const { data: assets } = await db(supabase)
      .from('brand_assets')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('brand_profile_id', (existing as { brand_profile_id: string }).brand_profile_id)
      .eq('is_archived', false)
      .is('deleted_at', null)

    if (profile) {
      patch.asset_snapshot_json = resolveBrandAssets(profile, assets ?? [])
      patch.brand_version       = profile.brand_version ?? null
    }
  }

  const { error } = await db(supabase)
    .from('email_templates')
    .update(patch)
    .eq('id', input.templateId)
    .eq('workspace_id', workspaceId)

  if (error) throw new Error(error.message)
  revalidatePath('/sage/branding')
}

export async function deleteEmailTemplate(templateId: string): Promise<void> {
  const { supabase, workspaceId } = await getSession()

  const { error } = await db(supabase)
    .from('email_templates')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', templateId)
    .eq('workspace_id', workspaceId)

  if (error) throw new Error(error.message)
  revalidatePath('/sage/branding')
}

export async function renderTemplatePreview(input: {
  style:   TemplateStyle
  content: TemplateContent
  brandProfileId: string
}): Promise<string> {
  const { supabase, workspaceId } = await getSession()

  const { data: profile } = await db(supabase)
    .from('brand_profiles')
    .select('*')
    .eq('id', input.brandProfileId)
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .single()

  const { data: assets } = await db(supabase)
    .from('brand_assets')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('brand_profile_id', input.brandProfileId)
    .eq('is_archived', false)
    .is('deleted_at', null)

  const snapshot = resolveBrandAssets(profile ?? { id: input.brandProfileId } as Parameters<typeof resolveBrandAssets>[0], assets ?? [])
  return renderEmailHtml(input.style, input.content, snapshot)
}
