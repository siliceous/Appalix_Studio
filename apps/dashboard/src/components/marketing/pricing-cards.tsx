'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ContactSalesButton } from '@/components/marketing/contact-sales-button'

const EXTRA_BOT  = { annual: 19, monthly: 29 }

const PLANS = [
  {
    key: 'individual',
    name: 'Individual',
    annualPrice: 29,
    monthlyPrice: 49,
    desc: 'Perfect for solo operators and freelancers.',
    popular: false,
    seats: 1,
    bots: 1,
    conversations: '5,000',
    extraSeats: 'Unlimited extra seats',
    extraBots: true,
    features: [
      '1 seat included',
      '1 AI bot',
      '5,000 conversations / month',
      'Sage AI CRM assistant',
      'Lead capture & pipeline',
      'Email & form integration',
      'Basic analytics',
      'Email support',
    ],
    cta: 'Start Free Trial',
  },
  {
    key: 'pro',
    name: 'Pro',
    annualPrice: 99,
    monthlyPrice: 149,
    desc: 'For growing teams that need more power and collaboration.',
    popular: true,
    seats: 3,
    bots: 3,
    conversations: '15,000',
    extraSeats: 'Up to 6 extra seats',
    extraBots: true,
    features: [
      '3 seats included',
      '3 AI bots',
      '15,000 conversations / month',
      'Sage AI CRM assistant',
      'Lead capture & pipeline',
      'All platform integrations',
      'Human handoff',
      'AI task automation',
      'Advanced analytics',
      'API access',
      'Priority support',
    ],
    cta: 'Start Free Trial',
  },
  {
    key: 'team',
    name: 'Team',
    annualPrice: 299,
    monthlyPrice: 469,
    desc: 'High-volume operations for larger teams.',
    popular: false,
    seats: 10,
    bots: 10,
    conversations: '50,000',
    extraSeats: 'Up to 10 extra seats',
    extraBots: true,
    features: [
      '10 seats included',
      '10 AI bots',
      '50,000 conversations / month',
      'Sage AI CRM assistant',
      'All platform integrations',
      'Human handoff',
      'AI task automation',
      'Advanced analytics',
      'White-label branding',
      'API access',
      'Dedicated account manager',
    ],
    cta: 'Start Free Trial',
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    annualPrice: null,
    monthlyPrice: null,
    desc: 'Custom solution built around your organisation\'s needs.',
    popular: false,
    seats: null,
    bots: null,
    conversations: 'Unlimited',
    extraSeats: null,
    extraBots: false,
    features: [
      'Unlimited seats & bots',
      'Unlimited conversations',
      'Sage AI CRM assistant',
      'SSO / SAML login',
      'Custom integrations',
      'Dedicated infrastructure',
      'SLA guarantees',
      'Security review',
      'On-boarding support',
      '24/7 dedicated support',
    ],
    cta: 'Talk to us',
  },
]

const EXTRA_SEAT = { annual: 29, monthly: 45 }

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
            Save up to 35%
          </span>
        </div>
        {!isAnnual && (
          <p className="text-xs text-gray-500">
            Switch to annual billing and save <span className="text-green-400 font-semibold">up to 35%</span>
          </p>
        )}
      </div>

      {/* Cards */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS.map((plan) => {
          const price = isAnnual ? plan.annualPrice : plan.monthlyPrice
          const isEnterprise = plan.key === 'enterprise'

          return (
            <div
              key={plan.key}
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
                    Contact us to discuss your requirements for a tailored enterprise plan.
                  </div>
                  <div className="w-2.5 h-2.5 bg-gray-900 border-b border-r border-white/10 rotate-45 mx-auto -mt-1.5" />
                </div>
              )}

              {/* Plan name + desc */}
              <div className="mb-4">
                <h3 className={`font-bold text-lg mb-1 ${plan.popular ? 'text-brand-300' : 'text-white'}`}>
                  {plan.name}
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">{plan.desc}</p>
              </div>

              {/* Price */}
              <div className="mb-4">
                {price !== null ? (
                  <>
                    <span className="text-3xl font-black text-white">${price}</span>
                    <span className="text-gray-500 text-sm">/mo</span>
                    {isAnnual && (
                      <p className="text-xs text-gray-400 mt-0.5">Billed ${price * 12}/year</p>
                    )}
                  </>
                ) : (
                  <span className="text-3xl font-black text-white">Custom</span>
                )}
              </div>

              {/* Seat / bot / conversation stats */}
              {!isEnterprise && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/8 text-gray-300 border border-white/10">
                    {plan.seats} seat{plan.seats !== 1 ? 's' : ''}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/8 text-gray-300 border border-white/10">
                    {plan.bots !== null ? `${plan.bots} bot${plan.bots !== 1 ? 's' : ''}` : 'Unlimited bots'}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/8 text-gray-300 border border-white/10">
                    {plan.conversations} conv/mo
                  </span>
                </div>
              )}

              {/* Extra seat + extra bot notes */}
              {(plan.extraSeats || plan.extraBots) && (
                <div className="flex flex-col gap-0.5 mb-4">
                  {plan.extraSeats && (
                    <p className="text-[11px] text-[#61c2ad]">
                      + {plan.extraSeats} at ${isAnnual ? EXTRA_SEAT.annual : EXTRA_SEAT.monthly}/seat/mo
                    </p>
                  )}
                  {plan.extraBots && (
                    <p className="text-[11px] text-[#61c2ad]">
                      + Extra bots at ${isAnnual ? EXTRA_BOT.annual : EXTRA_BOT.monthly}/bot/mo
                    </p>
                  )}
                </div>
              )}

              {/* Features */}
              <ul className="space-y-2 mb-8 flex-1">
                {plan.features.map((f) =>
                  f === 'Sage AI CRM assistant' ? (
                    <li key={f}>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#61c2ad]/10 border border-[#61c2ad]/30 text-[#61c2ad] text-xs font-semibold">
                        <span className="text-[10px]">✦</span>
                        Sage AI CRM assistant
                      </span>
                    </li>
                  ) : (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <svg
                        className={`w-4 h-4 mt-0.5 shrink-0 ${plan.popular ? 'text-brand-400' : 'text-gray-500'}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-400">{f}</span>
                    </li>
                  )
                )}
              </ul>

              {/* CTA */}
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

      {/* Extra seat footnote */}
      <p className="text-center text-xs text-gray-500 mt-6">
        Extra seats: ${EXTRA_SEAT.annual}/seat/mo annual · ${EXTRA_SEAT.monthly}/seat/mo monthly.{' '}
        Extra bots: ${EXTRA_BOT.annual}/bot/mo annual · ${EXTRA_BOT.monthly}/bot/mo monthly.{' '}
        Enterprise plans by consultation with the Appalix team only.
      </p>
    </section>
  )
}
