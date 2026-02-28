import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'How to Connect OneDrive to Appalix | Index OneDrive Files as Knowledge Base',
  description:
    'Step-by-step guide to indexing Microsoft OneDrive files in Appalix. Generate a Microsoft Graph access token, add your file URL, and your AI bot will answer questions from your OneDrive content.',
  keywords: [
    'Appalix OneDrive integration',
    'OneDrive knowledge base AI',
    'index OneDrive file chatbot',
    'Microsoft Graph access token Files.Read',
    'AI bot OneDrive docs',
  ],
}

export default function ConnectOneDrivePage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <div className="max-w-3xl mx-auto">

        <div className="flex items-center gap-2 text-sm text-gray-500 mb-10">
          <Link href="/resources" className="hover:text-brand-400 transition-colors">Resources</Link>
          <span>/</span>
          <span className="text-gray-400">Connect OneDrive to Appalix</span>
        </div>

        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-400 border border-brand-600/20 font-medium">Tutorial</span>
            <span className="text-xs text-gray-500">8 min read · Pro plan and above</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            How to Connect OneDrive to Appalix
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Index Word documents, PDFs, or any file stored in Microsoft OneDrive so your AI bot can answer questions from them. Appalix uses the Microsoft Graph API with a read-only access token.
          </p>
        </div>

        <div className="border-t border-white/10 mb-10" />

        <div className="prose prose-invert prose-brand max-w-none space-y-10 text-gray-300">

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What you&apos;ll need</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>An <strong className="text-white">Appalix account</strong> on the Pro plan or above</li>
              <li>A <strong className="text-white">Microsoft account</strong> (personal or work/school) with access to the file</li>
              <li>A configured <strong className="text-white">bot</strong> in Appalix with RAG enabled</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 1 — Copy the OneDrive file URL</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Open <a href="https://onedrive.live.com" target="_blank" rel="noreferrer" className="text-brand-400 hover:text-brand-300 underline">OneDrive</a> and navigate to the file.</li>
              <li>Right-click the file → <strong className="text-white">Share → Copy link</strong>. The link looks like:</li>
            </ol>
            <pre className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-brand-300 overflow-x-auto mt-3">
              {`https://1drv.ms/w/s!AbcDef123…`}
            </pre>
            <p className="mt-3 text-sm text-gray-400">
              For work or school accounts you can also use the direct URL from the browser address bar when the file is open.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 2 — Generate a Microsoft Graph access token</h2>
            <p className="mb-3 text-sm text-gray-400">
              The easiest way is via Microsoft Graph Explorer. Graph Explorer only shows permissions relevant to the active query, so you must run a OneDrive query first to surface <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">Files.Read</code>.
            </p>
            <ol className="list-decimal pl-5 space-y-3">
              <li>
                Go to <a href="https://developer.microsoft.com/en-us/graph/graph-explorer" target="_blank" rel="noreferrer" className="text-brand-400 hover:text-brand-300 underline">developer.microsoft.com/graph/graph-explorer</a>.
              </li>
              <li>Click <strong className="text-white">Sign in to Graph Explorer</strong> and sign in with your Microsoft account.</li>
              <li>
                In the request URL bar at the top, replace the default URL with:
                <pre className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-brand-300 mt-2 overflow-x-auto">
                  {`https://graph.microsoft.com/v1.0/me/drive/root`}
                </pre>
                Click <strong className="text-white">Run query</strong>. It will return an error — that&apos;s expected.
              </li>
              <li>
                A blue <strong className="text-white">Modify permissions</strong> banner will appear below the request bar (or click the <strong className="text-white">Modify permissions</strong> tab). You will now see <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">Files.Read</code> and <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">Files.Read.All</code> in the list.
              </li>
              <li>Click <strong className="text-white">Consent</strong> next to <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">Files.Read</code> and approve the pop-up.</li>
              <li>Run the query again — it should now return your OneDrive root folder details.</li>
              <li>Click your <strong className="text-white">profile icon</strong> (top-right) → <strong className="text-white">Access token</strong> and copy the token. It starts with <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">eyJ0…</code></li>
            </ol>
            <div className="mt-4 bg-amber-900/20 border border-amber-700/40 rounded-xl p-4 text-sm text-amber-300">
              <strong>Note:</strong> Graph Explorer tokens expire after ~1 hour. For production, register an Azure AD app and use the client credentials flow to generate long-lived tokens.
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 3 — Add the source in Appalix</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>In Appalix, go to <strong className="text-white">Sources → Add source</strong> and select <strong className="text-white">OneDrive</strong>.</li>
              <li>Enter a <strong className="text-white">Source name</strong> (e.g. <em>Sales Playbook</em>).</li>
              <li>Paste the <strong className="text-white">OneDrive file URL</strong> from Step 1.</li>
              <li>Paste the <strong className="text-white">Microsoft Graph access token</strong> (<code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">eyJ0…</code>) from Step 2.</li>
              <li>Click <strong className="text-white">Add &amp; index source</strong>.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 4 — Verify the source is ready</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Go to <strong className="text-white">Sources</strong> — the OneDrive source will show <em>Processing</em> while indexing.</li>
              <li>Once it shows <strong className="text-white">Ready</strong>, your bot can answer questions from that file.</li>
              <li>Test it in the <strong className="text-white">Playground</strong>.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Tips &amp; best practices</h2>
            <ul className="list-disc pl-5 space-y-3">
              <li><strong className="text-white">One file per source</strong> — add each OneDrive file separately for granular re-syncing.</li>
              <li><strong className="text-white">Re-sync after edits</strong> — when the file changes, click <strong className="text-white">Re-sync</strong> on the source in Appalix.</li>
              <li><strong className="text-white">Work/school vs personal</strong> — Graph Explorer works for both account types. The scopes required are the same.</li>
              <li><strong className="text-white">Production tokens</strong> — register an app in Azure Portal → Azure Active Directory → App registrations to generate non-expiring tokens.</li>
            </ul>
          </section>

          <section className="rounded-2xl bg-brand-600/10 border border-brand-600/20 p-6 text-center mt-12">
            <p className="text-2xl mb-3">🗂️</p>
            <h3 className="text-lg font-semibold text-white mb-2">Index your OneDrive files in minutes</h3>
            <p className="text-sm text-gray-400 mb-5">
              Sign in to Microsoft Graph Explorer, copy the access token, and paste it into Appalix alongside your file URL. Your bot will be answering from your documents right away.
            </p>
            <Link
              href="/sources/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Go to Sources →
            </Link>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-white/10 flex items-center justify-between flex-wrap gap-4">
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
