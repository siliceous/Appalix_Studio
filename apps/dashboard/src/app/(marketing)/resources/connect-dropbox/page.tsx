import Link from 'next/link'
import type { Metadata } from 'next'
import { ArticleSeo } from '@/components/marketing/article-seo'

export const metadata: Metadata = {
  title: 'Connect Dropbox to Appalix — Index Dropbox Files as AI Knowledge Base',
  description:
    'Index Dropbox documents and shared links as AI knowledge sources. Create a Dropbox app in the App Console, generate a long-lived access token, and add any file path or shared link. Step-by-step guide.',
  keywords: [
    'Appalix Dropbox integration',
    'Dropbox knowledge base AI',
    'index Dropbox file chatbot',
    'Dropbox App Console access token',
    'AI bot Dropbox docs',
    'Dropbox AI training',
    'train AI on Dropbox files',
    'Dropbox chatbot knowledge base',
  ],
  alternates: { canonical: 'https://appalix.ai/resources/connect-dropbox' },
  openGraph: {
    title: 'Connect Dropbox to Appalix — Index Dropbox Files as AI Knowledge Base',
    description: 'Index Dropbox documents as AI knowledge sources. Generate an access token and your bot answers from your files.',
    url: 'https://appalix.ai/resources/connect-dropbox',
    type: 'article',
    siteName: 'Appalix',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Connect Dropbox to Appalix — Index Dropbox Files as AI Knowledge Base',
    description: 'Index Dropbox documents as AI knowledge sources. Generate an access token and your bot answers from your files.',
  },
}

export default function ConnectDropboxPage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <ArticleSeo
        type="HowTo"
        title="How to Connect Dropbox to Appalix"
        description="Index Dropbox documents and shared links as AI knowledge sources. Create a Dropbox app in the App Console, generate a long-lived access token, and add any file path or shared link."
        slug="connect-dropbox"
        datePublished="2026-02-28"
        steps={[
          { name: 'Create a Dropbox app and generate an access token', text: 'Go to the Dropbox App Console, create a new app with Full Dropbox access, and generate a long-lived access token from the Settings tab.' },
          { name: 'Get your Dropbox file path or shared link', text: 'In Dropbox, right-click your file or folder and copy the path (e.g. /Documents/handbook.pdf) or create a shared link.' },
          { name: 'Add Dropbox as a knowledge source in Appalix', text: 'In Appalix, go to Sources → Add Source → Dropbox, paste your access token and file path or shared link, then save and sync.' },
          { name: 'Test the knowledge source', text: 'In your Appalix bot preview, ask a question answered in the indexed Dropbox document and verify the AI bot responds correctly.' },
        ]}
      />
      <div className="max-w-3xl mx-auto">

        <div className="flex items-center gap-2 text-sm text-gray-500 mb-10">
          <Link href="/resources" className="hover:text-brand-400 transition-colors">Resources</Link>
          <span>/</span>
          <span className="text-gray-400">Connect Dropbox to Appalix</span>
        </div>

        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-400 border border-brand-600/20 font-medium">Tutorial</span>
            <span className="text-xs text-gray-500">7 min read · Pro plan and above</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            How to Connect Dropbox to Appalix
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Index documents stored in Dropbox — PDFs, text files, or any shareable link — so your AI bot can answer questions from them. You create a small Dropbox app to get a long-lived access token, then paste it into Appalix.
          </p>
        </div>

        <div className="border-t border-white/10 mb-10" />

        <div className="prose prose-invert prose-brand max-w-none space-y-10 text-gray-300">

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What you&apos;ll need</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>An <strong className="text-white">Appalix account</strong> on the Pro plan or above</li>
              <li>A <strong className="text-white">Dropbox account</strong> with access to the file you want to index</li>
              <li>A configured <strong className="text-white">bot</strong> in Appalix with RAG enabled</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 1 — Create a Dropbox app</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>
                Go to <a href="https://www.dropbox.com/developers/apps" target="_blank" rel="noreferrer" className="text-brand-400 hover:text-brand-300 underline">dropbox.com/developers/apps</a> and click <strong className="text-white">Create app</strong>.
              </li>
              <li>Choose <strong className="text-white">Scoped access</strong> → <strong className="text-white">Full Dropbox</strong>.</li>
              <li>Give the app a name (e.g. <em>Appalix Connector</em>) and click <strong className="text-white">Create app</strong>.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 2 — Set read permissions</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>In the app settings, go to the <strong className="text-white">Permissions</strong> tab.</li>
              <li>Enable <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">files.content.read</code> and <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">sharing.read</code>.</li>
              <li>Click <strong className="text-white">Submit</strong> to save the permission changes.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 3 — Generate a long-lived access token</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Go back to the <strong className="text-white">Settings</strong> tab of your app.</li>
              <li>Scroll to the <strong className="text-white">OAuth 2</strong> section and click <strong className="text-white">Generate</strong> under <em>Generated access token</em>.</li>
              <li>Copy the token — it starts with <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">sl.</code></li>
            </ol>
            <p className="mt-3 text-sm text-gray-400">
              This token does not expire automatically, giving Appalix stable long-term access for re-syncing.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 4 — Get the file path or shared link</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>
                <strong className="text-white">File path</strong> — use the full Dropbox path, e.g.:
                <pre className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-brand-300 mt-2">
                  {`/Documents/product-guide.pdf`}
                </pre>
              </li>
              <li>
                <strong className="text-white">Shared link</strong> — right-click the file in Dropbox → <strong className="text-white">Share → Create link → Copy</strong>. It looks like:
                <pre className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-brand-300 mt-2">
                  {`https://www.dropbox.com/s/abc123/filename.pdf?dl=0`}
                </pre>
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 5 — Add the source in Appalix</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>In Appalix, go to <strong className="text-white">Sources → Add source</strong> and select <strong className="text-white">Dropbox</strong>.</li>
              <li>Enter a <strong className="text-white">Source name</strong> (e.g. <em>Product Guide</em>).</li>
              <li>Paste the <strong className="text-white">file path or shared link</strong> from Step 4.</li>
              <li>Paste the <strong className="text-white">access token</strong> (<code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">sl.…</code>) from Step 3.</li>
              <li>Click <strong className="text-white">Add &amp; index source</strong>.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 6 — Verify the source is ready</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Go to <strong className="text-white">Sources</strong> — the Dropbox source will show <em>Processing</em> while being indexed.</li>
              <li>Once it shows <strong className="text-white">Ready</strong>, your bot can answer from that file.</li>
              <li>Test it in the <strong className="text-white">Playground</strong>.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Tips &amp; best practices</h2>
            <ul className="list-disc pl-5 space-y-3">
              <li><strong className="text-white">One file per source</strong> — add each Dropbox file as a separate source for independent re-syncing.</li>
              <li><strong className="text-white">Re-sync after updates</strong> — when you replace or edit the file in Dropbox, click <strong className="text-white">Re-sync</strong> on the source in Appalix.</li>
              <li><strong className="text-white">Token security</strong> — the token is stored encrypted. We recommend scoping the app to <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">files.content.read</code> only so Appalix has no write access.</li>
            </ul>
          </section>

          <section className="rounded-2xl bg-brand-600/10 border border-brand-600/20 p-6 text-center mt-12">
            <p className="text-2xl mb-3">📦</p>
            <h3 className="text-lg font-semibold text-white mb-2">Index your Dropbox files in minutes</h3>
            <p className="text-sm text-gray-400 mb-5">
              Create a Dropbox app, generate a token, and paste it into Appalix. Your bot will start answering from your stored documents right away.
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
