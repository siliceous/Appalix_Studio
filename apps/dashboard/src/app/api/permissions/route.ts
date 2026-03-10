import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { WorkspaceMemberRole } from '@/lib/types'
import { ROLE_RANK, DEFAULT_PERMISSIONS } from '@/lib/types'

// GET /api/permissions — fetch all permission rows for the caller's workspace
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  type MRow = { workspace_id: string; role: WorkspaceMemberRole }
  const membership = membershipRaw as MRow | null
  if (!membership) return NextResponse.json({ error: 'Workspace not found.' }, { status: 404 })
  if ((ROLE_RANK[membership.role] ?? 0) < ROLE_RANK.manager) {
    return NextResponse.json({ error: 'Insufficient permissions.' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data: rows } = await admin
    .from('workspace_permissions')
    .select('target_user_id, can_view_contacts, can_view_pipelines, can_view_projects, can_view_dashboard, can_allocate_leads, can_reassign_leads, can_edit_deals')
    .eq('workspace_id', membership.workspace_id)

  return NextResponse.json({ permissions: rows ?? [] })
}

// POST /api/permissions — upsert permissions for one target user
export async function POST(request: NextRequest) {
  const body = await request.json() as { target_user_id?: string } & Partial<typeof DEFAULT_PERMISSIONS>
  const { target_user_id, ...fields } = body

  if (!target_user_id) return NextResponse.json({ error: 'target_user_id is required.' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

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
  if ((ROLE_RANK[caller.role] ?? 0) < ROLE_RANK.manager) {
    return NextResponse.json({ error: 'Insufficient permissions.' }, { status: 403 })
  }

  const admin = createAdminClient()

  // Validate target is in caller's workspace and outranked by caller
  const { data: targetRaw } = await admin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', caller.workspace_id)
    .eq('user_id', target_user_id)
    .single()

  const target = targetRaw as { role: WorkspaceMemberRole } | null
  if (!target) return NextResponse.json({ error: 'Target user not found in workspace.' }, { status: 404 })
  if ((ROLE_RANK[target.role] ?? 0) >= (ROLE_RANK[caller.role] ?? 0)) {
    return NextResponse.json({ error: 'Cannot set permissions for a user at or above your level.' }, { status: 403 })
  }

  // Only allow valid permission fields
  const validKeys = Object.keys(DEFAULT_PERMISSIONS)
  const safeFields = Object.fromEntries(
    Object.entries(fields).filter(([k]) => validKeys.includes(k))
  )

  const { error } = await admin
    .from('workspace_permissions')
    .upsert(
      {
        workspace_id:       caller.workspace_id,
        granted_by_user_id: user.id,
        target_user_id,
        updated_at:         new Date().toISOString(),
        ...safeFields,
      },
      { onConflict: 'workspace_id,target_user_id' },
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
