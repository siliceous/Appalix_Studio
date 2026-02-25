import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { UpgradePlanCards } from '@/components/settings/upgrade-plan-cards'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Upgrade Plan' }

export default async function UpgradePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspaces(plan, stripe_subscription_id)')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  type MemberRow = { workspaces: { plan: string; stripe_subscription_id: string | null } }
  const membership = membershipRaw as MemberRow | null
  if (!membership) redirect('/settings')

  const currentPlan     = membership.workspaces.plan
  const hasSubscription = !!membership.workspaces.stripe_subscription_id

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-2">
        <a href="/settings" className="text-sm text-gray-500 hover:text-gray-700">Settings</a>
        <span className="text-gray-400">/</span>
        <span className="text-sm text-gray-900">Upgrade plan</span>
      </div>

      <Header
        title="Upgrade your plan"
        description="Unlock more agents, conversations, and automation features"
      />

      <UpgradePlanCards currentPlan={currentPlan} hasSubscription={hasSubscription} />

      <p className="text-xs text-center text-gray-400">
        Need more?{' '}
        <a href="mailto:sales@appalix.ai" className="text-brand-600 hover:underline">
          Contact us about Enterprise
        </a>
        {' '}for unlimited scale, SSO, and dedicated support.
      </p>
    </div>
  )
}
