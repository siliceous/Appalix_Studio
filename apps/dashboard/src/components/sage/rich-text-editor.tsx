'use client'

import React, { useRef, forwardRef, useImperativeHandle, useCallback, useState } from 'react'
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Link2, Paperclip, Palette, Loader2, X, Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RichTextEditorRef {
  getHtml:       () => string
  getPlainText:  () => string
  setHtml:       (html: string) => void
  focus:         () => void
}

export interface EmailAttachment {
  filename:     string
  contentType:  string
  dataBase64:   string
}

interface StripeInvoice {
  id:              string
  number:          string | null
  customer_name:   string | null
  customer_email:  string | null
  amount_due:      number
  currency:        string
  status:          string
}

interface Props {
  onChange?:        (html: string) => void
  onAttach?:        (files: EmailAttachment[]) => void
  placeholder?:     string
  minHeight?:       number
  stripeConnected?: boolean
  onStripeInvoice?: () => Promise<{ invoices?: StripeInvoice[]; error?: string }>
  onAttachInvoice?: (invoiceId: string) => Promise<{ attachment?: EmailAttachment; error?: string }>
}

const FONT_FAMILIES = [
  { label: 'Sans Serif',      value: 'Arial, sans-serif' },
  { label: 'Serif',           value: 'Georgia, serif' },
  { label: 'Monospace',       value: '"Courier New", monospace' },
  { label: 'Arial',           value: 'Arial' },
  { label: 'Helvetica',       value: 'Helvetica' },
  { label: 'Georgia',         value: 'Georgia' },
  { label: 'Times New Roman', value: '"Times New Roman"' },
  { label: 'Trebuchet',       value: '"Trebuchet MS"' },
  { label: 'Verdana',         value: 'Verdana' },
]

const FONT_SIZES = [
  { label: '8',   value: '1' },
  { label: '10',  value: '2' },
  { label: '12',  value: '3' },
  { label: '14',  value: '4' },
  { label: '18',  value: '5' },
  { label: '24',  value: '6' },
  { label: '36',  value: '7' },
]

// ─── Stripe SVG icon ──────────────────────────────────────────────────────────

function StripeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path fill="#635BFF" d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
    </svg>
  )
}

// ─── OneDrive SVG icon ────────────────────────────────────────────────────────

function OneDriveIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path fill="#0078D4" d="M14.5 12.5a6.5 6.5 0 0 0-12.5 2A4 4 0 0 0 4 22h11.5a4.5 4.5 0 0 0 .5-9 4.502 4.502 0 0 0-1.5.25Z"/>
      <path fill="#1AABF0" d="M20 22h-4.5A4.5 4.5 0 0 0 16 13.25a6.5 6.5 0 0 0-1.5-.25 6.5 6.5 0 0 0-6.25 4.75A4 4 0 0 1 11 14.5a5.5 5.5 0 0 1 5.5 5.5A3.5 3.5 0 0 0 20 16.5V22Z"/>
    </svg>
  )
}

// ─── Toolbar separator ────────────────────────────────────────────────────────

function Sep() {
  return <span className="w-px h-4 bg-gray-200 dark:bg-white/10 mx-1 shrink-0" />
}

// ─── Stripe invoice picker ────────────────────────────────────────────────────

function StripePickerPanel({
  invoices,
  isLoading,
  onPick,
  onClose,
}: {
  invoices: StripeInvoice[]
  isLoading: boolean
  onPick: (id: string) => void
  onClose: () => void
}) {
  const fmt = (cents: number, currency: string) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100)

  return (
    <div className="absolute right-0 top-full mt-1 z-50 w-80 bg-white dark:bg-[#232323] rounded-xl border border-gray-200 dark:border-white/12 shadow-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 border-b dark:border-white/8">
        <div className="flex items-center gap-1.5">
          <StripeIcon className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Stripe Invoices</span>
        </div>
        <button onClick={onClose} className="p-0.5 hover:bg-gray-100 dark:hover:bg-white/8 rounded transition-colors">
          <X className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs">Loading invoices…</span>
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">No open invoices found</div>
        ) : (
          invoices.map(inv => (
            <button
              key={inv.id}
              onClick={() => onPick(inv.id)}
              className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-white/3 text-left border-b border-gray-50 dark:border-white/5 last:border-0 transition-colors"
            >
              <StripeIcon className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                  {inv.number ?? inv.id} — {fmt(inv.amount_due, inv.currency)}
                </p>
                {inv.customer_name && (
                  <p className="text-[11px] text-gray-400 truncate">{inv.customer_name}</p>
                )}
              </div>
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0',
                inv.status === 'open'   ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                inv.status === 'paid'   ? 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400' :
                'bg-gray-100 dark:bg-white/5 text-gray-500',
              )}>
                {inv.status}
              </span>
            </button>
          ))
        )}
      </div>
      <div className="px-3 py-2 border-t dark:border-white/8 bg-gray-50 dark:bg-white/3">
        <p className="text-[10px] text-gray-400">Invoice PDF will be attached to the email</p>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export const RichTextEditor = forwardRef<RichTextEditorRef, Props>(
  function RichTextEditor({ onChange, onAttach, placeholder, minHeight = 220, stripeConnected, onStripeInvoice, onAttachInvoice }, ref) {
    const editorRef    = useRef<HTMLDivElement>(null)
    const colorInputRef = useRef<HTMLInputElement>(null)
    const fileInputRef  = useRef<HTMLInputElement>(null)

    // Stripe picker state
    const [stripeOpen,    setStripeOpen]    = useState(false)
    const [stripeLoading, setStripeLoading] = useState(false)
    const [stripeInvoices, setStripeInvoices] = useState<StripeInvoice[]>([])
    const [attachingId,   setAttachingId]   = useState<string | null>(null)
    const [attachedIds,   setAttachedIds]   = useState<Set<string>>(new Set())

    useImperativeHandle(ref, () => ({
      getHtml:      () => editorRef.current?.innerHTML ?? '',
      getPlainText: () => editorRef.current?.innerText ?? '',
      setHtml:      (html: string) => {
        if (editorRef.current) {
          editorRef.current.innerHTML = html
          onChange?.(html)
        }
      },
      focus: () => editorRef.current?.focus(),
    }))

    const exec = useCallback((command: string, value?: string) => {
      editorRef.current?.focus()
      document.execCommand(command, false, value)
      onChange?.(editorRef.current?.innerHTML ?? '')
    }, [onChange])

    function insertLink() {
      editorRef.current?.focus()
      const url = window.prompt('Enter URL:')
      if (url) {
        const link = url.startsWith('http') ? url : `https://${url}`
        document.execCommand('createLink', false, link)
        // Make links open in a new tab
        editorRef.current?.querySelectorAll('a').forEach(a => { a.target = '_blank'; a.rel = 'noopener noreferrer' })
        onChange?.(editorRef.current?.innerHTML ?? '')
      }
    }

    function handleColorChange(e: React.ChangeEvent<HTMLInputElement>) {
      exec('foreColor', e.target.value)
    }

    function handleFontFamily(e: React.ChangeEvent<HTMLSelectElement>) {
      exec('fontName', e.target.value)
    }

    function handleFontSize(e: React.ChangeEvent<HTMLSelectElement>) {
      exec('fontSize', e.target.value)
    }

    function handleKeyDown(e: React.KeyboardEvent) {
      if (e.key === 'Tab') {
        e.preventDefault()
        exec(e.shiftKey ? 'outdent' : 'indent')
      }
    }

    async function handleFileAttach(e: React.ChangeEvent<HTMLInputElement>) {
      const files = Array.from(e.target.files ?? [])
      if (!files.length) return
      const attachments: EmailAttachment[] = await Promise.all(
        files.map(file => new Promise<EmailAttachment>((resolve) => {
          const reader = new FileReader()
          reader.onload = () => {
            const dataUrl = reader.result as string
            const dataBase64 = dataUrl.split(',')[1] ?? ''
            resolve({ filename: file.name, contentType: file.type || 'application/octet-stream', dataBase64 })
          }
          reader.readAsDataURL(file)
        }))
      )
      onAttach?.(attachments)
      e.target.value = ''
    }

    async function openStripePicker() {
      if (!onStripeInvoice) return
      setStripeOpen(true)
      setStripeLoading(true)
      const res = await onStripeInvoice()
      setStripeInvoices(res.invoices ?? [])
      setStripeLoading(false)
    }

    async function pickInvoice(invoiceId: string) {
      if (!onAttachInvoice || attachingId) return
      setAttachingId(invoiceId)
      const res = await onAttachInvoice(invoiceId)
      setAttachingId(null)
      if (res.attachment) {
        onAttach?.([res.attachment])
        setAttachedIds(prev => new Set(prev).add(invoiceId))
        setStripeOpen(false)
      }
    }

    const btn = 'flex items-center justify-center w-6 h-6 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors shrink-0'

    return (
      <div>
        {/* ── Toolbar ── */}
        <div className="flex items-center gap-0 px-2 py-1.5 bg-gray-50 dark:bg-white/[0.03] border-b dark:border-white/8 flex-wrap gap-y-1">

          {/* Font family */}
          <select
            onMouseDown={e => e.stopPropagation()}
            onChange={handleFontFamily}
            defaultValue=""
            className="text-[11px] text-gray-600 dark:text-gray-400 bg-transparent border border-gray-200 dark:border-white/10 rounded px-1 py-0.5 cursor-pointer hover:border-gray-300 dark:hover:border-white/20 focus:outline-none mr-1"
          >
            <option value="" disabled>Font</option>
            {FONT_FAMILIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>

          {/* Font size */}
          <select
            onMouseDown={e => e.stopPropagation()}
            onChange={handleFontSize}
            defaultValue="3"
            className="text-[11px] text-gray-600 dark:text-gray-400 bg-transparent border border-gray-200 dark:border-white/10 rounded px-1 py-0.5 cursor-pointer hover:border-gray-300 dark:hover:border-white/20 focus:outline-none mr-1"
          >
            {FONT_SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>

          <Sep />

          {/* Bold */}
          <button type="button" title="Bold (Ctrl+B)" className={btn}
            onMouseDown={e => { e.preventDefault(); exec('bold') }}>
            <Bold className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>

          {/* Italic */}
          <button type="button" title="Italic (Ctrl+I)" className={btn}
            onMouseDown={e => { e.preventDefault(); exec('italic') }}>
            <Italic className="w-3.5 h-3.5" />
          </button>

          {/* Underline */}
          <button type="button" title="Underline (Ctrl+U)" className={btn}
            onMouseDown={e => { e.preventDefault(); exec('underline') }}>
            <Underline className="w-3.5 h-3.5" />
          </button>

          <Sep />

          {/* Text color */}
          <button
            type="button"
            title="Font color"
            className={cn(btn, 'relative')}
            onMouseDown={e => e.preventDefault()}
            onClick={() => colorInputRef.current?.click()}
          >
            <Palette className="w-3.5 h-3.5" />
            <input
              ref={colorInputRef}
              type="color"
              defaultValue="#000000"
              onChange={handleColorChange}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              tabIndex={-1}
            />
          </button>

          <Sep />

          {/* Align left */}
          <button type="button" title="Align left" className={btn}
            onMouseDown={e => { e.preventDefault(); exec('justifyLeft') }}>
            <AlignLeft className="w-3.5 h-3.5" />
          </button>

          {/* Align center */}
          <button type="button" title="Align center" className={btn}
            onMouseDown={e => { e.preventDefault(); exec('justifyCenter') }}>
            <AlignCenter className="w-3.5 h-3.5" />
          </button>

          {/* Align right */}
          <button type="button" title="Align right" className={btn}
            onMouseDown={e => { e.preventDefault(); exec('justifyRight') }}>
            <AlignRight className="w-3.5 h-3.5" />
          </button>

          {/* Justify */}
          <button type="button" title="Justify" className={btn}
            onMouseDown={e => { e.preventDefault(); exec('justifyFull') }}>
            <AlignJustify className="w-3.5 h-3.5" />
          </button>

          <Sep />

          {/* Bullet list */}
          <button type="button" title="Bullet list" className={btn}
            onMouseDown={e => { e.preventDefault(); exec('insertUnorderedList') }}>
            <List className="w-3.5 h-3.5" />
          </button>

          {/* Numbered list */}
          <button type="button" title="Numbered list" className={btn}
            onMouseDown={e => { e.preventDefault(); exec('insertOrderedList') }}>
            <ListOrdered className="w-3.5 h-3.5" />
          </button>

          {/* Indent (Tab) */}
          <button type="button" title="Increase indent (Tab)" className={btn}
            onMouseDown={e => { e.preventDefault(); exec('indent') }}>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="8" x2="21" y2="8"/><line x1="3" y1="16" x2="21" y2="16"/>
              <polyline points="9 12 15 12"/><polyline points="12 9 15 12 12 15"/>
            </svg>
          </button>

          {/* Outdent (Shift+Tab) */}
          <button type="button" title="Decrease indent (Shift+Tab)" className={btn}
            onMouseDown={e => { e.preventDefault(); exec('outdent') }}>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="8" x2="21" y2="8"/><line x1="3" y1="16" x2="21" y2="16"/>
              <polyline points="15 12 9 12"/><polyline points="12 9 9 12 12 15"/>
            </svg>
          </button>

          <Sep />

          {/* Insert link */}
          <button type="button" title="Insert link" className={btn}
            onMouseDown={e => { e.preventDefault(); insertLink() }}>
            <Link2 className="w-3.5 h-3.5" />
          </button>

          {/* Attach file */}
          <button
            type="button"
            title="Attach file"
            className={cn(btn, 'relative')}
            onMouseDown={e => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="w-3.5 h-3.5" />
          </button>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileAttach} />

          {/* OneDrive */}
          <button
            type="button"
            title="OneDrive (connect in Integrations)"
            className={cn(btn, 'opacity-50 cursor-not-allowed')}
            onMouseDown={e => e.preventDefault()}
          >
            <OneDriveIcon className="w-3.5 h-3.5" />
          </button>

          <Sep />

          {/* Stripe invoice */}
          <div className="relative">
            <button
              type="button"
              title={stripeConnected ? 'Attach Stripe invoice' : 'Connect Stripe in Integrations'}
              className={cn(btn, !stripeConnected && 'opacity-40 cursor-not-allowed')}
              onMouseDown={e => e.preventDefault()}
              onClick={() => { if (stripeConnected) void openStripePicker() }}
            >
              {stripeLoading && stripeOpen
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <StripeIcon className="w-3.5 h-3.5" />
              }
            </button>

            {stripeOpen && (
              <StripePickerPanel
                invoices={stripeInvoices.map(inv => ({
                  ...inv,
                  _attaching: attachingId === inv.id,
                  _attached:  attachedIds.has(inv.id),
                }))}
                isLoading={stripeLoading}
                onPick={id => void pickInvoice(id)}
                onClose={() => setStripeOpen(false)}
              />
            )}
          </div>
        </div>

        {/* ── Editor area ── */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={() => onChange?.(editorRef.current?.innerHTML ?? '')}
          onKeyDown={handleKeyDown}
          data-placeholder={placeholder ?? 'Write your reply…'}
          style={{ minHeight }}
          className={cn(
            'px-4 py-3 text-sm text-gray-800 dark:text-gray-200 leading-relaxed bg-white dark:bg-[#232323] outline-none overflow-y-auto',
            // Placeholder via CSS pseudo-element when empty
            'empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:pointer-events-none empty:before:block',
          )}
        />
      </div>
    )
  }
)
