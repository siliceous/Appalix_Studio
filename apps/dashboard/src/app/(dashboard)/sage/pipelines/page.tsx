import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { SagePipeline, SagePipelineStage, SageDeal, SageActivityLog } from '@/lib/types'
import { PipelinesClient } from './pipelines-client'
import { SageToolbar } from '@/components/dashboard/sage-toolbar'

export default async function PipelinesPage() {
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

  if (!membershipRaw) redirect('/login')
  const m = membershipRaw as { workspace_id: string; role: string }
  const workspaceId = m.workspace_id
  const canWrite = m.role !== 'viewer'
  const admin = createAdminClient()

  const [
    { data: pipelinesRaw },
    { data: dealsRaw },
    { data: dealCountsRaw },
    { data: activityRaw },
  ] = await Promise.all([
    admin
      .from('sage_pipelines')
      .select('*, stages:sage_pipeline_stages(id, name, color, position)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true }),
    admin
      .from('sage_deals')
      .select('id, title, value, currency, status, created_at, contact:sage_contacts(id, name, email)')
      .eq('workspace_id', workspaceId)
      .is('pipeline_id', null)
      .order('created_at', { ascending: false })
      .limit(100),
    admin
      .from('sage_deals')
      .select('pipeline_id')
      .eq('workspace_id', workspaceId)
      .not('pipeline_id', 'is', null),
    admin
      .from('sage_activity_log')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('entity_type', 'deal')
      .order('created_at', { ascending: false })
      .limit(40),
  ])

  // Count deals per pipeline
  const countMap = new Map<string, number>()
  for (const d of (dealCountsRaw ?? []) as { pipeline_id: string }[]) {
    countMap.set(d.pipeline_id, (countMap.get(d.pipeline_id) ?? 0) + 1)
  }

  type PipelineRow = SagePipeline & { stages: SagePipelineStage[] }
  const pipelines = ((pipelinesRaw ?? []) as PipelineRow[]).map(p => ({
    ...p,
    stages:     [...(p.stages ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    deal_count: countMap.get(p.id) ?? 0,
  }))

  type DealRow = Pick<SageDeal, 'id' | 'title' | 'value' | 'currency' | 'status' | 'created_at'> & {
    contact?: { name: string; email: string } | null
  }

  type RawDeal = { id: string; title: string; value: number | null; currency: string | null; status: string; created_at: string; contact: { id: string; name: string; email: string }[] }
  const unassignedDeals: DealRow[] = ((dealsRaw ?? []) as RawDeal[]).map(d => ({
    id:         d.id,
    title:      d.title,
    value:      d.value,
    currency:   d.currency ?? 'USD',
    status:     d.status as import('@/lib/types').SageDealStatus,
    created_at: d.created_at,
    contact:    d.contact?.[0] ?? null,
  }))

  return (
    <div className="flex flex-col">
      <SageToolbar pageKey="pipelines" />
      <div>
        <PipelinesClient
      pipelines={pipelines}
      unassignedDeals={unassignedDeals}
      activity={(activityRaw ?? []) as SageActivityLog[]}
      canWrite={canWrite}
        />
      </div>
    </div>
  )
}
