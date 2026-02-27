'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ContactSalesButton } from '@/components/marketing/contact-sales-button'

const PLANS = [
  {
    name: 'Starter',
    annualPrice: 29,
    monthlyPrice: 45,
    desc: 'Perfect for small businesses getting started with AI.',
    popular: false,
    features: [
      '1 AI agent',
      '2,000 conversations / month',
      '2 platform integrations',
      'Lead capture',
      'Email magic link login',
      'Basic analytics',
      'Email support',
    ],
    cta: 'Start a 7 Day Free Trial',
  },
  {
    name: 'Core',
    annualPrice: 39,
    monthlyPrice: 59,
    desc: 'More bots and integrations for growing teams.',
    popular: false,
    features: [
      '2 AI agents',
      '5,000 conversations / month',
      '5 platform integrations',
      'Lead capture',
      'Human handoff',
      'Basic analytics',
      'Email support',
    ],
    cta: 'Start a 7 Day Free Trial',
  },
  {
    name: 'Pro',
    annualPrice: 79,
    monthlyPrice: 119,
    desc: 'The complete toolkit for high-growth teams.',
    popular: true,
    features: [
      '5 AI agents',
      '12,000 conversations / month',
      '150 agent runs / month',
      'All platform integrations',
      'Sage AI assistant',
      'Lead capture & CRM export',
      'Human handoff',
      'AI task automation',
      'Advanced analytics',
      'Custom branding',
      'API access',
      'Priority support',
    ],
    cta: 'Start a 7 Day Free Trial',
  },
  {
    name: 'Scale',
    annualPrice: 299,
    monthlyPrice: 469,
    desc: 'High-volume operations with white-label options.',
    popular: false,
    features: [
      '10 AI agents',
      '50,000 conversations / month',
      '500 agent runs / month',
      'All platform integrations',
      'Sage AI assistant',
      'Lead capture & CRM export',
      'Human handoff',
      'AI task automation',
      'Advanced analytics',
      'White-label branding',
      'API access',
      'Dedicated account manager',
    ],
    cta: 'Start a 7 Day Free Trial',
  },
  {
    name: 'Enterprise',
    annualPrice: null,
    monthlyPrice: null,
    desc: 'Tailored for large organisations with specific needs.',
    popular: false,
    features: [
      'Unlimited everything',
      'Sage AI assistant',
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

export function PricingCards() {
  const [isAnnual, setIsAnnual] = useState(true)
  const [enterpriseTooltip, setEnterpriseTooltip] = useState(false)

  return (
    <section className="py-12 px-6">
      {/* Billing toggle */}
      <div className="flex flex-col items-center gap-2 mb-10">
        <div className="flex items-center gap-3">
          <span className={`text-sm font-medium transition-colors ${!isAnnual ? 'text-white' : 'text-gray-500'}`}>
            Monthly
          </span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            aria-label="Toggle billing period"
            className={`relative w-12 h-6 rounded-full transition-colors ${isAnnual ? 'bg-brand-600' : 'bg-gray-600'}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                isAnnual ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
          <span className={`text-sm font-medium transition-colors ${isAnnual ? 'text-white' : 'text-gray-500'}`}>
            Annual
          </span>
          <span className="text-xs bg-green-500/20 text-green-400 px-2.5 py-1 rounded-full font-semibold">
            Save ~35%
          </span>
        </div>
        {!isAnnual && (
          <p className="text-xs text-gray-500">
            Switch to annual billing and save <span className="text-green-400 font-semibold">~35% on average</span>
          </p>
        )}
      </div>

      {/* Cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {PLANS.map((plan) => {
          const price = isAnnual ? plan.annualPrice : plan.monthlyPrice
          const isEnterprise = plan.name === 'Enterprise'

          return (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl p-6 border transition-colors h-full ${
                plan.popular
                  ? 'bg-brand-600/10 border-brand-600/50 shadow-lg shadow-brand-600/10'
                  : 'bg-white/5 border-white/10 hover:border-white/20'
              }`}
              onMouseEnter={() => isEnterprise && setEnterpriseTooltip(true)}
              onMouseLeave={() => isEnterprise && setEnterpriseTooltip(false)}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="text-xs font-semibold bg-brand-600 text-white px-3 py-1 rounded-full whitespace-nowrap">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Enterprise tooltip */}
              {isEnterprise && enterpriseTooltip && (
                <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-56 z-10">
                  <div className="bg-gray-900 border border-white/10 text-xs text-gray-300 leading-relaxed px-3 py-2 rounded-xl shadow-xl text-center">
                    Get in touch with your requirements for our customised enterprise plan.
                  </div>
                  <div className="w-2.5 h-2.5 bg-gray-900 border-b border-r border-white/10 rotate-45 mx-auto -mt-1.5" />
                </div>
              )}

              <div className="mb-5">
                <h3 className={`font-bold text-lg mb-1 ${plan.popular ? 'text-brand-300' : 'text-white'}`}>
                  {plan.name}
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">{plan.desc}</p>
              </div>

              <div className="mb-6">
                {price !== null ? (
                  <>
                    <span className="text-3xl font-black text-white">${price}</span>
                    <span className="text-gray-500 text-sm">/mo</span>
                    {isAnnual && (
                      <p className="text-xs text-gray-600 mt-1">Billed ${price * 12}/year</p>
                    )}
                  </>
                ) : (
                  <span className="text-3xl font-black text-white">Custom</span>
                )}
              </div>

              <ul className="space-y-2.5 mb-8 flex-1">
                {plan.features.map((f) =>
                  f === 'Sage AI assistant' ? (
                    <li key={f}>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#61c2ad]/10 border border-[#61c2ad]/30 text-[#61c2ad] text-xs font-semibold">
                        <span className="text-[10px]">✦</span>
                        Sage AI assistant
                      </span>
                    </li>
                  ) : (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <svg
                        className={`w-4 h-4 mt-0.5 shrink-0 ${plan.popular ? 'text-brand-400' : 'text-gray-500'}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-400">{f}</span>
                    </li>
                  )
                )}
              </ul>

              {isEnterprise ? (
                <ContactSalesButton
                  label={plan.cta}
                  className="block w-full text-center text-sm font-medium py-2.5 rounded-xl transition-colors border border-white/20 hover:border-white/40 text-gray-300 hover:text-white"
                />
              ) : (
                <Link
                  href="/login"
                  className={`block text-center text-sm font-medium py-2.5 rounded-xl transition-colors ${
                    plan.popular
                      ? 'bg-[#1a8c76] hover:bg-[#14705d] text-white'
                      : 'border border-white/20 hover:border-white/40 text-gray-300 hover:text-white'
                  }`}
                >
                  {plan.cta}
                </Link>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
