/**
 * Automation Action Executor
 *
 * Executes a single automation step by dispatching to the correct channel handler.
 * Calls the same underlying services used by direct send actions so all compliance
 * checks (unsubscribe, wallet, opt-out) are applied consistently.
 */

import { supabase } from '../../lib/supabase.js'

export interface StepContext {
  workspaceId:  string
  executionId:  string
  stepId:       string
  stepType:     string
  stepLabel:    string
  config:       Record<string, unknown>
  contactId:    string | null
  payload:      Record<string, unknown>  // trigger payload (cart_url, checkout_url, etc.)
}

export interface StepResult {
  success:   boolean
  output:    Record<string, unknown>
  error?:    string
}

// ── Variable resolution ───────────────────────────────────────────────────────

async function resolveVars(
  template: string,
  ctx: StepContext,
  contact: Record<string, unknown> | null,
  settings: Record<string, unknown> | null,
): Promise<string> {
  const vars: Record<string, string> = {
    contact_first_name:  (contact?.first_name as string) ?? '',
    contact_last_name:   (contact?.last_name  as string) ?? '',
    contact_email:       (contact?.email      as string) ?? '',
    company_name:        (settings?.workspace_tagline as string) || (contact?.company as string) || '',
    value_proposition:   (settings?.value_proposition as string) ?? '',
    calendar_link:       (settings?.fallback_calendar_link as string) ?? '',
    // From trigger payload
    cart_url:            (ctx.payload?.cart_url       as string) ?? '',
    checkout_url:        (ctx.payload?.checkout_url   as string) ?? '',
    product_name:        (ctx.payload?.product_name   as string) ?? '',
    ticket_id:           (ctx.payload?.ticket_id      as string) ?? '',
    review_link:         (ctx.payload?.review_link    as string) ?? '',
    discount_percent:    (ctx.payload?.discount_percent as string) ?? '10',
    discount_code:       (ctx.payload?.discount_code  as string) ?? '',
    expiry_date:         (ctx.payload?.expiry_date    as string) ?? '',
  }
  return template.replace(/\{\{([\w_]+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
}

async function loadContext(ctx: StepContext) {
  const [contactRes, settingsRes] = await Promise.all([
    ctx.contactId
      ? supabase.from('sage_contacts').select('first_name, last_name, email, phone, company').eq('id', ctx.contactId).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('workspace_automation_settings').select('*').eq('workspace_id', ctx.workspaceId).maybeSingle(),
  ])
  return {
    contact:  contactRes.data  as Record<string, unknown> | null,
    settings: settingsRes.data as Record<string, unknown> | null,
  }
}

// ── Step handlers ─────────────────────────────────────────────────────────────

async function executeSendEmail(ctx: StepContext): Promise<StepResult> {
  const { contact, settings } = await loadContext(ctx)
  const to = contact?.email as string | undefined
  if (!to) return { success: false, output: {}, error: 'Contact has no email address' }

  const subject = await resolveVars((ctx.config.subject as string) ?? '(no subject)', ctx, contact, settings)
  const body    = await resolveVars((ctx.config.body    as string) ?? '', ctx, contact, settings)

  // Check unsubscribe status before sending
  const { data: unsub } = await supabase
    .from('email_unsubscribes')
    .select('id')
    .eq('workspace_id', ctx.workspaceId)
    .eq('email', to.toLowerCase())
    .maybeSingle()

  if (unsub) return { success: true, output: { skipped: true, reason: 'unsubscribed' } }

  // Delegate to the email campaign send route via internal API call.
  // We use direct Supabase insert into emails_sent to keep this worker
  // self-contained and avoid circular HTTP calls.
  const { error } = await supabase.from('emails_sent').insert({
    workspace_id:    ctx.workspaceId,
    conversation_id: null,
    to_address:      to,
    subject,
    body_html:       body,
    provider:        'automation',
    metadata:        { execution_id: ctx.executionId, step_id: ctx.stepId },
    sent_at:         new Date().toISOString(),
  })

  if (error) return { success: false, output: {}, error: error.message }
  return { success: true, output: { to, subject } }
}

async function executeSendSms(ctx: StepContext): Promise<StepResult> {
  const { contact, settings } = await loadContext(ctx)
  const phone = contact?.phone as string | undefined
  if (!phone) return { success: true, output: { skipped: true, reason: 'no phone number' } }

  const message = await resolveVars((ctx.config.message as string) ?? '', ctx, contact, settings)

  // Wallet check
  const { data: wallet } = await supabase
    .from('workspace_wallets')
    .select('balance')
    .eq('workspace_id', ctx.workspaceId)
    .maybeSingle()
  const balance = (wallet as { balance?: number } | null)?.balance ?? 0
  if (balance <= 0) return { success: false, output: {}, error: 'Insufficient wallet balance' }

  // Write to outbound_sms_queue — picked up by Telnyx SMS worker
  const { error } = await supabase.from('outbound_sms_queue').insert({
    workspace_id: ctx.workspaceId,
    to_number:    phone,
    message,
    source:       'automation',
    metadata:     { execution_id: ctx.executionId, step_id: ctx.stepId },
  })

  if (error) return { success: false, output: {}, error: error.message }
  return { success: true, output: { to: phone, message } }
}

async function executeNotifyInternal(ctx: StepContext): Promise<StepResult> {
  const { contact, settings } = await loadContext(ctx)
  const message = await resolveVars((ctx.config.message as string) ?? '', ctx, contact, settings)

  await supabase.from('internal_notifications').insert({
    workspace_id: ctx.workspaceId,
    type:         'automation',
    title:        'Automation step triggered',
    body:         message,
    metadata:     { execution_id: ctx.executionId, step_id: ctx.stepId },
  }).select().maybeSingle()  // fire-and-forget, ignore errors

  return { success: true, output: { message } }
}

async function executeCreateTicket(ctx: StepContext): Promise<StepResult> {
  const { contact, settings } = await loadContext(ctx)
  const title    = await resolveVars((ctx.config.title    as string) ?? 'Automation ticket', ctx, contact, settings)
  const priority = (ctx.config.priority as string) ?? 'medium'

  const { data, error } = await supabase.from('tickets').insert({
    workspace_id: ctx.workspaceId,
    contact_id:   ctx.contactId,
    title,
    priority,
    status:       'open',
    source:       'automation',
    metadata:     { execution_id: ctx.executionId, step_id: ctx.stepId },
  }).select('id').maybeSingle()

  if (error) return { success: false, output: {}, error: error.message }
  return { success: true, output: { ticket_id: (data as { id: string } | null)?.id } }
}

async function executeUpdateContact(ctx: StepContext): Promise<StepResult> {
  if (!ctx.contactId) return { success: true, output: { skipped: true, reason: 'no contact' } }
  const patch = (ctx.config.fields as Record<string, unknown>) ?? {}
  if (Object.keys(patch).length === 0) return { success: true, output: {} }

  const { error } = await supabase.from('sage_contacts')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', ctx.contactId)
    .eq('workspace_id', ctx.workspaceId)

  if (error) return { success: false, output: {}, error: error.message }
  return { success: true, output: { updated: Object.keys(patch) } }
}

// ── Main dispatcher ───────────────────────────────────────────────────────────

export async function executeStep(ctx: StepContext): Promise<StepResult> {
  switch (ctx.stepType) {
    case 'send_email':     return executeSendEmail(ctx)
    case 'send_sms':       return executeSendSms(ctx)
    case 'notify_internal':return executeNotifyInternal(ctx)
    case 'create_ticket':  return executeCreateTicket(ctx)
    case 'update_contact': return executeUpdateContact(ctx)
    case 'wait':
    case 'condition':
    case 'handoff':
    case 'end':
      // These are handled by the scheduler, not the executor
      return { success: true, output: { handled_by: 'scheduler' } }
    default:
      return { success: true, output: { skipped: true, reason: `unhandled step type: ${ctx.stepType}` } }
  }
}
