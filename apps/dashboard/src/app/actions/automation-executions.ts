'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

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

// ── Start a new automation execution for a contact/lead/conversation ──────────

export async function startAutomationExecution(input: {
  templateId:     string
  contactId?:     string | null
  sourceType:     string           // 'conversation' | 'form' | 'ticket' | 'manual'
  sourceRefId:    string           // conversation.id / lead.id / ticket.id
  contactName?:   string | null
  triggerPayload?: Record<string, unknown>
}): Promise<{ executionId: string; status: string }> {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  // Verify template exists and is active
  const { data: template } = await admin
    .from('automation_templates')
    .select('id, trigger_type, entry_step_id')
    .eq('id', input.templateId)
    .eq('is_active', true)
    .or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
    .maybeSingle()

  if (!template) throw new Error('Template not found or inactive')

  // Check if there is already a running/waiting execution for this source ref
  const { data: existing } = await admin
    .from('automation_executions')
    .select('id, status')
    .eq('workspace_id', workspaceId)
    .eq('template_id', input.templateId)
    .in('status', ['running', 'waiting', 'paused'])
    .filter('trigger_data->>source_ref_id', 'eq', input.sourceRefId)
    .maybeSingle()

  if (existing) return { executionId: (existing as { id: string; status: string }).id, status: (existing as { id: string; status: string }).status }

  const { data, error } = await admin
    .from('automation_executions')
    .insert({
      workspace_id:    workspaceId,
      template_id:     input.templateId,
      contact_id:      input.contactId ?? null,
      trigger_data:    {
        source_type:    input.sourceType,
        source_ref_id:  input.sourceRefId,
        contact_name:   input.contactName ?? null,
        ...(input.triggerPayload ?? {}),
      },
      trigger_type:    'manual',
      status:          'running',
      current_step_id: null,
      next_step_at:    new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/sage/automations')
  return { executionId: (data as { id: string }).id, status: 'running' }
}

// ── Pause a running execution ─────────────────────────────────────────────────

export async function pauseAutomationExecution(executionId: string): Promise<void> {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  await admin
    .from('automation_executions')
    .update({ status: 'paused', paused_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', executionId)
    .eq('workspace_id', workspaceId)
    .in('status', ['running', 'waiting'])
}

// ── Resume a paused execution ─────────────────────────────────────────────────

export async function resumeAutomationExecution(executionId: string): Promise<void> {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  await admin
    .from('automation_executions')
    .update({ status: 'running', paused_at: null, paused_reason: null, updated_at: new Date().toISOString() })
    .eq('id', executionId)
    .eq('workspace_id', workspaceId)
    .eq('status', 'paused')
}

// ── Fetch execution states keyed by sourceRefId (for page hydration) ─────────
// Returns the most recent execution per source_ref_id across all statuses so
// state is preserved after refresh — including completed/failed runs.

type ExecutionStatus = 'running' | 'paused' | 'completed' | 'stopped' | 'failed'

export async function getActiveAutomationStates(): Promise<
  Record<string, { executionId: string; status: ExecutionStatus; templateId: string; templateName: string }>
> {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: executions } = await admin
    .from('automation_executions')
    .select('id, status, template_id, trigger_data, created_at')
    .eq('workspace_id', workspaceId)
    .gte('created_at', since)
    .order('created_at', { ascending: false })

  if (!executions?.length) return {}

  const templateIds = [...new Set(
    (executions as Array<{ template_id: string | null }>)
      .map(e => e.template_id)
      .filter((id): id is string => !!id)
  )]
  const { data: templates } = await admin
    .from('automation_templates')
    .select('id, name')
    .in('id', templateIds)

  const nameMap: Record<string, string> = {}
  for (const t of (templates ?? []) as Array<{ id: string; name: string }>) {
    nameMap[t.id] = t.name
  }

  // Keep only the most recent execution per source_ref_id (results are already
  // sorted newest-first so the first write wins).
  const result: Record<string, { executionId: string; status: ExecutionStatus; templateId: string; templateName: string }> = {}
  for (const ex of executions as Array<{ id: string; status: string; template_id: string | null; trigger_data: Record<string, string> | null }>) {
    const sourceRefId = ex.trigger_data?.source_ref_id
    if (!sourceRefId || result[sourceRefId]) continue
    result[sourceRefId] = {
      executionId:  ex.id,
      status:       (ex.status === 'waiting' ? 'running' : ex.status) as ExecutionStatus,
      templateId:   ex.template_id ?? '',
      templateName: ex.template_id ? (nameMap[ex.template_id] ?? '') : '',
    }
  }
  return result
}

// ── List active templates (for modal picker) ──────────────────────────────────

export async function listActiveAutomationTemplates(): Promise<Array<{
  id:             string
  name:           string
  description:    string | null
  automation_type:string
  trigger_type:   string
  primary_channel:string
  steps:          unknown[]
  is_system:      boolean
  track:          string | null
}>> {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  const { data } = await admin
    .from('automation_templates')
    .select('id, name, description, automation_type, trigger_type, primary_channel, steps, is_system, track')
    .eq('is_active', true)
    .or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
    .order('track', { ascending: true })
    .order('name', { ascending: true })

  return (data ?? []) as typeof data extends null ? [] : NonNullable<typeof data>
}
