'use client'

import { useState, useTransition, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Plus, Trash2, Save, Send, CreditCard, Copy, Check,
  Loader2, RefreshCw, X, AlertTriangle, ExternalLink, Receipt,
  FileText, Package, ChevronDown, Upload, Paperclip, Building2,
} from 'lucide-react'
import {
  createDocument, updateDocument, sendViaStripe, markAsSent,
  acceptQuote, markAsPaid, syncStripeStatus, convertToInvoice,
  createQuickContact,
} from '@/app/actions/sage-documents'
import { createItem } from '@/app/actions/sage-items'
import type { SageDocument, SageDocumentItem, SageDocumentType, SageContact, SageProject, SageItem } from '@/lib/types'

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

interface Props {
  mode:      'new' | 'edit'
  docType?:  SageDocumentType
  document?: SageDocument
  contacts:  Pick<SageContact, 'id' | 'name' | 'email' | 'company_name'>[]
  projects:  Pick<SageProject, 'id' | 'name'>[]
  items:     SageItem[]
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

const FIELD = 'w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 placeholder:text-gray-400 dark:placeholder:text-gray-600'
const LABEL = 'block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1'
const CURRENCIES = ['AUD','USD','EUR','GBP','CAD','SGD','INR','AED','CHF','JPY','NZD','HKD']

// ── New Contact Modal ─────────────────────────────────────────────────────────

function NewContactModal({
  onClose, onCreated,
}: {
  onClose: () => void
  onCreated: (c: Pick<SageContact, 'id' | 'name' | 'email' | 'company_name'>) => void
}) {
  const [name, setName]               = useState('')
  const [email, setEmail]             = useState('')
  const [phone, setPhone]             = useState('')
  const [company, setCompany]         = useState('')
  const [saving, setSaving]           = useState(false)
  const [err, setErr]                 = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setErr('Name is required'); return }
    setSaving(true)
    const res = await createQuickContact({ name: name.trim(), email: email || undefined, phone: phone || undefined, company_name: company || undefined })
    if (res.error) { setErr(res.error); setSaving(false); return }
    onCreated({ id: res.id!, name: name.trim(), email: email || null, company_name: company || null })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/8">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">New Contact</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-3">
          {err && <p className="text-xs text-red-500">{err}</p>}
          <div><label className={LABEL}>Name *</label><input className={FIELD} value={name} onChange={e => setName(e.target.value)} placeholder="Full name" /></div>
          <div><label className={LABEL}>Email</label><input className={FIELD} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" /></div>
          <div><label className={LABEL}>Phone</label><input className={FIELD} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+61 400 000 000" /></div>
          <div><label className={LABEL}>Company</label><input className={FIELD} value={company} onChange={e => setCompany(e.target.value)} placeholder="Company name" /></div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium flex items-center justify-center gap-1.5 transition-colors">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Create Contact
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── New Item Modal ────────────────────────────────────────────────────────────

function NewItemModal({
  prefill, onClose, onCreated,
}: {
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
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X className="w-4 h-4" /></button>
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
            <button type="button" onClick={onClose} className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium flex items-center justify-center gap-1.5 transition-colors">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save Item
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Item Row ──────────────────────────────────────────────────────────────────

function ItemRow({
  item, catalog, currency, onChange, onRemove, onSaveAsItem,
}: {
  item:         LineItem
  catalog:      SageItem[]
  currency:     string
  onChange:     (field: keyof Omit<LineItem, 'id'>, value: string | number) => void
  onRemove:     () => void
  onSaveAsItem: () => void
}) {
  const [showSuggestions, setShowSuggestions] = useState(false)

  const suggestions = item.item_code.length > 0
    ? catalog.filter(c =>
        c.item_code.toLowerCase().includes(item.item_code.toLowerCase()) ||
        c.description.toLowerCase().includes(item.item_code.toLowerCase())
      ).slice(0, 6)
    : []

  function applyItem(c: SageItem) {
    onChange('item_code',   c.item_code)
    onChange('description', c.description)
    onChange('category',    c.category   ?? '')
    onChange('job',         c.job        ?? '')
    onChange('tax_code',    c.tax_code   ?? '')
    onChange('unit',        c.unit       ?? '')
    onChange('unit_price',  c.unit_price)
    setShowSuggestions(false)
  }

  const amount         = item.quantity * item.unit_price * (1 - item.discount / 100)
  const existsInCatalog = catalog.some(c => c.item_code === item.item_code)

  const TD   = 'px-2 py-1.5 align-middle'
  const CELL = 'w-full bg-transparent border border-transparent hover:border-gray-200 dark:hover:border-white/10 focus:border-blue-400 dark:focus:border-blue-500 rounded px-1.5 py-1 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:bg-blue-50/50 dark:focus:bg-blue-500/5 placeholder:text-gray-300 dark:placeholder:text-gray-600 transition-colors'

  return (
    <tr className="group border-b border-gray-100 dark:border-white/5 hover:bg-gray-50/50 dark:hover:bg-white/[0.015]">
      {/* Item ID */}
      <td className={TD} style={{ minWidth: 110 }}>
        <div className="relative">
          <input
            value={item.item_code}
            onChange={e => { onChange('item_code', e.target.value); setShowSuggestions(true) }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="Item ID"
            className={CELL}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 z-20 mt-0.5 w-64 bg-white dark:bg-[#222] border border-gray-200 dark:border-white/10 rounded-xl shadow-lg overflow-hidden">
              {suggestions.map(s => (
                <button key={s.id} type="button" onMouseDown={() => applyItem(s)}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors border-b border-gray-50 dark:border-white/5 last:border-0">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{s.item_code}</span>
                  <span className="text-gray-400 ml-2 truncate">{s.description}</span>
                </button>
              ))}
            </div>
          )}
          {item.item_code && !existsInCatalog && (
            <button type="button" onClick={onSaveAsItem}
              className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-blue-500 hover:text-blue-700 font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              + Save
            </button>
          )}
        </div>
      </td>
      {/* Description */}
      <td className={TD}><input value={item.description} onChange={e => onChange('description', e.target.value)} placeholder="Description" className={CELL} /></td>
      {/* Category */}
      <td className={TD} style={{ minWidth: 90 }}><input value={item.category} onChange={e => onChange('category', e.target.value)} placeholder="Category" className={CELL} /></td>
      {/* Job */}
      <td className={TD} style={{ minWidth: 80 }}><input value={item.job} onChange={e => onChange('job', e.target.value)} placeholder="Job" className={CELL} /></td>
      {/* Unit */}
      <td className={TD} style={{ minWidth: 60 }}><input value={item.unit} onChange={e => onChange('unit', e.target.value)} placeholder="ea" className={`${CELL} text-center`} /></td>
      {/* Qty */}
      <td className={TD} style={{ minWidth: 70 }}>
        <input type="number" min="0" step="any" value={item.quantity} onChange={e => onChange('quantity', parseFloat(e.target.value) || 0)} className={`${CELL} text-right`} />
      </td>
      {/* Unit price */}
      <td className={TD} style={{ minWidth: 90 }}>
        <input type="number" min="0" step="any" value={item.unit_price} onChange={e => onChange('unit_price', parseFloat(e.target.value) || 0)} className={`${CELL} text-right`} />
      </td>
      {/* Discount % */}
      <td className={TD} style={{ minWidth: 70 }}>
        <input type="number" min="0" max="100" step="any" value={item.discount} onChange={e => onChange('discount', parseFloat(e.target.value) || 0)} className={`${CELL} text-right`} />
      </td>
      {/* Amount */}
      <td className={`${TD} text-right pr-3`} style={{ minWidth: 90 }}>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 tabular-nums">{fmt(amount, currency)}</span>
      </td>
      {/* Tax code */}
      <td className={TD} style={{ minWidth: 70 }}><input value={item.tax_code} onChange={e => onChange('tax_code', e.target.value)} placeholder="GST" className={`${CELL} text-center`} /></td>
      {/* Delete */}
      <td className={`${TD} text-center`}>
        <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-300 hover:text-red-500 transition-all">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function DocumentBuilder({ mode, docType: docTypeProp, document: doc, contacts: initialContacts, projects, items: initialItems }: Props) {
  const router      = useRouter()
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Core state
  const [docType,        setDocType]       = useState<SageDocumentType>(doc?.doc_type ?? docTypeProp ?? 'invoice')
  const [lineItems,      setLineItems]     = useState<LineItem[]>(() =>
    doc?.items?.length
      ? doc.items.map((i: SageDocumentItem) => ({
          id: i.id, item_code: i.item_code ?? '', description: i.description,
          category: i.category ?? '', job: i.job ?? '', unit: i.unit ?? '',
          quantity: i.quantity, unit_price: i.unit_price, discount: i.discount ?? 0, tax_code: i.tax_code ?? '',
        }))
      : [emptyItem()]
  )
  const [contacts,       setContacts]      = useState(initialContacts)
  const [catalog,        setCatalog]       = useState<SageItem[]>(initialItems)
  const [contactId,      setContactId]     = useState(doc?.contact_id ?? '')
  const [contactSearch,  setContactSearch] = useState(doc?.contact?.name ?? '')
  const [showContacts,   setShowContacts]  = useState(false)
  const [projectId,      setProjectId]     = useState(doc?.project_id ?? '')
  const [currency,       setCurrency]      = useState(doc?.currency ?? 'AUD')
  const [issueDate,      setIssueDate]     = useState(doc?.issue_date ?? today())
  const [dueDate,        setDueDate]       = useState(doc?.due_date ?? '')
  const [validUntil,     setValidUntil]    = useState(doc?.valid_until ?? '')
  const [customerPo,     setCustomerPo]    = useState((doc as (SageDocument & { customer_po?: string | null }) | undefined)?.customer_po ?? '')
  const [taxInclusive,   setTaxInclusive]  = useState((doc as (SageDocument & { tax_inclusive?: boolean }) | undefined)?.tax_inclusive ?? false)
  const [taxRate,        setTaxRate]       = useState(doc?.tax_rate ?? 10)
  const [notes,          setNotes]         = useState(doc?.notes ?? '')
  const [terms,          setTerms]         = useState(doc?.terms ?? '')
  const [fromName,       setFromName]      = useState((doc as (SageDocument & { from_name?: string | null }) | undefined)?.from_name ?? '')
  const [fromAddress,    setFromAddress]   = useState((doc as (SageDocument & { from_address?: string | null }) | undefined)?.from_address ?? '')
  const [accentColor,    setAccentColor]   = useState(doc?.accent_color ?? '#6d28d9')
  const [logoUrl,        setLogoUrl]       = useState(doc?.logo_url ?? '')
  const [attachments,    setAttachments]   = useState<Attachment[]>(() => {
    const raw = (doc as (SageDocument & { attachments?: unknown }) | undefined)?.attachments
    return Array.isArray(raw) ? (raw as Attachment[]) : []
  })
  const [amountPaid,     setAmountPaid]    = useState((doc as (SageDocument & { amount_paid?: number }) | undefined)?.amount_paid ?? 0)

  // UI state
  const [saved,          setSaved]         = useState(false)
  const [paymentLink,    setPaymentLink]   = useState(doc?.stripe_payment_link ?? '')
  const [copied,         setCopied]        = useState(false)
  const [error,          setError]         = useState('')
  const [docStatus,      setDocStatus]     = useState(doc?.status ?? 'draft')
  const [showNewContact, setShowNewContact] = useState(false)
  const [newItemPrefill, setNewItemPrefill] = useState<Partial<LineItem> | null>(null)
  const [dragOver,       setDragOver]      = useState(false)

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

  const selectedContact   = contacts.find(c => c.id === contactId)
  const filteredContacts  = contactSearch.length > 0
    ? contacts.filter(c => c.name.toLowerCase().includes(contactSearch.toLowerCase()) || c.email?.toLowerCase().includes(contactSearch.toLowerCase()))
    : contacts.slice(0, 8)

  function selectContact(c: Pick<SageContact, 'id' | 'name' | 'email' | 'company_name'>) {
    setContactId(c.id); setContactSearch(c.name); setShowContacts(false)
  }

  function handleContactCreated(c: Pick<SageContact, 'id' | 'name' | 'email' | 'company_name'>) {
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

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-[#141414]">

      {showNewContact && <NewContactModal onClose={() => setShowNewContact(false)} onCreated={handleContactCreated} />}
      {newItemPrefill !== null && <NewItemModal prefill={newItemPrefill} onClose={() => setNewItemPrefill(null)} onCreated={handleItemCreated} />}

      {/* ── Top bar ── */}
      <div className="flex items-center gap-3 px-5 py-2.5 border-b border-gray-200 dark:border-white/8 bg-white dark:bg-[#1a1a1a] shrink-0 flex-wrap">
        <Link href="/sage/quotes" className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
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

        {mode === 'edit' && doc?.doc_number && <span className="text-sm text-gray-400 dark:text-gray-500">{doc.doc_number}</span>}
        {mode === 'edit' && (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[docStatus] ?? STATUS_BADGE.draft}`}>
            {docStatus.charAt(0).toUpperCase() + docStatus.slice(1)}
          </span>
        )}
        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <button onClick={handleSave} disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-colors">
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

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-6 space-y-5">

          {/* ── Row 1: Customer + Invoice meta ── */}
          <div className="grid grid-cols-2 gap-5">

            {/* Left: Customer */}
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-white/8 p-5 space-y-4">
              <div>
                <label className={LABEL}>Customer *</label>
                <div className="relative">
                  <input
                    value={contactSearch}
                    onChange={e => { setContactSearch(e.target.value); setContactId(''); setShowContacts(true) }}
                    onFocus={() => setShowContacts(true)}
                    onBlur={() => setTimeout(() => setShowContacts(false), 150)}
                    placeholder="Search or select customer…"
                    className={FIELD}
                  />
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  {showContacts && (
                    <div className="absolute top-full left-0 z-20 mt-1 w-full bg-white dark:bg-[#222] border border-gray-200 dark:border-white/10 rounded-xl shadow-lg overflow-hidden max-h-60 overflow-y-auto">
                      {filteredContacts.map(c => (
                        <button key={c.id} type="button" onMouseDown={() => selectContact(c)}
                          className="w-full text-left px-3 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors flex items-center gap-2.5 border-b border-gray-50 dark:border-white/5 last:border-0">
                          <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-semibold shrink-0">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{c.name}</p>
                            {(c.email || c.company_name) && <p className="text-xs text-gray-400 truncate">{c.company_name ?? c.email}</p>}
                          </div>
                        </button>
                      ))}
                      <button type="button" onMouseDown={() => { setShowContacts(false); setShowNewContact(true) }}
                        className="w-full text-left px-3 py-2.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 border-t border-gray-100 dark:border-white/8 flex items-center gap-2 font-medium">
                        <Plus className="w-4 h-4" />Create new contact
                      </button>
                    </div>
                  )}
                </div>
                {selectedContact && (
                  <div className="mt-2.5 flex items-center gap-2.5 p-2.5 bg-gray-50 dark:bg-white/[0.03] rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 text-sm font-semibold shrink-0">
                      {selectedContact.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-sm min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{selectedContact.name}</p>
                      {selectedContact.email        && <p className="text-xs text-gray-400">{selectedContact.email}</p>}
                      {selectedContact.company_name && <p className="text-xs text-gray-400">{selectedContact.company_name}</p>}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className={LABEL}>Project (optional)</label>
                <select value={projectId} onChange={e => setProjectId(e.target.value)} className={FIELD}>
                  <option value="">None</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className={LABEL}>From (your business)</label>
                <input value={fromName} onChange={e => setFromName(e.target.value)} placeholder="Your company name" className={FIELD} />
                <textarea value={fromAddress} onChange={e => setFromAddress(e.target.value)} placeholder="Address / ABN / contact details" rows={2} className={`${FIELD} resize-none`} />
              </div>
            </div>

            {/* Right: Invoice meta */}
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-white/8 p-5 space-y-4">

              {/* Logo + colour */}
              <div className="flex items-start gap-4">
                <div>
                  <label className={LABEL}>Logo</label>
                  <label className="cursor-pointer group block">
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
                      ? <div className="relative inline-block">
                          <img src={logoUrl} alt="Logo" className="h-12 max-w-[100px] object-contain rounded-lg border border-gray-200 dark:border-white/10" />
                          <button type="button" onClick={e => { e.preventDefault(); setLogoUrl('') }}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold leading-none">×</button>
                        </div>
                      : <div className="w-20 h-12 rounded-lg bg-gray-50 dark:bg-white/5 border-2 border-dashed border-gray-200 dark:border-white/15 flex flex-col items-center justify-center hover:border-gray-400 transition-colors">
                          <Building2 className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                          <span className="text-[9px] text-gray-300 dark:text-gray-600 mt-0.5">Upload</span>
                        </div>
                    }
                  </label>
                </div>

                <div className="flex-1">
                  <label className={LABEL}>Brand Colour</label>
                  <div className="flex items-center gap-1.5 flex-wrap mb-2">
                    {['#6d28d9','#2563eb','#0891b2','#059669','#dc2626','#ea580c','#ca8a04','#db2777','#1e293b'].map(c => (
                      <button key={c} onClick={() => setAccentColor(c)}
                        className={`w-5 h-5 rounded-full border-2 transition-all hover:scale-110 ${accentColor === c ? 'border-gray-900 dark:border-white ring-2 ring-offset-1 ring-gray-400' : 'border-transparent'}`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)}
                      className="w-7 h-7 rounded-full border border-gray-200 dark:border-white/10 cursor-pointer bg-transparent p-0.5 shrink-0" />
                    <input type="text" value={accentColor} onChange={e => setAccentColor(e.target.value)}
                      className="flex-1 px-2 py-1 text-xs border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                  </div>
                </div>
              </div>

              {/* Doc number + PO */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>{typeLabel} Number</label>
                  <input readOnly value={mode === 'edit' && doc?.doc_number ? doc.doc_number : 'Auto-assigned'} className={`${FIELD} bg-gray-50 dark:bg-white/[0.03] text-gray-400 cursor-default`} />
                </div>
                <div>
                  <label className={LABEL}>Customer PO Number</label>
                  <input value={customerPo} onChange={e => setCustomerPo(e.target.value)} placeholder="Optional" className={FIELD} />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Issue Date</label>
                  <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className={FIELD} />
                </div>
                <div>
                  <label className={LABEL}>{docType === 'quote' ? 'Valid Until' : 'Due Date'}</label>
                  {docType === 'quote'
                    ? <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className={FIELD} />
                    : <input type="date" value={dueDate}    onChange={e => setDueDate(e.target.value)}    className={FIELD} />
                  }
                </div>
              </div>

              {/* Currency + Tax rate */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Currency</label>
                  <select value={currency} onChange={e => setCurrency(e.target.value)} className={FIELD}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Tax Rate (%)</label>
                  <input type="number" min="0" max="100" step="any" value={taxRate} onChange={e => setTaxRate(parseFloat(e.target.value) || 0)} className={FIELD} />
                </div>
              </div>

              {/* Tax inclusive toggle */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 dark:text-gray-400">Amounts are</span>
                <div className="flex rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden text-xs">
                  {([false, true] as const).map(val => (
                    <button key={String(val)} onClick={() => setTaxInclusive(val)}
                      className={`px-3 py-1.5 font-medium transition-colors ${
                        taxInclusive === val
                          ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                          : 'bg-white dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/10'
                      }`}>
                      {val ? 'Tax inclusive' : 'Tax exclusive'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stripe payment link */}
              {mode === 'edit' && paymentLink && (
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/10 p-3">
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-2">Payment Link</p>
                  <div className="flex gap-1.5">
                    <input readOnly value={paymentLink} className="flex-1 min-w-0 text-xs px-2 py-1.5 border border-emerald-200 dark:border-emerald-700 rounded-lg bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 focus:outline-none" />
                    <button onClick={copyLink} className="p-1.5 rounded-lg border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-white/5 text-emerald-600 hover:bg-emerald-50 transition-colors">
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <a href={paymentLink} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-white/5 text-emerald-600 hover:bg-emerald-50 transition-colors">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Line Items table ── */}
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-white/8 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: 920 }}>
                <thead>
                  <tr className="border-b border-gray-200 dark:border-white/8 bg-gray-50 dark:bg-white/[0.02]">
                    {[
                      { label: 'Item ID',       align: 'left'  },
                      { label: 'Description',   align: 'left'  },
                      { label: 'Category',      align: 'left'  },
                      { label: 'Job',           align: 'left'  },
                      { label: 'Unit',          align: 'center'},
                      { label: 'No. of units',  align: 'right' },
                      { label: 'Unit price',    align: 'right' },
                      { label: 'Discount (%)',  align: 'right' },
                      { label: 'Amount ($)',    align: 'right' },
                      { label: 'Tax code',      align: 'center'},
                      { label: '',              align: 'center'},
                    ].map((h, i) => (
                      <th key={i} className={`px-2 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap text-${h.align} ${i === 10 ? 'w-8' : ''}`}>
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map(item => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      catalog={catalog}
                      currency={currency}
                      onChange={(field, value) => updateItem(item.id, field, value)}
                      onRemove={() => removeItem(item.id)}
                      onSaveAsItem={() => setNewItemPrefill(item)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-gray-100 dark:border-white/5">
              <button onClick={addItem} className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                <Plus className="w-4 h-4" />Add line
              </button>
            </div>
          </div>

          {/* ── Notes + Totals ── */}
          <div className="grid grid-cols-2 gap-5">
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-white/8 p-5 space-y-4">
              <div>
                <label className={LABEL}>Notes to Customer</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Visible to customer…" rows={3} className={`${FIELD} resize-none`} />
              </div>
              <div>
                <label className={LABEL}>Terms &amp; Conditions</label>
                <textarea value={terms} onChange={e => setTerms(e.target.value)} placeholder="Payment terms, refund policy…" rows={3} className={`${FIELD} resize-none`} />
              </div>
            </div>

            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-white/8 p-5">
              <div className="space-y-2.5">
                <div className="flex justify-between text-sm py-2 border-b border-gray-100 dark:border-white/5">
                  <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                  <span className="tabular-nums font-medium text-gray-900 dark:text-gray-100">{fmt(subtotal, currency)}</span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b border-gray-100 dark:border-white/5">
                  <span className="text-gray-500 dark:text-gray-400">Tax ({taxRate}%)</span>
                  <span className="tabular-nums text-gray-700 dark:text-gray-300">{fmt(taxAmt, currency)}</span>
                </div>
                <div className="flex justify-between items-center text-sm py-2 border-b border-gray-100 dark:border-white/5">
                  <span className="text-gray-500 dark:text-gray-400">Amount paid ($)</span>
                  <input type="number" min="0" step="any" value={amountPaid} onChange={e => setAmountPaid(parseFloat(e.target.value) || 0)}
                    className="w-28 text-right text-sm border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 tabular-nums" />
                </div>
                <div className="flex justify-between items-center pt-3">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Balance due</span>
                  <span className="text-2xl font-bold tabular-nums" style={{ color: accentColor }}>{fmt(balanceDue, currency)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Attachments ── */}
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-white/8 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Attachments</span>
                {attachments.length > 0 && <span className="text-xs text-gray-400 dark:text-gray-500">({attachments.length})</span>}
              </div>
              <button onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium transition-colors">
                <Upload className="w-3.5 h-3.5" />Browse files
              </button>
              <input ref={fileInputRef} type="file" multiple accept=".pdf,.tiff,.tif,.jpg,.jpeg,.png" className="sr-only"
                onChange={e => { processFiles(e.target.files); e.target.value = '' }} />
            </div>

            {attachments.length > 0 && (
              <div className="px-5 py-2 divide-y divide-gray-50 dark:divide-white/[0.03]">
                {attachments.map(a => (
                  <div key={a.id} className="flex items-center gap-3 py-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                      <Paperclip className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{a.name}</p>
                      <p className="text-xs text-gray-400">{fmtFileSize(a.size)}</p>
                    </div>
                    <button onClick={() => setAttachments(p => p.filter(x => x.id !== a.id))}
                      className="p-1 rounded text-gray-300 hover:text-red-500 transition-colors shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); processFiles(e.dataTransfer.files) }}
              onClick={() => fileInputRef.current?.click()}
              className={`px-5 py-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${dragOver ? 'bg-blue-50 dark:bg-blue-500/10' : 'hover:bg-gray-50 dark:hover:bg-white/[0.02]'} ${attachments.length > 0 ? 'border-t border-dashed border-gray-200 dark:border-white/8' : ''}`}>
              <Upload className={`w-5 h-5 ${dragOver ? 'text-blue-500' : 'text-gray-300 dark:text-gray-600'}`} />
              <p className="text-xs text-gray-400">Drag files to upload, or <span className="text-blue-500">browse for files</span></p>
              <p className="text-[10px] text-gray-300 dark:text-gray-600">PDF, TIFF, JPEG or PNG — max 10 MB</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
