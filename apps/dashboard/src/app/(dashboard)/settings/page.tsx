import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { DeleteWorkspaceButton } from '@/components/settings/delete-workspace-button'
import { ThemeToggle } from '@/components/settings/theme-toggle'
import { BusinessProfileSection } from '@/components/settings/business-profile-section'
import { TeamMembersSection, type MemberDisplay } from '@/components/settings/team-members-section'
import { PermissionsSection, type MemberForPermissions } from '@/components/settings/permissions-section'
import { RoundRobinToggle } from '@/components/settings/round-robin-toggle'
import { parseBusinessDescription } from '@/lib/business-profile'
import { STATUS_COLORS, formatDate } from '@/lib/utils'
import type { Metadata } from 'next'
import type { Workspace, WorkspaceMember, WorkspaceMemberRole } from '@/lib/types'
import { ROLE_RANK } from '@/lib/types'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id, role, workspaces(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  type MembershipWithWorkspace = { workspace_id: string; role: WorkspaceMember['role']; workspaces: Workspace }
  const membership = membershipRaw as MembershipWithWorkspace | null
  if (!membership) redirect('/login')

  const workspace = membership.workspaces
  const isAdmin   = ['owner', 'admin', 'manager'].includes(membership.role)

  const admin = createAdminClient()

  const { data: rawMembers } = await admin
    .from('workspace_members')
    .select('id, user_id, role, accepted_at, invited_at, created_at, invited_by')
    .eq('workspace_id', workspace?.id ?? '')
    .order('created_at', { ascending: true })
  const rawMemberList = (rawMembers ?? []) as (Pick<WorkspaceMember, 'id' | 'user_id' | 'role' | 'accepted_at' | 'invited_at' | 'created_at'> & { invited_by: string | null })[]

  // Fetch emails from auth.users
  const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const userEmailMap: Record<string, string> = {}
  for (const u of usersData?.users ?? []) {
    userEmailMap[u.id] = u.email ?? ''
  }

  // Fetch names from user_profiles
  const memberUserIds = rawMemberList.map((m) => m.user_id)
  const { data: profiles } = await admin
    .from('user_profiles')
    .select('user_id, first_name, last_name')
    .in('user_id', memberUserIds)
  type ProfileRow = { user_id: string; first_name: string; last_name: string | null }
  const profileMap: Record<string, ProfileRow> = {}
  for (const p of (profiles ?? []) as ProfileRow[]) {
    profileMap[p.user_id] = p
  }

  const members: MemberDisplay[] = rawMemberList.map((m) => {
    const profile = profileMap[m.user_id]
    const firstName = profile?.first_name ?? ''
    const lastName  = profile?.last_name  ?? ''
    return {
      id:            m.id,
      user_id:       m.user_id,
      role:          m.role,
      email:         userEmailMap[m.user_id] ?? '',
      name:          [firstName, lastName].filter(Boolean).join(' '),
      accepted_at:   m.accepted_at ?? (m.role === 'owner' ? m.created_at : null),
      invited_at:    m.invited_at ?? null,
      invited_by:    m.invited_by ?? null,
      isCurrentUser: m.user_id === user.id,
    }
  })

  const profileData = parseBusinessDescription(
    (workspace as Workspace & { sage_business_description?: string | null }).sage_business_description ?? null
  )

  // Fetch existing permissions for manageable members (only for admin+)
  const callerRank = ROLE_RANK[membership.role as WorkspaceMemberRole] ?? 0
  type PermRow = { target_user_id: string; can_view_contacts: boolean; can_view_pipelines: boolean; can_view_projects: boolean; can_view_dashboard: boolean; can_allocate_leads: boolean; can_reassign_leads: boolean; can_edit_deals: boolean }
  let initialPermissions: Record<string, Partial<PermRow>> = {}
  if (callerRank >= ROLE_RANK.manager) {
    const { data: permRows } = await admin
      .from('workspace_permissions')
      .select('target_user_id, can_view_contacts, can_view_pipelines, can_view_projects, can_view_dashboard, can_allocate_leads, can_reassign_leads, can_edit_deals')
      .eq('workspace_id', workspace.id)
    for (const p of (permRows ?? []) as PermRow[]) {
      initialPermissions[p.target_user_id] = p
    }
  }

  const membersForPermissions: MemberForPermissions[] = members
    .filter((m) => !m.isCurrentUser && (ROLE_RANK[m.role] ?? 0) < callerRank)
    .map((m) => ({ user_id: m.user_id, name: m.name, email: m.email, role: m.role }))

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Header title="Settings" description="Workspace configuration and billing" />

      {/* Business Profile */}
      <BusinessProfileSection workspaceId={workspace.id} initialData={profileData} />

      {/* Workspace info */}
      <section className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 divide-y dark:divide-white/10">
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
      <section className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 divide-y dark:divide-white/10">
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
            <div className="mt-5 pt-5 border-t dark:border-white/10 flex gap-3">
              <a
                href={process.env.NEXT_PUBLIC_STRIPE_PORTAL_URL ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 border dark:border-white/10 text-sm text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
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
      <section className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10">
        <div className="px-6 py-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Appearance</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Choose your preferred dashboard theme.</p>
          <ThemeToggle />
        </div>
      </section>

      {/* Automation */}
      <section className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10">
        <div className="px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Automation</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Configure email sending (Resend), approval routing, and AI tool settings.</p>
          </div>
          <a
            href="/settings/automation"
            className="shrink-0 px-4 py-2 text-sm font-medium border border-gray-300 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 transition-colors"
          >
            Configure →
          </a>
        </div>
      </section>

      {/* Team members */}
      <section className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10">
        <div className="px-6 py-5 border-b dark:border-white/10 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Team members</h2>
          {isAdmin && (
            <a href="/settings/invite" className="text-xs text-brand-600 hover:underline">
              + Invite member
            </a>
          )}
        </div>
        <div className="pt-4">
          <TeamMembersSection
            members={members}
            callerRole={membership.role}
            callerUserId={user.id}
            seatLimit={workspace.seat_limit ?? null}
            extraSeats={workspace.extra_seats ?? 0}
            workspaceId={workspace.id}
          />
        </div>
      </section>

      {/* Member permissions */}
      {membersForPermissions.length > 0 && (
        <section className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10">
          <div className="px-6 py-5 border-b dark:border-white/10">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Permissions</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Control what each team member can see and do. Click a member to expand.
            </p>
          </div>
          <PermissionsSection
            members={membersForPermissions}
            callerRole={membership.role as WorkspaceMemberRole}
            initialPermissions={initialPermissions}
          />
        </section>
      )}

      {/* Lead Distribution */}
      {isAdmin && (
        <section className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10">
          <div className="px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Lead Distribution</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
                  When enabled, new leads from bot conversations, email, and form submissions are automatically
                  assigned to accepted team members in round-robin order.
                </p>
              </div>
              <RoundRobinToggle
                enabled={!!(workspace as Workspace & { rr_enabled?: boolean }).rr_enabled}
                isAdmin={isAdmin}
              />
            </div>
          </div>
        </section>
      )}

      {/* Danger zone */}
      {membership.role === 'owner' && (
        <section className="bg-white dark:bg-[#2a2a2a] rounded-xl border border-red-100 dark:border-red-900/30">
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
