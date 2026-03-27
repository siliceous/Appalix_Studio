import Link from 'next/link'
import type { Metadata } from 'next'
import { ArticleSeo } from '@/components/marketing/article-seo'

export const metadata: Metadata = {
  title: 'Connect Intercom to Appalix — AI Chat Lead Capture Tutorial',
  description:
    'Create Intercom leads automatically when visitors share contact details in your AI chat. Get an Intercom Access Token from the Developer Hub in under 5 minutes. Step-by-step guide.',
  keywords: [
    'Intercom Appalix integration',
    'AI chatbot Intercom lead capture',
    'Intercom access token API',
    'chatbot CRM automation',
    'Intercom lead creation API',
    'Intercom Developer Hub token',
    'AI agent Intercom contacts',
    'Intercom lead automation',
  ],
  alternates: { canonical: 'https://appalix.ai/resources/connect-intercom' },
  openGraph: {
    title: 'Connect Intercom to Appalix — AI Chat Lead Capture Tutorial',
    description: 'Create Intercom leads automatically when visitors share contact details in your AI chat. Step-by-step.',
    url: 'https://appalix.ai/resources/connect-intercom',
    type: 'article',
    siteName: 'Appalix',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Connect Intercom to Appalix — AI Chat Lead Capture Tutorial',
    description: 'Create Intercom leads automatically when visitors share contact details in your AI chat. Step-by-step.',
  },
}

export default function ConnectIntercomPage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <ArticleSeo
        type="HowTo"
        title="How to Connect Intercom to Appalix"
        description="Create Intercom leads automatically when visitors share contact details in your AI chat. Get an Intercom Access Token from the Developer Hub in under 5 minutes."
        slug="connect-intercom"
        datePublished="2026-02-26"
        steps={[
          { name: 'Get your Intercom Access Token', text: 'Go to Intercom Settings → Developer Hub, create a new app named Appalix Lead Capture, then copy the Access Token from the Authentication section.' },
          { name: 'Connect Intercom in Appalix', text: 'In Appalix Integrations, click Edit, scroll to CRM integration, select Intercom, paste your Access Token, then save changes.' },
          { name: 'Test the connection', text: 'Open your Appalix integration preview, type a message with an email address, and verify the new lead appears in Intercom Contacts → Leads.' },
        ]}
      />
      <div className="max-w-3xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-white/60 mb-10">
          <Link href="/resources" className="hover:text-brand-400 transition-colors">Resources</Link>
          <span>/</span>
          <span className="text-white/65">Connect Intercom to Appalix</span>
        </div>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-400 border border-brand-600/20 font-medium">Tutorial</span>
            <span className="text-xs text-white/60">7 min read · Pro+ plan</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            How to Connect Intercom to Appalix
          </h1>
          <p className="text-white/65 text-lg leading-relaxed">
            Appalix can create leads directly in your Intercom workspace the moment a visitor shares their email or phone number in chat. Contacts appear in your Intercom inbox automatically — ready for follow-up. All you need is an Intercom Access Token.
          </p>
        </div>

        <div className="border-t border-white/10 mb-10" />

        <div className="prose prose-invert prose-brand max-w-none space-y-10 text-white/80">

          {/* What you'll need */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What you&apos;ll need</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>An <strong className="text-white">Appalix account</strong> on the Pro plan or above</li>
              <li>An <strong className="text-white">Intercom account</strong> — any paid Intercom plan</li>
              <li>An <strong className="text-white">Intercom Access Token</strong> (you&apos;ll create this below)</li>
            </ul>
          </section>

          {/* Step 1 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 1 — Get your Intercom Access Token</h2>
            <p>
              Intercom uses developer apps to provide API access. You&apos;ll create a developer app and copy the access token from it.
            </p>
            <ol className="list-decimal pl-5 space-y-3 mt-4">
              <li>
                Log in to your Intercom account and go to <strong className="text-white">Settings</strong> (click your avatar in the bottom left → Settings).
              </li>
              <li>
                In the left sidebar, scroll down to <strong className="text-white">Developer Hub</strong> and click it. This opens the Intercom Developer Hub.
              </li>
              <li>
                Click <strong className="text-white">New app</strong> in the top right.
              </li>
              <li>
                Give it a name (e.g. <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">Appalix Lead Capture</code>), select your <strong className="text-white">workspace</strong>, and click <strong className="text-white">Create app</strong>.
              </li>
              <li>
                In the left sidebar of your new app, click <strong className="text-white">Authentication</strong>.
              </li>
              <li>
                Under <em>Access Token</em>, you&apos;ll see a long token starting with <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">dG9rOj…</code> (Base64-encoded). Click <strong className="text-white">Copy</strong>.
              </li>
            </ol>
            <div className="mt-4 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-sm text-yellow-300">
              <strong>Keep this token private.</strong> Anyone with this token has full API access to your Intercom workspace. Store it securely and never share it publicly.
            </div>
          </section>

          {/* Step 2 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 2 — Connect Intercom in Appalix</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>
                In Appalix, navigate to <strong className="text-white">Integrations</strong> in the sidebar.
              </li>
              <li>
                Find the integration you want to connect and click <strong className="text-white">Edit</strong>.
              </li>
              <li>
                Scroll down to the <strong className="text-white">CRM integration</strong> section.
              </li>
              <li>
                In the <strong className="text-white">CRM provider</strong> dropdown, select <strong className="text-white">Intercom</strong>.
              </li>
              <li>
                Paste your Intercom Access Token in the <strong className="text-white">Access token</strong> field that appears.
              </li>
              <li>
                Click <strong className="text-white">Save changes</strong>.
              </li>
            </ol>
          </section>

          {/* How it works */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What gets created in Intercom</h2>
            <p>
              When a visitor shares their email or phone in chat, Appalix creates an Intercom <strong className="text-white">lead</strong> (anonymous contact) with the following data:
            </p>
            <ul className="list-disc pl-5 mt-3 space-y-1">
              <li><strong className="text-white">Role</strong> — set to <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">lead</code></li>
              <li><strong className="text-white">Email</strong> — the email address shared in chat</li>
              <li><strong className="text-white">Phone</strong> — the phone number shared in chat (if any)</li>
            </ul>
            <p className="mt-4">
              The lead appears in your Intercom <strong className="text-white">Contacts</strong> list under the <em>Leads</em> tab. From there, your team can convert the lead to a user, start a conversation, or enrol them in a series.
            </p>
          </section>

          {/* Step 3 - Testing */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 3 — Test the connection</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>
                Open your Appalix integration preview (or visit the live widget on your site).
              </li>
              <li>
                Type a message containing an email address: <em>&quot;You can reach me at demo@example.com&quot;</em>.
              </li>
              <li>
                In Intercom, go to <strong className="text-white">Contacts → Leads</strong>. Sort by <em>Last seen</em> and you should see the new lead appear within seconds.
              </li>
            </ol>
            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white/65">
              <strong className="text-white">Tip:</strong> If the lead doesn&apos;t appear, verify that your Access Token is from the correct Intercom workspace. Tokens are workspace-specific — a token from one workspace won&apos;t work in another.
            </div>
          </section>

          {/* Intercom next steps */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What to do with leads in Intercom</h2>
            <p>Once leads are flowing in, you can:</p>
            <ul className="list-disc pl-5 mt-3 space-y-2">
              <li><strong className="text-white">Start a conversation</strong> — open the lead record and send an outbound message directly from Intercom</li>
              <li><strong className="text-white">Convert to a user</strong> — when the lead provides more information or signs up, merge to a full user record</li>
              <li><strong className="text-white">Enrol in a Series</strong> — add the lead to an automated email or in-app message sequence</li>
              <li><strong className="text-white">Assign to a teammate</strong> — use Intercom&apos;s assignment rules to route leads to the right sales rep automatically</li>
            </ul>
          </section>

          {/* FAQ */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Frequently asked questions</h2>

            <div className="space-y-5">
              <div>
                <p className="font-semibold text-white">What Intercom plan do I need?</p>
                <p className="text-sm text-white/65 mt-1">Any paid Intercom plan that includes the Contacts API. The Starter plan and above supports this. Check your Intercom billing page to confirm API access is included.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Will duplicate leads be created if the same email is captured twice?</p>
                <p className="text-sm text-white/65 mt-1">Intercom&apos;s API will create a new lead for each request. To avoid duplicates, consider using an Intercom workflow to merge contacts with the same email address.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Can I use Zapier with Intercom instead?</p>
                <p className="text-sm text-white/65 mt-1">Yes — the Zapier webhook option is available on Core plan. Select <em>Zapier</em> in the CRM provider dropdown, paste your Zapier Catch Hook URL, then add an Intercom action in Zapier.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Is the Access Token permanent?</p>
                <p className="text-sm text-white/65 mt-1">Yes — Access Tokens for Intercom developer apps don&apos;t expire unless you manually revoke them in the Developer Hub. If you rotate the token, update it in Appalix immediately.</p>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="rounded-2xl bg-brand-600/10 border border-brand-600/20 p-6 text-center mt-12">
            <p className="text-2xl mb-3">💬</p>
            <h3 className="text-lg font-semibold text-white mb-2">Ready to connect Intercom?</h3>
            <p className="text-sm text-white/65 mb-5">
              Add your Intercom Access Token in Appalix and start capturing leads automatically.
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
