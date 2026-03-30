import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { WorkspaceMember, WorkspaceMemberSummary } from '@/lib/types'
import { getProject, getProjectTasks, getProjects, getProjectActivities } from '@/app/actions/sage-projects'
import { ProjectDetailClient } from './project-detail-client'

export const metadata: Metadata = { title: 'Project' }

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  const membership = membershipRaw as Pick<WorkspaceMember, 'workspace_id'> | null
  if (!membership) redirect('/login')

  const admin = createAdminClient()

  const [project, tasks, { data: membersRaw }, allProjects, activities] = await Promise.all([
    getProject(id),
    getProjectTasks(id),
    admin
      .from('workspace_members')
      .select('user_id, role')
      .eq('workspace_id', membership.workspace_id)
      .not('accepted_at', 'is', null),
    getProjects(),
    getProjectActivities(id),
  ])

  if (!project) notFound()

  const userIds = (membersRaw ?? []).map((m: { user_id: string }) => m.user_id)
  let members: WorkspaceMemberSummary[] = []
  if (userIds.length > 0) {
    const { data: profiles } = await admin.auth.admin.listUsers()
    const profileMap = new Map(
      (profiles?.users ?? []).map(u => [u.id, u.user_metadata?.full_name ?? u.email ?? u.id])
    )
    members = (membersRaw ?? []).map((m: { user_id: string; role: string }) => ({
      user_id: m.user_id,
      role:    m.role,
      name:    profileMap.get(m.user_id) ?? m.user_id,
      email:   '',
    })) as WorkspaceMemberSummary[]
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        <ProjectDetailClient
          project={project}
          allProjects={allProjects}
          tasks={tasks}
          activities={activities}
          members={members}
          currentUserId={user.id}
        />
      </div>
    </div>
  )
}
