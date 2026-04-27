'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, ChevronRight, ChevronLeft, Building2, MapPin, User, ClipboardCheck } from 'lucide-react'
import { saveA2PBrand, type BrandData } from '@/app/actions/compliance'

type ComplianceBrandProfile = Record<string, unknown>

const COMPANY_TYPES = [
  { value: 'sole_prop',   label: 'Sole Proprietor',   desc: 'Individual / freelancer' },
  { value: 'private',     label: 'Private Company',   desc: 'LLC, Pty Ltd, Ltd' },
  { value: 'public',      label: 'Public Company',    desc: 'Listed on stock exchange' },
  { value: 'non_profit',  label: 'Non-profit',        desc: '501(c)(3) or equivalent' },
  { value: 'government',  label: 'Government',        desc: 'Federal, state, or local' },
]

const VERTICALS = [
  'Agriculture', 'Communications', 'Construction', 'Education', 'Energy',
  'Entertainment', 'Financial Services', 'Healthcare', 'Hospitality',
  'Insurance', 'Legal', 'Manufacturing', 'NGO', 'Real Estate',
  'Retail', 'Technology', 'Transportation', 'Other',
]

const STEPS = [
  { label: 'Business identity', icon: Building2 },
  { label: 'Business address',  icon: MapPin },
  { label: 'Primary contact',   icon: User },
  { label: 'Review & submit',   icon: ClipboardCheck },
]

type FormState = BrandData

function Field({ label, required, children, hint }: { label: string; required?: boolean; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-[#252525] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40"
    />
  )
}

function ReviewRow({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b dark:border-white/5 last:border-0">
      <p className="text-xs text-gray-500 dark:text-gray-400 shrink-0 w-40">{label}</p>
      <p className="text-sm text-gray-900 dark:text-gray-100 text-right">{value || <span className="text-gray-300">—</span>}</p>
    </div>
  )
}

export function BrandWizard({ existing }: { existing: ComplianceBrandProfile | null }) {
  const [step, setStep] = useState(1)
  const [isPending, startTransition] = useTransition()
  const e = existing as Record<string, string> | null
  const [form, setForm] = useState<FormState>({
    company_type:   e?.company_type   ?? '',
    legal_name:     e?.legal_name     ?? '',
    ein:            e?.ein            ?? '',
    vertical:       e?.vertical       ?? '',
    website_url:    e?.website_url    ?? '',
    street:         e?.street         ?? '',
    city:           e?.city           ?? '',
    state:          e?.state          ?? '',
    postal_code:    e?.postal_code    ?? '',
    country:        e?.country        ?? 'US',
    contact_first:  e?.contact_first  ?? '',
    contact_last:   e?.contact_last   ?? '',
    contact_email:  e?.contact_email  ?? '',
    contact_phone:  e?.contact_phone  ?? '',
    stock_symbol:   e?.stock_symbol   ?? '',
    stock_exchange: e?.stock_exchange ?? '',
  })

  function set(key: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function canProceed(): boolean {
    if (step === 1) return !!(form.company_type && form.legal_name && form.ein && form.vertical && form.website_url)
    if (step === 2) return !!(form.street && form.city && form.state && form.postal_code)
    if (step === 3) return !!(form.contact_first && form.contact_last && form.contact_email && form.contact_phone)
    return true
  }

  function handleSubmit() {
    startTransition(async () => { await saveA2PBrand(form) })
  }

  return (
    <div className="max-w-2xl mx-auto">

      {/* Step progress */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((s, i) => {
          const n = i + 1
          const done    = n < step
          const current = n === step
          const Icon = s.icon
          return (
            <div key={n} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  done    ? 'bg-green-500 text-white' :
                  current ? 'bg-[#15A4AE] text-white' :
                             'bg-gray-100 dark:bg-white/8 text-gray-400'
                }`}>
                  {done ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className={`text-[10px] font-medium whitespace-nowrap hidden sm:block ${current ? 'text-[#15A4AE]' : done ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 mb-4 rounded-full ${done ? 'bg-green-400' : 'bg-gray-200 dark:bg-white/10'}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Step content */}
      <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-6">

        {/* Step 1: Business identity */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Tell us about your business</h2>
              <p className="text-sm text-gray-500 mt-0.5">This information is submitted to The Campaign Registry (TCR) for verification.</p>
            </div>

            <Field label="Business type" required>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                {COMPANY_TYPES.map(ct => (
                  <label key={ct.value} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                    form.company_type === ct.value
                      ? 'border-[#15A4AE] bg-[#15A4AE]/5'
                      : 'border-gray-100 dark:border-white/8 hover:border-gray-200 dark:hover:border-white/15'
                  }`}>
                    <input type="radio" name="company_type" value={ct.value} checked={form.company_type === ct.value} onChange={() => set('company_type', ct.value)} className="sr-only" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{ct.label}</p>
                      <p className="text-xs text-gray-400">{ct.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Legal business name" required>
                <Input value={form.legal_name} onChange={v => set('legal_name', v)} placeholder="Acme Corp Pty Ltd" />
              </Field>
              <Field label="EIN / Tax ID" required hint="US Employer Identification Number or equivalent">
                <Input value={form.ein} onChange={v => set('ein', v)} placeholder="12-3456789" />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Industry vertical" required>
                <select value={form.vertical} onChange={e => set('vertical', e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-[#252525] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40">
                  <option value="">Select industry…</option>
                  {VERTICALS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </Field>
              <Field label="Business website" required>
                <Input value={form.website_url} onChange={v => set('website_url', v)} placeholder="https://example.com" type="url" />
              </Field>
            </div>

            {form.company_type === 'public' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-white/[0.03] rounded-xl border dark:border-white/5">
                <Field label="Stock symbol">
                  <Input value={form.stock_symbol ?? ''} onChange={v => set('stock_symbol', v)} placeholder="AAPL" />
                </Field>
                <Field label="Stock exchange">
                  <Input value={form.stock_exchange ?? ''} onChange={v => set('stock_exchange', v)} placeholder="NASDAQ" />
                </Field>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Address */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Business address</h2>
              <p className="text-sm text-gray-500 mt-0.5">The registered address of your business.</p>
            </div>
            <Field label="Street address" required>
              <Input value={form.street} onChange={v => set('street', v)} placeholder="123 Main St, Suite 400" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="City" required>
                <Input value={form.city} onChange={v => set('city', v)} placeholder="San Francisco" />
              </Field>
              <Field label="State / Province" required>
                <Input value={form.state} onChange={v => set('state', v)} placeholder="CA" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="ZIP / Postal code" required>
                <Input value={form.postal_code} onChange={v => set('postal_code', v)} placeholder="94105" />
              </Field>
              <Field label="Country">
                <select value={form.country} onChange={e => set('country', e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-[#252525] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40">
                  <option value="US">United States</option>
                  <option value="AU">Australia</option>
                  <option value="GB">United Kingdom</option>
                  <option value="CA">Canada</option>
                  <option value="NZ">New Zealand</option>
                </select>
              </Field>
            </div>
          </div>
        )}

        {/* Step 3: Contact */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Primary contact</h2>
              <p className="text-sm text-gray-500 mt-0.5">The person TCR or carriers may contact regarding this registration.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="First name" required>
                <Input value={form.contact_first} onChange={v => set('contact_first', v)} placeholder="Jane" />
              </Field>
              <Field label="Last name" required>
                <Input value={form.contact_last} onChange={v => set('contact_last', v)} placeholder="Smith" />
              </Field>
            </div>
            <Field label="Business email" required>
              <Input value={form.contact_email} onChange={v => set('contact_email', v)} placeholder="jane@example.com" type="email" />
            </Field>
            <Field label="Phone number" required hint="Include country code, e.g. +1 415 555 0100">
              <Input value={form.contact_phone} onChange={v => set('contact_phone', v)} placeholder="+1 415 555 0100" type="tel" />
            </Field>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Review your submission</h2>
              <p className="text-sm text-gray-500 mt-0.5">Confirm your details before saving. You can update and resubmit at any time before approval.</p>
            </div>
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-white/[0.03] rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Business identity</p>
                <ReviewRow label="Business type"   value={COMPANY_TYPES.find(c => c.value === form.company_type)?.label} />
                <ReviewRow label="Legal name"       value={form.legal_name} />
                <ReviewRow label="EIN / Tax ID"     value={form.ein} />
                <ReviewRow label="Industry"         value={form.vertical} />
                <ReviewRow label="Website"          value={form.website_url} />
              </div>
              <div className="bg-gray-50 dark:bg-white/[0.03] rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Business address</p>
                <ReviewRow label="Street"       value={form.street} />
                <ReviewRow label="City"         value={form.city} />
                <ReviewRow label="State"        value={form.state} />
                <ReviewRow label="Postal code"  value={form.postal_code} />
                <ReviewRow label="Country"      value={form.country} />
              </div>
              <div className="bg-gray-50 dark:bg-white/[0.03] rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Primary contact</p>
                <ReviewRow label="Name"  value={`${form.contact_first} ${form.contact_last}`.trim()} />
                <ReviewRow label="Email" value={form.contact_email} />
                <ReviewRow label="Phone" value={form.contact_phone} />
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-400">
              Saving creates a draft. You&apos;ll then submit for registration from the A2P overview page to initiate TCR review.
            </div>
          </div>
        )}

        {/* Nav buttons */}
        <div className="flex items-center justify-between pt-6 mt-6 border-t dark:border-white/8">
          <button
            type="button"
            onClick={() => setStep(s => s - 1)}
            disabled={step === 1}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />Back
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold rounded-xl bg-[#15A4AE] hover:bg-[#0e8f99] text-white transition-colors disabled:opacity-40"
            >
              Continue<ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold rounded-xl bg-[#15A4AE] hover:bg-[#0e8f99] text-white transition-colors disabled:opacity-60"
            >
              {isPending ? 'Saving…' : 'Save draft'}
              {!isPending && <CheckCircle2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
