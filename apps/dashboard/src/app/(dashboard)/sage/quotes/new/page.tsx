import { createAdminClient, createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DocumentBuilder } from '@/components/sage/document-builder'
import { getItems } from '@/app/actions/sage-items'
import type { Metadata } from 'next'
import type { SageContact, SageProject } from '@/lib/types'

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

  const [contactsRaw, projectsRaw, itemsCatalog] = await Promise.all([
    admin
      .from('sage_contacts')
      .select('id,name,email,company_name')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .order('name'),
    admin
      .from('sage_projects')
      .select('id,name')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .order('name'),
    getItems(),
  ])

  return (
    <DocumentBuilder
      mode="new"
      docType={docType}
      contacts={
        (contactsRaw.data ?? []) as Pick<
          SageContact,
          'id' | 'name' | 'email' | 'company_name'
        >[]
      }
      projects={(projectsRaw.data ?? []) as Pick<SageProject, 'id' | 'name'>[]}
      items={itemsCatalog}
    />
  )
}
