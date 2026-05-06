'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { randomBytes } from 'crypto'
import type {
  Form, FormTemplate, FormSubmission,
  FormStep, FormBlock, FormBehaviour, FormTheme,
  FormType, ChannelMode, FormGoal,
  TemplateFilters,
} from '@/features/forms/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getWorkspaceAndUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  const workspaceId = (data as { workspace_id: string } | null)?.workspace_id
  if (!workspaceId) return null
  return { userId: user.id, workspaceId }
}

function generateEmbedKey(): string {
  return randomBytes(16).toString('hex') // 32 hex chars
}

function generatePublicSlug(): string {
  return randomBytes(6).toString('hex') // 12 hex chars
}

// ── Templates ─────────────────────────────────────────────────────────────────

export async function listFormTemplates(
  filters?: Partial<TemplateFilters>
): Promise<FormTemplate[]> {
  const ctx = await getWorkspaceAndUser()
  if (!ctx) return []
  const admin = createAdminClient()

  let query = admin
    .from('forms_templates')
    .select('*')
    .or(`is_system_template.eq.true,workspace_id.eq.${ctx.workspaceId}`)
    .order('is_system_template', { ascending: false })
    .order('created_at', { ascending: true })

  if (filters?.goals?.length) {
    query = query.in('goal', filters.goals) as typeof query
  }
  if (filters?.types?.length) {
    query = query.in('type', filters.types) as typeof query
  }
  if (filters?.channels?.length) {
    query = query.in('channel_mode', filters.channels) as typeof query
  }
  if (filters?.multiStep !== null && filters?.multiStep !== undefined) {
    query = query.eq('is_multi_step', filters.multiStep) as typeof query
  }

  const { data } = await query
  let results = (data ?? []) as FormTemplate[]

  if (filters?.search) {
    const s = filters.search.toLowerCase()
    results = results.filter(t =>
      t.name.toLowerCase().includes(s) ||
      t.description?.toLowerCase().includes(s) ||
      t.tags.some(tag => tag.toLowerCase().includes(s))
    )
  }

  return results
}

// ── Forms CRUD ────────────────────────────────────────────────────────────────

export async function createFormFromTemplate(
  templateId: string,
  name: string
): Promise<{ form?: Form; error?: string }> {
  const ctx = await getWorkspaceAndUser()
  if (!ctx) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  const { data: template } = await admin
    .from('forms_templates')
    .select('*')
    .eq('id', templateId)
    .single()

  if (!template) return { error: 'Template not found' }

  const t = template as FormTemplate
  const embedKey   = generateEmbedKey()
  const publicSlug = generatePublicSlug()

  const defaultBehaviour: FormBehaviour = {
    audience:   { tags: [], listId: null },
    scheduling: { mode: 'always', startAt: null, endAt: null },
    display:    { trigger: 'delay', delaySeconds: 3 },
    targeting:  { devices: ['desktop', 'mobile'], hideForSources: [], urlRules: [] },
    frequency:  { mode: 'once_per_day' },
    abTesting:  { enabled: false, variants: [] },
    postSubmit: { createContact: true, createDeal: false, pipelineId: null, sendEmail: false, sendSms: false },
  }

  const { data: form, error } = await admin
    .from('forms')
    .insert({
      workspace_id: ctx.workspaceId,
      template_id:  templateId,
      name:         name.trim(),
      status:       'draft',
      type:         t.type,
      channel_mode: t.channel_mode,
      steps:        t.config.steps ?? [],
      blocks:       t.config.blocks ?? [],
      behaviour:    defaultBehaviour,
      theme:        t.theme ?? {},
      embed_key:    embedKey,
      public_slug:  publicSlug,
      created_by:   ctx.userId,
    })
    .select('*')
    .single()

  if (error || !form) return { error: error?.message ?? 'Failed to create form' }
  revalidatePath('/dashboard/forms')
  return { form: form as Form }
}

export async function listForms(filters?: {
  status?: string
  type?: FormType
  search?: string
}): Promise<Form[]> {
  const ctx = await getWorkspaceAndUser()
  if (!ctx) return []
  const admin = createAdminClient()

  let query = admin
    .from('forms')
    .select('*')
    .eq('workspace_id', ctx.workspaceId)
    .neq('status', 'archived')
    .order('updated_at', { ascending: false })

  if (filters?.status) query = query.eq('status', filters.status) as typeof query
  if (filters?.type)   query = query.eq('type', filters.type)   as typeof query

  const { data } = await query
  let results = (data ?? []) as Form[]

  if (filters?.search) {
    const s = filters.search.toLowerCase()
    results = results.filter(f => f.name.toLowerCase().includes(s))
  }

  return results
}

export async function getForm(id: string): Promise<Form | null> {
  const ctx = await getWorkspaceAndUser()
  if (!ctx) return null
  const admin = createAdminClient()
  const { data } = await admin
    .from('forms')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', ctx.workspaceId)
    .single()
  return (data as Form | null) ?? null
}

export async function updateForm(
  id: string,
  updates: Partial<Pick<Form, 'name' | 'steps' | 'blocks' | 'behaviour' | 'theme' | 'status'>>
): Promise<{ error?: string }> {
  const ctx = await getWorkspaceAndUser()
  if (!ctx) return { error: 'Not authenticated' }
  const admin = createAdminClient()
  const { error } = await admin
    .from('forms')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('workspace_id', ctx.workspaceId)
  if (error) return { error: error.message }
  revalidatePath(`/dashboard/forms/${id}/edit`)
  return {}
}

export async function publishForm(id: string): Promise<{
  embedKey?: string
  publicSlug?: string
  error?: string
}> {
  const ctx = await getWorkspaceAndUser()
  if (!ctx) return { error: 'Not authenticated' }
  const admin = createAdminClient()

  const { data: form } = await admin
    .from('forms')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', ctx.workspaceId)
    .single()

  if (!form) return { error: 'Form not found' }
  const f = form as Form

  const nextVersion = (f.published_version ?? 0) + 1

  // Save snapshot into form_versions
  await admin.from('form_versions').insert({
    form_id:        id,
    workspace_id:   ctx.workspaceId,
    version_number: nextVersion,
    snapshot:       { steps: f.steps, blocks: f.blocks, behaviour: f.behaviour, theme: f.theme },
    created_by:     ctx.userId,
  })

  const { error } = await admin
    .from('forms')
    .update({
      status:            'published',
      published_version: nextVersion,
      published_at:      new Date().toISOString(),
      updated_at:        new Date().toISOString(),
    })
    .eq('id', id)
    .eq('workspace_id', ctx.workspaceId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/forms')
  revalidatePath(`/dashboard/forms/${id}/edit`)

  return { embedKey: f.embed_key ?? undefined, publicSlug: f.public_slug ?? undefined }
}

export async function pauseForm(id: string): Promise<{ error?: string }> {
  const ctx = await getWorkspaceAndUser()
  if (!ctx) return { error: 'Not authenticated' }
  const admin = createAdminClient()
  const { error } = await admin
    .from('forms')
    .update({ status: 'paused', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('workspace_id', ctx.workspaceId)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/forms')
  return {}
}

export async function archiveForm(id: string): Promise<{ error?: string }> {
  const ctx = await getWorkspaceAndUser()
  if (!ctx) return { error: 'Not authenticated' }
  const admin = createAdminClient()
  const { error } = await admin
    .from('forms')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('workspace_id', ctx.workspaceId)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/forms')
  return {}
}

export async function duplicateForm(id: string): Promise<{ form?: Form; error?: string }> {
  const ctx = await getWorkspaceAndUser()
  if (!ctx) return { error: 'Not authenticated' }
  const admin = createAdminClient()

  const { data: source } = await admin
    .from('forms')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', ctx.workspaceId)
    .single()

  if (!source) return { error: 'Form not found' }
  const s = source as Form

  const { data: copy, error } = await admin
    .from('forms')
    .insert({
      workspace_id: ctx.workspaceId,
      template_id:  s.template_id,
      name:         `${s.name} (copy)`,
      status:       'draft',
      type:         s.type,
      channel_mode: s.channel_mode,
      steps:        s.steps,
      blocks:       s.blocks,
      behaviour:    s.behaviour,
      theme:        s.theme,
      embed_key:    generateEmbedKey(),
      public_slug:  generatePublicSlug(),
      created_by:   ctx.userId,
    })
    .select('*')
    .single()

  if (error || !copy) return { error: error?.message ?? 'Failed to duplicate' }
  revalidatePath('/dashboard/forms')
  return { form: copy as Form }
}

// ── Submissions ───────────────────────────────────────────────────────────────

export async function listFormSubmissions(
  formId: string,
  limit = 50
): Promise<FormSubmission[]> {
  const ctx = await getWorkspaceAndUser()
  if (!ctx) return []
  const admin = createAdminClient()
  const { data } = await admin
    .from('form_submissions')
    .select('*')
    .eq('workspace_id', ctx.workspaceId)
    .eq('form_id', formId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as FormSubmission[]
}

export async function getFormStats(formId: string): Promise<{
  views: number
  submissions: number
  conversionRate: number
}> {
  const ctx = await getWorkspaceAndUser()
  if (!ctx) return { views: 0, submissions: 0, conversionRate: 0 }
  const admin = createAdminClient()

  const [{ count: views }, { count: submissions }] = await Promise.all([
    admin
      .from('form_events')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', ctx.workspaceId)
      .eq('form_id', formId)
      .eq('event_type', 'view'),
    admin
      .from('form_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', ctx.workspaceId)
      .eq('form_id', formId),
  ])

  const v = views ?? 0
  const s = submissions ?? 0
  return {
    views:          v,
    submissions:    s,
    conversionRate: v > 0 ? Math.round((s / v) * 100) : 0,
  }
}

// ── Brand image assets (for form images panel) ────────────────────────────────

export async function getFormImages(): Promise<{
  profiles: Array<{ id: string; company_name: string | null }>
  assets:   Array<{ id: string; brand_profile_id: string; file_url: string; asset_role: string }>
}> {
  const ctx = await getWorkspaceAndUser()
  if (!ctx) return { profiles: [], assets: [] }
  const supabase = await createClient()
  const [{ data: profiles }, { data: assets }] = await Promise.all([
    supabase
      .from('brand_profiles')
      .select('id, company_name')
      .eq('workspace_id', ctx.workspaceId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true }),
    supabase
      .from('brand_assets')
      .select('id, brand_profile_id, file_url, asset_role')
      .eq('workspace_id', ctx.workspaceId)
      .eq('is_archived', false)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
  ])
  return {
    profiles: (profiles ?? []) as Array<{ id: string; company_name: string | null }>,
    assets:   (assets   ?? []) as Array<{ id: string; brand_profile_id: string; file_url: string; asset_role: string }>,
  }
}
