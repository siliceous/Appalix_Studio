import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session')
  if (!sessionId) return NextResponse.json({ error: 'Missing session' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('integrations')
    .select('config')
    .eq('id', sessionId)
    .eq('status', 'pending')
    .single()

  if (error || !data) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const cfg        = data.config as Record<string, unknown>
  const candidates = (cfg.pending_accounts as { igAccountId: string; igUsername: string; pageId: string; pageName: string }[] | undefined) ?? []

  // Return only safe display fields (no access tokens)
  return NextResponse.json({
    candidates: candidates.map(c => ({
      igAccountId: c.igAccountId,
      igUsername:  c.igUsername,
      pageId:      c.pageId,
      pageName:    c.pageName,
    })),
  })
}
