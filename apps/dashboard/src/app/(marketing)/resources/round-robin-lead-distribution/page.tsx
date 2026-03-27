import Link from 'next/link'
import type { Metadata } from 'next'
import { ArticleSeo } from '@/components/marketing/article-seo'

export const metadata: Metadata = {
  title: 'Round-Robin Lead Distribution in Appalix — Auto-Assign Every Incoming Lead',
  description:
    'Automatically rotate inbound leads across your sales team with Appalix round-robin distribution. Enable it in one click — every bot, email, and form lead gets assigned without manual work.',
  keywords: [
    'round-robin lead distribution',
    'auto assign leads CRM',
    'Appalix lead assignment automation',
    'sales team lead rotation',
    'inbound lead distribution',
    'automatic lead assignment',
    'Appalix Sage CRM',
  ],
  alternates: { canonical: 'https://appalix.ai/resources/round-robin-lead-distribution' },
  openGraph: {
    title: 'Round-Robin Lead Distribution in Appalix',
    description: 'Automatically rotate inbound leads across your sales team. Enable in one click — every bot, email, and form lead gets assigned without manual work.',
    url: 'https://appalix.ai/resources/round-robin-lead-distribution',
    type: 'article',
    siteName: 'Appalix',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Round-Robin Lead Distribution in Appalix',
    description: 'Automatically rotate inbound leads across your sales team — every bot, email, and form lead gets assigned without manual work.',
  },
}

export default function RoundRobinLeadDistributionPage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <ArticleSeo
        type="Article"
        title="Round-Robin Lead Distribution in Appalix"
        description="Automatically rotate inbound leads across your sales team with Appalix round-robin distribution. Enable it in one click — every bot, email, and form lead gets assigned without manual work."
        slug="round-robin-lead-distribution"
        datePublished="2026-03-10"
      />
      <div className="max-w-3xl mx-auto">

        <div className="flex items-center gap-2 text-sm text-white/60 mb-10">
          <Link href="/resources" className="hover:text-brand-400 transition-colors">Resources</Link>
          <span>/</span>
          <span className="text-white/65">Round-Robin Lead Distribution</span>
        </div>

        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-400 border border-pink-500/20 font-medium">Product</span>
            <span className="text-xs text-white/60">8 min read · Pro &amp; above</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            Round-Robin Lead Distribution in Appalix
          </h1>
          <p className="text-white/65 text-lg leading-relaxed">
            Manual assignment works well for existing leads — but what about the dozen new contacts
            your bot, email triage, and form submissions create every day? Round-robin distribution
            automates the entire process: every inbound lead is assigned to the next rep in rotation,
            instantly, with zero manual work required.
          </p>
        </div>

        <div className="border-t border-white/10 mb-10" />

        <div className="prose prose-invert prose-brand max-w-none space-y-10 text-white/80">

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What is round-robin distribution?</h2>
            <p>
              Round-robin is a scheduling algorithm that cycles through a list of team members in order,
              giving each person the next item in the queue. Applied to leads: the first inbound contact
              goes to Rep A, the second to Rep B, the third to Rep C, the fourth back to Rep A, and so
              on indefinitely. No rep gets two leads in a row while another rep has none.
            </p>
            <p className="mt-3">
              It is the simplest fair-distribution method and the one most sales teams reach for first.
              It requires no scoring, no territory maps, and no manual decisions — just a toggle and a
              list of team members.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Enabling round-robin in Appalix</h2>
            <p className="mb-5">
              Round-robin distribution is controlled by a single toggle in workspace settings.
              Only <strong className="text-white">Owners</strong> and <strong className="text-white">Admins</strong> can change it.
            </p>

            <ol className="list-decimal pl-5 space-y-3 text-sm">
              <li>Go to <strong className="text-white">Settings</strong> (sidebar → bottom).</li>
              <li>Scroll to the <strong className="text-white">Lead Distribution</strong> section.</li>
              <li>Flip the toggle from <strong className="text-white">Off</strong> to <strong className="text-white">On</strong>.</li>
              <li>The change saves instantly — no confirmation dialog, no page reload.</li>
            </ol>

            <div className="mt-5 rounded-xl border border-brand-600/20 bg-brand-600/5 p-5">
              <p className="text-sm font-semibold text-white mb-2">What happens immediately after enabling</p>
              <ul className="list-disc pl-5 space-y-2 text-sm text-white/65">
                <li>The next contact created by the bot, email triage, or a form submission will be automatically assigned to a team member.</li>
                <li>Existing contacts are not retroactively reassigned — only newly created contacts are affected.</li>
                <li>Manual assignments you make in the Contact modal continue to work and override the round-robin assignment.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">How the rotation works</h2>
            <p className="mb-4">
              Appalix uses an <strong className="text-white">atomic increment pointer</strong> stored on the workspace record. Here
              is the exact sequence for every inbound lead:
            </p>

            <div className="space-y-3">
              {[
                { step: '1', label: 'Check rr_enabled', detail: 'If round-robin is off, skip assignment and create the contact as unassigned.' },
                { step: '2', label: 'Fetch accepted members', detail: 'Load all workspace members who have accepted their invitation, ordered by join date (oldest first).' },
                { step: '3', label: 'Pick the next assignee', detail: 'Read the current rr_index from the workspace record, compute currentIndex = rr_index % members.length, and pick that member.' },
                { step: '4', label: 'Increment the counter', detail: 'Write rr_index + 1 back to the workspace. This happens atomically so two simultaneous leads cannot land on the same person.' },
                { step: '5', label: 'Assign the contact', detail: 'Write the picked user ID into the contact\'s assigned_to field immediately after creation.' },
              ].map(({ step, label, detail }) => (
                <div key={step} className="flex gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="shrink-0 w-7 h-7 rounded-full bg-brand-600/20 text-brand-400 flex items-center justify-center text-xs font-bold">
                    {step}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white mb-0.5">{label}</p>
                    <p className="text-sm text-white/65">{detail}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-300">
              <strong className="text-amber-200">Important:</strong> The counter never resets. It always increments and uses modulo at read time. This means adding or removing a team member is handled gracefully — the index simply wraps around the new member list without any manual recalibration.
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Which lead sources trigger round-robin</h2>
            <p className="mb-4">
              Round-robin fires whenever a <em>new</em> contact is created by an automated source — not when contacts are created manually. The three automated sources are:
            </p>

            <div className="space-y-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🤖</span>
                  <p className="text-sm font-semibold text-white">Bot triage (chat conversations)</p>
                </div>
                <p className="text-sm text-white/65">
                  When a visitor provides their details in a chat conversation and the bot marks them as a lead,
                  a new Sage contact is created automatically. If round-robin is enabled, the contact is
                  immediately assigned to the next rep.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">📧</span>
                  <p className="text-sm font-semibold text-white">Email triage</p>
                </div>
                <p className="text-sm text-white/65">
                  Inbound emails processed by the AI triage system that result in a new contact being
                  created (first email from an unknown sender) are automatically distributed to the
                  next rep in rotation.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">📋</span>
                  <p className="text-sm font-semibold text-white">Form submissions (Meta Ads, Google Ads, and embedded forms)</p>
                </div>
                <p className="text-sm text-white/65">
                  Leads from Meta Lead Ads, Google Ads Lead Forms, and any embedded Appalix form that
                  create a new contact are automatically assigned via round-robin. Duplicate contacts
                  (matched by email) are merged without triggering a new assignment.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Who is in the rotation pool</h2>
            <p className="mb-4">
              The rotation pool includes <strong className="text-white">all accepted workspace members</strong>, regardless of role.
              Members are ordered by their join date (ascending) — the longest-tenured member is always
              index 0 in the pool.
            </p>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li><strong className="text-white">Adding a new member:</strong> They join the end of the rotation as soon as they accept their invitation. The counter picks them up naturally on the next cycle.</li>
              <li><strong className="text-white">Removing a member:</strong> They drop out of the pool immediately. The next lead goes to whoever the modulo lands on in the reduced list — no gaps, no errors.</li>
              <li><strong className="text-white">Viewers in the pool:</strong> Viewers are technically in the pool if they have accepted. If you want to exclude someone from receiving leads, consider keeping them as a pending invite or removing them from the workspace.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Overriding a round-robin assignment</h2>
            <p>
              Round-robin is the default — it fires at creation time. But it is never locked in. Any
              team member with write access (Member, Admin, or Owner) can open the contact, go to the
              Settings section of the edit modal, and change the <strong className="text-white">Assigned to</strong> field to any
              other team member. The override is saved immediately and the round-robin counter is not
              affected — the next inbound lead will still go to whoever was next in line.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Turning round-robin off</h2>
            <p>
              Flip the toggle in Settings → Lead Distribution back to <strong className="text-white">Off</strong>. The change takes
              effect immediately. New contacts created after this point will be unassigned by default.
              Contacts that were already assigned retain their assignment — nothing is undone.
            </p>
            <p className="mt-3 text-sm text-white/65">
              The <code className="text-brand-400">rr_index</code> counter is preserved in the database. If you re-enable
              round-robin later, the rotation picks up exactly where it left off.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Round-robin vs. manual assignment — when to use each</h2>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 pr-6 font-semibold text-white">Scenario</th>
                    <th className="text-left py-3 font-semibold text-white">Recommended approach</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  <tr>
                    <td className="py-3 pr-6 text-white/80">High-volume inbound (10+ leads/day)</td>
                    <td className="py-3 text-white/80">Round-robin + occasional manual overrides</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-6 text-white/80">Territory-based sales (leads for specific regions)</td>
                    <td className="py-3 text-white/80">Manual assignment by territory manager</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-6 text-white/80">Enterprise accounts (high-value, named reps)</td>
                    <td className="py-3 text-white/80">Manual assignment, always</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-6 text-white/80">Small team (&lt; 4 reps) with mixed inbound</td>
                    <td className="py-3 text-white/80">Round-robin — simple and fair</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-6 text-white/80">Solo operator</td>
                    <td className="py-3 text-white/80">Not needed — all leads go to you</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What&apos;s coming next</h2>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <ul className="list-disc pl-5 space-y-2 text-sm text-white/65">
                <li><strong className="text-white/90">Weighted round-robin</strong> — Give senior reps a higher share of the rotation (e.g. 2× the leads of a junior rep).</li>
                <li><strong className="text-white/90">Capacity-based routing</strong> — Pause a rep&apos;s slot when they reach a deal-count threshold.</li>
                <li><strong className="text-white/90">Scoped views</strong> — Members optionally see only their own leads, keeping the dashboard focused.</li>
              </ul>
            </div>
          </section>

          <section className="rounded-2xl bg-brand-600/10 border border-brand-600/20 p-6 text-center mt-12">
            <p className="text-2xl mb-3">🔄</p>
            <h3 className="text-lg font-semibold text-white mb-2">Turn on round-robin in under 10 seconds</h3>
            <p className="text-sm text-white/65 mb-5">
              Settings → Lead Distribution → flip the toggle. The next inbound lead will be assigned automatically.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link
                href="/settings"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Go to Settings →
              </Link>
              <Link
                href="/resources/assign-leads-manually"
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-white/10 hover:bg-white/5 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Manual assignment guide →
              </Link>
            </div>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-white/10 flex items-center justify-between flex-wrap gap-4">
          <Link href="/resources/assign-leads-manually" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            ← Manual assignment
          </Link>
          <Link href="/resources/role-based-permissions" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            Next: Role-based permissions →
          </Link>
        </div>

      </div>
    </div>
  )
}
