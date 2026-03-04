import Link from 'next/link'
import type { Metadata } from 'next'
import { ArticleSeo } from '@/components/marketing/article-seo'

export const metadata: Metadata = {
  title: 'Connect Kit (ConvertKit) to Appalix — Sync Subscribers to Sage CRM',
  description:
    'Connect Kit (formerly ConvertKit) to Appalix Sage in under 3 minutes. Sync subscribers to your CRM contacts automatically as deals and leads flow through your pipeline.',
  keywords: [
    'ConvertKit Appalix integration',
    'Kit Appalix tutorial',
    'ConvertKit CRM sync',
    'Appalix email marketing',
    'Kit subscriber sync',
  ],
  alternates: { canonical: 'https://appalix.ai/resources/connect-convertkit' },
  openGraph: {
    title: 'Connect Kit (ConvertKit) to Appalix — Sync Subscribers to Sage CRM',
    description: 'Connect Kit to Appalix Sage and keep your subscriber base in sync with your CRM contacts automatically.',
    url: 'https://appalix.ai/resources/connect-convertkit',
    type: 'article',
    siteName: 'Appalix',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Connect Kit (ConvertKit) to Appalix — Sync Subscribers to Sage CRM',
    description: 'Connect Kit to Appalix Sage and keep your subscriber base in sync with your CRM contacts automatically.',
  },
}

export default function ConnectConvertKitPage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <ArticleSeo
        type="HowTo"
        title="Connect Kit (ConvertKit) to Appalix"
        description="Connect Kit (formerly ConvertKit) to Appalix Sage. Sync subscribers to your CRM contacts automatically as deals and leads flow through your pipeline."
        slug="connect-convertkit"
        datePublished="2026-03-04"
        steps={[
          { name: 'Get your Kit API key and secret', text: 'In Kit, go to Settings → Advanced → API. Copy your API Key and API Secret.' },
          { name: 'Connect in Sage → Integrations', text: 'In Appalix, go to Sage → Integrations → Email Marketing, find the Kit (ConvertKit) card, click Connect, and paste your API Key and API Secret.' },
          { name: 'Confirm the connection', text: 'The Kit card shows a Connected badge. Kit subscribers will be synced as contacts are created or updated in Sage.' },
        ]}
      />

      <div className="max-w-3xl mx-auto">

        <div className="flex items-center gap-2 text-sm text-gray-500 mb-10">
          <Link href="/resources" className="hover:text-brand-400 transition-colors">Resources</Link>
          <span>/</span>
          <span className="text-gray-400">Connect Kit (ConvertKit)</span>
        </div>

        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-400 border border-brand-600/20 font-medium">Tutorial</span>
            <span className="text-xs text-gray-500">5 min read · Pro+ plan</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            Connect Kit (ConvertKit) to Appalix
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Kit is the email platform of choice for creators and course businesses. Connecting it to Appalix Sage
            lets you sync contacts as Kit subscribers and apply tags automatically — keeping your CRM and email
            platform in harmony. Setup takes under 3 minutes with just your API key and secret.
          </p>
        </div>

        <div className="border-t border-white/10 mb-10" />

        <div className="prose prose-invert prose-brand max-w-none space-y-10 text-gray-300">

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What you&apos;ll need</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>An <strong className="text-white">Appalix account</strong> on Pro plan or above</li>
              <li>A <strong className="text-white">Kit account</strong> (any plan — formerly ConvertKit)</li>
              <li>Your Kit <strong className="text-white">API Key</strong> and <strong className="text-white">API Secret</strong></li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 1 — Get your Kit API credentials</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Log in to <strong className="text-white">Kit</strong> (kit.com) and click your profile name in the top-right corner.</li>
              <li>Select <strong className="text-white">Settings</strong> from the dropdown.</li>
              <li>Click <strong className="text-white">Advanced</strong> in the left sidebar, then scroll to the <strong className="text-white">API</strong> section.</li>
              <li>Copy your <strong className="text-white">API Key</strong> and <strong className="text-white">API Secret</strong>. Keep the API Secret private — treat it like a password.</li>
            </ol>
            <div className="mt-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm text-blue-300">
              <strong>Note:</strong> Kit&apos;s V4 API uses the API Key for read operations and the API Secret for write operations (subscribing contacts). Both are required for the full integration to work.
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 2 — Connect in Sage → Integrations</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>In Appalix, navigate to <strong className="text-white">Sage → Integrations</strong> in the left sidebar.</li>
              <li>Scroll to the <strong className="text-white">Email Marketing</strong> section and find the <strong className="text-white">Kit (ConvertKit)</strong> card.</li>
              <li>Click <strong className="text-white">Connect</strong> to expand the form.</li>
              <li>Enter your <strong className="text-white">API Key</strong> and <strong className="text-white">API Secret</strong>.</li>
              <li>Click <strong className="text-white">Save &amp; Connect</strong>. The card shows a green <em>Connected</em> badge.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What the integration does</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-white">Contact sync</strong> — when you create or update contacts in Sage CRM, Appalix adds them as Kit subscribers and applies any configured tags.</li>
              <li><strong className="text-white">Tags</strong> — contacts synced from Sage are tagged to identify their source, making segmentation in Kit straightforward.</li>
            </ul>
            <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-300">
              <strong>Forms sync:</strong> Kit is not currently supported in the Forms → Sources pull sync. To import leads from Kit forms into Appalix, use Kit&apos;s Zapier integration or a webhook to push submissions to Appalix.
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Frequently asked questions</h2>
            <div className="space-y-5">
              <div>
                <p className="font-semibold text-white">Does this work with Kit&apos;s V4 API?</p>
                <p className="text-sm text-gray-400 mt-1">Yes. Appalix uses Kit&apos;s V4 API (developers.kit.com/v4), which is the current recommended version. V3 is deprecated and not supported.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Can I add subscribers to a specific Kit form or sequence?</p>
                <p className="text-sm text-gray-400 mt-1">The current integration adds contacts as general subscribers. Adding to specific forms or sequences will be available in a future update.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Are my API credentials stored securely?</p>
                <p className="text-sm text-gray-400 mt-1">Yes. Your API Key and Secret are stored encrypted in your workspace database and are never exposed in plain text after saving.</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-brand-600/10 border border-brand-600/20 p-6 text-center">
            <p className="text-2xl mb-3">✉️</p>
            <h3 className="text-lg font-semibold text-white mb-2">Ready to connect Kit?</h3>
            <p className="text-sm text-gray-400 mb-5">
              Go to Sage → Integrations → Email Marketing and paste your API key and secret.
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
          <Link href="/resources/connect-activecampaign" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            ← Connect ActiveCampaign
          </Link>
          <Link href="/resources/connect-klaviyo" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            Connect Klaviyo →
          </Link>
        </div>

      </div>
    </div>
  )
}
