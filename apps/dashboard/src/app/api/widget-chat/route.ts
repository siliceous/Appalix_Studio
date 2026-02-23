import { NextRequest, NextResponse } from 'next/server'

/**
 * Proxy route for the web widget chat.
 * Called by LiveChatWidget from the browser — forwards to the internal API server
 * so we never expose API_BASE_URL to the client or deal with CORS.
 *
 * POST /api/widget-chat
 * Body: { integrationId: string; message: string; session_id?: string }
 */
export async function POST(req: NextRequest) {
  const apiBase = process.env.API_BASE_URL

  if (!apiBase) {
    return NextResponse.json({ error: 'API not configured' }, { status: 503 })
  }

  let body: { integrationId: string; message: string; session_id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { integrationId, message, session_id } = body
  if (!integrationId || !message) {
    return NextResponse.json({ error: 'integrationId and message are required' }, { status: 400 })
  }

  // Forward the origin so the API's allowed_origins check passes.
  // Same-origin requests from the browser don't include an Origin header,
  // so we derive it from the request URL.
  const origin = req.headers.get('origin') ?? req.nextUrl.origin

  try {
    const upstream = await fetch(`${apiBase}/chat/${integrationId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: origin },
      body: JSON.stringify({ message, session_id }),
    })

    const data = await upstream.json() as unknown
    return NextResponse.json(data, { status: upstream.status })
  } catch {
    return NextResponse.json({ error: 'Upstream API unreachable' }, { status: 502 })
  }
}
