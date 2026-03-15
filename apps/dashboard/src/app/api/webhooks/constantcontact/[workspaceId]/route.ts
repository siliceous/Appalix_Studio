import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * Constant Contact webhook — contact.created / contact.updated
 * URL: https://app.appalix.ai/api/webhooks/constantcontact/{workspaceId}
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params
  if (!workspaceId) return NextResponse.json({ error: 'missing workspace' }, { status: 400 })

  const body = await req.json().catch(() => ({})) as Record<string, unknown>

  // CC sends { contacts: [{ email_address: { address }, first_name, last_name, phone_numbers }] }
  const contacts = (body['contacts'] ?? [body]) as Array<Record<string, unknown>>

  const admin = createAdminClient()
  for (const ct of contacts) {
    const emailObj = ct['email_address'] as Record<string, string> | string | undefined
    const email = typeof emailObj === 'string' ? emailObj : emailObj?.address
    if (!email) continue

    const name    = [ct['first_name'], ct['last_name']].filter(Boolean).join(' ') as string
    const phones  = ct['phone_numbers'] as Array<{ phone_number: string }> | undefined
    const phone   = phones?.[0]?.phone_number ?? ''
    const company = (ct['company_name'] as string) ?? ''

    await upsertContact(admin, workspaceId, { email, name, phone, company })
  }

  return NextResponse.json({ ok: true })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function upsertContact(admin: any, workspaceId: string, contact: { email: string; name: string; phone: string; company: string }) {
  const { data: existing } = await admin
    .from('sage_contacts')
    .select('id')
    .eq('workspace_id', workspaceId)
    .ilike('email', contact.email)
    .maybeSingle()

  if (existing) {
    await admin.from('sage_contacts').update({
      ...(contact.name    && { name: contact.name }),
      ...(contact.phone   && { phone: contact.phone }),
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
