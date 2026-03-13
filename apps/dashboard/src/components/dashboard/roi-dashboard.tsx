'use client'

import React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import {
  Clock, TrendingUp, DollarSign, Zap,
  Mail, MessageSquare, FileText, CheckCircle2,
  Target, Award,
} from 'lucide-react'
import type { RoiMetrics, RoiPeriod } from '@/app/actions/roi-metrics'

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtCurrency(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toLocaleString()}`
}

function fmtHours(h: number) {
  if (h < 1) return `${Math.round(h * 60)} min`
  return `${h.toFixed(1)} hrs`
}

const PERIOD_OPTIONS: { value: RoiPeriod; label: string }[] = [
  { value: '7d',  label: 'Last 7 days'   },
  { value: '30d', label: 'Last 30 days'  },
  { value: '90d', label: 'Last 90 days'  },
  { value: 'all', label: 'All time'      },
]

const CHART_COLORS = ['#61c2ad', '#3a9e8a', '#8b5cf6', '#f59e0b', '#ef4444', '#6b7280']

const ACTION_LABELS: Record<string, string> = {
  create_lead:   'Lead',
  create_ticket: 'Ticket',
  ignore:        'Ignored',
  update_lead:   'Update',
  reply_draft:   'Draft',
  pending:       'Pending',
}

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon, label, value, sub, accent = false,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  accent?: boolean
}) {
  return (
    <div className={`rounded-xl border p-5 flex flex-col gap-3 ${
      accent
        ? 'bg-[#61c2ad]/8 dark:bg-[#61c2ad]/10 border-[#61c2ad]/25'
        : 'bg-white dark:bg-[#232323] border-gray-200 dark:border-white/8'
    }`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
          accent ? 'bg-[#61c2ad]/20 text-[#3a9e8a] dark:text-[#61c2ad]' : 'bg-gray-100 dark:bg-white/8 text-gray-500'
        }`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-none">{value}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
      </div>
    </div>
  )
}

// ── Section heading ────────────────────────────────────────────────────────────
function SectionHeading({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Custom tooltip for recharts ────────────────────────────────────────────────
function ChartTip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-[#2a2a2a] border dark:border-white/10 rounded-lg shadow-lg px-3 py-2 text-xs">
      {label && <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="text-gray-600 dark:text-gray-400">{p.name}: <span className="font-semibold text-gray-900 dark:text-gray-100">{p.value}</span></p>
      ))}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
interface Props { metrics: RoiMetrics }

export function ROIDashboard({ metrics }: Props) {
  const router      = useRouter()
  const searchParams = useSearchParams()

  const changePeriod = (p: RoiPeriod) => {
    const url = new URL(window.location.href)
    url.searchParams.set('period', p)
    router.push(url.toString())
  }

  const workingDays = Math.round(metrics.timeSavedHours / 8 * 10) / 10

  // Funnel data
  const funnelData = [
    { name: 'Open',   value: metrics.dealsOpen,  fill: '#61c2ad' },
    { name: 'Won',    value: metrics.dealsWon,   fill: '#3a9e8a' },
    { name: 'Lost',   value: metrics.dealsLost,  fill: '#ef4444' },
  ]

  const emailActionData = metrics.emailActions.map(e => ({
    name:  ACTION_LABELS[e.action] ?? e.action,
    value: e.count,
  }))

  return (
    <div className="max-w-5xl mx-auto space-y-8 p-8">

      {/* ── Page header + period picker ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#61c2ad]" />
            Sage ROI &amp; Performance
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            What Sage AI has done for your business
          </p>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 rounded-lg p-1">
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => changePeriod(opt.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                metrics.period === opt.value
                  ? 'bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Time saved hero ── */}
      <div className="bg-gradient-to-r from-[#61c2ad]/10 to-[#3a9e8a]/5 dark:from-[#61c2ad]/12 dark:to-[#3a9e8a]/5 rounded-2xl border border-[#61c2ad]/20 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#61c2ad]/20 flex items-center justify-center">
            <Clock className="w-5 h-5 text-[#3a9e8a] dark:text-[#61c2ad]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Time saved by Sage AI</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Based on average manual processing times</p>
          </div>
        </div>
        <div className="flex items-end gap-2 mb-4">
          <span className="text-4xl font-black text-[#3a9e8a] dark:text-[#61c2ad]">{fmtHours(metrics.timeSavedHours)}</span>
          {workingDays >= 1 && (
            <span className="text-sm text-gray-400 dark:text-gray-500 mb-1">≈ {workingDays} working day{workingDays !== 1 ? 's' : ''}</span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Mail,          label: 'Emails triaged',     count: metrics.emailsTriaged, mins: 4 },
            { icon: MessageSquare, label: 'Bot convos reviewed', count: metrics.botsTriaged,  mins: 3 },
            { icon: FileText,      label: 'Forms processed',    count: metrics.formsTriaged,  mins: 3 },
          ].map(({ icon: Icon, label, count, mins }) => (
            <div key={label} className="bg-white/60 dark:bg-white/5 rounded-xl p-3 border border-white/50 dark:border-white/8">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Icon className="w-3.5 h-3.5 text-[#61c2ad]" />
                <span className="text-[11px] text-gray-500 dark:text-gray-400">{label}</span>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{count.toLocaleString()}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">{count * mins} min saved</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Revenue cards ── */}
      <div>
        <SectionHeading title="Revenue & Pipeline" sub="Deal value across all pipelines" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon={DollarSign}   label="Pipeline Value"  value={fmtCurrency(metrics.pipelineValue)}  sub={`${metrics.dealsOpen} open deals`}  accent />
          <StatCard icon={Award}        label="Revenue Won"     value={fmtCurrency(metrics.revenueWon)}     sub={`${metrics.dealsWon} deals closed`} accent />
          <StatCard icon={Target}       label="Win Rate"        value={`${metrics.winRate}%`}               sub={`${metrics.dealsWon}W / ${metrics.dealsLost}L`} />
          <StatCard icon={TrendingUp}   label="Deals in Period" value={metrics.dealsOpen + metrics.dealsWon + metrics.dealsLost} sub="created this period" />
        </div>
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Deal source attribution */}
        <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-5">
          <SectionHeading title="Lead Source Breakdown" sub="Where your deals came from" />
          {metrics.dealsBySource.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm text-gray-400">No deals in this period</div>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={160}>
                <PieChart>
                  <Pie data={metrics.dealsBySource} dataKey="count" nameKey="source" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3}>
                    {metrics.dealsBySource.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {metrics.dealsBySource.map((s, i) => (
                  <div key={s.source} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-xs text-gray-600 dark:text-gray-400 truncate">{s.source}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">{s.count}</span>
                      {s.value > 0 && <span className="text-[10px] text-gray-400 ml-1">{fmtCurrency(s.value)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Deal funnel */}
        <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-5">
          <SectionHeading title="Deal Funnel" sub="Pipeline conversion status" />
          {(metrics.dealsOpen + metrics.dealsWon + metrics.dealsLost) === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm text-gray-400">No deals yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={funnelData} margin={{ top: 4, right: 0, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150,150,150,0.1)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(150,150,150,0.05)' }} />
                <Bar dataKey="value" name="Deals" radius={[6, 6, 0, 0]}>
                  {funnelData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>

      {/* ── Email AI actions + Forms ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Email AI action distribution */}
        <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-5">
          <SectionHeading title="Email AI Actions" sub="What Sage AI recommended for inbound emails" />
          {emailActionData.length === 0 ? (
            <div className="flex items-center justify-center h-36 text-sm text-gray-400">No emails triaged yet</div>
          ) : (
            <div className="space-y-2.5">
              {emailActionData.sort((a, b) => b.value - a.value).map((item, i) => {
                const total = emailActionData.reduce((s, x) => s + x.value, 0)
                const pct   = total > 0 ? Math.round((item.value / total) * 100) : 0
                return (
                  <div key={item.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600 dark:text-gray-400">{item.name}</span>
                      <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">{item.value} <span className="text-gray-400 font-normal">({pct}%)</span></span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-white/8 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Form submissions + contacts */}
        <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-5">
          <SectionHeading title="Forms &amp; Contacts" sub="Submission processing and contact sources" />
          <div className="space-y-4">
            {/* Form actioned rate */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Form submissions actioned</span>
                <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                  {metrics.formsActioned} / {metrics.formsTriaged}
                </span>
              </div>
              {metrics.formsTriaged > 0 && (
                <div className="h-2 bg-gray-100 dark:bg-white/8 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#61c2ad] transition-all"
                    style={{ width: `${Math.round((metrics.formsActioned / metrics.formsTriaged) * 100)}%` }}
                  />
                </div>
              )}
              {metrics.formsPending > 0 && (
                <p className="text-[11px] text-amber-500 dark:text-amber-400 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />{metrics.formsPending} pending review
                </p>
              )}
            </div>

            {/* Contact source */}
            {metrics.contactsBySource.length > 0 && (
              <div>
                <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Contacts by source</p>
                <div className="space-y-1.5">
                  {metrics.contactsBySource.map((c, i) => (
                    <div key={c.source} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-xs text-gray-600 dark:text-gray-400">{c.source}</span>
                      </div>
                      <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">{c.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  )
}
