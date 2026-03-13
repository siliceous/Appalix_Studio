import { NextRequest, NextResponse } from 'next/server'

/**
 * Slack Events API endpoint.
 * - Responds to Slack's URL verification challenge (required to save the URL in the Slack app console).
 * - Will handle incoming message events once subscriptions are active.
 */
export async function POST(req: NextRequest) {
  let body: { type?: string; challenge?: string; event?: Record<string, unknown>; team_id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  // ── URL verification (Slack sends this when you first save the Events URL) ──
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
  event: Record<string, unknown>,
  teamId: string,
) {
  const type    = event.type as string | undefined
  const subtype = event.subtype as string | undefined

  // Ignore bot messages to avoid loops
  if (subtype === 'bot_message' || event.bot_id) return

  if (type === 'message' || type === 'app_mention') {
    console.log(`[slack/events] ${type} from team ${teamId}:`, event.text)
    // TODO: route to the bot associated with this team_id integration
  }
}
