import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SageToolbar } from '@/components/dashboard/sage-toolbar'
import { formatTokens, formatCost, PLATFORM_META } from '@/lib/utils'
import type { Metadata } from 'next'
import type { UsageEvent, Conversation, AgentRun, Lead } from '@/lib/types'

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
    { data: leadsRaw },
  ] = await Promise.all([
    supabase
      .from('usage_events')
      .select('created_at, tokens_input, tokens_output, cost_usd, event_type')
      .eq('workspace_id', workspaceId)
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: true }),

    supabase
      .from('conversations')
      .select('platform')
      .eq('workspace_id', workspaceId)
      .gte('created_at', thirtyDaysAgo),

    supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId),

    supabase
      .from('agent_runs')
      .select('status')
      .eq('workspace_id', workspaceId)
      .gte('started_at', sevenDaysAgo),

    supabase
      .from('leads')
      .select('source_platform, campaign_name, lead_score, pipeline_stage, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false }),
  ])

  const usageEvents    = (usageEventsRaw   ?? []) as Pick<UsageEvent,   'created_at' | 'tokens_input' | 'tokens_output' | 'cost_usd' | 'event_type'>[]
  const convByPlatform = (convByPlatformRaw ?? []) as Pick<Conversation, 'platform'>[]
  const agentRunStats  = (agentRunStatsRaw  ?? []) as Pick<AgentRun,     'status'>[]
  const leads          = (leadsRaw          ?? []) as Pick<Lead, 'source_platform' | 'campaign_name' | 'lead_score' | 'pipeline_stage' | 'created_at'>[]

  // ── Bot analytics ───────────────────────────────────────────
  const dailyMap = new Map<string, { tokens: number; cost: number }>()
  usageEvents.forEach((e) => {
    const day = e.created_at.slice(0, 10)
    const prev = dailyMap.get(day) ?? { tokens: 0, cost: 0 }
    dailyMap.set(day, { tokens: prev.tokens + e.tokens_input + e.tokens_output, cost: prev.cost + Number(e.cost_usd) })
  })
  const dailyData = Array.from(dailyMap.entries()).map(([day, v]) => ({ day, ...v }))

  const totalTokens = usageEvents.reduce((s, e) => s + e.tokens_input + e.tokens_output, 0)
  const totalCost   = usageEvents.reduce((s, e) => s + Number(e.cost_usd), 0)

  const platformMap = new Map<string, number>()
  convByPlatform.forEach((c) => {
    const p = c.platform ?? 'unknown'
    platformMap.set(p, (platformMap.get(p) ?? 0) + 1)
  })
  const platformData = Array.from(platformMap.entries()).sort((a, b) => b[1] - a[1])

  const totalRuns     = agentRunStats.length
  const completedRuns = agentRunStats.filter((r) => r.status === 'completed').length
  const successRate   = totalRuns > 0 ? Math.round((completedRuns / totalRuns) * 100) : null

  // ── Campaign analytics ──────────────────────────────────────
  const total          = leads.length
  const now            = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const thisMonth      = leads.filter(l => new Date(l.created_at) >= thisMonthStart).length
  const inPipeline     = leads.filter(l => l.pipeline_stage === 'crm_pipeline').length

  const byPlatform = leads.reduce<Record<string, number>>((acc, l) => {
    acc[l.source_platform] = (acc[l.source_platform] ?? 0) + 1
    return acc
  }, {})

  const byScore = leads.reduce<Record<string, number>>((acc, l) => {
    const key = l.lead_score ?? 'unscored'
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})

  const byCampaign = leads.reduce<Record<string, number>>((acc, l) => {
    const key = l.campaign_name ?? 'Unknown Campaign'
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})
  const topCampaigns = Object.entries(byCampaign).sort((a, b) => b[1] - a[1]).slice(0, 10)

  const PLATFORM_LABEL: Record<string, string> = { meta: 'Meta Ads', google_ads: 'Google Ads' }
  const SCORE_COLOR: Record<string, string> = {
    high:     'bg-emerald-500',
    medium:   'bg-amber-400',
    low:      'bg-gray-300 dark:bg-gray-600',
    unscored: 'bg-gray-200 dark:bg-gray-700',
  }

  return (
    <div className="-m-8 flex flex-col h-screen overflow-hidden">
      <SageToolbar pageKey="analytics" />
    <div className="flex-1 overflow-y-auto p-8">
    <div className="max-w-5xl mx-auto">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">Analytics</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Usage and performance over the last 30 days</p>

      {/* Top stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total tokens (30d)',   value: formatTokens(totalTokens) },
          { label: 'Estimated cost (30d)', value: formatCost(totalCost) },
          { label: 'Total messages',       value: (totalMessages ?? 0).toLocaleString() },
          { label: 'Agent success rate',   value: successRate != null ? `${successRate}%` : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/8 p-5">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-10">
        {/* Daily token usage table */}
        <div className="xl:col-span-2 bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/8">
          <div className="px-5 py-4 border-b dark:border-white/8">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Daily token usage</h2>
          </div>
          {dailyData.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-400 text-center">No usage data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-white/8 bg-gray-50 dark:bg-white/5">
                    <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">Date</th>
                    <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-500">Tokens</th>
                    <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-500">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-white/5">
                  {dailyData.slice(-14).reverse().map((row) => (
                    <tr key={row.day} className="hover:bg-gray-50 dark:hover:bg-white/3">
                      <td className="px-5 py-2.5 text-gray-700 dark:text-gray-300">{row.day}</td>
                      <td className="px-5 py-2.5 text-right text-gray-700 dark:text-gray-300">{formatTokens(row.tokens)}</td>
                      <td className="px-5 py-2.5 text-right text-gray-700 dark:text-gray-300">{formatCost(row.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Platform breakdown */}
        <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/8">
          <div className="px-5 py-4 border-b dark:border-white/8">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">By platform (30d)</h2>
          </div>
          {platformData.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-400 text-center">No data yet.</p>
          ) : (
            <div className="px-5 py-4 space-y-3">
              {platformData.map(([platform, count]) => {
                const total = convByPlatform.length ?? 1
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
                    <div className="w-full bg-gray-100 dark:bg-white/8 rounded-full h-1.5">
                      <div className="bg-brand-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Campaign Analytics ──────────────────────────────────── */}
      <div className="border-t dark:border-white/8 pt-8">
        <div className="mb-6">
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Campaign Analytics</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Lead performance across all connected platforms</p>
        </div>

        {total === 0 ? (
          <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/8 flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No data yet</p>
            <p className="text-xs text-gray-400 max-w-xs">Analytics will appear once you start receiving leads from connected platforms.</p>
          </div>
        ) : (
          <>
            {/* Lead stat cards */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total Leads',     value: total,                    sub: 'all time' },
                { label: 'This Month',      value: thisMonth,                sub: `${total - thisMonth} older` },
                { label: 'High Priority',   value: byScore['high'] ?? 0,     sub: total ? `${Math.round(((byScore['high'] ?? 0) / total) * 100)}% of leads` : '—' },
                { label: 'In CRM Pipeline', value: inPipeline,               sub: total ? `${Math.round((inPipeline / total) * 100)}% converted` : '—' },
              ].map(s => (
                <div key={s.label} className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/8 p-5">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{s.label}</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{s.value}</p>
                  {s.sub && <p className="text-xs text-gray-400 mt-1">{s.sub}</p>}
                </div>
              ))}
            </div>

            {/* Full-width campaign table + side panels */}
            <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/8">
              <div className="grid grid-cols-1 xl:grid-cols-3 divide-y xl:divide-y-0 xl:divide-x dark:divide-white/8">

                {/* Top Campaigns — spans 2 cols */}
                <div className="xl:col-span-2">
                  <div className="px-5 py-4 border-b dark:border-white/8">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Top Campaigns</h3>
                  </div>
                  {topCampaigns.length === 0 ? (
                    <p className="px-5 py-8 text-sm text-gray-400 text-center">No campaign data yet.</p>
                  ) : (
                    <div className="divide-y dark:divide-white/5">
                      {topCampaigns.map(([campaign, count]) => (
                        <div key={campaign} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{campaign}</p>
                          </div>
                          <div className="w-24 bg-gray-100 dark:bg-white/8 rounded-full h-1.5 shrink-0">
                            <div
                              className="bg-brand-500 dark:bg-[#15A4AE] h-1.5 rounded-full"
                              style={{ width: `${Math.round((count / total) * 100)}%` }}
                            />
                          </div>
                          <div className="text-right shrink-0 w-12">
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{count}</p>
                            <p className="text-xs text-gray-400">{Math.round((count / total) * 100)}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Side: Platform + Score */}
                <div className="divide-y dark:divide-white/8">
                  <div className="px-5 py-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Leads by Platform</h3>
                    <div className="space-y-3">
                      {Object.entries(byPlatform).map(([platform, count]) => (
                        <div key={platform}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                              {PLATFORM_LABEL[platform] ?? platform}
                            </span>
                            <span className="text-xs text-gray-400">{count}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-gray-100 dark:bg-white/8">
                            <div
                              className="h-1.5 rounded-full bg-brand-500 dark:bg-[#15A4AE]"
                              style={{ width: `${Math.round((count / total) * 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="px-5 py-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Score Breakdown</h3>
                    <div className="space-y-3">
                      {(['high', 'medium', 'low', 'unscored'] as const).map(score => {
                        const count = byScore[score] ?? 0
                        if (count === 0) return null
                        const labels: Record<string, string> = { high: 'High', medium: 'Medium', low: 'Low', unscored: 'Unscored' }
                        return (
                          <div key={score}>
                            <div className="flex items-center gap-2 mb-1.5">
                              <div className={`w-2 h-2 rounded-full shrink-0 ${SCORE_COLOR[score]}`} />
                              <div className="flex-1 flex items-center justify-between">
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{labels[score]}</span>
                                <span className="text-xs text-gray-400">{count} ({Math.round((count / total) * 100)}%)</span>
                              </div>
                            </div>
                            <div className="h-1.5 rounded-full bg-gray-100 dark:bg-white/8">
                              <div className={`h-1.5 rounded-full ${SCORE_COLOR[score]}`} style={{ width: `${Math.round((count / total) * 100)}%` }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </>
        )}
      </div>
    </div>
    </div>
    </div>
  )
}
