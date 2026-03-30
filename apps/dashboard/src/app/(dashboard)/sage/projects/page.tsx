import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import type { Metadata } from 'next'
import { getProjectBoards } from '@/app/actions/sage-projects'
import { ProjectBoardsClient } from './boards-client'

export const metadata: Metadata = { title: 'Projects' }

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (!membershipRaw) redirect('/login')

  const boards = await getProjectBoards()

  return (
    <div className="h-full">
      <ProjectBoardsClient boards={boards} />
    </div>
  )
}
