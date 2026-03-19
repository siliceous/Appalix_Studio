import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import type { Metadata } from 'next'
import type { WorkspaceMember, WorkspaceMemberRole } from '@/lib/types'
import { ROLE_RANK } from '@/lib/types'
import type { SageForm, SageFormSubmission } from '@/app/actions/sage-forms'
import { FormsTable, type FormFilters } from '@/components/dashboard/forms-table'
import { SubpageToolbar, type SubpagePreset } from '@/components/dashboard/subpage-toolbar'
import { getAutoSettings } from '@/app/actions/sage-auto-settings'
import { getActivityFeed, resolveViewingAs } from '@/app/actions/activity-feed'
import { ActivitySidebar } from '@/components/team/activity-sidebar'

export const metadata: Metadata = { title: 'Forms' }

function getDateRange(preset: SubpagePreset, customFrom?: string, customTo?: string): { from: string | null; to: string | null } {
  if (preset === 'custom') {
    return {
      from: customFrom ? new Date(customFrom).toISOString() : null,
      to:   customTo   ? new Date(customTo + 'T23:59:59').toISOString() : null,
    }
  }
  const now = new Date()
  if (preset === 'today') {
    const from = new Date(now); from.setHours(0, 0, 0, 0)
    return { from: from.toISOString(), to: null }
  }
  if (preset === 'yesterday') {
    const from = new Date(now); from.setDate(from.getDate() - 1); from.setHours(0, 0, 0, 0)
    const to   = new Date(now); to.setHours(0, 0, 0, 0)
    return { from: from.toISOString(), to: to.toISOString() }
  }
  if (preset === '7d') {
    const from = new Date(now); from.setDate(from.getDate() - 7)
    return { from: from.toISOString(), to: null }
  }
  if (preset === '30d') {
    const from = new Date(now); from.setDate(from.getDate() - 30)
    return { from: from.toISOString(), to: null }
  }
  return { from: null, to: null }
}

export default async function FormsPage({
  searchParams,
}: {
  searchParams: Promise<FormFilters & { activityDate?: string }>
}) {
  const [params, autoSettings] = await Promise.all([searchParams, getAutoSettings()])
  const preset = (['today','yesterday','7d','30d','custom'].includes(params.preset ?? '') ? params.preset : 'all') as SubpagePreset
  const { from: dateFrom, to: dateTo } = getDateRange(preset, params.from, params.to)

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
  const membership = membershipRaw as Pick<WorkspaceMember, 'workspace_id' | 'role'> | null
  if (!membership) redirect('/login')
  const workspaceId = membership.workspace_id
  const callerRank  = ROLE_RANK[(membership.role ?? 'viewer') as WorkspaceMemberRole] ?? 1

  // viewAs: manager+ can browse a team member's form submissions
  const viewAsUserId = (params.viewAs && callerRank >= ROLE_RANK.manager) ? params.viewAs : null

  const isRestricted = viewAsUserId ? true : callerRank < ROLE_RANK.admin

  // For restricted users: find visible form IDs (forms created by them or their employees)
  let visibleFormIds: string[] = []
  if (isRestricted) {
    const admin = createAdminClient()
    let visibleUserIds = viewAsUserId ? [viewAsUserId] : [user.id]
    if (!viewAsUserId && callerRank >= ROLE_RANK.manager) {
      const { data: belowMembers } = await admin
        .from('workspace_members').select('user_id, role').eq('workspace_id', workspaceId)
      const below = (belowMembers ?? []) as { user_id: string; role: WorkspaceMemberRole }[]
      const employeeIds = below
        .filter(m => (ROLE_RANK[m.role] ?? 0) < ROLE_RANK.manager && m.user_id !== user.id)
        .map(m => m.user_id)
      visibleUserIds = [user.id, ...employeeIds]
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: visibleForms } = await (admin as any)
      .from('sage_forms')
      .select('id')
      .eq('workspace_id', workspaceId)
      .in('created_by', visibleUserIds)
    visibleFormIds = ((visibleForms ?? []) as { id: string }[]).map(f => f.id)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let subsQuery = (supabase as any)
    .from('sage_form_submissions')
    .select('id, form_id, fields, ai_priority, ai_summary, ai_insights, ai_action, ai_entities, ai_analyzed_at, actioned_at, action_type, created_at, mailchimp_synced_at')
    .eq('workspace_id', workspaceId)

  if (isRestricted) {
    if (visibleFormIds.length === 0) {
      // No visible forms — return empty
      subsQuery = subsQuery.eq('form_id', '00000000-0000-0000-0000-000000000000')
    } else {
      subsQuery = subsQuery.in('form_id', visibleFormIds)
    }
  }

  if (dateFrom)        subsQuery = subsQuery.gte('created_at', dateFrom)
  if (dateTo)          subsQuery = subsQuery.lt('created_at', dateTo)
  if (params.form)     subsQuery = subsQuery.eq('form_id', params.form)
  if (params.status === 'pending') {
    subsQuery = subsQuery.is('actioned_at', null)
  } else if (params.status) {
    subsQuery = subsQuery.eq('action_type', params.status)
  }

  subsQuery = subsQuery.order('created_at', { ascending: false }).limit(200)

  // Mailchimp connection status (admin client bypasses RLS on sage_integrations)
  const { data: mailchimpRaw } = await createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from('sage_integrations' as any)
    .select('status, config')
    .eq('workspace_id', workspaceId)
    .eq('provider', 'mailchimp')
    .maybeSingle()
  const mailchimpCfg       = (mailchimpRaw as { status: string; config: { list_id?: string; access_token?: string; server?: string } } | null)
  const mailchimpConnected = mailchimpCfg?.status === 'connected'
  const mailchimpListId    = mailchimpCfg?.config?.list_id ?? ''

  // Fetch all Mailchimp audiences so users can pick per-form
  let mailchimpLists: Array<{ id: string; name: string }> = []
  if (mailchimpConnected && mailchimpCfg?.config?.access_token) {
    try {
      const mcServer = mailchimpCfg.config.server ?? 'us1'
      const mcRes = await fetch(`https://${mcServer}.api.mailchimp.com/3.0/lists?count=50&fields=lists.id,lists.name`, {
        headers: { Authorization: `Bearer ${mailchimpCfg.config.access_token}` },
      })
      const mcData = await mcRes.json() as { lists?: Array<{ id: string; name: string }> }
      mailchimpLists = mcData.lists ?? []
    } catch { /* non-fatal */ }
  }

  const [formsRes, submissionsRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    isRestricted && visibleFormIds.length > 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (supabase as any).from('sage_forms').select('id, name, description, is_active, created_at, mailchimp_list_id').eq('workspace_id', workspaceId).in('id', visibleFormIds).order('name', { ascending: true })
      : isRestricted
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? Promise.resolve({ data: [] })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        : (supabase as any).from('sage_forms').select('id, name, description, is_active, created_at, mailchimp_list_id').eq('workspace_id', workspaceId).order('name', { ascending: true }),
    subsQuery,
  ])

  let submissions = (submissionsRes.data ?? []) as SageFormSubmission[]
  const forms     = (formsRes.data       ?? []) as SageForm[]

  // Client-side search filter (name/email from fields or ai_entities)
  if (params.q) {
    const q = params.q.toLowerCase()
    submissions = submissions.filter(s => {
      const name  = (s.ai_entities?.name  ?? s.fields.name  ?? '').toLowerCase()
      const email = (s.ai_entities?.email ?? s.fields.email ?? '').toLowerCase()
      return name.includes(q) || email.includes(q)
    })
  }

  // Team members for "My view" picker (managers+ only)
  const teamMembersForPicker = await (async () => {
    if (callerRank < ROLE_RANK.manager) return []
    const adminClient = createAdminClient()
    const [membersRes, profilesRes] = await Promise.all([
      adminClient.from('workspace_members').select('user_id, role').eq('workspace_id', workspaceId).not('accepted_at', 'is', null),
      adminClient.from('user_profiles').select('user_id, first_name, last_name'),
    ])
    type PRow = { user_id: string; first_name: string; last_name: string | null }
    type MRow = { user_id: string; role: WorkspaceMemberRole }
    const pMap = new Map((profilesRes.data ?? [] as PRow[]).map((p: PRow) => [p.user_id, p]))
    return ((membersRes.data ?? []) as MRow[])
      .filter(m => (ROLE_RANK[m.role] ?? 0) < callerRank && m.user_id !== user.id)
      .map(m => { const p = pMap.get(m.user_id); return { user_id: m.user_id, name: p ? [p.first_name, p.last_name].filter(Boolean).join(' ') : '' } })
  })()

  const activityDate = params.activityDate ?? new Date().toISOString().slice(0, 10)
  const activityUserId = viewAsUserId ?? user.id
  const [activity, viewingAs] = await Promise.all([
    getActivityFeed(activityUserId, workspaceId, activityDate),
    resolveViewingAs(params.viewAs, workspaceId),
  ])

  return (
    <div className="-m-8 flex flex-col h-screen overflow-hidden">
      <SubpageToolbar
        sourceKey="forms"
        preset={preset}
        customFrom={params.from}
        customTo={params.to}
        autoEnabled={autoSettings.forms_auto_enabled}
        viewAsUserId={viewAsUserId}
        teamMembers={teamMembersForPicker}
      />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <FormsTable
            submissions={submissions}
            forms={forms}
            filters={params}
            readonly={!!viewAsUserId}
            mailchimpConnected={mailchimpConnected}
            mailchimpListId={mailchimpListId}
            mailchimpLists={mailchimpLists}
          />
        </div>
        <ActivitySidebar
          activity={activity}
          date={activityDate}
          currentPath="/dashboard/forms"
          viewingAs={viewingAs}
        />
      </div>
    </div>
  )
}
