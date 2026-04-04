import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import { getDealDetail, getDealReminders } from '@/app/actions/sage'
import { DealDetailClient } from './deal-detail-client'
import type { SagePipelineStage } from '@/lib/types'

export default async function DealDetailPage({
  params,
  searchParams,
}: {
  params:       Promise<{ id: string; dealId: string }>
  searchParams: Promise<{ edit?: string }>
}) {
  const { id: pipelineId, dealId } = await params
  const { edit } = await searchParams

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
  const workspaceId = (membershipRaw as { workspace_id: string; role: string }).workspace_id

  const [
    pipelineResult,
    stagesResult,
    dealsResult,
    detailResult,
    remindersResult,
  ] = await Promise.all([
    supabase.from('sage_pipelines').select('id, name').eq('id', pipelineId).eq('workspace_id', workspaceId).single(),
    supabase.from('sage_pipeline_stages').select('*').eq('pipeline_id', pipelineId).order('position'),
    supabase
      .from('sage_deals')
      .select('id, title, value, currency, status, stage_id, close_date, priority, company_name, created_at, contact:sage_contacts(id, name)')
      .eq('pipeline_id', pipelineId)
      .eq('workspace_id', workspaceId)
      .order('created_at'),
    getDealDetail(dealId),
    getDealReminders(dealId),
  ])

  if (!pipelineResult.data) notFound()
  if (!detailResult.deal)   notFound()

  return (
    <DealDetailClient
      pipelineId={pipelineId}
      pipeline={pipelineResult.data as { id: string; name: string }}
      stages={(stagesResult.data ?? []) as SagePipelineStage[]}
      allDeals={(dealsResult.data ?? []) as unknown as { id: string; title: string; value: number | null; currency: string; status: string; stage_id: string | null; close_date: string | null; priority: string | null; created_at: string; contact: { id: string; name: string } | null }[]}
      deal={detailResult.deal}
      initialActivities={detailResult.activities}
      initialReminders={remindersResult}
      openEditForm={edit === '1'}
    />
  )
}
