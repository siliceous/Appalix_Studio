'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronRight, ChevronLeft, CheckCircle2, AlertTriangle, Info,
  Building2, MapPin, Globe, MessageSquare, ShieldCheck, FileText,
  Eye, Upload, Trash2, CheckCheck, Loader2, Sparkles,
} from 'lucide-react'
import {
  upsertSmsComplianceProfile,
  upsertSms10DlcCampaign,
  uploadSmsComplianceDocument,
  generateSmsFieldContent,
  type SageField,
} from '@/app/actions/sms-compliance'
import type { SmsComplianceProfile, Sms10DlcCampaign, SmsComplianceDocument } from '@/lib/types'

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7

interface WizardProps {
  existing: {
    profile:   SmsComplianceProfile | null
    campaign:  Sms10DlcCampaign | null
    documents: SmsComplianceDocument[]
  }
}

type ProfileForm = {
  is_overseas_business:         boolean
  business_country:             string
  business_type:                string
  legal_business_name:          string
  trading_name:                 string
  business_registration_number: string
  tax_id_country:               string
  business_address_line1:       string
  business_address_line2:       string
  business_city:                string
  business_state_region:        string
  business_postcode:            string
  website_url:                  string
  industry:                     string
  privacy_policy_url:           string
  terms_url:                    string
  business_contact_name:        string
  business_contact_email:       string
  business_contact_phone:       string
  support_email:                string
  support_phone:                string
}

type CampaignForm = {
  campaign_name:                       string
  use_case:                            string
  campaign_description:                string
  message_flow:                        string
  expected_message_frequency:          string
  opt_in_url:                          string
  opt_in_message:                      string
  opt_out_message:                     string
  help_message:                        string
  sample_message_1:                    string
  sample_message_2:                    string
  sample_message_3:                    string
  has_embedded_links:                  boolean
  has_embedded_phone_numbers:          boolean
  age_gated_content:                   boolean
  direct_lending_or_financial_content: boolean
}

// ── Constants ─────────────────────────────────────────────────────────────────

const BUSINESS_TYPES = [
  { value: 'private_company',  label: 'Private company' },
  { value: 'public_company',   label: 'Public company' },
  { value: 'nonprofit',        label: 'Non-profit organisation' },
  { value: 'government',       label: 'Government entity' },
  { value: 'sole_proprietor',  label: 'Sole trader / sole proprietor' },
]

const USE_CASES = [
  { value: 'customer_care',             label: 'Customer care',            desc: 'Support, queries, help responses' },
  { value: 'account_notifications',     label: 'Account notifications',    desc: 'Billing, security alerts, updates' },
  { value: 'appointment_reminders',     label: 'Appointment reminders',    desc: 'Booking confirmations & reminders' },
  { value: 'delivery_notifications',    label: 'Delivery notifications',   desc: 'Order status, shipment tracking' },
  { value: 'two_factor_authentication', label: '2FA / verification',       desc: 'One-time passwords, login codes' },
  { value: 'lead_followup',             label: 'Lead follow-up',           desc: 'Following up with prospects' },
  { value: 'marketing',                 label: 'Marketing',                desc: 'Promotions, offers, announcements' },
  { value: 'mixed',                     label: 'Mixed',                    desc: 'Transactional + marketing' },
]

const INDUSTRIES = [
  'Automotive','Education','Energy & Utilities','Entertainment','Financial Services',
  'Healthcare','Hospitality & Travel','Insurance','Legal Services','Non-profit',
  'Real Estate','Retail & E-commerce','Technology','Telecommunications',
  'Transportation & Logistics','Other',
]

const STEPS = [
  { num: 1, label: 'Region',   icon: Globe },
  { num: 2, label: 'Business', icon: Building2 },
  { num: 3, label: 'Address',  icon: MapPin },
  { num: 4, label: 'Use case', icon: MessageSquare },
  { num: 5, label: 'Consent',  icon: ShieldCheck },
  { num: 6, label: 'Messages', icon: FileText },
  { num: 7, label: 'Review',   icon: Eye },
]

// ── Per-use-case example text ─────────────────────────────────────────────────

type UseCaseExamples = {
  description: string
  flow:        string
  frequency:   string
  sample1:     string
  sample2:     string
  opt_in:      string
  help:        string
}

const USE_CASE_EXAMPLES: Record<string, UseCaseExamples> = {
  appointment_reminders: {
    description: 'Acme Dental sends appointment reminder and confirmation SMS to patients who book via our online system at acmedental.com. Messages are sent 48 hours and 2 hours before each appointment. Patients consent at booking by ticking a mandatory opt-in checkbox on the booking form.',
    flow:        'Customers opt in at https://acmedental.com/book. A mandatory checkbox reads: "I agree to receive SMS appointment reminders from Acme Dental. Msg frequency: 2 per appointment. Msg & Data rates may apply. Reply STOP to unsubscribe, HELP for help." The box must be checked to complete the booking. A confirmation SMS is sent immediately after.',
    frequency:   '2 messages per appointment (48-hour and 2-hour reminder), maximum 4 per month',
    sample1:     'Hi [FirstName], your appointment at Acme Dental is confirmed for Tue 3 Jun at 2:00 PM with Dr Smith. Reply CONFIRM or CANCEL. Reply STOP to unsubscribe. Msg & data rates may apply.',
    sample2:     'Hi [FirstName], reminder: your Acme Dental appointment is tomorrow at 2:00 PM. Need to reschedule? Call [Phone]. Reply STOP to stop receiving messages.',
    opt_in:      'You\'re subscribed to appointment reminders from Acme Dental. Msg frequency: up to 2 per appointment. Msg & Data rates may apply. Reply STOP to unsubscribe, HELP for help. Privacy: acmedental.com/privacy',
    help:        'Acme Dental: Call [Phone] or email [Email] for support. Msg & Data rates may apply. Reply STOP to unsubscribe.',
  },
  customer_care: {
    description: 'Acme Support sends SMS updates to customers who submit a support ticket at support.acme.com. Messages include ticket status updates, agent replies, and resolution confirmations. Customers opt in by providing their mobile number when submitting a ticket.',
    flow:        'Customers opt in when submitting a support ticket at https://acme.com/support. The form includes a checkbox: "Notify me by SMS about my ticket status. Msg & Data rates may apply. Reply STOP to unsubscribe, HELP for help." A confirmation SMS with the ticket number is sent immediately after submission.',
    frequency:   '1–3 messages per support ticket (status updates and resolution), no marketing',
    sample1:     'Hi [FirstName], your Acme support ticket #[TicketID] has been updated. Our team will follow up within 2 business hours. Questions? Reply or call [Phone]. Reply STOP to unsubscribe.',
    sample2:     'Great news [FirstName] — your Acme ticket #[TicketID] is resolved. How did we do? acme.com/review. Reply STOP to stop messages from Acme.',
    opt_in:      'You\'re subscribed to SMS support updates from Acme. Msg frequency varies with ticket activity. Msg & Data rates may apply. Reply STOP to unsubscribe, HELP for help.',
    help:        'Acme Support: Email [Email] or call [Phone] Mon–Fri 9am–5pm. Msg & Data rates may apply. Reply STOP to unsubscribe.',
  },
  account_notifications: {
    description: 'Acme sends transactional SMS alerts to account holders who have enabled SMS notifications in their account settings at acme.com/account. Messages include billing reminders, payment confirmations, and security alerts.',
    flow:        'Customers opt in by enabling SMS notifications in their Acme account settings at https://acme.com/account/notifications. The page displays: "Receive SMS for billing alerts and security notifications. Msg & Data rates may apply. Reply STOP to unsubscribe at any time." A confirmation SMS is sent immediately on enabling.',
    frequency:   '1–5 messages per month based on account activity (billing, security events)',
    sample1:     'Acme: Your payment of $[Amount] has been processed. Receipt: acme.com/billing/[ID]. Questions? Call [Phone]. Reply STOP to unsubscribe.',
    sample2:     'Acme security alert: New login to your account from [Location] at [Time]. Not you? Secure your account: acme.com/security. Reply STOP to opt out.',
    opt_in:      'You\'ve enabled SMS account notifications from Acme. Msg frequency varies by account activity. Msg & Data rates may apply. Reply STOP to disable, HELP for help.',
    help:        'Acme Account: Visit acme.com/support or email [Email]. Msg & Data rates may apply. Reply STOP to disable SMS notifications.',
  },
  delivery_notifications: {
    description: 'Acme Logistics sends delivery status SMS to customers who have placed an order at acme.com. Messages include dispatch confirmation, out-for-delivery alerts, and delivery confirmation. Customers consent to SMS updates at checkout.',
    flow:        'Customers opt in at checkout on https://acme.com/checkout by ticking: "Send me SMS delivery updates for this order. Msg & Data rates may apply. Reply STOP to unsubscribe, HELP for help." A dispatch confirmation SMS is sent when the order ships.',
    frequency:   '2–4 messages per order (dispatch, out for delivery, delivered), no marketing',
    sample1:     'Hi [FirstName], your Acme order #[OrderID] has shipped! Track it: acme.com/track/[OrderID]. Est. arrival: tomorrow by 5 PM. Reply STOP to unsubscribe.',
    sample2:     'Hi [FirstName], your Acme delivery is on its way today — arriving by [Time]. Someone may need to sign. Reply STOP to stop delivery SMS.',
    opt_in:      'You\'re subscribed to Acme delivery updates for order #[OrderID]. Msg frequency: 2–4 per order. Msg & Data rates may apply. Reply STOP to unsubscribe, HELP for help.',
    help:        'Acme Orders: Track at acme.com/orders or call [Phone]. Msg & Data rates may apply. Reply STOP to unsubscribe from delivery SMS.',
  },
  two_factor_authentication: {
    description: 'Acme sends one-time verification codes via SMS to users who have enabled two-factor authentication in their account security settings at acme.com. Messages are sent only when a user initiates a login requiring 2FA.',
    flow:        'Users opt in by enabling SMS 2FA in their security settings at https://acme.com/account/security. The setup screen states: "Enable SMS verification codes for logins. Msg & Data rates may apply. You can disable 2FA or reply STOP at any time." Users verify their number by entering a test code sent during setup.',
    frequency:   '1 message per login attempt requiring 2FA verification, no marketing',
    sample1:     'Your Acme verification code is [Code]. Valid for 10 minutes. Do not share this code with anyone. Reply STOP to disable SMS codes.',
    sample2:     'Acme login code: [Code] — expires in 5 minutes. Didn\'t request this? Secure your account: acme.com/security. Reply STOP to opt out.',
    opt_in:      'SMS two-factor authentication is now active for your Acme account. You\'ll receive a code each login. Msg & Data rates may apply. Reply STOP to disable.',
    help:        'Acme 2FA: Trouble logging in? Visit acme.com/security or email [Email]. Msg & Data rates may apply. Reply STOP to disable SMS verification.',
  },
  lead_followup: {
    description: 'Acme sends follow-up SMS to leads who have submitted an enquiry form at acme.com/contact. Messages are sent within 5 minutes of form submission and include personalised follow-up from the assigned sales representative. All leads have explicitly opted in on the enquiry form.',
    flow:        'Leads opt in by submitting the enquiry form at https://acme.com/contact. The form includes a mandatory checkbox: "I consent to being contacted by SMS about my enquiry. Msg & Data rates may apply. Reply STOP to unsubscribe, HELP for help." An acknowledgement SMS is sent immediately after form submission.',
    frequency:   '2–4 messages per enquiry over 7 days, no further messages after enquiry resolution',
    sample1:     'Hi [FirstName], thanks for reaching out to Acme! I\'m [AgentName] and I\'ll be your contact. I\'ll call you within the hour. Reply STOP to opt out.',
    sample2:     'Hi [FirstName], just following up on your Acme enquiry. Is there a good time to connect? Reply with a time or call [Phone]. Reply STOP to stop messages.',
    opt_in:      'Thanks for your Acme enquiry! You\'ll receive SMS follow-ups about your request. Msg & Data rates may apply. Reply STOP to unsubscribe, HELP for help.',
    help:        'Acme: For enquiries email [Email] or call [Phone]. Msg & Data rates may apply. Reply STOP to unsubscribe.',
  },
  marketing: {
    description: 'Acme Retail sends promotional SMS to customers who have opted in via the sign-up form at acme.com/offers. Messages include exclusive deals, seasonal promotions, and new product announcements. All recipients have explicitly opted in and can unsubscribe at any time.',
    flow:        'Customers opt in at https://acme.com/offers by entering their mobile and checking: "I agree to receive SMS marketing messages from Acme. Msg frequency: up to 4/month. Msg & Data rates may apply. Reply STOP to unsubscribe, HELP for help." A welcome SMS confirming their subscription is sent immediately.',
    frequency:   'Up to 4 promotional messages per month, more during major sale events',
    sample1:     'Hi [FirstName] 🎉 Acme exclusive: 20% off your next order this weekend only. Shop → acme.com/sale — Use code SAVE20. Reply STOP to unsubscribe. Msg & data rates may apply.',
    sample2:     'Hi [FirstName], our summer sale ends tonight — up to 40% off selected items. Don\'t miss out: acme.com/summer. Reply STOP to opt out of Acme marketing.',
    opt_in:      'Welcome to Acme SMS deals! You\'ll receive up to 4 promotional messages/month. Msg & Data rates may apply. Reply STOP to unsubscribe anytime, HELP for help. Privacy: acme.com/privacy',
    help:        'Acme: Questions? Email [Email] or call [Phone]. Msg & Data rates may apply. Reply STOP to unsubscribe from all Acme marketing SMS.',
  },
  mixed: {
    description: 'Acme sends a combination of transactional and marketing SMS to customers who have opted in at acme.com. Transactional messages cover order updates, billing, and account alerts. Marketing messages include promotions and offers. Recipients have consented to each message type separately.',
    flow:        'Customers opt in at https://acme.com/signup with two independent checkboxes: (1) "Receive order and account SMS alerts" and (2) "Receive Acme promotional SMS and offers." Each states: "Msg & Data rates may apply. Reply STOP to unsubscribe, HELP for help." A welcome SMS confirming opted-in preferences is sent immediately.',
    frequency:   'Up to 6 messages per month — transactional (billing/order) plus up to 4 marketing messages',
    sample1:     'Hi [FirstName], your Acme order #[OrderID] is confirmed. We\'ll text when it ships. Questions? Call [Phone]. Reply STOP to unsubscribe. Msg & data rates may apply.',
    sample2:     'Hi [FirstName] 🎁 Acme exclusive: 15% off your next order this week only. Shop → acme.com/offers. Reply STOP to opt out of Acme marketing.',
    opt_in:      'You\'re subscribed to Acme SMS (account updates + offers). Msg frequency varies. Msg & Data rates may apply. Reply STOP to unsubscribe all, HELP for help. Privacy: acme.com/privacy',
    help:        'Acme: Email [Email] or call [Phone] for support. Msg & Data rates may apply. Reply STOP to unsubscribe from all Acme SMS.',
  },
}

const DEFAULT_EXAMPLES: UseCaseExamples = {
  description: 'Select a use case above, then describe your business, who receives your messages, what specific event triggers each one, and why it\'s valuable to the recipient…',
  flow:        'Describe the step-by-step opt-in process — include the URL, the exact consent checkbox wording shown to users (with STOP/frequency/rate language), and what confirmation they receive immediately after…',
  frequency:   'e.g. 2 messages per appointment (48-hour and 2-hour reminder), maximum 4 per month',
  sample1:     'Hi [FirstName], [your primary message here describing the action or trigger]. Reply STOP to unsubscribe. Msg & data rates may apply.',
  sample2:     'Hi [FirstName], [follow-up or second scenario message here]. Reply STOP to stop receiving messages from us.',
  opt_in:      'You are now subscribed to messages from [Business Name]. Msg frequency varies. Msg & Data rates may apply. Reply STOP to unsubscribe, HELP for help. Privacy: [URL]',
  help:        '[Business Name]: For support email [Email] or call [Phone]. Msg & Data rates may apply. Reply STOP to unsubscribe.',
}

function getEx(useCase: string): UseCaseExamples {
  return USE_CASE_EXAMPLES[useCase] ?? DEFAULT_EXAMPLES
}

// ── UI helpers ────────────────────────────────────────────────────────────────

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 p-3 bg-blue-50 dark:bg-blue-500/8 border border-blue-100 dark:border-blue-500/15 rounded-lg text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
      <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  )
}

function Warn({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 p-3 bg-amber-50 dark:bg-amber-500/8 border border-amber-100 dark:border-amber-500/15 rounded-lg text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  )
}

function UseThisBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/8 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/15 border border-gray-200 dark:border-white/10 transition-colors"
    >
      Use this
    </button>
  )
}

function SageButton({ generating, onClick }: { generating: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={generating}
      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-500/20 border border-violet-200 dark:border-violet-500/20 transition-colors disabled:opacity-50"
    >
      {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
      {generating ? 'Writing…' : 'Write with Sage'}
    </button>
  )
}

function Field({
  label, hint, required, children, charCount, minChars, actions,
}: {
  label:      string
  hint?:      string
  required?:  boolean
  children:   React.ReactNode
  charCount?: number
  minChars?:  number
  actions?:   React.ReactNode
}) {
  const ok = minChars === undefined || (charCount ?? 0) >= minChars
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 shrink-0">
            {label}{required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          {actions}
        </div>
        {charCount !== undefined && minChars !== undefined && (
          <span className={`text-[10px] font-mono tabular-nums shrink-0 ${ok ? 'text-green-500' : charCount > 0 ? 'text-amber-500' : 'text-gray-400'}`}>
            {charCount}/{minChars}+
          </span>
        )}
      </div>
      {children}
      {hint && <p className="text-[11px] text-gray-400 leading-relaxed">{hint}</p>}
    </div>
  )
}

const inputCls    = 'w-full px-3 py-2 text-sm bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 focus:border-[#15A4AE] text-gray-900 dark:text-gray-100 placeholder:text-gray-300 dark:placeholder:text-gray-500'
const textareaCls = `${inputCls} resize-none`
const selectCls   = `${inputCls} cursor-pointer`

// ── Main wizard ───────────────────────────────────────────────────────────────

export function SmsVerificationWizard({ existing }: WizardProps) {
  const router = useRouter()
  const [step, setStep]           = useState<Step>(1)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [profileId, setProfileId] = useState<string | null>(existing.profile?.id ?? null)
  const [generatingField, setGeneratingField] = useState<string | null>(null)

  const p = existing.profile
  const c = existing.campaign

  const [profile, setProfile] = useState<ProfileForm>({
    is_overseas_business:         p?.is_overseas_business         ?? false,
    business_country:             p?.business_country             ?? '',
    business_type:                p?.business_type                ?? '',
    legal_business_name:          p?.legal_business_name          ?? '',
    trading_name:                 p?.trading_name                 ?? '',
    business_registration_number: p?.business_registration_number ?? '',
    tax_id_country:               p?.tax_id_country               ?? '',
    business_address_line1:       p?.business_address_line1       ?? '',
    business_address_line2:       p?.business_address_line2       ?? '',
    business_city:                p?.business_city                ?? '',
    business_state_region:        p?.business_state_region        ?? '',
    business_postcode:            p?.business_postcode            ?? '',
    website_url:                  p?.website_url                  ?? '',
    industry:                     p?.industry                     ?? '',
    privacy_policy_url:           p?.privacy_policy_url           ?? '',
    terms_url:                    p?.terms_url                    ?? '',
    business_contact_name:        p?.business_contact_name        ?? '',
    business_contact_email:       p?.business_contact_email       ?? '',
    business_contact_phone:       p?.business_contact_phone       ?? '',
    support_email:                p?.support_email                ?? '',
    support_phone:                p?.support_phone                ?? '',
  })

  const [campaign, setCampaign] = useState<CampaignForm>({
    campaign_name:                       c?.campaign_name              ?? '',
    use_case:                            c?.use_case                   ?? '',
    campaign_description:                c?.campaign_description       ?? '',
    message_flow:                        c?.message_flow               ?? '',
    expected_message_frequency:          c?.expected_message_frequency ?? '',
    opt_in_url:                          '',
    opt_in_message:                      c?.opt_in_message             ?? '',
    opt_out_message:                     c?.opt_out_message            ?? 'You have been unsubscribed and will receive no further messages from us. Reply START to resubscribe.',
    help_message:                        c?.help_message               ?? '',
    sample_message_1:                    c?.sample_message_1           ?? '',
    sample_message_2:                    c?.sample_message_2           ?? '',
    sample_message_3:                    c?.sample_message_3           ?? '',
    has_embedded_links:                  c?.has_embedded_links                   ?? false,
    has_embedded_phone_numbers:          c?.has_embedded_phone_numbers           ?? false,
    age_gated_content:                   c?.age_gated_content                    ?? false,
    direct_lending_or_financial_content: c?.direct_lending_or_financial_content  ?? false,
  })

  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null)
  const [docError, setDocError]         = useState<string | null>(null)
  const docRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // suppress unused import warning — useEffect kept for potential future use
  useEffect(() => {}, [])

  function sp(key: keyof ProfileForm, val: string | boolean) {
    setProfile(prev => ({ ...prev, [key]: val }))
  }
  function sc(key: keyof CampaignForm, val: string | boolean) {
    setCampaign(prev => ({ ...prev, [key]: val }))
  }

  // ── Sage AI generation ───────────────────────────────────────────────────────

  async function handleSageGenerate(field: SageField, setter: (v: string) => void) {
    setGeneratingField(field)
    try {
      const result = await generateSmsFieldContent({
        field,
        businessName: profile.legal_business_name || profile.trading_name,
        useCase:      campaign.use_case,
        website:      profile.website_url,
        industry:     profile.industry,
      })
      if (result.text) setter(result.text)
      if (result.error) setError(result.error)
    } catch {
      setError('AI generation failed. Try again.')
    } finally {
      setGeneratingField(null)
    }
  }

  // ── Step gating ─────────────────────────────────────────────────────────────

  function canProceed(): boolean {
    switch (step) {
      case 1: return !!profile.business_type
      case 2: return !!(profile.legal_business_name && profile.business_contact_email && profile.website_url)
      case 3: return !!(profile.business_address_line1 && profile.business_city && profile.business_state_region && profile.business_postcode && profile.business_country)
      case 4: return !!(campaign.campaign_name && campaign.use_case && campaign.campaign_description.length >= 100 && campaign.message_flow.length >= 100)
      case 5: return !!(profile.privacy_policy_url && profile.terms_url)
      case 6: return !!(
        campaign.sample_message_1.toUpperCase().includes('STOP') &&
        campaign.sample_message_2.toUpperCase().includes('STOP') &&
        campaign.opt_out_message && campaign.help_message && campaign.opt_in_message
      )
      default: return true
    }
  }

  // ── Save & advance ───────────────────────────────────────────────────────────

  async function saveAndNext() {
    setSaving(true)
    setError(null)
    try {
      if (step <= 5) {
        const result = await upsertSmsComplianceProfile(profile)
        setProfileId(result.id)
      }
      if (step === 6) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { opt_in_url: _url, ...campaignData } = campaign
        await upsertSms10DlcCampaign({
          ...campaignData,
          opt_in_keywords:  ['YES', 'START'],
          opt_out_keywords: ['STOP', 'UNSUBSCRIBE', 'CANCEL'],
          help_keywords:    ['HELP', 'INFO'],
        } as never, c?.id)
      }
      setStep(s => (s + 1) as Step)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed. Try again.')
    } finally {
      setSaving(false)
    }
  }

  // ── Final submit ─────────────────────────────────────────────────────────────

  async function handleFinalSubmit() {
    setSaving(true)
    setError(null)
    try {
      const profileResult = await upsertSmsComplianceProfile(profile)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { opt_in_url: _url, ...campaignData } = campaign
      await upsertSms10DlcCampaign({
        ...campaignData,
        opt_in_keywords:  ['YES', 'START'],
        opt_out_keywords: ['STOP', 'UNSUBSCRIBE', 'CANCEL'],
        help_keywords:    ['HELP', 'INFO'],
      } as never, c?.id)
      const { submitSmsComplianceProfile } = await import('@/app/actions/sms-compliance')
      await submitSmsComplianceProfile(profileResult.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submit failed. Try again.')
      setSaving(false)
    }
  }

  // ── Document upload ──────────────────────────────────────────────────────────

  async function handleDocUpload(docType: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profileId) return
    setUploadingDoc(docType)
    setDocError(null)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('document_type', docType)
    fd.append('profile_id', profileId)
    const result = await uploadSmsComplianceDocument(fd)
    if (result?.error) setDocError(result.error)
    else router.refresh()
    setUploadingDoc(null)
    e.target.value = ''
  }

  const getUploadedDoc = (type: string) => existing.documents.find(d => d.document_type === type)
  const progressPct = ((step - 1) / 6) * 100
  const ex = getEx(campaign.use_case)

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto">

      {/* Page title */}
      <div className="mb-4">
        <h1 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">US SMS Verification</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Verify your business and messaging use case to send SMS to US phone numbers.
        </p>
      </div>

      {/* ── Black header step bar ─────────────────────────────────────────────── */}
      <div className="bg-[#0c0c0c] rounded-t-xl overflow-hidden">
        {/* Steps row */}
        <div className="flex items-stretch divide-x divide-white/[0.06]">
          {STEPS.map((s) => {
            const Icon   = s.icon
            const done   = step > s.num
            const active = step === s.num
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => done ? setStep(s.num as Step) : undefined}
                className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-3.5 px-1 relative transition-colors ${
                  active ? 'bg-white/[0.07]' :
                  done   ? 'hover:bg-white/[0.04] cursor-pointer' :
                           'cursor-default'
                }`}
              >
                {/* Active indicator line */}
                {active && (
                  <div className="absolute bottom-0 left-3 right-3 h-[2px] bg-[#15A4AE] rounded-full" />
                )}
                <div className={done ? 'text-[#4ade80]' : 'text-white'}>
                  {done
                    ? <CheckCircle2 className="w-3.5 h-3.5" />
                    : <Icon className="w-3.5 h-3.5" />
                  }
                </div>
                <span className="text-[14px] font-medium leading-none whitespace-nowrap text-white">
                  {s.label}
                </span>
              </button>
            )
          })}
        </div>
        {/* Progress track */}
        <div className="h-[2px] bg-white/[0.06]">
          <div
            className="h-full bg-[#15A4AE] transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* ── Floating form card ────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#1a1a1a] rounded-b-xl border-x border-b border-gray-200 dark:border-white/8 shadow-xl shadow-black/[0.06] dark:shadow-black/30 p-6 pb-7">

        {/* Error banner */}
        {error && (
          <div className="mb-5 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-xs text-red-600 dark:text-red-400 flex gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* ── Step 1: Region ─────────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 mb-1">Will you send SMS to US customers?</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Your business does not need to be based in the US. If you send SMS to US numbers, verification is required by carriers.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { value: false, label: 'My business is in the US',      desc: 'US entity sending to US numbers' },
                { value: true,  label: 'My business is outside the US', desc: 'Overseas business, US recipients' },
              ].map(opt => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => sp('is_overseas_business', opt.value)}
                  className={`text-left p-4 rounded-xl border-2 transition-colors ${
                    profile.is_overseas_business === opt.value
                      ? 'border-[#15A4AE] bg-[#15A4AE]/5'
                      : 'border-gray-200 dark:border-white/10 hover:border-[#15A4AE]/40'
                  }`}
                >
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{opt.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
            <Field label="Business type" required>
              <select value={profile.business_type} onChange={e => sp('business_type', e.target.value)} className={selectCls}>
                <option value="">Select business type…</option>
                {BUSINESS_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            {profile.is_overseas_business && (
              <Tip>Overseas businesses are fully supported. You&apos;ll need your local business registration number and a website with a visible privacy policy and SMS opt-in mechanism.</Tip>
            )}
          </div>
        )}

        {/* ── Step 2: Business identity ─────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 mb-1">Business identity</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Must exactly match your official business registration documents.</p>
            </div>
            <Tip>Carrier review teams cross-check your legal name, registration number, and website. Mismatches are a top reason for rejection.</Tip>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Legal business name" required hint="Exactly as registered — no abbreviations">
                <input type="text" value={profile.legal_business_name} onChange={e => sp('legal_business_name', e.target.value)} className={inputCls} placeholder="Acme Corporation Pty Ltd" />
              </Field>
              <Field label="Trading / brand name" hint="Leave blank if same as legal name">
                <input type="text" value={profile.trading_name} onChange={e => sp('trading_name', e.target.value)} className={inputCls} placeholder="Acme" />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label={profile.is_overseas_business ? 'Business registration number' : 'EIN (Employer Identification Number)'}
                required={profile.business_type !== 'sole_proprietor'}
                hint={profile.is_overseas_business ? 'ABN, ACN, NZBN, Companies House number, etc.' : 'Format: XX-XXXXXXX'}
              >
                <input type="text" value={profile.business_registration_number} onChange={e => sp('business_registration_number', e.target.value)} className={inputCls} placeholder={profile.is_overseas_business ? '12 345 678 901' : '12-3456789'} />
              </Field>
              {profile.is_overseas_business && (
                <Field label="Country of registration" required hint="Where the business is legally registered">
                  <input type="text" value={profile.tax_id_country} onChange={e => sp('tax_id_country', e.target.value)} className={inputCls} placeholder="AU" />
                </Field>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Website URL" required hint="Must have a visible privacy policy and SMS opt-in">
                <input type="url" value={profile.website_url} onChange={e => sp('website_url', e.target.value)} className={inputCls} placeholder="https://yoursite.com" />
              </Field>
              <Field label="Industry" required>
                <select value={profile.industry} onChange={e => sp('industry', e.target.value)} className={selectCls}>
                  <option value="">Select industry…</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </Field>
            </div>
            <div className="border-t dark:border-white/8 pt-4 space-y-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Primary contact</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Contact name" required>
                  <input type="text" value={profile.business_contact_name} onChange={e => sp('business_contact_name', e.target.value)} className={inputCls} placeholder="Jane Smith" />
                </Field>
                <Field label="Contact phone" required>
                  <input type="tel" value={profile.business_contact_phone} onChange={e => sp('business_contact_phone', e.target.value)} className={inputCls} placeholder="+1 555 000 0000" />
                </Field>
              </div>
              <Field label="Contact email" required>
                <input type="email" value={profile.business_contact_email} onChange={e => sp('business_contact_email', e.target.value)} className={inputCls} placeholder="jane@yourcompany.com" />
              </Field>
            </div>
            <div className="border-t dark:border-white/8 pt-4 space-y-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Customer support contact</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Support email" hint="Visible on your website">
                  <input type="email" value={profile.support_email} onChange={e => sp('support_email', e.target.value)} className={inputCls} placeholder="support@yourcompany.com" />
                </Field>
                <Field label="Support phone" hint="At least one support channel required">
                  <input type="tel" value={profile.support_phone} onChange={e => sp('support_phone', e.target.value)} className={inputCls} placeholder="+1 800 000 0000" />
                </Field>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Address ───────────────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 mb-1">Business address</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">The registered address of your business entity.</p>
            </div>
            <Field label="Address line 1" required>
              <input type="text" value={profile.business_address_line1} onChange={e => sp('business_address_line1', e.target.value)} className={inputCls} placeholder="123 Main Street" />
            </Field>
            <Field label="Address line 2">
              <input type="text" value={profile.business_address_line2} onChange={e => sp('business_address_line2', e.target.value)} className={inputCls} placeholder="Suite 400" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="City" required>
                <input type="text" value={profile.business_city} onChange={e => sp('business_city', e.target.value)} className={inputCls} placeholder="Sydney" />
              </Field>
              <Field label="State / region" required>
                <input type="text" value={profile.business_state_region} onChange={e => sp('business_state_region', e.target.value)} className={inputCls} placeholder="NSW" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Postcode / ZIP" required>
                <input type="text" value={profile.business_postcode} onChange={e => sp('business_postcode', e.target.value)} className={inputCls} placeholder="2000" />
              </Field>
              <Field label="Country" required>
                <input type="text" value={profile.business_country} onChange={e => sp('business_country', e.target.value)} className={inputCls} placeholder="AU" />
              </Field>
            </div>
          </div>
        )}

        {/* ── Step 4: Use case ──────────────────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 mb-1">Messaging use case</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Describe exactly what kinds of messages you send and why.</p>
            </div>
            <Warn>
              Vague descriptions are the #1 rejection reason. Be specific about what triggers each message. Use &ldquo;Write with Sage&rdquo; to generate compliant text instantly.
            </Warn>

            {/* Use case grid — original 2-column style */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {USE_CASES.map(uc => (
                <button
                  key={uc.value}
                  type="button"
                  onClick={() => sc('use_case', uc.value)}
                  className={`text-left p-3 rounded-xl border-2 transition-colors ${
                    campaign.use_case === uc.value
                      ? 'border-[#15A4AE] bg-[#15A4AE]/5'
                      : 'border-gray-200 dark:border-white/10 hover:border-[#15A4AE]/40'
                  }`}
                >
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{uc.label}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{uc.desc}</p>
                </button>
              ))}
            </div>

            <Field label="Campaign name" required hint="A short internal name for this messaging use case">
              <input type="text" value={campaign.campaign_name} onChange={e => sc('campaign_name', e.target.value)} className={inputCls} placeholder="e.g. Appointment reminders" />
            </Field>

            <Field
              label="Campaign description"
              required
              hint="Describe your business, who you message, what triggers each message, and the value to recipients. Minimum 100 characters."
              charCount={campaign.campaign_description.length}
              minChars={100}
              actions={<>
                <UseThisBtn onClick={() => sc('campaign_description', ex.description)} />
                <SageButton generating={generatingField === 'campaign_description'} onClick={() => handleSageGenerate('campaign_description', v => sc('campaign_description', v))} />
              </>}
            >
              <textarea rows={5} value={campaign.campaign_description} onChange={e => sc('campaign_description', e.target.value)} className={textareaCls} placeholder={ex.description} />
            </Field>

            <Field
              label="Message flow (how customers opt in)"
              required
              hint="Describe the EXACT opt-in mechanism — include the URL, the consent checkbox text, and what confirmation recipients get. Minimum 100 characters."
              charCount={campaign.message_flow.length}
              minChars={100}
              actions={<>
                <UseThisBtn onClick={() => sc('message_flow', ex.flow)} />
                <SageButton generating={generatingField === 'message_flow'} onClick={() => handleSageGenerate('message_flow', v => sc('message_flow', v))} />
              </>}
            >
              <textarea rows={6} value={campaign.message_flow} onChange={e => sc('message_flow', e.target.value)} className={textareaCls} placeholder={ex.flow} />
            </Field>

            <Field
              label="Expected message frequency"
              required
              hint="How often will a typical recipient receive messages?"
              actions={<>
                <UseThisBtn onClick={() => sc('expected_message_frequency', ex.frequency)} />
                <SageButton generating={generatingField === 'expected_message_frequency'} onClick={() => handleSageGenerate('expected_message_frequency', v => sc('expected_message_frequency', v))} />
              </>}
            >
              <input type="text" value={campaign.expected_message_frequency} onChange={e => sc('expected_message_frequency', e.target.value)} className={inputCls} placeholder={ex.frequency} />
            </Field>
          </div>
        )}

        {/* ── Step 5: Consent & opt-in ──────────────────────────────────────── */}
        {step === 5 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 mb-1">Consent & compliance URLs</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Carriers verify your website has a visible privacy policy and a compliant opt-in mechanism.</p>
            </div>
            <Tip>Only send SMS to people who have given explicit permission. For marketing or lead follow-up, upload a screenshot of your opt-in form below.</Tip>
            <Field label="Privacy Policy URL" required hint="Direct URL — must mention SMS and data use">
              <input type="url" value={profile.privacy_policy_url} onChange={e => sp('privacy_policy_url', e.target.value)} className={inputCls} placeholder="https://yoursite.com/privacy" />
            </Field>
            <Field label="Terms & Conditions URL" required hint="Direct URL to your terms of service">
              <input type="url" value={profile.terms_url} onChange={e => sp('terms_url', e.target.value)} className={inputCls} placeholder="https://yoursite.com/terms" />
            </Field>
            <Field label="Opt-in URL" hint="URL of the page where customers opt in">
              <input type="url" value={campaign.opt_in_url} onChange={e => sc('opt_in_url', e.target.value)} className={inputCls} placeholder="https://yoursite.com/book" />
            </Field>

            {profileId && (
              <div className="border-t dark:border-white/8 pt-4 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Supporting documents</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">PDF, JPG, PNG — max 10 MB each.</p>
                </div>
                {docError && <p className="text-xs text-red-500">{docError}</p>}
                {[
                  { type: 'opt_in_screenshot', label: 'Opt-in form screenshot',  desc: 'Screenshot of your consent checkbox and wording', recommended: ['marketing','lead_followup'].includes(campaign.use_case) },
                  { type: 'government_id',     label: 'Government-issued ID',     desc: 'Passport or driver licence of the authorised contact', recommended: false },
                  { type: 'proof_of_address',  label: 'Proof of address',         desc: 'Utility bill or bank statement dated within 3 months', recommended: false },
                  { type: 'business_license',  label: 'Business registration',    desc: 'Certificate of incorporation or business licence', recommended: false },
                ].map(doc => {
                  const uploaded    = getUploadedDoc(doc.type)
                  const isUploading = uploadingDoc === doc.type
                  return (
                    <div key={doc.type} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/[0.03] rounded-lg border border-gray-100 dark:border-white/8">
                      <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${uploaded ? 'bg-green-50 dark:bg-green-500/10' : 'bg-gray-100 dark:bg-white/5'}`}>
                        {uploaded ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <FileText className="w-3.5 h-3.5 text-gray-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{doc.label}</p>
                          {doc.recommended && <span className="text-[10px] bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-medium">Recommended</span>}
                        </div>
                        {uploaded
                          ? <p className="text-[11px] text-gray-400 truncate">{uploaded.file_name}</p>
                          : <p className="text-[11px] text-gray-400">{doc.desc}</p>
                        }
                      </div>
                      <button
                        onClick={() => docRefs.current[doc.type]?.click()}
                        disabled={isUploading}
                        className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg transition-colors disabled:opacity-50 ${
                          uploaded ? 'border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-100' : 'bg-[#15A4AE] hover:bg-[#0e8f99] text-white'
                        }`}
                      >
                        {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                        {isUploading ? 'Uploading…' : uploaded ? 'Replace' : 'Upload'}
                      </button>
                      <input ref={el => { docRefs.current[doc.type] = el }} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={e => handleDocUpload(doc.type, e)} />
                      {uploaded && (
                        <button onClick={() => {}} className="p-1 text-gray-300 hover:text-red-500 rounded transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Step 6: Sample messages ───────────────────────────────────────── */}
        {step === 6 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 mb-1">Sample messages &amp; responses</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Carriers read every sample. Each must reflect real messages you send and contain opt-out instructions.</p>
            </div>
            <Warn>
              Every sample must include &quot;Reply STOP to unsubscribe&quot; or similar — missing this is the #2 rejection reason. Use &ldquo;Write with Sage&rdquo; for instant compliant text.
            </Warn>

            <Field
              label="Sample message 1"
              required
              hint="Must include STOP opt-out instruction."
              charCount={campaign.sample_message_1.length}
              minChars={20}
              actions={<>
                <UseThisBtn onClick={() => sc('sample_message_1', ex.sample1)} />
                <SageButton generating={generatingField === 'sample_message_1'} onClick={() => handleSageGenerate('sample_message_1', v => sc('sample_message_1', v))} />
              </>}
            >
              <textarea rows={3} value={campaign.sample_message_1} onChange={e => sc('sample_message_1', e.target.value)} className={textareaCls} placeholder={ex.sample1} />
            </Field>
            {campaign.sample_message_1 && !campaign.sample_message_1.toUpperCase().includes('STOP') && (
              <p className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Must include STOP instruction</p>
            )}

            <Field
              label="Sample message 2"
              required
              hint="Show a different real message scenario."
              charCount={campaign.sample_message_2.length}
              minChars={20}
              actions={<>
                <UseThisBtn onClick={() => sc('sample_message_2', ex.sample2)} />
                <SageButton generating={generatingField === 'sample_message_2'} onClick={() => handleSageGenerate('sample_message_2', v => sc('sample_message_2', v))} />
              </>}
            >
              <textarea rows={3} value={campaign.sample_message_2} onChange={e => sc('sample_message_2', e.target.value)} className={textareaCls} placeholder={ex.sample2} />
            </Field>
            {campaign.sample_message_2 && !campaign.sample_message_2.toUpperCase().includes('STOP') && (
              <p className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Must include STOP instruction</p>
            )}

            <Field label="Sample message 3 (optional)" hint="Add a third example if your use case varies.">
              <textarea rows={3} value={campaign.sample_message_3} onChange={e => sc('sample_message_3', e.target.value)} className={textareaCls} placeholder="Optional third message scenario…" />
            </Field>

            <div className="border-t dark:border-white/8 pt-4 space-y-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Keyword response messages</p>
              <Tip>These are sent automatically when a recipient replies with a keyword. They must identify your business.</Tip>

              <Field
                label="Opt-in confirmation (reply to START / YES)"
                required
                hint="Must include frequency and opt-out info."
                actions={<>
                  <UseThisBtn onClick={() => sc('opt_in_message', ex.opt_in)} />
                  <SageButton generating={generatingField === 'opt_in_message'} onClick={() => handleSageGenerate('opt_in_message', v => sc('opt_in_message', v))} />
                </>}
              >
                <textarea rows={3} value={campaign.opt_in_message} onChange={e => sc('opt_in_message', e.target.value)} className={textareaCls} placeholder={ex.opt_in} />
              </Field>

              <Field
                label="Opt-out confirmation (reply to STOP)"
                required
                hint="Must confirm no further messages will be sent."
                actions={<SageButton generating={generatingField === 'opt_out_message'} onClick={() => handleSageGenerate('opt_out_message', v => sc('opt_out_message', v))} />}
              >
                <textarea rows={3} value={campaign.opt_out_message} onChange={e => sc('opt_out_message', e.target.value)} className={textareaCls} />
              </Field>

              <Field
                label="HELP response (reply to HELP)"
                required
                hint="Must include your business name and a way to get support."
                actions={<>
                  <UseThisBtn onClick={() => sc('help_message', ex.help)} />
                  <SageButton generating={generatingField === 'help_message'} onClick={() => handleSageGenerate('help_message', v => sc('help_message', v))} />
                </>}
              >
                <textarea rows={3} value={campaign.help_message} onChange={e => sc('help_message', e.target.value)} className={textareaCls} placeholder={ex.help} />
              </Field>
            </div>

            <div className="border-t dark:border-white/8 pt-4 space-y-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Content declarations</p>
              {[
                { key: 'has_embedded_links',                  label: 'Messages contain links (URLs)' },
                { key: 'has_embedded_phone_numbers',          label: 'Messages contain phone numbers' },
                { key: 'age_gated_content',                   label: 'Content is age-gated (18+ only)' },
                { key: 'direct_lending_or_financial_content', label: 'Content relates to direct lending or financial products' },
              ].map(item => (
                <label key={item.key} className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={campaign[item.key as keyof CampaignForm] as boolean}
                    onChange={e => sc(item.key as keyof CampaignForm, e.target.checked)}
                    className="w-3.5 h-3.5 rounded accent-[#15A4AE]"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 7: Review ────────────────────────────────────────────────── */}
        {step === 7 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 mb-1">Review &amp; submit</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Check your details before submitting. Once submitted, your information is reviewed internally before being sent to US carriers.</p>
            </div>
            <div className="bg-gray-50 dark:bg-white/[0.03] rounded-xl border dark:border-white/8 divide-y dark:divide-white/5">
              {[
                { label: 'Business type selected',            ok: !!profile.business_type },
                { label: 'Legal business name',               ok: !!profile.legal_business_name },
                { label: 'Business registration number',      ok: !!profile.business_registration_number || profile.business_type === 'sole_proprietor' },
                { label: 'Business address complete',         ok: !!(profile.business_address_line1 && profile.business_city && profile.business_country) },
                { label: 'Website URL',                       ok: !!profile.website_url },
                { label: 'Privacy Policy URL',                ok: !!profile.privacy_policy_url },
                { label: 'Terms & Conditions URL',            ok: !!profile.terms_url },
                { label: 'Contact name, email, and phone',    ok: !!(profile.business_contact_name && profile.business_contact_email && profile.business_contact_phone) },
                { label: 'Support contact (email or phone)',  ok: !!(profile.support_email || profile.support_phone) },
                { label: 'Use case selected',                 ok: !!campaign.use_case },
                { label: 'Campaign description (100+ chars)', ok: campaign.campaign_description.length >= 100 },
                { label: 'Message flow (100+ chars)',          ok: campaign.message_flow.length >= 100 },
                { label: 'Sample message 1 with STOP',        ok: campaign.sample_message_1.toUpperCase().includes('STOP') },
                { label: 'Sample message 2 with STOP',        ok: campaign.sample_message_2.toUpperCase().includes('STOP') },
                { label: 'Opt-in confirmation message',       ok: !!campaign.opt_in_message },
                { label: 'Opt-out confirmation message',      ok: !!campaign.opt_out_message },
                { label: 'HELP response message',             ok: !!campaign.help_message },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3 px-4 py-2.5">
                  <div className={`w-4 h-4 flex items-center justify-center shrink-0 ${item.ok ? 'text-green-500' : 'text-amber-500'}`}>
                    {item.ok ? <CheckCheck className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  </div>
                  <p className={`text-sm ${item.ok ? 'text-gray-700 dark:text-gray-300' : 'text-amber-700 dark:text-amber-400 font-medium'}`}>{item.label}</p>
                </div>
              ))}
            </div>
            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-4 text-sm text-blue-700 dark:text-blue-400">
              <p className="font-semibold mb-1">What happens after you submit</p>
              <ol className="text-xs space-y-1 list-decimal list-inside leading-relaxed">
                <li>Your details are reviewed internally (usually within 1 business day)</li>
                <li>Once verified, your brand and campaign are submitted to the carrier registry</li>
                <li>Carrier review typically takes 3–7 business days</li>
                <li>You&apos;ll be notified when your account is approved for US SMS</li>
              </ol>
            </div>
            <button
              onClick={handleFinalSubmit}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#15A4AE] hover:bg-[#0e8f99] disabled:opacity-60 text-white font-semibold rounded-xl transition-colors"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Submitting…' : 'Submit for verification'}
            </button>
          </div>
        )}

        {/* ── Navigation ─────────────────────────────────────────────────────── */}
        {step < 7 && (
          <div className="flex items-center justify-between mt-8 pt-5 border-t dark:border-white/8">
            <button
              onClick={() => setStep(s => (s - 1) as Step)}
              disabled={step === 1}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />Back
            </button>
            <button
              onClick={saveAndNext}
              disabled={!canProceed() || saving}
              className="flex items-center gap-1.5 px-5 py-2 bg-[#15A4AE] hover:bg-[#0e8f99] disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {saving ? 'Saving…' : 'Save & continue'}
              {!saving && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        )}

      </div>{/* /floating card */}
    </div>
  )
}
