'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type Provider = 'hubspot' | 'salesforce' | 'monday' | 'zoho'
type EntityType = 'contacts' | 'deals'

// ── Helpers ────────────────────────────────────────────────────────────────

async function getContext(): Promise<{ uid: string; wid: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  const wid = (data as { workspace_id: string } | null)?.workspace_id
  if (!wid) return null
  return { uid: user.id, wid }
}

async function getIntegrationConfig(wid: string, uid: string, provider: Provider): Promise<Record<string, string> | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('sage_integrations')
    .select('config, status')
    .eq('workspace_id', wid)
    .eq('user_id', uid)
    .eq('provider', provider)
    .eq('status', 'connected')
    .single()
  return (data as { config: Record<string, string> } | null)?.config ?? null
}

/** Get the connected providers for the current user's workspace */
export async function getCrmConnections(): Promise<{
  provider: Provider
  connected: boolean
  connectedAt?: string
  accountName?: string
}[]> {
  const ctx = await getContext()
  if (!ctx) return []

  const admin = createAdminClient()
  const { data } = await admin
    .from('sage_integrations')
    .select('provider, status, updated_at, config')
    .eq('workspace_id', ctx.wid)
    .eq('user_id', ctx.uid)
    .in('provider', ['hubspot', 'salesforce', 'monday', 'zoho'])

  type Row = { provider: string; status: string; updated_at: string; config: Record<string, string> }
  const rows = (data ?? []) as Row[]

  const PROVIDERS: Provider[] = ['hubspot', 'salesforce', 'monday', 'zoho']
  return PROVIDERS.map(p => {
    const row = rows.find(r => r.provider === p && r.status === 'connected')
    const accountName =
      p === 'hubspot'     ? row?.config?.hub_domain :
      p === 'salesforce'  ? row?.config?.org_id :
      p === 'monday'      ? row?.config?.account_name :
      p === 'zoho'        ? 'Zoho CRM' : undefined
    return {
      provider:    p,
      connected:   !!row,
      connectedAt: row?.updated_at,
      accountName,
    }
  })
}

/** Get recent import runs for the workspace */
export async function getImportHistory(): Promise<{
  id: string; provider: Provider; entity_type: EntityType
  status: string; total: number; imported: number; skipped: number
  error: string | null; started_at: string; finished_at: string | null
}[]> {
  const ctx = await getContext()
  if (!ctx) return []
  const admin = createAdminClient()
  const { data } = await admin
    .from('crm_imports')
    .select('*')
    .eq('workspace_id', ctx.wid)
    .order('started_at', { ascending: false })
    .limit(20)
  return (data ?? []) as never[]
}

/** Disconnect a CRM provider */
export async function disconnectCrm(provider: Provider): Promise<{ error?: string }> {
  const ctx = await getContext()
  if (!ctx) return { error: 'Not authenticated' }
  const admin = createAdminClient()
  await admin
    .from('sage_integrations')
    .update({ status: 'disconnected', updated_at: new Date().toISOString() })
    .eq('workspace_id', ctx.wid)
    .eq('user_id', ctx.uid)
    .eq('provider', provider)
  revalidatePath('/settings')
  return {}
}

// ── HubSpot import ─────────────────────────────────────────────────────────

async function importHubspotContacts(
  token: string, wid: string, uid: string, importId: string
): Promise<{ imported: number; skipped: number; error?: string }> {
  const admin  = createAdminClient()
  let imported = 0, skipped = 0, after: string | undefined

  try {
    do {
      const url = new URL('https://api.hubapi.com/crm/v3/objects/contacts')
      url.searchParams.set('limit', '100')
      url.searchParams.set('properties', 'firstname,lastname,email,phone,company,jobtitle,city,country,website,hs_lead_status,notes_last_updated')
      if (after) url.searchParams.set('after', after)

      const res  = await fetch(url.toString(), { headers: { 'Authorization': `Bearer ${token}` } })
      const body = await res.json() as {
        results?: { id: string; properties: Record<string, string | null> }[]
        paging?:  { next?: { after?: string } }
        message?: string
      }

      if (!res.ok) return { imported, skipped, error: body.message ?? 'HubSpot API error' }

      const records = body.results ?? []
      if (records.length === 0) break

      const rows = records.map(r => {
        const p = r.properties
        const firstName = p.firstname ?? ''
        const lastName  = p.lastname  ?? ''
        const name = [firstName, lastName].filter(Boolean).join(' ') || p.email || 'Unknown'
        return {
          workspace_id: wid,
          name,
          email:        p.email        ?? null,
          phone:        p.phone        ?? null,
          title:        p.jobtitle     ?? null,
          company_name: p.company      ?? null,
          city:         p.city         ?? null,
          country:      p.country      ?? null,
          website_url:  p.website      ?? null,
          source:       'hubspot' as const,
          tags:         ['hubspot-import'],
          contact_type: 'potential_customer' as const,
          created_by:   uid,
        }
      }).filter(r => r.name !== 'Unknown' || r.email)

      const { error: insertErr } = await admin
        .from('sage_contacts')
        .upsert(rows, { onConflict: 'workspace_id,email', ignoreDuplicates: true })

      if (insertErr) throw new Error(insertErr.message)
      imported += rows.length
      skipped  += records.length - rows.length
      after     = body.paging?.next?.after
    } while (after)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    await admin.from('crm_imports').update({ status: 'error', error: msg, finished_at: new Date().toISOString() }).eq('id', importId)
    return { imported, skipped, error: msg }
  }

  return { imported, skipped }
}

async function importHubspotDeals(
  token: string, wid: string, uid: string, importId: string
): Promise<{ imported: number; skipped: number; error?: string }> {
  const admin  = createAdminClient()
  let imported = 0, skipped = 0, after: string | undefined

  // Fetch pipelines to map stageId → stage label
  const stageMap = new Map<string, string>()
  try {
    const pRes  = await fetch('https://api.hubapi.com/crm/v3/pipelines/deals', { headers: { 'Authorization': `Bearer ${token}` } })
    const pBody = await pRes.json() as { results?: { stages?: { id: string; label: string }[] }[] }
    for (const pipeline of pBody.results ?? []) {
      for (const stage of pipeline.stages ?? []) stageMap.set(stage.id, stage.label)
    }
  } catch { /* non-fatal */ }

  try {
    // Fetch default pipeline id first
    const pipelineRes = await admin.from('sage_pipelines').select('id').eq('workspace_id', wid).limit(1).single()
    const pipelineId  = (pipelineRes.data as { id: string } | null)?.id
    if (!pipelineId) return { imported: 0, skipped: 0, error: 'No pipeline found — create a pipeline first' }

    // Fetch first stage of that pipeline
    const stageRes = await admin.from('sage_pipeline_stages').select('id').eq('pipeline_id', pipelineId).order('position').limit(1).single()
    const stageId  = (stageRes.data as { id: string } | null)?.id
    if (!stageId) return { imported: 0, skipped: 0, error: 'No pipeline stage found' }

    do {
      const url = new URL('https://api.hubapi.com/crm/v3/objects/deals')
      url.searchParams.set('limit', '100')
      url.searchParams.set('properties', 'dealname,amount,dealstage,closedate,hs_deal_stage_probability')
      if (after) url.searchParams.set('after', after)

      const res  = await fetch(url.toString(), { headers: { 'Authorization': `Bearer ${token}` } })
      const body = await res.json() as {
        results?: { id: string; properties: Record<string, string | null> }[]
        paging?:  { next?: { after?: string } }
        message?: string
      }
      if (!res.ok) return { imported, skipped, error: body.message ?? 'HubSpot API error' }

      const records = body.results ?? []
      if (records.length === 0) break

      const rows = records
        .filter(r => r.properties.dealname)
        .map(r => ({
          workspace_id: wid,
          pipeline_id:  pipelineId,
          stage_id:     stageId,
          title:        r.properties.dealname!,
          value:        r.properties.amount ? parseFloat(r.properties.amount) : null,
          status:       'open' as const,
          created_by:   uid,
          notes:        stageMap.get(r.properties.dealstage ?? '') ?? null,
        }))

      await admin.from('sage_deals').insert(rows)
      imported += rows.length
      after     = body.paging?.next?.after
    } while (after)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    await admin.from('crm_imports').update({ status: 'error', error: msg, finished_at: new Date().toISOString() }).eq('id', importId)
    return { imported, skipped, error: msg }
  }

  return { imported, skipped }
}

// ── Salesforce import ──────────────────────────────────────────────────────

async function importSalesforceContacts(
  token: string, instanceUrl: string, wid: string, uid: string, importId: string
): Promise<{ imported: number; skipped: number; error?: string }> {
  const admin  = createAdminClient()
  let imported = 0, skipped = 0, nextUrl: string | null = null
  const apiVer = 'v57.0'

  const soql = encodeURIComponent(
    'SELECT Id,FirstName,LastName,Email,Phone,Title,Account.Name,MailingCity,MailingCountry,Description FROM Contact LIMIT 2000'
  )

  try {
    let url: string = `${instanceUrl}/services/data/${apiVer}/query/?q=${soql}`
    do {
      const res  = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
      const body = await res.json() as {
        records?: Record<string, unknown>[]
        nextRecordsUrl?: string
        message?: string
        errorCode?: string
      }
      if (!res.ok) return { imported, skipped, error: body.message ?? body.errorCode ?? 'Salesforce API error' }

      const records = body.records ?? []
      if (records.length === 0) break

      const rows = records.map(r => {
        const first = String(r.FirstName ?? '')
        const last  = String(r.LastName  ?? '')
        const name  = [first, last].filter(Boolean).join(' ') || String(r.Email ?? 'Unknown')
        const acct  = r.Account as Record<string, unknown> | null
        return {
          workspace_id: wid,
          name,
          email:        r.Email         ? String(r.Email) : null,
          phone:        r.Phone         ? String(r.Phone) : null,
          title:        r.Title         ? String(r.Title) : null,
          company_name: acct?.Name      ? String(acct.Name) : null,
          city:         r.MailingCity   ? String(r.MailingCity) : null,
          country:      r.MailingCountry? String(r.MailingCountry) : null,
          notes:        r.Description   ? String(r.Description) : null,
          source:       'salesforce' as const,
          tags:         ['salesforce-import'],
          contact_type: 'potential_customer' as const,
          created_by:   uid,
        }
      }).filter(r => r.name !== 'Unknown' || r.email)

      await admin.from('sage_contacts').upsert(rows, { onConflict: 'workspace_id,email', ignoreDuplicates: true })
      imported += rows.length
      nextUrl   = body.nextRecordsUrl ? `${instanceUrl}${body.nextRecordsUrl}` : null
      url       = nextUrl ?? url
    } while (nextUrl)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    await admin.from('crm_imports').update({ status: 'error', error: msg, finished_at: new Date().toISOString() }).eq('id', importId)
    return { imported, skipped, error: msg }
  }

  return { imported, skipped }
}

async function importSalesforceDeals(
  token: string, instanceUrl: string, wid: string, uid: string, importId: string
): Promise<{ imported: number; skipped: number; error?: string }> {
  const admin  = createAdminClient()
  let imported = 0
  const apiVer = 'v57.0'

  try {
    const pipelineRes = await admin.from('sage_pipelines').select('id').eq('workspace_id', wid).limit(1).single()
    const pipelineId  = (pipelineRes.data as { id: string } | null)?.id
    const stageRes    = await admin.from('sage_pipeline_stages').select('id').eq('pipeline_id', pipelineId ?? '').order('position').limit(1).single()
    const stageId     = (stageRes.data as { id: string } | null)?.id
    if (!pipelineId || !stageId) return { imported: 0, skipped: 0, error: 'No pipeline found' }

    const soql    = encodeURIComponent('SELECT Id,Name,Amount,StageName,CloseDate FROM Opportunity LIMIT 2000')
    const res     = await fetch(`${instanceUrl}/services/data/${apiVer}/query/?q=${soql}`, { headers: { 'Authorization': `Bearer ${token}` } })
    const body    = await res.json() as { records?: Record<string, unknown>[]; message?: string }
    if (!res.ok)  return { imported, skipped: 0, error: body.message ?? 'Salesforce API error' }

    const rows = (body.records ?? [])
      .filter(r => r.Name)
      .map(r => ({
        workspace_id: wid,
        pipeline_id:  pipelineId,
        stage_id:     stageId,
        title:        String(r.Name),
        value:        r.Amount ? parseFloat(String(r.Amount)) : null,
        status:       'open' as const,
        notes:        r.StageName ? String(r.StageName) : null,
        created_by:   uid,
      }))

    await admin.from('sage_deals').insert(rows)
    imported = rows.length
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    await admin.from('crm_imports').update({ status: 'error', error: msg, finished_at: new Date().toISOString() }).eq('id', importId)
    return { imported, skipped: 0, error: msg }
  }

  return { imported, skipped: 0 }
}

// ── Monday.com import ──────────────────────────────────────────────────────

async function importMondayContacts(
  token: string, wid: string, uid: string, importId: string
): Promise<{ imported: number; skipped: number; error?: string }> {
  const admin  = createAdminClient()
  let imported = 0, skipped = 0

  // GraphQL — fetch all boards, then their items with column values
  const GQL = `{
    boards(limit: 50) {
      id name
      items_page(limit: 200) {
        items {
          id name
          column_values {
            id type text
          }
        }
      }
    }
  }`

  try {
    const res  = await fetch('https://api.monday.com/v2', {
      method:  'POST',
      headers: { 'Authorization': token, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ query: GQL }),
    })
    const body = await res.json() as {
      data?: { boards?: { name: string; items_page?: { items?: { id: string; name: string; column_values?: { id: string; type: string; text: string }[] }[] } }[] }
      errors?: { message: string }[]
    }

    if (body.errors?.length) return { imported, skipped, error: body.errors[0].message }

    const rows: Record<string, unknown>[] = []

    for (const board of body.data?.boards ?? []) {
      for (const item of board.items_page?.items ?? []) {
        const cols = item.column_values ?? []
        const find = (type: string) => cols.find(c => c.type === type)?.text ?? null
        const email = find('email')
        const phone = find('phone')
        const name  = item.name || email || null
        if (!name) { skipped++; continue }

        rows.push({
          workspace_id: wid,
          name,
          email,
          phone,
          source:       'manual',
          tags:         ['monday-import', board.name.toLowerCase().replace(/\s+/g, '-').slice(0, 30)],
          contact_type: 'potential_customer',
          created_by:   uid,
          notes:        `Imported from Monday.com board: ${board.name}`,
        })
      }
    }

    if (rows.length > 0) {
      await admin.from('sage_contacts').upsert(rows, { onConflict: 'workspace_id,email', ignoreDuplicates: true })
    }
    imported = rows.length
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    await admin.from('crm_imports').update({ status: 'error', error: msg, finished_at: new Date().toISOString() }).eq('id', importId)
    return { imported, skipped, error: msg }
  }

  return { imported, skipped }
}

async function importMondayDeals(
  token: string, wid: string, uid: string, importId: string
): Promise<{ imported: number; skipped: number; error?: string }> {
  const admin  = createAdminClient()
  let imported = 0

  try {
    const pipelineRes = await admin.from('sage_pipelines').select('id').eq('workspace_id', wid).limit(1).single()
    const pipelineId  = (pipelineRes.data as { id: string } | null)?.id
    const stageRes    = await admin.from('sage_pipeline_stages').select('id').eq('pipeline_id', pipelineId ?? '').order('position').limit(1).single()
    const stageId     = (stageRes.data as { id: string } | null)?.id
    if (!pipelineId || !stageId) return { imported: 0, skipped: 0, error: 'No pipeline found' }

    const GQL = `{
      boards(limit: 50) {
        id name
        items_page(limit: 200) {
          items {
            id name
            column_values { id type text }
          }
        }
      }
    }`

    const res  = await fetch('https://api.monday.com/v2', {
      method:  'POST',
      headers: { 'Authorization': token, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ query: GQL }),
    })
    const body = await res.json() as {
      data?: { boards?: { name: string; items_page?: { items?: { name: string; column_values?: { type: string; text: string }[] }[] } }[] }
    }

    const rows: Record<string, unknown>[] = []
    for (const board of body.data?.boards ?? []) {
      for (const item of board.items_page?.items ?? []) {
        if (!item.name) continue
        const cols = item.column_values ?? []
        const numericCol = cols.find(c => c.type === 'numeric')
        rows.push({
          workspace_id: wid,
          pipeline_id:  pipelineId,
          stage_id:     stageId,
          title:        item.name,
          value:        numericCol?.text ? parseFloat(numericCol.text) || null : null,
          status:       'open',
          notes:        `Imported from Monday.com board: ${board.name}`,
          created_by:   uid,
        })
      }
    }

    if (rows.length) await admin.from('sage_deals').insert(rows)
    imported = rows.length
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    await admin.from('crm_imports').update({ status: 'error', error: msg, finished_at: new Date().toISOString() }).eq('id', importId)
    return { imported, skipped: 0, error: msg }
  }

  return { imported, skipped: 0 }
}

// ── Zoho CRM import ────────────────────────────────────────────────────────

async function importZohoContacts(
  token: string, apiDomain: string, wid: string, uid: string, importId: string
): Promise<{ imported: number; skipped: number; error?: string }> {
  const admin  = createAdminClient()
  let imported = 0, skipped = 0, page = 1

  try {
    do {
      const url = `${apiDomain}/crm/v2/Contacts?page=${page}&per_page=200&fields=First_Name,Last_Name,Email,Phone,Title,Account_Name,Mailing_City,Mailing_Country,Description`
      const res  = await fetch(url, { headers: { 'Authorization': `Zoho-oauthtoken ${token}` } })

      if (res.status === 204) break // no more data
      const body = await res.json() as {
        data?: Record<string, string | null>[]
        info?: { more_records?: boolean }
        message?: string; code?: string
      }
      if (!res.ok) return { imported, skipped, error: body.message ?? body.code ?? 'Zoho API error' }

      const records = body.data ?? []
      if (records.length === 0) break

      const rows = records.map(r => {
        const name = [r.First_Name, r.Last_Name].filter(Boolean).join(' ') || r.Email || 'Unknown'
        return {
          workspace_id: wid,
          name,
          email:        r.Email          ?? null,
          phone:        r.Phone          ?? null,
          title:        r.Title          ?? null,
          company_name: r.Account_Name   ?? null,
          city:         r.Mailing_City   ?? null,
          country:      r.Mailing_Country?? null,
          notes:        r.Description    ?? null,
          source:       'manual' as const,
          tags:         ['zoho-import'],
          contact_type: 'potential_customer' as const,
          created_by:   uid,
        }
      }).filter(r => r.name !== 'Unknown' || r.email)

      await admin.from('sage_contacts').upsert(rows, { onConflict: 'workspace_id,email', ignoreDuplicates: true })
      imported += rows.length
      skipped  += records.length - rows.length

      if (!body.info?.more_records) break
      page++
    } while (true)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    await admin.from('crm_imports').update({ status: 'error', error: msg, finished_at: new Date().toISOString() }).eq('id', importId)
    return { imported, skipped, error: msg }
  }

  return { imported, skipped }
}

async function importZohoDeals(
  token: string, apiDomain: string, wid: string, uid: string, importId: string
): Promise<{ imported: number; skipped: number; error?: string }> {
  const admin  = createAdminClient()
  let imported = 0, page = 1

  try {
    const pipelineRes = await admin.from('sage_pipelines').select('id').eq('workspace_id', wid).limit(1).single()
    const pipelineId  = (pipelineRes.data as { id: string } | null)?.id
    const stageRes    = await admin.from('sage_pipeline_stages').select('id').eq('pipeline_id', pipelineId ?? '').order('position').limit(1).single()
    const stageId     = (stageRes.data as { id: string } | null)?.id
    if (!pipelineId || !stageId) return { imported: 0, skipped: 0, error: 'No pipeline found' }

    do {
      const url  = `${apiDomain}/crm/v2/Deals?page=${page}&per_page=200&fields=Deal_Name,Amount,Stage,Closing_Date`
      const res  = await fetch(url, { headers: { 'Authorization': `Zoho-oauthtoken ${token}` } })
      if (res.status === 204) break
      const body = await res.json() as {
        data?: Record<string, string | null>[]
        info?: { more_records?: boolean }
        message?: string
      }
      if (!res.ok) return { imported, skipped: 0, error: body.message ?? 'Zoho API error' }

      const records = body.data ?? []
      if (records.length === 0) break

      const rows = records
        .filter(r => r.Deal_Name)
        .map(r => ({
          workspace_id: wid,
          pipeline_id:  pipelineId,
          stage_id:     stageId,
          title:        String(r.Deal_Name),
          value:        r.Amount ? parseFloat(String(r.Amount)) : null,
          status:       'open' as const,
          notes:        r.Stage ? `Stage: ${r.Stage}` : null,
          created_by:   uid,
        }))

      await admin.from('sage_deals').insert(rows)
      imported += rows.length
      if (!body.info?.more_records) break
      page++
    } while (true)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    await admin.from('crm_imports').update({ status: 'error', error: msg, finished_at: new Date().toISOString() }).eq('id', importId)
    return { imported, skipped: 0, error: msg }
  }

  return { imported, skipped: 0 }
}

// ── Main entry point ───────────────────────────────────────────────────────

export async function runCrmImport(
  provider: Provider,
  entityType: EntityType,
): Promise<{ imported: number; skipped: number; error?: string }> {
  const ctx = await getContext()
  if (!ctx) return { imported: 0, skipped: 0, error: 'Not authenticated' }

  const config = await getIntegrationConfig(ctx.wid, ctx.uid, provider)
  if (!config) return { imported: 0, skipped: 0, error: `${provider} is not connected` }

  const admin = createAdminClient()

  // Create import run record
  const { data: importRow } = await admin
    .from('crm_imports')
    .insert({
      workspace_id: ctx.wid,
      user_id:      ctx.uid,
      provider,
      entity_type:  entityType,
      status:       'running',
    })
    .select('id')
    .single()
  const importId = (importRow as { id: string } | null)?.id ?? ''

  let result: { imported: number; skipped: number; error?: string }

  if (provider === 'hubspot') {
    result = entityType === 'contacts'
      ? await importHubspotContacts(config.access_token, ctx.wid, ctx.uid, importId)
      : await importHubspotDeals(config.access_token, ctx.wid, ctx.uid, importId)

  } else if (provider === 'salesforce') {
    result = entityType === 'contacts'
      ? await importSalesforceContacts(config.access_token, config.instance_url, ctx.wid, ctx.uid, importId)
      : await importSalesforceDeals(config.access_token, config.instance_url, ctx.wid, ctx.uid, importId)

  } else if (provider === 'monday') {
    result = entityType === 'contacts'
      ? await importMondayContacts(config.access_token, ctx.wid, ctx.uid, importId)
      : await importMondayDeals(config.access_token, ctx.wid, ctx.uid, importId)

  } else { // zoho
    result = entityType === 'contacts'
      ? await importZohoContacts(config.access_token, config.api_domain ?? 'https://www.zohoapis.com', ctx.wid, ctx.uid, importId)
      : await importZohoDeals(config.access_token, config.api_domain ?? 'https://www.zohoapis.com', ctx.wid, ctx.uid, importId)
  }

  // Update import run record
  if (importId) {
    await admin.from('crm_imports').update({
      status:      result.error ? 'error' : 'done',
      total:       result.imported + result.skipped,
      imported:    result.imported,
      skipped:     result.skipped,
      error:       result.error ?? null,
      finished_at: new Date().toISOString(),
    }).eq('id', importId)
  }

  revalidatePath('/sage/contacts')
  revalidatePath('/sage/pipelines')
  revalidatePath('/settings')
  return result
}
