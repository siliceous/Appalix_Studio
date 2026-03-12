'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

export interface ImportResult {
  imported: number
  skipped:  number
  errors:   string[]
}

// ---------------------------------------------------------------------------
// Contacts import
//
// Accepted CSV columns (case-insensitive, spaces → underscores):
//   name*, email, phone, company / company_name, title / job_title,
//   contact_type, source, tags, value, website / website_url,
//   street, city, state, zip, country, notes
//
// Deduplication: existing contact with same email is updated (upsert).
// Rows without a name are skipped.
// ---------------------------------------------------------------------------

type CsvRow = Record<string, string>

function normalise(row: CsvRow): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(row)) {
    out[k.trim().toLowerCase().replace(/\s+/g, '_')] = v?.trim() ?? ''
  }
  return out
}

function col(row: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) if (row[k]) return row[k]
  return ''
}

export async function importContacts(rows: CsvRow[]): Promise<ImportResult> {
  const workspaceId = await getWorkspaceId()
  const admin       = createAdminClient()

  let imported = 0
  let skipped  = 0
  const errors: string[] = []

  for (const rawRow of rows) {
    const row = normalise(rawRow)

    const name = col(row, 'name', 'full_name', 'contact_name')
    if (!name) { skipped++; continue }

    const email      = col(row, 'email', 'email_address') || null
    const phone      = col(row, 'phone', 'phone_number', 'mobile') || null
    const company    = col(row, 'company', 'company_name', 'organization') || null
    const title      = col(row, 'title', 'job_title', 'position') || null
    const type       = col(row, 'contact_type', 'type') || null
    const source     = col(row, 'source') || null
    const rawTags    = col(row, 'tags')
    const tags       = rawTags ? rawTags.split(/[;|,]/).map(t => t.trim()).filter(Boolean) : []
    const value      = col(row, 'value')
    const website    = col(row, 'website', 'website_url') || null
    const street     = col(row, 'street', 'address') || null
    const city       = col(row, 'city') || null
    const state      = col(row, 'state', 'province') || null
    const zip        = col(row, 'zip', 'postcode', 'postal_code') || null
    const country    = col(row, 'country') || null
    const notes      = col(row, 'notes', 'description') || null

    try {
      const record: Record<string, unknown> = {
        workspace_id: workspaceId,
        name,
        email,
        phone,
        company_name: company,
        title,
        contact_type: type,
        source,
        tags,
        website_url:  website,
        street,
        city,
        state,
        zip,
        country,
        notes,
      }
      if (value) record.value = parseFloat(value.replace(/[^0-9.]/g, '')) || null

      if (email) {
        // Upsert by email within workspace
        const { error } = await admin
          .from('sage_contacts')
          .upsert(record, { onConflict: 'workspace_id,email', ignoreDuplicates: false })
        if (error) { errors.push(`Row "${name}": ${error.message}`); continue }
      } else {
        // No email — always insert (can't reliably dedup)
        const { error } = await admin
          .from('sage_contacts')
          .insert(record)
        if (error) { errors.push(`Row "${name}": ${error.message}`); continue }
      }

      imported++
    } catch (e) {
      errors.push(`Row "${name}": ${(e as Error).message}`)
    }
  }

  return { imported, skipped, errors }
}

// ---------------------------------------------------------------------------
// Deals import
//
// Accepted CSV columns:
//   title*, pipeline (name), stage (name), status, value, currency,
//   priority, close_date, contact_email / contact_name, company_name,
//   source, tags, description
//
// Contact matched by email; if not found, contact_name used for company_name.
// Pipeline matched by name; if not found, first pipeline used.
// ---------------------------------------------------------------------------

export async function importDeals(rows: CsvRow[]): Promise<ImportResult> {
  const workspaceId = await getWorkspaceId()
  const supabase    = await createClient()
  const admin       = createAdminClient()

  let imported = 0
  let skipped  = 0
  const errors: string[] = []

  // Pre-fetch pipelines + stages
  const { data: pipelines } = await supabase
    .from('sage_pipelines')
    .select('id, name')
    .eq('workspace_id', workspaceId)

  const { data: stages } = await supabase
    .from('sage_pipeline_stages')
    .select('id, name, pipeline_id')
    .eq('workspace_id', workspaceId)

  if (!pipelines || pipelines.length === 0) {
    return { imported: 0, skipped: rows.length, errors: ['No pipelines found — create a pipeline first.'] }
  }

  type Pipeline = { id: string; name: string }
  type Stage    = { id: string; name: string; pipeline_id: string }

  const pipelineByName = new Map<string, Pipeline>(
    (pipelines as Pipeline[]).map(p => [p.name.toLowerCase(), p])
  )
  const defaultPipeline = (pipelines as Pipeline[])[0]

  const stagesByPipeline = new Map<string, Stage[]>()
  for (const s of (stages ?? []) as Stage[]) {
    if (!stagesByPipeline.has(s.pipeline_id)) stagesByPipeline.set(s.pipeline_id, [])
    stagesByPipeline.get(s.pipeline_id)!.push(s)
  }

  for (const rawRow of rows) {
    const row = normalise(rawRow)

    const title = col(row, 'title', 'deal_title', 'deal_name', 'name')
    if (!title) { skipped++; continue }

    try {
      // Resolve pipeline
      const pipelineName = col(row, 'pipeline', 'pipeline_name')
      const pipeline     = (pipelineName ? pipelineByName.get(pipelineName.toLowerCase()) : null) ?? defaultPipeline

      // Resolve stage
      const stageName    = col(row, 'stage', 'stage_name')
      const pipelineStages = stagesByPipeline.get(pipeline.id) ?? []
      const stage        = stageName
        ? (pipelineStages.find(s => s.name.toLowerCase() === stageName.toLowerCase()) ?? pipelineStages[0])
        : pipelineStages[0]

      // Resolve contact by email
      let contactId: string | null = null
      const contactEmail = col(row, 'contact_email', 'email')
      if (contactEmail) {
        const { data: contact } = await supabase
          .from('sage_contacts')
          .select('id')
          .eq('workspace_id', workspaceId)
          .eq('email', contactEmail.toLowerCase())
          .maybeSingle()
        contactId = (contact as { id: string } | null)?.id ?? null
      }

      const rawValue  = col(row, 'value', 'deal_value', 'amount')
      const value     = rawValue ? parseFloat(rawValue.replace(/[^0-9.]/g, '')) || null : null
      const currency  = col(row, 'currency') || 'USD'
      const status    = col(row, 'status') || 'open'
      const priority  = col(row, 'priority') || null
      const closeDate = col(row, 'close_date', 'closing_date') || null
      const source    = col(row, 'source') || null
      const rawTags   = col(row, 'tags')
      const tags      = rawTags ? rawTags.split(/[;|,]/).map(t => t.trim()).filter(Boolean) : []
      const desc      = col(row, 'description', 'notes') || null
      const company   = col(row, 'company_name', 'company') || null

      const record: Record<string, unknown> = {
        workspace_id: workspaceId,
        pipeline_id:  pipeline.id,
        stage_id:     stage?.id ?? null,
        contact_id:   contactId,
        title,
        value,
        currency,
        status,
        priority:     priority || null,
        close_date:   closeDate || null,
        source,
        tags,
        description:  desc,
        company_name: company,
      }

      const { error } = await admin.from('sage_deals').insert(record)
      if (error) { errors.push(`Row "${title}": ${error.message}`); continue }

      imported++
    } catch (e) {
      errors.push(`Row "${title}": ${(e as Error).message}`)
    }
  }

  return { imported, skipped, errors }
}
