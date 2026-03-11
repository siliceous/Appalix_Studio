'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import Stripe from 'stripe'
import type { WorkspaceMemberRole } from '@/lib/types'
import { ROLE_RANK, INVITE_ALLOWED } from '@/lib/types'

export async function inviteWorkspaceMember(
  _prevState: { error?: string; success?: boolean },
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const email = (formData.get('email') as string | null)?.trim().toLowerCase()
  const role  = (formData.get('role')  as WorkspaceMemberRole | null) ?? 'member'

  if (!email) return { error: 'Email is required.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const admin = createAdminClient()

  // Load the workspace and verify the current user is owner/admin
  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  type MemberRow = { workspace_id: string; role: string }
  const membership = membershipRaw as MemberRow | null
  if (!membership) return { error: 'Workspace not found.' }
  if (!['owner', 'admin'].includes(membership.role)) {
    return { error: 'You do not have permission to invite members.' }
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
      return {
        error: `Seat limit reached (${memberCount}/${totalSeats}). Purchase extra seats or upgrade your plan to invite more members.`,
      }
    }
  }

  // Generate invite link without triggering Supabase's own email
  let invitedUserId: string | null = null
  let inviteLink: string | null = null

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { redirectTo: `${appUrl}/dashboard` },
  })

  if (linkData?.user) {
    invitedUserId = linkData.user.id
    inviteLink    = linkData.properties?.action_link ?? null
    console.log('[invite] new user link generated, inviteLink:', inviteLink ? 'ok' : 'NULL')
  } else if (linkError) {
    console.log('[invite] generateLink error (user exists):', linkError.message)
    // User already has an account — look them up
    const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const existing = usersData?.users.find((u) => u.email?.toLowerCase() === email)
    if (!existing) return { error: linkError.message }
    invitedUserId = existing.id
    // Existing user: generate a magic link so they can jump straight in
    const { data: mlData, error: mlError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: `${appUrl}/dashboard` },
    })
    console.log('[invite] magiclink generated, inviteLink:', mlData?.properties?.action_link ? 'ok' : 'NULL', mlError?.message ?? '')
    inviteLink = mlData?.properties?.action_link ?? null
  }

  if (!invitedUserId) return { error: 'Could not resolve user for that email.' }

  // Safety: never allow the caller to be upserted as the invited user
  if (invitedUserId === user.id) return { error: 'You cannot invite yourself.' }

  // Check if user is already a member of this workspace
  const { data: existingMember } = await admin
    .from('workspace_members')
    .select('id, role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', invitedUserId)
    .maybeSingle()

  if (existingMember) {
    if (['owner', 'admin'].includes(existingMember.role)) {
      return { error: `This user is already a workspace ${existingMember.role} and cannot be re-invited.` }
    }
    // Already a member/viewer — just resend the invite email without touching their role
    if (inviteLink && process.env.RESEND_API_KEY) {
      const resend    = new Resend(process.env.RESEND_API_KEY)
      const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
      const appName   = 'Appalix'
      await resend.emails.send({
        from:    `${appName} <${fromEmail}>`,
        to:      [email],
        subject: `You've been invited to a workspace on ${appName}`,
        html: `
<!DOCTYPE html>
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
            You've been invited to join a workspace on ${appName} as a <strong>${existingMember.role}</strong>.<br/>
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
</html>`,
      })
    }
    return { success: true }
  }

  // Upsert — new member
  const { error: insertError } = await admin
    .from('workspace_members')
    .upsert(
      {
        workspace_id: workspaceId,
        user_id:      invitedUserId,
        role,
        invited_by:   user.id,
        invited_at:   new Date().toISOString(),
      },
      { onConflict: 'workspace_id,user_id' },
    )

  if (insertError) return { error: insertError.message }

  // Send branded invite email via Resend
  if (inviteLink && process.env.RESEND_API_KEY) {
    const resend    = new Resend(process.env.RESEND_API_KEY)
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
    const appName   = 'Appalix'
    await resend.emails.send({
      from:    `${appName} <${fromEmail}>`,
      to:      [email],
      subject: `You've been invited to a workspace on ${appName}`,
      html: `
<!DOCTYPE html>
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
</html>`,
    })
  }

  return { success: true }
}

export async function removeMember(
  memberId: string,
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const admin = createAdminClient()

  // Load caller's membership
  const { data: callerRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  type MemberRow = { workspace_id: string; role: WorkspaceMemberRole }
  const caller = callerRaw as MemberRow | null
  if (!caller) return { error: 'Workspace not found.' }
  if ((ROLE_RANK[caller.role] ?? 0) < ROLE_RANK.manager) {
    return { error: 'You do not have permission to remove members.' }
  }

  // Load target membership
  const { data: targetRaw } = await admin
    .from('workspace_members')
    .select('id, role, workspace_id, user_id')
    .eq('id', memberId)
    .single()

  const target = targetRaw as (MemberRow & { id: string; user_id: string }) | null
  if (!target) return { error: 'Member not found.' }
  if (target.workspace_id !== caller.workspace_id) return { error: 'Member not in your workspace.' }
  if (target.role === 'owner') return { error: 'Cannot remove the workspace owner.' }
  if ((ROLE_RANK[caller.role] ?? 0) <= (ROLE_RANK[target.role] ?? 0)) {
    return { error: 'You cannot remove someone at the same or higher level.' }
  }
  if (target.user_id === user.id) return { error: 'Cannot remove yourself.' }

  const { error } = await admin.from('workspace_members').delete().eq('id', memberId)
  if (error) return { error: error.message }

  // Delete profile and auth account (best-effort — don't block the UI response)
  void (async () => {
    await admin.from('user_profiles').delete().eq('user_id', target.user_id)
    await admin.auth.admin.deleteUser(target.user_id).catch(console.error)
  })().catch(console.error)

  revalidatePath('/settings')
  return { success: true }
}

export async function updateMemberRole(
  memberId: string,
  role: WorkspaceMemberRole,
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // Only owners can change roles
  const { data: callerRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  type MemberRow = { workspace_id: string; role: WorkspaceMemberRole }
  const caller = callerRaw as MemberRow | null
  if (!caller) return { error: 'Workspace not found.' }

  if (role === 'owner') return { error: 'Cannot assign owner role.' }
  // Caller must outrank the target role being assigned
  if ((ROLE_RANK[caller.role] ?? 0) <= (ROLE_RANK[role] ?? 0)) {
    return { error: 'You cannot assign a role equal to or above your own.' }
  }
  // Role must be in caller's invitable list
  if (!(INVITE_ALLOWED[caller.role] ?? []).includes(role)) {
    return { error: `You cannot assign the ${role} role.` }
  }

  const admin = createAdminClient()

  const { data: targetRaw } = await admin
    .from('workspace_members')
    .select('id, role, workspace_id')
    .eq('id', memberId)
    .single()

  const target = targetRaw as (MemberRow & { id: string }) | null
  if (!target) return { error: 'Member not found.' }
  if (target.workspace_id !== caller.workspace_id) return { error: 'Member not in your workspace.' }
  if (target.role === 'owner') return { error: "Cannot change the owner's role." }
  if ((ROLE_RANK[caller.role] ?? 0) <= (ROLE_RANK[target.role] ?? 0)) {
    return { error: 'You cannot change the role of someone at the same or higher level.' }
  }

  const { error } = await admin
    .from('workspace_members')
    .update({ role })
    .eq('id', memberId)

  if (error) return { error: error.message }

  return { success: true }
}

export async function deleteWorkspace() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Must be the workspace owner
  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id, role, workspaces(stripe_subscription_id)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  type MemberRow = {
    workspace_id: string
    role: string
    workspaces: { stripe_subscription_id: string | null }
  }
  const membership = membershipRaw as MemberRow | null

  if (!membership || membership.role !== 'owner') {
    throw new Error('Only the workspace owner can delete the workspace.')
  }

  const workspaceId    = membership.workspace_id
  const subscriptionId = membership.workspaces.stripe_subscription_id

  // Cancel Stripe subscription if one exists
  if (subscriptionId && process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
      await stripe.subscriptions.cancel(subscriptionId)
    } catch (err) {
      // Log but don't block deletion — the subscription may already be cancelled
      console.error('[deleteWorkspace] Stripe cancellation failed:', err)
    }
  }

  // Delete workspace (cascades to bots, conversations, messages, members, etc.)
  const admin = createAdminClient()
  await admin.from('workspaces').delete().eq('id', workspaceId)

  // Sign the user out
  await supabase.auth.signOut()

  redirect('/')
}

export async function createWorkspace(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const name = (formData.get('name') as string | null)?.trim() || 'My Workspace'
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const suffix = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * 36)]).join('')
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) + '-' + suffix

  const admin = createAdminClient()

  const { data: workspace, error } = await admin
    .from('workspaces')
    .insert({ name, slug, plan: 'starter', subscription_status: 'trialing' })
    .select()
    .single()

  if (error || !workspace) {
    throw new Error(error?.message ?? 'Failed to create workspace')
  }

  await admin.from('workspace_members').insert({
    workspace_id: workspace.id,
    user_id:      user.id,
    role:         'owner',
    accepted_at:  new Date().toISOString(),
  })

  redirect('/dashboard')
}

export async function toggleRoundRobin(
  enabled: boolean,
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  if (!membership) return { error: 'Workspace not found.' }

  const { workspace_id, role } = membership as { workspace_id: string; role: string }
  if (!['owner', 'admin'].includes(role)) return { error: 'Only owners and admins can change this setting.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('workspaces')
    .update({ rr_enabled: enabled })
    .eq('id', workspace_id)

  if (error) return { error: error.message }
  return { success: true }
}

