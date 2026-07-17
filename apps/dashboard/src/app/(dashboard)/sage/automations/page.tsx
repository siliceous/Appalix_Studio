import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SageToolbar } from '@/components/dashboard/sage-toolbar'
import { AutomationTabBar } from '@/components/dashboard/automation-side-tabs'
import { AutomationsClient } from './automations-client'
import { listAutomationTemplates, listExecutions } from '@/app/actions/automation-templates-service'
import { getAutomationInsights } from '@/app/actions/automations'

export const metadata: Metadata = { title: 'Automations · Sage' }

export default async function AutomationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [templates, running, history, insights] = await Promise.all([
    listAutomationTemplates({ includeInactive: true }),
    listExecutions({ status: ['running', 'waiting', 'paused'], limit: 100 }),
    listExecutions({ status: ['completed', 'failed', 'stopped'], limit: 100 }),
    getAutomationInsights(),
  ])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <SageToolbar pageKey="automations" />
      <AutomationTabBar />
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <AutomationsClient
          templates={templates}
          running={running}
          history={history}
          insights={insights}
        />
      </div>
    </div>
  )
}
