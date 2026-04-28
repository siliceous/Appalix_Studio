import Link from 'next/link'
import { Plus, Mail, Send, Eye, MousePointer, AlertTriangle, CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react'
import { getCampaigns } from '@/app/actions/email-campaigns'

export const metadata = { title: 'Email Campaigns' }

const STATUS_STYLE: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300',
  scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  sending:   'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  paused:    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  failed:    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  draft:     <Clock className="w-3 h-3" />,
  scheduled: <Clock className="w-3 h-3" />,
  sending:   <Loader2 className="w-3 h-3 animate-spin" />,
  paused:    <AlertTriangle className="w-3 h-3" />,
  completed: <CheckCircle2 className="w-3 h-3" />,
  failed:    <XCircle className="w-3 h-3" />,
}

function pct(n: number, total: number) {
  if (!total) return '—'
  return `${Math.round((n / total) * 100)}%`
}

function fmt(n: number) {
  if (!n) return '0'
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

export default async function CampaignsPage() {
  const campaigns = await getCampaigns()

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="p-8 flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Email Campaigns</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Create and send bulk email campaigns to your contacts.
              </p>
            </div>
            <Link
              href="/email/campaigns/new"
              className="flex items-center gap-2 px-4 py-2 bg-[#15A4AE] hover:bg-[#0f8a93] text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Campaign
            </Link>
          </div>

          {campaigns.length === 0 ? (
            <div className="bg-white dark:bg-[#2a2a2a] border dark:border-white/10 rounded-xl p-16 text-center">
              <Mail className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No campaigns yet</p>
              <p className="text-xs text-gray-400 mt-1 mb-4">Create your first campaign to start sending.</p>
              <Link
                href="/email/campaigns/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#15A4AE] text-white text-sm font-medium rounded-lg hover:bg-[#0f8a93] transition-colors"
              >
                <Plus className="w-4 h-4" /> New Campaign
              </Link>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#2a2a2a] border dark:border-white/10 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-white/10 bg-gray-50 dark:bg-white/5">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Campaign</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Sent</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      <span className="flex items-center justify-end gap-1"><Eye className="w-3.5 h-3.5" />Opened</span>
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      <span className="flex items-center justify-end gap-1"><MousePointer className="w-3.5 h-3.5" />Clicked</span>
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      <span className="flex items-center justify-end gap-1"><AlertTriangle className="w-3.5 h-3.5" />Bounced</span>
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c, i) => {
                    const camp = c as {
                      id: string; name: string; campaign_type: string; subject: string
                      status: string; sent_at: string | null; created_at: string
                      total_recipients: number; sent_count: number; opened_count: number
                      clicked_count: number; bounced_count: number; complained_count: number
                    }
                    return (
                      <tr
                        key={camp.id}
                        className={`border-b dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${i === campaigns.length - 1 ? 'border-0' : ''}`}
                      >
                        <td className="px-5 py-3.5">
                          <Link href={`/email/campaigns/${camp.id}`} className="block">
                            <p className="font-medium text-gray-900 dark:text-gray-100 hover:text-[#15A4AE] transition-colors truncate max-w-xs">
                              {camp.name}
                            </p>
                            <p className="text-xs text-gray-400 truncate max-w-xs mt-0.5">{camp.subject}</p>
                          </Link>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLE[camp.status] ?? STATUS_STYLE.draft}`}>
                            {STATUS_ICON[camp.status]}
                            {camp.status.charAt(0).toUpperCase() + camp.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="font-medium text-gray-900 dark:text-gray-100">{fmt(camp.sent_count)}</span>
                          {camp.total_recipients > 0 && (
                            <span className="text-xs text-gray-400 ml-1">/ {fmt(camp.total_recipients)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right text-gray-700 dark:text-gray-300">
                          {pct(camp.opened_count, camp.sent_count)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-gray-700 dark:text-gray-300">
                          {pct(camp.clicked_count, camp.sent_count)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-gray-700 dark:text-gray-300">
                          {pct(camp.bounced_count, camp.sent_count)}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-gray-400">
                          {camp.sent_at
                            ? new Date(camp.sent_at).toLocaleDateString()
                            : new Date(camp.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Info bar */}
          <div className="flex items-start gap-2 p-3.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-lg text-xs text-blue-700 dark:text-blue-300">
            <Send className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              Sent via <strong>Resend</strong>. Open tracking is based on pixel loads — privacy tools may suppress actual numbers.
              Always include an unsubscribe link. <strong>Resend webhook URL:</strong>{' '}
              <code className="bg-blue-100 dark:bg-blue-900/40 px-1 py-0.5 rounded font-mono">
                {'{API_BASE}'}/webhooks/resend
              </code>
            </span>
          </div>

        </div>
      </div>
    </div>
  )
}
