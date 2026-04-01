'use client'

import { useState, useTransition, useCallback, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Plus, Trash2, Save, Send, CreditCard, Copy, Check,
  Loader2, X, AlertTriangle, ExternalLink, Receipt,
  FileText, Package, Upload, Paperclip, Building2,
  Eye, RefreshCw, Edit3,
} from 'lucide-react'
import {
  createDocument, updateDocument, sendViaStripe, markAsSent,
  acceptQuote, markAsPaid, syncStripeStatus, convertToInvoice,
  createQuickContact, searchContacts,
} from '@/app/actions/sage-documents'
import { createItem } from '@/app/actions/sage-items'
import type { SageDocument, SageDocumentItem, SageDocumentType, SageProject, SageItem } from '@/lib/types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface LineItem {
  id:          string
  item_code:   string
  description: string
  category:    string
  job:         string
  unit:        string
  quantity:    number
  unit_price:  number
  discount:    number
  tax_code:    string
}

interface Attachment {
  id:   string
  name: string
  size: number
  type: string
  url:  string
}

// Editable customer details (populated from contact, then overridable)
interface CustomerDetails {
  name:    string
  company: string
  address: string
  phone:   string
  email:   string
  vat:     string
}

type ContactSuggestion = {
  id:           string
  name:         string
  email:        string | null
  phone:        string | null
  company_name: string | null
  street:       string | null
  city:         string | null
  state:        string | null
  zip:          string | null
  country:      string | null
  vat_number:   string | null
}

interface FromDefaults {
  name:    string
  address: string
  phone:   string
  email:   string
  abnVat:  string
  logoUrl: string
  color:   string
}

interface Props {
  mode:         'new' | 'edit'
  docType?:     SageDocumentType
  document?:    SageDocument
  contacts:     ContactSuggestion[]
  projects:     Pick<SageProject, 'id' | 'name'>[]
  items:        SageItem[]
  fromDefaults?: FromDefaults
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount)
}
function today() { return new Date().toISOString().slice(0, 10) }
function emptyItem(): LineItem {
  return { id: crypto.randomUUID(), item_code: '', description: '', category: '', job: '', unit: '', quantity: 1, unit_price: 0, discount: 0, tax_code: '' }
}
function fmtFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const STATUS_BADGE: Record<string, string> = {
  draft:    'bg-gray-100 text-gray-600 dark:bg-gray-700/40 dark:text-gray-400',
  sent:     'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
  accepted: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  declined: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  invoiced: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400',
  paid:     'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  partial:  'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  overdue:  'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  void:     'bg-gray-100 text-gray-500 dark:bg-gray-700/40 dark:text-gray-500',
}

const CURRENCIES = ['AUD','USD','EUR','GBP','CAD','SGD','INR','AED','CHF','JPY','NZD','HKD']

// ── New Contact Modal ─────────────────────────────────────────────────────────

function NewContactModal({ onClose, onCreated }: {
  onClose: () => void
  onCreated: (c: ContactSuggestion) => void
}) {
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [phone, setPhone]     = useState('')
  const [company, setCompany] = useState('')
  const [saving, setSaving]   = useState(false)
  const [err, setErr]         = useState('')
  const FIELD = 'w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 placeholder:text-gray-400'
  const LABEL = 'block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setErr('Name is required'); return }
    setSaving(true)
    const res = await createQuickContact({ name: name.trim(), email: email || undefined, phone: phone || undefined, company_name: company || undefined })
    if (res.error) { setErr(res.error); setSaving(false); return }
    onCreated({ id: res.id!, name: name.trim(), email: email || null, phone: phone || null, company_name: company || null, street: null, city: null, state: null, zip: null, country: null, vat_number: null })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/8">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">New Contact</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-3">
          {err && <p className="text-xs text-red-500">{err}</p>}
          <div><label className={LABEL}>Name *</label><input className={FIELD} value={name} onChange={e => setName(e.target.value)} placeholder="Full name" /></div>
          <div><label className={LABEL}>Email</label><input className={FIELD} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" /></div>
          <div><label className={LABEL}>Phone</label><input className={FIELD} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+61 400 000 000" /></div>
          <div><label className={LABEL}>Company</label><input className={FIELD} value={company} onChange={e => setCompany(e.target.value)} placeholder="Company name" /></div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium flex items-center justify-center gap-1.5 transition-colors">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Create Contact
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── New Item Modal ────────────────────────────────────────────────────────────

function NewItemModal({ prefill, onClose, onCreated }: {
  prefill: Partial<LineItem>
  onClose: () => void
  onCreated: (item: SageItem) => void
}) {
  const [itemCode,    setItemCode]    = useState(prefill.item_code    ?? '')
  const [description, setDescription] = useState(prefill.description  ?? '')
  const [category,    setCategory]    = useState(prefill.category     ?? '')
  const [job,         setJob]         = useState(prefill.job          ?? '')
  const [taxCode,     setTaxCode]     = useState(prefill.tax_code     ?? '')
  const [unit,        setUnit]        = useState(prefill.unit         ?? '')
  const [unitPrice,   setUnitPrice]   = useState(prefill.unit_price   ?? 0)
  const [saving,      setSaving]      = useState(false)
  const [err,         setErr]         = useState('')
  const FIELD = 'w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 placeholder:text-gray-400'
  const LABEL = 'block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!itemCode.trim()) { setErr('Item ID is required'); return }
    setSaving(true)
    const res = await createItem({ item_code: itemCode.trim(), description, category: category || undefined, job: job || undefined, tax_code: taxCode || undefined, unit: unit || undefined, unit_price: unitPrice })
    if (res.error) { setErr(res.error); setSaving(false); return }
    onCreated({ id: res.id!, workspace_id: '', item_code: itemCode.trim(), description, category: category || null, job: job || null, tax_code: taxCode || null, unit: unit || null, unit_price: unitPrice, deleted_at: null, created_at: '', updated_at: '' })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/8">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Save Item to Catalog</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-3">
          {err && <p className="text-xs text-red-500">{err}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div><label className={LABEL}>Item ID *</label><input className={FIELD} value={itemCode} onChange={e => setItemCode(e.target.value)} placeholder="WEB-001" /></div>
            <div><label className={LABEL}>Unit</label><input className={FIELD} value={unit} onChange={e => setUnit(e.target.value)} placeholder="hr, ea, kg…" /></div>
          </div>
          <div><label className={LABEL}>Description</label><input className={FIELD} value={description} onChange={e => setDescription(e.target.value)} placeholder="Item description" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={LABEL}>Category</label><input className={FIELD} value={category} onChange={e => setCategory(e.target.value)} placeholder="Services" /></div>
            <div><label className={LABEL}>Job</label><input className={FIELD} value={job} onChange={e => setJob(e.target.value)} placeholder="Job code" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={LABEL}>Tax Code</label><input className={FIELD} value={taxCode} onChange={e => setTaxCode(e.target.value)} placeholder="GST, VAT, N-T" /></div>
            <div><label className={LABEL}>Default Unit Price</label><input className={FIELD} type="number" min="0" step="any" value={unitPrice} onChange={e => setUnitPrice(parseFloat(e.target.value) || 0)} /></div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium flex items-center justify-center gap-1.5 transition-colors">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Save Item
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Inline editable text ──────────────────────────────────────────────────────

function EditableText({ value, onChange, placeholder, className, multiline }: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  multiline?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null)

  useEffect(() => { if (editing) ref.current?.focus() }, [editing])

  const display = value || <span className="text-gray-300 dark:text-gray-600 italic">{placeholder ?? 'Click to edit'}</span>

  if (editing) {
    const shared = {
      ref,
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
      onBlur: () => setEditing(false),
      className: `w-full bg-transparent border-0 border-b border-blue-400 focus:outline-none text-inherit placeholder:text-gray-300 dark:placeholder:text-gray-600 ${className ?? ''}`,
      placeholder,
    }
    return multiline
      ? <textarea {...shared as React.TextareaHTMLAttributes<HTMLTextAreaElement>} rows={3} style={{ resize: 'none' }} />
      : <input {...shared as React.InputHTMLAttributes<HTMLInputElement>} />
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={`cursor-text hover:bg-blue-50/50 dark:hover:bg-blue-500/5 rounded px-0.5 -mx-0.5 transition-colors ${className ?? ''}`}
    >
      {display}
    </span>
  )
}

// ── Preview Modal ─────────────────────────────────────────────────────────────

function PreviewModal({
  onClose, onConfirm, onEdit, isSaving,
  docType, docNumber, issueDate, dueDate, validUntil, currency, taxRate, taxInclusive,
  customer, fromName, fromAddress, logoUrl, accentColor,
  lineItems, notes, terms, subtotal, taxAmt, total, balanceDue, amountPaid,
}: {
  onClose: () => void
  onConfirm: () => void
  onEdit: () => void
  isSaving: boolean
  docType: SageDocumentType
  docNumber: string
  issueDate: string
  dueDate: string
  validUntil: string
  currency: string
  taxRate: number
  taxInclusive: boolean
  customer: CustomerDetails
  fromName: string
  fromAddress: string
  logoUrl: string
  accentColor: string
  lineItems: LineItem[]
  notes: string
  terms: string
  subtotal: number
  taxAmt: number
  total: number
  balanceDue: number
  amountPaid: number
}) {
  const typeLabel = docType === 'quote' ? 'QUOTE' : docType === 'packing_list' ? 'PACKING LIST' : 'INVOICE'
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-8 px-4">
      <div className="w-full max-w-[860px]">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={onEdit} className="flex items-center gap-1.5 text-sm text-white/80 hover:text-white transition-colors">
            <Edit3 className="w-4 h-4" /> Back to edit
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-white/70 hover:text-white border border-white/20 hover:border-white/40 transition-colors">
              Close
            </button>
            <button onClick={onConfirm} disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold bg-white text-gray-900 hover:bg-gray-100 disabled:opacity-50 transition-colors shadow-lg">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Confirm &amp; Save
            </button>
          </div>
        </div>

        {/* A4 page */}
        <div className="bg-white shadow-2xl rounded-sm" style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: '#1a1a1a' }}>
          <div className="px-16 py-14">

            {/* Header: logo + title */}
            <div className="flex items-start justify-between mb-12">
              <div>
                {logoUrl
                  ? <img src={logoUrl} alt="Logo" className="h-14 max-w-[160px] object-contain mb-2" />
                  : <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-2" style={{ backgroundColor: accentColor + '20' }}>
                      <Building2 className="w-7 h-7" style={{ color: accentColor }} />
                    </div>
                }
                {fromName && <p className="text-sm font-semibold text-gray-800">{fromName}</p>}
                {fromAddress && <p className="text-xs text-gray-500 whitespace-pre-line mt-0.5">{fromAddress}</p>}
              </div>
              <div className="text-right">
                <h1 className="text-4xl font-bold tracking-tight" style={{ color: accentColor }}>{typeLabel}</h1>
                {docNumber && <p className="text-sm text-gray-500 mt-1">#{docNumber}</p>}
              </div>
            </div>

            {/* Bill To + Meta */}
            <div className="flex items-start justify-between mb-10">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Bill To</p>
                {customer.company && <p className="text-sm font-bold text-gray-900">{customer.company}</p>}
                {customer.name    && <p className="text-sm text-gray-700">{customer.name}</p>}
                {customer.address && <p className="text-xs text-gray-500 whitespace-pre-line mt-1">{customer.address}</p>}
                {customer.phone   && <p className="text-xs text-gray-500 mt-0.5">{customer.phone}</p>}
                {customer.email   && <p className="text-xs text-gray-500">{customer.email}</p>}
                {customer.vat     && <p className="text-xs text-gray-500 mt-0.5">VAT/Tax No: {customer.vat}</p>}
              </div>
              <div className="text-right space-y-1.5">
                <div className="flex items-center gap-8 justify-end">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Issue Date</span>
                  <span className="text-sm text-gray-700">{fmtDate(issueDate)}</span>
                </div>
                {(docType === 'quote' ? validUntil : dueDate) && (
                  <div className="flex items-center gap-8 justify-end">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{docType === 'quote' ? 'Valid Until' : 'Due Date'}</span>
                    <span className="text-sm text-gray-700">{fmtDate(docType === 'quote' ? validUntil : dueDate)}</span>
                  </div>
                )}
                <div className="flex items-center gap-8 justify-end">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Currency</span>
                  <span className="text-sm text-gray-700">{currency}</span>
                </div>
                <div className="flex items-center gap-8 justify-end">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Tax</span>
                  <span className="text-sm text-gray-700">{taxRate}% {taxInclusive ? '(incl.)' : '(excl.)'}</span>
                </div>
              </div>
            </div>

            {/* Line items */}
            <table className="w-full mb-8" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${accentColor}` }}>
                  <th className="text-left py-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 pr-4">Item ID</th>
                  <th className="text-left py-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">Description</th>
                  <th className="text-center py-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 px-3">Unit</th>
                  <th className="text-right py-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 px-3">Qty</th>
                  <th className="text-right py-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 px-3">Unit Price</th>
                  <th className="text-right py-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 pl-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.filter(i => i.description || i.item_code).map((item, idx) => {
                  const amount = item.quantity * item.unit_price * (1 - item.discount / 100)
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td className="py-3 text-xs text-gray-500 pr-4 align-top">{item.item_code || '—'}</td>
                      <td className="py-3 text-sm text-gray-800 align-top">
                        {item.description}
                        {item.discount > 0 && <span className="text-xs text-gray-400 ml-2">({item.discount}% off)</span>}
                      </td>
                      <td className="py-3 text-xs text-gray-500 text-center px-3 align-top">{item.unit || '—'}</td>
                      <td className="py-3 text-sm text-gray-700 text-right px-3 align-top tabular-nums">{item.quantity}</td>
                      <td className="py-3 text-sm text-gray-700 text-right px-3 align-top tabular-nums">{fmt(item.unit_price, currency)}</td>
                      <td className="py-3 text-sm font-medium text-gray-900 text-right pl-3 align-top tabular-nums">{fmt(amount, currency)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end mb-10">
              <div className="w-72 space-y-1.5">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{fmt(subtotal, currency)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Tax ({taxRate}%)</span>
                  <span className="tabular-nums">{fmt(taxAmt, currency)}</span>
                </div>
                {amountPaid > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Amount Paid</span>
                    <span className="tabular-nums text-emerald-600">–{fmt(amountPaid, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-3 mt-1" style={{ borderTop: `2px solid ${accentColor}` }}>
                  <span className="text-base font-bold text-gray-900">Balance Due</span>
                  <span className="text-xl font-bold tabular-nums" style={{ color: accentColor }}>{fmt(balanceDue, currency)}</span>
                </div>
              </div>
            </div>

            {/* Notes + Terms */}
            {(notes || terms) && (
              <div className="pt-8" style={{ borderTop: '1px solid #e5e7eb' }}>
                {notes && (
                  <div className="mb-5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Notes</p>
                    <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{notes}</p>
                  </div>
                )}
                {terms && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Terms &amp; Conditions</p>
                    <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{terms}</p>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function DocumentBuilder({ mode, docType: docTypeProp, document: doc, contacts: initialContacts, projects, items: initialItems, fromDefaults }: Props) {
  const router      = useRouter()
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [docType,      setDocType]     = useState<SageDocumentType>(doc?.doc_type ?? docTypeProp ?? 'invoice')
  const [lineItems,    setLineItems]   = useState<LineItem[]>(() =>
    doc?.items?.length
      ? doc.items.map((i: SageDocumentItem) => ({
          id: i.id, item_code: i.item_code ?? '', description: i.description,
          category: i.category ?? '', job: i.job ?? '', unit: i.unit ?? '',
          quantity: i.quantity, unit_price: i.unit_price, discount: i.discount ?? 0, tax_code: i.tax_code ?? '',
        }))
      : [emptyItem()]
  )
  const [contacts,       setContacts]    = useState(initialContacts)
  const [catalog,        setCatalog]     = useState<SageItem[]>(initialItems)
  const [contactId,      setContactId]   = useState(doc?.contact_id ?? '')
  const [_contactSearch, setContactSearch] = useState(doc?.contact?.name ?? '')
  const [showContacts,   setShowContacts]  = useState(false)
  const [activeSearchField, setActiveSearchField] = useState<'company' | 'person' | null>(null)
  const [projectId,      setProjectId]   = useState(doc?.project_id ?? '')
  const [currency,       setCurrency]    = useState(doc?.currency ?? 'AUD')
  const [issueDate,      setIssueDate]   = useState(doc?.issue_date ?? today())
  const [dueDate,        setDueDate]     = useState(doc?.due_date ?? '')
  const [validUntil,     setValidUntil]  = useState(doc?.valid_until ?? '')
  const [customerPo,     setCustomerPo]  = useState((doc as any)?.customer_po ?? '')
  const [taxInclusive,   setTaxInclusive] = useState((doc as any)?.tax_inclusive ?? false)
  const [taxRate,        setTaxRate]     = useState(doc?.tax_rate ?? 10)
  const [notes,          setNotes]       = useState(doc?.notes ?? '')
  const [terms,          setTerms]       = useState(doc?.terms ?? '')
  const [fromName,       setFromName]    = useState((doc as any)?.from_name ?? fromDefaults?.name ?? '')
  const [fromAddress,    setFromAddress] = useState(() => {
    if ((doc as any)?.from_address) return (doc as any).from_address as string
    if (!fromDefaults) return ''
    return [
      fromDefaults.address,
      fromDefaults.phone,
      fromDefaults.email,
      fromDefaults.abnVat,
    ].filter(Boolean).join(' · ')
  })
  const [accentColor,    setAccentColor] = useState(doc?.accent_color ?? fromDefaults?.color   ?? '#1a1a1a')
  const [logoUrl,        setLogoUrl]     = useState(doc?.logo_url     ?? fromDefaults?.logoUrl ?? '')
  const [attachments,    setAttachments] = useState<Attachment[]>(() => {
    const raw = (doc as any)?.attachments
    return Array.isArray(raw) ? (raw as Attachment[]) : []
  })
  const [amountPaid, setAmountPaid] = useState((doc as any)?.amount_paid ?? 0)

  // Editable customer details
  const [customer, setCustomer] = useState<CustomerDetails>({
    name: '', company: '', address: '', phone: '', email: '', vat: '',
  })

  function updateCustomer(field: keyof CustomerDetails, value: string) {
    setCustomer(p => ({ ...p, [field]: value }))
  }

  const [saved,          setSaved]         = useState(false)
  const [paymentLink,    setPaymentLink]   = useState(doc?.stripe_payment_link ?? '')
  const [copied,         setCopied]        = useState(false)
  const [error,          setError]         = useState('')
  const [docStatus,      setDocStatus]     = useState(doc?.status ?? 'draft')
  const [showNewContact, setShowNewContact] = useState(false)
  const [newItemPrefill, setNewItemPrefill] = useState<Partial<LineItem> | null>(null)
  const [showPreview,    setShowPreview]   = useState(false)

  // Totals
  const { subtotal, taxAmt, total, balanceDue } = useMemo(() => {
    const subtotal = lineItems.reduce((s, i) => s + i.quantity * i.unit_price * (1 - i.discount / 100), 0)
    const taxAmt   = subtotal * (taxRate / 100)
    const total    = subtotal + taxAmt
    return { subtotal, taxAmt, total, balanceDue: total - amountPaid }
  }, [lineItems, taxRate, amountPaid])

  // Item management
  const addItem    = useCallback(() => setLineItems(p => [...p, emptyItem()]), [])
  const removeItem = useCallback((id: string) => setLineItems(p => p.length > 1 ? p.filter(i => i.id !== id) : p), [])
  const updateItem = useCallback((id: string, field: keyof Omit<LineItem, 'id'>, value: string | number) => {
    setLineItems(p => p.map(i => i.id === id ? { ...i, [field]: value } : i))
  }, [])

  const [contactResults, setContactResults] = useState<ContactSuggestion[]>(contacts.slice(0, 8))
  const [contactLoading, setContactLoading] = useState(false)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function onContactSearchChange(q: string) {
    setContactSearch(q)
    setContactId('')
    setShowContacts(true)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(async () => {
      setContactLoading(true)
      const results = await searchContacts(q)
      setContactResults(results)
      setContactLoading(false)
    }, 250)
  }

  function selectContact(c: ContactSuggestion) {
    setContactId(c.id)
    setContactSearch(c.name)
    setShowContacts(false)
    setActiveSearchField(null)
    const addrParts = [c.street, c.city, c.state, c.zip, c.country].filter(Boolean)
    setCustomer({
      name:    c.name,
      company: c.company_name || '',
      address: addrParts.join(', '),
      phone:   c.phone || '',
      email:   c.email || '',
      vat:     c.vat_number || '',
    })
  }

  function handleContactCreated(c: ContactSuggestion) {
    setContacts(p => [c, ...p]); selectContact(c); setShowNewContact(false)
  }
  function handleItemCreated(item: SageItem) {
    setCatalog(p => [...p, item]); setNewItemPrefill(null)
  }
  function processFiles(files: FileList | null) {
    if (!files) return
    Array.from(files).forEach(file => {
      if (file.size > 10 * 1024 * 1024) { setError(`${file.name} exceeds 10 MB`); return }
      const reader = new FileReader()
      reader.onload = ev => setAttachments(p => [...p, { id: crypto.randomUUID(), name: file.name, size: file.size, type: file.type, url: ev.target?.result as string }])
      reader.readAsDataURL(file)
    })
  }

  async function handleSave() {
    setError('')
    startTransition(async () => {
      const payload = {
        contact_id: contactId || undefined, project_id: projectId || undefined,
        currency, issue_date: issueDate,
        due_date: dueDate || undefined, valid_until: validUntil || undefined,
        tax_rate: taxRate, tax_inclusive: taxInclusive,
        customer_po: customerPo || undefined,
        notes: notes || undefined, terms: terms || undefined,
        from_name: fromName || undefined, from_address: fromAddress || undefined,
        accent_color: accentColor, logo_url: logoUrl || undefined,
        attachments: attachments.map(a => ({ name: a.name, url: a.url, size: a.size, type: a.type })),
        items: lineItems.map((it, idx) => ({
          item_code: it.item_code || undefined, description: it.description,
          category: it.category || undefined, job: it.job || undefined,
          tax_code: it.tax_code || undefined, unit: it.unit || undefined,
          quantity: it.quantity, unit_price: it.unit_price, discount: it.discount, order_index: idx,
        })),
      }
      if (mode === 'new') {
        const res = await createDocument({ doc_type: docType, ...payload })
        if (res.error) { setError(res.error); return }
        router.replace(`/sage/quotes/${res.id}`)
      } else {
        const res = await updateDocument(doc!.id, payload)
        if (res.error) { setError(res.error); return }
        setSaved(true); setTimeout(() => setSaved(false), 2000)
      }
    })
  }

  async function handleSendViaStripe() {
    if (!doc) return; setError('')
    startTransition(async () => {
      const res = await sendViaStripe(doc.id)
      if (res.error) { setError(res.error); return }
      setPaymentLink(res.payment_link ?? ''); setDocStatus('sent')
    })
  }
  async function handleMarkAsSent() {
    if (!doc) return
    startTransition(async () => { const res = await markAsSent(doc.id); if (res.error) { setError(res.error); return }; setDocStatus('sent') })
  }
  async function handleAcceptQuote() {
    if (!doc) return
    startTransition(async () => { const res = await acceptQuote(doc.id); if (res.error) { setError(res.error); return }; setDocStatus('accepted') })
  }
  async function handleConvertToInvoice() {
    if (!doc) return
    startTransition(async () => { const res = await convertToInvoice(doc.id); if (res.error) { setError(res.error); return }; router.push(`/sage/quotes/${res.id}`) })
  }
  async function handleSyncStripe() {
    if (!doc) return
    startTransition(async () => { const res = await syncStripeStatus(doc.id); if (res.error) { setError(res.error); return }; if (res.status) setDocStatus(res.status) })
  }
  async function handleMarkPaid() {
    if (!doc) return
    startTransition(async () => { const res = await markAsPaid(doc.id); if (res.error) { setError(res.error); return }; setDocStatus('paid') })
  }
  function copyLink() { navigator.clipboard.writeText(paymentLink); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  const typeLabel = docType === 'quote' ? 'Quote' : docType === 'packing_list' ? 'Packing List' : 'Invoice'

  // Shared input/label styles for the A4 form
  const INPUT = 'w-full bg-transparent border-0 border-b border-gray-200 dark:border-white/10 focus:border-blue-400 dark:focus:border-blue-500 focus:outline-none text-sm text-gray-800 dark:text-gray-200 py-1 placeholder:text-gray-300 dark:placeholder:text-gray-600 transition-colors'
  const MINI_LABEL = 'text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1'
  const CELL = 'w-full bg-transparent border border-transparent hover:border-gray-200 dark:hover:border-white/10 focus:border-blue-400 dark:focus:border-blue-500 rounded px-1.5 py-1 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:bg-blue-50/50 dark:focus:bg-blue-500/5 placeholder:text-gray-300 dark:placeholder:text-gray-600 transition-colors'

  return (
    <div className="h-full flex flex-col bg-gray-100 dark:bg-[#111]">

      {showNewContact && <NewContactModal onClose={() => setShowNewContact(false)} onCreated={handleContactCreated} />}
      {newItemPrefill !== null && <NewItemModal prefill={newItemPrefill} onClose={() => setNewItemPrefill(null)} onCreated={handleItemCreated} />}
      {showPreview && (
        <PreviewModal
          onClose={() => setShowPreview(false)}
          onEdit={() => setShowPreview(false)}
          onConfirm={() => { setShowPreview(false); handleSave() }}
          isSaving={isPending}
          docType={docType}
          docNumber={mode === 'edit' && doc?.doc_number ? doc.doc_number : ''}
          issueDate={issueDate}
          dueDate={dueDate}
          validUntil={validUntil}
          currency={currency}
          taxRate={taxRate}
          taxInclusive={taxInclusive}
          customer={customer}
          fromName={fromName}
          fromAddress={fromAddress}
          logoUrl={logoUrl}
          accentColor={accentColor}
          lineItems={lineItems}
          notes={notes}
          terms={terms}
          subtotal={subtotal}
          taxAmt={taxAmt}
          total={total}
          balanceDue={balanceDue}
          amountPaid={amountPaid}
        />
      )}

      {/* ── Top bar ── */}
      <div className="flex items-center gap-3 px-5 py-2.5 border-b border-gray-200 dark:border-white/8 bg-white dark:bg-[#1a1a1a] shrink-0 flex-wrap">
        <Link href="/sage/quotes" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors">
          <ArrowLeft className="w-4 h-4" />Back
        </Link>
        <div className="h-4 w-px bg-gray-200 dark:bg-white/10" />

        {/* Doc type tabs */}
        <div className="flex items-center gap-1">
          {([
            { type: 'quote'        as const, icon: <FileText className="w-3.5 h-3.5" />, label: 'Quote'        },
            { type: 'packing_list' as const, icon: <Package  className="w-3.5 h-3.5" />, label: 'Packing List' },
            { type: 'invoice'      as const, icon: <Receipt  className="w-3.5 h-3.5" />, label: 'Invoice'      },
          ]).map(({ type, icon, label }) => (
            <button key={type} onClick={() => setDocType(type)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                docType === type ? 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
              }`}>
              {icon}{label}
            </button>
          ))}
        </div>

        {mode === 'edit' && doc?.doc_number && <span className="text-sm text-gray-400">{doc.doc_number}</span>}
        {mode === 'edit' && (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[docStatus] ?? STATUS_BADGE.draft}`}>
            {docStatus.charAt(0).toUpperCase() + docStatus.slice(1)}
          </span>
        )}
        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <button onClick={() => setShowPreview(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 transition-colors">
            <Eye className="w-3.5 h-3.5" />Preview
          </button>
          <button onClick={handleSave} disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 text-white dark:text-gray-900 transition-colors">
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            {saved ? 'Saved' : 'Save'}
          </button>
          {mode === 'edit' && docStatus === 'draft' && docType === 'invoice' && (
            <button onClick={handleSendViaStripe} disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white transition-colors">
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
              Send &amp; Collect
            </button>
          )}
          {mode === 'edit' && docStatus === 'draft' && docType !== 'invoice' && (
            <button onClick={handleMarkAsSent} disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white transition-colors">
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Mark Sent
            </button>
          )}
          {mode === 'edit' && docStatus === 'sent' && docType === 'quote' && (
            <button onClick={handleAcceptQuote} disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition-colors">
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Mark Accepted
            </button>
          )}
          {mode === 'edit' && docStatus === 'accepted' && (
            <button onClick={handleConvertToInvoice} disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white transition-colors">
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Receipt className="w-3.5 h-3.5" />}
              Convert to Invoice
            </button>
          )}
          {mode === 'edit' && docStatus === 'sent' && docType === 'invoice' && (
            <>
              {doc?.stripe_invoice_id && (
                <button onClick={handleSyncStripe} disabled={isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-50 disabled:opacity-50 text-gray-700 dark:text-gray-300 transition-colors">
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Sync Stripe
                </button>
              )}
              <button onClick={handleMarkPaid} disabled={isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition-colors">
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Mark Paid
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-6 py-2.5 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm shrink-0">
          <AlertTriangle className="w-4 h-4 shrink-0" /><span className="flex-1">{error}</span>
          <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ── A4 Document Body ── */}
      <div className="flex-1 overflow-y-auto py-8 px-4">
        <div className="max-w-[860px] mx-auto bg-white dark:bg-[#1c1c1c] shadow-xl rounded-sm"
          style={{ minHeight: '1123px' }}>
          <div className="px-14 py-12">

            {/* ── HEADER: Doc type + accent left, logo + from info right ── */}
            <div className="flex items-start justify-between mb-10">

              {/* Left: doc type selector + colour picker */}
              <div className="shrink-0">
                <div className="flex items-center gap-1 mb-3">
                  {([
                    { type: 'quote' as const, label: 'QUOTE' },
                    { type: 'packing_list' as const, label: 'PACKING LIST' },
                    { type: 'invoice' as const, label: 'INVOICE' },
                  ]).map(({ type, label }) => (
                    <button key={type} onClick={() => setDocType(type)}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded transition-colors ${
                        docType === type
                          ? 'text-white'
                          : 'text-gray-300 dark:text-gray-600 hover:text-gray-500'
                      }`}
                      style={docType === type ? { backgroundColor: accentColor } : {}}>
                      {label}
                    </button>
                  ))}
                </div>
                {mode === 'edit' && doc?.doc_number && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">#{doc.doc_number}</p>
                )}
                {/* Colour picker */}
                <div className="flex items-center gap-1">
                  {['#1a1a1a','#2563eb','#6d28d9','#0891b2','#059669','#dc2626','#ea580c','#ca8a04'].map(c => (
                    <button key={c} onClick={() => setAccentColor(c)}
                      className={`w-4 h-4 rounded-full border-2 transition-all hover:scale-110 ${accentColor === c ? 'border-gray-900 dark:border-white' : 'border-transparent'}`}
                      style={{ backgroundColor: c }} />
                  ))}
                  <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)}
                    className="w-5 h-5 rounded-full border border-gray-200 dark:border-white/10 cursor-pointer bg-transparent p-0 ml-1" />
                </div>
              </div>

              {/* Right: logo + company name + address */}
              <div className="text-right ml-8 flex-1 max-w-xs">
                <div className="flex items-start gap-3 justify-end">
                  <div className="flex-1 text-right">
                    <input value={fromName} onChange={e => setFromName(e.target.value)}
                      placeholder="Your company name"
                      className="block w-full text-base font-semibold text-gray-900 dark:text-gray-100 bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-400 dark:focus:border-blue-500 focus:outline-none py-0.5 text-right placeholder:text-gray-300 dark:placeholder:text-gray-600 transition-colors" />
                    <textarea value={fromAddress} onChange={e => setFromAddress(e.target.value)}
                      placeholder="Address · ABN/VAT · Phone · Email"
                      rows={2} style={{ resize: 'none' }}
                      className="block w-full text-xs text-gray-500 dark:text-gray-400 bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-400 dark:focus:border-blue-500 focus:outline-none mt-1 text-right placeholder:text-gray-300 dark:placeholder:text-gray-600 transition-colors" />
                  </div>
                  {/* Logo upload */}
                  <label className="cursor-pointer group block shrink-0">
                    <input type="file" accept="image/*" className="sr-only"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        if (file.size > 500_000) { setError('Logo must be under 500 KB'); return }
                        const reader = new FileReader()
                        reader.onload = ev => setLogoUrl(ev.target?.result as string)
                        reader.readAsDataURL(file)
                      }} />
                    {logoUrl
                      ? <div className="relative">
                          <img src={logoUrl} alt="Logo" className="h-12 max-w-[120px] object-contain rounded border border-gray-100 dark:border-white/10" />
                          <button type="button" onClick={e => { e.preventDefault(); setLogoUrl('') }}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold">×</button>
                        </div>
                      : <div className="w-14 h-12 rounded-lg bg-gray-50 dark:bg-white/5 border-2 border-dashed border-gray-200 dark:border-white/15 flex flex-col items-center justify-center hover:border-gray-400 transition-colors">
                          <Building2 className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                          <span className="text-[9px] text-gray-300 dark:text-gray-600 mt-0.5">Logo</span>
                        </div>
                    }
                  </label>
                </div>
              </div>
            </div>

            {/* ── BILL TO + DOCUMENT META ── */}
            <div className="flex items-start gap-10 mb-10">

              {/* Left: Customer */}
              <div className="flex-1">
                {/* Editable customer fields */}
                <div className="space-y-2">

                  {/* Company Name — live contact search */}
                  <div className="relative">
                    <p className={MINI_LABEL}>Company Name</p>
                    <div className="relative">
                      <input
                        value={customer.company}
                        onChange={e => {
                          updateCustomer('company', e.target.value)
                          setActiveSearchField('company')
                          onContactSearchChange(e.target.value)
                        }}
                        onFocus={() => {
                          setActiveSearchField('company')
                          setShowContacts(true)
                          if (!customer.company) setContactResults(contacts.slice(0, 8))
                        }}
                        onBlur={() => setTimeout(() => { setShowContacts(false); setActiveSearchField(null) }, 150)}
                        placeholder="Company name"
                        className={INPUT}
                      />
                      {contactLoading && activeSearchField === 'company' && (
                        <Loader2 className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 animate-spin" />
                      )}
                    </div>
                    {showContacts && activeSearchField === 'company' && (
                      <div className="absolute top-full left-0 z-20 mt-1 w-full bg-white dark:bg-[#222] border border-gray-200 dark:border-white/10 rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
                        {contactResults.map(c => (
                          <button key={c.id} type="button" onMouseDown={() => selectContact(c)}
                            className="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors flex items-center gap-2 border-b border-gray-50 dark:border-white/5 last:border-0">
                            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 text-xs font-semibold shrink-0">
                              {c.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{c.name}</p>
                              {(c.company_name || c.email) && (
                                <p className="text-xs text-gray-400 truncate">{c.company_name ?? c.email}</p>
                              )}
                            </div>
                          </button>
                        ))}
                        {contactResults.length === 0 && !contactLoading && (
                          <p className="px-3 py-2 text-xs text-gray-400">No contacts found</p>
                        )}
                        <button type="button" onMouseDown={() => { setShowContacts(false); setActiveSearchField(null); setShowNewContact(true) }}
                          className="w-full text-left px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 border-t border-gray-100 dark:border-white/8 flex items-center gap-1.5 font-medium">
                          <Plus className="w-3.5 h-3.5" />Add new contact
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Person in Charge — live contact search */}
                  <div className="relative">
                    <p className={MINI_LABEL}>Person in Charge</p>
                    <div className="relative">
                      <input
                        value={customer.name}
                        onChange={e => {
                          updateCustomer('name', e.target.value)
                          setActiveSearchField('person')
                          onContactSearchChange(e.target.value)
                        }}
                        onFocus={() => {
                          setActiveSearchField('person')
                          setShowContacts(true)
                          if (!customer.name) setContactResults(contacts.slice(0, 8))
                        }}
                        onBlur={() => setTimeout(() => { setShowContacts(false); setActiveSearchField(null) }, 150)}
                        placeholder="Contact name"
                        className={INPUT}
                      />
                      {contactLoading && activeSearchField === 'person' && (
                        <Loader2 className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 animate-spin" />
                      )}
                    </div>
                    {showContacts && activeSearchField === 'person' && (
                      <div className="absolute top-full left-0 z-20 mt-1 w-full bg-white dark:bg-[#222] border border-gray-200 dark:border-white/10 rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
                        {contactResults.map(c => (
                          <button key={c.id} type="button" onMouseDown={() => selectContact(c)}
                            className="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors flex items-center gap-2 border-b border-gray-50 dark:border-white/5 last:border-0">
                            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 text-xs font-semibold shrink-0">
                              {c.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{c.name}</p>
                              {(c.company_name || c.email) && (
                                <p className="text-xs text-gray-400 truncate">{c.company_name ?? c.email}</p>
                              )}
                            </div>
                          </button>
                        ))}
                        {contactResults.length === 0 && !contactLoading && (
                          <p className="px-3 py-2 text-xs text-gray-400">No contacts found</p>
                        )}
                        <button type="button" onMouseDown={() => { setShowContacts(false); setActiveSearchField(null); setShowNewContact(true) }}
                          className="w-full text-left px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 border-t border-gray-100 dark:border-white/8 flex items-center gap-1.5 font-medium">
                          <Plus className="w-3.5 h-3.5" />Add new contact
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className={MINI_LABEL}>Address</p>
                    <textarea value={customer.address} onChange={e => updateCustomer('address', e.target.value)}
                      placeholder="Street address, City, State, Postcode" rows={2} style={{ resize: 'none' }}
                      className={`${INPUT} leading-relaxed`} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className={MINI_LABEL}>Phone</p>
                      <input value={customer.phone} onChange={e => updateCustomer('phone', e.target.value)}
                        placeholder="+61 400 000 000" className={INPUT} />
                    </div>
                    <div>
                      <p className={MINI_LABEL}>Email</p>
                      <input value={customer.email} onChange={e => updateCustomer('email', e.target.value)}
                        placeholder="email@company.com" className={INPUT} />
                    </div>
                  </div>
                  <div>
                    <p className={MINI_LABEL}>VAT / Tax Number</p>
                    <input value={customer.vat} onChange={e => updateCustomer('vat', e.target.value)}
                      placeholder="ABN / VAT / GST number" className={INPUT} />
                  </div>
                </div>

                {/* Project */}
                <div className="mt-4">
                  <p className={MINI_LABEL}>Project (optional)</p>
                  <select value={projectId} onChange={e => setProjectId(e.target.value)}
                    className="w-full text-sm bg-transparent border-b border-gray-200 dark:border-white/10 focus:border-blue-400 dark:focus:border-blue-500 focus:outline-none py-1 text-gray-700 dark:text-gray-300 transition-colors">
                    <option value="">None</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Right: Document meta */}
              <div className="w-60 shrink-0">
                <p className={MINI_LABEL}>Document Details</p>
                <div className="space-y-3">
                  <div>
                    <p className={MINI_LABEL}>{typeLabel} Number</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 py-1">
                      {mode === 'edit' && doc?.doc_number ? doc.doc_number : 'Auto-assigned on save'}
                    </p>
                  </div>
                  <div>
                    <p className={MINI_LABEL}>Issue Date</p>
                    <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className={INPUT} />
                  </div>
                  <div>
                    <p className={MINI_LABEL}>{docType === 'quote' ? 'Valid Until' : 'Due Date'}</p>
                    {docType === 'quote'
                      ? <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className={INPUT} />
                      : <input type="date" value={dueDate}    onChange={e => setDueDate(e.target.value)}    className={INPUT} />
                    }
                  </div>
                  <div>
                    <p className={MINI_LABEL}>Currency</p>
                    <select value={currency} onChange={e => setCurrency(e.target.value)}
                      className="w-full text-sm bg-transparent border-b border-gray-200 dark:border-white/10 focus:border-blue-400 dark:focus:border-blue-500 focus:outline-none py-1 text-gray-700 dark:text-gray-300 transition-colors">
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <p className={MINI_LABEL}>Tax Rate (%)</p>
                    <div className="flex items-center gap-2">
                      <input type="number" min="0" max="100" step="any" value={taxRate}
                        onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
                        className={`${INPUT} w-20`} />
                      <div className="flex rounded border border-gray-200 dark:border-white/10 overflow-hidden text-[10px] shrink-0">
                        {([false, true] as const).map(val => (
                          <button key={String(val)} onClick={() => setTaxInclusive(val)}
                            className={`px-2 py-1 font-medium transition-colors ${
                              taxInclusive === val
                                ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900'
                                : 'bg-white dark:bg-white/5 text-gray-400 hover:bg-gray-50 dark:hover:bg-white/10'
                            }`}>
                            {val ? 'Incl.' : 'Excl.'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className={MINI_LABEL}>Customer PO Number</p>
                    <input value={customerPo} onChange={e => setCustomerPo(e.target.value)}
                      placeholder="Optional" className={INPUT} />
                  </div>
                </div>

                {/* Stripe payment link */}
                {mode === 'edit' && paymentLink && (
                  <div className="mt-4 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/10 p-3">
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1.5">Payment Link</p>
                    <div className="flex gap-1">
                      <input readOnly value={paymentLink} className="flex-1 min-w-0 text-xs px-2 py-1 border border-emerald-200 dark:border-emerald-700 rounded bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 focus:outline-none" />
                      <button onClick={copyLink} className="p-1 rounded border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-white/5 text-emerald-600 hover:bg-emerald-50">
                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      </button>
                      <a href={paymentLink} target="_blank" rel="noopener noreferrer" className="p-1 rounded border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-white/5 text-emerald-600 hover:bg-emerald-50">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── LINE ITEMS ── */}
            <div className="mb-8">
              <div style={{ borderBottom: `2px solid ${accentColor}` }} className="pb-2 mb-0">
                <div className="grid text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500"
                  style={{ gridTemplateColumns: '120px 1fr 70px 70px 90px 70px 90px 30px' }}>
                  <span>Item ID</span>
                  <span>Description</span>
                  <span className="text-center">Unit</span>
                  <span className="text-right">Qty</span>
                  <span className="text-right">Unit Price</span>
                  <span className="text-right">Disc %</span>
                  <span className="text-right">Amount</span>
                  <span />
                </div>
              </div>

              {lineItems.map((item, idx) => {
                const amount = item.quantity * item.unit_price * (1 - item.discount / 100)
                const suggestions = item.item_code.length > 0
                  ? catalog.filter(c =>
                      c.item_code.toLowerCase().includes(item.item_code.toLowerCase()) ||
                      c.description.toLowerCase().includes(item.item_code.toLowerCase())
                    ).slice(0, 5)
                  : []

                return (
                  <div key={item.id}
                    className="group grid items-center border-b border-gray-100 dark:border-white/5 hover:bg-gray-50/50 dark:hover:bg-white/[0.015] py-1"
                    style={{ gridTemplateColumns: '120px 1fr 70px 70px 90px 70px 90px 30px' }}>
                    {/* Item ID */}
                    <div className="relative pr-2">
                      <input value={item.item_code}
                        onChange={e => updateItem(item.id, 'item_code', e.target.value)}
                        placeholder="Item ID"
                        className={CELL} />
                      {suggestions.length > 0 && (
                        <div className="absolute top-full left-0 z-20 mt-0.5 w-56 bg-white dark:bg-[#222] border border-gray-200 dark:border-white/10 rounded-xl shadow-lg overflow-hidden">
                          {suggestions.map(s => (
                            <button key={s.id} type="button"
                              onMouseDown={() => {
                                updateItem(item.id, 'item_code',   s.item_code)
                                updateItem(item.id, 'description', s.description)
                                updateItem(item.id, 'category',    s.category ?? '')
                                updateItem(item.id, 'job',         s.job ?? '')
                                updateItem(item.id, 'tax_code',    s.tax_code ?? '')
                                updateItem(item.id, 'unit',        s.unit ?? '')
                                updateItem(item.id, 'unit_price',  s.unit_price)
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 dark:hover:bg-blue-500/10 border-b border-gray-50 dark:border-white/5 last:border-0">
                              <span className="font-semibold text-gray-900 dark:text-gray-100">{s.item_code}</span>
                              <span className="text-gray-400 ml-1.5 truncate">{s.description}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {item.item_code && !catalog.some(c => c.item_code === item.item_code) && (
                        <button type="button" onClick={() => setNewItemPrefill(item)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-blue-500 hover:text-blue-700 font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          + Save
                        </button>
                      )}
                    </div>
                    {/* Description */}
                    <input value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)}
                      placeholder="Description" className={CELL} />
                    {/* Unit */}
                    <input value={item.unit} onChange={e => updateItem(item.id, 'unit', e.target.value)}
                      placeholder="ea" className={`${CELL} text-center`} />
                    {/* Qty */}
                    <input type="number" min="0" step="any" value={item.quantity}
                      onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      className={`${CELL} text-right`} />
                    {/* Unit price */}
                    <input type="number" min="0" step="any" value={item.unit_price}
                      onChange={e => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                      className={`${CELL} text-right`} />
                    {/* Discount */}
                    <input type="number" min="0" max="100" step="any" value={item.discount}
                      onChange={e => updateItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                      className={`${CELL} text-right`} />
                    {/* Amount */}
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 text-right tabular-nums pr-1">
                      {fmt(amount, currency)}
                    </span>
                    {/* Delete */}
                    <button onClick={() => removeItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-300 hover:text-red-500 transition-all mx-auto">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })}

              <button onClick={addItem}
                className="flex items-center gap-1.5 mt-3 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                <Plus className="w-4 h-4" />Add line
              </button>
            </div>

            {/* ── TOTALS ── */}
            <div className="flex justify-end mb-10">
              <div className="w-64 space-y-1">
                <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 py-1">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{fmt(subtotal, currency)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 py-1">
                  <span>Tax ({taxRate}%)</span>
                  <span className="tabular-nums">{fmt(taxAmt, currency)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 py-1 items-center">
                  <span>Amount Paid</span>
                  <input type="number" min="0" step="any" value={amountPaid}
                    onChange={e => setAmountPaid(parseFloat(e.target.value) || 0)}
                    className="w-28 text-right text-sm border-b border-gray-200 dark:border-white/10 focus:border-blue-400 dark:focus:border-blue-500 focus:outline-none bg-transparent text-gray-700 dark:text-gray-300 py-0.5 tabular-nums transition-colors" />
                </div>
                <div className="flex justify-between items-center pt-3" style={{ borderTop: `2px solid ${accentColor}` }}>
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100">Balance Due</span>
                  <span className="text-xl font-bold tabular-nums" style={{ color: accentColor }}>{fmt(balanceDue, currency)}</span>
                </div>
              </div>
            </div>

            {/* ── NOTES & TERMS ── */}
            <div className="space-y-6 pt-6" style={{ borderTop: '1px solid #e5e7eb' }}>
              <div>
                <p className={MINI_LABEL}>Notes to Customer</p>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Payment instructions, thank you note, or any message to the customer…"
                  rows={3} style={{ resize: 'none' }}
                  className="w-full text-sm text-gray-700 dark:text-gray-300 bg-transparent focus:outline-none placeholder:text-gray-300 dark:placeholder:text-gray-600 leading-relaxed" />
              </div>
              <div>
                <p className={MINI_LABEL}>Terms &amp; Conditions</p>
                <textarea value={terms} onChange={e => setTerms(e.target.value)}
                  placeholder="Payment terms, refund policy, late fee policy…"
                  rows={3} style={{ resize: 'none' }}
                  className="w-full text-sm text-gray-700 dark:text-gray-300 bg-transparent focus:outline-none placeholder:text-gray-300 dark:placeholder:text-gray-600 leading-relaxed" />
              </div>
            </div>

            {/* ── ATTACHMENTS ── */}
            <div className="mt-8 pt-6" style={{ borderTop: '1px solid #e5e7eb' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-3.5 h-3.5 text-gray-400" />
                  <p className={MINI_LABEL + ' mb-0'}>Attachments {attachments.length > 0 && `(${attachments.length})`}</p>
                </div>
                <button onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium transition-colors">
                  <Upload className="w-3 h-3" />Browse
                </button>
                <input ref={fileInputRef} type="file" multiple accept=".pdf,.tiff,.tif,.jpg,.jpeg,.png" className="sr-only"
                  onChange={e => { processFiles(e.target.files); e.target.value = '' }} />
              </div>

              {attachments.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {attachments.map(a => (
                    <div key={a.id} className="flex items-center gap-2.5 py-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="text-sm text-gray-600 dark:text-gray-400 flex-1 truncate">{a.name}</span>
                      <span className="text-xs text-gray-400">{fmtFileSize(a.size)}</span>
                      <button onClick={() => setAttachments(p => p.filter(x => x.id !== a.id))}
                        className="text-gray-300 hover:text-red-500 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div
                onDragOver={e => { e.preventDefault() }}
                onDrop={e => { e.preventDefault(); processFiles(e.dataTransfer.files) }}
                onClick={() => fileInputRef.current?.click()}
                className="border border-dashed border-gray-200 dark:border-white/10 rounded-lg px-5 py-5 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                <Upload className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                <p className="text-xs text-gray-400">Drag files or <span className="text-blue-500">browse</span></p>
                <p className="text-[10px] text-gray-300 dark:text-gray-600">PDF, TIFF, JPEG, PNG — max 10 MB</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
