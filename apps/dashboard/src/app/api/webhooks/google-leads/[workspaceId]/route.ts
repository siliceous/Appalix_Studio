import { NextRequest, NextResponse } from 'next/server'
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

/**
 * Google Ads Lead Form Extensions payload shape.
 * https://support.google.com/google-ads/answer/9423895
 */
interface GoogleLeadPayload {
  google_key?:   string
  lead_id?:      string
  user_column_data?: { column_name: string; string_value?: string }[]
  campaign_id?:  string
  campaign_name?: string
  adgroup_id?:   string
  ad_id?:        string
  form_id?:      string
  form_name?:    string
  api_version?:  string
}

function normalizeGooglePayload(payload: GoogleLeadPayload): NormalizedLead {
  const fields: Record<string, string> = {}
  for (const col of payload.user_column_data ?? []) {
    fields[col.column_name.toLowerCase()] = col.string_value ?? ''
  }

  const name =
    fields['full_name'] ||
    [fields['given_name'] || fields['first_name'], fields['family_name'] || fields['last_name']]
      .filter(Boolean)
      .join(' ') ||
    'Unknown'

  return {
    name,
    email:         fields['email']        || null,
    phone:         fields['phone_number'] || fields['phone'] || null,
    company:       fields['company_name'] || fields['company'] || null,
    job_title:     fields['job_title']    || null,
    website:       fields['website']      || null,
    campaign_name: payload.campaign_name  || null,
    ad_name:       payload.ad_id          || null,
    form_name:     payload.form_name      || null,
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

  // Deduplication
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
        event_data: { source: 'google_ads', raw_payload: rawPayload },
      })
      return
    }
  }

  const { data: newLead } = await admin
    .from('leads')
    .insert({
      workspace_id:    workspaceId,
      source_id:       sourceId,
      source_platform: 'google_ads',
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
      event_data: { source: 'google_ads', score },
    })

    // Also mirror into sage_form_submissions so it appears in the Forms activity feed
    const fields = Object.fromEntries(
      Object.entries({
        name:      lead.name,
        email:     lead.email,
        phone:     lead.phone,
        company:   lead.company,
        job_title: lead.job_title,
        website:   lead.website,
        campaign:  lead.campaign_name,
        form_name: lead.form_name,
        ad_name:   lead.ad_name,
      }).filter(([, v]) => v != null)
    )
    await admin.from('sage_form_submissions').insert({
      workspace_id:    workspaceId,
      source_platform: 'google_ads',
      fields,
      raw_payload:     rawPayload as Record<string, unknown>,
      ai_priority:     score,
    })

    // Update source stats
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
// POST — receive lead events from Google Ads
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await params

  let payload: GoogleLeadPayload
  try {
    payload = await request.json() as GoogleLeadPayload
  } catch {
    return new NextResponse('Bad request', { status: 400 })
  }

  const admin = createAdminClient()
  const { data: source } = await admin
    .from('lead_ad_sources')
    .select('id, config')
    .eq('workspace_id', workspaceId)
    .eq('platform', 'google_ads')
    .eq('status', 'active')
    .limit(1)
    .single()

  if (!source) {
    console.error('[google-leads] no active Google Ads source for workspace', workspaceId)
    return NextResponse.json({ received: true })
  }

  const cfg        = (source as { id: string; config: LeadAdSource['config'] }).config
  const sourceId   = (source as { id: string }).id
  const webhookKey = cfg?.webhook_key ?? ''

  // Google sends the key in the payload itself as google_key
  const incomingKey = payload.google_key ?? request.headers.get('google_key') ?? ''
  if (!webhookKey || incomingKey !== webhookKey) {
    console.error('[google-leads] webhook key mismatch for workspace', workspaceId)
    return new NextResponse('Forbidden', { status: 403 })
  }

  const lead = normalizeGooglePayload(payload)
  await upsertLead(workspaceId, sourceId, lead, payload)

  return NextResponse.json({ received: true })
}
