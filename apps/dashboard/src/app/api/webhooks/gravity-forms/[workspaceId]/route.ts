import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Gravity Forms webhook handler.
 *
 * Configure in Gravity Forms → Webhooks Add-On:
 *   Request URL: https://yourdomain.com/api/webhooks/gravity-forms/{workspaceId}
 *   Request Format: JSON
 *   Request Headers: X-Webhook-Secret: <your secret>
 *
 * Payload keys vary by form — we store everything in `fields`.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params
  if (!workspaceId) return NextResponse.json({ error: 'missing workspace' }, { status: 400 })

  // Accept secret via header OR query param (?secret=...) — GF free tier has no custom headers UI
  const incomingSecret =
    req.headers.get('x-webhook-secret') ||
    new URL(req.url).searchParams.get('secret') ||
    ''

  console.log('[GF webhook] workspaceId:', workspaceId)
  console.log('[GF webhook] secret source:', req.headers.get('x-webhook-secret') ? 'header' : 'query')
  console.log('[GF webhook] content-type:', req.headers.get('content-type'))

  // Secret is optional — verified below once we load the stored config

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = admin as any

  const { data: integration, error: dbError } = await a
    .from('sage_integrations')
    .select('config')
    .eq('workspace_id', workspaceId)
    .eq('provider', 'gravity_forms')
    .eq('status', 'connected')
    .maybeSingle()

  if (dbError) {
    console.error('[GF webhook] DB error:', dbError)
    return NextResponse.json({ error: 'db error' }, { status: 500 })
  }
  if (!integration) {
    console.error('[GF webhook] No connected gravity_forms integration for workspace:', workspaceId)
    return NextResponse.json({ error: 'integration not found' }, { status: 404 })
  }

  const storedSecret = integration.config?.webhook_secret ?? ''
  // Only enforce secret if one is configured — if none stored, accept all requests
  if (storedSecret && incomingSecret !== storedSecret) {
    console.error('[GF webhook] Secret mismatch. Stored:(set) Incoming:', incomingSecret ? '(set)' : '(empty)')
    return NextResponse.json({ error: 'invalid secret' }, { status: 401 })
  }

  // GF can send either JSON or form-encoded depending on version
  const contentType = req.headers.get('content-type') ?? ''
  let body: Record<string, unknown> | null = null

  if (contentType.includes('application/json')) {
    body = await req.json().catch(() => null)
  } else {
    // Fallback: parse as form-encoded (some GF versions do this even with JSON selected)
    const text = await req.text().catch(() => '')
    console.log('[GF webhook] raw body (non-JSON):', text.slice(0, 500))
    try {
      body = JSON.parse(text)
    } catch {
      // try form-encoded
      const params = new URLSearchParams(text)
      body = Object.fromEntries(params.entries())
    }
  }

  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'invalid body' }, { status: 400 })

  console.log('[GF webhook] body keys:', Object.keys(body))

  // Flatten: GF sends field values under numeric keys or label keys
  const fields: Record<string, string> = {}
  for (const [k, v] of Object.entries(body)) {
    if (typeof v === 'string' || typeof v === 'number') {
      fields[k] = String(v)
    }
  }

  const formTitle = (body['form_title'] ?? body['form_name']) as string | undefined

  const err = await insertSubmission(a, workspaceId, fields, 'gravity_forms', formTitle ?? null)
  if (err) return NextResponse.json({ error: err }, { status: 500 })
  return NextResponse.json({ ok: true })
}

async function insertSubmission(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  a: any,
  workspaceId: string,
  fields: Record<string, string>,
  source: string,
  formTitle: string | null,
): Promise<string | null> {
  const formName = formTitle ?? `${source.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} Submissions`

  let { data: form } = await a
    .from('sage_forms')
    .select('id')
    .eq('workspace_id', workspaceId)
    .ilike('name', formName)
    .maybeSingle()

  if (!form) {
    const { data: owner } = await a
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', workspaceId)
      .eq('role', 'owner')
      .limit(1)
      .maybeSingle()

    const { data: newForm, error: formErr } = await a
      .from('sage_forms')
      .insert({ workspace_id: workspaceId, name: formName, is_active: true, created_by: owner?.user_id ?? null })
      .select('id')
      .single()
    if (formErr) return `sage_forms insert failed: ${formErr.message}`
    form = newForm
  }

  if (!form?.id) return 'no form id after insert'

  const { error: subErr } = await a.from('sage_form_submissions').insert({
    workspace_id:    workspaceId,
    form_id:         form.id,
    source_platform: source,
    fields,
  })
  if (subErr) return `sage_form_submissions insert failed: ${subErr.message}`

  return null
}
