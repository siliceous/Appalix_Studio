import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { ingestLead } from '@/lib/ingest-lead'

/**
 * Klaviyo webhook — profile.created / profile.updated events
 * Configure in Klaviyo → Flows or Integrations → Webhooks
 * URL: https://app.appalix.ai/api/webhooks/klaviyo/{workspaceId}
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params
  if (!workspaceId) return NextResponse.json({ error: 'missing workspace' }, { status: 400 })

  const body = await req.json().catch(() => ({})) as Record<string, unknown>

  // Klaviyo sends { data: { type, attributes: { email, first_name, last_name, ... } } }
  // or wrapped in an array for batch events
  const events = Array.isArray(body['data']) ? body['data'] as unknown[] : [body['data'] ?? body]

  const admin = createAdminClient()
  for (const event of events) {
    const e = event as Record<string, unknown>
    const attrs = (e['attributes'] ?? e) as Record<string, unknown>
    const email = attrs['email'] as string | undefined
    if (!email) continue

    const name = [attrs['first_name'], attrs['last_name']].filter(Boolean).join(' ') as string
    const phone   = (attrs['phone_number'] as string) ?? ''
    const company = (attrs['organization'] as string) ?? ''

    await upsertContact(admin, workspaceId, { email, name, phone, company })
  }

  return NextResponse.json({ ok: true })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function upsertContact(admin: any, workspaceId: string, contact: { email: string; name: string; phone: string; company: string }) {
  // Mirror into sage_form_submissions (Forms feed + AI triage)
  await ingestLead(
    { name: contact.name || contact.email.split('@')[0], email: contact.email, phone: contact.phone || null, company: contact.company || null, job_title: null, website: null, campaign_name: null, ad_name: null, form_name: null },
    { workspaceId, sourcePlatform: 'klaviyo', rawPayload: contact, dedup: true },
  ).catch(() => null)

  const { data: existing } = await admin
    .from('sage_contacts')
    .select('id')
    .eq('workspace_id', workspaceId)
    .ilike('email', contact.email)
    .maybeSingle()

  if (existing) {
    await admin.from('sage_contacts').update({
      ...(contact.name    && { name:         contact.name }),
      ...(contact.phone   && { phone:        contact.phone }),
      ...(contact.company && { company_name: contact.company }),
      updated_at: new Date().toISOString(),
    }).eq('id', existing.id)
  } else {
    await admin.from('sage_contacts').insert({
      workspace_id: workspaceId,
      name:         contact.name || contact.email.split('@')[0],
      email:        contact.email,
      phone:        contact.phone || null,
      company_name: contact.company || null,
      source:       'import',
    })
  }
}
