import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { MessageSquare, Bot, Plug, TrendingUp } from 'lucide-react'
import { formatTokens, formatCost, timeAgo, PLATFORM_META } from '@/lib/utils'
import type { Metadata } from 'next'
import type { WorkspaceMember, Conversation, UsageEvent } from '@/lib/types'

type RecentConversation = Pick<Conversation, 'id' | 'title' | 'platform' | 'status' | 'message_count' | 'last_activity_at'>
type UsageSummaryRow    = Pick<UsageEvent, 'tokens_input' | 'tokens_output' | 'cost_usd'>

export const metadata: Metadata = { title: 'Overview' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get workspace
  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()
  const membership = membershipRaw as Pick<WorkspaceMember, 'workspace_id'> | null

  if (!membership) redirect('/login')
  const workspaceId = membership.workspace_id

  // Parallel data fetching
  const [
    { count: totalConversations },
    { count: totalBots },
    { count: totalIntegrations },
    { data: recentConversationsRaw },
    { data: usageSummaryRaw },
  ] = await Promise.all([
    supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId),
    supabase
      .from('bots')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId),
    supabase
      .from('integrations')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('status', 'active'),
    supabase
      .from('conversations')
      .select('id, title, platform, status, message_count, last_activity_at, created_at')
      .eq('workspace_id', workspaceId)
      .order('last_activity_at', { ascending: false })
      .limit(8),
    supabase
      .from('usage_events')
      .select('tokens_input, tokens_output, cost_usd')
      .eq('workspace_id', workspaceId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
  ])

  const recentConversations = (recentConversationsRaw ?? []) as RecentConversation[]
  const usageSummary        = (usageSummaryRaw        ?? []) as UsageSummaryRow[]

  const totalTokens = usageSummary.reduce((s, e) => s + e.tokens_input + e.tokens_output, 0)
  const totalCost   = usageSummary.reduce((s, e) => s + Number(e.cost_usd), 0)

  const stats = [
    { label: 'Total Conversations', value: totalConversations ?? 0,    icon: MessageSquare, color: 'text-blue-600',   bg: 'bg-blue-50' },
    { label: 'Active Bots',         value: totalBots ?? 0,             icon: Bot,           color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Active Integrations', value: totalIntegrations ?? 0,     icon: Plug,          color: 'text-green-600',  bg: 'bg-green-50' },
    { label: 'Tokens (30d)',        value: formatTokens(totalTokens),   icon: TrendingUp,    color: 'text-orange-600', bg: 'bg-orange-50' },
  ]

  return (
    <div>
      <Header title="Overview" description="Your workspace at a glance" />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">{s.label}</span>
              <div className={`${s.bg} ${s.color} p-2 rounded-lg`}>
                <s.icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent conversations */}
        <div className="xl:col-span-2 bg-white rounded-xl border">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Recent Conversations</h2>
            <a href="/conversations" className="text-xs text-brand-600 hover:underline">View all</a>
          </div>
          <div className="divide-y">
            {recentConversations?.length === 0 && (
              <p className="px-5 py-8 text-sm text-gray-400 text-center">No conversations yet.</p>
            )}
            {recentConversations?.map((c) => (
              <a key={c.id} href={`/conversations/${c.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {c.title ?? 'Untitled conversation'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {c.message_count} messages · {timeAgo(c.last_activity_at)}
                  </p>
                </div>
                {c.platform && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLATFORM_META[c.platform as keyof typeof PLATFORM_META]?.color}`}>
                    {PLATFORM_META[c.platform as keyof typeof PLATFORM_META]?.label}
                  </span>
                )}
              </a>
            ))}
          </div>
        </div>

        {/* Cost summary */}
        <div className="bg-white rounded-xl border">
          <div className="px-5 py-4 border-b">
            <h2 className="text-sm font-semibold text-gray-900">Usage (last 30 days)</h2>
          </div>
          <div className="px-5 py-5 space-y-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Tokens consumed</p>
              <p className="text-2xl font-semibold text-gray-900">{formatTokens(totalTokens)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Estimated cost</p>
              <p className="text-2xl font-semibold text-gray-900">{formatCost(totalCost)}</p>
            </div>
            <a
              href="/analytics"
              className="block mt-4 text-center text-xs text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg py-2 transition-colors"
            >
              View detailed analytics →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
