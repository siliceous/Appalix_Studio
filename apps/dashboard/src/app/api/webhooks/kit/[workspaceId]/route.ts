import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { ingestLead } from '@/lib/ingest-lead'

/**
 * Kit (ConvertKit) webhook — subscriber.created / subscriber.updated
 * Configure in Kit → Automations → Webhooks
 * URL: https://app.appalix.ai/api/webhooks/kit/{workspaceId}
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params
  if (!workspaceId) return NextResponse.json({ error: 'missing workspace' }, { status: 400 })

  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const subscriber = (body['subscriber'] ?? body) as Record<string, unknown>

  const email = subscriber['email_address'] as string | undefined
  if (!email) return NextResponse.json({ ok: true })

  const firstName = (subscriber['first_name'] as string) ?? ''
  const lastName  = (subscriber['last_name']  as string) ?? ''
  const name = [firstName, lastName].filter(Boolean).join(' ')

  await upsertContact(workspaceId, { email, name })
  return NextResponse.json({ ok: true })
}

async function upsertContact(workspaceId: string, contact: { email: string; name: string }) {
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = admin as any

  // Mirror into sage_form_submissions (Forms feed + AI triage)
  await ingestLead(
    { name: contact.name || contact.email.split('@')[0], email: contact.email, phone: null, company: null, job_title: null, website: null, campaign_name: null, ad_name: null, form_name: null },
    { workspaceId, sourcePlatform: 'convertkit', rawPayload: contact, dedup: true },
  ).catch(() => null)

  const { data: existing } = await a
    .from('sage_contacts')
    .select('id')
    .eq('workspace_id', workspaceId)
    .ilike('email', contact.email)
    .maybeSingle()

  if (existing) {
    await a.from('sage_contacts').update({
      ...(contact.name && { name: contact.name }),
      updated_at: new Date().toISOString(),
    }).eq('id', existing.id)
  } else {
    await a.from('sage_contacts').insert({
      workspace_id: workspaceId,
      name:         contact.name || contact.email.split('@')[0],
      email:        contact.email,
      source:       'import',
    })
  }
}
