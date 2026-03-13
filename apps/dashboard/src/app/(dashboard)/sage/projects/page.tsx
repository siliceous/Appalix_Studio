import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import type { WorkspaceMember, SageDeal, SageContact, SageCompany, SagePipelineStage, WorkspaceMemberRole } from '@/lib/types'
import { ROLE_RANK } from '@/lib/types'
import { ProjectsClient } from './projects-client'

export const metadata: Metadata = { title: 'Projects' }

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ viewAs?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  const membership = membershipRaw as Pick<WorkspaceMember, 'workspace_id' | 'role'> | null
  if (!membership) redirect('/login')
  const workspaceId = membership.workspace_id
  const callerRank  = ROLE_RANK[membership.role as WorkspaceMemberRole] ?? 0

  const { viewAs } = await searchParams

  // Resolve viewAs (managers+ only, target must rank below caller)
  let viewAsUserId: string | null = null
  if (viewAs && callerRank >= ROLE_RANK.manager) {
    const admin = createAdminClient()
    const { data: targetRaw } = await admin
      .from('workspace_members')
      .select('user_id, role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', viewAs)
      .single()
    type TR = { user_id: string; role: WorkspaceMemberRole }
    const target = targetRaw as TR | null
    if (target && (ROLE_RANK[target.role] ?? 0) < callerRank) {
      viewAsUserId = target.user_id
    }
  }

  type DealRow = SageDeal & {
    contact: Pick<SageContact, 'id' | 'name' | 'email'> | null
    company: Pick<SageCompany, 'id' | 'name'> | null
    stage:   Pick<SagePipelineStage, 'id' | 'name' | 'color'> | null
  }

  const SELECT = 'id, title, value, currency, won_at, lost_at, lost_reason, created_at, updated_at, priority, tags, description, pipeline_id, contact:sage_contacts(id, name, email), company:sage_companies(id, name), stage:sage_pipeline_stages(id, name, color)'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addOwner = (q: any) => viewAsUserId ? q.eq('owner_id', viewAsUserId) : q

  const [{ data: wonData }, { data: lostData }] = await Promise.all([
    addOwner(supabase.from('sage_deals').select(SELECT).eq('workspace_id', workspaceId).eq('status', 'won')).order('won_at',  { ascending: false }),
    addOwner(supabase.from('sage_deals').select(SELECT).eq('workspace_id', workspaceId).eq('status', 'lost')).order('lost_at', { ascending: false }),
  ])

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <ProjectsClient
          projects={(wonData  ?? []) as DealRow[]}
          lostDeals={(lostData ?? []) as DealRow[]}
        />
      </div>
    </div>
  )
}
