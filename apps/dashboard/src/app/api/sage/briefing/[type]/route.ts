import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeAccessScope, generateDailyBriefing, generateWeeklyBriefing } from '@/lib/sage-intelligence'

/**
 * GET /api/sage/briefing/[type]?workspace_id=xxx
 * type = 'daily' | 'weekly'
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params

  if (type !== 'daily' && type !== 'weekly') {
    return NextResponse.json({ error: 'Invalid briefing type — use daily or weekly' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const workspaceId = req.nextUrl.searchParams.get('workspace_id')
  if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })

  // Verify plan
  const { data: memberRaw } = await supabase
    .from('workspace_members')
    .select('workspaces(name, plan, subscription_status, trial_ends_at)')
    .eq('user_id', user.id)
    .eq('workspace_id', workspaceId)
    .single()

  const ws = (memberRaw as unknown as { workspaces: { plan: string; subscription_status: string; trial_ends_at: string | null } } | null)?.workspaces
  if (!ws) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

  const allowedPlans = ['pro', 'team', 'enterprise']
  const isOnTrial    = ws.subscription_status === 'trialing' && ws.trial_ends_at != null && new Date(ws.trial_ends_at) > new Date()
  if (!allowedPlans.includes(ws.plan) && !isOnTrial) {
    return NextResponse.json({ error: 'upgrade_required' }, { status: 403 })
  }

  // Get user name for briefing personalisation
  const { data: profileRaw } = await supabase
    .from('user_profiles')
    .select('first_name, last_name')
    .eq('user_id', user.id)
    .single()
  const profile  = profileRaw as { first_name: string | null; last_name: string | null } | null
  const userName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(' ')
    : (user.email ?? 'Team member')

  const scope = await computeAccessScope(workspaceId)
  if (!scope) return NextResponse.json({ error: 'Scope error' }, { status: 500 })

  const wsName = (memberRaw as unknown as { workspaces: { name: string } } | null)?.workspaces?.name ?? 'Workspace'

  const briefing = type === 'daily'
    ? await generateDailyBriefing(scope, wsName, userName)
    : await generateWeeklyBriefing(scope, wsName, userName)

  return NextResponse.json({ briefing })
}
