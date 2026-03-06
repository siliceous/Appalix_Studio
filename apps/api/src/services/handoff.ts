/**
 * Human handoff — detects when a visitor wants to speak to a person
 * and dispatches a notification to the configured channel.
 *
 * Supported channels:
 *  • slack      — Incoming Webhook (rich block message)
 *  • discord    — Server Webhook (rich embed)
 *  • telegram   — Bot API (sendMessage with HTML)
 *  • whatsapp      — Twilio WhatsApp API
 *  • whatsapp_link — wa.me click-to-chat link injected into bot reply (no API needed)
 *  • generic       — Plain JSON POST (Zapier, Make, Teams, Messenger via bridge, etc.)
 */

// ---------------------------------------------------------------
// Intent detection
// ---------------------------------------------------------------

const HANDOFF_PHRASES = [
  'speak to a human',
  'talk to a human',
  'speak to a person',
  'talk to a person',
  'real person',
  'human agent',
  'live agent',
  'live chat',
  'speak to someone',
  'talk to someone',
  'speak to support',
  'talk to support',
  'customer service',
  'speak to a representative',
  'talk to a representative',
  'connect me to',
  'escalate',
  'want a human',
  'need a human',
  'prefer to speak',
  'speak with someone',
  'talk with someone',
]

/** Returns true if the message contains a handoff request. */
export function detectHandoffIntent(text: string): boolean {
  const lower = text.toLowerCase()
  return HANDOFF_PHRASES.some((phrase) => lower.includes(phrase))
}

/**
 * Injected into the system prompt when handoff is triggered.
 * Instructs Claude to acknowledge gracefully instead of trying to solve the issue.
 */
export const HANDOFF_SYSTEM_INJECTION = `
IMPORTANT — HUMAN HANDOFF REQUESTED:
The visitor has asked to speak with a human agent. You MUST:
1. Warmly acknowledge their request and apologise for any inconvenience.
2. Reassure them that a real team member has been notified and will be with them shortly.
3. Optionally ask for their name, email, or a brief description of their issue so the agent is prepared.
4. Do NOT attempt to resolve the issue yourself.
5. Keep the response short, warm, and reassuring.
`.trim()

// ---------------------------------------------------------------
// Channel types
// ---------------------------------------------------------------

export type HandoffChannel = 'slack' | 'discord' | 'telegram' | 'whatsapp' | 'whatsapp_link' | 'generic'

export interface HandoffChannelConfig {
  channel:           HandoffChannel
  /** Slack incoming webhook URL / Discord webhook URL / generic HTTP URL */
  webhook_url?:      string
  /** Telegram Bot token from @BotFather */
  telegram_token?:   string
  /** Telegram chat_id (group, channel, or direct) */
  telegram_chat_id?: string
  /** Twilio Account SID */
  twilio_sid?:       string
  /** Twilio Auth Token */
  twilio_token?:     string
  /** Twilio WhatsApp From number e.g. whatsapp:+14155238886 */
  twilio_from?:      string
  /** Your agent/team WhatsApp number e.g. whatsapp:+15551234567 */
  twilio_to?:        string
  /** Phone number for wa.me link e.g. 61412345678 (digits only, no +) */
  whatsapp_number?:  string
}

/**
 * Build a wa.me click-to-chat URL.
 * Returns the URL string (no network request — the bot includes it in its reply).
 */
export function buildWaLink(number: string, prefillText?: string): string {
  const clean = number.replace(/\D/g, '')
  const encoded = prefillText ? `?text=${encodeURIComponent(prefillText)}` : ''
  return `https://wa.me/${clean}${encoded}`
}

// ---------------------------------------------------------------
// Payload
// ---------------------------------------------------------------

export interface HandoffWebhookPayload {
  event:          'handoff_requested'
  conversationId: string
  integrationId:  string
  workspaceId:    string
  userMessage:    string
  timestamp:      string
}

// ---------------------------------------------------------------
// Channel-specific senders
// ---------------------------------------------------------------

async function postSlack(url: string, p: HandoffWebhookPayload): Promise<void> {
  await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      text: '🚨 Human handoff requested',
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '🚨 Human handoff requested', emoji: true },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Visitor message:*\n${p.userMessage}` },
            { type: 'mrkdwn', text: `*Conversation ID:*\n\`${p.conversationId}\`` },
          ],
        },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: `Integration: \`${p.integrationId}\` | ${p.timestamp}` },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(10_000),
  })
}

async function postDiscord(url: string, p: HandoffWebhookPayload): Promise<void> {
  await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      embeds: [
        {
          title:       '🚨 Human Handoff Requested',
          description: p.userMessage,
          color:       0xEC732E, // brand orange
          fields: [
            { name: 'Conversation ID', value: `\`${p.conversationId}\``, inline: true },
            { name: 'Time',            value: p.timestamp,                inline: true },
          ],
          footer: { text: `Integration: ${p.integrationId}` },
        },
      ],
    }),
    signal: AbortSignal.timeout(10_000),
  })
}

async function postTelegram(token: string, chatId: string, p: HandoffWebhookPayload): Promise<void> {
  const text = [
    '🚨 <b>Human handoff requested</b>',
    '',
    `<b>Message:</b> ${p.userMessage}`,
    `<b>Conversation:</b> <code>${p.conversationId}</code>`,
    `<b>Time:</b> ${p.timestamp}`,
  ].join('\n')

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    signal:  AbortSignal.timeout(10_000),
  })
}

async function postWhatsApp(
  sid:   string,
  token: string,
  from:  string,
  to:    string,
  p:     HandoffWebhookPayload,
): Promise<void> {
  const body = new URLSearchParams({
    From: from,
    To:   to,
    Body: [
      '🚨 Human handoff requested',
      `Message: "${p.userMessage}"`,
      `Conversation: ${p.conversationId}`,
      `Time: ${p.timestamp}`,
    ].join('\n'),
  })

  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization:  `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
    },
    body:   body.toString(),
    signal: AbortSignal.timeout(10_000),
  })
}

async function postGeneric(url: string, p: HandoffWebhookPayload): Promise<void> {
  await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(p),
    signal:  AbortSignal.timeout(10_000),
  })
}

// ---------------------------------------------------------------
// Main dispatcher
// ---------------------------------------------------------------

/**
 * Send a handoff notification to the configured channel.
 * Fire-and-forget safe — catches and logs all errors internally.
 */
export async function sendHandoffNotification(
  cfg:     HandoffChannelConfig,
  payload: HandoffWebhookPayload,
): Promise<void> {
  try {
    switch (cfg.channel) {
      case 'slack':
        if (cfg.webhook_url) await postSlack(cfg.webhook_url, payload)
        break

      case 'discord':
        if (cfg.webhook_url) await postDiscord(cfg.webhook_url, payload)
        break

      case 'telegram':
        if (cfg.telegram_token && cfg.telegram_chat_id)
          await postTelegram(cfg.telegram_token, cfg.telegram_chat_id, payload)
        break

      case 'whatsapp':
        if (cfg.twilio_sid && cfg.twilio_token && cfg.twilio_from && cfg.twilio_to)
          await postWhatsApp(cfg.twilio_sid, cfg.twilio_token, cfg.twilio_from, cfg.twilio_to, payload)
        break

      case 'whatsapp_link':
        // No outbound API call — the wa.me link is injected into the bot reply via HANDOFF_SYSTEM_INJECTION
        console.log(`[handoff] whatsapp_link: wa.me link will be included in bot reply for conversation=${payload.conversationId}`)
        break

      case 'generic':
      default:
        if (cfg.webhook_url) await postGeneric(cfg.webhook_url, payload)
        break
    }

    console.log(`[handoff] notification sent via ${cfg.channel} for conversation=${payload.conversationId}`)
  } catch (err) {
    console.error(`[handoff] send failed (${cfg.channel}): ${err instanceof Error ? err.message : String(err)}`)
  }
}

/** Returns true if the config has enough credentials for at least one channel to work. */
export function isHandoffConfigured(cfg: HandoffChannelConfig): boolean {
  switch (cfg.channel) {
    case 'slack':
    case 'discord':
    case 'generic':
      return !!cfg.webhook_url
    case 'telegram':
      return !!(cfg.telegram_token && cfg.telegram_chat_id)
    case 'whatsapp':
      return !!(cfg.twilio_sid && cfg.twilio_token && cfg.twilio_from && cfg.twilio_to)
    case 'whatsapp_link':
      return !!cfg.whatsapp_number
    default:
      return false
  }
}
