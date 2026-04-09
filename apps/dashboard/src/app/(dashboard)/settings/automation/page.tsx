import Link     from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { saveAutomationSettings, saveOutreachVariables } from '@/app/actions/automation-settings'
import { Header } from '@/components/layout/header'
import { SubmitButton } from '@/components/ui/submit-button'
import { ChevronLeft } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Automation Settings' }

const PRO_PLANS = ['pro', 'scale', 'enterprise']

type OutreachSettings = {
  value_proposition:      string | null
  workspace_tagline:      string | null
  challenge_area:         string | null
  fallback_sender_title:  string | null
  fallback_calendar_link: string | null
}

export default async function AutomationSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id, role, workspaces(plan, automation_config)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  type MembershipRow = {
    workspace_id: string
    role: string
    workspaces: { plan: string; automation_config: Record<string, string> }
  }
  const membership = membershipRaw as MembershipRow | null
  if (!membership) redirect('/login')

  const plan = membership.workspaces.plan
  const cfg  = (membership.workspaces.automation_config ?? {}) as Record<string, string>
  const { saved } = await searchParams

  // Fetch outreach variables (may not exist yet — that's fine)
  const { data: outreachRaw } = await supabase
    .from('workspace_automation_settings')
    .select('value_proposition, workspace_tagline, challenge_area, fallback_sender_title, fallback_calendar_link')
    .eq('workspace_id', membership.workspace_id)
    .maybeSingle()

  const outreach = (outreachRaw ?? {}) as OutreachSettings

  const backLink = (
    <Link href="/settings" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4">
      <ChevronLeft className="w-3.5 h-3.5" />
      Back to Settings
    </Link>
  )

  if (!PRO_PLANS.includes(plan)) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {backLink}
        <Header title="Automation" description="AI task automation settings" />
        <section className="bg-white rounded-xl border p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Pro plan required</h2>
          <p className="text-xs text-gray-500 mb-4 max-w-xs mx-auto">
            AI task automation — email sending, document generation, CSV export, and approval routing — is available on Pro and above.
          </p>
          <a
            href="/settings/upgrade"
            className="inline-block px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
          >
            Upgrade to Pro →
          </a>
        </section>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {backLink}
      <Header title="Automation" description="Configure AI-triggered email sending, documents, and approvals" />

      {saved === '1' && (
        <div className="px-4 py-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-400">
          Settings saved successfully.
        </div>
      )}
      {saved === 'outreach' && (
        <div className="px-4 py-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-400">
          Outreach variables saved.
        </div>
      )}

      <form action={saveAutomationSettings} className="space-y-6">

        {/* Email sending */}
        <section className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 divide-y dark:divide-white/10">
          <div className="px-6 py-5">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Email sending</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Used by the <code className="bg-gray-100 dark:bg-white/10 px-1 rounded">send_email</code> tool. Powered by{' '}
              <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">Resend</a>.
            </p>
            <div className="space-y-4">
              <div>
                <label htmlFor="resend_api_key" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Resend API key
                </label>
                <input
                  id="resend_api_key"
                  name="resend_api_key"
                  type="password"
                  placeholder="re_••••••••"
                  defaultValue={cfg.resend_api_key ?? ''}
                  className="w-full px-3 py-2 border dark:border-white/10 rounded-lg text-sm font-mono bg-white dark:bg-[#1c1c1c] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="email_from_address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  From address
                </label>
                <input
                  id="email_from_address"
                  name="email_from_address"
                  type="email"
                  placeholder="hello@yourcompany.com"
                  defaultValue={cfg.email_from_address ?? ''}
                  className="w-full px-3 py-2 border dark:border-white/10 rounded-lg text-sm bg-white dark:bg-[#1c1c1c] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Must be a verified sender in your Resend account.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Approval routing */}
        <section className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 divide-y dark:divide-white/10">
          <div className="px-6 py-5">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Approval routing</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Used by the <code className="bg-gray-100 dark:bg-white/10 px-1 rounded">request_approval</code> tool to notify approvers.
            </p>
            <div className="space-y-4">
              <div>
                <label htmlFor="approver_email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Default approver email
                </label>
                <input
                  id="approver_email"
                  name="approver_email"
                  type="email"
                  placeholder="manager@yourcompany.com"
                  defaultValue={cfg.approver_email ?? ''}
                  className="w-full px-3 py-2 border dark:border-white/10 rounded-lg text-sm bg-white dark:bg-[#1c1c1c] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="approval_slack_webhook_url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Slack webhook URL <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  id="approval_slack_webhook_url"
                  name="approval_slack_webhook_url"
                  type="url"
                  placeholder="https://hooks.slack.com/services/…"
                  defaultValue={cfg.approval_slack_webhook_url ?? ''}
                  className="w-full px-3 py-2 border dark:border-white/10 rounded-lg text-sm font-mono bg-white dark:bg-[#1c1c1c] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <SubmitButton
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Save settings
          </SubmitButton>
        </div>
      </form>

      {/* ── Sage outreach variables ── */}
      <div className="pt-2">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Sage outreach variables</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            These values fill shared <code className="bg-gray-100 dark:bg-white/10 px-1 rounded">{'{{variable}}'}</code> placeholders
            in your email templates — things that are the same for every contact in your workspace.
          </p>
        </div>

        <form action={saveOutreachVariables} className="space-y-6">

          {/* Value proposition + tagline */}
          <section className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10">
            <div className="px-6 py-5 border-b dark:border-white/10">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Messaging</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Core copy injected into outreach templates.</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label htmlFor="value_proposition" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Value proposition <span className="text-gray-400 font-normal text-xs ml-1">{'{{value_proposition}}'}</span>
                </label>
                <input
                  id="value_proposition"
                  name="value_proposition"
                  type="text"
                  placeholder="scale your outbound pipeline without growing your SDR team"
                  defaultValue={outreach.value_proposition ?? ''}
                  className="w-full px-3 py-2 border dark:border-white/10 rounded-lg text-sm bg-white dark:bg-[#1c1c1c] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  One line — &quot;we help X companies do Y.&quot; Used in initial outreach and follow-up templates.
                </p>
              </div>
              <div>
                <label htmlFor="challenge_area" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Challenge area <span className="text-gray-400 font-normal text-xs ml-1">{'{{challenge_area}}'}</span>
                </label>
                <input
                  id="challenge_area"
                  name="challenge_area"
                  type="text"
                  placeholder="outbound sales velocity"
                  defaultValue={outreach.challenge_area ?? ''}
                  className="w-full px-3 py-2 border dark:border-white/10 rounded-lg text-sm bg-white dark:bg-[#1c1c1c] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Used in qualification templates, e.g. &quot;outbound sales velocity&quot; or &quot;customer onboarding.&quot;
                </p>
              </div>
              <div>
                <label htmlFor="workspace_tagline" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tagline <span className="text-gray-400 font-normal text-xs ml-1">{'{{workspace_tagline}}'} · optional</span>
                </label>
                <input
                  id="workspace_tagline"
                  name="workspace_tagline"
                  type="text"
                  placeholder="The AI-powered sales platform for B2B teams"
                  defaultValue={outreach.workspace_tagline ?? ''}
                  className="w-full px-3 py-2 border dark:border-white/10 rounded-lg text-sm bg-white dark:bg-[#1c1c1c] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
            </div>
          </section>

          {/* Fallback sender fields */}
          <section className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10">
            <div className="px-6 py-5 border-b dark:border-white/10">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Fallback sender details</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Used when a team member&apos;s profile is missing their own job title or calendar link.
                Each sender can override these in their profile.
              </p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label htmlFor="fallback_sender_title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Default job title <span className="text-gray-400 font-normal text-xs ml-1">{'{{sender_title}}'}</span>
                </label>
                <input
                  id="fallback_sender_title"
                  name="fallback_sender_title"
                  type="text"
                  placeholder="Account Executive"
                  defaultValue={outreach.fallback_sender_title ?? ''}
                  className="w-full px-3 py-2 border dark:border-white/10 rounded-lg text-sm bg-white dark:bg-[#1c1c1c] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="fallback_calendar_link" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Default calendar link <span className="text-gray-400 font-normal text-xs ml-1">{'{{calendar_link}}'}</span>
                </label>
                <input
                  id="fallback_calendar_link"
                  name="fallback_calendar_link"
                  type="url"
                  placeholder="https://cal.com/yourteam"
                  defaultValue={outreach.fallback_calendar_link ?? ''}
                  className="w-full px-3 py-2 border dark:border-white/10 rounded-lg text-sm bg-white dark:bg-[#1c1c1c] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Workspace-wide booking page — used when a sender has no personal link set.
                </p>
              </div>
            </div>
          </section>

          <div className="flex justify-end">
            <SubmitButton
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Save outreach variables
            </SubmitButton>
          </div>
        </form>
      </div>
    </div>
  )
}
