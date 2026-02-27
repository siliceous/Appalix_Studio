import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { DeleteWorkspaceButton } from '@/components/settings/delete-workspace-button'
import { ThemeToggle } from '@/components/settings/theme-toggle'
import { STATUS_COLORS, formatDate } from '@/lib/utils'
import type { Metadata } from 'next'
import type { Workspace, WorkspaceMember } from '@/lib/types'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id, role, workspaces(*)')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  type MembershipWithWorkspace = { workspace_id: string; role: WorkspaceMember['role']; workspaces: Workspace }
  const membership = membershipRaw as MembershipWithWorkspace | null
  if (!membership) redirect('/login')

  const workspace = membership.workspaces
  const isAdmin   = ['owner', 'admin'].includes(membership.role)

  const { data: rawMembers } = await supabase
    .from('workspace_members')
    .select('id, role, accepted_at, created_at')
    .eq('workspace_id', workspace?.id ?? '')
  const members = (rawMembers ?? []) as Pick<WorkspaceMember, 'id' | 'role' | 'accepted_at' | 'created_at'>[]

  return (
    <div className="max-w-2xl space-y-6">
      <Header title="Settings" description="Workspace configuration and billing" />

      {/* Workspace info */}
      <section className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 divide-y dark:divide-gray-700">
        <div className="px-6 py-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Workspace</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Name</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">{workspace.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Slug</dt>
              <dd className="font-mono text-gray-700 dark:text-gray-300">{workspace.slug}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Created</dt>
              <dd className="text-gray-700 dark:text-gray-300">{formatDate(workspace.created_at)}</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Billing */}
      <section className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 divide-y dark:divide-gray-700">
        <div className="px-6 py-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Billing</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <dt className="text-gray-500 dark:text-gray-400">Plan</dt>
              <dd>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                  workspace.plan === 'enterprise' ? 'bg-purple-100 text-purple-700' :
                  workspace.plan === 'pro'        ? 'bg-brand-100 text-brand-700' :
                                                   'bg-gray-100 text-gray-600'
                }`}>
                  {workspace.plan}
                </span>
              </dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-gray-500 dark:text-gray-400">Status</dt>
              <dd>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[workspace.subscription_status]}`}>
                  {workspace.subscription_status.replace('_', ' ')}
                </span>
              </dd>
            </div>
            {workspace.billing_email && (
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Billing email</dt>
                <dd className="text-gray-700 dark:text-gray-300">{workspace.billing_email}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Message limit / month</dt>
              <dd className="text-gray-700 dark:text-gray-300">{workspace.monthly_message_limit.toLocaleString()}</dd>
            </div>
            {workspace.trial_ends_at && (
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Trial ends</dt>
                <dd className="text-gray-700 dark:text-gray-300">{formatDate(workspace.trial_ends_at)}</dd>
              </div>
            )}
          </dl>

          {isAdmin && (
            <div className="mt-5 pt-5 border-t dark:border-gray-700 flex gap-3">
              <a
                href={process.env.NEXT_PUBLIC_STRIPE_PORTAL_URL ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 border dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Manage billing →
              </a>
              <a
                href="/settings/upgrade"
                className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
              >
                Upgrade plan
              </a>
            </div>
          )}
        </div>
      </section>

      {/* Appearance */}
      <section className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
        <div className="px-6 py-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Appearance</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Choose your preferred dashboard theme.</p>
          <ThemeToggle />
        </div>
      </section>

      {/* Team members */}
      <section className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
        <div className="px-6 py-5 border-b dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Team members</h2>
          {isAdmin && (
            <a href="/settings/invite" className="text-xs text-brand-600 hover:underline">
              + Invite member
            </a>
          )}
        </div>
        <div className="divide-y dark:divide-gray-700">
          {members?.map((m) => (
            <div key={m.id} className="flex items-center gap-4 px-6 py-3.5">
              <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-700 dark:text-brand-300 text-xs font-medium">
                {m.role[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">{m.role}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {m.accepted_at ? `Joined ${formatDate(m.accepted_at)}` : 'Invitation pending'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Danger zone */}
      {membership.role === 'owner' && (
        <section className="bg-white dark:bg-gray-800 rounded-xl border border-red-100 dark:border-red-900/30">
          <div className="px-6 py-5">
            <h2 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-3">Danger zone</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Deleting your workspace is permanent and cannot be undone. All bots,
              conversations, and knowledge base data will be removed.
            </p>
            <DeleteWorkspaceButton />
          </div>
        </section>
      )}
    </div>
  )
}
