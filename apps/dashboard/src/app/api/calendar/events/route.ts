import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getValidAccessToken }             from '@/lib/google-calendar/tokens'

/**
 * GET /api/calendar/events?start=<ISO>&end=<ISO>
 *
 * Returns the current user's Google Calendar events for the given range.
 * Auth: Supabase session cookie.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  const workspaceId = (membershipRaw as { workspace_id: string } | null)?.workspace_id
  if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 403 })

  const admin = createAdminClient()
  const accessToken = await getValidAccessToken(admin, user.id, workspaceId)
  if (!accessToken) return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 404 })

  const start = req.nextUrl.searchParams.get('start') ?? new Date().toISOString()
  const end   = req.nextUrl.searchParams.get('end')   ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  const params = new URLSearchParams({
    timeMin:      start,
    timeMax:      end,
    singleEvents: 'true',
    orderBy:      'startTime',
    maxResults:   '250',
    fields:       'items(id,summary,description,start,end,htmlLink,attendees,status,colorId)',
  })

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )

  if (!res.ok) {
    const text = await res.text()
    console.error('[api/calendar/events] GET error:', res.status, text)
    return NextResponse.json({ error: 'Calendar API error' }, { status: 502 })
  }

  const data = await res.json() as { items?: unknown[] }
  return NextResponse.json({ events: data.items ?? [] })
}

/**
 * POST /api/calendar/events
 *
 * Creates a Google Calendar event on the sender's primary calendar.
 * Sends invite emails to attendees via Google (sendUpdates: 'all').
 * Optionally links the created event back to a sage_meetings row.
 *
 * Auth: X-Service-Key header (SUPABASE_SERVICE_ROLE_KEY)
 *
 * Body: { workspace_id, user_id, title, description?, start_at, end_at,
 *         attendee_emails, sage_meeting_id? }
 * Response: { ok, event_id, html_link }
 */
export async function POST(req: NextRequest) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (req.headers.get('x-service-key') !== serviceKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as {
    workspace_id:    string
    user_id:         string
    title:           string
    description?:    string
    start_at:        string
    end_at:          string
    attendee_emails: string[]
    sage_meeting_id?: string
  }
  const { workspace_id, user_id, title, description, start_at, end_at, attendee_emails, sage_meeting_id } = body

  if (!workspace_id || !user_id || !title || !start_at || !end_at) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const admin       = createAdminClient()
  const accessToken = await getValidAccessToken(admin, user_id, workspace_id)

  if (!accessToken) {
    return NextResponse.json({ ok: false, error: 'Google Calendar not connected' }, { status: 422 })
  }

  // Build attendees list
  const attendees = (attendee_emails ?? []).map((email) => ({ email }))

  try {
    const res = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all',
      {
        method:  'POST',
        headers: {
          Authorization:  `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary:     title,
          description: description ?? '',
          start:       { dateTime: start_at, timeZone: 'UTC' },
          end:         { dateTime: end_at,   timeZone: 'UTC' },
          attendees,
        }),
      },
    )

    const event = await res.json() as {
      id?:       string
      htmlLink?: string
      error?: { message: string }
    }

    if (event.error || !event.id) {
      return NextResponse.json({ ok: false, error: event.error?.message ?? 'create_failed' }, { status: 500 })
    }

    // Link back to sage_meetings if provided
    if (sage_meeting_id && event.id) {
      await admin
        .from('sage_meetings' as never)
        .update({
          google_event_id:  event.id,
          google_event_url: event.htmlLink ?? null,
        })
        .eq('id', sage_meeting_id)
    }

    return NextResponse.json({ ok: true, event_id: event.id, html_link: event.htmlLink })
  } catch (err) {
    console.error('[calendar/events] error:', err)
    return NextResponse.json({ ok: false, error: 'fetch_failed' }, { status: 500 })
  }
}
