import Link from 'next/link'
import type { Metadata } from 'next'
import { ArticleSeo } from '@/components/marketing/article-seo'

export const metadata: Metadata = {
  title: 'Connect HubSpot CRM to Appalix — AI Lead Capture Tutorial',
  description:
    'Push AI chat leads directly into HubSpot CRM with no Zapier needed. Create a HubSpot Private App token and connect it to Appalix in under 2 minutes. Step-by-step guide.',
  keywords: [
    'HubSpot CRM integration',
    'Appalix HubSpot',
    'AI chatbot HubSpot lead capture',
    'HubSpot private app token',
    'chatbot CRM integration',
    'HubSpot contacts API',
    'AI lead capture CRM',
    'HubSpot no Zapier',
  ],
  alternates: { canonical: 'https://appalix.ai/resources/connect-hubspot' },
  openGraph: {
    title: 'Connect HubSpot CRM to Appalix — AI Lead Capture Tutorial',
    description: 'Push AI chat leads directly into HubSpot CRM with no Zapier needed. Step-by-step guide.',
    url: 'https://appalix.ai/resources/connect-hubspot',
    type: 'article',
    siteName: 'Appalix',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Connect HubSpot CRM to Appalix — AI Lead Capture Tutorial',
    description: 'Push AI chat leads directly into HubSpot CRM with no Zapier needed. Step-by-step guide.',
  },
}

export default function ConnectHubspotPage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <ArticleSeo
        type="HowTo"
        title="How to Connect HubSpot CRM to Appalix"
        description="Push AI chat leads directly into HubSpot CRM with no Zapier needed. Create a HubSpot Private App token and connect it to Appalix in under 2 minutes."
        slug="connect-hubspot"
        datePublished="2026-02-26"
        steps={[
          { name: 'Create a HubSpot Private App', text: 'Go to HubSpot Settings → Integrations → Private Apps, create a new app with crm.objects.contacts.write scope, and copy the pat- token.' },
          { name: 'Connect HubSpot in Appalix', text: 'In Appalix Integrations, click Edit on your integration, scroll to CRM integration, select HubSpot, and paste your Private App token.' },
          { name: 'Test the integration', text: 'Open your integration live chat, send a message with an email address, and verify the contact appears in HubSpot CRM → Contacts within seconds.' },
        ]}
      />
      <div className="max-w-3xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-white/60 mb-10">
          <Link href="/resources" className="hover:text-brand-400 transition-colors">Resources</Link>
          <span>/</span>
          <span className="text-white/65">Connect HubSpot to Appalix</span>
        </div>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-400 border border-brand-600/20 font-medium">Tutorial</span>
            <span className="text-xs text-white/60">8 min read · Pro+ plan</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            How to Connect HubSpot CRM to Appalix
          </h1>
          <p className="text-white/65 text-lg leading-relaxed">
            With Appalix&apos;s native HubSpot integration, every lead your AI agent captures — an email address or phone number shared mid-conversation — is automatically created as a contact in HubSpot. No Zapier, no middleware, no code.
          </p>
        </div>

        <div className="border-t border-white/10 mb-10" />

        <div className="prose prose-invert prose-brand max-w-none space-y-10 text-white/80">

          {/* What you'll need */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What you&apos;ll need</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>An <strong className="text-white">Appalix account</strong> on the Pro plan or above</li>
              <li>A <strong className="text-white">HubSpot account</strong> — the free CRM tier works fine</li>
              <li>A <strong className="text-white">HubSpot Private App token</strong> with contacts write permission (you&apos;ll create this below)</li>
            </ul>
          </section>

          {/* Step 1 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 1 — Create a HubSpot Private App</h2>
            <p>
              HubSpot uses Private Apps to grant API access. This gives Appalix a secure token to create contacts on your behalf.
            </p>
            <ol className="list-decimal pl-5 space-y-3 mt-4">
              <li>
                Log in to your HubSpot account and click the <strong className="text-white">Settings</strong> icon (gear) in the top navigation bar.
              </li>
              <li>
                In the left sidebar, navigate to <strong className="text-white">Integrations → Private Apps</strong>.
              </li>
              <li>
                Click <strong className="text-white">Create a private app</strong>.
              </li>
              <li>
                Give the app a name — something like <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">Appalix Lead Capture</code> — and add a description if you like.
              </li>
              <li>
                Switch to the <strong className="text-white">Scopes</strong> tab. Search for <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">crm.objects.contacts.write</code> and tick it.
              </li>
              <li>
                Click <strong className="text-white">Create app</strong> in the top right. Confirm the dialog.
              </li>
              <li>
                You&apos;ll see a token that starts with <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">pat-</code>. Click <strong className="text-white">Copy</strong> and keep it safe — you&apos;ll paste it into Appalix next.
              </li>
            </ol>
            <div className="mt-4 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-sm text-yellow-300">
              <strong>Keep this token private.</strong> Anyone with this token can create contacts in your HubSpot account. Never share it publicly or commit it to a repository.
            </div>
          </section>

          {/* Step 2 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 2 — Connect HubSpot in Appalix</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>
                In Appalix, go to <strong className="text-white">Integrations</strong> in the left sidebar.
              </li>
              <li>
                Find the integration you want to connect to HubSpot (e.g. your Web Widget or Slack integration) and click <strong className="text-white">Edit</strong>.
              </li>
              <li>
                Scroll down to the <strong className="text-white">CRM integration</strong> section.
              </li>
              <li>
                In the <strong className="text-white">CRM provider</strong> dropdown, select <strong className="text-white">HubSpot</strong>.
              </li>
              <li>
                A <strong className="text-white">Private App token</strong> field will appear. Paste the <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">pat-…</code> token you copied from HubSpot.
              </li>
              <li>
                Click <strong className="text-white">Save changes</strong>.
              </li>
            </ol>
            <p className="mt-4">That&apos;s it. The integration is live.</p>
          </section>

          {/* How it works */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">How it works</h2>
            <p>
              Once connected, every time a visitor shares contact information in the chat — for example:
            </p>
            <ul className="list-disc pl-5 mt-3 space-y-1">
              <li><em>&quot;My email is john@acme.com&quot;</em></li>
              <li><em>&quot;You can call me on +44 7911 123456&quot;</em></li>
              <li><em>&quot;Send it to sarah@startup.io&quot;</em></li>
            </ul>
            <p className="mt-4">
              Appalix automatically extracts the email or phone number and sends it to HubSpot via the Contacts API. The contact is created with:
            </p>
            <ul className="list-disc pl-5 mt-3 space-y-1">
              <li><strong className="text-white">Email</strong> — the address extracted from the conversation</li>
              <li><strong className="text-white">Phone</strong> — if a phone number was shared</li>
              <li><strong className="text-white">Lifecycle stage</strong> — set to <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">lead</code></li>
              <li><strong className="text-white">Lead source</strong> — set to <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">Appalix Chat</code></li>
            </ul>
            <p className="mt-4">
              If a contact with that email already exists in HubSpot, it will be updated rather than duplicated.
            </p>
          </section>

          {/* Step 3 - Testing */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 3 — Test the integration</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>
                Open your Appalix integration&apos;s live chat (click <strong className="text-white">Preview</strong> on the integration card, or visit the page where your widget is embedded).
              </li>
              <li>
                Send a message that includes an email address — for example: <em>&quot;Hi, my email is test@example.com&quot;</em>.
              </li>
              <li>
                In HubSpot, go to <strong className="text-white">CRM → Contacts</strong> and search for the email address. You should see the new contact appear within a few seconds.
              </li>
            </ol>
            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white/65">
              <strong className="text-white">Tip:</strong> If the contact doesn&apos;t appear, check that your Private App token has the <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">crm.objects.contacts.write</code> scope. You can view the scopes on the Private Apps page in HubSpot Settings.
            </div>
          </section>

          {/* HubSpot workflows */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Next step — automate with HubSpot Workflows</h2>
            <p>
              Once leads are flowing into HubSpot, you can set up automated workflows to take action on them:
            </p>
            <ul className="list-disc pl-5 mt-3 space-y-2">
              <li><strong className="text-white">Enrol into a sequence</strong> — automatically start a nurture email sequence when a new lead source is <em>Appalix Chat</em></li>
              <li><strong className="text-white">Assign to a sales rep</strong> — round-robin or territory-based assignment</li>
              <li><strong className="text-white">Create a deal</strong> — automatically create a deal in the pipeline for high-intent leads</li>
              <li><strong className="text-white">Send an internal notification</strong> — alert your team via Slack or email when a hot lead comes in</li>
            </ul>
            <p className="mt-4">
              Go to <strong className="text-white">Automation → Workflows → Create workflow → Start from scratch</strong>, choose <em>Contact-based</em>, and set the enrolment trigger to <em>Lead source is Appalix Chat</em>.
            </p>
          </section>

          {/* FAQ */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Frequently asked questions</h2>

            <div className="space-y-5">
              <div>
                <p className="font-semibold text-white">Will existing HubSpot contacts be duplicated?</p>
                <p className="text-sm text-white/65 mt-1">No. Appalix uses HubSpot&apos;s upsert API, which updates an existing contact if the email already exists rather than creating a duplicate.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Does this work with all Appalix integration types?</p>
                <p className="text-sm text-white/65 mt-1">Yes — CRM integration is available for every integration type (Web Widget, Slack, WhatsApp, Facebook Messenger, WordPress, and Custom API).</p>
              </div>
              <div>
                <p className="font-semibold text-white">What HubSpot plan do I need?</p>
                <p className="text-sm text-white/65 mt-1">The free HubSpot CRM supports Private Apps and the Contacts API, so any plan (including free) works.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Can I use Zapier with HubSpot instead?</p>
                <p className="text-sm text-white/65 mt-1">Yes — the Zapier webhook option is available on Core plan and above. Select <em>Zapier</em> in the CRM provider dropdown and paste your Zapier Catch Hook URL, then add a HubSpot action in Zapier.</p>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="rounded-2xl bg-brand-600/10 border border-brand-600/20 p-6 text-center mt-12">
            <p className="text-2xl mb-3">🟠</p>
            <h3 className="text-lg font-semibold text-white mb-2">Ready to connect HubSpot?</h3>
            <p className="text-sm text-white/65 mb-5">
              Open your Appalix integrations dashboard and add your HubSpot token in under 2 minutes.
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
