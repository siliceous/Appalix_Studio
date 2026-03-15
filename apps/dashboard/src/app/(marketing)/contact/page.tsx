import type { Metadata } from 'next'
import { ScrollReveal } from '@/components/marketing/animate'
import { ContactForm } from '@/components/marketing/contact-form'

export const metadata: Metadata = {
  title: 'Contact Us — Appalix',
  description:
    'Get in touch with the Appalix team. Questions about pricing, integrations, security, or anything else — we respond within one business day.',
}

const CONTACT_CARDS = [
  {
    emoji: '💼',
    title: 'Sales & pricing',
    desc: 'Questions about plans, custom pricing, onboarding, or a live demo — our sales team is here to help.',
    email: 'sales@appalix.ai',
    color: 'bg-brand-600/10 border-brand-600/20',
    labelColor: 'text-brand-400',
  },
  {
    emoji: '🔒',
    title: 'Security & privacy',
    desc: 'Vulnerability disclosures, data privacy requests, compliance questions, or security partnership inquiries.',
    email: 'security@appalix.ai',
    color: 'bg-[#3873BB]/10 border-[#3873BB]/20',
    labelColor: 'text-[#6ea0d8]',
  },
  {
    emoji: '💬',
    title: 'General inquiries',
    desc: 'Anything else — partnerships, press, product feedback, or just saying hello.',
    email: 'sales@appalix.ai',
    color: 'bg-[#15A4AE]/10 border-[#15A4AE]/20',
    labelColor: 'text-[#15A4AE]',
  },
]

const FAQS = [
  {
    q: 'How quickly will you respond?',
    a: 'We respond to all inquiries within one business day. Sales inquiries typically receive a response within a few hours.',
  },
  {
    q: 'Can I book a live demo?',
    a: "Absolutely. Select \"Sales\" as your inquiry type and mention you'd like a demo — we'll send you a calendar link.",
  },
  {
    q: 'I have a technical issue with my account.',
    a: 'For account support, log in to your Appalix dashboard and use the in-app support chat for the fastest response.',
  },
  {
    q: 'Are you GDPR / SOC 2 compliant?',
    a: 'Yes. Visit our Security page for the full breakdown, or reach out to security@appalix.ai for compliance documentation.',
  },
]

export default function ContactPage() {
  return (
    <div className="pt-24">

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative py-20 px-6 text-center overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-600/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative max-w-3xl mx-auto">
          <ScrollReveal>
            <p className="text-xs text-brand-400 uppercase tracking-widest font-semibold mb-3">Contact</p>
            <h1 className="text-4xl sm:text-5xl font-bold mb-5 leading-tight">
              Let&apos;s talk
            </h1>
            <p className="text-gray-400 text-lg leading-relaxed max-w-xl mx-auto">
              Whether you're exploring Appalix for the first time or need help with an existing account,
              our team is ready to help.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Contact type cards ───────────────────────────────────── */}
      <section className="px-6 pb-16">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
          {CONTACT_CARDS.map((card, i) => (
            <ScrollReveal key={card.title} delay={i * 0.1}>
              <div className={`rounded-2xl border p-5 h-full flex flex-col gap-3 ${card.color}`}>
                <span className="text-2xl">{card.emoji}</span>
                <div>
                  <p className="font-semibold text-white mb-1">{card.title}</p>
                  <p className="text-sm text-gray-400 leading-relaxed">{card.desc}</p>
                </div>
                <a
                  href={`mailto:${card.email}`}
                  className={`mt-auto text-sm font-medium ${card.labelColor} hover:underline`}
                >
                  {card.email}
                </a>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ── Form + FAQ ───────────────────────────────────────────── */}
      <section className="px-6 pb-24 border-t border-white/5">
        <div className="max-w-5xl mx-auto pt-16 grid grid-cols-1 lg:grid-cols-5 gap-12">

          {/* Form */}
          <div className="lg:col-span-3">
            <ScrollReveal>
              <h2 className="text-2xl font-bold mb-2">Send us a message</h2>
              <p className="text-gray-400 text-sm mb-8">
                Fill in the form and we&apos;ll route your message to the right team automatically.
              </p>
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
                <ContactForm />
              </div>
            </ScrollReveal>
          </div>

          {/* FAQ */}
          <div className="lg:col-span-2">
            <ScrollReveal delay={0.1}>
              <h2 className="text-2xl font-bold mb-8">Common questions</h2>
              <div className="space-y-6">
                {FAQS.map((faq) => (
                  <div key={faq.q} className="border-b border-white/5 pb-6 last:border-0 last:pb-0">
                    <p className="font-medium text-white mb-2">{faq.q}</p>
                    <p className="text-sm text-gray-400 leading-relaxed">{faq.a}</p>
                  </div>
                ))}
              </div>

              {/* Response time badge */}
              <div className="mt-10 flex items-start gap-3 p-4 rounded-xl bg-[#15A4AE]/[0.07] border border-[#15A4AE]/20">
                <span className="text-[#15A4AE] text-lg mt-0.5">⏱</span>
                <div>
                  <p className="text-sm font-semibold text-[#15A4AE]">Fast response times</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    Sales inquiries are answered within a few hours.
                    All other messages within one business day.
                  </p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

    </div>
  )
}
