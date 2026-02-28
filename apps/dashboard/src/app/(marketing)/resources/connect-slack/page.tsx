import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'How to Connect Appalix to Slack | AI Bot in Slack Channels & DMs',
  description:
    'Deploy your Appalix AI bot inside Slack so it answers questions in channels and DMs automatically. Step-by-step: create a Slack app, set up event subscriptions, and go live.',
  keywords: [
    'Appalix Slack integration',
    'AI bot in Slack',
    'Slack chatbot setup',
    'Slack app event subscriptions',
    'AI assistant Slack',
  ],
}

export default function ConnectSlackPage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <div className="max-w-3xl mx-auto">

        <div className="flex items-center gap-2 text-sm text-gray-500 mb-10">
          <Link href="/resources" className="hover:text-brand-400 transition-colors">Resources</Link>
          <span>/</span>
          <span className="text-gray-400">Connect Appalix to Slack</span>
        </div>

        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-400 border border-brand-600/20 font-medium">Tutorial</span>
            <span className="text-xs text-gray-500">9 min read · Core plan and above</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            How to Connect Appalix to Slack
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Put your AI bot inside Slack so it automatically answers questions from your team or customers in channels and direct messages. Appalix handles all message processing — you just create a Slack app, point its events at Appalix, and install it to your workspace.
          </p>
        </div>

        <div className="border-t border-white/10 mb-10" />

        <div className="prose prose-invert prose-brand max-w-none space-y-10 text-gray-300">

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What you&apos;ll need</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>An <strong className="text-white">Appalix account</strong> on Core plan or above</li>
              <li>A <strong className="text-white">Slack workspace</strong> where you have admin rights (or permission to install apps)</li>
              <li>A configured <strong className="text-white">bot</strong> in Appalix</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 1 — Create a Slack integration in Appalix</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Go to <strong className="text-white">Integrations → Add integration</strong> and choose <strong className="text-white">Slack</strong>.</li>
              <li>Name the integration and select a bot. You&apos;ll fill in the Slack credentials after creating the Slack app.</li>
              <li>Click <strong className="text-white">Create integration</strong>, then open the integration setup page — copy the <strong className="text-white">webhook endpoint URL</strong>.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 2 — Create a Slack app</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Go to <a href="https://api.slack.com/apps" target="_blank" rel="noreferrer" className="text-brand-400 hover:text-brand-300 underline">api.slack.com/apps</a> and click <strong className="text-white">Create New App → From scratch</strong>.</li>
              <li>Enter an app name (e.g. <em>Appalix Bot</em>) and choose your workspace. Click <strong className="text-white">Create App</strong>.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 3 — Add bot permissions</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>In the app settings sidebar, click <strong className="text-white">OAuth &amp; Permissions</strong>.</li>
              <li>Under <strong className="text-white">Bot Token Scopes</strong>, add these scopes:
                <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
                  <li><code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">channels:history</code> — read messages in channels</li>
                  <li><code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">im:history</code> — read direct messages</li>
                  <li><code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">chat:write</code> — send replies</li>
                  <li><code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">app_mentions:read</code> — receive @mentions</li>
                </ul>
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 4 — Enable Event Subscriptions</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>In the sidebar, click <strong className="text-white">Event Subscriptions</strong> and toggle it <strong className="text-white">On</strong>.</li>
              <li>
                Paste the Appalix webhook URL in the <strong className="text-white">Request URL</strong> field:
                <pre className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-brand-300 overflow-x-auto mt-3">
                  {`https://api.appalix.ai/webhooks/slack/{your-integration-id}`}
                </pre>
                Slack will immediately send a challenge request — Appalix will respond correctly and Slack will show a green ✓ verified status.
              </li>
              <li>Under <strong className="text-white">Subscribe to bot events</strong>, add:
                <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
                  <li><code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">message.channels</code> — messages in public channels</li>
                  <li><code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">message.im</code> — direct messages to the bot</li>
                  <li><code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">app_mention</code> — @mentions in any channel</li>
                </ul>
              </li>
              <li>Click <strong className="text-white">Save Changes</strong>.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 5 — Install the app &amp; copy credentials</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Go to <strong className="text-white">Install App</strong> in the sidebar and click <strong className="text-white">Install to Workspace</strong>. Authorise the permissions.</li>
              <li>Copy the <strong className="text-white">Bot User OAuth Token</strong> (starts with <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">xoxb-</code>).</li>
              <li>Go to <strong className="text-white">Basic Information → App Credentials</strong> and copy the <strong className="text-white">Signing Secret</strong>.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 6 — Save credentials in Appalix</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>In Appalix, click <strong className="text-white">Edit</strong> on your Slack integration.</li>
              <li>Paste the <strong className="text-white">Bot Token</strong> and <strong className="text-white">Signing Secret</strong> from Step 5.</li>
              <li>Click <strong className="text-white">Save changes</strong>.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 7 — Test it</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>In Slack, invite your bot to a channel: <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">/invite @AppallixBot</code>.</li>
              <li>@mention the bot or send it a DM: <em>&quot;@AppalixBot what can you help with?&quot;</em></li>
              <li>The bot should reply in the thread within a few seconds.</li>
              <li>The conversation appears in Appalix under <strong className="text-white">Conversations</strong> with platform tagged as <em>Slack</em>.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Tips &amp; best practices</h2>
            <ul className="list-disc pl-5 space-y-3">
              <li><strong className="text-white">Thread replies</strong> — Appalix replies in-thread by default to keep channels tidy.</li>
              <li><strong className="text-white">Internal assistant</strong> — for team use, create a bot with type <em>Internal assistant</em> and train it on your internal docs, SOPs, and product knowledge base.</li>
              <li><strong className="text-white">Human handoff</strong> — configure a separate Slack webhook in the Handoff section so a different channel gets notified when a user escalates.</li>
            </ul>
          </section>

          <section className="rounded-2xl bg-brand-600/10 border border-brand-600/20 p-6 text-center mt-12">
            <p className="text-2xl mb-3">💬</p>
            <h3 className="text-lg font-semibold text-white mb-2">Bring your AI bot into Slack</h3>
            <p className="text-sm text-gray-400 mb-5">
              Create a Slack integration in Appalix, create a Slack app, and your bot will be answering questions in channels within minutes.
            </p>
            <Link
              href="/integrations/new"
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
