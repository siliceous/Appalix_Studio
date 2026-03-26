import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { createAdminClient } from '@/lib/supabase/server'
import { ingestLead } from '@/lib/ingest-lead'
import type { LeadAdSource } from '@/lib/types'

export const dynamic = 'force-dynamic'

// ── Signature verification ────────────────────────────────────────────────────

function verifySignature(body: string, signature: string | null, appSecret: string): boolean {
  if (!signature) return false
  const sig      = signature.startsWith('sha256=') ? signature.slice(7) : signature
  const expected = createHmac('sha256', appSecret).update(body, 'utf8').digest('hex')
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sig, 'hex'))
  } catch {
    return false
  }
}

// ── Graph API fetch ───────────────────────────────────────────────────────────

async function fetchMetaLead(leadgenId: string, pageAccessToken: string) {
  try {
    const url = `https://graph.facebook.com/v19.0/${leadgenId}?fields=field_data,campaign_name,ad_name,form_name&access_token=${pageAccessToken}`
    const res = await fetch(url)
    if (!res.ok) {
      console.error(`[meta-leads] Graph API error for ${leadgenId}: ${res.status}`)
      return null
    }
    const json = await res.json() as {
      field_data?:    { name: string; values: string[] }[]
      campaign_name?: string
      ad_name?:       string
      form_name?:     string
    }

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
      email:         fields['email']        || null,
      phone:         fields['phone_number'] || fields['phone'] || null,
      company:       fields['company_name'] || fields['company'] || null,
      job_title:     fields['job_title']    || null,
      website:       fields['website']      || null,
      campaign_name: json.campaign_name     || null,
      ad_name:       json.ad_name           || null,
      form_name:     json.form_name         || null,
    }
  } catch (err) {
    console.error('[meta-leads] fetchMetaLead error:', err)
    return null
  }
}

// ── GET — Meta webhook verification ──────────────────────────────────────────

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

// ── POST — receive lead events ────────────────────────────────────────────────

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
    return NextResponse.json({ received: true })
  }

  const cfg      = (source as { id: string; config: LeadAdSource['config'] }).config
  const sourceId = (source as { id: string }).id

  if (!verifySignature(body, signature, cfg?.app_secret ?? '')) {
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

      await ingestLead(lead, {
        workspaceId,
        sourcePlatform: 'meta',
        sourceId,
        rawPayload: change.value,
      })
    }
  }

  return NextResponse.json({ received: true })
}
