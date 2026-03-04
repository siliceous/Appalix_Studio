import Link from 'next/link'
import type { Metadata } from 'next'
import { ArticleSeo } from '@/components/marketing/article-seo'

export const metadata: Metadata = {
  title: 'Connect Mailchimp to Appalix — Sync Contacts & Import Leads',
  description:
    'Connect Mailchimp to Appalix in under 3 minutes. Sync your audience contacts into the Appalix Forms section for AI lead analysis and CRM handoff — no Zapier required.',
  keywords: [
    'Mailchimp Appalix integration',
    'Mailchimp contact sync',
    'Mailchimp leads import',
    'Appalix Mailchimp tutorial',
    'email marketing lead capture',
  ],
  alternates: { canonical: 'https://appalix.ai/resources/connect-mailchimp' },
  openGraph: {
    title: 'Connect Mailchimp to Appalix — Sync Contacts & Import Leads',
    description: 'Connect Mailchimp to Appalix and pull your audience into the Forms section for AI lead scoring and CRM handoff.',
    url: 'https://appalix.ai/resources/connect-mailchimp',
    type: 'article',
    siteName: 'Appalix',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Connect Mailchimp to Appalix — Sync Contacts & Import Leads',
    description: 'Connect Mailchimp to Appalix and pull your audience into the Forms section for AI lead scoring and CRM handoff.',
  },
}

export default function ConnectMailchimpPage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <ArticleSeo
        type="HowTo"
        title="Connect Mailchimp to Appalix"
        description="Connect Mailchimp to Appalix in under 3 minutes. Sync your audience contacts into the Appalix Forms section for AI lead analysis and CRM handoff."
        slug="connect-mailchimp"
        datePublished="2026-03-04"
        steps={[
          { name: 'Find your Mailchimp credentials', text: 'In Mailchimp, go to Account → Extras → API Keys to generate an API key. Note your server prefix from your API URL (e.g. us1) and your Audience ID from Audience → Settings.' },
          { name: 'Connect in Sage → Integrations', text: 'In Appalix, go to Sage → Integrations → Email Marketing, find the Mailchimp card, click Connect, and paste your API key, server prefix, and Audience ID.' },
          { name: 'Sync contacts into Forms', text: 'Navigate to Forms → Sources. A Mailchimp sync card appears automatically. Click Sync Now to import your subscribers as leads.' },
          { name: 'Review leads in All Leads', text: 'Go to Forms → All Leads. Imported contacts appear with a Mailchimp badge, scored automatically based on field completeness.' },
        ]}
      />

      <div className="max-w-3xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-10">
          <Link href="/resources" className="hover:text-brand-400 transition-colors">Resources</Link>
          <span>/</span>
          <span className="text-gray-400">Connect Mailchimp</span>
        </div>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-400 border border-brand-600/20 font-medium">Tutorial</span>
            <span className="text-xs text-gray-500">6 min read · Pro+ plan</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            Connect Mailchimp to Appalix
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Connecting Mailchimp gives you two things: contact sync into Sage CRM when you create or update contacts,
            and the ability to pull your entire Mailchimp audience into Appalix Forms for AI-assisted lead scoring
            and one-click CRM handoff. Setup takes under 3 minutes.
          </p>
        </div>

        <div className="border-t border-white/10 mb-10" />

        <div className="prose prose-invert prose-brand max-w-none space-y-10 text-gray-300">

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What you&apos;ll need</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>An <strong className="text-white">Appalix account</strong> on Pro plan or above</li>
              <li>A <strong className="text-white">Mailchimp account</strong> with at least one Audience (list)</li>
              <li>Your Mailchimp <strong className="text-white">API Key</strong>, <strong className="text-white">Server Prefix</strong>, and <strong className="text-white">Audience ID</strong> (details in Step 1)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What the integration does</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-white">Contact sync (Sage CRM)</strong> — when you create or update contacts in Sage, Appalix can push them to your Mailchimp audience as subscribers.</li>
              <li><strong className="text-white">Lead import (Forms)</strong> — pull your existing Mailchimp subscribers into Appalix Forms → All Leads for AI scoring and CRM pipeline handoff. Runs on demand with the Sync Now button.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 1 — Get your Mailchimp credentials</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>
                Log in to <strong className="text-white">Mailchimp</strong> and click your profile name (top right) → <strong className="text-white">Account &amp; billing</strong>.
              </li>
              <li>
                Go to <strong className="text-white">Extras → API Keys</strong> and click <strong className="text-white">Create A Key</strong>. Copy the key — it won&apos;t be shown again.
              </li>
              <li>
                Your <strong className="text-white">Server Prefix</strong> is the subdomain in your Mailchimp URL. If your URL is <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">https://us6.admin.mailchimp.com</code>, your prefix is <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">us6</code>.
              </li>
              <li>
                Your <strong className="text-white">Audience ID</strong> is in Mailchimp → <strong className="text-white">Audience → All contacts → Settings → Audience name and defaults</strong>. Look for &quot;Audience ID&quot; in the right column.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 2 — Connect in Sage → Integrations</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>In Appalix, navigate to <strong className="text-white">Sage → Integrations</strong> in the left sidebar.</li>
              <li>Scroll to the <strong className="text-white">Email Marketing</strong> section and find the <strong className="text-white">Mailchimp</strong> card.</li>
              <li>Click <strong className="text-white">Connect</strong> to expand the form.</li>
              <li>
                Enter:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>API Key</strong> — the key you generated in Step 1</li>
                  <li><strong>Server Prefix</strong> — e.g. <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">us6</code></li>
                  <li><strong>Audience ID</strong> — the ID from Audience Settings</li>
                </ul>
              </li>
              <li>Click <strong className="text-white">Save &amp; Connect</strong>. The card shows a green <em>Connected</em> badge.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 3 — Import contacts into Forms</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Navigate to <strong className="text-white">Forms → Sources</strong>. A <strong className="text-white">Mailchimp</strong> sync card appears in the Email Platform Sync section.</li>
              <li>Click <strong className="text-white">Sync Now</strong>. Appalix fetches all subscribed contacts from your audience in batches of 1,000.</li>
              <li>A banner shows the result: <em>e.g. &quot;Synced 847 contacts, skipped 23 duplicates&quot;</em>.</li>
              <li>Go to <strong className="text-white">Forms → All Leads</strong> to see your imported contacts with a Mailchimp badge.</li>
            </ol>
            <div className="mt-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm text-blue-300">
              <strong>Deduplication:</strong> Contacts with an email or phone already in your leads are skipped automatically — you can run the sync as many times as you like without creating duplicates.
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What fields are imported</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-white">Name</strong> — from <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">full_name</code> or <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">FNAME + LNAME</code> merge fields</li>
              <li><strong className="text-white">Email</strong> — subscriber email address</li>
              <li><strong className="text-white">Phone</strong> — from <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">PHONE</code> merge field (if present)</li>
              <li><strong className="text-white">Company</strong> — from <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">COMPANY</code> merge field (if present)</li>
            </ul>
            <p className="mt-3 text-sm">
              Only subscribed contacts are fetched — unsubscribed, cleaned, and pending contacts are excluded by default.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Frequently asked questions</h2>
            <div className="space-y-5">
              <div>
                <p className="font-semibold text-white">Does syncing write anything back to Mailchimp?</p>
                <p className="text-sm text-gray-400 mt-1">No. The Forms sync is read-only — it pulls contacts from Mailchimp into Appalix. No data is written back to your Mailchimp audience during a sync.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Can I sync multiple Mailchimp audiences?</p>
                <p className="text-sm text-gray-400 mt-1">One audience per workspace is supported. To sync a different audience, update the Audience ID in Sage → Integrations → Mailchimp and run Sync Now again.</p>
              </div>
              <div>
                <p className="font-semibold text-white">How do I move a Mailchimp contact into my CRM pipeline?</p>
                <p className="text-sm text-gray-400 mt-1">In Forms → All Leads, click <strong>Pipeline</strong> on any Mailchimp lead. This creates a Sage Contact and Deal in the first stage of your first pipeline automatically.</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-brand-600/10 border border-brand-600/20 p-6 text-center">
            <p className="text-2xl mb-3">🐒</p>
            <h3 className="text-lg font-semibold text-white mb-2">Ready to connect Mailchimp?</h3>
            <p className="text-sm text-gray-400 mb-5">
              Go to Sage → Integrations → Email Marketing to paste your API key and get started.
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
          <Link href="/resources/forms-lead-ads-guide" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            ← Forms complete guide
          </Link>
          <Link href="/resources/connect-activecampaign" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            Connect ActiveCampaign →
          </Link>
        </div>

      </div>
    </div>
  )
}
