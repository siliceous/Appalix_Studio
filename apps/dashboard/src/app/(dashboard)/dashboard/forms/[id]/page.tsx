import { createAdminClient, createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import type { WorkspaceMemberRole } from '@/lib/types'
import { ROLE_RANK } from '@/lib/types'
import type { SageFormSubmission, SageForm } from '@/app/actions/sage-forms'
import { SubmissionPanelClient, type TeamMember } from './submission-panel-client'

export const metadata: Metadata = { title: 'Form Submission' }

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
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
  const membership = membershipRaw as { workspace_id: string; role: WorkspaceMemberRole } | null
  const workspaceId = membership?.workspace_id
  if (!workspaceId) redirect('/login')
  const callerRank = ROLE_RANK[membership!.role] ?? 1

  const admin = createAdminClient()
  const canAssign = callerRank >= ROLE_RANK.manager

  const [subRes, listRes, formsRes, membersRes, profilesRes] = await Promise.all([
    // Current submission
    admin
      .from('sage_form_submissions')
      .select('id, form_id, source_platform, fields, ai_priority, ai_summary, ai_insights, ai_action, ai_entities, ai_analyzed_at, actioned_at, action_type, assigned_to, created_at, mailchimp_synced_at')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single(),
    // All submissions for left panel
    admin
      .from('sage_form_submissions')
      .select('id, form_id, source_platform, fields, ai_priority, ai_summary, ai_entities, actioned_at, action_type, assigned_to, created_at, mailchimp_synced_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(200),
    // All forms for name lookup
    admin
      .from('sage_forms')
      .select('id, name, description, is_active, created_at, mailchimp_list_id')
      .eq('workspace_id', workspaceId),
    // Team members for assign dropdown
    canAssign
      ? admin.from('workspace_members').select('user_id, role').eq('workspace_id', workspaceId)
      : Promise.resolve({ data: [] }),
    canAssign
      ? admin.from('user_profiles').select('user_id, first_name, last_name')
      : Promise.resolve({ data: [] }),
  ])

  const submission = subRes.data as SageFormSubmission | null
  if (!submission) notFound()

  const submissions = (listRes.data ?? []) as SageFormSubmission[]
  const forms       = (formsRes.data ?? []) as SageForm[]

  type PRow = { user_id: string; first_name: string; last_name: string | null }
  type MRow = { user_id: string; role: WorkspaceMemberRole }
  const pMap = new Map(((profilesRes.data ?? []) as PRow[]).map(p => [p.user_id, p]))
  const teamMembers: TeamMember[] = ((membersRes.data ?? []) as MRow[])
    .filter(m => (ROLE_RANK[m.role] ?? 0) <= callerRank)
    .map(m => {
      const p = pMap.get(m.user_id)
      return { user_id: m.user_id, name: p ? [p.first_name, p.last_name].filter(Boolean).join(' ') : m.user_id }
    })

  return (
    <div className="-m-8 flex h-screen overflow-hidden">
      <SubmissionPanelClient
        submissions={submissions}
        current={submission}
        forms={forms}
        teamMembers={teamMembers}
        canAssign={canAssign}
      />
    </div>
  )
}
