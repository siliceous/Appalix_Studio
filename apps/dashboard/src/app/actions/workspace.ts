'use server'

import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

export async function deleteWorkspace() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Must be the workspace owner
  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id, role, workspaces(stripe_subscription_id)')
    .eq('user_id', user.id)
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
