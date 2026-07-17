import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import Link             from 'next/link'
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

export const metadata: Metadata = { title: 'SMS' }

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

export default async function SmsPage({
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
  const [membersRes, profilesRes] = await Promise.all([
    callerRank >= ROLE_RANK.manager
      ? admin.from('workspace_members').select('user_id, role').eq('workspace_id', workspaceId)
      : Promise.resolve({ data: [] }),
    callerRank >= ROLE_RANK.manager
      ? admin.from('user_profiles').select('user_id, first_name, last_name')
      : Promise.resolve({ data: [] }),
  ])

  type PRow = { user_id: string; first_name: string; last_name: string | null }
  const pMap: Record<string, PRow> = {}
  for (const p of (profilesRes.data ?? []) as PRow[]) pMap[p.user_id] = p
  type MRow = { user_id: string; role: WorkspaceMemberRole }
  const teamMembers: TeamMember[] = callerRank >= ROLE_RANK.manager
    ? ((membersRes.data ?? []) as MRow[])
        .filter(m => (ROLE_RANK[m.role] ?? 0) <= callerRank && m.user_id !== user.id)
        .map(m => {
          const p = pMap[m.user_id]
          return { user_id: m.user_id, name: p ? [p.first_name, p.last_name].filter(Boolean).join(' ') : m.user_id }
        })
    : []

  const { from: dateFrom, to: dateTo } = getDateRange(preset, params.from, params.to)
  const viewAsUserId = (params.viewAs && callerRank >= ROLE_RANK.manager) ? params.viewAs : null

  // Use admin client so the bots foreign-key embed doesn't inner-join away
  // conversations that have no bot assigned (bot_id = null).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = admin
    .from('conversations')
    .select('id, title, platform, status, sentiment, message_count, last_activity_at, ai_priority, ai_summary, ai_entities, bot_id, assigned_to')
    .eq('workspace_id', workspaceId)
    .eq('platform', 'sms')
    .is('deleted_at', null)
    .order('last_activity_at', { ascending: false })
    .limit(150)

  if (params.status && params.status !== 'trash') query = query.eq('status', params.status)
  if (dateFrom) query = query.gte('last_activity_at', dateFrom)
  if (dateTo)   query = query.lte('last_activity_at', dateTo)
  if (params.q) query = query.ilike('title', `%${params.q}%`)

  const { data: rawConversations } = await query
  const conversations = (rawConversations ?? []) as ConvRow[]

  const [activeCountRes, completedCountRes, archivedCountRes] = await Promise.all([
    admin.from('conversations').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('platform', 'sms').eq('status', 'active').is('deleted_at', null),
    admin.from('conversations').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('platform', 'sms').eq('status', 'completed').is('deleted_at', null),
    admin.from('conversations').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('platform', 'sms').eq('status', 'archived').is('deleted_at', null),
  ])
  const statusCounts = {
    active:    activeCountRes.count    ?? 0,
    completed: completedCountRes.count ?? 0,
    archived:  archivedCountRes.count  ?? 0,
  }

  const activityDate  = params.activityDate ?? new Date().toISOString().slice(0, 10)
  const activityUserId = viewAsUserId ?? user.id
  const [activity, viewingAs, automationStates] = await Promise.all([
    getActivityFeed(activityUserId, workspaceId, activityDate),
    resolveViewingAs(params.viewAs, workspaceId),
    getActiveAutomationStates(),
  ])

  return (
    <div className="-m-8 flex flex-col h-screen overflow-hidden">
      <SageToolbar
        pageKey="sms"
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
            bots={[] as BotOption[]}
            filters={{ ...params, platform: 'sms' }}
            teamMembers={teamMembers}
            canAssign={callerRank >= ROLE_RANK.manager && !viewAsUserId}
            readonly={!!viewAsUserId}
            statusCounts={statusCounts}
            detailBasePath="/dashboard/sms"
            pageTitle="SMS"
            initialAutomationStates={automationStates}
            pageSubtitle={`All SMS conversations — ${conversations.length} shown`}
            headerAction={
              <Link
                href="/integrations/sms/setup"
                className="flex items-center gap-1.5 px-3 py-2 bg-[#15A4AE] hover:bg-[#128a94] text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
              >
                + Add number
              </Link>
            }
          />
        </div>
        <ActivitySidebar
          activity={activity}
          date={activityDate}
          currentPath="/dashboard/sms"
          viewingAs={viewingAs}
        />
      </div>
    </div>
  )
}
