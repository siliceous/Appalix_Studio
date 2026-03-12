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
import { ImapFlow }                                    from 'imapflow'
import { simpleParser }                                from 'mailparser'
import { supabase }                                    from '../lib/supabase.js'
import { callClaude }                                  from './ai/claude.js'
import { getWorkspaceAutoSettings, isFullAutomation }  from '../lib/auto-settings.js'
import { executeAutoAction }                           from './sage-auto-execute.js'
import { getValidAccessToken }                         from './oauth-token-refresh.js'

// ---------------------------------------------------------------------------
// .ics / iCalendar parser — no external dependency needed
// ---------------------------------------------------------------------------

interface ParsedMeeting {
  icsUid:        string | null
  title:         string | null
  startAt:       string | null  // ISO 8601
  endAt:         string | null  // ISO 8601
  location:      string | null
  description:   string | null
  organizer:     string | null  // email address
  organizerName: string | null
  attendees:     string[]
}

function unfoldIcs(raw: string): string {
  // RFC 5545: lines longer than 75 octets are folded with CRLF + space/tab
  return raw.replace(/\r?\n[ \t]/g, '')
}

function parseDtIcs(val: string | null): string | null {
  if (!val) return null
  // All-day: 20240301
  if (/^\d{8}$/.test(val))
    return `${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6, 8)}T00:00:00.000Z`
  // UTC: 20240301T100000Z
  if (/^\d{8}T\d{6}Z$/.test(val))
    return `${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6, 8)}T${val.slice(9, 11)}:${val.slice(11, 13)}:${val.slice(13, 15)}.000Z`
  // Local (no tz): treat as UTC for simplicity
  if (/^\d{8}T\d{6}$/.test(val))
    return `${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6, 8)}T${val.slice(9, 11)}:${val.slice(11, 13)}:${val.slice(13, 15)}.000Z`
  return null
}

function parseIcs(raw: string): ParsedMeeting | null {
  const unfolded = unfoldIcs(raw)
  const eventMatch = unfolded.match(/BEGIN:VEVENT([\s\S]*?)END:VEVENT/i)
  if (!eventMatch) return null
  const ev = eventMatch[1]

  const getField = (key: string): string | null => {
    // KEY or KEY;params: value
    const m = ev.match(new RegExp(`^${key}(?:;[^:]*)?:([^\r\n]*)`, 'im'))
    return m ? m[1].trim() : null
  }

  // Organizer: ORGANIZER;CN="John Smith":mailto:john@example.com
  const orgLine = ev.match(/^ORGANIZER(?:;CN=([^;:\r\n]*))?[^:]*:(?:mailto:)?([^\r\n]+)/im)
  const organizer     = orgLine ? orgLine[2]?.trim() ?? null : null
  const organizerName = orgLine ? orgLine[1]?.replace(/^["']|["']$/g, '').trim() || null : null

  // Attendees: ATTENDEE;...;CN=Jane Doe:mailto:jane@example.com
  const attendees: string[] = []
  const attRe = /^ATTENDEE[^:]*:(?:mailto:)?([^\r\n]+)/gim
  let m: RegExpExecArray | null
  while ((m = attRe.exec(ev)) !== null) {
    const addr = m[1].trim()
    if (addr) attendees.push(addr)
  }

  const rawDesc = getField('DESCRIPTION')
  const description = rawDesc
    ? rawDesc.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';')
    : null

  return {
    icsUid:        getField('UID'),
    title:         getField('SUMMARY'),
    startAt:       parseDtIcs(getField('DTSTART')),
    endAt:         parseDtIcs(getField('DTEND')),
    location:      getField('LOCATION'),
    description,
    organizer,
    organizerName,
    attendees,
  }
}

// ---------------------------------------------------------------------------
// Calendar notification detection — Layer 1 filter
// ---------------------------------------------------------------------------

// Subject prefixes used by Google Calendar and Outlook when a recipient
// accepts/declines/etc. a meeting invite
const CALENDAR_RESPONSE_RE = /^(Accepted|Declined|Tentative|Cancelled|Updated Invitation|Invitation|Re:.*\bmeeting\b)[\s:]/i

// Known sending addresses for calendar notification emails
const CALENDAR_NOTIFICATION_SENDERS = new Set([
  'calendar-notification@google.com',
  'calendar-notification@googlemail.com',
  'noreply@calendar.google.com',
  'calendar@google.com',
  'invitations@microsoft.com',
  'no-reply@microsoft.com',
])

/**
 * Returns true when an email is a calendar system notification (acceptance,
 * decline, cancellation, etc.) that should never appear in the AI triage queue.
 */
function isCalendarNotification(
  subject:     string,
  fromAddress: string,
  hasIcsPart:  boolean,
): boolean {
  const lcFrom = fromAddress.toLowerCase()
  // Definitive: known calendar notification sender
  if (CALENDAR_NOTIFICATION_SENDERS.has(lcFrom)) return true
  // Strong signal: subject matches calendar response pattern
  if (CALENDAR_RESPONSE_RE.test(subject)) return true
  // Heuristic: has ICS attachment AND subject looks like a calendar reply
  if (hasIcsPart && /\b(accepted|declined|tentative|cancelled)\b/i.test(subject)) return true
  return false
}

// ---------------------------------------------------------------------------
// Provider config
// ---------------------------------------------------------------------------

interface ImapCreds {
  host: string
  port: number
  auth: { user: string; pass?: string; accessToken?: string }
}

function getImapCreds(provider: string, config: Record<string, string>, accessToken?: string): ImapCreds | null {
  const email = config.from_email
  if (!email) return null

  // OAuth2 path
  if (accessToken) {
    if (provider === 'gmail')     return { host: 'imap.gmail.com',        port: 993, auth: { user: email, accessToken } }
    if (provider === 'microsoft') return { host: 'outlook.office365.com', port: 993, auth: { user: email, accessToken } }
    return null
  }

  // App-password fallback
  const password = config.app_password ?? config.password
  if (!password) return null

  if (provider === 'gmail')     return { host: 'imap.gmail.com',        port: 993, auth: { user: email, pass: password } }
  if (provider === 'microsoft') return { host: 'outlook.office365.com', port: 993, auth: { user: email, pass: password } }
  return null
}

// ---------------------------------------------------------------------------
// AI analysis
// ---------------------------------------------------------------------------

interface EmailAnalysis {
  priority:    'high' | 'medium' | 'low'
  category:    'Sales' | 'Support' | 'Invoice' | 'Receipt' | 'Financial' | 'Social' | 'Promotion' | 'Legal' | 'Security' | 'Meeting' | 'Partnership' | 'Shipping' | 'Subscription' | 'Other'
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
  priorSummaries: string[] = [],
  crmContext?: { contactName?: string; dealTitle?: string; dealStage?: string },
  businessDescription?: string | null,
): Promise<EmailAnalysis | null> {
  const threadContext = priorSummaries.length > 0
    ? `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nPREVIOUS EMAILS IN THIS THREAD (actual content, newest first):\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${priorSummaries.map((s, i) => `[Prior email ${i + 1}]\n${s}`).join('\n\n')}\n\n⚠️ CRITICAL INSTRUCTION: You are analysing the LATEST email below in the context of this full thread. Your summary MUST include all relevant details mentioned across ALL prior emails — including specific numbers (e.g. SKU counts, quantities), timelines, budgets, company details, or intent signals — even if those details are NOT repeated in the latest email. Do NOT write "No timeline mentioned" if a timeline was stated in a prior email.\n`
    : ''

  const businessSection = businessDescription?.trim()
    ? `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nYOUR BUSINESS — use this to judge relevance:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${businessDescription.trim()}\n\n⚠️ IMPORTANT: Any email from a prospect or customer asking about the products/services described above is relevant. Do NOT mark it LOW just because it lacks buying-intent keywords — classify as MEDIUM at minimum.\n`
    : ''

  const crmSection = crmContext?.dealTitle
    ? `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nCRM CONTEXT — this sender is already in the pipeline:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nContact: ${crmContext.contactName ?? from}\nOpen deal: "${crmContext.dealTitle}"${crmContext.dealStage ? ` (stage: ${crmContext.dealStage})` : ''}\n\n⚠️ IMPORTANT: A deal already exists for this contact. ALWAYS assign priority "high" — any email from an active pipeline contact is high priority regardless of email content. Do NOT suggest creating a lead. Your user_prompt should reference the existing deal and suggest the next step (e.g. update the deal, follow up, move to next stage). Action should be "reply_draft" not "create_lead".\n`
    : ''

  const prompt = `You are an Email Triage & Pipeline Assistant inside Appalix CRM.
Analyse the email below and return ONLY a single valid JSON object (no markdown, no explanation, no code fences).
${businessSection}${threadContext}${crmSection}

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
  • Personal email, internal team message, social notification, receipt, invoice, account alert
  • Newsletter, subscription email, automated notification, marketing blast (contains "unsubscribe")
  • Vendor pitch / cold outreach: someone SELLING THEIR OWN services TO you — e.g. "we offer SEO", "we can get you clients", "we build websites for you", "our agency does X". NOTE: if the email is from a CUSTOMER or PROSPECT asking about YOUR products/services, that is NOT a vendor pitch — classify as High or Medium instead.
  • Spam, recruitment outreach, mass email

IMPORTANT: When in doubt about whether an email is relevant to your business, default to MEDIUM rather than LOW. Only use LOW when you are confident the email is clearly irrelevant, automated, or a vendor pitch.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CATEGORY RULES — assign exactly one:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sales         — pricing, demo, quote, trial, proposal, buying intent, follow-up on a sale, evaluating your product/service
Support       — bug, not working, error, access issue, billing problem, crash, outage, broken, can't login, forgotten password, refund request
Invoice       — invoice for payment (e.g. "Invoice #1234 due", "please find your invoice attached", "amount due")
Receipt       — payment confirmation, purchase receipt, order confirmation (e.g. "your receipt", "order confirmed", "payment received")
Financial     — bank statement, account summary, transaction alert, balance notification, wire transfer, payroll from a bank or financial institution
Social        — LinkedIn, Facebook, Twitter/X, Instagram, GitHub, Slack or other social/community platform notification
Promotion     — marketing email, sale, discount code, newsletter, promotional offer (typically contains "unsubscribe")
Legal         — contract, NDA, terms of service, legal notice, compliance requirement, cease and desist, agreement requiring signature or review
Security      — 2FA code, password reset, login alert, suspicious activity warning, account breach notification, security verification
Meeting       — meeting request, calendar invite, scheduling link (Calendly, Google Calendar), "can we jump on a call?", availability request
Partnership   — collaboration proposal, joint venture, affiliate inquiry, co-marketing from a legitimate business (not a vendor pitch selling to you)
Shipping      — order tracking update, dispatch confirmation, delivery notification, courier status from a shipping provider
Subscription  — SaaS renewal reminder, plan change notice, trial expiry, subscription upgrade/downgrade/cancellation confirmation
Other         — general enquiries, media, events, internal, personal — anything that doesn't fit the categories above

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACTION RULES — assign exactly one:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"create_ticket"  — if category is Support (regardless of priority)
"create_lead"    — if priority is High or Medium AND category is Sales
"reply_draft"    — if category is Legal, Meeting, or Partnership (these need a human reply)
"reply_draft"    — if priority is Medium AND category is Other (a reply would gather more info)
"ignore"         — if category is Invoice, Receipt, Financial, Social, Promotion, Shipping, or Subscription (automated mail, no action needed)
"ignore"         — if category is Security (handle outside email; no reply needed)
"ignore"         — if priority is Low

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EDGE CASES — apply before general rules:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Calendar responses (subject starts with "Accepted:", "Declined:", "Tentative:", "Cancelled:", or is a Google/Outlook calendar notification) → always Low, action="ignore", summary=null, reply_drafts=[]
• Out-of-office / auto-reply (contains "I am out of office", "automatic reply", "auto-reply", "on vacation", "on leave") → always Low, action="ignore"
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
  "category": "Sales" | "Support" | "Invoice" | "Receipt" | "Financial" | "Social" | "Promotion" | "Legal" | "Security" | "Meeting" | "Partnership" | "Shipping" | "Subscription" | "Other",
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
      maxTokens:    4096,  // reply_drafts alone can be 1000+ tokens; 1024 causes truncation → parse failure
      temperature:  0.2,
    })

    // Extract the first {...} block — handles markdown fences, leading prose, trailing text
    const raw    = result.content.trim()
    const match  = raw.match(/\{[\s\S]*\}/)
    const cleaned = match ? match[0] : raw
    const json = JSON.parse(cleaned) as EmailAnalysis
    if (!json.priority || !json.action) return null
    // Normalise: support both old `entities` key and new `extracted` key
    const jsonRaw = json as unknown as Record<string, unknown>
    if (!json.extracted && jsonRaw['entities']) {
      json.extracted = jsonRaw['entities'] as EmailAnalysis['extracted']
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
// Contact / deal auto-link helpers
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

async function findOpenDealByContact(workspaceId: string, contactId: string): Promise<{ id: string } | null> {
  const { data } = await supabase
    .from('sage_deals')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('contact_id', contactId)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return data ?? null
}

// ---------------------------------------------------------------------------
// Auto-derive business description from the workspace's knowledge base
// ---------------------------------------------------------------------------

async function deriveBusinessDescription(workspaceId: string): Promise<string | null> {
  try {
    // Grab up to 12 chunks from the workspace knowledge base (varied sources)
    const { data: chunks } = await supabase
      .from('chunks')
      .select('content')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true })
      .limit(12)

    if (!chunks || chunks.length === 0) return null

    const combinedText = (chunks as { content: string }[])
      .map(c => c.content.slice(0, 400).replace(/\s+/g, ' ').trim())
      .join('\n\n---\n\n')

    const result = await callClaude({
      model:        'claude-haiku-4-5-20251001',
      systemPrompt: 'You are a business analyst. Output only the requested text, no preamble.',
      messages: [{
        role:    'user',
        content: `Based on the following excerpts from a company's knowledge base, write a concise 2–3 sentence description of:
1. What this business does
2. What products or services it sells
3. Who its target customers are

Be specific. Use plain language. Do NOT say "the company" — just describe what they offer.

Knowledge base excerpts:
${combinedText}`,
      }],
      maxTokens:   300,
      temperature: 0.1,
    })

    const description = result.content.trim()
    if (!description) return null

    // Cache it back on the workspace so we don't re-derive every sync
    await supabase
      .from('workspaces')
      .update({ sage_business_description: description })
      .eq('id', workspaceId)

    console.log(`[email-sync] derived business description for workspace=${workspaceId}`)
    return description
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Merge new KB content into existing business description after upload
// ---------------------------------------------------------------------------

/**
 * Called automatically after a new knowledge base source is ingested.
 * Reads the newly-added chunks, compares against the current business
 * description, and asks Claude to add any NEW products/services/offerings
 * not already mentioned. If nothing new is found, the description is left
 * unchanged so manual edits are never overwritten.
 */
export async function refreshBusinessDescriptionFromKB(
  workspaceId: string,
  sourceId:    string,
): Promise<void> {
  try {
    // Fetch current description
    const { data: ws } = await supabase
      .from('workspaces')
      .select('sage_business_description')
      .eq('id', workspaceId)
      .single()

    const current = (ws as { sage_business_description?: string | null } | null)
      ?.sage_business_description?.trim() ?? null

    // Grab chunks from the newly-ingested source (up to 12)
    const { data: newChunks } = await supabase
      .from('chunks')
      .select('content')
      .eq('workspace_id', workspaceId)
      .eq('source_id', sourceId)
      .order('chunk_index', { ascending: true })
      .limit(12)

    if (!newChunks || newChunks.length === 0) return

    const newContent = (newChunks as { content: string }[])
      .map(c => c.content.slice(0, 400).replace(/\s+/g, ' ').trim())
      .join('\n\n---\n\n')

    // If there is no existing description, do a full derive instead
    if (!current) {
      await deriveBusinessDescription(workspaceId)
      return
    }

    const result = await callClaude({
      model:        'claude-haiku-4-5-20251001',
      systemPrompt: 'You are a business analyst. Output only the requested text, no preamble.',
      messages: [{
        role:    'user',
        content: `You are updating a business profile description.

CURRENT DESCRIPTION:
${current}

NEW KNOWLEDGE BASE CONTENT:
${newContent}

Task: Identify any NEW products, services, or customer segments described in the new content that are NOT already covered by the current description.
- If there are new items: return the FULL updated description with them naturally incorporated (2–4 sentences max).
- If there is nothing new: reply with exactly the word UNCHANGED and nothing else.`,
      }],
      maxTokens:   400,
      temperature: 0.1,
    })

    const reply = result.content.trim()
    if (!reply || reply.toUpperCase() === 'UNCHANGED') {
      console.log(`[email-sync] KB refresh for workspace=${workspaceId}: no new offerings found`)
      return
    }

    await supabase
      .from('workspaces')
      .update({ sage_business_description: reply })
      .eq('id', workspaceId)

    console.log(`[email-sync] KB refresh updated business description for workspace=${workspaceId}`)
  } catch (err) {
    console.error(`[email-sync] KB refresh error for workspace=${workspaceId}:`, (err as Error).message)
  }
}

// ---------------------------------------------------------------------------
// CRM contact targeted IMAP search helper
// ---------------------------------------------------------------------------

/**
 * Searches the currently selected mailbox for emails FROM each CRM contact
 * with an open deal. Inserts any that aren't already in the DB.
 * Called for both INBOX and [Gmail]/All Mail so archived emails aren't missed.
 */
async function searchAndSyncContactEmails(
  client:       ImapFlow,
  workspaceId:  string,
  contactPairs: { email: string; contactId: string }[],
  since:        Date,
  userEmail:    string,
): Promise<number> {
  let count = 0

  for (const { email: contactEmail, contactId } of contactPairs) {
    try {
      const foundUids = ((await client.search(
        { from: contactEmail, since },
        { uid: true },
      )) ?? []) as number[]

      if (foundUids.length === 0) continue

      const top50       = [...foundUids].sort((a, b) => b - a).slice(0, 50)
      const contactMsgs = client.fetch(top50.join(','), { uid: true, source: true }, { uid: true })

      const contactRaws: Buffer[] = []
      for await (const msg of contactMsgs) {
        if (msg.source) contactRaws.push(msg.source)
      }

      for (const contactRaw of contactRaws) {
        try {
          const parsed = await simpleParser(contactRaw)
          const msgId  = parsed.messageId ?? `generated-crm-${Date.now()}-${Math.random()}`

          const { data: alreadyExists } = await supabase
            .from('sage_emails')
            .select('id')
            .eq('workspace_id', workspaceId)
            .eq('message_id', msgId)
            .single()

          if (alreadyExists) continue

          const fromAddress = (parsed.from?.value?.[0]?.address ?? '').toLowerCase()
          const fromName    = parsed.from?.value?.[0]?.name ?? fromAddress
          const toAddress   = parsed.to && !Array.isArray(parsed.to)
            ? (parsed.to.value?.[0]?.address ?? userEmail)
            : userEmail

          const { data: ins } = await supabase
            .from('sage_emails')
            .insert({
              workspace_id: workspaceId,
              contact_id:   contactId,
              message_id:   msgId,
              thread_id:    parsed.references?.[0] ?? null,
              from_address: fromAddress,
              from_name:    fromName,
              to_address:   toAddress,
              subject:      parsed.subject ?? '(no subject)',
              body_text:    parsed.text ?? '',
              body_html:    parsed.html ?? null,
              received_at:  parsed.date?.toISOString() ?? new Date().toISOString(),
              direction:    'inbound',
              is_read:      false,
              // ai_analyzed_at intentionally null → 1-min poller picks it up
            })
            .select('id')
            .single()

          if (ins) {
            count++
            console.log(`[email-sync] CRM targeted: synced "${parsed.subject ?? ''}" from ${contactEmail}`)
          }
        } catch { /* skip malformed message */ }
      }
    } catch (err) {
      console.error(`[email-sync] CRM search failed for ${contactEmail}:`, (err as Error).message)
    }
  }

  return count
}

// ---------------------------------------------------------------------------
// Main sync function
// ---------------------------------------------------------------------------

export async function syncEmailsForWorkspace(workspaceId: string, userId: string, limit = 250): Promise<number> {
  // 0. Fetch workspace business description for AI context.
  //    If not set, auto-derive it from the knowledge base and cache it.
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('sage_business_description')
    .eq('id', workspaceId)
    .single()
  const stored = (workspace as { sage_business_description?: string | null } | null)?.sage_business_description ?? null
  const businessDescription = stored ?? await deriveBusinessDescription(workspaceId)

  // 1. Find a connected gmail or microsoft integration for this user
  const { data: integrations } = await supabase
    .from('sage_integrations')
    .select('provider, config')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('status', 'connected')
    .in('provider', ['gmail', 'microsoft'])
    .limit(1)

  if (!integrations || integrations.length === 0) {
    throw new Error('No connected email integration found. Connect Gmail or Outlook in Sage → Integrations.')
  }

  const { provider, config } = integrations[0] as { provider: string; config: Record<string, string> }

  // Resolve access token — refresh if OAuth2 and expired
  let accessToken: string | undefined
  if (config.auth_method === 'oauth2') {
    const token = await getValidAccessToken(workspaceId, userId, provider as 'gmail' | 'microsoft', config)
    if (!token) throw new Error(`OAuth2 token unavailable for ${provider} integration.`)
    accessToken = token
  }

  const creds = getImapCreds(provider, config, accessToken)

  if (!creds) {
    throw new Error(`Missing credentials for ${provider} integration.`)
  }

  // 2. Connect via IMAP
  console.log(`[email-sync] Connecting to ${creds.host}:${creds.port} as ${creds.auth.user} auth_method=${config.auth_method}`)
  const client = new ImapFlow({
    host:   creds.host,
    port:   creds.port,
    secure: true,
    auth:   creds.auth,
    logger: { debug: () => {}, info: (obj: unknown) => console.log('[imap]', obj), warn: (obj: unknown) => console.warn('[imap]', obj), error: (obj: unknown) => console.error('[imap]', obj) },
  })

  // Prevent unhandled 'error' events (e.g. socket timeout) from crashing the process
  client.on('error', (err: Error) => {
    console.error('[email-sync] IMAP client error:', err.message)
  })

  await client.connect()

  let synced = 0

  // Pre-fetch CRM contacts with open deals so we can search for their emails
  // in BOTH the INBOX and [Gmail]/All Mail (for archived emails).
  type DealRow = { contact_id: string; sage_contacts: { email: string | null }[] }
  const { data: openDeals } = await supabase
    .from('sage_deals')
    .select('contact_id, sage_contacts!inner(email)')
    .eq('workspace_id', workspaceId)
    .eq('status', 'open')

  const contactPairs = [...new Map(
    ((openDeals ?? []) as unknown as DealRow[])
      .filter(d => d.sage_contacts?.[0]?.email)
      .map(d => [d.contact_id, {
        email:     d.sage_contacts[0].email!.toLowerCase(),
        contactId: d.contact_id,
      }]),
  ).values()]

  const since180 = new Date()
  since180.setDate(since180.getDate() - 180)  // look back 6 months

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

          // Layer 1: calendar notification filter — detect ICS before dedup check
          const attachments0   = parsed.attachments ?? []
          const hasIcsPart     = attachments0.some(
            a => a.contentType === 'text/calendar' ||
                 a.contentType === 'application/ics' ||
                 (a.filename ?? '').toLowerCase().endsWith('.ics'),
          )
          const calendarEmail  = isCalendarNotification(subject, fromAddress, hasIcsPart)

          // Check for existing email (per-user deduplication)
          const { data: existing } = await supabase
            .from('sage_emails')
            .select('id')
            .eq('workspace_id', workspaceId)
            .eq('user_id', userId)
            .eq('message_id', messageId)
            .single()

          if (existing) continue  // already synced

          // Auto-link contact
          const contactId = fromAddress ? await findContactByEmail(workspaceId, fromAddress) : null

          // Insert email row — calendar notifications inserted as is_read=true so
          // they are stored for reference but never appear in the triage queue
          const { data: inserted } = await supabase
            .from('sage_emails')
            .insert({
              workspace_id: workspaceId,
              user_id:      userId,
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
              is_read:      calendarEmail,   // skip triage for calendar notifications
            })
            .select('id')
            .single()

          if (!inserted) continue

          synced++

          // Skip AI analysis for calendar notifications — they're already read-flagged
          if (calendarEmail) continue

          // Parse .ics calendar attachment (if present) → store as meeting
          try {
            const attachments = parsed.attachments ?? []
            const icsAtt = attachments.find(
              a => a.contentType === 'text/calendar' ||
                   a.contentType === 'application/ics' ||
                   (a.filename ?? '').toLowerCase().endsWith('.ics'),
            )
            if (icsAtt) {
              const icsText = icsAtt.content.toString('utf8')
              const meeting = parseIcs(icsText)
              if (meeting && (meeting.title || meeting.startAt)) {
                await supabase
                  .from('sage_meetings')
                  .upsert({
                    workspace_id:    workspaceId,
                    email_id:        inserted.id,
                    ics_uid:         meeting.icsUid,
                    title:           meeting.title ?? '(untitled)',
                    start_at:        meeting.startAt,
                    end_at:          meeting.endAt,
                    location:        meeting.location,
                    description:     meeting.description,
                    organizer:       meeting.organizer,
                    organizer_name:  meeting.organizerName,
                    attendees:       meeting.attendees,
                  }, { onConflict: 'workspace_id,ics_uid', ignoreDuplicates: true })
              }
            }
          } catch {
            // Calendar parsing failure doesn't block email sync
          }

          // AI analysis (non-blocking per email — best effort)
          try {
            // Fetch prior email body text for this contact/sender to give thread context
            // We use body_text (not ai_summary) so specific numbers/details are never lost
            const priorSummaries: string[] = []
            try {
              let priorQuery = supabase
                .from('sage_emails')
                .select('subject, body_text, received_at')
                .eq('workspace_id', workspaceId)
                .eq('direction', 'inbound')
                .neq('message_id', messageId)
                .order('received_at', { ascending: false })
                .limit(4)

              if (contactId) {
                priorQuery = priorQuery.eq('contact_id', contactId)
              } else {
                priorQuery = priorQuery.ilike('from_address', fromAddress)
              }

              const { data: priorEmails } = await priorQuery
              if (priorEmails) {
                for (const pe of priorEmails) {
                  if (pe.body_text) {
                    const snippet = pe.body_text.slice(0, 600).replace(/\s+/g, ' ').trim()
                    priorSummaries.push(`Subject: ${pe.subject}\n${snippet}`)
                  }
                }
              }
            } catch {
              // Prior context is best-effort; don't block analysis
            }

            // Look up open deal for this contact (CRM context for AI)
            let crmContext: { contactName?: string; dealTitle?: string; dealStage?: string } | undefined
            if (contactId) {
              try {
                const { data: openDeal } = await supabase
                  .from('sage_deals')
                  .select('title, stage:sage_pipeline_stages(name)')
                  .eq('workspace_id', workspaceId)
                  .eq('contact_id', contactId)
                  .eq('status', 'open')
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .single()
                if (openDeal) {
                  const stageName = Array.isArray(openDeal.stage)
                    ? (openDeal.stage[0] as { name: string } | undefined)?.name
                    : (openDeal.stage as { name: string } | null)?.name
                  crmContext = { contactName: fromName ?? undefined, dealTitle: openDeal.title, dealStage: stageName ?? undefined }
                }
              } catch { /* best-effort */ }
            }

            const analysis = await analyzeEmail(
              `${fromName} <${fromAddress}>`,
              subject,
              bodyText,
              priorSummaries,
              crmContext,
              businessDescription,
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

              // Sage Auto — fire auto-action if full automation is enabled for the email channel
              const mappedAction: 'create_lead' | 'create_ticket' | 'ignore' =
                analysis.action === 'create_lead'   ? 'create_lead'   :
                analysis.action === 'create_ticket' ? 'create_ticket' : 'ignore'
              if (mappedAction !== 'ignore') {
                try {
                  const autoSettings = await getWorkspaceAutoSettings(workspaceId)
                  if (isFullAutomation(autoSettings, 'email')) {
                    await executeAutoAction({
                      workspaceId,
                      channel:     'email',
                      action:      mappedAction,
                      sourceId:    inserted.id,
                      entities:          analysis.extracted ?? {},
                      senderName:        fromName ?? null,
                      senderEmail:       fromAddress ?? null,
                      summary:           analysis.summary ?? null,
                      priority:          analysis.priority ?? null,
                      defaultPipelineId: autoSettings.default_pipeline_id,
                    })
                  }
                } catch (autoErr) {
                  console.error('[email-sync] auto-execute error:', autoErr)
                }
              }

              // Auto-create deal activity when a high/medium email arrives for a contact with an open deal
              if (contactId && analysis.summary && (analysis.priority === 'high' || analysis.priority === 'medium')) {
                try {
                  const deal = await findOpenDealByContact(workspaceId, contactId)
                  if (deal) {
                    await supabase.from('sage_deal_activities').insert({
                      workspace_id: workspaceId,
                      deal_id:      deal.id,
                      type:         'note',
                      title:        `Email: ${subject}`,
                      body:         analysis.summary,
                      created_by:   null,
                    })
                  }
                } catch {
                  // Don't block email sync on deal activity failure
                }
              }
            }
          } catch {
            // AI analysis failure doesn't block email sync
          }

        } catch {
          // Skip malformed messages
        }
      }

      // ── Targeted sync for CRM contacts with open deals (INBOX pass) ─────────
      // Searches IMAP by FROM address so emails that predate the sequence-range
      // window (i.e. older than the last `limit` messages) are not missed.
      if (contactPairs.length > 0) {
        try {
          synced += await searchAndSyncContactEmails(client, workspaceId, contactPairs, since180, creds.auth.user)
        } catch (err) {
          console.error(`[email-sync] CRM INBOX targeted sync error for workspace=${workspaceId}:`, (err as Error).message)
        }
      }
      // ─────────────────────────────────────────────────────────────────────────

    } finally {
      lock.release()
    }

    // ── Targeted sync for CRM contacts — [Gmail]/All Mail pass ───────────────
    // Gmail archives emails out of INBOX into [Gmail]/All Mail.  Searching only
    // INBOX misses any email that was archived/labeled.  We open the All Mail
    // mailbox and run the same FROM-address search so nothing is lost.
    if (provider === 'gmail' && contactPairs.length > 0) {
      try {
        const allMailLock = await client.getMailboxLock('[Gmail]/All Mail')
        try {
          synced += await searchAndSyncContactEmails(client, workspaceId, contactPairs, since180, creds.auth.user)
        } finally {
          allMailLock.release()
        }
      } catch (err) {
        console.error(`[email-sync] [Gmail]/All Mail targeted sync error for workspace=${workspaceId}:`, (err as Error).message)
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

  } finally {
    await client.logout()
  }

  return synced
}

// ---------------------------------------------------------------------------
// Retroactive re-analysis for emails with null ai_priority
// ---------------------------------------------------------------------------

export async function reanalyzePendingEmails(workspaceId: string, batchSize = 50, emailIds?: string[]): Promise<number> {
  // Fetch business description so re-analysis uses the latest profile
  const { data: wsData } = await supabase
    .from('workspaces')
    .select('sage_business_description')
    .eq('id', workspaceId)
    .single()
  const businessDescription = (wsData as { sage_business_description?: string | null } | null)
    ?.sage_business_description ?? null

  let query = supabase
    .from('sage_emails')
    .select('id, from_name, from_address, subject, body_text, contact_id')
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

  for (const email of emails as { id: string; from_name: string | null; from_address: string; subject: string; body_text: string | null; contact_id?: string | null }[]) {
    try {
      const fromName    = email.from_name ?? email.from_address
      const fromAddress = email.from_address
      const bodyText    = email.body_text ?? ''

      // Fetch prior email body text for thread context
      // We use body_text (not ai_summary) so specific numbers/details are never lost
      const priorSummaries: string[] = []
      try {
        let priorQuery = supabase
          .from('sage_emails')
          .select('subject, body_text')
          .eq('workspace_id', workspaceId)
          .eq('direction', 'inbound')
          .neq('id', email.id)
          .order('received_at', { ascending: false })
          .limit(4)

        if (email.contact_id) {
          priorQuery = priorQuery.eq('contact_id', email.contact_id)
        } else {
          priorQuery = priorQuery.ilike('from_address', fromAddress)
        }

        const { data: priorEmails } = await priorQuery
        if (priorEmails) {
          for (const pe of priorEmails) {
            if (pe.body_text) {
              const snippet = pe.body_text.slice(0, 600).replace(/\s+/g, ' ').trim()
              priorSummaries.push(`Subject: ${pe.subject}\n${snippet}`)
            }
          }
        }
      } catch { /* best-effort */ }

      // Look up open deal for CRM context.
      // If contact_id is null (email synced before contact was created, or match missed),
      // fall back to finding the contact by from_address and updating the email row.
      let crmContext: { contactName?: string; dealTitle?: string; dealStage?: string } | undefined
      let resolvedContactId = email.contact_id ?? null
      try {
        if (!resolvedContactId) {
          resolvedContactId = await findContactByEmail(workspaceId, fromAddress)
          if (resolvedContactId) {
            // Patch the email row so future re-analyses don't need to re-resolve
            await supabase
              .from('sage_emails')
              .update({ contact_id: resolvedContactId })
              .eq('id', email.id)
          }
        }
        if (resolvedContactId) {
          const { data: openDeal } = await supabase
            .from('sage_deals')
            .select('title, stage:sage_pipeline_stages(name)')
            .eq('workspace_id', workspaceId)
            .eq('contact_id', resolvedContactId)
            .eq('status', 'open')
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
          if (openDeal) {
            const stageName = Array.isArray(openDeal.stage)
              ? (openDeal.stage[0] as { name: string } | undefined)?.name
              : (openDeal.stage as { name: string } | null)?.name
            crmContext = { contactName: fromName ?? undefined, dealTitle: openDeal.title, dealStage: stageName ?? undefined }
          }
        }
      } catch { /* best-effort */ }

      const analysis = await analyzeEmail(
        `${fromName} <${fromAddress}>`,
        email.subject,
        bodyText,
        priorSummaries,
        crmContext,
        businessDescription,
      )

      if (analysis) {
        const { error: updateErr } = await supabase
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

        if (!updateErr) {
          reanalyzed++
          // Sage Auto — fire auto-action if full automation is enabled for the email channel
          const reanalyzeMappedAction: 'create_lead' | 'create_ticket' | 'ignore' =
            analysis.action === 'create_lead'   ? 'create_lead'   :
            analysis.action === 'create_ticket' ? 'create_ticket' : 'ignore'
          if (reanalyzeMappedAction !== 'ignore') {
            try {
              const autoSettings = await getWorkspaceAutoSettings(workspaceId)
              if (isFullAutomation(autoSettings, 'email')) {
                await executeAutoAction({
                  workspaceId,
                  channel:     'email',
                  action:      reanalyzeMappedAction,
                  sourceId:    email.id,
                  entities:          analysis.extracted ?? {},
                  senderName:        fromName ?? null,
                  senderEmail:       fromAddress ?? null,
                  summary:           analysis.summary ?? null,
                  priority:          analysis.priority ?? null,
                  defaultPipelineId: autoSettings.default_pipeline_id,
                })
              }
            } catch (autoErr) {
              console.error('[reanalyze] auto-execute error:', autoErr)
            }
          }
        } else {
          console.error(`[reanalyze] DB update failed for ${email.id}:`, updateErr.message)
        }
      }
    } catch (err) {
      console.error(`[reanalyze] failed for ${email.id}:`, (err as Error).message)
    }
  }

  return reanalyzed
}

// ---------------------------------------------------------------------------
// Backfill auto-actions for already-analyzed emails
// ---------------------------------------------------------------------------
// Run this once after deploying Sage Auto wiring to process emails that were
// analyzed before auto-execute existed.  Safe to re-run — executeAutoAction
// has full dedup guards (won't create duplicate contacts or deals).

export async function backfillAutoActions(workspaceId: string, batchSize = 200): Promise<number> {
  const { data: emails } = await supabase
    .from('sage_emails')
    .select('id, from_name, from_address, ai_action, ai_entities, ai_summary, ai_priority')
    .eq('workspace_id', workspaceId)
    .eq('direction', 'inbound')
    .in('ai_action', ['create_lead', 'create_ticket'])
    .not('ai_analyzed_at', 'is', null)
    .limit(batchSize)

  if (!emails || emails.length === 0) return 0

  const settings = await getWorkspaceAutoSettings(workspaceId)
  if (!isFullAutomation(settings, 'email')) return 0

  let applied = 0
  for (const email of emails as { id: string; from_name: string | null; from_address: string; ai_action: string; ai_entities: Record<string, unknown> | null; ai_summary: string | null; ai_priority: string | null }[]) {
    const mappedAction: 'create_lead' | 'create_ticket' =
      email.ai_action === 'create_ticket' ? 'create_ticket' : 'create_lead'
    try {
      await executeAutoAction({
        workspaceId,
        channel:     'email',
        action:      mappedAction,
        sourceId:    email.id,
        entities:          (email.ai_entities ?? {}) as Record<string, string>,
        senderName:        email.from_name ?? null,
        senderEmail:       email.from_address ?? null,
        summary:           email.ai_summary ?? null,
        priority:          email.ai_priority ?? null,
        defaultPipelineId: settings.default_pipeline_id,
      })
      applied++
    } catch (err) {
      console.error(`[backfill-auto] failed for email ${email.id}:`, (err as Error).message)
    }
  }

  console.log(`[backfill-auto] applied=${applied} workspace=${workspaceId}`)
  return applied
}
