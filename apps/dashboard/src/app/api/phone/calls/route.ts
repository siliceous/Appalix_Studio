// Call history — list call sessions for the workspace.
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse }                    from 'next/server'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: membershipRaw } = await (supabase as any)
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single() as { data: { workspace_id: string } | null }

  if (!membershipRaw) return NextResponse.json({ error: 'No workspace' }, { status: 403 })

  const url    = new URL(req.url)
  const limit  = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 100)
  const offset = parseInt(url.searchParams.get('offset') ?? '0')

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error, count } = await (admin as any)
    .from('call_sessions')
    .select(`
      id,
      from_e164,
      to_e164,
      direction,
      status,
      duration_seconds,
      hangup_cause,
      conversation_id,
      transcript,
      answered_at,
      ended_at,
      created_at,
      voice_agents ( name )
    `, { count: 'exact' })
    .eq('workspace_id', membershipRaw.workspace_id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1) as {
      data: Array<{
        id:               string
        from_e164:        string
        to_e164:          string
        direction:        string
        status:           string
        duration_seconds: number | null
        hangup_cause:     string | null
        conversation_id:  string | null
        transcript:       Array<{ role: string; text: string; ts: string }>
        answered_at:      string | null
        ended_at:         string | null
        created_at:       string
        voice_agents:     { name: string } | null
      }> | null
      error:  { message: string } | null
      count:  number | null
    }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ calls: data ?? [], total: count ?? 0 })
}
