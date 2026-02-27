'use client'

import { useState, useRef } from 'react'
import { createSource } from '@/app/actions/source'
import { Link2, FileText, AlignLeft, Upload, X, Lock, BookOpen, Cloud, HardDrive } from 'lucide-react'
import { SubmitButton } from '@/components/ui/submit-button'

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

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'
const monoInputCls = `${inputCls} font-mono`

const MAX_FILE_BYTES = 50 * 1024 * 1024 // 50 MB

export function NewSourceForm({ allowedTypes }: Props) {
  const firstAllowed = allowedTypes[0] ?? 'url'
  const [type, setType]         = useState<SourceType>(firstAllowed)
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_BYTES) {
      setFileError(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 50 MB.`)
      e.target.value = ''
      return
    }
    setFileError(null)
    setFileName(file.name)
  }

  function clearFile() {
    setFileName(null)
    setFileError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const isCloudType = ['notion', 'gitbook', 'google_drive', 'dropbox', 'onedrive', 'sharepoint'].includes(type)

  return (
    <form action={createSource} className="space-y-6">
      <input type="hidden" name="type" value={type} />

      {/* Type selector */}
      <div className="bg-white rounded-xl border p-5">
        <p className="text-sm font-semibold text-gray-900 mb-3">Source type</p>
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
                    ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                    : type === value
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                {locked && (
                  <span className="absolute top-2 right-2 inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-500">
                    <Lock className="w-2.5 h-2.5" />
                    {planLabel}
                  </span>
                )}
                <span className={locked ? 'text-gray-300' : type === value ? 'text-brand-600' : 'text-gray-400'}>
                  {icon}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
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
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Source name</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Page URL</label>
            <input type="url" name="url" required placeholder="https://yoursite.com/about" className={inputCls} />
          </div>
        )}

        {type === 'text' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Content</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1.5">File</label>
            {fileName ? (
              <div className="flex items-center gap-3 px-3 py-2.5 border border-brand-300 bg-brand-50 rounded-lg">
                <FileText className="w-4 h-4 text-brand-600 shrink-0" />
                <span className="text-sm text-gray-800 truncate flex-1">{fileName}</span>
                <button type="button" onClick={clearFile} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-colors">
                <Upload className="w-6 h-6 text-gray-400" />
                <span className="text-sm text-gray-600">Click to upload a PDF or image</span>
                <span className="text-xs text-gray-400">PDF, JPG, PNG, WebP — up to 50 MB</span>
                <input
                  ref={fileRef}
                  type="file"
                  name="file"
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
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notion page URL</label>
              <input type="url" name="url" required placeholder="https://www.notion.so/your-page-title-abc123" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Integration token</label>
              <input type="password" name="notion_token" required placeholder="secret_…" className={monoInputCls} />
              <p className="text-xs text-gray-400 mt-1">
                In Notion: <span className="font-medium">Settings → Integrations → Develop your own integrations</span>. Share the page with your integration.
              </p>
            </div>
          </>
        )}

        {/* ── GitBook ── */}
        {type === 'gitbook' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">GitBook space URL</label>
              <input type="url" name="url" required placeholder="https://app.gitbook.com/o/orgId/s/spaceId" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Personal API token</label>
              <input type="password" name="gitbook_token" required placeholder="gb-…" className={monoInputCls} />
              <p className="text-xs text-gray-400 mt-1">
                In GitBook: <span className="font-medium">Account settings → Developer → Personal access tokens → Create token</span>.
              </p>
            </div>
          </>
        )}

        {/* ── Google Drive ── */}
        {type === 'google_drive' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Google Drive file URL</label>
              <input type="url" name="url" required placeholder="https://docs.google.com/document/d/FILE_ID/edit" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">OAuth access token</label>
              <input type="password" name="google_access_token" required placeholder="ya29.…" className={monoInputCls} />
              <p className="text-xs text-gray-400 mt-1">
                Generate via <span className="font-medium">Google OAuth Playground</span> (scope: <span className="font-mono bg-gray-100 px-1 rounded">drive.readonly</span>) or a service account with domain-wide delegation.
              </p>
            </div>
          </>
        )}

        {/* ── Dropbox ── */}
        {type === 'dropbox' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Dropbox file path or shared link</label>
              <input type="text" name="url" required placeholder="/Documents/file.txt or https://www.dropbox.com/s/…" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Access token</label>
              <input type="password" name="dropbox_token" required placeholder="sl.…" className={monoInputCls} />
              <p className="text-xs text-gray-400 mt-1">
                In Dropbox: <span className="font-medium">App Console → Create app → Generate access token</span> (long-lived token).
              </p>
            </div>
          </>
        )}

        {/* ── OneDrive ── */}
        {type === 'onedrive' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">OneDrive file URL</label>
              <input type="url" name="url" required placeholder="https://onedrive.live.com/…" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Microsoft Graph access token</label>
              <input type="password" name="ms_access_token" required placeholder="eyJ0…" className={monoInputCls} />
              <p className="text-xs text-gray-400 mt-1">
                Generate via <span className="font-medium">Microsoft Graph Explorer</span> (scope: <span className="font-mono bg-gray-100 px-1 rounded">Files.Read</span>).
              </p>
            </div>
          </>
        )}

        {/* ── SharePoint ── */}
        {type === 'sharepoint' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">SharePoint file URL</label>
              <input type="url" name="url" required placeholder="https://tenant.sharepoint.com/sites/…" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Microsoft Graph access token</label>
              <input type="password" name="ms_access_token" required placeholder="eyJ0…" className={monoInputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">SharePoint site ID</label>
              <input type="text" name="sharepoint_site_id" required placeholder="tenant.sharepoint.com,site-guid,web-guid" className={monoInputCls} />
              <p className="text-xs text-gray-400 mt-1">
                Find via <span className="font-mono bg-gray-100 px-1 rounded">GET https://graph.microsoft.com/v1.0/sites?search=your-site-name</span>.
              </p>
            </div>
          </>
        )}
      </div>

      {isCloudType && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
          <strong>Tokens are stored securely</strong> and used only to fetch your document content for indexing. We recommend using read-only scopes.
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
        After adding, your source is processed and indexed automatically.
        Once <strong>Ready</strong>, bots with RAG enabled will use it to answer questions.
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton
          pendingText="Adding…"
          className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Add &amp; index source
        </SubmitButton>
        <a href="/sources" className="px-5 py-2.5 text-sm text-gray-600 hover:text-gray-900 transition-colors">
          Cancel
        </a>
      </div>
    </form>
  )
}
