import Link from 'next/link'
import type { Metadata } from 'next'
import { ArticleSeo } from '@/components/marketing/article-seo'

export const metadata: Metadata = {
  title: 'Connect Google Calendar to Sage — Schedule Meetings with AI | Appalix',
  description:
    'Connect your Google Calendar to Appalix Sage so the AI assistant can check availability, create events, and schedule meetings on your behalf — directly from chat.',
  keywords: [
    'Google Calendar Appalix integration',
    'Sage AI Google Calendar',
    'schedule meetings AI assistant',
    'Appalix calendar integration',
    'connect Google Calendar CRM',
  ],
  alternates: { canonical: 'https://appalix.ai/resources/connect-google-calendar' },
  openGraph: {
    title: 'Connect Google Calendar to Sage — Schedule Meetings with AI | Appalix',
    description: 'Connect Google Calendar so Sage can check availability, create events, and schedule meetings directly from chat.',
    url: 'https://appalix.ai/resources/connect-google-calendar',
    type: 'article',
    siteName: 'Appalix',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Connect Google Calendar to Sage — Schedule Meetings with AI | Appalix',
    description: 'Connect Google Calendar so Sage can check availability and schedule meetings directly from chat.',
  },
}

export default function ConnectGoogleCalendarPage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <ArticleSeo
        type="HowTo"
        title="Connect Google Calendar to Sage"
        description="Connect your Google Calendar so the Appalix Sage AI assistant can check your availability, create events, and schedule meetings on your behalf."
        slug="connect-google-calendar"
        datePublished="2026-04-17"
        steps={[
          { name: 'Go to Integrations', text: 'In Appalix, navigate to Integrations in the left sidebar and scroll to the Google Workspace section.' },
          { name: 'Click Connect on Google Calendar', text: 'Find the Google Calendar card and click Connect. You will be redirected to Google to authorise access.' },
          { name: 'Authorise calendar access', text: 'Sign in with your Google account and grant Appalix permission to read your calendar and create events. Click Allow.' },
          { name: 'Confirm the connection', text: 'You will be redirected back to Integrations. The Google Calendar card will show Connected with your Google account email.' },
          { name: 'Use Sage to schedule', text: 'Open Sage and ask it to check your availability or book a meeting. Sage will read your Google Calendar in real time.' },
        ]}
      />
      <div className="max-w-3xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-white/60 mb-10">
          <Link href="/resources" className="hover:text-brand-400 transition-colors">Resources</Link>
          <span>/</span>
          <span className="text-white/65">Connect Google Calendar to Sage</span>
        </div>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-400 border border-brand-600/20 font-medium">Tutorial</span>
            <span className="text-xs text-white/60">5 min read · All plans</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            Connect Google Calendar to Sage
          </h1>
          <p className="text-white/65 text-lg leading-relaxed">
            Once connected, Appalix Sage can check your availability, create calendar events, and
            schedule meetings — all from a simple chat conversation. No more back-and-forth
            copying times into calendar apps.
          </p>
        </div>

        <div className="border-t border-white/10 mb-10" />

        <div className="prose prose-invert prose-brand max-w-none space-y-10 text-white/80">

          {/* ── What Sage can do ──────────────────────────────────────────────── */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What Sage can do with your calendar</h2>
            <p>
              After connecting Google Calendar, Sage gains access to read and write your calendar events.
              You can ask it things like:
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li><strong className="text-white">&quot;Am I free tomorrow at 3 pm?&quot;</strong> — Sage checks your calendar in real time.</li>
              <li><strong className="text-white">&quot;Book a 30-minute call with Alex on Friday at 2 pm&quot;</strong> — Sage creates the event and adds it to your calendar.</li>
              <li><strong className="text-white">&quot;What meetings do I have this week?&quot;</strong> — Sage lists your upcoming events.</li>
              <li><strong className="text-white">&quot;Find a free hour between 9 am and 5 pm today&quot;</strong> — Sage reads your schedule and suggests open slots.</li>
            </ul>
            <div className="mt-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm text-blue-300">
              <strong>Scope of access:</strong> Appalix requests <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs">calendar</code> and <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs">calendar.freebusy</code> scopes — enough to read events and create new ones. We never delete events without your explicit instruction.
            </div>
          </section>

          {/* ── Connect steps ─────────────────────────────────────────────────── */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 1 — Connect your calendar</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>In Appalix, click <strong className="text-white">Integrations</strong> in the left sidebar.</li>
              <li>Scroll to the <strong className="text-white">Google Workspace</strong> section.</li>
              <li>Click <strong className="text-white">Connect</strong> on the Google Calendar card.</li>
              <li>A Google sign-in window opens. Choose the Google account whose calendar you want to use.</li>
              <li>Review the permissions and click <strong className="text-white">Allow</strong>.</li>
              <li>You&apos;ll be redirected back to Integrations. The card will now show <strong className="text-white">Connected</strong> with your Google account email.</li>
            </ol>
            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white/65">
              <strong className="text-white">One calendar per user:</strong> The connection is per-user, not per-workspace. Each team member connects their own Google account — Sage will always use the calendar of the person who is currently signed in to Appalix.
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Step 2 — Ask Sage to use your calendar</h2>
            <p>
              Open <strong className="text-white">Sage</strong> from the left sidebar and start a conversation. There is no additional setup — Sage automatically knows your calendar is connected.
            </p>
            <p className="mt-3">
              Try asking:
            </p>
            <ul className="mt-3 space-y-2 list-none pl-0">
              {[
                'What does my schedule look like tomorrow?',
                'Book a 1-hour strategy meeting with the team on Monday at 10 am.',
                'Find a free 30-minute slot this afternoon.',
                'Create a recurring weekly standup every Tuesday at 9 am.',
              ].map(q => (
                <li key={q} className="flex items-start gap-2">
                  <span className="text-brand-400 mt-0.5">›</span>
                  <span className="italic text-white/75">&quot;{q}&quot;</span>
                </li>
              ))}
            </ul>
          </section>

          {/* ── Reconnect / Disconnect ────────────────────────────────────────── */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Reconnecting or disconnecting</h2>
            <p>
              If your token expires or you see an error, click <strong className="text-white">Reconnect</strong> on the Google Calendar card in Integrations.
              This re-runs the OAuth flow and refreshes your credentials. Your calendar data is not affected.
            </p>
            <p className="mt-3">
              To fully disconnect, click <strong className="text-white">Disconnect</strong>. Sage will no longer be able to read or write your calendar until you reconnect.
              This also revokes Appalix&apos;s access token with Google — you can verify in your{' '}
              <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer" className="text-brand-400 hover:text-brand-300 underline">
                Google Account permissions
              </a>
              .
            </p>
          </section>

          {/* ── FAQ ──────────────────────────────────────────────────────────── */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Frequently asked questions</h2>
            <div className="space-y-5">
              <div>
                <p className="font-semibold text-white">Which calendars does Sage have access to?</p>
                <p className="text-sm text-white/65 mt-1">Sage can see all calendars in your Google account — including shared team calendars — through the primary Google account you connected. If you only want Sage to see specific calendars, use a Google account that only has access to those calendars.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Can Sage create events on behalf of other people?</p>
                <p className="text-sm text-white/65 mt-1">Sage creates events on the calendar of the connected Google account. If you invite guests, they will receive standard Google Calendar invitations just as if you created the event manually.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Is my calendar data stored by Appalix?</p>
                <p className="text-sm text-white/65 mt-1">No. Sage reads your calendar in real time when you ask a calendar-related question. Event data is not stored or indexed — it is used only to answer your query and is not retained after the conversation.</p>
              </div>
              <div>
                <p className="font-semibold text-white">What happens if I revoke access from Google&apos;s side?</p>
                <p className="text-sm text-white/65 mt-1">Sage will start receiving authentication errors. Click Reconnect on the Google Calendar card in Integrations to re-authorise. You can revoke and re-authorise as many times as you like.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Can multiple team members connect their own calendars?</p>
                <p className="text-sm text-white/65 mt-1">Yes. Each Appalix user connects their own Google account independently. Sage always uses the calendar of the currently signed-in user — it cannot access another team member&apos;s calendar.</p>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="rounded-2xl bg-brand-600/10 border border-brand-600/20 p-6 text-center mt-12">
            <p className="text-2xl mb-3">📅</p>
            <h3 className="text-lg font-semibold text-white mb-2">Ready to connect your calendar?</h3>
            <p className="text-sm text-white/65 mb-5">
              Connect Google Calendar from the Integrations page — takes under a minute.
            </p>
            <Link
              href="/integrations"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Go to Integrations →
            </Link>
          </section>

          {/* Related tutorials */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Related tutorials</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { href: '/resources/connect-google-drive', emoji: '📁', title: 'Connect Google Drive', desc: 'Index Google Drive files into your knowledge base for instant bot answers.' },
                { href: '/resources/connect-google-forms', emoji: '📋', title: 'Connect Google Forms', desc: 'Receive form submissions inside Appalix Sage automatically.' },
                { href: '/resources/meet-appalix-sage', emoji: '✦', title: 'Meet Appalix Sage', desc: 'How the Sage AI panel works and what it can do for your team.' },
                { href: '/resources/connect-google-chat', emoji: '💬', title: 'Connect Google Chat', desc: 'Deploy your Appalix bot inside Google Chat spaces and DMs.' },
              ].map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="p-4 rounded-xl bg-white/3 border border-white/8 hover:border-brand-600/40 transition-colors group"
                >
                  <div className="text-xl mb-2">{item.emoji}</div>
                  <p className="text-sm font-semibold text-white group-hover:text-brand-400 transition-colors mb-1">{item.title}</p>
                  <p className="text-xs text-white/65">{item.desc}</p>
                </Link>
              ))}
            </div>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-white/10 flex items-center justify-between flex-wrap gap-4">
          <Link href="/resources" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            ← Back to Resources
          </Link>
          <Link href="/integrations" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            Integrations →
          </Link>
        </div>

      </div>
    </div>
  )
}
