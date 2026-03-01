import Link from 'next/link'
import type { Metadata } from 'next'
import { ArticleSeo } from '@/components/marketing/article-seo'

export const metadata: Metadata = {
  title: 'Upload a ZIP File as a Knowledge Base Source — Appalix',
  description:
    'Learn how to upload a ZIP archive as a knowledge source in Appalix. Discover which file types inside the ZIP are indexed (TXT, Markdown, CSV, JSON, XML, HTML) and which are safely skipped — including executables and images.',
  keywords: [
    'Appalix ZIP knowledge base',
    'upload ZIP chatbot training',
    'ZIP file AI knowledge source',
    'bulk upload text files chatbot',
    'AI bot ZIP archive indexing',
    'Appalix supported file types ZIP',
    'train AI on ZIP file',
    'ZIP knowledge base ingestion',
  ],
  alternates: { canonical: 'https://appalix.ai/resources/upload-zip-knowledge-base' },
  openGraph: {
    title: 'Upload a ZIP File as a Knowledge Base Source — Appalix',
    description: 'Learn how to bulk-upload text files inside a ZIP as a knowledge source for your Appalix AI bot — and see exactly which file types are indexed vs. skipped.',
    url: 'https://appalix.ai/resources/upload-zip-knowledge-base',
    type: 'article',
    siteName: 'Appalix',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Upload a ZIP File as a Knowledge Base Source — Appalix',
    description: 'Bulk-upload text files in a ZIP as an AI knowledge source. See which types are indexed vs. skipped.',
  },
}

export default function UploadZipKnowledgeBasePage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <ArticleSeo
        type="HowTo"
        title="How to Upload a ZIP File as a Knowledge Base Source in Appalix"
        description="Learn how to bulk-upload text files inside a ZIP as a knowledge source for your Appalix AI bot — and see exactly which file types are indexed vs. skipped."
        slug="upload-zip-knowledge-base"
        datePublished="2026-03-01"
        steps={[
          { name: 'Prepare your ZIP file', text: 'Create a ZIP archive containing the text files you want your bot to learn from. Supported formats: .txt, .md, .csv, .json, .xml, .html, .htm. Keep total uncompressed size under 50 MB. You can use any folder structure inside the ZIP — subfolders are supported.' },
          { name: 'Go to Sources and add a new source', text: 'In your Appalix dashboard, navigate to Sources and click Add source. Select the PDF / Word / ZIP tile from the source type grid.' },
          { name: 'Upload your ZIP file', text: 'Click Choose file, select your .zip archive (up to 50 MB), and wait for the upload indicator to show Done.' },
          { name: 'Name and submit the source', text: 'Give the source a descriptive name (e.g. "Product Docs v2") and click Add & index source. Appalix will extract and embed all readable text files automatically.' },
          { name: 'Verify the source is ready', text: 'Back on the Sources list, confirm the source shows a green Ready status and a chunk count greater than zero. Your bot can now answer questions from the indexed content.' },
        ]}
      />
      <div className="max-w-3xl mx-auto">

        <div className="flex items-center gap-2 text-sm text-gray-500 mb-10">
          <Link href="/resources" className="hover:text-brand-400 transition-colors">Resources</Link>
          <span>/</span>
          <span className="text-gray-400">Upload a ZIP File as a Knowledge Base Source</span>
        </div>

        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-400 border border-brand-600/20 font-medium">Tutorial</span>
            <span className="text-xs text-gray-500">5 min read · Pro plan and above</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            How to Upload a ZIP File as a Knowledge Base Source
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            ZIP uploads let you bulk-import dozens of text files — markdown docs, CSVs, JSON configs, HTML pages — in a single step. Appalix unpacks the archive, reads every supported file, and embeds the content so your bot can answer from all of it instantly.
          </p>
        </div>

        <div className="border-t border-white/10 mb-10" />

        <div className="prose prose-invert prose-brand max-w-none space-y-10 text-gray-300">

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What you&apos;ll need</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>An <strong className="text-white">Appalix account</strong> on the Pro plan or above</li>
              <li>A <strong className="text-white">.zip archive</strong> containing your text files (max 50 MB compressed)</li>
              <li>A configured <strong className="text-white">bot</strong> with at least one source slot available</li>
            </ul>
          </section>

          {/* Step 1 */}
          <section id="step-1">
            <h2 className="text-xl font-semibold text-white mb-3">
              <span className="text-brand-400 mr-2">1.</span> Prepare your ZIP file
            </h2>
            <p className="mb-4">
              Package the files you want indexed into a single <code className="text-brand-300 bg-white/5 px-1.5 py-0.5 rounded text-sm">.zip</code> archive.
              Subdirectory structure is fine — Appalix walks the entire archive recursively.
            </p>
            <p className="mb-4">
              Keep total <strong className="text-white">uncompressed size under 50 MB</strong>. The compressed
              ZIP itself can be much smaller — only the expanded text content counts toward the limit.
            </p>
            <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-2">
              <p className="text-sm font-semibold text-white mb-3">Tip — what to put inside</p>
              <ul className="list-disc pl-5 space-y-1.5 text-sm">
                <li>Export docs from Confluence or Notion as HTML / Markdown and ZIP them</li>
                <li>ZIP a folder of CSVs (product catalogue, FAQ pairs, pricing tables)</li>
                <li>Bundle static help-centre pages exported from your CMS</li>
                <li>Combine multiple JSON knowledge files into one archive</li>
              </ul>
            </div>
          </section>

          {/* Step 2 */}
          <section id="step-2">
            <h2 className="text-xl font-semibold text-white mb-3">
              <span className="text-brand-400 mr-2">2.</span> Add a new source
            </h2>
            <p>
              In the Appalix dashboard, go to <strong className="text-white">Sources</strong> and click{' '}
              <strong className="text-white">Add source</strong>. Select the{' '}
              <strong className="text-white">PDF / Word / ZIP</strong> tile — this is the same tile used for
              PDFs, Word docs, and PowerPoints.
            </p>
          </section>

          {/* Step 3 */}
          <section id="step-3">
            <h2 className="text-xl font-semibold text-white mb-3">
              <span className="text-brand-400 mr-2">3.</span> Upload the ZIP and submit
            </h2>
            <p className="mb-4">
              Click <strong className="text-white">Choose file</strong>, select your <code className="text-brand-300 bg-white/5 px-1.5 py-0.5 rounded text-sm">.zip</code>, and
              wait for the <strong className="text-white">Done</strong> indicator. Enter a name for the source, then click{' '}
              <strong className="text-white">Add &amp; index source</strong>.
            </p>
            <p>
              The file uploads directly to secure cloud storage — it never passes through Vercel&apos;s 4.5 MB
              serverless limit — so even large archives upload reliably.
            </p>
          </section>

          {/* Step 4 */}
          <section id="step-4">
            <h2 className="text-xl font-semibold text-white mb-3">
              <span className="text-brand-400 mr-2">4.</span> Verify the source is ready
            </h2>
            <p>
              Return to the <strong className="text-white">Sources</strong> list. Once ingestion finishes,
              the source will show a green <strong className="text-white">Ready</strong> badge and a chunk
              count. Each readable file inside the ZIP becomes one or more chunks your bot can retrieve.
            </p>
          </section>

          <div className="border-t border-white/10" />

          {/* What gets indexed */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">What Appalix reads from your ZIP</h2>
            <p className="mb-5">
              Appalix only extracts files with these extensions. Everything else is silently skipped —
              no errors, no partial reads.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 pr-6 text-white font-semibold">Extension</th>
                    <th className="text-left py-2 pr-6 text-white font-semibold">Format</th>
                    <th className="text-left py-2 text-white font-semibold">How it&apos;s indexed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[
                    { ext: '.txt', format: 'Plain text', how: 'Read as-is. Great for FAQs, policies, and notes.' },
                    { ext: '.md', format: 'Markdown', how: 'Read as plain text. Headers, lists, and code blocks are preserved as text.' },
                    { ext: '.csv', format: 'CSV spreadsheet', how: 'Each row becomes searchable text. Column headers are included.' },
                    { ext: '.json', format: 'JSON data', how: 'The full JSON string is indexed. Ideal for structured knowledge dumps.' },
                    { ext: '.xml', format: 'XML', how: 'Raw XML text is indexed. Tag names and values are both searchable.' },
                    { ext: '.html / .htm', format: 'HTML', how: 'Full HTML source is indexed, including tag content and attributes.' },
                  ].map(({ ext, format, how }) => (
                    <tr key={ext}>
                      <td className="py-2.5 pr-6">
                        <code className="text-brand-300 bg-white/5 px-1.5 py-0.5 rounded">{ext}</code>
                      </td>
                      <td className="py-2.5 pr-6 text-gray-300">{format}</td>
                      <td className="py-2.5 text-gray-400">{how}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* What gets rejected */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">What Appalix skips</h2>
            <p className="mb-5">
              Files with any other extension are ignored entirely. They are never executed, stored, or
              sent to the AI model. This applies to:
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { label: 'Executables & scripts', exts: '.exe, .dll, .bat, .sh, .py, .js, .php', reason: 'Never run. Skipped silently for security.' },
                { label: 'Images & media', exts: '.jpg, .png, .gif, .mp4, .mp3, .pdf', reason: 'Binary files with no plain-text content to index.' },
                { label: 'Office documents', exts: '.docx, .xlsx, .pptx', reason: 'Upload these directly as their own source type for full parsing.' },
                { label: 'Archives inside archives', exts: 'Nested .zip, .tar, .gz', reason: 'Only top-level content is processed. Nested ZIPs are skipped.' },
              ].map(({ label, exts, reason }) => (
                <div key={label} className="bg-red-900/10 border border-red-900/20 rounded-xl p-4">
                  <p className="text-sm font-semibold text-red-400 mb-1">{label}</p>
                  <p className="text-xs font-mono text-gray-400 mb-2">{exts}</p>
                  <p className="text-xs text-gray-500">{reason}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Security */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Security &amp; safety</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-white">Executables are never run</strong> — files are decoded as plain text strings only, never executed in any environment.</li>
              <li><strong className="text-white">Zip bomb protection</strong> — if the total uncompressed text content exceeds 50 MB, ingestion stops immediately with an error.</li>
              <li><strong className="text-white">No binary processing</strong> — only whitelisted text extensions are read. Unknown types are skipped without error.</li>
              <li><strong className="text-white">Isolated processing</strong> — ingestion runs in a sandboxed API service, separate from your bot&apos;s runtime environment.</li>
            </ul>
          </section>

          {/* FAQ */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-5">Frequently asked questions</h2>
            <div className="space-y-5">
              {[
                {
                  q: 'Can I include PDFs or Word docs inside the ZIP?',
                  a: 'Not yet — those formats require a separate parsing pipeline. Upload PDF, Word (.docx), or Excel (.xlsx) files directly using their own source tiles. Inside a ZIP, only plain-text formats are indexed.',
                },
                {
                  q: 'Does folder structure inside the ZIP matter?',
                  a: 'No. Appalix flattens the archive and processes every matching file regardless of which subfolder it lives in. The folder path is shown as a section header in the indexed content so you can trace where each chunk came from.',
                },
                {
                  q: 'What if some files inside are empty?',
                  a: 'Empty files are skipped automatically — only files with non-whitespace content are indexed.',
                },
                {
                  q: 'Can I re-upload a ZIP to update the knowledge base?',
                  a: 'Yes. Delete the old source and add a new one with the updated ZIP, or use the Resync button on the source row if you replace the file at the same storage path.',
                },
                {
                  q: 'Is there a limit on the number of files inside the ZIP?',
                  a: 'There is no file count limit, only the 50 MB total uncompressed text content limit. A ZIP with 500 tiny .txt files will work fine as long as the combined text stays under 50 MB.',
                },
              ].map(({ q, a }) => (
                <div key={q} className="border-b border-white/10 pb-5 last:border-0 last:pb-0">
                  <p className="text-sm font-semibold text-white mb-2">{q}</p>
                  <p className="text-sm text-gray-400">{a}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="border-t border-white/10" />

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Next steps</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <Link href="/resources/knowledge-base-file-types" className="text-brand-400 hover:text-brand-300 transition-colors">
                  Knowledge Base File Types — full reference of every format Appalix supports
                </Link>
              </li>
              <li>
                <Link href="/resources/connect-notion" className="text-brand-400 hover:text-brand-300 transition-colors">
                  Connect Notion — index live Notion pages instead of static exports
                </Link>
              </li>
              <li>
                <Link href="/resources/connect-google-drive" className="text-brand-400 hover:text-brand-300 transition-colors">
                  Connect Google Drive — index Google Docs directly without downloading
                </Link>
              </li>
            </ul>
          </section>

        </div>
      </div>
    </div>
  )
}
