/**
 * Automation Scheduler
 *
 * Polls automation_executions every 30 seconds, advances ready steps,
 * and dispatches action steps to automationActionExecutor.
 *
 * Flow per execution:
 *  1. Load template + current_step definition
 *  2. If step type is 'wait'   → check delay elapsed, advance if ready
 *  3. If step type is 'condition' → evaluate branch, follow yes/no
 *  4. Otherwise → execute action, mark step done, advance to next_step_id
 *  5. On 'end' or no next step → mark execution completed
 */

import { supabase }      from '../../lib/supabase.js'
import { executeStep }   from './automationActionExecutor.js'

interface StepDef {
  id:            string
  type:          string
  label:         string
  config:        Record<string, unknown>
  next_step_id:  string | null
  on_fail_step_id?: string | null
  delay_hours?:  number
  branch_yes_id?: string | null
  branch_no_id?:  string | null
}

interface ExecutionRow {
  id:               string
  workspace_id:     string
  template_id:      string
  contact_id:       string | null
  status:           string
  current_step_id:  string | null
  next_step_at:     string | null
  trigger_data:     Record<string, unknown> | null
}

interface TemplateRow {
  id:            string
  steps:         StepDef[]
  entry_step_id: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function findStep(steps: StepDef[], stepId: string | null): StepDef | null {
  if (!stepId) return null
  return steps.find(s => s.id === stepId) ?? null
}

async function logEvent(
  workspaceId: string,
  executionId: string,
  automationId: string | null,
  stepId: string | null,
  eventType: string,
  message: string,
  metadata: Record<string, unknown> = {},
) {
  await supabase.from('automation_logs').insert({
    workspace_id:  workspaceId,
    execution_id:  executionId,
    automation_id: automationId,
    step_id:       stepId,
    event_type:    eventType,
    message,
    metadata,
  })
}

async function markExecutionDone(executionId: string, workspaceId: string, automationId: string | null) {
  await supabase.from('automation_executions').update({
    status:       'completed',
    completed_at: new Date().toISOString(),
    updated_at:   new Date().toISOString(),
  }).eq('id', executionId)

  // Also complete the lead_automation if linked
  if (automationId) {
    await supabase.from('lead_automations').update({
      status:       'completed',
      completed_at: new Date().toISOString(),
      updated_at:   new Date().toISOString(),
    }).eq('id', automationId).eq('status', 'running')
  }

  await logEvent(workspaceId, executionId, automationId, null, 'execution_completed', 'Automation completed')
}

async function markExecutionFailed(executionId: string, workspaceId: string, reason: string) {
  await supabase.from('automation_executions').update({
    status:         'failed',
    failure_reason: reason,
    failed_at:      new Date().toISOString(),
    updated_at:     new Date().toISOString(),
  }).eq('id', executionId)

  await logEvent(workspaceId, executionId, null, null, 'execution_failed', reason)
}

async function advanceExecution(exec: ExecutionRow, nextStepId: string | null, delayHours = 0) {
  const nextAt = delayHours > 0
    ? new Date(Date.now() + delayHours * 3_600_000).toISOString()
    : new Date().toISOString()

  await supabase.from('automation_executions').update({
    current_step_id: nextStepId,
    next_step_at:    nextAt,
    updated_at:      new Date().toISOString(),
  }).eq('id', exec.id)
}

// ── Condition evaluation ──────────────────────────────────────────────────────

async function evaluateCondition(step: StepDef, exec: ExecutionRow): Promise<boolean> {
  const check = step.config?.check as string | undefined
  if (!check) return false

  switch (check) {
    case 'email_opened': {
      const { data } = await supabase.from('emails_sent')
        .select('opened_at')
        .eq('workspace_id', exec.workspace_id)
        .not('opened_at', 'is', null)
        .limit(1)
      return (data?.length ?? 0) > 0
    }
    case 'email_clicked': {
      const { data } = await supabase.from('emails_sent')
        .select('clicked_at')
        .eq('workspace_id', exec.workspace_id)
        .not('clicked_at', 'is', null)
        .limit(1)
      return (data?.length ?? 0) > 0
    }
    case 'ticket_resolved': {
      if (!exec.trigger_data?.ticket_id) return false
      const { data } = await supabase.from('tickets')
        .select('status')
        .eq('id', exec.trigger_data.ticket_id as string)
        .maybeSingle()
      return (data as { status?: string } | null)?.status === 'resolved'
    }
    default:
      return false
  }
}

// ── Per-execution step processor ──────────────────────────────────────────────

async function processExecution(exec: ExecutionRow) {
  // Load template
  const { data: templateRaw } = await supabase
    .from('automation_templates')
    .select('id, steps, entry_step_id')
    .eq('id', exec.template_id)
    .maybeSingle()

  const template = templateRaw as TemplateRow | null
  if (!template) {
    await markExecutionFailed(exec.id, exec.workspace_id, 'Template not found')
    return
  }

  const steps = (template.steps ?? []) as StepDef[]

  // Determine current step — start at entry if no current step yet
  const currentStepId = exec.current_step_id ?? template.entry_step_id
  const step = findStep(steps, currentStepId)

  if (!step || step.type === 'end') {
    await markExecutionDone(exec.id, exec.workspace_id, null)
    return
  }

  const stepExecId = `${exec.id}_${step.id}`

  // Insert step execution row if not exists
  await supabase.from('automation_step_executions').upsert({
    workspace_id:  exec.workspace_id,
    execution_id:  exec.id,
    step_id:       step.id,
    step_type:     step.type,
    step_label:    step.label,
    status:        'running',
    started_at:    new Date().toISOString(),
    attempt:       1,
    max_attempts:  3,
  }, { onConflict: 'execution_id,step_id', ignoreDuplicates: false })

  await logEvent(exec.workspace_id, exec.id, null, step.id, 'step_started', `Step started: ${step.label}`)

  try {
    if (step.type === 'wait') {
      // Wait step: delay already applied via next_step_at — just advance
      await advanceExecution(exec, step.next_step_id ?? null, 0)
      await supabase.from('automation_step_executions').update({
        status: 'completed', completed_at: new Date().toISOString(),
      }).eq('execution_id', exec.id).eq('step_id', step.id)
      return
    }

    if (step.type === 'condition') {
      const passed = await evaluateCondition(step, exec)
      const nextId = passed ? (step.branch_yes_id ?? null) : (step.branch_no_id ?? null)
      await advanceExecution(exec, nextId, 0)
      await supabase.from('automation_step_executions').update({
        status:       'completed',
        completed_at: new Date().toISOString(),
        output_data:  { result: passed },
      }).eq('execution_id', exec.id).eq('step_id', step.id)
      return
    }

    if (step.type === 'handoff') {
      // Handoff = escalate lead automation + end execution
      await supabase.from('lead_automations').update({
        status:     'escalated',
        stage:      'handoff_ready',
        updated_at: new Date().toISOString(),
      }).eq('workspace_id', exec.workspace_id).eq('status', 'running')
      await markExecutionDone(exec.id, exec.workspace_id, null)
      return
    }

    // Action steps — dispatch to executor
    const result = await executeStep({
      workspaceId: exec.workspace_id,
      executionId: exec.id,
      stepId:      step.id,
      stepType:    step.type,
      stepLabel:   step.label,
      config:      step.config ?? {},
      contactId:   exec.contact_id,
      payload:     exec.trigger_data ?? {},
    })

    await supabase.from('automation_step_executions').update({
      status:       result.success ? 'completed' : 'failed',
      completed_at: new Date().toISOString(),
      output_data:  result.output,
      error_data:   result.error ? { message: result.error } : null,
    }).eq('execution_id', exec.id).eq('step_id', step.id)

    if (!result.success) {
      await logEvent(exec.workspace_id, exec.id, null, step.id, 'step_failed', result.error ?? 'Unknown error')
      // On failure advance anyway (fail-safe) to avoid getting stuck
    }

    await logEvent(exec.workspace_id, exec.id, null, step.id, 'step_completed', `Step completed: ${step.label}`, result.output)

    // Advance to next step, applying delay from the NEXT step's delay_hours
    const nextStep = findStep(steps, step.next_step_id ?? null)
    const delayHours = nextStep?.delay_hours ?? 0
    await advanceExecution(exec, step.next_step_id ?? null, delayHours)

    // If next step is 'end' or null, complete immediately
    if (!step.next_step_id || nextStep?.type === 'end') {
      await markExecutionDone(exec.id, exec.workspace_id, null)
    }

  } catch (err) {
    const msg = (err as Error).message
    await markExecutionFailed(exec.id, exec.workspace_id, msg)
    console.error(`[automation-scheduler] execution ${exec.id} step ${step.id} threw:`, msg)
  }
}

// ── Trigger event processor ───────────────────────────────────────────────────

async function processTriggerEvents() {
  const { data: events } = await supabase
    .from('automation_trigger_events')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(20)

  if (!events || events.length === 0) return

  for (const event of events as Array<{
    id: string; workspace_id: string; event_type: string;
    contact_id: string | null; payload: Record<string, unknown>
  }>) {
    // Mark as processing immediately to prevent double-processing
    await supabase.from('automation_trigger_events')
      .update({ status: 'processing' })
      .eq('id', event.id)

    try {
      // Find active templates matching this trigger type
      const { data: templates } = await supabase
        .from('automation_templates')
        .select('id, entry_step_id')
        .eq('trigger_type', event.event_type)
        .eq('is_active', true)
        .or(`workspace_id.eq.${event.workspace_id},workspace_id.is.null`)

      if (!templates || templates.length === 0) {
        await supabase.from('automation_trigger_events')
          .update({ status: 'skipped', processed_at: new Date().toISOString() })
          .eq('id', event.id)
        continue
      }

      // Use the most specific (workspace-level) template if both system and workspace exist
      const template = (templates as Array<{ id: string; workspace_id?: string | null }>)
        .sort((a, b) => (a.workspace_id ? -1 : 1) - (b.workspace_id ? -1 : 1))[0]

      // Create execution
      await supabase.from('automation_executions').insert({
        workspace_id:     event.workspace_id,
        template_id:      template.id,
        contact_id:       event.contact_id,
        trigger_type:     event.event_type,
        trigger_data:     event.payload,
        status:           'running',
        current_step_id:  null,  // scheduler sets this on first run
        next_step_at:     new Date().toISOString(),
      })

      await supabase.from('automation_trigger_events')
        .update({ status: 'processed', processed_at: new Date().toISOString() })
        .eq('id', event.id)

    } catch (err) {
      const msg = (err as Error).message
      await supabase.from('automation_trigger_events')
        .update({ status: 'failed', error_message: msg, processed_at: new Date().toISOString() })
        .eq('id', event.id)
      console.error(`[automation-scheduler] trigger event ${event.id} failed:`, msg)
    }
  }
}

// ── Main poll loop ────────────────────────────────────────────────────────────

export async function pollAutomations() {
  try {
    // Process inbound trigger events first (they create new executions)
    await processTriggerEvents()

    // Find executions due to be processed
    const { data: executions } = await supabase
      .from('automation_executions')
      .select('id, workspace_id, template_id, contact_id, status, current_step_id, next_step_at, trigger_data, lead_automation_id')
      .in('status', ['running', 'waiting'])
      .lte('next_step_at', new Date().toISOString())
      .order('next_step_at', { ascending: true })
      .limit(20)

    if (!executions || executions.length === 0) return

    console.log(`[automation-scheduler] processing ${executions.length} execution(s)`)

    // Process concurrently, capped at 5 at a time
    for (let i = 0; i < executions.length; i += 5) {
      await Promise.all(
        (executions as ExecutionRow[]).slice(i, i + 5).map(exec => processExecution(exec))
      )
    }
  } catch (err) {
    console.error('[automation-scheduler] poll error:', (err as Error).message)
  }
}

export function startAutomationScheduler() {
  console.log('   ⚡  Automation scheduler started (30s interval)')
  void pollAutomations()
  return setInterval(pollAutomations, 30_000)
}
