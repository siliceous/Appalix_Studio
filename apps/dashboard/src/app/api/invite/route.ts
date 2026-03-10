import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import type { WorkspaceMemberRole } from '@/lib/types'

function inviteHtml(inviteLink: string, role: string, appName: string) {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:#ec732e;padding:24px 32px;">
          <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">${appName}</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">You've been invited</h1>
          <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.5;">
            You've been invited to join a workspace on ${appName} as a <strong>${role}</strong>.<br/>
            Click the button below to accept and get started.
          </p>
          <a href="${inviteLink}"
             style="display:inline-block;padding:13px 28px;background:#ec732e;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">
            Accept invitation
          </a>
          <p style="margin:28px 0 0;font-size:12px;color:#9ca3af;line-height:1.6;">
            This link is valid for 24 hours and can only be used once.<br/>
            If you didn't expect this invitation, you can safely ignore it.<br/>
            Having trouble? Copy and paste this URL:<br/>
            <a href="${inviteLink}" style="color:#ec732e;word-break:break-all;">${inviteLink}</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function POST(request: NextRequest) {
  const body = await request.json() as { email?: string; role?: string }
  const email = (body.email ?? '').trim().toLowerCase()
  const role  = (body.role ?? 'member') as WorkspaceMemberRole

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

  const admin = createAdminClient()

  // Load workspace and verify caller is owner/admin
  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  type MemberRow = { workspace_id: string; role: string }
  const membership = membershipRaw as MemberRow | null
  if (!membership) return NextResponse.json({ error: 'Workspace not found.' }, { status: 404 })
  if (!['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'You do not have permission to invite members.' }, { status: 403 })
  }

  const workspaceId = membership.workspace_id
  const appUrl      = process.env.NEXT_PUBLIC_APP_URL ?? 'https://appalix.ai'

  // Enforce seat limit
  const { data: wsRaw } = await supabase
    .from('workspaces')
    .select('seat_limit, extra_seats')
    .eq('id', workspaceId)
    .single()
  const wsData = wsRaw as { seat_limit: number | null; extra_seats: number } | null

  if (wsData?.seat_limit !== null && wsData?.seat_limit !== undefined) {
    const totalSeats = (wsData.seat_limit ?? 1) + (wsData.extra_seats ?? 0)
    const { count: memberCount } = await admin
      .from('workspace_members')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
    if ((memberCount ?? 0) >= totalSeats) {
      return NextResponse.json({
        error: `Seat limit reached (${memberCount}/${totalSeats}). Purchase extra seats or upgrade your plan.`,
      }, { status: 403 })
    }
  }

  // Generate invite link
  let invitedUserId: string | null = null
  let inviteLink: string | null = null

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { redirectTo: `${appUrl}/api/auth/callback` },
  })

  if (linkData?.user) {
    invitedUserId = linkData.user.id
    inviteLink    = linkData.properties?.action_link ?? null
    console.log('[invite] new user, inviteLink:', inviteLink ? 'ok' : 'NULL')
  } else if (linkError) {
    console.log('[invite] user exists:', linkError.message)
    const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const existing = usersData?.users.find((u) => u.email?.toLowerCase() === email)
    if (!existing) return NextResponse.json({ error: linkError.message }, { status: 400 })
    invitedUserId = existing.id
    const { data: mlData, error: mlError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: `${appUrl}/api/auth/callback` },
    })
    console.log('[invite] magiclink:', mlData?.properties?.action_link ? 'ok' : 'NULL', mlError?.message ?? '')
    inviteLink = mlData?.properties?.action_link ?? null
  }

  if (!invitedUserId) return NextResponse.json({ error: 'Could not resolve user.' }, { status: 400 })
  if (invitedUserId === user.id) return NextResponse.json({ error: 'You cannot invite yourself.' }, { status: 400 })

  // Check existing membership
  const { data: existingMember } = await admin
    .from('workspace_members')
    .select('id, role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', invitedUserId)
    .maybeSingle()

  if (existingMember) {
    if (['owner', 'admin'].includes(existingMember.role)) {
      return NextResponse.json({
        error: `This user is already a workspace ${existingMember.role}.`,
      }, { status: 400 })
    }
    // Resend email only
    if (inviteLink) await sendInviteEmail(email, inviteLink, existingMember.role, appUrl)
    return NextResponse.json({ ok: true })
  }

  // Insert new member
  const { error: insertError } = await admin
    .from('workspace_members')
    .upsert(
      { workspace_id: workspaceId, user_id: invitedUserId, role, invited_by: user.id, invited_at: new Date().toISOString() },
      { onConflict: 'workspace_id,user_id' },
    )

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  if (inviteLink) await sendInviteEmail(email, inviteLink, role, appUrl)

  return NextResponse.json({ ok: true })
}

async function sendInviteEmail(to: string, inviteLink: string, role: string, _appUrl: string) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (!RESEND_API_KEY) {
    console.error('[invite] RESEND_API_KEY not set')
    return
  }
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
  const appName   = 'Appalix'
  const resend    = new Resend(RESEND_API_KEY)
  const { error } = await resend.emails.send({
    from:    `${appName} <${fromEmail}>`,
    to:      [to],
    subject: `You've been invited to a workspace on ${appName}`,
    html:    inviteHtml(inviteLink, role, appName),
  })
  if (error) console.error('[invite] Resend error:', JSON.stringify(error))
  else console.log('[invite] email sent to', to)
}
