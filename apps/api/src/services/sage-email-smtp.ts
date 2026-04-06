/**
 * Sage Email SMTP — send emails using connected Gmail/Outlook credentials
 *
 * Uses nodemailer with the App Password credentials stored in sage_integrations.
 * After sending, logs the email to sage_emails as direction='outbound' and
 * writes a message_events row with event_type='email_sent' or 'email_failed'.
 *
 * Supported providers: gmail → smtp.gmail.com:587
 *                      microsoft → smtp.office365.com:587
 */
import nodemailer from 'nodemailer'
import { createHmac } from 'crypto'
import { supabase } from '../lib/supabase.js'
import { getValidAccessToken } from './oauth-token-refresh.js'

interface EmailAttachment {
  filename:    string
  contentType: string
  dataBase64:  string
}

interface SendEmailOptions {
  workspaceId:       string
  userId:            string
  to:                string
  cc?:               string
  bcc?:              string
  subject:           string
  body:              string
  replyToEmailId?:   string  // sage_emails.id of the email being replied to
  attachments?:      EmailAttachment[]
  contactId?:        string  // when sending automation emails — enables opt-out guard + unsubscribe footer
  isAutomation?:     boolean // if true, appends unsubscribe footer even without replyToEmailId
}

interface SmtpCreds {
  host:        string
  port:        number
  user:        string
  password?:   string
  accessToken?: string
}

function getSmtpCreds(provider: string, config: Record<string, string>, accessToken?: string): SmtpCreds | null {
  const user = config.from_email
  if (!user) return null

  if (accessToken) {
    if (provider === 'gmail')     return { host: 'smtp.gmail.com',    port: 587, user, accessToken }
    if (provider === 'microsoft') return { host: 'smtp.office365.com', port: 587, user, accessToken }
    return null
  }

  const password = config.app_password ?? config.password
  if (!password) return null

  if (provider === 'gmail')     return { host: 'smtp.gmail.com',    port: 587, user, password }
  if (provider === 'microsoft') return { host: 'smtp.office365.com', port: 587, user, password }
  return null
}

// ---------------------------------------------------------------------------
// Helper: write a message_events row — fire-and-forget, never throws
// ---------------------------------------------------------------------------
async function writeMessageEvent(opts: {
  workspaceId:        string
  internalMessageId?: string | null
  externalMessageId?: string | null
  contactId?:         string | null
  dealId?:            string | null
  eventType:          string
  provider:           string
  providerPayload?:   Record<string, unknown>
}): Promise<void> {
  try {
    await supabase.from('message_events').insert({
      workspace_id:        opts.workspaceId,
      channel:             'email',
      internal_message_id: opts.internalMessageId ?? null,
      external_message_id: opts.externalMessageId ?? null,
      contact_id:          opts.contactId ?? null,
      deal_id:             opts.dealId    ?? null,
      event_type:          opts.eventType,
      provider:            opts.provider,
      provider_payload:    opts.providerPayload ?? null,
      event_at:            new Date().toISOString(),
    })
  } catch (err) {
    console.error('[message_events] write failed (non-fatal):', err)
  }
}

// ---------------------------------------------------------------------------
// Unsubscribe link helpers
// ---------------------------------------------------------------------------

function buildUnsubscribeToken(contactId: string): string {
  const secret = process.env.INTERNAL_AI_REVIEW_SECRET ?? ''
  return createHmac('sha256', secret).update(contactId).digest('hex')
}

function buildUnsubscribeFooter(contactId: string): string {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? '').replace(/\/$/, '')
  const sig    = buildUnsubscribeToken(contactId)
  const url    = `${appUrl}/api/unsubscribe?c=${contactId}&sig=${sig}`
  return `\n\n---\nTo stop receiving these emails, click here to unsubscribe: ${url}`
}

// ---------------------------------------------------------------------------

export async function sendEmailSMTP(opts: SendEmailOptions): Promise<void> {
  const { workspaceId, userId, to, cc, bcc, subject, replyToEmailId, attachments, contactId, isAutomation } = opts
  let body = opts.body

  // ── Opt-out guard ─────────────────────────────────────────────────────────
  if (contactId) {
    const { data: contact } = await supabase
      .from('sage_contacts')
      .select('email_opt_out')
      .eq('id', contactId)
      .single()
    if (contact?.email_opt_out) {
      throw new Error(`[smtp] Contact ${contactId} has unsubscribed from email.`)
    }
  }

  // ── Append unsubscribe footer for automation emails ───────────────────────
  if (contactId && isAutomation) {
    body = body + buildUnsubscribeFooter(contactId)
  }

  // Load connected email integration for this user
  const { data: integrations } = await supabase
    .from('sage_integrations')
    .select('provider, config')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('status', 'connected')
    .in('provider', ['gmail', 'microsoft'])
    .limit(1)

  if (!integrations || integrations.length === 0) {
    throw new Error('No connected email integration. Connect Gmail or Outlook in Sage → Integrations.')
  }

  const { provider, config } = integrations[0] as { provider: string; config: Record<string, string> }

  // Resolve access token
  let accessToken: string | undefined
  if (config.auth_method === 'oauth2') {
    const token = await getValidAccessToken(workspaceId, userId, provider as 'gmail' | 'microsoft', config)
    if (!token) throw new Error(`OAuth2 token unavailable for ${provider} integration.`)
    accessToken = token
  }

  // Load In-Reply-To header + contact linkage
  let replyToMessageId: string | null = null
  let replyToContactId: string | null = null
  if (replyToEmailId) {
    const { data: original } = await supabase
      .from('sage_emails')
      .select('message_id, contact_id')
      .eq('id', replyToEmailId)
      .single()
    replyToMessageId = original?.message_id ?? null
    replyToContactId = original?.contact_id ?? null
  }

  // ── Microsoft Graph API ──────────────────────────────────────────────────
  if (provider === 'microsoft' && accessToken) {
    const toRecipients  = to.split(',').map(a => ({ emailAddress: { address: a.trim() } }))
    const ccRecipients  = cc  ? cc.split(',').map(a => ({ emailAddress: { address: a.trim() } })) : undefined
    const bccRecipients = bcc ? bcc.split(',').map(a => ({ emailAddress: { address: a.trim() } })) : undefined

    const graphBody: Record<string, unknown> = {
      message: {
        subject,
        body:           { contentType: 'Text', content: body },
        toRecipients,
        ...(ccRecipients  ? { ccRecipients }  : {}),
        ...(bccRecipients ? { bccRecipients } : {}),
        ...(replyToMessageId ? { singleValueExtendedProperties: [{ id: 'String {00020386-0000-0000-C000-000000000046} Name In-Reply-To', value: replyToMessageId }] } : {}),
        ...(attachments?.length ? {
          attachments: attachments.map(a => ({
            '@odata.type':  '#microsoft.graph.fileAttachment',
            name:           a.filename,
            contentType:    a.contentType,
            contentBytes:   a.dataBase64,
          })),
        } : {}),
      },
      saveToSentItems: true,
    }

    const sendRes = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method:  'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify(graphBody),
    })

    if (!sendRes.ok) {
      const errText = await sendRes.text()
      await writeMessageEvent({
        workspaceId,
        eventType:       'email_failed',
        provider:        'smtp_microsoft',
        providerPayload: { error: errText, to },
      })
      throw new Error(`Graph sendMail error: ${sendRes.status} ${errText}`)
    }

    const messageId = `graph-sent-${Date.now()}`
    const { data: inserted } = await supabase.from('sage_emails').insert({
      workspace_id:        workspaceId,
      user_id:             userId,
      message_id:          messageId,
      thread_id:           replyToMessageId,
      from_address:        config.from_email,
      from_name:           'You',
      to_address:          to,
      subject,
      body_text:           body,
      received_at:         new Date().toISOString(),
      direction:           'outbound',
      is_read:             true,
      ai_priority:         null,
      delivery_status:     'sent',
      provider_message_id: messageId,
    }).select('id, contact_id').single()

    await writeMessageEvent({
      workspaceId,
      internalMessageId: inserted?.id,
      externalMessageId: messageId,
      contactId:         inserted?.contact_id ?? replyToContactId,
      eventType:         'email_sent',
      provider:          'smtp_microsoft',
      providerPayload:   { to, subject },
    })
    return
  }

  // ── Gmail API ────────────────────────────────────────────────────────────
  if (provider === 'gmail' && accessToken) {
    const lines: string[] = []
    lines.push(`From: ${config.from_email}`)
    lines.push(`To: ${to}`)
    if (cc)  lines.push(`Cc: ${cc}`)
    if (bcc) lines.push(`Bcc: ${bcc}`)
    lines.push(`Subject: ${subject}`)
    if (replyToMessageId) {
      lines.push(`In-Reply-To: ${replyToMessageId}`)
      lines.push(`References: ${replyToMessageId}`)
    }
    lines.push('MIME-Version: 1.0')

    if (attachments?.length) {
      const boundary = `==Boundary_${Date.now()}`
      lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`)
      lines.push('')
      lines.push(`--${boundary}`)
      lines.push('Content-Type: text/plain; charset=utf-8')
      lines.push('')
      lines.push(body)
      for (const att of attachments) {
        lines.push(`--${boundary}`)
        lines.push(`Content-Type: ${att.contentType}; name="${att.filename}"`)
        lines.push('Content-Transfer-Encoding: base64')
        lines.push(`Content-Disposition: attachment; filename="${att.filename}"`)
        lines.push('')
        lines.push(att.dataBase64)
      }
      lines.push(`--${boundary}--`)
    } else {
      lines.push('Content-Type: text/plain; charset=utf-8')
      lines.push('')
      lines.push(body)
    }

    const rawMime = lines.join('\r\n')
    const raw     = Buffer.from(rawMime).toString('base64url')

    const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method:  'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ raw }),
    })

    if (!sendRes.ok) {
      const errText = await sendRes.text()
      await writeMessageEvent({
        workspaceId,
        eventType:       'email_failed',
        provider:        'smtp_gmail',
        providerPayload: { error: errText, to },
      })
      throw new Error(`Gmail API send error: ${sendRes.status} ${errText}`)
    }

    const sentMsg   = await sendRes.json() as { id?: string }
    const gmailId   = sentMsg.id
    const messageId = gmailId ? `gmail-sent-${gmailId}` : `sent-${Date.now()}`

    const { data: inserted } = await supabase.from('sage_emails').insert({
      workspace_id:        workspaceId,
      user_id:             userId,
      message_id:          messageId,
      thread_id:           replyToMessageId,
      from_address:        config.from_email,
      from_name:           'You',
      to_address:          to,
      subject,
      body_text:           body,
      received_at:         new Date().toISOString(),
      direction:           'outbound',
      is_read:             true,
      ai_priority:         null,
      delivery_status:     'sent',
      provider_message_id: gmailId ?? messageId,
    }).select('id, contact_id').single()

    await writeMessageEvent({
      workspaceId,
      internalMessageId: inserted?.id,
      externalMessageId: gmailId ?? messageId,
      contactId:         inserted?.contact_id ?? replyToContactId,
      eventType:         'email_sent',
      provider:          'smtp_gmail',
      providerPayload:   { to, subject, gmail_id: gmailId },
    })
    return
  }

  // ── Nodemailer SMTP (app-password) ───────────────────────────────────────
  const creds = getSmtpCreds(provider, config, accessToken)
  if (!creds) {
    throw new Error(`Missing SMTP credentials for ${provider} integration.`)
  }

  const transporter = nodemailer.createTransport({
    host:   creds.host,
    port:   creds.port,
    secure: false,
    auth: {
      user: creds.user,
      pass: creds.password,
    },
  })

  let info: Awaited<ReturnType<typeof transporter.sendMail>>
  try {
    info = await transporter.sendMail({
      from:        `"Sage CRM" <${creds.user}>`,
      to,
      ...(cc  ? { cc }  : {}),
      ...(bcc ? { bcc } : {}),
      subject,
      text:        body,
      ...(replyToMessageId ? {
        inReplyTo:  replyToMessageId,
        references: replyToMessageId,
      } : {}),
      attachments: attachments?.map(a => ({
        filename:    a.filename,
        content:     Buffer.from(a.dataBase64, 'base64'),
        contentType: a.contentType,
      })),
    })
  } catch (err) {
    const failReason = err instanceof Error ? err.message : String(err)
    await writeMessageEvent({
      workspaceId,
      eventType:       'email_failed',
      provider:        `smtp_${provider}`,
      providerPayload: { error: failReason, to },
    })
    throw err
  }

  const messageId = (info.messageId as string | undefined) ?? `sent-${Date.now()}`
  const { data: inserted } = await supabase.from('sage_emails').insert({
    workspace_id:        workspaceId,
    user_id:             userId,
    message_id:          messageId,
    thread_id:           replyToMessageId,
    from_address:        creds.user,
    from_name:           'You',
    to_address:          to,
    subject,
    body_text:           body,
    received_at:         new Date().toISOString(),
    direction:           'outbound',
    is_read:             true,
    ai_priority:         null,
    delivery_status:     'sent',
    provider_message_id: messageId,
  }).select('id, contact_id').single()

  await writeMessageEvent({
    workspaceId,
    internalMessageId: inserted?.id,
    externalMessageId: messageId,
    contactId:         inserted?.contact_id ?? replyToContactId,
    eventType:         'email_sent',
    provider:          `smtp_${provider}`,
    providerPayload:   { to, subject, message_id: messageId },
  })
}
