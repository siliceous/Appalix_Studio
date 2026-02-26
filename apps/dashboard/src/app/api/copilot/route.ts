import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/copilot
 * Authenticated internal copilot endpoint.
 * Verifies the user's Supabase session, checks Pro+ plan,
 * then proxies to the Fastify API's /copilot endpoint.
 *
 * Body: { messages: {role, content}[], workspace_id: string }
 */
export async function POST(req: NextRequest) {
  const apiBase    = process.env.API_BASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!apiBase || !serviceKey) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 503 })
  }

  // Auth: require a valid Supabase session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  let body: { messages: { role: 'user' | 'assistant'; content: string }[]; workspace_id: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { messages, workspace_id } = body
  if (!messages?.length || !workspace_id) {
    return NextResponse.json({ error: 'messages and workspace_id are required' }, { status: 400 })
  }

  // Load workspace to get name + verify plan (also confirms user has access via RLS)
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspaces(id, name, plan)')
    .eq('user_id', user.id)
    .eq('workspace_id', workspace_id)
    .single()

  const ws = (membership as unknown as { workspaces: { id: string; name: string; plan: string } } | null)?.workspaces

  if (!ws) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  }

  const allowedPlans = ['pro', 'scale', 'enterprise']
  if (!allowedPlans.includes(ws.plan)) {
    return NextResponse.json({ error: 'upgrade_required' }, { status: 403 })
  }

  // Get the user's name from user_profiles (if exists), fallback to email
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('first_name, last_name')
    .eq('user_id', user.id)
    .single()

  const userName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(' ')
    : (user.email ?? 'Team member')

  try {
    const upstream = await fetch(`${apiBase}/copilot`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': serviceKey,
      },
      body: JSON.stringify({
        workspace_id,
        messages,
        user_name:      userName,
        workspace_name: ws.name,
      }),
    })

    const data = await upstream.json() as unknown
    return NextResponse.json(data, { status: upstream.status })
  } catch {
    return NextResponse.json({ error: 'Upstream API unreachable' }, { status: 502 })
  }
}
