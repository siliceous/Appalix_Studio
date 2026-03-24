import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeAccessScope, generateWorkspaceAlerts, getPersistedAlerts } from '@/lib/sage-intelligence'

/**
 * GET /api/sage/alerts?workspace_id=xxx
 * Returns live + persisted alerts for the user's access scope.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const workspaceId = req.nextUrl.searchParams.get('workspace_id')
  if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })

  // Verify plan
  const { data: memberRaw } = await supabase
    .from('workspace_members')
    .select('workspaces(plan, subscription_status, trial_ends_at)')
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

  const scope = await computeAccessScope(workspaceId)
  if (!scope) return NextResponse.json({ error: 'Scope error' }, { status: 500 })

  const [liveAlerts, persistedAlerts] = await Promise.all([
    generateWorkspaceAlerts(scope),
    getPersistedAlerts(scope),
  ])

  // Merge — live alerts take precedence, persisted fill in the rest
  const allAlerts = [...liveAlerts, ...persistedAlerts]

  return NextResponse.json({ alerts: allAlerts })
}

/**
 * POST /api/sage/alerts  — dismiss an alert
 * Body: { workspace_id, alert_id }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json() as { workspace_id: string; alert_id: string }
  if (!body.workspace_id || !body.alert_id) {
    return NextResponse.json({ error: 'workspace_id and alert_id required' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('sage_alerts')
    .update({ is_dismissed: true, dismissed_by: user.id, dismissed_at: new Date().toISOString() })
    .eq('id', body.alert_id)
    .eq('workspace_id', body.workspace_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
