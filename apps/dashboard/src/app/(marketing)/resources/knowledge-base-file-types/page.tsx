import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { ArticleSeo } from '@/components/marketing/article-seo'

export const metadata: Metadata = {
  title: 'Knowledge Base File Types — Every Format Appalix Can Ingest',
  description:
    'Complete reference of every file format the Appalix knowledge base supports: PDF, Word, Excel, PowerPoint, CSV, images, ZIP, website URLs, Notion, GitBook, Google Drive, Dropbox, OneDrive, and SharePoint.',
  keywords: [
    'Appalix knowledge base file types',
    'AI chatbot supported documents',
    'train AI on Excel PDF Word',
    'knowledge base ingestion formats',
    'AI bot file upload support',
    'chatbot supported file formats',
    'AI knowledge base PDF upload',
    'chatbot document training formats',
  ],
  alternates: { canonical: 'https://appalix.ai/resources/knowledge-base-file-types' },
  openGraph: {
    title: 'Knowledge Base File Types — Every Format Appalix Can Ingest',
    description: 'Complete reference of every file format the Appalix knowledge base supports: PDF, Word, Excel, images, URLs, and cloud drives.',
    url: 'https://appalix.ai/resources/knowledge-base-file-types',
    type: 'article',
    siteName: 'Appalix',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Knowledge Base File Types — Every Format Appalix Can Ingest',
    description: 'Complete reference of every file format the Appalix knowledge base supports: PDF, Word, Excel, images, URLs, and cloud drives.',
  },
}

const FILE_TYPES = [
  {
    emoji: '🌐',
    name: 'Website URL',
    extensions: 'Any public URL',
    how: 'Appalix fetches the page, strips scripts and navigation, and indexes the readable body text. JavaScript-rendered pages are handled via a secondary reader.',
    tip: 'For multi-page sites, use a Sitemap source instead so every page is indexed in a single step.',
  },
  {
    emoji: '🗺️',
    name: 'Sitemap',
    extensions: 'sitemap.xml',
    how: 'All <loc> URLs in the sitemap are fetched and indexed together (up to 50 pages). Ideal for documentation sites, blogs, and product knowledge bases.',
    tip: 'Most CMS platforms generate a sitemap at /sitemap.xml automatically.',
  },
  {
    emoji: '📄',
    name: 'PDF',
    extensions: '.pdf',
    how: "Text is extracted directly from the PDF using Claude's document API, which understands columns, tables, and multi-page layouts without losing structure.",
    tip: 'Scanned PDFs (image-only) are also supported — Claude reads them visually.',
  },
  {
    emoji: '📝',
    name: 'Word Document',
    extensions: '.doc, .docx',
    how: 'Raw text is extracted from the Word XML structure using the mammoth library, preserving headings and paragraphs.',
    tip: 'Tables in Word docs are extracted as plain text rows.',
  },
  {
    emoji: '📊',
    name: 'Excel Spreadsheet',
    extensions: '.xls, .xlsx',
    how: 'Every sheet in the workbook is converted to CSV text and labeled with its sheet name, so your bot can reference data by column header and sheet.',
    tip: 'Keep column headers in row 1 — they become part of each cell\'s context when answering questions.',
  },
  {
    emoji: '📑',
    name: 'PowerPoint Presentation',
    extensions: '.ppt, .pptx',
    how: 'All text nodes are extracted from each slide\'s XML, prefixed with a slide number heading. Speaker notes are not currently indexed.',
    tip: 'Presentation files with heavy imagery and minimal text may produce sparse results — add a text source with speaker notes or a summary for best coverage.',
  },
  {
    emoji: '📋',
    name: 'CSV File',
    extensions: '.csv',
    how: 'The file is read as plain UTF-8 text and chunked. Headers in row 1 are preserved, so the bot can correlate column values when answering questions.',
    tip: 'Pair a CSV knowledge source with a system prompt instruction like "When asked about pricing, consult the pricing table." for more precise answers.',
  },
  {
    emoji: '🖼️',
    name: 'Image',
    extensions: '.jpg, .jpeg, .png, .webp, .gif',
    how: "Images are passed to Claude's vision API, which transcribes all visible text and briefly describes diagrams, charts, and non-text visuals.",
    tip: 'Great for scanned handwritten notes, whiteboards, and infographics.',
  },
  {
    emoji: '🗜️',
    name: 'ZIP Archive',
    extensions: '.zip',
    how: 'Appalix extracts the archive and indexes all readable text files inside: .txt, .md, .csv, .json, .xml, .html, and .htm. Binary files within the ZIP are skipped.',
    tip: 'Use ZIP to bulk-upload multiple plain-text files or Markdown documentation sets in one go.',
  },
  {
    emoji: '✏️',
    name: 'Plain Text',
    extensions: 'Paste directly',
    how: 'Type or paste any raw text directly into Appalix — no file needed. Ideal for FAQs, product descriptions, policies, or anything you want to write inline.',
    tip: 'Plain text sources are the fastest to create and re-sync.',
  },
]

const CLOUD_SOURCES = [
  {
    logo: '/integrations/google-drive.png',
    name: 'Google Drive',
    note: 'Google Docs, Sheets, and Slides are exported as plain text. Binary files in the drive are downloaded directly.',
    plan: 'Pro+',
  },
  {
    logo: '/integrations/dropbox.png',
    name: 'Dropbox',
    note: 'Files and shared links are downloaded and processed using the same type handlers as uploaded files.',
    plan: 'Pro+',
  },
  {
    logo: '/integrations/onedrive.png',
    name: 'OneDrive',
    note: 'Microsoft Graph API downloads files directly from your OneDrive. Supports shared links and item IDs.',
    plan: 'Pro+',
  },
  {
    logo: '/integrations/sharepoint.webp',
    name: 'SharePoint',
    note: 'Index intranet content, policy documents, and internal wikis from your SharePoint site using a Microsoft Graph token.',
    plan: 'Pro+',
  },
  {
    logo: '/integrations/notion.webp',
    name: 'Notion',
    note: 'Page blocks are fetched via the Notion API using your Internal Integration Token. Nested blocks are flattened to plain text.',
    plan: 'Pro+',
  },
  {
    logo: '/integrations/gitbook.png',
    name: 'GitBook',
    note: 'All pages in your GitBook space are fetched and indexed using the GitBook Content API and a personal token.',
    plan: 'Pro+',
  },
]

export default function KnowledgeBaseFileTypesPage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <ArticleSeo
        type="Article"
        title="Knowledge Base File Types — Every Format Appalix Can Ingest"
        description="Complete reference of every file format the Appalix knowledge base supports: PDF, Word, Excel, PowerPoint, CSV, images, ZIP, website URLs, Notion, GitBook, Google Drive, Dropbox, OneDrive, and SharePoint."
        slug="knowledge-base-file-types"
        datePublished="2026-03-01"
      />
      <div className="max-w-3xl mx-auto">

        <div className="flex items-center gap-2 text-sm text-gray-500 mb-10">
          <Link href="/resources" className="hover:text-brand-400 transition-colors">Resources</Link>
          <span>/</span>
          <span className="text-gray-400">Knowledge Base File Types</span>
        </div>

        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-400 border border-brand-600/20 font-medium">Guide</span>
            <span className="text-xs text-gray-500">6 min read · Mar 1, 2026</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            Knowledge Base File Types — Everything Appalix Can Ingest
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Appalix can train your AI bot on a wide variety of documents, spreadsheets, presentations, and cloud sources. This guide covers every supported format, how each one is processed, and tips for getting the best results.
          </p>
        </div>

        <div className="border-t border-white/10 mb-10" />

        <div className="prose prose-invert prose-brand max-w-none space-y-12 text-gray-300">

          {/* Upload & URL sources */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-6">Supported file types &amp; sources</h2>
            <p className="mb-6">
              The following formats can be added directly in the <strong className="text-white">Sources</strong> section of your Appalix dashboard — either as a file upload, a URL, or pasted text.
            </p>
            <div className="space-y-6">
              {FILE_TYPES.map((ft) => (
                <div key={ft.name} className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{ft.emoji}</span>
                    <span className="font-semibold text-white">{ft.name}</span>
                    <span className="ml-auto text-xs text-gray-500 font-mono">{ft.extensions}</span>
                  </div>
                  <p className="text-sm text-gray-400 mb-2">{ft.how}</p>
                  <p className="text-xs text-brand-400 border-t border-white/10 pt-2 mt-2">
                    <strong className="text-brand-300">Tip:</strong> {ft.tip}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Cloud connectors */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Cloud source connectors</h2>
            <p className="mb-6">
              On the <strong className="text-white">Pro plan and above</strong>, you can connect external services directly. Appalix fetches content from these sources using an API token you provide — no files need to be downloaded manually.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {CLOUD_SOURCES.map((cs) => (
                <div key={cs.name} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`rounded bg-white flex items-center justify-center overflow-hidden shrink-0 ${cs.name === 'Notion' ? 'w-8 h-8' : 'w-6 h-6 p-0.5'}`}>
                      <Image src={cs.logo} alt={cs.name} width={20} height={20} className={`object-contain ${cs.name === 'Notion' ? 'w-8 h-8' : 'w-4 h-4'}`} />
                    </div>
                    <span className="font-semibold text-white text-sm">{cs.name}</span>
                    <span className="ml-auto text-xs px-1.5 py-0.5 rounded bg-brand-600/15 text-brand-400 border border-brand-600/20">{cs.plan}</span>
                  </div>
                  <p className="text-xs text-gray-400">{cs.note}</p>
                </div>
              ))}
            </div>
          </section>

          {/* How ingestion works */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">How ingestion works</h2>
            <p className="mb-4">
              When you add or re-sync a source, Appalix runs it through the following pipeline:
            </p>
            <ol className="list-decimal pl-5 space-y-3">
              <li>
                <strong className="text-white">Content extraction</strong> — the file or URL is processed using the appropriate handler for its type (see table above).
              </li>
              <li>
                <strong className="text-white">Chunking</strong> — extracted text is split into overlapping 1,500-character segments with a 200-character overlap to preserve context at chunk boundaries.
              </li>
              <li>
                <strong className="text-white">Embedding</strong> — each chunk is converted to a 1,536-dimension vector using OpenAI&apos;s <code className="text-brand-300 bg-white/5 px-1 rounded text-xs">text-embedding-3-small</code> model.
              </li>
              <li>
                <strong className="text-white">Storage</strong> — vectors are stored in a pgvector table scoped to your workspace, enabling millisecond-fast similarity search.
              </li>
              <li>
                <strong className="text-white">Retrieval</strong> — at chat time, the user&apos;s question is embedded and the top matching chunks are injected into the AI&apos;s context window before it replies.
              </li>
            </ol>
          </section>

          {/* File size & limits */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Limits &amp; best practices</h2>
            <ul className="list-disc pl-5 space-y-3">
              <li>
                <strong className="text-white">Maximum file size:</strong> 50 MB per upload.
              </li>
              <li>
                <strong className="text-white">Sitemap pages:</strong> up to 50 URLs per sitemap source.
              </li>
              <li>
                <strong className="text-white">Excel workbooks:</strong> all sheets are indexed. Very large workbooks (&gt; 10,000 rows) may produce a high chunk count — consider filtering to relevant sheets first.
              </li>
              <li>
                <strong className="text-white">ZIP files:</strong> only text-based files inside the archive are extracted (.txt, .md, .csv, .json, .xml, .html). Nested Word/Excel/PDF inside a ZIP are not currently processed — upload those separately.
              </li>
              <li>
                <strong className="text-white">Re-sync anytime:</strong> clicking Re-sync on a source deletes all existing chunks and re-ingests from scratch. Do this after updating a document.
              </li>
              <li>
                <strong className="text-white">Source scope:</strong> all sources in a workspace are shared across all bots in that workspace. A bot only queries its knowledge base when <strong className="text-white">Knowledge Base</strong> is enabled on the bot&apos;s settings page.
              </li>
            </ul>
          </section>

          {/* FAQ */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Frequently asked questions</h2>
            <div className="space-y-5">
              <div>
                <p className="font-medium text-white mb-1">Can I upload multiple files at once?</p>
                <p className="text-sm text-gray-400">
                  Not yet — each source is added individually. To bulk-upload, put all your text files into a single ZIP archive and upload that.
                </p>
              </div>
              <div>
                <p className="font-medium text-white mb-1">Are scanned PDFs supported?</p>
                <p className="text-sm text-gray-400">
                  Yes. Claude&apos;s vision capabilities read scanned and image-only PDFs. Quality depends on scan resolution — 300 DPI or above gives the best results.
                </p>
              </div>
              <div>
                <p className="font-medium text-white mb-1">How long does ingestion take?</p>
                <p className="text-sm text-gray-400">
                  Most sources process in under 30 seconds. Large sitemaps or multi-sheet Excel files may take 1–2 minutes. The source status changes from <em>Pending</em> → <em>Processing</em> → <em>Ready</em> in real time.
                </p>
              </div>
              <div>
                <p className="font-medium text-white mb-1">My source shows &quot;failed&quot; — what should I check?</p>
                <p className="text-sm text-gray-400">
                  Open the source row in your dashboard to see the error message. Common causes: the URL is behind a login wall, the file is corrupt or password-protected, or an API token has expired. Fix the issue and click Re-sync.
                </p>
              </div>
              <div>
                <p className="font-medium text-white mb-1">Does Appalix store my documents?</p>
                <p className="text-sm text-gray-400">
                  Uploaded files are stored in Supabase Storage within your workspace bucket and are never shared with other customers. Only the extracted text chunks (not the original file) are used for AI retrieval.
                </p>
              </div>
            </div>
          </section>

        </div>

        {/* CTA */}
        <div className="mt-16 border-t border-white/10 pt-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-white font-semibold mb-1">Ready to train your bot?</p>
            <p className="text-sm text-gray-400">Add your first knowledge source and watch your AI answer from your own content.</p>
          </div>
          <Link
            href="/register"
            className="shrink-0 px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors"
          >
            Get started free
          </Link>
        </div>

        <div className="mt-8">
          <Link href="/resources" className="text-sm text-gray-500 hover:text-brand-400 transition-colors">
            ← Back to Resources
          </Link>
        </div>

      </div>
    </div>
  )
}
