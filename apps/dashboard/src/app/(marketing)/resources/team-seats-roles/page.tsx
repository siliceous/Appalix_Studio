import Link from 'next/link'
import type { Metadata } from 'next'
import { ArticleSeo } from '@/components/marketing/article-seo'

export const metadata: Metadata = {
  title: 'Team Seats, Roles & Permissions in Appalix — Managing Your Workspace',
  description:
    'Learn how Appalix seat limits, role hierarchy (Owner, Admin, Member, Viewer), and permission controls keep your team organised, your data secure, and your billing predictable.',
  keywords: [
    'Appalix team management',
    'workspace roles and permissions',
    'AI CRM seat limits',
    'owner admin member viewer roles',
    'invite team members Appalix',
    'workspace permissions SaaS',
    'role-based access control',
    'Appalix plans seats',
  ],
  alternates: { canonical: 'https://appalix.ai/resources/team-seats-roles' },
  openGraph: {
    title: 'Team Seats, Roles & Permissions in Appalix',
    description: 'How Appalix seat limits, four-tier role hierarchy, and permission controls keep your team organised and your data secure.',
    url: 'https://appalix.ai/resources/team-seats-roles',
    type: 'article',
    siteName: 'Appalix',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Team Seats, Roles & Permissions in Appalix',
    description: 'How Appalix seat limits, four-tier role hierarchy, and permission controls keep your team organised and your data secure.',
  },
}

export default function TeamSeatsRolesPage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <ArticleSeo
        type="Article"
        title="Team Seats, Roles & Permissions in Appalix"
        description="Learn how Appalix seat limits, role hierarchy (Owner, Admin, Member, Viewer), and permission controls keep your team organised, your data secure, and your billing predictable."
        slug="team-seats-roles"
        datePublished="2026-03-10"
      />
      <div className="max-w-3xl mx-auto">

        <div className="flex items-center gap-2 text-sm text-gray-500 mb-10">
          <Link href="/resources" className="hover:text-brand-400 transition-colors">Resources</Link>
          <span>/</span>
          <span className="text-gray-400">Team Seats, Roles &amp; Permissions</span>
        </div>

        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-400 border border-pink-500/20 font-medium">Product</span>
            <span className="text-xs text-gray-500">8 min read · All plans</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            Team Seats, Roles &amp; Permissions in Appalix
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            As your business grows, so does your team. Appalix gives you fine-grained control over
            who can do what — with a clear four-tier role hierarchy, per-plan seat limits, and
            real-time enforcement that prevents overspending while keeping the right people
            in the right seats.
          </p>
        </div>

        <div className="border-t border-white/10 mb-10" />

        <div className="prose prose-invert prose-brand max-w-none space-y-10 text-gray-300">

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Why seat limits and roles matter</h2>
            <p>
              Giving every employee full admin access is a recipe for accidental data changes,
              broken integrations, and runaway API costs. At the same time, locking everyone
              out of the tools they need slows the team down. Appalix solves this with a
              simple model: <strong className="text-white">you buy the seats you need, assign the right role to each person,
              and Appalix enforces everything automatically</strong> — no manual permission spreadsheets required.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">The four-tier role hierarchy</h2>
            <p className="mb-6">
              Every workspace member has one of four roles. Roles cascade downward — each level
              inherits the abilities of the tiers below it, and adds more on top.
            </p>

            <div className="space-y-4">
              {/* Owner */}
              <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20">Owner</span>
                  <span className="text-xs text-gray-500">1 per workspace</span>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">
                  The person who created the workspace. Has unrestricted access to every feature:
                  billing management, workspace deletion, bot configuration, integrations, all data,
                  and the ability to assign or change any member&apos;s role. There is exactly one Owner
                  per workspace — this role cannot be transferred or duplicated.
                </p>
              </div>

              {/* Admin */}
              <div className="rounded-xl border border-brand-600/20 bg-brand-600/5 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-400 border border-brand-600/20">Admin</span>
                  <span className="text-xs text-gray-500">Trusted team leads</span>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">
                  Can manage integrations, configure bots, view all conversations and CRM data, and
                  invite new members (up to Member level). Admins <em>cannot</em> delete the workspace,
                  access billing, change other admins&apos; roles, or promote anyone to Owner. Ideal for
                  team leads and operations managers who need broad access without billing control.
                </p>
              </div>

              {/* Member */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/8 text-gray-400 border border-white/10">Member</span>
                  <span className="text-xs text-gray-500">Standard team members</span>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">
                  Full access to use all platform features — Sage CRM, conversations, pipeline,
                  forms, emails, meetings, and analytics. Cannot manage integrations, configure bots,
                  or invite colleagues. The right role for sales reps, support agents, and anyone
                  who works with leads and conversations day-to-day.
                </p>
              </div>

              {/* Viewer */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/8 text-gray-500 border border-white/10">Viewer</span>
                  <span className="text-xs text-gray-500">Read-only access</span>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">
                  Can view all data in the workspace but cannot create, edit, or delete anything.
                  Useful for stakeholders, executives, or external consultants who need visibility
                  without the ability to make changes.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Seat limits by plan</h2>
            <p className="mb-5">
              Each plan includes a set number of seats. When the limit is reached, Appalix
              blocks further invitations and shows the seat count in Settings so you always
              know where you stand.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 pr-6 font-semibold text-white">Plan</th>
                    <th className="text-left py-3 pr-6 font-semibold text-white">Included seats</th>
                    <th className="text-left py-3 pr-6 font-semibold text-white">Max extra seats</th>
                    <th className="text-left py-3 font-semibold text-white">Extra seat price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  <tr>
                    <td className="py-3 pr-6 text-gray-300">Individual</td>
                    <td className="py-3 pr-6 text-gray-300">1</td>
                    <td className="py-3 pr-6 text-gray-300">Up to 2</td>
                    <td className="py-3 text-gray-300">$29/mo annual · $45/mo monthly</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-6 text-gray-300">Pro</td>
                    <td className="py-3 pr-6 text-gray-300">3</td>
                    <td className="py-3 pr-6 text-gray-300">Up to 6</td>
                    <td className="py-3 text-gray-300">$29/mo annual · $45/mo monthly</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-6 text-gray-300">Team</td>
                    <td className="py-3 pr-6 text-gray-300">10</td>
                    <td className="py-3 pr-6 text-gray-300">Unlimited</td>
                    <td className="py-3 text-gray-300">$29/mo annual · $45/mo monthly</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-6 text-gray-300">Enterprise</td>
                    <td className="py-3 pr-6 text-gray-300">Unlimited</td>
                    <td className="py-3 pr-6 text-gray-300">—</td>
                    <td className="py-3 text-gray-300">Custom</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-sm text-gray-500 mt-3">
              Extra seats are purchased through the Stripe billing portal and activate immediately.
              The seat bar in Settings updates in real time — green when there&apos;s room, amber when
              you&apos;re approaching the limit, and red when you&apos;re full.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">How to invite a team member</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Go to <strong className="text-white">Settings → Team members</strong> and click <strong className="text-white">+ Invite member</strong> (visible to Owner and Admin only).</li>
              <li>Enter the person&apos;s email address and select their role — <em>Admin</em>, <em>Member</em>, or <em>Viewer</em>.</li>
              <li>Click <strong className="text-white">Send invite</strong>. They&apos;ll receive an email with a magic link to join the workspace.</li>
              <li>Until they accept, their row shows <em>Invitation pending</em>. Once accepted, it shows their join date.</li>
            </ol>
            <p className="mt-4 text-sm text-gray-500">
              If the seat limit is already reached, the invite is blocked and you&apos;ll see a link to
              purchase extra seats or upgrade your plan before proceeding.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Changing a member&apos;s role</h2>
            <p className="mb-3">
              Only the <strong className="text-white">Owner</strong> can change roles. In the Team members section of Settings,
              each non-owner row shows a role dropdown. Select the new role and it saves immediately — no page reload needed.
            </p>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li>You cannot promote anyone to Owner (there is always exactly one per workspace).</li>
              <li>You cannot change your own role.</li>
              <li>Admins can invite members but cannot reassign roles.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Removing a member</h2>
            <p className="mb-3">
              Click the <strong className="text-white">✕</strong> button next to any member row to remove them. The following rules apply:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li><strong className="text-white">Owner</strong> can remove anyone except themselves.</li>
              <li><strong className="text-white">Admin</strong> can remove Members and Viewers but not other Admins.</li>
              <li>Removing a member immediately frees their seat — you can invite someone else right away.</li>
              <li>The removed user loses access to the workspace instantly but retains their Supabase auth account.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Lead assignment &amp; round-robin distribution</h2>
            <p className="mb-4">
              Every contact in Sage CRM can be assigned to a specific team member. Assignments show as
              a badge in the contacts table, are filterable from the Filter panel, and can be set from
              the New or Edit Contact modal.
            </p>

            <div className="space-y-4">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                <h3 className="text-sm font-semibold text-white mb-2">Manual assignment</h3>
                <p className="text-sm text-gray-300 leading-relaxed">
                  Open any contact and select a team member from the <strong className="text-white">Assigned to</strong> dropdown.
                  Use the <strong className="text-white">Assigned To</strong> filter in the contacts table to view a
                  specific rep&apos;s leads, or select <em>Unassigned</em> to find contacts that haven&apos;t been picked up yet.
                </p>
              </div>

              <div className="rounded-xl border border-brand-600/20 bg-brand-600/5 p-5">
                <h3 className="text-sm font-semibold text-white mb-2">Round-robin auto-distribution</h3>
                <p className="text-sm text-gray-300 leading-relaxed">
                  Enable <strong className="text-white">Lead Distribution</strong> in Settings to automatically rotate
                  incoming leads across your accepted team members in join order. Every new contact created by the bot,
                  email triage, or form submission is assigned to the next rep — no manual work required.
                  The rotation pointer advances atomically so concurrent leads never land on the same person twice.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Coming next</p>
              <ul className="list-disc pl-5 space-y-1.5 text-sm text-gray-400">
                <li><strong className="text-gray-300">Scoped views</strong> — Members optionally see only their own assigned leads, keeping pipelines clean on large teams.</li>
              </ul>
            </div>
          </section>

          <section className="rounded-2xl bg-brand-600/10 border border-brand-600/20 p-6 text-center mt-12">
            <p className="text-2xl mb-3">👥</p>
            <h3 className="text-lg font-semibold text-white mb-2">Ready to build your team in Appalix?</h3>
            <p className="text-sm text-gray-400 mb-5">
              Head to Settings → Team members to invite your first colleague, assign the right role, and
              watch the seat bar track your usage in real time.
            </p>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Go to Settings →
            </Link>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-white/10 flex items-center justify-between flex-wrap gap-4">
          <Link href="/resources" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            ← Back to Resources
          </Link>
          <Link href="/pricing" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            View pricing plans →
          </Link>
        </div>

      </div>
    </div>
  )
}
