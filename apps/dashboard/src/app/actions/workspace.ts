'use server'

import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import Stripe from 'stripe'
import type { WorkspaceMemberRole } from '@/lib/types'

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

  // Try to invite via Supabase auth (sends magic-link email)
  let invitedUserId: string | null = null

  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    email,
    { redirectTo: `${appUrl}/dashboard` },
  )

  if (inviteData?.user) {
    invitedUserId = inviteData.user.id
  } else if (inviteError) {
    // User already has an account — look them up in auth.users via service role
    const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const existing = usersData?.users.find((u) => u.email?.toLowerCase() === email)
    if (!existing) return { error: inviteError.message }
    invitedUserId = existing.id
  }

  if (!invitedUserId) return { error: 'Could not resolve user for that email.' }

  // Upsert — avoids duplicate if already a member
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

  type MemberRow = { workspace_id: string; role: string }
  const caller = callerRaw as MemberRow | null
  if (!caller) return { error: 'Workspace not found.' }
  if (!['owner', 'admin'].includes(caller.role)) {
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
  // Admins can only remove member/viewer, not other admins
  if (caller.role === 'admin' && target.role === 'admin') {
    return { error: 'Admins cannot remove other admins.' }
  }
  // Cannot remove yourself
  if (target.user_id === user.id) return { error: 'Cannot remove yourself.' }

  const { error } = await admin.from('workspace_members').delete().eq('id', memberId)
  if (error) return { error: error.message }

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

  type MemberRow = { workspace_id: string; role: string }
  const caller = callerRaw as MemberRow | null
  if (!caller || caller.role !== 'owner') {
    return { error: 'Only the workspace owner can change roles.' }
  }

  if (role === 'owner') return { error: 'Cannot assign owner role.' }

  const admin = createAdminClient()

  const { data: targetRaw } = await admin
    .from('workspace_members')
    .select('id, role, workspace_id')
    .eq('id', memberId)
    .single()

  const target = targetRaw as (MemberRow & { id: string }) | null
  if (!target) return { error: 'Member not found.' }
  if (target.workspace_id !== caller.workspace_id) return { error: 'Member not in your workspace.' }
  if (target.role === 'owner') return { error: 'Cannot change the owner\'s role.' }

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
    user_id: user.id,
    role: 'owner',
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

