import { NextResponse }        from 'next/server'
import { createClient }        from '@/lib/supabase/server'
import { getValidDriveToken }  from '@/lib/google-drive-token'

/**
 * GET /api/google-drive/token
 * Returns a short-lived Drive access token for the Google Picker widget.
 * Only accessible by the authenticated user — never cached.
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
  if (!accessToken) return NextResponse.json({ error: 'Google Drive not connected' }, { status: 404 })

  return NextResponse.json(
    { accessToken },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
