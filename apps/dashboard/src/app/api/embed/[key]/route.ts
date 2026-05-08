import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params
  if (!key) return NextResponse.json({ error: 'missing key' }, { status: 400, headers: CORS })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from('forms')
    .select('public_slug, type, behaviour, theme, name, status')
    .eq('embed_key', key)
    .eq('status', 'published')
    .maybeSingle()

  if (!data || !data.public_slug) {
    return NextResponse.json({ error: 'not_found' }, { status: 404, headers: CORS })
  }

  const theme = data.theme ?? {}
  const imgPos = theme.imagePosition
  const isSide = imgPos === 'left' || imgPos === 'right'
  const modalWidth = theme.modal?.width ?? (isSide ? '680px' : '520px')

  return NextResponse.json({
    slug:       data.public_slug,
    type:       data.type,
    name:       data.name,
    behaviour:  data.behaviour ?? {},
    modalWidth,
  }, { headers: { ...CORS, 'Cache-Control': 'public, max-age=60' } })
}
