import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { ingestLead } from '@/lib/ingest-lead'

/**
 * ActiveCampaign webhook — contact_add / contact_update events
 * URL: https://app.appalix.ai/api/webhooks/activecampaign/{workspaceId}
 * Configure in ActiveCampaign → Settings → Developer → Manage Webhooks
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params
  if (!workspaceId) return NextResponse.json({ error: 'missing workspace' }, { status: 400 })

  // AC sends form-urlencoded
  const text = await req.text()
  const p = new URLSearchParams(text)

  const email     = p.get('contact[email]') ?? p.get('email') ?? ''
  const firstName = p.get('contact[first_name]') ?? p.get('first_name') ?? ''
  const lastName  = p.get('contact[last_name]')  ?? p.get('last_name')  ?? ''
  const phone     = p.get('contact[phone]')       ?? p.get('phone')       ?? ''
  const name = [firstName, lastName].filter(Boolean).join(' ')

  if (!email) return NextResponse.json({ ok: true })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = admin as any

  const { data: existing } = await a
    .from('sage_contacts')
    .select('id')
    .eq('workspace_id', workspaceId)
    .ilike('email', email)
    .maybeSingle()

  // Mirror into sage_form_submissions (Forms feed + AI triage)
  await ingestLead(
    { name: name || email.split('@')[0], email, phone: phone || null, company: null, job_title: null, website: null, campaign_name: null, ad_name: null, form_name: null },
    { workspaceId, sourcePlatform: 'activecampaign', rawPayload: Object.fromEntries(p.entries()), dedup: true },
  ).catch(() => null)

  if (existing) {
    await a.from('sage_contacts').update({
      ...(name  && { name }),
      ...(phone && { phone }),
      updated_at: new Date().toISOString(),
    }).eq('id', existing.id)
  } else {
    await a.from('sage_contacts').insert({
      workspace_id: workspaceId,
      name:  name || email.split('@')[0],
      email,
      phone: phone || null,
      source: 'import',
    })
  }

  return NextResponse.json({ ok: true })
}
