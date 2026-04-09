'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const API_BASE    = process.env.API_BASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

interface EmailAttachment { filename: string; contentType: string; dataBase64: string }

async function getWorkspaceId(): Promise<string | null> {
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

  return (data as { workspace_id: string } | null)?.workspace_id ?? null
}

/**
 * Trigger IMAP sync for the current workspace.
 * Returns the number of new emails synced.
 */
export async function syncEmails(): Promise<{ synced: number; error?: string }> {
  if (!API_BASE || !SERVICE_KEY) return { synced: 0, error: 'Server not configured' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { synced: 0, error: 'Not authenticated' }
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { synced: 0, error: 'Not authenticated' }

  try {
    const res = await fetch(`${API_BASE}/sage/emails/sync`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-Service-Key': SERVICE_KEY },
      body:    JSON.stringify({ workspace_id: workspaceId, user_id: user.id, limit: 250 }),
    })
    const data = await res.json() as { synced?: number; error?: string }
    if (!res.ok) return { synced: 0, error: data.error ?? 'Sync failed' }
    revalidatePath('/dashboard/email')
    revalidatePath('/dashboard')
    return { synced: data.synced ?? 0 }
  } catch {
    return { synced: 0, error: 'Could not reach API' }
  }
}

/**
 * Full-mailbox search — bypasses the 200-email local limit.
 * Searches from_name, from_address, subject, ai_summary across all inbound emails.
 */
export async function searchTriageEmails(query: string): Promise<{ data: import('@/lib/types').SageEmail[]; error?: string }> {
  if (!query.trim()) return { data: [] }
  const supabase = await createClient()
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { data: [], error: 'Not authenticated' }

  const q = `%${query.trim()}%`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('sage_emails') as any)
    .select('*, contact:sage_contacts(id, name, email)')
    .eq('workspace_id', workspaceId)
    .eq('direction', 'inbound')
    .eq('is_trashed', false)
    .or(`from_name.ilike.${q},from_address.ilike.${q},subject.ilike.${q},ai_summary.ilike.${q}`)
    .order('received_at', { ascending: false })
    .limit(500)

  if (error) return { data: [], error: (error as { message: string }).message }
  return { data: (data ?? []) as import('@/lib/types').SageEmail[] }
}

/**
 * Assign emails to a team member.
 */
export async function assignEmailsTo(emailIds: string[], userId: string): Promise<{ assigned: number; error?: string }> {
  if (!emailIds.length) return { assigned: 0 }
  const supabase = await createClient()
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { assigned: 0, error: 'Not authenticated' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error, count } = await (supabase.from('sage_emails') as any)
    .update({ assigned_to: userId }, { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .in('id', emailIds)
  if (error) return { assigned: 0, error: (error as { message: string }).message }
  revalidatePath('/dashboard/email')
  return { assigned: count ?? emailIds.length }
}

/**
 * Permanently delete emails from the triage list (hard delete from DB).
 */
export async function deleteTriageEmails(emailIds: string[]): Promise<{ deleted: number; error?: string }> {
  if (!emailIds.length) return { deleted: 0 }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { deleted: 0, error: 'Not authenticated' }

  const admin = createAdminClient()

  // Fetch sender names before deleting
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: emailRows } = await (admin.from('sage_emails') as any)
    .select('id, from_name, from_address, subject')
    .in('id', emailIds)
    .eq('workspace_id', workspaceId)
  type ER = { from_name?: string | null; from_address?: string; subject?: string | null }
  const names = ((emailRows ?? []) as ER[]).map(e => e.from_name ?? e.from_address ?? null).filter(Boolean)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error, count } = await (supabase.from('sage_emails') as any)
    .delete({ count: 'exact' })
    .eq('workspace_id', workspaceId)
    .in('id', emailIds)

  if (error) return { deleted: 0, error: (error as { message: string }).message }

  if (user) {
    await admin.from('sage_activity_log').insert({
      workspace_id: workspaceId,
      entity_type:  'email',
      entity_id:    emailIds[0],
      event_type:   'email_deleted',
      payload:      { names, count: emailIds.length, source: 'email' },
      user_id:      user.id,
    })
  }

  revalidatePath('/dashboard/email')
  revalidatePath('/dashboard')
  return { deleted: count ?? emailIds.length }
}

/**
 * Trigger retroactive AI analysis for emails.
 * If emailIds is provided, only those emails are re-analysed (regardless of prior analysis).
 * Otherwise, analyses up to batchSize emails that have never been processed.
 */
export async function reanalyzeEmails(batchSize = 50, emailIds?: string[]): Promise<{ reanalyzed: number; error?: string }> {
  if (!API_BASE || !SERVICE_KEY) return { reanalyzed: 0, error: 'Server not configured' }

  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { reanalyzed: 0, error: 'Not authenticated' }

  try {
    const body: Record<string, unknown> = { workspace_id: workspaceId, batch_size: batchSize }
    if (emailIds && emailIds.length > 0) body.email_ids = emailIds

    const res = await fetch(`${API_BASE}/sage/emails/reanalyze`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-Service-Key': SERVICE_KEY },
      body:    JSON.stringify(body),
    })
    const data = await res.json() as { reanalyzed?: number; error?: string }
    if (!res.ok) return { reanalyzed: 0, error: data.error ?? 'Reanalysis failed' }
    revalidatePath('/dashboard/email')
    revalidatePath('/dashboard')
    return { reanalyzed: data.reanalyzed ?? 0 }
  } catch {
    return { reanalyzed: 0, error: 'Could not reach API' }
  }
}

/**
 * Quick check — fetch only the latest 10 emails (fast, non-disruptive refresh).
 */
export async function quickCheckEmails(): Promise<{ synced: number; error?: string }> {
  if (!API_BASE || !SERVICE_KEY) return { synced: 0, error: 'Server not configured' }

  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { synced: 0, error: 'Not authenticated' }

  try {
    const res = await fetch(`${API_BASE}/sage/emails/sync`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-Service-Key': SERVICE_KEY },
      body:    JSON.stringify({ workspace_id: workspaceId, limit: 10 }),
    })
    const data = await res.json() as { synced?: number; error?: string }
    if (!res.ok) return { synced: 0, error: data.error ?? 'Check failed' }
    revalidatePath('/dashboard/email')
    return { synced: data.synced ?? 0 }
  } catch {
    return { synced: 0, error: 'Could not reach API' }
  }
}

/**
 * Toggle starred state on an email.
 */
export async function markEmailStarred(emailId: string, starred: boolean): Promise<{ error?: string }> {
  const supabase = await createClient()
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { error: 'Not authenticated' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('sage_emails') as any)
    .update({ is_starred: starred })
    .eq('id', emailId)
    .eq('workspace_id', workspaceId)

  if (error) return { error: (error as { message: string }).message }
  return {}
}

/**
 * Move an email to/from trash.
 */
export async function markEmailTrashed(emailId: string, trashed: boolean): Promise<{ error?: string }> {
  const supabase = await createClient()
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { error: 'Not authenticated' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('sage_emails') as any)
    .update({ is_trashed: trashed })
    .eq('id', emailId)
    .eq('workspace_id', workspaceId)

  if (error) return { error: (error as { message: string }).message }
  revalidatePath('/dashboard/email')
  return {}
}

/**
 * Send an email using the workspace's connected Gmail/Outlook account.
 */
export async function sendEmail(opts: {
  to:              string
  cc?:             string
  bcc?:            string
  subject:         string
  body:            string
  replyToEmailId?: string
  attachments?:    EmailAttachment[]
}): Promise<{ ok: boolean; error?: string }> {
  if (!API_BASE || !SERVICE_KEY) return { ok: false, error: 'Server not configured' }

  const supabase2 = await createClient()
  const { data: { user: sender } } = await supabase2.auth.getUser()
  if (!sender) return { ok: false, error: 'Not authenticated' }
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { ok: false, error: 'Not authenticated' }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30_000)

    let res: Response
    try {
      res = await fetch(`${API_BASE}/sage/emails/send`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'X-Service-Key': SERVICE_KEY },
        body:    JSON.stringify({
          workspace_id:      workspaceId,
          user_id:           sender.id,
          to:                opts.to,
          cc:                opts.cc  || undefined,
          bcc:               opts.bcc || undefined,
          subject:           opts.subject,
          body:              opts.body,
          reply_to_email_id: opts.replyToEmailId,
          attachments:       opts.attachments,
        }),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeout)
    }

    const data = await res.json() as { ok?: boolean; error?: string }
    if (!res.ok) return { ok: false, error: data.error ?? 'Send failed' }

    // NOTE: We deliberately do NOT mark is_read=true here.
    // Next.js auto-refreshes the current route after any server action, which
    // would cause the dashboard to re-fetch emails filtered by is_read=false,
    // unmounting the DetailCard and killing the Update popup before the user
    // can interact. Instead, markEmailRead() is called when the user clicks Done.
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error && err.name === 'AbortError'
      ? 'Request timed out — the mail server took too long to respond'
      : 'Could not reach API'
    return { ok: false, error: msg }
  }
}

/**
 * Log a "meeting scheduled" record in sage_meetings linked to the email chain,
 * and return a pre-filled Google Calendar URL so the user can pick the time.
 */
export async function scheduleMeetingFromEmail(opts: {
  emailId:       string
  subject:       string
  fromAddress:   string
  fromName:      string | null
}): Promise<{ ok: boolean; calendarUrl: string; error?: string }> {
  const supabase = await createClient()
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { ok: false, calendarUrl: '', error: 'Not authenticated' }

  const title = `Meeting with ${opts.fromName ?? opts.fromAddress} — Re: ${opts.subject}`
  const description = `Meeting scheduled from email chain.\nClient: ${opts.fromName ?? opts.fromAddress} (${opts.fromAddress})\nSubject: ${opts.subject}`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('sage_meetings').insert({
    workspace_id:   workspaceId,
    email_id:       opts.emailId,
    title,
    description,
    attendees:      [opts.fromAddress],
    organizer:      opts.fromAddress,
    organizer_name: opts.fromName,
  })

  if (error) return { ok: false, calendarUrl: '', error: (error as { message: string }).message }

  // Get the newly created meeting id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: newMeeting } = await (supabase as any)
    .from('sage_meetings')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('email_id', opts.emailId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const meetingId = (newMeeting as { id: string } | null)?.id ?? null

  revalidatePath('/dashboard')

  // If the current user has Google Calendar connected, auto-create the event
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (currentUser) {
    const admin = createAdminClient()
    const { data: gcalRow } = await admin
      .from('sage_integrations' as never)
      .select('status')
      .eq('workspace_id', workspaceId)
      .eq('user_id', currentUser.id)
      .eq('provider', 'google_calendar')
      .eq('status', 'connected')
      .maybeSingle()

    if (gcalRow) {
      const apiBase    = process.env.API_BASE_URL
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (apiBase && serviceKey) {
        // Default to 30-min slot starting 1 hour from now
        const startAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
        const endAt   = new Date(Date.now() + 90 * 60 * 1000).toISOString()
        try {
          const resp = await fetch(`${apiBase}/calendar/events`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', 'X-Service-Key': serviceKey },
            body: JSON.stringify({
              workspace_id:    workspaceId,
              user_id:         currentUser.id,
              title,
              description,
              start_at:        startAt,
              end_at:          endAt,
              attendee_emails: [opts.fromAddress],
              sage_meeting_id: meetingId,
            }),
          })
          const result = await resp.json() as { ok?: boolean; html_link?: string }
          if (result.ok && result.html_link) {
            return { ok: true, calendarUrl: result.html_link }
          }
        } catch { /* fall through to manual URL */ }
      }
    }
  }

  // Fallback: manual Google Calendar "create event" URL
  const params = new URLSearchParams({
    text:    title,
    details: description,
    add:     opts.fromAddress,
  })
  const calendarUrl = `https://calendar.google.com/calendar/r/eventedit?${params.toString()}`
  return { ok: true, calendarUrl }
}

/**
 * Mark a triage email as read (is_read=true) so it no longer appears in triage.
 * Called explicitly when the user dismisses the post-send popup ("Done").
 */
export async function updateEmailPriority(emailId: string, priority: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { error: 'Unauthorized' }

  const admin = createAdminClient()

  // Fetch subject + sender before updating so we can include them in the activity log
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: emailRow } = await (admin as any)
    .from('sage_emails')
    .select('subject, from_name, from_address, ai_priority')
    .eq('id', emailId)
    .eq('workspace_id', workspaceId)
    .single()
  const row         = emailRow as { subject?: string | null; from_name?: string | null; from_address?: string | null; ai_priority?: string | null } | null
  const sender      = row?.from_name ?? row?.from_address ?? null
  const subject     = row?.subject ?? null
  const name        = sender && subject ? `${sender} · ${subject}` : (subject ?? sender ?? null)
  const oldPriority = row?.ai_priority ?? null

  const { error } = await admin
    .from('sage_emails')
    .update({ ai_priority: priority })
    .eq('id', emailId)
    .eq('workspace_id', workspaceId)

  if (error) return { error: error.message }

  await admin.from('sage_activity_log').insert({
    workspace_id: workspaceId,
    entity_type:  'email',
    entity_id:    emailId,
    event_type:   'priority_changed',
    payload:      { from: oldPriority, to: priority, name },
    user_id:      user.id,
  })

  revalidatePath('/dashboard/email')
  revalidatePath('/dashboard')
  return {}
}

export async function markEmailRead(emailId: string): Promise<void> {
  const admin = createAdminClient()
  await admin.from('sage_emails').update({ is_read: true }).eq('id', emailId)
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/email')
}

export async function enhanceEmailReply(
  emailId: string,
  currentDraft: string,
): Promise<{ enhanced?: string; error?: string }> {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { error: 'Unauthorized' }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: emailRow } = await (admin as any)
    .from('sage_emails')
    .select('subject, from_name, from_address, body_text, ai_summary')
    .eq('id', emailId)
    .eq('workspace_id', workspaceId)
    .single()

  type EmailRow = { subject?: string | null; from_name?: string | null; from_address?: string | null; body_text?: string | null; ai_summary?: string | null }
  const email = emailRow as EmailRow | null
  if (!email) return { error: 'Email not found' }

  const context = [
    email?.subject   ? `Subject: ${email.subject}`          : '',
    email?.from_name ? `From: ${email.from_name}`           : `From: ${email.from_address ?? 'unknown'}`,
    email?.ai_summary ? `Summary: ${email.ai_summary}`      : '',
    email?.body_text  ? `Original email:\n${email.body_text.slice(0, 1500)}` : '',
  ].filter(Boolean).join('\n')

  const draftText = currentDraft.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

  try {
    const response = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages:   [{
        role:    'user',
        content: `You are an expert email writer. Improve the following reply email draft to be professional, clear, and concise while preserving the original intent and tone.

Context:
${context}

Current draft:
${draftText || '(empty — write a professional reply from scratch based on the email context)'}

Return ONLY the improved reply text with no preamble, no subject line, no "Here is your improved reply:" prefix. Just the email body text ready to send. Use proper paragraphs.`,
      }],
    })

    const enhanced = (response.content[0] as { type: string; text: string }).text?.trim() ?? ''
    return { enhanced }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'AI enhancement failed' }
  }
}

/**
 * Generate a first-draft email from plain context (bot conversation, ticket, form submission).
 * Used by EmailComposeModal when opened from outside the email inbox.
 */
export async function draftEmailFromContext(params: {
  toName?:  string
  subject:  string
  context:  string
}): Promise<{ draft: string } | { error: string }> {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { error: 'Unauthorized' }

  try {
    const response = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages:   [{
        role:    'user',
        content: `Write a short, professional outreach or follow-up email based on the context below.

${params.toName ? `Recipient: ${params.toName}` : ''}
Subject: ${params.subject}
Context:
${params.context}

Return ONLY the email body text — no subject line, no "Here is your email:" preamble. Use proper paragraphs. Keep it concise (3–5 sentences).`,
      }],
    })

    const draft = (response.content[0] as { type: string; text: string }).text?.trim() ?? ''
    return { draft }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Draft generation failed' }
  }
}

/**
 * Fetch the HTML signature saved for the workspace's connected email account.
 */
export async function getEmailSignature(): Promise<{ html: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { html: null }
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { html: null }

  for (const provider of ['gmail', 'microsoft']) {
    const { data } = await supabase
      .from('sage_integrations')
      .select('config')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .eq('provider', provider)
      .eq('status', 'connected')
      .limit(1)
      .single()

    const cfg = (data as { config: Record<string, string> } | null)?.config
    if (cfg?.signature) return { html: cfg.signature }
  }

  return { html: null }
}

/**
 * Save an HTML email signature for the workspace's connected email account.
 * Merges with existing config (credentials are preserved).
 */
export async function saveEmailSignature(html: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { ok: false, error: 'Not authenticated' }

  const { data: integration } = await supabase
    .from('sage_integrations')
    .select('provider, config')
    .eq('workspace_id', workspaceId)
    .in('provider', ['gmail', 'microsoft'])
    .eq('status', 'connected')
    .limit(1)
    .single()

  if (!integration) return { ok: false, error: 'No email account connected' }

  const typed = integration as { provider: string; config: Record<string, string> }
  const admin = createAdminClient()
  const { error } = await admin
    .from('sage_integrations')
    .update({ config: { ...typed.config, signature: html }, updated_at: new Date().toISOString() })
    .eq('workspace_id', workspaceId)
    .eq('provider', typed.provider)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/**
 * Ask Claude to rewrite an email body according to an instruction.
 */
export async function rewriteEmail(opts: {
  emailId?:    string
  body:        string
  instruction: string
}): Promise<{ body: string; error?: string }> {
  if (!API_BASE || !SERVICE_KEY) return { body: opts.body, error: 'Server not configured' }

  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { body: opts.body, error: 'Not authenticated' }

  try {
    const res = await fetch(`${API_BASE}/sage/emails/${opts.emailId ?? 'new'}/rewrite`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-Service-Key': SERVICE_KEY },
      body:    JSON.stringify({ workspace_id: workspaceId, body: opts.body, instruction: opts.instruction }),
    })
    const data = await res.json() as { body?: string; error?: string }
    if (!res.ok) return { body: opts.body, error: data.error ?? 'Rewrite failed' }
    return { body: data.body ?? opts.body }
  } catch {
    return { body: opts.body, error: 'Could not reach API' }
  }
}

// ---------------------------------------------------------------------------
// Stripe invoice helpers
// ---------------------------------------------------------------------------

interface StripeInvoice {
  id:              string
  number:          string | null
  customer_name:   string | null
  customer_email:  string | null
  amount_due:      number
  currency:        string
  status:          string
  invoice_pdf:     string | null
  created:         number
}

/**
 * Fetch the last 20 open Stripe invoices for the workspace.
 */
export async function fetchStripeInvoices(): Promise<{ invoices: StripeInvoice[]; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { invoices: [], error: 'Not authenticated' }

  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { invoices: [], error: 'Not authenticated' }

  // Load Stripe secret key from sage_integrations
  const { data: integration } = await supabase
    .from('sage_integrations')
    .select('config')
    .eq('workspace_id', workspaceId)
    .eq('provider', 'stripe')
    .eq('status', 'connected')
    .limit(1)
    .single()

  const stripeKey = (integration as { config: Record<string, string> } | null)?.config?.secret_key
  if (!stripeKey) return { invoices: [], error: 'Stripe not connected' }

  try {
    const res = await fetch('https://api.stripe.com/v1/invoices?limit=20&status=open', {
      headers: { Authorization: `Bearer ${stripeKey}` },
    })
    const data = await res.json() as { data?: StripeInvoice[]; error?: { message: string } }
    if (!res.ok) return { invoices: [], error: data.error?.message ?? 'Stripe error' }
    return { invoices: data.data ?? [] }
  } catch {
    return { invoices: [], error: 'Could not reach Stripe' }
  }
}

/**
 * Download a Stripe invoice PDF and return it as a base64 attachment.
 */
export async function fetchStripeInvoicePDF(invoiceId: string): Promise<EmailAttachment & { error?: string }> {
  const fallback: EmailAttachment = { filename: 'invoice.pdf', contentType: 'application/pdf', dataBase64: '' }

  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { ...fallback, error: 'Not authenticated' }

  const supabase = await createClient()
  const { data: integration } = await supabase
    .from('sage_integrations')
    .select('config')
    .eq('workspace_id', workspaceId)
    .eq('provider', 'stripe')
    .eq('status', 'connected')
    .limit(1)
    .single()

  const stripeKey = (integration as { config: Record<string, string> } | null)?.config?.secret_key
  if (!stripeKey) return { ...fallback, error: 'Stripe not connected' }

  try {
    // Fetch invoice metadata to get the PDF URL
    const metaRes = await fetch(`https://api.stripe.com/v1/invoices/${invoiceId}`, {
      headers: { Authorization: `Bearer ${stripeKey}` },
    })
    const invoice = await metaRes.json() as { number?: string; invoice_pdf?: string; error?: { message: string } }
    if (!metaRes.ok) return { ...fallback, error: invoice.error?.message ?? 'Stripe error' }
    if (!invoice.invoice_pdf) return { ...fallback, error: 'No PDF available for this invoice' }

    // Download the PDF
    const pdfRes = await fetch(invoice.invoice_pdf)
    if (!pdfRes.ok) return { ...fallback, error: 'Failed to download invoice PDF' }
    const buffer = Buffer.from(await pdfRes.arrayBuffer())
    const filename = `invoice-${invoice.number ?? invoiceId}.pdf`
    return { filename, contentType: 'application/pdf', dataBase64: buffer.toString('base64') }
  } catch {
    return { ...fallback, error: 'Could not fetch Stripe invoice' }
  }
}

// ---------------------------------------------------------------------------
// Proposal PDF generator
// ---------------------------------------------------------------------------

/**
 * Generate a branded proposal PDF from a deal and return it as a base64 attachment.
 */
export async function generateProposalPDF(dealId: string): Promise<EmailAttachment & { error?: string }> {
  const fallback: EmailAttachment = { filename: 'proposal.pdf', contentType: 'application/pdf', dataBase64: '' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ...fallback, error: 'Not authenticated' }

  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { ...fallback, error: 'Not authenticated' }

  // Fetch deal + contact
  const { data: deal } = await supabase
    .from('sage_deals')
    .select('title, value, close_date, description, contact:sage_contacts(name, email)')
    .eq('id', dealId)
    .eq('workspace_id', workspaceId)
    .single()

  if (!deal) return { ...fallback, error: 'Deal not found' }

  // Fetch workspace name
  const { data: ws } = await supabase
    .from('workspaces')
    .select('name')
    .eq('id', workspaceId)
    .single()

  const workspaceName   = (ws as { name: string } | null)?.name ?? 'Your Company'
  const dealData        = deal as {
    title:       string
    value:       number | null
    close_date:  string | null
    description: string | null
    contact:     { name: string; email: string } | null
  }
  const contactName  = dealData.contact?.name  ?? 'Valued Client'
  const contactEmail = dealData.contact?.email ?? ''
  const dateStr      = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const closeDateStr = dealData.close_date
    ? new Date(dealData.close_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—'
  const valueStr     = dealData.value != null
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(dealData.value)
    : '—'

  try {
    // Build PDF
    const pdfDoc    = await PDFDocument.create()
    const page      = pdfDoc.addPage([595, 842])  // A4
    const { width, height } = page.getSize()
    const fontBold  = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const fontReg   = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const orange    = rgb(0.929, 0.451, 0.180)  // #ec732e
    const black     = rgb(0, 0, 0)
    const gray      = rgb(0.4, 0.4, 0.4)

    let y = height - 60

    // Header bar
    page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: orange })
    page.drawText(workspaceName.toUpperCase(), { x: 40, y: height - 48, font: fontBold, size: 16, color: rgb(1,1,1) })
    page.drawText('PROPOSAL', { x: width - 120, y: height - 48, font: fontBold, size: 16, color: rgb(1,1,1) })

    y = height - 110

    // Client block
    page.drawText('PREPARED FOR', { x: 40, y, font: fontBold, size: 8, color: orange })
    y -= 18
    page.drawText(contactName, { x: 40, y, font: fontBold, size: 14, color: black })
    y -= 16
    if (contactEmail) {
      page.drawText(contactEmail, { x: 40, y, font: fontReg, size: 10, color: gray })
      y -= 14
    }
    page.drawText(`Date: ${dateStr}`, { x: 40, y, font: fontReg, size: 10, color: gray })

    y -= 30
    // Divider
    page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 1, color: orange })
    y -= 24

    // Project section
    page.drawText('PROJECT', { x: 40, y, font: fontBold, size: 8, color: orange })
    y -= 18
    page.drawText(dealData.title, { x: 40, y, font: fontBold, size: 14, color: black })
    y -= 30

    // Value + Close date row
    page.drawText('VALUE', { x: 40, y, font: fontBold, size: 8, color: orange })
    page.drawText('CLOSE DATE', { x: 220, y, font: fontBold, size: 8, color: orange })
    y -= 16
    page.drawText(valueStr, { x: 40, y, font: fontBold, size: 13, color: black })
    page.drawText(closeDateStr, { x: 220, y, font: fontBold, size: 13, color: black })
    y -= 30

    // Description
    if (dealData.description) {
      page.drawText('SCOPE / DESCRIPTION', { x: 40, y, font: fontBold, size: 8, color: orange })
      y -= 16
      // Simple line-wrapping at ~80 chars
      const words      = dealData.description.split(' ')
      let   line       = ''
      const maxWidth   = 75
      for (const word of words) {
        if ((line + ' ' + word).trim().length > maxWidth) {
          page.drawText(line.trim(), { x: 40, y, font: fontReg, size: 10, color: black })
          y   -= 14
          line = word
        } else {
          line = line ? line + ' ' + word : word
        }
      }
      if (line) {
        page.drawText(line.trim(), { x: 40, y, font: fontReg, size: 10, color: black })
        y -= 14
      }
      y -= 16
    }

    // Footer divider
    page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 1, color: orange })
    y -= 18
    page.drawText(workspaceName, { x: 40, y, font: fontBold, size: 10, color: black })
    y -= 14
    page.drawText('This proposal is valid for 30 days.', { x: 40, y, font: fontReg, size: 9, color: gray })

    const pdfBytes = await pdfDoc.save()
    const slug     = dealData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)
    return {
      filename:    `proposal-${slug}.pdf`,
      contentType: 'application/pdf',
      dataBase64:  Buffer.from(pdfBytes).toString('base64'),
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'PDF generation failed'
    return { ...fallback, error: msg }
  }
}
