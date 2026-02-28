import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'How to Connect Google Drive to Appalix | Index Google Docs as Knowledge Base',
  description:
    'Step-by-step guide to indexing Google Drive files and Google Docs in Appalix. Generate an OAuth access token, add your file URL, and your AI bot will answer questions from your Drive content.',
  keywords: [
    'Appalix Google Drive integration',
    'Google Drive knowledge base AI',
    'index Google Doc chatbot',
    'Google OAuth access token drive.readonly',
    'AI bot Google Docs',
  ],
}

export default function ConnectGoogleDrivePage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <div className="max-w-3xl mx-auto">

        <div className="flex items-center gap-2 text-sm text-gray-500 mb-10">
          <Link href="/resources" className="hover:text-brand-400 transition-colors">Resources</Link>
          <span>/</span>
          <span className="text-gray-400">Connect Google Drive to Appalix</span>
        </div>

        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-400 border border-brand-600/20 font-medium">Tutorial</span>
            <span className="text-xs text-gray-500">8 min read · Pro plan and above</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            How to Connect Google Drive to Appalix
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Index Google Docs, Sheets, or any Drive file so your AI bot can answer questions from your team&apos;s documents. Appalix reads the file content via the Drive API — you supply the file URL and a read-only OAuth token.
          </p>
        </div>

        <div className="border-t border-white/10 mb-10" />

        <div className="prose prose-invert prose-brand max-w-none space-y-10 text-gray-300">

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What you&apos;ll need</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>An <strong className="text-white">Appalix account</strong> on the Pro plan or above</li>
              <li>A <strong className="text-white">Google account</strong> with access to the file you want to index</li>
              <li>A configured <strong className="text-white">bot</strong> in Appalix with RAG enabled</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 1 — Copy the Google Drive file URL</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Open the Google Doc (or Drive file) in your browser.</li>
              <li>Copy the URL from the address bar. For Google Docs it looks like:</li>
            </ol>
            <pre className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-brand-300 overflow-x-auto mt-3">
              {`https://docs.google.com/document/d/FILE_ID/edit`}
            </pre>
            <p className="mt-3 text-sm text-gray-400">
              For other Drive files, use the shareable link from <strong className="text-white">Share → Copy link</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 2 — Generate an OAuth access token</h2>
            <p className="mb-3 text-sm text-gray-400">
              The quickest way to get a read-only token is via the Google OAuth Playground.
            </p>
            <ol className="list-decimal pl-5 space-y-3">
              <li>
                Go to <a href="https://developers.google.com/oauthplayground" target="_blank" rel="noreferrer" className="text-brand-400 hover:text-brand-300 underline">developers.google.com/oauthplayground</a>.
              </li>
              <li>
                In the left panel, find <strong className="text-white">Drive API v3</strong> and select the scope:
                <pre className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-brand-300 mt-2">
                  {`https://www.googleapis.com/auth/drive.readonly`}
                </pre>
              </li>
              <li>Click <strong className="text-white">Authorize APIs</strong> and sign in with the Google account that owns the file.</li>
              <li>Click <strong className="text-white">Exchange authorization code for tokens</strong>.</li>
              <li>Copy the <strong className="text-white">Access token</strong> — it starts with <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">ya29.</code></li>
            </ol>
            <div className="mt-4 bg-amber-900/20 border border-amber-700/40 rounded-xl p-4 text-sm text-amber-300">
              <strong>Note:</strong> OAuth Playground tokens expire after ~1 hour. Use them for a quick test, but for a permanent setup continue to Step 2b below.
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 2b — Use a Service Account (permanent, recommended)</h2>
            <p className="mb-3 text-sm text-gray-400">Service Account keys never expire. This is the best approach for production use.</p>
            <ol className="list-decimal pl-5 space-y-3">
              <li>
                Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-brand-400 hover:text-brand-300 underline">Google Cloud Console</a> → select or create a project → <strong className="text-white">APIs &amp; Services → Enable APIs</strong> → enable <strong className="text-white">Google Drive API</strong>.
              </li>
              <li>Go to <strong className="text-white">IAM &amp; Admin → Service Accounts → Create Service Account</strong>. Give it a name and click <strong className="text-white">Done</strong>.</li>
              <li>Click the service account → <strong className="text-white">Keys → Add Key → Create new key → JSON</strong>. A <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">.json</code> file will download automatically.</li>
              <li>
                Share the Google Drive file with the service account&apos;s email address (shown in the service account list, e.g. <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">name@project.iam.gserviceaccount.com</code>) — just like sharing with a colleague, with <strong className="text-white">Viewer</strong> access.
              </li>
              <li>Open the downloaded <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">.json</code> key file in a text editor and copy the entire contents.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 3 — Add the source in Appalix</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>In Appalix, go to <strong className="text-white">Sources → Add source</strong> and select <strong className="text-white">Google Drive</strong>.</li>
              <li>Enter a <strong className="text-white">Source name</strong> (e.g. <em>Product Spec Doc</em>).</li>
              <li>Paste the <strong className="text-white">Google Drive file URL</strong> from Step 1.</li>
              <li>
                In the <strong className="text-white">OAuth access token</strong> field, paste <em>either</em>:
                <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
                  <li>Your short-lived OAuth token (<code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">ya29.…</code>) from Step 2a, <strong className="text-white">or</strong></li>
                  <li>The full contents of your Service Account JSON key file from Step 2b — Appalix will exchange it for a token automatically.</li>
                </ul>
              </li>
              <li>Click <strong className="text-white">Add &amp; index source</strong>.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 4 — Verify the source is ready</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Go to <strong className="text-white">Sources</strong> — the Google Drive source will show <em>Processing</em> while indexing.</li>
              <li>Once it shows <strong className="text-white">Ready</strong>, your bot can answer questions from that document.</li>
              <li>Test it in the <strong className="text-white">Playground</strong>.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Tips &amp; best practices</h2>
            <ul className="list-disc pl-5 space-y-3">
              <li><strong className="text-white">Service Account is permanent</strong> — unlike OAuth Playground tokens that expire hourly, a Service Account key works indefinitely. Use it for any source you want to re-sync regularly.</li>
              <li><strong className="text-white">One file per source</strong> — add each Drive file as a separate source for granular control and re-syncing.</li>
              <li><strong className="text-white">Re-sync after edits</strong> — click <strong className="text-white">Re-sync</strong> on the source whenever the document changes. The service account key is reused automatically.</li>
              <li><strong className="text-white">Shared Drive files</strong> — share the file directly with the service account email, just as you would with any user.</li>
            </ul>
          </section>

          <section className="rounded-2xl bg-brand-600/10 border border-brand-600/20 p-6 text-center mt-12">
            <p className="text-2xl mb-3">☁️</p>
            <h3 className="text-lg font-semibold text-white mb-2">Index your Google Docs instantly</h3>
            <p className="text-sm text-gray-400 mb-5">
              Get a read-only OAuth token from Google, paste it into Appalix alongside your file URL, and your bot will be answering from your Drive content in minutes.
            </p>
            <Link
              href="/login"
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
