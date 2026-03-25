import Link from 'next/link'
import type { Metadata } from 'next'
import { ArticleSeo } from '@/components/marketing/article-seo'

export const metadata: Metadata = {
  title: 'Connect Kit (ConvertKit) to Appalix — Sync Contacts & Pull Subscribers',
  description:
    'Connect Kit (ConvertKit) to Appalix Sage in minutes. Push CRM contacts as Kit subscribers and pull existing subscribers into Forms for AI lead scoring.',
  keywords: [
    'ConvertKit Appalix integration',
    'Kit ConvertKit CRM sync',
    'Appalix ConvertKit tutorial',
    'Kit subscriber sync',
    'email marketing Appalix',
  ],
  alternates: { canonical: 'https://appalix.ai/resources/connect-convertkit' },
  openGraph: {
    title: 'Connect Kit (ConvertKit) to Appalix — Sync Contacts & Pull Subscribers',
    description: 'Push Appalix CRM contacts to Kit and pull existing subscribers into Forms for AI lead scoring.',
    url: 'https://appalix.ai/resources/connect-convertkit',
    type: 'article',
    siteName: 'Appalix',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Connect Kit (ConvertKit) to Appalix — Sync Contacts & Pull Subscribers',
    description: 'Push Appalix CRM contacts to Kit and pull existing subscribers into Forms for AI lead scoring.',
  },
}

export default function ConnectConvertKitPage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <ArticleSeo
        type="HowTo"
        title="Connect Kit (ConvertKit) to Appalix"
        description="Connect Kit (ConvertKit) to Appalix Sage. Push CRM contacts as Kit subscribers and pull existing subscribers into Forms for AI lead scoring."
        slug="connect-convertkit"
        datePublished="2026-03-25"
        steps={[
          { name: 'Find your Kit API Key', text: 'In Kit, go to Settings → Developer → API and copy your v4 API Key.' },
          { name: 'Connect in Sage → Contacts → Automations', text: 'In Appalix, go to Sage → Contacts → Automations, find the Kit card, click Connect, and paste your API Key and API Secret.' },
          { name: 'Confirm the connection', text: 'The Kit card shows a Connected badge. Contacts will sync to your Kit account as they are created or updated in Sage.' },
          { name: 'Pull existing Kit subscribers (optional)', text: 'Go to Forms → Sources, find the Kit card, and click Sync Now to import your existing subscribers into Appalix as leads.' },
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
            Kit is the go-to email platform for creators, course builders, and indie businesses. Connecting it
            to Appalix means every contact you add to Sage CRM is automatically added as a Kit subscriber —
            triggering your welcome sequences and automations instantly. You can also pull your existing
            subscribers into Appalix for AI lead scoring.
          </p>
        </div>

        <div className="border-t border-white/10 mb-10" />

        <div className="prose prose-invert prose-brand max-w-none space-y-10 text-gray-300">

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What you&apos;ll need</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>An <strong className="text-white">Appalix account</strong> on Pro plan or above</li>
              <li>A <strong className="text-white">Kit account</strong> (any plan)</li>
              <li>Your Kit <strong className="text-white">v4 API Key</strong></li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 1 — Find your Kit API credentials</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Log in to <strong className="text-white">Kit</strong> and click your account name (top-right).</li>
              <li>Go to <strong className="text-white">Settings → Developer → API</strong>.</li>
              <li>Copy your <strong className="text-white">v4 API Key</strong> — this is the key labelled <em>API Key</em> (not the legacy v3 Secret).</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 2 — Connect in Sage → Contacts → Automations</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>In Appalix, navigate to <strong className="text-white">Sage → Contacts</strong> and click <strong className="text-white">Automations</strong> in the top-right.</li>
              <li>Find the <strong className="text-white">Kit (ConvertKit)</strong> card and click <strong className="text-white">Connect</strong>.</li>
              <li>Paste your <strong>v4 API Key</strong> and click <strong className="text-white">Save &amp; Connect</strong>.</li>
              <li>The card shows a green <em>Connected</em> badge.</li>
            </ol>
            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-400">
              <strong className="text-white">Auto Sync toggle:</strong> Once connected, enable <strong className="text-white">Auto Sync</strong> on the card to automatically push new and updated Sage contacts to Kit as subscribers.
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What the integration does</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-white">Outbound contact sync</strong> — contacts created or updated in Sage are pushed to Kit as subscribers, triggering your welcome sequences.</li>
              <li><strong className="text-white">Sequence triggers</strong> — Kit automations that start on subscriber creation will fire automatically when contacts are pushed.</li>
              <li><strong className="text-white">Inbound pull sync</strong> — pull your existing Kit subscribers into Appalix on demand from <strong className="text-white">Forms → Sources → Sync Now</strong>.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Pulling Kit subscribers into Forms</h2>
            <p>
              Once connected, you can import your existing Kit subscribers into <strong className="text-white">Forms → Sources</strong>.
            </p>
            <ol className="list-decimal pl-5 space-y-3 mt-3">
              <li>Navigate to <strong className="text-white">Forms → Sources</strong> in Appalix.</li>
              <li>Find the <strong className="text-white">Kit (ConvertKit)</strong> card in the Email Marketing Platforms section.</li>
              <li>Click <strong className="text-white">Sync Now</strong>. Appalix fetches all active subscribers from your Kit account.</li>
              <li>A result banner shows how many contacts were imported and how many were skipped as duplicates.</li>
              <li>Imported contacts appear immediately in <strong className="text-white">Forms → All Leads</strong> with a Kit platform badge.</li>
            </ol>
            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-400">
              <strong className="text-white">Deduplication:</strong> Before inserting, Appalix checks whether a lead with the same email already exists. Duplicates are skipped — you can run Sync Now multiple times safely.
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Frequently asked questions</h2>
            <div className="space-y-5">
              <div>
                <p className="font-semibold text-white">Which Kit plan do I need?</p>
                <p className="text-sm text-gray-400 mt-1">All Kit plans include API access. The v4 API Key is available on every plan under Settings → Developer → API.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Will existing Kit subscribers be updated?</p>
                <p className="text-sm text-gray-400 mt-1">Yes. Kit uses email as the unique identifier. If a subscriber with the same email already exists, it is updated rather than duplicated.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Are my API credentials stored securely?</p>
                <p className="text-sm text-gray-400 mt-1">Yes. Your API Key and Secret are stored encrypted in your workspace database and never exposed in plain text after saving.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Can I tag Kit subscribers from Appalix?</p>
                <p className="text-sm text-gray-400 mt-1">Tag support is on the roadmap. Currently, Appalix pushes subscriber email and first name. Tags can be applied manually in Kit or via Kit automations triggered by subscriber creation.</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-brand-600/10 border border-brand-600/20 p-6 text-center">
            <p className="text-2xl mb-3">✉️</p>
            <h3 className="text-lg font-semibold text-white mb-2">Ready to connect Kit?</h3>
            <p className="text-sm text-gray-400 mb-5">
              Go to Sage → Contacts → Automations and paste your Kit v4 API Key.
            </p>
            <Link
              href="/sage/contacts/automations"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Go to Automations →
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
