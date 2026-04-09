import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAutomationTemplate } from '@/app/actions/automation-templates-service'
import { BuilderClient } from './builder-client'

export const metadata: Metadata = { title: 'Automation Builder · Sage' }

interface Props {
  searchParams: Promise<{ templateId?: string }>
}

export default async function AutomationBuilderPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { templateId } = await searchParams
  const template = templateId ? await getAutomationTemplate(templateId) : null

  return <BuilderClient template={template ?? null} />
}
