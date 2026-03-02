import Link from 'next/link'
import type { Metadata } from 'next'
import { ArticleSeo } from '@/components/marketing/article-seo'

export const metadata: Metadata = {
  title: 'Connect Stripe to Sage CRM — Invoice & Payment Tutorial | Appalix',
  description:
    'Create and send invoices directly from Sage deal records using Stripe. Get your Stripe Secret Key, paste it into Sage Integrations, and start billing from your CRM in minutes.',
  keywords: [
    'Sage CRM Stripe integration',
    'Appalix Sage Stripe',
    'CRM invoicing Stripe',
    'Stripe API key CRM',
    'send invoice from CRM',
    'Stripe payment CRM',
    'Sage billing integration',
  ],
  alternates: { canonical: 'https://appalix.ai/resources/connect-sage-stripe' },
  openGraph: {
    title: 'Connect Stripe to Sage CRM — Invoice & Payment Tutorial | Appalix',
    description: 'Create and send invoices directly from Sage deal records using Stripe. Step-by-step guide.',
    url: 'https://appalix.ai/resources/connect-sage-stripe',
    type: 'article',
    siteName: 'Appalix',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Connect Stripe to Sage CRM — Invoice & Payment Tutorial | Appalix',
    description: 'Create and send invoices directly from Sage deal records using Stripe. Step-by-step guide.',
  },
}

export default function ConnectSageStripePage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <ArticleSeo
        type="HowTo"
        title="Connect Stripe to Sage CRM"
        description="Create and send invoices directly from Sage deal records using Stripe. Get your Stripe Secret Key, paste it into Sage Integrations, and start billing from your CRM in minutes."
        slug="connect-sage-stripe"
        datePublished="2026-03-02"
        steps={[
          { name: 'Get your Stripe Secret Key', text: 'In the Stripe Dashboard go to Developers → API keys, copy your Secret key (starts with sk_live_ or sk_test_).' },
          { name: 'Paste the key into Sage', text: 'In Appalix, navigate to Sage → Integrations, click Connect on the Stripe card, paste your Secret Key, and click Save & Connect.' },
          { name: 'Create an invoice from a deal', text: 'Open any deal in Sage, click the Stripe invoice action, enter the amount and description, and send — Stripe handles delivery and payment tracking.' },
        ]}
      />
      <div className="max-w-3xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-10">
          <Link href="/resources" className="hover:text-brand-400 transition-colors">Resources</Link>
          <span>/</span>
          <span className="text-gray-400">Connect Stripe to Sage</span>
        </div>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-400 border border-brand-600/20 font-medium">Tutorial</span>
            <span className="text-xs text-gray-500">6 min read · Pro+ plan</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            Connect Stripe to Sage CRM
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Once Stripe is connected to Sage, you can create and send payment invoices directly from any deal record — without leaving your CRM. Stripe handles delivery, payment collection, and receipts, while the status syncs back to your deal&apos;s activity timeline.
          </p>
        </div>

        <div className="border-t border-white/10 mb-10" />

        <div className="prose prose-invert prose-brand max-w-none space-y-10 text-gray-300">

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What you&apos;ll need</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>An <strong className="text-white">Appalix account</strong> on the Pro plan or above</li>
              <li>A <strong className="text-white">Stripe account</strong> — free to sign up at stripe.com</li>
              <li>Your <strong className="text-white">Stripe Secret Key</strong> — you&apos;ll retrieve this in Step 1</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 1 — Get your Stripe Secret Key</h2>
            <p>
              Stripe uses Secret Keys to authenticate API requests. Sage needs this key to create invoices on your behalf.
            </p>
            <ol className="list-decimal pl-5 space-y-3 mt-4">
              <li>Log in to your <strong className="text-white">Stripe Dashboard</strong> at dashboard.stripe.com.</li>
              <li>In the top navigation, click <strong className="text-white">Developers</strong>.</li>
              <li>Click <strong className="text-white">API keys</strong> in the left menu.</li>
              <li>
                Under <strong className="text-white">Standard keys</strong>, click <strong className="text-white">Reveal test key</strong> next to the Secret key.
              </li>
              <li>
                Copy the key — it starts with <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">sk_live_</code> for live mode or <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">sk_test_</code> for test mode.
              </li>
            </ol>
            <div className="mt-4 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-sm text-yellow-300">
              <strong>Use restricted keys in production.</strong> Create a <strong>Restricted key</strong> (Developers → API keys → + Create restricted key) with only <em>Invoices: Write</em> and <em>Customers: Write</em> permissions. This limits exposure if the key is ever leaked.
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 2 — Connect Stripe in Sage</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>In Appalix, navigate to <strong className="text-white">Sage → Integrations</strong> in the left sidebar.</li>
              <li>Under the <strong className="text-white">Payments</strong> section, find the <strong className="text-white">Stripe</strong> card and click <strong className="text-white">Connect</strong>.</li>
              <li>Paste your Secret Key into the <strong className="text-white">Secret Key</strong> field.</li>
              <li>Click <strong className="text-white">Save &amp; Connect</strong>. The card will show a green <em>Connected</em> badge.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">How it works</h2>
            <p>Once connected, you can trigger invoice creation directly from any deal record in Sage:</p>
            <ul className="list-disc pl-5 mt-3 space-y-2">
              <li>Open a deal and click the <strong className="text-white">Send Invoice</strong> action</li>
              <li>Enter the invoice amount, currency, and line item description</li>
              <li>Sage creates a Stripe Customer (matched by the contact&apos;s email) and generates an invoice</li>
              <li>Stripe emails the invoice directly to the contact</li>
              <li>Payment status — <em>pending</em>, <em>paid</em>, <em>overdue</em> — is logged to the deal&apos;s activity timeline</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 3 — Test in Stripe test mode</h2>
            <p>Before going live, connect with your <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">sk_test_</code> key first. In test mode:</p>
            <ul className="list-disc pl-5 mt-3 space-y-2">
              <li>Invoices are created in Stripe but no real emails are sent</li>
              <li>View test invoices in your Stripe Dashboard under <strong className="text-white">Billing → Invoices</strong> (with test mode on)</li>
              <li>Use Stripe&apos;s test card <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">4242 4242 4242 4242</code> to simulate payment</li>
            </ul>
            <p className="mt-4">
              Once verified, return to Sage → Integrations, disconnect the test key, and reconnect with your live key.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Frequently asked questions</h2>
            <div className="space-y-5">
              <div>
                <p className="font-semibold text-white">Is my Stripe Secret Key stored securely?</p>
                <p className="text-sm text-gray-400 mt-1">Yes. All integration credentials are stored encrypted in your workspace database. They are never logged or exposed in the dashboard UI after saving.</p>
              </div>
              <div>
                <p className="font-semibold text-white">What currency does Sage use for invoices?</p>
                <p className="text-sm text-gray-400 mt-1">Sage uses the currency set on the deal (USD by default). You can change the deal currency from the deal edit form before generating an invoice.</p>
              </div>
              <div>
                <p className="font-semibold text-white">What Stripe plan do I need?</p>
                <p className="text-sm text-gray-400 mt-1">The Stripe Invoicing API is available on all Stripe plans. Stripe charges a small fee per paid invoice — check stripe.com/pricing for current rates.</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-brand-600/10 border border-brand-600/20 p-6 text-center mt-12">
            <p className="text-2xl mb-3">💳</p>
            <h3 className="text-lg font-semibold text-white mb-2">Ready to connect Stripe?</h3>
            <p className="text-sm text-gray-400 mb-5">
              Head to Sage Integrations and paste your Stripe key in under a minute.
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
