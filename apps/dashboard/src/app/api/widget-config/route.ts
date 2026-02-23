import { NextRequest, NextResponse } from 'next/server'

// Never cache this route — welcome_message can be updated at any time
export const dynamic = 'force-dynamic'

/**
 * GET /api/widget-config?id=:integrationId
 * Proxies to GET /chat/config/:id on the Render API.
 * Returns { welcome_message } without exposing API_BASE_URL to the browser.
 */
export async function GET(req: NextRequest) {
  const apiBase = process.env.API_BASE_URL
  if (!apiBase) return NextResponse.json({ error: 'API not configured' }, { status: 503 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  try {
    const upstream = await fetch(`${apiBase}/chat/config/${id}`, { cache: 'no-store' })
    const data = await upstream.json() as unknown
    return NextResponse.json(data, { status: upstream.status })
  } catch {
    return NextResponse.json({ error: 'Upstream unreachable' }, { status: 502 })
  }
}
