'use server'

/**
 * automation-engine.ts
 *
 * Execution runtime for automation_executions + automation_step_executions.
 *
 * All queries use the admin client (RLS disabled on both tables).
 * Manual workspace_id filter is applied on every query.
 *
 * Service contract:
 *   createAutomationExecution      → AutomationExecution
 *   getAutomationExecution         → AutomationExecution | null
 *   listAutomationExecutions        → AutomationExecutionWithMeta[]
 *   pauseAutomationExecution        → void
 *   resumeAutomationExecution       → void
 *   cancelAutomationExecution       → void
 *   getAutomationExecutionGraph     → { execution, steps: AutomationStepExecution[] }
 *   advanceAutomationExecution      → AutomationStepExecution  (records step start)
 *   completeAutomationStep          → AutomationStepExecution  (records step outcome)
 */

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { redirect }                         from 'next/navigation'
import type {
  AutomationExecution,
  AutomationExecutionWithMeta,
  AutomationExecutionStatus,
  AutomationStepExecution,
  AutomationStepStatus,
  AutomationTriggerType,
  AutomationStepType,
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

// ── 1. createAutomationExecution ──────────────────────────────────────────────
/**
 * Starts a new execution from a template.
 * Sets current_step_id to the template's entry_step_id.
 * next_step_at = now() → scheduler picks it up immediately.
 */
export async function createAutomationExecution(input: {
  template_id?:         string
  template_version?:    number
  contact_id?:          string
  deal_id?:             string
  lead_automation_id?:  string
  trigger_type?:        AutomationTriggerType
  trigger_data?:        Record<string, unknown>
  entry_step_id?:       string
}): Promise<AutomationExecution> {
  const workspaceId = await getWorkspaceId()
  const admin       = createAdminClient()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await admin
    .from('automation_executions')
    .insert({
      workspace_id:       workspaceId,
      template_id:        input.template_id        ?? null,
      template_version:   input.template_version   ?? null,
      contact_id:         input.contact_id         ?? null,
      deal_id:            input.deal_id            ?? null,
      lead_automation_id: input.lead_automation_id ?? null,
      trigger_type:       input.trigger_type       ?? 'manual',
      trigger_data:       input.trigger_data       ?? {},
      status:             'running',
      current_step_id:    input.entry_step_id      ?? null,
      next_step_at:       input.entry_step_id ? new Date().toISOString() : null,
      created_by:         user?.id ?? null,
    })
    .select('*')
    .single()

  if (error) throw new Error(`[automation-engine] createAutomationExecution: ${error.message}`)
  return data as AutomationExecution
}

// ── 2. getAutomationExecution ─────────────────────────────────────────────────

export async function getAutomationExecution(
  executionId: string,
): Promise<AutomationExecution | null> {
  const workspaceId = await getWorkspaceId()
  const admin       = createAdminClient()

  const { data, error } = await admin
    .from('automation_executions')
    .select('*')
    .eq('id', executionId)
    .eq('workspace_id', workspaceId)
    .single()

  if (error || !data) return null
  return data as AutomationExecution
}

// ── 3. listAutomationExecutions ───────────────────────────────────────────────
/**
 * Returns executions with joined metadata (template name, contact name, deal title).
 * Defaults to non-terminal statuses.
 */
export async function listAutomationExecutions(opts?: {
  status?:    AutomationExecutionStatus | AutomationExecutionStatus[]
  contactId?: string
  limit?:     number
}): Promise<AutomationExecutionWithMeta[]> {
  const workspaceId = await getWorkspaceId()
  const admin       = createAdminClient()

  let query = admin
    .from('automation_executions')
    .select('*')
    .eq('workspace_id', workspaceId)

  if (opts?.status) {
    const statuses = Array.isArray(opts.status) ? opts.status : [opts.status]
    query = query.in('status', statuses)
  } else {
    // Default: non-terminal
    query = query.not('status', 'in', '("completed","stopped","failed")')
  }

  if (opts?.contactId) {
    query = query.eq('contact_id', opts.contactId)
  }

  query = query.order('updated_at', { ascending: false }).limit(opts?.limit ?? 100)

  const { data, error } = await query
  if (error) {
    console.error('[automation-engine] listAutomationExecutions:', error.message)
    return []
  }

  const rows = (data ?? []) as AutomationExecution[]

  // Join names
  const templateIds = [...new Set(rows.map(r => r.template_id).filter(Boolean))] as string[]
  const contactIds  = [...new Set(rows.map(r => r.contact_id).filter(Boolean))]  as string[]
  const dealIds     = [...new Set(rows.map(r => r.deal_id).filter(Boolean))]     as string[]

  const [templatesRes, contactsRes, dealsRes] = await Promise.all([
    templateIds.length > 0
      ? admin.from('automation_templates').select('id, name').in('id', templateIds)
      : { data: [] },
    contactIds.length > 0
      ? admin.from('sage_contacts').select('id, name, email').in('id', contactIds)
      : { data: [] },
    dealIds.length > 0
      ? admin.from('sage_deals').select('id, title').in('id', dealIds)
      : { data: [] },
  ])

  const tMap = new Map((templatesRes.data ?? []).map((t: { id: string; name: string }) => [t.id, t]))
  const cMap = new Map((contactsRes.data ?? []).map((c: { id: string; name: string; email: string | null }) => [c.id, c]))
  const dMap = new Map((dealsRes.data ?? []).map((d: { id: string; title: string }) => [d.id, d]))

  return rows.map(r => ({
    ...r,
    template_name: r.template_id ? (tMap.get(r.template_id)?.name  ?? null) : null,
    contact_name:  r.contact_id  ? (cMap.get(r.contact_id)?.name   ?? null) : null,
    contact_email: r.contact_id  ? (cMap.get(r.contact_id)?.email  ?? null) : null,
    deal_title:    r.deal_id     ? (dMap.get(r.deal_id)?.title      ?? null) : null,
  }))
}

// ── 4. pauseAutomationExecution ───────────────────────────────────────────────

export async function pauseAutomationExecution(
  executionId: string,
  reason?:     string,
): Promise<void> {
  const workspaceId = await getWorkspaceId()
  const admin       = createAdminClient()

  const { error } = await admin
    .from('automation_executions')
    .update({
      status:       'paused',
      paused_at:    new Date().toISOString(),
      paused_reason: reason ?? null,
    })
    .eq('id', executionId)
    .eq('workspace_id', workspaceId)
    .in('status', ['running', 'waiting'])

  if (error) throw new Error(`[automation-engine] pauseAutomationExecution: ${error.message}`)
}

// ── 5. resumeAutomationExecution ──────────────────────────────────────────────

export async function resumeAutomationExecution(executionId: string): Promise<void> {
  const workspaceId = await getWorkspaceId()
  const admin       = createAdminClient()

  const { error } = await admin
    .from('automation_executions')
    .update({
      status:        'running',
      paused_at:     null,
      paused_reason: null,
      next_step_at:  new Date().toISOString(), // Re-queue immediately
    })
    .eq('id', executionId)
    .eq('workspace_id', workspaceId)
    .eq('status', 'paused')

  if (error) throw new Error(`[automation-engine] resumeAutomationExecution: ${error.message}`)
}

// ── 6. cancelAutomationExecution ──────────────────────────────────────────────

export async function cancelAutomationExecution(
  executionId: string,
  reason?:     string,
): Promise<void> {
  const workspaceId = await getWorkspaceId()
  const admin       = createAdminClient()

  const { error } = await admin
    .from('automation_executions')
    .update({
      status:        'stopped',
      stopped_at:    new Date().toISOString(),
      stopped_reason: reason ?? null,
      next_step_at:  null,
    })
    .eq('id', executionId)
    .eq('workspace_id', workspaceId)
    .not('status', 'in', '("completed","stopped","failed")')

  if (error) throw new Error(`[automation-engine] cancelAutomationExecution: ${error.message}`)
}

// ── 7. getAutomationExecutionGraph ────────────────────────────────────────────
/**
 * Returns the execution row + all step execution records in chronological order.
 * Used to render the execution timeline / step graph in the UI.
 */
export async function getAutomationExecutionGraph(
  executionId: string,
): Promise<{ execution: AutomationExecution; steps: AutomationStepExecution[] } | null> {
  const workspaceId = await getWorkspaceId()
  const admin       = createAdminClient()

  const [executionRes, stepsRes] = await Promise.all([
    admin
      .from('automation_executions')
      .select('*')
      .eq('id', executionId)
      .eq('workspace_id', workspaceId)
      .single(),
    admin
      .from('automation_step_executions')
      .select('*')
      .eq('execution_id', executionId)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true }),
  ])

  if (executionRes.error || !executionRes.data) return null

  return {
    execution: executionRes.data as AutomationExecution,
    steps:     (stepsRes.data ?? []) as AutomationStepExecution[],
  }
}

// ── 8. advanceAutomationExecution ─────────────────────────────────────────────
/**
 * Called by the scheduler/worker when next_step_at is due.
 * Creates an automation_step_executions row for the current step.
 * The caller is responsible for actually executing the step (send email etc.)
 * and then calling completeAutomationStep().
 */
export async function advanceAutomationExecution(
  executionId:  string,
  stepId:       string,
  stepType:     AutomationStepType,
  stepLabel?:   string,
  inputData?:   Record<string, unknown>,
): Promise<AutomationStepExecution> {
  const workspaceId = await getWorkspaceId()
  const admin       = createAdminClient()

  // Create step execution record
  const { data: stepData, error: stepError } = await admin
    .from('automation_step_executions')
    .insert({
      workspace_id: workspaceId,
      execution_id: executionId,
      step_id:      stepId,
      step_type:    stepType,
      step_label:   stepLabel ?? null,
      status:       'running',
      started_at:   new Date().toISOString(),
      input_data:   inputData ?? {},
    })
    .select('*')
    .single()

  if (stepError) throw new Error(`[automation-engine] advanceAutomationExecution (step create): ${stepError.message}`)

  // Update execution: clear next_step_at while step is running
  await admin
    .from('automation_executions')
    .update({
      status:          'running',
      current_step_id: stepId,
      next_step_at:    null,
    })
    .eq('id', executionId)
    .eq('workspace_id', workspaceId)

  // Increment step_count via raw SQL to avoid read-modify-write race
  await admin.rpc('increment_execution_step_count', { p_execution_id: executionId })

  return stepData as AutomationStepExecution
}

// ── 9. completeAutomationStep ─────────────────────────────────────────────────
/**
 * Records the outcome of a step (completed / failed / skipped).
 * If completed: advances execution cursor to next_step_id, sets next_step_at.
 * If failed and attempt < max_attempts: schedules retry.
 * If failed and max_attempts reached: marks execution as 'failed'.
 */
export async function completeAutomationStep(opts: {
  executionId:    string
  stepExecutionId: string
  status:         Extract<AutomationStepStatus, 'completed' | 'failed' | 'skipped'>
  outputData?:    Record<string, unknown>
  errorData?:     Record<string, unknown>
  nextStepId?:    string | null
  delayHours?:    number
}): Promise<AutomationStepExecution> {
  const workspaceId = await getWorkspaceId()
  const admin       = createAdminClient()

  const now = new Date()

  // Fetch current step row for attempt tracking
  const { data: stepRow } = await admin
    .from('automation_step_executions')
    .select('attempt, max_attempts')
    .eq('id', opts.stepExecutionId)
    .single()

  const attempt     = (stepRow as { attempt: number; max_attempts: number } | null)?.attempt     ?? 1
  const maxAttempts = (stepRow as { attempt: number; max_attempts: number } | null)?.max_attempts ?? 3

  const { data: updatedStep, error: stepError } = await admin
    .from('automation_step_executions')
    .update({
      status:       opts.status,
      completed_at: now.toISOString(),
      output_data:  opts.outputData ?? {},
      error_data:   opts.errorData  ?? null,
    })
    .eq('id', opts.stepExecutionId)
    .select('*')
    .single()

  if (stepError) throw new Error(`[automation-engine] completeAutomationStep: ${stepError.message}`)

  // Advance execution cursor
  if (opts.status === 'completed' || opts.status === 'skipped') {
    if (opts.nextStepId) {
      const nextAt = opts.delayHours
        ? new Date(now.getTime() + opts.delayHours * 60 * 60 * 1000).toISOString()
        : now.toISOString()

      await admin
        .from('automation_executions')
        .update({
          current_step_id: opts.nextStepId,
          next_step_at:    nextAt,
          status:          'waiting',
        })
        .eq('id', opts.executionId)
        .eq('workspace_id', workspaceId)
    } else {
      // No next step → execution complete
      await admin
        .from('automation_executions')
        .update({
          status:          'completed',
          completed_at:    now.toISOString(),
          current_step_id: null,
          next_step_at:    null,
        })
        .eq('id', opts.executionId)
        .eq('workspace_id', workspaceId)
    }
  } else if (opts.status === 'failed') {
    if (attempt < maxAttempts) {
      // Schedule retry with backoff (attempt * 15 minutes)
      const retryAt = new Date(now.getTime() + attempt * 15 * 60 * 1000).toISOString()
      await admin
        .from('automation_executions')
        .update({ status: 'waiting', next_step_at: retryAt })
        .eq('id', opts.executionId)
        .eq('workspace_id', workspaceId)
    } else {
      // Max attempts reached → fail execution
      await admin
        .from('automation_executions')
        .update({
          status:         'failed',
          failed_at:      now.toISOString(),
          failure_reason: opts.errorData?.message as string ?? 'Step failed after max attempts',
          next_step_at:   null,
        })
        .eq('id', opts.executionId)
        .eq('workspace_id', workspaceId)
    }
  }

  return updatedStep as AutomationStepExecution
}
