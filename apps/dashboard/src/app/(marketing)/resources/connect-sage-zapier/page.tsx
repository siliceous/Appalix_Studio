import Link from 'next/link'
import type { Metadata } from 'next'
import { ArticleSeo } from '@/components/marketing/article-seo'

export const metadata: Metadata = {
  title: 'Connect Zapier to Sage CRM — Automate CRM Events | Appalix',
  description:
    'Trigger Zapier automations when Sage events fire — lead captured, deal created, stage changed. Create a Catch Hook in Zapier, paste the URL into Sage Integrations, and connect to 6,000+ apps.',
  keywords: [
    'Sage CRM Zapier integration',
    'Appalix Sage Zapier',
    'CRM automation Zapier',
    'Zapier webhook CRM',
    'Sage CRM events automation',
    'Zapier catch hook CRM',
    'no-code CRM automation',
  ],
  alternates: { canonical: 'https://appalix.ai/resources/connect-sage-zapier' },
  openGraph: {
    title: 'Connect Zapier to Sage CRM — Automate CRM Events | Appalix',
    description: 'Trigger Zapier automations from Sage CRM events. Step-by-step guide.',
    url: 'https://appalix.ai/resources/connect-sage-zapier',
    type: 'article',
    siteName: 'Appalix',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Connect Zapier to Sage CRM — Automate CRM Events | Appalix',
    description: 'Trigger Zapier automations from Sage CRM events. Step-by-step guide.',
  },
}

export default function ConnectSageZapierPage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <ArticleSeo
        type="HowTo"
        title="Connect Zapier to Sage CRM"
        description="Trigger Zapier automations when Sage events fire — lead captured, deal created, stage changed. Connect to 6,000+ apps without writing code."
        slug="connect-sage-zapier"
        datePublished="2026-03-02"
        steps={[
          { name: 'Create a Zapier Catch Hook', text: 'In Zapier, create a new Zap with Webhooks by Zapier as the trigger, choose Catch Hook, and copy the generated webhook URL.' },
          { name: 'Paste the URL into Sage', text: 'In Appalix, go to Sage → Integrations, click Connect on the Zapier card, paste the webhook URL, and click Save & Connect.' },
          { name: 'Test and build your Zap', text: 'Trigger a Sage event (add a contact or move a deal), click Test in Zapier to receive the payload, then add your desired action app.' },
        ]}
      />
      <div className="max-w-3xl mx-auto">

        <div className="flex items-center gap-2 text-sm text-white/60 mb-10">
          <Link href="/resources" className="hover:text-brand-400 transition-colors">Resources</Link>
          <span>/</span>
          <span className="text-white/65">Connect Zapier to Sage</span>
        </div>

        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-400 border border-brand-600/20 font-medium">Tutorial</span>
            <span className="text-xs text-white/60">7 min read · Pro+ plan</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            Connect Zapier to Sage CRM
          </h1>
          <p className="text-white/65 text-lg leading-relaxed">
            Sage fires a webhook whenever a key CRM event occurs — a new lead is captured, a deal is created, or a stage changes. With Zapier connected, those events can trigger automations in over 6,000 apps: send a Slack alert, add a row to Google Sheets, start an email sequence — all without code.
          </p>
        </div>

        <div className="border-t border-white/10 mb-10" />

        <div className="prose prose-invert prose-brand max-w-none space-y-10 text-white/80">

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What Sage events trigger the webhook</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-white">deal_created</strong> — a new deal is added to the pipeline</li>
              <li><strong className="text-white">stage_changed</strong> — a deal is moved to a different stage</li>
              <li><strong className="text-white">contact_created</strong> — a new contact is added (including from AI chat)</li>
              <li><strong className="text-white">deal_updated</strong> — a deal&apos;s status, priority, or close date changes</li>
              <li><strong className="text-white">note_added</strong> — a note or call log is added to a deal</li>
            </ul>
            <p className="mt-4">Each payload includes the event type, timestamp, workspace ID, and the relevant entity data (deal title, contact name, stage name, etc.).</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What you&apos;ll need</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>An <strong className="text-white">Appalix account</strong> on the Pro plan or above</li>
              <li>A <strong className="text-white">Zapier account</strong> — Starter plan or above (Catch Hook requires a paid Zapier plan)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 1 — Create a Catch Hook in Zapier</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Log in to <strong className="text-white">Zapier</strong> and click <strong className="text-white">+ Create Zap</strong>.</li>
              <li>In the trigger section, search for <strong className="text-white">Webhooks by Zapier</strong> and select it.</li>
              <li>Choose <strong className="text-white">Catch Hook</strong> as the trigger event and click <strong className="text-white">Continue</strong>.</li>
              <li>
                Zapier will generate a unique webhook URL — for example:<br />
                <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300 text-xs">https://hooks.zapier.com/hooks/catch/123456/abcdef/</code>
              </li>
              <li>Click <strong className="text-white">Copy</strong> to copy the URL. Leave this Zapier tab open.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 2 — Paste the URL into Sage</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>In Appalix, go to <strong className="text-white">Sage → Integrations</strong>.</li>
              <li>Under the <strong className="text-white">Automation</strong> section, find the <strong className="text-white">Zapier</strong> card and click <strong className="text-white">Connect</strong>.</li>
              <li>Paste your Catch Hook URL into the <strong className="text-white">Webhook URL</strong> field.</li>
              <li>Click <strong className="text-white">Save &amp; Connect</strong>.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 3 — Test the webhook</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>In Sage, trigger an event — for example, move a deal to a different pipeline stage.</li>
              <li>
                Back in Zapier, click <strong className="text-white">Test trigger</strong>. You should see the payload from Sage, including <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">event_type</code>, <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">payload</code>, and <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">workspace_id</code>.
              </li>
              <li>Click <strong className="text-white">Continue with selected record</strong>.</li>
            </ol>
            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white/65">
              <strong className="text-white">Tip:</strong> If Zapier doesn&apos;t receive a payload within 30 seconds, verify the webhook URL is saved correctly in Sage and try triggering another event.
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 4 — Add your action app</h2>
            <p>Now add the action you want to trigger. Popular choices:</p>
            <ul className="list-disc pl-5 mt-3 space-y-2">
              <li><strong className="text-white">Slack</strong> — send a message to your #sales channel when a deal is won</li>
              <li><strong className="text-white">Google Sheets</strong> — append a row whenever a new contact is added</li>
              <li><strong className="text-white">Gmail / Outlook</strong> — send a follow-up email when a deal reaches Proposal stage</li>
              <li><strong className="text-white">Pipedrive / Salesforce</strong> — mirror deals into a secondary CRM</li>
              <li><strong className="text-white">Notion / Airtable</strong> — log pipeline activity to a dashboard</li>
            </ul>
            <p className="mt-4">Add a Filter step to only continue for specific <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">event_type</code> values if you only want to trigger on certain Sage events.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Frequently asked questions</h2>
            <div className="space-y-5">
              <div>
                <p className="font-semibold text-white">Can I use filters to only trigger on certain events?</p>
                <p className="text-sm text-white/65 mt-1">Yes. Add a <em>Filter</em> step in Zapier after the Catch Hook, checking if <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">event_type</code> equals the event you want.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Can I create multiple Zaps from the same webhook?</p>
                <p className="text-sm text-white/65 mt-1">Yes — all Sage events post to the same URL. Use a Filter step in each Zap to route different events to different apps.</p>
              </div>
              <div>
                <p className="font-semibold text-white">What Zapier plan do I need?</p>
                <p className="text-sm text-white/65 mt-1">Webhooks by Zapier (Catch Hook) requires a Zapier Starter plan or above. The free tier does not support custom webhooks.</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-brand-600/10 border border-brand-600/20 p-6 text-center mt-12">
            <p className="text-2xl mb-3">⚡</p>
            <h3 className="text-lg font-semibold text-white mb-2">Ready to automate Sage with Zapier?</h3>
            <p className="text-sm text-white/65 mb-5">
              Head to Sage Integrations, paste your Zapier webhook URL, and your first automation will be live in minutes.
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
