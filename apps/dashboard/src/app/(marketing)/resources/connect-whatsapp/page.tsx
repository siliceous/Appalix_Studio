import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'How to Connect Appalix to WhatsApp Business | AI Bot for WhatsApp',
  description:
    'Deploy your Appalix AI bot on WhatsApp Business API so it replies to customer messages 24/7. Step-by-step guide using Meta\'s WhatsApp Business Platform.',
  keywords: [
    'WhatsApp AI chatbot',
    'Appalix WhatsApp integration',
    'WhatsApp Business API bot',
    'WhatsApp chatbot setup',
    'Meta WhatsApp Business Platform',
  ],
}

export default function ConnectWhatsAppPage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <div className="max-w-3xl mx-auto">

        <div className="flex items-center gap-2 text-sm text-gray-500 mb-10">
          <Link href="/resources" className="hover:text-brand-400 transition-colors">Resources</Link>
          <span>/</span>
          <span className="text-gray-400">Connect WhatsApp Business</span>
        </div>

        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-400 border border-brand-600/20 font-medium">Tutorial</span>
            <span className="text-xs text-gray-500">11 min read · Core plan and above</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            How to Connect Appalix to WhatsApp Business
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            WhatsApp is the world&apos;s most-used messaging app. With the WhatsApp Business API and Appalix, your AI bot can answer customer questions, capture leads, and hand off to a human agent — all inside WhatsApp, 24 hours a day.
          </p>
        </div>

        <div className="border-t border-white/10 mb-10" />

        <div className="prose prose-invert prose-brand max-w-none space-y-10 text-gray-300">

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What you&apos;ll need</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>An <strong className="text-white">Appalix account</strong> on Core plan or above</li>
              <li>A <strong className="text-white">Meta Business account</strong> verified and in Good Standing</li>
              <li>A <strong className="text-white">phone number</strong> that isn&apos;t already registered on personal WhatsApp</li>
              <li>A <strong className="text-white">Meta Developer app</strong> with WhatsApp enabled</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 1 — Create a WhatsApp integration in Appalix</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Go to <strong className="text-white">Integrations → Add integration</strong> and choose <strong className="text-white">WhatsApp</strong>.</li>
              <li>Name the integration and select a bot. Leave credential fields empty for now.</li>
              <li>Click <strong className="text-white">Create integration</strong>, then open the setup page — note the webhook URL:
                <pre className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-brand-300 overflow-x-auto mt-3">
                  {`https://api.appalix.ai/webhooks/whatsapp/{your-integration-id}`}
                </pre>
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 2 — Set up WhatsApp in Meta Developer Console</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Go to <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer" className="text-brand-400 hover:text-brand-300 underline">developers.facebook.com/apps</a> and create a new app of type <strong className="text-white">Business</strong>.</li>
              <li>Add the <strong className="text-white">WhatsApp</strong> product to your app.</li>
              <li>Under <strong className="text-white">WhatsApp → Getting Started</strong>, link your Meta Business account and add a phone number.</li>
              <li>Copy the <strong className="text-white">Temporary Access Token</strong> (valid 24 h) — or generate a System User permanent token for production use.</li>
              <li>Note the <strong className="text-white">Phone Number ID</strong> shown on the Getting Started page.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 3 — Configure the webhook</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>In the Meta app, go to <strong className="text-white">WhatsApp → Configuration</strong> and click <strong className="text-white">Edit</strong> next to Webhook.</li>
              <li>Set <strong className="text-white">Callback URL</strong> to your Appalix webhook URL from Step 1.</li>
              <li>Set <strong className="text-white">Verify Token</strong> to the verify token in your Appalix integration (found in the edit page).</li>
              <li>Click <strong className="text-white">Verify and save</strong>. Meta will call the URL to verify it.</li>
              <li>Under <strong className="text-white">Webhook fields</strong>, subscribe to <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">messages</code>.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 4 — Save credentials in Appalix</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>In Appalix, click <strong className="text-white">Edit</strong> on the WhatsApp integration.</li>
              <li>Paste the <strong className="text-white">Phone Number ID</strong>, <strong className="text-white">Access Token</strong>, and your chosen <strong className="text-white">Verify Token</strong>.</li>
              <li>Click <strong className="text-white">Save changes</strong>.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 5 — Send a test message</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Use the <strong className="text-white">Meta WhatsApp test tool</strong> (Getting Started page) to send a message to your WhatsApp number.</li>
              <li>Appalix should respond with your bot&apos;s reply within seconds.</li>
              <li>The conversation appears in Appalix <strong className="text-white">Conversations</strong> with platform <em>WhatsApp</em>.</li>
            </ol>
            <p className="mt-3 text-sm text-gray-400">
              In sandbox/test mode, only pre-registered test numbers can send messages. Submit your app and phone number for production approval to accept messages from anyone.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Tips &amp; best practices</h2>
            <ul className="list-disc pl-5 space-y-3">
              <li><strong className="text-white">Permanent access token</strong> — the temporary token expires after 24 hours. For production, create a System User in Meta Business Manager and generate a non-expiring token.</li>
              <li><strong className="text-white">Message templates</strong> — WhatsApp requires approved message templates for outbound (business-initiated) messages. For inbound replies within 24 hours of user contact, free-form text is fine.</li>
              <li><strong className="text-white">Human handoff via Twilio</strong> — in your integration handoff settings, configure a Twilio WhatsApp number so your team receives a WhatsApp alert when a customer requests a human agent.</li>
            </ul>
          </section>

          <section className="rounded-2xl bg-brand-600/10 border border-brand-600/20 p-6 text-center mt-12">
            <p className="text-2xl mb-3">💬</p>
            <h3 className="text-lg font-semibold text-white mb-2">Put your AI bot on WhatsApp</h3>
            <p className="text-sm text-gray-400 mb-5">
              Create a WhatsApp integration in Appalix, connect your Meta app, and start replying to customers automatically.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Go to Integrations →
            </Link>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-white/10 flex items-center justify-between flex-wrap gap-4">
          <Link href="/resources" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            ← Back to Resources
          </Link>
          <Link href="/platforms" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            View all platforms →
          </Link>
        </div>

      </div>
    </div>
  )
}
