import Link from 'next/link'
import type { Metadata } from 'next'
import { ScrollReveal } from '@/components/marketing/animate'

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

const PLANS = [
  {
    name: 'Starter',
    price: '$29',
    period: '/mo',
    desc: 'Perfect for small businesses getting started with AI.',
    popular: false,
    features: [
      '1 AI agent',
      '500 conversations / month',
      '2 platform integrations',
      'Lead capture',
      'Email magic link login',
      'Basic analytics',
      'Email support',
    ],
    cta: 'Start free trial',
  },
  {
    name: 'Core',
    price: '$39',
    period: '/mo',
    desc: 'More bots and integrations for growing teams.',
    popular: false,
    features: [
      '3 AI agents',
      '1,500 conversations / month',
      '5 platform integrations',
      'Lead capture',
      'Human handoff',
      'Basic analytics',
      'Email support',
    ],
    cta: 'Start free trial',
  },
  {
    name: 'Pro',
    price: '$79',
    period: '/mo',
    desc: 'The complete toolkit for high-growth teams.',
    popular: true,
    features: [
      '10 AI agents',
      '5,000 conversations / month',
      'All platform integrations',
      'Lead capture & CRM export',
      'Human handoff',
      'AI task automation',
      'Advanced analytics',
      'Custom branding',
      'API access',
      'Priority support',
    ],
    cta: 'Start free trial',
  },
  {
    name: 'Scale',
    price: '$249',
    period: '/mo',
    desc: 'High-volume operations with white-label options.',
    popular: false,
    features: [
      'Unlimited AI agents',
      '25,000 conversations / month',
      'All platform integrations',
      'Lead capture & CRM export',
      'Human handoff',
      'AI task automation',
      'Advanced analytics',
      'White-label branding',
      'API access',
      'Dedicated account manager',
    ],
    cta: 'Start free trial',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'Tailored for large organisations with specific needs.',
    popular: false,
    features: [
      'Unlimited everything',
      'SSO / SAML login',
      'Custom integrations',
      'Dedicated infrastructure',
      'SLA guarantees',
      'Security review',
      'On-boarding support',
      '24/7 dedicated support',
    ],
    cta: 'Contact us',
  },
]

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

      {/* Pricing cards */}
      <section className="py-12 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {PLANS.map((plan, i) => (
            <ScrollReveal key={plan.name} delay={i * 0.07}>
              <div
                className={`relative flex flex-col rounded-2xl p-6 border transition-colors h-full ${
                  plan.popular
                    ? 'bg-brand-600/10 border-brand-600/50 shadow-lg shadow-brand-600/10'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="text-xs font-semibold bg-brand-600 text-white px-3 py-1 rounded-full">Most Popular</span>
                  </div>
                )}

                <div className="mb-5">
                  <h3 className={`font-bold text-lg mb-1 ${plan.popular ? 'text-brand-300' : 'text-white'}`}>
                    {plan.name}
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{plan.desc}</p>
                </div>

                <div className="mb-6">
                  <span className="text-3xl font-black text-white">{plan.price}</span>
                  <span className="text-gray-500 text-sm">{plan.period}</span>
                </div>

                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <svg className={`w-4 h-4 mt-0.5 shrink-0 ${plan.popular ? 'text-brand-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-400">{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/login"
                  className={`block text-center text-sm font-medium py-2.5 rounded-xl transition-colors ${
                    plan.popular
                      ? 'bg-[#3873BB] hover:bg-[#1a4073] text-white'
                      : 'border border-white/20 hover:border-white/40 text-gray-300 hover:text-white'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            </ScrollReveal>
          ))}
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
          <Link
            href="mailto:sales@appalix.ai"
            className="inline-flex items-center gap-2 px-6 py-3 border border-white/20 hover:border-white/40 text-gray-300 hover:text-white font-medium rounded-xl transition-colors text-sm"
          >
            Contact Enterprise sales
          </Link>
        </ScrollReveal>
      </section>
    </div>
  )
}
