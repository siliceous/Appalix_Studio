import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { PipelineBoard } from '@/components/sage/pipeline-board'
import { PipelineViewAsPicker } from '@/components/sage/pipeline-view-as-picker'
import type { WorkspaceMember, WorkspaceMemberSummary, WorkspaceMemberRole, SagePipeline, SagePipelineStage, SageDeal, SageContact } from '@/lib/types'
import { ROLE_RANK } from '@/lib/types'
import { getTeamMemberProfile } from '@/app/actions/team-member-profile'
import { TeamMemberBanner } from '@/components/team/team-member-banner'

export default async function PipelineBoardPage({
  params,
  searchParams,
}: {
  params:       Promise<{ id: string }>
  searchParams: Promise<{ deal?: string; viewAs?: string; activityDate?: string }>
}) {
  const { id }             = await params
  const { deal: initialDealId, viewAs, activityDate } = await searchParams
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

  const membership  = membershipRaw as Pick<WorkspaceMember, 'workspace_id' | 'role'> | null
  if (!membership) redirect('/login')
  const workspaceId = membership.workspace_id
  const callerRank  = ROLE_RANK[membership.role as WorkspaceMemberRole] ?? 0
  const isManager   = callerRank >= ROLE_RANK.manager
  const admin       = createAdminClient()

  // Resolve viewAs param (managers+ only, must be a lower-rank member)
  let viewAsUserId: string | null = null
  if (viewAs && isManager) {
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

  // Determine deal filter: viewAs → that user; manager → all; employee → own
  const dealSelect = 'id, title, value, currency, status, stage_id, close_date, priority, company_name, created_at, contact:sage_contacts(id, name)'
  const baseDealsQ = supabase.from('sage_deals').select(dealSelect).eq('pipeline_id', id).eq('workspace_id', workspaceId).order('created_at')
  const filteredDealsQ = viewAsUserId
    ? baseDealsQ.eq('owner_id', viewAsUserId)
    : isManager
      ? baseDealsQ
      : baseDealsQ.eq('owner_id', user.id)

  const [
    { data: pipelineRaw },
    { data: stagesRaw },
    { data: dealsRaw },
    { data: contactsRaw },
    { data: allPipelinesRaw },
    { data: membersRaw },
  ] = await Promise.all([
    supabase.from('sage_pipelines').select('*').eq('id', id).eq('workspace_id', workspaceId).single(),
    supabase.from('sage_pipeline_stages').select('*').eq('pipeline_id', id).order('position'),
    filteredDealsQ,
    supabase.from('sage_contacts').select('id, name, company_name').eq('workspace_id', workspaceId).order('name'),
    supabase.from('sage_pipelines').select('id, name').eq('workspace_id', workspaceId).order('created_at'),
    isManager
      ? admin.from('workspace_members').select('user_id, role').eq('workspace_id', workspaceId).not('accepted_at', 'is', null)
      : Promise.resolve({ data: [] }),
  ])

  if (!pipelineRaw) notFound()

  const pipeline     = pipelineRaw      as SagePipeline
  const stages       = (stagesRaw       ?? []) as SagePipelineStage[]
  const deals        = (dealsRaw        ?? []) as (SageDeal & { contact: Pick<SageContact, 'id' | 'name'> | null })[]
  const contacts     = (contactsRaw     ?? []) as Pick<SageContact, 'id' | 'name' | 'company_name'>[]
  const allPipelines = (allPipelinesRaw ?? []) as Pick<SagePipeline, 'id' | 'name'>[]
  const ownerName    = user.email ?? 'You'

  // Resolve team member names for the View As picker
  let teamMembers: Pick<WorkspaceMemberSummary, 'user_id' | 'name' | 'email'>[] = []
  const rawMembers = (membersRaw ?? []) as { user_id: string; role: string }[]
  if (isManager && rawMembers.length > 0) {
    const memberUserIds = rawMembers.map(m => m.user_id)
    const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const { data: profiles }  = await admin
      .from('user_profiles')
      .select('user_id, first_name, last_name')
      .in('user_id', memberUserIds)
    const profileMap = new Map((profiles ?? []).map((p: { user_id: string; first_name: string; last_name: string | null }) => [p.user_id, p]))
    teamMembers = rawMembers
      .filter(m => (ROLE_RANK[m.role as WorkspaceMemberRole] ?? 0) < callerRank && m.user_id !== user.id)
      .map(m => {
        const authUser = users.find(u => u.id === m.user_id)
        const profile  = profileMap.get(m.user_id)
        const fullName = profile ? `${profile.first_name}${profile.last_name ? ' ' + profile.last_name : ''}`.trim() : ''
        return { user_id: m.user_id, name: fullName || authUser?.email || m.user_id, email: authUser?.email ?? '' }
      })
  }

  // Fetch most recent activity timestamp per deal for the activity status dot
  const dealIds = deals.map(d => d.id)
  const dealLastActivity: Record<string, string> = {}
  if (dealIds.length > 0) {
    const { data: activityRows } = await supabase
      .from('sage_deal_activities')
      .select('deal_id, created_at')
      .in('deal_id', dealIds)
      .order('created_at', { ascending: false })
    for (const a of (activityRows ?? []) as { deal_id: string; created_at: string }[]) {
      if (!dealLastActivity[a.deal_id]) dealLastActivity[a.deal_id] = a.created_at
    }
  }

  const profileData = viewAsUserId
    ? await getTeamMemberProfile(viewAsUserId, activityDate)
    : null
  const profile = profileData && !('error' in profileData) ? profileData : null

  return (
    <div className="flex flex-col h-full">
      {/* Board header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b dark:border-white/8 bg-white dark:bg-[#232323] shrink-0">
        <Link
          href="/sage/pipelines"
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{pipeline.name}</h1>
          <p className="text-xs text-gray-400 mt-0.5">{stages.length} stages · {deals.length} deals</p>
        </div>
        <PipelineViewAsPicker
          pipelineId={id}
          teamMembers={teamMembers}
          viewAsUserId={viewAsUserId}
        />
      </div>

      {profile && (
        <TeamMemberBanner profile={profile} currentPath={`/sage/pipelines/${id}`} selectedDate={activityDate} />
      )}

      {/* Board */}
      <div className="flex-1 overflow-hidden bg-gray-50 dark:bg-[#1c1c1c] flex flex-col min-h-0">
        {stages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-400">This pipeline has no stages.</p>
          </div>
        ) : (
          <PipelineBoard
            pipelineId={pipeline.id}
            stages={stages}
            deals={deals}
            contacts={contacts}
            allPipelines={allPipelines}
            ownerName={ownerName}
            dealLastActivity={dealLastActivity}
            initialDealId={initialDealId}
            callerRole={viewAsUserId ? 'viewer' : membership.role as WorkspaceMember['role']}
          />
        )}
      </div>
    </div>
  )
}
