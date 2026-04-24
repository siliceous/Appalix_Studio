// Opt-out management — list and toggle SMS opt-out status for contacts.
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse }                    from 'next/server'

async function getWorkspaceId(): Promise<{ workspaceId: string; isAdmin: boolean } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single() as { data: { workspace_id: string; role: string } | null }

  if (!data) return null
  return {
    workspaceId: data.workspace_id,
    isAdmin:     data.role === 'admin' || data.role === 'owner',
  }
}

// GET /api/sms/compliance — list contacts with sms_opt_out = true
export async function GET() {
  const ws = await getWorkspaceId()
  if (!ws) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('sage_contacts')
    .select('id, name, phone, sms_opt_out, sms_opted_out_at, email')
    .eq('workspace_id', ws.workspaceId)
    .eq('sms_opt_out', true)
    .order('sms_opted_out_at', { ascending: false }) as {
      data: Array<{
        id:               string
        name:             string
        phone:            string | null
        sms_opt_out:      boolean
        sms_opted_out_at: string | null
        email:            string | null
      }> | null
      error: { message: string } | null
    }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ contacts: data ?? [] })
}

// PATCH /api/sms/compliance — manually toggle sms_opt_out for a contact
export async function PATCH(req: Request) {
  const ws = await getWorkspaceId()
  if (!ws) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ws.isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  const { contactId, optOut } = await req.json() as { contactId: string; optOut: boolean }
  if (!contactId || typeof optOut !== 'boolean') {
    return NextResponse.json({ error: 'contactId and optOut (boolean) are required' }, { status: 400 })
  }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('sage_contacts')
    .update({
      sms_opt_out:      optOut,
      sms_opted_out_at: optOut ? new Date().toISOString() : null,
    })
    .eq('id', contactId)
    .eq('workspace_id', ws.workspaceId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
