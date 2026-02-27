import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { UpgradePlanCards } from '@/components/settings/upgrade-plan-cards'
import { TopupSection } from '@/components/settings/topup-section'
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

      <TopupSection />

      <p className="text-xs text-center text-gray-400">
        Need more? Contact us about Enterprise for unlimited scale, SSO, and dedicated support.{' '}
        <a href="mailto:sales@appalix.ai?subject=Enterprise%20Plan%20Enquiry&body=Hi%2C%0A%0AI%27m%20interested%20in%20the%20Enterprise%20plan%20for%20Appalix.%20Please%20get%20in%20touch%20to%20discuss%20our%20requirements.%0A%0AThanks" className="text-brand-600 hover:underline">
          sales@appalix.ai
        </a>
      </p>
    </div>
  )
}
