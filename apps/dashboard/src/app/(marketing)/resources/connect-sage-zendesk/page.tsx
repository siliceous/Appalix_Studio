import Link from 'next/link'
import type { Metadata } from 'next'
import { ArticleSeo } from '@/components/marketing/article-seo'

export const metadata: Metadata = {
  title: 'Connect Zendesk to Sage CRM — Create Support Tickets from Deals | Appalix',
  description:
    'Create Zendesk support tickets directly from Sage CRM deals and contacts. Add your Zendesk subdomain, agent email, and API token to Sage Integrations, and sync ticket status back to the activity timeline.',
  keywords: [
    'Sage CRM Zendesk integration',
    'Appalix Sage Zendesk',
    'create Zendesk ticket from CRM',
    'Zendesk API token CRM',
    'CRM ticketing Zendesk',
    'Sage support integration Zendesk',
    'Zendesk Sage sync',
  ],
  alternates: { canonical: 'https://appalix.ai/resources/connect-sage-zendesk' },
  openGraph: {
    title: 'Connect Zendesk to Sage CRM — Create Support Tickets from Deals | Appalix',
    description: 'Create Zendesk tickets from Sage CRM deals. Step-by-step setup guide.',
    url: 'https://appalix.ai/resources/connect-sage-zendesk',
    type: 'article',
    siteName: 'Appalix',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Connect Zendesk to Sage CRM — Create Support Tickets from Deals | Appalix',
    description: 'Create Zendesk tickets from Sage CRM deals. Step-by-step setup guide.',
  },
}

export default function ConnectSageZendeskPage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <ArticleSeo
        type="HowTo"
        title="Connect Zendesk to Sage CRM"
        description="Create Zendesk support tickets directly from Sage CRM deals and contacts. Ticket status syncs back to the Sage activity timeline automatically."
        slug="connect-sage-zendesk"
        datePublished="2026-03-02"
        steps={[
          { name: 'Generate a Zendesk API token', text: 'In Zendesk Admin Centre, go to Channels → API → Settings tab, enable Token access, click Add API token, name it "Appalix Sage", and copy the generated token.' },
          { name: 'Paste your credentials into Sage', text: 'In Appalix, go to Sage → Integrations, click Connect on the Zendesk card, enter your subdomain, agent email, and API token, then click Save & Connect.' },
          { name: 'Create your first ticket from a deal', text: 'Open any deal in Sage, click the Zendesk button in the activity panel, fill in the ticket subject and description, and click Create Ticket. The ticket link appears in the deal timeline.' },
        ]}
      />
      <div className="max-w-3xl mx-auto">

        <div className="flex items-center gap-2 text-sm text-white/60 mb-10">
          <Link href="/resources" className="hover:text-brand-400 transition-colors">Resources</Link>
          <span>/</span>
          <span className="text-white/65">Connect Zendesk to Sage</span>
        </div>

        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-400 border border-brand-600/20 font-medium">Tutorial</span>
            <span className="text-xs text-white/60">5 min read · Pro+ plan</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            Connect Zendesk to Sage CRM
          </h1>
          <p className="text-white/65 text-lg leading-relaxed">
            Connect Zendesk to Sage and create support tickets directly from deal records — without switching tabs. Ticket status updates sync back to the Sage activity timeline, so your sales team can see open support issues alongside the full deal history.
          </p>
        </div>

        <div className="border-t border-white/10 mb-10" />

        <div className="prose prose-invert prose-brand max-w-none space-y-10 text-white/80">

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What you&apos;ll need</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>An <strong className="text-white">Appalix account</strong> on the Pro plan or above</li>
              <li>A <strong className="text-white">Zendesk account</strong> with admin access (to generate an API token)</li>
              <li>Your Zendesk <strong className="text-white">subdomain</strong> — the part before <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300 text-xs">.zendesk.com</code> (e.g. <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300 text-xs">yourcompany</code>)</li>
              <li>An agent <strong className="text-white">email address</strong> associated with the API token</li>
              <li>A Zendesk <strong className="text-white">API token</strong> — generated in Admin Centre</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 1 — Generate a Zendesk API token</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>In Zendesk, click the <strong className="text-white">Admin Centre</strong> icon (cog) in the left sidebar.</li>
              <li>Go to <strong className="text-white">Apps and integrations → Zendesk API</strong>.</li>
              <li>Click the <strong className="text-white">Settings</strong> tab and enable <strong className="text-white">Token access</strong> if it is not already enabled.</li>
              <li>Click the <strong className="text-white">Add API token</strong> button.</li>
              <li>Enter a description — for example, <strong className="text-white">Appalix Sage</strong> — and click <strong className="text-white">Create</strong>.</li>
              <li>Copy the generated token. It will only be shown once.</li>
            </ol>
            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white/65">
              <strong className="text-white">Admin note:</strong> If you don&apos;t see the API section, your Zendesk plan may not support token-based API access. The Team plan and above support API tokens.
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 2 — Paste your credentials into Sage</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>In Appalix, go to <strong className="text-white">Sage → Integrations</strong>.</li>
              <li>Under the <strong className="text-white">Tickets</strong> section, find the <strong className="text-white">Zendesk</strong> card and click <strong className="text-white">Connect</strong>.</li>
              <li>
                Enter your <strong className="text-white">Subdomain</strong> — just the subdomain part, not the full URL. For example, if your Zendesk URL is <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300 text-xs">yourcompany.zendesk.com</code>, enter <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300 text-xs">yourcompany</code>.
              </li>
              <li>Enter the <strong className="text-white">Email</strong> address of the Zendesk agent whose API token you generated.</li>
              <li>Paste the <strong className="text-white">API Token</strong>.</li>
              <li>Click <strong className="text-white">Save &amp; Connect</strong>.</li>
            </ol>
            <p className="mt-4">Sage authenticates using the <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300 text-xs">email/token</code> pattern supported by the Zendesk API. A green &quot;Connected&quot; badge confirms the connection.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">How it works</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Open any <strong className="text-white">deal</strong> in Sage and look for the <strong className="text-white">Create Ticket</strong> option in the activity panel.</li>
              <li>Fill in the ticket subject and description. The requester email is pre-filled from the deal&apos;s primary contact.</li>
              <li>Click <strong className="text-white">Create Ticket</strong>. A new Zendesk ticket is created and a link is logged to the deal&apos;s activity timeline.</li>
              <li>When the ticket status changes in Zendesk (e.g. Open → Solved), the update is reflected in the Sage timeline.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Frequently asked questions</h2>
            <div className="space-y-5">
              <div>
                <p className="font-semibold text-white">Which Zendesk plan supports API tokens?</p>
                <p className="text-sm text-white/65 mt-1">API token access is available on Zendesk&apos;s Team plan and above. The free trial also supports API tokens.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Can I use any agent&apos;s email, or does it need to be an admin?</p>
                <p className="text-sm text-white/65 mt-1">You need admin access to generate an API token, but you can generate it under your own agent account. The email and token pair must belong to the same Zendesk user.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Will tickets submitted by customers (not via Sage) appear in the deal timeline?</p>
                <p className="text-sm text-white/65 mt-1">Only tickets created through Sage are automatically linked to deals. You can manually log a Zendesk ticket URL as a note on a deal to keep a record.</p>
              </div>
              <div>
                <p className="font-semibold text-white">How do I rotate the API token?</p>
                <p className="text-sm text-white/65 mt-1">Generate a new token in Zendesk Admin Centre, then click <strong className="text-white">Disconnect</strong> in Sage Integrations and reconnect with the new token. The old token should then be deleted from Zendesk.</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-brand-600/10 border border-brand-600/20 p-6 text-center mt-12">
            <p className="text-2xl mb-3">🛟</p>
            <h3 className="text-lg font-semibold text-white mb-2">Ready to connect Zendesk to Sage?</h3>
            <p className="text-sm text-white/65 mb-5">
              Generate your Zendesk API token, paste it into Sage Integrations, and start creating support tickets directly from your CRM deals.
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
