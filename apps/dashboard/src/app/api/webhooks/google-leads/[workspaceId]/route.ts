import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { ingestLead } from '@/lib/ingest-lead'
import type { LeadAdSource } from '@/lib/types'

export const dynamic = 'force-dynamic'

// ── Payload types ─────────────────────────────────────────────────────────────

interface GoogleLeadPayload {
  google_key?:       string
  lead_id?:          string
  user_column_data?: { column_name: string; string_value?: string }[]
  campaign_id?:      string
  campaign_name?:    string
  adgroup_id?:       string
  ad_id?:            string
  form_id?:          string
  form_name?:        string
  api_version?:      string
}

// ── Normalization ─────────────────────────────────────────────────────────────

function normalizeGooglePayload(payload: GoogleLeadPayload) {
  const fields: Record<string, string> = {}
  for (const col of payload.user_column_data ?? []) {
    fields[col.column_name.toLowerCase()] = col.string_value ?? ''
  }

  const name =
    fields['full_name'] ||
    [fields['given_name'] || fields['first_name'], fields['family_name'] || fields['last_name']]
      .filter(Boolean).join(' ') ||
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

// ── POST — receive lead events from Google Ads ────────────────────────────────

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

  const incomingKey = payload.google_key ?? request.headers.get('google_key') ?? ''
  if (!webhookKey || incomingKey !== webhookKey) {
    console.error('[google-leads] webhook key mismatch for workspace', workspaceId)
    return new NextResponse('Forbidden', { status: 403 })
  }

  const lead = normalizeGooglePayload(payload)
  await ingestLead(lead, { workspaceId, sourcePlatform: 'google_ads', sourceId, rawPayload: payload })

  return NextResponse.json({ received: true })
}
