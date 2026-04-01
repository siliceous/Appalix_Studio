import { createAdminClient, createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DocumentBuilder } from '@/components/sage/document-builder'
import { getItems } from '@/app/actions/sage-items'
import { getBranding } from '@/app/actions/workspace-branding'
import type { Metadata } from 'next'
import type { SageProject } from '@/lib/types'

export const metadata: Metadata = { title: 'New Document' }

export default async function NewDocumentPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  const { type } = await searchParams
  const docType = (['quote', 'packing_list', 'invoice'] as const).includes(type as never)
    ? (type as 'quote' | 'packing_list' | 'invoice')
    : 'invoice'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: memberRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (!memberRaw) redirect('/login')
  const workspaceId = (memberRaw as { workspace_id: string }).workspace_id
  const admin = createAdminClient()

  const [contactsRaw, projectsRaw, itemsCatalog, branding] = await Promise.all([
    admin
      .from('sage_contacts')
      .select('id,name,email,phone,company_name,street,city,state,zip,country')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .order('name')
      .limit(200),
    admin
      .from('sage_projects')
      .select('id,name')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .order('name'),
    getItems(),
    getBranding(),
  ])

  return (
    <DocumentBuilder
      mode="new"
      docType={docType}
      contacts={
        (contactsRaw.data ?? []).map((c: any) => ({
          id:           c.id,
          name:         c.name,
          email:        c.email        ?? null,
          phone:        c.phone        ?? null,
          company_name: c.company_name ?? null,
          street:       c.street       ?? null,
          city:         c.city         ?? null,
          state:        c.state        ?? null,
          zip:          c.zip          ?? null,
          country:      c.country      ?? null,
          vat_number:   null,
        }))
      }
      projects={(projectsRaw.data ?? []) as Pick<SageProject, 'id' | 'name'>[]}
      items={itemsCatalog}
      fromDefaults={{
        name:    branding?.brand_name       ?? '',
        address: branding?.business_address ?? '',
        phone:   branding?.business_phone   ?? '',
        email:   branding?.business_email   ?? '',
        abnVat:  branding?.abn_vat          ?? '',
        logoUrl: branding?.logo_url         ?? '',
        color:   branding?.primary_color    ?? '#1a1a1a',
      }}
    />
  )
}
