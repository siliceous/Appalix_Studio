import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import { listFormTemplates } from '@/app/actions/forms'
import { FormsTemplateGallery } from '@/features/forms/components/FormsTemplateGallery'

export const metadata: Metadata = { title: 'Forms · Builder' }
export const dynamic = 'force-dynamic'

export default async function FormTemplatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const templates = await listFormTemplates()

  return <FormsTemplateGallery templates={templates} />
}
