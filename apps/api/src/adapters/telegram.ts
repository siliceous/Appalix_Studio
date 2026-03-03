import { createHmac, timingSafeEqual } from 'crypto'
import type { IncomingMessage, IntegrationContext, OutgoingMessage } from './types.js'

/**
 * Telegram Adapter
 *
 * Handles incoming webhook updates from the Telegram Bot API.
 *
 * Setup:
 *  1. Create a bot via @BotFather → get a bot token
 *  2. Register a webhook:
 *     POST https://api.telegram.org/bot<TOKEN>/setWebhook
 *     { "url": "https://api.appalix.ai/webhooks/telegram/<integrationId>",
 *       "secret_token": "<webhook_secret>" }
 *  3. The bot_token is stored in integration.config.bot_token
 *  4. The webhook_secret_token is stored in integration.config.webhook_secret_token
 *
 * Telegram sends updates as JSON POST requests.  Each update has an
 * `update_id` (monotonically increasing) and one of many event fields —
 * we only handle `message` for now.
 */

/** Verify Telegram webhook secret token (simple header comparison) */
export function verifyTelegramSecret(
  providedToken: string | undefined,
  expectedToken: string,
): boolean {
  if (!providedToken || !expectedToken) return false
  try {
    return timingSafeEqual(
      Buffer.from(providedToken),
      Buffer.from(expectedToken),
    )
  } catch {
    return false
  }
}

/**
 * Optionally verify the update using HMAC (for extra security).
 * Telegram's secret_token is a simpler approach — just checking the header.
 * This helper is provided for completeness but not required if secret_token is used.
 */
export function verifyTelegramHmac(
  rawBody: string,
  botToken: string,
  signature: string | undefined,
): boolean {
  if (!signature) return false
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest()
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}

/** Parse a Telegram Update payload into an IncomingMessage (or null if not actionable) */
export function parseTelegramUpdate(
  update: TelegramUpdate,
  ctx: IntegrationContext,
): IncomingMessage | null {
  const msg = update.message ?? update.edited_message

  // Only handle text messages for now
  if (!msg || !msg.text) return null

  // Ignore messages from bots
  if (msg.from?.is_bot) return null

  // Strip bot @mention from commands (e.g. "/start@MyBot" → "/start")
  const text = msg.text.replace(/@\w+/, '').trim()
  if (!text) return null

  return {
    platform:         'telegram',
    integrationId:    ctx.integrationId,
    workspaceId:      ctx.workspaceId,
    botId:            ctx.botId,
    platformThreadId: String(msg.chat.id),
    platformUserId:   String(msg.from?.id ?? msg.chat.id),
    text,
    metadata: {
      update_id:    update.update_id,
      message_id:   msg.message_id,
      chat_type:    msg.chat.type,
      chat_title:   msg.chat.title,
      username:     msg.from?.username,
      first_name:   msg.from?.first_name,
    },
  }
}

/** Send a reply to a Telegram chat using sendMessage */
export async function sendTelegramReply(
  reply:    OutgoingMessage,
  chatId:   number | string,
  botToken: string,
  replyToMessageId?: number,
): Promise<void> {
  const body: Record<string, unknown> = {
    chat_id:    chatId,
    text:       reply.text,
    parse_mode: 'HTML',
  }

  if (replyToMessageId) {
    body.reply_to_message_id = replyToMessageId
  }

  const res = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
      signal:  AbortSignal.timeout(10_000),
    },
  )

  const data = await res.json() as { ok: boolean; description?: string }
  if (!data.ok) {
    throw new Error(`Telegram API error: ${data.description ?? 'unknown'}`)
  }
}

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------
export interface TelegramUpdate {
  update_id:       number
  message?:        TelegramMessage
  edited_message?: TelegramMessage
  channel_post?:   TelegramMessage
}

interface TelegramMessage {
  message_id: number
  from?: {
    id:         number
    is_bot:     boolean
    first_name: string
    username?:  string
  }
  chat: {
    id:      number
    type:    'private' | 'group' | 'supergroup' | 'channel'
    title?:  string
    username?: string
  }
  date:   number
  text?:  string
}
