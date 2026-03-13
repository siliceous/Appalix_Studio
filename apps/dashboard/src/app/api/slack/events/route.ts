import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * Slack Events API endpoint.
 * - Responds to Slack's URL verification challenge.
 * - Routes incoming messages to the bot processor and replies in Slack.
 */
export async function POST(req: NextRequest) {
  let body: {
    type?: string
    challenge?: string
    team_id?: string
    event?: {
      type?: string
      subtype?: string
      bot_id?: string
      text?: string
      user?: string
      channel?: string
      channel_type?: string
      ts?: string
      thread_ts?: string
    }
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  // ── URL verification ──────────────────────────────────────────────────────
  if (body.type === 'url_verification' && body.challenge) {
    return new NextResponse(body.challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  // ── Event callback ────────────────────────────────────────────────────────
  // Acknowledge immediately — Slack requires a 200 within 3 seconds
  if (body.type === 'event_callback') {
    handleEvent(body.event ?? {}, body.team_id ?? '').catch((err) =>
      console.error('[slack/events] handler error:', err),
    )
  }

  return NextResponse.json({ ok: true })
}

async function handleEvent(
  event: NonNullable<Parameters<typeof POST>[0] extends never ? never : {
    type?: string; subtype?: string; bot_id?: string; text?: string
    user?: string; channel?: string; channel_type?: string; ts?: string; thread_ts?: string
  }>,
  teamId: string,
) {
  const type    = event.type
  const subtype = event.subtype

  // Ignore bot messages to avoid loops
  if (subtype === 'bot_message' || event.bot_id) return
  if (type !== 'message' && type !== 'app_mention') return

  const text    = (event.text ?? '').trim()
  const channel = event.channel ?? ''
  const user    = event.user ?? ''
  const threadTs = event.thread_ts ?? event.ts ?? ''

  if (!text || !channel || !teamId) return

  // ── 1. Look up the integration by team_id ─────────────────────────────────
  const admin = createAdminClient()
  const { data: integration } = await admin
    .from('integrations')
    .select('id, config')
    .eq('platform', 'slack')
    .eq('status', 'active')
    .filter('config->>team_id', 'eq', teamId)
    .limit(1)
    .single()

  if (!integration) {
    console.warn(`[slack/events] No active integration for team ${teamId}`)
    return
  }

  const botToken = (integration.config as Record<string, string>)?.bot_token
  if (!botToken) return

  // ── 2. Forward message to the bot processor ───────────────────────────────
  const apiBase = process.env.API_BASE_URL
  if (!apiBase) {
    console.error('[slack/events] API_BASE_URL not set')
    return
  }

  // Use channel+user as session so each user gets their own conversation thread
  const sessionId = `slack_${teamId}_${channel}_${user}`

  let replyText = ''
  try {
    const res = await fetch(`${apiBase}/chat/${integration.id}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ message: text, session_id: sessionId }),
    })
    const data = await res.json() as { reply?: string; message?: string; error?: string }
    replyText = data.reply ?? data.message ?? ''
  } catch (err) {
    console.error('[slack/events] chat API error:', err)
    return
  }

  if (!replyText) return

  // ── 3. Post reply back to Slack ───────────────────────────────────────────
  await fetch('https://slack.com/api/chat.postMessage', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${botToken}`,
    },
    body: JSON.stringify({
      channel,
      text:      replyText,
      thread_ts: threadTs,  // reply in thread to keep conversations tidy
    }),
  }).catch((err) => console.error('[slack/events] postMessage error:', err))
}
