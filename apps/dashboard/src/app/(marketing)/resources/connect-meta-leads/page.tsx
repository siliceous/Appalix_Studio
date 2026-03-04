import Link from 'next/link'
import type { Metadata } from 'next'
import { ArticleSeo } from '@/components/marketing/article-seo'

export const metadata: Metadata = {
  title: 'Connect Meta Lead Ads to Appalix — Step-by-Step Tutorial',
  description:
    'Automatically receive Facebook and Instagram lead ad submissions inside Appalix. Set up a Meta webhook in 5 steps — no Zapier, no third-party tools required.',
  keywords: [
    'Meta lead ads Appalix',
    'Facebook lead ads webhook',
    'Instagram lead ads CRM',
    'Meta lead form webhook integration',
    'capture Facebook leads automatically',
    'Appalix Forms Meta integration',
    'lead generation Meta ads',
  ],
  alternates: { canonical: 'https://appalix.ai/resources/connect-meta-leads' },
  openGraph: {
    title: 'Connect Meta Lead Ads to Appalix — Step-by-Step Tutorial',
    description: 'Automatically receive Facebook and Instagram lead ad submissions inside Appalix. Step-by-step guide.',
    url: 'https://appalix.ai/resources/connect-meta-leads',
    type: 'article',
    siteName: 'Appalix',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Connect Meta Lead Ads to Appalix — Step-by-Step Tutorial',
    description: 'Automatically receive Facebook and Instagram lead ad submissions inside Appalix. Step-by-step guide.',
  },
}

export default function ConnectMetaLeadsPage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <ArticleSeo
        type="HowTo"
        title="Connect Meta Lead Ads to Appalix"
        description="Automatically receive Facebook and Instagram lead ad submissions inside Appalix. Set up a Meta webhook in 5 steps — no Zapier, no third-party tools required."
        slug="connect-meta-leads"
        datePublished="2026-03-04"
        steps={[
          { name: 'Get your webhook URL from Appalix', text: 'In Appalix, go to Forms → Sources, click Connect on the Meta card, and copy your unique webhook URL and verify token.' },
          { name: 'Create a Meta App in the Developer Console', text: 'Go to developers.facebook.com, create a new Business app, add the Facebook Login and Leadgen products, and connect your Facebook Page.' },
          { name: 'Configure the webhook in Meta', text: 'In your Meta App, go to Webhooks → Page subscription. Paste your Appalix webhook URL and verify token, then subscribe to the leadgen field.' },
          { name: 'Add your credentials to Appalix', text: 'In Appalix Forms → Sources, paste your App Secret and Page Access Token into the Meta card fields, then click Save & Connect.' },
          { name: 'Submit a test lead and verify', text: 'Use the Meta Lead Ads Testing Tool to send a test submission. It should appear in Appalix Forms → All Leads within seconds.' },
        ]}
      />

      <div className="max-w-3xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-10">
          <Link href="/resources" className="hover:text-brand-400 transition-colors">Resources</Link>
          <span>/</span>
          <span className="text-gray-400">Connect Meta Lead Ads</span>
        </div>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-400 border border-brand-600/20 font-medium">Tutorial</span>
            <span className="text-xs text-gray-500">10 min read · Pro+ plan</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            Connect Meta Lead Ads to Appalix
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Meta Lead Ads let people fill in your form without leaving Facebook or Instagram.
            With this integration, every submission is instantly delivered to Appalix — automatically scored,
            deduplicated, and ready to move into your CRM pipeline with one click.
            No Zapier, no polling, no third-party tools.
          </p>
        </div>

        <div className="border-t border-white/10 mb-10" />

        <div className="prose prose-invert prose-brand max-w-none space-y-10 text-gray-300">

          {/* What you need */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What you&apos;ll need</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>An <strong className="text-white">Appalix account</strong> on the Pro plan or above</li>
              <li>A <strong className="text-white">Meta Business account</strong> with at least one Facebook Page</li>
              <li>At least one <strong className="text-white">Meta Lead Ad</strong> created on your Page or a connected Instagram account</li>
              <li>Access to <strong className="text-white">Meta for Developers</strong> (developers.facebook.com) — free to join</li>
            </ul>
          </section>

          {/* How it works */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">How it works</h2>
            <p>
              Meta Lead Ads use a native webhook integration. When a user submits your lead form on Facebook or Instagram,
              Meta sends the <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">leadgen_id</code> to your webhook URL.
              Appalix receives it, uses your stored <strong className="text-white">Page Access Token</strong> to fetch the full lead details
              (name, email, phone, and any custom questions) from the Meta Graph API, then normalises the fields, scores the lead,
              and stores it in your Forms dashboard.
            </p>
            <p className="mt-3">
              There are three credentials involved: a <strong className="text-white">verify token</strong> (for webhook setup),
              an <strong className="text-white">app secret</strong> (for request signature validation), and
              a <strong className="text-white">page access token</strong> (for fetching lead data). All three are stored encrypted in Appalix.
            </p>
          </section>

          {/* Step 1 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 1 — Get your webhook URL and verify token from Appalix</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Log in to <strong className="text-white">Appalix</strong> and navigate to <strong className="text-white">Forms → Sources</strong> in the left sidebar.</li>
              <li>Find the <strong className="text-white">Meta</strong> card and click <strong className="text-white">Connect</strong>.</li>
              <li>
                Your unique webhook URL is shown at the top of the form — it looks like:<br />
                <code className="bg-white/10 px-2 py-1 rounded text-brand-300 text-sm block mt-2 break-all">
                  https://appalix.ai/api/webhooks/meta-leads/YOUR_WORKSPACE_ID
                </code>
              </li>
              <li>Below the URL you&apos;ll see a <strong className="text-white">Verify Token</strong> field. Enter any string you like — for example <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">appalix-meta-2026</code>. Note it down — you&apos;ll paste this same value into Meta in Step 2.</li>
              <li>Keep this tab open. You&apos;ll return to it in Step 4.</li>
            </ol>
          </section>

          {/* Step 2 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 2 — Create a Meta App and configure the webhook</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>
                Go to <strong className="text-white">developers.facebook.com</strong> and click <strong className="text-white">My Apps → Create App</strong>.
              </li>
              <li>
                Select <strong className="text-white">Business</strong> as the app type, give it a name (e.g. &quot;Appalix Lead Sync&quot;), and click <strong className="text-white">Create app</strong>.
              </li>
              <li>
                On the App Dashboard, find <strong className="text-white">Webhooks</strong> in the left menu and click <strong className="text-white">Set up</strong>.
              </li>
              <li>
                Under <strong className="text-white">Page subscription</strong>, click <strong className="text-white">Subscribe to this object</strong>, then fill in:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>Callback URL</strong> — paste your Appalix webhook URL from Step 1</li>
                  <li><strong>Verify token</strong> — paste the verify token you chose in Step 1</li>
                </ul>
              </li>
              <li>Click <strong className="text-white">Verify and save</strong>. Meta will call your webhook URL to confirm it returns the challenge. If it succeeds, you&apos;ll see a green checkmark.</li>
              <li>
                After saving, find the <strong className="text-white">leadgen</strong> field in the subscription list and toggle it <strong className="text-white">on</strong>.
              </li>
            </ol>
            <div className="mt-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm text-blue-300">
              <strong>Can&apos;t find Webhooks?</strong> Make sure you have added the <strong>Facebook Login</strong> product to your app first. Go to <strong>Add a product</strong> on the dashboard and add Facebook Login — Webhooks will then appear in the left sidebar.
            </div>
          </section>

          {/* Step 3 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 3 — Connect your Facebook Page to the app</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>In the left sidebar of your Meta App, go to <strong className="text-white">Facebook Login → Settings</strong>.</li>
              <li>
                Under <strong className="text-white">Valid OAuth Redirect URIs</strong>, add your Appalix domain (<code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">https://appalix.ai</code>) and save.
              </li>
              <li>
                Now go to <strong className="text-white">Graph API Explorer</strong> (top-right menu → Tools → Graph API Explorer).
              </li>
              <li>
                In the Graph API Explorer:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Select your app from the <strong>Application</strong> dropdown</li>
                  <li>Click <strong>Generate Access Token</strong> and log in with the Facebook account that manages your Page</li>
                  <li>Grant the <strong>pages_manage_metadata</strong>, <strong>pages_read_engagement</strong>, and <strong>leads_retrieval</strong> permissions</li>
                </ul>
              </li>
              <li>
                You&apos;ll receive a short-lived <strong className="text-white">User Access Token</strong>. Exchange it for a <strong className="text-white">Page Access Token</strong>:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>In the Graph API Explorer, run: <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">GET /me/accounts</code></li>
                  <li>Find your Page in the response and copy the <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">access_token</code> value — this is your Page Access Token</li>
                </ul>
              </li>
            </ol>
            <div className="mt-4 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-sm text-yellow-300">
              <strong>Use a long-lived token.</strong> Short-lived tokens expire in 1 hour. To get a 60-day token, exchange your short-lived User Access Token at:
              <code className="block mt-2 bg-yellow-500/10 px-2 py-1 rounded break-all">
                GET https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&fb_exchange_token=SHORT_LIVED_TOKEN
              </code>
              Then call <code className="bg-yellow-500/10 px-1 rounded">/me/accounts</code> again with the long-lived user token to get your long-lived Page Access Token.
            </div>
          </section>

          {/* Step 4 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 4 — Paste credentials into Appalix</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Return to the <strong className="text-white">Appalix Forms → Sources</strong> tab you kept open.</li>
              <li>
                Fill in the three fields on the Meta card:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>Verify Token</strong> — the string you chose in Step 1</li>
                  <li><strong>App Secret</strong> — found in your Meta App under <strong>Settings → Basic</strong>, click the eye icon next to App Secret</li>
                  <li><strong>Page Access Token</strong> — the long-lived token from Step 3</li>
                </ul>
              </li>
              <li>Click <strong className="text-white">Save &amp; Connect</strong>. The Meta card will show a green <em>Connected</em> badge.</li>
            </ol>
          </section>

          {/* Step 5 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 5 — Send a test lead and verify</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>
                Go to the <strong className="text-white">Meta Lead Ads Testing Tool</strong> at{' '}
                <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">developers.facebook.com/tools/lead-ads-testing</code>.
              </li>
              <li>Select your Page and lead form, then click <strong className="text-white">Preview form</strong> and submit it with test data.</li>
              <li>
                Go to <strong className="text-white">Forms → All Leads</strong> in Appalix. You should see the test lead appear within seconds with a{' '}
                <strong className="text-white">Meta Ads</strong> platform badge.
              </li>
              <li>
                If the lead doesn&apos;t appear, check:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>The Meta App webhook is verified (green checkmark in Webhooks → Page subscription)</li>
                  <li>The <code className="bg-white/10 px-1 rounded">leadgen</code> field is subscribed (toggle on)</li>
                  <li>The App Secret and Page Access Token in Appalix are correct</li>
                  <li>The Page Access Token has the <code className="bg-white/10 px-1 rounded">leads_retrieval</code> permission</li>
                </ul>
              </li>
            </ol>
          </section>

          {/* After connection */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What happens after a lead submits</h2>
            <ul className="list-disc pl-5 space-y-3">
              <li><strong className="text-white">Instant delivery</strong> — Appalix receives the lead within seconds of the Meta form submission.</li>
              <li><strong className="text-white">Full field data</strong> — Appalix fetches name, email, phone, company, job title, and all custom question answers from the Meta Graph API using your Page Access Token.</li>
              <li><strong className="text-white">Auto-scored</strong> — Leads are scored High, Medium, or Low based on how many contact fields are filled.</li>
              <li><strong className="text-white">Deduplication</strong> — If a lead with the same email or phone already exists, Appalix updates the existing record instead of creating a duplicate.</li>
              <li><strong className="text-white">Campaign data captured</strong> — The campaign name, ad name, and form name from Meta are stored alongside the lead for analytics.</li>
              <li>
                <strong className="text-white">One-click to CRM</strong> — From Forms → All Leads, click <em>Pipeline</em> on any lead to create a Sage Contact and Deal in your first pipeline stage automatically.
              </li>
            </ul>
          </section>

          {/* Tips */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Tips &amp; best practices</h2>
            <ul className="list-disc pl-5 space-y-3">
              <li>
                <strong className="text-white">Always include phone number</strong> — Leads with phone numbers score Higher in Appalix and are significantly easier to follow up with quickly. Add phone as a required field in your Meta lead form.
              </li>
              <li>
                <strong className="text-white">Keep form questions to 3 or fewer</strong> — Meta&apos;s own research shows conversion rates drop sharply beyond 3–4 fields. Ask only what you&apos;ll actually use in your follow-up.
              </li>
              <li>
                <strong className="text-white">Renew your Page Access Token before it expires</strong> — Long-lived tokens last 60 days. Set a calendar reminder to reconnect in Forms → Sources before the token expires to avoid interruption.
              </li>
              <li>
                <strong className="text-white">Check Forms → Analytics</strong> — The analytics page shows leads by campaign name so you can see which Meta campaigns are generating the best quality leads.
              </li>
              <li>
                <strong className="text-white">Subscribe at the Page level, not the app level</strong> — If you have multiple Pages, each Page subscription fires independently. The Appalix webhook handles leads from all subscribed Pages automatically.
              </li>
            </ul>
          </section>

          {/* FAQ */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Frequently asked questions</h2>
            <div className="space-y-5">
              <div>
                <p className="font-semibold text-white">Does this work for both Facebook and Instagram lead ads?</p>
                <p className="text-sm text-gray-400 mt-1">Yes. If your Instagram account is connected to your Facebook Page and your ad targets Instagram placements, the leads are delivered through the same Page webhook. No additional setup is needed for Instagram.</p>
              </div>
              <div>
                <p className="font-semibold text-white">What fields does Meta send?</p>
                <p className="text-sm text-gray-400 mt-1">Meta sends a notification with the <code className="bg-white/10 px-1 rounded">leadgen_id</code>. Appalix then fetches the full lead details — full name, email, phone, city, state, country, job title, company, and any custom questions you configured on the form — using your Page Access Token.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Can I connect multiple Facebook Pages?</p>
                <p className="text-sm text-gray-400 mt-1">Currently one Meta source per workspace is supported. If you have multiple Pages, subscribe each Page to the same webhook in the Meta App Webhooks section — leads from all Pages will flow into Appalix and be attributed by campaign name in Forms → Analytics.</p>
              </div>
              <div>
                <p className="font-semibold text-white">What if my Page Access Token expires?</p>
                <p className="text-sm text-gray-400 mt-1">Leads will stop arriving and the Meta card in Forms → Sources will show an error status. To fix it, go to Graph API Explorer, generate a new long-lived Page Access Token, and update it in Appalix Forms → Sources.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Are my credentials stored securely?</p>
                <p className="text-sm text-gray-400 mt-1">Yes. The App Secret and Page Access Token are stored encrypted in your workspace database and are never shown in plain text after saving. You can update or rotate them at any time by reconnecting in Forms → Sources.</p>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="rounded-2xl bg-brand-600/10 border border-brand-600/20 p-6 text-center mt-12">
            <p className="text-2xl mb-3">📊</p>
            <h3 className="text-lg font-semibold text-white mb-2">Ready to connect Meta Lead Ads?</h3>
            <p className="text-sm text-gray-400 mb-5">
              Go to Forms → Sources, copy your webhook URL, and you&apos;ll have Facebook and Instagram leads flowing into Appalix automatically.
            </p>
            <Link
              href="/forms/sources"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Go to Forms → Sources →
            </Link>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-white/10 flex items-center justify-between flex-wrap gap-4">
          <Link href="/resources/connect-google-ads-leads" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            ← Connect Google Ads Lead Forms
          </Link>
          <Link href="/resources" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            Back to Resources →
          </Link>
        </div>

      </div>
    </div>
  )
}
