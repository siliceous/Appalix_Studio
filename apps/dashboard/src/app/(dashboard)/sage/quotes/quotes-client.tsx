'use client'

import {
  Plus, Search, FileText, Receipt, Package,
  ChevronDown, Trash2, Eye,
  CheckCircle, Clock, AlertCircle, XCircle, Send, RefreshCw,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useMemo, useRef, useEffect } from 'react'
import { deleteDocument } from '@/app/actions/sage-documents'
import type { SageDocument, SageDocumentType, SageDocumentStatus } from '@/lib/types'

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style:    'currency',
    currency: currency ?? 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  })
}

function isOverdue(doc: SageDocument) {
  if (!doc.due_date) return false
  if (doc.status === 'paid' || doc.status === 'void') return false
  return new Date(doc.due_date) < new Date()
}

// ── Status config ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<SageDocumentStatus, {
  label: string
  badge: string
  icon:  React.ReactNode
}> = {
  draft: {
    label: 'Draft',
    badge: 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10',
    icon:  <FileText className="w-3 h-3" />,
  },
  sent: {
    label: 'Sent',
    badge: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200/70 dark:border-blue-500/20',
    icon:  <Send className="w-3 h-3" />,
  },
  accepted: {
    label: 'Accepted',
    badge: 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200/70 dark:border-green-500/20',
    icon:  <CheckCircle className="w-3 h-3" />,
  },
  declined: {
    label: 'Declined',
    badge: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200/70 dark:border-red-500/20',
    icon:  <XCircle className="w-3 h-3" />,
  },
  invoiced: {
    label: 'Invoiced',
    badge: 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200/70 dark:border-purple-500/20',
    icon:  <Receipt className="w-3 h-3" />,
  },
  paid: {
    label: 'Paid',
    badge: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-500/20',
    icon:  <CheckCircle className="w-3 h-3" />,
  },
  partial: {
    label: 'Partial',
    badge: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200/70 dark:border-amber-500/20',
    icon:  <Clock className="w-3 h-3" />,
  },
  overdue: {
    label: 'Overdue',
    badge: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200/70 dark:border-red-500/20',
    icon:  <AlertCircle className="w-3 h-3" />,
  },
  void: {
    label: 'Void',
    badge: 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-white/10',
    icon:  <XCircle className="w-3 h-3" />,
  },
}

// ── Type config ────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<SageDocumentType, {
  label: string
  badge: string
  icon:  React.ReactNode
}> = {
  quote: {
    label: 'Quote',
    badge: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200/70 dark:border-blue-500/20',
    icon:  <FileText className="w-3 h-3" />,
  },
  packing_list: {
    label: 'Packing List',
    badge: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200/70 dark:border-amber-500/20',
    icon:  <Package className="w-3 h-3" />,
  },
  invoice: {
    label: 'Invoice',
    badge: 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200/70 dark:border-purple-500/20',
    icon:  <Receipt className="w-3 h-3" />,
  },
}

// ── Tab definitions ────────────────────────────────────────────────────────────

type TabKey = 'all' | SageDocumentType

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all',          label: 'All' },
  { key: 'quote',        label: 'Quotes' },
  { key: 'packing_list', label: 'Packing Lists' },
  { key: 'invoice',      label: 'Invoices' },
]

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  initialDocuments: SageDocument[]
}

export function QuotesClient({ initialDocuments }: Props) {
  const router = useRouter()
  const [documents, setDocuments] = useState<SageDocument[]>(initialDocuments)
  const [search, setSearch]       = useState('')
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [deletingId, setDeletingId]     = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Stats ────────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const quotes    = documents.filter(d => d.doc_type === 'quote')
    const invoices  = documents.filter(d => d.doc_type === 'invoice')
    const outstanding = invoices
      .filter(d => d.status === 'sent' || d.status === 'overdue' || d.status === 'partial')
      .reduce((s, d) => s + (d.total ?? 0), 0)
    const paid = invoices
      .filter(d => d.status === 'paid')
      .reduce((s, d) => s + (d.total ?? 0), 0)

    return {
      quoteCount:    quotes.length,
      quoteTotal:    quotes.reduce((s, d) => s + (d.total ?? 0), 0),
      invoiceCount:  invoices.length,
      invoiceTotal:  invoices.reduce((s, d) => s + (d.total ?? 0), 0),
      outstanding,
      paid,
      // Default currency for display (use first doc's, fallback USD)
      currency: documents[0]?.currency ?? 'USD',
    }
  }, [documents])

  // ── Tab counts ───────────────────────────────────────────────────────────────

  const tabCounts = useMemo<Record<TabKey, number>>(() => ({
    all:          documents.length,
    quote:        documents.filter(d => d.doc_type === 'quote').length,
    packing_list: documents.filter(d => d.doc_type === 'packing_list').length,
    invoice:      documents.filter(d => d.doc_type === 'invoice').length,
  }), [documents])

  // ── Filtered docs ────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = documents
    if (activeTab !== 'all') {
      list = list.filter(d => d.doc_type === activeTab)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(d =>
        d.doc_number.toLowerCase().includes(q) ||
        (d.contact?.name ?? '').toLowerCase().includes(q) ||
        (d.company?.name ?? '').toLowerCase().includes(q)
      )
    }
    return list
  }, [documents, activeTab, search])

  // ── Actions ──────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    if (!confirm('Delete this document? This cannot be undone.')) return
    setDeletingId(id)
    const { error } = await deleteDocument(id)
    setDeletingId(null)
    if (error) {
      alert(`Error: ${error}`)
    } else {
      setDocuments(prev => prev.filter(d => d.id !== id))
    }
  }

  function navigate(type: SageDocumentType) {
    setDropdownOpen(false)
    router.push(`/sage/quotes/new?type=${type}`)
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Quotes &amp; Invoices
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Create and manage quotes, packing lists, and invoices for your clients.
          </p>
        </div>

        {/* New Document dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(prev => !prev)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#15A4AE] hover:bg-[#128b94] active:bg-[#0f7880] text-white text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Document
            <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-48 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-lg z-20 overflow-hidden">
              <button
                onClick={() => navigate('quote')}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                <span className="text-base">📄</span>
                Quote
              </button>
              <button
                onClick={() => navigate('packing_list')}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-t border-gray-100 dark:border-white/5"
              >
                <span className="text-base">📦</span>
                Packing List
              </button>
              <button
                onClick={() => navigate('invoice')}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-t border-gray-100 dark:border-white/5"
              >
                <span className="text-base">🧾</span>
                Invoice
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Quotes */}
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10">
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Total Quotes
            </span>
          </div>
          <p className="text-xl font-semibold text-gray-900 dark:text-white">
            {formatCurrency(stats.quoteTotal, stats.currency)}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {stats.quoteCount} document{stats.quoteCount !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Total Invoices */}
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-500/10">
              <Receipt className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Total Invoices
            </span>
          </div>
          <p className="text-xl font-semibold text-gray-900 dark:text-white">
            {formatCurrency(stats.invoiceTotal, stats.currency)}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {stats.invoiceCount} document{stats.invoiceCount !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Outstanding */}
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Outstanding
            </span>
          </div>
          <p className="text-xl font-semibold text-gray-900 dark:text-white">
            {formatCurrency(stats.outstanding, stats.currency)}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Sent &amp; overdue</p>
        </div>

        {/* Paid */}
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Paid
            </span>
          </div>
          <p className="text-xl font-semibold text-gray-900 dark:text-white">
            {formatCurrency(stats.paid, stats.currency)}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Invoices paid</p>
        </div>
      </div>

      {/* ── Tabs + Search ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 rounded-lg p-1">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all
                ${activeTab === tab.key
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }
              `}
            >
              {tab.label}
              {tabCounts[tab.key] > 0 && (
                <span className={`
                  inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold
                  ${activeTab === tab.key
                    ? 'bg-[#15A4AE]/15 text-[#15A4AE]'
                    : 'bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400'
                  }
                `}>
                  {tabCounts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by number or client…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 transition"
          />
        </div>
      </div>

      {/* ── Table / Empty state ── */}
      {filtered.length === 0 ? (
        <EmptyState
          hasDocuments={documents.length > 0}
          onNew={() => navigate('quote')}
        />
      ) : (
        <div className="rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden bg-white dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-white/5">
              <thead>
                <tr className="bg-gray-50 dark:bg-white/[0.03]">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Document #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Client
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Project
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Issue Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Due Date
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {filtered.map(doc => {
                  const overdueFlag = isOverdue(doc)
                  const typeConf   = TYPE_CONFIG[doc.doc_type]
                  const statusConf = STATUS_CONFIG[doc.status]
                  const clientName = doc.contact?.name ?? doc.company?.name ?? '—'
                  const isDeleting = deletingId === doc.id

                  return (
                    <tr
                      key={doc.id}
                      className="hover:bg-gray-50/70 dark:hover:bg-white/[0.02] transition-colors group"
                    >
                      {/* Document # + type badge */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                            {doc.doc_number}
                          </span>
                          <span className={`inline-flex items-center gap-1 self-start px-1.5 py-0.5 rounded text-[10px] font-semibold ${typeConf.badge}`}>
                            {typeConf.icon}
                            {typeConf.label}
                          </span>
                        </div>
                      </td>

                      {/* Client */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {clientName}
                        </span>
                      </td>

                      {/* Project */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {doc.project?.name ?? '—'}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3 text-right">
                        <span className={`text-sm font-semibold tabular-nums ${doc.status === 'void' ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                          {formatCurrency(doc.total ?? 0, doc.currency ?? 'USD')}
                        </span>
                      </td>

                      {/* Status badge */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${statusConf.badge}`}>
                          {statusConf.icon}
                          {statusConf.label}
                        </span>
                      </td>

                      {/* Issue date */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(doc.issue_date)}
                        </span>
                      </td>

                      {/* Due date */}
                      <td className="px-4 py-3">
                        <span className={`text-sm ${overdueFlag ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                          {overdueFlag && <AlertCircle className="w-3 h-3 inline mr-1 -mt-px" />}
                          {formatDate(doc.due_date)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => router.push(`/sage/quotes/${doc.id}`)}
                            title="View document"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(doc.id)}
                            disabled={isDeleting}
                            title="Delete document"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50"
                          >
                            {isDeleting
                              ? <RefreshCw className="w-4 h-4 animate-spin" />
                              : <Trash2 className="w-4 h-4" />
                            }
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Row count footer */}
          <div className="px-4 py-3 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02]">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Showing {filtered.length} of {documents.length} document{documents.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyState({
  hasDocuments,
  onNew,
}: {
  hasDocuments: boolean
  onNew: () => void
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 py-16 flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4">
        <Receipt className="w-8 h-8 text-gray-400 dark:text-gray-500" />
      </div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
        {hasDocuments ? 'No documents match your search' : 'No documents yet'}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mb-6">
        {hasDocuments
          ? 'Try adjusting your search or filter to find what you\'re looking for.'
          : 'Create quotes, packing lists, and invoices to share with your clients.'}
      </p>
      {!hasDocuments && (
        <button
          onClick={onNew}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#15A4AE] hover:bg-[#128b94] text-white text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create your first document
        </button>
      )}
    </div>
  )
}
