import Link from 'next/link'
import type { Metadata } from 'next'
import { ArticleSeo } from '@/components/marketing/article-seo'

export const metadata: Metadata = {
  title: 'Team Onboarding Guide — Add Your Team to Appalix in 15 Minutes',
  description:
    'A quick, practical guide to inviting your team to Appalix, assigning the right roles, setting up lead distribution, and getting everyone productive on day one.',
  keywords: [
    'Appalix team onboarding',
    'add team members Appalix',
    'invite colleagues CRM',
    'Appalix getting started',
    'workspace setup guide',
    'sales team CRM onboarding',
    'Appalix Sage quick start',
  ],
  alternates: { canonical: 'https://appalix.ai/resources/team-onboarding-guide' },
  openGraph: {
    title: 'Team Onboarding Guide — Add Your Team to Appalix in 15 Minutes',
    description: 'Invite your team, assign roles, set up lead distribution, and get everyone productive on day one.',
    url: 'https://appalix.ai/resources/team-onboarding-guide',
    type: 'article',
    siteName: 'Appalix',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Team Onboarding Guide — Add Your Team to Appalix in 15 Minutes',
    description: 'Invite your team, assign roles, set up lead distribution, and get everyone productive on day one.',
  },
}

export default function TeamOnboardingGuidePage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <ArticleSeo
        type="Article"
        title="Team Onboarding Guide — Add Your Team to Appalix in 15 Minutes"
        description="A quick, practical guide to inviting your team to Appalix, assigning the right roles, setting up lead distribution, and getting everyone productive on day one."
        slug="team-onboarding-guide"
        datePublished="2026-03-10"
      />
      <div className="max-w-3xl mx-auto">

        <div className="flex items-center gap-2 text-sm text-gray-500 mb-10">
          <Link href="/resources" className="hover:text-brand-400 transition-colors">Resources</Link>
          <span>/</span>
          <span className="text-gray-400">Team Onboarding Guide</span>
        </div>

        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#15A4AE]/15 text-[#15A4AE] border border-[#15A4AE]/20 font-medium">Guide</span>
            <span className="text-xs text-gray-500">15 min read · All plans</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            Team Onboarding Guide
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            This guide takes you from a fresh workspace to a fully operational team in under 15 minutes.
            Follow the steps in order and your colleagues will have the right access, the right tools,
            and their first leads ready to work — before your first all-hands call.
          </p>
        </div>

        <div className="border-t border-white/10 mb-10" />

        {/* Progress checklist */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 mb-10">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">What you&apos;ll complete</p>
          <div className="space-y-2 text-sm text-gray-300">
            {[
              'Step 1 — Set up your business profile',
              'Step 2 — Invite team members with the right roles',
              'Step 3 — Choose a lead distribution strategy',
              'Step 4 — Create your first pipeline',
              'Step 5 — Import or create your first contacts',
              'Step 6 — Assign leads to your team',
              'Step 7 — Orient your team members',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full border border-white/20 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="prose prose-invert prose-brand max-w-none space-y-12 text-gray-300">

          {/* Step 1 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-brand-600/20 text-brand-400 flex items-center justify-center text-sm font-bold shrink-0">1</div>
              <h2 className="text-xl font-semibold text-white m-0">Set up your business profile</h2>
            </div>
            <p className="mb-4">
              Before anything else, give Appalix context about your business. This powers the AI throughout
              the platform — bot responses, lead triage, deal suggestions, and Sage assistant answers all
              draw from your business profile.
            </p>
            <ol className="list-decimal pl-5 space-y-2 text-sm">
              <li>Go to <strong className="text-white">Settings</strong> → scroll to <strong className="text-white">Business Profile</strong>.</li>
              <li>Enter your <strong className="text-white">company name</strong> and <strong className="text-white">industry</strong>.</li>
              <li>Write a brief description of your <strong className="text-white">target customers</strong> — who they are, their job title, their biggest pain points.</li>
              <li>Describe your <strong className="text-white">product or service</strong> — what it does, the key value props, and what makes it different.</li>
              <li>Click <strong className="text-white">Save profile</strong>.</li>
            </ol>
            <div className="mt-4 rounded-xl border border-brand-600/20 bg-brand-600/5 p-4 text-sm text-gray-300">
              <strong className="text-white">Tip:</strong> Be specific about target customers. &ldquo;B2B SaaS companies with 10–50 employees in the US looking to automate customer support&rdquo; gives the AI much more to work with than &ldquo;small businesses&rdquo;. The more context you provide here, the sharper your bot&apos;s lead qualification becomes.
            </div>
          </section>

          {/* Step 2 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-brand-600/20 text-brand-400 flex items-center justify-center text-sm font-bold shrink-0">2</div>
              <h2 className="text-xl font-semibold text-white m-0">Invite team members with the right roles</h2>
            </div>
            <p className="mb-5">
              Go to <strong className="text-white">Settings → Team members → + Invite member</strong> (Owner and Admin only).
              For each person you invite, choose their role carefully — it determines what they can do in the platform.
            </p>

            <div className="space-y-3 mb-5">
              {[
                {
                  role: 'Admin',
                  color: 'border-brand-600/20 bg-brand-600/5 text-brand-400',
                  who: 'Team leads, operations managers',
                  can: 'Configure bots, integrations, knowledge base, invite members, full CRM access',
                  cannot: 'Access billing, delete workspace, change other admins\' roles',
                },
                {
                  role: 'Member',
                  color: 'border-white/10 bg-white/[0.03] text-gray-300',
                  who: 'Sales reps, support agents, account managers',
                  can: 'Full Sage CRM, pipelines, tickets, conversations, forms, analytics',
                  cannot: 'Configure bots or integrations, invite colleagues',
                },
                {
                  role: 'Viewer',
                  color: 'border-white/10 bg-white/[0.03] text-gray-500',
                  who: 'Executives, external stakeholders, consultants',
                  can: 'View all data across the workspace — contacts, deals, tickets, analytics',
                  cannot: 'Create, edit, or delete anything',
                },
              ].map(({ role, color, who, can, cannot }) => (
                <div key={role} className={`rounded-xl border p-5 ${color}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold">{role}</span>
                    <span className="text-xs text-gray-500">— {who}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-gray-500 mb-1 uppercase tracking-wider font-semibold text-[10px]">Can do</p>
                      <p className="text-gray-300 leading-relaxed">{can}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1 uppercase tracking-wider font-semibold text-[10px]">Cannot do</p>
                      <p className="text-gray-400 leading-relaxed">{cannot}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-sm text-gray-400">
              Each invited person receives an email with a magic link. They must click it to join — their
              seat is only consumed once they accept. You can see pending invitations in the Team members
              section with an &ldquo;Invitation pending&rdquo; badge.
            </p>
          </section>

          {/* Step 3 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-brand-600/20 text-brand-400 flex items-center justify-center text-sm font-bold shrink-0">3</div>
              <h2 className="text-xl font-semibold text-white m-0">Choose a lead distribution strategy</h2>
            </div>
            <p className="mb-5">
              Decide how new inbound leads (from the bot, email, and forms) should be assigned.
              You have two options:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-sm font-semibold text-white mb-2">Manual assignment</p>
                <p className="text-sm text-gray-400 mb-3">
                  New contacts arrive unassigned. Team leads review them and assign to reps as needed.
                </p>
                <p className="text-xs text-gray-500">Best for: small teams, territory-based sales, high-value named accounts.</p>
              </div>
              <div className="rounded-xl border border-brand-600/20 bg-brand-600/5 p-5">
                <p className="text-sm font-semibold text-white mb-2">Round-robin (recommended)</p>
                <p className="text-sm text-gray-400 mb-3">
                  New contacts are automatically assigned to the next rep in rotation — no manual step.
                </p>
                <p className="text-xs text-gray-500">Best for: high-volume inbound, equal-share teams, reducing admin overhead.</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-brand-600/20 bg-brand-600/5 p-4 text-sm">
              <strong className="text-white">To enable round-robin:</strong>
              <span className="text-gray-300"> Settings → Lead Distribution → flip the toggle to On. Done. Every future inbound lead is assigned automatically.</span>
            </div>
          </section>

          {/* Step 4 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-brand-600/20 text-brand-400 flex items-center justify-center text-sm font-bold shrink-0">4</div>
              <h2 className="text-xl font-semibold text-white m-0">Create your first pipeline</h2>
            </div>
            <p className="mb-4">
              A pipeline represents your sales process from first contact to closed deal. Appalix includes
              templates to get you started in seconds.
            </p>
            <ol className="list-decimal pl-5 space-y-2 text-sm">
              <li>Go to <strong className="text-white">Sage → Pipelines</strong>.</li>
              <li>Click <strong className="text-white">Create Pipeline</strong>.</li>
              <li>Give it a name (e.g. &ldquo;New Business&rdquo;, &ldquo;Enterprise&rdquo;, &ldquo;Renewals&rdquo;).</li>
              <li>Choose a template — <em>Sales</em>, <em>Agency</em>, <em>Consulting</em>, <em>Support</em>, or <em>Onboarding</em> — or start blank.</li>
              <li>Click <strong className="text-white">Create</strong>. The pipeline opens with its stages ready to go.</li>
            </ol>
            <p className="mt-3 text-sm text-gray-400">
              You can customise stages from inside the board using <strong className="text-white">Manage Stages</strong>. Add, rename, reorder, or delete stages to match your exact process.
            </p>
          </section>

          {/* Step 5 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-brand-600/20 text-brand-400 flex items-center justify-center text-sm font-bold shrink-0">5</div>
              <h2 className="text-xl font-semibold text-white m-0">Import or create your first contacts</h2>
            </div>
            <p className="mb-4">
              You have three ways to get contacts into Sage:
            </p>

            <div className="space-y-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-semibold text-white mb-1">A — Manual entry</p>
                <p className="text-sm text-gray-400">
                  Go to Sage → Contacts → <strong className="text-gray-200">+ New Contact</strong>. Fill in the details and create.
                  Good for a handful of named accounts you want in the system right away.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-semibold text-white mb-1">B — Inbound from the bot</p>
                <p className="text-sm text-gray-400">
                  Once your AI bot is live, every visitor who shares their contact details in a chat
                  conversation is automatically added as a Sage contact. Enable round-robin in step 3
                  and they&apos;ll be assigned to a rep instantly.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-semibold text-white mb-1">C — Lead ads &amp; form submissions</p>
                <p className="text-sm text-gray-400">
                  Connect Meta Lead Ads or Google Ads Lead Forms in <strong className="text-gray-200">Forms → Sources</strong>.
                  Every submission creates a scored Sage contact automatically. Email triage from connected
                  mailboxes works the same way.
                </p>
              </div>
            </div>
          </section>

          {/* Step 6 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-brand-600/20 text-brand-400 flex items-center justify-center text-sm font-bold shrink-0">6</div>
              <h2 className="text-xl font-semibold text-white m-0">Assign leads to your team</h2>
            </div>
            <p className="mb-4">
              If you enabled round-robin in Step 3, inbound leads are already being assigned. For any
              existing or manually created contacts that are unassigned:
            </p>
            <ol className="list-decimal pl-5 space-y-2 text-sm">
              <li>Go to <strong className="text-white">Sage → Contacts</strong>.</li>
              <li>Open the <strong className="text-white">Filter</strong> panel and set <strong className="text-white">Assigned To → Unassigned</strong>.</li>
              <li>For each contact that needs an owner, click the edit (pencil) icon.</li>
              <li>In the Settings section, pick a team member from the <strong className="text-white">Assigned to</strong> dropdown.</li>
              <li>Save. Repeat until the Unassigned view is empty.</li>
            </ol>
            <div className="mt-4 rounded-xl border border-brand-600/20 bg-brand-600/5 p-4 text-sm text-gray-300">
              <strong className="text-white">Pro tip:</strong> Once contacts are assigned, each rep can filter the table to <em>their own name</em> to see only their leads. They&apos;ll see exactly the contacts they need to work — no noise from other reps&apos; pipelines.
            </div>
          </section>

          {/* Step 7 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-brand-600/20 text-brand-400 flex items-center justify-center text-sm font-bold shrink-0">7</div>
              <h2 className="text-xl font-semibold text-white m-0">Orient your team members</h2>
            </div>
            <p className="mb-5">
              Once your team has accepted their invitations, share this quick orientation. Each role has
              a slightly different starting point.
            </p>

            <div className="space-y-4">
              <div className="rounded-xl border border-brand-600/20 bg-brand-600/5 p-5">
                <p className="text-sm font-semibold text-brand-300 mb-3">For Admins — your first 10 minutes</p>
                <ul className="list-disc pl-5 space-y-2 text-sm text-gray-400">
                  <li><strong className="text-gray-200">Settings → Bots:</strong> Review bot configurations, knowledge base sources, and response style.</li>
                  <li><strong className="text-gray-200">Settings → Integrations:</strong> Connect your email provider, CRM webhooks, and any Zapier automations.</li>
                  <li><strong className="text-gray-200">Settings → Automation:</strong> Configure email sending (Resend) and approval routing.</li>
                  <li><strong className="text-gray-200">Sage → Pipelines:</strong> Check the pipeline stages and customise them to match your sales process.</li>
                </ul>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-sm font-semibold text-white mb-3">For Members (sales reps) — your first 10 minutes</p>
                <ul className="list-disc pl-5 space-y-2 text-sm text-gray-400">
                  <li><strong className="text-gray-200">Sage → Contacts → Filter → Assigned To → [your name]:</strong> See all leads assigned to you.</li>
                  <li><strong className="text-gray-200">Sage → Pipelines → [pipeline name]:</strong> Open the board and review deals in your stages.</li>
                  <li><strong className="text-gray-200">Dashboard → Conversations:</strong> Check any open chat conversations that need a response or handoff.</li>
                  <li><strong className="text-gray-200">Dashboard → Tickets:</strong> Review any support tickets assigned to your queue.</li>
                </ul>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-sm font-semibold text-gray-400 mb-3">For Viewers — your first 5 minutes</p>
                <ul className="list-disc pl-5 space-y-2 text-sm text-gray-400">
                  <li><strong className="text-gray-200">Dashboard → Overview:</strong> High-level metrics — message volume, lead counts, conversion trends.</li>
                  <li><strong className="text-gray-200">Analytics:</strong> Detailed charts across conversations, deals, and response performance.</li>
                  <li><strong className="text-gray-200">Sage → Pipelines:</strong> Read-only view of active deals across all stages.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Quick reference */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Quick reference — feature access by role</h2>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 pr-4 font-semibold text-white">Feature</th>
                    <th className="py-3 pr-4 text-center font-semibold text-amber-400">Owner</th>
                    <th className="py-3 pr-4 text-center font-semibold text-brand-400">Admin</th>
                    <th className="py-3 pr-4 text-center font-semibold text-gray-300">Member</th>
                    <th className="py-3 text-center font-semibold text-gray-500">Viewer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] text-sm">
                  {[
                    ['Conversations, Emails, Tickets', '✓', '✓', '✓', 'View only'],
                    ['Sage CRM — view', '✓', '✓', '✓', '✓'],
                    ['Sage CRM — create/edit/delete', '✓', '✓', '✓', '—'],
                    ['Pipelines — view', '✓', '✓', '✓', '✓'],
                    ['Pipelines — create/manage/drag', '✓', '✓', '✓', '—'],
                    ['Bots & Integrations', '✓', '✓', '—', '—'],
                    ['Knowledge Base', '✓', '✓', '—', '—'],
                    ['Analytics', '✓', '✓', '✓', '✓'],
                    ['Invite team members', '✓', '✓', '—', '—'],
                    ['Billing', '✓', '—', '—', '—'],
                    ['Delete workspace', '✓', '—', '—', '—'],
                  ].map(([feature, ...perms]) => (
                    <tr key={feature}>
                      <td className="py-2.5 pr-4 text-gray-300">{feature}</td>
                      {perms.map((p, i) => (
                        <td key={i} className={`py-2.5 pr-4 text-center font-medium ${
                          p === '✓' ? 'text-green-400' :
                          p === '—' ? 'text-gray-600' :
                          'text-amber-400 text-xs'
                        }`}>{p}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Common questions */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Common onboarding questions</h2>
            <div className="space-y-4">
              {[
                {
                  q: 'A team member never received their invitation email.',
                  a: 'Check the spam folder first. You can also copy the invite link from the Team members section in Settings and send it directly.',
                },
                {
                  q: 'I invited someone but they can\'t see Bots or Integrations in the sidebar.',
                  a: 'They are likely a Member or Viewer. Bots and Integrations are visible only to Admins and Owners. Promote their role if they need access.',
                },
                {
                  q: 'Round-robin assigned a lead to someone who is on holiday.',
                  a: 'Override the assignment by opening the contact, clicking Edit, and changing the Assigned to field. The round-robin counter continues unaffected.',
                },
                {
                  q: 'How do I see only my own leads without filtering every time?',
                  a: 'This is a saved-filter feature coming soon. For now, open Contacts → Filter → Assigned To → [your name]. The filter persists for your session.',
                },
                {
                  q: 'Can I have two Owners?',
                  a: 'No — there is exactly one Owner per workspace. If you need someone with Owner-level trust, promote them to Admin (which gives nearly identical access except billing and workspace deletion).',
                },
              ].map(({ q, a }) => (
                <div key={q} className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-sm font-semibold text-white mb-2">{q}</p>
                  <p className="text-sm text-gray-400">{a}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl bg-brand-600/10 border border-brand-600/20 p-6 text-center mt-12">
            <p className="text-2xl mb-3">🚀</p>
            <h3 className="text-lg font-semibold text-white mb-2">Ready to invite your team?</h3>
            <p className="text-sm text-gray-400 mb-5">
              Head to Settings → Team members and send your first invitation. The whole process takes
              under two minutes per person.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link
                href="/settings/invite"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Invite a team member →
              </Link>
              <Link
                href="/resources/team-seats-roles"
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-white/10 hover:bg-white/5 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Full roles &amp; seats guide →
              </Link>
            </div>
          </section>

          {/* Further reading */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Further reading</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { href: '/resources/team-seats-roles', title: 'Team Seats, Roles & Permissions', desc: 'Full breakdown of the four-tier role hierarchy and seat limits.' },
                { href: '/resources/assign-leads-manually', title: 'Manual Lead Assignment', desc: 'How to assign contacts to reps and filter by owner.' },
                { href: '/resources/round-robin-lead-distribution', title: 'Round-Robin Distribution', desc: 'Auto-assign every inbound lead in fair rotation.' },
                { href: '/resources/role-based-permissions', title: 'Permission Reference', desc: 'Full permission matrix for every role across every section.' },
              ].map(({ href, title, desc }) => (
                <Link key={href} href={href} className="rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] p-4 transition-colors group">
                  <p className="text-sm font-semibold text-white group-hover:text-brand-300 transition-colors mb-1">{title}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </Link>
              ))}
            </div>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-white/10 flex items-center justify-between flex-wrap gap-4">
          <Link href="/resources" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            ← Back to Resources
          </Link>
          <Link href="/settings/invite" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            Invite your team →
          </Link>
        </div>

      </div>
    </div>
  )
}
