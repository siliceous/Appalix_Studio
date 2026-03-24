import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

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

  const incomingSecret = req.headers.get('x-webhook-secret') ?? ''
  if (!incomingSecret) return NextResponse.json({ error: 'missing secret' }, { status: 401 })

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
  if (!storedSecret || incomingSecret !== storedSecret) {
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

  await insertSubmission(a, workspaceId, fields, 'wpforms', formTitle ?? null)
  return NextResponse.json({ ok: true })
}

async function insertSubmission(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  a: any,
  workspaceId: string,
  fields: Record<string, string>,
  source: string,
  formTitle: string | null,
) {
  const formName = formTitle ?? 'WPForms Submissions'
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

    const { data: newForm } = await a
      .from('sage_forms')
      .insert({ workspace_id: workspaceId, name: formName, is_active: true, created_by: owner?.user_id ?? null })
      .select('id')
      .single()
    form = newForm
  }

  if (!form?.id) return

  await a.from('sage_form_submissions').insert({
    workspace_id:    workspaceId,
    form_id:         form.id,
    source_platform: source,
    fields,
  })
}
