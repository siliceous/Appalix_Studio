import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'How to Connect Salesforce to Appalix | Step-by-Step Guide',
  description:
    'Create Salesforce Lead records automatically when visitors share contact details in your Appalix AI chat. Uses an OAuth access token and your Salesforce instance URL.',
  keywords: [
    'Salesforce Appalix integration',
    'Salesforce REST API lead creation',
    'AI chatbot Salesforce CRM',
    'Salesforce OAuth access token',
    'chatbot lead capture Salesforce',
  ],
}

export default function ConnectSalesforcePage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <div className="max-w-3xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-10">
          <Link href="/resources" className="hover:text-brand-400 transition-colors">Resources</Link>
          <span>/</span>
          <span className="text-gray-400">Connect Salesforce to Appalix</span>
        </div>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-400 border border-brand-600/20 font-medium">Tutorial</span>
            <span className="text-xs text-gray-500">10 min read · Pro+ plan</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            How to Connect Salesforce to Appalix
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            With Appalix&apos;s native Salesforce integration, every lead your AI agent captures is automatically created as a <em>Lead</em> record in Salesforce. You&apos;ll need two things: a Salesforce OAuth access token and your Salesforce instance URL. This guide covers how to get both.
          </p>
        </div>

        <div className="border-t border-white/10 mb-10" />

        <div className="prose prose-invert prose-brand max-w-none space-y-10 text-gray-300">

          {/* What you'll need */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What you&apos;ll need</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>An <strong className="text-white">Appalix account</strong> on the Pro plan or above</li>
              <li>A <strong className="text-white">Salesforce account</strong> with API access (Professional, Enterprise, Unlimited, or Developer edition)</li>
              <li>A <strong className="text-white">Salesforce OAuth access token</strong> — you&apos;ll get this via a Connected App</li>
              <li>Your <strong className="text-white">Salesforce instance URL</strong> — e.g. <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">https://yourcompany.my.salesforce.com</code></li>
            </ul>
            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-400">
              <strong className="text-white">Salesforce editions:</strong> API access is available on Professional, Enterprise, Unlimited, Performance, and Developer editions. The Essentials and free Trial editions do not include API access.
            </div>
          </section>

          {/* Find instance URL */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 1 — Find your Salesforce instance URL</h2>
            <p>Your instance URL is the base URL of your Salesforce org — everything before <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">/lightning</code> or <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">/apex</code>.</p>
            <ol className="list-decimal pl-5 space-y-3 mt-4">
              <li>
                Log in to Salesforce. Look at the URL in your browser. It will look like: <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">https://yourcompany.my.salesforce.com/…</code>
              </li>
              <li>
                Your instance URL is the domain portion: <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">https://yourcompany.my.salesforce.com</code>
              </li>
              <li>
                Alternatively, go to <strong className="text-white">Setup → Company Settings → My Domain</strong>. The <em>Current My Domain URL</em> is your instance URL.
              </li>
            </ol>
            <p className="mt-4">Copy this — you&apos;ll paste it into Appalix later.</p>
          </section>

          {/* Get access token via Connected App */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 2 — Create a Connected App to get an OAuth token</h2>
            <p>
              Salesforce requires OAuth tokens to access its REST API. The easiest way to generate one without a complex OAuth server setup is to create a Connected App and use the <strong className="text-white">SFDX CLI</strong> or <strong className="text-white">Workbench</strong> to get a token.
            </p>

            <h3 className="text-base font-semibold text-white mt-6 mb-2">Option A — Workbench (no code, easiest)</h3>
            <ol className="list-decimal pl-5 space-y-3">
              <li>
                Go to <strong className="text-white">workbench.developerforce.com</strong> and log in with your Salesforce credentials.
              </li>
              <li>
                Select <strong className="text-white">Environment: Production</strong> (or <em>Sandbox</em> if testing), accept the terms, and click <strong className="text-white">Login with Salesforce</strong>.
              </li>
              <li>
                Once logged in, go to <strong className="text-white">Info → Session Information</strong>.
              </li>
              <li>
                Copy the <strong className="text-white">Session ID</strong> — this is your OAuth access token. It starts with a long alphanumeric string.
              </li>
            </ol>
            <div className="mt-4 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-sm text-yellow-300">
              <strong>Session tokens expire</strong> when you log out of Workbench or after the session timeout (typically 2 hours). For production use, set up a Connected App (Option B) for a longer-lived token.
            </div>

            <h3 className="text-base font-semibold text-white mt-6 mb-2">Option B — Connected App (recommended for production)</h3>
            <ol className="list-decimal pl-5 space-y-3">
              <li>
                In Salesforce, go to <strong className="text-white">Setup</strong> (gear icon) → search <em>App Manager</em> → click <strong className="text-white">App Manager</strong>.
              </li>
              <li>
                Click <strong className="text-white">New Connected App</strong> (top right).
              </li>
              <li>
                Fill in the required fields:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>Connected App Name</strong>: <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">Appalix Integration</code></li>
                  <li><strong>Contact Email</strong>: your email address</li>
                </ul>
              </li>
              <li>
                Under <strong className="text-white">API (Enable OAuth Settings)</strong>, tick <strong>Enable OAuth Settings</strong>. Set:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>Callback URL</strong>: <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">https://appalix.ai</code></li>
                  <li><strong>Selected OAuth Scopes</strong>: add <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">api</code> and <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">refresh_token, offline_access</code></li>
                </ul>
              </li>
              <li>
                Click <strong className="text-white">Save</strong>. Wait 2–10 minutes for the app to propagate.
              </li>
              <li>
                Go back to App Manager, find your new app, click the dropdown on the right → <strong className="text-white">View</strong>. Copy the <strong>Consumer Key</strong> (Client ID) and <strong>Consumer Secret</strong> (Client Secret).
              </li>
              <li>
                Open this URL in your browser to start the OAuth flow (replace <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">CLIENT_ID</code> and <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">INSTANCE_URL</code>):
                <pre className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-brand-300 overflow-x-auto mt-3">{`https://login.salesforce.com/services/oauth2/authorize
?response_type=code
&client_id=CLIENT_ID
&redirect_uri=https://appalix.ai`}</pre>
              </li>
              <li>
                Log in and authorise. You&apos;ll be redirected to <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">https://appalix.ai?code=XXXX</code>. Copy the code from the URL.
              </li>
              <li>
                Exchange for an access token (run this in your terminal or use a REST client like Postman or Insomnia):
                <pre className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-brand-300 overflow-x-auto mt-3">{`curl -X POST https://login.salesforce.com/services/oauth2/token \\
  -d "grant_type=authorization_code" \\
  -d "client_id=CLIENT_ID" \\
  -d "client_secret=CLIENT_SECRET" \\
  -d "redirect_uri=https://appalix.ai" \\
  -d "code=YOUR_CODE"`}</pre>
                The response includes an <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">access_token</code> and your <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">instance_url</code>. Copy both.
              </li>
            </ol>
          </section>

          {/* Step 3 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 3 — Connect Salesforce in Appalix</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>
                In Appalix, go to <strong className="text-white">Integrations</strong> and click <strong className="text-white">Edit</strong> on the integration you want to connect.
              </li>
              <li>
                Scroll to <strong className="text-white">CRM integration</strong> and select <strong className="text-white">Salesforce</strong> from the provider dropdown.
              </li>
              <li>
                Paste your <strong className="text-white">OAuth access token</strong> in the first field.
              </li>
              <li>
                Paste your <strong className="text-white">Instance URL</strong> (e.g. <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">https://yourcompany.my.salesforce.com</code>) in the second field.
              </li>
              <li>
                Click <strong className="text-white">Save changes</strong>.
              </li>
            </ol>
          </section>

          {/* What gets created */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What gets created in Salesforce</h2>
            <p>Appalix creates a <strong className="text-white">Lead</strong> record in Salesforce with:</p>
            <ul className="list-disc pl-5 mt-3 space-y-1">
              <li><strong className="text-white">Email</strong> — the visitor&apos;s email address</li>
              <li><strong className="text-white">MobilePhone</strong> — the visitor&apos;s phone number (if captured)</li>
              <li><strong className="text-white">LastName</strong> — set to <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">Chat Lead</code> (required by Salesforce — update once you know the visitor&apos;s name)</li>
              <li><strong className="text-white">LeadSource</strong> — set to <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">Chat</code></li>
              <li><strong className="text-white">Company</strong> — set to <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">Unknown</code> (required by Salesforce — update via a workflow once the company is known)</li>
            </ul>
          </section>

          {/* Step 4 - Test */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 4 — Test the integration</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>
                Open your Appalix integration preview.
              </li>
              <li>
                Send a message with an email: <em>&quot;My email is testlead@acme.com&quot;</em>.
              </li>
              <li>
                In Salesforce, go to <strong className="text-white">Leads</strong>. Sort by <em>Created Date</em> (descending) and check for the new record.
              </li>
            </ol>
            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-400">
              <strong className="text-white">If leads aren&apos;t appearing:</strong> check that the access token is still valid (session tokens from Workbench expire) and that your Salesforce edition includes API access. You can test the token directly: <code className="bg-white/10 px-1 py-0.5 rounded text-brand-300">curl https://INSTANCE_URL/services/data/v59.0/ -H &apos;Authorization: Bearer ACCESS_TOKEN&apos;</code> — you should get a JSON response.
            </div>
          </section>

          {/* Salesforce automation */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Next steps — automate in Salesforce</h2>
            <p>Once leads are flowing in, use Salesforce automation to act on them:</p>
            <ul className="list-disc pl-5 mt-3 space-y-2">
              <li><strong className="text-white">Lead Assignment Rules</strong> — auto-assign chat leads to the right sales rep based on territory or round-robin rules</li>
              <li><strong className="text-white">Flow or Process Builder</strong> — trigger an email alert to your team when a chat lead is created</li>
              <li><strong className="text-white">Convert to Opportunity</strong> — when a sales rep follows up and qualifies the lead, convert it to a Contact + Opportunity in one click</li>
              <li><strong className="text-white">Reports &amp; Dashboards</strong> — track how many leads came from Appalix Chat with a filter on <em>Lead Source = Chat</em></li>
            </ul>
          </section>

          {/* FAQ */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Frequently asked questions</h2>

            <div className="space-y-5">
              <div>
                <p className="font-semibold text-white">Can I use a Sandbox instead of Production?</p>
                <p className="text-sm text-gray-400 mt-1">Yes — use your Sandbox instance URL (e.g. <code className="bg-white/10 px-1 py-0.5 rounded text-brand-300">https://yourcompany--uat.sandbox.my.salesforce.com</code>) and generate a token from <code className="bg-white/10 px-1 py-0.5 rounded text-brand-300">test.salesforce.com</code> instead of <code className="bg-white/10 px-1 py-0.5 rounded text-brand-300">login.salesforce.com</code>.</p>
              </div>
              <div>
                <p className="font-semibold text-white">My access token expired. What do I do?</p>
                <p className="text-sm text-gray-400 mt-1">Re-generate a fresh token using the same method and update it in Appalix (Integrations → Edit → CRM integration → Salesforce → update the token → Save). Native token refresh support is on the Appalix roadmap.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Can I use Zapier with Salesforce instead?</p>
                <p className="text-sm text-gray-400 mt-1">Yes — select <em>Zapier</em> as the CRM provider (Core plan), add a Salesforce action in Zapier to create a Lead record, and map the fields from the Appalix payload.</p>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="rounded-2xl bg-brand-600/10 border border-brand-600/20 p-6 text-center mt-12">
            <p className="text-2xl mb-3">☁️</p>
            <h3 className="text-lg font-semibold text-white mb-2">Ready to connect Salesforce?</h3>
            <p className="text-sm text-gray-400 mb-5">
              Add your Salesforce access token and instance URL in Appalix and leads will flow into your CRM automatically.
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
