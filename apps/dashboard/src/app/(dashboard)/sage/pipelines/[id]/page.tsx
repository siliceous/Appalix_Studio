import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { PipelineBoard } from '@/components/sage/pipeline-board'
import type { WorkspaceMember, SagePipeline, SagePipelineStage, SageDeal, SageContact } from '@/lib/types'

export default async function PipelineBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  const membership  = membershipRaw as Pick<WorkspaceMember, 'workspace_id'> | null
  if (!membership) redirect('/login')
  const workspaceId = membership.workspace_id

  const [
    { data: pipelineRaw },
    { data: stagesRaw },
    { data: dealsRaw },
    { data: contactsRaw },
    { data: allPipelinesRaw },
  ] = await Promise.all([
    supabase.from('sage_pipelines').select('*').eq('id', id).eq('workspace_id', workspaceId).single(),
    supabase.from('sage_pipeline_stages').select('*').eq('pipeline_id', id).order('position'),
    supabase.from('sage_deals')
      .select('id, title, value, currency, status, stage_id, close_date, priority, company_name, created_at, contact:sage_contacts(id, name)')
      .eq('pipeline_id', id)
      .eq('workspace_id', workspaceId)
      .order('created_at'),
    supabase.from('sage_contacts').select('id, name, company_name').eq('workspace_id', workspaceId).order('name'),
    supabase.from('sage_pipelines').select('id, name').eq('workspace_id', workspaceId).order('created_at'),
  ])

  if (!pipelineRaw) notFound()

  const pipeline     = pipelineRaw      as SagePipeline
  const stages       = (stagesRaw       ?? []) as SagePipelineStage[]
  const deals        = (dealsRaw        ?? []) as (SageDeal & { contact: Pick<SageContact, 'id' | 'name'> | null })[]
  const contacts     = (contactsRaw     ?? []) as Pick<SageContact, 'id' | 'name' | 'company_name'>[]
  const allPipelines = (allPipelinesRaw ?? []) as Pick<SagePipeline, 'id' | 'name'>[]
  const ownerName    = user.email ?? 'You'

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
          <p className="text-xs text-gray-400 mt-0.5">
            {stages.length} stages · {deals.length} deals
          </p>
        </div>
      </div>

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
          />
        )}
      </div>
    </div>
  )
}
