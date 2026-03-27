import Link from 'next/link'
import type { Metadata } from 'next'
import { ArticleSeo } from '@/components/marketing/article-seo'

export const metadata: Metadata = {
  title: 'Connect Constant Contact to Appalix — Sync Contacts to Your Email List',
  description:
    'Connect Constant Contact to Appalix Sage in under 5 minutes. Sync CRM contacts to your Constant Contact lists automatically as deals progress through your pipeline.',
  keywords: [
    'Constant Contact Appalix integration',
    'Constant Contact CRM sync',
    'Appalix Constant Contact tutorial',
    'email list sync CRM',
    'Constant Contact API',
  ],
  alternates: { canonical: 'https://appalix.ai/resources/connect-constantcontact' },
  openGraph: {
    title: 'Connect Constant Contact to Appalix — Sync Contacts to Your Email List',
    description: 'Sync Appalix Sage CRM contacts to Constant Contact lists automatically.',
    url: 'https://appalix.ai/resources/connect-constantcontact',
    type: 'article',
    siteName: 'Appalix',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Connect Constant Contact to Appalix — Sync Contacts to Your Email List',
    description: 'Sync Appalix Sage CRM contacts to Constant Contact lists automatically.',
  },
}

export default function ConnectConstantContactPage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <ArticleSeo
        type="HowTo"
        title="Connect Constant Contact to Appalix"
        description="Connect Constant Contact to Appalix Sage. Sync CRM contacts to your contact lists automatically as deals progress through your pipeline."
        slug="connect-constantcontact"
        datePublished="2026-03-04"
        steps={[
          { name: 'Get your Constant Contact API key', text: 'Register an application in the Constant Contact developer portal to obtain your API key.' },
          { name: 'Generate an OAuth access token', text: 'Use the Constant Contact developer portal to generate an OAuth access token with contacts_rw and lists_read permissions.' },
          { name: 'Find your List ID', text: 'In Constant Contact, go to Contacts → Lists, open your target list, and copy the List ID from the URL or list settings.' },
          { name: 'Connect in Sage → Integrations', text: 'In Appalix, go to Sage → Integrations → Email Marketing, find the Constant Contact card, click Connect, and paste your API Key, Access Token, and List ID.' },
        ]}
      />

      <div className="max-w-3xl mx-auto">

        <div className="flex items-center gap-2 text-sm text-white/60 mb-10">
          <Link href="/resources" className="hover:text-brand-400 transition-colors">Resources</Link>
          <span>/</span>
          <span className="text-white/65">Connect Constant Contact</span>
        </div>

        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-400 border border-brand-600/20 font-medium">Tutorial</span>
            <span className="text-xs text-white/60">7 min read · Pro+ plan</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            Connect Constant Contact to Appalix
          </h1>
          <p className="text-white/65 text-lg leading-relaxed">
            Constant Contact is a popular email marketing platform for small businesses. Connecting it to Appalix
            Sage means contacts you add to your CRM are automatically added to your Constant Contact list —
            keeping your email marketing audience perfectly in sync with your sales pipeline.
          </p>
        </div>

        <div className="border-t border-white/10 mb-10" />

        <div className="prose prose-invert prose-brand max-w-none space-y-10 text-white/80">

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What you&apos;ll need</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>An <strong className="text-white">Appalix account</strong> on Pro plan or above</li>
              <li>A <strong className="text-white">Constant Contact account</strong></li>
              <li>A Constant Contact <strong className="text-white">API Key</strong>, <strong className="text-white">OAuth Access Token</strong>, and <strong className="text-white">List ID</strong></li>
            </ul>
            <div className="mt-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm text-blue-300">
              <strong>Note:</strong> Constant Contact uses OAuth 2.0. Unlike some other platforms, you need to register an application in their developer portal to obtain an API key, even for personal use. This is a one-time step.
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 1 — Get your API Key from the developer portal</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>
                Go to <strong className="text-white">developer.constantcontact.com</strong> and sign in with your Constant Contact credentials.
              </li>
              <li>Click <strong className="text-white">My Applications → New Application</strong>.</li>
              <li>Give it a name (e.g. &quot;Appalix Sync&quot;), add a redirect URI of <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">https://appalix.ai</code>, and save.</li>
              <li>Copy the <strong className="text-white">API Key</strong> shown in your application settings.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 2 — Generate an OAuth Access Token</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>
                In the Constant Contact developer portal, go to your application and look for the <strong className="text-white">Generate Access Token</strong> or <strong className="text-white">Token Tool</strong> option.
              </li>
              <li>
                Select the following scopes:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">contact_data</code> — read and write contacts</li>
                  <li><code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">list_data</code> — read contact lists</li>
                </ul>
              </li>
              <li>Authorise the application with your Constant Contact account credentials.</li>
              <li>Copy the <strong className="text-white">Access Token</strong> that is generated.</li>
            </ol>
            <div className="mt-4 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-sm text-yellow-300">
              <strong>Token expiry:</strong> Constant Contact access tokens can expire. If the integration stops syncing, re-generate your token in the developer portal and update it in Sage → Integrations → Constant Contact.
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 3 — Find your List ID</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Log in to <strong className="text-white">Constant Contact</strong> and go to <strong className="text-white">Contacts → Lists</strong>.</li>
              <li>Click on the list you want to sync contacts into.</li>
              <li>The List ID appears in the page URL after <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">/lists/</code>, or in the list settings panel.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 4 — Connect in Sage → Integrations</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>In Appalix, navigate to <strong className="text-white">Sage → Integrations</strong> in the left sidebar.</li>
              <li>Scroll to the <strong className="text-white">Email Marketing</strong> section and find the <strong className="text-white">Constant Contact</strong> card.</li>
              <li>Click <strong className="text-white">Connect</strong> and fill in your <strong className="text-white">API Key</strong>, <strong className="text-white">Access Token</strong>, and <strong className="text-white">List ID</strong>.</li>
              <li>Click <strong className="text-white">Save &amp; Connect</strong>. The card shows a green <em>Connected</em> badge.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What the integration does</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-white">Contact sync</strong> — contacts created or updated in Sage are added to your specified Constant Contact list.</li>
              <li><strong className="text-white">Data mapped</strong> — name, email, and phone number are synced. Additional fields follow Constant Contact&apos;s contact model.</li>
            </ul>
            <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-300">
              <strong>Forms sync:</strong> Constant Contact is not currently supported in the Forms → Sources pull sync. To import Constant Contact contacts into Appalix leads, export contacts from Constant Contact or use their webhook integrations.
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Frequently asked questions</h2>
            <div className="space-y-5">
              <div>
                <p className="font-semibold text-white">Why do I need an API key AND an access token?</p>
                <p className="text-sm text-white/65 mt-1">Constant Contact&apos;s V3 API uses OAuth 2.0, which requires both: the API key identifies your registered application, and the access token authenticates your Constant Contact account. Both are needed together for API calls to succeed.</p>
              </div>
              <div>
                <p className="font-semibold text-white">What happens if my access token expires?</p>
                <p className="text-sm text-white/65 mt-1">Syncing will stop. To fix it, go to the Constant Contact developer portal, generate a new access token, and update it in Sage → Integrations → Constant Contact by clicking Disconnect and then reconnecting with the new token.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Are my credentials stored securely?</p>
                <p className="text-sm text-white/65 mt-1">Yes. Your API key and access token are stored encrypted in your workspace database and never shown in plain text after saving.</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-brand-600/10 border border-brand-600/20 p-6 text-center">
            <p className="text-2xl mb-3">📬</p>
            <h3 className="text-lg font-semibold text-white mb-2">Ready to connect Constant Contact?</h3>
            <p className="text-sm text-white/65 mb-5">
              Go to Sage → Integrations → Email Marketing and paste your API key, access token, and list ID.
            </p>
            <Link
              href="/sage/integrations"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Go to Sage → Integrations →
            </Link>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-white/10 flex items-center justify-between flex-wrap gap-4">
          <Link href="/resources/connect-klaviyo" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            ← Connect Klaviyo
          </Link>
          <Link href="/resources" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            Back to Resources →
          </Link>
        </div>

      </div>
    </div>
  )
}
