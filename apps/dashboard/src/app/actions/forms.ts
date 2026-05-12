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

  // Pick a random image so two forms made from the same template don't look
  // identical in My Forms. Skips images already used by the template's other
  // blocks so we don't accidentally re-pick the same one.
  const IMAGE_POOL = [
    'baby-shower.jpg', 'balloons-beach.jpg', 'bbq-party.jpg', 'bride-beach.jpg',
    'business-team.jpg', 'cafe-staff.jpg', 'dim-sum.jpg', 'garden-dinner.jpg',
    'graduation.jpg', 'kids-birthday.jpg', 'runners.jpg', 'shopping-woman.jpg',
    'solar-couple.jpg', 'summer-fashion.jpg', 'yoga-class.jpg',
  ]
  const usedSrcs = new Set<string>()
  for (const b of t.config.blocks ?? []) {
    if (b.type === 'image' && typeof b.props.src === 'string') usedSrcs.add(b.props.src)
  }
  function randomImage(exclude: Set<string>): string {
    const candidates = IMAGE_POOL.filter(n => !exclude.has(`/form-images/${n}`))
    const pool = candidates.length > 0 ? candidates : IMAGE_POOL
    return `/form-images/${pool[Math.floor(Math.random() * pool.length)]}`
  }
  const remappedBlocks = (t.config.blocks ?? []).map(b => {
    if (b.type !== 'image' || !b.props.src) return b
    const fresh = randomImage(usedSrcs)
    usedSrcs.add(fresh)
    return { ...b, props: { ...b.props, src: fresh } }
  })

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
      blocks:       remappedBlocks,
      behaviour:    defaultBehaviour,
      theme:        t.theme ?? {},
      embed_key:    embedKey,
      public_slug:  publicSlug,
      created_by:   ctx.userId,
    })
    .select('*')
    .single()

  if (error || !form) return { error: error?.message ?? 'Failed to create form' }
  revalidatePath('/dashboard/forms'); revalidatePath('/dashboard/forms/templates')
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
  // Also revalidate public slug so preview always reflects latest saved state
  const { data: slug } = await admin.from('forms').select('public_slug').eq('id', id).single()
  if (slug?.public_slug) revalidatePath(`/f/${slug.public_slug}`)
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

  // Ensure slug/key exist — generate if missing (e.g. older forms or direct DB inserts)
  const embedKey   = f.embed_key   ?? generateEmbedKey()
  const publicSlug = f.public_slug ?? generatePublicSlug()

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
      embed_key:         embedKey,
      public_slug:       publicSlug,
    })
    .eq('id', id)
    .eq('workspace_id', ctx.workspaceId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/forms'); revalidatePath('/dashboard/forms/templates')
  revalidatePath(`/dashboard/forms/${id}/edit`)
  revalidatePath(`/f/${publicSlug}`)

  return { embedKey, publicSlug }
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
  revalidatePath('/dashboard/forms'); revalidatePath('/dashboard/forms/templates')
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
  revalidatePath('/dashboard/forms'); revalidatePath('/dashboard/forms/templates')
  return {}
}

/**
 * Find duplicate forms in the workspace (same template_id + name) and keep
 * only the most recently updated one per group. Older copies get archived.
 * Published forms are preferred over drafts — if both exist, the published
 * one wins regardless of update time.
 */
export async function dedupeForms(): Promise<{ archived: number; error?: string }> {
  const ctx = await getWorkspaceAndUser()
  if (!ctx) return { archived: 0, error: 'Not authenticated' }
  const admin = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('forms')
    .select('id, name, template_id, status, updated_at')
    .eq('workspace_id', ctx.workspaceId)
    .neq('status', 'archived')

  if (error) return { archived: 0, error: error.message }

  type Row = { id: string; name: string; template_id: string | null; status: string; updated_at: string }
  const rows = (data ?? []) as Row[]

  const groups = new Map<string, Row[]>()
  for (const r of rows) {
    const key = `${r.template_id ?? 'no-template'}::${r.name.trim().toLowerCase()}`
    const list = groups.get(key) ?? []
    list.push(r)
    groups.set(key, list)
  }

  const idsToArchive: string[] = []
  for (const list of groups.values()) {
    if (list.length < 2) continue
    // Sort: published first, then most recently updated
    list.sort((a, b) => {
      if (a.status === 'published' && b.status !== 'published') return -1
      if (b.status === 'published' && a.status !== 'published') return 1
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })
    // Keep [0], archive the rest
    for (let i = 1; i < list.length; i++) idsToArchive.push(list[i].id)
  }

  if (idsToArchive.length === 0) return { archived: 0 }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: archiveErr } = await (admin as any)
    .from('forms')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .in('id', idsToArchive)

  if (archiveErr) return { archived: 0, error: archiveErr.message }
  revalidatePath('/dashboard/forms'); revalidatePath('/dashboard/forms/templates')
  return { archived: idsToArchive.length }
}

/**
 * Bulk-archive every draft form in the workspace. Used to clean up the long
 * tail of forms that get created every time a user opens a template card.
 */
export async function bulkArchiveDrafts(): Promise<{ archived: number; error?: string }> {
  const ctx = await getWorkspaceAndUser()
  if (!ctx) return { archived: 0, error: 'Not authenticated' }
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('forms')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('workspace_id', ctx.workspaceId)
    .eq('status', 'draft')
    .select('id')
  if (error) return { archived: 0, error: error.message }
  revalidatePath('/dashboard/forms'); revalidatePath('/dashboard/forms/templates')
  return { archived: (data ?? []).length }
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
  revalidatePath('/dashboard/forms'); revalidatePath('/dashboard/forms/templates')
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
