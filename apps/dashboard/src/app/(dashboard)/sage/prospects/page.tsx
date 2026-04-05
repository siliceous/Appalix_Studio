import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getIcpProfiles, getRecentJobs } from '@/app/actions/prospecting'
import { ProspectsClient } from './prospects-client'
import { SageToolbar } from '@/components/dashboard/sage-toolbar'
import { getActivityFeed, resolveViewingAs } from '@/app/actions/activity-feed'
import { ActivitySidebar } from '@/components/team/activity-sidebar'

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
  if (!workspaceId) redirect('/login')

  const [profiles, recentJobs] = await Promise.all([
    getIcpProfiles(),
    getRecentJobs(),
  ])

  const activityDate = new Date().toISOString().slice(0, 10)
  const [activity, viewingAs] = await Promise.all([
    getActivityFeed(user.id, workspaceId, activityDate),
    resolveViewingAs(undefined, workspaceId),
  ])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <SageToolbar pageKey="prospects" />
      <div className="flex flex-1 overflow-hidden min-h-0">
        <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
          <ProspectsClient
            initialProfiles={profiles}
            initialRecentJobs={recentJobs}
          />
        </div>
        <ActivitySidebar
          activity={activity}
          date={activityDate}
          currentPath="/sage/prospects"
          viewingAs={viewingAs}
        />
      </div>
    </div>
  )
}
