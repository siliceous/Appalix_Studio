import Link from 'next/link'
import type { Metadata } from 'next'
import { ScrollReveal } from '@/components/marketing/animate'
import { PricingCards } from '@/components/marketing/pricing-cards'

export const metadata: Metadata = {
  title: 'Pricing — Plans from $29/mo | No Credit Card Required | Appalix',
  description:
    'Starter $29, Core $39, Pro $79, Scale $249. 7-day free trial on all plans, no credit card required. Scale your AI sales agent as you grow.',
  keywords: [
    'AI chatbot pricing',
    'chatbot SaaS plans',
    'affordable AI agent',
    'AI sales agent cost',
    'chatbot monthly plan',
  ],
}


const FAQS = [
  {
    q: 'Can I change plans at any time?',
    a: 'Yes — upgrade or downgrade instantly from your workspace settings. Charges are prorated automatically.',
  },
  {
    q: 'What happens when I hit my conversation limit?',
    a: 'Your agent continues responding but you\'ll be notified and invited to upgrade. We never cut off your users mid-conversation.',
  },
  {
    q: 'Is there a free trial?',
    a: 'Every plan includes a 7-day free trial with no credit card required. You get access to all features on your chosen plan.',
  },
  {
    q: 'What counts as a conversation?',
    a: 'A conversation is a unique interaction thread — one user chatting with your agent counts as one conversation, regardless of the number of messages exchanged.',
  },
]

export default function PricingPage() {
  return (
    <div className="pt-24">
      {/* Hero */}
      <section className="relative py-20 px-6 text-center overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-600/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative max-w-3xl mx-auto">
          <ScrollReveal>
            <p className="text-xs text-brand-400 uppercase tracking-widest font-semibold mb-3">Pricing</p>
            <h1 className="text-4xl sm:text-5xl font-bold mb-5">Simple, transparent pricing</h1>
            <p className="text-gray-400 text-lg">
              7-day free trial on all plans. No credit card required. Cancel any time.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.15}>
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              <Link href="/features" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
                Compare features →
              </Link>
              <span className="text-gray-700">·</span>
              <Link href="/platforms" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
                View integrations →
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <PricingCards />

      {/* FAQ */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <ScrollReveal>
            <h2 className="text-2xl font-bold text-center mb-12">Frequently asked questions</h2>
          </ScrollReveal>
          <div className="space-y-6">
            {FAQS.map((faq, i) => (
              <ScrollReveal key={faq.q} delay={i * 0.07}>
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                  <h3 className="font-semibold mb-2">{faq.q}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{faq.a}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Enterprise CTA */}
      <section className="py-16 px-6 border-t border-white/5 text-center">
        <ScrollReveal>
          <h2 className="text-xl font-bold mb-3">Need something bigger?</h2>
          <p className="text-gray-400 mb-6 text-sm">Talk to us about custom volume, SSO, dedicated infrastructure, and SLAs.</p>
          <a
            href="mailto:sales@appalix.ai?subject=Enterprise%20Plan%20Enquiry&body=Hi%2C%0A%0AI%27m%20interested%20in%20the%20Enterprise%20plan%20for%20Appalix.%20Please%20get%20in%20touch%20to%20discuss%20our%20requirements.%0A%0AThanks"
            className="inline-flex items-center gap-2 px-6 py-3 border border-white/20 hover:border-white/40 text-gray-300 hover:text-white font-medium rounded-xl transition-colors text-sm"
          >
            Contact Enterprise sales
          </a>
          <p className="text-xs text-gray-600 mt-3">
            Or email us directly at{' '}
            <a href="mailto:sales@appalix.ai" className="text-gray-400 hover:text-white transition-colors underline underline-offset-2">
              sales@appalix.ai
            </a>
          </p>
        </ScrollReveal>
      </section>
    </div>
  )
}
