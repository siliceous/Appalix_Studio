import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import type { WorkspaceMember, SageDeal, SageContact, SageCompany, SagePipelineStage } from '@/lib/types'
import { ProjectsClient } from './projects-client'

export const metadata: Metadata = { title: 'Projects' }

export default async function ProjectsPage() {
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
  const workspaceId = membership.workspace_id

  type DealRow = SageDeal & {
    contact: Pick<SageContact, 'id' | 'name' | 'email'> | null
    company: Pick<SageCompany, 'id' | 'name'> | null
    stage:   Pick<SagePipelineStage, 'id' | 'name' | 'color'> | null
  }

  const SELECT = 'id, title, value, currency, won_at, lost_at, lost_reason, created_at, updated_at, priority, tags, description, pipeline_id, contact:sage_contacts(id, name, email), company:sage_companies(id, name), stage:sage_pipeline_stages(id, name, color)'

  const [{ data: wonData }, { data: lostData }] = await Promise.all([
    supabase.from('sage_deals').select(SELECT).eq('workspace_id', workspaceId).eq('status', 'won').order('won_at',  { ascending: false }),
    supabase.from('sage_deals').select(SELECT).eq('workspace_id', workspaceId).eq('status', 'lost').order('lost_at', { ascending: false }),
  ])

  return (
    <ProjectsClient
      projects={(wonData  ?? []) as DealRow[]}
      lostDeals={(lostData ?? []) as DealRow[]}
    />
  )
}
