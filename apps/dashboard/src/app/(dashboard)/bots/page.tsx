import { createClient }  from '@/lib/supabase/server'
import { redirect }       from 'next/navigation'
import { Header }         from '@/components/layout/header'
import Image from 'next/image'
import { Bot, Plus, Plug, MessageSquare, TrendingUp } from 'lucide-react'
import { formatDate, formatTokens, formatCost, timeAgo, PLATFORM_META } from '@/lib/utils'
import type { Metadata } from 'next'
import type { Bot as BotRow, Conversation, UsageEvent } from '@/lib/types'
import { SageToolbar } from '@/components/dashboard/sage-toolbar'

type RecentConversation = Pick<Conversation, 'id' | 'title' | 'platform' | 'status' | 'message_count' | 'last_activity_at'>
type UsageSummaryRow    = Pick<UsageEvent, 'tokens_input' | 'tokens_output' | 'cost_usd'>

export const metadata: Metadata = { title: 'Bots' }

export default async function BotsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user.id).order('created_at', { ascending: true }).limit(1).single()
  const membership = membershipRaw as { workspace_id: string } | null
  if (!membership) redirect('/login')

  const workspaceId = membership.workspace_id

  // Parallel fetches: bots + overview stats
  const [
    { data: botsRaw },
    { count: totalConversations },
    { count: totalBots },
    { count: totalIntegrations },
    { data: recentConversationsRaw },
    { data: usageSummaryRaw },
  ] = await Promise.all([
    supabase
      .from('bots')
      .select('*, integrations(count)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false }),
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

  const bots                = (botsRaw                ?? []) as BotRow[]
  const recentConversations = (recentConversationsRaw ?? []) as RecentConversation[]
  const usageSummary        = (usageSummaryRaw        ?? []) as UsageSummaryRow[]

  const totalTokens = usageSummary.reduce((s, e) => s + e.tokens_input + e.tokens_output, 0)
  const totalCost   = usageSummary.reduce((s, e) => s + Number(e.cost_usd), 0)

  const stats = [
    { label: 'Total Conversations', value: totalConversations ?? 0,   icon: MessageSquare, color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-500/10' },
    { label: 'Active Bots',         value: totalBots ?? 0,            icon: Bot,           color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-500/10' },
    { label: 'Active Integrations', value: totalIntegrations ?? 0,    icon: Plug,          color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-500/10' },
    { label: 'Tokens (30d)',        value: formatTokens(totalTokens),  icon: TrendingUp,    color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-500/10' },
  ]

  return (
    <div className="-m-8">
      <SageToolbar pageKey="bots" />
      <div className="p-8">
      <div className="max-w-5xl mx-auto">
      <Header
        title="Bots"
        description="Configure AI agents and connect them to platforms"
        action={
          <a
            href="/bots/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New bot
          </a>
        }
      />

      {/* ── Bots grid ─────────────────────────────────────────────────────── */}
      {bots?.length === 0 ? (
        <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 flex flex-col items-center justify-center py-16 text-center">
          <Image src="/favicon.png" alt="Bots" width={40} height={40} className="w-10 h-10 mb-3 opacity-30 dark:opacity-20" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No bots yet</p>
          <p className="text-xs text-gray-400 mb-5">Create your first bot to start handling conversations.</p>
          <a href="/bots/new" className="px-4 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 transition-colors">
            Create bot
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {bots?.map((bot) => (
            <a
              key={bot.id}
              href={`/bots/${bot.id}`}
              className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-5 hover:shadow-sm transition-shadow group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-white dark:bg-white/5">
                  <Image src="/favicon.png" alt="Bot" width={22} height={22} className="w-5 h-5 object-contain" />
                </div>
                {bot.bot_type === 'internal' && (
                  <span className="text-xs bg-[#15A4AE]/10 text-[#15A4AE] px-2 py-0.5 rounded-full font-medium">
                    Sage
                  </span>
                )}
              </div>

              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-brand-700 dark:group-hover:text-[#ec732e] transition-colors">
                {bot.name}
              </h3>
              <p className="text-xs text-gray-400 line-clamp-2 mb-4">
                {bot.description ?? bot.system_prompt?.slice(0, 100) ?? 'No description'}
              </p>

              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <Plug className="w-3.5 h-3.5" />
                  {/* @ts-expect-error — aggregate count */}
                  {bot.integrations?.[0]?.count ?? 0} integrations
                </span>
                <span>·</span>
                <span>{formatDate(bot.created_at)}</span>
                {bot.enable_rag && (
                  <>
                    <span>·</span>
                    <span className="text-green-600 font-medium">RAG</span>
                  </>
                )}
              </div>
            </a>
          ))}
        </div>
      )}

      {/* ── Performance Overview ───────────────────────────────────────────── */}
      <div className="mt-10 mb-6">
        <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Performance Overview</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Your workspace activity at a glance</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 dark:text-gray-400">{s.label}</span>
              <div className={`${s.bg} ${s.color} p-2 rounded-lg`}>
                <s.icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent conversations */}
        <div className="xl:col-span-2 bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8">
          <div className="px-5 py-4 border-b dark:border-white/8 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Recent Conversations</h2>
            <a href="/dashboard/bots" className="text-xs text-brand-600 dark:text-[#15A4AE] hover:underline">View all</a>
          </div>
          <div className="divide-y dark:divide-white/5">
            {recentConversations?.length === 0 && (
              <p className="px-5 py-8 text-sm text-gray-400 text-center">No conversations yet.</p>
            )}
            {recentConversations?.map((c) => (
              <a key={c.id} href={`/conversations/${c.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
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

        {/* Usage summary */}
        <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8">
          <div className="px-5 py-4 border-b dark:border-white/8">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Usage (last 30 days)</h2>
          </div>
          <div className="px-5 py-5 space-y-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tokens consumed</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{formatTokens(totalTokens)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Estimated cost</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{formatCost(totalCost)}</p>
            </div>
            <a
              href="/analytics"
              className="block mt-4 text-center text-xs text-brand-600 bg-brand-50 hover:bg-brand-100 dark:bg-[#ec732e]/10 dark:hover:bg-[#ec732e]/15 dark:text-[#ec732e] rounded-lg py-2 transition-colors"
            >
              View detailed analytics →
            </a>
          </div>
        </div>
      </div>
    </div>
    </div>
  </div>
  )
}
