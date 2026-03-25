import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { normalizeFields, insertFormSubmission, triggerFormAnalysis } from '../../_shared'

export const dynamic = 'force-dynamic'

/**
 * Fluent Forms webhook handler.
 *
 * Configure in Fluent Forms → Settings → Webhooks → Add New Feed:
 *   Request URL: https://yourdomain.com/api/webhooks/fluent-forms/{workspaceId}
 *   Request Format: JSON
 *   Add header: X-Webhook-Secret: <your secret>   (optional)
 *
 * Fluent Forms sends form data either:
 *   a) Nested: { form: { title }, entry: { field_name: value, … } }
 *   b) Flat:   { form_title: "…", field_name: value, … }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params
  if (!workspaceId) return NextResponse.json({ error: 'missing workspace' }, { status: 400 })

  // Accept secret via header OR query param (?secret=…)
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
    .eq('provider', 'fluent_forms')
    .eq('status', 'connected')
    .maybeSingle()

  if (!integration) return NextResponse.json({ error: 'integration not found' }, { status: 404 })

  const storedSecret = integration.config?.webhook_secret ?? ''
  if (storedSecret && incomingSecret !== storedSecret) {
    return NextResponse.json({ error: 'invalid secret' }, { status: 401 })
  }

  const contentType = req.headers.get('content-type') ?? ''
  let body: Record<string, unknown> | null = null

  if (contentType.includes('application/json')) {
    body = await req.json().catch(() => null)
  } else {
    const text = await req.text().catch(() => '')
    try {
      body = JSON.parse(text)
    } catch {
      const p = new URLSearchParams(text)
      body = Object.fromEntries(p.entries())
    }
  }

  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'invalid body' }, { status: 400 })

  // Fluent Forms nested format: { form: { title }, entry: { … } }
  // Flat format: all fields at root level
  const entryObj = (body['entry'] ?? body['data']) as Record<string, unknown> | undefined
  const rawPayload: Record<string, string> = {}

  if (entryObj && typeof entryObj === 'object') {
    for (const [k, v] of Object.entries(entryObj)) {
      if (v !== null && v !== undefined) rawPayload[k] = String(v)
    }
    // Also pull top-level meta (form_title, etc.)
    for (const [k, v] of Object.entries(body)) {
      if (k === 'entry' || k === 'data' || k === 'form') continue
      if (typeof v === 'string' || typeof v === 'number') rawPayload[k] = String(v)
    }
  } else {
    // Flat: store everything at root
    for (const [k, v] of Object.entries(body)) {
      if (typeof v === 'string' || typeof v === 'number') rawPayload[k] = String(v)
    }
  }

  // Resolve form title: nested form object → top-level form_title → null
  const formObj = body['form'] as Record<string, unknown> | undefined
  const formTitle = (formObj?.['title'] ?? body['form_title']) as string | undefined

  const result = await insertFormSubmission(a, workspaceId, rawPayload, normalizeFields(rawPayload), 'fluent_forms', formTitle ?? null)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 500 })
  triggerFormAnalysis(workspaceId, result.formId)
  return NextResponse.json({ ok: true })
}
