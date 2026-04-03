import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { normalizeFields, insertFormSubmission, triggerFormAnalysis } from '../../_shared'

export const dynamic = 'force-dynamic'

/**
 * Webflow form submission webhook handler.
 *
 * Configure in Webflow → Project Settings → Integrations → Webhooks:
 *   Trigger: Form submission
 *   URL: https://yourdomain.com/api/webhooks/webflow/{workspaceId}
 *
 * Webflow sends JSON with a `data` object containing flat key/value pairs
 * matching the form field names. A `name` field at the top level identifies
 * which form was submitted.
 *
 * Payload shape:
 * {
 *   "name": "contact-form",
 *   "site": { "id": "...", "name": "My Site" },
 *   "data": { "Name": "John", "Email": "john@example.com", "Message": "Hi" }
 * }
 *
 * Security: Webflow signs requests with HMAC-SHA256 in the
 * `x-webflow-signature` header. Falls back to ?secret=… token if configured.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params
  if (!workspaceId) return NextResponse.json({ error: 'missing workspace' }, { status: 400 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = admin as any

  const { data: integration } = await a
    .from('sage_integrations')
    .select('config')
    .eq('workspace_id', workspaceId)
    .eq('provider', 'webflow')
    .eq('status', 'connected')
    .maybeSingle()

  if (!integration) return NextResponse.json({ error: 'integration not found' }, { status: 404 })

  const storedSecret = (integration.config?.webhook_secret ?? '') as string
  const rawBody      = await req.text()

  // HMAC-SHA256 verification (Webflow sends `x-webflow-signature`)
  const sigHeader = req.headers.get('x-webflow-signature') ?? ''
  if (storedSecret && sigHeader) {
    const expected = createHmac('sha256', storedSecret).update(rawBody).digest('hex')
    try {
      if (!timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sigHeader, 'hex'))) {
        return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
      }
    } catch {
      return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
    }
  } else if (storedSecret) {
    // Fallback: plain token in query param
    const incomingSecret = new URL(req.url).searchParams.get('secret') ?? ''
    if (incomingSecret && incomingSecret !== storedSecret) {
      return NextResponse.json({ error: 'invalid secret' }, { status: 401 })
    }
  }

  let body: Record<string, unknown>
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  // Extract form data — Webflow puts field values under `data`
  const formData = body['data'] as Record<string, unknown> | undefined
  if (!formData) return NextResponse.json({ ok: true })

  const raw: Record<string, string> = {}
  for (const [k, v] of Object.entries(formData)) {
    if (typeof v === 'string' || typeof v === 'number') raw[k] = String(v)
  }

  if (Object.keys(raw).length === 0) return NextResponse.json({ ok: true })

  // Form title: prefer `name` at top level, else site name
  const site      = body['site'] as Record<string, unknown> | undefined
  const formTitle = String(body['name'] ?? site?.['name'] ?? 'Webflow Form')

  const normalizedFields = normalizeFields(raw)
  const result = await insertFormSubmission(a, workspaceId, raw, normalizedFields, 'webflow', formTitle)
  if ('error' in result) {
    console.error('[webflow webhook] insertFormSubmission error:', result.error)
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  triggerFormAnalysis(workspaceId, result.formId)
  return NextResponse.json({ ok: true })
}
