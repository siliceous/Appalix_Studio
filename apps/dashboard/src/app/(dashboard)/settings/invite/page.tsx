import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { INVITE_ALLOWED } from '@/lib/types'
import type { WorkspaceMemberRole } from '@/lib/types'
import { InviteForm } from './invite-form'

export default async function InvitePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  const callerRole = ((membershipRaw as { role: string } | null)?.role ?? 'employee') as WorkspaceMemberRole
  const invitableRoles = INVITE_ALLOWED[callerRole] ?? []

  if (invitableRoles.length === 0) redirect('/settings')

  return <InviteForm callerRole={callerRole} invitableRoles={invitableRoles} />
}
