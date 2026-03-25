import Link from 'next/link'
import type { Metadata } from 'next'
import { ArticleSeo } from '@/components/marketing/article-seo'

export const metadata: Metadata = {
  title: 'Connect Google Forms to Sage — Receive Submissions Instantly | Appalix',
  description:
    'Receive Google Form submissions inside Appalix Sage automatically — no paid add-ons required. A one-time Apps Script setup sends every response to your Sage inbox in real time.',
  keywords: [
    'Google Forms Appalix integration',
    'Google Forms webhook Apps Script',
    'connect Google Forms CRM',
    'Sage Google Forms integration',
    'Google Forms lead capture Appalix',
    'Apps Script webhook tutorial',
    'Google Forms form submissions CRM',
  ],
  alternates: { canonical: 'https://appalix.ai/resources/connect-google-forms' },
  openGraph: {
    title: 'Connect Google Forms to Sage — Receive Submissions Instantly | Appalix',
    description: 'A one-time Apps Script setup sends every Google Form response to Appalix Sage in real time. No paid add-ons, no Zapier.',
    url: 'https://appalix.ai/resources/connect-google-forms',
    type: 'article',
    siteName: 'Appalix',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Connect Google Forms to Sage — Receive Submissions Instantly | Appalix',
    description: 'A one-time Apps Script setup sends every Google Form response to Appalix Sage in real time.',
  },
}

export default function ConnectGoogleFormsPage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <ArticleSeo
        type="HowTo"
        title="Connect Google Forms to Sage"
        description="Receive Google Form submissions inside Appalix Sage automatically using a one-time Apps Script setup. No paid add-ons required."
        slug="connect-google-forms"
        datePublished="2026-03-25"
        steps={[
          { name: 'Connect Google Forms in Sage Integrations', text: 'In Appalix, go to Sage → Integrations, find the Google Forms card under Forms, and click Connect. Optionally enter a webhook secret for added security, then click Save & Connect.' },
          { name: 'Copy the pre-filled Apps Script', text: 'After connecting, expand the Google Forms card. Click "Copy script" to copy the Apps Script with your unique webhook URL already embedded.' },
          { name: 'Open Apps Script in Google Forms', text: 'Open your Google Form, click the 3-dot menu (⋮) in the top-right, then select Extensions → Apps Script.' },
          { name: 'Paste and save the script', text: 'Delete any existing code in the Apps Script editor, paste the copied script, then click Save (the floppy disk icon).' },
          { name: 'Add the On form submit trigger', text: 'In Apps Script, click the Triggers icon (clock/alarm icon) → Add Trigger. Set the function to sendToAppalix, the event source to From form, and the event type to On form submit. Click Save.' },
          { name: 'Send a test submission', text: 'Back in Appalix, click Send test submission on the Google Forms card to verify the end-to-end connection.' },
        ]}
      />
      <div className="max-w-3xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-10">
          <Link href="/resources" className="hover:text-brand-400 transition-colors">Resources</Link>
          <span>/</span>
          <span className="text-gray-400">Connect Google Forms to Sage</span>
        </div>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-400 border border-brand-600/20 font-medium">Tutorial</span>
            <span className="text-xs text-gray-500">8 min read · Pro+ plan</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            Connect Google Forms to Sage
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Every time someone submits your Google Form, Appalix Sage receives the response instantly — no paid add-ons, no Zapier, no polling.
            A one-time Apps Script setup fires a webhook with the full submission, which Sage scores and stores automatically.
            This guide walks through the complete setup in under 10 minutes.
          </p>
        </div>

        <div className="border-t border-white/10 mb-10" />

        <div className="prose prose-invert prose-brand max-w-none space-y-10 text-gray-300">

          {/* ── How it works ────────────────────────────────────────────────── */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">How it works</h2>
            <p>
              Google Forms does not support native outbound webhooks, but it does support <strong className="text-white">Apps Script</strong> — a lightweight JavaScript runtime built into every Google Form.
              You paste a small script that runs automatically on every form submission and posts the response to your Appalix webhook URL.
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>The script fires on the <strong className="text-white">On form submit</strong> trigger — no polling, instant delivery.</li>
              <li>It sends every field label and value, plus the form title, directly to Appalix.</li>
              <li>Appalix normalises the fields (name, email, phone, company, message) and runs AI analysis automatically.</li>
              <li>The script and webhook URL are unique to your workspace — nothing is shared.</li>
            </ul>
            <div className="mt-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm text-blue-300">
              <strong>Plan requirement:</strong> Google Forms integration requires a Pro, Scale, or Enterprise plan. Upgrade in <strong>Settings → Upgrade</strong>.
            </div>
          </section>

          {/* ── What you'll need ────────────────────────────────────────────── */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What you&apos;ll need</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>An <strong className="text-white">Appalix account</strong> on the Pro plan or above</li>
              <li>A <strong className="text-white">Google Form</strong> — any form in your Google account</li>
              <li>Access to the form&apos;s <strong className="text-white">Apps Script editor</strong> (available in all free Google accounts)</li>
            </ul>
            <p className="mt-3 text-sm">
              No API keys, no OAuth setup, and no paid Google Workspace plan is required — a free Google account works perfectly.
            </p>
          </section>

          {/* ── Step 1 ──────────────────────────────────────────────────────── */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 1 — Connect Google Forms in Sage Integrations</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>In Appalix, navigate to <strong className="text-white">Sage → Integrations</strong> in the left sidebar.</li>
              <li>Scroll to the <strong className="text-white">Forms</strong> section and find the <strong className="text-white">Google Forms</strong> card.</li>
              <li>Click <strong className="text-white">Connect</strong> to expand the configuration panel.</li>
              <li>
                <strong className="text-white">Webhook Secret (optional):</strong> You can enter any string here (e.g. a long random password).
                If provided, the secret is appended to your webhook URL as a query parameter — Appalix will reject any request that doesn&apos;t include it.
                Leave this blank if you prefer a simpler setup.
              </li>
              <li>Click <strong className="text-white">Save &amp; Connect</strong>. The card will show a green <em>Connected</em> badge.</li>
            </ol>
            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-400">
              <strong className="text-white">Tip:</strong> After connecting, click the <strong className="text-white">Set up</strong> button on the card to reveal the Apps Script setup guide with your pre-filled webhook URL.
            </div>
          </section>

          {/* ── Step 2 ──────────────────────────────────────────────────────── */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 2 — Copy the pre-filled Apps Script</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>In the connected Google Forms card, expand the setup panel. You&apos;ll see a <strong className="text-white">Set up in 3 steps</strong> section.</li>
              <li>Click the <strong className="text-white">Copy script</strong> button. The entire Apps Script (including your unique webhook URL) is copied to your clipboard.</li>
            </ol>
            <p className="mt-4">
              The script looks like this:
            </p>
            <pre className="mt-3 text-[11px] font-mono bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-gray-400 overflow-x-auto whitespace-pre leading-relaxed">{`function sendToAppalix(e) {
  var form = FormApp.getActiveForm();
  var fields = {};
  e.response.getItemResponses().forEach(function(r) {
    fields[r.getItem().getTitle()] = String(r.getResponse());
  });
  UrlFetchApp.fetch('https://appalix.ai/api/webhooks/google-forms/YOUR_ID', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ form_title: form.getTitle(), responses: fields }),
    muteHttpExceptions: true
  });
}`}</pre>
            <p className="mt-3 text-sm">
              When you copy from the Appalix card, <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300 text-xs">YOUR_ID</code> is replaced with your real workspace ID (and your secret, if you set one).
            </p>
          </section>

          {/* ── Step 3 ──────────────────────────────────────────────────────── */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 3 — Open Apps Script in your Google Form</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Open your Google Form in <strong className="text-white">Google Forms</strong> (forms.google.com).</li>
              <li>Click the <strong className="text-white">3-dot menu (⋮)</strong> in the top-right corner of the form editor.</li>
              <li>Select <strong className="text-white">Extensions</strong> → <strong className="text-white">Apps Script</strong>. The Apps Script editor opens in a new tab.</li>
            </ol>
            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-400">
              <strong className="text-white">Note:</strong> The Apps Script editor is linked to this specific form. You&apos;ll need to repeat steps 3–5 for each Google Form you want to connect — each form gets its own script and trigger.
            </div>
          </section>

          {/* ── Step 4 ──────────────────────────────────────────────────────── */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 4 — Paste and save the script</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>In the Apps Script editor, you&apos;ll see a <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300 text-xs">Code.gs</code> file with a default function. <strong className="text-white">Select all existing code and delete it.</strong></li>
              <li>Paste the script you copied from Appalix (<kbd className="bg-white/10 px-1.5 py-0.5 rounded text-xs text-gray-300">⌘V</kbd> on Mac, <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-xs text-gray-300">Ctrl+V</kbd> on Windows).</li>
              <li>Click the <strong className="text-white">Save</strong> icon (floppy disk 💾) or press <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-xs text-gray-300">⌘S</kbd> / <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-xs text-gray-300">Ctrl+S</kbd>.</li>
              <li>If prompted to name the project, enter something like <em>Appalix Webhook</em> and click <strong className="text-white">OK</strong>.</li>
            </ol>
          </section>

          {/* ── Step 5 ──────────────────────────────────────────────────────── */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 5 — Add the On form submit trigger</h2>
            <p>
              The script won&apos;t run automatically until you attach it to a trigger. This is a one-time setup per form.
            </p>
            <ol className="list-decimal pl-5 space-y-3 mt-3">
              <li>In the Apps Script editor, click the <strong className="text-white">Triggers</strong> icon — it looks like a clock or alarm bell (⏰) in the left sidebar.</li>
              <li>Click <strong className="text-white">Add Trigger</strong> (bottom-right of the page).</li>
              <li>In the trigger dialog, set:
                <ul className="list-disc pl-5 mt-2 space-y-1.5">
                  <li><strong className="text-white">Choose which function to run:</strong> <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300 text-xs">sendToAppalix</code></li>
                  <li><strong className="text-white">Which deployment should run:</strong> Head</li>
                  <li><strong className="text-white">Select event source:</strong> From form</li>
                  <li><strong className="text-white">Select event type:</strong> On form submit</li>
                </ul>
              </li>
              <li>Click <strong className="text-white">Save</strong>.</li>
              <li>Google will ask you to authorise the script. Sign in with your Google account and click <strong className="text-white">Allow</strong>. This lets the script access form responses and make external HTTP requests.</li>
            </ol>
            <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-300">
              <strong>Authorization warning:</strong> Google may show a warning that the app is unverified. This is normal for scripts you write yourself — click <strong>Advanced</strong> → <strong>Go to [project name] (unsafe)</strong> to proceed. The script only reads form responses and calls your own Appalix webhook URL.
            </div>
          </section>

          {/* ── Step 6 ──────────────────────────────────────────────────────── */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 6 — Test the connection</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Go back to <strong className="text-white">Sage → Integrations</strong> in Appalix.</li>
              <li>Expand the connected Google Forms card and click <strong className="text-white">Send test submission</strong>.</li>
              <li>You should see <em>&quot;Test sent — check your Forms tab.&quot;</em> within a few seconds.</li>
              <li>Navigate to <strong className="text-white">Sage → Forms</strong> to see the test entry. It will appear as a submission from <em>&quot;Test Form (Google Forms)&quot;</em>.</li>
            </ol>
            <p className="mt-4">
              Alternatively, submit your actual Google Form. The response will appear in <strong className="text-white">Sage → Forms</strong> within seconds.
            </p>
            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-400">
              <strong className="text-white">Not receiving submissions?</strong> Check the Apps Script execution log: in the Apps Script editor, click <strong>Executions</strong> in the left sidebar. Look for failed runs — common causes are a typo in the webhook URL or the trigger not being saved correctly.
            </div>
          </section>

          {/* ── What gets captured ──────────────────────────────────────────── */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What gets captured</h2>
            <p>
              Every field in your Google Form is sent to Appalix exactly as labelled. Appalix then automatically maps common field names to standard contact fields:
            </p>
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 pr-6 text-gray-400 font-medium">Standard field</th>
                    <th className="text-left py-2 text-gray-400 font-medium">Detected from labels like…</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[
                    ['Name', '"Name", "Full Name", "Your Name"'],
                    ['Email', '"Email", "Email Address", "E-mail"'],
                    ['Phone', '"Phone", "Phone Number", "Mobile", "Tel"'],
                    ['Company', '"Company", "Organisation", "Business Name"'],
                    ['Message', '"Message", "Comments", "How can we help?"'],
                  ].map(([field, labels]) => (
                    <tr key={field}>
                      <td className="py-2 pr-6 text-white font-medium">{field}</td>
                      <td className="py-2 text-gray-300 text-xs">{labels}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm">
              All other fields are stored in the raw payload and are visible when you open a submission in Sage → Forms. Nothing is lost — unmapped fields are just not extracted into the standard contact columns.
            </p>
          </section>

          {/* ── Multiple forms ──────────────────────────────────────────────── */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Connecting multiple Google Forms</h2>
            <p>
              You only connect Google Forms <strong className="text-white">once</strong> in Sage Integrations — the same webhook URL works for every form.
              For each additional Google Form, simply repeat steps 3–5: open the form, go to Apps Script, paste the same script, and add the same trigger.
            </p>
            <p className="mt-3">
              Submissions from different forms are distinguished in Appalix by their <strong className="text-white">form title</strong> (the name of the Google Form). If two forms share the same title, their responses will be grouped under one form in Sage.
            </p>
          </section>

          {/* ── FAQ ──────────────────────────────────────────────────────────── */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Frequently asked questions</h2>
            <div className="space-y-5">
              <div>
                <p className="font-semibold text-white">Do I need a paid Google Workspace account?</p>
                <p className="text-sm text-gray-400 mt-1">No. Apps Script is available in all free Google accounts and is enabled by default for any Google Form you create.</p>
              </div>
              <div>
                <p className="font-semibold text-white">What happens to submissions received before the trigger was set up?</p>
                <p className="text-sm text-gray-400 mt-1">The Apps Script only fires for new submissions after the trigger is saved. Existing responses are not sent retroactively. Use the test submission button to confirm the live connection is working.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Is the webhook secret required?</p>
                <p className="text-sm text-gray-400 mt-1">No — it is optional. Without it, your webhook URL is still unique to your workspace (it contains your workspace ID). Adding a secret provides an extra layer of protection against anyone guessing your URL and posting fake submissions.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Can I edit the script after saving?</p>
                <p className="text-sm text-gray-400 mt-1">Yes. Open Apps Script on the form, edit the code, and save. The trigger will continue to work — you don&apos;t need to re-create it after editing the script.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Will it work if a respondent leaves a question blank?</p>
                <p className="text-sm text-gray-400 mt-1">Yes. Blank answers are simply omitted from the fields object sent to Appalix. Required vs. optional questions behave identically from the webhook&apos;s perspective.</p>
              </div>
              <div>
                <p className="font-semibold text-white">How do I disconnect?</p>
                <p className="text-sm text-gray-400 mt-1">Click <strong className="text-white">Disconnect</strong> on the Google Forms card in Sage Integrations. To stop submissions from being sent, also delete the trigger in Apps Script (Triggers → hover over the trigger → click the three-dot menu → Delete trigger). Existing submissions in Sage are not affected.</p>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="rounded-2xl bg-brand-600/10 border border-brand-600/20 p-6 text-center mt-12">
            <p className="text-2xl mb-3">📊</p>
            <h3 className="text-lg font-semibold text-white mb-2">Ready to connect your Google Form?</h3>
            <p className="text-sm text-gray-400 mb-5">
              Connect in Sage Integrations, paste the script, and your form submissions will start flowing into Appalix automatically.
            </p>
            <Link
              href="/sage/integrations"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Go to Sage Integrations →
            </Link>
          </section>

          {/* Related tutorials */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Related tutorials</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { href: '/resources/forms-lead-ads-guide', emoji: '📥', title: 'Appalix Forms — Complete Guide', desc: 'Everything about connecting ad platforms, scoring leads, and pushing to your CRM pipeline.' },
                { href: '/resources/connect-meta-leads', emoji: '📘', title: 'Connect Meta Lead Ads', desc: 'Receive Facebook and Instagram lead form submissions in real time via webhook.' },
                { href: '/resources/connect-google-ads-leads', emoji: '🎯', title: 'Connect Google Ads Lead Forms', desc: 'Receive Google Ads lead form submissions in Appalix via webhook.' },
                { href: '/resources/meet-appalix-sage', emoji: '✦', title: 'Meet Appalix Sage', desc: 'How the Sage AI panel works and what it can do for your team.' },
              ].map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="p-4 rounded-xl bg-white/3 border border-white/8 hover:border-brand-600/40 transition-colors group"
                >
                  <div className="text-xl mb-2">{item.emoji}</div>
                  <p className="text-sm font-semibold text-white group-hover:text-brand-400 transition-colors mb-1">{item.title}</p>
                  <p className="text-xs text-gray-400">{item.desc}</p>
                </Link>
              ))}
            </div>
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
