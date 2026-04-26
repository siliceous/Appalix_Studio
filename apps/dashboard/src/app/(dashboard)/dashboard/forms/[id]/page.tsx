import { createAdminClient, createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import type { WorkspaceMemberRole } from '@/lib/types'
import { ROLE_RANK } from '@/lib/types'
import type { SageFormSubmission, SageForm } from '@/app/actions/sage-forms'
import { SubmissionPanelClient, type TeamMember } from './submission-panel-client'
import { SageToolbar } from '@/components/dashboard/sage-toolbar'
import { getAutoSettings } from '@/app/actions/sage-auto-settings'

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
  const canAssign  = callerRank >= ROLE_RANK.manager

  const admin = createAdminClient()

  // Fetch the target submission — no workspace filter needed since admin client bypasses RLS
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: subData } = await (admin as any)
    .from('sage_form_submissions')
    .select('id, form_id, source_platform, raw_payload, fields, ai_priority, ai_summary, ai_insights, ai_action, ai_entities, ai_analyzed_at, actioned_at, action_type, assigned_to, created_at, mailchimp_synced_at')
    .eq('id', id)
    .single()

  const submission = subData as SageFormSubmission | null
  if (!submission) notFound()

  // Fetch sibling submissions for the left panel
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: listData } = await (admin as any)
    .from('sage_form_submissions')
    .select('id, form_id, source_platform, raw_payload, fields, ai_priority, ai_summary, ai_entities, actioned_at, action_type, assigned_to, created_at, mailchimp_synced_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(200)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: formsData } = await (admin as any)
    .from('sage_forms')
    .select('id, name, description, is_active, created_at, mailchimp_list_id')
    .eq('workspace_id', workspaceId)

  const submissions = (listData ?? []) as SageFormSubmission[]
  const forms       = (formsData ?? []) as SageForm[]

  // Prev / next navigation
  const allIds = submissions.map(s => s.id)
  const idx    = allIds.indexOf(id)
  const prevId = idx > 0 ? allIds[idx - 1] : null
  const nextId = idx < allIds.length - 1 ? allIds[idx + 1] : null

  // Team members for assign dropdown
  let teamMembers: TeamMember[] = []
  if (canAssign) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [{ data: membersData }, { data: profilesData }] = await Promise.all([
      (admin as any).from('workspace_members').select('user_id, role').eq('workspace_id', workspaceId),
      (admin as any).from('user_profiles').select('user_id, first_name, last_name'),
    ])
    type PRow = { user_id: string; first_name: string; last_name: string | null }
    type MRow = { user_id: string; role: WorkspaceMemberRole }
    const pMap = new Map(((profilesData ?? []) as PRow[]).map((p: PRow) => [p.user_id, p]))
    teamMembers = ((membersData ?? []) as MRow[])
      .filter((m: MRow) => (ROLE_RANK[m.role] ?? 0) <= callerRank)
      .map((m: MRow) => {
        const p = pMap.get(m.user_id)
        return { user_id: m.user_id, name: p ? [p.first_name, p.last_name].filter(Boolean).join(' ') : m.user_id }
      })
  }

  const autoSettings = await getAutoSettings()

  // If a deal was created from this submission, look up the deal owner name
  // so the panel can show "Assigned to X"
  let dealOwnerName: string | null = null
  const submissionEmail: string | null =
    (submission as unknown as { fields: Record<string, string> }).fields?.email ?? null

  if (submission.action_type === 'lead' && submissionEmail) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: contactRow } = await (admin as any)
      .from('sage_contacts')
      .select('id')
      .eq('workspace_id', workspaceId)
      .ilike('email', submissionEmail)
      .limit(1)
      .single()

    const contactId = (contactRow as { id: string } | null)?.id
    if (contactId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: dealRow } = await (admin as any)
        .from('sage_deals')
        .select('owner_id')
        .eq('workspace_id', workspaceId)
        .eq('contact_id', contactId)
        .neq('status', 'lost')
        .not('owner_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const ownerId = (dealRow as { owner_id: string } | null)?.owner_id
      if (ownerId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: profileRow } = await (admin as any)
          .from('user_profiles')
          .select('first_name, last_name')
          .eq('user_id', ownerId)
          .single()
        type PRow = { first_name: string | null; last_name: string | null }
        const p = profileRow as PRow | null
        if (p) dealOwnerName = [p.first_name, p.last_name].filter(Boolean).join(' ') || null
      }
    }
  }

  return (
    <>
      <SageToolbar pageKey="forms" preset="all" autoEnabled={autoSettings.forms_auto_enabled} />
      <div className="flex-1 overflow-hidden flex">
        <SubmissionPanelClient
          submissions={submissions}
          current={submission}
          forms={forms}
          teamMembers={teamMembers}
          canAssign={canAssign}
          dealOwnerName={dealOwnerName}
          prevId={prevId}
          nextId={nextId}
        />
      </div>
    </>
  )
}
