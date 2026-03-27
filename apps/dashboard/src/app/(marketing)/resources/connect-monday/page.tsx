import Link from 'next/link'
import type { Metadata } from 'next'
import { ArticleSeo } from '@/components/marketing/article-seo'

export const metadata: Metadata = {
  title: 'Connect Monday.com to Appalix — AI Lead Capture Tutorial',
  description:
    'Auto-create Monday.com board items when your AI chatbot captures a lead. Get your Personal API Token, find your Board ID, and go live in under 5 minutes — no Zapier needed.',
  keywords: [
    'Monday.com Appalix integration',
    'AI chatbot Monday.com',
    'Monday.com lead capture',
    'Monday.com CRM integration',
    'Appalix Monday board',
    'Monday.com Personal API Token',
    'AI agent lead capture board',
    'Monday.com GraphQL API',
  ],
  alternates: { canonical: 'https://appalix.ai/resources/connect-monday' },
  openGraph: {
    title: 'Connect Monday.com to Appalix — AI Lead Capture Tutorial',
    description: 'Auto-create Monday.com board items when your AI chatbot captures a lead. Step-by-step guide.',
    url: 'https://appalix.ai/resources/connect-monday',
    type: 'article',
    siteName: 'Appalix',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Connect Monday.com to Appalix — AI Lead Capture Tutorial',
    description: 'Auto-create Monday.com board items when your AI chatbot captures a lead. Step-by-step guide.',
  },
}

export default function ConnectMondayPage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <ArticleSeo
        type="HowTo"
        title="How to Connect Monday.com to Appalix"
        description="Auto-create Monday.com board items when your AI chatbot captures a lead. Get your Personal API Token, find your Board ID, and go live in under 5 minutes."
        slug="connect-monday"
        datePublished="2026-03-01"
        steps={[
          { name: 'Get your Monday.com API Token', text: 'Click your profile avatar → Administration → API in the left sidebar, then generate and copy your Personal API Token.' },
          { name: 'Find your Board ID', text: 'Open your Monday.com board and copy the number after /boards/ in the URL bar — that is your Board ID.' },
          { name: 'Connect Monday.com in Appalix', text: 'In Appalix Integrations, click Edit, scroll to CRM integration, select Monday.com, paste your API token and Board ID, then save.' },
          { name: 'Test the integration', text: 'Send a test message with an email in your Appalix chat and verify a new item appears on your Monday.com board within seconds.' },
        ]}
      />
      <div className="max-w-3xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-white/60 mb-10">
          <Link href="/resources" className="hover:text-brand-400 transition-colors">Resources</Link>
          <span>/</span>
          <span className="text-white/65">Connect Monday.com to Appalix</span>
        </div>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-400 border border-brand-600/20 font-medium">Tutorial</span>
            <span className="text-xs text-white/60">6 min read · Pro+ plan</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            How to Connect Monday.com to Appalix
          </h1>
          <p className="text-white/65 text-lg leading-relaxed">
            When a visitor shares their email or phone number in your AI chat, Appalix instantly creates a new item on your Monday.com board — no Zapier, no manual entry. Your sales team sees the lead appear in real time.
          </p>
        </div>

        <div className="border-t border-white/10 mb-10" />

        <div className="prose prose-invert prose-brand max-w-none space-y-10 text-white/80">

          {/* What you'll need */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What you&apos;ll need</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>An <strong className="text-white">Appalix account</strong> on the Pro plan or above</li>
              <li>A <strong className="text-white">Monday.com account</strong> with access to the board you want leads sent to</li>
              <li>A <strong className="text-white">Monday.com Personal API Token</strong> (you&apos;ll generate this below)</li>
              <li>Your <strong className="text-white">Monday.com Board ID</strong> (visible in the board URL)</li>
            </ul>
          </section>

          {/* Step 1 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 1 — Get your Monday.com API Token</h2>
            <p>
              Monday.com uses Personal API Tokens to authenticate API requests. This token authorises Appalix to create items on your board.
            </p>
            <ol className="list-decimal pl-5 space-y-3 mt-4">
              <li>
                Log in to your Monday.com account at{' '}
                <a href="https://monday.com" target="_blank" rel="noreferrer" className="text-brand-400 hover:text-brand-300 underline">monday.com</a>.
              </li>
              <li>
                Click your <strong className="text-white">profile avatar</strong> in the top-right corner of the screen.
              </li>
              <li>
                Select <strong className="text-white">Administration</strong> from the dropdown menu.
              </li>
              <li>
                In the Administration panel, click <strong className="text-white">API</strong> in the left sidebar (under the &quot;Developers&quot; section).
              </li>
              <li>
                Click <strong className="text-white">Generate</strong> (or copy the existing token if one is already shown).
              </li>
              <li>
                Copy the token — it starts with <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">eyJhbGci…</code> — and keep it safe. You&apos;ll paste it into Appalix in Step 3.
              </li>
            </ol>
            <div className="mt-4 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-sm text-yellow-300">
              <strong>Keep this token private.</strong> Your Personal API Token has full access to your Monday.com account. Never paste it in a public document, share it in chat, or commit it to a repository.
            </div>
          </section>

          {/* Step 2 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 2 — Find your Board ID</h2>
            <p>
              Each Monday.com board has a unique numeric ID. Appalix needs this to know which board to add items to.
            </p>
            <ol className="list-decimal pl-5 space-y-3 mt-4">
              <li>
                Open the Monday.com board where you want Appalix leads to appear. This could be your <em>CRM</em> board, <em>Leads</em> board, or any board you prefer.
              </li>
              <li>
                Look at the URL in your browser&apos;s address bar. It will look something like:
                <div className="mt-2 px-4 py-3 bg-white/5 rounded-lg font-mono text-sm text-brand-300 break-all">
                  monday.com/boards/<strong>1234567890</strong>
                </div>
              </li>
              <li>
                The number after <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">/boards/</code> is your <strong className="text-white">Board ID</strong>. Copy it — you&apos;ll need it in the next step.
              </li>
            </ol>
            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white/65">
              <strong className="text-white">Tip:</strong> Create a dedicated <em>Appalix Leads</em> board in Monday.com so chat leads are kept separate from other work items. You can then set up Monday.com automations to notify your team, assign an owner, or move items through columns.
            </div>
          </section>

          {/* Step 3 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 3 — Connect Monday.com in Appalix</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>
                In Appalix, go to <strong className="text-white">Integrations</strong> in the left sidebar.
              </li>
              <li>
                Find the integration you want to connect to Monday.com — for example, your Web Widget, Slack integration, or WhatsApp — and click <strong className="text-white">Edit</strong>.
              </li>
              <li>
                Scroll down to the <strong className="text-white">CRM integration</strong> section.
              </li>
              <li>
                In the <strong className="text-white">CRM provider</strong> dropdown, select <strong className="text-white">Monday.com</strong>.
              </li>
              <li>
                Two fields appear:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong className="text-white">API token</strong> — paste the Personal API Token you copied in Step 1</li>
                  <li><strong className="text-white">Board ID</strong> — paste the board ID you found in Step 2</li>
                </ul>
              </li>
              <li>
                Click <strong className="text-white">Save changes</strong>.
              </li>
            </ol>
            <p className="mt-4">The integration is now live. Every lead your AI agent captures will create a new item on that board.</p>
          </section>

          {/* How it works */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">How it works</h2>
            <p>
              The moment a visitor shares contact information in the chat — for example:
            </p>
            <ul className="list-disc pl-5 mt-3 space-y-1">
              <li><em>&quot;My email is jane@acme.com&quot;</em></li>
              <li><em>&quot;Call me on +61 400 000 000&quot;</em></li>
              <li><em>&quot;Send the quote to mark@startup.io&quot;</em></li>
            </ul>
            <p className="mt-4">
              Appalix extracts the email or phone number and immediately calls the Monday.com GraphQL API to create a new board item. The item is named using the contact details (e.g. <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">jane@acme.com</code> or <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">jane@acme.com · +61 400 000 000</code>), so your team can see the lead at a glance.
            </p>
            <p className="mt-4">
              If your board has standard <strong className="text-white">Email</strong> and <strong className="text-white">Phone</strong> column types, Appalix will automatically populate those columns too — no extra configuration needed.
            </p>
          </section>

          {/* Step 4 - Test */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 4 — Test the integration</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>
                Open your Appalix integration&apos;s live chat (click <strong className="text-white">Preview</strong> on the integration card, or visit the page where your widget is embedded).
              </li>
              <li>
                Send a test message that includes an email address — for example: <em>&quot;Hi, my email is test@example.com&quot;</em>.
              </li>
              <li>
                Switch to your Monday.com board. Within a few seconds a new item should appear with the email address as its name.
              </li>
            </ol>
            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white/65">
              <strong className="text-white">Not seeing the item?</strong> Double-check that:
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>You&apos;re looking at the correct board (Board ID matches)</li>
                <li>Your API token is correct and hasn&apos;t been regenerated since you copied it</li>
                <li>The lead capture feature is enabled on your bot (Settings → Bot → Lead capture)</li>
              </ul>
            </div>
          </section>

          {/* Monday automations */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Next step — automate with Monday.com automations</h2>
            <p>
              Once leads are flowing into your board, set up Monday.com automations to take action immediately:
            </p>
            <ul className="list-disc pl-5 mt-3 space-y-2">
              <li>
                <strong className="text-white">Notify your team</strong> — send a Slack or email notification whenever a new item is created on the board.
              </li>
              <li>
                <strong className="text-white">Assign an owner</strong> — automatically assign a sales rep using round-robin or based on the item group.
              </li>
              <li>
                <strong className="text-white">Set a due date</strong> — add a follow-up due date so leads don&apos;t fall through the cracks.
              </li>
              <li>
                <strong className="text-white">Move to a pipeline group</strong> — automatically move the item to a <em>New Leads</em> group or specific pipeline stage.
              </li>
              <li>
                <strong className="text-white">Create a task</strong> — trigger a sub-item or linked task for initial outreach.
              </li>
            </ul>
            <p className="mt-4">
              To set up an automation: open your board → click <strong className="text-white">Automate</strong> in the top toolbar → choose <em>When an item is created, do this…</em>.
            </p>
          </section>

          {/* FAQ */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Frequently asked questions</h2>
            <div className="space-y-5">
              <div>
                <p className="font-semibold text-white">Can I send leads to multiple Monday.com boards?</p>
                <p className="text-sm text-white/65 mt-1">
                  Each Appalix integration (e.g. Web Widget, Slack, WhatsApp) can have its own CRM configuration, so you can point different integrations at different boards.
                </p>
              </div>
              <div>
                <p className="font-semibold text-white">Will duplicate leads create duplicate items?</p>
                <p className="text-sm text-white/65 mt-1">
                  Yes — Monday.com does not have native deduplication for items. If the same visitor shares their email twice, two items are created. Use a Monday.com automation or a Dedupe column to handle this.
                </p>
              </div>
              <div>
                <p className="font-semibold text-white">What Monday.com plan do I need?</p>
                <p className="text-sm text-white/65 mt-1">
                  The Monday.com API is available on all paid plans (Basic, Standard, Pro, Enterprise). Free accounts do not have API access.
                </p>
              </div>
              <div>
                <p className="font-semibold text-white">Can I use Zapier to connect Monday.com instead?</p>
                <p className="text-sm text-white/65 mt-1">
                  Yes — if you prefer, select <em>Zapier</em> in the CRM provider dropdown (available on Core plan and above), create a Zapier Catch Hook, and add a Monday.com action in Zapier to create items. The native integration is simpler and works out of the box on Pro+.
                </p>
              </div>
              <div>
                <p className="font-semibold text-white">My board uses custom column IDs — can Appalix populate them?</p>
                <p className="text-sm text-white/65 mt-1">
                  Appalix automatically tries to populate columns named <code className="bg-white/5 px-1 rounded">email</code> and <code className="bg-white/5 px-1 rounded">phone</code>. If your board uses different column IDs, the contact details will still appear in the item name. You can use a Monday.com automation to copy the name into a specific column.
                </p>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="rounded-2xl bg-brand-600/10 border border-brand-600/20 p-6 text-center mt-12">
            <p className="text-2xl mb-3">📋</p>
            <h3 className="text-lg font-semibold text-white mb-2">Ready to connect Monday.com?</h3>
            <p className="text-sm text-white/65 mb-5">
              Go to your Appalix integration, select Monday.com as your CRM, and paste your API token and board ID. Done in under 5 minutes.
            </p>
            <Link
              href="/integrations/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Go to Integrations →
            </Link>
          </section>

        </div>

        {/* Footer nav */}
        <div className="mt-16 pt-8 border-t border-white/10 flex items-center justify-between flex-wrap gap-4">
          <Link href="/resources" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            ← Back to Resources
          </Link>
          <Link href="/platforms" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            View all integrations →
          </Link>
        </div>

      </div>
    </div>
  )
}
