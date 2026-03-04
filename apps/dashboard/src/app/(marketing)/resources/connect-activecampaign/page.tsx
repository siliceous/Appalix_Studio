import Link from 'next/link'
import type { Metadata } from 'next'
import { ArticleSeo } from '@/components/marketing/article-seo'

export const metadata: Metadata = {
  title: 'Connect ActiveCampaign to Appalix — Sync Contacts & Import Leads',
  description:
    'Connect ActiveCampaign to Appalix in under 3 minutes. Pull your contacts into Appalix Forms for AI lead scoring and one-click CRM handoff — no Zapier required.',
  keywords: [
    'ActiveCampaign Appalix integration',
    'ActiveCampaign contact sync',
    'ActiveCampaign leads import',
    'Appalix ActiveCampaign tutorial',
    'email marketing lead capture',
  ],
  alternates: { canonical: 'https://appalix.ai/resources/connect-activecampaign' },
  openGraph: {
    title: 'Connect ActiveCampaign to Appalix — Sync Contacts & Import Leads',
    description: 'Connect ActiveCampaign to Appalix and pull contacts into Forms for AI lead scoring and CRM handoff.',
    url: 'https://appalix.ai/resources/connect-activecampaign',
    type: 'article',
    siteName: 'Appalix',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Connect ActiveCampaign to Appalix — Sync Contacts & Import Leads',
    description: 'Connect ActiveCampaign to Appalix and pull contacts into Forms for AI lead scoring and CRM handoff.',
  },
}

export default function ConnectActiveCampaignPage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <ArticleSeo
        type="HowTo"
        title="Connect ActiveCampaign to Appalix"
        description="Connect ActiveCampaign to Appalix in under 3 minutes. Pull contacts into Appalix Forms for AI lead scoring and one-click CRM handoff."
        slug="connect-activecampaign"
        datePublished="2026-03-04"
        steps={[
          { name: 'Find your ActiveCampaign credentials', text: 'In ActiveCampaign, go to Settings → Developer to find your API URL and API Key.' },
          { name: 'Connect in Sage → Integrations', text: 'In Appalix, go to Sage → Integrations → Email Marketing, find the ActiveCampaign card, click Connect, and paste your API URL and API Key.' },
          { name: 'Sync contacts into Forms', text: 'Navigate to Forms → Sources. An ActiveCampaign sync card appears. Click Sync Now to import your contacts as leads.' },
          { name: 'Review leads in All Leads', text: 'Go to Forms → All Leads. Imported contacts appear with an ActiveCampaign badge, auto-scored by field completeness.' },
        ]}
      />

      <div className="max-w-3xl mx-auto">

        <div className="flex items-center gap-2 text-sm text-gray-500 mb-10">
          <Link href="/resources" className="hover:text-brand-400 transition-colors">Resources</Link>
          <span>/</span>
          <span className="text-gray-400">Connect ActiveCampaign</span>
        </div>

        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-400 border border-brand-600/20 font-medium">Tutorial</span>
            <span className="text-xs text-gray-500">6 min read · Pro+ plan</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            Connect ActiveCampaign to Appalix
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Connecting ActiveCampaign lets you pull your full contact list into Appalix Forms for AI-assisted
            lead scoring and one-click pipeline handoff. Leads are automatically deduplicated against your existing
            Appalix data. Setup requires two values from your ActiveCampaign account and takes under 3 minutes.
          </p>
        </div>

        <div className="border-t border-white/10 mb-10" />

        <div className="prose prose-invert prose-brand max-w-none space-y-10 text-gray-300">

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What you&apos;ll need</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>An <strong className="text-white">Appalix account</strong> on Pro plan or above</li>
              <li>An <strong className="text-white">ActiveCampaign account</strong> (any plan)</li>
              <li>Your ActiveCampaign <strong className="text-white">API URL</strong> and <strong className="text-white">API Key</strong></li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 1 — Find your API URL and Key</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Log in to <strong className="text-white">ActiveCampaign</strong> and click <strong className="text-white">Settings</strong> (bottom-left gear icon).</li>
              <li>Select <strong className="text-white">Developer</strong> from the left menu.</li>
              <li>
                You&apos;ll see two values:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>API URL</strong> — looks like <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">https://youraccountname.api-us1.com</code></li>
                  <li><strong>API Key</strong> — a long alphanumeric string. Click the eye icon to reveal it.</li>
                </ul>
              </li>
              <li>Copy both values — you&apos;ll paste them into Appalix in the next step.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 2 — Connect in Sage → Integrations</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>In Appalix, go to <strong className="text-white">Sage → Integrations</strong> in the left sidebar.</li>
              <li>Scroll to the <strong className="text-white">Email Marketing</strong> section and find the <strong className="text-white">ActiveCampaign</strong> card.</li>
              <li>Click <strong className="text-white">Connect</strong> and fill in your API URL and API Key.</li>
              <li>Click <strong className="text-white">Save &amp; Connect</strong>. The card shows a green <em>Connected</em> badge.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 3 — Import contacts into Forms</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Navigate to <strong className="text-white">Forms → Sources</strong>. An <strong className="text-white">ActiveCampaign</strong> sync card appears in the Email Platform Sync section.</li>
              <li>Click <strong className="text-white">Sync Now</strong>. Appalix fetches all contacts from your account in batches of 100 (handles large accounts automatically).</li>
              <li>A result banner shows how many contacts were imported and how many skipped as duplicates.</li>
              <li>Go to <strong className="text-white">Forms → All Leads</strong> to see your contacts with an ActiveCampaign badge.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What fields are imported</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-white">Name</strong> — from <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">firstName + lastName</code></li>
              <li><strong className="text-white">Email</strong> — primary email address</li>
              <li><strong className="text-white">Phone</strong> — primary phone number (if set)</li>
              <li><strong className="text-white">Company</strong> — from <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">orgname</code> (if set)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Frequently asked questions</h2>
            <div className="space-y-5">
              <div>
                <p className="font-semibold text-white">Does the sync fetch all contacts or just a specific list?</p>
                <p className="text-sm text-gray-400 mt-1">All contacts in your ActiveCampaign account are fetched, regardless of which list they belong to. Filtering by list is not currently supported.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Does syncing write anything back to ActiveCampaign?</p>
                <p className="text-sm text-gray-400 mt-1">No. The Forms sync is read-only. No data is sent to ActiveCampaign during a sync — only pulled from it.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Can I move an ActiveCampaign contact to my CRM pipeline?</p>
                <p className="text-sm text-gray-400 mt-1">Yes. In Forms → All Leads, click <strong>Pipeline</strong> on any contact to create a Sage Contact and Deal in the first stage of your pipeline.</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-brand-600/10 border border-brand-600/20 p-6 text-center">
            <p className="text-2xl mb-3">⚡</p>
            <h3 className="text-lg font-semibold text-white mb-2">Ready to connect ActiveCampaign?</h3>
            <p className="text-sm text-gray-400 mb-5">
              Go to Sage → Integrations → Email Marketing to paste your API URL and key.
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
          <Link href="/resources/connect-mailchimp" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            ← Connect Mailchimp
          </Link>
          <Link href="/resources/connect-convertkit" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            Connect Kit (ConvertKit) →
          </Link>
        </div>

      </div>
    </div>
  )
}
