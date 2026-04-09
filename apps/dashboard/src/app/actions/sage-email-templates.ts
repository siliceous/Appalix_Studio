'use server'

/**
 * sage-email-templates.ts
 *
 * CRUD + lookup + rendering for sage_email_templates.
 *
 * Service contract:
 *   listSageEmailTemplates      → SageEmailTemplate[]
 *   getSageEmailTemplate        → SageEmailTemplate | null
 *   createSageEmailTemplate     → SageEmailTemplate
 *   updateSageEmailTemplate     → SageEmailTemplate
 *   deleteSageEmailTemplate     → void
 *
 *   findBestEmailTemplate       → EmailTemplateResolveResult | null
 *     Pure DB lookup + precedence resolver. No AI, no inference.
 *     Precedence: exact(workspace) → category(workspace) → exact(system) → category(system)
 *
 *   buildEmailFromTemplate      → { subject: string; body: string }
 *     Deterministic {{variable}} substitution. No AI.
 *
 *   inferEmailStyleFromTemplates → Partial<EmailStyleMetadata>
 *     Analyses workspace templates and returns a cached style profile.
 *     Called ONLY at template create/update — never per-send.
 *     Phase 1: stores the result in style_metadata_json for later use.
 *
 *   trackEmailTemplateUsage     → void
 *     Appends to sage_email_template_usage (fire-and-forget).
 */

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { redirect }                         from 'next/navigation'
import type {
  SageEmailTemplate,
  EmailTemplateCategory,
  EmailTemplateChannel,
  EmailTemplateSelectionMode,
  EmailStyleMetadata,
  AutomationType,
  EmailTemplateLookupContext,
  EmailTemplateResolveResult,
} from '@/lib/types'

// ── Workspace helper ──────────────────────────────────────────────────────────

async function getWorkspaceId(): Promise<string> {
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
  return (data as { workspace_id: string }).workspace_id
}

// ── Variable extraction helper ────────────────────────────────────────────────

function extractVariables(subject: string | null, body: string): string[] {
  const combined = `${subject ?? ''} ${body}`
  const matches  = combined.match(/\{\{(\w+)\}\}/g) ?? []
  return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))]
}

// ── 1. listSageEmailTemplates ─────────────────────────────────────────────────

export async function listSageEmailTemplates(opts?: {
  category?:      EmailTemplateCategory
  channel?:       EmailTemplateChannel
  includeSystem?: boolean
}): Promise<SageEmailTemplate[]> {
  const workspaceId = await getWorkspaceId()
  const admin       = createAdminClient()

  let query = admin
    .from('sage_email_templates')
    .select('*')
    .eq('is_active', true)

  if (opts?.includeSystem !== false) {
    // Default: workspace templates + system templates
    query = query.or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
  } else {
    query = query.eq('workspace_id', workspaceId)
  }

  if (opts?.category) query = query.eq('category', opts.category)
  if (opts?.channel)  query = query.eq('channel',  opts.channel)

  const { data, error } = await query
    .order('is_system', { ascending: true })
    .order('name')

  if (error) {
    console.error('[sage-email-templates] listSageEmailTemplates:', error.message)
    return []
  }
  return (data ?? []) as SageEmailTemplate[]
}

// ── 2. getSageEmailTemplate ───────────────────────────────────────────────────

export async function getSageEmailTemplate(
  templateId: string,
): Promise<SageEmailTemplate | null> {
  const workspaceId = await getWorkspaceId()
  const admin       = createAdminClient()

  const { data, error } = await admin
    .from('sage_email_templates')
    .select('*')
    .eq('id', templateId)
    .or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
    .single()

  if (error || !data) return null
  return data as SageEmailTemplate
}

// ── 3. createSageEmailTemplate ────────────────────────────────────────────────

export async function createSageEmailTemplate(input: {
  name:              string
  description?:      string
  category:          EmailTemplateCategory
  automation_type?:  AutomationType
  channel?:          EmailTemplateChannel
  subject_template?: string
  body_template:     string
}): Promise<SageEmailTemplate> {
  const workspaceId = await getWorkspaceId()
  const admin       = createAdminClient()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const variables = extractVariables(input.subject_template ?? null, input.body_template)

  // Infer style from this template at creation time
  const style_metadata_json = inferStyleFromContent(
    input.subject_template ?? null,
    input.body_template,
  )

  const { data, error } = await admin
    .from('sage_email_templates')
    .insert({
      workspace_id:       workspaceId,
      name:               input.name,
      description:        input.description    ?? null,
      category:           input.category,
      automation_type:    input.automation_type ?? null,
      channel:            input.channel         ?? 'email',
      subject_template:   input.subject_template ?? null,
      body_template:      input.body_template,
      variables,
      style_metadata_json,
      is_active:          true,
      is_system:          false,
      created_by:         user?.id ?? null,
    })
    .select('*')
    .single()

  if (error) throw new Error(`[sage-email-templates] createSageEmailTemplate: ${error.message}`)
  return data as SageEmailTemplate
}

// ── 4. updateSageEmailTemplate ────────────────────────────────────────────────

export async function updateSageEmailTemplate(
  templateId: string,
  patch: Partial<{
    name:              string
    description:       string | null
    category:          EmailTemplateCategory
    automation_type:   AutomationType | null
    channel:           EmailTemplateChannel
    subject_template:  string | null
    body_template:     string
    is_active:         boolean
  }>,
): Promise<SageEmailTemplate> {
  const workspaceId = await getWorkspaceId()
  const admin       = createAdminClient()

  // Re-extract variables and re-infer style if content changed
  const updates: Record<string, unknown> = { ...patch }
  if (patch.body_template !== undefined || patch.subject_template !== undefined) {
    // Fetch current to merge subject/body for variable extraction
    const current = await getSageEmailTemplate(templateId)
    const subject  = patch.subject_template !== undefined ? patch.subject_template : current?.subject_template ?? null
    const body     = patch.body_template    !== undefined ? patch.body_template    : current?.body_template    ?? ''

    updates.variables           = extractVariables(subject, body)
    updates.style_metadata_json = inferStyleFromContent(subject, body)
  }

  const { data, error } = await admin
    .from('sage_email_templates')
    .update(updates)
    .eq('id', templateId)
    .eq('workspace_id', workspaceId)
    .select('*')
    .single()

  if (error) throw new Error(`[sage-email-templates] updateSageEmailTemplate: ${error.message}`)
  return data as SageEmailTemplate
}

// ── 5. deleteSageEmailTemplate ────────────────────────────────────────────────

export async function deleteSageEmailTemplate(templateId: string): Promise<void> {
  const workspaceId = await getWorkspaceId()
  const admin       = createAdminClient()

  const { error } = await admin
    .from('sage_email_templates')
    .update({ is_active: false })
    .eq('id', templateId)
    .eq('workspace_id', workspaceId)

  if (error) throw new Error(`[sage-email-templates] deleteSageEmailTemplate: ${error.message}`)
}

// ── 6. findBestEmailTemplate ──────────────────────────────────────────────────
/**
 * Pure DB lookup + precedence resolver.
 *
 * Precedence order:
 *   1. Workspace template, exact match (category + automation_type)
 *   2. Workspace template, category-only match
 *   3. System template, exact match
 *   4. System template, category-only match
 *
 * Returns null only if no template exists at all for the category.
 * The 'style_inferred' and 'fallback' modes are Phase 2.
 */
export async function findBestEmailTemplate(
  ctx: EmailTemplateLookupContext,
): Promise<EmailTemplateResolveResult | null> {
  const admin   = createAdminClient()
  const channel = ctx.channel ?? 'email'

  // Fetch all active candidates: workspace + system, matching category + channel
  const { data, error } = await admin
    .from('sage_email_templates')
    .select('*')
    .eq('is_active', true)
    .eq('category', ctx.category)
    .eq('channel', channel)
    .or(`workspace_id.eq.${ctx.workspace_id},workspace_id.is.null`)
    .order('is_system', { ascending: true }) // workspace templates first

  if (error || !data || data.length === 0) return null

  const templates = data as SageEmailTemplate[]

  // Tier 1: workspace exact
  if (ctx.automation_type) {
    const tier1 = templates.find(
      t => t.workspace_id === ctx.workspace_id && t.automation_type === ctx.automation_type,
    )
    if (tier1) return { template: tier1, selection_mode: 'exact' }
  }

  // Tier 2: workspace category-only
  const tier2 = templates.find(
    t => t.workspace_id === ctx.workspace_id && t.automation_type === null,
  )
  if (tier2) return { template: tier2, selection_mode: 'category' }

  // Tier 3: system exact
  if (ctx.automation_type) {
    const tier3 = templates.find(
      t => t.workspace_id === null && t.automation_type === ctx.automation_type,
    )
    if (tier3) return { template: tier3, selection_mode: 'exact' }
  }

  // Tier 4: system category-only
  const tier4 = templates.find(
    t => t.workspace_id === null && t.automation_type === null,
  )
  if (tier4) return { template: tier4, selection_mode: 'category' }

  return null
}

// ── 7. buildEmailFromTemplate ─────────────────────────────────────────────────
/**
 * Deterministic {{variable}} substitution.
 * Unknown variables are left as-is (not removed) so they surface in QA.
 */
export async function buildEmailFromTemplate(
  templateId:  string,
  variables:   Record<string, string>,
): Promise<{ subject: string; body: string }> {
  const template = await getSageEmailTemplate(templateId)
  if (!template) throw new Error(`[sage-email-templates] Template ${templateId} not found`)

  const substitute = (text: string): string =>
    text.replace(/\{\{(\w+)\}\}/g, (match, key: string) => variables[key] ?? match)

  return {
    subject: substitute(template.subject_template ?? ''),
    body:    substitute(template.body_template),
  }
}

// ── 8. inferEmailStyleFromTemplates ──────────────────────────────────────────
/**
 * Analyses all workspace email templates and returns a style profile.
 * Called at template create/update time — never per-send.
 *
 * Phase 1: rule-based heuristics only (no AI call).
 * Phase 2: will call an AI model to produce richer analysis.
 */
export async function inferEmailStyleFromTemplates(
  workspaceId: string,
): Promise<Partial<EmailStyleMetadata>> {
  const admin = createAdminClient()

  const { data } = await admin
    .from('sage_email_templates')
    .select('subject_template, body_template')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .eq('channel', 'email')

  const templates = (data ?? []) as { subject_template: string | null; body_template: string }[]
  if (templates.length === 0) return {}

  // Sample up to 10 templates for heuristic analysis
  const sample = templates.slice(0, 10)
  const bodies = sample.map(t => t.body_template).join('\n---\n')

  return inferStyleFromContent(null, bodies)
}

// ── 9. trackEmailTemplateUsage ────────────────────────────────────────────────
/**
 * Fire-and-forget append to sage_email_template_usage.
 * Never throws — usage tracking must not block message sending.
 */
export async function trackEmailTemplateUsage(opts: {
  workspace_id:   string
  template_id?:   string
  execution_id?:  string
  contact_id?:    string
  selection_mode: EmailTemplateSelectionMode
  channel?:       EmailTemplateChannel
}): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin.from('sage_email_template_usage').insert({
      workspace_id:   opts.workspace_id,
      template_id:    opts.template_id   ?? null,
      execution_id:   opts.execution_id  ?? null,
      contact_id:     opts.contact_id    ?? null,
      selection_mode: opts.selection_mode,
      channel:        opts.channel       ?? 'email',
    })
  } catch (err) {
    console.error('[sage-email-templates] trackEmailTemplateUsage failed (non-fatal):', err)
  }
}

// ── Internal: rule-based style inference ─────────────────────────────────────
/**
 * Heuristic style inference from template content.
 * Extracted as a pure function so it can be called at create/update time
 * and from inferEmailStyleFromTemplates().
 */
function inferStyleFromContent(
  subject: string | null,
  body:    string,
): Partial<EmailStyleMetadata> {
  const text = `${subject ?? ''} ${body}`.toLowerCase()

  // Tone: formal / casual / friendly
  const formalSignals   = /\bregards\b|\bdear\b|\bsincerely\b|\bplease find\b|\bhope this email finds\b/
  const casualSignals   = /\bhey\b|\bhi there\b|\bthanks!\b|\bcheers\b/
  const friendlySignals = /\bhope you're\b|\blooking forward\b|\blove to\b|\bgreat to\b/

  const tone: EmailStyleMetadata['tone'] =
    formalSignals.test(text)   ? 'formal'   :
    casualSignals.test(text)   ? 'casual'   :
    friendlySignals.test(text) ? 'friendly' :
    'casual'

  // Greeting style
  const greetingMatch = body.match(/^(hi|hello|hey|dear)\s+\{\{[^}]+\}\}/i)
  const greeting_style = greetingMatch ? greetingMatch[1] : (tone === 'formal' ? 'Dear' : 'Hi')

  // Signoff style
  const signoffMatch = body.match(/(best|thanks|regards|cheers|warm regards|kind regards)[,\n]/i)
  const signoff_style = signoffMatch ? signoffMatch[1] : (tone === 'formal' ? 'Regards' : 'Best')

  // CTA style
  const cta_style: EmailStyleMetadata['cta_style'] =
    /would you be open|is this something you'd consider|does this resonate/i.test(text) ? 'question' :
    /let me know|feel free|happy to/i.test(text)                                       ? 'soft'     :
    'direct'

  // Paragraph density
  const paragraphs = body.split(/\n\n+/).filter(p => p.trim().length > 0)
  const avgLength  = paragraphs.reduce((sum, p) => sum + p.length, 0) / Math.max(1, paragraphs.length)
  const paragraph_density: EmailStyleMetadata['paragraph_density'] =
    avgLength < 100 ? 'short' : avgLength < 300 ? 'medium' : 'long'

  // Formatting style
  const has_html = /<[a-z][\s\S]*>/i.test(body)
  const formatting_style: EmailStyleMetadata['formatting_style'] =
    !has_html ? 'plain' :
    /<table|<img|<div style/i.test(body) ? 'rich_html' : 'light_html'

  return {
    tone,
    greeting_style,
    signoff_style,
    cta_style,
    paragraph_density,
    formatting_style,
    brand_terms: [],
  }
}
