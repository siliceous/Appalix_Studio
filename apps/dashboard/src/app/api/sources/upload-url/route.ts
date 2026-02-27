import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * POST /api/sources/upload-url
 * Returns a Supabase Storage presigned upload URL so the browser can upload
 * files directly to storage without routing them through Vercel (which has a
 * 4.5 MB serverless function body limit).
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()
  const workspaceId = (membershipRaw as { workspace_id: string } | null)?.workspace_id
  if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 403 })

  const { fileName, mimeType } = await req.json() as { fileName: string; mimeType: string }
  const ext = (fileName.split('.').pop() ?? 'bin').toLowerCase()
  const storagePath = `${workspaceId}/${crypto.randomUUID()}.${ext}`

  const admin = createAdminClient()
  const { data, error } = await admin.storage
    .from('sources')
    .createSignedUploadUrl(storagePath)

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create upload URL' }, { status: 500 })
  }

  return NextResponse.json({
    signedUrl:   data.signedUrl,
    token:       data.token,
    storagePath,
    mimeType,
    originalName: fileName,
  })
}
