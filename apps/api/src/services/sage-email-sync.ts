/**
 * Sage Email Sync — IMAP-based email fetching + AI analysis
 *
 * Uses App Password credentials already stored in sage_integrations to
 * connect via IMAP and pull recent emails into the sage_emails table.
 * Each new email is analysed by Claude (priority, summary, insights, reply drafts).
 *
 * Supported providers: gmail → imap.gmail.com:993
 *                      microsoft → outlook.office365.com:993
 */
import { ImapFlow }     from 'imapflow'
import { simpleParser } from 'mailparser'
import { supabase }     from '../lib/supabase.js'
import { callClaude }   from './ai/claude.js'

// ---------------------------------------------------------------------------
// Provider config
// ---------------------------------------------------------------------------

interface ImapCreds {
  host: string
  port: number
  auth: { user: string; pass: string }
}

function getImapCreds(provider: string, config: Record<string, string>): ImapCreds | null {
  const email    = config.from_email
  const password = config.app_password ?? config.password

  if (!email || !password) return null

  if (provider === 'gmail') {
    return { host: 'imap.gmail.com', port: 993, auth: { user: email, pass: password } }
  }
  if (provider === 'microsoft') {
    return { host: 'outlook.office365.com', port: 993, auth: { user: email, pass: password } }
  }
  return null
}

// ---------------------------------------------------------------------------
// AI analysis
// ---------------------------------------------------------------------------

interface EmailAnalysis {
  priority:     'high' | 'medium' | 'low'
  summary:      string
  insights:     string[]
  reply_drafts: { tone: string; body: string }[]
}

async function analyzeEmail(
  from: string,
  subject: string,
  bodyText: string,
): Promise<EmailAnalysis | null> {
  const prompt = `You are analysing a CRM email. Return ONLY valid JSON (no markdown fences, no explanation):
{
  "priority": "high" | "medium" | "low",
  "summary": "<one sentence — what is being asked and what action is needed>",
  "insights": ["<key insight 1>", "<key insight 2>"],
  "reply_drafts": [
    {"tone":"Professional","body":"<complete reply>"},
    {"tone":"Friendly","body":"<complete reply>"},
    {"tone":"Concise","body":"<complete reply>"}
  ]
}

Priority guide:
- high: urgent request, complaint, contract/payment/legal matter, decision needed today
- medium: question, follow-up, proposal response, general enquiry
- low: newsletter, FYI, automated notification, no action required

From: ${from}
Subject: ${subject}
Body (first 3000 chars):
${bodyText.slice(0, 3000)}`

  try {
    const result = await callClaude({
      model:       'claude-haiku-4-5-20251001',  // fast + cheap for bulk analysis
      systemPrompt: 'You are a precise JSON generator. Output only the JSON object requested.',
      messages:    [{ role: 'user', content: prompt }],
      maxTokens:   1024,
      temperature: 0.3,
    })

    const json = JSON.parse(result.content.trim()) as EmailAnalysis
    if (!json.priority || !json.summary) return null
    return json
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Contact auto-link
// ---------------------------------------------------------------------------

async function findContactByEmail(workspaceId: string, email: string): Promise<string | null> {
  const { data } = await supabase
    .from('sage_contacts')
    .select('id')
    .eq('workspace_id', workspaceId)
    .ilike('email', email)
    .limit(1)
    .single()

  return data?.id ?? null
}

// ---------------------------------------------------------------------------
// Main sync function
// ---------------------------------------------------------------------------

export async function syncEmailsForWorkspace(workspaceId: string): Promise<number> {
  // 1. Find a connected gmail or microsoft integration
  const { data: integrations } = await supabase
    .from('sage_integrations')
    .select('provider, config')
    .eq('workspace_id', workspaceId)
    .eq('status', 'connected')
    .in('provider', ['gmail', 'microsoft'])
    .limit(1)

  if (!integrations || integrations.length === 0) {
    throw new Error('No connected email integration found. Connect Gmail or Outlook in Sage → Integrations.')
  }

  const { provider, config } = integrations[0] as { provider: string; config: Record<string, string> }
  const creds = getImapCreds(provider, config)

  if (!creds) {
    throw new Error(`Missing credentials for ${provider} integration.`)
  }

  // 2. Connect via IMAP
  const client = new ImapFlow({
    host:   creds.host,
    port:   creds.port,
    secure: true,
    auth:   creds.auth,
    logger: false,  // suppress verbose imap logs
  })

  await client.connect()

  let synced = 0

  try {
    const lock = await client.getMailboxLock('INBOX')

    try {
      // Determine total message count so we can fetch the NEWEST 250
      const STATUS_LIMIT = 250
      const mailbox = client.mailbox
      const total   = (mailbox as { exists?: number } | null)?.exists ?? 0

      // Build sequence range for the last N messages: e.g. "751:*" for last 250 of 1000
      // If there are fewer messages than the limit, fetch all ("1:*")
      const start       = total > STATUS_LIMIT ? total - STATUS_LIMIT + 1 : 1
      const fetchRange  = `${start}:*`

      const messages = client.fetch(fetchRange, {
        uid:    true,
        source: true,
      }, { uid: false })

      const toProcess: { uid: number; raw: Buffer }[] = []

      for await (const msg of messages) {
        if (msg.source) {
          toProcess.push({ uid: msg.uid, raw: msg.source })
        }
      }

      // Process newest first (highest sequence number = most recent)
      for (const { raw } of toProcess.reverse()) {
        try {
          const parsed = await simpleParser(raw)

          const messageId   = parsed.messageId ?? `generated-${Date.now()}-${Math.random()}`
          const fromAddress = (parsed.from?.value?.[0]?.address ?? '').toLowerCase()
          const fromName    = parsed.from?.value?.[0]?.name ?? fromAddress
          const toAddress   = parsed.to && !Array.isArray(parsed.to)
            ? (parsed.to.value?.[0]?.address ?? creds.auth.user)
            : creds.auth.user
          const subject     = parsed.subject ?? '(no subject)'
          const bodyText    = parsed.text ?? ''
          const bodyHtml    = parsed.html ?? null
          const receivedAt  = parsed.date?.toISOString() ?? new Date().toISOString()
          const threadId    = parsed.references?.[0] ?? null

          // Check for existing email (deduplication)
          const { data: existing } = await supabase
            .from('sage_emails')
            .select('id')
            .eq('workspace_id', workspaceId)
            .eq('message_id', messageId)
            .single()

          if (existing) continue  // already synced

          // Auto-link contact
          const contactId = fromAddress ? await findContactByEmail(workspaceId, fromAddress) : null

          // Insert email row
          const { data: inserted } = await supabase
            .from('sage_emails')
            .insert({
              workspace_id: workspaceId,
              contact_id:   contactId,
              message_id:   messageId,
              thread_id:    threadId,
              from_address: fromAddress,
              from_name:    fromName,
              to_address:   toAddress,
              subject,
              body_text:    bodyText,
              body_html:    bodyHtml,
              received_at:  receivedAt,
              direction:    'inbound',
            })
            .select('id')
            .single()

          if (!inserted) continue

          synced++

          // AI analysis (non-blocking per email — best effort)
          try {
            const analysis = await analyzeEmail(
              `${fromName} <${fromAddress}>`,
              subject,
              bodyText,
            )

            if (analysis) {
              await supabase
                .from('sage_emails')
                .update({
                  ai_priority:     analysis.priority,
                  ai_summary:      analysis.summary,
                  ai_insights:     analysis.insights,
                  ai_reply_drafts: analysis.reply_drafts,
                  ai_analyzed_at:  new Date().toISOString(),
                })
                .eq('id', inserted.id)
            }
          } catch {
            // AI analysis failure doesn't block email sync
          }

        } catch {
          // Skip malformed messages
        }
      }
    } finally {
      lock.release()
    }
  } finally {
    await client.logout()
  }

  return synced
}
