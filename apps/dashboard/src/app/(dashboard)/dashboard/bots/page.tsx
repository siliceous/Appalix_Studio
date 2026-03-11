import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import type { Metadata } from 'next'
import { ConversationsClient } from '@/app/(dashboard)/conversations/conversations-client'
import { SubpageToolbar, type SubpagePreset } from '@/components/dashboard/subpage-toolbar'
import { getAutoSettings } from '@/app/actions/sage-auto-settings'
import type { ConvRow, BotOption, ConvFilters, TeamMember } from '@/app/(dashboard)/conversations/page'
import { ROLE_RANK } from '@/lib/types'
import type { WorkspaceMemberRole } from '@/lib/types'
import { createAdminClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Bot Conversations' }

function getDateRange(preset: SubpagePreset, customFrom?: string, customTo?: string) {
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
  searchParams: Promise<ConvFilters>
}) {
  const [params, autoSettings] = await Promise.all([searchParams, getAutoSettings()])
  const preset = (['today','yesterday','7d','30d','custom'].includes(params.preset ?? '') ? params.preset : 'all') as SubpagePreset

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
    supabase.from('bots').select('id, name').eq('workspace_id', workspaceId).order('name'),
    callerRank >= ROLE_RANK.manager
      ? admin.from('workspace_members').select('user_id, role').eq('workspace_id', workspaceId)
      : Promise.resolve({ data: [] }),
    callerRank >= ROLE_RANK.manager
      ? admin.from('user_profiles').select('user_id, first_name, last_name')
      : Promise.resolve({ data: [] }),
  ])
  const bots = (botsRes.data ?? []) as BotOption[]

  // Build team member list for assign dropdown (only if caller is manager+)
  type PRow = { user_id: string; first_name: string; last_name: string | null }
  const pMap: Record<string, PRow> = {}
  for (const p of (profilesRes.data ?? []) as PRow[]) pMap[p.user_id] = p
  type MRow = { user_id: string; role: WorkspaceMemberRole }
  const teamMembers: TeamMember[] = callerRank >= ROLE_RANK.manager
    ? ((membersRes.data ?? []) as MRow[])
        .filter(m => (ROLE_RANK[m.role] ?? 0) <= callerRank)  // can only assign to peers and below
        .map(m => {
          const p = pMap[m.user_id]
          return { user_id: m.user_id, name: p ? [p.first_name, p.last_name].filter(Boolean).join(' ') : m.user_id }
        })
    : []

  const { from: dateFrom, to: dateTo } = getDateRange(preset, params.from, params.to)

  // Role-based scoping: admin/owner see all; manager sees own+employees; employee sees own
  const isRestricted = callerRank < ROLE_RANK.admin
  let visibleAssignees: string[] = []
  if (isRestricted) {
    if (callerRank >= ROLE_RANK.manager) {
      const allMembers = (membersRes.data ?? []) as MRow[]
      const employeeIds = allMembers
        .filter(m => (ROLE_RANK[m.role] ?? 0) < ROLE_RANK.manager && m.user_id !== user.id)
        .map(m => m.user_id)
      visibleAssignees = [user.id, ...employeeIds]
    } else {
      visibleAssignees = [user.id]
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from('conversations')
    .select('id, title, platform, status, sentiment, message_count, last_activity_at, ai_priority, ai_summary, ai_entities, bot_id, assigned_to, bots(id, name)')
    .eq('workspace_id', workspaceId)
    .order('last_activity_at', { ascending: false })
    .limit(150)

  if (isRestricted) {
    if (visibleAssignees.length === 1) {
      query = query.eq('assigned_to', visibleAssignees[0])
    } else {
      query = query.in('assigned_to', visibleAssignees)
    }
  }

  if (params.platform) query = query.eq('platform', params.platform)
  if (params.status)   query = query.eq('status', params.status)
  if (params.bot)      query = query.eq('bot_id', params.bot)
  if (dateFrom)        query = query.gte('last_activity_at', dateFrom)
  if (dateTo)          query = query.lte('last_activity_at', dateTo)
  if (params.q)        query = query.ilike('title', `%${params.q}%`)

  const { data: rawConversations } = await query
  const conversations = (rawConversations ?? []) as ConvRow[]

  return (
    <div className="-m-8 flex flex-col h-screen overflow-hidden">
      <SubpageToolbar
        sourceKey="bots"
        preset={preset}
        customFrom={params.from}
        customTo={params.to}
        autoEnabled={autoSettings.bots_auto_enabled}
      />
      <div className="flex-1 overflow-y-auto">
        <ConversationsClient
          conversations={conversations}
          bots={bots}
          filters={params}
          teamMembers={teamMembers}
          canAssign={callerRank >= ROLE_RANK.manager}
        />
      </div>
    </div>
  )
}
