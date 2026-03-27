import Link from 'next/link'
import type { Metadata } from 'next'
import { ArticleSeo } from '@/components/marketing/article-seo'

export const metadata: Metadata = {
  title: 'Connect Klaviyo to Appalix — Sync Contacts to Klaviyo Lists',
  description:
    'Connect Klaviyo to Appalix Sage in under 3 minutes. Sync CRM contacts to your Klaviyo list and trigger flows automatically. Ideal for e-commerce and lifecycle email marketing.',
  keywords: [
    'Klaviyo Appalix integration',
    'Klaviyo CRM sync',
    'Appalix Klaviyo tutorial',
    'Klaviyo list sync',
    'e-commerce email marketing Appalix',
  ],
  alternates: { canonical: 'https://appalix.ai/resources/connect-klaviyo' },
  openGraph: {
    title: 'Connect Klaviyo to Appalix — Sync Contacts to Klaviyo Lists',
    description: 'Sync Appalix CRM contacts to Klaviyo lists and trigger flows automatically.',
    url: 'https://appalix.ai/resources/connect-klaviyo',
    type: 'article',
    siteName: 'Appalix',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Connect Klaviyo to Appalix — Sync Contacts to Klaviyo Lists',
    description: 'Sync Appalix CRM contacts to Klaviyo lists and trigger flows automatically.',
  },
}

export default function ConnectKlaviyoPage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <ArticleSeo
        type="HowTo"
        title="Connect Klaviyo to Appalix"
        description="Connect Klaviyo to Appalix Sage. Sync CRM contacts to your Klaviyo list and trigger flows automatically. Ideal for e-commerce and lifecycle email marketing."
        slug="connect-klaviyo"
        datePublished="2026-03-04"
        steps={[
          { name: 'Create a Klaviyo Private API Key', text: 'In Klaviyo, go to Settings → API Keys → Create Private API Key. Set Lists and Profiles to Full Access.' },
          { name: 'Find your Klaviyo List ID', text: 'In Klaviyo, go to Audience → Lists and Segments, open the target list, click Settings, and copy the List ID.' },
          { name: 'Connect in Sage → Integrations', text: 'In Appalix, go to Sage → Integrations → Email Marketing, find the Klaviyo card, click Connect, and paste your Private API Key and List ID.' },
          { name: 'Confirm the connection', text: 'The Klaviyo card shows a Connected badge. Contacts will sync to your Klaviyo list as they are created or updated in Sage.' },
          { name: 'Pull existing Klaviyo profiles (optional)', text: 'Go to Forms → Sources, find the Klaviyo card, and click Sync Now to import your existing Klaviyo profiles into Appalix as leads.' },
        ]}
      />

      <div className="max-w-3xl mx-auto">

        <div className="flex items-center gap-2 text-sm text-white/60 mb-10">
          <Link href="/resources" className="hover:text-brand-400 transition-colors">Resources</Link>
          <span>/</span>
          <span className="text-white/65">Connect Klaviyo</span>
        </div>

        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-400 border border-brand-600/20 font-medium">Tutorial</span>
            <span className="text-xs text-white/60">6 min read · Pro+ plan</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            Connect Klaviyo to Appalix
          </h1>
          <p className="text-white/65 text-lg leading-relaxed">
            Klaviyo is the leading email and SMS platform for e-commerce. Connecting it to Appalix means every
            contact you add to Sage CRM is automatically added to your Klaviyo list — triggering your welcome
            flows, win-back sequences, and campaigns without any manual export. Setup takes under 3 minutes.
          </p>
        </div>

        <div className="border-t border-white/10 mb-10" />

        <div className="prose prose-invert prose-brand max-w-none space-y-10 text-white/80">

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What you&apos;ll need</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>An <strong className="text-white">Appalix account</strong> on Pro plan or above</li>
              <li>A <strong className="text-white">Klaviyo account</strong> (any plan)</li>
              <li>A Klaviyo <strong className="text-white">Private API Key</strong> and the target <strong className="text-white">List ID</strong></li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 1 — Create a Klaviyo Private API Key</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Log in to <strong className="text-white">Klaviyo</strong> and click your account name (bottom-left).</li>
              <li>Go to <strong className="text-white">Settings → API Keys</strong>.</li>
              <li>Click <strong className="text-white">Create Private API Key</strong>.</li>
              <li>
                Give the key a name (e.g. &quot;Appalix Sync&quot;) and set the following scopes to <strong className="text-white">Full Access</strong>:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>Lists</strong> — Full Access</li>
                  <li><strong>Profiles</strong> — Full Access</li>
                </ul>
                All other scopes can remain at their default (No Access).
              </li>
              <li>Click <strong className="text-white">Create</strong> and copy the key — it starts with <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">pk_</code>.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 2 — Find your Klaviyo List ID</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>In Klaviyo, go to <strong className="text-white">Audience → Lists and Segments</strong> in the left sidebar.</li>
              <li>Choose a <strong className="text-white">List</strong> (not a Segment — segments are auto-populated and can&apos;t receive direct profile additions). Click on it to open it.</li>
              <li>Look at your browser&apos;s address bar. The URL will look like:<br />
                <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300 text-xs">https://www.klaviyo.com/list/</code><strong className="text-brand-300">Xk7abc</strong><code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300 text-xs">/members</code>
              </li>
              <li>The code between <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300 text-xs">/list/</code> and <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300 text-xs">/members</code> is your <strong className="text-white">List ID</strong> — copy it.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 3 — Connect in Sage → Integrations</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>In Appalix, navigate to <strong className="text-white">Sage → Integrations</strong> in the left sidebar.</li>
              <li>Scroll to the <strong className="text-white">Email Marketing</strong> section and find the <strong className="text-white">Klaviyo</strong> card.</li>
              <li>Click <strong className="text-white">Connect</strong> and fill in:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>Private API Key</strong> — the key from Step 1</li>
                  <li><strong>List ID</strong> — the ID from Step 2</li>
                </ul>
              </li>
              <li>Click <strong className="text-white">Save &amp; Connect</strong>. The card shows a green <em>Connected</em> badge.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What the integration does</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-white">Outbound contact sync</strong> — contacts created or updated in Sage are pushed to your Klaviyo list as profiles, triggering any flows subscribed to that list.</li>
              <li><strong className="text-white">Flow triggers</strong> — adding a profile to a list automatically starts any Klaviyo flows (welcome series, win-back sequences, etc.).</li>
              <li><strong className="text-white">Inbound pull sync</strong> — pull your existing Klaviyo profiles into Appalix on demand from <strong className="text-white">Forms → Sources → Sync Now</strong>.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Pulling Klaviyo profiles into Forms</h2>
            <p>
              Once connected, you can import your existing Klaviyo profiles into <strong className="text-white">Forms → Sources</strong> — the same inbox used for Meta Lead Ads and Google Ads leads.
            </p>
            <ol className="list-decimal pl-5 space-y-3 mt-3">
              <li>Navigate to <strong className="text-white">Forms → Sources</strong> in Appalix.</li>
              <li>Find the <strong className="text-white">Klaviyo</strong> card in the Email Marketing Platforms section.</li>
              <li>Click <strong className="text-white">Sync Now</strong>. Appalix fetches all profiles from your connected list (or all profiles if no list ID was set).</li>
              <li>A result banner shows how many contacts were imported and how many were skipped as duplicates.</li>
              <li>Imported contacts appear immediately in <strong className="text-white">Forms → All Leads</strong> with a Klaviyo platform badge.</li>
            </ol>
            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white/65">
              <strong className="text-white">Deduplication:</strong> Before inserting, Appalix checks whether a lead with the same email or phone already exists. Duplicates are skipped — you can run Sync Now multiple times safely.
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Frequently asked questions</h2>
            <div className="space-y-5">
              <div>
                <p className="font-semibold text-white">Can I sync to multiple Klaviyo lists?</p>
                <p className="text-sm text-white/65 mt-1">One list per workspace is supported. Update the List ID in Sage → Integrations → Klaviyo to change which list contacts sync to.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Will existing Klaviyo profiles be updated?</p>
                <p className="text-sm text-white/65 mt-1">Yes. Klaviyo uses email as the unique identifier. If a profile with the same email already exists, it is updated with any new fields rather than creating a duplicate.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Are my API credentials stored securely?</p>
                <p className="text-sm text-white/65 mt-1">Yes. Your Private API Key is stored encrypted in your workspace database and never exposed in plain text after saving.</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-brand-600/10 border border-brand-600/20 p-6 text-center">
            <p className="text-2xl mb-3">📊</p>
            <h3 className="text-lg font-semibold text-white mb-2">Ready to connect Klaviyo?</h3>
            <p className="text-sm text-white/65 mb-5">
              Go to Sage → Integrations → Email Marketing and paste your Private API Key and List ID.
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
          <Link href="/resources/connect-convertkit" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            ← Connect Kit (ConvertKit)
          </Link>
          <Link href="/resources/connect-constantcontact" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            Connect Constant Contact →
          </Link>
        </div>

      </div>
    </div>
  )
}
