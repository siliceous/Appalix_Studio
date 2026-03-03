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
  const prompt = `You are an Email Triage & Pipeline Assistant inside Appalix CRM.
Analyse the email below and return ONLY a single valid JSON object (no markdown, no explanation, no code fences).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRIORITY RULES — assign exactly one:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

HIGH — assign when BOTH are true:
  a) Relevant to the recipient's products or services
  b) Shows ANY of:
     • Buying intent keywords: "pricing", "quote", "demo", "book", "trial", "proposal", "timeline", "budget", "how much", "cost", "purchase", "sign up", "get started", "free trial", "interested in buying"
     • Urgency signals: "ASAP", "urgent", "this week", "by Friday", "need help now", "as soon as possible", "immediately", "today", "deadline"
     • Specific, detailed questions about features or capabilities (shows they are evaluating seriously)

MEDIUM — assign when:
  • Topic is relevant to products/services BUT lacks clear buying intent or urgency
  • Exploring options, just researching, "maybe later", early-stage curiosity
  • Follow-up to a previous conversation (warm, but no clear next step)
  • Missing key contact details but subject matter is relevant
  • Real business reaching out (partnership from a legitimate business, not a sales pitch)

LOW — assign when ANY of the following is true:
  • Not related to the recipient's products or services
  • Personal email, internal team message, social notification, receipt, invoice, account alert
  • Newsletter, subscription email, automated notification, marketing blast (contains "unsubscribe")
  • Vendor pitch / cold outreach: someone SELLING to you ("SEO services", "we can get you clients", "lead generation", "web design offer", "partnership proposal" from an unknown party pitching their own service)
  • Spam, recruitment outreach, mass email

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CATEGORY RULES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sales   — pricing, demo, quote, trial, proposal, buying intent, follow-up on a sale, evaluating product
Support — bug, not working, error, access issue, billing problem, crash, outage, broken, can't login, forgotten password, refund
Other   — everything else (partnerships, general enquiries, media, events)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACTION RULES — assign exactly one:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"create_ticket"  — if category is Support (regardless of priority)
"create_lead"    — if priority is High or Medium AND category is Sales
"reply_draft"    — if priority is Medium AND category is Other (a reply would gather more info)
"ignore"         — if priority is Low

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EDGE CASES — apply before general rules:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Newsletters / unsubscribe emails → always Low, summary=null, reply_drafts=[]
• Vendor / cold pitch (someone selling to you) → always Low, action="ignore"
• Forwarded email → analyse the ORIGINAL sender's content, not the forwarder
• Thread reply (contains "Re:" or quoted text) → summarise only the NEW inbound message; reference prior context briefly
• Multiple recipients → only treat as lead if the sender is clearly external and relevant
• If you cannot determine relevance → default to Medium with action="reply_draft"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXTRACTION — pull from body + signature:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
name             — sender's full name (not email alias)
company          — company name (from domain if business, or signature, or body text)
email            — sender's email address
phone            — any phone number found
website          — website URL from signature
product_interest — specific product/service/feature they enquire about
intent_signals   — array of short phrases showing buying intent (e.g. ["asking for pricing", "wants a demo"])
urgency_signals  — array of urgency phrases (e.g. ["ASAP", "by end of week"])

For LOW priority: omit name/company/phone/website/product_interest, keep intent_signals and urgency_signals as []

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
USER PROMPT — one short conversational sentence:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Examples:
• "Hot lead — wants pricing for the Enterprise plan. Create a lead?"
• "Support issue: login not working. Create a ticket?"
• "Early-stage enquiry — reply to learn more about their needs?"
• "Vendor pitch — safe to ignore."
• "Newsletter — no action needed."

SUMMARY — 1–2 sentences for High/Medium only, describing what they want + key context. null for Low.
INSIGHTS — 2–3 bullet points for High/Medium: key observations (budget hints, timeline, decision-maker status). [] for Low.
REPLY DRAFTS — for High/Medium only: 3 reply options max 6 lines each, ask max 3 clarifying questions. [] for Low.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT — return ONLY this JSON, nothing else:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "priority": "high" | "medium" | "low",
  "category": "Sales" | "Support" | "Other",
  "summary": "string or null",
  "reason": "one sentence why this priority was assigned",
  "user_prompt": "short sentence for the user",
  "action": "create_lead" | "create_ticket" | "reply_draft" | "ignore",
  "extracted": {
    "name": "string",
    "company": "string",
    "email": "string",
    "phone": "string",
    "website": "string",
    "product_interest": "string",
    "intent_signals": ["phrase1"],
    "urgency_signals": ["phrase1"]
  },
  "insights": ["insight 1", "insight 2"],
  "reply_drafts": [
    {"tone": "Professional", "body": "full reply text"},
    {"tone": "Friendly",     "body": "full reply text"},
    {"tone": "Concise",      "body": "full reply text"}
  ]
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EMAIL TO ANALYSE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
