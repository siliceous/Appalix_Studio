import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { ingestLead } from '@/lib/ingest-lead'

/**
 * Mailchimp webhook — receives subscribe/profile_update events.
 * URL to configure in Mailchimp: https://app.appalix.ai/api/webhooks/mailchimp/{workspaceId}
 * Mailchimp sends a GET for verification and POST for events.
 */

// Mailchimp GET verification
export async function GET() {
  return new NextResponse('OK', { status: 200 })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params
  if (!workspaceId) return NextResponse.json({ error: 'missing workspace' }, { status: 400 })

  let body: Record<string, unknown>
  const ct = req.headers.get('content-type') ?? ''
  if (ct.includes('application/x-www-form-urlencoded') || ct.includes('multipart/form-data')) {
    const text = await req.text()
    const p = new URLSearchParams(text)
    body = Object.fromEntries(p.entries())
  } else {
    body = await req.json().catch(() => ({}))
  }

  const type = body['type'] as string
  if (!['subscribe', 'profile', 'upemail'].includes(type)) {
    return NextResponse.json({ ok: true })
  }

  const data = body['data'] as Record<string, unknown> | undefined
  const email = (data?.['email'] ?? data?.['new_email']) as string | undefined
  if (!email) return NextResponse.json({ ok: true })

  const merges = data?.['merges'] as Record<string, string> | undefined
  const name = [merges?.['FNAME'], merges?.['LNAME']].filter(Boolean).join(' ') || (data?.['name'] as string) || ''
  const phone   = merges?.['PHONE'] ?? ''
  const company = merges?.['COMPANY'] ?? ''

  await upsertContact(workspaceId, { email, name, phone, company })
  return NextResponse.json({ ok: true })
}

async function upsertContact(workspaceId: string, contact: { email: string; name: string; phone: string; company: string }) {
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = admin as any

  // Mirror into sage_form_submissions (Forms feed + AI triage)
  await ingestLead(
    { name: contact.name || contact.email.split('@')[0], email: contact.email, phone: contact.phone || null, company: contact.company || null, job_title: null, website: null, campaign_name: null, ad_name: null, form_name: null },
    { workspaceId, sourcePlatform: 'mailchimp', rawPayload: contact, dedup: false },
  ).catch(() => null)

  const { data: existing } = await a
    .from('sage_contacts')
    .select('id, name, phone, company_name')
    .eq('workspace_id', workspaceId)
    .ilike('email', contact.email)
    .maybeSingle()

  if (existing) {
    await a.from('sage_contacts').update({
      ...(contact.name    && { name:         contact.name }),
      ...(contact.phone   && { phone:        contact.phone }),
      ...(contact.company && { company_name: contact.company }),
      updated_at: new Date().toISOString(),
    }).eq('id', existing.id)
  } else {
    await a.from('sage_contacts').insert({
      workspace_id: workspaceId,
      name:         contact.name || contact.email.split('@')[0],
      email:        contact.email,
      phone:        contact.phone || null,
      company_name: contact.company || null,
      source:       'import',
    })
  }
}
