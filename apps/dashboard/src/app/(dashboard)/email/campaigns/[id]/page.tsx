import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Send, Trash2, Eye, MousePointer, AlertTriangle, Mail, Users, CheckCircle2 } from 'lucide-react'
import { getCampaign } from '@/app/actions/email-campaigns'
import { sendCampaign, deleteCampaign } from '@/app/actions/email-campaigns'

export const metadata = { title: 'Campaign' }

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-4">
      <div className="flex items-center gap-2 mb-2 text-gray-400">{icon}<span className="text-xs font-medium">{label}</span></div>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function pct(n: number, total: number) {
  if (!total) return '0%'
  return `${Math.round((n / total) * 100)}%`
}

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const campaign = await getCampaign(id)
  if (!campaign) notFound()

  const c = campaign as {
    id: string; name: string; campaign_type: string; subject: string; preview_text: string | null
    body_html: string; body_text: string | null; from_name: string; from_email: string
    reply_to: string | null; status: string; sent_at: string | null; created_at: string
    recipient_filter: { all?: boolean; tags?: string[] }
    total_recipients: number; sent_count: number; delivered_count: number
    opened_count: number; clicked_count: number; bounced_count: number
    complained_count: number; unsubscribed_count: number; failed_count: number
  }

  const canSend = ['draft', 'failed'].includes(c.status)

  const sendAction = sendCampaign.bind(null, c.id)
  const deleteAction = deleteCampaign.bind(null, c.id)

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="p-8 flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-5">

          {/* Breadcrumb + header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                <Link href="/email/campaigns" className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors">Campaigns</Link>
                <ChevronRight className="w-3 h-3" />
                <span className="text-gray-700 dark:text-gray-300 font-medium truncate max-w-xs">{c.name}</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{c.name}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{c.subject}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {c.status !== 'sending' && c.status !== 'completed' && (
                <form action={deleteAction}>
                  <button
                    type="submit"
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="Delete campaign"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </form>
              )}
              {canSend && (
                <form action={sendAction}>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-4 py-2 bg-[#15A4AE] hover:bg-[#0f8a93] text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    Send Now
                  </button>
                </form>
              )}
              {c.status === 'sending' && (
                <span className="flex items-center gap-2 px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-sm font-medium rounded-lg">
                  <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                  Sending…
                </span>
              )}
              {c.status === 'completed' && (
                <span className="flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium rounded-lg">
                  <CheckCircle2 className="w-4 h-4" /> Sent
                </span>
              )}
            </div>
          </div>

          {/* Stats grid — only show if sent */}
          {c.sent_count > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard icon={<Mail className="w-4 h-4" />}         label="Sent"        value={c.sent_count.toLocaleString()} sub={`of ${c.total_recipients.toLocaleString()}`} />
              <StatCard icon={<Eye className="w-4 h-4" />}          label="Opened"      value={pct(c.opened_count, c.sent_count)}   sub={`${c.opened_count.toLocaleString()} opens`} />
              <StatCard icon={<MousePointer className="w-4 h-4" />} label="Clicked"     value={pct(c.clicked_count, c.sent_count)}  sub={`${c.clicked_count.toLocaleString()} clicks`} />
              <StatCard icon={<AlertTriangle className="w-4 h-4" />} label="Bounced"    value={pct(c.bounced_count, c.sent_count)}  sub={`${c.bounced_count.toLocaleString()} bounces`} />
            </div>
          )}

          {/* Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-5 space-y-3">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Campaign Info</p>
              {[
                ['Type',       c.campaign_type.replace('_', ' ')],
                ['From',       `${c.from_name} <${c.from_email}>`],
                ['Reply-to',   c.reply_to ?? '—'],
                ['Status',     c.status],
                ['Created',    new Date(c.created_at).toLocaleString()],
                ['Sent at',    c.sent_at ? new Date(c.sent_at).toLocaleString() : '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-2 text-sm">
                  <span className="text-gray-500 dark:text-gray-400 shrink-0">{k}</span>
                  <span className="text-gray-900 dark:text-gray-100 text-right truncate">{v}</span>
                </div>
              ))}
            </div>

            <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-5 space-y-3">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Audience</p>
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                <Users className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                    {c.total_recipients > 0
                      ? `${c.total_recipients.toLocaleString()} recipients`
                      : c.recipient_filter?.all
                        ? 'All eligible contacts'
                        : `Tag filter: ${c.recipient_filter?.tags?.join(', ') ?? '—'}`}
                  </p>
                  <p className="text-xs text-gray-400">Opted-out + bounced contacts always excluded</p>
                </div>
              </div>
              {c.unsubscribed_count > 0 && (
                <p className="text-xs text-gray-400">{c.unsubscribed_count} unsubscribed after this campaign.</p>
              )}
              {c.complained_count > 0 && (
                <p className="text-xs text-red-500">{c.complained_count} spam complaints — review your content.</p>
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-5 space-y-3">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Email Preview</p>
            <div className="border dark:border-white/10 rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-b dark:border-white/10 text-xs text-gray-500">
                <span className="font-medium">Subject:</span> {c.subject}
                {c.preview_text && <span className="ml-3 text-gray-400">· {c.preview_text}</span>}
              </div>
              <iframe
                srcDoc={c.body_html || '<p style="padding:20px;color:#888;">No HTML body.</p>'}
                title="Email preview"
                className="w-full bg-white"
                style={{ height: '400px', border: 'none' }}
                sandbox="allow-same-origin"
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
