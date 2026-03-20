import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import type { Conversation } from '@/lib/types'
import type { ConvRow } from '@/app/(dashboard)/conversations/page'
import { ConversationPanelClient, type PanelMessage } from './conversation-panel-client'
import { SubpageToolbar } from '@/components/dashboard/subpage-toolbar'
import { getAutoSettings } from '@/app/actions/sage-auto-settings'

export const metadata: Metadata = { title: 'Conversation' }

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Workspace
  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  const workspaceId = (membershipRaw as { workspace_id: string } | null)?.workspace_id
  if (!workspaceId) redirect('/login')

  // Selected conversation + messages in parallel with conversation list
  const [convRes, msgsRes, listRes, autoSettings] = await Promise.all([
    supabase
      .from('conversations')
      .select('id, title, platform, status, sentiment, message_count, last_activity_at, created_at, ai_priority, ai_summary, ai_entities, bot_id, assigned_to, bots(id, name)')
      .eq('id', id)
      .single(),
    supabase
      .from('messages')
      .select('id, role, content, tokens_input, tokens_output, response_time_ms, is_error, created_at')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('conversations')
      .select('id, title, platform, status, sentiment, message_count, last_activity_at, created_at, ai_priority, ai_summary, ai_entities, bot_id, assigned_to, bots(id, name)')
      .eq('workspace_id', workspaceId)
      .order('last_activity_at', { ascending: false })
      .limit(100),
    getAutoSettings(),
  ])

  const conversation = convRes.data as (Conversation & { bots?: { id: string; name: string } | null }) | null
  if (!conversation) notFound()

  const messages  = (msgsRes.data ?? []) as PanelMessage[]
  const convList  = (listRes.data ?? []) as ConvRow[]

  return (
    <div className="-m-8 flex flex-col h-screen overflow-hidden">
      <SubpageToolbar
        sourceKey="bots"
        preset="all"
        autoEnabled={autoSettings.bots_auto_enabled}
      />
      <div className="flex flex-1 overflow-hidden">
        <ConversationPanelClient
          conversations={convList}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          current={conversation as any}
          messages={messages}
        />
      </div>
    </div>
  )
}
