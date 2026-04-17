'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getValidAccessToken }             from '@/lib/google-calendar/tokens'

export interface CreateEventResult {
  ok:       boolean
  eventId?: string
  htmlLink?: string
  error?:   string
}

/**
 * Creates a Google Calendar event on the current user's primary calendar.
 * Sends invite emails to all attendees automatically via Google.
 * Auth: Supabase session (user must be signed in).
 */
export async function createCalendarEvent(data: {
  title:           string
  description?:    string
  start:           string   // ISO datetime
  end:             string   // ISO datetime
  attendeeEmails:  string[]
}): Promise<CreateEventResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Unauthorized' }

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  const workspaceId = (membershipRaw as { workspace_id: string } | null)?.workspace_id
  if (!workspaceId) return { ok: false, error: 'No workspace found' }

  const admin       = createAdminClient()
  const accessToken = await getValidAccessToken(admin, user.id, workspaceId)
  if (!accessToken) return { ok: false, error: 'Google Calendar not connected' }

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
          summary:     data.title,
          description: data.description ?? '',
          start:       { dateTime: data.start },
          end:         { dateTime: data.end   },
          attendees:   data.attendeeEmails.map(email => ({ email })),
        }),
      },
    )

    const event = await res.json() as {
      id?:       string
      htmlLink?: string
      error?:    { message: string }
    }

    if (event.error || !event.id) {
      return { ok: false, error: event.error?.message ?? 'Failed to create event' }
    }

    return { ok: true, eventId: event.id, htmlLink: event.htmlLink }
  } catch (err) {
    console.error('[actions/calendar] createCalendarEvent error:', err)
    return { ok: false, error: 'Request failed' }
  }
}
