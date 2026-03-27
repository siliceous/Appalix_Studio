import Link from 'next/link'
import type { Metadata } from 'next'
import { ArticleSeo } from '@/components/marketing/article-seo'

export const metadata: Metadata = {
  title: 'Connect Freshdesk to Sage CRM — Create Support Tickets from Deals | Appalix',
  description:
    'Create Freshdesk support tickets directly from Sage CRM deals and contacts. Grab your Freshdesk API key, paste it into Sage Integrations, and sync ticket status back to the activity timeline.',
  keywords: [
    'Sage CRM Freshdesk integration',
    'Appalix Sage Freshdesk',
    'create Freshdesk ticket from CRM',
    'Freshdesk API key CRM',
    'CRM ticketing Freshdesk',
    'Sage support integration',
    'Freshdesk Sage sync',
  ],
  alternates: { canonical: 'https://appalix.ai/resources/connect-sage-freshdesk' },
  openGraph: {
    title: 'Connect Freshdesk to Sage CRM — Create Support Tickets from Deals | Appalix',
    description: 'Create Freshdesk tickets from Sage CRM deals. Step-by-step setup guide.',
    url: 'https://appalix.ai/resources/connect-sage-freshdesk',
    type: 'article',
    siteName: 'Appalix',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Connect Freshdesk to Sage CRM — Create Support Tickets from Deals | Appalix',
    description: 'Create Freshdesk tickets from Sage CRM deals. Step-by-step setup guide.',
  },
}

export default function ConnectSageFreshdeskPage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <ArticleSeo
        type="HowTo"
        title="Connect Freshdesk to Sage CRM"
        description="Create Freshdesk support tickets directly from Sage CRM deals and contacts. Ticket status syncs back to the Sage activity timeline automatically."
        slug="connect-sage-freshdesk"
        datePublished="2026-03-02"
        steps={[
          { name: 'Find your Freshdesk API key', text: 'In Freshdesk, click your profile avatar → Profile Settings → Your API Key section. Copy the key.' },
          { name: 'Paste your domain and API key into Sage', text: 'In Appalix, go to Sage → Integrations, click Connect on the Freshdesk card, enter your Freshdesk domain (e.g. yourcompany.freshdesk.com) and your API key, then click Save & Connect.' },
          { name: 'Create your first ticket from a deal', text: 'Open any deal in Sage, click the Freshdesk button in the activity panel, fill in the ticket details, and click Create Ticket. The ticket link appears in the deal timeline.' },
        ]}
      />
      <div className="max-w-3xl mx-auto">

        <div className="flex items-center gap-2 text-sm text-white/60 mb-10">
          <Link href="/resources" className="hover:text-brand-400 transition-colors">Resources</Link>
          <span>/</span>
          <span className="text-white/65">Connect Freshdesk to Sage</span>
        </div>

        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-400 border border-brand-600/20 font-medium">Tutorial</span>
            <span className="text-xs text-white/60">5 min read · Pro+ plan</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            Connect Freshdesk to Sage CRM
          </h1>
          <p className="text-white/65 text-lg leading-relaxed">
            Bridging your CRM and support desk means your sales and support teams always have the same context. Connect Freshdesk to Sage and create tickets directly from deal records — the ticket status syncs back to the activity timeline so you can track support alongside the sales process.
          </p>
        </div>

        <div className="border-t border-white/10 mb-10" />

        <div className="prose prose-invert prose-brand max-w-none space-y-10 text-white/80">

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What you&apos;ll need</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>An <strong className="text-white">Appalix account</strong> on the Pro plan or above</li>
              <li>A <strong className="text-white">Freshdesk account</strong> — free tier is supported</li>
              <li>Your Freshdesk <strong className="text-white">subdomain</strong> (e.g. <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300 text-xs">yourcompany.freshdesk.com</code>)</li>
              <li>A Freshdesk <strong className="text-white">API key</strong> — agent-level access is sufficient</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 1 — Find your Freshdesk API key</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Log in to your Freshdesk account at <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300 text-xs">yourcompany.freshdesk.com</code>.</li>
              <li>Click your <strong className="text-white">profile avatar</strong> in the top-right corner.</li>
              <li>Select <strong className="text-white">Profile Settings</strong>.</li>
              <li>Scroll down to the <strong className="text-white">Your API Key</strong> section on the right side of the page.</li>
              <li>Click <strong className="text-white">Copy</strong> to copy the key.</li>
            </ol>
            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white/65">
              <strong className="text-white">Tip:</strong> If you can&apos;t see the API Key section, ask your Freshdesk admin to enable API access for your account under Admin → Agents → Edit agent.
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 2 — Paste your credentials into Sage</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>In Appalix, go to <strong className="text-white">Sage → Integrations</strong>.</li>
              <li>Under the <strong className="text-white">Tickets</strong> section, find the <strong className="text-white">Freshdesk</strong> card and click <strong className="text-white">Connect</strong>.</li>
              <li>
                Enter your <strong className="text-white">Domain</strong> — the full subdomain, for example:{' '}
                <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300 text-xs">yourcompany.freshdesk.com</code>
              </li>
              <li>Paste your <strong className="text-white">API Key</strong> into the API Key field.</li>
              <li>Click <strong className="text-white">Save &amp; Connect</strong>.</li>
            </ol>
            <p className="mt-4">Sage will verify the credentials by making a test API call to your Freshdesk domain. A green &quot;Connected&quot; badge will appear if successful.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">How it works</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Open any <strong className="text-white">deal</strong> in Sage and look for the <strong className="text-white">Create Ticket</strong> option in the activity panel.</li>
              <li>Fill in the ticket subject, description, and priority. The requester email is pre-filled from the primary contact.</li>
              <li>Click <strong className="text-white">Create Ticket</strong>. A new ticket is created in Freshdesk and a link is logged to the deal&apos;s activity timeline.</li>
              <li>When the ticket status changes in Freshdesk (e.g. from Open to Resolved), the update syncs back to the Sage timeline automatically.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Frequently asked questions</h2>
            <div className="space-y-5">
              <div>
                <p className="font-semibold text-white">Which Freshdesk plan do I need?</p>
                <p className="text-sm text-white/65 mt-1">Freshdesk&apos;s free tier (Sprout) supports API access, so you can use this integration at no extra cost on Freshdesk&apos;s side.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Will tickets created in Freshdesk directly (not via Sage) also appear in the timeline?</p>
                <p className="text-sm text-white/65 mt-1">Only tickets created through Sage are linked to deals and logged to the timeline. Tickets created independently in Freshdesk are not automatically associated with a deal.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Can I link multiple tickets to the same deal?</p>
                <p className="text-sm text-white/65 mt-1">Yes — you can create as many tickets as you need from a deal. Each one is logged as a separate activity item with a direct link to the Freshdesk ticket.</p>
              </div>
              <div>
                <p className="font-semibold text-white">How do I disconnect?</p>
                <p className="text-sm text-white/65 mt-1">Click <strong className="text-white">Disconnect</strong> on the Freshdesk card in Sage Integrations. Existing ticket links in timelines remain visible but no new tickets can be created until reconnected.</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-brand-600/10 border border-brand-600/20 p-6 text-center mt-12">
            <p className="text-2xl mb-3">🎫</p>
            <h3 className="text-lg font-semibold text-white mb-2">Ready to connect Freshdesk to Sage?</h3>
            <p className="text-sm text-white/65 mb-5">
              Grab your Freshdesk API key, paste it into Sage Integrations, and start creating support tickets directly from your CRM deals.
            </p>
            <Link
              href="/sage/integrations"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Go to Sage Integrations →
            </Link>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-white/10 flex items-center justify-between flex-wrap gap-4">
          <Link href="/resources" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            ← Back to Resources
          </Link>
          <Link href="/sage/integrations" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            Sage Integrations →
          </Link>
        </div>

      </div>
    </div>
  )
}
