import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { normalizeFields, insertFormSubmission, triggerFormAnalysis } from '../../_shared'

export const dynamic = 'force-dynamic'

/**
 * Webflow form submission webhook handler.
 *
 * Configure in Webflow → Site Settings → Apps & Integrations → Webhooks → Add Webhook:
 *   Trigger: Form submission
 *   URL: https://app.appalix.ai/api/webhooks/webflow/{workspaceId}
 *
 * Supports both Webflow API V1 and V2 payload formats.
 *
 * V1 payload shape:
 * { "name": "contact-form", "site": {...}, "data": { "Name": "John", "Email": "..." } }
 *
 * V2 payload shape (wrapped under `payload`):
 * { "triggerType": "form_submission", "payload": { "name": "contact-form", "site": {...}, "data": { "Name": "John", "Email": "..." } } }
 *
 * Security: if a webflow_signing_secret is saved in the integration config,
 * requests are verified via HMAC-SHA256 in the `x-webflow-signature` header.
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

  const storedSecret = (integration.config?.webflow_signing_secret as string | undefined)?.trim() ?? ''
  const rawBody      = await req.text()

  // Only verify signature if a secret has been explicitly configured
  if (storedSecret) {
    const sigHeader = req.headers.get('x-webflow-signature') ?? ''
    if (sigHeader) {
      try {
        const expected = createHmac('sha256', storedSecret).update(rawBody).digest('hex')
        const expectedBuf = Buffer.from(expected, 'hex')
        const sigBuf      = Buffer.from(sigHeader, 'hex')
        if (expectedBuf.length !== sigBuf.length || !timingSafeEqual(expectedBuf, sigBuf)) {
          return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
        }
      } catch {
        return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
      }
    }
    // No sig header — fall through and accept (Webflow may not send it on all plans)
  }
  // No stored secret — accept all requests from Webflow

  let body: Record<string, unknown>
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  // Support both API V1 (flat) and API V2 (nested under `payload`)
  const root = (body['payload'] as Record<string, unknown> | undefined) ?? body

  // Extract form data — Webflow puts field values under `data`
  const formData = root['data'] as Record<string, unknown> | undefined
  if (!formData) return NextResponse.json({ ok: true })

  const raw: Record<string, string> = {}
  for (const [k, v] of Object.entries(formData)) {
    if (typeof v === 'string' || typeof v === 'number') raw[k] = String(v)
  }

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
  triggerFormAnalysis(workspaceId, result.formId)
  return NextResponse.json({ ok: true })
}
