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
 * Supports both Webflow API V1 and V2 payload formats.
 *
 * V1 payload shape:
 * { "name": "contact-form", "site": {...}, "data": { "Name": "John", "Email": "..." } }
 *
 * V2 payload shape (wrapped under `payload`):
 * { "triggerType": "form_submission", "payload": { "name": "contact-form", "site": {...}, "data": { "Name": "John", "Email": "..." } } }
 *
 * Security: Webflow signs requests with HMAC-SHA256 in the
 * `x-webflow-signature` header. Falls back to ?secret=… token if configured.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params
  console.log('[webflow] incoming request, workspaceId:', workspaceId)
  if (!workspaceId) return NextResponse.json({ error: 'missing workspace' }, { status: 400 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = admin as any

  const { data: integration, error: integError } = await a
    .from('sage_integrations')
    .select('config')
    .eq('workspace_id', workspaceId)
    .eq('provider', 'webflow')
    .eq('status', 'connected')
    .maybeSingle()

  console.log('[webflow] integration lookup:', { found: !!integration, error: integError?.message })
  if (!integration) return NextResponse.json({ error: 'integration not found' }, { status: 404 })

  const storedSecret = (integration.config?.webhook_secret ?? '') as string
  const rawBody      = await req.text()
  console.log('[webflow] rawBody:', rawBody.slice(0, 500))

  // HMAC-SHA256 verification (Webflow sends `x-webflow-signature`)
  const sigHeader = req.headers.get('x-webflow-signature') ?? ''
  if (storedSecret && sigHeader) {
    const expected = createHmac('sha256', storedSecret).update(rawBody).digest('hex')
    try {
      if (!timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sigHeader, 'hex'))) {
        console.log('[webflow] invalid signature')
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
    console.log('[webflow] invalid JSON body')
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  console.log('[webflow] parsed body keys:', Object.keys(body))

  // Support both API V1 (flat) and API V2 (nested under `payload`)
  const root = (body['payload'] as Record<string, unknown> | undefined) ?? body
  console.log('[webflow] root keys:', Object.keys(root))

  // Extract form data — Webflow puts field values under `data`
  const formData = root['data'] as Record<string, unknown> | undefined
  console.log('[webflow] formData:', formData)
  if (!formData) return NextResponse.json({ ok: true })

  const raw: Record<string, string> = {}
  for (const [k, v] of Object.entries(formData)) {
    if (typeof v === 'string' || typeof v === 'number') raw[k] = String(v)
  }

  console.log('[webflow] raw fields:', raw)
  if (Object.keys(raw).length === 0) return NextResponse.json({ ok: true })

  // Form title: prefer `name` at root level, else site name
  const site      = root['site'] as Record<string, unknown> | undefined
  const formTitle = String(root['name'] ?? site?.['name'] ?? 'Webflow Form')

  const normalizedFields = normalizeFields(raw)
  const result = await insertFormSubmission(a, workspaceId, raw, normalizedFields, 'webflow', formTitle)
  if ('error' in result) {
    console.error('[webflow webhook] insertFormSubmission error:', result.error)
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  console.log('[webflow] submission inserted successfully')
  triggerFormAnalysis(workspaceId, result.formId)
  return NextResponse.json({ ok: true })
}
