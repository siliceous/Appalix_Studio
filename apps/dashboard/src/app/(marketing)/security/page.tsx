import Link from 'next/link'
import type { Metadata } from 'next'
import { ScrollReveal } from '@/components/marketing/animate'

export const metadata: Metadata = {
  title: 'Security & Privacy — How Appalix Protects Your Data | Appalix',
  description:
    'Appalix uses HMAC-SHA256 signatures, API key authentication, timing-safe verification, and session-based auth to keep your data and customers safe. GDPR compliant.',
  keywords: [
    'AI chatbot security',
    'GDPR compliant chatbot',
    'webhook HMAC verification',
    'API key authentication',
    'data privacy AI agent',
  ],
}

const PILLARS = [
  {
    icon: '🔑',
    title: 'API key authentication',
    body: 'Every custom API and WordPress integration is protected by a unique API key passed via a request header. Keys are generated with 40 characters of cryptographic randomness and stored server-side — never exposed in frontend code or browser responses.',
  },
  {
    icon: '🔏',
    title: 'HMAC-SHA256 signature verification',
    body: 'Inbound webhook payloads (e.g. WooCommerce) are verified against an HMAC-SHA256 signature before any processing occurs. All comparisons use timing-safe equality checks (timingSafeEqual) to eliminate timing-attack vectors.',
  },
  {
    icon: '🛡️',
    title: 'Session-based authentication',
    body: 'Every dashboard request passes through Next.js middleware that validates the user\'s JWT session via Supabase Auth. Unauthenticated requests are immediately redirected to the login page — no dashboard data is ever accessible without a valid session.',
  },
  {
    icon: '🌐',
    title: 'IP allowlisting',
    body: 'Custom API integrations support an optional IP allowlist. Requests from unlisted IP addresses are rejected before reaching your AI agent, giving you an additional layer of network-level access control.',
  },
  {
    icon: '🏢',
    title: 'Workspace isolation',
    body: 'Every resource — bots, conversations, integrations, knowledge sources — is scoped to a workspace. All database queries enforce workspace_id equality, so one account can never read or modify another\'s data.',
  },
  {
    icon: '🔒',
    title: 'Credentials never in the frontend',
    body: 'Integration secrets (Twilio credentials, Telegram bot tokens, Slack webhook URLs) are stored in encrypted JSONB columns and only accessed server-side. They are never serialised into page HTML or JavaScript bundles.',
  },
]

const GDPR = [
  'Conversation data is stored in isolated, per-workspace tables and is never shared between accounts.',
  'Users can download or permanently delete all conversation records from the dashboard at any time.',
  'We collect only the minimum data required to operate the service — no advertising profiles, no data brokering.',
  'Data is processed on infrastructure hosted in the EU / US regions with encryption in transit (TLS 1.2+) and at rest.',
  'We do not sell, share, or transfer personal data to third parties except as required to operate the service (e.g. AI model inference).',
]

export default function SecurityPage() {
  return (
    <div className="pt-24">
      {/* Hero */}
      <section className="relative py-20 px-6 text-center overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-600/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative max-w-3xl mx-auto">
          <ScrollReveal>
            <p className="text-xs text-brand-400 uppercase tracking-widest font-semibold mb-3">Security & Privacy</p>
            <h1 className="text-4xl sm:text-5xl font-bold mb-5">Built secure by default</h1>
            <p className="text-gray-400 text-lg leading-relaxed max-w-2xl mx-auto">
              Appalix uses industry-standard authentication, cryptographic verification, and strict data isolation to protect your business and your customers.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.15}>
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              <Link href="/" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
                ← Back to home
              </Link>
              <span className="text-gray-700">·</span>
              <Link href="/features" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
                View features →
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Security pillars */}
      <section className="py-16 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-14">
              <p className="text-xs text-brand-400 uppercase tracking-widest font-semibold mb-3">Authentication & access control</p>
              <h2 className="text-3xl font-bold">Multiple layers of protection</h2>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {PILLARS.map((p, i) => (
              <ScrollReveal key={p.title} delay={i * 0.07}>
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-brand-600/30 transition-colors h-full">
                  <div className="text-3xl mb-4">{p.icon}</div>
                  <h3 className="font-semibold text-white mb-2">{p.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{p.body}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* GDPR */}
      <section className="py-16 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <ScrollReveal>
            <div className="mb-10">
              <p className="text-xs text-brand-400 uppercase tracking-widest font-semibold mb-3">Data privacy</p>
              <h2 className="text-3xl font-bold mb-4">GDPR & data privacy commitments</h2>
              <p className="text-gray-400 leading-relaxed">
                We are committed to handling personal data responsibly and in compliance with applicable data protection regulations including GDPR.
              </p>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <ul className="space-y-4">
              {GDPR.map((item, i) => (
                <li key={i} className="flex gap-3">
                  <svg className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-sm text-gray-300 leading-relaxed">{item}</p>
                </li>
              ))}
            </ul>
          </ScrollReveal>
        </div>
      </section>

      {/* Best practices */}
      <section className="py-16 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <ScrollReveal>
            <div className="mb-10">
              <p className="text-xs text-brand-400 uppercase tracking-widest font-semibold mb-3">Recommendations</p>
              <h2 className="text-3xl font-bold mb-4">Security best practices for your account</h2>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {[
                { icon: '🚫', title: 'Never expose API keys in frontend code', desc: 'Your integration API keys are for server-to-server communication only. If you build a custom integration, call the Appalix API from your backend, not from browser JavaScript.' },
                { icon: '🗄️', title: 'Store credentials in environment variables', desc: 'Use .env files or your hosting provider\'s secret manager for Twilio, Telegram, and webhook credentials. Never commit secrets to version control.' },
                { icon: '🔄', title: 'Rotate keys periodically', desc: 'Regenerate your integration API keys regularly and immediately if you suspect a key has been compromised. Rotation takes effect instantly.' },
                { icon: '👁️', title: 'Monitor your conversations', desc: 'Review the Conversations dashboard regularly for unusual activity patterns. Flag any unexpected message volumes or suspicious content.' },
                { icon: '🌐', title: 'Restrict allowed origins', desc: 'For web widget integrations, set your domain(s) in the Allowed Origins field rather than leaving it open to *. This prevents your widget from being embedded on unauthorised sites.' },
                { icon: '📋', title: 'Use IP allowlisting for Custom API', desc: 'If your backend has a fixed IP or CIDR range, configure the IP allowlist on your Custom API integration to block all other sources.' },
              ].map((item) => (
                <div key={item.title} className="flex gap-4 p-5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-2xl shrink-0">{item.icon}</span>
                  <div>
                    <p className="font-semibold text-white text-sm mb-1">{item.title}</p>
                    <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Monitoring */}
      <section className="py-16 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <ScrollReveal>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-8 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
              {[
                { icon: '🔍', stat: 'Continuous', label: 'Access log monitoring' },
                { icon: '🔐', stat: 'TLS 1.2+', label: 'Encryption in transit' },
                { icon: '🏗️', stat: 'At rest', label: 'Database encryption' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="text-3xl mb-2">{item.icon}</div>
                  <p className="text-xl font-bold text-white mb-1">{item.stat}</p>
                  <p className="text-sm text-gray-400">{item.label}</p>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Contact */}
      <section className="py-20 px-6 border-t border-white/5">
        <ScrollReveal>
          <div className="max-w-2xl mx-auto text-center">
            <div className="text-3xl mb-4">📬</div>
            <h2 className="text-2xl font-bold mb-3">Found a security issue?</h2>
            <p className="text-gray-400 mb-6 text-sm leading-relaxed">
              We take security reports seriously. If you discover a vulnerability, please contact us responsibly before disclosure and we will work with you to address it promptly.
            </p>
            <a
              href="mailto:security@appalix.com"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Report a vulnerability →
            </a>
            <p className="text-xs text-gray-600 mt-4">security@appalix.com</p>
          </div>
        </ScrollReveal>
      </section>
    </div>
  )
}
