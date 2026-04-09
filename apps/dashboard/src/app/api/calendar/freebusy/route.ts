import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient }         from '@/lib/supabase/server'
import { getValidAccessToken }       from '@/lib/google-calendar/tokens'

/**
 * POST /api/calendar/freebusy
 *
 * Checks a user's Google Calendar free/busy for a given time range.
 * Called internally by the automation scheduler before scheduling outreach.
 *
 * Auth: X-Service-Key header (SUPABASE_SERVICE_ROLE_KEY)
 *
 * Body: { workspace_id, user_id, time_min, time_max }
 * Response: { connected, busy: [{ start, end }] }
 */
export async function POST(req: NextRequest) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (req.headers.get('x-service-key') !== serviceKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as {
    workspace_id: string
    user_id:      string
    time_min:     string
    time_max:     string
  }
  const { workspace_id, user_id, time_min, time_max } = body
  if (!workspace_id || !user_id || !time_min || !time_max) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const admin       = createAdminClient()
  const accessToken = await getValidAccessToken(admin, user_id, workspace_id)

  if (!accessToken) {
    return NextResponse.json({ connected: false, busy: [] })
  }

  try {
    const res = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timeMin: time_min,
        timeMax: time_max,
        items:   [{ id: 'primary' }],
      }),
    })

    const data = await res.json() as {
      calendars?: { primary?: { busy?: { start: string; end: string }[] } }
      error?: { message: string }
    }

    if (data.error) {
      return NextResponse.json({ connected: true, busy: [], error: data.error.message })
    }

    const busy = data.calendars?.primary?.busy ?? []
    return NextResponse.json({ connected: true, busy })
  } catch (err) {
    console.error('[calendar/freebusy] error:', err)
    return NextResponse.json({ connected: true, busy: [], error: 'fetch_failed' })
  }
}
