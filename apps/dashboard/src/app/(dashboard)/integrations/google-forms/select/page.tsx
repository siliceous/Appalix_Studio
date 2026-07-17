import { redirect }                      from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { FormsPickerClient }               from './forms-picker-client'

type DriveFile = {
  id:           string
  name:         string
  webViewLink?: string
  modifiedTime: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAdmin = any

async function getValidToken(
  admin: AnyAdmin,
  userId: string,
  workspaceId: string,
): Promise<string | null> {
  const { data } = await admin
    .from('sage_integrations')
    .select('config, status')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('provider', 'google_forms')
    .maybeSingle() as { data: { config: Record<string, string>; status: string } | null }

  if (!data || data.status !== 'connected') return null
  const cfg = data.config
  if (!cfg?.access_token || !cfg?.refresh_token) return null

  // Still valid? (5-min buffer)
  if (Date.now() < new Date(cfg.expires_at ?? 0).getTime() - 5 * 60 * 1000) {
    return cfg.access_token
  }

  // Refresh
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({
        client_id:     process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: cfg.refresh_token,
        grant_type:    'refresh_token',
      }),
    })
    const tok = await res.json() as { access_token?: string; expires_in?: number; error?: string }
    if (!tok.access_token || tok.error) return null

    const expiresAt = new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString()
    await admin
      .from('sage_integrations')
      .update({ config: { ...cfg, access_token: tok.access_token, expires_at: expiresAt } })
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('provider', 'google_forms')

    return tok.access_token
  } catch {
    return null
  }
}

export default async function GoogleFormsSelectPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  const membership = membershipRaw as { workspace_id: string } | null
  if (!membership) redirect('/login')

  const admin       = createAdminClient()
  const accessToken = await getValidToken(admin, user.id, membership.workspace_id)

  if (!accessToken) redirect('/integrations?error=gforms_error')

  // Fetch forms via Drive API
  let forms: DriveFile[] = []
  try {
    const params = new URLSearchParams({
      q:        "mimeType='application/vnd.google-apps.form'",
      fields:   'files(id,name,webViewLink,modifiedTime)',
      orderBy:  'modifiedTime desc',
      pageSize: '100',
    })
    const res  = await fetch(
      `https://www.googleapis.com/drive/v3/files?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    const json = await res.json() as { files?: DriveFile[] }
    forms = json.files ?? []
  } catch { /* render with empty list */ }

  return (
    <div className="max-w-3xl mx-auto py-10 px-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/integrations/google-forms.png" alt="Google Forms" className="w-8 h-8 object-contain" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Choose a Google Form</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Select the form whose responses you want to capture as leads. You can change this later.
        </p>
      </div>

      <FormsPickerClient
        forms={forms}
        workspaceId={membership.workspace_id}
        userId={user.id}
      />
    </div>
  )
}
