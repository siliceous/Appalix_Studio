import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getProjectBoard, getProjectsByBoard, getProjectTemplates } from '@/app/actions/sage-projects'
import { BoardClient } from './board-client'
import type { SageContact } from '@/lib/types'

export const metadata: Metadata = { title: 'Project Board' }

export default async function BoardPage({ params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
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

  const [board, projects, contactsRaw, templates] = await Promise.all([
    getProjectBoard(boardId),
    getProjectsByBoard(boardId),
    admin
      .from('sage_contacts')
      .select('id, name, email, company_name')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .order('name'),
    getProjectTemplates(),
  ])

  if (!board) notFound()

  const contacts = (contactsRaw.data ?? []) as Pick<SageContact, 'id' | 'name' | 'email' | 'company_name'>[]

  return (
    <div className="h-full">
      <BoardClient board={board} initialProjects={projects} contacts={contacts} templates={templates} />
    </div>
  )
}
