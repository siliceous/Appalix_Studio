import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy — Appalix',
  description: 'Appalix Privacy Policy. Learn how we collect, use, and protect your personal data including Gmail and Microsoft email access.',
}

const LAST_UPDATED = 'March 2026'

export default function PrivacyPage() {
  return (
    <div className="pt-24 pb-24">
      <div className="max-w-3xl mx-auto px-6">

        {/* Header */}
        <div className="mb-12">
          <p className="text-xs text-brand-400 uppercase tracking-widest font-semibold mb-3">Legal</p>
          <h1 className="text-4xl font-bold text-white mb-3">Privacy Policy</h1>
          <p className="text-sm text-white/60">Last updated: {LAST_UPDATED}</p>
          <div className="mt-4">
            <Link href="/" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
              ← Back to home
            </Link>
          </div>
        </div>

        <div className="prose prose-invert prose-sm max-w-none space-y-10 text-white/80 leading-relaxed">

          {/* Intro */}
          <section>
            <p>
              Appalix (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) operates the platform available at{' '}
              <strong className="text-white">appalix.ai</strong> and{' '}
              <strong className="text-white">app.appalix.ai</strong>. This Privacy Policy explains
              how we collect, use, store, and protect information about you when you use our services.
            </p>
            <p className="mt-3">
              By using Appalix you agree to the practices described in this policy. If you do not
              agree, please do not use the service.
            </p>
          </section>

          <Divider />

          {/* 1. Information we collect */}
          <Section title="1. Information we collect">
            <SubSection title="Account information">
              When you register or accept a workspace invitation we collect your name, email address,
              and company details you provide during onboarding. This information is stored securely
              in our database and used solely to operate your account.
            </SubSection>

            <SubSection title="Email account access (Gmail &amp; Microsoft Outlook)">
              <p>
                Appalix offers an optional Gmail and Microsoft Outlook integration. When you connect
                your email account, we request access to the following scopes:
              </p>
              <ul className="mt-3 space-y-2 list-disc list-inside text-white/65">
                <li><strong className="text-white/90">Gmail:</strong> <code className="text-brand-400 text-xs">https://www.googleapis.com/auth/gmail.modify</code> — read, compose, and send emails (does not include permanent deletion)</li>
                <li><strong className="text-white/90">Microsoft:</strong> <code className="text-brand-400 text-xs">IMAP.AccessAsUser.All</code> and <code className="text-brand-400 text-xs">SMTP.Send</code> — read and send email via Microsoft Graph API</li>
              </ul>
              <p className="mt-4 p-4 rounded-xl bg-brand-600/10 border border-brand-600/20 text-sm">
                <strong className="text-white">How we use your email data:</strong> Appalix reads
                incoming emails to identify, triage, and prioritise sales leads using AI. We display
                email content inside your Appalix dashboard and use it to generate AI-assisted reply
                suggestions. We do not share your email content with third parties, use it for
                advertising, or process it for any purpose other than operating the features you have
                explicitly enabled.
              </p>
              <p className="mt-3">
                Your OAuth tokens (access token and refresh token) are stored encrypted in our
                database. They are used only to fetch and send emails on your behalf and are never
                exposed to other users or shared externally.
              </p>
              <p className="mt-3">
                You can revoke Appalix&apos;s access to your Gmail account at any time via{' '}
                <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300">
                  Google Account Permissions
                </a>
                , and to your Microsoft account via{' '}
                <a href="https://account.microsoft.com/privacy/app-access" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300">
                  Microsoft Account App Access
                </a>
                . Revoking access removes all stored tokens immediately.
              </p>
            </SubSection>

            <SubSection title="Google Drive access">
              <p>
                Appalix offers an optional Google Drive integration that allows you to import
                documents into your AI knowledge base. When you connect Google Drive, we request:
              </p>
              <ul className="mt-3 space-y-2 list-disc list-inside text-white/65">
                <li><strong className="text-white/90">Google Drive:</strong> <code className="text-brand-400 text-xs">https://www.googleapis.com/auth/drive.readonly</code> — read and download files you select</li>
              </ul>
              <p className="mt-4 p-4 rounded-xl bg-brand-600/10 border border-brand-600/20 text-sm">
                <strong className="text-white">How we use your Drive data:</strong> Appalix reads
                only the files you explicitly select to import. Document content is stored in your
                private workspace knowledge base and used solely to power AI responses within your
                account. We never write to, modify, or delete your Drive files, and we do not share
                document content with third parties or use it for advertising.
              </p>
              <p className="mt-3">
                You can revoke Appalix&apos;s access to your Google Drive at any time via{' '}
                <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300">
                  Google Account Permissions
                </a>
                . Revoking access removes all stored tokens immediately.
              </p>
            </SubSection>

            <SubSection title="Usage data">
              We collect standard server logs including IP addresses, browser type, pages visited,
              and timestamps for security monitoring and service improvement. We do not use this
              data to build advertising profiles.
            </SubSection>

            <SubSection title="Workspace content">
              Content you create inside Appalix — including bot configurations, conversation
              histories, contacts, pipeline deals, and tickets — is stored in isolated,
              per-workspace tables. This content is never shared between workspaces or accounts.
            </SubSection>
          </Section>

          <Divider />

          {/* 2. How we use your information */}
          <Section title="2. How we use your information">
            <ul className="space-y-3 list-disc list-inside text-white/65">
              <li>To operate and maintain your account and workspace</li>
              <li>To read, triage, and display emails in your Appalix inbox (only when you have connected an email account)</li>
              <li>To generate AI-powered email replies and lead prioritisation using your email content</li>
              <li>To send emails on your behalf when you use the reply feature</li>
              <li>To send transactional emails (invite links, password resets) via Resend</li>
              <li>To enforce seat limits, billing, and plan restrictions</li>
              <li>To detect and prevent fraud and abuse</li>
              <li>To comply with legal obligations</li>
            </ul>
            <p className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white/65">
              <strong className="text-white">Google API Services User Data Policy:</strong> Appalix&apos;s
              use and transfer of information received from Google APIs to any other app will adhere
              to the{' '}
              <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300">
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>
          </Section>

          <Divider />

          {/* 3. Data sharing */}
          <Section title="3. Data sharing and third parties">
            <p>We do not sell your personal data. We share data only with the following categories of service providers, strictly for operating the platform:</p>
            <ul className="mt-4 space-y-3 list-disc list-inside text-white/65">
              <li><strong className="text-white/90">Supabase</strong> — database and authentication infrastructure</li>
              <li><strong className="text-white/90">Anthropic (Claude)</strong> — AI model inference for email triage and reply suggestions. Email content sent to Claude is subject to Anthropic&apos;s data processing agreement and is not used to train models</li>
              <li><strong className="text-white/90">Resend</strong> — transactional email delivery (invite links, notifications)</li>
              <li><strong className="text-white/90">Vercel</strong> — hosting and edge infrastructure</li>
            </ul>
            <p className="mt-4">
              We do not share email content or personal data with any advertising networks,
              analytics brokers, or data resellers.
            </p>
          </Section>

          <Divider />

          {/* 4. Data retention */}
          <Section title="4. Data retention and deletion">
            <p>
              We retain your account data for as long as your account is active or as needed to
              provide services. When you delete your account:
            </p>
            <ul className="mt-3 space-y-2 list-disc list-inside text-white/65">
              <li>Your user profile, workspace data, and email records are permanently deleted within 30 days</li>
              <li>OAuth tokens are invalidated immediately upon account deletion or integration disconnection</li>
              <li>Backup copies may persist for up to 90 days before automated deletion</li>
            </ul>
            <p className="mt-4">
              To request deletion of your data, contact us at{' '}
              <a href="mailto:privacy@appalix.ai" className="text-brand-400 hover:text-brand-300">
                privacy@appalix.ai
              </a>.
            </p>
          </Section>

          <Divider />

          {/* 5. Security */}
          <Section title="5. Security">
            <p>
              We protect your data using industry-standard measures including TLS 1.2+ encryption
              in transit, encryption at rest, row-level security policies on all database tables,
              and access controls that limit data access to authorised services only.
            </p>
            <p className="mt-3">
              OAuth tokens are stored in encrypted database columns and accessed only by the
              server-side email sync process. They are never exposed in API responses or client-side
              code.
            </p>
            <p className="mt-3">
              For more detail see our{' '}
              <Link href="/security" className="text-brand-400 hover:text-brand-300">
                Security page
              </Link>.
            </p>
          </Section>

          <Divider />

          {/* 6. GDPR */}
          <Section title="6. Your rights (GDPR)">
            <p>
              If you are located in the European Economic Area (EEA) or UK, you have the following
              rights regarding your personal data:
            </p>
            <ul className="mt-3 space-y-2 list-disc list-inside text-white/65">
              <li><strong className="text-white/90">Access</strong> — request a copy of the data we hold about you</li>
              <li><strong className="text-white/90">Rectification</strong> — correct inaccurate data</li>
              <li><strong className="text-white/90">Erasure</strong> — request deletion of your data</li>
              <li><strong className="text-white/90">Portability</strong> — receive your data in a machine-readable format</li>
              <li><strong className="text-white/90">Objection</strong> — object to certain types of processing</li>
              <li><strong className="text-white/90">Restriction</strong> — request we restrict processing in certain circumstances</li>
            </ul>
            <p className="mt-4">
              To exercise any of these rights, email{' '}
              <a href="mailto:privacy@appalix.ai" className="text-brand-400 hover:text-brand-300">
                privacy@appalix.ai
              </a>. We will respond within 30 days.
            </p>
          </Section>

          <Divider />

          {/* 7. Cookies */}
          <Section title="7. Cookies">
            <p>
              Appalix uses only essential session cookies required for authentication. We do not
              use advertising cookies, tracking pixels, or third-party analytics cookies. No cookie
              consent banner is required as we use only strictly necessary cookies.
            </p>
          </Section>

          <Divider />

          {/* 8. Changes */}
          <Section title="8. Changes to this policy">
            <p>
              We may update this Privacy Policy from time to time. We will notify users of material
              changes by email or by displaying a notice in the dashboard. Continued use of the
              service after changes constitutes acceptance of the updated policy.
            </p>
          </Section>

          <Divider />

          {/* 9. Contact */}
          <Section title="9. Contact">
            <p>
              For privacy questions, data requests, or to report a concern:
            </p>
            <div className="mt-4 p-5 rounded-xl bg-white/5 border border-white/10 text-sm space-y-1">
              <p className="text-white font-semibold">Appalix</p>
              <p><a href="mailto:privacy@appalix.ai" className="text-brand-400 hover:text-brand-300">privacy@appalix.ai</a></p>
              <p><Link href="/contact" className="text-brand-400 hover:text-brand-300">Contact form →</Link></p>
            </div>
          </Section>

        </div>
      </div>
    </div>
  )
}

function Divider() {
  return <hr className="border-white/10" />
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
      <div className="text-white/65 space-y-2 text-sm leading-relaxed">{children}</div>
    </div>
  )
}
