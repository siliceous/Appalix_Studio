'use client'

import { useState, useRef } from 'react'
import { createSource } from '@/app/actions/source'
import { Link2, FileText, AlignLeft, Upload, X, Lock, BookOpen, Cloud, HardDrive, Loader2, CheckCircle2, FolderOpen } from 'lucide-react'
import { SubmitButton } from '@/components/ui/submit-button'
import { createClient } from '@/lib/supabase/client'

type DriveFile = {
  id:           string
  name:         string
  mimeType:     string
  webViewLink:  string
  modifiedTime: string
}

export type SourceType =
  | 'url' | 'text' | 'file' | 'excel' | 'csv'
  | 'notion' | 'gitbook'
  | 'google_drive' | 'dropbox' | 'onedrive' | 'sharepoint'

const ALL_TYPES: {
  value:     SourceType
  label:     string
  desc:      string
  icon:      React.ReactNode
  minPlan:   string
  planLabel: string
}[] = [
  {
    value:     'url',
    label:     'Website URL',
    desc:      'Scrape and index any webpage',
    icon:      <Link2 className="w-4 h-4" />,
    minPlan:   'starter',
    planLabel: '',
  },
  {
    value:     'text',
    label:     'Plain text',
    desc:      'Paste FAQs, docs, or custom knowledge',
    icon:      <AlignLeft className="w-4 h-4" />,
    minPlan:   'core',
    planLabel: 'Core+',
  },
  {
    value:     'file',
    label:     'PDF / Word / ZIP',
    desc:      'Upload a PDF, Word, PowerPoint, image, or ZIP',
    icon:      <FileText className="w-4 h-4" />,
    minPlan:   'pro',
    planLabel: 'Pro+',
  },
  {
    value:     'excel',
    label:     'Excel / XLS',
    desc:      'Upload an .xlsx or .xls spreadsheet',
    icon:      <FileText className="w-4 h-4" />,
    minPlan:   'pro',
    planLabel: 'Pro+',
  },
  {
    value:     'csv',
    label:     'CSV',
    desc:      'Upload a comma-separated values file',
    icon:      <AlignLeft className="w-4 h-4" />,
    minPlan:   'pro',
    planLabel: 'Pro+',
  },
  {
    value:     'notion',
    label:     'Notion',
    desc:      'Index a Notion page via integration token',
    icon:      <BookOpen className="w-4 h-4" />,
    minPlan:   'pro',
    planLabel: 'Pro+',
  },
  {
    value:     'gitbook',
    label:     'GitBook',
    desc:      'Index a GitBook space via API token',
    icon:      <BookOpen className="w-4 h-4" />,
    minPlan:   'pro',
    planLabel: 'Pro+',
  },
  {
    value:     'google_drive',
    label:     'Google Drive',
    desc:      'Index a Google Doc or Drive file',
    icon:      <Cloud className="w-4 h-4" />,
    minPlan:   'pro',
    planLabel: 'Pro+',
  },
  {
    value:     'dropbox',
    label:     'Dropbox',
    desc:      'Index a file or shared link from Dropbox',
    icon:      <Cloud className="w-4 h-4" />,
    minPlan:   'pro',
    planLabel: 'Pro+',
  },
  {
    value:     'onedrive',
    label:     'OneDrive',
    desc:      'Index a file from Microsoft OneDrive',
    icon:      <HardDrive className="w-4 h-4" />,
    minPlan:   'pro',
    planLabel: 'Pro+',
  },
  {
    value:     'sharepoint',
    label:     'SharePoint',
    desc:      'Index a file from SharePoint via Graph API',
    icon:      <HardDrive className="w-4 h-4" />,
    minPlan:   'pro',
    planLabel: 'Pro+',
  },
]

interface Props {
  allowedTypes:    SourceType[]
  gdriveConnected: boolean
  gdriveEmail:     string | null
  initialType?:    SourceType
}

const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500'
const monoInputCls = `${inputCls} font-mono`

const MAX_FILE_BYTES = 50 * 1024 * 1024 // 50 MB

type UploadState = 'idle' | 'uploading' | 'done' | 'error'

// Mime-type display helpers for Google Drive files
function driveTypeLabel(mimeType: string): string {
  const map: Record<string, string> = {
    'application/vnd.google-apps.document':     'Doc',
    'application/vnd.google-apps.spreadsheet':  'Sheet',
    'application/vnd.google-apps.presentation': 'Slides',
    'application/pdf':                          'PDF',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
    'text/plain': 'Text',
    'text/csv':   'CSV',
  }
  return map[mimeType] ?? 'File'
}

function driveTypeBadge(mimeType: string): string {
  if (mimeType.includes('document'))     return 'bg-blue-100   text-blue-700   dark:bg-blue-500/20   dark:text-blue-300'
  if (mimeType.includes('spreadsheet'))  return 'bg-green-100  text-green-700  dark:bg-green-500/20  dark:text-green-300'
  if (mimeType.includes('presentation')) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300'
  if (mimeType === 'application/pdf')    return 'bg-red-100    text-red-700    dark:bg-red-500/20    dark:text-red-300'
  return 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400'
}

export function NewSourceForm({ allowedTypes, gdriveConnected, gdriveEmail, initialType }: Props) {
  const firstAllowed = allowedTypes[0] ?? 'url'
  const [type, setType]             = useState<SourceType>(
    initialType && allowedTypes.includes(initialType) ? initialType : firstAllowed
  )
  const [tutorialUrl, setTutorialUrl] = useState<string | null>(null)
  const [fileName, setFileName]     = useState<string | null>(null)
  const [fileError, setFileError]   = useState<string | null>(null)
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [storagePath, setStoragePath] = useState<string>('')
  const [fileMime, setFileMime]       = useState<string>('')
  const [fileOrigName, setFileOrigName] = useState<string>('')
  const fileRef  = useRef<HTMLInputElement>(null)
  const nameRef  = useRef<HTMLInputElement>(null)

  // Google Drive file picker state (uses Google Picker API with drive.file scope)
  const [driveLoading, setDriveLoading]           = useState(false)
  const [driveUrl, setDriveUrl]                   = useState('')
  const [selectedDriveFile, setSelectedDriveFile] = useState<DriveFile | null>(null)

  function selectDriveFile(file: DriveFile) {
    setSelectedDriveFile(file)
    setDriveUrl(file.webViewLink)
    if (nameRef.current && !nameRef.current.value) {
      nameRef.current.value = file.name
    }
  }

  async function openGooglePicker() {
    setDriveLoading(true)
    try {
      const res = await fetch('/api/google-drive/token')
      if (!res.ok) throw new Error('Drive not connected')
      const { accessToken } = await res.json() as { accessToken: string }

      await loadPickerScript()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const google = (window as any).google
      const view = new google.picker.DocsView()
        .setIncludeFolders(false)
        .setSelectFolderEnabled(false)

      new google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(accessToken)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .setCallback((data: any) => {
          if (data.action === google.picker.Action.PICKED && data.docs?.[0]) {
            const f = data.docs[0]
            selectDriveFile({
              id:           f.id,
              name:         f.name,
              mimeType:     f.mimeType,
              webViewLink:  f.url,
              modifiedTime: f.lastEditedUtc
                ? new Date(f.lastEditedUtc).toISOString()
                : new Date().toISOString(),
            })
          }
        })
        .build()
        .setVisible(true)
    } catch (err) {
      console.error('[openGooglePicker]', err)
    } finally {
      setDriveLoading(false)
    }
  }

  function loadPickerScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).google?.picker) { resolve(); return }
      const existing = document.querySelector('script[src="https://apis.google.com/js/api.js"]')
      if (existing) {
        // script loaded but picker not ready yet — wait for gapi
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(window as any).gapi.load('picker', () => resolve())
        return
      }
      const s = document.createElement('script')
      s.src = 'https://apis.google.com/js/api.js'
      s.onload = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(window as any).gapi.load('picker', () => resolve())
      }
      s.onerror = () => reject(new Error('Failed to load Google API script'))
      document.head.appendChild(s)
    })
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_FILE_BYTES) {
      setFileError(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 50 MB.`)
      e.target.value = ''
      return
    }

    setFileError(null)
    setFileName(file.name)
    setUploadState('uploading')
    setStoragePath('')

    try {
      // 1. Get a presigned upload URL from our API route (tiny request — just metadata)
      const urlRes = await fetch('/api/sources/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, mimeType: file.type }),
      })
      if (!urlRes.ok) throw new Error('Failed to get upload URL')
      const { token, storagePath: path } = await urlRes.json() as {
        token: string; storagePath: string
      }

      // 2. Upload file directly to Supabase Storage — bypasses Vercel entirely
      // The bucket allowlist only covers images + PDF. For all other types
      // (Office docs, Excel, CSV, ZIP) upload as octet-stream so the bucket
      // accepts it. The real MIME is stored in metadata for ingestion to use.
      const BUCKET_ALLOWED = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif']
      const uploadMime = BUCKET_ALLOWED.includes(file.type) ? file.type : 'application/octet-stream'
      const supabase = createClient()
      const { error: uploadErr } = await supabase.storage
        .from('sources')
        .uploadToSignedUrl(path, token, file, { contentType: uploadMime })
      if (uploadErr) throw new Error(uploadErr.message)

      setStoragePath(path)
      setFileMime(file.type)
      setFileOrigName(file.name)
      setUploadState('done')
    } catch (err) {
      setFileError(err instanceof Error ? err.message : 'Upload failed')
      setUploadState('error')
      setFileName(null)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function clearFile() {
    setFileName(null)
    setFileError(null)
    setUploadState('idle')
    setStoragePath('')
    setFileMime('')
    setFileOrigName('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const isCloudType = ['notion', 'gitbook', 'google_drive', 'dropbox', 'onedrive', 'sharepoint'].includes(type)
  const isFileType = type === 'file' || type === 'excel' || type === 'csv'
  // Disable submit if a file is selected but not yet uploaded
  const fileUploading = isFileType && uploadState === 'uploading'

  const TUTORIAL_URLS: Partial<Record<SourceType, string>> = {
    notion:       '/resources/connect-notion',
    gitbook:      '/resources/connect-gitbook',
    google_drive: '/resources/connect-google-drive',
    dropbox:      '/resources/connect-dropbox',
    onedrive:     '/resources/connect-onedrive',
    sharepoint:   '/resources/connect-sharepoint',
  }

  return (
    <>
    {/* Tutorial popup modal */}
    {tutorialUrl && (
      <div className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3 bg-[#1a1a1a] border-b border-white/10 shrink-0">
          <span className="text-sm font-medium text-white">Tutorial</span>
          <button
            type="button"
            onClick={() => setTutorialUrl(null)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            aria-label="Close tutorial"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <iframe
          src={tutorialUrl}
          className="flex-1 w-full bg-[#111]"
          title="Tutorial"
        />
      </div>
    )}
    <form action={createSource} className="space-y-6">
      <input type="hidden" name="type" value={type} />

      {/* Pre-uploaded file metadata (replaces raw file in form body) */}
      {storagePath && (
        <>
          <input type="hidden" name="file_path"     value={storagePath} />
          <input type="hidden" name="mime_type"     value={fileMime} />
          <input type="hidden" name="original_name" value={fileOrigName} />
        </>
      )}

      {/* Type selector */}
      <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-5">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Source type</p>
        <div className="grid grid-cols-3 gap-3">
          {ALL_TYPES.map(({ value, label, desc, icon, planLabel }) => {
            const locked = !allowedTypes.includes(value)
            return (
              <button
                key={value}
                type="button"
                disabled={locked}
                onClick={() => { setType(value); clearFile() }}
                className={`relative flex flex-col items-start gap-2 p-3 rounded-lg border text-left transition-colors ${
                  locked
                    ? 'border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/5 opacity-60 cursor-not-allowed'
                    : type === value
                      ? 'border-brand-500 dark:border-[#15A4AE]/60 bg-brand-50 dark:bg-[#15A4AE]/10'
                      : 'border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                {locked && (
                  <span className="absolute top-2 right-2 inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400">
                    <Lock className="w-2.5 h-2.5" />
                    {planLabel}
                  </span>
                )}
                <span className={locked ? 'text-gray-300 dark:text-white/20' : type === value ? 'text-brand-600 dark:text-[#15A4AE]' : 'text-gray-400 dark:text-gray-500'}>
                  {icon}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
                </div>
              </button>
            )
          })}
        </div>

        {!allowedTypes.includes('file') && (
          <p className="mt-3 text-xs text-gray-400">
            Unlock PDF, cloud drives &amp; more on the <span className="font-medium text-brand-600">Pro</span> plan.{' '}
            <a href="/billing" className="underline hover:text-brand-700">Upgrade →</a>
          </p>
        )}
        {!allowedTypes.includes('text') && (
          <p className="mt-3 text-xs text-gray-400">
            Unlock plain text sources on the <span className="font-medium text-brand-600">Core</span> plan.{' '}
            <a href="/billing" className="underline hover:text-brand-700">Upgrade →</a>
          </p>
        )}
      </div>

      {/* Fields */}
      <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Source name</label>
          <input
            ref={nameRef}
            type="text"
            name="name"
            required
            placeholder="e.g. Appalix homepage, Product FAQ, Pricing guide"
            className={inputCls}
          />
        </div>

        {type === 'url' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Page URL</label>
            <input type="url" name="url" required placeholder="https://yoursite.com/about" className={inputCls} />
          </div>
        )}

        {type === 'text' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Content</label>
            <textarea
              name="text"
              required
              rows={10}
              placeholder="Paste your FAQs, product documentation, pricing info, or any knowledge you want the bot to use..."
              className={`${inputCls} resize-y`}
            />
          </div>
        )}

        {isFileType && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {type === 'excel' ? 'Excel file' : type === 'csv' ? 'CSV file' : 'File'}
            </label>
            {fileName ? (
              <div className={`flex items-center gap-3 px-3 py-2.5 border rounded-lg ${
                uploadState === 'uploading' ? 'border-brand-300 bg-brand-50' :
                uploadState === 'done'      ? 'border-brand-400 bg-brand-50' :
                                             'border-red-300 bg-red-50'
              }`}>
                {uploadState === 'uploading' ? (
                  <Loader2 className="w-4 h-4 text-brand-600 shrink-0 animate-spin" />
                ) : uploadState === 'done' ? (
                  <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0" />
                ) : (
                  <FileText className="w-4 h-4 text-red-500 shrink-0" />
                )}
                <span className="text-sm text-gray-800 truncate flex-1">{fileName}</span>
                {uploadState === 'uploading'
                  ? <span className="text-xs text-brand-600 shrink-0">Uploading…</span>
                  : <button type="button" onClick={clearFile} className="text-gray-400 hover:text-gray-600 shrink-0"><X className="w-4 h-4" /></button>
                }
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-gray-300 dark:border-white/20 rounded-lg cursor-pointer hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-white/5 transition-colors">
                <Upload className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Click to upload a file</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {type === 'excel'
                    ? 'Excel spreadsheet (.xlsx, .xls) — up to 50 MB'
                    : type === 'csv'
                    ? 'CSV file (.csv) — up to 50 MB'
                    : 'PDF, Word, PowerPoint, ZIP, JPG, PNG — up to 50 MB'}
                </span>
                <input
                  ref={fileRef}
                  type="file"
                  accept={
                    type === 'excel' ? '.xlsx,.xls' :
                    type === 'csv'   ? '.csv' :
                    '.pdf,.doc,.docx,.pptx,.ppt,.zip,image/jpeg,image/png,image/webp,image/gif'
                  }
                  onChange={handleFile}
                  className="sr-only"
                />
              </label>
            )}
            {fileError
              ? <p className="mt-1.5 text-xs text-red-500">{fileError}</p>
              : <p className="mt-1.5 text-xs text-gray-400">
                  {type === 'excel'
                    ? 'Accepted: Excel (.xlsx, .xls) — max 50 MB'
                    : type === 'csv'
                    ? 'Accepted: CSV (.csv) — max 50 MB'
                    : 'Accepted: PDF, Word (.doc/.docx), PowerPoint (.pptx), ZIP, JPG, PNG — max 50 MB'}
                </p>
            }
          </div>
        )}

        {/* ── Notion ── */}
        {type === 'notion' && (
          <>
            <button type="button" onClick={() => setTutorialUrl(TUTORIAL_URLS.notion!)} className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-brand-400 border border-brand-600/30 rounded-lg hover:bg-brand-600/10 transition-colors">
              <BookOpen className="w-3.5 h-3.5" /> View step-by-step tutorial
            </button>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notion page URL</label>
              <input type="url" name="url" required placeholder="https://www.notion.so/your-page-title-abc123" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Integration token</label>
              <input type="password" name="notion_token" required placeholder="secret_…" className={monoInputCls} />
              <p className="text-xs text-gray-400 mt-1">
                In Notion: <span className="font-medium">Settings → Integrations → Develop your own integrations</span>. Share the page with your integration.{' '}
                <a href="/resources/connect-notion" target="_blank" rel="noreferrer" className="text-brand-400 hover:text-brand-300 underline">See full tutorial →</a>
              </p>
            </div>
          </>
        )}

        {/* ── GitBook ── */}
        {type === 'gitbook' && (
          <>
            <button type="button" onClick={() => setTutorialUrl(TUTORIAL_URLS.gitbook!)} className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-brand-400 border border-brand-600/30 rounded-lg hover:bg-brand-600/10 transition-colors">
              <BookOpen className="w-3.5 h-3.5" /> View step-by-step tutorial
            </button>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">GitBook space URL</label>
              <input type="url" name="url" required placeholder="https://app.gitbook.com/o/orgId/s/spaceId" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Personal API token</label>
              <input type="password" name="gitbook_token" required placeholder="gb-…" className={monoInputCls} />
              <p className="text-xs text-gray-400 mt-1">
                In GitBook: <span className="font-medium">Account settings → Developer → Personal access tokens → Create token</span>.{' '}
                <a href="/resources/connect-gitbook" target="_blank" rel="noreferrer" className="text-brand-400 hover:text-brand-300 underline">See full tutorial →</a>
              </p>
            </div>
          </>
        )}

        {/* ── Google Drive ── */}
        {type === 'google_drive' && (
          <>
            {gdriveConnected ? (
              <>
                {/* Connected badge */}
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-emerald-200 dark:border-emerald-700/40 bg-emerald-50 dark:bg-emerald-900/20">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Google Drive connected</p>
                    {gdriveEmail && <p className="text-xs text-emerald-600 dark:text-emerald-400 truncate">{gdriveEmail}</p>}
                  </div>
                  <a href="/api/oauth/google-drive?return=/sources/new" className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline shrink-0">
                    Reconnect
                  </a>
                </div>

                {/* Google Picker button */}
                <button
                  type="button"
                  onClick={openGooglePicker}
                  disabled={driveLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-300 dark:border-white/20 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-60"
                >
                  {driveLoading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Opening picker…</>
                    : <><FolderOpen className="w-4 h-4 text-gray-400" /> Browse Google Drive</>
                  }
                </button>

                {/* Selected file indicator */}
                {selectedDriveFile && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-50 dark:bg-[#15A4AE]/10 border border-brand-200 dark:border-[#15A4AE]/30">
                    <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded ${driveTypeBadge(selectedDriveFile.mimeType)}`}>
                      {driveTypeLabel(selectedDriveFile.mimeType)}
                    </span>
                    <span className="flex-1 text-sm text-gray-800 dark:text-gray-200 truncate">{selectedDriveFile.name}</span>
                    <button type="button" onClick={() => { setSelectedDriveFile(null); setDriveUrl('') }} className="text-gray-400 hover:text-gray-600 shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* URL field — pre-filled from picker, still editable */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Google Drive file URL
                  </label>
                  <input
                    type="url"
                    name="url"
                    required
                    value={driveUrl}
                    onChange={e => setDriveUrl(e.target.value)}
                    placeholder="Select a file above, or paste https://docs.google.com/…"
                    className={inputCls}
                  />
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-gray-200 dark:border-white/10 p-4 space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Connect Google Drive</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Sign in with Google to let Appalix read your Drive files. Tokens refresh automatically — no manual pasting needed.</p>
                </div>
                <a
                  href="/api/oauth/google-drive?return=/sources/new"
                  className="flex items-center justify-center gap-2 w-full py-2 px-4 border border-gray-300 dark:border-white/20 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Sign in with Google
                </a>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-white/10" /></div>
                  <div className="relative flex justify-center"><span className="px-2 text-xs text-gray-400 bg-white dark:bg-[#2a2a2a]">or use a Service Account instead</span></div>
                </div>
                <div>
                  <textarea
                    name="google_access_token"
                    rows={4}
                    placeholder={'{"type":"service_account","client_email":"…","private_key":"…"}'}
                    className={`${inputCls} font-mono resize-y`}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Paste your Service Account JSON key.{' '}
                    <a href="/resources/connect-google-drive" target="_blank" rel="noreferrer" className="text-brand-400 hover:text-brand-300 underline">See tutorial →</a>
                  </p>
                </div>
                {/* Manual URL for service account flow */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Google Drive file URL</label>
                  <input type="url" name="url" required placeholder="https://docs.google.com/document/d/FILE_ID/edit" className={inputCls} />
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Dropbox ── */}
        {type === 'dropbox' && (
          <>
            <button type="button" onClick={() => setTutorialUrl(TUTORIAL_URLS.dropbox!)} className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-brand-400 border border-brand-600/30 rounded-lg hover:bg-brand-600/10 transition-colors">
              <BookOpen className="w-3.5 h-3.5" /> View step-by-step tutorial
            </button>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Dropbox file path or shared link</label>
              <input type="text" name="url" required placeholder="/Documents/file.txt or https://www.dropbox.com/s/…" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Access token</label>
              <input type="password" name="dropbox_token" required placeholder="sl.…" className={monoInputCls} />
              <p className="text-xs text-gray-400 mt-1">
                In Dropbox: <span className="font-medium">App Console → Create app → Generate access token</span> (long-lived token).{' '}
                <a href="/resources/connect-dropbox" target="_blank" rel="noreferrer" className="text-brand-400 hover:text-brand-300 underline">See full tutorial →</a>
              </p>
            </div>
          </>
        )}

        {/* ── OneDrive ── */}
        {type === 'onedrive' && (
          <>
            <button type="button" onClick={() => setTutorialUrl(TUTORIAL_URLS.onedrive!)} className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-brand-400 border border-brand-600/30 rounded-lg hover:bg-brand-600/10 transition-colors">
              <BookOpen className="w-3.5 h-3.5" /> View step-by-step tutorial
            </button>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">OneDrive file URL</label>
              <input type="url" name="url" required placeholder="https://onedrive.live.com/…" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Microsoft Graph access token</label>
              <input type="password" name="ms_access_token" required placeholder="eyJ0…" className={monoInputCls} />
              <p className="text-xs text-gray-400 mt-1">
                Generate via <span className="font-medium">Microsoft Graph Explorer</span> (scope: <span className="font-mono bg-gray-100 dark:bg-white/10 dark:text-gray-300 px-1 rounded">Files.Read</span>).{' '}
                <a href="/resources/connect-onedrive" target="_blank" rel="noreferrer" className="text-brand-400 hover:text-brand-300 underline">See full tutorial →</a>
              </p>
            </div>
          </>
        )}

        {/* ── SharePoint ── */}
        {type === 'sharepoint' && (
          <>
            <button type="button" onClick={() => setTutorialUrl(TUTORIAL_URLS.sharepoint!)} className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-brand-400 border border-brand-600/30 rounded-lg hover:bg-brand-600/10 transition-colors">
              <BookOpen className="w-3.5 h-3.5" /> View step-by-step tutorial
            </button>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">SharePoint file URL</label>
              <input type="url" name="url" required placeholder="https://tenant.sharepoint.com/sites/…" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Microsoft Graph access token</label>
              <input type="password" name="ms_access_token" required placeholder="eyJ0…" className={monoInputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">SharePoint site ID</label>
              <input type="text" name="sharepoint_site_id" required placeholder="tenant.sharepoint.com,site-guid,web-guid" className={monoInputCls} />
              <p className="text-xs text-gray-400 mt-1">
                Find via <span className="font-mono bg-gray-100 dark:bg-white/10 dark:text-gray-300 px-1 rounded">GET https://graph.microsoft.com/v1.0/sites?search=your-site-name</span>.{' '}
                <a href="/resources/connect-sharepoint" target="_blank" rel="noreferrer" className="text-brand-400 hover:text-brand-300 underline">See full tutorial →</a>
              </p>
            </div>
          </>
        )}
      </div>

      {isCloudType && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-xl p-4 text-sm text-amber-700 dark:text-amber-300">
          <strong>Tokens are stored securely</strong> and used only to fetch your document content for indexing. We recommend using read-only scopes.
        </div>
      )}

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/40 rounded-xl p-4 text-sm text-blue-700 dark:text-blue-300">
        After adding, your source is processed and indexed automatically.
        Once <strong>Ready</strong>, bots with RAG enabled will use it to answer questions.
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton
          disabled={fileUploading || (isFileType && !storagePath && !fileError)}
          pendingText="Adding…"
          className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {fileUploading ? 'Uploading file…' : 'Add & index source'}
        </SubmitButton>
        <a href="/sources" className="px-5 py-2.5 text-sm text-gray-600 hover:text-gray-900 transition-colors">
          Cancel
        </a>
      </div>
    </form>
    </>
  )
}
