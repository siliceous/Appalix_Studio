import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { ROLE_RANK } from '@/lib/types'
import type { WorkspaceMemberRole } from '@/lib/types'

// POST /api/allocate-lead
// Body: { lead_id: string; assigned_to: string | null }
export async function POST(request: NextRequest) {
  const body = await request.json() as { lead_id?: string; assigned_to?: string | null }
  const { lead_id, assigned_to } = body

  if (!lead_id) return NextResponse.json({ error: 'lead_id is required.' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

  // Get caller membership + permissions
  const { data: callerRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  type MRow = { workspace_id: string; role: WorkspaceMemberRole }
  const caller = callerRaw as MRow | null
  if (!caller) return NextResponse.json({ error: 'Workspace not found.' }, { status: 404 })

  const callerRank = ROLE_RANK[caller.role] ?? 0

  // Check can_allocate_leads permission (managers+ always can; others need explicit permission)
  const admin = createAdminClient()
  let canAllocate = callerRank >= ROLE_RANK.manager
  if (!canAllocate) {
    const { data: permRow } = await admin
      .from('workspace_permissions')
      .select('can_allocate_leads')
      .eq('workspace_id', caller.workspace_id)
      .eq('target_user_id', user.id)
      .maybeSingle()
    canAllocate = !!(permRow as { can_allocate_leads?: boolean } | null)?.can_allocate_leads
  }
  if (!canAllocate) {
    return NextResponse.json({ error: 'You do not have permission to allocate leads.' }, { status: 403 })
  }

  // Validate lead belongs to caller's workspace
  const { data: leadRaw } = await admin
    .from('leads')
    .select('id, workspace_id, assigned_to')
    .eq('id', lead_id)
    .eq('workspace_id', caller.workspace_id)
    .single()

  if (!leadRaw) return NextResponse.json({ error: 'Lead not found.' }, { status: 404 })
  const lead = leadRaw as { id: string; workspace_id: string; assigned_to: string | null }

  // If assigning to someone, validate they are in the workspace and outranked by caller
  if (assigned_to) {
    const { data: targetRaw } = await admin
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', caller.workspace_id)
      .eq('user_id', assigned_to)
      .single()

    const target = targetRaw as { role: WorkspaceMemberRole } | null
    if (!target) return NextResponse.json({ error: 'Assignee not found in workspace.' }, { status: 404 })
    if ((ROLE_RANK[target.role] ?? 0) >= callerRank) {
      return NextResponse.json({ error: 'Cannot assign lead to a user at or above your level.' }, { status: 403 })
    }
  }

  const now = new Date().toISOString()

  // Update the lead
  const { error: updateError } = await admin
    .from('leads')
    .update({
      assigned_to:  assigned_to ?? null,
      allocated_by: assigned_to ? user.id : null,
      allocated_at: assigned_to ? now : null,
    })
    .eq('id', lead_id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  // Record allocation history
  const { error: histError } = await admin
    .from('lead_allocation_history')
    .insert({
      lead_id,
      workspace_id:       caller.workspace_id,
      allocated_by:       user.id,
      assigned_to:        assigned_to ?? null,
      prev_assigned_to:   lead.assigned_to ?? null,
      allocated_at:       now,
    })

  if (histError) {
    // Non-fatal — lead was updated; just log
    console.error('[allocate-lead] history insert error:', histError.message)
  }

  return NextResponse.json({ ok: true })
}
