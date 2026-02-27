import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'How to Connect Appalix to Google Chat | AI Bot for Google Workspace',
  description:
    'Add an Appalix AI bot to Google Chat spaces and DMs. Step-by-step guide to creating a Google Chat app and connecting it to Appalix using an HTTP endpoint.',
  keywords: [
    'Google Chat AI bot',
    'Appalix Google Chat integration',
    'Google Workspace chatbot',
    'Google Chat app setup',
    'AI assistant Google Chat',
  ],
}

export default function ConnectGoogleChatPage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <div className="max-w-3xl mx-auto">

        <div className="flex items-center gap-2 text-sm text-gray-500 mb-10">
          <Link href="/resources" className="hover:text-brand-400 transition-colors">Resources</Link>
          <span>/</span>
          <span className="text-gray-400">Connect Google Chat</span>
        </div>

        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-400 border border-brand-600/20 font-medium">Tutorial</span>
            <span className="text-xs text-gray-500">9 min read · Core plan and above</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            How to Connect Appalix to Google Chat
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Deploy your Appalix AI bot as a Google Chat app that answers questions in Spaces and direct messages. Ideal for internal teams on Google Workspace — train it on your internal docs and it becomes your team&apos;s always-available knowledge assistant.
          </p>
        </div>

        <div className="border-t border-white/10 mb-10" />

        <div className="prose prose-invert prose-brand max-w-none space-y-10 text-gray-300">

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What you&apos;ll need</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>An <strong className="text-white">Appalix account</strong> on Core plan or above</li>
              <li>A <strong className="text-white">Google Workspace account</strong> with permission to create Google Chat apps</li>
              <li>Access to <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-brand-400 hover:text-brand-300 underline">Google Cloud Console</a></li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 1 — Create a Google Chat integration in Appalix</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Go to <strong className="text-white">Integrations → Add integration</strong> and choose <strong className="text-white">Google Chat</strong>.</li>
              <li>Name the integration and select a bot.</li>
              <li>Click <strong className="text-white">Create integration</strong>, then open the setup page — note your endpoint URL:
                <pre className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-brand-300 overflow-x-auto mt-3">
                  {`https://api.appalix.ai/webhooks/google-chat/{your-integration-id}`}
                </pre>
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 2 — Create a Google Cloud project</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-brand-400 hover:text-brand-300 underline">console.cloud.google.com</a> and create a new project (or use an existing one).</li>
              <li>In the project, enable the <strong className="text-white">Google Chat API</strong>: go to <em>APIs &amp; Services → Library</em>, search for &quot;Google Chat API&quot;, and click <strong className="text-white">Enable</strong>.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 3 — Configure the Chat app</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Go to <strong className="text-white">APIs &amp; Services → Google Chat API → Configuration</strong>.</li>
              <li>Fill in the app details:
                <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
                  <li><strong className="text-white">App name</strong>: e.g. <em>Appalix Bot</em></li>
                  <li><strong className="text-white">Avatar URL</strong>: your logo or Appalix&apos;s <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">https://appalix.ai/logo.png</code></li>
                  <li><strong className="text-white">Description</strong>: <em>AI assistant powered by Appalix</em></li>
                </ul>
              </li>
              <li>Under <strong className="text-white">Connection settings</strong>, select <strong className="text-white">HTTP endpoint URL</strong>.</li>
              <li>Paste your Appalix endpoint URL in the field.</li>
              <li>Under <strong className="text-white">Visibility</strong>, select <em>Specific people and groups in your domain</em> and add the users or groups you want to be able to use the bot.</li>
              <li>Click <strong className="text-white">Save</strong>.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 4 — Test it in Google Chat</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Open <a href="https://chat.google.com" target="_blank" rel="noreferrer" className="text-brand-400 hover:text-brand-300 underline">chat.google.com</a>.</li>
              <li>Click <strong className="text-white">+ New chat → Search for people, groups, or apps</strong> and search for your app name.</li>
              <li>Open a DM with the bot and send a message — it should reply within seconds.</li>
              <li>To use the bot in a Space, open the space, click the <strong className="text-white">+</strong> next to <em>Apps</em> in the sidebar, and add your app.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Tips &amp; best practices</h2>
            <ul className="list-disc pl-5 space-y-3">
              <li><strong className="text-white">Internal assistant</strong> — create a bot with type <em>Internal assistant</em> in Appalix and train it on your company&apos;s internal docs, Notion pages, or any other sources. It becomes your team&apos;s AI knowledge base in Google Chat.</li>
              <li><strong className="text-white">Thread replies</strong> — Appalix replies in the same thread so conversations stay organised in Spaces.</li>
              <li><strong className="text-white">Domain-wide deployment</strong> — a Google Workspace admin can push the app to all users in the domain via the Admin Console, so everyone gets immediate access without needing to add the bot manually.</li>
            </ul>
          </section>

          <section className="rounded-2xl bg-brand-600/10 border border-brand-600/20 p-6 text-center mt-12">
            <p className="text-2xl mb-3">💬</p>
            <h3 className="text-lg font-semibold text-white mb-2">Bring Appalix into Google Chat</h3>
            <p className="text-sm text-gray-400 mb-5">
              Create a Google Chat integration in Appalix and configure your Google Chat app to point at Appalix. Your AI assistant will be live in your workspace in minutes.
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
