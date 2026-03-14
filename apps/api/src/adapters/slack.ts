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
  event:      { channel: string; thread_ts?: string; ts?: string; user?: string },
  botToken:   string,
): Promise<void> {
  let channelId = event.channel

  // For DMs (channel starts with 'D'), open the DM channel via conversations.open
  // to ensure we have a valid, accessible channel ID after any reinstalls.
  if (channelId.startsWith('D') && event.user) {
    console.log('[sendSlackReply] DM detected, calling conversations.open for user:', event.user)
    const openRes = await fetch('https://slack.com/api/conversations.open', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${botToken}`,
      },
      body: JSON.stringify({ users: event.user }),
    })
    const openData = await openRes.json() as { ok: boolean; channel?: { id: string }; error?: string }
    if (openData.ok && openData.channel?.id) {
      console.log('[sendSlackReply] conversations.open resolved channel:', openData.channel.id)
      channelId = openData.channel.id
    } else {
      console.error('[sendSlackReply] conversations.open failed:', openData.error, '— falling back to original channel:', channelId)
    }
  }

  const body = {
    channel:   channelId,
    text:      reply.text,
    thread_ts: event.thread_ts,   // only thread in channels, not DMs
    ...(reply.blocks ? { blocks: reply.blocks } : {}),
  }

  console.log('[sendSlackReply] posting to channel:', channelId)
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
    console.error('[sendSlackReply] chat.postMessage failed:', data.error, 'channel:', channelId)
    throw new Error(`Slack API error: ${data.error}`)
  }
  console.log('[sendSlackReply] message posted successfully to:', channelId)
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
