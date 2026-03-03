/**
 * Sage Email Sync — IMAP-based email fetching + AI analysis
 *
 * Uses App Password credentials already stored in sage_integrations to
 * connect via IMAP and pull recent emails into the sage_emails table.
 * Each new email is analysed by Claude (priority, summary, entities, reason, action, reply drafts).
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
  priority:    'high' | 'medium' | 'low'
  category:    'Sales' | 'Support' | 'Other'
  summary:     string | null
  reason:      string
  user_prompt: string
  action:      'create_lead' | 'update_lead' | 'reopen' | 'create_ticket' | 'reply_draft' | 'ignore'
  extracted:   {
    name?:             string
    company?:          string
    email?:            string
    phone?:            string
    website?:          string
    product_interest?: string
    intent_signals:    string[]
    urgency_signals:   string[]
  }
  insights:     string[]
  reply_drafts: { tone: string; body: string }[]
}

async function analyzeEmail(
  from: string,
  subject: string,
  bodyText: string,
): Promise<EmailAnalysis | null> {
  const prompt = `You are an Email Triage & Pipeline Assistant inside Appalix CRM. Analyse this email and return ONLY valid JSON (no markdown fences, no explanation).

Your job:
1) Read the email and classify priority using the rules below.
2) For High/Medium only: produce a short summary and extract lead details.
3) Recommend the next action and produce a short user_prompt.

PRIORITY RULES:
- High: relevant to products/services AND shows urgency OR buying intent (pricing/quote/demo/timeline/budget/ASAP/sign up/get started/how much/cost/purchase/book a call/free trial/proposal)
- Medium: relevant inquiry but low urgency or early exploration; missing details acceptable. Also: follow-up, partnership from real business, exploring options.
- Low: not related to products/services; personal emails; newsletters/spam/automated notifications; someone pitching their own products/services (cold outreach: "SEO services", "we can get you leads", "partnership offer").

CATEGORY RULES:
- Sales: pricing, demo, quote, trial, proposal, buying intent, follow-up on a sale
- Support: bug, not working, error, access issue, billing problem, crash, outage, broken, can't login, support request
- Other: everything else

ACTION RULES:
- "create_ticket" if category is Support
- "create_lead" if High or Medium and category is Sales
- "update_lead" if contact already exists in CRM
- "reply_draft" if Medium and a simple reply would resolve it (category Other)
- "ignore" if Low

EXTRACTION — from email body and signature:
- name: sender's full name
- company: company name (from domain, signature, or body)
- email: sender email address
- phone: any phone number
- website: website URL from signature
- product_interest: what product/service/feature they ask about
- intent_signals: array of phrases showing buying intent (e.g. ["wants pricing", "asking for demo"])
- urgency_signals: array of urgency phrases (e.g. ["ASAP", "by Friday", "urgent"])

USER PROMPT — a single short sentence asking the user what to do next. Examples:
- "Looks like a pricing inquiry — want to create a lead and send a quote?"
- "Support issue reported — create a ticket?"
- "Early-stage enquiry — draft a reply to learn more?"
- "Vendor pitch — safe to ignore."

SUMMARY — 1–2 lines for High/Medium only. Null for Low.
REPLY DRAFTS — 3 tones for High/Medium only (max 6 lines each, ask max 3 questions). Empty array for Low.

Return this exact JSON:
{
  "priority": "high" | "medium" | "low",
  "category": "Sales" | "Support" | "Other",
  "summary": "string or null",
  "reason": "one sentence why this priority",
  "user_prompt": "short question to the user",
  "action": "create_lead" | "update_lead" | "reopen" | "create_ticket" | "reply_draft" | "ignore",
  "extracted": {
    "name": "string or omit",
    "company": "string or omit",
    "email": "string or omit",
    "phone": "string or omit",
    "website": "string or omit",
    "product_interest": "string or omit",
    "intent_signals": ["phrase1", "phrase2"],
    "urgency_signals": ["phrase1"]
  },
  "insights": ["key insight 1", "key insight 2"],
  "reply_drafts": [
    {"tone":"Professional","body":"complete reply"},
    {"tone":"Friendly","body":"complete reply"},
    {"tone":"Concise","body":"complete reply"}
  ]
}

From: ${from}
Subject: ${subject}
Body (first 3000 chars):
${bodyText.slice(0, 3000)}`

  try {
    const result = await callClaude({
      model:        'claude-haiku-4-5-20251001',  // fast + cheap for bulk analysis
      systemPrompt: 'You are a precise JSON generator. Output only the JSON object requested.',
      messages:     [{ role: 'user', content: prompt }],
      maxTokens:    1024,
      temperature:  0.2,
    })

    const json = JSON.parse(result.content.trim()) as EmailAnalysis
    if (!json.priority || !json.action) return null
    // Normalise: support both old `entities` key and new `extracted` key
    const raw = json as unknown as Record<string, unknown>
    if (!json.extracted && raw['entities']) {
      json.extracted = raw['entities'] as EmailAnalysis['extracted']
    }
    if (!json.extracted) json.extracted = { intent_signals: [], urgency_signals: [] }
    if (!json.extracted.intent_signals)  json.extracted.intent_signals  = []
    if (!json.extracted.urgency_signals) json.extracted.urgency_signals = []
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

export async function syncEmailsForWorkspace(workspaceId: string, limit = 250): Promise<number> {
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
      // Determine total message count so we can fetch the NEWEST `limit` messages
      const mailbox = client.mailbox
      const total   = (mailbox as { exists?: number } | null)?.exists ?? 0

      // Build sequence range for the last N messages: e.g. "751:*" for last 250 of 1000
      // If there are fewer messages than the limit, fetch all ("1:*")
      const start       = total > limit ? total - limit + 1 : 1
      const fetchRange  = `${start}:*`

      // Fetch messages WITH flags so we can skip Junk/Spam/Deleted/Draft
      const messages = client.fetch(fetchRange, {
        uid:    true,
        source: true,
        flags:  true,
      }, { uid: false })

      // IMAP system flags that indicate a message should be excluded from triage
      const SKIP_FLAGS = new Set(['\\Junk', '\\Spam', '\\Deleted', '\\Draft'])

      const toProcess: { uid: number; raw: Buffer }[] = []

      for await (const msg of messages) {
        if (!msg.source) continue
        // Skip messages in Junk/Spam/Trash/Draft state even if in INBOX folder
        const flags = msg.flags ?? new Set<string>()
        if ([...flags].some(f => SKIP_FLAGS.has(f))) continue
        toProcess.push({ uid: msg.uid, raw: msg.source })
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
              const extracted = analysis.extracted ?? {}
              // Merge intent/urgency signals into entities for dashboard display
              const entities = { ...extracted }
              await supabase
                .from('sage_emails')
                .update({
                  ai_priority:     analysis.priority,
                  ai_category:     analysis.category ?? null,
                  ai_summary:      analysis.summary ?? null,
                  ai_reason:       analysis.reason,
                  ai_user_prompt:  analysis.user_prompt ?? null,
                  ai_action:       analysis.action,
                  ai_entities:     Object.keys(entities).length > 0 ? entities : null,
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

// ---------------------------------------------------------------------------
// Retroactive re-analysis for emails with null ai_priority
// ---------------------------------------------------------------------------

export async function reanalyzePendingEmails(workspaceId: string, batchSize = 50, emailIds?: string[]): Promise<number> {
  let query = supabase
    .from('sage_emails')
    .select('id, from_name, from_address, subject, body_text')
    .eq('workspace_id', workspaceId)
    .eq('direction', 'inbound')

  if (emailIds && emailIds.length > 0) {
    // Re-analyse specific emails (regardless of whether they've been analysed before)
    query = query.in('id', emailIds)
  } else {
    // Only analyse emails that haven't been processed yet
    query = query.is('ai_analyzed_at', null).order('received_at', { ascending: false }).limit(batchSize)
  }

  const { data: emails } = await query

  if (!emails || emails.length === 0) return 0

  let reanalyzed = 0

  for (const email of emails as { id: string; from_name: string | null; from_address: string; subject: string; body_text: string | null }[]) {
    try {
      const fromName    = email.from_name ?? email.from_address
      const fromAddress = email.from_address
      const bodyText    = email.body_text ?? ''

      const analysis = await analyzeEmail(
        `${fromName} <${fromAddress}>`,
        email.subject,
        bodyText,
      )

      if (analysis) {
        await supabase
          .from('sage_emails')
          .update({
            ai_priority:     analysis.priority,
            ai_category:     analysis.category ?? null,
            ai_summary:      analysis.summary ?? null,
            ai_reason:       analysis.reason,
            ai_user_prompt:  analysis.user_prompt ?? null,
            ai_action:       analysis.action,
            ai_entities:     Object.keys(analysis.extracted ?? {}).length > 0 ? analysis.extracted : null,
            ai_insights:     analysis.insights,
            ai_reply_drafts: analysis.reply_drafts,
            ai_analyzed_at:  new Date().toISOString(),
          })
          .eq('id', email.id)

        reanalyzed++
      }
    } catch {
      // Skip individual failures
    }
  }

  return reanalyzed
}
