import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Connecting Webhook URLs to CRMs and Human Handover | Appalix Resources',
  description:
    'Step-by-step guide to connecting your Appalix AI agent to a CRM via webhooks and routing human handoff notifications to Slack, Discord, Telegram, WhatsApp, or any messaging tool.',
  keywords: [
    'CRM webhook integration',
    'AI chatbot human handoff',
    'Slack webhook chatbot',
    'WhatsApp handoff bot',
    'Zapier chatbot integration',
    'Telegram bot webhook',
  ],
}

export default function WebhookGuidePage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <div className="max-w-3xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-10">
          <Link href="/resources" className="hover:text-brand-400 transition-colors">Resources</Link>
          <span>/</span>
          <span className="text-gray-400">Connecting webhooks to CRMs &amp; human handover</span>
        </div>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-400 border border-brand-600/20 font-medium">Tutorial</span>
            <span className="text-xs text-gray-500">10 min read · Feb 24, 2026</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            Connecting Webhook URLs to CRMs and Human Handover
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Your Appalix AI agent can automatically capture leads into any CRM and alert a human team member the moment a visitor wants to speak to a real person — with no code required.
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 mb-10" />

        {/* Article body */}
        <div className="prose prose-invert prose-brand max-w-none space-y-10 text-gray-300">

          {/* Overview */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">How it works</h2>
            <p>
              Every Appalix integration has two built-in automation layers:
            </p>
            <ul className="space-y-2 mt-3 list-disc pl-5">
              <li><strong className="text-white">CRM lead capture</strong> — when a visitor shares an email address or phone number in the chat, Appalix instantly POSTs that contact data to a webhook URL of your choice.</li>
              <li><strong className="text-white">Human handoff</strong> — when a visitor asks to speak to a human agent, the bot acknowledges gracefully and fires a real-time notification to your team via Slack, Discord, Telegram, WhatsApp, or any generic webhook.</li>
            </ul>
            <p className="mt-4">
              Both are configured per integration at <strong className="text-white">Integrations → Edit</strong>. No code, no plugins — just paste a URL and save.
            </p>
          </section>

          {/* CRM section */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Part 1 — CRM lead capture</h2>
            <p>
              When a visitor types something like <em>"my email is jane@company.com"</em> or <em>"call me on 07911 123456"</em>, Appalix automatically detects the contact data and POSTs a JSON payload to your CRM webhook URL.
            </p>

            <h3 className="text-base font-semibold text-white mt-6 mb-2">Payload sent to your CRM</h3>
            <pre className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-brand-300 overflow-x-auto">{`{
  "event": "lead_captured",
  "conversationId": "abc-123",
  "integrationId": "xyz-456",
  "workspaceId": "ws-789",
  "email": "jane@company.com",
  "phone": "+44 7911 123456",
  "message": "my email is jane@company.com",
  "timestamp": "2026-02-24T10:30:00.000Z"
}`}</pre>

            <h3 className="text-base font-semibold text-white mt-6 mb-2">Connecting to HubSpot via Zapier</h3>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Go to <strong className="text-white">zapier.com</strong> → <strong>Create Zap</strong> → trigger: <strong>Webhooks by Zapier → Catch Hook</strong> → copy the webhook URL.</li>
              <li>In Appalix → <strong>Integrations → Edit</strong> → paste the URL in <strong>CRM webhook URL</strong> → Save.</li>
              <li>In Zapier, add an action: <strong>HubSpot → Create or Update Contact</strong>, map <code>email</code> and <code>phone</code> from the trigger data.</li>
              <li>Turn on the Zap. Every lead now flows straight into HubSpot.</li>
            </ol>

            <h3 className="text-base font-semibold text-white mt-6 mb-2">Connecting directly to HubSpot (no Zapier)</h3>
            <p>HubSpot provides its own webhook receiver via <strong>Workflows</strong>. Go to <strong>Automation → Workflows → Create</strong>, use a <em>Contact-based</em> trigger, and add a <strong>Send a webhook</strong> action with the HubSpot webhook URL provided. Alternatively use HubSpot&apos;s Contacts API directly and a small serverless function as the receiver.</p>

            <h3 className="text-base font-semibold text-white mt-6 mb-2">Connecting to Salesforce via Make</h3>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Go to <strong className="text-white">make.com</strong> → <strong>Create scenario</strong> → add module: <strong>Webhooks → Custom webhook → Add</strong> → copy the URL.</li>
              <li>Paste it in Appalix → <strong>CRM webhook URL</strong> → Save.</li>
              <li>Add a Salesforce module: <strong>Create a Record → Lead</strong>, map <code>email</code>, <code>phone</code>, and set a default lead source.</li>
              <li>Run once to test, then turn on the scenario.</li>
            </ol>
          </section>

          {/* Handoff section */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Part 2 — Human handoff notifications</h2>
            <p>
              When a visitor uses phrases like <em>"I&apos;d like to speak to a human"</em>, <em>"live agent please"</em>, or <em>"can I talk to someone?"</em>, two things happen simultaneously:
            </p>
            <ol className="list-decimal pl-5 space-y-2 mt-3">
              <li>The AI responds with a warm, reassuring message letting the visitor know a team member has been notified.</li>
              <li>A real-time notification is fired to your chosen channel.</li>
            </ol>
            <p className="mt-4">
              Choose your notification channel at <strong className="text-white">Integrations → Edit → Human handoff → Notify via</strong>.
            </p>

            {/* Slack */}
            <h3 className="text-base font-semibold text-white mt-8 mb-2">Slack</h3>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Go to <strong className="text-white">api.slack.com/apps</strong> → <strong>Create New App → From scratch</strong> → name it (e.g. &quot;Appalix Handoff&quot;) → pick your workspace.</li>
              <li>In the sidebar → <strong>Incoming Webhooks</strong> → toggle <strong>Activate Incoming Webhooks ON</strong>.</li>
              <li>Click <strong>Add New Webhook to Workspace</strong> → pick the channel (e.g. <code>#support-alerts</code>) → <strong>Allow</strong>.</li>
              <li>Copy the webhook URL (starts with <code>https://hooks.slack.com/services/…</code>).</li>
              <li>In Appalix → select <strong>Slack</strong> → paste the URL → Save.</li>
            </ol>
            <p className="text-sm text-gray-500 mt-2">What your team sees: a rich block message with the visitor&apos;s exact words, the conversation ID, and a timestamp.</p>

            {/* Discord */}
            <h3 className="text-base font-semibold text-white mt-8 mb-2">Discord</h3>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Open Discord → go to the channel you want alerts in → click <strong>Edit Channel</strong> (gear icon).</li>
              <li><strong>Integrations → Webhooks → New Webhook</strong> → give it a name → <strong>Copy Webhook URL</strong>.</li>
              <li>In Appalix → select <strong>Discord</strong> → paste the URL → Save.</li>
            </ol>
            <p className="text-sm text-gray-500 mt-2">What your team sees: an orange embed with the visitor&apos;s message, conversation ID, and timestamp.</p>

            {/* Telegram */}
            <h3 className="text-base font-semibold text-white mt-8 mb-2">Telegram</h3>
            <ol className="list-decimal pl-5 space-y-2">
              <li>In Telegram, search for <strong>@BotFather</strong> → send <code>/newbot</code> → follow the prompts → copy the <strong>bot token</strong>.</li>
              <li>Create a support group → add your new bot to the group.</li>
              <li>Get the <strong>Chat ID</strong>: send any message in the group, then open <code>https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code> and find <code>&quot;chat&quot;:&#123;&quot;id&quot;: -100xxxxxxx&#125;</code>.</li>
              <li>In Appalix → select <strong>Telegram</strong> → paste the bot token and chat ID → Save.</li>
            </ol>
            <p className="text-sm text-gray-500 mt-2">Group chat IDs start with <code>-100</code>. You can also use a private chat ID for a single-person inbox.</p>

            {/* WhatsApp */}
            <h3 className="text-base font-semibold text-white mt-8 mb-2">WhatsApp (via Twilio)</h3>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Sign up at <strong className="text-white">console.twilio.com</strong> — your <strong>Account SID</strong> and <strong>Auth Token</strong> are on the dashboard homepage.</li>
              <li>Go to <strong>Messaging → Try it out → Send a WhatsApp message</strong> and follow the Sandbox setup, or apply for a WhatsApp Business number under <strong>Messaging → Senders → WhatsApp senders</strong>.</li>
              <li>In Appalix → select <strong>WhatsApp (Twilio)</strong> → fill in:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>Account SID</strong> and <strong>Auth Token</strong></li>
                  <li><strong>From</strong>: your Twilio WhatsApp number, e.g. <code>whatsapp:+14155238886</code></li>
                  <li><strong>To</strong>: your agent&apos;s WhatsApp number, e.g. <code>whatsapp:+447911123456</code></li>
                </ul>
              </li>
              <li>Save. Your team will receive a WhatsApp message each time a visitor requests a human.</li>
            </ol>

            {/* Generic */}
            <h3 className="text-base font-semibold text-white mt-8 mb-2">Generic webhook (Zapier, Make, Teams, Messenger, email)</h3>
            <p>
              Choose <strong>Generic / Zapier / Make</strong> to send a raw JSON payload to any HTTP endpoint. This is the universal option — use it to connect to Microsoft Teams, Facebook Messenger, email services, or anything else your team uses.
            </p>
            <ol className="list-decimal pl-5 space-y-2 mt-3">
              <li>In Zapier: <strong>Create Zap → Webhooks by Zapier → Catch Hook</strong> → copy the URL → paste in Appalix → Save.</li>
              <li>Add your output action in Zapier (e.g. <strong>Microsoft Teams → Post Message</strong>, <strong>Gmail → Send Email</strong>).</li>
              <li>Turn on the Zap.</li>
            </ol>

            <h3 className="text-base font-semibold text-white mt-8 mb-2">Handoff payload</h3>
            <pre className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-brand-300 overflow-x-auto">{`{
  "event": "handoff_requested",
  "conversationId": "abc-123",
  "integrationId": "xyz-456",
  "workspaceId": "ws-789",
  "userMessage": "I'd like to speak to a human please",
  "timestamp": "2026-02-24T10:30:00.000Z"
}`}</pre>
          </section>

          {/* Tips */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Tips &amp; best practices</h2>
            <ul className="list-disc pl-5 space-y-3">
              <li><strong className="text-white">Test with Webhook.site</strong> — paste <code>https://webhook.site/your-unique-id</code> as the URL first to see the exact payload before connecting your real CRM.</li>
              <li><strong className="text-white">Use Make over Zapier for complex flows</strong> — Make&apos;s free tier handles more operations per month and supports multi-step logic without paid plans.</li>
              <li><strong className="text-white">Include the conversation link in your handoff message</strong> — in Zapier or Make, append <code>https://app.appalix.com/conversations/&#123;&#123;conversationId&#125;&#125;</code> so the agent can read the full history before responding.</li>
              <li><strong className="text-white">Respond quickly</strong> — once a visitor requests a human, they&apos;re expecting a response within minutes. Set up mobile notifications in Slack or a WhatsApp alert to your phone.</li>
              <li><strong className="text-white">Both features work independently</strong> — you can enable CRM capture without handoff, or handoff without CRM capture. Leave either field empty to disable it.</li>
            </ul>
          </section>

          {/* CTA */}
          <section className="rounded-2xl bg-brand-600/10 border border-brand-600/20 p-6 text-center mt-12">
            <p className="text-2xl mb-3">🔌</p>
            <h3 className="text-lg font-semibold text-white mb-2">Ready to connect?</h3>
            <p className="text-sm text-gray-400 mb-5">
              Go to your integrations dashboard and set up CRM lead capture and human handoff in under 2 minutes.
            </p>
            <Link
              href="/integrations"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Open Integrations →
            </Link>
          </section>

        </div>

        {/* Footer nav */}
        <div className="mt-16 pt-8 border-t border-white/10 flex items-center justify-between">
          <Link href="/resources" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            ← Back to Resources
          </Link>
          <Link href="/features" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            View all features →
          </Link>
        </div>

      </div>
    </div>
  )
}
