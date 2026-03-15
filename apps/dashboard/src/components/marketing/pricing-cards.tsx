'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ContactSalesButton } from '@/components/marketing/contact-sales-button'

const EXTRA_BOT     = { annual: 19, monthly: 29 }
const EXTRA_STORAGE = { annual: 5,  monthly: 7  }   // per 10 GB block

const PLANS = [
  {
    key: 'individual',
    name: 'Individual',
    annualPrice: 49,
    monthlyPrice: 69,
    desc: 'Perfect for solo operators and freelancers.',
    popular: false,
    seats: 1,
    bots: 1,
    conversations: '5,000',
    storage: '2 GB',
    extraSeats: 'Up to 2 extra seats',
    extraBots: true,
    features: [
      '1 seat included',
      '1 AI bot',
      '5,000 messages / month',
      '2 GB storage',
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
    storage: '10 GB',
    extraSeats: 'Up to 6 extra seats',
    extraBots: true,
    features: [
      '3 seats included',
      '3 AI bots',
      '15,000 messages / month',
      '10 GB storage',
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
    storage: '30 GB',
    extraSeats: 'Unlimited extra seats',
    extraBots: true,
    features: [
      '10 seats included',
      '10 AI bots',
      '50,000 messages / month',
      '30 GB storage',
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

const TIERED_PLANS  = PLANS.filter(p => p.key !== 'enterprise')
const ENTERPRISE    = PLANS.find(p => p.key === 'enterprise')!

export function PricingCards() {
  const [isAnnual, setIsAnnual] = useState(true)

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

      {/* ── 3 plan cards ── */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
        {TIERED_PLANS.map((plan) => {
          const price = isAnnual ? plan.annualPrice : plan.monthlyPrice
          return (
            <div
              key={plan.key}
              className={`relative flex flex-col rounded-2xl p-6 border transition-colors h-full ${
                plan.popular
                  ? 'bg-brand-600/10 border-brand-600/50 shadow-lg shadow-brand-600/10'
                  : 'bg-white/5 border-white/10 hover:border-white/20'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="text-xs font-semibold bg-brand-600 text-white px-3 py-1 rounded-full whitespace-nowrap">
                    Most Popular
                  </span>
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
                <span className="text-3xl font-black text-white">${price}</span>
                <span className="text-gray-500 text-sm">/mo</span>
                {isAnnual && price !== null && (
                  <p className="text-xs text-gray-400 mt-0.5">Billed ${price * 12}/year</p>
                )}
              </div>

              {/* Seat / bot / conversation stats */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/8 text-gray-300 border border-white/10">
                  {plan.seats} seat{plan.seats !== 1 ? 's' : ''}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/8 text-gray-300 border border-white/10">
                  {plan.bots !== null ? `${plan.bots} bot${plan.bots !== 1 ? 's' : ''}` : 'Unlimited bots'}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/8 text-gray-300 border border-white/10">
                  {plan.conversations} msg/mo
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/8 text-gray-300 border border-white/10">
                  {plan.storage} storage
                </span>
              </div>

              {/* Extra seat + bot + overage notes */}
              <div className="flex flex-col gap-0.5 mb-4">
                {plan.extraSeats && (
                  <p className="text-[11px] text-[#15A4AE]">
                    + {plan.extraSeats} at ${isAnnual ? EXTRA_SEAT.annual : EXTRA_SEAT.monthly}/seat/mo
                  </p>
                )}
                {plan.extraBots && (
                  <p className="text-[11px] text-[#15A4AE]">
                    + Extra bots at ${isAnnual ? EXTRA_BOT.annual : EXTRA_BOT.monthly}/bot/mo
                  </p>
                )}
                <p className="text-[11px] text-[#15A4AE]">
                  + Extra storage at ${isAnnual ? EXTRA_STORAGE.annual : EXTRA_STORAGE.monthly}/10 GB/mo
                </p>
                <p className="text-[11px] text-gray-500">
                  $10 per 1,000 extra conversations
                </p>
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-8 flex-1">
                {plan.features.map((f) =>
                  f === 'Sage AI CRM assistant' ? (
                    <li key={f}>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#15A4AE]/10 border border-[#15A4AE]/30 text-[#15A4AE] text-xs font-semibold">
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
            </div>
          )
        })}
      </div>

      {/* ── Enterprise star entry ── */}
      <div className="max-w-5xl mx-auto mt-4">
        <div className="relative flex flex-col sm:flex-row items-center gap-6 rounded-2xl px-8 py-6 border border-white/10 bg-gradient-to-r from-white/[0.04] via-white/[0.07] to-white/[0.04] hover:border-white/20 transition-colors overflow-hidden">
          {/* Subtle star glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-64 h-24 bg-amber-400/5 rounded-full blur-2xl" />
          </div>

          {/* Star badge */}
          <div className="shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-amber-400/10 border border-amber-400/20">
            <span className="text-amber-400 text-xl">★</span>
          </div>

          {/* Text block */}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <h3 className="font-bold text-lg text-white">Enterprise</h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400">
                Custom
              </span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed max-w-xl">
              Unlimited seats, bots &amp; conversations · SSO / SAML · Dedicated infrastructure · SLA guarantees · Custom integrations · 24/7 support.
              Available exclusively through consultation with the Appalix team.
            </p>
          </div>

          {/* CTA */}
          <div className="shrink-0">
            <ContactSalesButton
              label={ENTERPRISE.cta}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-xl border border-amber-400/30 text-amber-400 hover:bg-amber-400/10 transition-colors whitespace-nowrap"
            />
          </div>
        </div>
      </div>

      {/* Add-on footnote */}
      <p className="text-center text-xs text-gray-500 mt-6">
        Extra seats: ${EXTRA_SEAT.annual}/seat/mo annual · ${EXTRA_SEAT.monthly}/seat/mo monthly.{' '}
        Extra bots: ${EXTRA_BOT.annual}/bot/mo annual · ${EXTRA_BOT.monthly}/bot/mo monthly.
      </p>
    </section>
  )
}
