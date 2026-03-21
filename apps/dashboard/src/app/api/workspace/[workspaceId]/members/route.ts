import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/workspace/[workspaceId]/members
// Returns managers and employees (sales reps) for the "view as" switcher.
// Only accessible to owner, admin, or manager roles.
// Accepts Bearer token in Authorization header (mobile) or cookie session (web).
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await params

  // Extract Bearer token sent by the mobile app
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

  // Verify the token using the anon client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

  const admin = createAdminClient()

  // Verify caller is a member of this workspace with sufficient role
  const { data: callerRaw } = await admin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle()

  const caller = callerRaw as { role: string } | null
  if (!caller) return NextResponse.json({ error: 'Not a member of this workspace.' }, { status: 403 })
  if (!['owner', 'admin', 'manager'].includes(caller.role)) {
    return NextResponse.json({ error: 'Insufficient permissions.' }, { status: 403 })
  }

  // Fetch all members (manager + employee roles only for the switcher)
  const { data: membersRaw, error: membersError } = await admin
    .from('workspace_members')
    .select('user_id, role')
    .eq('workspace_id', workspaceId)
    .in('role', ['owner', 'admin', 'manager', 'employee'])
    .order('created_at', { ascending: true })

  if (membersError) return NextResponse.json({ error: membersError.message }, { status: 500 })
  const members = (membersRaw ?? []) as { user_id: string; role: string }[]

  // Fetch profiles (names)
  const userIds = members.map(m => m.user_id)
  const { data: profilesRaw } = await admin
    .from('user_profiles')
    .select('user_id, first_name, last_name')
    .in('user_id', userIds)

  const profiles = (profilesRaw ?? []) as { user_id: string; first_name: string | null; last_name: string | null }[]
  const profileMap: Record<string, string> = {}
  for (const p of profiles) {
    profileMap[p.user_id] = [p.first_name, p.last_name].filter(Boolean).join(' ')
  }

  // Fetch emails from auth.users
  const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const emailMap: Record<string, string> = {}
  for (const u of usersData?.users ?? []) {
    emailMap[u.id] = u.email ?? ''
  }

  const result = members.map(m => ({
    userId: m.user_id,
    role: m.role,
    name: profileMap[m.user_id] ?? '',
    email: emailMap[m.user_id] ?? '',
  }))

  return NextResponse.json(result)
}
