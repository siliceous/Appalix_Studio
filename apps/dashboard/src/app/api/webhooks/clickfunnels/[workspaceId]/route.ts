import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { normalizeFields, insertFormSubmission, triggerFormAnalysis } from '../../_shared'

export const dynamic = 'force-dynamic'

/**
 * ClickFunnels webhook handler (CF1 and CF2).
 *
 * Configure in ClickFunnels → Funnels → Integrations → Webhooks:
 *   Webhook URL: https://yourdomain.com/api/webhooks/clickfunnels/{workspaceId}
 *
 * CF1 sends JSON with a top-level `contact` object.
 * CF2 sends JSON with `event` + `data.contact` (or `data.order` for purchases).
 * Both are normalized to a flat field map.
 *
 * Security: X-CF-Signature (HMAC-SHA256 hex) if a webhook secret is configured,
 * OR a simple ?secret=… query-param token (same pattern as Gravity Forms).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params
  if (!workspaceId) return NextResponse.json({ error: 'missing workspace' }, { status: 400 })

  const incomingSecret =
    req.headers.get('x-cf-signature') ||
    req.headers.get('x-webhook-secret') ||
    new URL(req.url).searchParams.get('secret') ||
    ''

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = admin as any

  const { data: integration } = await a
    .from('sage_integrations')
    .select('config')
    .eq('workspace_id', workspaceId)
    .eq('provider', 'clickfunnels')
    .eq('status', 'connected')
    .maybeSingle()

  if (!integration) return NextResponse.json({ error: 'integration not found' }, { status: 404 })

  const storedSecret = (integration.config?.webhook_secret ?? '') as string
  const rawBody = await req.text()

  // HMAC verification if a secret is configured
  if (storedSecret) {
    const sigHeader = req.headers.get('x-cf-signature') ?? ''
    if (sigHeader) {
      const expected = createHmac('sha256', storedSecret).update(rawBody).digest('hex')
      try {
        if (!timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sigHeader, 'hex'))) {
          return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
        }
      } catch {
        return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
      }
    } else if (incomingSecret && incomingSecret !== storedSecret) {
      // Fallback: plain token comparison
      return NextResponse.json({ error: 'invalid secret' }, { status: 401 })
    }
  }

  let body: Record<string, unknown>
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  // Normalize CF1 and CF2 shapes into a flat field map
  const raw: Record<string, string> = {}

  // CF2: { event: "contact.created", data: { contact: {...} } }
  const cf2Contact = (body['data'] as Record<string, unknown> | undefined)?.['contact'] as Record<string, unknown> | undefined
  // CF1: { contact: { first_name, last_name, email, phone, ... } }
  const cf1Contact = body['contact'] as Record<string, unknown> | undefined

  const contact = cf2Contact ?? cf1Contact

  if (contact) {
    const firstName = String(contact['first_name'] ?? '')
    const lastName  = String(contact['last_name']  ?? '')
    if (firstName || lastName) raw['name'] = [firstName, lastName].filter(Boolean).join(' ')
    if (contact['email'])   raw['email']   = String(contact['email'])
    if (contact['phone'])   raw['phone']   = String(contact['phone'])
    if (contact['company']) raw['company'] = String(contact['company'])
    if (contact['website']) raw['website'] = String(contact['website'])
    // Capture any extra fields
    for (const [k, v] of Object.entries(contact)) {
      if (!['first_name', 'last_name', 'email', 'phone', 'company', 'website', 'id', 'created_at', 'updated_at'].includes(k)) {
        raw[k] = String(v ?? '')
      }
    }
  } else {
    // Flat payload fallback (custom webhook body)
    for (const [k, v] of Object.entries(body)) {
      if (typeof v === 'string' || typeof v === 'number') raw[k] = String(v)
    }
  }

  if (Object.keys(raw).length === 0) return NextResponse.json({ ok: true })

  const funnelName = String(
    body['funnel_name'] ??
    (body['data'] as Record<string, unknown> | undefined)?.['funnel_name'] ??
    'ClickFunnels'
  )

  const normalizedFields = normalizeFields(raw)
  const result = await insertFormSubmission(a, workspaceId, raw, normalizedFields, 'clickfunnels', funnelName)
  if ('error' in result) {
    console.error('[clickfunnels webhook] insertFormSubmission error:', result.error)
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  triggerFormAnalysis(workspaceId, result.formId)
  return NextResponse.json({ ok: true })
}
