import Link from 'next/link'
import type { Metadata } from 'next'
import { ArticleSeo } from '@/components/marketing/article-seo'

export const metadata: Metadata = {
  title: 'Connect GitBook to Appalix — Index GitBook Docs as AI Knowledge Base',
  description:
    'Turn your entire GitBook space into a live knowledge source. Generate a personal API token in GitBook, paste your space URL into Appalix, and your bot answers from your developer docs.',
  keywords: [
    'Appalix GitBook integration',
    'GitBook knowledge base AI',
    'index GitBook space chatbot',
    'GitBook API token',
    'AI bot GitBook docs',
    'train AI on GitBook',
    'GitBook AI chatbot',
    'developer docs AI chatbot',
  ],
  alternates: { canonical: 'https://appalix.ai/resources/connect-gitbook' },
  openGraph: {
    title: 'Connect GitBook to Appalix — Index GitBook Docs as AI Knowledge Base',
    description: 'Turn your GitBook space into a live AI knowledge source. Generate a token and your bot answers from your docs.',
    url: 'https://appalix.ai/resources/connect-gitbook',
    type: 'article',
    siteName: 'Appalix',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Connect GitBook to Appalix — Index GitBook Docs as AI Knowledge Base',
    description: 'Turn your GitBook space into a live AI knowledge source. Generate a token and your bot answers from your docs.',
  },
}

export default function ConnectGitBookPage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <ArticleSeo
        type="HowTo"
        title="How to Connect GitBook to Appalix"
        description="Turn your entire GitBook space into a live knowledge source. Generate a personal API token in GitBook, paste your space URL into Appalix, and your bot answers from your developer docs."
        slug="connect-gitbook"
        datePublished="2026-02-28"
        steps={[
          { name: 'Generate a GitBook Personal API Token', text: 'In GitBook, go to your account settings → Developer → Personal API token, create a new token with read access, and copy it.' },
          { name: 'Find your GitBook Space URL', text: 'Open your GitBook space and copy the URL from the address bar — it ends with .gitbook.io/your-space or is your custom domain.' },
          { name: 'Add GitBook as a knowledge source in Appalix', text: 'In Appalix, go to Sources → Add Source → GitBook, paste your API token and space URL, then save and trigger a sync.' },
          { name: 'Test the knowledge source', text: 'In your Appalix bot preview, ask a question that is answered in your GitBook docs and verify the AI bot responds with the correct content.' },
        ]}
      />
      <div className="max-w-3xl mx-auto">

        <div className="flex items-center gap-2 text-sm text-white/60 mb-10">
          <Link href="/resources" className="hover:text-brand-400 transition-colors">Resources</Link>
          <span>/</span>
          <span className="text-white/65">Connect GitBook to Appalix</span>
        </div>

        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-400 border border-brand-600/20 font-medium">Tutorial</span>
            <span className="text-xs text-white/60">6 min read · Pro plan and above</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            How to Connect GitBook to Appalix
          </h1>
          <p className="text-white/65 text-lg leading-relaxed">
            Index an entire GitBook space so your AI bot can answer questions directly from your developer docs, API references, or help centre — with no copy-pasting required.
          </p>
        </div>

        <div className="border-t border-white/10 mb-10" />

        <div className="prose prose-invert prose-brand max-w-none space-y-10 text-white/80">

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What you&apos;ll need</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>An <strong className="text-white">Appalix account</strong> on the Pro plan or above</li>
              <li>A <strong className="text-white">GitBook account</strong> with access to the space you want to index</li>
              <li>A configured <strong className="text-white">bot</strong> in Appalix with RAG enabled</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 1 — Generate a GitBook personal access token</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>
                In GitBook, click your avatar (bottom-left) → <strong className="text-white">Account settings</strong>.
              </li>
              <li>Go to the <strong className="text-white">Developer</strong> tab → <strong className="text-white">Personal access tokens</strong>.</li>
              <li>Click <strong className="text-white">Create token</strong>, give it a name (e.g. <em>Appalix</em>), and click <strong className="text-white">Create</strong>.</li>
              <li>Copy the token immediately — it starts with <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">gb-</code> and is only shown once.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 2 — Copy your GitBook space URL</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Open the GitBook space you want to index in your browser.</li>
              <li>Copy the URL from the address bar. It looks like:</li>
            </ol>
            <pre className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-brand-300 overflow-x-auto mt-3">
              {`https://app.gitbook.com/o/orgId/s/spaceId`}
            </pre>
            <p className="mt-3 text-sm text-white/65">
              Make sure you&apos;re on the root of the space, not a specific page inside it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 3 — Add the source in Appalix</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>In Appalix, go to <strong className="text-white">Sources → Add source</strong> and select <strong className="text-white">GitBook</strong>.</li>
              <li>Enter a <strong className="text-white">Source name</strong> (e.g. <em>Developer Docs</em>).</li>
              <li>Paste the <strong className="text-white">GitBook space URL</strong> from Step 2.</li>
              <li>Paste the <strong className="text-white">Personal API token</strong> (<code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">gb-…</code>) from Step 1.</li>
              <li>Click <strong className="text-white">Add &amp; index source</strong>.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 4 — Verify the source is ready</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Go to <strong className="text-white">Sources</strong> — the GitBook source will show <em>Processing</em> while Appalix fetches all pages in the space.</li>
              <li>Once it shows <strong className="text-white">Ready</strong>, your bot will answer questions from your docs.</li>
              <li>Test it in the <strong className="text-white">Playground</strong> — ask something covered in your GitBook space.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Tips &amp; best practices</h2>
            <ul className="list-disc pl-5 space-y-3">
              <li><strong className="text-white">Whole space indexed</strong> — Appalix crawls all pages within the space, so you don&apos;t need to add individual pages separately.</li>
              <li><strong className="text-white">Re-sync after publishing</strong> — click <strong className="text-white">Re-sync</strong> on the source whenever you publish major updates to your GitBook space.</li>
              <li><strong className="text-white">Private spaces</strong> — the personal access token gives Appalix read access to all spaces in your GitBook account. Use a dedicated account if you want to restrict access to a specific space.</li>
            </ul>
          </section>

          <section className="rounded-2xl bg-brand-600/10 border border-brand-600/20 p-6 text-center mt-12">
            <p className="text-2xl mb-3">📖</p>
            <h3 className="text-lg font-semibold text-white mb-2">Put your GitBook docs to work</h3>
            <p className="text-sm text-white/65 mb-5">
              Generate a token in GitBook, paste your space URL into Appalix, and your bot will be answering from your docs in minutes.
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
