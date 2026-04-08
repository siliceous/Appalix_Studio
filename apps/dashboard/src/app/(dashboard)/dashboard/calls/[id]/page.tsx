import { createClient, createAdminClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import type { Conversation } from '@/lib/types'
import type { ConvRow } from '@/app/(dashboard)/conversations/page'
import { ConversationPanelClient, type PanelMessage, type TeamMember } from '@/app/(dashboard)/conversations/[id]/conversation-panel-client'
import { SageToolbar } from '@/components/dashboard/sage-toolbar'
import { getAutoSettings } from '@/app/actions/sage-auto-settings'
import { ROLE_RANK } from '@/lib/types'
import type { WorkspaceMemberRole } from '@/lib/types'

export const metadata: Metadata = { title: 'Phone Call' }

export default async function CallDetailPage({
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

  const [convRes, msgsRes, listRes, autoSettings, membersRes, profilesRes] = await Promise.all([
    supabase
      .from('conversations')
      .select('id, title, platform, platform_thread_id, status, sentiment, message_count, last_activity_at, created_at, ai_priority, ai_summary, ai_entities, bot_id, assigned_to, bot_paused, bots(id, name)')
      .eq('id', id)
      .single(),
    supabase
      .from('messages')
      .select('id, role, content, tokens_input, tokens_output, response_time_ms, is_error, created_at')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true }),
    // List scoped to voice only for prev/next navigation
    supabase
      .from('conversations')
      .select('id, title, platform, platform_thread_id, status, sentiment, message_count, last_activity_at, created_at, ai_priority, ai_summary, ai_entities, bot_id, assigned_to, bots(id, name)')
      .eq('workspace_id', workspaceId)
      .eq('platform', 'voice')
      .order('last_activity_at', { ascending: false })
      .limit(100),
    getAutoSettings(),
    canAssign ? admin.from('workspace_members').select('user_id, role').eq('workspace_id', workspaceId) : Promise.resolve({ data: [] }),
    canAssign ? admin.from('user_profiles').select('user_id, first_name, last_name') : Promise.resolve({ data: [] }),
  ])

  const conversation = convRes.data as (Conversation & { bots?: { id: string; name: string } | null }) | null
  if (!conversation) notFound()

  const messages = (msgsRes.data ?? []) as PanelMessage[]
  const convList = (listRes.data ?? []) as ConvRow[]

  const allIds = convList.map(c => c.id)
  const idx    = allIds.indexOf(id)
  const prevId = idx > 0 ? allIds[idx - 1] : null
  const nextId = idx < allIds.length - 1 ? allIds[idx + 1] : null

  type PRow = { user_id: string; first_name: string; last_name: string | null }
  type MRow = { user_id: string; role: WorkspaceMemberRole }
  const pMap = new Map(((profilesRes.data ?? []) as PRow[]).map(p => [p.user_id, p]))
  const teamMembers: TeamMember[] = ((membersRes.data ?? []) as MRow[])
    .filter(m => (ROLE_RANK[m.role] ?? 0) <= callerRank && m.user_id !== user.id)
    .map(m => {
      const p = pMap.get(m.user_id)
      return { user_id: m.user_id, name: p ? [p.first_name, p.last_name].filter(Boolean).join(' ') : m.user_id }
    })

  return (
    <div className="-m-8 flex flex-col h-screen overflow-hidden">
      <SageToolbar
        pageKey="calls"
        preset="all"
        autoEnabled={autoSettings.bots_auto_enabled}
      />
      <div className="flex flex-1 overflow-hidden">
        <ConversationPanelClient
          conversations={convList}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          current={conversation as any}
          messages={messages}
          teamMembers={teamMembers}
          canAssign={canAssign}
          smsSuggestedContact={null}
          prevId={prevId}
          nextId={nextId}
          listBasePath="/dashboard/calls"
          listTitle="Phone Calls"
        />
      </div>
    </div>
  )
}
