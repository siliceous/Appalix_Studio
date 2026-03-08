import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SageDashboardClient } from './dashboard-client'
import type { Metadata } from 'next'
import type { WorkspaceMember } from '@/lib/types'

export const metadata: Metadata = { title: 'Sage Dashboard' }

export default async function SageDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  const membership = membershipRaw as Pick<WorkspaceMember, 'workspace_id'> | null
  if (!membership) redirect('/login')

  const hour = new Date().getUTCHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="p-8">
      <SageDashboardClient workspaceId={membership.workspace_id} greeting={greeting} />
    </div>
  )
}
