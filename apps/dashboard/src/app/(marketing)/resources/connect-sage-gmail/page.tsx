import Link from 'next/link'
import type { Metadata } from 'next'
import { ArticleSeo } from '@/components/marketing/article-seo'

export const metadata: Metadata = {
  title: 'Connect Gmail to Sage CRM — AI Email Inbox, Send & Sync | Appalix',
  description:
    'Connect Gmail to Sage CRM to get a full AI-powered email inbox: automatic priority scoring, AI reply drafts, key insights, email attachments, and Stripe invoice sending — all without leaving the CRM.',
  keywords: [
    'Sage CRM Gmail integration',
    'Appalix Sage Gmail',
    'AI email inbox CRM',
    'Gmail IMAP CRM sync',
    'Gmail App Password CRM',
    'CRM email priority AI',
    'send email from CRM Gmail',
    'Sage email intelligence',
  ],
  alternates: { canonical: 'https://appalix.ai/resources/connect-sage-gmail' },
  openGraph: {
    title: 'Connect Gmail to Sage CRM — AI Email Inbox, Send & Sync | Appalix',
    description: 'Full AI email inbox inside Sage CRM. Sync Gmail, get AI priority scores and reply drafts, send with attachments.',
    url: 'https://appalix.ai/resources/connect-sage-gmail',
    type: 'article',
    siteName: 'Appalix',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Connect Gmail to Sage CRM — AI Email Inbox, Send & Sync | Appalix',
    description: 'Full AI email inbox inside Sage CRM. Sync Gmail, get AI priority scores and reply drafts, send with attachments.',
  },
}

export default function ConnectSageGmailPage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <ArticleSeo
        type="HowTo"
        title="Connect Gmail to Sage CRM"
        description="Connect Gmail to get a full AI-powered email inbox inside Sage CRM. Sync inbound emails, get AI priority scores and reply drafts, send with file or Stripe invoice attachments."
        slug="connect-sage-gmail"
        datePublished="2026-03-02"
        steps={[
          { name: 'Enable 2-Step Verification in Google', text: 'In your Google Account, go to Security → 2-Step Verification and turn it on. App Passwords are only available when 2-Step Verification is active.' },
          { name: 'Generate a Gmail App Password', text: 'In your Google Account, go to Security → App Passwords, select "Other" as the app, name it "Appalix Sage", and copy the 16-character password.' },
          { name: 'Paste credentials into Sage', text: 'In Appalix, go to Sage → Integrations, click Connect on the Gmail card, enter your Gmail address and the App Password, then click Save & Connect.' },
          { name: 'Sync your inbox', text: 'Go to Sage → Emails and click Sync Inbox. Sage will fetch your latest emails via IMAP, run AI analysis on each one, and display them with priority badges and reply drafts.' },
        ]}
      />
      <div className="max-w-3xl mx-auto">

        <div className="flex items-center gap-2 text-sm text-gray-500 mb-10">
          <Link href="/resources" className="hover:text-brand-400 transition-colors">Resources</Link>
          <span>/</span>
          <span className="text-gray-400">Connect Gmail to Sage</span>
        </div>

        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-400 border border-brand-600/20 font-medium">Tutorial</span>
            <span className="text-xs text-gray-500">8 min read · Pro+ plan</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            Connect Gmail to Sage CRM
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Connecting Gmail gives you a full AI-powered email inbox inside Sage. Sage reads your incoming emails via IMAP, scores each one for priority, surfaces key insights, and pre-writes three reply drafts. You can reply directly from Sage — with file attachments, Stripe invoice PDFs, or auto-generated proposal documents — and every email is logged to the contact&apos;s activity timeline.
          </p>
        </div>

        <div className="border-t border-white/10 mb-10" />

        <div className="prose prose-invert prose-brand max-w-none space-y-10 text-gray-300">

          {/* What you get */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What you get with Gmail connected</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-white">AI inbox sync</strong> — click &quot;Sync Inbox&quot; to pull your latest emails from Gmail via IMAP. Each email is analysed by AI and given a priority score (High / Medium / Low), a one-line summary, and key action points.</li>
              <li><strong className="text-white">Three AI reply drafts</strong> — Professional, Friendly, and Concise tone variants are pre-written for every inbound email. Click a tone to load the draft into the compose area.</li>
              <li><strong className="text-white">AI Rewrite</strong> — type an instruction (e.g. &quot;make it shorter&quot;, &quot;more formal&quot;) and Claude rewrites your draft instantly.</li>
              <li><strong className="text-white">Attachments</strong> — attach any file from your computer, attach a Stripe invoice PDF (if Stripe is connected), or generate a branded proposal PDF from a linked deal.</li>
              <li><strong className="text-white">Activity logging</strong> — every email you send from Sage is logged to the contact timeline automatically.</li>
            </ul>
            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-400">
              <strong className="text-white">How it connects:</strong> Sage uses your Gmail App Password for both IMAP (reading, imap.gmail.com port 993 SSL) and SMTP (sending, smtp.gmail.com port 587 STARTTLS). A single App Password covers both — no extra setup required.
            </div>
          </section>

          {/* What you need */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What you&apos;ll need</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>An <strong className="text-white">Appalix account</strong> on the Pro plan or above</li>
              <li>A <strong className="text-white">Gmail account</strong> (personal or Google Workspace)</li>
              <li><strong className="text-white">2-Step Verification enabled</strong> on your Google Account — required to generate an App Password</li>
            </ul>
          </section>

          {/* Step 1 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 1 — Enable 2-Step Verification</h2>
            <p className="mb-3">If you already have 2-Step Verification turned on, skip to Step 2.</p>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Go to <strong className="text-white">myaccount.google.com</strong> and sign in.</li>
              <li>Click <strong className="text-white">Security</strong> in the left sidebar.</li>
              <li>Under &quot;How you sign in to Google&quot;, click <strong className="text-white">2-Step Verification</strong>.</li>
              <li>Follow the on-screen prompts to enable it using your phone or an authenticator app.</li>
            </ol>
          </section>

          {/* Step 2 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 2 — Generate a Gmail App Password</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Go to <strong className="text-white">myaccount.google.com/apppasswords</strong> (or navigate to Security → App Passwords).</li>
              <li>You may be prompted to re-enter your password.</li>
              <li>In the &quot;App name&quot; field, type <strong className="text-white">Appalix Sage</strong> (or any name you&apos;ll recognise).</li>
              <li>Click <strong className="text-white">Create</strong>.</li>
              <li>Google will display a <strong className="text-white">16-character password</strong> (formatted as four groups of four letters). Copy this — it will only be shown once.</li>
            </ol>
            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-400">
              <strong className="text-white">Security tip:</strong> This App Password grants access only to your Gmail via IMAP and SMTP — not to your full Google Account. You can revoke it at any time from the App Passwords page without affecting your main password.
            </div>
          </section>

          {/* Step 3 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 3 — Connect Gmail in Sage</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>In Appalix, go to <strong className="text-white">Sage → Integrations</strong>.</li>
              <li>Under the <strong className="text-white">Email</strong> section, find the <strong className="text-white">Gmail</strong> card and click <strong className="text-white">Connect</strong>.</li>
              <li>Enter your <strong className="text-white">Gmail address</strong> (e.g. you@gmail.com).</li>
              <li>Paste the <strong className="text-white">App Password</strong> into the App Password field (spaces are ignored).</li>
              <li>Click <strong className="text-white">Save &amp; Connect</strong>.</li>
            </ol>
            <p className="mt-4">Sage will test the connection. On success, the Gmail card shows a green &quot;Connected&quot; badge.</p>
          </section>

          {/* Step 4 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 4 — Open the AI Email Inbox</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>In the Sage sidebar, click <strong className="text-white">Emails</strong>.</li>
              <li>Click the <strong className="text-white">Sync</strong> button at the top of the inbox.</li>
              <li>Sage fetches your most recent emails from Gmail, runs AI analysis on each one, and displays them in the inbox with priority badges (High / Medium / Low).</li>
              <li>Click any email to open it. On the right you&apos;ll see the full email body, an <strong className="text-white">AI Insights panel</strong> (summary + key action points), and a compose area pre-loaded with three AI reply drafts.</li>
            </ol>
            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-400">
              <strong className="text-white">Filtering:</strong> Use the All / High / Medium / Low tabs at the top of the inbox to focus on the emails that need your attention first.
            </div>
          </section>

          {/* Step 5 - Attachments */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 5 — Reply with attachments</h2>
            <p className="mb-3">Sage supports three types of attachments in the compose area:</p>
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
                <p className="text-sm text-gray-400 mt-1">Sage syncs on demand — click <strong className="text-white">Sync</strong> whenever you want to pull new emails. There is no background polling in the current version, so new emails will not appear until you sync.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Does AI analysis cost me extra credits?</p>
                <p className="text-sm text-gray-400 mt-1">AI analysis uses your workspace&apos;s Claude AI credits. Each email analysed costs a small number of credits for the priority scoring, insights, and three reply drafts. Credits are shared across all AI features in your workspace.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Can I use a Google Workspace account (G Suite)?</p>
                <p className="text-sm text-gray-400 mt-1">Yes. The same App Password process applies to Google Workspace accounts. Your admin may need to allow App Passwords depending on your organisation&apos;s security policy.</p>
              </div>
              <div>
                <p className="font-semibold text-white">What happens if I change my Gmail password?</p>
                <p className="text-sm text-gray-400 mt-1">App Passwords are independent of your main Gmail password. Changing your Gmail password does not invalidate the App Password. However, if you revoke the App Password in Google, you&apos;ll need to generate a new one and reconnect in Sage.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Will emails I send from Sage appear in my Gmail Sent folder?</p>
                <p className="text-sm text-gray-400 mt-1">Gmail does not automatically add SMTP-sent messages to the Sent folder. The email is sent and logged in Sage&apos;s activity timeline, but you may not see it in Gmail Sent Items.</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-brand-600/10 border border-brand-600/20 p-6 text-center mt-12">
            <p className="text-2xl mb-3">🤖</p>
            <h3 className="text-lg font-semibold text-white mb-2">Ready for your AI-powered inbox?</h3>
            <p className="text-sm text-gray-400 mb-5">
              Connect Gmail in Sage Integrations, open Sage → Emails, click Sync, and let the AI handle the heavy lifting.
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
