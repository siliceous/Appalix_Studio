'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { after } from 'next/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { runProspectPipeline } from '@/lib/prospecting/pipeline'
import { pushProspectToSage } from '@/lib/prospecting/push-to-sage'

// ── Auth helper ───────────────────────────────────────────────────────────────

async function getWorkspaceId(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  if (!data) redirect('/login')
  return (data as { workspace_id: string }).workspace_id
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface IcpProfile {
  id:                   string
  workspace_id:         string
  name:                 string
  industry:             string
  market_segment:       'b2b' | 'b2c' | 'both'
  target_country:       string
  target_keywords:      string[]
  locations:            string[]
  exclude_keywords:     string[]
  services_of_interest: string[]
  is_active:            boolean
  created_at:           string
  updated_at:           string
}

export interface ProspectCompany {
  id:              string
  workspace_id:    string
  icp_id:          string | null
  job_id:          string | null
  domain:          string
  title:           string | null
  snippet:         string | null
  company_name:    string | null
  description:     string | null
  services:        string[]
  city:            string | null
  state:           string | null
  country:         string | null
  location_text:   string | null
  email_1:         string | null
  phone_1:         string | null
  emails:          string[]
  phones:          string[]
  score:           number | null
  score_tier:      'hot' | 'warm' | 'cold' | 'discarded' | null
  score_breakdown: { industry_score: number; location_score: number; service_score: number } | null
  deal_id:         string | null
  contact_id:      string | null
  status:          string
  created_at:      string
}

export interface ProspectJob {
  id:           string
  workspace_id: string
  icp_id:       string | null
  search_query: string
  location:     string | null
  status:       string
  stats:        {
    found:    number
    relevant: number
    crawled:  number
    scored:   number
    pushed:   number
  }
  error:      string | null
  created_at: string
  updated_at: string
}

// ── ICP actions ───────────────────────────────────────────────────────────────

export async function getIcpProfiles(): Promise<IcpProfile[]> {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()
  const { data } = await admin
    .from('workspace_icp_profiles')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
  return (data ?? []) as IcpProfile[]
}

export async function createIcpProfile(input: {
  name:                 string
  industry:             string
  market_segment:       'b2b' | 'b2c' | 'both'
  target_country:       string
  target_keywords:      string[]
  locations:            string[]
  exclude_keywords:     string[]
  services_of_interest: string[]
}): Promise<{ id: string; error?: string }> {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('workspace_icp_profiles')
    .insert({ workspace_id: workspaceId, ...input })
    .select('id')
    .single()
  if (error) return { id: '', error: error.message }
  revalidatePath('/sage/prospects')
  return { id: (data as { id: string }).id }
}

export async function updateIcpProfile(
  id: string,
  input: Partial<{
    name:                 string
    industry:             string
    market_segment:       'b2b' | 'b2c' | 'both'
    target_country:       string
    target_keywords:      string[]
    locations:            string[]
    exclude_keywords:     string[]
    services_of_interest: string[]
  }>,
): Promise<{ error?: string }> {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()
  const { error } = await admin
    .from('workspace_icp_profiles')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('workspace_id', workspaceId)
  if (error) return { error: error.message }
  revalidatePath('/sage/prospects')
  return {}
}

export async function deleteIcpProfile(id: string): Promise<{ error?: string }> {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()
  const { error } = await admin
    .from('workspace_icp_profiles')
    .delete()
    .eq('id', id)
    .eq('workspace_id', workspaceId)
  if (error) return { error: error.message }
  revalidatePath('/sage/prospects')
  return {}
}

// ── Search actions ────────────────────────────────────────────────────────────

export async function startProspectSearch(
  icpId:       string,
  searchQuery: string,
  location:    string,
): Promise<{ jobId: string; error?: string }> {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  // Load ICP
  const { data: icp } = await admin
    .from('workspace_icp_profiles')
    .select('*')
    .eq('id', icpId)
    .eq('workspace_id', workspaceId)
    .single()

  if (!icp) return { jobId: '', error: 'ICP not found' }

  // Create job record
  const { data: job, error } = await admin
    .from('prospect_crawl_jobs')
    .insert({
      workspace_id: workspaceId,
      icp_id:       icpId,
      search_query: searchQuery,
      location:     location || null,
      status:       'pending',
    })
    .select('id')
    .single()

  if (error || !job) return { jobId: '', error: error?.message ?? 'Failed to create job' }

  const jobId = (job as { id: string }).id

  // Run pipeline asynchronously after response is sent
  after(async () => {
    await runProspectPipeline(
      jobId,
      workspaceId,
      icp as {
        id: string; name: string; industry: string
        market_segment?: 'b2b' | 'b2c' | 'both'; target_country?: string
        target_keywords: string[]; locations: string[]
        exclude_keywords: string[]; services_of_interest: string[]
      },
      searchQuery,
      location,
    ).catch(err => console.error('[prospect] pipeline error:', err))
  })

  return { jobId }
}

export async function getProspectJob(jobId: string): Promise<ProspectJob | null> {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()
  const { data } = await admin
    .from('prospect_crawl_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('workspace_id', workspaceId)
    .single()
  return (data ?? null) as ProspectJob | null
}

export async function getProspectResults(jobId: string): Promise<ProspectCompany[]> {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()
  const { data } = await admin
    .from('prospect_companies')
    .select('*')
    .eq('job_id', jobId)
    .eq('workspace_id', workspaceId)
    .neq('status', 'filtered_out')
    .order('score', { ascending: false, nullsFirst: false })
  return (data ?? []) as ProspectCompany[]
}

export async function getRecentJobs(icpId?: string): Promise<ProspectJob[]> {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()
  let q = admin
    .from('prospect_crawl_jobs')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(10)
  if (icpId) q = q.eq('icp_id', icpId)
  const { data } = await q
  return (data ?? []) as ProspectJob[]
}

// ── Prospect actions ──────────────────────────────────────────────────────────

export async function getWorkspacePipelines(): Promise<{
  id: string
  name: string
  stages: { id: string; name: string; position: number }[]
}[]> {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()
  const { data: pipelines } = await admin
    .from('sage_pipelines')
    .select('id, name')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true })
  if (!pipelines?.length) return []
  const { data: stages } = await admin
    .from('sage_pipeline_stages')
    .select('id, name, position, pipeline_id')
    .in('pipeline_id', pipelines.map(p => p.id))
    .order('position', { ascending: true })
  return (pipelines as { id: string; name: string }[]).map(p => ({
    id:     p.id,
    name:   p.name,
    stages: ((stages ?? []) as { id: string; name: string; position: number; pipeline_id: string }[])
      .filter(s => s.pipeline_id === p.id)
      .map(s => ({ id: s.id, name: s.name, position: s.position })),
  }))
}

export async function addProspectToPipeline(
  prospectId: string,
  pipelineId?: string,
  stageId?:   string,
): Promise<{ dealId: string; error?: string }> {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  const { data: prospect } = await admin
    .from('prospect_companies')
    .select('*, icp:workspace_icp_profiles(name)')
    .eq('id', prospectId)
    .eq('workspace_id', workspaceId)
    .single()

  if (!prospect) return { dealId: '', error: 'Prospect not found' }

  const p = prospect as ProspectCompany & { icp: { name: string } | null }

  if (p.deal_id) return { dealId: p.deal_id }  // already pushed

  try {
    const result = await pushProspectToSage(
      {
        id:           p.id,
        workspace_id: workspaceId,
        domain:       p.domain,
        company_name: p.company_name,
        description:  p.description,
        emails:       p.emails,
        phones:       p.phones,
        location_text: p.location_text,
      },
      p.icp?.name ?? 'Manual',
      { pipelineId, stageId },
    )

    await admin
      .from('prospect_companies')
      .update({
        status:     'pushed',
        deal_id:    result.dealId,
        contact_id: result.contactId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', prospectId)

    revalidatePath('/sage/prospects')
    return { dealId: result.dealId }
  } catch (err) {
    return { dealId: '', error: err instanceof Error ? err.message : 'Push failed' }
  }
}

export async function ignoreProspect(prospectId: string): Promise<{ error?: string }> {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()
  const { error } = await admin
    .from('prospect_companies')
    .update({ status: 'ignored', updated_at: new Date().toISOString() })
    .eq('id', prospectId)
    .eq('workspace_id', workspaceId)
  return error ? { error: error.message } : {}
}
