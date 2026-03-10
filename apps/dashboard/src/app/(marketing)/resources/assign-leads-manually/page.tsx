import Link from 'next/link'
import type { Metadata } from 'next'
import { ArticleSeo } from '@/components/marketing/article-seo'

export const metadata: Metadata = {
  title: 'Manual Lead Assignment in Appalix Sage CRM — Assign Contacts to Team Members',
  description:
    'Learn how to manually assign leads and contacts to specific team members in Appalix Sage CRM. Track ownership, filter by rep, and ensure every lead has a clear owner.',
  keywords: [
    'lead assignment CRM',
    'assign contacts to team members',
    'Appalix Sage CRM',
    'manual lead distribution',
    'sales rep assignment',
    'contact ownership CRM',
    'Appalix lead management',
  ],
  alternates: { canonical: 'https://appalix.ai/resources/assign-leads-manually' },
  openGraph: {
    title: 'Manual Lead Assignment in Appalix Sage CRM',
    description: 'Assign contacts to team members, filter by rep, and ensure every lead has a clear owner in Appalix Sage.',
    url: 'https://appalix.ai/resources/assign-leads-manually',
    type: 'article',
    siteName: 'Appalix',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Manual Lead Assignment in Appalix Sage CRM',
    description: 'Assign contacts to team members, filter by rep, and ensure every lead has a clear owner in Appalix Sage.',
  },
}

export default function AssignLeadsManuallyPage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <ArticleSeo
        type="Article"
        title="Manual Lead Assignment in Appalix Sage CRM"
        description="Learn how to manually assign leads and contacts to specific team members in Appalix Sage CRM. Track ownership, filter by rep, and ensure every lead has a clear owner."
        slug="assign-leads-manually"
        datePublished="2026-03-10"
      />
      <div className="max-w-3xl mx-auto">

        <div className="flex items-center gap-2 text-sm text-gray-500 mb-10">
          <Link href="/resources" className="hover:text-brand-400 transition-colors">Resources</Link>
          <span>/</span>
          <span className="text-gray-400">Manual Lead Assignment</span>
        </div>

        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-400 border border-pink-500/20 font-medium">Product</span>
            <span className="text-xs text-gray-500">7 min read · Pro &amp; above</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            Manual Lead Assignment in Appalix Sage CRM
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Every contact in Sage CRM can be owned by a specific team member. Manual assignment puts
            you in full control — pick the right rep for the right lead, filter by owner at a glance,
            and eliminate the &ldquo;who&apos;s handling this?&rdquo; confusion that stalls deals.
          </p>
        </div>

        <div className="border-t border-white/10 mb-10" />

        <div className="prose prose-invert prose-brand max-w-none space-y-10 text-gray-300">

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Why contact ownership matters</h2>
            <p>
              In a growing team, unassigned leads are lost leads. When multiple reps can see the same
              contact with no clear owner, two things happen: either two people chase the same prospect
              (creating awkward double-outreach), or nobody does (because each assumes someone else
              has it covered). The <strong className="text-white">Assigned To</strong> field on every
              Sage contact solves this with a single source of truth — one person owns each lead,
              everyone else can see it, and nothing slips through the cracks.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">How the assigned_to field works</h2>
            <p className="mb-4">
              Each contact record has an <strong className="text-white">Assigned To</strong> field that stores a reference
              to a workspace member. It defaults to unassigned when a contact is created manually. It
              auto-populates when round-robin distribution is enabled (covered in the next guide).
              You can override it at any time from the contact modal — no page reload needed.
            </p>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-sm space-y-2">
              <p className="font-semibold text-white">What gets stored</p>
              <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
                <li>The <code className="text-brand-400">assigned_to</code> column on <code className="text-brand-400">sage_contacts</code> stores the assignee&apos;s user ID (a UUID reference to <code className="text-brand-400">auth.users</code>).</li>
                <li>If the assigned member leaves the workspace, the field is automatically set to <em>null</em> — the contact becomes unassigned rather than broken.</li>
                <li>Every assignment change is logged to the contact&apos;s activity timeline so you always have an audit trail.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Assigning a contact — step by step</h2>

            <div className="space-y-4">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-sm font-semibold text-white mb-1">Option 1 — From the New Contact modal</p>
                <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-400">
                  <li>In Sage → Contacts, click <strong className="text-gray-200">+ New Contact</strong>.</li>
                  <li>Fill in the contact details — name, email, company, and so on.</li>
                  <li>Scroll to the <strong className="text-gray-200">Settings</strong> section at the bottom of the form.</li>
                  <li>Open the <strong className="text-gray-200">Assigned to</strong> dropdown and pick any accepted workspace member.</li>
                  <li>Click <strong className="text-gray-200">Create contact</strong>. The contact is created with that member as owner.</li>
                </ol>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-sm font-semibold text-white mb-1">Option 2 — From the Edit Contact modal</p>
                <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-400">
                  <li>Find the contact in the Contacts table and click the <strong className="text-gray-200">pencil (edit) icon</strong> in the Actions column.</li>
                  <li>In the Settings section, change the <strong className="text-gray-200">Assigned to</strong> dropdown to a new member (or clear it to unassigned).</li>
                  <li>Click <strong className="text-gray-200">Save changes</strong>. The contacts table updates immediately.</li>
                </ol>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-300">
              <strong className="text-amber-200">Note:</strong> Only Members, Admins, and Owners can assign or reassign contacts. Viewers see the assignment but cannot change it.
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Seeing assignments in the contacts table</h2>
            <p className="mb-4">
              The Contacts table has a built-in <strong className="text-white">Assigned To</strong> column. When a contact is
              assigned, it shows the member&apos;s name as a small badge. Unassigned contacts show a dash.
            </p>
            <p>
              The column is included in the column picker (the grid icon above the table) so you can
              show or hide it depending on your workflow. By default it is visible.
            </p>

            <div className="mt-5 rounded-xl border border-brand-600/20 bg-brand-600/5 p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Filtering by assignee</h3>
              <p className="text-sm text-gray-300 mb-3">
                The Filter panel (funnel icon) includes an <strong className="text-white">Assigned To</strong> dropdown with three options:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm text-gray-400">
                <li><strong className="text-gray-200">Anyone</strong> — show all contacts regardless of assignment (default).</li>
                <li><strong className="text-gray-200">Unassigned</strong> — show only contacts with no owner. Useful for finding leads that need to be picked up.</li>
                <li><strong className="text-gray-200">[Member name]</strong> — show only that rep&apos;s assigned contacts. Each accepted workspace member appears here.</li>
              </ul>
              <p className="text-sm text-gray-400 mt-3">
                Filters combine — you can filter by assignee <em>and</em> status <em>and</em> pipeline stage simultaneously
                to build precisely targeted views for each sales rep.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Who shows up in the Assigned To dropdown</h2>
            <p className="mb-4">
              The dropdown lists every accepted (joined) workspace member — regardless of their role. This means
              Owners, Admins, Members, and Viewers can all be assigned leads. Typically you&apos;ll assign to Members
              and Admins who actively work deals, but the system doesn&apos;t restrict assignment by role.
            </p>
            <p>
              Pending invited members (who haven&apos;t accepted yet) are <em>not</em> shown — they must complete
              onboarding before they appear as available assignees.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Activity log &amp; audit trail</h2>
            <p className="mb-4">
              Every time a contact&apos;s assignee changes, an activity entry is created on the contact record:
            </p>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm font-mono text-gray-400">
              Assigned to Sarah Chen — Mar 10, 2026 at 14:32
            </div>
            <p className="mt-4">
              This means you always know who made the assignment, when it happened, and how ownership
              has changed over time — useful for accountability reviews and handoff documentation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Best practices</h2>
            <ul className="list-disc pl-5 space-y-3 text-sm">
              <li>
                <strong className="text-white">Assign at creation.</strong> The best time to assign a lead is the moment it enters the system.
                Build the habit of always selecting an owner in the New Contact modal before clicking Create.
              </li>
              <li>
                <strong className="text-white">Review the Unassigned filter weekly.</strong> Set aside five minutes each week to open
                Contacts → Filter → Unassigned. Any contact sitting there is a lead that hasn&apos;t been
                claimed — reassign or act immediately.
              </li>
              <li>
                <strong className="text-white">Let round-robin handle inbound.</strong> For leads coming in via the bot, email, or forms,
                enable round-robin distribution (Settings → Lead Distribution) so they&apos;re assigned
                automatically — no manual step required.
              </li>
              <li>
                <strong className="text-white">Use the Assigned To column on pipeline cards.</strong> Pipeline board cards surface the
                assignee name so reps can see at a glance which deals belong to them without opening
                every record.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What&apos;s coming next</h2>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <ul className="list-disc pl-5 space-y-2 text-sm text-gray-400">
                <li><strong className="text-gray-200">Scoped views</strong> — Members optionally see only their own assigned leads, keeping the contacts table clean on large teams.</li>
                <li><strong className="text-gray-200">Assignment notifications</strong> — Get notified in-app or by email when a lead is assigned to you.</li>
              </ul>
            </div>
          </section>

          <section className="rounded-2xl bg-brand-600/10 border border-brand-600/20 p-6 text-center mt-12">
            <p className="text-2xl mb-3">🎯</p>
            <h3 className="text-lg font-semibold text-white mb-2">Start assigning leads today</h3>
            <p className="text-sm text-gray-400 mb-5">
              Go to Sage → Contacts, open any contact, and try the Assigned To dropdown. Then head to
              Settings → Lead Distribution to automate the process with round-robin.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link
                href="/sage/contacts"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Open Contacts →
              </Link>
              <Link
                href="/resources/round-robin-lead-distribution"
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-white/10 hover:bg-white/5 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Round-robin guide →
              </Link>
            </div>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-white/10 flex items-center justify-between flex-wrap gap-4">
          <Link href="/resources" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            ← Back to Resources
          </Link>
          <Link href="/resources/round-robin-lead-distribution" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            Next: Round-robin distribution →
          </Link>
        </div>

      </div>
    </div>
  )
}
