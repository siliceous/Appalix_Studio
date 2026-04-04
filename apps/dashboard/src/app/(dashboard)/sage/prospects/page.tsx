import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getIcpProfiles, getRecentJobs } from '@/app/actions/prospecting'
import { ProspectsClient } from './prospects-client'
import { SageToolbar } from '@/components/dashboard/sage-toolbar'
import type { SageActivityLog } from '@/lib/types'

export default async function ProspectsPage() {
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

  const workspaceId = (membershipRaw as { workspace_id: string } | null)?.workspace_id

  const admin = createAdminClient()
  const [profiles, recentJobs, activityResult] = await Promise.all([
    getIcpProfiles(),
    getRecentJobs(),
    workspaceId
      ? admin.from('sage_activity_log').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(40)
      : Promise.resolve({ data: [] }),
  ])

  return (
    <div className="flex flex-col h-full">
      <SageToolbar pageKey="prospects" />
      <ProspectsClient
        initialProfiles={profiles}
        initialRecentJobs={recentJobs}
        activity={(activityResult.data ?? []) as SageActivityLog[]}
      />
    </div>
  )
}
