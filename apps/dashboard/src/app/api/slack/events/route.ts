import { NextRequest, NextResponse } from 'next/server'

/**
 * Slack Events API endpoint.
 * - Responds to Slack's URL verification challenge (required to save the URL in the Slack app console).
 * - Will handle incoming message events once subscriptions are active.
 */
export async function POST(req: NextRequest) {
  const body = await req.json() as {
    type: string
    challenge?: string
    event?: Record<string, unknown>
    team_id?: string
  }

  // ── URL verification (Slack sends this when you first save the Events URL) ──
  if (body.type === 'url_verification') {
    return NextResponse.json({ challenge: body.challenge })
  }

  // ── Event callback ────────────────────────────────────────────────────────
  // Acknowledge immediately — Slack requires a 200 within 3 seconds
  if (body.type === 'event_callback') {
    // Process asynchronously (don't await so we return 200 fast)
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
