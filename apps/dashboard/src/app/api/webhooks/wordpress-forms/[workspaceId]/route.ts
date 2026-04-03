import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { normalizeFields, insertFormSubmission, triggerFormAnalysis } from '../../_shared'

export const dynamic = 'force-dynamic'

/**
 * Generic WordPress form submission webhook handler.
 *
 * Works with any WordPress form plugin that supports webhooks:
 *   - Contact Form 7 (via CF7 to Webhook plugin)
 *   - Elementor Forms (built-in webhook action)
 *   - WPForms (Pro webhook add-on)
 *   - Formidable Forms
 *   - Ninja Forms
 *
 * Webhook URL: https://yourdomain.com/api/webhooks/wordpress-forms/{workspaceId}
 * Add ?secret=<your-secret> to enable token validation.
 *
 * Supported payload shapes:
 *   1. Flat JSON:  { "your-name": "John", "your-email": "john@example.com" }
 *   2. Elementor: { "fields": [{ "id": "name", "title": "Name", "value": "John" }], "form_name": "Contact" }
 *   3. Form-encoded (some CF7 setups)
 *
 * Security: ?secret=<token> query param (same pattern as Gravity Forms).
 * The secret is optional — if not configured all requests are accepted.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params
  if (!workspaceId) return NextResponse.json({ error: 'missing workspace' }, { status: 400 })

  const incomingSecret =
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
    .eq('provider', 'wordpress_forms')
    .eq('status', 'connected')
    .maybeSingle()

  if (!integration) return NextResponse.json({ error: 'integration not found' }, { status: 404 })

  const storedSecret = (integration.config?.webhook_secret ?? '') as string
  if (storedSecret && incomingSecret !== storedSecret) {
    return NextResponse.json({ error: 'invalid secret' }, { status: 401 })
  }

  // Parse body — JSON or form-encoded
  const contentType = req.headers.get('content-type') ?? ''
  let body: Record<string, unknown> = {}

  if (contentType.includes('application/json')) {
    body = await req.json().catch(() => ({}))
  } else {
    const text = await req.text().catch(() => '')
    try {
      body = JSON.parse(text)
    } catch {
      const urlParams = new URLSearchParams(text)
      body = Object.fromEntries(urlParams.entries())
    }
  }

  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'invalid body' }, { status: 400 })

  const raw: Record<string, string> = {}

  // Elementor shape: { fields: [{ id, title, value }], form_name }
  const elementorFields = body['fields'] as Array<{ id?: string; title?: string; value?: unknown }> | undefined
  if (Array.isArray(elementorFields)) {
    for (const field of elementorFields) {
      const key   = field.title || field.id || 'field'
      const value = field.value
      if (value !== undefined && value !== null) raw[key] = String(value)
    }
    if (body['form_name']) raw['form_title'] = String(body['form_name'])
    if (body['form_id'])   raw['form_id']    = String(body['form_id'])
  } else {
    // Flat JSON or form-encoded (CF7, WPForms, Ninja Forms, etc.)
    for (const [k, v] of Object.entries(body)) {
      if (typeof v === 'string' || typeof v === 'number') raw[k] = String(v)
    }
  }

  if (Object.keys(raw).length === 0) return NextResponse.json({ ok: true })

  const formTitle = String(raw['form_title'] ?? raw['form_name'] ?? body['form_name'] ?? 'WordPress Form')

  const normalizedFields = normalizeFields(raw)
  const result = await insertFormSubmission(a, workspaceId, raw, normalizedFields, 'wordpress_forms', formTitle)
  if ('error' in result) {
    console.error('[wordpress-forms webhook] insertFormSubmission error:', result.error)
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  triggerFormAnalysis(workspaceId, result.formId)
  return NextResponse.json({ ok: true })
}
