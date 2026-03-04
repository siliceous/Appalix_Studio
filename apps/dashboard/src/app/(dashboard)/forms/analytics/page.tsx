import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { WorkspaceMember, Lead } from '@/lib/types'

interface StatCardProps {
  label: string
  value: string | number
  sub?:  string
}

function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-[#232323] rounded-xl border border-gray-200 dark:border-white/8 p-5">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  const membership = membershipRaw as Pick<WorkspaceMember, 'workspace_id'> | null
  if (!membership) redirect('/login')
  const workspaceId = membership.workspace_id

  const { data: leadsRaw } = await supabase
    .from('leads')
    .select('source_platform, campaign_name, lead_score, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  const leads = (leadsRaw ?? []) as Pick<Lead, 'source_platform' | 'campaign_name' | 'lead_score' | 'created_at'>[]

  // Stats
  const total = leads.length
  const now   = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const thisMonth = leads.filter(l => new Date(l.created_at) >= thisMonthStart).length

  // By platform
  const byPlatform = leads.reduce<Record<string, number>>((acc, l) => {
    acc[l.source_platform] = (acc[l.source_platform] ?? 0) + 1
    return acc
  }, {})

  // By score
  const byScore = leads.reduce<Record<string, number>>((acc, l) => {
    const key = l.lead_score ?? 'unscored'
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})

  // Top campaigns
  const byCampaign = leads.reduce<Record<string, number>>((acc, l) => {
    const key = l.campaign_name ?? 'Unknown Campaign'
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})
  const topCampaigns = Object.entries(byCampaign)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  const PLATFORM_LABEL: Record<string, string> = { meta: 'Meta Ads', google_ads: 'Google Ads' }
  const SCORE_LABEL: Record<string, string> = { high: 'High', medium: 'Medium', low: 'Low', unscored: 'Unscored' }
  const SCORE_COLOR: Record<string, string> = {
    high:     'bg-emerald-500',
    medium:   'bg-amber-400',
    low:      'bg-gray-300 dark:bg-gray-600',
    unscored: 'bg-gray-200 dark:bg-gray-700',
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center px-6 py-4 border-b dark:border-white/8 bg-white dark:bg-[#232323] shrink-0">
        <div>
          <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Campaign Analytics</h1>
          <p className="text-xs text-gray-400 mt-0.5">Lead performance across all connected platforms</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {total === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">No data yet</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs">
              Analytics will appear once you start receiving leads from connected platforms.
            </p>
          </div>
        ) : (
          <>
            {/* Top stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Leads" value={total} />
              <StatCard label="This Month"  value={thisMonth} sub={`${total - thisMonth} all time`} />
              <StatCard label="High Priority" value={byScore['high'] ?? 0} sub={`${Math.round(((byScore['high'] ?? 0) / total) * 100)}% of leads`} />
              <StatCard label="In Pipeline"   value={leads.filter(() => false).length} sub="moved to CRM" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* By Platform */}
              <div className="bg-white dark:bg-[#232323] rounded-xl border border-gray-200 dark:border-white/8 p-5">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Leads by Platform</h2>
                <div className="space-y-3">
                  {Object.entries(byPlatform).map(([platform, count]) => (
                    <div key={platform} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            {PLATFORM_LABEL[platform] ?? platform}
                          </span>
                          <span className="text-xs text-gray-400">{count}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-100 dark:bg-white/8">
                          <div
                            className="h-1.5 rounded-full bg-brand-500 dark:bg-[#61c2ad]"
                            style={{ width: `${Math.round((count / total) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* By Score */}
              <div className="bg-white dark:bg-[#232323] rounded-xl border border-gray-200 dark:border-white/8 p-5">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Lead Score Breakdown</h2>
                <div className="space-y-3">
                  {(['high', 'medium', 'low', 'unscored'] as const).map(score => {
                    const count = byScore[score] ?? 0
                    if (count === 0) return null
                    return (
                      <div key={score} className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${SCORE_COLOR[score]}`} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                              {SCORE_LABEL[score]}
                            </span>
                            <span className="text-xs text-gray-400">{count} ({Math.round((count / total) * 100)}%)</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-gray-100 dark:bg-white/8">
                            <div
                              className={`h-1.5 rounded-full ${SCORE_COLOR[score]}`}
                              style={{ width: `${Math.round((count / total) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Top Campaigns */}
            {topCampaigns.length > 0 && (
              <div className="bg-white dark:bg-[#232323] rounded-xl border border-gray-200 dark:border-white/8 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-white/6">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Top Campaigns</h2>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-50 dark:border-white/4">
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Campaign</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Leads</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCampaigns.map(([campaign, count]) => (
                      <tr key={campaign} className="border-b border-gray-50 dark:border-white/4 last:border-0 hover:bg-gray-50 dark:hover:bg-white/2 transition-colors">
                        <td className="px-5 py-3">
                          <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate max-w-xs">{campaign}</p>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">{count}</p>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <p className="text-xs text-gray-400">{Math.round((count / total) * 100)}%</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
