import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect }                        from 'next/navigation'
import { Header }                          from '@/components/layout/header'
import { NumberPickerClient }              from './number-picker-client'
import type { Metadata }                   from 'next'

export const metadata: Metadata = { title: 'SMS & Phone Setup' }

export type ProvisionedNumber = {
  id:                   string
  e164:                 string
  country_code:         string | null
  capabilities:         { sms: boolean; voice: boolean; mms: boolean }
  messaging_profile_id: string | null
  purchased_at:         string | null
}

export default async function SmsSetupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: membershipRaw } = await (supabase as any)
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  const membership = membershipRaw as { workspace_id: string; role: string } | null

  if (!membership) redirect('/login')

  const isAdmin = membership.role === 'admin' || membership.role === 'owner'

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: numbersRaw } = await (admin as any)
    .from('workspace_phone_numbers')
    .select('id, e164, country_code, capabilities, messaging_profile_id, purchased_at')
    .eq('workspace_id', membership.workspace_id)
    .is('released_at', null)
    .order('purchased_at', { ascending: false }) as { data: ProvisionedNumber[] | null }

  return (
    <div className="-m-8 flex flex-col flex-1 min-h-0">
      <div className="p-8 pb-16 flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          <Header
            title="SMS & Phone Numbers"
            description="Provision Telnyx numbers to send and receive SMS with your bots"
          />
          <NumberPickerClient
            existingNumbers={numbersRaw ?? []}
            isAdmin={isAdmin}
            workspaceId={membership.workspace_id}
          />
        </div>
      </div>
    </div>
  )
}
