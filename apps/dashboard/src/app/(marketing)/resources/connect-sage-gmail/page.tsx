import Link from 'next/link'
import type { Metadata } from 'next'
import { ArticleSeo } from '@/components/marketing/article-seo'

export const metadata: Metadata = {
  title: 'Connect Gmail to Sage CRM — Send Emails from Deals & Contacts | Appalix',
  description:
    'Send emails directly from Sage CRM contact and deal records using your Gmail account. Generate a Gmail App Password, paste it into Sage Integrations, and every email is automatically logged to the activity timeline.',
  keywords: [
    'Sage CRM Gmail integration',
    'Appalix Sage Gmail',
    'send email from CRM Gmail',
    'Gmail App Password CRM',
    'CRM email logging Gmail',
    'Sage email integration',
    'Gmail SMTP CRM',
  ],
  alternates: { canonical: 'https://appalix.ai/resources/connect-sage-gmail' },
  openGraph: {
    title: 'Connect Gmail to Sage CRM — Send Emails from Deals & Contacts | Appalix',
    description: 'Send emails from Sage CRM using Gmail. Step-by-step setup guide.',
    url: 'https://appalix.ai/resources/connect-sage-gmail',
    type: 'article',
    siteName: 'Appalix',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Connect Gmail to Sage CRM — Send Emails from Deals & Contacts | Appalix',
    description: 'Send emails from Sage CRM using Gmail. Step-by-step setup guide.',
  },
}

export default function ConnectSageGmailPage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <ArticleSeo
        type="HowTo"
        title="Connect Gmail to Sage CRM"
        description="Send emails directly from Sage CRM contact and deal records using your Gmail account. Every email is automatically logged to the activity timeline."
        slug="connect-sage-gmail"
        datePublished="2026-03-02"
        steps={[
          { name: 'Enable 2-Step Verification in Google', text: 'In your Google Account, go to Security → 2-Step Verification and turn it on. App Passwords are only available when 2-Step Verification is active.' },
          { name: 'Generate a Gmail App Password', text: 'In your Google Account, go to Security → App Passwords, select "Other" as the app, name it "Appalix Sage", and copy the 16-character password.' },
          { name: 'Paste credentials into Sage', text: 'In Appalix, go to Sage → Integrations, click Connect on the Gmail card, enter your Gmail address and the App Password, then click Save & Connect.' },
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
            <span className="text-xs text-gray-500">6 min read · Pro+ plan</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            Connect Gmail to Sage CRM
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Once Gmail is connected, you can send emails directly from contact records and deal pages in Sage. Every email you send is automatically logged to the activity timeline — so your whole team can see the conversation history without leaving the CRM.
          </p>
        </div>

        <div className="border-t border-white/10 mb-10" />

        <div className="prose prose-invert prose-brand max-w-none space-y-10 text-gray-300">

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What you&apos;ll need</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>An <strong className="text-white">Appalix account</strong> on the Pro plan or above</li>
              <li>A <strong className="text-white">Gmail account</strong> (personal or Google Workspace)</li>
              <li><strong className="text-white">2-Step Verification enabled</strong> on your Google Account — required to generate an App Password</li>
            </ul>
            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-400">
              <strong className="text-white">Note:</strong> Sage uses SMTP to send emails on your behalf (smtp.gmail.com, port 587, TLS). A regular Gmail password will not work — you must use an App Password.
            </div>
          </section>

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

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 2 — Generate a Gmail App Password</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>
                Go to <strong className="text-white">myaccount.google.com/apppasswords</strong> (or navigate to Security → App Passwords).
              </li>
              <li>You may be prompted to re-enter your password.</li>
              <li>In the &quot;App name&quot; field, type <strong className="text-white">Appalix Sage</strong> (or any name you&apos;ll recognise).</li>
              <li>Click <strong className="text-white">Create</strong>.</li>
              <li>
                Google will display a <strong className="text-white">16-character password</strong> (formatted as four groups of four letters). Copy this password — it will only be shown once.
              </li>
            </ol>
            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-400">
              <strong className="text-white">Security tip:</strong> Each App Password grants access only to Gmail SMTP — it does not give access to your full Google Account. You can revoke it at any time from the App Passwords page.
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 3 — Paste credentials into Sage</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>In Appalix, go to <strong className="text-white">Sage → Integrations</strong>.</li>
              <li>Under the <strong className="text-white">Email</strong> section, find the <strong className="text-white">Gmail</strong> card and click <strong className="text-white">Connect</strong>.</li>
              <li>Enter your <strong className="text-white">Gmail address</strong> (e.g. you@gmail.com).</li>
              <li>Paste the <strong className="text-white">App Password</strong> into the App Password field (spaces are ignored).</li>
              <li>Click <strong className="text-white">Save &amp; Connect</strong>.</li>
            </ol>
            <p className="mt-4">Sage will attempt a test connection. If it succeeds, the Gmail card will show a green &quot;Connected&quot; badge.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">How it works</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Open any <strong className="text-white">contact record</strong> or <strong className="text-white">deal page</strong> in Sage and click the <strong className="text-white">Send Email</strong> button.</li>
              <li>Write your subject and body — Sage pre-fills the recipient from the contact&apos;s email address.</li>
              <li>Click <strong className="text-white">Send</strong>. Sage delivers the email via Gmail SMTP using your credentials.</li>
              <li>The email is immediately logged to the <strong className="text-white">activity timeline</strong> so your team can see it.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Frequently asked questions</h2>
            <div className="space-y-5">
              <div>
                <p className="font-semibold text-white">Will replies appear in Sage automatically?</p>
                <p className="text-sm text-gray-400 mt-1">Not automatically — Sage sends outbound emails only. Replies arrive in your Gmail inbox as normal. You can manually log a reply as a note on the deal.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Can I use a Google Workspace account (G Suite)?</p>
                <p className="text-sm text-gray-400 mt-1">Yes. The same App Password process applies to Google Workspace accounts. Your admin may need to allow &quot;Less secure app access&quot; or App Passwords depending on your organisation&apos;s security policy.</p>
              </div>
              <div>
                <p className="font-semibold text-white">What happens if I change my Gmail password?</p>
                <p className="text-sm text-gray-400 mt-1">Your App Password is independent of your main Gmail password. Changing your Gmail password does not invalidate the App Password. However, if you revoke the App Password in Google, you&apos;ll need to generate a new one and reconnect.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Can multiple team members connect their own Gmail?</p>
                <p className="text-sm text-gray-400 mt-1">Each Sage workspace currently supports one connected Gmail account. All emails sent from Sage will appear to come from that address. Per-member email accounts are on the roadmap.</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-brand-600/10 border border-brand-600/20 p-6 text-center mt-12">
            <p className="text-2xl mb-3">📧</p>
            <h3 className="text-lg font-semibold text-white mb-2">Ready to send emails from Sage?</h3>
            <p className="text-sm text-gray-400 mb-5">
              Generate your Gmail App Password, paste it into Sage Integrations, and start sending logged emails from every contact and deal.
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
          <Link href="/sage/integrations" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            Sage Integrations →
          </Link>
        </div>

      </div>
    </div>
  )
}
