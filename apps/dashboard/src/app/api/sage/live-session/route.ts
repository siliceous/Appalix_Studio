/**
 * POST /api/sage/live-session
 *
 * Dashboard proxy that:
 *   1. Verifies the user's Supabase session
 *   2. Checks workspace plan (Pro+ or active trial)
 *   3. Mints a one-time Gemini Live session via the Fastify API
 *   4. Returns { sessionId, wsUrl } to the client
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const apiBase    = process.env.API_BASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!apiBase || !serviceKey) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 503 })
  }

  // 1. Auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: { workspace_id: string; page_context?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { workspace_id, page_context } = body
  if (!workspace_id) {
    return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })
  }

  // 2. Verify membership + plan
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role, workspaces(id, name, plan, subscription_status, trial_ends_at)')
    .eq('user_id', user.id)
    .eq('workspace_id', workspace_id)
    .single()

  type MembershipRow = {
    role: string
    workspaces: { id: string; name: string; plan: string; subscription_status: string; trial_ends_at: string | null }
  }
  const membershipRow = membership as unknown as MembershipRow | null
  const ws = membershipRow?.workspaces

  if (!ws) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

  const isOnTrial = ws.subscription_status === 'trialing'
    && ws.trial_ends_at != null
    && new Date(ws.trial_ends_at) > new Date()

  if (!['pro', 'team', 'enterprise'].includes(ws.plan) && !isOnTrial) {
    return NextResponse.json({ error: 'upgrade_required' }, { status: 403 })
  }

  // 3. Resolve user display name + voice config
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('first_name, last_name, sage_voice_config')
    .eq('user_id', user.id)
    .single()

  const profileRow = profile as { first_name: string | null; last_name: string | null; sage_voice_config: Record<string, unknown> | null } | null
  const userName   = profileRow
    ? [profileRow.first_name, profileRow.last_name].filter(Boolean).join(' ')
    : (user.email ?? 'Team member')

  // 4. Mint session via Fastify API
  const upstream = await fetch(`${apiBase}/live/session`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'X-Service-Key': serviceKey,
    },
    body: JSON.stringify({
      workspace_id,
      user_id:        user.id,
      role:           membershipRow?.role ?? 'member',
      user_name:      userName,
      workspace_name: ws.name,
      page_context:   page_context ?? 'Dashboard',
      voice_config:   profileRow?.sage_voice_config ?? null,
    }),
  }).catch(() => null)

  if (!upstream) {
    return NextResponse.json({ error: 'Voice gateway unreachable' }, { status: 502 })
  }

  const data = await upstream.json()
  const firstName = profileRow?.first_name || userName.split(' ')[0] || 'there'
  return NextResponse.json({ ...data, firstName }, { status: upstream.status })
}
