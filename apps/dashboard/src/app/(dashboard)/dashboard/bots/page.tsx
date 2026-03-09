import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import type { Metadata } from 'next'
import { ConversationsClient } from '@/app/(dashboard)/conversations/conversations-client'
import { SubpageToolbar, type SubpagePreset } from '@/components/dashboard/subpage-toolbar'
import { getAutoSettings } from '@/app/actions/sage-auto-settings'
import type { ConvRow, BotOption, ConvFilters } from '@/app/(dashboard)/conversations/page'

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
    .from('workspace_members').select('workspace_id')
    .eq('user_id', user.id).order('created_at', { ascending: true }).limit(1).single()
  const membership = membershipRaw as { workspace_id: string } | null
  if (!membership) redirect('/login')
  const workspaceId = membership.workspace_id

  const { data: botsData } = await supabase
    .from('bots').select('id, name').eq('workspace_id', workspaceId)
    .order('name', { ascending: true })
  const bots = (botsData ?? []) as BotOption[]

  const { from: dateFrom, to: dateTo } = getDateRange(preset, params.from, params.to)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from('conversations')
    .select('id, title, platform, status, sentiment, message_count, last_activity_at, ai_priority, ai_summary, ai_entities, bot_id, bots(id, name)')
    .eq('workspace_id', workspaceId)
    .order('last_activity_at', { ascending: false })
    .limit(150)

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
        />
      </div>
    </div>
  )
}
