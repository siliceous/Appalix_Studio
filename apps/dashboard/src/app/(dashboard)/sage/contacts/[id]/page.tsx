import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import type { WorkspaceMember, WorkspaceMemberSummary, SageContact, SageActivityLog, SageDeal, SagePipelineStage, SagePipeline, SageTicket } from '@/lib/types'
import { ContactDetailClient } from './contact-detail-client'

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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

  const membership  = membershipRaw as Pick<WorkspaceMember, 'workspace_id'> | null
  if (!membership) redirect('/login')
  const workspaceId = membership.workspace_id
  const admin = createAdminClient()

  const [
    { data: contactRaw },
    { data: activityRaw },
    { data: dealsRaw },
    { data: ticketsRaw },
    { data: pipelinesRaw },
    { data: membersRaw },
  ] = await Promise.all([
    supabase.from('sage_contacts').select('*').eq('id', id).eq('workspace_id', workspaceId).single(),
    supabase.from('sage_activity_log').select('*').eq('entity_id', id).order('created_at', { ascending: false }).limit(50),
    supabase.from('sage_deals')
      .select('id, title, value, currency, status, pipeline_id, stage_id, stage:sage_pipeline_stages(name, color), created_at')
      .eq('contact_id', id).eq('workspace_id', workspaceId).order('created_at', { ascending: false }),
    supabase.from('sage_tickets')
      .select('*, contact:sage_contacts(id, name, email)')
      .eq('contact_id', id).eq('workspace_id', workspaceId).order('created_at', { ascending: false }),
    supabase.from('sage_pipelines')
      .select('id, name, stages:sage_pipeline_stages(id, name, color, position)')
      .eq('workspace_id', workspaceId).order('created_at', { ascending: true }),
    admin.from('workspace_members').select('user_id, role').eq('workspace_id', workspaceId).not('accepted_at', 'is', null),
  ])

  if (!contactRaw) notFound()

  const contact  = contactRaw as SageContact
  const activity = (activityRaw ?? []) as SageActivityLog[]
  const deals    = (dealsRaw ?? []) as (SageDeal & { pipeline_id: string | null; stage: { name: string; color: string } | null })[]
  const tickets  = (ticketsRaw ?? []) as (SageTicket & { contact: Pick<SageContact, 'id' | 'name' | 'email'> | null })[]

  const firstPipeline = (pipelinesRaw?.[0] ?? null) as ({ id: string; name: string; stages: SagePipelineStage[] } | null)
  const allPipelines  = ((pipelinesRaw ?? []) as { id: string; name: string }[]).map(p => ({ id: p.id, name: p.name })) as Pick<SagePipeline, 'id' | 'name'>[]

  // Resolve member names
  const memberUserIds = (membersRaw ?? []).map((m: { user_id: string; role: string }) => m.user_id)
  let members: WorkspaceMemberSummary[] = []
  if (memberUserIds.length > 0) {
    const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const { data: profiles } = await admin
      .from('user_profiles')
      .select('user_id, first_name, last_name')
      .in('user_id', memberUserIds)
    const profileMap = new Map((profiles ?? []).map((p: { user_id: string; first_name: string; last_name: string | null }) => [p.user_id, p]))
    members = (membersRaw ?? []).map((m: { user_id: string; role: string }) => {
      const authUser = users.find(u => u.id === m.user_id)
      const profile  = profileMap.get(m.user_id)
      const name     = profile ? `${profile.first_name}${profile.last_name ? ' ' + profile.last_name : ''}`.trim() : ''
      return { user_id: m.user_id, name, email: authUser?.email ?? '', role: m.role as WorkspaceMemberSummary['role'] }
    })
  }

  return (
    <ContactDetailClient
      contact={contact}
      activity={activity}
      deals={deals}
      tickets={tickets}
      firstPipeline={firstPipeline}
      allPipelines={allPipelines}
      members={members}
      ownerEmail={user.email ?? ''}
    />
  )
}
