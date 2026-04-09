'use server'

/**
 * automation-templates-service.ts
 *
 * CRUD + DAG-building for automation_templates.
 *
 * All mutations use the admin client (RLS bypass). Reads use the anon client
 * where possible (RLS policies allow workspace members to select templates).
 *
 * Service contract:
 *   listAutomationTemplates  → AutomationTemplate[]
 *   getAutomationTemplate    → AutomationTemplate | null
 *   createAutomationTemplate → AutomationTemplate
 *   updateAutomationTemplate → AutomationTemplate
 *   deleteAutomationTemplate → void
 *   buildAutomationTemplate  → AutomationStepDefinition[]  (DAG builder helper)
 */

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { redirect }                         from 'next/navigation'
import type {
  AutomationTemplate,
  AutomationStepDefinition,
  AutomationType,
  AutomationTriggerType,
  AutomationTemplateChannel,
  BuilderGraph,
  AutomationExecutionRow,
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

// ── 1. listAutomationTemplates ────────────────────────────────────────────────
/**
 * Returns all active templates for the workspace + all system templates.
 * Workspace templates appear before system templates in the result.
 */
export async function listAutomationTemplates(opts?: {
  automationType?:  AutomationType
  channel?:         AutomationTemplateChannel
  includeInactive?: boolean
}): Promise<AutomationTemplate[]> {
  const workspaceId = await getWorkspaceId()
  const admin       = createAdminClient()

  let query = admin
    .from('automation_templates')
    .select('*')
    .or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)

  if (!opts?.includeInactive) {
    query = query.eq('is_active', true)
  }
  if (opts?.automationType) {
    query = query.eq('automation_type', opts.automationType)
  }
  if (opts?.channel) {
    query = query.eq('primary_channel', opts.channel)
  }

  const { data, error } = await query.order('is_system', { ascending: true }).order('name')

  if (error) {
    console.error('[automation-templates] listAutomationTemplates:', error.message)
    return []
  }

  return (data ?? []) as AutomationTemplate[]
}

// ── 2. getAutomationTemplate ──────────────────────────────────────────────────

export async function getAutomationTemplate(
  templateId: string,
): Promise<AutomationTemplate | null> {
  const workspaceId = await getWorkspaceId()
  const admin       = createAdminClient()

  const { data, error } = await admin
    .from('automation_templates')
    .select('*')
    .eq('id', templateId)
    .or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
    .single()

  if (error || !data) return null
  return data as AutomationTemplate
}

// ── 3. createAutomationTemplate ───────────────────────────────────────────────

export async function createAutomationTemplate(input: {
  name:             string
  description?:     string
  automation_type:  AutomationType
  trigger_type?:    AutomationTriggerType
  primary_channel?: AutomationTemplateChannel
  steps?:           AutomationStepDefinition[]
  entry_step_id?:   string
}): Promise<AutomationTemplate> {
  const workspaceId = await getWorkspaceId()
  const admin       = createAdminClient()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await admin
    .from('automation_templates')
    .insert({
      workspace_id:    workspaceId,
      name:            input.name,
      description:     input.description   ?? null,
      automation_type: input.automation_type,
      trigger_type:    input.trigger_type   ?? 'manual',
      primary_channel: input.primary_channel ?? 'email',
      steps:           input.steps          ?? [],
      entry_step_id:   input.entry_step_id  ?? null,
      is_active:       true,
      is_system:       false,
      created_by:      user?.id ?? null,
    })
    .select('*')
    .single()

  if (error) throw new Error(`[automation-templates] createAutomationTemplate: ${error.message}`)
  return data as AutomationTemplate
}

// ── 4. updateAutomationTemplate ───────────────────────────────────────────────
/**
 * Partial update. version is auto-bumped by the DB trigger.
 */
export async function updateAutomationTemplate(
  templateId: string,
  patch: Partial<{
    name:             string
    description:      string | null
    automation_type:  AutomationType
    trigger_type:     AutomationTriggerType
    primary_channel:  AutomationTemplateChannel
    steps:            AutomationStepDefinition[]
    entry_step_id:    string | null
    is_active:        boolean
  }>,
): Promise<AutomationTemplate> {
  const workspaceId = await getWorkspaceId()
  const admin       = createAdminClient()

  const { data, error } = await admin
    .from('automation_templates')
    .update(patch)
    .eq('id', templateId)
    .eq('workspace_id', workspaceId)   // Never allow system template mutation here
    .select('*')
    .single()

  if (error) throw new Error(`[automation-templates] updateAutomationTemplate: ${error.message}`)
  return data as AutomationTemplate
}

// ── 5. deleteAutomationTemplate ───────────────────────────────────────────────
/**
 * Soft-delete: sets is_active = false.
 * Hard delete not permitted from the service layer (use migration for system cleanup).
 */
export async function deleteAutomationTemplate(templateId: string): Promise<void> {
  const workspaceId = await getWorkspaceId()
  const admin       = createAdminClient()

  const { error } = await admin
    .from('automation_templates')
    .update({ is_active: false })
    .eq('id', templateId)
    .eq('workspace_id', workspaceId)

  if (error) throw new Error(`[automation-templates] deleteAutomationTemplate: ${error.message}`)
}

// ── 6. saveBuilderGraph ───────────────────────────────────────────────────────
/**
 * Persists the visual builder graph into config_json and syncs steps/entry_step_id
 * so the scheduler can execute it. Converts BuilderGraph edges → steps DAG.
 */
export async function saveBuilderGraph(
  templateId: string,
  graph:      BuilderGraph,
  meta?: {
    name?:            string
    description?:     string
    automation_type?: AutomationType
    trigger_type?:    AutomationTriggerType
    primary_channel?: AutomationTemplateChannel
  },
): Promise<AutomationTemplate> {
  const workspaceId = await getWorkspaceId()
  const admin       = createAdminClient()

  // Convert graph → scheduler steps
  // Build adjacency from edges
  const nextMap    = new Map<string, string>()   // node → next (no-branch or yes)
  const yesMap     = new Map<string, string>()
  const noMap      = new Map<string, string>()
  for (const e of graph.edges) {
    if (e.branch === 'yes')  yesMap.set(e.from, e.to)
    else if (e.branch === 'no') noMap.set(e.from, e.to)
    else nextMap.set(e.from, e.to)
  }

  const steps: AutomationStepDefinition[] = []
  for (const node of graph.nodes) {
    if (node.type === 'trigger') continue  // trigger is not a scheduler step
    steps.push({
      id:              node.id,
      type:            node.type as AutomationStepDefinition['type'],
      label:           node.label,
      config:          node.config,
      delay_hours:     node.delay_hours,
      next_step_id:    yesMap.get(node.id) ?? nextMap.get(node.id) ?? null,
      on_fail_step_id: null,
      branch_yes_id:   yesMap.get(node.id) ?? null,
      branch_no_id:    noMap.get(node.id) ?? null,
    })
  }

  // Entry step = first non-trigger node reachable from trigger
  const triggerNode = graph.nodes.find(n => n.type === 'trigger')
  const entryStepId = triggerNode
    ? (nextMap.get(triggerNode.id) ?? yesMap.get(triggerNode.id) ?? null)
    : (graph.entryNodeId ?? steps[0]?.id ?? null)

  const patch: Record<string, unknown> = {
    config_json:  graph,
    steps,
    entry_step_id: entryStepId,
    ...meta,
  }

  const { data, error } = await admin
    .from('automation_templates')
    .update(patch)
    .eq('id', templateId)
    .eq('workspace_id', workspaceId)
    .select('*')
    .single()

  if (error) throw new Error(`[automation-templates] saveBuilderGraph: ${error.message}`)
  return data as AutomationTemplate
}

// ── 7. duplicateAutomationTemplate ────────────────────────────────────────────
export async function duplicateAutomationTemplate(
  templateId: string,
): Promise<AutomationTemplate> {
  const workspaceId = await getWorkspaceId()
  const admin       = createAdminClient()
  const supabase    = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const src = await getAutomationTemplate(templateId)
  if (!src) throw new Error('Template not found')

  const { data, error } = await admin
    .from('automation_templates')
    .insert({
      workspace_id:    workspaceId,
      name:            `${src.name} (copy)`,
      description:     src.description,
      automation_type: src.automation_type,
      trigger_type:    src.trigger_type,
      primary_channel: src.primary_channel,
      steps:           src.steps,
      entry_step_id:   src.entry_step_id,
      config_json:     src.config_json,
      is_active:       false,
      is_system:       false,
      created_by:      user?.id ?? null,
    })
    .select('*')
    .single()

  if (error) throw new Error(`[automation-templates] duplicateAutomationTemplate: ${error.message}`)
  return data as AutomationTemplate
}

// ── 8. listExecutions ─────────────────────────────────────────────────────────
/**
 * Returns execution rows for the workspace, optionally filtered by status.
 * Joins template name + contact name for display.
 */
export async function listExecutions(opts?: {
  status?: string | string[]
  limit?:  number
}): Promise<AutomationExecutionRow[]> {
  const workspaceId = await getWorkspaceId()
  const admin       = createAdminClient()

  let query = admin
    .from('automation_executions')
    .select('id, workspace_id, template_id, contact_id, deal_id, lead_automation_id, trigger_type, status, current_step_id, step_count, next_step_at, completed_at, failed_at, created_at, updated_at')
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false })
    .limit(opts?.limit ?? 100)

  if (opts?.status) {
    const statuses = Array.isArray(opts.status) ? opts.status : [opts.status]
    query = query.in('status', statuses)
  }

  const { data: rows, error } = await query
  if (error) {
    console.error('[automation-templates] listExecutions:', error.message)
    return []
  }

  if (!rows || rows.length === 0) return []

  type RawExec = {
    id: string; workspace_id: string; template_id: string | null; contact_id: string | null
    deal_id: string | null; lead_automation_id: string | null; trigger_type: string
    status: string; current_step_id: string | null; step_count: number
    next_step_at: string | null; completed_at: string | null; failed_at: string | null
    created_at: string; updated_at: string
  }

  const execs = rows as RawExec[]

  // Batch fetch template names + contact names
  const templateIds = [...new Set(execs.map(e => e.template_id).filter(Boolean))] as string[]
  const contactIds  = [...new Set(execs.map(e => e.contact_id).filter(Boolean))]  as string[]

  const [templatesRes, contactsRes] = await Promise.all([
    templateIds.length > 0
      ? admin.from('automation_templates').select('id, name').in('id', templateIds)
      : { data: [] },
    contactIds.length > 0
      ? admin.from('sage_contacts').select('id, name, email').in('id', contactIds)
      : { data: [] },
  ])

  const tMap = new Map((templatesRes.data ?? []).map((t: { id: string; name: string }) => [t.id, t.name]))
  const cMap = new Map((contactsRes.data ?? []).map((c: { id: string; name: string; email: string | null }) => [c.id, c]))

  return execs.map(e => ({
    ...e,
    template_name:  e.template_id ? (tMap.get(e.template_id) ?? null) : null,
    contact_name:   e.contact_id  ? (cMap.get(e.contact_id)?.name  ?? null) : null,
    contact_email:  e.contact_id  ? (cMap.get(e.contact_id)?.email ?? null) : null,
  }))
}

// ── 9. buildAutomationTemplate ────────────────────────────────────────────────
/**
 * DAG builder helper: takes a linear sequence of step definitions and wires
 * next_step_id automatically. Returns the steps array + entry_step_id.
 *
 * Usage:
 *   const { steps, entry_step_id } = buildAutomationTemplate([
 *     { id: 'step_1', type: 'send_email', label: 'Initial Outreach', config: { template_category: 'initial_outreach' } },
 *     { id: 'step_2', type: 'wait', label: 'Wait 2 days', config: {}, delay_hours: 48 },
 *     { id: 'step_3', type: 'send_email', label: 'Follow-up', config: { template_category: 'follow_up' } },
 *   ])
 */
export async function buildAutomationTemplate(
  steps: Omit<AutomationStepDefinition, 'next_step_id' | 'on_fail_step_id'>[],
): Promise<{ steps: AutomationStepDefinition[]; entry_step_id: string | null }> {
  if (steps.length === 0) return { steps: [], entry_step_id: null }

  const wired: AutomationStepDefinition[] = steps.map((step, i) => ({
    ...step,
    next_step_id:    i + 1 < steps.length ? steps[i + 1].id : null,
    on_fail_step_id: null,
  }))

  return { steps: wired, entry_step_id: wired[0].id }
}
