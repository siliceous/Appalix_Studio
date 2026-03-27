import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service — Appalix',
  description: 'Appalix Terms of Service. The rules and conditions that govern your use of the Appalix platform.',
}

const LAST_UPDATED = 'March 2025'

export default function TermsPage() {
  return (
    <div className="pt-24 pb-24">
      <div className="max-w-3xl mx-auto px-6">

        {/* Header */}
        <div className="mb-12">
          <p className="text-xs text-brand-400 uppercase tracking-widest font-semibold mb-3">Legal</p>
          <h1 className="text-4xl font-bold text-white mb-3">Terms of Service</h1>
          <p className="text-sm text-white/60">Last updated: {LAST_UPDATED}</p>
          <div className="mt-4">
            <Link href="/" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
              ← Back to home
            </Link>
          </div>
        </div>

        <div className="space-y-10 text-white/80 leading-relaxed text-sm">

          <section>
            <p>
              These Terms of Service (&quot;Terms&quot;) govern your access to and use of the Appalix
              platform (&quot;Service&quot;) operated by Appalix (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;).
              By creating an account or using the Service you agree to be bound by these Terms.
              If you do not agree, do not use the Service.
            </p>
          </section>

          <Divider />

          <Section title="1. The Service">
            <p>
              Appalix is an AI-powered sales and customer communications platform that helps
              businesses triage leads, manage email, run chatbots, and track sales pipelines.
              Features include but are not limited to: email inbox sync, AI lead scoring,
              conversation bots, CRM pipeline management, and team workspace management.
            </p>
            <p className="mt-3">
              We reserve the right to modify, suspend, or discontinue any part of the Service
              at any time with reasonable notice where practicable.
            </p>
          </Section>

          <Divider />

          <Section title="2. Accounts and workspaces">
            <p>
              You must provide accurate and complete information when registering. You are
              responsible for maintaining the security of your account credentials and for all
              activity that occurs under your account.
            </p>
            <p className="mt-3">
              Workspace owners are responsible for managing team members they invite and for
              ensuring those members comply with these Terms. You must notify us immediately of
              any unauthorised access to your account at{' '}
              <a href="mailto:support@appalix.ai" className="text-brand-400 hover:text-brand-300">
                support@appalix.ai
              </a>.
            </p>
          </Section>

          <Divider />

          <Section title="3. Acceptable use">
            <p>You agree not to use the Service to:</p>
            <ul className="mt-3 space-y-2 list-disc list-inside text-white/65">
              <li>Send unsolicited bulk email (spam) or conduct phishing campaigns</li>
              <li>Violate any applicable law or regulation</li>
              <li>Infringe the intellectual property rights of others</li>
              <li>Transmit malware, viruses, or malicious code</li>
              <li>Attempt to gain unauthorised access to any system or data</li>
              <li>Scrape, crawl, or extract data from the platform in an automated manner without our consent</li>
              <li>Resell or sublicence the Service without our written permission</li>
              <li>Use the Service for any purpose that is harmful, fraudulent, or deceptive</li>
            </ul>
            <p className="mt-4">
              We may suspend or terminate accounts that violate these rules without prior notice.
            </p>
          </Section>

          <Divider />

          <Section title="4. Email account integration">
            <p>
              When you connect a Gmail or Microsoft Outlook account, you authorise Appalix to
              read incoming emails and send emails on your behalf solely for the purposes described
              in our{' '}
              <Link href="/privacy" className="text-brand-400 hover:text-brand-300">
                Privacy Policy
              </Link>
              . You represent that you have the right to grant this access and that doing so does
              not violate any applicable law or the terms of service of your email provider.
            </p>
            <p className="mt-3">
              You can revoke this access at any time from your email provider&apos;s account
              settings or from within the Appalix integrations page. Revoking access will stop
              email sync immediately.
            </p>
          </Section>

          <Divider />

          <Section title="5. AI-generated content">
            <p>
              The Service uses AI to generate email reply suggestions, lead scores, and other
              content. AI-generated output may contain errors or inaccuracies. You are solely
              responsible for reviewing, editing, and approving any AI-generated content before
              acting on it or sending it to third parties. We are not liable for any consequences
              arising from reliance on AI-generated output without human review.
            </p>
          </Section>

          <Divider />

          <Section title="6. Subscription, billing, and payment">
            <p>
              Access to certain features requires a paid subscription. Fees are charged in
              advance on a monthly or annual basis as selected at sign-up. All fees are
              non-refundable except where required by law.
            </p>
            <p className="mt-3">
              We reserve the right to change pricing with 30 days&apos; notice. Continued use
              of the Service after a price change constitutes acceptance of the new pricing.
              Failure to pay may result in suspension or termination of your account.
            </p>
          </Section>

          <Divider />

          <Section title="7. Intellectual property">
            <p>
              Appalix and its licensors own all rights in the Service, including software,
              design, trademarks, and documentation. These Terms do not grant you any ownership
              rights in the Service.
            </p>
            <p className="mt-3">
              You retain ownership of all content you create or upload (&quot;Your Content&quot;).
              By using the Service you grant us a limited, non-exclusive licence to store, process,
              and display Your Content solely as necessary to provide the Service to you.
            </p>
          </Section>

          <Divider />

          <Section title="8. Data and privacy">
            <p>
              Your use of the Service is subject to our{' '}
              <Link href="/privacy" className="text-brand-400 hover:text-brand-300">
                Privacy Policy
              </Link>
              , which is incorporated into these Terms by reference. By using the Service you
              consent to our collection and use of data as described in that policy.
            </p>
          </Section>

          <Divider />

          <Section title="9. Disclaimers">
            <p>
              The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any
              kind, express or implied, including warranties of merchantability, fitness for a
              particular purpose, or non-infringement.
            </p>
            <p className="mt-3">
              We do not warrant that the Service will be uninterrupted, error-free, or free
              from security vulnerabilities. Use of the Service is at your own risk.
            </p>
          </Section>

          <Divider />

          <Section title="10. Limitation of liability">
            <p>
              To the maximum extent permitted by law, Appalix shall not be liable for any
              indirect, incidental, special, consequential, or punitive damages, including
              loss of profits, data, or goodwill, arising out of or in connection with your
              use of the Service, even if we have been advised of the possibility of such damages.
            </p>
            <p className="mt-3">
              Our total liability to you for any claim arising out of or related to these Terms
              or the Service shall not exceed the total fees paid by you in the 12 months
              preceding the claim.
            </p>
          </Section>

          <Divider />

          <Section title="11. Termination">
            <p>
              You may close your account at any time by contacting us at{' '}
              <a href="mailto:support@appalix.ai" className="text-brand-400 hover:text-brand-300">
                support@appalix.ai
              </a>. Upon termination, your access to the Service will cease and your data will
              be deleted in accordance with our Privacy Policy.
            </p>
            <p className="mt-3">
              We may terminate or suspend your account immediately if you breach these Terms,
              fail to pay fees, or if we are required to do so by law.
            </p>
          </Section>

          <Divider />

          <Section title="12. Governing law">
            <p>
              These Terms are governed by the laws of Australia. Any disputes shall be subject
              to the exclusive jurisdiction of the courts of Australia, unless otherwise required
              by mandatory local law in your country of residence.
            </p>
          </Section>

          <Divider />

          <Section title="13. Changes to these Terms">
            <p>
              We may update these Terms from time to time. We will notify you of material
              changes by email or by displaying a notice in the dashboard. Continued use of
              the Service after changes take effect constitutes your acceptance of the revised Terms.
            </p>
          </Section>

          <Divider />

          <Section title="14. Contact">
            <p>For questions about these Terms:</p>
            <div className="mt-4 p-5 rounded-xl bg-white/5 border border-white/10 text-sm space-y-1">
              <p className="text-white font-semibold">Appalix</p>
              <p><a href="mailto:legal@appalix.ai" className="text-brand-400 hover:text-brand-300">legal@appalix.ai</a></p>
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
