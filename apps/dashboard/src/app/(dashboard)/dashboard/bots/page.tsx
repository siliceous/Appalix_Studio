import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import type { Metadata } from 'next'
import { ConversationsClient } from '@/app/(dashboard)/conversations/conversations-client'
import { SageToolbar, type TriagePreset } from '@/components/dashboard/sage-toolbar'
import { getAutoSettings } from '@/app/actions/sage-auto-settings'
import type { ConvRow, BotOption, ConvFilters, TeamMember } from '@/app/(dashboard)/conversations/page'
import { ROLE_RANK } from '@/lib/types'
import type { WorkspaceMemberRole } from '@/lib/types'
import { createAdminClient } from '@/lib/supabase/server'
import { getActivityFeed, resolveViewingAs } from '@/app/actions/activity-feed'
import { getActiveAutomationStates } from '@/app/actions/automation-executions'
import { ActivitySidebar } from '@/components/team/activity-sidebar'


export const metadata: Metadata = { title: 'Bot Conversations' }

function getDateRange(preset: TriagePreset, customFrom?: string, customTo?: string) {
  const now = new Date()
  switch (preset) {
    case 'today': {
      const from = new Date(now); from.setHours(0, 0, 0, 0)
      return { from: from.toISOString(), to: null }
    }
    case 'yesterday': {
      const from = new Date(now); from.setDate(from.getDate() - 1); from.setHours(0, 0, 0, 0)
      const to   = new Date(now); to.setHours(0, 0, 0, 0)
      return { from: from.toISOString(), to: to.toISOString() }
    }
    case '7d': {
      const from = new Date(now); from.setDate(from.getDate() - 7)
      return { from: from.toISOString(), to: null }
    }
    case '30d': {
      const from = new Date(now); from.setDate(from.getDate() - 30)
      return { from: from.toISOString(), to: null }
    }
    case 'custom': {
      return {
        from: customFrom ? new Date(customFrom + 'T00:00:00').toISOString() : null,
        to:   customTo   ? new Date(customTo   + 'T23:59:59').toISOString() : null,
      }
    }
    default: return { from: null, to: null }
  }
}

export default async function BotsPage({
  searchParams,
}: {
  searchParams: Promise<ConvFilters & { activityDate?: string }>
}) {
  const [params, autoSettings] = await Promise.all([searchParams, getAutoSettings()])
  const preset = (['today','yesterday','7d','30d','custom'].includes(params.preset ?? '') ? params.preset : 'all') as TriagePreset

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members').select('workspace_id, role')
    .eq('user_id', user.id).order('created_at', { ascending: true }).limit(1).single()
  const membership = membershipRaw as { workspace_id: string; role: WorkspaceMemberRole } | null
  if (!membership) redirect('/login')
  const workspaceId = membership.workspace_id
  const callerRank  = ROLE_RANK[membership.role] ?? 1

  const admin = createAdminClient()
  const [botsRes, membersRes, profilesRes] = await Promise.all([
    supabase.from('bots').select('id, name, created_by').eq('workspace_id', workspaceId).order('name'),
    callerRank >= ROLE_RANK.manager
      ? admin.from('workspace_members').select('user_id, role').eq('workspace_id', workspaceId)
      : Promise.resolve({ data: [] }),
    callerRank >= ROLE_RANK.manager
      ? admin.from('user_profiles').select('user_id, first_name, last_name')
      : Promise.resolve({ data: [] }),
  ])
  const bots = (botsRes.data ?? []) as (BotOption & { created_by: string | null })[]

  // Build team member list for assign dropdown (only if caller is manager+)
  type PRow = { user_id: string; first_name: string; last_name: string | null }
  const pMap: Record<string, PRow> = {}
  for (const p of (profilesRes.data ?? []) as PRow[]) pMap[p.user_id] = p
  type MRow = { user_id: string; role: WorkspaceMemberRole }
  const teamMembers: TeamMember[] = callerRank >= ROLE_RANK.manager
    ? ((membersRes.data ?? []) as MRow[])
        .filter(m => (ROLE_RANK[m.role] ?? 0) <= callerRank && m.user_id !== user.id)  // can only assign to peers and below, not self
        .map(m => {
          const p = pMap[m.user_id]
          return { user_id: m.user_id, name: p ? [p.first_name, p.last_name].filter(Boolean).join(' ') : m.user_id }
        })
    : []

  const { from: dateFrom, to: dateTo } = getDateRange(preset, params.from, params.to)

  // viewAs: manager+ can browse a team member's conversations
  const viewAsUserId = (params.viewAs && callerRank >= ROLE_RANK.manager) ? params.viewAs : null

  // Role-based scoping: admin/owner see all; manager sees own+employees; employee sees own
  // If viewAs is active, scope entirely to that user
  const isRestricted = viewAsUserId ? true : callerRank < ROLE_RANK.admin
  let visibleUserIds: string[] = []
  if (viewAsUserId) {
    visibleUserIds = [viewAsUserId]
  } else if (isRestricted) {
    if (callerRank >= ROLE_RANK.manager) {
      const allMembers = (membersRes.data ?? []) as MRow[]
      const employeeIds = allMembers
        .filter(m => (ROLE_RANK[m.role] ?? 0) < ROLE_RANK.manager && m.user_id !== user.id)
        .map(m => m.user_id)
      visibleUserIds = [user.id, ...employeeIds]
    } else {
      visibleUserIds = [user.id]
    }
  }

  // For restricted users: scope by bots they created + conversations assigned to them
  const visibleBotIds = isRestricted
    ? bots.filter(b => b.created_by && visibleUserIds.includes(b.created_by)).map(b => b.id)
    : []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from('conversations')
    .select('id, title, platform, status, sentiment, message_count, last_activity_at, ai_priority, ai_summary, ai_entities, bot_id, assigned_to, bots(id, name)')
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .order('last_activity_at', { ascending: false })
    .limit(150)

  if (isRestricted) {
    // Show conversations from their bots OR directly assigned to them
    if (visibleBotIds.length === 0 && visibleUserIds.length > 0) {
      // No owned bots — only show assigned conversations
      query = visibleUserIds.length === 1
        ? query.eq('assigned_to', visibleUserIds[0])
        : query.in('assigned_to', visibleUserIds)
    } else if (visibleBotIds.length > 0) {
      const botFilter     = visibleBotIds.length === 1 ? `bot_id.eq.${visibleBotIds[0]}` : `bot_id.in.(${visibleBotIds.join(',')})`
      const assignFilter  = visibleUserIds.length === 1 ? `assigned_to.eq.${visibleUserIds[0]}` : `assigned_to.in.(${visibleUserIds.join(',')})`
      query = query.or(`${botFilter},${assignFilter}`)
    }
  }

  if (params.platform) query = query.eq('platform', params.platform)
  if (params.status && params.status !== 'trash') query = query.eq('status', params.status)
  if (params.bot)      query = query.eq('bot_id', params.bot)
  if (dateFrom)        query = query.gte('last_activity_at', dateFrom)
  if (dateTo)          query = query.lte('last_activity_at', dateTo)
  if (params.q)        query = query.ilike('title', `%${params.q}%`)

  const { data: rawConversations } = await query
  const conversations = (rawConversations ?? []) as ConvRow[]

  // Status counts (workspace-level, for the filter tab badges)
  const [activeCountRes, completedCountRes, archivedCountRes] = await Promise.all([
    supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'active').is('deleted_at', null),
    supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'completed').is('deleted_at', null),
    supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'archived').is('deleted_at', null),
  ])
  const statusCounts = {
    active:    activeCountRes.count    ?? 0,
    completed: completedCountRes.count ?? 0,
    archived:  archivedCountRes.count  ?? 0,
  }

  const activityDate = params.activityDate ?? new Date().toISOString().slice(0, 10)
  const activityUserId = viewAsUserId ?? user.id
  const [activity, viewingAs, automationStates] = await Promise.all([
    getActivityFeed(activityUserId, workspaceId, activityDate),
    resolveViewingAs(params.viewAs, workspaceId),
    getActiveAutomationStates(),
  ])

  return (
    <div className="-m-8 flex flex-col h-screen overflow-hidden">
      <SageToolbar
        pageKey="conversations"
        preset={preset}
        customFrom={params.from}
        customTo={params.to}
        autoEnabled={autoSettings.bots_auto_enabled}
        viewAsUserId={viewAsUserId}
        teamMembers={teamMembers}
      />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <ConversationsClient
            conversations={conversations}
            bots={bots}
            filters={params}
            teamMembers={teamMembers}
            canAssign={callerRank >= ROLE_RANK.manager && !viewAsUserId}
            readonly={!!viewAsUserId}
            showNewBotButton
            statusCounts={statusCounts}
            initialAutomationStates={automationStates}
          />
        </div>
        <ActivitySidebar
          activity={activity}
          date={activityDate}
          currentPath="/dashboard/bots"
          viewingAs={viewingAs}
        />
      </div>
    </div>
  )
}
