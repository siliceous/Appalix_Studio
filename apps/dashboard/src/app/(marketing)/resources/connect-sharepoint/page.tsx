import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'How to Connect SharePoint to Appalix | Index SharePoint Files as Knowledge Base',
  description:
    'Step-by-step guide to indexing Microsoft SharePoint files in Appalix. Generate a Microsoft Graph access token, find your Site ID, and add any SharePoint document as a knowledge source for your AI bot.',
  keywords: [
    'Appalix SharePoint integration',
    'SharePoint knowledge base AI',
    'index SharePoint file chatbot',
    'Microsoft Graph SharePoint Site ID',
    'AI bot SharePoint docs',
  ],
}

export default function ConnectSharePointPage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <div className="max-w-3xl mx-auto">

        <div className="flex items-center gap-2 text-sm text-gray-500 mb-10">
          <Link href="/resources" className="hover:text-brand-400 transition-colors">Resources</Link>
          <span>/</span>
          <span className="text-gray-400">Connect SharePoint to Appalix</span>
        </div>

        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-400 border border-brand-600/20 font-medium">Tutorial</span>
            <span className="text-xs text-gray-500">10 min read · Pro plan and above</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            How to Connect SharePoint to Appalix
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Index documents from Microsoft SharePoint sites so your AI bot can answer questions from your organisation&apos;s intranet content, policies, and wikis. Appalix uses the Microsoft Graph API — you need a token, the file URL, and your SharePoint Site ID.
          </p>
        </div>

        <div className="border-t border-white/10 mb-10" />

        <div className="prose prose-invert prose-brand max-w-none space-y-10 text-gray-300">

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What you&apos;ll need</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>An <strong className="text-white">Appalix account</strong> on the Pro plan or above</li>
              <li>A <strong className="text-white">Microsoft 365 work or school account</strong> with access to the SharePoint site</li>
              <li>A configured <strong className="text-white">bot</strong> in Appalix with RAG enabled</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 1 — Copy the SharePoint file URL</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Open the SharePoint site and navigate to the document library.</li>
              <li>Click the file to open it, then copy the URL from the browser address bar. It looks like:</li>
            </ol>
            <pre className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-brand-300 overflow-x-auto mt-3">
              {`https://yourcompany.sharepoint.com/sites/MySite/Shared%20Documents/policy.docx`}
            </pre>
            <p className="mt-3 text-sm text-gray-400">
              Alternatively, right-click the file → <strong className="text-white">Share → Copy link</strong> to get a shareable URL.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 2 — Generate a Microsoft Graph access token</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>
                Go to <a href="https://developer.microsoft.com/en-us/graph/graph-explorer" target="_blank" rel="noreferrer" className="text-brand-400 hover:text-brand-300 underline">developer.microsoft.com/graph/graph-explorer</a>.
              </li>
              <li>Click <strong className="text-white">Sign in to Graph Explorer</strong> using your Microsoft 365 work or school account.</li>
              <li>Click <strong className="text-white">Modify permissions (Preview)</strong> in the left panel and consent to:</li>
            </ol>
            <ul className="list-disc pl-5 mt-3 space-y-1 text-sm">
              <li><code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">Files.Read.All</code> — read files across sites</li>
              <li><code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">Sites.Read.All</code> — read SharePoint site data</li>
            </ul>
            <ol className="list-decimal pl-5 space-y-3 mt-3" start={4}>
              <li>Click your profile icon (top-right) → <strong className="text-white">Access token</strong> and copy it. It starts with <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">eyJ0…</code></li>
            </ol>
            <div className="mt-4 bg-amber-900/20 border border-amber-700/40 rounded-xl p-4 text-sm text-amber-300">
              <strong>Note:</strong> Graph Explorer tokens expire after ~1 hour. For production, register an app in Azure AD and use client credentials flow for long-lived tokens.
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 3 — Find your SharePoint Site ID</h2>
            <p className="mb-3 text-sm text-gray-400">
              Appalix needs the Site ID to locate your file within the Graph API.
            </p>
            <ol className="list-decimal pl-5 space-y-3">
              <li>In Graph Explorer, make sure you&apos;re signed in, then run this request:</li>
            </ol>
            <pre className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-brand-300 overflow-x-auto mt-3">
              {`GET https://graph.microsoft.com/v1.0/sites?search=your-site-name`}
            </pre>
            <ol className="list-decimal pl-5 space-y-3 mt-3" start={2}>
              <li>Find your site in the response and copy the <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">id</code> field. It looks like:</li>
            </ol>
            <pre className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-brand-300 overflow-x-auto mt-3">
              {`yourcompany.sharepoint.com,aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee,ffffffff-gggg-hhhh-iiii-jjjjjjjjjjjj`}
            </pre>
            <p className="mt-3 text-sm text-gray-400">
              You can also get the site ID directly by appending <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">/_api/site/id</code> to your SharePoint site URL in a browser (requires login).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 4 — Add the source in Appalix</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>In Appalix, go to <strong className="text-white">Sources → Add source</strong> and select <strong className="text-white">SharePoint</strong>.</li>
              <li>Enter a <strong className="text-white">Source name</strong> (e.g. <em>HR Policies</em>).</li>
              <li>Paste the <strong className="text-white">SharePoint file URL</strong> from Step 1.</li>
              <li>Paste the <strong className="text-white">Microsoft Graph access token</strong> (<code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">eyJ0…</code>) from Step 2.</li>
              <li>Paste the <strong className="text-white">SharePoint Site ID</strong> from Step 3.</li>
              <li>Click <strong className="text-white">Add &amp; index source</strong>.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 5 — Verify the source is ready</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Go to <strong className="text-white">Sources</strong> — the SharePoint source will show <em>Processing</em> while indexing.</li>
              <li>Once it shows <strong className="text-white">Ready</strong>, your bot can answer questions from that document.</li>
              <li>Test it in the <strong className="text-white">Playground</strong> — ask a question that&apos;s covered in the document.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Tips &amp; best practices</h2>
            <ul className="list-disc pl-5 space-y-3">
              <li><strong className="text-white">One file per source</strong> — add each SharePoint document as a separate source for clean, independent re-syncing.</li>
              <li><strong className="text-white">Re-sync after edits</strong> — click <strong className="text-white">Re-sync</strong> on the source in Appalix whenever the document changes.</li>
              <li><strong className="text-white">IT admin approval</strong> — in some Microsoft 365 tenants, admin consent is required for Graph API permissions. Check with your IT admin if Graph Explorer shows permission errors.</li>
              <li><strong className="text-white">Production tokens</strong> — register an Azure AD application with <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">Sites.Read.All</code> app permission and use certificate-based auth for durable indexing.</li>
            </ul>
          </section>

          <section className="rounded-2xl bg-brand-600/10 border border-brand-600/20 p-6 text-center mt-12">
            <p className="text-2xl mb-3">🏢</p>
            <h3 className="text-lg font-semibold text-white mb-2">Bring your SharePoint content to life</h3>
            <p className="text-sm text-gray-400 mb-5">
              Index your organisation&apos;s policies, wikis, and intranet documents so your AI bot can answer questions from them instantly.
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
