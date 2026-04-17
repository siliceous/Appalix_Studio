'use client'

import { useState } from 'react'

const PLANS = [
  {
    id:           'individual',
    name:         'Individual',
    annualPrice:  49,
    monthlyPrice: 69,
    description:  'Perfect for solo operators and freelancers.',
    badge:        null as string | null,
    seats:        1,
    bots:         1,
    conversations:'5,000',
    features: [
      '1 seat · 1 bot',
      '5,000 conversations / month',
      '2 GB storage',
      'Sage AI CRM assistant',
      'Lead capture & pipeline',
      'Basic analytics',
      'Email support',
    ],
  },
  {
    id:           'pro',
    name:         'Pro',
    annualPrice:  99,
    monthlyPrice: 149,
    description:  'More power, more bots, more success.',
    badge:        'Popular' as string | null,
    seats:        3,
    bots:         3,
    conversations:'15,000',
    features: [
      '3 seats · 3 bots',
      '15,000 conversations / month',
      '10 GB storage',
      'Sage AI CRM assistant',
      'All platform integrations',
      'Human handoff',
      'AI task automation',
      'Advanced analytics',
      'API access',
      'Priority support',
    ],
  },
  {
    id:           'edge',
    name:         'Edge',
    annualPrice:  149,
    monthlyPrice: 229,
    description:  'Scale your sales ops with more channels and automation.',
    badge:        'Most Popular' as string | null,
    seats:        5,
    bots:         5,
    conversations:'25,000',
    features: [
      '5 seats · 5 bots',
      '25,000 conversations / month',
      '15 GB storage',
      'Sage AI CRM assistant',
      'All platform integrations',
      'Human handoff',
      'AI task automation',
      'Advanced analytics',
      'Custom API',
      'Priority support',
    ],
  },
  {
    id:           'team',
    name:         'Team',
    annualPrice:  299,
    monthlyPrice: 469,
    description:  'High-end analytics and project management for serious teams.',
    badge:        null as string | null,
    seats:        10,
    bots:         10,
    conversations:'50,000',
    features: [
      '10 seats · 10 bots',
      '50,000 conversations / month',
      '30 GB storage',
      'Sage AI CRM assistant',
      'All platform integrations',
      'Human handoff',
      'AI task automation',
      'High-end analytics & reporting',
      'Post-deal project management',
      'White-label branding',
      'Dedicated account manager',
    ],
  },
]

const PLAN_ORDER = ['starter', 'individual', 'pro', 'edge', 'team', 'enterprise']

interface Props {
  currentPlan:     string
  hasSubscription: boolean
}

export function UpgradePlanCards({ currentPlan, hasSubscription }: Props) {
  const [loading,  setLoading]  = useState<string | null>(null)
  const [error,    setError]    = useState<string | null>(null)
  const [isAnnual, setIsAnnual] = useState(true)

  const currentIndex = PLAN_ORDER.indexOf(currentPlan)

  async function handleUpgrade(planId: string) {
    setLoading(planId)
    setError(null)
    try {
      const res  = await fetch('/api/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ plan: planId, billing: isAnnual ? 'annual' : 'monthly' }),
      })
      const data = await res.json() as { url?: string; error?: string }
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error ?? 'Something went wrong. Please try again.')
        setLoading(null)
      }
    } catch {
      setError('Network error. Please try again.')
      setLoading(null)
    }
  }

  // Already subscribed — send them to the Stripe portal to switch plan
  if (hasSubscription) {
    return (
      <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-8 text-center">
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 font-medium">You already have an active subscription.</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          To upgrade or downgrade, use the Stripe billing portal — changes take effect immediately.
        </p>
        <a
          href={process.env.NEXT_PUBLIC_STRIPE_PORTAL_URL ?? '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-5 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
        >
          Open billing portal →
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Billing toggle */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <span className={`text-sm font-medium transition-colors ${!isAnnual ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}>
            Monthly
          </span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            aria-label="Toggle billing period"
            className={`relative w-11 h-6 rounded-full transition-colors ${isAnnual ? 'bg-brand-600' : 'bg-gray-300 dark:bg-gray-600'}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                isAnnual ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
          <span className={`text-sm font-medium transition-colors ${isAnnual ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}>
            Annual
          </span>
          <span className="text-xs bg-green-100 dark:bg-[#15A4AE]/10 text-green-700 dark:text-[#15A4AE] px-2 py-0.5 rounded-full font-semibold">
            Save ~35%
          </span>
        </div>
        {!isAnnual && (
          <p className="text-xs text-gray-400 dark:text-gray-500 ml-0.5">
            Switch to annual and save <span className="text-green-600 dark:text-[#15A4AE] font-semibold">~35% on average</span>
          </p>
        )}
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {PLANS.map((plan) => {
          const planIndex     = PLAN_ORDER.indexOf(plan.id)
          const isCurrentPlan = plan.id === currentPlan
          const isLowerTier   = planIndex < currentIndex
          const isDisabled    = isCurrentPlan || isLowerTier
          const price         = isAnnual ? plan.annualPrice : plan.monthlyPrice
          const isMostPopular = plan.badge === 'Most Popular'
          const isPopular     = plan.badge === 'Popular'

          return (
            <div
              key={plan.id}
              className={`relative bg-white dark:bg-[#2a2a2a] rounded-xl border flex flex-col p-6 ${
                isMostPopular
                  ? 'border-[#15A4AE] dark:border-[#15A4AE] ring-1 ring-[#15A4AE]'
                  : isPopular
                    ? 'border-brand-300 dark:border-brand-600 ring-1 ring-brand-300 dark:ring-brand-600'
                    : 'border-gray-200 dark:border-white/10'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className={`px-3 py-1 text-white text-xs font-semibold rounded-full whitespace-nowrap ${
                    isMostPopular ? 'bg-[#15A4AE]' : 'bg-brand-600'
                  }`}>
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="mb-5">
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{plan.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{plan.description}</p>
                <p className="mt-3">
                  <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">${price}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400"> / month</span>
                </p>
                {isAnnual && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Billed ${price * 12}/year</p>
                )}
              </div>

              <ul className="space-y-2.5 flex-1 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <svg className={`w-4 h-4 mt-0.5 shrink-0 ${isMostPopular ? 'text-[#15A4AE]' : 'text-brand-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => !isDisabled && handleUpgrade(plan.id)}
                disabled={isDisabled || loading === plan.id}
                className={`w-full py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  isCurrentPlan
                    ? 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 cursor-default'
                    : isLowerTier
                      ? 'bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-200 dark:border-white/10'
                      : loading === plan.id
                        ? 'bg-brand-400 text-white cursor-not-allowed'
                        : isMostPopular
                          ? 'bg-[#15A4AE] hover:bg-[#0e8f99] text-white'
                          : 'bg-brand-600 text-white hover:bg-brand-700'
                }`}
              >
                {isCurrentPlan
                  ? 'Current plan'
                  : isLowerTier
                    ? 'Lower tier'
                    : loading === plan.id
                      ? 'Redirecting to checkout…'
                      : `Upgrade to ${plan.name}`}
              </button>
            </div>
          )
        })}
      </div>

      {/* Enterprise CTA */}
      <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border border-amber-200 dark:border-amber-400/20 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Enterprise</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Unlimited seats & bots, SSO / SAML, dedicated infrastructure, SLA guarantees, and 24/7 dedicated support. Custom pricing.
          </p>
        </div>
        <a
          href="mailto:sales@appalix.ai?subject=Enterprise%20Plan%20Enquiry&body=Hi%2C%0A%0AI%27m%20interested%20in%20the%20Enterprise%20plan%20for%20Appalix.%20Please%20get%20in%20touch%20to%20discuss%20our%20requirements.%0A%0AThanks"
          className="shrink-0 px-4 py-2 text-sm font-medium border border-amber-300 dark:border-amber-400/30 text-amber-700 dark:text-amber-400 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-400/10 transition-colors whitespace-nowrap"
        >
          Talk to us →
        </a>
      </div>
    </div>
  )
}
