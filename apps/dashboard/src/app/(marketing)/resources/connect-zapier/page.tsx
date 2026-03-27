import Link from 'next/link'
import type { Metadata } from 'next'
import { ArticleSeo } from '@/components/marketing/article-seo'

export const metadata: Metadata = {
  title: 'Connect Zapier to Appalix for CRM Lead Capture — Step-by-Step',
  description:
    'Route Appalix AI chat leads to HubSpot, Salesforce, Google Sheets, Pipedrive, or 6,000+ apps via a Zapier Catch Hook. No code required. Available on Core plan and above.',
  keywords: [
    'Zapier Appalix integration',
    'chatbot lead capture Zapier',
    'Appalix CRM webhook',
    'Zapier catch hook chatbot',
    'lead capture automation',
    'Zapier webhook chatbot',
    'AI chatbot Zapier HubSpot',
    'no-code lead routing',
  ],
  alternates: { canonical: 'https://appalix.ai/resources/connect-zapier' },
  openGraph: {
    title: 'Connect Zapier to Appalix for CRM Lead Capture — Step-by-Step',
    description: 'Route Appalix AI chat leads to HubSpot, Salesforce, Google Sheets, or 6,000+ apps via Zapier. No code.',
    url: 'https://appalix.ai/resources/connect-zapier',
    type: 'article',
    siteName: 'Appalix',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Connect Zapier to Appalix for CRM Lead Capture — Step-by-Step',
    description: 'Route Appalix AI chat leads to HubSpot, Salesforce, Google Sheets, or 6,000+ apps via Zapier. No code.',
  },
}

export default function ConnectZapierPage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <ArticleSeo
        type="HowTo"
        title="How to Connect Zapier to Appalix for CRM Lead Capture"
        description="Route Appalix AI chat leads to HubSpot, Salesforce, Google Sheets, Pipedrive, or 6,000+ apps via a Zapier Catch Hook. No code required."
        slug="connect-zapier"
        datePublished="2026-02-26"
        steps={[
          { name: 'Create a Zapier Catch Hook trigger', text: 'In Zapier, create a new Zap, add a Webhooks by Zapier trigger, choose Catch Hook, and copy the generated webhook URL.' },
          { name: 'Paste the webhook URL in Appalix', text: 'In Appalix Integrations, click Edit, scroll to CRM integration, select Zapier, paste your Catch Hook URL, then save.' },
          { name: 'Send a test lead', text: 'Open your Appalix integration preview, send a message with an email address, then click Test trigger in Zapier to confirm the payload was received.' },
          { name: 'Add your CRM action and publish', text: 'Add your CRM action in Zapier (HubSpot, Salesforce, Google Sheets, etc.), map the email and phone fields, then turn the Zap on.' },
        ]}
      />
      <div className="max-w-3xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-white/60 mb-10">
          <Link href="/resources" className="hover:text-brand-400 transition-colors">Resources</Link>
          <span>/</span>
          <span className="text-white/65">Connect Zapier to Appalix</span>
        </div>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-400 border border-brand-600/20 font-medium">Tutorial</span>
            <span className="text-xs text-white/60">7 min read · Core plan and above</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            How to Connect Zapier to Appalix for CRM Lead Capture
          </h1>
          <p className="text-white/65 text-lg leading-relaxed">
            Zapier is the easiest way to connect Appalix to virtually any CRM or app — HubSpot, Salesforce, Google Sheets, Pipedrive, Notion, Monday.com, and 6,000+ more. When a visitor shares their email or phone number in your chat, a Zap fires and creates the lead in your tool of choice. No code required.
          </p>
        </div>

        <div className="border-t border-white/10 mb-10" />

        <div className="prose prose-invert prose-brand max-w-none space-y-10 text-white/80">

          {/* What you'll need */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What you&apos;ll need</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>An <strong className="text-white">Appalix account</strong> on Core plan or above</li>
              <li>A <strong className="text-white">Zapier account</strong> — the free tier supports this integration</li>
              <li>An account with the destination app (e.g. HubSpot, Salesforce, Google Workspace)</li>
            </ul>
          </section>

          {/* How it works */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">How it works</h2>
            <p>
              Appalix sends a JSON payload to your Zapier webhook URL whenever a visitor shares an email address or phone number in the chat. Zapier receives this data and lets you route it to any app with a Zap action.
            </p>

            <h3 className="text-base font-semibold text-white mt-6 mb-2">Lead capture payload</h3>
            <pre className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-brand-300 overflow-x-auto">{`{
  "event": "lead_captured",
  "conversationId": "abc-123",
  "integrationId": "xyz-456",
  "workspaceId": "ws-789",
  "email": "jane@company.com",
  "phone": "+44 7911 123456",
  "message": "my email is jane@company.com",
  "timestamp": "2026-02-26T10:30:00.000Z"
}`}</pre>
            <p className="mt-3">All fields are always present; <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">email</code> and <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">phone</code> may be null if not captured in the conversation.</p>
          </section>

          {/* Step 1 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 1 — Create a Zapier webhook trigger</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>
                Log in to <strong className="text-white">zapier.com</strong> and click <strong className="text-white">+ Create → Zaps</strong>.
              </li>
              <li>
                Click the <strong className="text-white">Trigger</strong> step and search for <strong className="text-white">Webhooks by Zapier</strong>. Select it.
              </li>
              <li>
                Choose <strong className="text-white">Catch Hook</strong> as the trigger event. Click <strong className="text-white">Continue</strong>.
              </li>
              <li>
                Zapier will generate a webhook URL — something like <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">https://hooks.zapier.com/hooks/catch/12345678/abcdefg/</code>. Click <strong className="text-white">Copy</strong>.
              </li>
              <li>
                Leave the Zap open in a browser tab — you&apos;ll come back to test it after connecting Appalix.
              </li>
            </ol>
          </section>

          {/* Step 2 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 2 — Paste the webhook URL in Appalix</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>
                In Appalix, go to <strong className="text-white">Integrations</strong> and click <strong className="text-white">Edit</strong> on the integration you want to connect.
              </li>
              <li>
                Scroll to the <strong className="text-white">CRM integration</strong> section.
              </li>
              <li>
                In the <strong className="text-white">CRM provider</strong> dropdown, select <strong className="text-white">Zapier</strong>.
              </li>
              <li>
                Paste your Zapier webhook URL in the <strong className="text-white">Zapier webhook URL</strong> field.
              </li>
              <li>
                Click <strong className="text-white">Save changes</strong>.
              </li>
            </ol>
          </section>

          {/* Step 3 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 3 — Send a test lead to Zapier</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>
                Open the preview of your Appalix integration and send a message containing an email address — for example: <em>&quot;Hi, my email is test@example.com&quot;</em>.
              </li>
              <li>
                Back in Zapier, click <strong className="text-white">Test trigger</strong>. Zapier will show the JSON payload it received from Appalix.
              </li>
              <li>
                You should see all fields: <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">email</code>, <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">phone</code>, <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">conversationId</code>, etc.
              </li>
              <li>
                Click <strong className="text-white">Continue with selected record</strong>.
              </li>
            </ol>
          </section>

          {/* Step 4 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 4 — Add your CRM action</h2>
            <p>Now connect the lead data to your CRM or app of choice:</p>

            <h3 className="text-base font-semibold text-white mt-6 mb-2">HubSpot</h3>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Add an action step → search <strong className="text-white">HubSpot</strong> → select <strong className="text-white">Create or Update Contact</strong>.</li>
              <li>Connect your HubSpot account.</li>
              <li>Map <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">Email</code> → <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">email</code> from the trigger data.</li>
              <li>Map <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">Phone Number</code> → <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">phone</code>.</li>
              <li>Set <em>Lead Source</em> to a static value like <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">Appalix Chat</code>.</li>
            </ol>

            <h3 className="text-base font-semibold text-white mt-6 mb-2">Salesforce</h3>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Add an action step → search <strong className="text-white">Salesforce</strong> → select <strong className="text-white">Create Record → Lead</strong>.</li>
              <li>Connect your Salesforce account.</li>
              <li>Map <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">Email</code>, <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">MobilePhone</code>, and set a required <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">LastName</code> (use a static fallback like &quot;Chat Lead&quot; if name wasn&apos;t captured).</li>
            </ol>

            <h3 className="text-base font-semibold text-white mt-6 mb-2">Google Sheets</h3>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Add an action step → <strong className="text-white">Google Sheets → Create Spreadsheet Row</strong>.</li>
              <li>Connect your Google account, choose a spreadsheet and sheet.</li>
              <li>Map columns: <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">Email</code>, <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">Phone</code>, <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">Timestamp</code>, <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">Conversation ID</code>.</li>
            </ol>

            <h3 className="text-base font-semibold text-white mt-6 mb-2">Any other app</h3>
            <p>Zapier supports 6,000+ apps. Search for your CRM or tool in the Zapier action step and map the <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">email</code> and <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">phone</code> fields from the trigger data.</p>
          </section>

          {/* Step 5 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 5 — Turn on the Zap</h2>
            <p>
              Once you&apos;ve tested the action and everything looks correct, click <strong className="text-white">Publish</strong> and toggle the Zap to <strong className="text-white">On</strong>. From now on, every lead captured by Appalix will automatically appear in your CRM.
            </p>
          </section>

          {/* Tips */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Tips &amp; best practices</h2>
            <ul className="list-disc pl-5 space-y-3">
              <li>
                <strong className="text-white">Test with Webhook.site first</strong> — before connecting to your real CRM, paste <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">https://webhook.site/your-unique-id</code> in Appalix to inspect the exact payload your CRM will receive.
              </li>
              <li>
                <strong className="text-white">Add a filter step</strong> — in Zapier, add a <em>Filter</em> step between trigger and action that only continues if <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">email</code> is not empty, to avoid creating contacts without an email.
              </li>
              <li>
                <strong className="text-white">Use Make.com for complex flows</strong> — Make&apos;s free tier handles more operations per month and supports multi-step branching logic, making it better than Zapier for complex automation.
              </li>
              <li>
                <strong className="text-white">Tag leads from specific integrations</strong> — if you have multiple Appalix integrations (web widget, WhatsApp, Slack), use the <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">integrationId</code> field to tag leads by source in your CRM.
              </li>
              <li>
                <strong className="text-white">Upgrade for native CRM integrations</strong> — on Pro plan, you can connect HubSpot, Intercom, Zoho CRM, and Salesforce directly without Zapier, which gives faster delivery and no task limits.
              </li>
            </ul>
          </section>

          {/* CTA */}
          <section className="rounded-2xl bg-brand-600/10 border border-brand-600/20 p-6 text-center mt-12">
            <p className="text-2xl mb-3">🔗</p>
            <h3 className="text-lg font-semibold text-white mb-2">Ready to set up Zapier?</h3>
            <p className="text-sm text-white/65 mb-5">
              Open your integrations dashboard, select Zapier as your CRM provider, and paste your webhook URL.
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
