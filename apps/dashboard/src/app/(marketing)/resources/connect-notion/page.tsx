import Link from 'next/link'
import type { Metadata } from 'next'
import { ArticleSeo } from '@/components/marketing/article-seo'

export const metadata: Metadata = {
  title: 'Connect Notion to Appalix — Index Notion Pages as an AI Knowledge Base',
  description:
    'Turn Notion pages into a live AI knowledge base. Create a Notion integration token, share your page, and add it as a source in Appalix — your bot answers from your docs in minutes.',
  keywords: [
    'Appalix Notion integration',
    'Notion knowledge base AI',
    'index Notion page chatbot',
    'Notion internal integration token',
    'AI bot Notion docs',
    'Notion AI training',
    'connect Notion chatbot',
    'Notion workspace knowledge base',
  ],
  alternates: { canonical: 'https://appalix.ai/resources/connect-notion' },
  openGraph: {
    title: 'Connect Notion to Appalix — Index Notion Pages as an AI Knowledge Base',
    description: 'Turn Notion pages into a live AI knowledge base. Create an integration token, share your page, and add it as a source in Appalix.',
    url: 'https://appalix.ai/resources/connect-notion',
    type: 'article',
    siteName: 'Appalix',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Connect Notion to Appalix — Index Notion Pages as an AI Knowledge Base',
    description: 'Turn Notion pages into a live AI knowledge base. Create an integration token, share your page, and add it as a source in Appalix.',
  },
}

export default function ConnectNotionPage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <ArticleSeo
        type="HowTo"
        title="How to Connect Notion to Appalix"
        description="Turn Notion pages into a live AI knowledge base. Create an integration token, share your page, and add it as a source in Appalix — your bot answers from your docs in minutes."
        slug="connect-notion"
        datePublished="2026-02-28"
        steps={[
          { name: 'Create a Notion integration', text: 'Go to notion.so/my-integrations, click + New integration, name it Appalix, set capabilities to Read content only, and copy the Internal Integration Token starting with secret_.' },
          { name: 'Share your Notion page with the integration', text: 'Open the Notion page you want to index, click Share → Invite, search for your integration name, select it, and click Invite to grant access.' },
          { name: 'Copy the Notion page URL', text: 'While viewing the page, copy the URL from your browser address bar — it looks like notion.so/your-workspace/Page-Title-abc123def456.' },
          { name: 'Add the source in Appalix and verify', text: 'In Appalix, go to Sources → Add source → Notion, enter a name, paste the page URL and integration token, click Add & index source, then verify it shows Ready status in the Sources list.' },
        ]}
      />
      <div className="max-w-3xl mx-auto">

        <div className="flex items-center gap-2 text-sm text-gray-500 mb-10">
          <Link href="/resources" className="hover:text-brand-400 transition-colors">Resources</Link>
          <span>/</span>
          <span className="text-gray-400">Connect Notion to Appalix</span>
        </div>

        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-400 border border-brand-600/20 font-medium">Tutorial</span>
            <span className="text-xs text-gray-500">7 min read · Pro plan and above</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            How to Connect Notion to Appalix
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Turn any Notion page — product docs, SOPs, FAQs, release notes — into a live knowledge source your AI bot can query. Appalix fetches and indexes the page content via Notion&apos;s API; all you need is an integration token and a shared page.
          </p>
        </div>

        <div className="border-t border-white/10 mb-10" />

        <div className="prose prose-invert prose-brand max-w-none space-y-10 text-gray-300">

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What you&apos;ll need</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>An <strong className="text-white">Appalix account</strong> on the Pro plan or above</li>
              <li>A <strong className="text-white">Notion account</strong> with access to the page you want to index</li>
              <li>A configured <strong className="text-white">bot</strong> in Appalix with RAG enabled</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 1 — Create a Notion integration</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>
                Go to <a href="https://www.notion.so/my-integrations" target="_blank" rel="noreferrer" className="text-brand-400 hover:text-brand-300 underline">notion.so/my-integrations</a> and click <strong className="text-white">+ New integration</strong>.
              </li>
              <li>Give it a name (e.g. <em>Appalix</em>), select your workspace, and set capabilities to <strong className="text-white">Read content</strong> only.</li>
              <li>Click <strong className="text-white">Save</strong>. Copy the <strong className="text-white">Internal Integration Token</strong> — it starts with <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">secret_</code>.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 2 — Share your Notion page with the integration</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Open the Notion page you want to index.</li>
              <li>Click <strong className="text-white">Share</strong> (top-right) → <strong className="text-white">Invite</strong>.</li>
              <li>Search for the integration name you just created and select it, then click <strong className="text-white">Invite</strong>.</li>
            </ol>
            <p className="mt-3 text-sm text-gray-400">
              Child pages inherit access automatically — share the top-level page if you want to index a whole section.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 3 — Copy the page URL</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>While viewing the page, copy the URL from your browser. It looks like:</li>
            </ol>
            <pre className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-brand-300 overflow-x-auto mt-3">
              {`https://www.notion.so/your-workspace/Page-Title-abc123def456`}
            </pre>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 4 — Add the source in Appalix</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>In Appalix, go to <strong className="text-white">Sources → Add source</strong> and select <strong className="text-white">Notion</strong>.</li>
              <li>Enter a <strong className="text-white">Source name</strong> (e.g. <em>Product Docs</em>).</li>
              <li>Paste the <strong className="text-white">Notion page URL</strong> from Step 3.</li>
              <li>Paste the <strong className="text-white">Integration token</strong> (<code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">secret_…</code>) from Step 1.</li>
              <li>Click <strong className="text-white">Add &amp; index source</strong>.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 5 — Verify the source is ready</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Go to <strong className="text-white">Sources</strong> — the Notion source will show <em>Processing</em> while being indexed.</li>
              <li>Once it shows <strong className="text-white">Ready</strong>, your bot can answer questions from that page.</li>
              <li>Test it in the <strong className="text-white">Playground</strong> by asking something covered in your Notion docs.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Tips &amp; best practices</h2>
            <ul className="list-disc pl-5 space-y-3">
              <li><strong className="text-white">Multiple pages</strong> — add each Notion page as a separate source; Appalix indexes them independently.</li>
              <li><strong className="text-white">Re-sync after edits</strong> — when you update the page content, click <strong className="text-white">Re-sync</strong> on the source to refresh the index.</li>
              <li><strong className="text-white">Read-only token</strong> — the default integration only has read-content capability, which is all Appalix needs.</li>
            </ul>
          </section>

          <section className="rounded-2xl bg-brand-600/10 border border-brand-600/20 p-6 text-center mt-12">
            <p className="text-2xl mb-3">📝</p>
            <h3 className="text-lg font-semibold text-white mb-2">Index your Notion docs in minutes</h3>
            <p className="text-sm text-gray-400 mb-5">
              Create an integration in Notion, share your page, and paste the credentials into Appalix. Your bot will be answering from your docs right away.
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
