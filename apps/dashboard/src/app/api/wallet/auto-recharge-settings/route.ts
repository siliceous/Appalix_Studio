import { createClient }    from '@/lib/supabase/server'
import { NextResponse }     from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: memberRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  const member = memberRaw as { workspace_id: string; role: string } | null
  if (!member) return NextResponse.json({ error: 'No workspace' }, { status: 403 })
  if (member.role !== 'admin' && member.role !== 'owner') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const body = await req.json() as {
    auto_recharge_enabled?:   boolean
    auto_recharge_threshold?: number
    auto_recharge_amount?:    number
    low_balance_threshold?:   number
  }

  const allowed = ['auto_recharge_enabled', 'auto_recharge_threshold', 'auto_recharge_amount', 'low_balance_threshold']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (body[key as keyof typeof body] !== undefined) updates[key] = body[key as keyof typeof body]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const admin = getAdmin()
  const { error } = await admin
    .from('wallet_accounts' as never)
    .update(updates)
    .eq('workspace_id', member.workspace_id)

  if (error) return NextResponse.json({ error: (error as { message: string }).message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
