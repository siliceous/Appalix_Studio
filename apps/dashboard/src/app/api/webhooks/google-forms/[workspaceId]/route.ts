import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { normalizeFields, insertFormSubmission, triggerFormAnalysis } from '../../_shared'

export const dynamic = 'force-dynamic'

/**
 * Google Forms webhook handler.
 *
 * Users add an Apps Script trigger to their Google Form that POSTs here on submit.
 * Appalix accepts two payload shapes:
 *
 *   Shape A (recommended script output):
 *   { form_title: "…", responses: { "Field Label": "value", … } }
 *
 *   Shape B (flat):
 *   { form_title: "…", "Field Label": "value", … }
 *
 * Apps Script to paste in Extensions → Apps Script → onFormSubmit trigger:
 *
 *   function sendToAppalix(e) {
 *     var form = FormApp.getActiveForm();
 *     var fields = {};
 *     e.response.getItemResponses().forEach(function(r) {
 *       fields[r.getItem().getTitle()] = String(r.getResponse());
 *     });
 *     UrlFetchApp.fetch('WEBHOOK_URL', {
 *       method: 'post',
 *       contentType: 'application/json',
 *       payload: JSON.stringify({ form_title: form.getTitle(), responses: fields }),
 *       muteHttpExceptions: true
 *     });
 *   }
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
    .eq('provider', 'google_forms')
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
    try { body = JSON.parse(text) } catch {
      const p = new URLSearchParams(text)
      body = Object.fromEntries(p.entries())
    }
  }

  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'invalid body' }, { status: 400 })

  // Shape A: responses nested under "responses" key
  const responsesObj = body['responses'] as Record<string, unknown> | undefined
  const rawPayload: Record<string, string> = {}

  if (responsesObj && typeof responsesObj === 'object') {
    for (const [k, v] of Object.entries(responsesObj)) {
      if (v !== null && v !== undefined) rawPayload[k] = String(v)
    }
  } else {
    // Shape B: flat — everything except meta keys
    const META = new Set(['form_title', 'timestamp', 'form_id', 'response_id'])
    for (const [k, v] of Object.entries(body)) {
      if (!META.has(k) && (typeof v === 'string' || typeof v === 'number')) {
        rawPayload[k] = String(v)
      }
    }
  }

  const formTitle = body['form_title'] as string | undefined

  const result = await insertFormSubmission(a, workspaceId, rawPayload, normalizeFields(rawPayload), 'google_forms', formTitle ?? null)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 500 })
  triggerFormAnalysis(workspaceId, result.formId)
  return NextResponse.json({ ok: true })
}
