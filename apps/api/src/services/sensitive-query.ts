/**
 * Sensitive query detection and platform trust classification.
 *
 * When a visitor (unverified user) asks about confidential internal data,
 * the bot blocks the answer and asks them to verify their identity first.
 * Verified workspace members may access the data and email it to other
 * registered contacts only.
 */

// ── Sensitive query patterns ─────────────────────────────────────

const SENSITIVE_PATTERNS: RegExp[] = [
  // Financial
  /\b(revenue|sales|profit|loss|income|earnings|turnover|margin|mrr|arr|ltv|cac)\b/i,
  /\b(financials?|finance|p&l|balance sheet|cash flow)\b/i,
  /\bhow much (money|revenue|sales|did we|have we|are we making)\b/i,
  /\bwhat (is|are|was|were) (our|the) (revenue|sales|profit|income|turnover)\b/i,

  // Business metrics
  /\b(kpi|metric|performance|target|quota|forecast|pipeline)\b/i,
  /\bthis (week|month|quarter|year)'?s? (sales|revenue|numbers|figures|results)\b/i,
  /\b(business|company|team) (performance|results|numbers|figures|report)\b/i,

  // Client / customer data
  /\b(client list|customer list|client data|customer data|contact list)\b/i,
  /\b(who are our|list (of )?our) (clients|customers|accounts)\b/i,

  // Payroll / HR
  /\b(payroll|salary|salaries|compensation|headcount|staff count|employee list)\b/i,

  // Contracts / deals
  /\b(contract value|deal size|deal value|signed deals?)\b/i,

  // Explicit confidential markers
  /\b(confidential|internal|restricted|sensitive)\b.*\b(data|report|information|document|file)\b/i,
]

/**
 * Returns true if the message appears to be requesting sensitive
 * internal business information.
 */
export function detectSensitiveQuery(text: string): boolean {
  return SENSITIVE_PATTERNS.some((p) => p.test(text))
}

// ── Platform trust ───────────────────────────────────────────────

/**
 * Platforms where all users are already authenticated via
 * corporate identity (Slack workspace, Google Workspace).
 * These conversations skip the email verification gate.
 */
const INTERNAL_PLATFORMS = new Set(['slack', 'google_chat', 'custom_api'])

export function isInternalPlatform(platform: string): boolean {
  return INTERNAL_PLATFORMS.has(platform)
}

// ── System prompt injections ─────────────────────────────────────

export function buildSensitivityInjection(
  verifiedEmail:  string | null,
  verifiedName:   string | null,
  isInternal:     boolean,
): string {
  const statusLine = isInternal
    ? 'PLATFORM: Internal (all users trusted — verification not required)'
    : verifiedEmail
      ? `VERIFIED: ${verifiedName ?? verifiedEmail} (${verifiedEmail})`
      : 'NOT VERIFIED'

  return `
SENSITIVE INFORMATION SECURITY POLICY (apply to every message):

The following categories are SENSITIVE and CONFIDENTIAL:
- Revenue, sales, profit, income, financial figures, MRR, ARR
- Business KPIs, performance metrics, targets, forecasts
- Client or customer lists and data
- Payroll, salaries, headcount, employee lists
- Internal reports, contracts, deal values

Current identity status: ${statusLine}

Rules:
1. If the user asks for SENSITIVE information and status is NOT VERIFIED:
   - Do NOT reveal the information under any circumstances
   - Say it is confidential and restricted to registered team members
   - Ask them to provide their registered team email address
   - When they provide an email, immediately call the verify_identity tool
   - If verified, answer the question and offer to email a copy via send_email
   - If verification fails, politely decline and suggest they contact their administrator

2. If status is VERIFIED or PLATFORM is Internal:
   - Answer questions about sensitive internal data normally
   - When sharing sensitive data, proactively offer to email it using send_email
   - Remind the user that send_email only works with registered contacts
`.trim()
}
