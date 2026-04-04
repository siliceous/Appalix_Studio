'use server'

/**
 * Auto-welcome / auto-acknowledgement sends.
 *
 * Forms   → welcome email (via Reply via Email button) + welcome SMS
 * Tickets → acknowledgement email (via Reply via Email button) + acknowledgement SMS
 * Bots    → no send needed; bot already replied automatically
 *
 * Each action is idempotent — safe to call twice.
 */

import twilio from 'twilio'
import { createAdminClient } from '@/lib/supabase/server'

const API_BASE    = process.env.API_BASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getOwnerUserId(workspaceId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', workspaceId)
    .eq('role', 'owner')
    .limit(1)
    .maybeSingle()
  return (data as { user_id: string } | null)?.user_id ?? null
}

async function getSmsFromNumber(workspaceId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('integrations')
    .select('config')
    .eq('workspace_id', workspaceId)
    .eq('platform', 'sms')
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()
  if (!data) return null
  const config = (data as { config: Record<string, string> }).config
  return config.phone_number ?? config.from_number ?? null
}

async function sendTwilioSms(to: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken  = process.env.TWILIO_AUTH_TOKEN
  if (!accountSid || !authToken) return { ok: false, error: 'Twilio credentials not configured' }
  try {
    const client = twilio(accountSid, authToken)
    await client.messages.create({ to, body, from: '' })   // 'from' overridden below
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'SMS send failed' }
  }
}

async function sendSmsFromWorkspace(opts: {
  workspaceId: string
  to:          string
  body:        string
}): Promise<{ ok: boolean; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken  = process.env.TWILIO_AUTH_TOKEN
  if (!accountSid || !authToken) return { ok: false, error: 'Twilio credentials not configured' }

  const fromNumber = await getSmsFromNumber(opts.workspaceId)
  if (!fromNumber) return { ok: false, error: 'No active SMS integration found' }

  try {
    const client = twilio(accountSid, authToken)
    await client.messages.create({ to: opts.to, from: fromNumber, body: opts.body })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'SMS send failed' }
  }
}

async function sendViaApi(opts: {
  workspaceId: string
  userId:      string
  to:          string
  subject:     string
  body:        string
}): Promise<{ ok: boolean; error?: string }> {
  if (!API_BASE || !SERVICE_KEY) return { ok: false, error: 'API not configured' }
  try {
    const res = await fetch(`${API_BASE}/sage/emails/send`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-Service-Key': SERVICE_KEY },
      body:    JSON.stringify({
        workspace_id: opts.workspaceId,
        user_id:      opts.userId,
        to:           opts.to,
        subject:      opts.subject,
        body:         opts.body,
      }),
    })
    const data = await res.json() as { ok?: boolean; error?: string }
    if (!res.ok) return { ok: false, error: data.error ?? 'Send failed' }
    return { ok: true }
  } catch {
    return { ok: false, error: 'Could not reach API' }
  }
}

// ── Form welcome email ────────────────────────────────────────────────────────

export async function sendFormWelcome(
  submissionId: string,
): Promise<{ ok: boolean; sentTo?: string; error?: string }> {
  const admin = createAdminClient()

  const { data: rowRaw } = await admin
    .from('sage_form_submissions')
    .select('id, workspace_id, fields, ai_entities, auto_email_sent_at')
    .eq('id', submissionId)
    .single()

  if (!rowRaw) return { ok: false, error: 'Submission not found' }

  const row = rowRaw as {
    id: string
    workspace_id: string
    fields: Record<string, string>
    ai_entities: Record<string, string> | null
    auto_email_sent_at: string | null
  }

  if (row.auto_email_sent_at) return { ok: true, sentTo: row.auto_email_sent_at }

  const email = row.ai_entities?.email ?? row.fields?.email ?? row.fields?.Email ?? null
  const name  = row.ai_entities?.name  ?? row.fields?.name  ?? row.fields?.Name  ?? null
  if (!email) return { ok: false, error: 'No email address on this submission' }

  const userId = await getOwnerUserId(row.workspace_id)
  if (!userId) return { ok: false, error: 'No workspace owner found' }

  const greeting = name ? `Hi ${name},` : 'Hi there,'
  const result = await sendViaApi({
    workspaceId: row.workspace_id,
    userId,
    to:      email,
    subject: 'Thanks for getting in touch',
    body:    `${greeting}\n\nThanks for reaching out — we've received your message and will be in touch shortly.\n\nIn the meantime, feel free to reply to this email if you have anything to add.\n\nWarm regards`,
  })

  if (!result.ok) return { ok: false, error: result.error }

  await admin
    .from('sage_form_submissions')
    .update({ auto_email_sent_at: new Date().toISOString(), auto_email_to: email })
    .eq('id', submissionId)

  return { ok: true, sentTo: email }
}

// ── Form welcome SMS ──────────────────────────────────────────────────────────

export async function sendFormWelcomeSms(
  submissionId: string,
  customBody?: string,
): Promise<{ ok: boolean; sentTo?: string; error?: string }> {
  const admin = createAdminClient()

  const { data: rowRaw } = await admin
    .from('sage_form_submissions')
    .select('id, workspace_id, fields, ai_entities, auto_sms_sent_at')
    .eq('id', submissionId)
    .single()

  if (!rowRaw) return { ok: false, error: 'Submission not found' }

  const row = rowRaw as {
    id: string
    workspace_id: string
    fields: Record<string, string>
    ai_entities: Record<string, string> | null
    auto_sms_sent_at: string | null
  }

  if (row.auto_sms_sent_at) return { ok: true, sentTo: row.auto_sms_sent_at }

  const phone = row.ai_entities?.phone ?? row.fields?.phone ?? row.fields?.Phone ?? null
  const name  = row.ai_entities?.name  ?? row.fields?.name  ?? row.fields?.Name  ?? null
  if (!phone) return { ok: false, error: 'No phone number on this submission' }

  const greeting = name ? `Hi ${name}` : 'Hi there'
  const body = customBody ?? `${greeting} — thanks for getting in touch! We've received your message and will be in touch shortly.`
  const result = await sendSmsFromWorkspace({
    workspaceId: row.workspace_id,
    to:   phone,
    body,
  })

  if (!result.ok) return { ok: false, error: result.error }

  await admin
    .from('sage_form_submissions')
    .update({ auto_sms_sent_at: new Date().toISOString(), auto_sms_to: phone })
    .eq('id', submissionId)

  return { ok: true, sentTo: phone }
}

// ── Ticket acknowledgement email ──────────────────────────────────────────────

export async function sendTicketAck(
  ticketId: string,
): Promise<{ ok: boolean; sentTo?: string; error?: string }> {
  const admin = createAdminClient()

  const { data: rowRaw } = await admin
    .from('sage_tickets')
    .select('id, workspace_id, title, name, email, contact:sage_contacts(name, email), auto_email_sent_at')
    .eq('id', ticketId)
    .single()

  if (!rowRaw) return { ok: false, error: 'Ticket not found' }

  const row = rowRaw as unknown as {
    id: string
    workspace_id: string
    title: string
    name: string | null
    email: string | null
    contact: { name: string; email: string | null } | null
    auto_email_sent_at: string | null
  }

  if (row.auto_email_sent_at) return { ok: true, sentTo: row.auto_email_sent_at }

  const email = row.contact?.email ?? row.email ?? null
  const name  = row.contact?.name  ?? row.name  ?? null
  if (!email) return { ok: false, error: 'No email address on this ticket' }

  const userId = await getOwnerUserId(row.workspace_id)
  if (!userId) return { ok: false, error: 'No workspace owner found' }

  const greeting = name ? `Hi ${name},` : 'Hi there,'
  const result = await sendViaApi({
    workspaceId: row.workspace_id,
    userId,
    to:      email,
    subject: `We've received your support request`,
    body:    `${greeting}\n\nWe've received your support request and our team is reviewing it now.\n\nReference: ${row.title}\n\nWe'll get back to you as soon as possible. If this is urgent please reply to this email.\n\nThank you for your patience.`,
  })

  if (!result.ok) return { ok: false, error: result.error }

  await admin
    .from('sage_tickets')
    .update({ auto_email_sent_at: new Date().toISOString(), auto_email_to: email })
    .eq('id', ticketId)

  return { ok: true, sentTo: email }
}

// ── Ticket acknowledgement SMS ────────────────────────────────────────────────

export async function sendTicketAckSms(
  ticketId: string,
  customBody?: string,
): Promise<{ ok: boolean; sentTo?: string; error?: string }> {
  const admin = createAdminClient()

  const { data: rowRaw } = await admin
    .from('sage_tickets')
    .select('id, workspace_id, title, name, phone, contact:sage_contacts(name, phone), auto_sms_sent_at')
    .eq('id', ticketId)
    .single()

  if (!rowRaw) return { ok: false, error: 'Ticket not found' }

  const row = rowRaw as unknown as {
    id: string
    workspace_id: string
    title: string
    name: string | null
    phone: string | null
    contact: { name: string; phone: string | null } | null
    auto_sms_sent_at: string | null
  }

  if (row.auto_sms_sent_at) return { ok: true, sentTo: row.auto_sms_sent_at }

  const phone = row.contact?.phone ?? row.phone ?? null
  const name  = row.contact?.name  ?? row.name  ?? null
  if (!phone) return { ok: false, error: 'No phone number on this ticket' }

  const greeting = name ? `Hi ${name}` : 'Hi there'
  const body = customBody ?? `${greeting} — we've received your support request and our team is on it. We'll be in touch shortly.`
  const result = await sendSmsFromWorkspace({
    workspaceId: row.workspace_id,
    to:   phone,
    body,
  })

  if (!result.ok) return { ok: false, error: result.error }

  await admin
    .from('sage_tickets')
    .update({ auto_sms_sent_at: new Date().toISOString(), auto_sms_to: phone })
    .eq('id', ticketId)

  return { ok: true, sentTo: phone }
}

// ── Email contact SMS ─────────────────────────────────────────────────────────

export async function sendEmailContactSms(
  emailId: string,
  customBody?: string,
): Promise<{ ok: boolean; sentTo?: string; error?: string }> {
  const admin = createAdminClient()

  const { data: rowRaw } = await admin
    .from('sage_emails')
    .select('id, workspace_id, from_name, ai_entities, auto_sms_sent_at')
    .eq('id', emailId)
    .single()

  if (!rowRaw) return { ok: false, error: 'Email not found' }

  const row = rowRaw as {
    id: string
    workspace_id: string
    from_name: string | null
    ai_entities: Record<string, string> | null
    auto_sms_sent_at: string | null
  }

  if (row.auto_sms_sent_at) return { ok: true, sentTo: row.auto_sms_sent_at }

  const phone = row.ai_entities?.phone ?? null
  const name  = row.ai_entities?.name ?? row.from_name ?? null
  if (!phone) return { ok: false, error: 'No phone number on this email' }

  const greeting = name ? `Hi ${name}` : 'Hi there'
  const body = customBody ?? `${greeting} — thanks for your email. We've got it and will be in touch shortly.`
  const result = await sendSmsFromWorkspace({
    workspaceId: row.workspace_id,
    to:   phone,
    body,
  })

  if (!result.ok) return { ok: false, error: result.error }

  await admin
    .from('sage_emails')
    .update({ auto_sms_sent_at: new Date().toISOString(), auto_sms_to: phone })
    .eq('id', emailId)

  return { ok: true, sentTo: phone }
}

// ── Conversation contact SMS ───────────────────────────────────────────────────

export async function sendConversationSms(
  conversationId: string,
  customBody?: string,
): Promise<{ ok: boolean; sentTo?: string; error?: string }> {
  const admin = createAdminClient()

  const { data: rowRaw } = await admin
    .from('conversations')
    .select('id, workspace_id, ai_entities, auto_sms_sent_at')
    .eq('id', conversationId)
    .single()

  if (!rowRaw) return { ok: false, error: 'Conversation not found' }

  const row = rowRaw as {
    id: string
    workspace_id: string
    ai_entities: Record<string, string> | null
    auto_sms_sent_at: string | null
  }

  if (row.auto_sms_sent_at) return { ok: true, sentTo: row.auto_sms_sent_at }

  const phone = row.ai_entities?.phone ?? null
  const name  = row.ai_entities?.name ?? null
  if (!phone) return { ok: false, error: 'No phone number on this conversation' }

  const greeting = name ? `Hi ${name}` : 'Hi there'
  const body = customBody ?? `${greeting} — thanks for chatting with us. We'll be in touch shortly.`
  const result = await sendSmsFromWorkspace({
    workspaceId: row.workspace_id,
    to:   phone,
    body,
  })

  if (!result.ok) return { ok: false, error: result.error }

  await admin
    .from('conversations')
    .update({ auto_sms_sent_at: new Date().toISOString(), auto_sms_to: phone })
    .eq('id', conversationId)

  return { ok: true, sentTo: phone }
}
