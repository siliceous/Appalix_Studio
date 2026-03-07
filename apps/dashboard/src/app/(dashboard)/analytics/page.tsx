import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { formatTokens, formatCost, PLATFORM_META } from '@/lib/utils'
import type { Metadata } from 'next'
import type { UsageEvent, Conversation, AgentRun } from '@/lib/types'

export const metadata: Metadata = { title: 'Analytics' }

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user.id).order('created_at', { ascending: true }).limit(1).single()
  const membership = membershipRaw as { workspace_id: string } | null
  if (!membership) redirect('/login')

  const workspaceId = membership.workspace_id
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const sevenDaysAgo  = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: usageEventsRaw },
    { data: convByPlatformRaw },
    { count: totalMessages },
    { data: agentRunStatsRaw },
  ] = await Promise.all([
    // Daily token usage — last 30 days
    supabase
      .from('usage_events')
      .select('created_at, tokens_input, tokens_output, cost_usd, event_type')
      .eq('workspace_id', workspaceId)
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: true }),

    // Conversations grouped by platform (last 30d)
    supabase
      .from('conversations')
      .select('platform')
      .eq('workspace_id', workspaceId)
      .gte('created_at', thirtyDaysAgo),

    // Total messages (all time)
    supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId),

    // Agent run success rate (last 7d)
    supabase
      .from('agent_runs')
      .select('status')
      .eq('workspace_id', workspaceId)
      .gte('started_at', sevenDaysAgo),
  ])

  const usageEvents    = (usageEventsRaw   ?? []) as Pick<UsageEvent,   'created_at' | 'tokens_input' | 'tokens_output' | 'cost_usd' | 'event_type'>[]
  const convByPlatform = (convByPlatformRaw ?? []) as Pick<Conversation, 'platform'>[]
  const agentRunStats  = (agentRunStatsRaw  ?? []) as Pick<AgentRun,     'status'>[]

  // Aggregate usage by day
  const dailyMap = new Map<string, { tokens: number; cost: number }>()
  usageEvents?.forEach((e) => {
    const day = e.created_at.slice(0, 10)
    const prev = dailyMap.get(day) ?? { tokens: 0, cost: 0 }
    dailyMap.set(day, {
      tokens: prev.tokens + e.tokens_input + e.tokens_output,
      cost:   prev.cost + Number(e.cost_usd),
    })
  })
  const dailyData = Array.from(dailyMap.entries()).map(([day, v]) => ({ day, ...v }))

  const totalTokens = usageEvents?.reduce((s, e) => s + e.tokens_input + e.tokens_output, 0) ?? 0
  const totalCost   = usageEvents?.reduce((s, e) => s + Number(e.cost_usd), 0) ?? 0

  // Platform breakdown
  const platformMap = new Map<string, number>()
  convByPlatform?.forEach((c) => {
    const p = c.platform ?? 'unknown'
    platformMap.set(p, (platformMap.get(p) ?? 0) + 1)
  })
  const platformData = Array.from(platformMap.entries())
    .sort((a, b) => b[1] - a[1])

  // Agent run success rate
  const totalRuns     = agentRunStats?.length ?? 0
  const completedRuns = agentRunStats?.filter((r) => r.status === 'completed').length ?? 0
  const successRate   = totalRuns > 0 ? Math.round((completedRuns / totalRuns) * 100) : null

  return (
    <div className="max-w-5xl mx-auto">
      <Header title="Analytics" description="Usage and performance over the last 30 days" />

      {/* Top stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total tokens (30d)',   value: formatTokens(totalTokens) },
          { label: 'Estimated cost (30d)', value: formatCost(totalCost) },
          { label: 'Total messages',       value: (totalMessages ?? 0).toLocaleString() },
          { label: 'Agent success rate',   value: successRate != null ? `${successRate}%` : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border p-5">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Daily token usage table */}
        <div className="xl:col-span-2 bg-white rounded-xl border">
          <div className="px-5 py-4 border-b">
            <h2 className="text-sm font-semibold text-gray-900">Daily token usage</h2>
          </div>
          {dailyData.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-400 text-center">No usage data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">Date</th>
                    <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-500">Tokens</th>
                    <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-500">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {dailyData.slice(-14).reverse().map((row) => (
                    <tr key={row.day} className="hover:bg-gray-50">
                      <td className="px-5 py-2.5 text-gray-700">{row.day}</td>
                      <td className="px-5 py-2.5 text-right text-gray-700">{formatTokens(row.tokens)}</td>
                      <td className="px-5 py-2.5 text-right text-gray-700">{formatCost(row.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Platform breakdown */}
        <div className="bg-white rounded-xl border">
          <div className="px-5 py-4 border-b">
            <h2 className="text-sm font-semibold text-gray-900">By platform (30d)</h2>
          </div>
          {platformData.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-400 text-center">No data yet.</p>
          ) : (
            <div className="px-5 py-4 space-y-3">
              {platformData.map(([platform, count]) => {
                const total = convByPlatform?.length ?? 1
                const pct   = Math.round((count / total) * 100)
                const meta  = PLATFORM_META[platform as keyof typeof PLATFORM_META]
                return (
                  <div key={platform}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta?.color ?? 'bg-gray-100 text-gray-600'}`}>
                        {meta?.label ?? platform}
                      </span>
                      <span className="text-gray-500 text-xs">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-brand-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
