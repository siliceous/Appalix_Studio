import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient }         from '@/lib/supabase/server'
import { ingestLead }                from '@/lib/ingest-lead'
import crypto                        from 'crypto'

export const dynamic = 'force-dynamic'

// ── Verify TikTok webhook signature ─────────────────────────────────────────

function verifySignature(body: string, signature: string, clientSecret: string): boolean {
  const expected = crypto
    .createHmac('sha256', clientSecret)
    .update(body)
    .digest('hex')
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}

// ── Fetch lead details from TikTok API ──────────────────────────────────────

async function fetchTikTokLead(
  leadId:       string,
  advertiserId: string,
  accessToken:  string,
): Promise<{
  name:          string
  email:         string | null
  phone:         string | null
  company:       string | null
  job_title:     string | null
  website:       string | null
  campaign_name: string | null
  ad_name:       string | null
  form_name:     string | null
  extra:         Record<string, string>
} | null> {
  try {
    const res = await fetch(
      `https://business-api.tiktok.com/open_api/v1.3/leads/?advertiser_id=${advertiserId}&lead_id=${leadId}`,
      { headers: { 'Access-Token': accessToken } },
    )
    if (!res.ok) {
      console.error('[tiktok webhook] lead fetch failed:', res.status, await res.text())
      return null
    }
    const data = await res.json() as {
      data?: {
        lead_list?: {
          lead_id?:       string
          form_name?:     string
          ad_name?:       string
          campaign_name?: string
          answers?: { field_id?: string; field_name?: string; answer?: string }[]
        }[]
      }
    }

    const lead = data.data?.lead_list?.[0]
    if (!lead) return null

    const fields: Record<string, string> = {}
    for (const a of (lead.answers ?? [])) {
      if (a.field_name && a.answer) {
        fields[a.field_name.toLowerCase().replace(/\s+/g, '_')] = a.answer
      }
    }

    const name =
      [fields['first_name'], fields['last_name']].filter(Boolean).join(' ') ||
      fields['full_name'] ||
      fields['name'] ||
      'Unknown'

    return {
      name,
      email:         fields['email']        || fields['email_address']          || null,
      phone:         fields['phone']        || fields['phone_number']           || null,
      company:       fields['company']      || fields['company_name']           || null,
      job_title:     fields['job_title']    || fields['title'] || fields['position'] || null,
      website:       fields['website']      || null,
      campaign_name: lead.campaign_name     || null,
      ad_name:       lead.ad_name           || null,
      form_name:     lead.form_name         || null,
      extra:         fields,
    }
  } catch (err) {
    console.error('[tiktok webhook] fetchTikTokLead error:', err)
    return null
  }
}

// ── GET — TikTok webhook verification challenge ──────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const timestamp  = searchParams.get('timestamp')
  const nonce      = searchParams.get('nonce')
  const secret     = process.env.TIKTOK_CLIENT_SECRET ?? ''

  if (timestamp && nonce) {
    // Construct verification response
    const plainText = `${nonce}${timestamp}${secret}`
    const hash = crypto.createHash('sha256').update(plainText).digest('hex')
    return NextResponse.json({ verification_code: hash })
  }

  return new NextResponse('OK', { status: 200 })
}

// ── POST — receive lead events ───────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET ?? ''

  // Verify signature if secret is configured
  const signature = request.headers.get('x-tiktok-signature') ?? ''
  if (clientSecret && signature) {
    if (!verifySignature(rawBody, signature, clientSecret)) {
      console.warn('[tiktok webhook] invalid signature')
      return new NextResponse('Unauthorized', { status: 401 })
    }
  }

  let payload: {
    advertiser_id?: string
    leads?: {
      lead_id?:    string
      form_id?:    string
      ad_id?:      string
      campaign_id?: string
    }[]
    // TikTok may also send event-style payloads
    data?: {
      advertiser_id?: string
      lead_id?:       string
    }
  }
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return new NextResponse('Bad request', { status: 400 })
  }

  const admin = createAdminClient()

  // Normalise — TikTok may send different payload shapes
  const advertiserId = payload.advertiser_id ?? payload.data?.advertiser_id ?? ''
  const leadEntries  = payload.leads ?? (payload.data?.lead_id ? [{ lead_id: payload.data.lead_id }] : [])

  if (!leadEntries.length) {
    return NextResponse.json({ received: true })
  }

  // Look up source by advertiser_id
  type SourceRow = { id: string; workspace_id: string; config: Record<string, string> }
  let source: SourceRow | null = null

  if (advertiserId) {
    const { data } = await admin
      .from('lead_ad_sources')
      .select('id, workspace_id, config')
      .eq('platform', 'tiktok')
      .eq('status', 'active')
      .contains('config', { advertiser_id: advertiserId })
      .limit(1)
      .maybeSingle()
    source = data as unknown as SourceRow | null
  }

  if (!source) {
    // Fall back to any active TikTok source
    const { data } = await admin
      .from('lead_ad_sources')
      .select('id, workspace_id, config')
      .eq('platform', 'tiktok')
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()
    source = data as unknown as SourceRow | null
  }

  if (!source) {
    console.warn('[tiktok webhook] no source found for advertiser_id:', advertiserId)
    return NextResponse.json({ received: true })
  }

  const accessToken  = source.config?.access_token
  const sourceAdId   = source.config?.advertiser_id ?? advertiserId
  if (!accessToken) return NextResponse.json({ received: true })

  for (const entry of leadEntries) {
    const leadId = entry.lead_id
    if (!leadId) continue

    const lead = await fetchTikTokLead(leadId, sourceAdId, accessToken)
    if (!lead) continue

    await ingestLead(lead, {
      workspaceId:    source.workspace_id,
      sourcePlatform: 'tiktok',
      sourceId:       source.id,
      rawPayload:     entry,
    })
  }

  return NextResponse.json({ received: true })
}
