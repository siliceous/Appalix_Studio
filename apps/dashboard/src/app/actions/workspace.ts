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
