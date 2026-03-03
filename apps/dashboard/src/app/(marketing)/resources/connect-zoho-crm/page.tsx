import Link from 'next/link'
import type { Metadata } from 'next'
import { ArticleSeo } from '@/components/marketing/article-seo'

export const metadata: Metadata = {
  title: 'Connect Zoho CRM to Appalix — AI Lead Capture Tutorial',
  description:
    'Push AI chat leads into Zoho CRM Leads module automatically using an OAuth token. Covers both the quick Self Client method and production OAuth app setup. Step-by-step guide.',
  keywords: [
    'Zoho CRM Appalix integration',
    'Zoho CRM OAuth token API',
    'AI chatbot Zoho lead capture',
    'ZohoCRM modules leads API',
    'chatbot CRM automation Zoho',
    'Zoho Self Client access token',
    'AI sales agent Zoho',
    'Zoho Developer Console OAuth',
  ],
  alternates: { canonical: 'https://appalix.ai/resources/connect-zoho-crm' },
  openGraph: {
    title: 'Connect Zoho CRM to Appalix — AI Lead Capture Tutorial',
    description: 'Push AI chat leads into Zoho CRM Leads module automatically using an OAuth token. Step-by-step guide.',
    url: 'https://appalix.ai/resources/connect-zoho-crm',
    type: 'article',
    siteName: 'Appalix',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Connect Zoho CRM to Appalix — AI Lead Capture Tutorial',
    description: 'Push AI chat leads into Zoho CRM Leads module automatically using an OAuth token. Step-by-step guide.',
  },
}

export default function ConnectZohoCrmPage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <ArticleSeo
        type="HowTo"
        title="How to Connect Zoho CRM to Appalix"
        description="Push AI chat leads into Zoho CRM Leads module automatically using an OAuth token. Covers the quick Self Client method and production OAuth app setup."
        slug="connect-zoho-crm"
        datePublished="2026-02-26"
        steps={[
          { name: 'Generate a Zoho OAuth access token', text: 'Go to api-console.zoho.com, use Self Client for a quick token with ZohoCRM.modules.leads.CREATE scope, or create a Server-based OAuth app for production.' },
          { name: 'Connect Zoho CRM in Appalix', text: 'In Appalix Integrations, click Edit on your integration, scroll to CRM integration, select Zoho CRM, paste your OAuth access token, then save.' },
          { name: 'Test the integration', text: 'Open your Appalix chat preview, send a message with an email address, and verify the new lead appears in Zoho CRM under Modules → Leads.' },
        ]}
      />
      <div className="max-w-3xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-10">
          <Link href="/resources" className="hover:text-brand-400 transition-colors">Resources</Link>
          <span>/</span>
          <span className="text-gray-400">Connect Zoho CRM to Appalix</span>
        </div>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-400 border border-brand-600/20 font-medium">Tutorial</span>
            <span className="text-xs text-gray-500">9 min read · Pro+ plan</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            How to Connect Zoho CRM to Appalix
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Appalix pushes leads directly into Zoho CRM the moment a visitor shares their email or phone number in chat. Leads appear under the <em>Leads</em> module automatically. This guide walks you through getting a Zoho OAuth token and connecting it to Appalix in minutes.
          </p>
        </div>

        <div className="border-t border-white/10 mb-10" />

        <div className="prose prose-invert prose-brand max-w-none space-y-10 text-gray-300">

          {/* What you'll need */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What you&apos;ll need</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>An <strong className="text-white">Appalix account</strong> on the Pro plan or above</li>
              <li>A <strong className="text-white">Zoho CRM account</strong> — Standard plan or above (includes API access)</li>
              <li>A <strong className="text-white">Zoho OAuth access token</strong> with Leads scope (you&apos;ll generate this below)</li>
            </ul>
          </section>

          {/* About Zoho OAuth */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">About Zoho&apos;s OAuth tokens</h2>
            <p>
              Zoho uses OAuth 2.0 for all API access. To generate a token without building a full OAuth app, you can use the <strong className="text-white">Zoho Developer Console&apos;s Self Client</strong> — a tool that lets you generate a token for your own Zoho account without publishing an app.
            </p>
            <p className="mt-3">
              <strong className="text-white">Important:</strong> Self Client tokens expire after a short time. For production use, you should set up a proper OAuth app and use the refresh token flow. The steps below cover both approaches.
            </p>
          </section>

          {/* Step 1 - Self Client (quick) */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 1A — Quick method: Self Client token</h2>
            <p>Use this for testing or if you want a fast setup. Token expires in 1 hour.</p>
            <ol className="list-decimal pl-5 space-y-3 mt-4">
              <li>
                Go to <strong className="text-white">api-console.zoho.com</strong> and sign in with your Zoho account.
              </li>
              <li>
                Click <strong className="text-white">Self Client</strong> from the left sidebar.
              </li>
              <li>
                If prompted, click <strong className="text-white">Enable</strong> to activate the Self Client option.
              </li>
              <li>
                Under <strong className="text-white">Generate Code</strong>, enter the scope: <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">ZohoCRM.modules.leads.CREATE</code>
              </li>
              <li>
                Set a time duration (e.g. 10 minutes) and click <strong className="text-white">Create</strong>.
              </li>
              <li>
                Copy the grant code shown.
              </li>
              <li>
                Now exchange it for an access token. In your browser&apos;s address bar (or with curl), make a POST request to:
                <pre className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-brand-300 overflow-x-auto mt-3">{`POST https://accounts.zoho.com/oauth/v2/token
?grant_type=authorization_code
&client_id=YOUR_CLIENT_ID
&client_secret=YOUR_CLIENT_SECRET
&code=YOUR_GRANT_CODE`}</pre>
                The response includes an <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">access_token</code>. Copy it.
              </li>
            </ol>
          </section>

          {/* Step 1B - Proper OAuth app */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 1B — Recommended: Server-based OAuth app</h2>
            <p>For long-lived access without token expiry issues, create a proper OAuth app. The access token can be refreshed automatically.</p>
            <ol className="list-decimal pl-5 space-y-3 mt-4">
              <li>
                Go to <strong className="text-white">api-console.zoho.com</strong> → click <strong className="text-white">Add Client</strong>.
              </li>
              <li>
                Choose <strong className="text-white">Server-based Applications</strong>.
              </li>
              <li>
                Fill in:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>Client Name</strong>: <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">Appalix Integration</code></li>
                  <li><strong>Homepage URL</strong>: your website URL</li>
                  <li><strong>Authorized Redirect URIs</strong>: <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">https://appalix.ai</code> (or any valid URL — you&apos;ll extract the code from the redirect)</li>
                </ul>
              </li>
              <li>
                Click <strong className="text-white">Create</strong>. Copy the <strong>Client ID</strong> and <strong>Client Secret</strong>.
              </li>
              <li>
                Open this URL in your browser (replace <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">CLIENT_ID</code> with yours):
                <pre className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-brand-300 overflow-x-auto mt-3">{`https://accounts.zoho.com/oauth/v2/auth
?scope=ZohoCRM.modules.leads.CREATE
&client_id=CLIENT_ID
&response_type=code
&access_type=offline
&redirect_uri=https://appalix.ai`}</pre>
              </li>
              <li>
                Log in with your Zoho account and click <strong className="text-white">Accept</strong>.
              </li>
              <li>
                You&apos;ll be redirected to <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">https://appalix.ai?code=XXXX</code>. Copy the <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">code</code> value from the URL.
              </li>
              <li>
                Exchange for tokens:
                <pre className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-brand-300 overflow-x-auto mt-3">{`POST https://accounts.zoho.com/oauth/v2/token
?grant_type=authorization_code
&client_id=YOUR_CLIENT_ID
&client_secret=YOUR_CLIENT_SECRET
&redirect_uri=https://appalix.ai
&code=YOUR_CODE`}</pre>
                The response gives you an <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">access_token</code> and a <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">refresh_token</code>. Use the access token in Appalix.
              </li>
            </ol>
          </section>

          {/* Step 2 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 2 — Connect Zoho CRM in Appalix</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>
                In Appalix, go to <strong className="text-white">Integrations</strong> and click <strong className="text-white">Edit</strong> on the integration you want to connect.
              </li>
              <li>
                Scroll to <strong className="text-white">CRM integration</strong> and select <strong className="text-white">Zoho CRM</strong> from the provider dropdown.
              </li>
              <li>
                Paste your OAuth access token in the <strong className="text-white">OAuth access token</strong> field.
              </li>
              <li>
                Click <strong className="text-white">Save changes</strong>.
              </li>
            </ol>
          </section>

          {/* What gets created */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What gets created in Zoho CRM</h2>
            <p>
              Appalix creates a record in the <strong className="text-white">Leads</strong> module with:
            </p>
            <ul className="list-disc pl-5 mt-3 space-y-1">
              <li><strong className="text-white">Email</strong> — the visitor&apos;s email address</li>
              <li><strong className="text-white">Phone</strong> — the visitor&apos;s phone number (if captured)</li>
              <li><strong className="text-white">Lead Source</strong> — set to <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">Chat</code></li>
              <li><strong className="text-white">Last Name</strong> — set to <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">Chat Lead</code> (required by Zoho; update manually once you know the visitor&apos;s name)</li>
            </ul>
          </section>

          {/* Step 3 - Test */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 3 — Test the integration</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>
                Open the live chat preview for your Appalix integration.
              </li>
              <li>
                Send a message with an email: <em>&quot;Hi, I&apos;m interested — my email is test@company.com&quot;</em>.
              </li>
              <li>
                In Zoho CRM, go to <strong className="text-white">Modules → Leads</strong>. The new lead should appear within a few seconds.
              </li>
            </ol>
            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-400">
              <strong className="text-white">Note on token expiry:</strong> Zoho access tokens expire after 1 hour. If you see leads stop flowing in after a while, your token may have expired. For production, use the refresh token approach (Step 1B) and re-generate a fresh access token when needed. Full automatic token refresh support is coming to Appalix — until then, refresh manually when prompted.
            </div>
          </section>

          {/* FAQ */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Frequently asked questions</h2>

            <div className="space-y-5">
              <div>
                <p className="font-semibold text-white">Which Zoho CRM plans support the API?</p>
                <p className="text-sm text-gray-400 mt-1">Zoho CRM Standard, Professional, Enterprise, and Ultimate plans include REST API access. The free plan does not include API access.</p>
              </div>
              <div>
                <p className="font-semibold text-white">What is the correct data centre URL?</p>
                <p className="text-sm text-gray-400 mt-1">Appalix uses the default <code className="bg-white/10 px-1 py-0.5 rounded text-brand-300">https://www.zohoapis.com</code> endpoint, which routes to your correct data centre automatically. If you&apos;re on the EU data centre, use <code className="bg-white/10 px-1 py-0.5 rounded text-brand-300">https://www.zohoapis.eu</code> — contact Appalix support if you need a custom endpoint.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Can I use Zapier with Zoho CRM instead?</p>
                <p className="text-sm text-gray-400 mt-1">Yes — select <em>Zapier</em> in the CRM provider dropdown (Core plan), paste a Zapier Catch Hook URL, then add a Zoho CRM action in Zapier to create a Lead record.</p>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="rounded-2xl bg-brand-600/10 border border-brand-600/20 p-6 text-center mt-12">
            <p className="text-2xl mb-3">🔵</p>
            <h3 className="text-lg font-semibold text-white mb-2">Ready to connect Zoho CRM?</h3>
            <p className="text-sm text-gray-400 mb-5">
              Paste your Zoho OAuth token in Appalix and leads will start flowing into your CRM automatically.
            </p>
            <Link
              href="/integrations/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Go to Integrations →
            </Link>
          </section>

        </div>

        {/* Footer nav */}
        <div className="mt-16 pt-8 border-t border-white/10 flex items-center justify-between flex-wrap gap-4">
          <Link href="/resources" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            ← Back to Resources
          </Link>
          <Link href="/platforms" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            View all integrations →
          </Link>
        </div>

      </div>
    </div>
  )
}
