import { createHmac, timingSafeEqual } from 'crypto'
import type { IncomingMessage, IntegrationContext, OutgoingMessage } from './types.js'

/**
 * WordPress Adapter
 *
 * The existing WordPress plugin (claude-ai-chat) can be updated to POST
 * messages here instead of calling the Claude API directly.
 *
 * Config keys (integration.config):
 *   api_key    — shared secret for X-WP-API-Key header
 *   site_url   — the WordPress site URL (for validation)
 *
 * Request format:
 *   POST /webhooks/wordpress/:integrationId
 *   X-WP-API-Key: <api_key>
 *   { "message": "...", "session_id": "...", "visitor_id": "...", "page_url": "..." }
 *
 * Response format (synchronous — WordPress plugin awaits reply):
 *   { "reply": "...", "conversation_id": "..." }
 */

export function verifyWordPressApiKey(
  providedKey: string | undefined,
  storedKey: string,
): boolean {
  if (!providedKey || !storedKey) return false
  try {
    return timingSafeEqual(Buffer.from(providedKey), Buffer.from(storedKey))
  } catch {
    return false
  }
}

export function parseWordPressRequest(
  body: WordPressRequestBody,
  ctx: IntegrationContext,
): IncomingMessage | null {
  const text = body.message?.trim()
  if (!text) return null

  return {
    platform:         'wordpress',
    integrationId:    ctx.integrationId,
    workspaceId:      ctx.workspaceId,
    botId:            ctx.botId,
    platformThreadId: body.session_id ?? body.visitor_id ?? 'anonymous',
    platformUserId:   body.visitor_id,
    text,
    metadata: {
      session_id: body.session_id,
      page_url:   body.page_url,
      user_agent: body.user_agent,
    },
  }
}

export function formatWordPressReply(
  reply: OutgoingMessage,
  conversationId: string,
): WordPressResponseBody {
  return {
    reply:           reply.text,
    conversation_id: conversationId,
  }
}

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------
interface WordPressRequestBody {
  message:     string
  session_id?: string
  visitor_id?: string
  page_url?:   string
  user_agent?: string
}

interface WordPressResponseBody {
  reply:           string
  conversation_id: string
}
