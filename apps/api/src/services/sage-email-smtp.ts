/**
 * Sage Email SMTP — send emails using connected Gmail/Outlook credentials
 *
 * Uses nodemailer with the App Password credentials stored in sage_integrations.
 * After sending, logs the email to sage_emails as direction='outbound'.
 *
 * Supported providers: gmail → smtp.gmail.com:587
 *                      microsoft → smtp.office365.com:587
 */
import nodemailer from 'nodemailer'
import { supabase } from '../lib/supabase.js'
import { getValidAccessToken } from './oauth-token-refresh.js'

interface EmailAttachment {
  filename:    string
  contentType: string
  dataBase64:  string
}

interface SendEmailOptions {
  workspaceId:     string
  userId:          string
  to:              string
  cc?:             string
  bcc?:            string
  subject:         string
  body:            string
  replyToEmailId?: string  // sage_emails.id of the email being replied to
  attachments?:    EmailAttachment[]
}

interface SmtpCreds {
  host:        string
  port:        number
  user:        string
  password?:   string
  accessToken?: string   // OAuth2 — used instead of password when set
}

function getSmtpCreds(provider: string, config: Record<string, string>, accessToken?: string): SmtpCreds | null {
  const user = config.from_email
  if (!user) return null

  // OAuth2 path
  if (accessToken) {
    if (provider === 'gmail')     return { host: 'smtp.gmail.com',    port: 587, user, accessToken }
    if (provider === 'microsoft') return { host: 'smtp.office365.com', port: 587, user, accessToken }
    return null
  }

  // App-password fallback
  const password = config.app_password ?? config.password
  if (!password) return null

  if (provider === 'gmail')     return { host: 'smtp.gmail.com',    port: 587, user, password }
  if (provider === 'microsoft') return { host: 'smtp.office365.com', port: 587, user, password }
  return null
}

export async function sendEmailSMTP(opts: SendEmailOptions): Promise<void> {
  const { workspaceId, userId, to, cc, bcc, subject, body, replyToEmailId, attachments } = opts

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

  // Resolve access token — refresh if OAuth2 and expired
  let accessToken: string | undefined
  if (config.auth_method === 'oauth2') {
    const token = await getValidAccessToken(workspaceId, userId, provider as 'gmail' | 'microsoft', config)
    if (!token) throw new Error(`OAuth2 token unavailable for ${provider} integration.`)
    accessToken = token
  }

  const creds = getSmtpCreds(provider, config, accessToken)

  if (!creds) {
    throw new Error(`Missing SMTP credentials for ${provider} integration.`)
  }

  // Create nodemailer transporter
  const transporter = nodemailer.createTransport(
    creds.accessToken
      ? {
          // OAuth2 SMTP
          host:   creds.host,
          port:   creds.port,
          secure: false,
          auth: {
            type:        'OAuth2',
            user:        creds.user,
            accessToken: creds.accessToken,
          },
        }
      : {
          // App-password SMTP
          host:   creds.host,
          port:   creds.port,
          secure: false,          // STARTTLS on port 587
          auth: {
            user: creds.user,
            pass: creds.password,
          },
        },
  )

  // Send the email
  const info = await transporter.sendMail({
    from:        `"Sage CRM" <${creds.user}>`,
    to,
    ...(cc  ? { cc }  : {}),
    ...(bcc ? { bcc } : {}),
    subject,
    text:        body,
    attachments: attachments?.map(a => ({
      filename:    a.filename,
      content:     Buffer.from(a.dataBase64, 'base64'),
      contentType: a.contentType,
    })),
  })

  // Determine In-Reply-To header if replying
  let replyToMessageId: string | null = null
  if (replyToEmailId) {
    const { data: original } = await supabase
      .from('sage_emails')
      .select('message_id, contact_id')
      .eq('id', replyToEmailId)
      .single()
    replyToMessageId = original?.message_id ?? null
  }

  // Log outbound email to sage_emails
  const messageId = (info.messageId as string | undefined) ?? `sent-${Date.now()}`
  await supabase.from('sage_emails').insert({
    workspace_id: workspaceId,
    user_id:      userId,
    message_id:   messageId,
    thread_id:    replyToMessageId,
    from_address: creds.user,
    from_name:    'You',
    to_address:   to,
    subject,
    body_text:    body,
    received_at:  new Date().toISOString(),
    direction:    'outbound',
    is_read:      true,
    ai_priority:  null,    // outbound emails don't need AI analysis
  })
}
