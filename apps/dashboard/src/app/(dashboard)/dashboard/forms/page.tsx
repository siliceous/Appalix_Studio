import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import type { Metadata } from 'next'
import type { WorkspaceMember, WorkspaceMemberRole } from '@/lib/types'
import { ROLE_RANK } from '@/lib/types'
import type { SageForm, SageFormSubmission } from '@/app/actions/sage-forms'
import { FormsTable, type FormFilters } from '@/components/dashboard/forms-table'
import { SageToolbar, type TriagePreset } from '@/components/dashboard/sage-toolbar'
import { getAutoSettings } from '@/app/actions/sage-auto-settings'
import { getActivityFeed, resolveViewingAs } from '@/app/actions/activity-feed'
import { getActiveAutomationStates } from '@/app/actions/automation-executions'
import { ActivitySidebar } from '@/components/team/activity-sidebar'


export const metadata: Metadata = { title: 'Forms' }

function getDateRange(preset: TriagePreset, customFrom?: string, customTo?: string): { from: string | null; to: string | null } {
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
  const preset = (['today','yesterday','7d','30d','custom'].includes(params.preset ?? '') ? params.preset : 'all') as TriagePreset
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
    // Include forms created by visible users OR with no creator (webhook-created forms)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: visibleForms } = await (admin as any)
      .from('sage_forms')
      .select('id')
      .eq('workspace_id', workspaceId)
      .or(`created_by.in.(${visibleUserIds.join(',')}),created_by.is.null`)
    visibleFormIds = ((visibleForms ?? []) as { id: string }[]).map(f => f.id)
  }

  // Use admin client to bypass RLS — webhook-inserted submissions have no auth context
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let subsQuery = (createAdminClient() as any)
    .from('sage_form_submissions')
    .select('id, form_id, source_platform, raw_payload, fields, ai_priority, ai_summary, ai_insights, ai_action, ai_entities, ai_analyzed_at, actioned_at, action_type, assigned_to, created_at, mailchimp_synced_at')
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)

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
  } else if (params.status && params.status !== 'trash') {
    subsQuery = subsQuery.eq('action_type', params.status)
  }

  subsQuery = subsQuery.order('created_at', { ascending: false }).limit(200)

  const adminClient = createAdminClient()
  // All connected email marketing integrations (admin client bypasses RLS)
  const { data: emailIntegRaw } = await adminClient
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from('sage_integrations' as any)
    .select('provider, status, config, sync_enabled')
    .eq('workspace_id', workspaceId)
    .eq('status', 'connected')
    .in('provider', ['mailchimp', 'activecampaign', 'convertkit', 'klaviyo', 'constantcontact'])

  // Connected form plugin integrations
  const { data: formIntegRaw } = await adminClient
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from('sage_integrations' as any)
    .select('provider')
    .eq('workspace_id', workspaceId)
    .eq('status', 'connected')
    .in('provider', ['gravity_forms', 'google_forms', 'typeform', 'fluent_forms'])

  // Connected lead ad sources (meta, google_ads)
  const { data: leadAdRaw } = await adminClient
    .from('lead_ad_sources')
    .select('platform')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')

  type EmailIntegRow = { provider: string; status: string; config: Record<string, string>; sync_enabled: boolean }
  const emailIntegrations = (emailIntegRaw ?? []) as EmailIntegRow[]

  // Connected platform names for the banner
  const connectedEmailProviders = emailIntegrations.map(r => r.provider)
  const connectedFormProviders  = ((formIntegRaw ?? []) as { provider: string }[]).map(r => r.provider)
  const connectedLeadAdProviders = ((leadAdRaw ?? []) as { platform: string }[]).map(r => r.platform)

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
  const [activity, viewingAs, automationStates] = await Promise.all([
    getActivityFeed(activityUserId, workspaceId, activityDate),
    resolveViewingAs(params.viewAs, workspaceId),
    getActiveAutomationStates(),
  ])

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <SageToolbar
        pageKey="forms"
        preset={preset}
        customFrom={params.from}
        customTo={params.to}
        autoEnabled={autoSettings.forms_auto_enabled}
        viewAsUserId={viewAsUserId}
        teamMembers={teamMembersForPicker}
      />
      <div className="flex flex-1 min-h-0 overflow-hidden">
          <FormsTable
            submissions={submissions}
            forms={forms}
            filters={params}
            readonly={!!viewAsUserId}
            workspaceId={workspaceId}
            connectedEmailProviders={connectedEmailProviders}
            connectedFormProviders={connectedFormProviders}
            connectedLeadAdProviders={connectedLeadAdProviders}
            teamMembers={teamMembersForPicker}
            canAllocate={callerRank >= ROLE_RANK.manager}
            initialAutomationStates={automationStates}
          />
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
