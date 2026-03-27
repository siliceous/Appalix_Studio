import Link from 'next/link'
import type { Metadata } from 'next'
import { ArticleSeo } from '@/components/marketing/article-seo'

export const metadata: Metadata = {
  title: 'Connect Microsoft Outlook to Sage CRM — AI Email Inbox, Send & Sync | Appalix',
  description:
    'Connect Microsoft Outlook or Office 365 to Sage CRM for a full AI-powered email inbox: automatic priority scoring, AI reply drafts, key insights, file attachments, Stripe invoices, and branded proposal PDFs — all inside the CRM.',
  keywords: [
    'Sage CRM Outlook integration',
    'Appalix Sage Microsoft',
    'AI email inbox CRM Outlook',
    'Outlook IMAP CRM sync',
    'Microsoft App Password CRM',
    'Office 365 CRM email AI',
    'Sage email intelligence Outlook',
    'send email from CRM Outlook',
  ],
  alternates: { canonical: 'https://appalix.ai/resources/connect-sage-microsoft' },
  openGraph: {
    title: 'Connect Microsoft Outlook to Sage CRM — AI Email Inbox, Send & Sync | Appalix',
    description: 'Full AI email inbox inside Sage CRM. Sync Outlook, get AI priority scores and reply drafts, send with attachments.',
    url: 'https://appalix.ai/resources/connect-sage-microsoft',
    type: 'article',
    siteName: 'Appalix',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Connect Microsoft Outlook to Sage CRM — AI Email Inbox, Send & Sync | Appalix',
    description: 'Full AI email inbox inside Sage CRM. Sync Outlook, get AI priority scores and reply drafts, send with attachments.',
  },
}

export default function ConnectSageMicrosoftPage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <ArticleSeo
        type="HowTo"
        title="Connect Microsoft Outlook to Sage CRM"
        description="Connect Microsoft Outlook or Office 365 to get a full AI-powered email inbox inside Sage CRM. Sync inbound emails, get AI priority scores and reply drafts, send with file or Stripe invoice attachments."
        slug="connect-sage-microsoft"
        datePublished="2026-03-02"
        steps={[
          { name: 'Enable two-step verification on your Microsoft account', text: 'In your Microsoft Account security settings, turn on two-step verification. App Passwords are only available when two-step verification is active.' },
          { name: 'Generate a Microsoft App Password', text: 'In your Microsoft Account, go to Security → Advanced security options → App passwords, add a new app password named "Appalix Sage", and copy the generated password.' },
          { name: 'Paste credentials into Sage', text: 'In Appalix, go to Sage → Integrations, click Connect on the Microsoft / Outlook card, enter your email address and the App Password, then click Save & Connect.' },
          { name: 'Sync your inbox', text: 'Go to Sage → Emails and click Sync Inbox. Sage fetches your latest emails via IMAP, runs AI analysis on each, and displays them with priority badges and pre-written reply drafts.' },
        ]}
      />
      <div className="max-w-3xl mx-auto">

        <div className="flex items-center gap-2 text-sm text-white/60 mb-10">
          <Link href="/resources" className="hover:text-brand-400 transition-colors">Resources</Link>
          <span>/</span>
          <span className="text-white/65">Connect Microsoft / Outlook to Sage</span>
        </div>

        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-400 border border-brand-600/20 font-medium">Tutorial</span>
            <span className="text-xs text-white/60">8 min read · Pro+ plan</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            Connect Microsoft / Outlook to Sage CRM
          </h1>
          <p className="text-white/65 text-lg leading-relaxed">
            Connecting your Microsoft or Office 365 account gives you a full AI-powered email inbox inside Sage. Sage reads your incoming emails via IMAP, scores each one for priority, surfaces key insights, and pre-writes three reply drafts. You can reply directly from Sage — with file attachments, Stripe invoice PDFs, or auto-generated proposal documents — and every email is logged to the contact&apos;s activity timeline.
          </p>
        </div>

        <div className="border-t border-white/10 mb-10" />

        <div className="prose prose-invert prose-brand max-w-none space-y-10 text-white/80">

          {/* Supported accounts */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Supported account types</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-white">Outlook.com</strong> — personal Microsoft accounts (@outlook.com, @hotmail.com, @live.com)</li>
              <li><strong className="text-white">Microsoft 365</strong> — work or school accounts (Office 365, Exchange Online)</li>
            </ul>
            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white/65">
              <strong className="text-white">How it connects:</strong> Sage uses your App Password for both IMAP reading (outlook.office365.com port 993 SSL) and SMTP sending (smtp.office365.com port 587 STARTTLS). One App Password covers both directions.
            </div>
          </section>

          {/* What you get */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What you get with Outlook connected</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-white">AI inbox sync</strong> — click &quot;Sync Inbox&quot; to pull your latest emails from Outlook via IMAP. Each email is analysed by AI and given a priority score (High / Medium / Low), a one-line summary, and key action points.</li>
              <li><strong className="text-white">Three AI reply drafts</strong> — Professional, Friendly, and Concise tone variants are pre-written for every inbound email. Click a tone to load the draft into the compose area.</li>
              <li><strong className="text-white">AI Rewrite</strong> — type an instruction (e.g. &quot;make it shorter&quot;, &quot;more formal&quot;) and Claude rewrites your draft instantly.</li>
              <li><strong className="text-white">Attachments</strong> — attach any file from your computer, attach a Stripe invoice PDF (if Stripe is connected), or generate a branded proposal PDF from a linked deal.</li>
              <li><strong className="text-white">Activity logging</strong> — every email you send from Sage is logged to the contact timeline automatically.</li>
            </ul>
          </section>

          {/* What you need */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What you&apos;ll need</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>An <strong className="text-white">Appalix account</strong> on the Pro plan or above</li>
              <li>A <strong className="text-white">Microsoft account</strong> (Outlook.com or Microsoft 365)</li>
              <li><strong className="text-white">Two-step verification enabled</strong> — required before App Passwords become available</li>
            </ul>
          </section>

          {/* Step 1 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 1 — Enable two-step verification</h2>
            <p className="mb-3">If two-step verification is already on, skip to Step 2.</p>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Go to <strong className="text-white">account.microsoft.com</strong> and sign in.</li>
              <li>Click <strong className="text-white">Security</strong> in the top navigation.</li>
              <li>Click <strong className="text-white">Advanced security options</strong>.</li>
              <li>Under &quot;Two-step verification&quot;, click <strong className="text-white">Turn on</strong> and follow the prompts.</li>
            </ol>
          </section>

          {/* Step 2 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 2 — Generate an App Password</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>In your Microsoft Account, go to <strong className="text-white">Security → Advanced security options</strong>.</li>
              <li>Scroll down to the <strong className="text-white">App passwords</strong> section and click <strong className="text-white">Create a new app password</strong>.</li>
              <li>Name it <strong className="text-white">Appalix Sage</strong>.</li>
              <li>Copy the generated password — it will only be shown once.</li>
            </ol>
            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white/65">
              <strong className="text-white">Microsoft 365 admin note:</strong> If your organisation manages Microsoft 365, your IT admin may need to enable &quot;Authenticated SMTP&quot; (SMTP AUTH) for your mailbox via the Exchange Admin Centre. They may also need to permit IMAP access.
            </div>
          </section>

          {/* Step 3 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 3 — Connect Outlook in Sage</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>In Appalix, go to <strong className="text-white">Sage → Integrations</strong>.</li>
              <li>Under the <strong className="text-white">Email</strong> section, find the <strong className="text-white">Microsoft / Outlook</strong> card and click <strong className="text-white">Connect</strong>.</li>
              <li>Enter your <strong className="text-white">email address</strong> (e.g. you@outlook.com or you@yourcompany.com).</li>
              <li>Paste the <strong className="text-white">App Password</strong> into the App Password field.</li>
              <li>Click <strong className="text-white">Save &amp; Connect</strong>.</li>
            </ol>
            <p className="mt-4">Sage will test the connection. On success, the Microsoft / Outlook card shows a green &quot;Connected&quot; badge.</p>
          </section>

          {/* Step 4 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 4 — Open the AI Email Inbox</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>In the Sage sidebar, click <strong className="text-white">Emails</strong>.</li>
              <li>Click the <strong className="text-white">Sync</strong> button at the top of the inbox.</li>
              <li>Sage fetches your most recent emails from Outlook, runs AI analysis on each one, and displays them with priority badges (High / Medium / Low).</li>
              <li>Click any email to open it. You&apos;ll see the full email body, an <strong className="text-white">AI Insights panel</strong> (summary + key action points), and a compose area pre-loaded with three AI reply drafts.</li>
            </ol>
            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white/65">
              <strong className="text-white">Filtering:</strong> Use the All / High / Medium / Low tabs at the top of the inbox to focus on emails that need your attention first.
            </div>
          </section>

          {/* Step 5 - Attachments */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 5 — Reply with attachments</h2>
            <p className="mb-3">Sage supports three attachment types in the compose area:</p>
            <ul className="list-disc pl-5 space-y-3">
              <li>
                <strong className="text-white">File upload</strong> — click the <strong className="text-white">📎 File</strong> button to pick any file from your computer. It&apos;s added as a chip below the compose area. Click × to remove it.
              </li>
              <li>
                <strong className="text-white">Stripe invoice</strong> — if you have Stripe connected in Sage Integrations, an <strong className="text-white">🧾 Invoice</strong> button appears. Click it to see your open Stripe invoices, then click one to auto-download its PDF and attach it to the email.
              </li>
              <li>
                <strong className="text-white">Proposal PDF</strong> — if the email&apos;s contact has linked deals, a <strong className="text-white">📄 Proposal</strong> button appears for each deal. Click it to generate a branded proposal PDF (with your workspace name, deal value, close date, and description) and attach it instantly.
              </li>
            </ul>
            <p className="mt-4">The <strong className="text-white">Send</strong> button shows the attachment count (e.g. &quot;Send + 2 attachments&quot;) so you always know what&apos;s going out.</p>
          </section>

          {/* AI Rewrite */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Using AI Rewrite</h2>
            <p>After loading a draft (or writing your own reply), click <strong className="text-white">AI Rewrite</strong> to expand the instruction panel. Type what you want — for example:</p>
            <ul className="list-disc pl-5 space-y-1 mt-3">
              <li>&quot;Make it shorter and more direct&quot;</li>
              <li>&quot;Add a friendly opening line&quot;</li>
              <li>&quot;Rewrite in a formal tone for a legal audience&quot;</li>
            </ul>
            <p className="mt-3">Press Enter or click <strong className="text-white">Rewrite</strong>. Claude rewrites the body and replaces the textarea content. You can rewrite multiple times before sending.</p>
          </section>

          {/* FAQ */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Frequently asked questions</h2>
            <div className="space-y-5">
              <div>
                <p className="font-semibold text-white">Will inbound emails appear in Sage automatically?</p>
                <p className="text-sm text-white/65 mt-1">Sage syncs on demand — click <strong className="text-white">Sync</strong> whenever you want to pull new emails. There is no background polling in the current version, so new emails will not appear until you sync.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Does AI analysis cost me extra credits?</p>
                <p className="text-sm text-white/65 mt-1">AI analysis uses your workspace&apos;s Claude AI credits. Each email analysed costs a small number of credits for the priority scoring, insights, and three reply drafts. Credits are shared across all AI features in your workspace.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Will emails I send from Sage appear in my Outlook Sent Items?</p>
                <p className="text-sm text-white/65 mt-1">Yes — emails sent via Sage appear in your Outlook Sent Items folder, just like emails sent directly from Outlook.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Can I use a shared mailbox?</p>
                <p className="text-sm text-white/65 mt-1">Shared mailboxes don&apos;t support App Passwords directly. Connect an individual account that has &quot;Send As&quot; permission on the shared mailbox and use that account&apos;s credentials instead.</p>
              </div>
              <div>
                <p className="font-semibold text-white">My organisation uses conditional access — will it work?</p>
                <p className="text-sm text-white/65 mt-1">If your organisation enforces modern authentication (OAuth) only, App Passwords may be blocked. Contact your IT admin to confirm whether SMTP AUTH and IMAP with App Passwords are permitted for your mailbox.</p>
              </div>
              <div>
                <p className="font-semibold text-white">How do I disconnect?</p>
                <p className="text-sm text-white/65 mt-1">Click <strong className="text-white">Disconnect</strong> on the Microsoft / Outlook card in Sage Integrations. Then revoke the App Password in your Microsoft Account security settings to fully remove access.</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-brand-600/10 border border-brand-600/20 p-6 text-center mt-12">
            <p className="text-2xl mb-3">🤖</p>
            <h3 className="text-lg font-semibold text-white mb-2">Ready for your AI-powered inbox?</h3>
            <p className="text-sm text-white/65 mb-5">
              Connect Outlook in Sage Integrations, open Sage → Emails, click Sync, and let the AI handle the heavy lifting.
            </p>
            <Link
              href="/sage/integrations"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Go to Sage Integrations →
            </Link>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-white/10 flex items-center justify-between flex-wrap gap-4">
          <Link href="/resources" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            ← Back to Resources
          </Link>
          <Link href="/dashboard/email" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            Open Email Inbox →
          </Link>
        </div>

      </div>
    </div>
  )
}
