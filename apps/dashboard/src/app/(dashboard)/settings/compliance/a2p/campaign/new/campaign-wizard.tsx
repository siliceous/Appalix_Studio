'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, ChevronRight, ChevronLeft, Target, MessageSquare, ShieldCheck, ClipboardCheck, AlertTriangle } from 'lucide-react'
import { saveA2PCampaign, type CampaignData } from '@/app/actions/compliance'

const USE_CASES = [
  { value: 'marketing',             label: 'Marketing',                desc: 'Promotions, offers, and announcements' },
  { value: 'customer_care',         label: 'Customer care',            desc: 'Support and service updates' },
  { value: '2fa',                   label: 'Two-factor auth (2FA)',    desc: 'Verification codes and OTPs' },
  { value: 'delivery_notification', label: 'Delivery notifications',   desc: 'Order and shipping updates' },
  { value: 'account_notification',  label: 'Account notifications',    desc: 'Account activity and alerts' },
  { value: 'security_alert',        label: 'Security alerts',          desc: 'Fraud or security notifications' },
  { value: 'low_volume',            label: 'Low volume mixed',         desc: 'Small business / low volume messaging' },
  { value: 'mixed',                 label: 'Mixed',                    desc: 'Multiple use cases combined' },
]

const STEPS = [
  { label: 'Campaign purpose',   icon: Target },
  { label: 'Message samples',    icon: MessageSquare },
  { label: 'Consent & opt-out',  icon: ShieldCheck },
  { label: 'Review & submit',    icon: ClipboardCheck },
]

type FormState = Omit<CampaignData, 'brand_profile_id'>

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

function Textarea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      rows={rows}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-[#252525] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 resize-none"
    />
  )
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3 border-b dark:border-white/5 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
        {desc && <p className="text-xs text-gray-400 mt-0.5">{desc}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${checked ? 'bg-[#15A4AE]' : 'bg-gray-200 dark:bg-white/15'}`}
      >
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string | boolean | undefined }) {
  const display = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b dark:border-white/5 last:border-0">
      <p className="text-xs text-gray-500 dark:text-gray-400 shrink-0 w-40">{label}</p>
      <p className="text-sm text-gray-900 dark:text-gray-100 text-right">{display || <span className="text-gray-300">—</span>}</p>
    </div>
  )
}

const USE_CASE_LABELS: Record<string, string> = Object.fromEntries(USE_CASES.map(u => [u.value, u.label]))

export function CampaignWizard({ brandProfileId }: { brandProfileId: string }) {
  const [step, setStep] = useState(1)
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState<FormState>({
    name:                '',
    use_case:            '',
    description:         '',
    sample_message_1:    '',
    sample_message_2:    '',
    opt_in_description:  '',
    opt_out_keywords:    'STOP, UNSUBSCRIBE',
    help_message:        'Reply HELP for assistance or STOP to unsubscribe.',
    embedded_links:      false,
    embedded_phone:      false,
    affiliate_marketing: false,
    age_gated:           false,
  })

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function canProceed() {
    if (step === 1) return !!(form.name && form.use_case && form.description)
    if (step === 2) return !!(form.sample_message_1 && form.sample_message_2)
    if (step === 3) return !!(form.opt_in_description && form.opt_out_keywords && form.help_message)
    return true
  }

  function handleSubmit() {
    startTransition(async () => {
      await saveA2PCampaign({ ...form, brand_profile_id: brandProfileId })
    })
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
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${done ? 'bg-green-500 text-white' : current ? 'bg-[#15A4AE] text-white' : 'bg-gray-100 dark:bg-white/8 text-gray-400'}`}>
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

      <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-6">

        {/* Step 1: Purpose */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Campaign purpose</h2>
              <p className="text-sm text-gray-500 mt-0.5">Tell carriers what type of messages you&apos;ll be sending.</p>
            </div>
            <Field label="Campaign name" required hint="Internal label — not shown to recipients">
              <input
                type="text"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. Appointment reminders"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-[#252525] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40"
              />
            </Field>
            <Field label="Use case" required>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                {USE_CASES.map(uc => (
                  <label key={uc.value} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${form.use_case === uc.value ? 'border-[#15A4AE] bg-[#15A4AE]/5' : 'border-gray-100 dark:border-white/8 hover:border-gray-200 dark:hover:border-white/15'}`}>
                    <input type="radio" checked={form.use_case === uc.value} onChange={() => set('use_case', uc.value)} className="sr-only" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{uc.label}</p>
                      <p className="text-xs text-gray-400">{uc.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Campaign description" required hint="Describe how you'll use SMS. Be specific — vague descriptions are rejected.">
              <Textarea
                value={form.description}
                onChange={v => set('description', v)}
                placeholder="e.g. We send appointment reminders and confirmations to clients who have booked via our website. Messages include booking date, time, and a cancellation link."
                rows={4}
              />
            </Field>
          </div>
        )}

        {/* Step 2: Message samples */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Message samples</h2>
              <p className="text-sm text-gray-500 mt-0.5">Provide real examples of messages you&apos;ll send. Include your business name and opt-out instructions.</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Sample messages must reflect real messages you send. Include your brand name and STOP instructions. Fake samples are a leading cause of rejection.
              </p>
            </div>
            <Field label="Sample message 1" required>
              <Textarea
                value={form.sample_message_1}
                onChange={v => set('sample_message_1', v)}
                placeholder="Hi [Name], your appointment at Acme Clinic is confirmed for Thu 15 Jan at 2:00pm. Reply STOP to unsubscribe."
                rows={3}
              />
              <p className="text-xs text-gray-400 mt-1">{form.sample_message_1.length} characters</p>
            </Field>
            <Field label="Sample message 2" required>
              <Textarea
                value={form.sample_message_2}
                onChange={v => set('sample_message_2', v)}
                placeholder="Reminder: Your appointment at Acme Clinic is tomorrow at 2:00pm. Call us on +1 800 555 0100 to reschedule. Reply STOP to opt out."
                rows={3}
              />
              <p className="text-xs text-gray-400 mt-1">{form.sample_message_2.length} characters</p>
            </Field>
            <div className="space-y-0 rounded-xl border dark:border-white/8 px-4 divide-y dark:divide-white/5">
              <Toggle label="Messages contain links" desc="URLs or shortened links in message body" checked={form.embedded_links} onChange={v => set('embedded_links', v)} />
              <Toggle label="Messages contain phone numbers" desc="Phone numbers embedded in message body" checked={form.embedded_phone} onChange={v => set('embedded_phone', v)} />
            </div>
          </div>
        )}

        {/* Step 3: Consent */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Consent & opt-out</h2>
              <p className="text-sm text-gray-500 mt-0.5">Describe how recipients agree to receive messages and how they can stop them.</p>
            </div>
            <Field label="How do subscribers opt in?" required hint="Be specific: web form URL, point of purchase, verbal consent at booking, etc.">
              <Textarea
                value={form.opt_in_description}
                onChange={v => set('opt_in_description', v)}
                placeholder="Customers enter their phone number in our booking form at example.com/book and check a box confirming they agree to receive SMS appointment reminders."
                rows={4}
              />
            </Field>
            <Field label="Opt-out keywords" required hint="Comma-separated. STOP and UNSUBSCRIBE are mandatory.">
              <input
                type="text"
                value={form.opt_out_keywords}
                onChange={e => set('opt_out_keywords', e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-[#252525] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40"
              />
            </Field>
            <Field label="Help / HELP response" required hint="The message sent when a subscriber replies HELP">
              <Textarea
                value={form.help_message}
                onChange={v => set('help_message', v)}
                placeholder="Reply HELP for assistance or STOP to unsubscribe."
                rows={2}
              />
            </Field>
            <div className="space-y-0 rounded-xl border dark:border-white/8 px-4 divide-y dark:divide-white/5">
              <Toggle label="Age-gated content" desc="Messages contain content restricted by age (alcohol, gambling, etc.)" checked={form.age_gated} onChange={v => set('age_gated', v)} />
              <Toggle label="Affiliate marketing" desc="Messages promote third-party products or services" checked={form.affiliate_marketing} onChange={v => set('affiliate_marketing', v)} />
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Review your campaign</h2>
              <p className="text-sm text-gray-500 mt-0.5">Check everything before saving. You&apos;ll submit for review from the A2P overview page.</p>
            </div>
            <div className="space-y-3">
              <div className="bg-gray-50 dark:bg-white/[0.03] rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Purpose</p>
                <ReviewRow label="Campaign name" value={form.name} />
                <ReviewRow label="Use case"      value={USE_CASE_LABELS[form.use_case] ?? form.use_case} />
                <ReviewRow label="Description"   value={form.description} />
              </div>
              <div className="bg-gray-50 dark:bg-white/[0.03] rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Messages</p>
                <ReviewRow label="Sample 1"         value={form.sample_message_1} />
                <ReviewRow label="Sample 2"         value={form.sample_message_2} />
                <ReviewRow label="Contains links"   value={form.embedded_links} />
                <ReviewRow label="Contains phones"  value={form.embedded_phone} />
              </div>
              <div className="bg-gray-50 dark:bg-white/[0.03] rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Consent</p>
                <ReviewRow label="Opt-in flow"          value={form.opt_in_description} />
                <ReviewRow label="Opt-out keywords"     value={form.opt_out_keywords} />
                <ReviewRow label="Help response"        value={form.help_message} />
                <ReviewRow label="Age-gated"            value={form.age_gated} />
                <ReviewRow label="Affiliate marketing"  value={form.affiliate_marketing} />
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
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
              {isPending ? 'Saving…' : 'Save campaign'}
              {!isPending && <CheckCircle2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
