import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'How to Connect Appalix to Facebook Messenger | AI Chatbot for Messenger',
  description:
    'Deploy your Appalix AI bot on Facebook Messenger. Connect your Meta Page, set up a webhook, and let your bot answer customer messages automatically — step-by-step guide.',
  keywords: [
    'Facebook Messenger AI chatbot',
    'Appalix Facebook integration',
    'Meta Messenger bot setup',
    'Facebook page chatbot',
    'Messenger webhook tutorial',
  ],
}

export default function ConnectFacebookMessengerPage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <div className="max-w-3xl mx-auto">

        <div className="flex items-center gap-2 text-sm text-gray-500 mb-10">
          <Link href="/resources" className="hover:text-brand-400 transition-colors">Resources</Link>
          <span>/</span>
          <span className="text-gray-400">Connect Facebook Messenger</span>
        </div>

        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-400 border border-brand-600/20 font-medium">Tutorial</span>
            <span className="text-xs text-gray-500">10 min read · Core plan and above</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            How to Connect Appalix to Facebook Messenger
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Automatically respond to every customer message on your Facebook Page with your AI bot. Once configured, Appalix intercepts every incoming Messenger message and replies within seconds — no manual monitoring needed.
          </p>
        </div>

        <div className="border-t border-white/10 mb-10" />

        <div className="prose prose-invert prose-brand max-w-none space-y-10 text-gray-300">

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What you&apos;ll need</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>An <strong className="text-white">Appalix account</strong> on Core plan or above</li>
              <li>A <strong className="text-white">Facebook Page</strong> (must be a Page, not a personal profile)</li>
              <li>A <strong className="text-white">Meta Developer account</strong> — free at <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-brand-400 hover:text-brand-300 underline">developers.facebook.com</a></li>
              <li>Admin access to the Facebook Page</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 1 — Create a Facebook Messenger integration in Appalix</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Go to <strong className="text-white">Integrations → Add integration</strong> and choose <strong className="text-white">Facebook Messenger</strong>.</li>
              <li>Name the integration and select a bot. Leave the token fields empty for now — you&apos;ll fill them in after creating the Meta app.</li>
              <li>Click <strong className="text-white">Create integration</strong>, then open the setup page and note the webhook endpoint URL:
                <pre className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-brand-300 overflow-x-auto mt-3">
                  {`https://api.appalix.ai/webhooks/facebook/{your-integration-id}`}
                </pre>
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 2 — Create a Meta app</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Go to <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer" className="text-brand-400 hover:text-brand-300 underline">developers.facebook.com/apps</a> and click <strong className="text-white">Create App</strong>.</li>
              <li>Choose <strong className="text-white">Business</strong> as the app type. Enter a name and contact email.</li>
              <li>On the app dashboard, find <strong className="text-white">Messenger</strong> and click <strong className="text-white">Set up</strong>.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 3 — Generate a Page Access Token</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>In the Messenger settings, under <strong className="text-white">Access Tokens</strong>, click <strong className="text-white">Add or Remove Pages</strong> and connect your Facebook Page.</li>
              <li>Click <strong className="text-white">Generate Token</strong> next to your page. Copy the token — it&apos;s long and starts with <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">EAAB</code>.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 4 — Set up the webhook</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>In Messenger settings, scroll to <strong className="text-white">Webhooks</strong> and click <strong className="text-white">Add Callback URL</strong>.</li>
              <li>Paste your Appalix webhook URL in <strong className="text-white">Callback URL</strong>.</li>
              <li>In <strong className="text-white">Verify Token</strong>, enter the verify token from your Appalix integration config (found in the edit page). Appalix will respond to the verification challenge automatically.</li>
              <li>Click <strong className="text-white">Verify and Save</strong>.</li>
              <li>Under <strong className="text-white">Webhook Fields</strong>, subscribe to <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">messages</code> and <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">messaging_postbacks</code>.</li>
              <li>Click <strong className="text-white">Subscribe</strong> next to your Page.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 5 — Save credentials in Appalix</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>In Appalix, click <strong className="text-white">Edit</strong> on the Facebook Messenger integration.</li>
              <li>Paste the <strong className="text-white">Page Access Token</strong> from Step 3.</li>
              <li>Copy the <strong className="text-white">App Secret</strong> from your Meta app&apos;s <em>Basic Settings</em> and paste it too.</li>
              <li>Click <strong className="text-white">Save changes</strong>.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 6 — Test it</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Open your Facebook Page and click <strong className="text-white">Send Message</strong>.</li>
              <li>Send a test message — the bot should reply within a few seconds.</li>
              <li>Check <strong className="text-white">Conversations</strong> in Appalix — the message will appear with platform <em>Facebook Messenger</em>.</li>
            </ol>
            <p className="mt-3 text-sm text-gray-400">
              Note: while the Meta app is in <em>Development</em> mode, only Page admins and app testers can send messages to it. Submit the app for review to make it available to everyone.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Tips &amp; best practices</h2>
            <ul className="list-disc pl-5 space-y-3">
              <li><strong className="text-white">Enable lead capture</strong> — Appalix detects emails and phone numbers in Messenger conversations and pushes them to your CRM automatically.</li>
              <li><strong className="text-white">App review</strong> — for production use (non-admin users), you&apos;ll need to submit your Meta app for review and get the <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">pages_messaging</code> permission approved.</li>
              <li><strong className="text-white">24-hour rule</strong> — Meta&apos;s Messenger policy requires a human response within 24 hours for some message types. Configure human handoff in Appalix to ensure compliance.</li>
            </ul>
          </section>

          <section className="rounded-2xl bg-brand-600/10 border border-brand-600/20 p-6 text-center mt-12">
            <p className="text-2xl mb-3">💬</p>
            <h3 className="text-lg font-semibold text-white mb-2">Connect your bot to Facebook Messenger</h3>
            <p className="text-sm text-gray-400 mb-5">
              Create a Messenger integration in Appalix, set up your Meta app, and your bot will be replying to customers automatically.
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
