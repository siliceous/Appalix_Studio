import { NextResponse }          from 'next/server'
import { createClient }          from '@/lib/supabase/server'
import { getValidDriveToken }    from '@/lib/google-drive-token'

export type DriveFile = {
  id:           string
  name:         string
  mimeType:     string
  webViewLink:  string
  modifiedTime: string
}

/**
 * GET /api/google-drive/files
 * Returns the current user's recent Google Drive files (non-folder, non-trashed).
 * Uses the stored OAuth token and auto-refreshes it if expired.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: membershipRaw } = await (supabase as any)
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  const workspaceId = (membershipRaw as { workspace_id: string } | null)?.workspace_id
  if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 403 })

  const accessToken = await getValidDriveToken(user.id, workspaceId)
  if (!accessToken) {
    return NextResponse.json({ error: 'Google Drive not connected' }, { status: 404 })
  }

  const params = new URLSearchParams({
    q:        "trashed=false and mimeType!='application/vnd.google-apps.folder'",
    fields:   'files(id,name,mimeType,webViewLink,modifiedTime)',
    orderBy:  'modifiedTime desc',
    pageSize: '100',
  })

  const driveRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )

  if (!driveRes.ok) {
    const text = await driveRes.text()
    console.error('[api/google-drive/files] Drive API error:', driveRes.status, text)
    return NextResponse.json({ error: 'Drive API error' }, { status: 502 })
  }

  const data = await driveRes.json() as { files?: DriveFile[] }
  return NextResponse.json({ files: data.files ?? [] })
}
