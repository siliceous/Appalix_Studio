import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import type { Metadata } from 'next'
import type { SageActivityLog, SageProjectBoard, SageProjectBoardStage } from '@/lib/types'
import { ProjectsInboxClient } from './projects-inbox-client'

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
  const m = membershipRaw as { workspace_id: string; role: string }
  const workspaceId = m.workspace_id
  const admin = createAdminClient()

  const [
    { data: boardsRaw },
    { data: assignedCountsRaw },
    { data: activityRaw },
  ] = await Promise.all([
    admin
      .from('sage_project_boards')
      .select('*, stages:sage_project_board_stages(id, board_id, name, color, position, created_at)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true }),
    admin
      .from('sage_projects')
      .select('board_id')
      .eq('workspace_id', workspaceId)
      .not('board_id', 'is', null)
      .is('deleted_at', null),
    admin
      .from('sage_activity_log')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('entity_type', 'project')
      .order('created_at', { ascending: false })
      .limit(40),
  ])

  const countMap = new Map<string, number>()
  for (const p of (assignedCountsRaw ?? []) as { board_id: string }[]) {
    countMap.set(p.board_id, (countMap.get(p.board_id) ?? 0) + 1)
  }

  type BoardRow = SageProjectBoard & { stages: SageProjectBoardStage[] }
  const boards = ((boardsRaw ?? []) as BoardRow[]).map(b => ({
    ...b,
    stages:        [...(b.stages ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    project_count: countMap.get(b.id) ?? 0,
  }))

  return (
    <ProjectsInboxClient
      boards={boards}
      activity={(activityRaw ?? []) as SageActivityLog[]}
    />
  )
}
