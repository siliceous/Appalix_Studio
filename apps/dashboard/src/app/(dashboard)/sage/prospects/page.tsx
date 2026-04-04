import { getIcpProfiles, getRecentJobs } from '@/app/actions/prospecting'
import { ProspectsClient } from './prospects-client'
import { SageToolbar } from '@/components/dashboard/sage-toolbar'

export default async function ProspectsPage() {
  const [profiles, recentJobs] = await Promise.all([
    getIcpProfiles(),
    getRecentJobs(),
  ])

  return (
    <div className="flex flex-col">
      <SageToolbar pageKey="prospects" />
      <div>
        <ProspectsClient
      initialProfiles={profiles}
      initialRecentJobs={recentJobs}
        />
      </div>
    </div>
  )
}
