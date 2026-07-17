import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import type { WorkspaceMember, Lead } from '@/lib/types'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  const membership = membershipRaw as Pick<WorkspaceMember, 'workspace_id'> | null
  if (!membership) redirect('/login')
  const workspaceId = membership.workspace_id

  const { data: leadsRaw } = await supabase
    .from('leads')
    .select('source_platform, campaign_name, lead_score, pipeline_stage, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  const leads = (leadsRaw ?? []) as Pick<Lead, 'source_platform' | 'campaign_name' | 'lead_score' | 'pipeline_stage' | 'created_at'>[]

  const total = leads.length
  const now   = new Date()
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

  const stats = [
    { label: 'Total Leads',    value: total,      sub: 'all time' },
    { label: 'This Month',     value: thisMonth,  sub: `${total - thisMonth} older` },
    { label: 'High Priority',  value: byScore['high'] ?? 0,  sub: total ? `${Math.round(((byScore['high'] ?? 0) / total) * 100)}% of leads` : '—' },
    { label: 'In CRM Pipeline', value: inPipeline, sub: total ? `${Math.round((inPipeline / total) * 100)}% converted` : '—' },
  ]

  return (
    <div className="max-w-5xl mx-auto p-8">
      <Header
        title="Form Analytics"
        description="Lead performance across all connected platforms"
      />

      {total === 0 ? (
        <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No data yet</p>
          <p className="text-xs text-gray-400 max-w-xs">Analytics will appear once you start receiving leads from connected platforms.</p>
        </div>
      ) : (
        <>
          {/* Stat cards — same pattern as bots page */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            {stats.map(s => (
              <div key={s.label} className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-5">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{s.label}</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{s.value}</p>
                {s.sub && <p className="text-xs text-gray-400 mt-1">{s.sub}</p>}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* By Platform + By Score */}
            <div className="space-y-6">
              {/* Platform breakdown */}
              <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8">
                <div className="px-5 py-4 border-b dark:border-white/8">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Leads by Platform</h2>
                </div>
                <div className="px-5 py-4 space-y-4">
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

              {/* Score breakdown */}
              <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8">
                <div className="px-5 py-4 border-b dark:border-white/8">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Score Breakdown</h2>
                </div>
                <div className="px-5 py-4 space-y-4">
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
                          <div
                            className={`h-1.5 rounded-full ${SCORE_COLOR[score]}`}
                            style={{ width: `${Math.round((count / total) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Top Campaigns table */}
            <div className="xl:col-span-2 bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8">
              <div className="px-5 py-4 border-b dark:border-white/8 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Top Campaigns</h2>
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
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{count}</p>
                        <p className="text-xs text-gray-400">{Math.round((count / total) * 100)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
