import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse }                    from 'next/server'

const TELNYX_API = 'https://api.telnyx.com/v2'

function telnyxHeaders() {
  const key = process.env.TELNYX_API_KEY
  if (!key) throw new Error('TELNYX_API_KEY not configured')
  return { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await req.json() as { bot_id?: string | null }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: membershipRaw } = await (supabase as any)
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  const membership = membershipRaw as { workspace_id: string; role: string } | null

  if (!membership) return NextResponse.json({ error: 'No workspace' }, { status: 403 })

  const admin = createAdminClient()

  // Verify ownership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row } = await (admin as any)
    .from('workspace_phone_numbers')
    .select('workspace_id')
    .eq('id', id)
    .maybeSingle() as { data: { workspace_id: string } | null }

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (row.workspace_id !== membership.workspace_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any)
    .from('workspace_phone_numbers')
    .update({ bot_id: body.bot_id ?? null })
    .eq('id', id)

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: membershipRaw } = await (supabase as any)
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  const membership = membershipRaw as { workspace_id: string; role: string } | null

  if (!membership) return NextResponse.json({ error: 'No workspace' }, { status: 403 })
  if (membership.role !== 'admin' && membership.role !== 'owner') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const admin = createAdminClient()

  // Fetch the row to get provider_number_id and verify workspace ownership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row } = await (admin as any)
    .from('workspace_phone_numbers')
    .select('id, provider_number_id, e164, workspace_id')
    .eq('id', id)
    .maybeSingle() as { data: { id: string; provider_number_id: string | null; e164: string; workspace_id: string } | null }

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (row.workspace_id !== membership.workspace_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Release from Telnyx if we have a provider ID
  if (row.provider_number_id) {
    const res = await fetch(`${TELNYX_API}/phone_numbers/${row.provider_number_id}`, {
      method:  'DELETE',
      headers: telnyxHeaders(),
    })
    // 404 from Telnyx = already released, treat as success
    if (!res.ok && res.status !== 404) {
      const data = await res.json() as { errors?: Array<{ detail: string }> }
      const msg  = data.errors?.[0]?.detail ?? `Telnyx delete error ${res.status}`
      return NextResponse.json({ error: msg }, { status: 502 })
    }
  }

  // Soft-delete: stamp released_at
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any)
    .from('workspace_phone_numbers')
    .update({ released_at: new Date().toISOString() })
    .eq('id', id)

  return NextResponse.json({ ok: true })
}
