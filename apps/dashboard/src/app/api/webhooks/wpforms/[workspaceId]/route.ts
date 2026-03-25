import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { normalizeFields, insertFormSubmission, triggerFormAnalysis } from '../../_shared'

export const dynamic = 'force-dynamic'

/**
 * WPForms webhook handler.
 *
 * Configure in WPForms → Settings → Webhooks:
 *   Request URL: https://yourdomain.com/api/webhooks/wpforms/{workspaceId}
 *   Request Format: JSON
 *   Request Headers: X-Webhook-Secret: <your secret>
 *
 * WPForms sends form field values keyed by field label or ID.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params
  if (!workspaceId) return NextResponse.json({ error: 'missing workspace' }, { status: 400 })

  // Accept secret via header OR query param (?secret=...) — some plugin tiers have no custom headers UI
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
    .eq('provider', 'wpforms')
    .eq('status', 'connected')
    .maybeSingle()

  if (!integration) return NextResponse.json({ error: 'integration not found' }, { status: 404 })

  const storedSecret = integration.config?.webhook_secret ?? ''
  if (storedSecret && incomingSecret !== storedSecret) {
    return NextResponse.json({ error: 'invalid secret' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'invalid body' }, { status: 400 })

  const data = (body as Record<string, unknown>)

  // WPForms wraps field values under `fields` key as { id: { value, name } }
  const rawFields = data['fields'] as Record<string, { value?: string; name?: string }> | undefined
  const fields: Record<string, string> = {}
  if (rawFields && typeof rawFields === 'object') {
    for (const f of Object.values(rawFields)) {
      const key = f.name ?? 'field'
      if (f.value !== undefined) fields[key] = String(f.value)
    }
  } else {
    // Fallback: store top-level string values
    for (const [k, v] of Object.entries(data)) {
      if (typeof v === 'string' || typeof v === 'number') fields[k] = String(v)
    }
  }

  const formTitle = data['form_title'] as string | undefined

  // rawPayload: WPForms field labels keyed by name (already label-based, not numeric IDs)
  const rawPayload: Record<string, string> = fields
  const result = await insertFormSubmission(a, workspaceId, rawPayload, normalizeFields(rawPayload), 'wpforms', formTitle ?? null)
  if (result && 'error' in result) return NextResponse.json({ error: result.error }, { status: 500 })
  if (result && 'formId' in result) triggerFormAnalysis(workspaceId, result.formId)
  return NextResponse.json({ ok: true })
}
