import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { createAdminClient } from '@/lib/supabase/server'
import type { LeadAdSource, LeadScore } from '@/lib/types'

export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface NormalizedLead {
  name:          string
  email:         string | null
  phone:         string | null
  company:       string | null
  job_title:     string | null
  website:       string | null
  campaign_name: string | null
  ad_name:       string | null
  form_name:     string | null
}

function scoreLead(d: NormalizedLead): LeadScore {
  const count = [d.email, d.phone, d.company, d.job_title].filter(Boolean).length
  if (count >= 3) return 'high'
  if (count >= 2) return 'medium'
  return 'low'
}

function verifySignature(body: string, signature: string | null, appSecret: string): boolean {
  if (!signature) return false
  // Meta sends "sha256=<hex>"
  const sig = signature.startsWith('sha256=') ? signature.slice(7) : signature
  const expected = createHmac('sha256', appSecret).update(body, 'utf8').digest('hex')
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sig, 'hex'))
  } catch {
    return false
  }
}

/** Fetch full lead data from Meta Graph API */
async function fetchMetaLead(
  leadgenId: string,
  pageAccessToken: string,
): Promise<NormalizedLead | null> {
  try {
    const url = `https://graph.facebook.com/v19.0/${leadgenId}?fields=field_data,campaign_name,ad_name,form_name&access_token=${pageAccessToken}`
    const res = await fetch(url)
    if (!res.ok) {
      console.error(`[meta-leads] Graph API error for ${leadgenId}: ${res.status}`)
      return null
    }
    const json = await res.json() as {
      field_data?:   { name: string; values: string[] }[]
      campaign_name?: string
      ad_name?:       string
      form_name?:     string
    }

    // Normalize field_data array into key-value map
    const fields: Record<string, string> = {}
    for (const f of json.field_data ?? []) {
      fields[f.name.toLowerCase()] = f.values?.[0] ?? ''
    }

    const name =
      fields['full_name'] ||
      [fields['first_name'], fields['last_name']].filter(Boolean).join(' ') ||
      fields['name'] ||
      'Unknown'

    return {
      name,
      email:         fields['email']     || null,
      phone:         fields['phone_number'] || fields['phone'] || null,
      company:       fields['company_name'] || fields['company'] || null,
      job_title:     fields['job_title']  || null,
      website:       fields['website']    || null,
      campaign_name: json.campaign_name   || null,
      ad_name:       json.ad_name         || null,
      form_name:     json.form_name       || null,
    }
  } catch (err) {
    console.error('[meta-leads] fetchMetaLead error:', err)
    return null
  }
}

async function upsertLead(
  workspaceId: string,
  sourceId: string,
  lead: NormalizedLead,
  rawPayload: unknown,
) {
  const admin = createAdminClient()
  const score = scoreLead(lead)

  // Deduplication: check by email or phone within this workspace
  if (lead.email || lead.phone) {
    const orParts: string[] = []
    if (lead.email) orParts.push(`email.eq.${lead.email}`)
    if (lead.phone) orParts.push(`phone.eq.${lead.phone}`)

    const { data: existing } = await admin
      .from('leads')
      .select('id')
      .eq('workspace_id', workspaceId)
      .or(orParts.join(','))
      .limit(1)
      .single()

    if (existing) {
      // Update existing lead
      await admin
        .from('leads')
        .update({
          name:          lead.name,
          company:       lead.company,
          job_title:     lead.job_title,
          website:       lead.website,
          campaign_name: lead.campaign_name,
          ad_name:       lead.ad_name,
          form_name:     lead.form_name,
          lead_score:    score,
          updated_at:    new Date().toISOString(),
        })
        .eq('id', existing.id)

      await admin.from('lead_events').insert({
        lead_id:    existing.id,
        event_type: 'lead_deduplicated',
        event_data: { source: 'meta', raw_payload: rawPayload },
      })
      return
    }
  }

  // Insert new lead
  const { data: newLead } = await admin
    .from('leads')
    .insert({
      workspace_id:    workspaceId,
      source_id:       sourceId,
      source_platform: 'meta',
      name:            lead.name,
      email:           lead.email,
      phone:           lead.phone,
      company:         lead.company,
      job_title:       lead.job_title,
      website:         lead.website,
      campaign_name:   lead.campaign_name,
      ad_name:         lead.ad_name,
      form_name:       lead.form_name,
      lead_score:      score,
      pipeline_stage:  'new_lead',
      raw_payload:     rawPayload as Record<string, unknown>,
    })
    .select('id')
    .single()

  if (newLead) {
    await admin.from('lead_events').insert({
      lead_id:    (newLead as { id: string }).id,
      event_type: 'lead_created',
      event_data: { source: 'meta', score },
    })
    // Update source stats (fetch current count then increment)
    const { data: src } = await admin
      .from('lead_ad_sources')
      .select('leads_count')
      .eq('id', sourceId)
      .single()
    if (src) {
      await admin
        .from('lead_ad_sources')
        .update({
          leads_count:  ((src as { leads_count: number }).leads_count ?? 0) + 1,
          last_lead_at: new Date().toISOString(),
        })
        .eq('id', sourceId)
    }
  }
}

// ---------------------------------------------------------------------------
// GET — Meta webhook verification
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await params
  const { searchParams } = new URL(request.url)
  const mode        = searchParams.get('hub.mode')
  const verifyToken = searchParams.get('hub.verify_token')
  const challenge   = searchParams.get('hub.challenge')

  if (mode !== 'subscribe' || !verifyToken || !challenge) {
    return new NextResponse('Bad request', { status: 400 })
  }

  const admin = createAdminClient()
  const { data: source } = await admin
    .from('lead_ad_sources')
    .select('config')
    .eq('workspace_id', workspaceId)
    .eq('platform', 'meta')
    .eq('status', 'active')
    .limit(1)
    .single()

  const cfg = (source as { config: LeadAdSource['config'] } | null)?.config
  if (!cfg?.verify_token || cfg.verify_token !== verifyToken) {
    console.error('[meta-leads] verify_token mismatch for workspace', workspaceId)
    return new NextResponse('Forbidden', { status: 403 })
  }

  return new NextResponse(challenge, { status: 200 })
}

// ---------------------------------------------------------------------------
// POST — receive lead events
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await params
  const body      = await request.text()
  const signature = request.headers.get('x-hub-signature-256')

  const admin = createAdminClient()
  const { data: source } = await admin
    .from('lead_ad_sources')
    .select('id, config')
    .eq('workspace_id', workspaceId)
    .eq('platform', 'meta')
    .eq('status', 'active')
    .limit(1)
    .single()

  if (!source) {
    console.error('[meta-leads] no active meta source for workspace', workspaceId)
    return NextResponse.json({ received: true }) // Always 200 to Meta
  }

  const cfg       = (source as { id: string; config: LeadAdSource['config'] }).config
  const sourceId  = (source as { id: string }).id
  const appSecret = cfg?.app_secret ?? ''

  if (!verifySignature(body, signature, appSecret)) {
    console.error('[meta-leads] signature verification failed for workspace', workspaceId)
    return new NextResponse('Forbidden', { status: 403 })
  }

  let payload: {
    object?: string
    entry?:  { changes?: { field?: string; value?: { leadgen_id?: string } }[] }[]
  }
  try {
    payload = JSON.parse(body)
  } catch {
    return new NextResponse('Bad request', { status: 400 })
  }

  if (payload.object !== 'page') {
    return NextResponse.json({ received: true })
  }

  const pageAccessToken = cfg?.page_access_token ?? ''

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'leadgen') continue
      const leadgenId = change.value?.leadgen_id
      if (!leadgenId) continue

      const lead = await fetchMetaLead(leadgenId, pageAccessToken)
      if (!lead) continue

      await upsertLead(workspaceId, sourceId, lead, change.value)
    }
  }

  return NextResponse.json({ received: true })
}
