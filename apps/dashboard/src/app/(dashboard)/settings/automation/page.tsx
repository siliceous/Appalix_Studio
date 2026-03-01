import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { saveAutomationSettings } from '@/app/actions/automation-settings'
import { Header } from '@/components/layout/header'
import { SubmitButton } from '@/components/ui/submit-button'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Automation Settings' }

const PRO_PLANS = ['pro', 'scale', 'enterprise']

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

  if (!PRO_PLANS.includes(plan)) {
    return (
      <div className="max-w-2xl space-y-6">
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
    <div className="max-w-2xl space-y-6">
      <Header title="Automation" description="Configure AI-triggered email sending, documents, and approvals" />

      {saved && (
        <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          Settings saved successfully.
        </div>
      )}

      <form action={saveAutomationSettings} className="space-y-6">

        {/* Email sending */}
        <section className="bg-white rounded-xl border divide-y">
          <div className="px-6 py-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Email sending</h2>
            <p className="text-xs text-gray-500 mb-4">
              Used by the <code className="bg-gray-100 px-1 rounded">send_email</code> tool. Powered by{' '}
              <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">Resend</a>.
            </p>
            <div className="space-y-4">
              <div>
                <label htmlFor="resend_api_key" className="block text-sm font-medium text-gray-700 mb-1">
                  Resend API key
                </label>
                <input
                  id="resend_api_key"
                  name="resend_api_key"
                  type="password"
                  placeholder="re_••••••••"
                  defaultValue={cfg.resend_api_key ?? ''}
                  className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="email_from_address" className="block text-sm font-medium text-gray-700 mb-1">
                  From address
                </label>
                <input
                  id="email_from_address"
                  name="email_from_address"
                  type="email"
                  placeholder="hello@yourcompany.com"
                  defaultValue={cfg.email_from_address ?? ''}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">Must be a verified sender in your Resend account.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Approval routing */}
        <section className="bg-white rounded-xl border divide-y">
          <div className="px-6 py-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Approval routing</h2>
            <p className="text-xs text-gray-500 mb-4">
              Used by the <code className="bg-gray-100 px-1 rounded">request_approval</code> tool to notify approvers.
            </p>
            <div className="space-y-4">
              <div>
                <label htmlFor="approver_email" className="block text-sm font-medium text-gray-700 mb-1">
                  Default approver email
                </label>
                <input
                  id="approver_email"
                  name="approver_email"
                  type="email"
                  placeholder="manager@yourcompany.com"
                  defaultValue={cfg.approver_email ?? ''}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="approval_slack_webhook_url" className="block text-sm font-medium text-gray-700 mb-1">
                  Slack webhook URL <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  id="approval_slack_webhook_url"
                  name="approval_slack_webhook_url"
                  type="url"
                  placeholder="https://hooks.slack.com/services/…"
                  defaultValue={cfg.approval_slack_webhook_url ?? ''}
                  className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
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
    </div>
  )
}
