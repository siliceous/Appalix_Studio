'use client'

import { useState, useRef } from 'react'
import { createSource } from '@/app/actions/source'
import { Link2, FileText, AlignLeft, Upload, X, Lock, BookOpen, Cloud, HardDrive, Loader2, CheckCircle2 } from 'lucide-react'
import { SubmitButton } from '@/components/ui/submit-button'
import { createClient } from '@/lib/supabase/client'

export type SourceType =
  | 'url' | 'text' | 'file'
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
    label:     'PDF / Image',
    desc:      'Upload a PDF or image file (up to 50 MB)',
    icon:      <FileText className="w-4 h-4" />,
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
  allowedTypes: SourceType[]
}

const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500'
const monoInputCls = `${inputCls} font-mono`

const MAX_FILE_BYTES = 50 * 1024 * 1024 // 50 MB

type UploadState = 'idle' | 'uploading' | 'done' | 'error'

export function NewSourceForm({ allowedTypes }: Props) {
  const firstAllowed = allowedTypes[0] ?? 'url'
  const [type, setType]             = useState<SourceType>(firstAllowed)
  const [gdAuth, setGdAuth]         = useState<'json' | 'oauth'>('json')
  const [fileName, setFileName]     = useState<string | null>(null)
  const [fileError, setFileError]   = useState<string | null>(null)
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [storagePath, setStoragePath] = useState<string>('')
  const [fileMime, setFileMime]       = useState<string>('')
  const [fileOrigName, setFileOrigName] = useState<string>('')
  const fileRef = useRef<HTMLInputElement>(null)

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
      const supabase = createClient()
      const { error: uploadErr } = await supabase.storage
        .from('sources')
        .uploadToSignedUrl(path, token, file, { contentType: file.type })
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
  // Disable submit if a file is selected but not yet uploaded
  const fileUploading = type === 'file' && uploadState === 'uploading'

  return (
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
                      ? 'border-brand-500 dark:border-[#61c2ad]/60 bg-brand-50 dark:bg-[#61c2ad]/10'
                      : 'border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                {locked && (
                  <span className="absolute top-2 right-2 inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400">
                    <Lock className="w-2.5 h-2.5" />
                    {planLabel}
                  </span>
                )}
                <span className={locked ? 'text-gray-300 dark:text-white/20' : type === value ? 'text-brand-600 dark:text-[#61c2ad]' : 'text-gray-400 dark:text-gray-500'}>
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

        {type === 'file' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">File</label>
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
                <span className="text-sm text-gray-600 dark:text-gray-400">Click to upload a PDF or image</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">PDF, JPG, PNG, WebP — up to 50 MB</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleFile}
                  className="sr-only"
                />
              </label>
            )}
            {fileError
              ? <p className="mt-1.5 text-xs text-red-500">{fileError}</p>
              : <p className="mt-1.5 text-xs text-gray-400">Accepted: PDF, JPG, PNG, WebP &mdash; maximum file size 50 MB</p>
            }
          </div>
        )}

        {/* ── Notion ── */}
        {type === 'notion' && (
          <>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Google Drive file URL</label>
              <input type="url" name="url" required placeholder="https://docs.google.com/document/d/FILE_ID/edit" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Credential</label>
              {/* Method toggle */}
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setGdAuth('json')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    gdAuth === 'json'
                      ? 'bg-brand-600/20 border-brand-600/40 text-brand-300'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  Service Account JSON <span className="text-brand-400">(recommended)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGdAuth('oauth')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    gdAuth === 'oauth'
                      ? 'bg-white/10 border-white/20 text-white'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  OAuth token <span className="text-amber-400">(expires ~1 hr)</span>
                </button>
              </div>
              {gdAuth === 'json' ? (
                <>
                  <textarea
                    key="json"
                    name="google_access_token"
                    required
                    rows={5}
                    placeholder={'Open the downloaded Service Account .json key file,\nselect all the contents, and paste here.\n\nExample: {"type":"service_account","client_email":"…","private_key":"…"}'}
                    className={`${inputCls} font-mono resize-y`}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    In Google Cloud Console: create a Service Account, download the JSON key, and share the Drive file with the service account email.{' '}
                    <a href="/resources/connect-google-drive" target="_blank" rel="noreferrer" className="text-brand-400 hover:text-brand-300 underline">See full tutorial →</a>
                  </p>
                </>
              ) : (
                <>
                  <input
                    key="oauth"
                    type="password"
                    name="google_access_token"
                    required
                    placeholder="ya29.a0AfB…"
                    className={monoInputCls}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    From{' '}<span className="font-medium text-white">Google OAuth Playground</span> — select <span className="font-mono bg-white/10 dark:text-gray-300 px-1 rounded">drive.readonly</span> scope, authorise, and copy the access token.{' '}
                    <span className="text-amber-400 font-medium">Expires in ~1 hour.</span>{' '}
                    <a href="/resources/connect-google-drive" target="_blank" rel="noreferrer" className="text-brand-400 hover:text-brand-300 underline">See full tutorial →</a>
                  </p>
                </>
              )}
            </div>
          </>
        )}

        {/* ── Dropbox ── */}
        {type === 'dropbox' && (
          <>
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
          disabled={fileUploading || (type === 'file' && !storagePath && !fileError)}
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
  )
}
