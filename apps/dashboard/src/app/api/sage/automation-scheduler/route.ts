/**
 * /api/sage/automation-scheduler
 *
 * Processes due automation_executions and advances each to its next step.
 *
 * Invocation:
 *   POST /api/sage/automation-scheduler
 *   Authorization: Bearer <SCHEDULER_SECRET>
 *
 * In production: called by a cron job (Vercel Cron, Supabase pg_cron, or external).
 * Add to vercel.json:
 *   {
 *     "crons": [{ "path": "/api/sage/automation-scheduler", "schedule": "* * * * *" }]
 *   }
 * Set SCHEDULER_SECRET in Vercel env vars to match the Authorization header.
 *
 * Per-run behaviour:
 *   1. Fetch up to 50 due executions (status=running, next_step_at <= now).
 *   2. Batch-fetch their templates + contacts + workspace senders.
 *   3. For each execution, resolve the current step from the template DAG.
 *   4. send_email: resolve contact variables, find best template, send via platform API.
 *   5. wait: advance cursor immediately — the delay was already baked into next_step_at.
 *   6. condition/handoff/other: stubbed (Phase 2).
 *   7. Write step outcome to automation_step_executions.
 *   8. Advance cursor or mark execution complete/failed.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient }         from '@/lib/supabase/server'
import {
  findBestEmailTemplate,
  buildEmailFromTemplate,
  trackEmailTemplateUsage,
} from '@/app/actions/sage-email-templates'
import type {
  AutomationExecution,
  AutomationTemplate,
  AutomationStepDefinition,
} from '@/lib/types'

const API_BASE    = process.env.API_BASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// ── Auth ──────────────────────────────────────────────────────────────────────

function isAuthorised(req: NextRequest): boolean {
  const secret = process.env.SCHEDULER_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface WorkspaceSender {
  user_id:       string
  email:         string
  name:          string
  job_title:     string    // {{sender_title}}
  calendar_link: string    // {{calendar_link}} — personal link, may be empty
}

interface WorkspaceContext {
  workspace_name:          string   // {{workspace_name}}
  value_proposition:       string   // {{value_proposition}}
  workspace_tagline:       string   // {{workspace_tagline}}
  challenge_area:          string   // {{challenge_area}}
  fallback_sender_title:   string
  fallback_calendar_link:  string
}

// ── Workspace context resolver ────────────────────────────────────────────────
// Resolves both the primary sender and workspace-level automation settings.
// Called once per unique workspace per scheduler run.

async function resolveWorkspaceContext(
  admin:       ReturnType<typeof createAdminClient>,
  workspaceId: string,
): Promise<{ sender: WorkspaceSender | null; ctx: WorkspaceContext }> {
  // Parallel: members + workspace name + automation settings
  const [membersRes, workspaceRes, settingsRes] = await Promise.all([
    admin
      .from('workspace_members')
      .select('user_id, role')
      .eq('workspace_id', workspaceId)
      .in('role', ['owner', 'admin', 'manager'])
      .not('accepted_at', 'is', null)
      .order('role', { ascending: true })
      .limit(5),
    admin
      .from('workspaces')
      .select('name')
      .eq('id', workspaceId)
      .single(),
    admin
      .from('workspace_automation_settings')
      .select('value_proposition, workspace_tagline, challenge_area, fallback_sender_title, fallback_calendar_link')
      .eq('workspace_id', workspaceId)
      .maybeSingle(),
  ])

  const wsName = (workspaceRes.data as { name: string } | null)?.name ?? ''
  const s      = settingsRes.data as {
    value_proposition: string | null
    workspace_tagline: string | null
    challenge_area:    string | null
    fallback_sender_title:  string | null
    fallback_calendar_link: string | null
  } | null

  const ctx: WorkspaceContext = {
    workspace_name:         wsName,
    value_proposition:      s?.value_proposition      ?? '',
    workspace_tagline:      s?.workspace_tagline       ?? '',
    challenge_area:         s?.challenge_area          ?? '',
    fallback_sender_title:  s?.fallback_sender_title   ?? '',
    fallback_calendar_link: s?.fallback_calendar_link  ?? '',
  }

  // Resolve sender
  const members = (membersRes.data ?? []) as { user_id: string; role: string }[]
  if (members.length === 0) return { sender: null, ctx }

  const userIds = members.map(m => m.user_id)
  const [{ data: { users } }, profilesRes] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 100 }),
    admin
      .from('user_profiles')
      .select('user_id, first_name, last_name, job_title, calendar_link')
      .in('user_id', userIds),
  ])

  type ProfileRow = {
    user_id: string
    first_name: string
    last_name:  string | null
    job_title:  string | null
    calendar_link: string | null
  }
  const profileMap = new Map(
    ((profilesRes.data ?? []) as ProfileRow[]).map(p => [p.user_id, p]),
  )

  for (const m of members) {
    const authUser = users.find(u => u.id === m.user_id)
    if (!authUser?.email) continue
    const profile = profileMap.get(m.user_id)
    const name = profile
      ? `${profile.first_name}${profile.last_name ? ' ' + profile.last_name : ''}`.trim()
      : authUser.email

    return {
      sender: {
        user_id:       m.user_id,
        email:         authUser.email,
        name,
        job_title:     profile?.job_title     ?? ctx.fallback_sender_title,
        calendar_link: profile?.calendar_link ?? ctx.fallback_calendar_link,
      },
      ctx,
    }
  }

  return { sender: null, ctx }
}

// ── Contact variable resolver ─────────────────────────────────────────────────

interface ContactVars {
  first_name:   string
  last_name:    string
  full_name:    string
  company_name: string
  email:        string
}

async function resolveContactVars(
  admin:     ReturnType<typeof createAdminClient>,
  contactId: string | null,
): Promise<ContactVars> {
  const fallback: ContactVars = {
    first_name: 'there', last_name: '', full_name: 'there',
    company_name: 'your company', email: '',
  }
  if (!contactId) return fallback

  const { data } = await admin
    .from('sage_contacts')
    .select('name, company_name, email')
    .eq('id', contactId)
    .single()

  if (!data) return fallback

  const c = data as { name: string; company_name: string | null; email: string | null }
  const parts     = c.name.trim().split(/\s+/)
  const first_name = parts[0] ?? 'there'
  const last_name  = parts.slice(1).join(' ')

  return {
    first_name,
    last_name,
    full_name:    c.name.trim() || 'there',
    company_name: c.company_name ?? 'your company',
    email:        c.email ?? '',
  }
}

// ── Email send via platform API ───────────────────────────────────────────────

async function sendAutomationEmail(opts: {
  workspace_id: string
  sender:       WorkspaceSender
  to:           string
  subject:      string
  body:         string
}): Promise<{ ok: boolean; error?: string }> {
  if (!API_BASE || !SERVICE_KEY) {
    return { ok: false, error: 'API_BASE_URL or SERVICE_KEY not configured' }
  }
  if (!opts.to) return { ok: false, error: 'No recipient email address' }

  try {
    const res = await fetch(`${API_BASE}/sage/emails/send`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-Service-Key': SERVICE_KEY },
      body:    JSON.stringify({
        workspace_id: opts.workspace_id,
        user_id:      opts.sender.user_id,
        to:           opts.to,
        subject:      opts.subject,
        body:         opts.body,
      }),
    })
    const json = await res.json() as { ok?: boolean; error?: string }
    if (!res.ok) return { ok: false, error: json.error ?? `HTTP ${res.status}` }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' }
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now   = new Date().toISOString()

  // 1. Fetch due executions
  const { data: dueRows, error: fetchErr } = await admin
    .from('automation_executions')
    .select('*')
    .eq('status', 'running')
    .lte('next_step_at', now)
    .not('next_step_at', 'is', null)
    .order('next_step_at', { ascending: true })
    .limit(50)

  if (fetchErr) {
    console.error('[scheduler] fetch error:', fetchErr.message)
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }

  const executions = (dueRows ?? []) as AutomationExecution[]
  if (executions.length === 0) {
    return NextResponse.json({ processed: 0, message: 'No due executions' })
  }

  // 2. Batch-fetch templates
  const templateIds = [...new Set(executions.map(e => e.template_id).filter(Boolean))] as string[]
  const { data: templateRows } = await admin
    .from('automation_templates')
    .select('id, steps, entry_step_id')
    .in('id', templateIds)

  const templateMap = new Map(
    ((templateRows ?? []) as Pick<AutomationTemplate, 'id' | 'steps' | 'entry_step_id'>[])
      .map(t => [t.id, t]),
  )

  // 3. Batch-fetch workspace context (sender + automation settings) per unique workspace
  const workspaceIds  = [...new Set(executions.map(e => e.workspace_id))]
  const workspaceMap  = new Map<string, { sender: WorkspaceSender | null; ctx: WorkspaceContext }>()
  await Promise.all(
    workspaceIds.map(async wsId => {
      workspaceMap.set(wsId, await resolveWorkspaceContext(admin, wsId))
    }),
  )

  // 4. Process each execution
  const results = await Promise.allSettled(
    executions.map(exec =>
      processExecution(admin, exec, templateMap, workspaceMap),
    ),
  )

  const succeeded = results.filter(r => r.status === 'fulfilled').length
  const failed    = results.filter(r => r.status === 'rejected').length

  if (failed > 0) {
    const reasons = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map(r => (r.reason as Error)?.message ?? String(r.reason))
    console.error('[scheduler] execution failures:', reasons)
  }

  return NextResponse.json({ processed: executions.length, succeeded, failed })
}

// ── Per-execution processor ───────────────────────────────────────────────────

async function processExecution(
  admin:        ReturnType<typeof createAdminClient>,
  execution:    AutomationExecution,
  templateMap:  Map<string, Pick<AutomationTemplate, 'id' | 'steps' | 'entry_step_id'>>,
  workspaceMap: Map<string, { sender: WorkspaceSender | null; ctx: WorkspaceContext }>,
): Promise<void> {
  const { id: executionId, workspace_id, current_step_id, template_id } = execution
  const { sender, ctx } = workspaceMap.get(workspace_id) ?? { sender: null, ctx: null }

  if (!current_step_id) {
    await admin.from('automation_executions').update({
      status: 'completed', completed_at: new Date().toISOString(), next_step_at: null,
    }).eq('id', executionId)
    return
  }

  const template = template_id ? templateMap.get(template_id) : null
  const steps    = (template?.steps ?? []) as AutomationStepDefinition[]
  const stepDef  = steps.find(s => s.id === current_step_id)

  if (!stepDef) {
    await admin.from('automation_executions').update({
      status: 'failed', failed_at: new Date().toISOString(),
      failure_reason: `Step '${current_step_id}' not found in template DAG`,
      next_step_at: null,
    }).eq('id', executionId)
    return
  }

  // Create step execution record
  const { data: stepRow, error: stepErr } = await admin
    .from('automation_step_executions')
    .insert({
      workspace_id,
      execution_id: executionId,
      step_id:      stepDef.id,
      step_type:    stepDef.type,
      step_label:   stepDef.label,
      status:       'running',
      started_at:   new Date().toISOString(),
      input_data:   stepDef.config,
    })
    .select('id, attempt, max_attempts')
    .single()

  if (stepErr || !stepRow) {
    console.error('[scheduler] step insert error:', stepErr?.message)
    return
  }

  const sr          = stepRow as { id: string; attempt: number; max_attempts: number }
  const stepExecId  = sr.id
  const attempt     = sr.attempt
  const maxAttempts = sr.max_attempts

  // Clear next_step_at while processing to prevent double-execution
  await admin.from('automation_executions')
    .update({ next_step_at: null })
    .eq('id', executionId)

  try {
    let outputData: Record<string, unknown> = {}

    if (stepDef.type === 'wait') {
      outputData = { waited: true }

    } else if (stepDef.type === 'send_email') {
      outputData = await handleSendEmail(admin, execution, stepDef, sender, ctx)

    } else {
      // condition / handoff / update_contact / create_deal / webhook — Phase 2
      outputData = { stub: true, type: stepDef.type }
    }

    await admin.from('automation_step_executions').update({
      status: 'completed', completed_at: new Date().toISOString(), output_data: outputData,
    }).eq('id', stepExecId)

    await advanceCursor(admin, executionId, stepDef)

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error(`[scheduler] step ${stepDef.id} (attempt ${attempt}) failed:`, errorMsg)

    await admin.from('automation_step_executions').update({
      status: 'failed', completed_at: new Date().toISOString(),
      error_data: { message: errorMsg, attempt },
    }).eq('id', stepExecId)

    if (attempt < maxAttempts) {
      const retryAt = new Date(Date.now() + attempt * 15 * 60 * 1000).toISOString()
      await admin.from('automation_executions')
        .update({ status: 'waiting', next_step_at: retryAt })
        .eq('id', executionId)
    } else {
      await admin.from('automation_executions').update({
        status: 'failed', failed_at: new Date().toISOString(),
        failure_reason: `Step '${stepDef.id}' failed after ${maxAttempts} attempts: ${errorMsg}`,
        next_step_at: null,
      }).eq('id', executionId)
    }
  }
}

// ── Email step handler ────────────────────────────────────────────────────────

async function handleSendEmail(
  admin:     ReturnType<typeof createAdminClient>,
  execution: AutomationExecution,
  stepDef:   AutomationStepDefinition,
  sender:    WorkspaceSender | null,
  ctx:       WorkspaceContext | null,
): Promise<Record<string, unknown>> {
  if (!sender) throw new Error('No sending account found for workspace')

  const config = stepDef.config as {
    template_category?: string
    automation_type?:   string
  }

  // Resolve best email template
  const resolved = await findBestEmailTemplate({
    workspace_id:    execution.workspace_id,
    category:        (config.template_category ?? 'general') as import('@/lib/types').EmailTemplateCategory,
    automation_type: config.automation_type as import('@/lib/types').AutomationType | undefined,
    channel:         'email',
  })

  if (!resolved) {
    throw new Error(`No email template found for category '${config.template_category}'`)
  }

  // Resolve contact variables from DB
  const contact = await resolveContactVars(admin, execution.contact_id)

  const variables: Record<string, string> = {
    first_name:        contact.first_name,
    last_name:         contact.last_name,
    full_name:         contact.full_name,
    company_name:      contact.company_name,
    sender_name:       sender.name,
    sender_title:      sender.job_title     || ctx?.fallback_sender_title  || '',
    calendar_link:     sender.calendar_link || ctx?.fallback_calendar_link || '',
    workspace_name:    ctx?.workspace_name    ?? '',
    value_proposition: ctx?.value_proposition ?? '',
    workspace_tagline: ctx?.workspace_tagline ?? '',
    challenge_area:    ctx?.challenge_area    ?? '',
  }

  const { subject, body } = await buildEmailFromTemplate(resolved.template.id, variables)

  // Send via platform API
  const result = await sendAutomationEmail({
    workspace_id: execution.workspace_id,
    sender,
    to:      contact.email,
    subject,
    body,
  })

  if (!result.ok) throw new Error(result.error ?? 'Email send failed')

  // Track usage (fire-and-forget)
  void trackEmailTemplateUsage({
    workspace_id:   execution.workspace_id,
    template_id:    resolved.template.id,
    execution_id:   execution.id,
    contact_id:     execution.contact_id ?? undefined,
    selection_mode: resolved.selection_mode,
    channel:        'email',
  })

  return {
    template_id:    resolved.template.id,
    template_name:  resolved.template.name,
    selection_mode: resolved.selection_mode,
    to:             contact.email,
    subject,
    sent:           true,
  }
}

// ── Advance execution cursor ──────────────────────────────────────────────────

async function advanceCursor(
  admin:         ReturnType<typeof createAdminClient>,
  executionId:   string,
  completedStep: AutomationStepDefinition,
): Promise<void> {
  const now = new Date()

  if (!completedStep.next_step_id) {
    await admin.from('automation_executions').update({
      status:          'completed',
      completed_at:    now.toISOString(),
      current_step_id: null,
      next_step_at:    null,
    }).eq('id', executionId)
    return
  }

  // Apply delay from the NEXT step's delay_hours (not the completed one).
  // wait steps carry delay_hours themselves; send_email steps are immediate.
  const delayHours = completedStep.delay_hours ?? 0
  const nextAt = delayHours > 0
    ? new Date(now.getTime() + delayHours * 60 * 60 * 1000).toISOString()
    : now.toISOString()

  await admin.from('automation_executions').update({
    status:          delayHours > 0 ? 'waiting' : 'running',
    current_step_id: completedStep.next_step_id,
    next_step_at:    nextAt,
  }).eq('id', executionId)

  await admin.rpc('increment_execution_step_count', { p_execution_id: executionId })
}

// ── GET: health check ─────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json({ ok: true, ts: new Date().toISOString() })
}
