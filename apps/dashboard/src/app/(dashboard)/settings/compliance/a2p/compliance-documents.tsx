'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, CheckCircle2, Trash2, Camera, MapPin, CreditCard, Building2 } from 'lucide-react'
import { uploadComplianceDocument, deleteComplianceDocument } from '@/app/actions/compliance'

type ComplianceDocument = { id: string; document_type: string; file_name: string; country?: string; uploaded_at?: string }

type DocSpec = {
  type: string
  label: string
  description: string
  icon: React.ReactNode
  accept: string
}

const REQUIRED_DOCS: DocSpec[] = [
  {
    type:        'government_id',
    label:       'Government-issued ID',
    description: 'Passport, driver\'s licence, or national ID card',
    icon:        <CreditCard className="w-4 h-4 text-gray-400" />,
    accept:      '.pdf,.jpg,.jpeg,.png,.webp',
  },
  {
    type:        'proof_of_address',
    label:       'Proof of address',
    description: 'Utility bill, bank statement or official letter — dated within 3 months',
    icon:        <MapPin className="w-4 h-4 text-gray-400" />,
    accept:      '.pdf,.jpg,.jpeg,.png,.webp',
  },
  {
    type:        'business_license',
    label:       'Business licence / registration',
    description: 'Certificate of incorporation, business licence, or trading registration',
    icon:        <Building2 className="w-4 h-4 text-gray-400" />,
    accept:      '.pdf,.jpg,.jpeg,.png,.webp',
  },
  {
    type:        'face_scan',
    label:       'Face scan / selfie with ID',
    description: 'Clear photo of you holding your government ID next to your face',
    icon:        <Camera className="w-4 h-4 text-gray-400" />,
    accept:      '.jpg,.jpeg,.png,.webp',
  },
]

export function ComplianceDocuments({
  brandProfileId,
  documents,
}: {
  brandProfileId: string
  documents: ComplianceDocument[]
}) {
  const router   = useRouter()
  const [uploading, setUploading] = useState<string | null>(null)
  const [deleting,  setDeleting]  = useState<string | null>(null)
  const [error,     setError]     = useState<string | null>(null)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const getDoc = (type: string) =>
    documents.find(d => d.document_type === type) ?? null

  const done  = REQUIRED_DOCS.filter(s => getDoc(s.type)).length
  const total = REQUIRED_DOCS.length

  async function handleFile(docType: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(docType)
    setError(null)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('document_type', docType)
    fd.append('country', 'global')
    fd.append('brand_profile_id', brandProfileId)
    const result = await uploadComplianceDocument(fd)
    if (result?.error) setError(result.error)
    else router.refresh()
    setUploading(null)
    e.target.value = ''
  }

  async function handleDelete(docId: string) {
    setDeleting(docId)
    setError(null)
    const result = await deleteComplianceDocument(docId)
    if (result?.error) setError(result.error)
    else router.refresh()
    setDeleting(null)
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">Supporting documents</h2>
        <p className="text-xs text-gray-400 mt-0.5">{done}/{total} uploaded · required for carrier verification</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 divide-y dark:divide-white/5">
        {REQUIRED_DOCS.map(spec => {
          const uploaded    = getDoc(spec.type)
          const isUploading = uploading === spec.type
          const isDeleting  = deleting  === uploaded?.id

          return (
            <div key={spec.type} className="flex items-center gap-3 px-4 py-3.5">
              {/* Status icon */}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                uploaded ? 'bg-green-50 dark:bg-green-500/10' : 'bg-gray-100 dark:bg-white/5'
              }`}>
                {uploaded ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : spec.icon}
              </div>

              {/* Label */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{spec.label}</p>
                {uploaded
                  ? <p className="text-xs text-gray-400 truncate">
                      {uploaded.file_name}{uploaded.uploaded_at ? ` · ${new Date(uploaded.uploaded_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                    </p>
                  : <p className="text-xs text-gray-400">{spec.description}</p>
                }
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {uploaded && (
                  <button
                    onClick={() => handleDelete(uploaded.id)}
                    disabled={isDeleting}
                    title="Remove"
                    className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-40"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => fileRefs.current[spec.type]?.click()}
                  disabled={isUploading}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 ${
                    uploaded
                      ? 'border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                      : 'bg-[#15A4AE] hover:bg-[#0e8f99] text-white'
                  }`}
                >
                  <Upload className="w-3 h-3" />
                  {isUploading ? 'Uploading…' : uploaded ? 'Replace' : 'Upload'}
                </button>
                <input
                  ref={el => { fileRefs.current[spec.type] = el }}
                  type="file"
                  accept={spec.accept}
                  className="hidden"
                  onChange={e => handleFile(spec.type, e)}
                />
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-3 text-xs text-gray-400">
        Accepted: PDF, JPG, PNG, WebP · Max 10 MB per file · Files are stored securely and only shared with your carrier for verification.
      </p>
    </div>
  )
}
