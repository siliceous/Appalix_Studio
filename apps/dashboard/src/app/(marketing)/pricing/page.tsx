import Link from 'next/link'
import type { Metadata } from 'next'
import { ScrollReveal } from '@/components/marketing/animate'
import { PricingCards, BillingProvider, BillingToggle } from '@/components/marketing/pricing-cards'
import { TopupCards } from '@/components/marketing/topup-cards'
import { EnrichmentCards } from '@/components/marketing/enrichment-cards'
import { ContactSalesButton } from '@/components/marketing/contact-sales-button'

export const metadata: Metadata = {
  title: 'Pricing — Plans from $29/mo | Save 35% Annual | Appalix',
  description:
    'Starter $29, Core $39, Pro $79, Scale $299/mo on annual. Save ~35% with annual billing. 14-day free trial on all plans, no credit card required.',
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
    a: 'Every plan includes a 14-day free trial with no credit card required. You get access to all features on your chosen plan.',
  },
  {
    q: 'What counts as a conversation?',
    a: 'A conversation is a unique interaction thread — one user chatting with your agent counts as one conversation, regardless of the number of messages exchanged.',
  },
]

export default function PricingPage() {
  return (
    <BillingProvider>
    <div className="pt-24">
      {/* Hero */}
      <section className="relative py-20 px-6 text-center overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-600/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative max-w-3xl mx-auto">
          <ScrollReveal>
            <p className="text-xs text-brand-400 uppercase tracking-widest font-semibold mb-3">Pricing</p>
            <h1 className="text-4xl sm:text-5xl font-bold mb-5">Simple, transparent pricing</h1>
            <p className="text-white/65 text-lg">
              14-day free trial on all plans. No credit card required. Cancel any time.
            </p>
            <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20">
              <span className="text-green-400 text-sm font-semibold">Save about 35% when you choose annual billing</span>
            </div>
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

      <div className="flex justify-center pb-8">
        <BillingToggle />
      </div>

      <PricingCards />

      {/* Top-ups */}
      <section className="py-16 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-10">
              <p className="text-xs text-brand-400 uppercase tracking-widest font-semibold mb-3">Top-ups</p>
              <h2 className="text-2xl font-bold mb-3">Need a little more?</h2>
              <p className="text-white/65 text-sm">One-time top-ups — no subscription change required. Credits are added instantly to your workspace.</p>
            </div>
          </ScrollReveal>
          <TopupCards />
          <ScrollReveal delay={0.15}>
            <p className="text-xs text-gray-600 text-center mt-5">Top-ups are available on all paid plans. Credits do not roll over to the next billing period.</p>
          </ScrollReveal>
        </div>
      </section>

      {/* Lead Enrichment Credits */}
      <section className="py-16 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-10">
              <p className="text-xs text-brand-400 uppercase tracking-widest font-semibold mb-3">Lead Enrichment</p>
              <h2 className="text-2xl font-bold mb-3">Enrich &amp; qualify your leads</h2>
              <p className="text-white/65 text-sm">One-time credit packs for Sage lead enrichment. Enrich, score, and qualify prospects — credits never expire.</p>
            </div>
          </ScrollReveal>
          <EnrichmentCards />
          <ScrollReveal delay={0.15}>
            <p className="text-xs text-gray-600 text-center mt-5">Enrichment credits are available on Pro plan and above. Credits never expire and do not roll over.</p>
          </ScrollReveal>
        </div>
      </section>

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
                  <p className="text-sm text-white/65 leading-relaxed">{faq.a}</p>
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
          <p className="text-white/65 mb-6 text-sm">Talk to us about custom volume, SSO, dedicated infrastructure, and SLAs.</p>
          <ContactSalesButton />
        </ScrollReveal>
      </section>
    </div>
    </BillingProvider>
  )
}
