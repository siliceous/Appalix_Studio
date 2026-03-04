import Link from 'next/link'
import type { Metadata } from 'next'
import { ArticleSeo } from '@/components/marketing/article-seo'

export const metadata: Metadata = {
  title: 'Connect Google Ads Lead Forms to Appalix — Step-by-Step Tutorial',
  description:
    'Automatically receive Google Ads lead form submissions inside Appalix. Set up your webhook URL in Google Ads Lead Form Extensions and connect in Forms → Sources in under 5 minutes.',
  keywords: [
    'Google Ads lead forms Appalix',
    'Google Ads lead form extensions webhook',
    'capture Google Ads leads CRM',
    'Google Ads lead capture automation',
    'Google lead form webhook URL',
    'Appalix Forms Google Ads',
    'lead generation Google Ads integration',
  ],
  alternates: { canonical: 'https://appalix.ai/resources/connect-google-ads-leads' },
  openGraph: {
    title: 'Connect Google Ads Lead Forms to Appalix — Step-by-Step Tutorial',
    description: 'Automatically receive Google Ads lead form submissions inside Appalix. Step-by-step guide.',
    url: 'https://appalix.ai/resources/connect-google-ads-leads',
    type: 'article',
    siteName: 'Appalix',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Connect Google Ads Lead Forms to Appalix — Step-by-Step Tutorial',
    description: 'Automatically receive Google Ads lead form submissions inside Appalix. Step-by-step guide.',
  },
}

export default function ConnectGoogleAdsLeadsPage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <ArticleSeo
        type="HowTo"
        title="Connect Google Ads Lead Forms to Appalix"
        description="Automatically receive Google Ads lead form submissions inside Appalix. Set up your webhook URL in Google Ads Lead Form Extensions and connect in Forms → Sources in under 5 minutes."
        slug="connect-google-ads-leads"
        datePublished="2026-03-04"
        steps={[
          { name: 'Get your webhook URL from Appalix', text: 'In Appalix, go to Forms → Sources, click Connect on the Google Ads card, and copy your unique webhook URL.' },
          { name: 'Create a webhook key', text: 'Choose a secure random string (e.g. "appalix-gads-2026") to use as your webhook key in Google Ads. You will enter this same value in both Google Ads and Appalix.' },
          { name: 'Add the webhook to your Google Ads lead form', text: 'In Google Ads, open your campaign → Assets → Lead form → Webhook integration. Paste your webhook URL and key, then save.' },
          { name: 'Paste the key into Appalix', text: 'Back in Appalix Forms → Sources, paste the same webhook key into the Webhook Key field and click Save & Connect.' },
          { name: 'Submit a test lead and verify', text: 'Use the Google Ads Send test data button to fire a test lead. It should appear in Appalix Forms → All Leads within seconds.' },
        ]}
      />

      <div className="max-w-3xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-10">
          <Link href="/resources" className="hover:text-brand-400 transition-colors">Resources</Link>
          <span>/</span>
          <span className="text-gray-400">Connect Google Ads Lead Forms</span>
        </div>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-400 border border-brand-600/20 font-medium">Tutorial</span>
            <span className="text-xs text-gray-500">8 min read · Pro+ plan</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            Connect Google Ads Lead Forms to Appalix
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Google Ads Lead Form Extensions let you collect contact details without sending users to a landing page.
            With this integration, every submission is instantly delivered to Appalix — automatically scored,
            deduplicated, and ready to move into your CRM pipeline with one click.
          </p>
        </div>

        <div className="border-t border-white/10 mb-10" />

        <div className="prose prose-invert prose-brand max-w-none space-y-10 text-gray-300">

          {/* What you need */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What you&apos;ll need</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>An <strong className="text-white">Appalix account</strong> on the Pro plan or above</li>
              <li>A <strong className="text-white">Google Ads account</strong> with an active campaign</li>
              <li>At least one <strong className="text-white">Lead Form Asset</strong> attached to a Search, Display, or Video campaign</li>
              <li>A <strong className="text-white">webhook key</strong> — a secure string you create yourself (e.g. <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">appalix-gads-2026</code>)</li>
            </ul>
          </section>

          {/* How it works */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">How it works</h2>
            <p>
              Google Ads Lead Form Extensions support a native webhook integration. When a user submits your lead form,
              Google immediately sends the lead data — name, email, phone, and any custom questions — as a JSON POST
              request to your webhook URL. Appalix receives it, normalises the fields, scores the lead, and stores it
              in your Forms dashboard. No polling, no third-party tools.
            </p>
          </section>

          {/* Step 1 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 1 — Get your webhook URL from Appalix</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Log in to <strong className="text-white">Appalix</strong> and navigate to <strong className="text-white">Forms → Sources</strong> in the left sidebar.</li>
              <li>Find the <strong className="text-white">Google Ads</strong> card and click <strong className="text-white">Connect</strong>.</li>
              <li>
                Your unique webhook URL is shown at the top of the form — it looks like:<br />
                <code className="bg-white/10 px-2 py-1 rounded text-brand-300 text-sm block mt-2 break-all">
                  https://appalix.ai/api/webhooks/google-leads/YOUR_WORKSPACE_ID
                </code>
              </li>
              <li>Click the <strong className="text-white">copy icon</strong> next to the URL. Keep this tab open — you&apos;ll need it in Step 3.</li>
            </ol>
          </section>

          {/* Step 2 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 2 — Choose a webhook key</h2>
            <p>
              Google Ads requires a <strong className="text-white">webhook key</strong> — a shared secret you define.
              Google will include this key in every request it sends, and Appalix uses it to verify the request is legitimate.
            </p>
            <ol className="list-decimal pl-5 space-y-3 mt-4">
              <li>
                Create a secure, random string. A good webhook key is 16–32 characters, mixes letters and numbers,
                and has no spaces — for example: <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">ApplxGads2026xZ9q</code>.
              </li>
              <li>Write it down or copy it to your clipboard. You&apos;ll paste it into both Google Ads (Step 3) and Appalix (Step 4).</li>
            </ol>
            <div className="mt-4 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-sm text-yellow-300">
              <strong>Keep it private.</strong> Treat your webhook key like a password. Anyone who knows it can send fake leads to your Appalix account.
            </div>
          </section>

          {/* Step 3 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 3 — Add the webhook to your Google Ads lead form</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Sign in to <strong className="text-white">Google Ads</strong> at ads.google.com.</li>
              <li>In the left navigation, click <strong className="text-white">Campaigns</strong> and select the campaign that uses your lead form.</li>
              <li>Click <strong className="text-white">Assets</strong> in the left menu, then switch to the <strong className="text-white">Lead form</strong> tab.</li>
              <li>Click the lead form asset you want to connect, then click <strong className="text-white">Edit</strong>.</li>
              <li>
                Scroll to the <strong className="text-white">Lead delivery</strong> section and click <strong className="text-white">Webhook</strong>.
              </li>
              <li>
                In the <strong className="text-white">Webhook URL</strong> field, paste the URL you copied from Appalix in Step 1.
              </li>
              <li>
                In the <strong className="text-white">Webhook key</strong> field, paste the webhook key you created in Step 2.
              </li>
              <li>Click <strong className="text-white">Send test data</strong> — Google will fire a sample lead to your webhook immediately.</li>
              <li>Click <strong className="text-white">Save</strong> to confirm the lead form asset.</li>
            </ol>
            <div className="mt-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm text-blue-300">
              <strong>Where is the Lead Form asset?</strong> If you don&apos;t see a Lead Form asset on your campaign, you need to create one first. Go to <strong>Assets → + Asset → Lead form</strong> and fill in your form questions before returning to this step.
            </div>
          </section>

          {/* Step 4 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 4 — Paste the key into Appalix</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Return to the <strong className="text-white">Appalix Forms → Sources</strong> tab you kept open.</li>
              <li>In the <strong className="text-white">Webhook Key</strong> field, paste the same key you entered in Google Ads.</li>
              <li>Click <strong className="text-white">Save &amp; Connect</strong>. The Google Ads card will show a green <em>Connected</em> badge.</li>
            </ol>
          </section>

          {/* Step 5 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 5 — Verify the test lead arrived</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Go to <strong className="text-white">Forms → All Leads</strong> in Appalix.</li>
              <li>
                You should see a test lead from <strong className="text-white">Google Ads</strong> with a <em>New Lead</em> status badge.
                The name will be &quot;Test User&quot; and the email will be a Google test address.
              </li>
              <li>
                If the lead doesn&apos;t appear within 30 seconds, double-check:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>The webhook URL was copied correctly (no trailing spaces)</li>
                  <li>The webhook key matches exactly in both Google Ads and Appalix</li>
                  <li>The Appalix Google Ads source shows <em>Connected</em></li>
                </ul>
              </li>
            </ol>
          </section>

          {/* After connection */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What happens after a lead submits</h2>
            <ul className="list-disc pl-5 space-y-3">
              <li><strong className="text-white">Instant delivery</strong> — Appalix receives the lead within seconds of the Google Ads form submission.</li>
              <li><strong className="text-white">Auto-scored</strong> — Leads are scored High, Medium, or Low based on how many contact fields are filled (email, phone, company, job title).</li>
              <li><strong className="text-white">Deduplication</strong> — If a lead with the same email or phone already exists, Appalix updates the existing record instead of creating a duplicate.</li>
              <li><strong className="text-white">Campaign data captured</strong> — The campaign name and form name from Google Ads are stored alongside the lead for analytics.</li>
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
                <strong className="text-white">Add phone number as a required field</strong> — Leads with phone numbers score Higher in Appalix and are easier to follow up with quickly.
              </li>
              <li>
                <strong className="text-white">Keep form questions short</strong> — Google research shows lead form conversion rates drop sharply with more than 3–4 questions. Ask only what you&apos;ll actually use.
              </li>
              <li>
                <strong className="text-white">Use one webhook key per integration</strong> — Don&apos;t reuse the same key across multiple platforms. This lets you rotate keys independently if needed.
              </li>
              <li>
                <strong className="text-white">Check Forms → Analytics</strong> — After your campaign runs, the analytics page shows leads by campaign name so you can see which campaigns are generating the best quality leads.
              </li>
            </ul>
          </section>

          {/* FAQ */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Frequently asked questions</h2>
            <div className="space-y-5">
              <div>
                <p className="font-semibold text-white">Does this work with all Google Ads campaign types?</p>
                <p className="text-sm text-gray-400 mt-1">Lead Form Assets are available on Search, Display, Discovery, and Video campaigns. They are not available on Shopping campaigns.</p>
              </div>
              <div>
                <p className="font-semibold text-white">What fields does Google send?</p>
                <p className="text-sm text-gray-400 mt-1">Google always sends the fields the user filled in on your lead form — typically full name, email address, phone number, and any custom questions you configured. Campaign name, ad group ID, and form name are also included.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Can I connect multiple Google Ads accounts?</p>
                <p className="text-sm text-gray-400 mt-1">Currently one Google Ads source per workspace is supported. If you manage multiple ad accounts, use the same webhook URL across all of them — leads will be attributed by campaign name in Forms → Analytics.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Is the webhook key stored securely?</p>
                <p className="text-sm text-gray-400 mt-1">Yes. The webhook key is stored encrypted in your workspace database and is never shown in plain text after saving. You can rotate it at any time by reconnecting in Forms → Sources.</p>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="rounded-2xl bg-brand-600/10 border border-brand-600/20 p-6 text-center mt-12">
            <p className="text-2xl mb-3">📊</p>
            <h3 className="text-lg font-semibold text-white mb-2">Ready to connect Google Ads?</h3>
            <p className="text-sm text-gray-400 mb-5">
              Go to Forms → Sources, copy your webhook URL, and you&apos;ll have leads flowing into Appalix in under 5 minutes.
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
          <Link href="/resources" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            ← Back to Resources
          </Link>
          <Link href="/resources/connect-meta-leads" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            Connect Meta Lead Ads →
          </Link>
        </div>

      </div>
    </div>
  )
}
