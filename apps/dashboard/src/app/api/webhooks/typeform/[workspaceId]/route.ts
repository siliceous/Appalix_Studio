import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { normalizeFields, triggerFormAnalysis } from '../../_shared'

export const dynamic = 'force-dynamic'

/**
 * Typeform webhook handler.
 *
 * Configure in Typeform → Connect → Webhooks:
 *   Destination URL: https://yourdomain.com/api/webhooks/typeform/{workspaceId}
 *   Secret token: <same value stored in Sage integration config>
 *
 * Typeform signs requests with HMAC-SHA256 sent as the
 * `Typeform-Signature` header: sha256=<base64>
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
    .eq('provider', 'typeform')
    .eq('status', 'connected')
    .maybeSingle()

  if (!integration) return NextResponse.json({ error: 'integration not found' }, { status: 404 })

  const accessToken = integration.config?.access_token ?? ''
  const formIdFilter = integration.config?.form_id ?? ''

  const rawBody = await req.text()

  // Verify Typeform HMAC signature if access_token is set (used as signing secret)
  const sigHeader = req.headers.get('typeform-signature') ?? ''
  if (accessToken && sigHeader) {
    const expected = 'sha256=' + createHmac('sha256', accessToken).update(rawBody).digest('base64')
    try {
      if (!timingSafeEqual(Buffer.from(expected), Buffer.from(sigHeader))) {
        return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
      }
    } catch {
      return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
    }
  }

  let body: Record<string, unknown>
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  const payload  = body['form_response'] as Record<string, unknown> | undefined
  if (!payload) return NextResponse.json({ ok: true })

  const formId    = (payload['form_id'] ?? (body['form_id'])) as string | undefined
  const formTitle = (payload['form_title'] ?? (body['form_title'])) as string | undefined

  // If the integration is scoped to a specific form, filter other forms out
  if (formIdFilter && formId && formId !== formIdFilter) {
    return NextResponse.json({ ok: true })
  }

  // Extract answers array into flat key/value fields
  const answers = (payload['answers'] ?? []) as Array<{
    field?: { ref?: string; type?: string }
    type?: string
    text?: string
    email?: string
    phone_number?: string
    number?: number
    boolean?: boolean
    choice?: { label?: string }
    choices?: { labels?: string[] }
    url?: string
    date?: string
  }>

  const definition = payload['definition'] as { fields?: Array<{ ref?: string; title?: string }> } | undefined
  const titleMap: Record<string, string> = {}
  for (const f of definition?.fields ?? []) {
    if (f.ref && f.title) titleMap[f.ref] = f.title
  }

  const fields: Record<string, string> = {}
  for (const answer of answers) {
    const ref = answer.field?.ref ?? ''
    const key = titleMap[ref] || ref || answer.field?.type || 'field'
    const val =
      answer.text         ??
      answer.email        ??
      answer.phone_number ??
      answer.url          ??
      answer.date         ??
      (answer.number    !== undefined ? String(answer.number)  : undefined) ??
      (answer.boolean   !== undefined ? String(answer.boolean) : undefined) ??
      answer.choice?.label ??
      answer.choices?.labels?.join(', ') ?? ''
    fields[key] = val
  }

  const result = await insertSubmission(a, workspaceId, normalizeFields(fields), 'typeform', formTitle ?? formId ?? null)
  if (result && 'formId' in result) triggerFormAnalysis(workspaceId, result.formId)
  return NextResponse.json({ ok: true })
}

async function insertSubmission(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  a: any,
  workspaceId: string,
  fields: Record<string, string>,
  source: string,
  formTitle: string | null,
): Promise<{ formId: string } | null> {
  const formName = formTitle ?? 'Typeform Submissions'
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

  if (!form?.id) return null

  await a.from('sage_form_submissions').insert({
    workspace_id:    workspaceId,
    form_id:         form.id,
    source_platform: source,
    fields,
  })

  return { formId: form.id }
}
