import Link from 'next/link'
import type { Metadata } from 'next'
import { ArticleSeo } from '@/components/marketing/article-seo'

export const metadata: Metadata = {
  title: 'Role-Based Permissions in Appalix — What Each Role Can and Cannot Do',
  description:
    'A complete breakdown of what Owners, Admins, Members, and Viewers can see and do across Sage CRM, Pipelines, Tickets, and workspace settings in Appalix.',
  keywords: [
    'role-based permissions Appalix',
    'CRM access control',
    'viewer read-only CRM',
    'owner admin member viewer permissions',
    'Appalix Sage permissions',
    'workspace role restrictions',
    'pipeline board permissions',
  ],
  alternates: { canonical: 'https://appalix.ai/resources/role-based-permissions' },
  openGraph: {
    title: 'Role-Based Permissions in Appalix',
    description: 'What Owners, Admins, Members, and Viewers can see and do across Sage CRM, Pipelines, Tickets, and workspace settings.',
    url: 'https://appalix.ai/resources/role-based-permissions',
    type: 'article',
    siteName: 'Appalix',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Role-Based Permissions in Appalix',
    description: 'What Owners, Admins, Members, and Viewers can see and do across Sage CRM, Pipelines, Tickets, and workspace settings.',
  },
}

export default function RoleBasedPermissionsPage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <ArticleSeo
        type="Article"
        title="Role-Based Permissions in Appalix"
        description="A complete breakdown of what Owners, Admins, Members, and Viewers can see and do across Sage CRM, Pipelines, Tickets, and workspace settings in Appalix."
        slug="role-based-permissions"
        datePublished="2026-03-10"
      />
      <div className="max-w-3xl mx-auto">

        <div className="flex items-center gap-2 text-sm text-gray-500 mb-10">
          <Link href="/resources" className="hover:text-brand-400 transition-colors">Resources</Link>
          <span>/</span>
          <span className="text-gray-400">Role-Based Permissions</span>
        </div>

        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-400 border border-pink-500/20 font-medium">Product</span>
            <span className="text-xs text-gray-500">9 min read · All plans</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            Role-Based Permissions in Appalix
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Appalix enforces permissions at every layer of the UI — not just in a settings page.
            Viewers see data but cannot change it. Members work freely within their scope. Admins and
            Owners control the platform. This guide maps exactly what each role can and cannot do, section by section.
          </p>
        </div>

        <div className="border-t border-white/10 mb-10" />

        <div className="prose prose-invert prose-brand max-w-none space-y-10 text-gray-300">

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">The four roles — a quick recap</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { role: 'Owner', color: 'border-amber-400/20 bg-amber-400/5 text-amber-400', desc: '1 per workspace. Full control including billing and deletion.' },
                { role: 'Admin', color: 'border-brand-600/20 bg-brand-600/5 text-brand-400', desc: 'Manage bots, integrations, and team. Cannot access billing.' },
                { role: 'Member', color: 'border-white/10 bg-white/[0.03] text-gray-300', desc: 'Full CRM/pipeline access. Cannot configure bots or invite.' },
                { role: 'Viewer', color: 'border-white/10 bg-white/[0.03] text-gray-500', desc: 'Read-only. Can see everything, change nothing.' },
              ].map(({ role, color, desc }) => (
                <div key={role} className={`rounded-xl border p-4 ${color}`}>
                  <p className="text-xs font-bold mb-1">{role}</p>
                  <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Contacts (Sage CRM)</h2>
            <p className="mb-5 text-sm">
              The contacts table is the core of Sage CRM — names, emails, company info, assigned reps, and deal values.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 pr-4 font-semibold text-white">Action</th>
                    <th className="py-3 pr-4 text-center font-semibold text-amber-400">Owner</th>
                    <th className="py-3 pr-4 text-center font-semibold text-brand-400">Admin</th>
                    <th className="py-3 pr-4 text-center font-semibold text-gray-300">Member</th>
                    <th className="py-3 text-center font-semibold text-gray-500">Viewer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] text-sm">
                  {[
                    ['View contacts table', '✓', '✓', '✓', '✓'],
                    ['Search & filter contacts', '✓', '✓', '✓', '✓'],
                    ['Open contact detail', '✓', '✓', '✓', '✓'],
                    ['Create new contact', '✓', '✓', '✓', '—'],
                    ['Edit contact fields', '✓', '✓', '✓', '—'],
                    ['Assign contact to rep', '✓', '✓', '✓', '—'],
                    ['Delete contact', '✓', '✓', '✓', '—'],
                    ['Export contacts', '✓', '✓', '✓', '—'],
                  ].map(([action, ...perms]) => (
                    <tr key={action}>
                      <td className="py-2.5 pr-4 text-gray-300">{action}</td>
                      {perms.map((p, i) => (
                        <td key={i} className={`py-2.5 pr-4 text-center font-medium ${p === '✓' ? 'text-green-400' : 'text-gray-600'}`}>{p}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Pipelines</h2>
            <p className="mb-5 text-sm">
              The Pipelines section covers both the pipeline list page (create/delete pipelines) and the
              kanban/list board inside each pipeline (manage stages, add deals, drag cards).
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 pr-4 font-semibold text-white">Action</th>
                    <th className="py-3 pr-4 text-center font-semibold text-amber-400">Owner</th>
                    <th className="py-3 pr-4 text-center font-semibold text-brand-400">Admin</th>
                    <th className="py-3 pr-4 text-center font-semibold text-gray-300">Member</th>
                    <th className="py-3 text-center font-semibold text-gray-500">Viewer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] text-sm">
                  {[
                    ['View pipelines list', '✓', '✓', '✓', '✓'],
                    ['Open pipeline board', '✓', '✓', '✓', '✓'],
                    ['View deals on board', '✓', '✓', '✓', '✓'],
                    ['Create pipeline', '✓', '✓', '✓', '—'],
                    ['Delete pipeline', '✓', '✓', '✓', '—'],
                    ['Manage stages', '✓', '✓', '✓', '—'],
                    ['Add deal (opportunity)', '✓', '✓', '✓', '—'],
                    ['Edit deal', '✓', '✓', '✓', '—'],
                    ['Drag deal to new stage', '✓', '✓', '✓', '—'],
                    ['Change stage (list view)', '✓', '✓', '✓', 'Read-only label'],
                  ].map(([action, ...perms]) => (
                    <tr key={action}>
                      <td className="py-2.5 pr-4 text-gray-300">{action}</td>
                      {perms.map((p, i) => (
                        <td key={i} className={`py-2.5 pr-4 text-center font-medium ${p === '✓' ? 'text-green-400' : p === '—' ? 'text-gray-600' : 'text-amber-400 text-xs'}`}>{p}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-sm text-gray-500 mt-3">
              Viewers see the pipeline board in full but all interactive controls (drag handles, stage
              selects, add-deal button, edit pencils) are hidden or replaced with read-only equivalents.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Tickets</h2>
            <p className="mb-5 text-sm">
              The Tickets section surfaces support requests, bug reports, or any work item your team
              tracks as a ticket.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 pr-4 font-semibold text-white">Action</th>
                    <th className="py-3 pr-4 text-center font-semibold text-amber-400">Owner</th>
                    <th className="py-3 pr-4 text-center font-semibold text-brand-400">Admin</th>
                    <th className="py-3 pr-4 text-center font-semibold text-gray-300">Member</th>
                    <th className="py-3 text-center font-semibold text-gray-500">Viewer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] text-sm">
                  {[
                    ['View tickets list', '✓', '✓', '✓', '✓'],
                    ['Search & filter tickets', '✓', '✓', '✓', '✓'],
                    ['Open ticket detail (slide-over)', '✓', '✓', '✓', '✓'],
                    ['Create new ticket', '✓', '✓', '✓', '—'],
                    ['Change ticket status', '✓', '✓', '✓', 'Read-only badge'],
                    ['Delete ticket', '✓', '✓', '✓', '—'],
                    ['Select tickets for merge', '✓', '✓', '✓', '—'],
                    ['Merge tickets', '✓', '✓', '✓', '—'],
                  ].map(([action, ...perms]) => (
                    <tr key={action}>
                      <td className="py-2.5 pr-4 text-gray-300">{action}</td>
                      {perms.map((p, i) => (
                        <td key={i} className={`py-2.5 pr-4 text-center font-medium ${p === '✓' ? 'text-green-400' : p === '—' ? 'text-gray-600' : 'text-amber-400 text-xs'}`}>{p}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Sidebar navigation</h2>
            <p className="mb-4 text-sm">
              The sidebar itself adapts to the user&apos;s role. Configuration-only sections are hidden
              for Viewers to reduce visual noise and prevent accidental navigation to pages where
              all actions are blocked anyway.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 pr-4 font-semibold text-white">Nav item</th>
                    <th className="py-3 pr-4 text-center font-semibold text-amber-400">Owner</th>
                    <th className="py-3 pr-4 text-center font-semibold text-brand-400">Admin</th>
                    <th className="py-3 pr-4 text-center font-semibold text-gray-300">Member</th>
                    <th className="py-3 text-center font-semibold text-gray-500">Viewer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] text-sm">
                  {[
                    ['Overview', '✓', '✓', '✓', '✓'],
                    ['Emails, Conversations, Forms, Tickets', '✓', '✓', '✓', '✓'],
                    ['Bots (agent config)', '✓', '✓', '✓', '—'],
                    ['Integrations', '✓', '✓', '✓', '—'],
                    ['Knowledge Base', '✓', '✓', '✓', '—'],
                    ['Sage (CRM, Pipelines, Projects)', '✓', '✓', '✓', '✓'],
                    ['Forms (Leads, Sources)', '✓', '✓', '✓', '✓'],
                    ['Analytics', '✓', '✓', '✓', '✓'],
                    ['Settings', '✓', '✓', '✓', '✓'],
                  ].map(([item, ...perms]) => (
                    <tr key={item}>
                      <td className="py-2.5 pr-4 text-gray-300">{item}</td>
                      {perms.map((p, i) => (
                        <td key={i} className={`py-2.5 pr-4 text-center font-medium ${p === '✓' ? 'text-green-400' : 'text-gray-600'}`}>{p}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-sm text-gray-500 mt-3">
              Viewers still see Settings so they can check billing info, their own role, and
              workspace details. All destructive settings (delete workspace, change roles, invite members)
              are enforced server-side regardless of what the UI shows.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">How enforcement works — defence in depth</h2>
            <p className="mb-4">
              Permission enforcement in Appalix happens at two independent layers:
            </p>

            <div className="space-y-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-sm font-semibold text-white mb-2">1 — UI layer (client-side)</p>
                <p className="text-sm text-gray-400">
                  Every page that receives data from the server also receives the caller&apos;s role. Client components
                  derive a <code className="text-brand-400">canWrite</code> boolean (<code className="text-brand-400">callerRole !== &apos;viewer&apos;</code>)
                  and conditionally render or hide buttons, inputs, and interactive controls. A viewer
                  literally cannot click a &ldquo;Delete&rdquo; button because it is never rendered in the DOM.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-sm font-semibold text-white mb-2">2 — Server layer (server actions)</p>
                <p className="text-sm text-gray-400">
                  Every mutating server action (create contact, delete pipeline, update ticket status, etc.)
                  re-fetches the caller&apos;s membership record from the database before executing.
                  Even if someone bypassed the UI and called an action directly, the server would check
                  their role and reject the request. The two layers work independently — neither relies
                  on the other being correct.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-300">
              <strong className="text-amber-200">Security note:</strong> Row-level security (RLS) on the Supabase database provides a third enforcement layer. The service role is only used for privileged admin operations — standard queries run as the authenticated user and are scoped to their workspace automatically.
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Changing permissions via role change</h2>
            <p className="mb-3">
              Permissions in Appalix are purely role-based — there are no custom per-user overrides.
              If you need to give someone additional access, promote their role. If you need to
              restrict someone, demote them. Role changes in Settings take effect immediately and
              are enforced on the next page load (the role is read fresh on every server request).
            </p>
            <p className="text-sm text-gray-400">
              Only the <strong className="text-white">Owner</strong> can change roles. See the
              <Link href="/resources/team-seats-roles" className="text-brand-400 hover:text-brand-300 mx-1">Team Seats &amp; Roles guide</Link>
              for full instructions.
            </p>
          </section>

          <section className="rounded-2xl bg-brand-600/10 border border-brand-600/20 p-6 text-center mt-12">
            <p className="text-2xl mb-3">🔐</p>
            <h3 className="text-lg font-semibold text-white mb-2">Set up your team permissions</h3>
            <p className="text-sm text-gray-400 mb-5">
              Head to Settings → Team members to review each member&apos;s role and make sure
              the right people have the right access.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link
                href="/settings"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Go to Settings →
              </Link>
              <Link
                href="/resources/team-onboarding-guide"
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-white/10 hover:bg-white/5 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Team onboarding guide →
              </Link>
            </div>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-white/10 flex items-center justify-between flex-wrap gap-4">
          <Link href="/resources/round-robin-lead-distribution" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            ← Round-robin distribution
          </Link>
          <Link href="/resources/team-onboarding-guide" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            Next: Team onboarding guide →
          </Link>
        </div>

      </div>
    </div>
  )
}
