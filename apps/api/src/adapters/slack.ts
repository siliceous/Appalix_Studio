import { createHmac, timingSafeEqual } from 'crypto'
import type { FastifyRequest } from 'fastify'
import type { IncomingMessage, IntegrationContext, OutgoingMessage } from './types.js'

/**
 * Slack Adapter
 *
 * Handles:
 *  - url_verification challenge
 *  - app_mention events
 *  - message events in DMs (channel type = im)
 *
 * Signing secret is stored in integration.config.signing_secret (encrypted at rest).
 * Bot token (for replies) is in integration.config.bot_token.
 */

/** Verify Slack request signature (HMAC-SHA256) */
export function verifySlackSignature(
  rawBody: string,
  timestamp: string | undefined,
  signature: string | undefined,
  signingSecret: string,
): boolean {
  if (!timestamp || !signature || !signingSecret) return false

  // Reject requests older than 5 minutes (replay attack prevention)
  if (Math.abs(Date.now() / 1000 - parseInt(timestamp)) > 300) return false

  const baseString = `v0:${timestamp}:${rawBody}`
  const expected   = 'v0=' + createHmac('sha256', signingSecret).update(baseString).digest('hex')

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}

/** Parse a Slack Events API payload into a UnifiedMessage (or null if not actionable) */
export function parseSlackEvent(
  body: SlackEventPayload,
  ctx: IntegrationContext,
): IncomingMessage | null {
  // url_verification — handled upstream; should not reach here
  if (body.type === 'url_verification') return null

  const event = body.event
  if (!event) return null

  // Ignore messages from bots (including our own replies)
  if (event.bot_id || event.subtype) return null

  // Only handle app_mention and direct messages
  if (event.type !== 'app_mention' && event.type !== 'message') return null

  const text = (event.text ?? '').replace(/<@[A-Z0-9]+>/g, '').trim()
  if (!text) return null

  return {
    platform:        'slack',
    integrationId:   ctx.integrationId,
    workspaceId:     ctx.workspaceId,
    botId:           ctx.botId,
    platformThreadId: event.thread_ts ?? event.ts ?? event.channel,
    platformUserId:  event.user,
    text,
    metadata: {
      channel:  event.channel,
      team_id:  body.team_id,
      event_ts: event.ts,
    },
  }
}

/** Send a reply back to Slack using chat.postMessage */
export async function sendSlackReply(
  reply:      OutgoingMessage,
  event:      { channel: string; thread_ts?: string; ts?: string },
  botToken:   string,
): Promise<void> {
  const body = {
    channel:   event.channel,
    text:      reply.text,
    thread_ts: event.thread_ts ?? event.ts,
    ...(reply.blocks ? { blocks: reply.blocks } : {}),
  }

  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${botToken}`,
    },
    body: JSON.stringify(body),
  })

  const data = await res.json() as { ok: boolean; error?: string }
  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error}`)
  }
}

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------
interface SlackEventPayload {
  type:       string
  token?:     string
  team_id?:   string
  challenge?: string
  event?: {
    type:       string
    text?:      string
    user?:      string
    bot_id?:    string
    subtype?:   string
    channel:    string
    ts:         string
    thread_ts?: string
  }
}
