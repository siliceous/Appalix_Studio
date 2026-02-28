import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'How to Embed the Appalix Chat Widget on Any Website | Setup Guide',
  description:
    'Add the Appalix AI chat widget to any website in under 5 minutes with a single script tag. Works with React, Next.js, WordPress, Webflow, Squarespace, Framer, and more.',
  keywords: [
    'embed AI chat widget',
    'Appalix web widget',
    'add chatbot to website',
    'website chat widget script',
    'AI chat embed code',
  ],
}

export default function EmbedWebWidgetPage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <div className="max-w-3xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-10">
          <Link href="/resources" className="hover:text-brand-400 transition-colors">Resources</Link>
          <span>/</span>
          <span className="text-gray-400">Embed the Web Widget</span>
        </div>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-400 border border-brand-600/20 font-medium">Tutorial</span>
            <span className="text-xs text-gray-500">5 min read · All plans</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            How to Embed the Appalix Chat Widget on Any Website
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            The Appalix web widget is a lightweight JavaScript snippet that adds a floating chat bubble to any website. Two lines of code — no server needed. Works with static HTML, React, Next.js, WordPress, Webflow, Squarespace, Framer, Shopify, and any other platform that lets you add custom scripts.
          </p>
        </div>

        <div className="border-t border-white/10 mb-10" />

        <div className="prose prose-invert prose-brand max-w-none space-y-10 text-gray-300">

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What you&apos;ll need</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>An <strong className="text-white">Appalix account</strong> on any plan</li>
              <li>A <strong className="text-white">Web Widget integration</strong> created in your Appalix dashboard</li>
              <li>Ability to add a <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">&lt;script&gt;</code> tag to your site (any plan on any website builder)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 1 — Create a Web Widget integration</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>In Appalix, go to <strong className="text-white">Integrations → Add integration</strong> and choose <strong className="text-white">Web Widget</strong>.</li>
              <li>Name the integration, select the bot you want to power it, and set <strong className="text-white">Allowed origins</strong>:
                <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
                  <li>Enter your domain (e.g. <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">https://mysite.com</code>) to restrict chat to your site only.</li>
                  <li>Enter <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">*</code> to allow any origin (useful during development).</li>
                </ul>
              </li>
              <li>Click <strong className="text-white">Create integration</strong>.</li>
              <li>Click the integration name to open the <strong className="text-white">Setup guide</strong> — you&apos;ll find your embed snippet there.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 2 — Copy the embed snippet</h2>
            <p>Your personalised snippet looks like this (your integration ID will be different):</p>
            <pre className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-brand-300 overflow-x-auto mt-4">{`<script>
  window.AppalixConfig = { integrationId: 'your-integration-id' };
</script>
<script src="https://api.appalix.ai/widget.js" async></script>`}</pre>
            <p className="mt-3">Copy it from the Setup guide (it has your real integration ID pre-filled).</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 3 — Add it to your site</h2>

            <h3 className="text-base font-semibold text-white mt-5 mb-2">Plain HTML</h3>
            <p>Paste the snippet just before the closing <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">&lt;/body&gt;</code> tag in your HTML file:</p>
            <pre className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-brand-300 overflow-x-auto mt-3">{`  <!-- Appalix Chat Widget -->
  <script>
    window.AppalixConfig = { integrationId: 'your-integration-id' };
  </script>
  <script src="https://api.appalix.ai/widget.js" async></script>
</body>`}</pre>

            <h3 className="text-base font-semibold text-white mt-6 mb-2">Next.js / React</h3>
            <p>Add the snippet to your root layout using Next.js&apos;s <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">&lt;Script&gt;</code> component:</p>
            <pre className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-brand-300 overflow-x-auto mt-3">{`// app/layout.tsx
import Script from 'next/script'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Script id="appalix-config" strategy="beforeInteractive">
          {\`window.AppalixConfig = { integrationId: 'your-integration-id' };\`}
        </Script>
        <Script src="https://api.appalix.ai/widget.js" strategy="lazyOnload" />
      </body>
    </html>
  )
}`}</pre>

            <h3 className="text-base font-semibold text-white mt-6 mb-2">WordPress (without the plugin)</h3>
            <p>Install a plugin like <strong className="text-white">Insert Headers and Footers</strong> or <strong className="text-white">Header Footer Code Manager</strong>, then paste the snippet into the <em>Footer</em> section.</p>

            <h3 className="text-base font-semibold text-white mt-6 mb-2">Webflow</h3>
            <p>In Webflow, go to <strong className="text-white">Site Settings → Custom Code → Footer Code</strong> and paste the snippet.</p>

            <h3 className="text-base font-semibold text-white mt-6 mb-2">Squarespace</h3>
            <p>Go to <strong className="text-white">Settings → Advanced → Code Injection → Footer</strong> and paste the snippet.</p>

            <h3 className="text-base font-semibold text-white mt-6 mb-2">Framer</h3>
            <p>Open <strong className="text-white">Site Settings → General → Custom Code → End of &lt;body&gt; tag</strong> and paste the snippet.</p>

            <h3 className="text-base font-semibold text-white mt-6 mb-2">Shopify</h3>
            <p>In the Shopify theme editor, open <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">theme.liquid</code> and paste the snippet just before <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">&lt;/body&gt;</code>.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 4 — Verify</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Open your website in a browser. You should see the Appalix chat bubble in the bottom-right corner.</li>
              <li>Click the bubble and send a message. The bot should reply within a couple of seconds.</li>
              <li>In Appalix, go to <strong className="text-white">Conversations</strong> — your test message should appear with platform tagged as <em>Web Widget</em>.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Optional configuration</h2>
            <p>You can pass additional options via <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">window.AppalixConfig</code>:</p>
            <pre className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-brand-300 overflow-x-auto mt-3">{`window.AppalixConfig = {
  integrationId: 'your-integration-id',
  // Optional: identify a logged-in user
  userId: 'user_123',
  userEmail: 'jane@company.com',
};`}</pre>
            <p className="mt-3">When <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">userEmail</code> is set, lead capture will use this email automatically — no need for the visitor to type it.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Tips &amp; best practices</h2>
            <ul className="list-disc pl-5 space-y-3">
              <li>
                <strong className="text-white">Restrict allowed origins</strong> — set your production domain in the integration&apos;s Allowed Origins field to prevent other sites from using your widget quota.
              </li>
              <li>
                <strong className="text-white">Use <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300">lazyOnload</code> in Next.js</strong> — this loads the widget only after the page is interactive, keeping your Core Web Vitals scores unaffected.
              </li>
              <li>
                <strong className="text-white">Train the bot on your site content</strong> — add your site URL as a knowledge source in Appalix and enable RAG on the bot so it answers questions from your actual pages.
              </li>
              <li>
                <strong className="text-white">Multiple pages, one snippet</strong> — one integration covers your entire site. Create a second integration only if you want different bots or settings on different sites.
              </li>
            </ul>
          </section>

          <section className="rounded-2xl bg-brand-600/10 border border-brand-600/20 p-6 text-center mt-12">
            <p className="text-2xl mb-3">🔌</p>
            <h3 className="text-lg font-semibold text-white mb-2">Add a chat widget to your site today</h3>
            <p className="text-sm text-gray-400 mb-5">
              Create a Web Widget integration, copy your snippet, and your AI bot will be live in under 5 minutes.
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
