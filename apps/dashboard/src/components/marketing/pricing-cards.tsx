'use client'

import { useState, createContext, useContext } from 'react'
import Link from 'next/link'
import { ContactSalesButton } from '@/components/marketing/contact-sales-button'

export const BillingContext = createContext<{ isAnnual: boolean; setIsAnnual: (v: boolean) => void }>({
  isAnnual: true,
  setIsAnnual: () => {},
})

export function BillingToggle() {
  const { isAnnual, setIsAnnual } = useContext(BillingContext)
  return (
    <div className="flex items-center justify-center gap-3">
      <span className={`text-sm font-medium transition-colors ${!isAnnual ? 'text-white' : 'text-white/60'}`}>Monthly</span>
      <button
        onClick={() => setIsAnnual(!isAnnual)}
        aria-label="Toggle billing period"
        className={`relative w-12 h-6 rounded-full transition-colors ${isAnnual ? 'bg-brand-600' : 'bg-gray-600'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isAnnual ? 'translate-x-6' : 'translate-x-0'}`} />
      </button>
      <span className={`text-sm font-medium transition-colors ${isAnnual ? 'text-white' : 'text-white/60'}`}>Annual</span>
      <span className="text-xs bg-green-500/20 text-green-400 px-2.5 py-1 rounded-full font-semibold">Save up to 35%</span>
    </div>
  )
}

export function BillingProvider({ children }: { children: React.ReactNode }) {
  const [isAnnual, setIsAnnual] = useState(true)
  return <BillingContext.Provider value={{ isAnnual, setIsAnnual }}>{children}</BillingContext.Provider>
}

const EXTRA_SEAT    = { annual: 29, monthly: 45 }
const EXTRA_BOT     = { annual: 19, monthly: 29 }
const EXTRA_STORAGE = { annual: 5,  monthly: 7  }

type IntegrationGroup = { label: string; items: string[] }

type Plan = {
  key: string
  name: string
  annualPrice: number | null
  monthlyPrice: number | null
  desc: string
  badge: string | null
  seats: number | null
  bots: number | null
  conversations: string
  storage: string | null
  extraSeats: string | null
  extraBots: boolean
  ecommerce: string | null
  highlights: string[]
  knowledgeBase: string[]
  integrationGroups: IntegrationGroup[]
  cta: string
  enterprise: boolean
}

const PLANS: Plan[] = [
  {
    key:          'individual',
    name:         'Individual',
    annualPrice:  49,
    monthlyPrice: 69,
    desc:         'Perfect for solo operators and freelancers.',
    badge:        null,
    seats:        1,
    bots:         1,
    conversations:'5,000',
    storage:      '2 GB',
    extraSeats:   'Up to 2 extra seats',
    extraBots:    true,
    ecommerce:    null,
    highlights:   ['Sage AI CRM assistant', 'Lead capture & pipeline', 'Basic analytics', 'Email support'],
    knowledgeBase: ['Web URL', 'Plain text', 'CSV', 'Excel / XLS'],
    integrationGroups: [
      { label: 'Chat & Website',   items: ['FB Messenger', 'WordPress', 'Web widget'] },
      { label: 'Email',            items: ['Gmail', 'Outlook'] },
      { label: 'Scheduling',       items: ['Calendly'] },
      { label: 'Email Marketing',  items: ['Kit', 'Constant Contact'] },
      { label: 'Forms',            items: ['Google Forms', 'Fluent Forms'] },
      { label: 'CRMs',             items: ['HubSpot', 'Salesforce', 'Monday.com', 'Zoho'] },
    ],
    cta:        'Start Free Trial',
    enterprise: false,
  },
  {
    key:          'pro',
    name:         'Pro',
    annualPrice:  99,
    monthlyPrice: 149,
    desc:         'More power, more bots, more success.',
    badge:        'Popular',
    seats:        3,
    bots:         3,
    conversations:'15,000',
    storage:      '10 GB',
    extraSeats:   'Up to 6 extra seats',
    extraBots:    true,
    ecommerce:    'WooCommerce + Shopify',
    highlights:   ['Sage AI CRM assistant', 'All platform integrations', 'Human handoff', 'AI task automation', 'Advanced analytics', 'API access', 'Priority support'],
    knowledgeBase: ['Web URL', 'Plain text', 'CSV', 'Excel / XLS', 'PDF / Word / ZIP', 'Google Drive', 'OneDrive'],
    integrationGroups: [
      { label: 'Chat & Website',   items: ['FB Messenger', 'WhatsApp', 'WordPress', 'Web widget', 'Shopify'] },
      { label: 'Email & Payments', items: ['Gmail', 'Outlook', 'Stripe'] },
      { label: 'Lead Ads',         items: ['Google Ads', 'Meta Ads', 'Microsoft Ads'] },
      { label: 'Scheduling',       items: ['Calendly'] },
      { label: 'Email Marketing',  items: ['Mailchimp', 'Kit', 'Constant Contact'] },
      { label: 'Forms',            items: ['Gravity Forms', 'Google Forms', 'Fluent Forms'] },
      { label: 'Support',          items: ['Freshdesk'] },
      { label: 'Automation',       items: ['Zapier'] },
      { label: 'CRMs',             items: ['HubSpot', 'Salesforce', 'Monday.com', 'Zoho'] },
    ],
    cta:        'Start Free Trial',
    enterprise: false,
  },
  {
    key:          'edge',
    name:         'Edge',
    annualPrice:  149,
    monthlyPrice: 229,
    desc:         'Scale your sales ops with more channels and automation.',
    badge:        'Most Popular',
    seats:        5,
    bots:         5,
    conversations:'25,000',
    storage:      '15 GB',
    extraSeats:   'Up to 10 extra seats',
    extraBots:    true,
    ecommerce:    'WooCommerce + Shopify',
    highlights:   ['Sage AI CRM assistant', 'All platform integrations', 'Human handoff', 'AI task automation', 'Advanced analytics', 'Custom API', 'API access', 'Priority support'],
    knowledgeBase: ['Web URL', 'Plain text', 'CSV', 'Excel / XLS', 'PDF / Word / ZIP', 'Google Drive', 'OneDrive', 'Notion', 'GitBook', 'Dropbox', 'SharePoint', 'Intercom'],
    integrationGroups: [
      { label: 'Chat & Website',   items: ['Slack', 'FB Messenger', 'WhatsApp', 'Telegram', 'WordPress', 'Web widget'] },
      { label: 'Email & Payments', items: ['Gmail', 'Outlook', 'Stripe'] },
      { label: 'Lead Ads',         items: ['Google Ads', 'Meta Ads', 'TikTok', 'LinkedIn', 'Microsoft Ads'] },
      { label: 'Scheduling',       items: ['Calendly'] },
      { label: 'Email Marketing',  items: ['Mailchimp', 'ActiveCampaign', 'Kit', 'Klaviyo', 'Constant Contact'] },
      { label: 'Forms',            items: ['Gravity Forms', 'Google Forms', 'Typeform', 'Fluent Forms'] },
      { label: 'Support',          items: ['Freshdesk', 'Zendesk'] },
      { label: 'Automation',       items: ['Zapier'] },
      { label: 'CRMs',             items: ['HubSpot', 'Salesforce', 'Monday.com', 'Zoho'] },
    ],
    cta:        'Start Free Trial',
    enterprise: false,
  },
  {
    key:          'team',
    name:         'Team',
    annualPrice:  299,
    monthlyPrice: 469,
    desc:         'High-volume operations for larger teams.',
    badge:        null,
    seats:        10,
    bots:         10,
    conversations:'50,000',
    storage:      '30 GB',
    extraSeats:   'Unlimited extra seats',
    extraBots:    true,
    ecommerce:    'WooCommerce + Shopify',
    highlights:   ['Sage AI CRM assistant', 'All platform integrations', 'Human handoff', 'AI task automation', 'Advanced analytics', 'White-label branding', 'API access', 'Dedicated account manager'],
    knowledgeBase: ['Web URL', 'Plain text', 'CSV', 'Excel / XLS', 'PDF / Word / ZIP', 'Google Drive', 'OneDrive', 'Notion', 'GitBook', 'Dropbox', 'SharePoint', 'Intercom'],
    integrationGroups: [
      { label: 'Chat & Website',   items: ['Slack', 'FB Messenger', 'WhatsApp', 'Telegram', 'WordPress', 'Web widget'] },
      { label: 'Email & Payments', items: ['Gmail', 'Outlook', 'Stripe'] },
      { label: 'Lead Ads',         items: ['Google Ads', 'Meta Ads', 'TikTok', 'LinkedIn', 'Microsoft Ads'] },
      { label: 'Scheduling',       items: ['Calendly'] },
      { label: 'Email Marketing',  items: ['Mailchimp', 'ActiveCampaign', 'Kit', 'Klaviyo', 'Constant Contact'] },
      { label: 'Forms',            items: ['Gravity Forms', 'Google Forms', 'Typeform', 'Fluent Forms'] },
      { label: 'Support',          items: ['Freshdesk', 'Zendesk'] },
      { label: 'Automation',       items: ['Zapier', 'Custom API'] },
      { label: 'CRMs',             items: ['HubSpot', 'Salesforce', 'Monday.com', 'Zoho'] },
    ],
    cta:        'Start Free Trial',
    enterprise: false,
  },
  {
    key:          'enterprise',
    name:         'Enterprise',
    annualPrice:  null,
    monthlyPrice: null,
    desc:         "Custom solution built around your organisation's needs.",
    badge:        'Custom',
    seats:        null,
    bots:         null,
    conversations:'Unlimited',
    storage:      null,
    extraSeats:   null,
    extraBots:    false,
    ecommerce:    null,
    highlights:   ['Unlimited seats & bots', 'Unlimited conversations', 'Sage AI CRM assistant', 'SSO / SAML login', 'Custom integrations', 'Dedicated infrastructure', 'SLA guarantees', 'Security review', 'On-boarding support', '24/7 dedicated support'],
    knowledgeBase: [],
    integrationGroups: [],
    cta:        'Talk to us',
    enterprise: true,
  },
]

export function PricingCards() {
  const { isAnnual } = useContext(BillingContext)
  const [expandedKb,  setExpandedKb]  = useState<Set<string>>(new Set())
  const [expandedInt, setExpandedInt] = useState<Set<string>>(new Set())

  function toggleKb(key: string)  { setExpandedKb(s  => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n }) }
  function toggleInt(key: string) { setExpandedInt(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n }) }

  return (
    <section className="py-12 px-6">
      <div className="max-w-[90rem] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-start">
        {PLANS.map((plan) => {
          const price         = isAnnual ? plan.annualPrice : plan.monthlyPrice
          const billed        = isAnnual && plan.annualPrice ? plan.annualPrice * 12 : null
          const isMostPopular = plan.badge === 'Most Popular'
          const isPopular     = plan.badge === 'Popular'
          const isEnterprise  = plan.enterprise
          const kbOpen  = expandedKb.has(plan.key)
          const intOpen = expandedInt.has(plan.key)

          return (
            <div
              key={plan.key}
              className={`relative flex flex-col rounded-2xl p-5 border h-full transition-all duration-300 ease-out ${
                isMostPopular
                  ? 'bg-[#15A4AE]/10 border-[#15A4AE]/50 shadow-xl shadow-[#15A4AE]/20 -translate-y-4 hover:-translate-y-8 hover:shadow-2xl hover:shadow-[#15A4AE]/40 hover:border-[#15A4AE]/80'
                  : isEnterprise
                  ? 'bg-amber-400/[0.05] border-amber-400/20 hover:border-amber-400/40 hover:-translate-y-2 hover:shadow-lg hover:shadow-amber-400/10'
                  : 'bg-white/5 border-white/10 hover:border-white/30 hover:-translate-y-2 hover:shadow-lg hover:shadow-white/5'
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap ${
                    isMostPopular ? 'bg-[#15A4AE] text-white'
                    : isPopular   ? 'bg-white/15 text-white border border-white/20'
                    : isEnterprise? 'bg-amber-400/20 text-amber-400 border border-amber-400/30'
                    : 'bg-white/10 text-white/70'
                  }`}>
                    {plan.badge}
                  </span>
                </div>
              )}

              {/* Name + desc */}
              <div className="mb-4">
                <h3 className={`font-bold text-xl mb-1 ${isEnterprise ? 'text-amber-400' : 'text-white'}`}>{plan.name}</h3>
                <p className="text-xs text-white/65 leading-relaxed">{plan.desc}</p>
              </div>

              {/* Price */}
              <div className="mb-4">
                {price !== null ? (
                  <>
                    <div className="flex items-baseline gap-3">
                      <span className="text-3xl font-black text-white">${price}</span>
                      <span className="text-white/65 text-sm">/mo</span>
                      {plan.annualPrice !== null && plan.monthlyPrice !== null && (
                        <span className="relative text-[17px] font-normal text-white/40">
                          ${isAnnual ? plan.monthlyPrice : plan.annualPrice}
                          <span className="absolute inset-0 flex items-center pointer-events-none">
                            <span className="w-full h-[2px] bg-[#ec732e] block" style={{ transform: 'rotate(-18deg)' }} />
                          </span>
                        </span>
                      )}
                    </div>
                    {billed && <p className="text-xs text-white/50 mt-1">Billed ${billed}/year</p>}
                  </>
                ) : (
                  <p className="text-2xl font-black text-amber-400">Custom</p>
                )}
              </div>

              {/* Stats pills */}
              <div className="flex flex-wrap gap-1 mb-4">
                {[
                  plan.seats   !== null ? `${plan.seats} seat${plan.seats !== 1 ? 's' : ''}` : 'Unlimited seats',
                  plan.bots    !== null ? `${plan.bots} bot${plan.bots !== 1 ? 's' : ''}`    : 'Unlimited bots',
                  `${plan.conversations} msg/mo`,
                  plan.storage ? `${plan.storage} storage` : null,
                ].filter(Boolean).map(stat => (
                  <span key={stat!} className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/8 border border-white/10 text-white/80">
                    {stat}
                  </span>
                ))}
              </div>

              {/* Ecommerce badge */}
              {plan.ecommerce && (
                <div className="mb-3">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/25 text-green-400 text-xs font-semibold">
                    🛍️ {plan.ecommerce}
                  </span>
                </div>
              )}

              {/* Sage badge */}
              <div className="mb-3">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#15A4AE]/10 border border-[#15A4AE]/30 text-[#15A4AE] text-xs font-semibold">
                  + Sage AI CRM assistant
                </span>
              </div>

              {/* Extra pricing */}
              {!isEnterprise && (
                <div className="flex flex-col gap-1 mb-4 border-t border-white/8 pt-3">
                  {plan.extraSeats && (
                    <p className="text-xs text-[#15A4AE]">+ {plan.extraSeats} at ${isAnnual ? EXTRA_SEAT.annual : EXTRA_SEAT.monthly}/seat/mo</p>
                  )}
                  {plan.extraBots && (
                    <p className="text-xs text-[#15A4AE]">+ Extra bots at ${isAnnual ? EXTRA_BOT.annual : EXTRA_BOT.monthly}/bot/mo</p>
                  )}
                  <p className="text-xs text-[#15A4AE]">+ Extra storage at ${isAnnual ? EXTRA_STORAGE.annual : EXTRA_STORAGE.monthly}/10 GB/mo</p>
                  <p className="text-xs text-[#15A4AE]">$10 per 1,000 extra conversations</p>
                </div>
              )}

              {/* Highlights */}
              <ul className="space-y-1.5 mb-4 flex-1">
                {plan.highlights.filter(h => h !== 'Sage AI CRM assistant').map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs">
                    <svg className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isEnterprise ? 'text-amber-400' : 'text-[#15A4AE]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-white/90">{f}</span>
                  </li>
                ))}
              </ul>

              {/* Knowledge Base collapsible */}
              {plan.knowledgeBase.length > 0 && (
                <div className="mb-2 border-t border-white/8 pt-3">
                  <button
                    onClick={() => toggleKb(plan.key)}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <span className="text-xs font-semibold text-white/70 uppercase tracking-wide">Knowledge Base</span>
                    <span className="text-white/40 text-xs">{kbOpen ? '▲' : '▼'}</span>
                  </button>
                  {kbOpen && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {plan.knowledgeBase.map(k => (
                        <span key={k} className="text-xs px-1.5 py-0.5 rounded bg-white/8 border border-white/10 text-white/70">{k}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Integrations collapsible */}
              {plan.integrationGroups.length > 0 && (
                <div className="mb-4 border-t border-white/8 pt-3">
                  <button
                    onClick={() => toggleInt(plan.key)}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <span className="text-xs font-semibold text-white/70 uppercase tracking-wide">Integrations</span>
                    <span className="text-white/40 text-xs">{intOpen ? '▲' : '▼'}</span>
                  </button>
                  {intOpen && (
                    <div className="mt-2 space-y-2">
                      {plan.integrationGroups.map(g => (
                        <div key={g.label}>
                          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1">{g.label}</p>
                          <div className="flex flex-wrap gap-1">
                            {g.items.map(item => (
                              <span key={item} className="text-xs px-1.5 py-0.5 rounded bg-white/8 border border-white/10 text-white/70">{item}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* CTA */}
              {isEnterprise ? (
                <ContactSalesButton
                  label={plan.cta}
                  className="block text-center text-sm font-semibold py-2.5 rounded-xl border border-amber-400/30 text-amber-400 hover:bg-amber-400/10 transition-colors"
                />
              ) : (
                <Link
                  href="/login"
                  className={`block text-center text-sm font-medium py-2.5 rounded-xl transition-colors ${
                    isMostPopular
                      ? 'bg-[#15A4AE] hover:bg-[#0e8f99] text-white shadow-lg shadow-[#15A4AE]/30'
                      : 'border border-white/20 hover:border-[#15A4AE]/60 text-white/80 hover:text-white hover:bg-[#15A4AE]/10'
                  }`}
                >
                  {plan.cta}
                </Link>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-center text-xs text-white/60 mt-8">
        Extra seats: ${EXTRA_SEAT.annual}/seat/mo annual · ${EXTRA_SEAT.monthly}/seat/mo monthly.{' '}
        Extra bots: ${EXTRA_BOT.annual}/bot/mo annual · ${EXTRA_BOT.monthly}/bot/mo monthly.
      </p>
    </section>
  )
}
