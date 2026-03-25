import Link from 'next/link'
import type { Metadata } from 'next'
import { ArticleSeo } from '@/components/marketing/article-seo'

export const metadata: Metadata = {
  title: 'Connect ActiveCampaign to Appalix — Sync Contacts & Pull Leads',
  description:
    'Connect ActiveCampaign to Appalix Sage in minutes. Push CRM contacts to your ActiveCampaign lists and pull existing contacts into Forms for AI lead scoring.',
  keywords: [
    'ActiveCampaign Appalix integration',
    'ActiveCampaign CRM sync',
    'Appalix ActiveCampaign tutorial',
    'ActiveCampaign contact sync',
    'email marketing Appalix',
  ],
  alternates: { canonical: 'https://appalix.ai/resources/connect-activecampaign' },
  openGraph: {
    title: 'Connect ActiveCampaign to Appalix — Sync Contacts & Pull Leads',
    description: 'Push Appalix CRM contacts to ActiveCampaign and pull existing contacts into Forms for AI lead scoring.',
    url: 'https://appalix.ai/resources/connect-activecampaign',
    type: 'article',
    siteName: 'Appalix',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Connect ActiveCampaign to Appalix — Sync Contacts & Pull Leads',
    description: 'Push Appalix CRM contacts to ActiveCampaign and pull existing contacts into Forms for AI lead scoring.',
  },
}

export default function ConnectActiveCampaignPage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <ArticleSeo
        type="HowTo"
        title="Connect ActiveCampaign to Appalix"
        description="Connect ActiveCampaign to Appalix Sage. Push CRM contacts to your ActiveCampaign lists and pull existing contacts into Forms for AI lead scoring."
        slug="connect-activecampaign"
        datePublished="2026-03-25"
        steps={[
          { name: 'Find your ActiveCampaign API URL and API Key', text: 'In ActiveCampaign, go to Settings → Developer and copy your API URL and API Key.' },
          { name: 'Connect in Sage → Integrations', text: 'In Appalix, go to Sage → Integrations, find the ActiveCampaign card under Email Marketing, click Connect, and paste your API URL and API Key.' },
          { name: 'Confirm the connection', text: 'The ActiveCampaign card shows a Connected badge. Contacts will sync to your ActiveCampaign account as they are created or updated in Sage.' },
          { name: 'Pull existing ActiveCampaign contacts (optional)', text: 'Go to Forms → Sources, find the ActiveCampaign card, and click Sync Now to import your existing contacts into Appalix as leads.' },
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
            <span className="text-xs text-gray-500">5 min read · Pro+ plan</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            Connect ActiveCampaign to Appalix
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            ActiveCampaign is a powerful marketing automation and CRM platform. Connecting it to Appalix means
            every contact you add to Sage CRM is automatically pushed to your ActiveCampaign account — ready to
            trigger your email automations and pipelines. You can also pull your existing ActiveCampaign contacts
            into Appalix for AI lead scoring.
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
            <h2 className="text-xl font-semibold text-white mb-3">Step 1 — Find your ActiveCampaign API credentials</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Log in to <strong className="text-white">ActiveCampaign</strong> and click <strong className="text-white">Settings</strong> in the left sidebar (bottom-left gear icon).</li>
              <li>Click <strong className="text-white">Developer</strong> at the bottom of the Settings menu.</li>
              <li>
                Copy both values shown on this page:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong className="text-white">API URL</strong> — looks like <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300 text-xs">https://youraccountname.api-us1.com</code></li>
                  <li><strong className="text-white">API Key</strong> — a long alphanumeric string</li>
                </ul>
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 2 — Connect in Sage → Integrations</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>In Appalix, navigate to <strong className="text-white">Sage → Integrations</strong> in the left sidebar.</li>
              <li>Scroll to the <strong className="text-white">Email Marketing</strong> section and find the <strong className="text-white">ActiveCampaign</strong> card.</li>
              <li>Click <strong className="text-white">Connect</strong> and fill in:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>API URL</strong> — the URL from Step 1</li>
                  <li><strong>API Key</strong> — the key from Step 1</li>
                </ul>
              </li>
              <li>Click <strong className="text-white">Save &amp; Connect</strong>. The card shows a green <em>Connected</em> badge.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What the integration does</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-white">Outbound contact sync</strong> — contacts created or updated in Sage are pushed to your ActiveCampaign account, triggering any automations subscribed to contact creation.</li>
              <li><strong className="text-white">Automation triggers</strong> — once a contact is added, any ActiveCampaign automation that starts on &quot;Contact added&quot; will fire automatically.</li>
              <li><strong className="text-white">Inbound pull sync</strong> — pull your existing ActiveCampaign contacts into Appalix on demand from <strong className="text-white">Forms → Sources → Sync Now</strong>.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Pulling ActiveCampaign contacts into Forms</h2>
            <p>
              Once connected, you can import your existing ActiveCampaign contacts into <strong className="text-white">Forms → Sources</strong> — the same inbox used for Meta Lead Ads and Google Ads leads.
            </p>
            <ol className="list-decimal pl-5 space-y-3 mt-3">
              <li>Navigate to <strong className="text-white">Forms → Sources</strong> in Appalix.</li>
              <li>Find the <strong className="text-white">ActiveCampaign</strong> card in the Email Marketing Platforms section.</li>
              <li>Click <strong className="text-white">Sync Now</strong>. Appalix fetches all contacts from your ActiveCampaign account.</li>
              <li>A result banner shows how many contacts were imported and how many were skipped as duplicates.</li>
              <li>Imported contacts appear immediately in <strong className="text-white">Forms → All Leads</strong> with an ActiveCampaign platform badge.</li>
            </ol>
            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-400">
              <strong className="text-white">Deduplication:</strong> Before inserting, Appalix checks whether a lead with the same email or phone already exists. Duplicates are skipped — you can run Sync Now multiple times safely.
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Frequently asked questions</h2>
            <div className="space-y-5">
              <div>
                <p className="font-semibold text-white">Which ActiveCampaign plan do I need?</p>
                <p className="text-sm text-gray-400 mt-1">All ActiveCampaign plans include API access. The API URL and API Key are available on every plan under Settings → Developer.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Will existing ActiveCampaign contacts be updated?</p>
                <p className="text-sm text-gray-400 mt-1">Yes. ActiveCampaign uses email as the unique identifier. If a contact with the same email already exists, it is updated rather than duplicated.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Are my API credentials stored securely?</p>
                <p className="text-sm text-gray-400 mt-1">Yes. Your API Key is stored encrypted in your workspace database and never exposed in plain text after saving.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Can I use ActiveCampaign&apos;s built-in CRM alongside Appalix Sage?</p>
                <p className="text-sm text-gray-400 mt-1">Yes. Appalix pushes contact data and you can use ActiveCampaign&apos;s own deals and pipelines independently. The two systems complement each other.</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-brand-600/10 border border-brand-600/20 p-6 text-center">
            <p className="text-2xl mb-3">⚡</p>
            <h3 className="text-lg font-semibold text-white mb-2">Ready to connect ActiveCampaign?</h3>
            <p className="text-sm text-gray-400 mb-5">
              Go to Sage → Integrations → Email Marketing and paste your API URL and API Key.
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
          <Link href="/resources/connect-mailchimp" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            Connect Mailchimp →
          </Link>
        </div>

      </div>
    </div>
  )
}
