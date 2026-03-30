import { createAdminClient, createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getDocument } from '@/app/actions/sage-documents'
import { getItems } from '@/app/actions/sage-items'
import { DocumentBuilder } from '@/components/sage/document-builder'
import type { Metadata } from 'next'
import type { SageContact, SageProject } from '@/lib/types'

export const metadata: Metadata = { title: 'Document' }

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
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

  const [doc, contactsRaw, projectsRaw, itemsCatalog] = await Promise.all([
    getDocument(id),
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

  if (!doc) notFound()

  return (
    <DocumentBuilder
      mode="edit"
      document={doc}
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
