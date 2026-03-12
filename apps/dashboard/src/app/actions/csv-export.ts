'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getWorkspaceAndUser(): Promise<{ workspaceId: string; userId: string }> {
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
  return { workspaceId: (data as { workspace_id: string }).workspace_id, userId: user.id }
}

function escapeCsv(val: unknown): string {
  const s = val == null ? '' : String(val)
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function toCsv(rows: Record<string, unknown>[], columns: { key: string; header: string }[]): string {
  const header = columns.map(c => escapeCsv(c.header)).join(',')
  const lines  = rows.map(row => columns.map(c => escapeCsv(row[c.key])).join(','))
  return [header, ...lines].join('\n')
}

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

export async function exportContacts(): Promise<{ csv: string; filename: string } | { error: string }> {
  try {
    const { workspaceId } = await getWorkspaceAndUser()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('sage_contacts')
      .select('name, email, phone, company_name, title, contact_type, source, tags, value, website_url, street, city, state, zip, country, notes, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (error) return { error: error.message }

    const columns = [
      { key: 'name',         header: 'Name' },
      { key: 'email',        header: 'Email' },
      { key: 'phone',        header: 'Phone' },
      { key: 'company_name', header: 'Company' },
      { key: 'title',        header: 'Job Title' },
      { key: 'contact_type', header: 'Type' },
      { key: 'source',       header: 'Source' },
      { key: 'tags',         header: 'Tags' },
      { key: 'value',        header: 'Value' },
      { key: 'website_url',  header: 'Website' },
      { key: 'street',       header: 'Street' },
      { key: 'city',         header: 'City' },
      { key: 'state',        header: 'State' },
      { key: 'zip',          header: 'Zip' },
      { key: 'country',      header: 'Country' },
      { key: 'notes',        header: 'Notes' },
      { key: 'created_at',   header: 'Created At' },
    ]

    // Flatten tags array to comma-separated string
    const rows = (data ?? []).map(r => ({
      ...r,
      tags: Array.isArray(r.tags) ? (r.tags as string[]).join('; ') : (r.tags ?? ''),
    })) as Record<string, unknown>[]

    return { csv: toCsv(rows, columns), filename: `contacts-${new Date().toISOString().slice(0, 10)}.csv` }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

// ---------------------------------------------------------------------------
// Deals
// ---------------------------------------------------------------------------

export async function exportDeals(pipelineId?: string): Promise<{ csv: string; filename: string } | { error: string }> {
  try {
    const { workspaceId } = await getWorkspaceAndUser()
    const supabase = await createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (supabase as any)
      .from('sage_deals')
      .select('title, value, currency, status, priority, close_date, source, tags, description, company_name, pipeline:sage_pipelines(name), stage:sage_pipeline_stages(name), contact:sage_contacts(name, email), created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (pipelineId) q = q.eq('pipeline_id', pipelineId)

    const { data, error } = await q
    if (error) return { error: error.message }

    const columns = [
      { key: 'title',         header: 'Deal Title' },
      { key: 'pipeline_name', header: 'Pipeline' },
      { key: 'stage_name',    header: 'Stage' },
      { key: 'status',        header: 'Status' },
      { key: 'value',         header: 'Value' },
      { key: 'currency',      header: 'Currency' },
      { key: 'priority',      header: 'Priority' },
      { key: 'close_date',    header: 'Close Date' },
      { key: 'contact_name',  header: 'Contact Name' },
      { key: 'contact_email', header: 'Contact Email' },
      { key: 'company_name',  header: 'Company' },
      { key: 'source',        header: 'Source' },
      { key: 'tags',          header: 'Tags' },
      { key: 'description',   header: 'Description' },
      { key: 'created_at',    header: 'Created At' },
    ]

    type DealRow = { pipeline?: { name?: string }; stage?: { name?: string }; contact?: { name?: string; email?: string }; tags?: unknown; [k: string]: unknown }
    const rows = (data ?? [] as DealRow[]).map((r: DealRow) => ({
      ...r,
      pipeline_name: r.pipeline?.name ?? '',
      stage_name:    r.stage?.name    ?? '',
      contact_name:  r.contact?.name  ?? '',
      contact_email: r.contact?.email ?? '',
      tags: Array.isArray(r.tags) ? (r.tags as string[]).join('; ') : (r.tags ?? ''),
    })) as Record<string, unknown>[]

    return { csv: toCsv(rows, columns), filename: `deals-${new Date().toISOString().slice(0, 10)}.csv` }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

// ---------------------------------------------------------------------------
// Tickets
// ---------------------------------------------------------------------------

export async function exportTickets(): Promise<{ csv: string; filename: string } | { error: string }> {
  try {
    const { workspaceId } = await getWorkspaceAndUser()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('sage_tickets')
      .select('title, status, priority, name, email, phone, description, contact_method, occurred_at, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (error) return { error: error.message }

    const columns = [
      { key: 'title',          header: 'Title' },
      { key: 'status',         header: 'Status' },
      { key: 'priority',       header: 'Priority' },
      { key: 'name',           header: 'Contact Name' },
      { key: 'email',          header: 'Contact Email' },
      { key: 'phone',          header: 'Contact Phone' },
      { key: 'contact_method', header: 'Contact Method' },
      { key: 'description',    header: 'Description' },
      { key: 'occurred_at',    header: 'Occurred At' },
      { key: 'created_at',     header: 'Created At' },
    ]

    return { csv: toCsv(data as Record<string, unknown>[], columns), filename: `tickets-${new Date().toISOString().slice(0, 10)}.csv` }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

// ---------------------------------------------------------------------------
// Leads (form / ad submissions)
// ---------------------------------------------------------------------------

export async function exportLeads(): Promise<{ csv: string; filename: string } | { error: string }> {
  try {
    const { workspaceId } = await getWorkspaceAndUser()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('leads')
      .select('name, email, phone, company, job_title, website, source_platform, campaign_name, ad_name, form_name, lead_score, pipeline_stage, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (error) return { error: error.message }

    const columns = [
      { key: 'name',           header: 'Name' },
      { key: 'email',          header: 'Email' },
      { key: 'phone',          header: 'Phone' },
      { key: 'company',        header: 'Company' },
      { key: 'job_title',      header: 'Job Title' },
      { key: 'website',        header: 'Website' },
      { key: 'source_platform',header: 'Platform' },
      { key: 'campaign_name',  header: 'Campaign' },
      { key: 'ad_name',        header: 'Ad Name' },
      { key: 'form_name',      header: 'Form Name' },
      { key: 'lead_score',     header: 'Score' },
      { key: 'pipeline_stage', header: 'Pipeline Stage' },
      { key: 'created_at',     header: 'Created At' },
    ]

    return { csv: toCsv(data as Record<string, unknown>[], columns), filename: `leads-${new Date().toISOString().slice(0, 10)}.csv` }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

// ---------------------------------------------------------------------------
// Bot conversations
// ---------------------------------------------------------------------------

export async function exportConversations(): Promise<{ csv: string; filename: string } | { error: string }> {
  try {
    const { workspaceId } = await getWorkspaceAndUser()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('conversations')
      .select('title, platform, status, sentiment, message_count, ai_priority, ai_summary, last_activity_at, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (error) return { error: error.message }

    const columns = [
      { key: 'title',            header: 'Title' },
      { key: 'platform',         header: 'Platform' },
      { key: 'status',           header: 'Status' },
      { key: 'sentiment',        header: 'Sentiment' },
      { key: 'message_count',    header: 'Messages' },
      { key: 'ai_priority',      header: 'AI Priority' },
      { key: 'ai_summary',       header: 'AI Summary' },
      { key: 'last_activity_at', header: 'Last Activity' },
      { key: 'created_at',       header: 'Created At' },
    ]

    return { csv: toCsv(data as Record<string, unknown>[], columns), filename: `conversations-${new Date().toISOString().slice(0, 10)}.csv` }
  } catch (e) {
    return { error: (e as Error).message }
  }
}
