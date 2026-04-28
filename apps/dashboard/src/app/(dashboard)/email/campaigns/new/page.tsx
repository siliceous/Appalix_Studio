import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createCampaign } from '@/app/actions/email-campaigns'
import { ChevronRight, Info } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'New Email Campaign' }

const CAMPAIGN_TYPES = [
  { value: 'newsletter',    label: 'Newsletter' },
  { value: 'promotion',     label: 'Promotion' },
  { value: 'announcement',  label: 'Announcement' },
  { value: 're_engagement', label: 'Re-engagement' },
  { value: 'event',         label: 'Event' },
  { value: 'case_study',    label: 'Case Study' },
  { value: 'seasonal',      label: 'Seasonal' },
  { value: 'custom',        label: 'Custom' },
]

export default async function NewCampaignPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  if (!member) redirect('/login')

  const workspaceId = (member as { workspace_id: string }).workspace_id
  const admin       = createAdminClient()

  // Load workspace config for defaults
  const { data: ws } = await admin
    .from('workspaces')
    .select('name, automation_config')
    .eq('id', workspaceId)
    .single()

  const cfg          = ((ws as { automation_config?: Record<string,string> } | null)?.automation_config ?? {})
  const defaultFrom  = cfg.email_from_address ?? process.env.RESEND_FROM_EMAIL ?? ''
  const defaultName  = (ws as { name?: string } | null)?.name ?? ''

  // Count eligible contacts
  const { count: totalContacts } = await admin
    .from('contacts')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('email_opt_out', false)
    .neq('email_deliverability', 'bounced')
    .neq('email_deliverability', 'complained')
    .not('email', 'is', null)

  // Get distinct tags for filter options
  const { data: tagRows } = await admin
    .from('contacts')
    .select('tags')
    .eq('workspace_id', workspaceId)
    .not('tags', 'eq', '{}')
    .limit(200)

  const allTags = [...new Set((tagRows ?? []).flatMap((r: { tags: string[] }) => r.tags ?? []))].sort()

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="p-8 flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto">

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-5">
            <Link href="/email/campaigns" className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
              Campaigns
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-700 dark:text-gray-300 font-medium">New Campaign</span>
          </div>

          <form action={createCampaign} className="space-y-5">

            {/* ── Identity ── */}
            <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-5 space-y-4">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Campaign Details</p>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Campaign name <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="name"
                    required
                    placeholder="e.g. March Newsletter"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#15A4AE] dark:bg-[#252525] dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Type</label>
                  <select
                    name="campaign_type"
                    defaultValue="newsletter"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#15A4AE] dark:bg-[#252525] dark:text-gray-100"
                  >
                    {CAMPAIGN_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Reply-to email</label>
                  <input
                    name="reply_to"
                    type="email"
                    placeholder="Optional"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#15A4AE] dark:bg-[#252525] dark:text-gray-100"
                  />
                </div>
              </div>
            </div>

            {/* ── Sender ── */}
            <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-5 space-y-4">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Sender</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    From name <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="from_name"
                    required
                    defaultValue={defaultName}
                    placeholder="Your Company"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#15A4AE] dark:bg-[#252525] dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    From email <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="from_email"
                    type="email"
                    required
                    defaultValue={defaultFrom}
                    placeholder="hello@yourcompany.com"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#15A4AE] dark:bg-[#252525] dark:text-gray-100"
                  />
                  {!defaultFrom && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      Set a default in Settings → Automation → Resend.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ── Subject ── */}
            <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-5 space-y-4">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Subject</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Subject line <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="subject"
                    required
                    placeholder="Your March update is here 🎉"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#15A4AE] dark:bg-[#252525] dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Preview text</label>
                  <input
                    name="preview_text"
                    placeholder="Shown in inbox below the subject line…"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#15A4AE] dark:bg-[#252525] dark:text-gray-100"
                  />
                </div>
              </div>
            </div>

            {/* ── Body ── */}
            <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Email Body</p>
                <span className="text-xs text-gray-400">HTML supported · Phase 2 adds visual builder</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  HTML body <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="body_html"
                  required
                  rows={14}
                  placeholder={`<p>Hi {{first_name}},</p>\n<p>Your message here...</p>\n<p>—The Team</p>\n\n<p style="font-size:11px;color:#999;">\n  <a href="{{unsubscribe_link}}">Unsubscribe</a>\n</p>`}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#15A4AE] dark:bg-[#252525] dark:text-gray-100 resize-y"
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  Available merge tags: <code className="bg-gray-100 dark:bg-white/10 px-1 rounded">{'{{first_name}}'}</code>{' '}
                  <code className="bg-gray-100 dark:bg-white/10 px-1 rounded">{'{{full_name}}'}</code>{' '}
                  <code className="bg-gray-100 dark:bg-white/10 px-1 rounded">{'{{email}}'}</code>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Plain text version <span className="text-gray-400 font-normal">(optional, recommended)</span>
                </label>
                <textarea
                  name="body_text"
                  rows={5}
                  placeholder="Hi {{first_name}}, plain text fallback…"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#15A4AE] dark:bg-[#252525] dark:text-gray-100 resize-y"
                />
              </div>
            </div>

            {/* ── Audience ── */}
            <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-5 space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Audience</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Opted-out and hard-bounced contacts are always excluded automatically.
                </p>
              </div>

              <div className="flex items-center gap-3 p-3 bg-[#15A4AE]/5 border border-[#15A4AE]/20 rounded-xl">
                <div className="w-9 h-9 rounded-lg bg-[#15A4AE]/10 flex items-center justify-center shrink-0">
                  <span className="text-[#15A4AE] font-bold text-sm">{totalContacts?.toLocaleString() ?? 0}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Eligible contacts</p>
                  <p className="text-xs text-gray-400">With valid email, not opted out or bounced</p>
                </div>
              </div>

              {allTags.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Filter by tags <span className="text-gray-400 font-normal">(leave blank to send to all)</span>
                  </label>
                  <input
                    name="recipient_tags"
                    placeholder="e.g. lead, vip, newsletter"
                    list="tag-list"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#15A4AE] dark:bg-[#252525] dark:text-gray-100"
                  />
                  <datalist id="tag-list">
                    {allTags.map(t => <option key={t} value={t} />)}
                  </datalist>
                  <p className="text-xs text-gray-400 mt-1">Comma-separated. Contacts matching ANY tag will be included.</p>
                </div>
              )}
            </div>

            {/* ── Compliance reminder ── */}
            <div className="flex items-start gap-2 p-3.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-lg text-xs text-amber-700 dark:text-amber-300">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                Always include an <strong>unsubscribe link</strong> and your physical address in the email footer.
                Marketing emails without these may violate CAN-SPAM / GDPR.
              </span>
            </div>

            {/* ── Actions ── */}
            <div className="flex items-center justify-between pt-2 pb-8">
              <Link
                href="/email/campaigns"
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Cancel
              </Link>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#15A4AE] hover:bg-[#0f8a93] text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Save as Draft
                </button>
              </div>
            </div>

          </form>
        </div>
      </div>
    </div>
  )
}
