import { createHmac, timingSafeEqual } from 'crypto'
import type { IncomingMessage, IntegrationContext, OutgoingMessage } from './types.js'

/**
 * Instagram DM Adapter
 *
 * Config keys (integration.config):
 *   page_access_token  — for sending replies (Instagram-linked page token)
 *   app_secret         — for webhook signature verification
 *   verify_token       — for webhook verification challenge
 *   instagram_account_id — the connected IG business account ID
 *   instagram_username   — display username
 */

/** Verify X-Hub-Signature-256 header */
export function verifyInstagramSignature(
  rawBody: string,
  signature: string | undefined,
  appSecret: string,
): boolean {
  if (!signature || !appSecret) return false
  const [algo, hash] = signature.split('=')
  if (algo !== 'sha256' || !hash) return false
  const expected = createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex')
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(hash))
  } catch {
    return false
  }
}

/** Parse Instagram webhook payload — returns one IncomingMessage per DM */
export function parseInstagramEvents(
  body: InstagramWebhookPayload,
  ctx: IntegrationContext,
): IncomingMessage[] {
  const messages: IncomingMessage[] = []

  for (const entry of body.entry ?? []) {
    for (const messagingEvent of entry.messaging ?? []) {
      if (!messagingEvent.message?.text) continue
      if (messagingEvent.message.is_echo) continue

      messages.push({
        platform:         'instagram',
        integrationId:    ctx.integrationId,
        workspaceId:      ctx.workspaceId,
        botId:            ctx.botId,
        platformThreadId: messagingEvent.sender.id,
        platformUserId:   messagingEvent.sender.id,
        text:             messagingEvent.message.text,
        metadata: {
          instagram_account_id: entry.id,
          message_id:           messagingEvent.message.mid,
        },
      })
    }
  }

  return messages
}

/** Send a reply via the Instagram Messaging API */
export async function sendInstagramReply(
  reply:           OutgoingMessage,
  recipientId:     string,
  pageAccessToken: string,
): Promise<void> {
  const res = await fetch(
    `https://graph.facebook.com/v21.0/me/messages?access_token=${pageAccessToken}`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient:      { id: recipientId },
        message:        { text: reply.text },
        messaging_type: 'RESPONSE',
      }),
    },
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Instagram Send API error: ${err}`)
  }
}

// ── Types ────────────────────────────────────────────────────────────────────

interface InstagramWebhookPayload {
  object: string
  entry?: Array<{
    id: string
    messaging?: Array<{
      sender:    { id: string }
      recipient: { id: string }
      timestamp: number
      message?: {
        mid:      string
        text?:    string
        is_echo?: boolean
      }
    }>
  }>
}
