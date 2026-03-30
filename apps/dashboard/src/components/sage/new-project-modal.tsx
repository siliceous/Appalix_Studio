'use client'

import { useState, useTransition } from 'react'
import { X, Loader2, AlertTriangle } from 'lucide-react'
import { DatePicker } from './date-picker'
import { createProject } from '@/app/actions/sage-projects'
import type { SageContact, SageProjectBoardStage, SageProjectTemplate } from '@/lib/types'

interface Props {
  boardId:   string
  stages:    SageProjectBoardStage[]
  contacts:  Pick<SageContact, 'id' | 'name' | 'email' | 'company_name'>[]
  templates: SageProjectTemplate[]
  onClose:   () => void
  onCreated: (projectId: string) => void
}

const F = 'w-full px-3 py-2 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40'
const L = 'block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5'

const TOP_CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'AED', 'SGD', 'INR', 'JPY', 'CNY']
const ALL_CURRENCIES = [
  'AFN','ALL','AMD','ANG','AOA','ARS','AWG','AZN','BAM','BBD','BDT','BGN','BHD','BIF',
  'BMD','BND','BOB','BRL','BSD','BTN','BWP','BYN','BZD','CDF','CHF','CLP','COP','CRC',
  'CUP','CVE','CZK','DJF','DKK','DOP','DZD','EGP','ERN','ETB','FJD','FKP','GEL','GHS',
  'GIP','GMD','GNF','GTQ','GYD','HKD','HNL','HTG','HUF','IDR','ILS','IQD','IRR','ISK',
  'JMD','JOD','KES','KGS','KHR','KMF','KPW','KRW','KWD','KYD','KZT','LAK','LBP','LKR',
  'LRD','LSL','LYD','MAD','MDL','MGA','MKD','MMK','MNT','MOP','MRU','MUR','MVR','MWK',
  'MXN','MYR','MZN','NAD','NGN','NIO','NOK','NPR','NZD','OMR','PAB','PEN','PGK','PHP',
  'PKR','PLN','PYG','QAR','RON','RSD','RUB','RWF','SAR','SBD','SCR','SDG','SEK','SHP',
  'SLE','SOS','SRD','STN','SYP','SZL','THB','TJS','TMT','TND','TOP','TRY','TTD','TWD',
  'TZS','UAH','UGX','UYU','UZS','VES','VND','VUV','WST','XAF','XCD','XOF','XPF','YER',
  'ZAR','ZMW','ZWL',
]

const CURRENCY_NAMES: Record<string, string> = {
  USD:'US Dollar', EUR:'Euro', GBP:'British Pound', AUD:'Australian Dollar',
  CAD:'Canadian Dollar', AED:'UAE Dirham', SGD:'Singapore Dollar', INR:'Indian Rupee',
  JPY:'Japanese Yen', CNY:'Chinese Yuan',
}

const PROJECT_TYPE_LABELS: Record<string, string> = {
  client_work: 'Client Work',
  internal:    'Internal',
  support:     'Support Case',
  onboarding:  'Client Onboarding',
  custom:      'Custom',
}

export function NewProjectModal({ boardId, stages, contacts, templates, onClose, onCreated }: Props) {
  const [pending, startTransition] = useTransition()
  const [error,   setError]        = useState('')

  // Controlled date fields
  const [startDate,    setStartDate]    = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')

  // Project type drives the template filter
  const [projectType, setProjectType] = useState('client_work')

  // Auto-select default template when project type changes
  const filteredTemplates = templates.filter(t => t.project_type === projectType)
  const [templateId, setTemplateId] = useState<string>(() => {
    const t = templates.find(x => x.project_type === 'client_work' && x.is_default) ?? templates.find(x => x.project_type === 'client_work')
    return t?.id ?? ''
  })

  function handleProjectTypeChange(type: string) {
    setProjectType(type)
    const matched = templates.find(t => t.project_type === type && t.is_default) ?? templates.find(t => t.project_type === type)
    setTemplateId(matched?.id ?? '')
  }

  // Blocker
  const [blockerFlag, setBlockerFlag] = useState(false)

  // Contact autocomplete
  const [contactEmail, setContactEmail] = useState('')
  function onContactChange(e: React.ChangeEvent<HTMLInputElement>) {
    const match = contacts.find(c => c.name.toLowerCase() === e.target.value.trim().toLowerCase())
    setContactEmail(match?.email ?? '')
  }

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd  = new FormData(e.currentTarget)
    const get = (k: string) => (fd.get(k) as string | null) ?? ''

    const name = get('name').trim()
    if (!name) { setError('Project name is required'); return }

    startTransition(async () => {
      const result = await createProject({
        name,
        board_id:       boardId,
        stage_id:       get('stage_id')       || undefined,
        project_type:   (projectType || 'client_work') as 'client_work' | 'internal' | 'support' | 'onboarding' | 'custom',
        template_id:    templateId             || undefined,
        service_type:   get('service_type')   || undefined,
        priority:       (get('priority') || 'medium') as 'low' | 'medium' | 'high',
        status:         (get('status') || 'onboarding') as 'onboarding' | 'active' | 'on_hold' | 'completed' | 'cancelled',
        billing_status: (get('billing_status') || 'not_invoiced') as 'not_invoiced' | 'invoiced' | 'partial' | 'paid',
        source:         (get('source') || undefined) as 'email' | 'bot' | 'forms' | 'manual' | 'ads' | 'deal' | undefined,
        next_action:    get('next_action')    || undefined,
        blocker_flag:   blockerFlag,
        blocker_reason: blockerFlag ? (get('blocker_reason') || undefined) : undefined,
        value:          get('value') ? parseFloat(get('value')) : undefined,
        currency:       get('currency') || 'USD',
        start_date:     startDate    || undefined,
        due_date:       deliveryDate || undefined,
        deliverables:   get('deliverables') || undefined,
        notes:          get('notes')        || undefined,
      })
      if (result.error) { setError(result.error); return }
      onCreated(result.id!)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white dark:bg-[#232323] rounded-2xl border dark:border-white/8 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-white/8 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">New Project</h2>
            <p className="text-xs text-gray-400 mt-0.5">Fill in the project details below</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="px-6 py-5 space-y-5">

            {/* Project name */}
            <div>
              <label className={L}>Project name <span className="text-red-500">*</span></label>
              <input name="name" type="text" required autoFocus placeholder="e.g. Acme Corp Website Redesign" className={F} />
            </div>

            {/* Project type + Template */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={L}>Project type</label>
                <select
                  name="project_type"
                  value={projectType}
                  onChange={e => handleProjectTypeChange(e.target.value)}
                  className={F}
                >
                  {Object.entries(PROJECT_TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={L}>Template</label>
                <select
                  name="template_id"
                  value={templateId}
                  onChange={e => setTemplateId(e.target.value)}
                  className={F}
                >
                  {filteredTemplates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Stage + Service type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={L}>Stage</label>
                <select name="stage_id" className={F}>
                  <option value="">Unassigned</option>
                  {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className={L}>Service type</label>
                <input
                  name="service_type"
                  type="text"
                  list="npm-service-types"
                  placeholder="e.g. Branding, Video Production…"
                  className={F}
                  autoComplete="off"
                />
                <datalist id="npm-service-types">
                  <option value="Web Design" />
                  <option value="SEO" />
                  <option value="Marketing" />
                  <option value="Consulting" />
                  <option value="Branding" />
                  <option value="Social Media" />
                  <option value="Content Writing" />
                  <option value="Video Production" />
                  <option value="Photography" />
                  <option value="App Development" />
                  <option value="E-commerce" />
                  <option value="Email Marketing" />
                  <option value="PPC / Paid Ads" />
                  <option value="PR" />
                  <option value="Graphic Design" />
                  <option value="IT Support" />
                </datalist>
              </div>
            </div>

            {/* Contact + Company */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={L}>Contact <span className="text-gray-400 font-normal">(existing or new)</span></label>
                <input
                  name="contact_name"
                  type="text"
                  list="npm-contacts"
                  placeholder="Type a name…"
                  className={F}
                  autoComplete="off"
                  onChange={onContactChange}
                />
                <input type="hidden" name="contact_email" value={contactEmail} />
                <datalist id="npm-contacts">
                  {contacts.map(c => <option key={c.id} value={c.name} />)}
                </datalist>
              </div>
              <div>
                <label className={L}>Company</label>
                <input name="company_name" type="text" placeholder="e.g. Acme Corp" className={F} />
              </div>
            </div>

            {/* Priority + Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={L}>Priority</label>
                <select name="priority" defaultValue="medium" className={F}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className={L}>Status</label>
                <select name="status" defaultValue="onboarding" className={F}>
                  <option value="onboarding">Onboarding</option>
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Billing status + Source */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={L}>Billing status</label>
                <select name="billing_status" defaultValue="not_invoiced" className={F}>
                  <option value="not_invoiced">Not Invoiced</option>
                  <option value="invoiced">Invoiced</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
              <div>
                <label className={L}>Source</label>
                <select name="source" className={F}>
                  <option value="">Unknown</option>
                  <option value="manual">Manual</option>
                  <option value="deal">From Deal</option>
                  <option value="forms">Form</option>
                  <option value="email">Email</option>
                  <option value="ads">Ads</option>
                  <option value="bot">Bot</option>
                </select>
              </div>
            </div>

            {/* Value + Currency */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={L}>Project value</label>
                <input name="value" type="number" min="0" step="0.01" placeholder="0.00" className={F} />
              </div>
              <div>
                <label className={L}>Currency</label>
                <select name="currency" defaultValue="USD" className={F}>
                  <optgroup label="Common">
                    {TOP_CURRENCIES.map(c => (
                      <option key={c} value={c}>{c}{CURRENCY_NAMES[c] ? ` – ${CURRENCY_NAMES[c]}` : ''}</option>
                    ))}
                  </optgroup>
                  <optgroup label="All currencies">
                    {ALL_CURRENCIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>

            {/* Start date + Delivery date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={L}>Start date</label>
                <DatePicker name="start_date" value={startDate} onChange={setStartDate} placeholder="Pick start date" />
              </div>
              <div>
                <label className={L}>Delivery date</label>
                <DatePicker name="due_date" value={deliveryDate} onChange={setDeliveryDate} placeholder="Pick delivery date" />
              </div>
            </div>

            {/* Next action */}
            <div>
              <label className={L}>Next action</label>
              <input
                name="next_action"
                type="text"
                placeholder="e.g. Send proposal by Friday"
                className={F}
              />
            </div>

            {/* Deliverables */}
            <div>
              <label className={L}>Deliverables</label>
              <textarea
                name="deliverables"
                rows={3}
                placeholder="List the key deliverables for this project…"
                className={`${F} resize-none`}
              />
            </div>

            {/* Notes */}
            <div>
              <label className={L}>Notes <span className="text-gray-400 font-normal">(optional)</span></label>
              <textarea
                name="notes"
                rows={2}
                placeholder="Any additional context or internal notes…"
                className={`${F} resize-none`}
              />
            </div>

            {/* Blocker */}
            <div className="rounded-xl border dark:border-white/8 p-4 space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={blockerFlag}
                  onChange={e => setBlockerFlag(e.target.checked)}
                  className="w-4 h-4 rounded accent-red-500"
                />
                <span className="flex items-center gap-1.5 text-sm font-medium text-gray-800 dark:text-gray-200">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                  Flag as blocked
                </span>
              </label>
              {blockerFlag && (
                <textarea
                  name="blocker_reason"
                  rows={2}
                  placeholder="e.g. Non-payment, not contactable, waiting on assets…"
                  className={`${F} resize-none`}
                />
              )}
            </div>

          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t dark:border-white/8 bg-gray-50 dark:bg-white/[0.02] rounded-b-2xl shrink-0">
            {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={onClose}
                className="flex-1 px-4 py-2 text-sm border dark:border-white/10 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={pending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-60">
                {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {pending ? 'Creating…' : 'Create Project'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
