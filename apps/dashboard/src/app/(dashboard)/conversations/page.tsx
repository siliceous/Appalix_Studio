import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import type { Metadata } from 'next'
import { ConversationsClient } from './conversations-client'

export const metadata: Metadata = { title: 'Conversations' }

function getDateRange(range: string, customFrom?: string, customTo?: string) {
  const now = new Date()
  switch (range) {
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

export type ConvRow = {
  id: string
  title: string | null
  platform: string | null
  status: string | null
  sentiment: string | null
  message_count: number
  last_activity_at: string
  ai_priority: string | null
  ai_summary: string | null
  ai_entities: Record<string, string> | null
  bot_id: string | null
  bots: { id: string; name: string } | null
}

export type BotOption = { id: string; name: string }

export type ConvFilters = {
  bot?: string
  platform?: string
  status?: string
  range?: string
  from?: string
  to?: string
  q?: string
}

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<ConvFilters>
}) {
  const params  = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members').select('workspace_id')
    .eq('user_id', user.id).order('created_at', { ascending: true }).limit(1).single()
  const membership = membershipRaw as { workspace_id: string } | null
  if (!membership) redirect('/login')
  const workspaceId = membership.workspace_id

  // Fetch bots for filter dropdown
  const { data: botsData } = await supabase
    .from('bots').select('id, name').eq('workspace_id', workspaceId)
    .order('name', { ascending: true })
  const bots = (botsData ?? []) as BotOption[]

  // Build conversations query with all filters
  const { from: dateFrom, to: dateTo } = getDateRange(params.range ?? 'all', params.from, params.to)

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
    <ConversationsClient
      conversations={conversations}
      bots={bots}
      filters={params}
    />
  )
}
