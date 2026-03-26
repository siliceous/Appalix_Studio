import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { createAdminClient }           from '@/lib/supabase/server'
import { ingestLead }                  from '@/lib/ingest-lead'

export const dynamic = 'force-dynamic'

// ── Signature verification ─────────────────────────────────────────────────

function verifySignature(body: string, signature: string | null): boolean {
  const appSecret = process.env.META_APP_SECRET
  if (!appSecret || !signature) return false
  const sig      = signature.startsWith('sha256=') ? signature.slice(7) : signature
  const expected = createHmac('sha256', appSecret).update(body, 'utf8').digest('hex')
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sig, 'hex'))
  } catch {
    return false
  }
}

// ── Graph API fetch ────────────────────────────────────────────────────────

async function fetchMetaLead(leadgenId: string, pageAccessToken: string) {
  try {
    const url = `https://graph.facebook.com/v19.0/${leadgenId}?fields=field_data,campaign_name,ad_name,form_name&access_token=${pageAccessToken}`
    const res = await fetch(url)
    if (!res.ok) return null
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
  } catch {
    return null
  }
}

// ── GET — webhook verification ─────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode        = searchParams.get('hub.mode')
  const verifyToken = searchParams.get('hub.verify_token')
  const challenge   = searchParams.get('hub.challenge')

  if (mode !== 'subscribe' || !challenge) {
    return new NextResponse('Bad request', { status: 400 })
  }

  const appVerifyToken = process.env.META_APP_VERIFY_TOKEN ?? ''
  if (!appVerifyToken || verifyToken !== appVerifyToken) {
    console.error('[meta-leads/global] verify_token mismatch')
    return new NextResponse('Forbidden', { status: 403 })
  }

  return new NextResponse(challenge, { status: 200 })
}

// ── POST — receive lead events ─────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const body      = await request.text()
  const signature = request.headers.get('x-hub-signature-256')

  if (!verifySignature(body, signature)) {
    console.error('[meta-leads/global] signature verification failed')
    return new NextResponse('Forbidden', { status: 403 })
  }

  let payload: {
    object?: string
    entry?:  { id?: string; changes?: { field?: string; value?: { leadgen_id?: string; page_id?: string } }[] }[]
  }
  try {
    payload = JSON.parse(body)
  } catch {
    return new NextResponse('Bad request', { status: 400 })
  }

  if (payload.object !== 'page') return NextResponse.json({ received: true })

  const admin = createAdminClient()

  for (const entry of payload.entry ?? []) {
    const pageId = entry.id
    if (!pageId) continue

    // Look up which workspace owns this page
    const { data: source } = await admin
      .from('lead_ad_sources')
      .select('id, workspace_id, config')
      .eq('platform', 'meta')
      .eq('status', 'active')
      .contains('config', { page_id: pageId })
      .limit(1)
      .maybeSingle()

    if (!source) {
      console.warn('[meta-leads/global] no source found for page', pageId)
      continue
    }

    const cfg          = (source as { id: string; workspace_id: string; config: Record<string, string> }).config
    const workspaceId  = (source as { workspace_id: string }).workspace_id
    const sourceId     = (source as { id: string }).id
    const pageToken    = cfg?.page_access_token ?? ''

    for (const change of entry.changes ?? []) {
      if (change.field !== 'leadgen') continue
      const leadgenId = change.value?.leadgen_id
      if (!leadgenId) continue

      const lead = await fetchMetaLead(leadgenId, pageToken)
      if (!lead) continue

      await ingestLead(lead, {
        workspaceId,
        sourcePlatform: 'meta',
        sourceId,
        rawPayload:     change.value,
      })
    }
  }

  return NextResponse.json({ received: true })
}
