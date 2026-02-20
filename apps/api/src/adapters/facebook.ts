import { createHmac, timingSafeEqual } from 'crypto'
import type { IncomingMessage, IntegrationContext, OutgoingMessage } from './types.js'

/**
 * Facebook Messenger Adapter
 *
 * Config keys (integration.config):
 *   page_access_token  — for sending replies
 *   app_secret         — for webhook signature verification
 *   verify_token       — for webhook verification challenge
 */

/** Verify X-Hub-Signature-256 header */
export function verifyFacebookSignature(
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

/** Parse Facebook webhook payload — returns one IncomingMessage per message event */
export function parseFacebookEvents(
  body: FacebookWebhookPayload,
  ctx: IntegrationContext,
): IncomingMessage[] {
  const messages: IncomingMessage[] = []

  for (const entry of body.entry ?? []) {
    for (const messagingEvent of entry.messaging ?? []) {
      // Skip deliveries, reads, echoes
      if (!messagingEvent.message?.text) continue
      if (messagingEvent.message.is_echo) continue

      messages.push({
        platform:         'facebook_messenger',
        integrationId:    ctx.integrationId,
        workspaceId:      ctx.workspaceId,
        botId:            ctx.botId,
        platformThreadId: messagingEvent.sender.id,
        platformUserId:   messagingEvent.sender.id,
        text:             messagingEvent.message.text,
        metadata: {
          page_id:    entry.id,
          message_id: messagingEvent.message.mid,
        },
      })
    }
  }

  return messages
}

/** Send a reply via the Send API */
export async function sendFacebookReply(
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
        recipient: { id: recipientId },
        message:   { text: reply.text },
        messaging_type: 'RESPONSE',
      }),
    },
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Facebook Send API error: ${err}`)
  }
}

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------
interface FacebookWebhookPayload {
  object: string
  entry?: Array<{
    id: string
    messaging?: Array<{
      sender:  { id: string }
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
