import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { normalizeFields, insertFormSubmission, triggerFormAnalysis } from '../../_shared'

export const dynamic = 'force-dynamic'

/**
 * ClickFunnels CF2 V2 webhook handler.
 *
 * Handles the full range of CF2 V2 event types:
 *   - contact.* → data is the contact directly
 *   - form_submission.created → data.contact + data.field_values
 *   - order.* / one-time-order.* → data.contact
 *   - subscription.* → data.contact
 *   - sales/opportunity.* → data.contact
 *   - appointments/* → data.contact
 *   - courses/enrollment.* → data.contact
 *   - orders/invoice.* / orders/transaction.* → data.contact
 *
 * Non-contact events (blogs, products, communities, courses content, etc.) are
 * acknowledged with 200 OK but not ingested — no contact data to capture.
 *
 * Security: X-CF-Signature (HMAC-SHA256 hex) or ?secret= query param token.
 */

// Events with no contact data — acknowledge and skip
const SKIP_EVENTS = new Set([
  'contact.deleted',
  'contact.unsubscribed',
  'communities/post.created',
  'communities/posts/comment.created',
  'course.created', 'course.updated', 'course.deleted', 'course.published',
  'courses/section.created', 'courses/section.updated', 'courses/section.deleted', 'courses/section.published',
  'courses/lesson.created', 'courses/lesson.updated', 'courses/lesson.deleted', 'courses/lesson.published',
  'blogs/post.created', 'blogs/post.updated', 'blogs/post.deleted', 'blogs/post.published',
  'product.created', 'product.updated',
  'products/collection.created', 'products/collection.updated',
  'products/variant.created', 'products/variant.updated',
  'fulfillment.created', 'fulfillment.updated',
  'platform_application.disconnected',
  'workflows/steps/integration_step.executed',
  'workflows_integration_step.executed',
  'workflows/steps/deliver_webhook_step.executed',
  'runs/step.dontrunmerenewal-invoice-payment-declined',
])

function sourceLabel(event: string): string {
  if (event.startsWith('contact.') || event.startsWith('contacts/applied_tag.')) return 'ClickFunnels Contact'
  if (event === 'form_submission.created')                                         return 'ClickFunnels Form'
  if (event.startsWith('order.') || event.startsWith('one-time-order.'))          return 'ClickFunnels Order'
  if (event.startsWith('subscription.'))                                           return 'ClickFunnels Subscription'
  if (event.startsWith('sales/opportunity.'))                                      return 'ClickFunnels Opportunity'
  if (event.startsWith('appointments/'))                                           return 'ClickFunnels Appointment'
  if (event.startsWith('courses/enrollment.'))                                     return 'ClickFunnels Course'
  if (event.startsWith('orders/invoice.') || event.startsWith('subscription.invoice.') || event.startsWith('one-time-order.invoice.')) return 'ClickFunnels Invoice'
  if (event.startsWith('orders/transaction.'))                                     return 'ClickFunnels Transaction'
  return 'ClickFunnels'
}

function extractContactFields(contact: Record<string, unknown>): Record<string, string> {
  const raw: Record<string, string> = {}
  const firstName = String(contact['first_name'] ?? '')
  const lastName  = String(contact['last_name']  ?? '')
  if (firstName || lastName) raw['name'] = [firstName, lastName].filter(Boolean).join(' ')
  if (contact['email'])   raw['email']   = String(contact['email'])
  if (contact['phone'])   raw['phone']   = String(contact['phone'])
  if (contact['company']) raw['company'] = String(contact['company'])
  if (contact['website']) raw['website'] = String(contact['website'])
  const SKIP = new Set(['first_name', 'last_name', 'email', 'phone', 'company', 'website', 'id', 'created_at', 'updated_at', 'workspace_id'])
  for (const [k, v] of Object.entries(contact)) {
    if (!SKIP.has(k) && (typeof v === 'string' || typeof v === 'number')) {
      raw[k] = String(v)
    }
  }
  return raw
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params
  if (!workspaceId) return NextResponse.json({ error: 'missing workspace' }, { status: 400 })

  const incomingSecret =
    req.headers.get('x-cf-signature') ||
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
    .eq('provider', 'clickfunnels')
    .eq('status', 'connected')
    .maybeSingle()

  if (!integration) return NextResponse.json({ error: 'integration not found' }, { status: 404 })

  const storedSecret = (integration.config?.webhook_secret ?? '') as string
  const rawBody = await req.text()

  // HMAC or token verification
  if (storedSecret) {
    const sigHeader = req.headers.get('x-cf-signature') ?? ''
    if (sigHeader) {
      const expected = createHmac('sha256', storedSecret).update(rawBody).digest('hex')
      try {
        if (!timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sigHeader, 'hex'))) {
          return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
        }
      } catch {
        return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
      }
    } else if (incomingSecret && incomingSecret !== storedSecret) {
      return NextResponse.json({ error: 'invalid secret' }, { status: 401 })
    }
  }

  let body: Record<string, unknown>
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  const eventType = String(body['event'] ?? '')
  console.log('[clickfunnels] event:', eventType)
  console.log('[clickfunnels] body keys:', Object.keys(body))
  console.log('[clickfunnels] data keys:', body['data'] ? Object.keys(body['data'] as object) : 'no data key')
  console.log('[clickfunnels] raw (first 500):', rawBody.slice(0, 500))

  // Acknowledge non-contact events immediately
  if (SKIP_EVENTS.has(eventType)) return NextResponse.json({ ok: true })

  const data = (body['data'] as Record<string, unknown> | undefined) ?? {}

  // ── Extract contact based on event category ───────────────────────────────
  let contactData: Record<string, unknown> | undefined
  let formName = sourceLabel(eventType)

  if (!eventType || eventType.startsWith('contact.') || eventType.startsWith('contacts/applied_tag.')) {
    // CF2: data IS the contact for contact.* events
    // CF1: body.contact
    contactData = (data['email'] !== undefined || data['first_name'] !== undefined)
      ? data
      : (body['contact'] as Record<string, unknown> | undefined)
  } else if (eventType === 'form_submission.created') {
    contactData = data['contact'] as Record<string, unknown> | undefined
    const form = data['form'] as Record<string, unknown> | undefined
    if (form?.['name']) formName = String(form['name'])
  } else if (
    eventType.startsWith('order.') ||
    eventType.startsWith('one-time-order.') ||
    eventType.startsWith('subscription.') ||
    eventType.startsWith('sales/opportunity.') ||
    eventType.startsWith('appointments/') ||
    eventType.startsWith('courses/enrollment.') ||
    eventType.startsWith('orders/invoice.') ||
    eventType.startsWith('subscription.invoice.') ||
    eventType.startsWith('one-time-order.invoice.') ||
    eventType.startsWith('orders/transaction.')
  ) {
    contactData = data['contact'] as Record<string, unknown> | undefined
  } else {
    // Unknown event: try data.contact → data → body.contact
    contactData =
      (data['contact'] as Record<string, unknown> | undefined) ??
      (data['email'] !== undefined ? data : undefined) ??
      (body['contact'] as Record<string, unknown> | undefined)
  }

  if (!contactData) return NextResponse.json({ ok: true })

  const raw = extractContactFields(contactData)

  // For form_submission, also pull structured field values
  if (eventType === 'form_submission.created') {
    const fieldValues = data['field_values'] as Array<{ field_slug?: string; label?: string; value?: unknown }> | undefined
    if (fieldValues) {
      for (const fv of fieldValues) {
        const key = fv.field_slug ?? fv.label
        if (key && fv.value !== undefined) raw[key] = String(fv.value)
      }
    }
  }

  // Tag the event type for audit trail
  if (eventType) raw['cf_event'] = eventType

  // Normalise first so we can check for real contact fields
  const normalizedFields = normalizeFields(raw)

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const NUMERIC_ID_RE = /^\d{1,12}$/ // bare numeric IDs like "63960261"

  // Strip UUIDs and numeric IDs that crept in as company/phone
  if (normalizedFields['company'] && (UUID_RE.test(normalizedFields['company']) || NUMERIC_ID_RE.test(normalizedFields['company']))) {
    delete normalizedFields['company']
  }
  if (normalizedFields['phone'] && NUMERIC_ID_RE.test(normalizedFields['phone'].replace(/[\s\-\(\)\.]/g, ''))) {
    // Only keep phone if it starts with + (international) or is clearly >= 10 digits
    const digits = normalizedFields['phone'].replace(/\D/g, '')
    if (!normalizedFields['phone'].startsWith('+') && digits.length < 10) {
      delete normalizedFields['phone']
    }
  }

  // Skip if no usable contact data
  const hasEmail = !!normalizedFields['email']?.match(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/)
  const hasName  = !!(normalizedFields['name'] && normalizedFields['name'] !== 'Unknown' && normalizedFields['name'].trim().length > 1 && !UUID_RE.test(normalizedFields['name']))
  const hasPhone = !!normalizedFields['phone']
  if (!hasEmail && !hasName && !hasPhone) {
    console.log('[clickfunnels] skipping — no usable contact data in payload')
    return NextResponse.json({ ok: true })
  }

  const result = await insertFormSubmission(a, workspaceId, raw, normalizedFields, 'clickfunnels', formName)
  if ('error' in result) {
    console.error('[clickfunnels webhook] insertFormSubmission error:', result.error)
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  triggerFormAnalysis(workspaceId, result.formId)
  return NextResponse.json({ ok: true })
}
